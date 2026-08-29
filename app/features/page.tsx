import Link from "next/link";
import NavBar from "../components/NavBar";

const features = [
  {
    tag: "01",
    title: "Client-side encryption",
    desc: "AES-256-GCM via Web Crypto. Key generated in your browser; the plaintext prompt never touches a server.",
    label: "Crypto",
  },
  {
    tag: "02",
    title: "Sealed-key iNFT",
    desc: "ERC-7857 token wraps the encryption key. transfer() re-seals it to the buyer atomically. No clones, no off-chain copies.",
    label: "Identity",
  },
  {
    tag: "03",
    title: "0G Storage body",
    desc: "Ciphertext lives on decentralized storage. Only the Merkle root sits on chain as encryptedURI — the body is provably yours.",
    label: "Storage",
  },
  {
    tag: "04",
    title: "License granularity",
    desc: "authorizeUsage grants an executor N-uses or time-boxed access without giving up ownership. Revoke any time, on-chain.",
    label: "Access",
  },
  {
    tag: "05",
    title: "Sealbox console",
    desc: "Mint, reveal, sell, rent — one surface. Reveal the prompt locally; copy to clipboard; plug into any LLM.",
    label: "UX",
  },
  {
    tag: "06",
    title: "Marketplace",
    desc: "Sealed listings with descriptions and ratings — the prompt body stays encrypted until handover. Buy or rent on chain.",
    label: "Trade",
  },
];

const proof = [
  {
    h: "No public URI",
    p: "The iNFT records only a Merkle root of ciphertext. Scan the chain, you see the pointer, never the prompt.",
  },
  {
    h: "No off-chain key copy",
    p: "transfer() re-encrypts under the buyer&rsquo;s pubkey via an oracle-verified proof. The seller&rsquo;s key stops working at the same block the buyer&rsquo;s starts.",
  },
  {
    h: "No screenshot resale",
    p: "Hold the token, decrypt the prompt. Lose the token, lose decryption. PromptBase can&rsquo;t do this — that&rsquo;s the whole point.",
  },
];

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-white font-sans tracking-tight text-black">
      <NavBar />

      <section className="relative overflow-hidden border-b-2 border-black bg-white px-6 py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(#0000FF 1px, transparent 1px), linear-gradient(90deg, #0000FF 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative mx-auto max-w-6xl">
          <span className="inline-block border-2 border-black bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#0000FF] shadow-[3px_3px_0_0_rgba(0,0,255,0.2)]">
            Feature overview
          </span>
          <h1 className="mt-7 text-[44px] font-black leading-[0.95] tracking-tighter sm:text-[68px] lg:text-[80px]">
            Everything inside
            <br />
            <span className="text-[#0000FF]">Sealbox.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-[16px] leading-7 text-gray-700">
            Six pieces. Pull one out and the product stops working — that&rsquo;s the proof
            each is essential.
          </p>
        </div>
      </section>

      <section className="border-b-2 border-black bg-white px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-px border-2 border-black bg-black md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <article
                key={f.tag}
                className="group relative flex flex-col bg-white p-7 transition-colors duration-150 hover:bg-[#0000FF]"
              >
                <div className="flex items-start justify-between">
                  <p className="font-mono text-[36px] font-black leading-none text-[#0000FF] transition-colors group-hover:text-white">
                    {f.tag}
                  </p>
                  <span className="border-2 border-black bg-white px-2 py-[2px] text-[9px] font-black uppercase tracking-[0.2em] text-[#0000FF] transition-colors group-hover:bg-[#0000FF] group-hover:text-white">
                    {f.label}
                  </span>
                </div>
                <p className="mt-6 text-[20px] font-black tracking-tight text-black transition-colors group-hover:text-white">
                  {f.title}
                </p>
                <p className="mt-2 text-[13px] leading-6 text-gray-700 transition-colors group-hover:text-blue-100">
                  {f.desc}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b-2 border-black bg-[#0000FF] px-6 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <span className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-100">
            What it actually guarantees
          </span>
          <h2 className="mt-3 text-[36px] font-black leading-[1.05] tracking-tight sm:text-[52px]">
            Three nos. <span className="text-white/70">Each one structural.</span>
          </h2>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {proof.map((c) => (
              <div key={c.h} className="border-2 border-white bg-white p-6 text-black">
                <p className="text-[12px] font-black uppercase tracking-[0.2em] text-[#0000FF]">
                  {c.h}
                </p>
                <p
                  className="mt-3 text-[14px] leading-7 text-gray-800"
                  dangerouslySetInnerHTML={{ __html: c.p }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-16">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#0000FF]">
              Ready
            </p>
            <p className="mt-2 text-[26px] font-black leading-tight tracking-tight text-black sm:text-[32px]">
              Stop describing it. Mint one.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/prompts"
              className="border-2 border-black bg-[#0000FF] px-6 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]"
            >
              Mint a Prompt →
            </Link>
            <Link
              href="/templates"
              className="border-2 border-black bg-white px-6 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-[#0000FF] shadow-[6px_6px_0_0_rgba(0,0,255,0.25)] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_0_rgba(0,0,255,0.25)]"
            >
              See starters
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
