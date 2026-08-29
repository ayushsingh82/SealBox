// ERC-7857 iNFT contract bindings for the frontend (viem + wagmi).
//
// After deploying with `cd contract && npm run deploy:galileo`, paste the
// printed addresses into INFT_ADDRESS / ORACLE_ADDRESS below.

import { defineChain, encodeAbiParameters, keccak256, toBytes } from "viem";

export const OG_GALILEO_CHAIN_ID = 16602;

export const ogGalileo = defineChain({
  id: OG_GALILEO_CHAIN_ID,
  name: "0G Galileo Testnet",
  nativeCurrency: { name: "OG", symbol: "OG", decimals: 18 },
  rpcUrls: { default: { http: ["https://evmrpc-testnet.0g.ai"] } },
  blockExplorers: {
    default: { name: "0G Explorer", url: "https://chainscan-galileo.0g.ai" },
  },
  testnet: true,
});

// Deployed on 0G Galileo (chain 16602) by 0x4f68…f623.
// v5: "Sealbox" (symbol SEAL) — open mint + purchase() with 0.1 OG flat price paid to seller.
export const INFT_ADDRESS: `0x${string}` | "" = "0xCb3240F9EdE4A0F2407325a3d1144D87C0d6fD64";
export const ORACLE_ADDRESS: `0x${string}` | "" = "0x90761A1F9Cc15395410e5A27eE2AC5b10ecF4168";

/** Flat listing price for every prompt: 0.1 OG (in wei). */
export const LISTING_PRICE_WEI = BigInt("100000000000000000");
export const LISTING_PRICE_LABEL = "0.1 OG";

export function explorerTx(hash: string): string {
  return `https://chainscan-galileo.0g.ai/tx/${hash}`;
}

export function explorerAddress(addr: string): string {
  return `https://chainscan-galileo.0g.ai/address/${addr}`;
}

// Structured ABI — viem/wagmi need this form (not ethers' string ABI).
export const INFT_ABI = [
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "encryptedURI", type: "string" },
      { name: "metadataHash", type: "bytes32" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "sealedKey", type: "bytes" },
      { name: "proof", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "purchase",
    stateMutability: "payable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "sealedKey", type: "bytes" },
      { name: "proof", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "LISTING_PRICE",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "clone",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "sealedKey", type: "bytes" },
      { name: "proof", type: "bytes" },
    ],
    outputs: [{ name: "newTokenId", type: "uint256" }],
  },
  {
    type: "function",
    name: "authorizeUsage",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "executor", type: "address" },
      { name: "permissions", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "revokeUsage",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "executor", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getEncryptedURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "getMetadataHash",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "authorizationOf",
    stateMutability: "view",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "executor", type: "address" },
    ],
    outputs: [{ type: "bytes" }],
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "totalMinted",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "oracle",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "event",
    name: "Minted",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "metadataHash", type: "bytes32", indexed: false },
      { name: "encryptedURI", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "SealedTransfer",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "SealedKeyDelivered",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "sealedKey", type: "bytes", indexed: false },
    ],
  },
  {
    type: "event",
    name: "MetadataUpdated",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "newHash", type: "bytes32", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Purchased",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "priceWei", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Cloned",
    inputs: [
      { name: "sourceTokenId", type: "uint256", indexed: true },
      { name: "newTokenId", type: "uint256", indexed: true },
      { name: "to", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "UsageAuthorized",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "executor", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "UsageRevoked",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "executor", type: "address", indexed: true },
    ],
  },
] as const;

/** Encode a transfer/clone proof: abi.encode(bytes32 newHash, string newURI). */
export function encodeTransferProof(
  newMetadataHash: `0x${string}`,
  newEncryptedURI = "",
): `0x${string}` {
  return encodeAbiParameters(
    [{ type: "bytes32" }, { type: "string" }],
    [newMetadataHash, newEncryptedURI],
  );
}

/** Pack a sealed-key payload as bytes (the iNFT only stores it opaquely). */
export function packSealedKey(keyHex: string): `0x${string}` {
  return (keyHex.startsWith("0x") ? keyHex : `0x${keyHex}`) as `0x${string}`;
}

/** keccak256 of a UTF-8 string — handy for permission labels in authorizeUsage. */
export function permissionsHash(label: string): `0x${string}` {
  return keccak256(toBytes(label));
}

export function isContractDeployed(): boolean {
  return INFT_ADDRESS !== "" && ORACLE_ADDRESS !== "";
}
