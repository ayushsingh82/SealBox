import Link from "next/link";
import NavBar from "./components/NavBar";

const features = [
  {
    id: "encrypt",
    tag: "01",
    title: "Encrypt locally",
    desc: "AES-256-GCM key generated in your browser. The prompt body never leaves your machine in plaintext.",
    status: "Live",
    href: "/prompts",
  },
  {
    id: "mint",
    tag: "02",
    title: "Mint as ERC-7857",
    desc: "The iNFT wraps the encryption key. Owning the token = owning the prompt. Listed on the live Galileo contract.",
    status: "Live",
    href: "/prompts",
  },
  {
    id: "reveal",
    tag: "03",
    title: "Reveal client-side",
    desc: "Ciphertext on 0G Storage, key in your wallet's local browser cache. Plug the prompt into any LLM.",
    status: "Live",
    href: "/prompts",
  },
  {
    id: "sell",
    tag: "04",
    title: "Sell · atomic loss",
    desc: "`transfer()` re-seals the key to the buyer. Your local reveal stops working — by cryptography, not promise.",
    status: "Live",
    href: "/market",
  },
  {
    id: "rent",
    tag: "05",
    title: "Rent · authorizeUsage",
    desc: "Grant an executor N-uses or time-boxed access without selling. Revoke on-chain in one tx.",
    status: "Live",
    href: "/market",
  },
  {
    id: "templates",
    tag: "06",
    title: "Starter library",
    desc: "Battle-tested prompts with strict guardrails. Fork, tune, mint as your own iNFT.",
    status: "Live",
    href: "/templates",
  },
];

const stack = [
  { layer: "0G Chain", role: "ERC-7857 mint, transfer, authorizeUsage", token: "Chain 16602" },
  { layer: "0G Storage", role: "Encrypted prompt ciphertext; Merkle root on chain", token: "og-storage://" },
  { layer: "AES-256-GCM", role: "Client-side encryption via Web Crypto", token: "key never leaves" },
  { layer: "Oracle", role: "Verifies sealed-key re-encryption on transfer", token: "Galileo testnet" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white font-sans tracking-tight text-black">
      <NavBar />

      {/* ───── HERO ───── */}
      <section className="relative overflow-hidden border-b-2 border-black bg-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(#0000FF 1px, transparent 1px), linear-gradient(90deg, #0000FF 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.1fr_1fr] lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 border-2 border-black bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#0000FF] shadow-[3px_3px_0_0_rgba(0,0,255,0.2)]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/60" />
                <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live · Galileo testnet
            </span>

            <h1 className="mt-7 text-[44px] font-black leading-[0.95] tracking-tighter sm:text-[68px] lg:text-[84px]">
              Stop screenshotting prompts.
              <br />
              <span className="text-[#0000FF]">Sell them.</span>
            </h1>

            <p className="mt-7 max-w-xl text-[16px] leading-7 text-gray-700">
              A prompt is an{" "}
              <span className="font-bold text-black">ERC-7857 iNFT</span>. Hold the
              token = decrypt the prompt locally and plug into any LLM. On{" "}
              <code className="bg-blue-50 px-1 text-[#0000FF]">transfer()</code>{" "}
              the key re-seals to the buyer — the seller cryptographically loses
              access the moment the tx commits.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/prompts"
                className="group inline-flex items-center gap-2 border-2 border-black bg-[#0000FF] px-7 py-3.5 text-[12px] font-black uppercase tracking-[0.2em] text-white shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]"
              >
                Mint a Prompt iNFT
                <span className="transition group-hover:translate-x-1">→</span>
              </Link>
              <Link
                href="/market"
                className="inline-flex items-center gap-2 border-2 border-black bg-white px-7 py-3.5 text-[12px] font-black uppercase tracking-[0.2em] text-black shadow-[6px_6px_0_0_rgba(0,0,255,0.25)] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_0_rgba(0,0,255,0.25)]"
              >
                Browse the market
              </Link>
            </div>

            <div className="mt-12 grid max-w-lg grid-cols-3 gap-px border-2 border-black bg-black">
              {[
                { k: "Standard", v: "ERC-7857" },
                { k: "Storage", v: "0G Storage" },
                { k: "Chain", v: "16602" },
              ].map((s) => (
                <div key={s.k} className="bg-white px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                    {s.k}
                  </p>
                  <p className="mt-2 text-[14px] font-black tracking-tight text-[#0000FF]">
                    {s.v}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Prompt iNFT preview */}
          <div className="lg:pt-2">
            <div className="border-2 border-black bg-white">
              <div className="relative overflow-hidden border-b-2 border-black bg-[#0000FF] px-6 py-10">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-25"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                  }}
                />
                <div className="relative flex items-center justify-between">
                  <span className="border-2 border-white bg-[#0000FF] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white">
                    Sealed · iNFT
                  </span>
                  <span className="font-mono text-[11px] font-black uppercase tracking-[0.22em] text-white/70">
                    Galileo · 16602
                  </span>
                </div>

                <div className="relative mt-5 flex items-end justify-between gap-4">
                  <p className="font-mono text-[64px] font-black leading-none tracking-tighter text-white">
                    #042
                  </p>
                  <svg viewBox="0 0 64 64" fill="none" className="h-16 w-16 shrink-0">
                    <path d="M32 4 L56 17 L56 47 L32 60 L8 47 L8 17 Z" fill="white" stroke="black" strokeWidth="2" />
                    <rect x="20" y="28" width="24" height="20" rx="1" fill="#0000FF" stroke="black" strokeWidth="2" />
                    <path d="M24 28 V22 a8 8 0 0 1 16 0 V28" stroke="black" strokeWidth="2.4" strokeLinecap="round" fill="none" />
                    <circle cx="32" cy="37" r="2.5" fill="white" />
                    <rect x="30.5" y="39.5" width="3" height="5" fill="white" />
                  </svg>
                </div>

                <p className="relative mt-4 text-[20px] font-black leading-tight tracking-tight text-white">
                  Solidity Auditor Assistant
                </p>
                <p className="relative mt-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
                  og-storage://0x9c4f…d1a3
                </p>
              </div>

              <div className="grid grid-cols-4 gap-px border-b-2 border-black bg-black text-center">
                {[
                  { k: "Uses", v: "1,903" },
                  { k: "Rating", v: "4.9★" },
                  { k: "Price", v: "18 OG" },
                  { k: "Owner", v: "0xA7…3F2" },
                ].map((s) => (
                  <div key={s.k} className="bg-white px-2 py-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-gray-500">
                      {s.k}
                    </p>
                    <p className="mt-1.5 font-mono text-[13px] font-black text-black">
                      {s.v}
                    </p>
                  </div>
                ))}
              </div>

              <div className="bg-white px-5 py-5">
                <div className="flex items-center justify-between">
                  <span className="border-2 border-emerald-600 bg-emerald-50 px-2 py-[2px] text-[9px] font-black uppercase tracking-[0.2em] text-emerald-700">
                    ◆ Sealed transfer
                  </span>
                  <p className="font-mono text-[10px] font-bold text-gray-500">
                    after sale: seller cannot decrypt
                  </p>
                </div>

                <div className="mt-3 border-2 border-black bg-black px-4 py-3 font-mono text-[12px] leading-6 text-white">
                  <p className="text-emerald-400">{">"} You are a senior smart-contract auditor…</p>
                  <p className="mt-2 text-white/80">
                    Lists issues by severity, outputs <span className="text-white">unified diff patches</span> for Criticals + Highs…
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── HOW IT WORKS ───── */}
      <section className="border-b-2 border-black bg-white px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <span className="text-[11px] font-black uppercase tracking-[0.24em] text-[#0000FF]">
                How it works
              </span>
              <h2 className="mt-3 text-[36px] font-black leading-[1.05] tracking-tight text-black sm:text-[52px]">
                Six pieces. <span className="text-[#0000FF]">One sealed asset.</span>
              </h2>
              <p className="mt-3 max-w-xl text-[14px] leading-7 text-gray-600">
                From paste to mint to sale — without ever leaking the prompt body to a server.
              </p>
            </div>
            <Link
              href="/features"
              className="border-2 border-black bg-white px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] text-black shadow-[4px_4px_0_0_rgba(0,0,255,0.2)] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_rgba(0,0,255,0.2)]"
            >
              See all features →
            </Link>
          </div>

          <div className="mt-12 grid gap-px border-2 border-black bg-black md:grid-cols-3">
            {features.map((f) => (
              <Link
                key={f.id}
                href={f.href}
                className="group relative flex flex-col bg-white p-6 transition-colors duration-150 hover:bg-[#0000FF]"
              >
                <div className="flex items-start justify-between">
                  <p className="font-mono text-[32px] font-black leading-none text-[#0000FF] transition-colors group-hover:text-white">
                    {f.tag}
                  </p>
                  <span className="border-2 border-black bg-[#0000FF] px-2 py-[2px] text-[9px] font-black uppercase tracking-[0.18em] text-white transition-colors group-hover:bg-white group-hover:text-[#0000FF]">
                    {f.status}
                  </span>
                </div>
                <p className="mt-5 text-[18px] font-black tracking-tight text-black transition-colors group-hover:text-white">
                  {f.title}
                </p>
                <p className="mt-2 flex-1 text-[13px] leading-6 text-gray-700 transition-colors group-hover:text-blue-100">
                  {f.desc}
                </p>
                <p className="mt-5 text-[10px] font-black uppercase tracking-[0.22em] text-[#0000FF] opacity-0 transition group-hover:text-white group-hover:opacity-100">
                  Open →
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ───── WHY iNFT ───── */}
      <section className="border-b-2 border-black bg-[#0000FF] px-6 py-20 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <span className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-100">
              Why this is new
            </span>
            <h2 className="mt-3 text-[36px] font-black leading-[1.05] tracking-tight sm:text-[52px]">
              A prompt has never been <span className="text-white/70">an asset.</span>
            </h2>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-blue-100">
              PromptBase resells screenshots — anyone with eyes is the new owner.
              Custom GPTs let you publish, not sell. There has never been a primitive
              for transferring opaque artifact <em>access</em> with provable loss for
              the seller. ERC-7857 is that primitive.
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              {["Sealed transfer", "Atomic loss of access", "authorizeUsage()", "No custodian"].map((t) => (
                <span
                  key={t}
                  className="border-2 border-white bg-transparent px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="border-2 border-white bg-white text-black">
            {stack.map((s, i) => (
              <div
                key={s.layer}
                className={`flex items-start justify-between gap-4 px-5 py-4 ${i !== stack.length - 1 ? "border-b-2 border-black" : ""}`}
              >
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0000FF]">
                    {s.layer}
                  </p>
                  <p className="mt-1 text-[13px] leading-6 text-gray-800">{s.role}</p>
                </div>
                <p className="shrink-0 font-mono text-[11px] font-black uppercase tracking-[0.16em] text-black">
                  {s.token}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── CTA ───── */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/prompts"
            className="group flex flex-col items-start gap-6 border-2 border-black bg-white p-10 shadow-[10px_10px_0_0_rgba(0,0,255,0.18)] transition hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[5px_5px_0_0_rgba(0,0,255,0.18)] md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#0000FF]">
                Try it on Galileo
              </p>
              <p className="mt-3 text-[28px] font-black leading-tight tracking-tight text-black sm:text-[36px]">
                Seal your first prompt iNFT →
              </p>
              <p className="mt-2 max-w-xl text-[14px] leading-7 text-gray-700">
                Paste a prompt. Encrypt locally. Mint as ERC-7857. Two wallet confirms
                and your prompt becomes a sellable, rentable, transferable asset.
              </p>
            </div>
            <div className="border-2 border-black bg-[#0000FF] px-6 py-3 font-mono text-[12px] font-black uppercase tracking-[0.22em] text-white transition group-hover:translate-x-1">
              /prompts
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}
