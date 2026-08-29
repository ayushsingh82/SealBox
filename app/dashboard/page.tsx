"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const sidebarItems = [
  "Vault Templates",
  "Pipeline Builder",
  "Marketplace",
  "My Vaults",
  "TEE Inference",
  "0G Docs",
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#dbeafe] font-sans text-black">
      <div className="flex min-h-screen">
        <aside className="w-72 border-r-2 border-[#0000FF] bg-white">
          <div className="border-b-2 border-[#0000FF] p-6">
            <Link href="/" className="block text-2xl font-black tracking-[0.08em] text-[#0000FF] hover:text-[#0000CC]">
              <span className="text-black">0g</span>PROMPT
            </Link>
            <p className="mt-1 text-xs text-gray-600">Sealed-prompt console</p>
          </div>
          <div className="space-y-2 p-4">
            {sidebarItems.map((item) => (
              <button
                key={item}
                className="w-full overflow-hidden text-ellipsis whitespace-nowrap border-2 border-[#0000FF] bg-white px-3 py-2 text-left text-sm font-semibold text-[#0000FF] transition hover:bg-[#0000FF] hover:text-white"
              >
                {item}
              </button>
            ))}
          </div>
        </aside>

        <section className="flex-1 p-8">
          <div className="mx-auto grid w-full max-w-6xl gap-6">
            <div className="flex justify-end">
              <ConnectButton />
            </div>
            <header className="border-2 border-[#0000FF] bg-white p-6">
              <h1 className="text-3xl font-bold text-[#0000FF]">Vault Operator Console</h1>
              <p className="mt-2 text-gray-700">
                Build, encrypt, and mint sealed knowledge vaults. Backed by 0G Storage,
                ERC-7857 iNFTs, and TEE inference on 0G Compute.
              </p>
            </header>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="border-2 border-[#0000FF] bg-white p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-[#0000FF]">Storage State</p>
                <p className="mt-2 text-2xl font-bold">Encrypted at rest</p>
                <p className="mt-1 text-sm text-gray-600">AES chunks on 0G Storage</p>
              </div>
              <div className="border-2 border-[#0000FF] bg-white p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-[#0000FF]">Pipeline Mode</p>
                <p className="mt-2 text-2xl font-bold">No-code nodes</p>
                <p className="mt-1 text-sm text-gray-600">Ingest → Encrypt → Mint → Query</p>
              </div>
              <div className="border-2 border-[#0000FF] bg-white p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-[#0000FF]">iNFT Status</p>
                <p className="mt-2 text-2xl font-bold">Sealed-key ready</p>
                <p className="mt-1 text-sm text-gray-600">ERC-7857 transfer + authorizeUsage</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section className="border-2 border-[#0000FF] bg-white p-5">
                <h2 className="text-lg font-semibold text-[#0000FF]">0G Storage integration</h2>
                <ul className="mt-3 space-y-2 text-sm text-gray-700">
                  <li>TypeScript SDK for client-side encrypt + upload of chunks</li>
                  <li>Go SDK for backend ingest pipelines and embedding services</li>
                  <li>CLI for upload/download, kv-write/kv-read, root-hash verification</li>
                </ul>
              </section>
              <section className="border-2 border-[#0000FF] bg-white p-5">
                <h2 className="text-lg font-semibold text-[#0000FF]">Vault-to-iNFT flow</h2>
                <ul className="mt-3 space-y-2 text-sm text-gray-700">
                  <li>Chunk + embed docs locally, AES-encrypt before upload</li>
                  <li>Push encrypted blobs + index to 0G Storage, record root hash</li>
                  <li>Mint ERC-7857 with sealed key + storage root + policy</li>
                </ul>
              </section>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <section className="border-2 border-[#0000FF] bg-white p-5">
                <h2 className="text-lg font-semibold text-[#0000FF]">Vault templates</h2>
                <p className="mt-2 text-sm text-gray-700">
                  Domain-tuned starters for legal, medical, research, and trading vaults.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="border border-[#0000FF] bg-blue-50 px-2 py-2 text-[#0000FF]">Legal Library</div>
                  <div className="border border-[#0000FF] bg-blue-50 px-2 py-2 text-[#0000FF]">Medical Notes</div>
                  <div className="border border-[#0000FF] bg-blue-50 px-2 py-2 text-[#0000FF]">Research Corpus</div>
                  <div className="border border-[#0000FF] bg-blue-50 px-2 py-2 text-[#0000FF]">Trading Notes</div>
                </div>
              </section>

              <section className="border-2 border-[#0000FF] bg-white p-5">
                <h2 className="text-lg font-semibold text-[#0000FF]">iNFT mint flow</h2>
                <p className="mt-2 text-sm text-gray-700">
                  Wrap the vault&apos;s encryption key inside an ERC-7857 sealed-key token.
                </p>
                <div className="mt-4 space-y-2 text-xs text-[#0000FF]">
                  <div className="border border-[#0000FF] bg-blue-50 px-3 py-2">1. Encrypt chunks + index</div>
                  <div className="border border-[#0000FF] bg-blue-50 px-3 py-2">2. Upload to 0G Storage</div>
                  <div className="border border-[#0000FF] bg-blue-50 px-3 py-2">3. Mint + authorizeUsage</div>
                </div>
              </section>

              <section className="border-2 border-[#0000FF] bg-white p-5">
                <h2 className="text-lg font-semibold text-[#0000FF]">Pipeline nodes</h2>
                <p className="mt-2 text-sm text-gray-700">
                  Drag-and-drop blocks for ingestion, encryption, minting, and TEE queries.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="border border-[#0000FF] bg-blue-50 px-2 py-1 text-[#0000FF]">Ingest Docs</span>
                  <span className="border border-[#0000FF] bg-blue-50 px-2 py-1 text-[#0000FF]">Chunk + Embed</span>
                  <span className="border border-[#0000FF] bg-blue-50 px-2 py-1 text-[#0000FF]">Encrypt</span>
                  <span className="border border-[#0000FF] bg-blue-50 px-2 py-1 text-[#0000FF]">Mint iNFT</span>
                  <span className="border border-[#0000FF] bg-blue-50 px-2 py-1 text-[#0000FF]">TEE Query</span>
                </div>
              </section>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
