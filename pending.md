# Pending — Sealbox

> **Stop screenshotting prompts. Sell them.** Sealbox turns a prompt into a
> sellable ERC-7857 iNFT: encrypt locally → upload ciphertext to 0G Storage →
> mint. Buyers click Buy on `/market`, pay 0.1 OG to the seller, and the
> ciphertext is atomically re-encrypted under their fresh key. After the
> purchase confirms the seller cryptographically loses access. Rentals via
> `authorizeUsage()` are revocable in one tx. **First wedge:** prompt
> engineers + AI consultants who currently have valuable prompts and no way to
> monetize beyond a SaaS subscription.

Build-out status. `[x]` = done and verified, `[ ]` = not started / blocked.

> **Live on 0G Galileo (chain 16602):**
> - ERC-7857 iNFT — `0xCb3240F9EdE4A0F2407325a3d1144D87C0d6fD64` (open mint,
>   `purchase()` payable, flat 0.1 OG → seller, `msg.sender==from` guard on
>   `transfer()`).
> - Oracle — `0x90761A1F9Cc15395410e5A27eE2AC5b10ecF4168`
> - Deployer — `0x4f687f3481a36586608367bDd19a13D712B5f623` (key in
>   `contract/.env`, gitignored).
> - 4 sealed prompts seeded — Legal Brief Writer, Solidity Auditor Assistant,
>   Cold Email Generator, Trading Signal Analyzer.

---

## 1. Smart contract — ERC-7857 iNFT  ✅ built, audited, deployed

- [x] Hardhat toolchain — self-contained in `contract/`.
- [x] `contract/contracts/ERC7857.sol` — `mint`, `transfer`, `purchase` (payable,
      0.1 OG flat, forwards to seller), `clone`, `authorizeUsage`,
      `revokeUsage`, `setOracle`, views.
- [x] `contract/contracts/MockOracle.sol` — testnet `IOracle` implementation
      (production swaps for a DA-signed verifier).
- [x] Tests — `contract/test/ERC7857.test.cjs`, **13 passing**. Includes the
      proof-replay theft attack as a regression case.
- [x] Compiles clean (`solc 0.8.28`, Cancun EVM).

### Auth fixes shipped
- [x] `mint()` is open (any wallet, non-zero `to`).
- [x] `transfer()` requires `msg.sender == from == ownerOf(tokenId)` — fixes a
      real bug where a valid oracle proof was enough to steal a token.
- [x] `purchase()` rejects self-buy, requires exact 0.1 OG, forwards to seller.

### Deployment
- [x] `contract/scripts/deploy.cjs` — deploys the testnet oracle then ERC7857.
- [x] `contract/scripts/seed-prompts.cjs` — mints 4 sealed prompts and prints
      paste-blocks for browser localStorage (also baked into
      `app/lib/seedListings.ts` so Sealbox works out of the box).
- [x] Network config — `ogGalileo` (chain `16602`, RPC `evmrpc-testnet.0g.ai`).

---

## 2. Frontend ↔ contract integration  ✅ wired via viem + wagmi

- [x] `app/lib/contract.ts` — viem-native structured ABI (including `purchase`,
      `LISTING_PRICE`, `Purchased` event), `ogGalileo` chain definition,
      proof + permission helpers, explorer URLs.
- [x] `app/lib/reseal.ts` — shared download → decrypt → re-encrypt → upload
      pipeline used by both seller-side `transfer()` and buyer-side `purchase()`.
- [x] `app/lib/seedListings.ts` — committed catalog of 4 sealed prompts so
      `/market` is non-empty in any browser; merges with user-published
      `marketListing:{tokenId}` entries.
- [x] `/prompts` mint dialog — explicit Tx 1 of 2 (0G Storage) / Tx 2 of 2
      (mint) status, mint event parsed from receipt → token injected locally
      without waiting on the indexer.
- [x] `/prompts` list — scans `totalMinted()` + `ownerOf` so transferred-in
      prompts appear alongside minted-by-me.
- [x] `/prompts` reveal — pulls ciphertext from 0G Storage, decrypts locally.
- [x] `/prompts` sell — real re-encrypt + re-upload before `transfer()`; seller
      key wiped on confirm.
- [x] `/prompts` rent — `authorizeUsage()` with permission label.
- [x] `/prompts` accepts marketplace deep-link `?sell=<id>&to=<addr>` and
      pre-fills the Transfer tab for buyer-requested transfers.
- [x] `/market` — live listings from on-chain `Minted` events; one-click Buy
      runs the full re-seal + `purchase()` with 0.1 OG to seller; falls back
      to seller deep-link when no escrowed key is available.
- [x] Buyer-side claim — effect scans `SealedKeyDelivered` events filtered to
      this wallet, auto-stores the delivered key under `vaultKey:{newHash}`.
- [x] Tx UX: pending / mining / mined / error, explorer links, chain guard via
      `useSwitchChain`.

---

## 3. 0G Storage — encrypted prompt bodies  ✅ uploads + downloads wired

- [x] `app/lib/crypto.ts` — AES-256-GCM via Web Crypto, browser + Node
      compatible (the seed script in `contract/scripts/seed-prompts.cjs`
      produces ciphertext the browser can decrypt).
- [x] `app/lib/ogStorage.ts` — wraps the 0G Storage TS SDK (browser entry).
- [x] `app/lib/signer.ts` — viem `WalletClient` → ethers v6 `JsonRpcSigner` so
      the storage SDK can sign with the wagmi wallet.
- [x] Mint, transfer, and purchase all upload ciphertext to 0G Storage; the
      Merkle root is what the iNFT records as `encryptedURI`.
- [ ] Confirm Galileo indexer URL against the latest 0G network-overview docs
      (`NEXT_PUBLIC_OG_STORAGE_INDEXER` default is `indexer-storage-testnet-turbo.0g.ai`).

---

## 4. Production hardening — the next slice

- [ ] **ECIES to buyer pubkey.** Today the seller publishes the AES key
      alongside the listing so the buyer can re-encrypt client-side. Production
      replaces this with the buyer publishing a one-shot secp256k1 pubkey,
      seller encrypts the AES key to it, no plaintext escrow.
- [ ] **Production oracle.** The Galileo oracle accepts any non-empty
      proof. Swap for a 0G DA-signed attestation (or a TEE quote) of the
      re-encryption transcript.
- [ ] **Per-listing custom pricing.** Every prompt is currently the flat 0.1
      OG. Add a `priceWei` per-token (set via `list()`) so sellers can price
      independently. Update `/market` to read it.
- [ ] **Per-executor enforcement of `use:N` / `day:N`.** `authorizeUsage`
      stores opaque permission bytes; the count / expiry are convention only.
      Needs an on-chain usage counter or off-chain attestation.

---

## 5. Misc / polish

- [x] `.env.example` (root) — RPC, storage indexer.
- [x] `app/components/ogcode/index.ts` — points at the live `app/lib/` impls.
- [x] Footer cleaned — no per-page network chip.
- [x] Routes renewed: `/my-vaults` → `/prompts`, `/infts` → `/market`,
      `/vaults` → `/templates`, `/builder-flow` → `/prompts`. Old slugs
      redirect via Next's `redirect()`.
- [ ] `/docs` route that renders the `ogcode/` snippet constants.
- [ ] Real WalletConnect project ID for `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
      (optional — browser-extension wallets work without it).
- [ ] Optional: redeploy with `name_ = "Sealbox"` so `name()` matches the
      brand. UI ignores the field; cosmetic only.

---

## 0G reference

| Component | Role | Endpoint / config |
| --- | --- | --- |
| 0G Chain | iNFT contract execution | Chain `16602`, RPC `https://evmrpc-testnet.0g.ai` |
| 0G Storage | Encrypted prompt bodies | TS SDK + indexer (`app/lib/ogStorage.ts`) |
| Oracle | Transfer-proof verification | Galileo testnet; 0G DA in production |

**File map of the integration**

| Concern | File |
| --- | --- |
| ERC-7857 contract + oracle | `contract/contracts/*.sol` |
| Deploy + seed + tests | `contract/scripts/{deploy,seed-prompts}.cjs`, `contract/test/*.cjs` |
| Prompt encryption (AES-256-GCM) | `app/lib/crypto.ts` |
| 0G Storage upload/download | `app/lib/ogStorage.ts` |
| viem → ethers signer adapter | `app/lib/signer.ts` |
| Contract ABI + addresses | `app/lib/contract.ts` |
| Re-seal pipeline (download → decrypt → re-encrypt → upload) | `app/lib/reseal.ts` |
| Seed listings + escrowed-key catalog | `app/lib/seedListings.ts` |
| Sealbox console | `app/prompts/page.tsx` |
| Marketplace (live listings + one-click buy) | `app/market/page.tsx` |
| Starter prompts | `app/templates/page.tsx` |
