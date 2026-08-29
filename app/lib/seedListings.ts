// Seed marketplace listings — minted once by the deployer wallet and
// committed to the repo so Sealbox works out of the box without any
// manual localStorage paste step. These keys are intentionally public:
// the contract pays the seller on every purchase regardless of who holds
// the key, and the testnet's whole point is to be reproducible.

export type SeedListing = {
  tokenId: string;
  seller: `0x${string}`;
  encryptedURI: string;
  keyHex: `0x${string}`;
  metadataHash: `0x${string}`;
  name: string;
  category: string;
  description: string;
};

// Seeded on the Sealbox contract (0xCb32…fD64) on 0G Galileo by 0x4f68…f623.
export const SEED_LISTINGS: SeedListing[] = [
  {
    tokenId: "1",
    seller: "0x4f687f3481a36586608367bDd19a13D712B5f623",
    encryptedURI:
      "og-storage://0xf5ddd39901f99af86ecb25fdc6f1bb8a346c564faa246fe35b38932495429ce5",
    keyHex:
      "0x3ccd572e2aa94d5fc932f5402d33de22b0f35a41b118f337f5e8508b8d1c92bf",
    metadataHash:
      "0x847dd0367cda82118fbc61f514c023f3b12e6ffb10429d439e7561102996bdf0",
    name: "Legal Brief Writer",
    category: "Legal",
    description:
      "Drafts motions and briefs citing only NY appellate caselaw. Strict citation guard, no hallucinations.",
  },
  {
    tokenId: "2",
    seller: "0x4f687f3481a36586608367bDd19a13D712B5f623",
    encryptedURI:
      "og-storage://0xe9d4ac362a471a096b102937ef114788753ea0484c267c8a034bea257f182cbb",
    keyHex:
      "0xeea48d2669e6843bc3a1dfff66c835bb0f0c6f683a2d34688e4592d71287d796",
    metadataHash:
      "0x5bfee8c89514071d47d0857a83290f38ac7ead795750c2603e6ac7665718befd",
    name: "Solidity Auditor Assistant",
    category: "Code",
    description:
      "Reads Solidity, flags reentrancy, oracle-trust, access-control gaps. Suggests patches with diffs.",
  },
  {
    tokenId: "3",
    seller: "0x4f687f3481a36586608367bDd19a13D712B5f623",
    encryptedURI:
      "og-storage://0xfc7223b2889acf46c209fb3024dd9fac82fccaa53171df0a8153407e613b4858",
    keyHex:
      "0xc569314eabe3a529d97fbb3bfe584b08a336ba6e3e08d63aba2eacce6ad1447d",
    metadataHash:
      "0x1e5b3bb455bddb07de74974e27672a7888ec80e3c8567437b39d90e05cc593fe",
    name: "Cold Email Generator",
    category: "Marketing",
    description:
      "Outbound copy tuned for SaaS founders. Three variants per prompt: brief, story, contrarian.",
  },
  {
    tokenId: "4",
    seller: "0x4f687f3481a36586608367bDd19a13D712B5f623",
    encryptedURI:
      "og-storage://0xc705f3f5b353a2722f6f582bfd1008997138ca7851cd4f7406e095d15e77fb9f",
    keyHex:
      "0x6fe720ecbe4d4dc54c7606cfb14247d64de35fe9c061d3cc427cc3b8035fe40d",
    metadataHash:
      "0xce3a071966c756767ce0a0f3e098b9807f3104b6206cefc7f5f57e08ce4f3599",
    name: "Trading Signal Analyzer",
    category: "Analysis",
    description:
      "Parses earnings transcripts and price action together. Flags guidance walk-backs and tone shifts.",
  },
];

export type Listing = SeedListing;

export function listingKeyForToken(tokenId: bigint | string): string {
  return `marketListing:${tokenId.toString()}`;
}

/**
 * Look up a listing's escrowed seller key for a given tokenId. Tries
 * localStorage first (user-published listings) and falls back to the
 * compiled-in seed listings.
 */
export function readListing(tokenId: bigint | string): Listing | null {
  const idStr = tokenId.toString();
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(listingKeyForToken(idStr));
      if (raw) return JSON.parse(raw) as Listing;
    } catch {
      // fall through
    }
  }
  return SEED_LISTINGS.find((l) => l.tokenId === idStr) ?? null;
}

/** Persist a listing to localStorage so any buyer in this browser can purchase. */
export function writeListing(l: Listing) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(listingKeyForToken(l.tokenId), JSON.stringify(l));
  } catch {
    // silent
  }
}
