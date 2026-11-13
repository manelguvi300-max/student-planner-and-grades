"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Clock, Eye, LogOut, Monitor, Moon, Loader2, RotateCcw, Sun, Zap, ZapOff } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { DEFAULT_SETTINGS, useSettings, type Settings } from "@/lib/settings"
import { minutesToLabel } from "@/lib/horario-data"
import { cn } from "@/lib/utils"

type Opt<T extends string> = { value: T; label: string; icon?: typeof Sun }

/** Selector segmentado: una fila de opciones, la activa se rellena. */
function Seg<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: Opt<T>[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-xl bg-muted p-1">
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium transition duration-200 active:scale-[0.97]",
              on ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {o.icon && <o.icon className="size-4" />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2.5 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1fr_minmax(0,18rem)] sm:items-center sm:gap-6">
      <div>
        <p className="text-sm font-medium">{title}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function Group({ title, icon: Icon, delay, children }: { title: string; icon: typeof Sun; delay: number; children: React.ReactNode }) {
  return (
    <section className="animate-rise rounded-2xl border bg-card p-5 shadow-(--card-shadow) sm:p-6" style={{ animationDelay: `${delay}ms` }}>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-muted-foreground" />
        {title}
      </h2>
      <div className="divide-y">{children}</div>
    </section>
  )
}

type Props = {
  userName: string
  userEmail: string
  hiddenCount: number
  onShowHidden: () => void
}

export function SettingsTab({ userName, userEmail, hiddenCount, onShowHidden }: Props) {
  const router = useRouter()
  const { settings, set, reset } = useSettings()
  const [leaving, setLeaving] = useState(false)
  const initial = (userName || userEmail || "?").trim().charAt(0).toUpperCase()
  const changed = (Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]).some((k) => settings[k] !== DEFAULT_SETTINGS[k])
  // ejemplo en vivo del formato elegido: las 14:30
  const sample = minutesToLabel(14 * 60 + 30, settings.timeFormat)

  async function logout() {
    setLeaving(true)
    try {
      await authClient.signOut()
    } finally {
      router.push("/sign-in")
      router.refresh()
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Cuenta + cerrar sesión */}
      <section className="flex animate-rise flex-wrap items-center gap-4 rounded-2xl border bg-card p-5 shadow-(--card-shadow) sm:flex-nowrap sm:p-6">
        <span className="grad grid size-12 shrink-0 place-items-center rounded-2xl text-lg font-semibold">{initial}</span>
        <div className="min-w-0 flex-1 basis-40">
          <p className="truncate font-medium">{userName || "Tu cuenta"}</p>
          <p className="truncate text-xs text-muted-foreground">{userEmail || "Sin correo"}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          disabled={leaving}
          className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium max-sm:w-full transition hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive active:scale-[0.97] disabled:opacity-60"
        >
          {leaving ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
          {leaving ? "Saliendo…" : "Cerrar sesión"}
        </button>
      </section>

      <Group title="Hora y calendario" icon={Clock} delay={60}>
        <Row title="Formato de hora" hint={`Así se ve una clase a las 14:30: ${sample}`}>
          <Seg label="Formato de hora" value={settings.timeFormat} onChange={(v) => set("timeFormat", v)} options={[{ value: "24h", label: "24 h" }, { value: "12h", label: "12 h" }]} />
        </Row>
        <Row title="La semana empieza en" hint="Afecta el calendario de exámenes.">
          <Seg label="Inicio de semana" value={settings.weekStart} onChange={(v) => set("weekStart", v)} options={[{ value: "mon", label: "Lunes" }, { value: "sun", label: "Domingo" }]} />
        </Row>
        <Row title="Altura del horario" hint="Más amplio = clases más fáciles de leer.">
          <Seg label="Altura del horario" value={settings.rowHeight} onChange={(v) => set("rowHeight", v)} options={[{ value: "compact", label: "Compacto" }, { value: "normal", label: "Normal" }, { value: "roomy", label: "Amplio" }]} />
        </Row>
        <Row title="Pantalla de inicio" hint="La pestaña que se abre al entrar.">
          <Seg
            label="Pantalla de inicio"
            value={settings.startTab}
            onChange={(v) => set("startTab", v)}
            options={[{ value: "hoy", label: "Hoy" }, { value: "horario", label: "Horario" }, { value: "notas", label: "Notas" }]}
          />
        </Row>
      </Group>

      <Group title="Apariencia" icon={Sun} delay={120}>
        <Row title="Tema" hint="“Sistema” sigue el modo de tu dispositivo.">
          <Seg
            label="Tema"
            value={settings.theme}
            onChange={(v) => set("theme", v)}
            options={[{ value: "system", label: "Auto", icon: Monitor }, { value: "light", label: "Claro", icon: Sun }, { value: "dark", label: "Oscuro", icon: Moon }]}
          />
        </Row>
        <Row title="Animaciones" hint="Reduce el movimiento si te marea o ahorra batería.">
          <Seg
            label="Animaciones"
            value={settings.motion}
            onChange={(v) => set("motion", v)}
            options={[{ value: "full", label: "Completas", icon: Zap }, { value: "reduced", label: "Reducidas", icon: ZapOff }]}
          />
        </Row>
      </Group>

      <Group title="Datos y materias" icon={Eye} delay={180}>
        <Row title="Materias ocultas" hint={hiddenCount ? `${hiddenCount} oculta${hiddenCount > 1 ? "s" : ""} en Notas, Exámenes o Faltas.` : "No tienes materias ocultas."}>
          <button
            type="button"
            onClick={onShowHidden}
            disabled={!hiddenCount}
            className="h-10 rounded-xl border px-4 text-sm font-medium transition hover:bg-accent active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
          >
            Mostrar todas
          </button>
        </Row>
        <Row title="Restablecer ajustes" hint="Vuelve a los valores de fábrica. No borra tus datos.">
          <button
            type="button"
            onClick={reset}
            disabled={!changed}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium transition hover:bg-accent active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
          >
            <RotateCcw className="size-4" /> Restablecer
          </button>
        </Row>
      </Group>

      <p className="animate-fade-in pt-2 text-center text-xs text-muted-foreground">Estos ajustes se guardan en este dispositivo.</p>
    </div>
  )
}
