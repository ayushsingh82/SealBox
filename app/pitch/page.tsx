"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Slide = {
  eyebrow: string;
  title: React.ReactNode;
  body: React.ReactNode;
  variant?: "cover" | "default";
};

const slides: Slide[] = [
  // 1 — Cover
  {
    variant: "cover",
    eyebrow: "Sealbox · sealed prompt marketplace",
    title: (
      <>
        Stop screenshotting
        <br />
        prompts. <span className="text-white/70">Sell them.</span>
      </>
    ),
    body: (
      <div className="space-y-8">
        <p className="max-w-3xl text-[18px] leading-8 text-blue-100">
          A prompt is an <strong className="text-white">ERC-7857 iNFT</strong>.
          Hold the token = decrypt the prompt locally and plug into any LLM.
          On transfer the key re-seals to the buyer — the seller cryptographically
          loses access the moment the tx commits.
        </p>
        <div className="flex flex-wrap items-center gap-6 text-[11px] uppercase tracking-[0.24em] text-blue-100">
          <span className="rounded-full border border-white/30 px-3 py-1.5">Live · Galileo 16602</span>
          <span className="font-mono">ERC-7857 · 0G Storage · AES-256-GCM</span>
        </div>
      </div>
    ),
  },

  // 2 — Problem
  {
    eyebrow: "01 · Problem",
    title: (
      <>
        A prompt has never been
        <br />
        <span className="text-[#0000FF]">a real asset.</span>
      </>
    ),
    body: (
      <div className="space-y-6">
        <p className="max-w-4xl text-[18px] leading-8 text-gray-800">
          Prompt engineering is a real craft and great prompts have real value —
          but there&rsquo;s no way to <strong className="text-black">own</strong>{" "}
          one. Screenshots leak instantly. Custom GPTs let you publish, not sell.
          PromptBase resells text that&rsquo;s copyable on sight. Anyone with eyes
          becomes the new owner — selling is a one-way information leak, not a
          transfer.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              h: "Screenshots are the &lsquo;market&rsquo;",
              p: "PromptBase, marketplaces of marketplaces — they resell strings of text. The buyer sees them; the seller still has them.",
            },
            {
              h: "Custom GPTs lock you in",
              p: "You can publish to a vendor&rsquo;s store. You can&rsquo;t sell ownership. You can&rsquo;t take it to a different model.",
            },
            {
              h: "No on-chain revoke",
              p: "Even &ldquo;licenses&rdquo; today mean a Slack message and a handshake. There&rsquo;s no atomic, cryptographic way to take access away.",
            },
          ].map((c) => (
            <div key={c.h} className="border-2 border-black bg-white p-6 shadow-[6px_6px_0_0_rgba(0,0,255,0.12)]">
              <p
                className="text-[13px] font-bold uppercase tracking-[0.18em] text-[#0000FF]"
                dangerouslySetInnerHTML={{ __html: c.h }}
              />
              <p
                className="mt-3 text-[14px] leading-6 text-gray-800"
                dangerouslySetInnerHTML={{ __html: c.p }}
              />
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // 3 — Solution
  {
    eyebrow: "02 · Solution",
    title: (
      <>
        A prompt becomes
        <br />
        <span className="text-[#0000FF]">a real digital asset.</span>
      </>
    ),
    body: (
      <div className="space-y-6">
        <p className="max-w-4xl text-[18px] leading-8 text-gray-800">
          Encrypt the prompt locally with AES-256-GCM. Upload the ciphertext to{" "}
          <strong className="text-black">0G Storage</strong>. Mint an{" "}
          <strong className="text-black">ERC-7857 iNFT</strong> whose encrypted
          URI is the storage root. On{" "}
          <code className="bg-blue-50 px-1 text-[#0000FF]">transfer()</code> an
          oracle-verified proof re-encrypts the key under the buyer&rsquo;s pubkey;
          the seller&rsquo;s local key is invalidated. Rentals are on-chain{" "}
          <code className="bg-blue-50 px-1 text-[#0000FF]">authorizeUsage()</code>{" "}
          grants you can revoke in one tx.
        </p>
        <div className="grid gap-px overflow-hidden border-2 border-black bg-black md:grid-cols-2">
          {[
            { k: "Client-side AES-256-GCM", v: "Web Crypto generates the key. The plaintext prompt never leaves your browser unencrypted." },
            { k: "0G Storage as the body", v: "Ciphertext stored decentralized; only the Merkle root is on chain. No vendor holds the file." },
            { k: "ERC-7857 sealed transfer", v: "Oracle-verified proof re-seals the key on transfer. Atomic loss of access — by cryptography, not promise." },
            { k: "authorizeUsage()", v: "Grant N-uses or time-boxed access. revokeUsage() takes it back in a single on-chain tx." },
          ].map((c) => (
            <div key={c.k} className="bg-white p-7">
              <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#0000FF]">{c.k}</p>
              <p className="mt-3 text-[14px] leading-7 text-gray-800">{c.v}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // 4 — How it works
  {
    eyebrow: "03 · How it works",
    title: (
      <>
        Four steps.
        <br />
        <span className="text-[#0000FF]">One sealed prompt.</span>
      </>
    ),
    body: (
      <div className="space-y-6">
        <div className="grid gap-px overflow-hidden border-2 border-black bg-black md:grid-cols-4">
          {[
            { step: "01", label: "Pick / Paste", sub: "Start from 8 battle-tested starters or paste your own. AES key generated in the browser." },
            { step: "02", label: "Encrypt", sub: "Manifest JSON encrypted client-side. keccak256(ciphertext) becomes the metadataHash." },
            { step: "03", label: "Upload", sub: "Ciphertext → 0G Storage. The SDK returns a Merkle root → encryptedURI." },
            { step: "04", label: "Mint", sub: "ERC-7857 mint(root, hash). The token is the prompt; the wallet is the key." },
          ].map((s) => (
            <div key={s.step} className="flex flex-col gap-3 bg-white p-7">
              <p className="font-mono text-[40px] font-black leading-none text-[#0000FF]">{s.step}</p>
              <p className="text-[20px] font-semibold tracking-tight text-black">{s.label}</p>
              <p className="text-[13px] leading-6 text-gray-600">{s.sub}</p>
            </div>
          ))}
        </div>
        <p className="text-[14px] leading-7 text-gray-700">
          <strong className="text-black">Transfer is the same flow in reverse</strong>{" "}
          — a fresh AES key is generated by the buyer&rsquo;s wallet, an
          oracle-signed proof binds it to the iNFT, the seller&rsquo;s local key
          stops decrypting.
        </p>
      </div>
    ),
  },

  // 5 — Why 0G
  {
    eyebrow: "04 · Why 0G",
    title: (
      <>
        Every load-bearing piece
        <br />
        <span className="text-[#0000FF]">on one network.</span>
      </>
    ),
    body: (
      <div className="space-y-5">
        <div className="overflow-hidden border-2 border-black">
          <table className="w-full text-[15px]">
            <thead className="bg-[#0000FF] text-white">
              <tr>
                <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.2em]">Layer</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.2em]">What it does</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black text-gray-900">
              {[
                ["0G Chain", "ERC-7857 mint, transfer, authorizeUsage. EVM at L1 speed, chain 16602."],
                ["0G Storage", "Encrypted prompt ciphertext; Merkle root recorded on chain as encryptedURI."],
                ["AES-256-GCM", "Browser-side Web Crypto. The key never leaves your machine in plaintext."],
                ["Oracle", "Signs re-encryption proofs on transfer. Galileo testnet today; 0G DA in production."],
              ].map(([layer, desc]) => (
                <tr key={layer}>
                  <td className="px-6 py-4 font-bold">{layer}</td>
                  <td className="px-6 py-4 text-gray-800">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[15px] leading-7 text-gray-700">
          One wallet, one chain, one set of fees. Other stacks need bridge logic
          between an L1, a storage network, and an oracle. Sealbox is one URL.
        </p>
      </div>
    ),
  },

  // 6 — Market
  {
    eyebrow: "05 · Market",
    title: (
      <>
        First wedge:
        <br />
        <span className="text-[#0000FF]">prompt engineers + AI consultants.</span>
      </>
    ),
    body: (
      <div className="space-y-5">
        <div className="border-2 border-black bg-[#0000FF] p-7 text-white shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
          <p className="text-[12px] font-black uppercase tracking-[0.22em] text-blue-100">
            01 · The wedge
          </p>
          <p className="mt-3 text-[18px] leading-7">
            Prompt engineers and AI consultants have valuable prompt libraries and
            <strong className="text-white"> zero way to monetize them</strong>{" "}
            beyond a SaaS subscription. PromptBase resells screenshots; Custom GPTs
            lock to a vendor. Sealbox makes a prompt a real asset they can sell,
            rent, or escrow.
          </p>
        </div>

        <p className="text-[12px] font-black uppercase tracking-[0.22em] text-gray-600">
          02 · Expansion verticals
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { k: "Legal", v: "Brief-writing, citation-aware drafting prompts sold to firms." },
            { k: "Code", v: "Audit / refactor / debug prompts as rentable tools for dev teams." },
            { k: "Marketing", v: "Outbound copy, landing pages, ads — proven prompts as licensable assets." },
            { k: "Research", v: "Pre-review, methodology-check, synthesis prompts for academics." },
            { k: "Creative", v: "Dialog, lore, scriptwriting prompts — sold per-use or per-project." },
            { k: "Enterprise", v: "Internal agent configs licensed across teams with on-chain revoke." },
          ].map((c) => (
            <div key={c.k} className="border-2 border-black bg-white p-5 transition hover:bg-blue-50">
              <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#0000FF]">{c.k}</p>
              <p className="mt-2 text-[13px] leading-6 text-gray-700">{c.v}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // 7 — Business model
  {
    eyebrow: "06 · Business model",
    title: (
      <>
        We earn every time
        <br />
        <span className="text-[#0000FF]">a prompt moves or runs.</span>
      </>
    ),
    body: (
      <div className="grid gap-5 md:grid-cols-2">
        {[
          { tag: "01", k: "Marketplace take rate", v: "2.5% of each prompt iNFT sale. The token is the access; price reflects real value, not collectible value." },
          { tag: "02", k: "Authorization royalty", v: "Per-use or per-time fee on authorizeUsage rentals. Stream splits between prompt owner and protocol." },
          { tag: "03", k: "Curation fees", v: "Featured listings on /market. Verified-creator badges. Trending categories." },
          { tag: "04", k: "Enterprise tier", v: "Org-wide prompt vaults with role-based authorize / revoke, audit logs, SAML auth on top." },
        ].map((c) => (
          <div key={c.k} className="flex gap-5 border-2 border-black bg-white p-6 shadow-[8px_8px_0_0_rgba(0,0,255,0.15)]">
            <p className="font-mono text-[42px] font-black leading-none text-[#0000FF]">{c.tag}</p>
            <div>
              <p className="text-[15px] font-bold uppercase tracking-[0.16em] text-black">{c.k}</p>
              <p className="mt-2 text-[14px] leading-6 text-gray-700">{c.v}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },

  // 8 — Roadmap / Ask
  {
    eyebrow: "07 · Where we are",
    title: (
      <>
        Live on Galileo today.
        <br />
        <span className="text-[#0000FF]">Next: full buyer-side claim.</span>
      </>
    ),
    body: (
      <div className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="border-2 border-emerald-600 bg-emerald-50 p-6">
            <p className="text-[13px] font-black uppercase tracking-[0.18em] text-emerald-700">
              Shipped
            </p>
            <ul className="mt-3 space-y-2 text-[14px] leading-6 text-emerald-900">
              <li>✓ ERC-7857 + Oracle live on Galileo (16602)</li>
              <li>✓ Encrypt + mint flow end-to-end via wagmi/viem + 0G Storage</li>
              <li>✓ Reveal — fetch ciphertext, decrypt locally, copy to clipboard</li>
              <li>✓ One-click buy via purchase() — re-seal + 0.1 OG to seller</li>
              <li>✓ Seller-side transfer() with fresh sealed key + key wipe</li>
              <li>✓ Buyer-side claim: SealedKeyDelivered → local key auto-import</li>
              <li>✓ Rent via authorizeUsage() with revoke</li>
              <li>✓ Live marketplace from on-chain Minted events</li>
            </ul>
          </div>
          <div className="border-2 border-[#0000FF] bg-blue-50 p-6">
            <p className="text-[13px] font-black uppercase tracking-[0.18em] text-[#0000FF]">
              Next 30 days
            </p>
            <ul className="mt-3 space-y-2 text-[14px] leading-6 text-gray-900">
              <li>→ Per-listing custom pricing (drop the flat 0.1 OG)</li>
              <li>→ ECIES sealing to buyer pubkey (drop the escrowed-key shortcut)</li>
              <li>→ Per-executor enforcement of use:N / day:N semantics</li>
              <li>→ Production oracle backed by 0G DA</li>
            </ul>
          </div>
        </div>
        <Link
          href="/prompts"
          className="flex flex-wrap items-center justify-between gap-4 border-2 border-black bg-[#0000FF] p-7 text-white shadow-[8px_8px_0_0_rgba(0,0,0,1)] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
        >
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-blue-100">
              Try it now
            </p>
            <p className="mt-2 text-[22px] font-semibold tracking-tight">
              Mint your first prompt iNFT on Galileo →
            </p>
          </div>
          <span className="font-mono text-[14px] uppercase tracking-[0.18em]">/prompts</span>
        </Link>
      </div>
    ),
  },
];

export default function PitchPage() {
  const [idx, setIdx] = useState(0);
  const total = slides.length;
  const slide = slides[idx];
  const isCover = slide.variant === "cover";

  const next = useCallback(() => setIdx((i) => Math.min(total - 1, i + 1)), [total]);
  const prev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") next();
      else if (e.key === "ArrowLeft" || e.key === "PageUp") prev();
      else if (e.key === "Home") setIdx(0);
      else if (e.key === "End") setIdx(total - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, total]);

  return (
    <main
      className={`relative flex h-screen w-screen flex-col overflow-hidden font-sans tracking-tight ${
        isCover ? "bg-[#0000FF] text-white" : "bg-white text-black"
      }`}
    >
      <header className="flex items-center justify-between px-10 py-6 text-[11px] uppercase tracking-[0.24em]">
        <Link
          href="/"
          className={`flex items-center gap-2.5 font-bold ${isCover ? "text-white" : "text-black"}`}
        >
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-[6px] ${
              isCover ? "bg-white" : "bg-[#0000FF]"
            }`}
          >
            <svg viewBox="0 0 40 40" className={`h-4 w-4 ${isCover ? "text-[#0000FF]" : "text-white"}`}>
              <path
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M20 2.5 35 11.25 35 28.75 20 37.5 5 28.75 5 11.25Z M16.5 16.1A3.5 3.5 0 1 1 23.5 16.1 3.5 3.5 0 1 1 16.5 16.1Z M18.3 18.5 16.9 27.5 23.1 27.5 21.7 18.5Z"
              />
            </svg>
          </div>
          <span className={isCover ? "text-blue-200" : "text-[#0000FF]"}>0g</span>Prompt
        </Link>
        <span className={`font-mono ${isCover ? "text-blue-100" : "text-gray-500"}`}>
          {String(idx + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
      </header>

      <section className="flex flex-1 flex-col justify-center px-10 pb-6 sm:px-16 lg:px-24">
        <p
          className={`text-[12px] font-bold uppercase tracking-[0.3em] ${
            isCover ? "text-blue-200" : "text-[#0000FF]"
          }`}
        >
          {slide.eyebrow}
        </p>
        <h1
          className={`mt-5 max-w-6xl text-[44px] font-normal leading-[1.05] tracking-tight sm:text-[56px] lg:text-[68px] ${
            isCover ? "text-white" : "text-black"
          }`}
        >
          {slide.title}
        </h1>
        <div className="mt-10 max-w-6xl">{slide.body}</div>
      </section>

      <footer
        className={`flex items-center justify-between gap-6 border-t-2 px-10 py-5 ${
          isCover ? "border-white/20" : "border-black"
        }`}
      >
        <button
          onClick={prev}
          disabled={idx === 0}
          className={`rounded-md border-2 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] transition disabled:opacity-30 ${
            isCover
              ? "border-white bg-transparent text-white hover:bg-white/10"
              : "border-black bg-white text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
          }`}
        >
          ← Prev
        </button>

        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                i === idx
                  ? isCover
                    ? "w-10 bg-white"
                    : "w-10 bg-[#0000FF]"
                  : isCover
                    ? "w-2 bg-white/30 hover:bg-white/60"
                    : "w-2 bg-black/20 hover:bg-black/50"
              }`}
            />
          ))}
        </div>

        <button
          onClick={next}
          disabled={idx === total - 1}
          className={`rounded-md border-2 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] transition disabled:opacity-30 ${
            isCover
              ? "border-white bg-white text-[#0000FF] hover:bg-blue-50"
              : "border-black bg-[#0000FF] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
          }`}
        >
          Next →
        </button>
      </footer>
    </main>
  );
}
