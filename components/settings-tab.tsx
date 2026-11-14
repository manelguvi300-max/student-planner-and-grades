"use client"

import { useState } from "react"
import { LogOut, Monitor, Moon, Loader2, Sun } from "lucide-react"
import { DEFAULT_SETTINGS, useSettings, type Settings } from "@/lib/settings"
import { minutesToLabel } from "@/lib/horario-data"
import { cn } from "@/lib/utils"

type Opt<T extends string> = { value: T; label: string; icon?: typeof Sun }

/** Selector segmentado compacto: la opción activa se rellena. */
function Seg<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: Opt<T>[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex w-fit gap-0.5 rounded-xl bg-muted p-0.5">
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={o.label}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex h-8 items-center justify-center gap-1.5 rounded-[0.65rem] px-3 text-[13px] font-medium transition duration-200 active:scale-95",
              on ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {o.icon && <o.icon className="size-3.5" />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function Row({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3.5 sm:px-5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {note && <p className="num mt-0.5 text-xs text-muted-foreground">{note}</p>}
      </div>
      {children}
    </div>
  )
}

function Group({ title, delay, children }: { title: string; delay: number; children: React.ReactNode }) {
  return (
    <section className="animate-rise" style={{ animationDelay: `${delay}ms` }}>
      <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</h2>
      <div className="divide-y overflow-hidden rounded-2xl border bg-card shadow-(--card-shadow)">{children}</div>
    </section>
  )
}

type Props = {
  userName: string
  userEmail: string
  userImage: string
  hiddenCount: number
  onShowHidden: () => void
}

export function SettingsTab({ userName, userEmail, userImage, hiddenCount, onShowHidden }: Props) {
  const [imgFailed, setImgFailed] = useState(false)
  const { settings, set, reset } = useSettings()
  const [leaving, setLeaving] = useState(false)
  const initial = (userName || userEmail || "?").trim().charAt(0).toUpperCase()
  const changed = (Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]).some((k) => settings[k] !== DEFAULT_SETTINGS[k])
  const t = (m: number) => minutesToLabel(m, settings.timeFormat)

  async function logout() {
    setLeaving(true)
    try {
      await fetch("/api/logout", { method: "POST", cache: "no-store" })
    } finally {
      // recarga completa: descarta la caché del router y cualquier estado en memoria
      window.location.replace("/sign-in")
    }
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[17rem_1fr] lg:items-start">
      {/* Cuenta */}
      <section className="relative animate-rise overflow-hidden rounded-3xl border bg-card p-5 text-center shadow-(--card-shadow) lg:sticky lg:top-10">
        <div aria-hidden className="pointer-events-none absolute -right-14 -top-16 size-52 rounded-full bg-foreground/10 blur-3xl" />
        <div className="relative">
          {userImage && !imgFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userImage} alt="" referrerPolicy="no-referrer" onError={() => setImgFailed(true)} className="mx-auto size-16 rounded-2xl object-cover shadow-lg shadow-black/20" />
          ) : (
            <span className="grad mx-auto grid size-16 place-items-center rounded-2xl text-2xl font-semibold shadow-lg shadow-black/20">{initial}</span>
          )}
          <p className="mt-3 truncate font-semibold">{userName || "Tu cuenta"}</p>
          <p className="truncate text-xs text-muted-foreground">{userEmail || "Sin correo"}</p>
          <button
            type="button"
            onClick={logout}
            disabled={leaving}
            className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-sm font-medium transition hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive active:scale-[0.97] disabled:opacity-60"
          >
            {leaving ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
            {leaving ? "Saliendo…" : "Cerrar sesión"}
          </button>
        </div>
      </section>

      <div className="space-y-6">
        <Group title="Horario" delay={60}>
          <Row title="Formato de hora" note={`14:30 → ${t(14 * 60 + 30)}`}>
            <Seg label="Formato de hora" value={settings.timeFormat} onChange={(v) => set("timeFormat", v)} options={[{ value: "24h", label: "24 h" }, { value: "12h", label: "12 h" }]} />
          </Row>
          <Row title="Altura de las filas">
            <Seg label="Altura de las filas" value={settings.rowHeight} onChange={(v) => set("rowHeight", v)} options={[{ value: "compact", label: "Compacta" }, { value: "normal", label: "Normal" }, { value: "roomy", label: "Amplia" }]} />
          </Row>
          <Row title="La semana empieza en">
            <Seg label="Inicio de semana" value={settings.weekStart} onChange={(v) => set("weekStart", v)} options={[{ value: "mon", label: "Lunes" }, { value: "sun", label: "Domingo" }]} />
          </Row>
        </Group>

        <Group title="Apariencia" delay={120}>
          <Row title="Tema">
            <Seg
              label="Tema"
              value={settings.theme}
              onChange={(v) => set("theme", v)}
              options={[{ value: "system", label: "Auto", icon: Monitor }, { value: "light", label: "Claro", icon: Sun }, { value: "dark", label: "Oscuro", icon: Moon }]}
            />
          </Row>
          <Row title="Animaciones">
            <Seg label="Animaciones" value={settings.motion} onChange={(v) => set("motion", v)} options={[{ value: "full", label: "Completas" }, { value: "reduced", label: "Reducidas" }]} />
          </Row>
          <Row title="Al abrir la app">
            <Seg
              label="Pantalla de inicio"
              value={settings.startTab}
              onChange={(v) => set("startTab", v)}
              options={[{ value: "hoy", label: "Hoy" }, { value: "horario", label: "Horario" }, { value: "notas", label: "Notas" }]}
            />
          </Row>
        </Group>

        <Group title="Más" delay={180}>
          <Row title="Materias ocultas" note={hiddenCount ? `${hiddenCount} en Notas, Exámenes o Faltas` : "Ninguna"}>
            <button
              type="button"
              onClick={onShowHidden}
              disabled={!hiddenCount}
              className="h-8 rounded-xl border px-3 text-[13px] font-medium transition hover:bg-accent active:scale-95 disabled:pointer-events-none disabled:opacity-40"
            >
              Mostrar todas
            </button>
          </Row>
          <Row title="Restablecer ajustes" note="No borra tus datos">
            <button
              type="button"
              onClick={reset}
              disabled={!changed}
              className="h-8 rounded-xl border px-3 text-[13px] font-medium transition hover:bg-accent active:scale-95 disabled:pointer-events-none disabled:opacity-40"
            >
              Restablecer
            </button>
          </Row>
        </Group>

        <p className="px-1 text-center text-xs text-muted-foreground lg:text-left">Los ajustes se guardan en este dispositivo.</p>
      </div>
    </div>
  )
}
