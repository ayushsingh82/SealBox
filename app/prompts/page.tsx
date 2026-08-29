"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseEventLogs } from "viem";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import NavBar from "../components/NavBar";
import {
  INFT_ABI,
  INFT_ADDRESS,
  OG_GALILEO_CHAIN_ID,
  explorerAddress,
  explorerTx,
  isContractDeployed,
  permissionsHash,
} from "../lib/contract";
import {
  decryptJSON,
  encryptJSON,
  exportKeyHex,
  generateVaultKey,
  importKeyHex,
  metadataHash as hashBytes,
} from "../lib/crypto";
import { uploadEncryptedBlob, downloadEncryptedBlob } from "../lib/ogStorage";
import { reseal } from "../lib/reseal";
import { writeListing } from "../lib/seedListings";
import { useEthersSigner } from "../lib/signer";

type OnChainPrompt = {
  tokenId: bigint;
  encryptedURI: string;
  metadataHash: `0x${string}`;
};

type Tab = "overview" | "reveal" | "transfer" | "rent";

type LocalMeta = {
  name?: string;
  category?: string;
  description?: string;
  createdAt?: string;
};

type FullPromptManifest = LocalMeta & {
  prompt?: string;
  version?: number;
  owner?: string;
};

const CATEGORIES = [
  "Writing",
  "Code",
  "Marketing",
  "Analysis",
  "Legal",
  "Sales",
  "Research",
  "Other",
] as const;

function metaKey(hash: string) {
  return `promptMeta:${hash}`;
}

function keyStoreKey(hash: string) {
  return `vaultKey:${hash}`;
}

function readLocalMeta(hash: string): LocalMeta | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(metaKey(hash));
    return raw ? (JSON.parse(raw) as LocalMeta) : null;
  } catch {
    return null;
  }
}

function writeLocalMeta(hash: string, m: LocalMeta) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(metaKey(hash), JSON.stringify(m));
  } catch {
    // silent
  }
}

function readLocalKey(hash: string): string | null {
  if (typeof window === "undefined") return null;
  return (
    sessionStorage.getItem(keyStoreKey(hash)) ??
    localStorage.getItem(keyStoreKey(hash))
  );
}

function writeLocalKey(hash: string, keyHex: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(keyStoreKey(hash), keyHex);
    localStorage.setItem(keyStoreKey(hash), keyHex);
  } catch {
    // silent
  }
}

function clearLocalKey(hash: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(keyStoreKey(hash));
    localStorage.removeItem(keyStoreKey(hash));
  } catch {
    // silent
  }
}

export default function PromptsConsole() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const ethersSigner = useEthersSigner({ chainId: OG_GALILEO_CHAIN_ID });
  const { writeContractAsync, data: txHash, isPending, reset: resetTx } = useWriteContract();
  const { isLoading: isMining, isSuccess: isMined } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // ─── on-chain prompt list ────────────────────────────
  const [items, setItems] = useState<OnChainPrompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!address || !publicClient || !isContractDeployed() || !INFT_ADDRESS) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        // Walk every minted tokenId (so transferred-IN prompts also appear)
        // and keep the ones whose current owner is us.
        const total = (await publicClient.readContract({
          address: INFT_ADDRESS as `0x${string}`,
          abi: INFT_ABI,
          functionName: "totalMinted",
        })) as bigint;

        const owned: OnChainPrompt[] = [];
        for (let i = BigInt(1); i <= total; i = i + BigInt(1)) {
          try {
            const owner = (await publicClient.readContract({
              address: INFT_ADDRESS as `0x${string}`,
              abi: INFT_ABI,
              functionName: "ownerOf",
              args: [i],
            })) as `0x${string}`;
            if (owner.toLowerCase() !== address.toLowerCase()) continue;

            const [uri, hash] = await Promise.all([
              publicClient.readContract({
                address: INFT_ADDRESS as `0x${string}`,
                abi: INFT_ABI,
                functionName: "getEncryptedURI",
                args: [i],
              }) as Promise<string>,
              publicClient.readContract({
                address: INFT_ADDRESS as `0x${string}`,
                abi: INFT_ABI,
                functionName: "getMetadataHash",
                args: [i],
              }) as Promise<`0x${string}`>,
            ]);
            owned.push({ tokenId: i, encryptedURI: uri, metadataHash: hash });
          } catch {
            // burned / never-existed
          }
        }
        if (!cancelled) setItems(owned);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [address, publicClient, refreshKey]);

  // ─── buyer-side: pick up sealed keys delivered to us ─────
  // After someone transfers a prompt to this wallet, the contract emits
  // SealedKeyDelivered(tokenId, to, sealedKey). We read those, hash the
  // current ciphertext binding, and stash the key locally so Reveal works.
  useEffect(() => {
    if (!address || !publicClient || !isContractDeployed() || !INFT_ADDRESS) return;
    let cancelled = false;
    const run = async () => {
      try {
        const logs = await publicClient.getContractEvents({
          address: INFT_ADDRESS as `0x${string}`,
          abi: INFT_ABI,
          eventName: "SealedKeyDelivered",
          args: { to: address },
          fromBlock: BigInt(0),
          toBlock: "latest",
        });
        for (const l of logs) {
          if (cancelled) return;
          const tokenId = l.args?.tokenId as bigint | undefined;
          const sealedKey = l.args?.sealedKey as `0x${string}` | undefined;
          if (!tokenId || !sealedKey) continue;
          try {
            // The hash the key unlocks NOW (post-transfer) is the current one.
            const currentHash = (await publicClient.readContract({
              address: INFT_ADDRESS as `0x${string}`,
              abi: INFT_ABI,
              functionName: "getMetadataHash",
              args: [tokenId],
            })) as `0x${string}`;
            if (!readLocalKey(currentHash)) {
              writeLocalKey(currentHash, sealedKey);
            }
          } catch {
            // burned / not owned anymore — skip
          }
        }
      } catch {
        // best-effort
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [address, publicClient, refreshKey]);

  // ─── selected + tabs ─────────────────────────────────
  const [selectedTokenId, setSelectedTokenId] = useState<bigint | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const effectiveTokenId =
    selectedTokenId !== null && items.some((v) => v.tokenId === selectedTokenId)
      ? selectedTokenId
      : items[0]?.tokenId ?? null;

  const selected = useMemo(
    () => items.find((v) => v.tokenId === effectiveTokenId) ?? null,
    [items, effectiveTokenId],
  );

  const ensureChain = useCallback(async (): Promise<boolean> => {
    if (chainId === OG_GALILEO_CHAIN_ID) return true;
    try {
      await switchChainAsync({ chainId: OG_GALILEO_CHAIN_ID });
      return true;
    } catch {
      return false;
    }
  }, [chainId, switchChainAsync]);

  // ─── mint dialog ─────────────────────────────────────
  const [mintOpen, setMintOpen] = useState(false);
  const [mintName, setMintName] = useState("");
  const [mintCategory, setMintCategory] = useState<string>(CATEGORIES[0]);
  const [mintDesc, setMintDesc] = useState("");
  const [mintBody, setMintBody] = useState("");
  const [mintStatus, setMintStatus] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Read starter from query string (templates page → "use this starter")
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const p = params.get("starter");
    const n = params.get("starterName");
    if (p) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMintBody(p);
      if (n) setMintName(n);
      setMintOpen(true);
    }
  }, []);

  const resetMint = () => {
    setMintName("");
    setMintCategory(CATEGORIES[0]);
    setMintDesc("");
    setMintBody("");
    setMintStatus(null);
    resetTx();
  };

  const handleMint = useCallback(async () => {
    setMintStatus(null);
    resetTx();
    if (!isContractDeployed() || !INFT_ADDRESS) {
      setMintStatus("Contract not deployed.");
      return;
    }
    if (!address) {
      setMintStatus("Connect a wallet first.");
      return;
    }
    if (!(await ensureChain())) {
      setMintStatus("Switch to 0G Galileo (chain 16602).");
      return;
    }
    if (!mintName.trim()) {
      setMintStatus("Give the prompt a name.");
      return;
    }
    if (!mintBody.trim()) {
      setMintStatus("Paste the prompt body.");
      return;
    }
    if (!ethersSigner || !publicClient) {
      setMintStatus("Wallet signer unavailable. Reconnect and retry.");
      return;
    }

    try {
      setMintStatus("Encrypting prompt locally with a fresh AES-256 key…");
      const manifest: FullPromptManifest = {
        version: 1,
        createdAt: new Date().toISOString(),
        owner: address,
        name: mintName.trim(),
        category: mintCategory,
        description: mintDesc.trim() || undefined,
        prompt: mintBody,
      };
      const key = await generateVaultKey();
      const keyHex = await exportKeyHex(key);
      const ciphertext = await encryptJSON(manifest, key);
      const mdHash = hashBytes(ciphertext) as `0x${string}`;

      writeLocalKey(mdHash, keyHex);
      writeLocalMeta(mdHash, {
        name: manifest.name,
        category: manifest.category,
        description: manifest.description,
        createdAt: manifest.createdAt,
      });

      setMintStatus("Tx 1 of 2 — uploading sealed blob to 0G Storage (sign in wallet)…");
      const rootHash = await uploadEncryptedBlob(ciphertext, ethersSigner);
      const encryptedURI = `og-storage://${rootHash}`;

      setMintStatus("Tx 2 of 2 — minting iNFT on Galileo (sign in wallet)…");
      const hash = await writeContractAsync({
        address: INFT_ADDRESS as `0x${string}`,
        abi: INFT_ABI,
        functionName: "mint",
        args: [address, encryptedURI, mdHash],
      });

      setMintStatus("Mint submitted. Waiting for confirmation…");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const minted = parseEventLogs({
        abi: INFT_ABI,
        eventName: "Minted",
        logs: receipt.logs,
      })[0];
      const newTokenId = minted?.args.tokenId as bigint | undefined;

      if (newTokenId) {
        // Inject directly — don't wait for the public RPC to re-index events.
        setItems((prev) =>
          prev.some((p) => p.tokenId === newTokenId)
            ? prev
            : [...prev, { tokenId: newTokenId, encryptedURI, metadataHash: mdHash }],
        );
        setSelectedTokenId(newTokenId);
        // Publish the listing so any wallet in this browser can purchase
        // this prompt for the flat 0.1 OG price via the marketplace.
        writeListing({
          tokenId: newTokenId.toString(),
          seller: address,
          encryptedURI,
          keyHex: (keyHex.startsWith("0x") ? keyHex : `0x${keyHex}`) as `0x${string}`,
          metadataHash: mdHash,
          name: manifest.name ?? `Sealed Prompt #${newTokenId.toString()}`,
          category: manifest.category ?? "Uncategorized",
          description: manifest.description ?? "",
        });
      }
      // Fire a background refresh too, so we reconcile with on-chain truth.
      setRefreshKey((k) => k + 1);
      setMintStatus("Minted ✓ — your prompt is in the list. Sealed key stored locally.");
    } catch (err: unknown) {
      setMintStatus(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [address, ensureChain, ethersSigner, mintBody, mintCategory, mintDesc, mintName, publicClient, resetTx, writeContractAsync]);

  // ─── reveal tab ──────────────────────────────────────
  const [revealText, setRevealText] = useState<string | null>(null);
  const [revealError, setRevealError] = useState<string | null>(null);
  const [revealLoading, setRevealLoading] = useState(false);

  const handleReveal = useCallback(async () => {
    if (!selected) return;
    setRevealText(null);
    setRevealError(null);
    setRevealLoading(true);
    try {
      const keyHex = readLocalKey(selected.metadataHash);
      if (!keyHex) {
        setRevealError(
          "Decryption key for this prompt is not in this browser. Keys are stored locally at mint time; after a transfer the new owner mints their own key when they call the upcoming buyer-side claim flow.",
        );
        return;
      }
      // pull ciphertext from 0G Storage via root
      const root = selected.encryptedURI.replace(/^og-storage:\/\//, "");
      const ciphertext = await downloadEncryptedBlob(root);
      const key = await importKeyHex(keyHex);
      const manifest = (await decryptJSON(ciphertext, key)) as FullPromptManifest;
      setRevealText(manifest.prompt ?? "");
      // also refresh local meta with newer values from manifest
      writeLocalMeta(selected.metadataHash, {
        name: manifest.name,
        category: manifest.category,
        description: manifest.description,
        createdAt: manifest.createdAt,
      });
    } catch (err) {
      setRevealError(err instanceof Error ? err.message : String(err));
    } finally {
      setRevealLoading(false);
    }
  }, [selected]);

  // ─── transfer tab ────────────────────────────────────
  const [transferTo, setTransferTo] = useState("");
  const [transferStatus, setTransferStatus] = useState<string | null>(null);
  const [marketRequest, setMarketRequest] = useState<{ tokenId: bigint; buyer: `0x${string}` } | null>(null);

  // Deep-link from /market: ?sell=<tokenId>&to=<buyer> — pre-select the token,
  // jump to Transfer tab, fill the buyer field. ?focus=<tokenId> just selects.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const sell = params.get("sell");
    const to = params.get("to");
    const focus = params.get("focus");
    if (sell) {
      try {
        const tid = BigInt(sell);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedTokenId(tid);
        setActiveTab("transfer");
        if (to && to.startsWith("0x") && to.length === 42) {
          setTransferTo(to);
          setMarketRequest({ tokenId: tid, buyer: to as `0x${string}` });
        }
      } catch {
        // bad query — ignore
      }
    } else if (focus) {
      try {
        setSelectedTokenId(BigInt(focus));
      } catch {
        // ignore
      }
    }
  }, []);

  const handleTransfer = useCallback(async () => {
    setTransferStatus(null);
    resetTx();
    if (!selected || !address) return;
    if (!(await ensureChain())) {
      setTransferStatus("Switch to 0G Galileo (chain 16602).");
      return;
    }
    if (!transferTo.startsWith("0x") || transferTo.length !== 42) {
      setTransferStatus("Buyer address must be a valid 0x… address.");
      return;
    }
    if (!ethersSigner || !publicClient) {
      setTransferStatus("Wallet signer unavailable. Reconnect and retry.");
      return;
    }
    const currentKeyHex = readLocalKey(selected.metadataHash);
    if (!currentKeyHex) {
      setTransferStatus(
        "No local key for this prompt — cannot re-encrypt for the buyer. Reveal it once first.",
      );
      return;
    }
    const oldMetadataHash = selected.metadataHash;
    try {
      const { sealedKey, proof, newMetadataHash, newEncryptedURI } = await reseal({
        currentEncryptedURI: selected.encryptedURI,
        currentKeyHex,
        newOwner: transferTo as `0x${string}`,
        signer: ethersSigner,
        onProgress: setTransferStatus,
      });

      setTransferStatus("Submitting transfer() on Galileo — confirm in wallet…");
      const hash = await writeContractAsync({
        address: INFT_ADDRESS as `0x${string}`,
        abi: INFT_ABI,
        functionName: "transfer",
        args: [address, transferTo as `0x${string}`, selected.tokenId, sealedKey, proof],
      });
      setTransferStatus("Transfer mining…");
      await publicClient.waitForTransactionReceipt({ hash });

      // Cryptographic loss: our old key can no longer decrypt the new ciphertext.
      clearLocalKey(oldMetadataHash);

      // Reconcile local state to the new URI/hash so any lingering UI is correct.
      setItems((prev) =>
        prev.filter((p) => p.tokenId !== selected.tokenId),
      );
      setSelectedTokenId(null);

      setTransferStatus(
        `Transferred ✓ — token #${selected.tokenId} now belongs to ${transferTo.slice(0, 6)}…${transferTo.slice(-4)}. Your local key was wiped; the buyer can decrypt the new blob at ${newEncryptedURI.slice(0, 32)}… with the sealed key delivered to them on-chain (hash ${newMetadataHash.slice(0, 10)}…).`,
      );
    } catch (err: unknown) {
      setTransferStatus(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [address, ensureChain, ethersSigner, publicClient, resetTx, selected, transferTo, writeContractAsync]);

  // ─── rent tab ────────────────────────────────────────
  const [rentExecutor, setRentExecutor] = useState("");
  const [rentLabel, setRentLabel] = useState("use:10");
  const [rentStatus, setRentStatus] = useState<string | null>(null);

  const handleRent = useCallback(async () => {
    setRentStatus(null);
    resetTx();
    if (!selected) return;
    if (!(await ensureChain())) {
      setRentStatus("Switch to 0G Galileo (chain 16602).");
      return;
    }
    if (!rentExecutor.startsWith("0x") || rentExecutor.length !== 42) {
      setRentStatus("Executor must be a valid 0x… address.");
      return;
    }
    try {
      const permissions = permissionsHash(rentLabel || "use");
      setRentStatus("Submitting authorizeUsage() — confirm in wallet…");
      await writeContractAsync({
        address: INFT_ADDRESS as `0x${string}`,
        abi: INFT_ABI,
        functionName: "authorizeUsage",
        args: [selected.tokenId, rentExecutor as `0x${string}`, permissions],
      });
      setRentStatus("Authorization submitted.");
    } catch (err: unknown) {
      setRentStatus(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [ensureChain, rentExecutor, rentLabel, resetTx, selected, writeContractAsync]);

  // ─── render gate ─────────────────────────────────────
  if (!address) {
    return (
      <main className="min-h-screen bg-white font-sans tracking-tight text-black">
        <NavBar />
        <div className="flex min-h-[calc(100vh-74px)] items-center justify-center px-4 py-16">
          <div className="w-full max-w-md border-2 border-black bg-white shadow-[8px_8px_0_0_rgba(0,0,255,0.18)]">
            <div className="border-b-2 border-black bg-blue-50/60 px-6 py-5">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0000FF]">
                Wallet required
              </p>
              <h1 className="mt-2 text-[22px] font-black tracking-tight text-black">
                Connect to open Sealbox
              </h1>
            </div>
            <div className="p-6">
              <p className="text-[13px] leading-6 text-gray-700">
                Every prompt is an ERC-7857 iNFT bound to your wallet. Connect to see
                the prompts you own, mint a new one, or sell access to a buyer.
              </p>
              <Link
                href="/"
                className="mt-5 inline-block border-2 border-black bg-[#0000FF] px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
              >
                ← Back to home
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const contractReady = isContractDeployed() && INFT_ADDRESS;

  return (
    <main className="min-h-screen bg-white font-sans tracking-tight text-black">
      <NavBar />

      {/* ───── Subheader ───── */}
      <section className="border-b-2 border-black bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="border-2 border-black bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#0000FF]">
              Sealbox · Console
            </span>
            <span className="hidden font-mono text-[11px] font-bold text-gray-500 sm:inline">
              {address.slice(0, 6)}…{address.slice(-4)}
            </span>
          </div>
          <button
            onClick={() => {
              resetMint();
              setMintOpen(true);
            }}
            disabled={!contractReady}
            className="border-2 border-black bg-[#0000FF] px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-[5px_5px_0_0_rgba(0,0,0,1)] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)] disabled:opacity-40"
          >
            + Mint a Prompt iNFT
          </button>
        </div>
      </section>

      {/* ───── Layout ───── */}
      <section className="mx-auto grid max-w-7xl gap-px bg-white md:grid-cols-[300px_1fr]">
        {/* Rail */}
        <aside className="border-b-2 border-black bg-white md:border-b-0 md:border-r-2">
          <div className="border-b-2 border-black bg-blue-50/60 px-5 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0000FF]">
              Your prompts · {items.length}
            </p>
          </div>

          {!contractReady && (
            <div className="border-b-2 border-amber-400 bg-amber-50 p-5 text-[12px] text-amber-900">
              Contract not deployed. Paste INFT_ADDRESS in app/lib/contract.ts.
            </div>
          )}
          {contractReady && error && (
            <div className="border-b-2 border-red-400 bg-red-50 p-5 text-[12px] text-red-900">
              {error}
            </div>
          )}

          {contractReady && !error && (
            <div>
              {loading && items.length === 0 && (
                <div className="px-5 py-6 text-[12px] text-gray-600">Loading prompts…</div>
              )}
              {!loading && items.length === 0 && (
                <div className="px-5 py-6 text-[12px] text-gray-600">
                  Empty. Click <strong>+ Mint a Prompt iNFT</strong> above.
                </div>
              )}
              <ul>
                {items.map((v) => {
                  const isSel = effectiveTokenId === v.tokenId;
                  const meta = readLocalMeta(v.metadataHash);
                  const titleText = meta?.name ?? `Prompt #${v.tokenId.toString()}`;
                  const subText = meta?.category ?? "ERC-7857 · sealed";
                  return (
                    <li key={v.tokenId.toString()} className={isSel ? "" : "group"}>
                      <button
                        onClick={() => {
                          setSelectedTokenId(v.tokenId);
                          setActiveTab("overview");
                          setRevealText(null);
                          setRevealError(null);
                        }}
                        className={`flex w-full items-start gap-3 border-b-2 border-black px-4 py-4 text-left transition-colors ${
                          isSel
                            ? "bg-[#0000FF] text-white"
                            : "bg-white text-black hover:bg-[#0000FF] hover:text-white"
                        }`}
                      >
                        <p
                          className={`font-mono text-[22px] font-black leading-none ${
                            isSel ? "text-white" : "text-[#0000FF] group-hover:text-white"
                          }`}
                        >
                          #{v.tokenId.toString()}
                        </p>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`truncate text-[13px] font-black tracking-tight ${
                              isSel ? "text-white" : "text-black group-hover:text-white"
                            }`}
                          >
                            {titleText}
                          </p>
                          <p
                            className={`mt-1 truncate text-[10px] font-bold uppercase tracking-[0.16em] ${
                              isSel ? "text-blue-100" : "text-gray-500 group-hover:text-blue-100"
                            }`}
                          >
                            {subText}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 border-2 px-1.5 py-[2px] text-[9px] font-black uppercase tracking-[0.18em] ${
                            isSel
                              ? "border-white bg-[#0000FF] text-white"
                              : "border-emerald-600 bg-emerald-50 text-emerald-700 group-hover:border-white group-hover:bg-[#0000FF] group-hover:text-white"
                          }`}
                        >
                          Sealed
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </aside>

        {/* Detail */}
        <div className="bg-white">
          {!selected ? (
            <div className="flex min-h-[480px] items-center justify-center p-10">
              <div className="w-full max-w-md text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center border-2 border-black bg-[#0000FF] text-white shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                  <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10">
                    <rect x="4" y="10" width="16" height="11" rx="1.5" stroke="white" strokeWidth="2.4" />
                    <path d="M8 10V7a4 4 0 1 1 8 0v3" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
                    <circle cx="12" cy="15.5" r="1.8" fill="white" />
                    <rect x="11.1" y="16.5" width="1.8" height="3" fill="white" />
                  </svg>
                </div>
                <p className="mt-7 text-[11px] font-black uppercase tracking-[0.24em] text-[#0000FF]">
                  Empty vault
                </p>
                <h2 className="mt-3 text-[28px] font-black leading-tight tracking-tight text-black">
                  Mint your first prompt.
                </h2>
                <p className="mt-3 text-[13px] leading-7 text-gray-700">
                  Paste a prompt. Encrypt locally. Mint as an ERC-7857 iNFT. Sell access,
                  rent uses, or keep it sealed in your wallet.
                </p>
                <button
                  onClick={() => {
                    resetMint();
                    setMintOpen(true);
                  }}
                  disabled={!contractReady}
                  className="mt-7 border-2 border-black bg-[#0000FF] px-6 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-white shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)] disabled:opacity-50"
                >
                  + Mint a Prompt iNFT
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Header */}
              <div className="border-b-2 border-black bg-[#0000FF] px-6 py-6 text-white">
                {(() => {
                  const meta = readLocalMeta(selected.metadataHash);
                  return (
                    <>
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-100">
                            ERC-7857 · Galileo 16602
                            {meta?.category ? ` · ${meta.category}` : ""}
                          </p>
                          <div className="mt-2 flex items-end gap-3">
                            <p className="font-mono text-[36px] font-black leading-none tracking-tighter">
                              #{selected.tokenId.toString()}
                            </p>
                            {meta?.name && (
                              <p className="truncate pb-1 text-[20px] font-black tracking-tight">
                                {meta.name}
                              </p>
                            )}
                          </div>
                        </div>
                        <a
                          href={explorerAddress(INFT_ADDRESS as string)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="border-2 border-white bg-transparent px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-white hover:text-[#0000FF]"
                        >
                          Explorer →
                        </a>
                      </div>
                      <p className="mt-4 break-all font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-white/85">
                        {selected.encryptedURI}
                      </p>
                      <p className="mt-1 break-all font-mono text-[10px] text-white/60">
                        hash {selected.metadataHash}
                      </p>
                    </>
                  );
                })()}
              </div>

              {/* Tabs */}
              <div className="flex gap-px border-b-2 border-black bg-black">
                {([
                  { id: "overview", label: "Overview", glyph: "◇" },
                  { id: "reveal", label: "Reveal", glyph: "🔓" },
                  { id: "transfer", label: "Sell · Transfer", glyph: "⇄" },
                  { id: "rent", label: "Rent · Authorize", glyph: "◉" },
                ] as { id: Tab; label: string; glyph: string }[]).map((t) => {
                  const isActive = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      className={`flex flex-1 items-center justify-center gap-2 px-4 py-4 text-[11px] font-black uppercase tracking-[0.18em] transition ${
                        isActive
                          ? "bg-white text-[#0000FF]"
                          : "bg-blue-50/30 text-gray-700 hover:bg-white hover:text-[#0000FF]"
                      }`}
                    >
                      <span className={isActive ? "text-[#0000FF]" : "text-gray-400"}>
                        {t.glyph}
                      </span>
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <div className="p-6">
                {activeTab === "overview" && (() => {
                  const meta = readLocalMeta(selected.metadataHash);
                  return (
                    <div className="space-y-5">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Tile k="Token ID" v={`#${selected.tokenId.toString()}`} mono />
                        <Tile k="Chain" v="0G Galileo · 16602" />
                        <Tile k="Standard" v="ERC-7857" />
                      </div>
                      {meta && (
                        <div className="grid gap-3 sm:grid-cols-3">
                          {meta.name && <Tile k="Name" v={meta.name} />}
                          {meta.category && <Tile k="Category" v={meta.category} />}
                          {meta.createdAt && (
                            <Tile
                              k="Minted"
                              v={new Date(meta.createdAt).toLocaleDateString()}
                              mono
                            />
                          )}
                        </div>
                      )}
                      {meta?.description && (
                        <Tile k="Description" v={meta.description} />
                      )}

                      <div className="grid gap-3 md:grid-cols-2">
                        <Tile
                          k="Owner"
                          v={`${address.slice(0, 10)}…${address.slice(-8)}`}
                          mono
                          breakAll
                        />
                        <Tile k="Contract" v={INFT_ADDRESS as string} mono breakAll />
                      </div>

                      <Tile
                        k="Encrypted URI · 0G Storage"
                        v={selected.encryptedURI}
                        mono
                        breakAll
                      />
                      <Tile
                        k="Metadata hash · keccak256(ciphertext)"
                        v={selected.metadataHash}
                        mono
                        breakAll
                      />

                      <div className="flex flex-wrap gap-3 pt-2">
                        <button
                          onClick={() => setActiveTab("reveal")}
                          className="border-2 border-black bg-[#0000FF] px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                        >
                          Reveal prompt →
                        </button>
                        <a
                          href={explorerAddress(INFT_ADDRESS as string)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="border-2 border-black bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#0000FF] shadow-[4px_4px_0_0_rgba(0,0,255,0.18)] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_rgba(0,0,255,0.18)]"
                        >
                          Contract on Explorer →
                        </a>
                      </div>
                    </div>
                  );
                })()}

                {activeTab === "reveal" && (
                  <div className="space-y-4">
                    <p className="max-w-2xl text-[13px] leading-6 text-gray-700">
                      The ciphertext is fetched from 0G Storage and decrypted with the
                      key in your browser. Copy, plug into any LLM. After a
                      <code className="mx-1 font-mono text-[#0000FF]">transfer()</code>
                      the new owner&rsquo;s key reseals — your reveal stops working.
                    </p>
                    {revealText === null && (
                      <button
                        onClick={handleReveal}
                        disabled={revealLoading}
                        className="border-2 border-black bg-[#0000FF] px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] disabled:opacity-50"
                      >
                        {revealLoading ? "Fetching + decrypting…" : "Reveal prompt"}
                      </button>
                    )}
                    {revealError && (
                      <div className="border-2 border-red-500 bg-red-50 p-4 text-[12px] text-red-900">
                        <p className="font-black uppercase tracking-[0.18em]">Reveal failed</p>
                        <p className="mt-2">{revealError}</p>
                      </div>
                    )}
                    {revealText !== null && (
                      <div className="border-2 border-black">
                        <div className="flex items-center justify-between border-b-2 border-black bg-blue-50/60 px-4 py-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0000FF]">
                            Decrypted prompt
                          </p>
                          <button
                            onClick={() => {
                              if (revealText) navigator.clipboard.writeText(revealText);
                            }}
                            className="border-2 border-black bg-white px-2 py-[2px] text-[9px] font-black uppercase tracking-[0.18em] text-[#0000FF] hover:bg-blue-50"
                          >
                            Copy
                          </button>
                        </div>
                        <pre className="overflow-auto bg-black px-4 py-4 font-mono text-[12px] leading-6 text-white whitespace-pre-wrap">
                          {revealText}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "transfer" && (
                  <div className="space-y-4">
                    {marketRequest && selected && marketRequest.tokenId === selected.tokenId && (
                      <div className="border-2 border-[#0000FF] bg-blue-50/70 px-4 py-3 text-[12px] leading-6 text-black">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0000FF]">
                          Incoming buy request · /market deep-link
                        </p>
                        <p className="mt-1">
                          Buyer{" "}
                          <span className="font-mono font-bold">
                            {marketRequest.buyer.slice(0, 10)}…{marketRequest.buyer.slice(-8)}
                          </span>{" "}
                          requested token #{marketRequest.tokenId.toString()}. Confirm below to
                          re-encrypt for them and submit transfer().
                        </p>
                      </div>
                    )}
                    <p className="max-w-2xl text-[13px] leading-6 text-gray-700">
                      Sell access. The ciphertext is downloaded, decrypted with your key,
                      re-encrypted under a fresh AES-256 key bound to the buyer, re-uploaded
                      to 0G Storage, and only then is transfer() submitted. Once it confirms,
                      your old key is wiped locally and no longer decrypts the new blob.
                    </p>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0000FF]">
                        Buyer address
                      </label>
                      <input
                        value={transferTo}
                        onChange={(e) => setTransferTo(e.target.value)}
                        placeholder="0x…"
                        className="mt-2 w-full border-2 border-black px-3 py-2 font-mono text-[13px] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#0000FF]"
                      />
                    </div>
                    <ActionRow
                      label={isPending ? "Sign in wallet…" : isMining ? "Mining…" : "Confirm sale →"}
                      onClick={handleTransfer}
                      disabled={isPending || isMining}
                      status={transferStatus}
                      txHash={txHash}
                    />
                  </div>
                )}

                {activeTab === "rent" && (
                  <div className="space-y-4">
                    <p className="max-w-2xl text-[13px] leading-6 text-gray-700">
                      Authorize an executor to use this prompt without giving up
                      ownership. Permission label is hashed and stored on chain — use a
                      convention like
                      <code className="mx-1 font-mono text-[#0000FF]">use:10</code>
                      for ten uses or
                      <code className="mx-1 font-mono text-[#0000FF]">day:30</code>
                      for a 30-day rental. Revocable in one tx via
                      <code className="mx-1 font-mono text-[#0000FF]">revokeUsage()</code>.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0000FF]">
                          Executor address
                        </label>
                        <input
                          value={rentExecutor}
                          onChange={(e) => setRentExecutor(e.target.value)}
                          placeholder="0x…"
                          className="mt-2 w-full border-2 border-black px-3 py-2 font-mono text-[13px] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#0000FF]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0000FF]">
                          Permission label
                        </label>
                        <input
                          value={rentLabel}
                          onChange={(e) => setRentLabel(e.target.value)}
                          placeholder="use:10"
                          className="mt-2 w-full border-2 border-black px-3 py-2 font-mono text-[13px] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#0000FF]"
                        />
                      </div>
                    </div>
                    <ActionRow
                      label={isPending ? "Sign in wallet…" : isMining ? "Mining…" : "Authorize executor →"}
                      onClick={handleRent}
                      disabled={isPending || isMining}
                      status={rentStatus}
                      txHash={txHash}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ───── Mint dialog ───── */}
      {mintOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl border-2 border-black bg-white shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between border-b-2 border-black bg-[#0000FF] px-5 py-3 text-white">
              <p className="text-[11px] font-black uppercase tracking-[0.22em]">
                Mint a Prompt iNFT
              </p>
              <button
                onClick={() => setMintOpen(false)}
                className="text-[20px] font-black hover:text-blue-100"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0000FF]">
                    Prompt name
                  </label>
                  <input
                    value={mintName}
                    onChange={(e) => setMintName(e.target.value)}
                    placeholder="Legal Brief Writer"
                    className="mt-2 w-full border-2 border-black px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#0000FF]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0000FF]">
                    Category
                  </label>
                  <select
                    value={mintCategory}
                    onChange={(e) => setMintCategory(e.target.value)}
                    className="mt-2 w-full border-2 border-black bg-white px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#0000FF]"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0000FF]">
                  Short description (public)
                </label>
                <input
                  value={mintDesc}
                  onChange={(e) => setMintDesc(e.target.value)}
                  placeholder="Drafts standard motions citing NY caselaw."
                  className="mt-2 w-full border-2 border-black px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#0000FF]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0000FF]">
                  Prompt body (sealed, never public)
                </label>
                <textarea
                  ref={bodyRef}
                  value={mintBody}
                  onChange={(e) => setMintBody(e.target.value)}
                  rows={9}
                  placeholder={"You are a senior litigator. Given the facts, produce a motion that cites only NY appellate cases…"}
                  className="mt-2 w-full border-2 border-black px-3 py-2 font-mono text-[12px] leading-6 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#0000FF]"
                />
                <p className="mt-1 font-mono text-[10px] text-gray-500">
                  {mintBody.length} chars · AES-256-GCM encrypted in your browser
                </p>
              </div>

              {mintStatus && (
                <div className="border-2 border-black bg-blue-50/60 px-3 py-2 text-[12px] text-black">
                  {mintStatus}
                </div>
              )}
              {txHash && (
                <a
                  href={explorerTx(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block break-all border-2 border-[#0000FF] px-3 py-2 font-mono text-[11px] text-[#0000FF] underline"
                >
                  {txHash}
                </a>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t-2 border-black px-5 py-3">
              <button
                onClick={() => setMintOpen(false)}
                className="border-2 border-black bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-gray-700 hover:bg-blue-50"
              >
                Close
              </button>
              <button
                onClick={handleMint}
                disabled={isPending || isMining}
                className="border-2 border-black bg-[#0000FF] px-5 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] disabled:opacity-50"
              >
                {isPending
                  ? "Sign…"
                  : isMining
                    ? "Mining…"
                    : isMined
                      ? "Minted ✓"
                      : "Encrypt + Mint →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Tile({ k, v, mono, breakAll }: { k: string; v: string; mono?: boolean; breakAll?: boolean }) {
  return (
    <div className="border-2 border-black bg-white p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0000FF]">{k}</p>
      <p
        className={`mt-2 text-[13px] font-bold text-black ${mono ? "font-mono" : ""} ${
          breakAll ? "break-all" : ""
        }`}
      >
        {v}
      </p>
    </div>
  );
}

function ActionRow({
  label,
  onClick,
  disabled,
  status,
  txHash,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  status: string | null;
  txHash: `0x${string}` | undefined;
}) {
  return (
    <div className="space-y-3">
      <button
        onClick={onClick}
        disabled={disabled}
        className="border-2 border-black bg-[#0000FF] px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] disabled:opacity-50"
      >
        {label}
      </button>
      {status && (
        <div className="border-2 border-black bg-blue-50/60 px-3 py-2 text-[12px] text-black">
          {status}
        </div>
      )}
      {txHash && (
        <a
          href={explorerTx(txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="block break-all border-2 border-[#0000FF] px-3 py-2 font-mono text-[11px] text-[#0000FF] underline"
        >
          {txHash}
        </a>
      )}
    </div>
  );
}
