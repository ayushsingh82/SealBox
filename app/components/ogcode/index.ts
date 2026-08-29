// Reference snippets — documentation-grade 0G code samples, surfaced by a
// future /docs route. These are NOT the running integration.
//
// The live implementations now live in:
//   app/lib/crypto.ts      — AES-256-GCM vault encryption
//   app/lib/ogStorage.ts   — 0G Storage upload/download (TS SDK)
//   app/lib/contract.ts    — ERC-7857 iNFT bindings
//   app/api/query/route.ts — 0G Compute Router (TEE inference)
//   contract/              — ERC-7857 + Oracle (Hardhat)

export { inftNftSnippets } from "./inft-nft";
export { storageSdkSnippets } from "./storage-sdk";
export { storageCliSnippets } from "./storage-cli";
export { computeInferenceSnippets } from "./compute-inference";
