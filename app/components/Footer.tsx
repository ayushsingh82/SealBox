import Link from "next/link";

const cols: { title: string; items: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    items: [
      { label: "My Prompts", href: "/prompts" },
      { label: "Templates", href: "/templates" },
      { label: "Market", href: "/market" },
    ],
  },
  {
    title: "Learn",
    items: [
      { label: "Features", href: "/features" },
      { label: "Pitch deck", href: "/pitch" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t-2 border-black bg-[#0000FF] px-6 py-12 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-white">
                <svg viewBox="0 0 40 40" className="h-6 w-6 text-[#0000FF]">
                  <path
                    fill="currentColor"
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M20 2.5 35 11.25 35 28.75 20 37.5 5 28.75 5 11.25Z M16.5 16.1A3.5 3.5 0 1 1 23.5 16.1 3.5 3.5 0 1 1 16.5 16.1Z M18.3 18.5 16.9 27.5 23.1 27.5 21.7 18.5Z"
                  />
                </svg>
              </div>
              <p className="text-lg font-black tracking-tight">
                <span className="text-blue-100">0g</span>Prompt
              </p>
            </Link>
            <p className="mt-4 max-w-sm text-[13px] leading-6 text-blue-100">
              Sealed AI prompts you can own and sell. Minted as ERC-7857 iNFTs on 0G,
              ciphertext on 0G Storage, key re-seals to the buyer on purchase.
            </p>
          </div>

          {cols.map((col) => (
            <div key={col.title}>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-100">
                {col.title}
              </p>
              <ul className="mt-4 space-y-2.5 text-[13px] font-semibold">
                {col.items.map((it) => (
                  <li key={it.href}>
                    <Link href={it.href} className="text-white/90 transition hover:text-white">
                      {it.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 h-px w-full bg-white/25" />

        <div className="mt-5 flex flex-col items-center justify-between gap-2 text-[11px] text-blue-100 md:flex-row">
          <p>© {new Date().getFullYear()} Sealbox · Sealed prompts on 0G</p>
        </div>
      </div>
    </footer>
  );
}
