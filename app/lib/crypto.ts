// AES-256-GCM vault encryption — runs in the browser (Web Crypto) and Node.
// A vault's chunks + embedding index are encrypted with a random 256-bit key
// before they ever leave the client; the key is what the iNFT seals to its
// owner. The ciphertext is what gets uploaded to 0G Storage.

import { keccak256 } from "ethers";

const ALGO = "AES-GCM";
const IV_BYTES = 12;

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return "0x" + out;
}

function fromHex(hex: string): Uint8Array {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Generate a fresh, extractable 256-bit AES-GCM vault key. */
export function generateVaultKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: ALGO, length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

/** Export a key as 0x-prefixed hex — this is what gets sealed for the owner. */
export async function exportKeyHex(key: CryptoKey): Promise<string> {
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  return toHex(raw);
}

/** Re-import a key from the 0x-hex form produced by exportKeyHex. */
export function importKeyHex(hex: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    fromHex(hex) as BufferSource,
    { name: ALGO },
    true,
    ["encrypt", "decrypt"],
  );
}

/** Encrypt raw bytes. Output is `iv (12 bytes) || ciphertext`. */
export async function encryptBytes(
  plaintext: Uint8Array,
  key: CryptoKey,
): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: ALGO, iv },
      key,
      plaintext as BufferSource,
    ),
  );
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv, 0);
  out.set(ct, iv.length);
  return out;
}

/** Decrypt an `iv || ciphertext` blob produced by encryptBytes. */
export async function decryptBytes(
  blob: Uint8Array,
  key: CryptoKey,
): Promise<Uint8Array> {
  const iv = blob.slice(0, IV_BYTES);
  const ct = blob.slice(IV_BYTES);
  return new Uint8Array(
    await crypto.subtle.decrypt(
      { name: ALGO, iv },
      key,
      ct as BufferSource,
    ),
  );
}

/** Encrypt a JSON-serializable value (vault metadata, embedding index, ...). */
export async function encryptJSON(
  data: unknown,
  key: CryptoKey,
): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  return encryptBytes(bytes, key);
}

/** Decrypt a blob back into its original JSON value. */
export async function decryptJSON<T = unknown>(
  blob: Uint8Array,
  key: CryptoKey,
): Promise<T> {
  const bytes = await decryptBytes(blob, key);
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

/**
 * keccak256 of the encrypted blob — this is the `metadataHash` recorded on the
 * iNFT, and what an oracle re-binds on transfer.
 */
export function metadataHash(encryptedBlob: Uint8Array): string {
  return keccak256(encryptedBlob);
}
