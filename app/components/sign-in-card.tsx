"use client"

import { useEffect, useState } from "react"
import { Check, GraduationCap, Loader2 } from "lucide-react"
import { authClient } from "@/lib/auth-client"

/* ───────────────────────── Horario de fondo ─────────────────────────
   La pantalla de acceso ES un horario semanal: columnas de lunes a viernes,
   horas a la izquierda, clases que van entrando y una línea de "ahora"
   que marca la hora real. El panel de acceso es una celda más del horario. */

const START_H = 6
const END_H = 20
const SPAN = (END_H - START_H) * 60
const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie"]

// [día, inicio (h), fin (h), materia, salón]
const CLASSES: [number, number, number, string, string][] = [
  [0, 7, 9, "Cálculo II", "B-201"],
  [0, 14, 16, "Programación", "Lab 3"],
  [1, 9, 11, "Física", "C-101"],
  [1, 16, 18, "Inglés", "A-12"],
  [2, 7, 9, "Programación", "Lab 3"],
  [2, 11, 13, "Estadística", "B-105"],
  [3, 9, 11, "Cálculo II", "B-201"],
  [3, 14, 17, "Física", "Lab 1"],
  [4, 8, 10, "Estadística", "B-105"],
  [4, 12, 14, "Inglés", "A-12"],
]

const pct = (h: number) => ((h - START_H) * 60 / SPAN) * 100

function Backdrop() {
  // línea de "ahora": hora real si cae en el horario, si no, una posición fija
  const [now, setNow] = useState<{ top: number; label: string } | null>(null)
  useEffect(() => {
    const tick = () => {
      const d = new Date()
      const mins = d.getHours() * 60 + d.getMinutes() - START_H * 60
      const inRange = mins >= 0 && mins <= SPAN
      const ref = inRange ? d : new Date(2000, 0, 1, 10, 30)
      const m = inRange ? mins : 4.5 * 60
      setNow({
        top: (m / SPAN) * 100,
        label: `${String(ref.getHours()).padStart(2, "0")}:${String(ref.getMinutes()).padStart(2, "0")}`,
      })
    }
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 select-none">
      <div className="absolute inset-x-0 bottom-0 top-0 grid grid-cols-[3rem_repeat(5,1fr)] pt-10 sm:grid-cols-[3.5rem_repeat(5,1fr)]">
        {/* eje de horas */}
        <div className="relative">
          {Array.from({ length: END_H - START_H + 1 }, (_, i) => (
            <span key={i} className="num absolute right-2 -translate-y-1/2 text-[10px] text-muted-foreground/60" style={{ top: `${(i / (END_H - START_H)) * 100}%` }}>
              {String(START_H + i).padStart(2, "0")}
            </span>
          ))}
        </div>
        {/* columnas de días */}
        {DAYS.map((d, di) => (
          <div key={d} className="relative border-l border-foreground/[0.07]">
            <span className="absolute -top-7 left-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/60">{d}</span>
            {CLASSES.filter((c) => c[0] === di).map(([, a, b, name, room], i) => (
              <div
                key={name + a}
                className="absolute inset-x-1 overflow-hidden rounded-md border-l-2 border-foreground/30 bg-foreground/[0.055] px-2 py-1.5 [animation:rise_.7s_cubic-bezier(.2,.8,.2,1)_both]"
                style={{ top: `${pct(a)}%`, height: `${pct(b) - pct(a)}%`, animationDelay: `${250 + (di * 2 + i) * 110}ms` }}
              >
                <p className="truncate text-[11px] font-medium text-foreground/55">{name}</p>
                <p className="num hidden text-[10px] text-foreground/35 sm:block">{room}</p>
              </div>
            ))}
          </div>
        ))}
        {/* rejilla horizontal */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 top-10">
          {Array.from({ length: END_H - START_H + 1 }, (_, i) => (
            <div key={i} className="absolute inset-x-0 border-t border-foreground/[0.05]" style={{ top: `${(i / (END_H - START_H)) * 100}%` }} />
          ))}
        </div>
        {/* línea de ahora */}
        {now && (
          <div className="absolute inset-x-0 bottom-0 top-10 transition-[top] duration-1000">
            <div className="absolute inset-x-0 flex items-center" style={{ top: `${now.top}%` }}>
              <span className="num rounded-full bg-brand px-1.5 py-0.5 text-[9px] font-medium text-background sm:text-[10px]">{now.label}</span>
              <span className="h-px flex-1 bg-brand/60" />
            </div>
          </div>
        )}
      </div>
      {/* viñeta: deja respirar el panel central */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_50%,var(--background)_35%,transparent_100%)]" />
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  )
}

const ITEMS = ["Horario", "Notas", "Exámenes", "Faltas"]

export function SignInCard() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleGoogle() {
    setError("")
    setLoading(true)
    try {
      const { error } = await authClient.signIn.social({ provider: "google", callbackURL: "/" })
      if (error) {
        setError(error.message || "No pudimos conectar con Google. Inténtalo de nuevo.")
        setLoading(false)
      }
    } catch {
      setError("No pudimos conectar con Google. Inténtalo de nuevo.")
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))]">
      <Backdrop />

      {/* El panel de acceso: una celda más del horario */}
      <section className="relative w-full max-w-sm animate-scale-in [animation-delay:150ms]">
        <div className="overflow-hidden rounded-2xl border border-foreground/15 bg-card/90 shadow-2xl shadow-black/40 backdrop-blur-xl">
          {/* cabecera tipo etiqueta de clase */}
          <div className="flex items-center justify-between border-b border-foreground/10 bg-foreground/[0.04] px-5 py-3">
            <span className="num text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Lun – Vie</span>
            <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <span className="size-1.5 animate-glow rounded-full bg-brand" />
              Acceso
            </span>
          </div>

          <div className="border-l-[3px] border-brand px-5 pb-6 pt-5">
            <div className="flex items-center gap-3">
              <span className="grad grid size-10 shrink-0 place-items-center rounded-xl shadow-lg shadow-black/20"><GraduationCap className="size-5" /></span>
              <h1 className="text-3xl font-semibold tracking-tight text-balance">Mi semestre</h1>
            </div>
            <p className="mt-2 text-sm text-pretty text-muted-foreground">
              Todo tu semestre en una sola cuadrícula. Entra para ver cómo va tu semana.
            </p>

            <ul className="mt-5 flex flex-wrap gap-2">
              {ITEMS.map((t, i) => (
                <li
                  key={t}
                  className="animate-rise rounded-md border border-foreground/10 bg-foreground/[0.05] px-2.5 py-1 text-xs text-foreground/80"
                  style={{ animationDelay: `${500 + i * 90}ms` }}
                >
                  {t}
                </li>
              ))}
            </ul>

            {/* El botón es un "marcar asistencia": se llena mientras conecta */}
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="group relative mt-6 flex h-12 w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand items-center justify-center gap-3 overflow-hidden rounded-xl bg-foreground font-semibold text-background transition duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-wait"
            >
              {loading && (
                <span aria-hidden className="absolute inset-y-0 left-0 w-full origin-left bg-background/15 [animation:fill_2.4s_cubic-bezier(.3,.7,.2,1)_forwards]" />
              )}
              <span className="relative flex items-center gap-3">
                {loading ? <Loader2 className="size-5 animate-spin" /> : <span className="grid size-7 place-items-center rounded-full bg-background"><GoogleIcon /></span>}
                {loading ? "Marcando asistencia..." : "Continuar con Google"}
              </span>
            </button>

            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
              <Check className="size-3" /> Se sincroniza en todos tus dispositivos
            </p>

            {error && (
              <p role="alert" className="mt-4 animate-scale-in rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
