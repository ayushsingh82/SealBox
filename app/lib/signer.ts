// viem WalletClient → ethers v6 Signer adapter.
//
// The 0G Storage TS SDK signs upload txs via an ethers `Signer`, but wagmi
// hands us a viem `WalletClient`. This bridge wraps the viem transport in an
// ethers `BrowserProvider` and produces a `JsonRpcSigner` bound to the same
// account/chain — letting `uploadEncryptedBlob()` use the user's wallet.

"use client";

import { useMemo } from "react";
import { BrowserProvider, JsonRpcSigner } from "ethers";
import { useWalletClient } from "wagmi";
import type { Account, Chain, Client, Transport } from "viem";

export function clientToSigner(
  client: Client<Transport, Chain, Account>,
): JsonRpcSigner {
  const { account, chain, transport } = client;
  const network = {
    chainId: chain.id,
    name: chain.name,
  };
  // viem's transport exposes an EIP-1193 `request` method which is what
  // ethers' BrowserProvider expects.
  const provider = new BrowserProvider(
    transport as unknown as { request: (args: { method: string; params?: unknown }) => Promise<unknown> },
    network,
  );
  return new JsonRpcSigner(provider, account.address);
}

/** React hook — returns an ethers Signer for the connected wallet, or undefined. */
export function useEthersSigner({ chainId }: { chainId?: number } = {}): JsonRpcSigner | undefined {
  const { data: walletClient } = useWalletClient({ chainId });
  return useMemo(
    () => (walletClient ? clientToSigner(walletClient) : undefined),
    [walletClient],
  );
}
