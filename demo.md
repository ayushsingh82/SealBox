# Sealbox — walkthrough

**Stop screenshotting prompts. Sell them.** Sealbox turns a prompt into a sellable iNFT: encrypt locally → mint ERC-7857 → buyer clicks Buy on `/market`, pays 0.1 OG to the seller, ciphertext is atomically re-encrypted under the buyer's fresh key. The seller's old key decrypts nothing the contract points at anymore.

> Status: end-to-end mint, reveal, one-click buy, seller-side `transfer()`, buyer-side key auto-claim, and `authorizeUsage()` rent + revoke are **live** on 0G Galileo (chain `16602`).

---

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

---

## Connect a wallet

1. Click **Connect** (top right).
2. Switch to **0G Galileo Testnet**:
   - Chain ID: `16602`
   - RPC: `https://evmrpc-testnet.0g.ai`
   - Explorer: `https://chainscan-galileo.0g.ai`
   - Faucet: `https://faucet.0g.ai`
   - Native token: `OG`
3. Hit the faucet so you can pay gas + the 0.1 OG flat purchase price.

---

## Live contracts (Galileo)

| Contract | Address |
| --- | --- |
| ERC-7857 iNFT (`Sealbox`) | [`0xCb3240F9EdE4A0F2407325a3d1144D87C0d6fD64`](https://chainscan-galileo.0g.ai/address/0xCb3240F9EdE4A0F2407325a3d1144D87C0d6fD64) |
| Oracle | [`0x90761A1F9Cc15395410e5A27eE2AC5b10ecF4168`](https://chainscan-galileo.0g.ai/address/0x90761A1F9Cc15395410e5A27eE2AC5b10ecF4168) |

Four sealed prompts already minted by the deployer: **Legal Brief Writer**, **Solidity Auditor Assistant**, **Cold Email Generator**, **Trading Signal Analyzer**.

---

## Walkthrough

### 1. Landing — `/`
*Stop screenshotting prompts. Sell them.* One sentence: prompt = iNFT, purchase = atomic loss of access for the seller.

### 2. Marketplace — `/market`
Live listings pulled from on-chain `Minted` events. Each card shows the seller's address, the sealed-prompt category, and the flat **0.1 OG** price. Buy = one click:

- Buyer's wallet downloads the ciphertext from 0G Storage
- Decrypts it with the seller's escrowed key
- Generates a fresh AES-256-GCM key bound to the buyer's address
- Re-encrypts the manifest, uploads the new ciphertext to 0G Storage (tx 1)
- Calls `purchase(tokenId, sealedKey, proof)` with `value: 0.1 OG` (tx 2)

The contract verifies the oracle proof, rebinds the iNFT to the new ciphertext root + hash, transfers ownership, and forwards 0.1 OG to the seller. The new sealed key is emitted as `SealedKeyDelivered(tokenId, buyer, sealedKey)`.

### 3. Sealbox Console — `/prompts`
Left rail lists every prompt iNFT this wallet owns (live read of `totalMinted` + `ownerOf`, no event-indexer lag). Includes both minted-by-me **and** transferred-in tokens. Tabs per token:

- **Overview** — token id, encrypted URI, metadata hash, contract address, explorer link.
- **Reveal** — fetches ciphertext from 0G Storage, decrypts with the local key, shows the prompt text + Copy.
- **Sell · Transfer** — input a buyer address → `transfer()` with a real re-encrypt-and-re-upload. On confirm the seller's local key is wiped; the buyer's wallet auto-imports the delivered key on next visit.
- **Rent · Authorize** — input executor + permission label (e.g. `use:10`, `day:30`) → `authorizeUsage()` with on-chain revoke.

A buyer-side effect scans `SealedKeyDelivered` events filtered to the connected wallet and auto-stores the delivered key under `vaultKey:{newMetadataHash}` so Reveal works without any manual import.

### 4. Mint — `+ Mint a Prompt iNFT`
- Name → category → short description → prompt body
- AES-256-GCM key generated in-browser
- Manifest encrypted client-side
- Ciphertext uploaded to 0G Storage — explicitly labeled **Tx 1 of 2**
- `mint(to, "og-storage://<root>", keccak256(ciphertext))` — labeled **Tx 2 of 2**
- Token injected into the rail from the parsed `Minted` event in the receipt — no waiting for the indexer
- Listing published locally so other wallets in the same browser can purchase via `/market`

### 5. Templates — `/templates`
Four starter prompts (Writing, Code, Marketing, Analysis). Pick one → opens the mint dialog with the prompt body pre-filled.

### 6. Pitch deck — `/pitch`
Eight slides: problem, solution, how it works, why 0G, market wedge, business model, roadmap.

---

## End-to-end flow

```
SELLER                                 0G Galileo                                 BUYER
──────                                 ──────────                                 ─────

mint flow
─────────
encrypt locally     ─────────┐
upload ciphertext   ─tx 1───►│ 0G Storage  (returns Merkle root)
                              │
mint(to, URI, hash) ─tx 2───►│ ERC-7857   ─►  Minted event
                              │                tokenId visible in /prompts

buy flow (from /market)
───────────────────────                                                buyer clicks Buy
                                                                      ◄─ read escrowed key
                                                                      ◄─ fetch ciphertext
                                                                      ◄─ decrypt + re-encrypt
                                  0G Storage  ◄─tx 1── upload new ciphertext
                                                                      
                                  ERC-7857   ◄─tx 2── purchase(id, newKey, proof) {0.1 OG}
                                  │
                                  │  validProof, _applyProof
                                  │  _transfer(seller → buyer)
                                  │  forward 0.1 OG → seller
                                  │  emit SealedKeyDelivered(id, buyer, newKey)
                                  ▼
seller's old key                                                       buyer scans event,
no longer decrypts                                                     auto-stores newKey,
the new ciphertext                                                     Reveal works in /prompts
```

---

## What's next

| What | Why |
| --- | --- |
| Per-listing custom pricing | Today every prompt is the flat 0.1 OG. Add a `priceWei` per token + a `list()` setter so sellers can price independently. |
| ECIES sealing to buyer pubkey | The seller currently escrows the AES key so the buyer can re-encrypt. Production swaps to ECIES under a buyer-published secp256k1 pubkey — no more public escrow. |
| Production oracle | Galileo today accepts any non-empty proof. Production verifies a 0G DA-signed attestation or a TEE quote. |
| Per-executor enforcement of `use:N` / `day:N` semantics | `authorizeUsage` stores opaque permissions bytes; the "10 uses" semantic is convention-only today. |

See `pending.md` for the full done / not-done breakdown.

---

## The idea in one line

A prompt has never been a real asset. ERC-7857 sealed-key transfer + atomic 0.1 OG `purchase()` makes it one — and Sealbox is the marketplace.
