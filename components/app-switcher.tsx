// Selector entre Mi Espacio, Mi semestre y Mis finanzas. Hay una copia en cada app: si cambias URLs o acentos, cámbialos en las 3.
const APPS = [
  { id: "espacio", name: "Mi Espacio", accent: "#df9aa7", dev: "http://localhost:3000", prod: "https://mi-espacio-mankx.vercel.app", icon: "M3 10.5 12 3l9 7.5M5 9v11h14V9M10 20v-6h4v6" },
  { id: "semestre", name: "Mi semestre", accent: "#8b9cff", dev: "http://localhost:3001", prod: "https://gestion-universitaria-fikx.vercel.app", icon: "M2 9l10-5 10 5-10 5L2 9ZM6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v6" },
  { id: "finanzas", name: "Mis finanzas", accent: "#e8b04b", dev: "http://localhost:5173", prod: "https://mis-finanzas-mankx.vercel.app", icon: "M4 6.5A2.5 2.5 0 0 1 6.5 4H18v4M4 6.5V18a2 2 0 0 0 2 2h14V8H6.5A2.5 2.5 0 0 1 4 6.5ZM16 14h.01" },
];

export function AppSwitcher({ className = "" }: { className?: string }) {
  const dev = process.env.NODE_ENV === "development";
  return (
    <nav aria-label="Mis apps" className={`flex gap-1 rounded-2xl border bg-card/60 p-1 ${className}`}>
      {APPS.map((a) => {
        const on = a.id === "semestre";
        const url = dev ? a.dev : a.prod;
        if (!on && !url) return null; // sin URL de producción todavía
        return (
          <a key={a.id} href={on ? undefined : url} aria-current={on ? "page" : undefined} aria-label={a.name} title={a.name}
            style={{ "--ac": on ? "var(--brand)" : a.accent } as React.CSSProperties}
            className={`grid h-8 flex-1 place-items-center rounded-xl transition-colors duration-300 ${on ? "bg-[color-mix(in_oklab,var(--ac)_16%,transparent)] text-[var(--ac)]" : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-[var(--ac)]"}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="size-[18px]" aria-hidden><path d={a.icon} /></svg>
          </a>
        );
      })}
    </nav>
  );
}
