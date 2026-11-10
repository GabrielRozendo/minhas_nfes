import Link from "next/link";

const links = [
  { href: "/", label: "Notas" },
  { href: "/emitir", label: "Emitir" },
  { href: "/templates", label: "Templates" },
  { href: "/status", label: "Status" },
];

export function Nav() {
  return (
    <header className="border-b border-[var(--line)] bg-[color-mix(in_oklab,white_55%,transparent)] backdrop-blur-sm">
      <div className="container flex flex-wrap items-end justify-between gap-4 py-5">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            Portal interno
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Minhas NFS-e</h1>
        </div>
        <nav className="flex flex-wrap gap-4 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="border-b border-transparent pb-0.5 hover:border-[var(--ink)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
