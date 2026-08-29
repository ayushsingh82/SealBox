"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";

const links = [
  { label: "My Prompts", href: "/prompts" },
  { label: "Market", href: "/market" },
  { label: "Templates", href: "/templates" },
];

export default function NavBar() {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-black bg-white">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-3">
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-[#0000FF] transition group-hover:rotate-[6deg]">
            <svg viewBox="0 0 40 40" className="h-[22px] w-[22px] text-white">
              <path
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M20 2.5 35 11.25 35 28.75 20 37.5 5 28.75 5 11.25Z M16.5 16.1A3.5 3.5 0 1 1 23.5 16.1 3.5 3.5 0 1 1 16.5 16.1Z M18.3 18.5 16.9 27.5 23.1 27.5 21.7 18.5Z"
              />
            </svg>
          </div>
          <p className="whitespace-nowrap text-[15px] font-black tracking-tight text-black">
            <span className="text-[#0000FF]">Seal</span>box
          </p>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-700 transition hover:bg-blue-50 hover:text-[#0000FF]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <ConnectButton showBalance={false} chainStatus="icon" />
      </div>
    </header>
  );
}
