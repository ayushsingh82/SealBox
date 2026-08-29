// 0G Storage wrapper — uploads/retrieves opaque (already-encrypted) blobs via
// the 0G Storage TypeScript SDK. Encryption is handled separately in crypto.ts;
// this layer only moves ciphertext in and out of the decentralized store.
//
// Imported from the SDK's `/browser` entry so the bundle is browser-safe (the
// default entry pulls in Node's `fs` via ZgFile).

import { Indexer, MemData } from "@0gfoundation/0g-storage-ts-sdk/browser";
import type { Signer } from "ethers";

// Indexer + RPC endpoints for 0G Galileo testnet. Confirm the indexer URL
// against the current 0G network-overview docs and override via env if needed.
const INDEXER_URL =
  process.env.NEXT_PUBLIC_OG_STORAGE_INDEXER ??
  "https://indexer-storage-testnet-turbo.0g.ai";
const RPC_URL =
  process.env.NEXT_PUBLIC_OG_RPC_URL ?? "https://evmrpc-testnet.0g.ai";

export function getIndexer(): Indexer {
  return new Indexer(INDEXER_URL);
}

/**
 * Upload an already-encrypted blob to 0G Storage.
 * Returns the Merkle root hash — the vault's file ID. **Persist it**; it is
 * required for every download and is what the iNFT stores as `encryptedURI`.
 */
export async function uploadEncryptedBlob(
  blob: Uint8Array,
  signer: Signer,
): Promise<string> {
  const indexer = getIndexer();
  const file = new MemData(blob);
  const [res, err] = await indexer.upload(file, RPC_URL, signer);
  if (err) throw err;
  // Small vault blobs return a single root; large files split into fragments.
  return "rootHash" in res ? res.rootHash : res.rootHashes[0];
}

/** Download an encrypted blob from 0G Storage by its Merkle root hash. */
export async function downloadEncryptedBlob(
  rootHash: string,
): Promise<Uint8Array> {
  const indexer = getIndexer();
  const [blob, err] = await indexer.downloadToBlob(rootHash);
  if (err) throw err;
  return new Uint8Array(await blob.arrayBuffer());
}

/** HTTP gateway URL for an uploaded file — plain `GET /file?root=0x...`. */
export function gatewayUrl(rootHash: string): string {
  return `${INDEXER_URL}/file?root=${rootHash}`;
}
