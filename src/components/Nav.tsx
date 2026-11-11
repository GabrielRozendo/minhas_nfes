"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Notas" },
  { href: "/emitir", label: "Emitir" },
  { href: "/templates", label: "Templates" },
  { href: "/status", label: "Status" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="relative z-10 border-b border-[var(--line)] bg-[color-mix(in_oklab,white_58%,transparent)] backdrop-blur-md">
      <div className="container flex flex-wrap items-end justify-between gap-4 py-5">
        <div>
          <Link href="/" className="block">
            <h1 className="font-serif text-2xl font-semibold tracking-tight">
              Minhas NFS-e
            </h1>
          </Link>
        </div>
        <nav className="flex flex-wrap gap-5 text-sm">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`pb-0.5 border-b transition-colors ${
                  active
                    ? "border-[var(--ink)]"
                    : "border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--line)]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
