// Real ERC-7857 re-sealing. The on-chain transfer is one tx, but the *seal*
// is what makes ownership cryptographic: the seller's old key has to stop
// working for the buyer's key to mean anything. That requires (a) decrypting
// the current ciphertext, (b) re-encrypting with a fresh AES key, (c)
// uploading the new ciphertext, then (d) submitting transfer() with a proof
// that re-binds the iNFT to the new URI + hash. After confirm, the SELLER's
// local key is useless against the new ciphertext.

import type { Signer } from "ethers";
import {
  decryptJSON,
  encryptJSON,
  exportKeyHex,
  generateVaultKey,
  importKeyHex,
  metadataHash as hashBytes,
} from "./crypto";
import { downloadEncryptedBlob, uploadEncryptedBlob } from "./ogStorage";
import { encodeTransferProof } from "./contract";

export type ResealInput = {
  currentEncryptedURI: string; // `og-storage://<root>`
  currentKeyHex: string;       // seller's existing AES key, hex
  newOwner: `0x${string}`;     // buyer wallet (used as `owner` field inside manifest)
  signer: Signer;              // ethers signer for the 0G Storage upload
  onProgress?: (msg: string) => void;
};

export type ResealOutput = {
  newKeyHex: string;
  newEncryptedURI: string;
  newMetadataHash: `0x${string}`;
  sealedKey: `0x${string}`;
  proof: `0x${string}`;
};

/**
 * Download → decrypt → re-encrypt → upload. Produces everything the caller
 * needs to submit ERC7857.transfer():
 *   - sealedKey: the new AES key, delivered to the buyer via
 *     SealedKeyDelivered event
 *   - proof: abi-encoded (newHash, newURI) consumed by the contract
 */
export async function reseal({
  currentEncryptedURI,
  currentKeyHex,
  newOwner,
  signer,
  onProgress,
}: ResealInput): Promise<ResealOutput> {
  const log = (m: string) => onProgress?.(m);

  log("Fetching sealed blob from 0G Storage…");
  const root = currentEncryptedURI.replace(/^og-storage:\/\//, "");
  const ciphertext = await downloadEncryptedBlob(root);

  log("Decrypting with current key…");
  const oldKey = await importKeyHex(currentKeyHex);
  const manifest = (await decryptJSON(ciphertext, oldKey)) as Record<string, unknown>;

  log("Generating fresh AES-256 key for buyer…");
  const newKey = await generateVaultKey();
  const newKeyHex = await exportKeyHex(newKey);

  const rebound = { ...manifest, owner: newOwner, resealedAt: new Date().toISOString() };
  const newCiphertext = await encryptJSON(rebound, newKey);
  const newMetadataHash = hashBytes(newCiphertext) as `0x${string}`;

  log("Uploading re-sealed blob to 0G Storage…");
  const newRoot = await uploadEncryptedBlob(newCiphertext, signer);
  const newEncryptedURI = `og-storage://${newRoot}`;

  const sealedKey = (newKeyHex.startsWith("0x") ? newKeyHex : `0x${newKeyHex}`) as `0x${string}`;
  const proof = encodeTransferProof(newMetadataHash, newEncryptedURI);

  return { newKeyHex, newEncryptedURI, newMetadataHash, sealedKey, proof };
}
