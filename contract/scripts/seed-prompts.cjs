// Seeds the marketplace with a handful of sealed prompt iNFTs minted from
// the deployer wallet. For each prompt: generate AES-256-GCM key → encrypt
// manifest → upload ciphertext to 0G Storage → call ERC7857.mint().
//
// The AES keys are printed at the end so they can be pasted into the browser's
// localStorage if you want to demo the seller-side reveal/transfer flow:
//
//   localStorage.setItem('vaultKey:<metadataHash>', '<keyHex>');
//   localStorage.setItem('promptMeta:<metadataHash>', '{"name":"…","category":"…"}');
//
// Run:  npm run seed:galileo
// Needs PRIVATE_KEY in contract/.env (same one used for deploy).

const hre = require("hardhat");
const crypto = require("node:crypto");
const { keccak256 } = require("ethers");
const { Indexer, MemData } = require("@0gfoundation/0g-storage-ts-sdk");

const INDEXER_URL = "https://indexer-storage-testnet-turbo.0g.ai";
const RPC_URL = "https://evmrpc-testnet.0g.ai";

// Read deployment addresses from the frontend so we always seed the live one.
const INFT_ADDRESS = "0xCb3240F9EdE4A0F2407325a3d1144D87C0d6fD64";

const PROMPTS = [
  {
    name: "Legal Brief Writer",
    category: "Legal",
    description:
      "Drafts motions and briefs citing only NY appellate caselaw. Strict citation guard, no hallucinations.",
    body: `You are a senior NY litigator. Given the case facts, draft a motion or brief that:
- cites only published NY appellate decisions
- never invents a citation; if unsure, ask
- mirrors the rhetorical structure of the Court of Appeals
- ends with a one-paragraph executive summary for opposing counsel`,
  },
  {
    name: "Solidity Auditor Assistant",
    category: "Code",
    description:
      "Reads Solidity, flags reentrancy, oracle-trust, access-control gaps. Suggests patches with diffs.",
    body: `You are a Trail of Bits-style auditor. For each contract:
1. enumerate external/public functions and their privilege class
2. flag reentrancy, oracle trust, access-control, integer, and DoS risks
3. write a minimal failing test for the most severe finding
4. propose a patch as a unified diff
Output: severity-sorted Markdown with code blocks.`,
  },
  {
    name: "Cold Email Generator",
    category: "Marketing",
    description:
      "Outbound copy tuned for SaaS founders. Three variants per prompt: brief, story, contrarian.",
    body: `You write cold emails to technical founders. For each lead, produce three variants:
- brief: ≤60 words, one ask, no fluff
- story: opens with a one-sentence customer anecdote
- contrarian: opens with a claim that contradicts received wisdom in their space
Never use the words "hope", "circle back", or "synergy". Sign off "—".`,
  },
  {
    name: "Trading Signal Analyzer",
    category: "Analysis",
    description:
      "Parses earnings transcripts and price action together. Flags guidance walk-backs and tone shifts.",
    body: `You are a sell-side analyst. Given an earnings call transcript and the post-call price action, produce:
- a 3-bullet TL;DR of what management actually said
- a list of guidance walk-backs vs. the prior call
- a tone-shift table (CFO vs. CEO, vs. previous call)
- one risk the market is mispricing, with the evidence
Never make a buy/sell recommendation.`,
  },
];

async function aesEncrypt(plaintextBytes, keyBytes) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyBytes, iv);
  const ct = Buffer.concat([cipher.update(plaintextBytes), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Layout: iv (12) || ciphertext || tag (16)
  // Matches the browser's WebCrypto AES-GCM output which appends the tag.
  return Buffer.concat([iv, ct, tag]);
}

function toHex(buf) {
  return "0x" + Buffer.from(buf).toString("hex");
}

async function uploadToOgStorage(blob, signer) {
  const indexer = new Indexer(INDEXER_URL);
  const file = new MemData(blob);
  const [res, err] = await indexer.upload(file, RPC_URL, signer);
  if (err) throw err;
  return "rootHash" in res ? res.rootHash : res.rootHashes[0];
}

async function main() {
  const { ethers } = hre;
  const [deployer] = await ethers.getSigners();
  console.log("Seeding from:", deployer.address);
  console.log("INFT_ADDRESS:", INFT_ADDRESS);

  const inft = await ethers.getContractAt("ERC7857", INFT_ADDRESS, deployer);
  const beforeTotal = await inft.totalMinted();
  console.log("totalMinted before:", beforeTotal.toString());

  const records = [];

  for (let i = 0; i < PROMPTS.length; i++) {
    const p = PROMPTS[i];
    console.log(`\n[${i + 1}/${PROMPTS.length}] ${p.name}`);

    const manifest = {
      version: 1,
      createdAt: new Date().toISOString(),
      owner: deployer.address,
      name: p.name,
      category: p.category,
      description: p.description,
      prompt: p.body,
    };
    const keyBytes = crypto.randomBytes(32);
    const ciphertext = await aesEncrypt(
      Buffer.from(JSON.stringify(manifest), "utf8"),
      keyBytes,
    );
    const metadataHash = keccak256(ciphertext);

    process.stdout.write("  uploading to 0G Storage… ");
    const rootHash = await uploadToOgStorage(ciphertext, deployer);
    console.log(rootHash);

    const encryptedURI = `og-storage://${rootHash}`;
    process.stdout.write("  mint() … ");
    const tx = await inft.mint(deployer.address, encryptedURI, metadataHash);
    const receipt = await tx.wait();
    const log = receipt.logs.find((l) => {
      try {
        const parsed = inft.interface.parseLog(l);
        return parsed && parsed.name === "Minted";
      } catch {
        return false;
      }
    });
    const tokenId = log ? inft.interface.parseLog(log).args.tokenId : null;
    console.log("tokenId", tokenId?.toString(), "tx", tx.hash);

    records.push({
      tokenId: tokenId?.toString(),
      name: p.name,
      category: p.category,
      description: p.description,
      metadataHash,
      keyHex: toHex(keyBytes),
      encryptedURI,
    });
  }

  console.log("\n────────────────────────────────────────────────");
  console.log("Done. Paste the block below into your browser console to");
  console.log("(a) enable seller-side Reveal/Transfer for these prompts,");
  console.log("(b) publish their AES keys so other wallets in the same");
  console.log("    browser can purchase them via the marketplace.\n");
  for (const r of records) {
    const meta = JSON.stringify({
      name: r.name,
      category: r.category,
      description: r.description,
      createdAt: new Date().toISOString(),
    });
    const listing = JSON.stringify({
      tokenId: r.tokenId,
      seller: process.env.SEED_SELLER ?? "deployer",
      encryptedURI: r.encryptedURI,
      keyHex: r.keyHex,
      metadataHash: r.metadataHash,
      name: r.name,
      category: r.category,
      description: r.description,
    });
    console.log(`// #${r.tokenId} ${r.name}`);
    console.log(
      `localStorage.setItem('vaultKey:${r.metadataHash}', '${r.keyHex}');`,
    );
    console.log(
      `localStorage.setItem('promptMeta:${r.metadataHash}', ${JSON.stringify(meta)});`,
    );
    console.log(
      `localStorage.setItem('marketListing:${r.tokenId}', ${JSON.stringify(listing)});`,
    );
    console.log("");
  }

  const afterTotal = await inft.totalMinted();
  console.log("totalMinted after:", afterTotal.toString());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
