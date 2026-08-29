"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { parseEventLogs } from "viem";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import NavBar from "../components/NavBar";
import {
  INFT_ABI,
  INFT_ADDRESS,
  LISTING_PRICE_LABEL,
  LISTING_PRICE_WEI,
  OG_GALILEO_CHAIN_ID,
  explorerAddress,
  explorerTx,
  isContractDeployed,
} from "../lib/contract";
import { reseal } from "../lib/reseal";
import { readListing, writeListing } from "../lib/seedListings";
import { useEthersSigner } from "../lib/signer";

type Listing = {
  tokenId: bigint;
  owner: `0x${string}`;
  encryptedURI: string;
  metadataHash: `0x${string}`;
  name: string;
  category: string;
  description?: string;
};

type LocalMeta = {
  name?: string;
  category?: string;
  description?: string;
};

const CATEGORIES = ["All", "Writing", "Code", "Marketing", "Analysis", "Legal", "Sales", "Research"] as const;

function readLocalMeta(metadataHash: string): LocalMeta | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`promptMeta:${metadataHash}`);
    return raw ? (JSON.parse(raw) as LocalMeta) : null;
  } catch {
    return null;
  }
}

function writeLocalKey(metadataHash: string, keyHex: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`vaultKey:${metadataHash}`, keyHex);
    localStorage.setItem(`vaultKey:${metadataHash}`, keyHex);
  } catch {
    // silent
  }
}

function writeLocalMeta(metadataHash: string, m: LocalMeta) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`promptMeta:${metadataHash}`, JSON.stringify(m));
  } catch {
    // silent
  }
}

function fallbackImage(tokenId: bigint): string {
  const n = (Number(tokenId % BigInt(6)) || 6).toString().padStart(2, "0");
  return `/images/hero-image${n}.svg`;
}

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function MarketPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient();
  const ethersSigner = useEthersSigner({ chainId: OG_GALILEO_CHAIN_ID });
  const { writeContractAsync, data: txHash, reset: resetTx } = useWriteContract();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [openListing, setOpenListing] = useState<Listing | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [purchaseStatus, setPurchaseStatus] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const ensureChain = useCallback(async () => {
    if (chainId === OG_GALILEO_CHAIN_ID) return true;
    try {
      await switchChainAsync({ chainId: OG_GALILEO_CHAIN_ID });
      return true;
    } catch {
      return false;
    }
  }, [chainId, switchChainAsync]);

  useEffect(() => {
    if (!isContractDeployed() || !INFT_ADDRESS || !publicClient) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const total = (await publicClient.readContract({
          address: INFT_ADDRESS as `0x${string}`,
          abi: INFT_ABI,
          functionName: "totalMinted",
        })) as bigint;

        const out: Listing[] = [];
        for (let i = BigInt(1); i <= total; i = i + BigInt(1)) {
          try {
            const [owner, uri, hash] = await Promise.all([
              publicClient.readContract({
                address: INFT_ADDRESS as `0x${string}`,
                abi: INFT_ABI,
                functionName: "ownerOf",
                args: [i],
              }) as Promise<`0x${string}`>,
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
            const meta = readLocalMeta(hash) ?? readListing(i);
            out.push({
              tokenId: i,
              owner,
              encryptedURI: uri,
              metadataHash: hash,
              name: meta?.name ?? `Sealed Prompt #${i.toString()}`,
              category: meta?.category ?? "Uncategorized",
              description: meta?.description,
            });
          } catch {
            // burned
          }
        }
        if (!cancelled) setListings(out);
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
  }, [publicClient, refreshKey]);

  const visible = useMemo(() => {
    if (activeCategory === "All") return listings;
    return listings.filter((l) => l.category.toLowerCase() === activeCategory.toLowerCase());
  }, [listings, activeCategory]);

  const isOwner = (l: Listing) =>
    !!address && l.owner.toLowerCase() === address.toLowerCase();

  const handleOpen = async (l: Listing) => {
    setCopied(null);
    setPurchaseStatus(null);
    resetTx();
    if (isConnected) await ensureChain();
    setOpenListing(l);
  };

  const sellerDeepLink = (l: Listing) => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams({
      sell: l.tokenId.toString(),
      to: address ?? "",
    });
    return `${window.location.origin}/prompts?${params.toString()}`;
  };

  const handlePurchase = useCallback(async () => {
    if (!openListing) return;
    setPurchaseStatus(null);
    resetTx();
    if (!isContractDeployed() || !INFT_ADDRESS) {
      setPurchaseStatus("Contract not deployed.");
      return;
    }
    if (!address) {
      setPurchaseStatus("Connect a wallet first.");
      return;
    }
    if (!(await ensureChain())) {
      setPurchaseStatus("Switch to 0G Galileo (chain 16602).");
      return;
    }
    if (!ethersSigner || !publicClient) {
      setPurchaseStatus("Wallet signer unavailable. Reconnect and retry.");
      return;
    }
    const listing = readListing(openListing.tokenId);
    if (!listing) {
      setPurchaseStatus(
        "No escrowed seller key for this prompt — use the seller deep-link instead.",
      );
      return;
    }

    setPurchasing(true);
    try {
      const { sealedKey, proof, newMetadataHash, newKeyHex, newEncryptedURI } = await reseal({
        currentEncryptedURI: listing.encryptedURI,
        currentKeyHex: listing.keyHex,
        newOwner: address,
        signer: ethersSigner,
        onProgress: setPurchaseStatus,
      });

      setPurchaseStatus(`Paying ${LISTING_PRICE_LABEL} to seller and finalizing on-chain…`);
      const hash = await writeContractAsync({
        address: INFT_ADDRESS as `0x${string}`,
        abi: INFT_ABI,
        functionName: "purchase",
        args: [openListing.tokenId, sealedKey, proof],
        value: LISTING_PRICE_WEI,
      });

      setPurchaseStatus("Purchase mining on Galileo…");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Buyer side: store our new key + a fresh meta entry so /prompts and
      // future re-listings work. Republish marketListing so we can re-sell.
      writeLocalKey(newMetadataHash, newKeyHex);
      writeLocalMeta(newMetadataHash, {
        name: listing.name,
        category: listing.category,
        description: listing.description,
      });
      writeListing({
        tokenId: openListing.tokenId.toString(),
        seller: address,
        encryptedURI: newEncryptedURI,
        keyHex: newKeyHex as `0x${string}`,
        metadataHash: newMetadataHash,
        name: listing.name,
        category: listing.category,
        description: listing.description ?? "",
      });

      const purchased = parseEventLogs({
        abi: INFT_ABI,
        eventName: "Purchased",
        logs: receipt.logs,
      })[0];

      setPurchaseStatus(
        purchased
          ? `Owned ✓ — token #${openListing.tokenId.toString()} is yours. ${LISTING_PRICE_LABEL} paid to ${shortAddr(openListing.owner)}. The prompt now appears in My Prompts.`
          : `Owned ✓ — token #${openListing.tokenId.toString()} is yours.`,
      );
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setPurchaseStatus(
        `Failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setPurchasing(false);
    }
  }, [address, ensureChain, ethersSigner, openListing, publicClient, resetTx, writeContractAsync]);

  return (
    <main className="min-h-screen bg-white font-sans tracking-tight text-black">
      <NavBar />

      <section className="relative overflow-hidden border-b-2 border-black bg-white px-6 py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(#0000FF 1px, transparent 1px), linear-gradient(90deg, #0000FF 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative mx-auto max-w-7xl">
          <span className="inline-block border-2 border-black bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#0000FF] shadow-[3px_3px_0_0_rgba(0,0,255,0.2)]">
            Prompt marketplace · live
          </span>
          <h1 className="mt-7 text-[44px] font-black leading-[0.95] tracking-tighter sm:text-[64px] lg:text-[76px]">
            Sealed prompts.
            <br />
            <span className="text-[#0000FF]">Real ownership.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-[16px] leading-7 text-gray-700">
            Every card is an ERC-7857 iNFT minted to 0G Galileo, ciphertext on 0G Storage.
            The body never appears here. Flat price <strong>{LISTING_PRICE_LABEL}</strong> goes straight to the
            seller&rsquo;s wallet; the buyer&rsquo;s purchase re-encrypts the prompt under a
            fresh key so the seller&rsquo;s key cryptographically stops working.
          </p>
        </div>
      </section>

      <section className="border-b-2 border-black bg-white px-6 py-5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((d) => (
              <button
                key={d}
                onClick={() => setActiveCategory(d)}
                className={`border-2 border-black px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] transition ${
                  activeCategory === d
                    ? "bg-[#0000FF] text-white"
                    : "bg-white text-gray-700 hover:bg-blue-50 hover:text-[#0000FF]"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-[11px] font-bold text-gray-500">
            <span className="uppercase tracking-[0.18em]">
              {visible.length} of {listings.length} live
            </span>
            <span className="h-3 w-px bg-black/30" />
            <span className="uppercase tracking-[0.18em]">Flat {LISTING_PRICE_LABEL}</span>
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-12">
        <div className="mx-auto max-w-7xl">
          {!isContractDeployed() && (
            <div className="mb-6 border-2 border-amber-400 bg-amber-50 px-5 py-4 text-[12px] text-amber-900">
              Contract not deployed. Paste INFT_ADDRESS in app/lib/contract.ts.
            </div>
          )}
          {error && (
            <div className="mb-6 border-2 border-red-500 bg-red-50 px-5 py-4 text-[12px] text-red-900">
              {error}
            </div>
          )}
          {loading && listings.length === 0 && (
            <div className="border-2 border-dashed border-black/30 bg-blue-50/40 px-6 py-12 text-center text-[12px] text-gray-700">
              Reading on-chain prompts from Galileo…
            </div>
          )}
          {!loading && listings.length === 0 && !error && (
            <div className="border-2 border-black bg-white p-10 text-center shadow-[6px_6px_0_0_rgba(0,0,255,0.18)]">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0000FF]">
                No prompts on this contract yet
              </p>
              <p className="mx-auto mt-3 max-w-md text-[13px] leading-6 text-gray-700">
                Be the first listing. Mint a sealed prompt in your vault and it will
                appear here for every wallet on Galileo.
              </p>
              <Link
                href="/prompts"
                className="mt-6 inline-block border-2 border-black bg-[#0000FF] px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
              >
                Mint a Prompt →
              </Link>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((p) => {
              const owned = isOwner(p);
              const id = p.tokenId.toString().padStart(2, "0");
              return (
                <div
                  key={p.tokenId.toString()}
                  className="group flex flex-col overflow-hidden border-2 border-black bg-white transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_rgba(0,0,255,0.25)]"
                >
                  <div className="relative h-[140px] overflow-hidden border-b-2 border-black bg-blue-50">
                    <Image
                      src={fallbackImage(p.tokenId)}
                      alt={`${p.name} prompt`}
                      fill
                      className="object-cover opacity-90 transition group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
                      <span className="border-2 border-black bg-white px-2 py-[2px] text-[10px] font-black tracking-[0.18em] text-[#0000FF]">
                        #{id}
                      </span>
                      <span className="flex items-center gap-1 border-2 border-black bg-[#0000FF] px-2 py-[2px] text-[10px] font-black uppercase tracking-[0.18em] text-white">
                        <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
                          <rect x="6" y="11" width="12" height="9" rx="1" stroke="white" strokeWidth="2.4" />
                          <path d="M9 11V8a3 3 0 1 1 6 0v3" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
                        </svg>
                        Sealed
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0000FF]">
                      {p.category}
                    </p>
                    <p className="mt-1 text-[16px] font-black leading-tight tracking-tight text-black">
                      {p.name}
                    </p>
                    <p className="mt-2 line-clamp-3 text-[13px] leading-6 text-gray-700">
                      {p.description ??
                        "Sealed prompt — body is encrypted client-side and stored on 0G Storage. Only the owner's wallet can decrypt."}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-px border-2 border-black bg-black">
                      <div className="bg-white px-2 py-2 text-center">
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-gray-500">
                          Seller
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] font-black text-black">
                          {shortAddr(p.owner)}
                        </p>
                      </div>
                      <div className="bg-white px-2 py-2 text-center">
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-gray-500">
                          Price
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] font-black text-[#0000FF]">
                          {LISTING_PRICE_LABEL}
                        </p>
                      </div>
                    </div>

                    <div className="mt-auto flex items-center justify-end pt-5">
                      {owned ? (
                        <Link
                          href={`/prompts?focus=${p.tokenId.toString()}`}
                          className="border-2 border-black bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#0000FF] shadow-[3px_3px_0_0_rgba(0,0,255,0.2)] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_rgba(0,0,255,0.2)]"
                        >
                          You own this → Console
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleOpen(p)}
                          className="border-2 border-black bg-[#0000FF] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_rgba(0,0,0,1)]"
                        >
                          Buy {LISTING_PRICE_LABEL} →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y-2 border-black bg-blue-50 px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-px border-2 border-black bg-black md:grid-cols-3">
            <div className="bg-white p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0000FF]">
                Why a Prompt iNFT
              </p>
              <p className="mt-3 text-[13px] leading-6 text-gray-700">
                A screenshot of a prompt is a copy. An iNFT is the only one.
                Buying the token re-seals the cipher — the seller loses access.
              </p>
            </div>
            <div className="bg-white p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0000FF]">
                What you get on buy
              </p>
              <p className="mt-3 text-[13px] leading-6 text-gray-700">
                The token, the sealed key delivered in the on-chain Purchased event,
                and the right to decrypt locally — for {LISTING_PRICE_LABEL}, paid straight to the seller.
              </p>
            </div>
            <div className="bg-white p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0000FF]">
                What the seller loses
              </p>
              <p className="mt-3 text-[13px] leading-6 text-gray-700">
                Their key. The ciphertext is re-encrypted under a fresh key bound to you —
                their local reveal stops working.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-2 border-black bg-white p-6 shadow-[6px_6px_0_0_rgba(0,0,255,0.2)]">
            <div>
              <p className="text-[15px] font-black tracking-tight text-black">
                Got a prompt to list?
              </p>
              <p className="mt-1 text-[13px] text-gray-700">
                Mint it as a sealed iNFT in Sealbox. Two wallet clicks.
              </p>
            </div>
            <Link
              href="/prompts"
              className="border-2 border-black bg-[#0000FF] px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
            >
              Mint a Prompt →
            </Link>
          </div>
        </div>
      </section>

      {openListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg border-2 border-black bg-white shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
            <div className="flex items-start justify-between gap-4 border-b-2 border-black bg-[#0000FF] px-5 py-3 text-white">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-100">
                  Buy prompt #{openListing.tokenId.toString()} · {LISTING_PRICE_LABEL}
                </p>
                <p className="mt-1 truncate text-[14px] font-black tracking-tight">
                  {openListing.name}
                </p>
              </div>
              <button
                onClick={() => setOpenListing(null)}
                className="text-[20px] font-black hover:text-blue-100"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 px-5 py-4 text-[12px] leading-6 text-gray-800">
              {readListing(openListing.tokenId) ? (
                <p>
                  One click. Your wallet will (1) re-encrypt the prompt under a fresh AES-256 key
                  bound to your address, (2) upload the new ciphertext to 0G Storage, and (3)
                  call <code className="font-mono text-[#0000FF]">purchase()</code> with{" "}
                  <strong>{LISTING_PRICE_LABEL}</strong> that the contract forwards straight to the seller.
                </p>
              ) : (
                <p>
                  No escrowed seller key for this prompt — the seller hasn&rsquo;t published it yet.
                  Send them the deep-link below and they&rsquo;ll initiate the sealed transfer.
                </p>
              )}

              <div className="grid gap-2">
                <div className="border-2 border-black bg-blue-50/60 px-3 py-2">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#0000FF]">
                    Seller (paid {LISTING_PRICE_LABEL})
                  </p>
                  <p className="mt-1 break-all font-mono text-[11px] font-bold text-black">
                    {openListing.owner}
                  </p>
                </div>
                <div className="border-2 border-black bg-blue-50/60 px-3 py-2">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#0000FF]">
                    You (buyer)
                  </p>
                  <p className="mt-1 break-all font-mono text-[11px] font-bold text-black">
                    {address ?? "Connect a wallet to purchase"}
                  </p>
                </div>
              </div>

              {purchaseStatus && (
                <div className="border-2 border-black bg-blue-50/60 px-3 py-2 text-[11px] text-black">
                  {purchaseStatus}
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

              {!address && (
                <div className="border-2 border-amber-400 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                  Connect a wallet first.
                </div>
              )}

              {address && readListing(openListing.tokenId) && (
                <button
                  onClick={handlePurchase}
                  disabled={purchasing}
                  className="w-full border-2 border-black bg-[#0000FF] px-4 py-3 text-[12px] font-black uppercase tracking-[0.22em] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] disabled:cursor-wait disabled:opacity-60"
                >
                  {purchasing ? "Sealing + paying…" : `Buy for ${LISTING_PRICE_LABEL} →`}
                </button>
              )}

              {address && !readListing(openListing.tokenId) && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(sellerDeepLink(openListing));
                      setCopied("link");
                      setTimeout(() => setCopied(null), 1800);
                    }}
                    className="border-2 border-black bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#0000FF] hover:bg-blue-50"
                  >
                    {copied === "link" ? "Copied ✓" : "Copy seller deep-link"}
                  </button>
                  <a
                    href={sellerDeepLink(openListing)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-2 border-black bg-[#0000FF] px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_rgba(0,0,0,1)]"
                  >
                    Open as seller →
                  </a>
                  <a
                    href={explorerAddress(openListing.owner)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-2 border-black bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#0000FF] hover:bg-blue-50"
                  >
                    Seller on explorer ↗
                  </a>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t-2 border-black px-5 py-3">
              <button
                onClick={() => setOpenListing(null)}
                className="border-2 border-black bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-gray-700 hover:bg-blue-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
