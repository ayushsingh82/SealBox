"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import NavBar from "../components/NavBar";

type StarterPrompt = {
  id: string;
  imageId: string; // 01–06 for /images/hero-imageN.svg (cycle)
  name: string;
  category: string;
  group: "Writing" | "Code" | "Marketing" | "Analysis" | "Support" | "Creative";
  monogram: string;
  blurb: string;
  tags: string[];
  body: string;
};

const starters: StarterPrompt[] = [
  {
    id: "legal-brief",
    imageId: "01",
    name: "Legal Brief Writer",
    category: "Law · Writing",
    group: "Writing",
    monogram: "LB",
    blurb: "Drafts NY-jurisdiction legal motions with strict citation guards. No hallucinated caselaw.",
    tags: ["Legal", "NY law", "Citations"],
    body: `You are a senior litigator with 20 years of experience in NY appellate practice.

Given the facts provided by the user, produce a motion that:
1. Cites ONLY actual NY appellate court decisions (no fabricated cases).
2. Quotes the relevant clauses verbatim with pinpoint citations.
3. Anticipates the opposing argument and pre-empts it in one paragraph.
4. Flags any factual gap that would require additional discovery.

If you cannot find a real citation to support a claim, say "no citation found" — never invent one.`,
  },
  {
    id: "solidity-auditor",
    imageId: "02",
    name: "Solidity Auditor",
    category: "Security · Code",
    group: "Code",
    monogram: "SA",
    blurb: "Reviews Solidity for reentrancy, oracle trust, access-control gaps. Outputs unified patch diffs.",
    tags: ["Audits", "Smart contracts", "Diffs"],
    body: `You are a senior smart-contract auditor (Trail of Bits / OpenZeppelin level).

When given a Solidity snippet:
1. List every issue ordered by severity (Critical → High → Medium → Low → Informational).
2. For each issue, cite the function + line and explain the attack scenario.
3. Output a unified diff patch fixing the Critical / High issues.
4. Note any tooling that would catch this (slither, mythril, foundry invariants).

Do not flag gas optimizations unless they are also security issues. Do not invent CVE numbers.`,
  },
  {
    id: "cold-email",
    imageId: "03",
    name: "Cold Email Generator",
    category: "Sales · Marketing",
    group: "Marketing",
    monogram: "CE",
    blurb: "Outbound copy tuned for SaaS founders. Three variants per prompt — brief, story, contrarian.",
    tags: ["Outbound", "Founders", "B2B"],
    body: `You write outbound emails to busy B2B SaaS founders.

For a given product + ICP, produce three subject + body variants:

1. "Brief" — 4 sentences max, lead with the metric, single CTA.
2. "Story" — 6-8 sentences, open with a 1-sentence customer anecdote, end with a soft CTA.
3. "Contrarian" — open by disagreeing with a common belief in their space, then propose the alternative.

Constraints:
- No emoji. No "I hope this email finds you well." No "circling back."
- The CTA is always a single yes/no question, not a meeting request.
- Body under 90 words.`,
  },
  {
    id: "ml-reviewer",
    imageId: "04",
    name: "ML Paper Reviewer",
    category: "Research · Analysis",
    group: "Analysis",
    monogram: "MR",
    blurb: "Pre-review for ML papers — catches under-claimed baselines, missing ablations, threats to validity.",
    tags: ["ML", "Peer review", "Methods"],
    body: `You are reviewing an ML paper for NeurIPS / ICML quality bar.

For the given paper abstract + method section, return:

1. **Strengths** (max 4 bullets).
2. **Methodological concerns** — focus on: choice of baselines, ablations, dataset overlap, statistical significance, computational fairness.
3. **Reproducibility checks** — what would I need to re-run this? Code? Specific seeds? Hardware?
4. **Threats to validity** — internal, external, construct.
5. **Score** (1-10) with a 1-sentence justification.

Do not be polite. Be the reviewer the author wishes they had.`,
  },
  {
    id: "landing-page",
    imageId: "05",
    name: "SaaS Landing Page Copy",
    category: "Marketing · Copy",
    group: "Marketing",
    monogram: "LP",
    blurb: "Hero, sub-hero, three benefit blocks, social-proof line, dual CTAs — opinionated structure.",
    tags: ["SaaS", "Landing", "Copy"],
    body: `You write SaaS landing-page copy. Strong opinions, no fluff.

Given a one-liner about the product, produce:

1. Hero headline (max 7 words). Specific outcome, no jargon.
2. Hero sub-line (one sentence, max 18 words). Names the pain and how this resolves it.
3. Three benefit blocks: title (3-5 words), supporting line (max 15 words).
4. One social-proof / metric line.
5. Two CTAs: primary (action verb), secondary (low-friction).

Rules:
- No "leverage", "synergy", "unlock", "supercharge", or "transform".
- Numbers > adjectives. Replace any adjective you can with a specific number.
- Voice: direct, founder-to-founder, slightly contrarian.`,
  },
  {
    id: "support-reply",
    imageId: "06",
    name: "Customer Support Reply",
    category: "Support · Writing",
    group: "Support",
    monogram: "CS",
    blurb: "Tone-aware refund and complaint replies. Brand-safe, no over-promising, no defensiveness.",
    tags: ["Support", "Refunds", "Brand voice"],
    body: `You write customer-support replies for a SaaS product. Tone: warm, direct, accountable. Never defensive.

When given the customer's message:

1. Acknowledge the specific issue they raised (paraphrase in your own words).
2. State what you can do today, in one sentence.
3. If you cannot fix it today, give a concrete next-step + ETA — never "we'll get back to you".
4. End with one open question that moves the conversation forward.

Forbidden:
- Apologizing more than once.
- "Sorry for the inconvenience."
- Blaming the user or "as per our policy".
- Long signatures.

If they request a refund and the situation warrants it: approve it in your first reply. No back-and-forth.`,
  },
  {
    id: "sql-explainer",
    imageId: "01",
    name: "SQL Query Explainer",
    category: "Data · Code",
    group: "Code",
    monogram: "SQ",
    blurb: "Reads a SQL query and explains it in plain English line-by-line, then flags performance risks.",
    tags: ["SQL", "Data", "Performance"],
    body: `You explain SQL queries to engineers who don't write SQL daily.

For the given query:

1. One-sentence summary: what does this query answer?
2. Plain-English walkthrough: explain each CTE / subquery / JOIN in order, including what the intermediate result looks like.
3. Performance flags: full table scans, missing indexes, N+1 patterns, cartesian risks, NULL handling gotchas.
4. Suggested rewrites (if any): show the original snippet → rewrite, with one-line rationale.

Be concrete. If the query joins on a column you suspect is non-indexed, say so. Don't hedge with "could be slow" — say "likely slow on tables > 10M rows".`,
  },
  {
    id: "npc-dialog",
    imageId: "02",
    name: "Game NPC Dialog Writer",
    category: "Creative · Game",
    group: "Creative",
    monogram: "ND",
    blurb: "Branching NPC dialog trees with faction-aware reactions. Tunable between grimdark and cozy.",
    tags: ["RPG", "Lore", "Branching"],
    body: `You write NPC dialog for action-RPGs.

Given a character brief (faction, role, mood, one secret), produce:

1. **Idle barks** (5 lines, one sentence each, voice-consistent).
2. **Greeting tree** for the player meeting them:
   - First-time meet
   - Friendly relationship
   - Hostile relationship
3. **One reactive line** for each of these player actions:
   - Pick up a faction-symbol item
   - Wear a rival faction's colors
   - Mention the NPC's secret
4. **One secret-reveal arc** in 4 dialog beats, gated on a relationship-stat threshold.

Tone tunable: caller specifies grimdark / cozy / pulp / shakespearean. Default: grimdark.
No exposition dumps. No "would'st thou" unless tone is shakespearean.`,
  },
];

const filterGroups = ["All", "Writing", "Code", "Marketing", "Analysis", "Support", "Creative"] as const;

export default function TemplatesPage() {
  const [filter, setFilter] = useState<(typeof filterGroups)[number]>("All");
  const [selectedId, setSelectedId] = useState<string>(starters[0].id);

  const visible = useMemo(
    () => (filter === "All" ? starters : starters.filter((s) => s.group === filter)),
    [filter],
  );
  const selected = useMemo(
    () => starters.find((s) => s.id === selectedId) ?? starters[0],
    [selectedId],
  );

  const startUrl = `/prompts?starter=${encodeURIComponent(selected.body)}&starterName=${encodeURIComponent(selected.name)}`;

  return (
    <main className="min-h-screen bg-white font-sans tracking-tight text-black">
      <NavBar />

      {/* Step strip */}
      <section className="border-b-2 border-black bg-blue-50/60 px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 text-[11px] font-black uppercase tracking-[0.18em]">
          {[
            { n: "01", label: "Pick a starter", active: true },
            { n: "02", label: "Edit + name", active: false },
            { n: "03", label: "Mint as iNFT", active: false },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-3">
              <span
                className={`flex h-7 w-7 items-center justify-center border-2 text-[10px] font-black ${
                  s.active ? "border-black bg-[#0000FF] text-white" : "border-black/30 bg-white text-gray-500"
                }`}
              >
                {s.n}
              </span>
              <span className={s.active ? "text-[#0000FF]" : "text-gray-500"}>{s.label}</span>
              {i < 2 && <span className="text-gray-300">———</span>}
            </div>
          ))}
        </div>
      </section>

      {/* Hero */}
      <section className="relative overflow-hidden border-b-2 border-black bg-white px-6 py-14">
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
            Starter library
          </span>
          <h1 className="mt-6 text-[40px] font-black leading-[0.95] tracking-tighter sm:text-[60px] lg:text-[68px]">
            Don&rsquo;t start from <span className="text-[#0000FF]">scratch.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-7 text-gray-700">
            Eight battle-tested prompts with strict guardrails. Pick one, edit if you want,
            mint it as your own ERC-7857 prompt iNFT — list it, rent it, sell it.
          </p>

          <div className="mt-7 grid max-w-2xl grid-cols-3 gap-px border-2 border-black bg-black">
            {[
              { k: "Starters", v: "8" },
              { k: "Categories", v: "6" },
              { k: "Format", v: "Model-agnostic" },
            ].map((s) => (
              <div key={s.k} className="bg-white px-4 py-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
                  {s.k}
                </p>
                <p className="mt-1 text-[14px] font-black text-[#0000FF]">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Filter strip */}
      <section className="border-b-2 border-black bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-1.5">
          {filterGroups.map((g) => {
            const isActive = filter === g;
            const count = g === "All" ? starters.length : starters.filter((s) => s.group === g).length;
            return (
              <button
                key={g}
                onClick={() => setFilter(g)}
                className={`border-2 border-black px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] transition ${
                  isActive
                    ? "bg-[#0000FF] text-white"
                    : "bg-white text-gray-700 hover:bg-blue-50 hover:text-[#0000FF]"
                }`}
              >
                {g} · {count}
              </button>
            );
          })}
        </div>
      </section>

      {/* Grid + preview */}
      <section className="bg-white px-6 py-12">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="flex items-end justify-between">
              <h2 className="text-[11px] font-black uppercase tracking-[0.22em] text-black">
                Starters · {visible.length}
              </h2>
              <span className="text-[11px] font-bold text-gray-500">click to preview</span>
            </div>

            <div className="mt-4 grid gap-px border-2 border-black bg-black sm:grid-cols-2">
              {visible.map((t) => {
                const isSelected = t.id === selectedId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className={`group flex flex-col bg-white text-left transition ${
                      isSelected
                        ? "ring-4 ring-inset ring-[#0000FF]"
                        : "hover:bg-blue-100 hover:ring-2 hover:ring-inset hover:ring-[#0000FF]"
                    }`}
                  >
                    <div className="relative h-[120px] overflow-hidden border-b-2 border-black bg-blue-50">
                      <Image
                        src={`/images/hero-image${t.imageId}.svg`}
                        alt={`${t.name} preview`}
                        fill
                        className="object-cover opacity-90 transition group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
                        <span className="border-2 border-black bg-white px-2 py-[2px] text-[10px] font-black tracking-[0.18em] text-[#0000FF]">
                          {t.monogram}
                        </span>
                        <span className="border-2 border-black bg-[#0000FF] px-2 py-[2px] text-[10px] font-black uppercase tracking-[0.18em] text-white">
                          Starter
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0000FF]">
                        {t.category}
                      </p>
                      <p className="mt-1 text-[16px] font-black leading-tight text-black">
                        {t.name}
                      </p>
                      <p className="mt-2 text-[13px] leading-6 text-gray-700">{t.blurb}</p>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {t.tags.map((tag) => (
                          <span
                            key={tag}
                            className="border border-[#0000FF] bg-blue-50 px-2 py-[2px] text-[10px] font-black tracking-wider text-[#0000FF]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 flex items-center justify-between font-mono text-[10px] font-bold text-gray-500">
                        <span>{t.body.length} chars</span>
                        {isSelected ? (
                          <span className="text-[#0000FF]">◄ previewing</span>
                        ) : (
                          <span>preview →</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 border-2 border-black">
              <div className="flex items-center justify-between border-b-2 border-black bg-blue-50/60 px-4 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0000FF]">
                  Prompt body · {selected.name}
                </p>
                <p className="font-mono text-[10px] font-bold text-gray-500">
                  {selected.body.length} chars
                </p>
              </div>
              <pre className="max-h-[420px] overflow-auto bg-black px-4 py-4 font-mono text-[12px] leading-6 text-white whitespace-pre-wrap">
                {selected.body}
              </pre>
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <div className="border-2 border-black bg-[#0000FF] text-white">
              <div className="border-b-2 border-white/30 px-6 py-5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-100">
                  Your draft
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center border-2 border-white bg-white text-sm font-black text-[#0000FF]">
                    {selected.monogram}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[16px] font-black leading-tight">{selected.name}</p>
                    <p className="mt-0.5 text-[11px] font-bold text-blue-100">{selected.category}</p>
                  </div>
                </div>
              </div>

              <div className="divide-y-2 divide-white/20">
                <div className="px-6 py-4 text-[12px]">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">
                    Encryption
                  </p>
                  <p className="mt-1 font-black">AES-256-GCM in browser</p>
                </div>
                <div className="px-6 py-4 text-[12px]">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">
                    Identity
                  </p>
                  <p className="mt-1 font-black">ERC-7857 iNFT</p>
                </div>
                <div className="px-6 py-4 text-[12px]">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">
                    What happens
                  </p>
                  <p className="mt-1 font-bold leading-snug">
                    Opens the mint dialog pre-filled with this starter. You can edit
                    before sealing.
                  </p>
                </div>
              </div>

              <div className="space-y-2 p-5">
                <Link href={startUrl} className="block">
                  <span className="block w-full border-2 border-white bg-white px-4 py-2.5 text-center text-[11px] font-black uppercase tracking-[0.2em] text-[#0000FF] transition hover:bg-blue-50">
                    Use this starter →
                  </span>
                </Link>
                <Link href="/market" className="block">
                  <span className="block w-full border-2 border-white bg-transparent px-4 py-2 text-center text-[11px] font-black uppercase tracking-[0.2em] text-white hover:bg-white/10">
                    Browse the market
                  </span>
                </Link>
              </div>
            </div>

            <div className="mt-5 border-2 border-black bg-white p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0000FF]">
                Why a starter
              </p>
              <ul className="mt-3 space-y-2 text-[12px] text-gray-800">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-[#0000FF]" />
                  Strict guardrails prevent hallucinations
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-[#0000FF]" />
                  Structured output that resells well
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-[#0000FF]" />
                  Edit before mint — your tweaks, your asset
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-[#0000FF]" />
                  Model-agnostic — works on GPT, Claude, local LLMs
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
