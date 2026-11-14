"use client"

import { useEffect, useState } from "react"
import { GraduationCap, Loader2 } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

/* Mismo formato que los accesos de Mi Espacio y Mis finanzas: vitrina temática a la izquierda (PC)
   y formulario a la derecha. El tema aquí es un horario semanal con su línea de "ahora". */

const START_H = 7
const END_H = 19
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
const pct = (h: number) => (((h - START_H) * 60) / SPAN) * 100
const hh = (h: number) => `${String(h).padStart(2, "0")}:00`

const ERRORS: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Correo o contraseña incorrectos.",
  USER_ALREADY_EXISTS: "Ya existe una cuenta con ese correo. Prueba a entrar.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Ya existe una cuenta con ese correo. Prueba a entrar.",
  PASSWORD_TOO_SHORT: "La contraseña debe tener al menos 8 caracteres.",
  INVALID_EMAIL: "Ese correo no parece válido.",
}
const message = (e: { code?: string; message?: string } | null) =>
  (e?.code && ERRORS[e.code]) || e?.message || "Algo salió mal. Inténtalo de nuevo."

/** Línea de "ahora": hora real si cae dentro del horario; si no, una posición de ejemplo. */
function useNow() {
  const [now, setNow] = useState<{ top: number; label: string } | null>(null)
  useEffect(() => {
    const tick = () => {
      const d = new Date()
      const mins = d.getHours() * 60 + d.getMinutes() - START_H * 60
      const inRange = mins >= 0 && mins <= SPAN
      const ref = inRange ? d : new Date(2000, 0, 1, 10, 30)
      setNow({
        top: ((inRange ? mins : 3.5 * 60) / SPAN) * 100,
        label: `${String(ref.getHours()).padStart(2, "0")}:${String(ref.getMinutes()).padStart(2, "0")}`,
      })
    }
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])
  return now
}

/** Horario semanal de ejemplo, dentro de una tarjeta (vitrina de PC). */
function Week() {
  const now = useNow()
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-(--card-shadow)">
      <div className="grid grid-cols-[3rem_repeat(5,1fr)] border-b bg-foreground/[0.03] text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        <span />
        {DAYS.map((d) => <span key={d} className="border-l px-2 py-2.5">{d}</span>)}
      </div>
      <div className="relative grid h-[22rem] grid-cols-[3rem_repeat(5,1fr)] xl:h-[26rem]">
        <div className="relative">
          {Array.from({ length: END_H - START_H + 1 }, (_, i) => (
            <span key={i} className="num absolute right-2 -translate-y-1/2 text-[10px] text-muted-foreground/60" style={{ top: `${(i / (END_H - START_H)) * 100}%` }}>
              {String(START_H + i).padStart(2, "0")}
            </span>
          ))}
        </div>
        {DAYS.map((d, di) => (
          <div key={d} className="relative border-l border-foreground/[0.07]">
            {CLASSES.filter((c) => c[0] === di).map(([, a, b, name, room], i) => (
              <div
                key={name + a}
                className="absolute inset-x-1 overflow-hidden rounded-md border-l-2 border-brand/70 bg-brand/[0.08] px-2 py-1.5 [animation:rise_.7s_cubic-bezier(.2,.8,.2,1)_both]"
                style={{ top: `${pct(a)}%`, height: `${pct(b) - pct(a)}%`, animationDelay: `${250 + (di * 2 + i) * 110}ms` }}
              >
                <p className="truncate text-[11px] font-medium text-foreground/80">{name}</p>
                <p className="num truncate text-[10px] text-muted-foreground">{room}</p>
              </div>
            ))}
          </div>
        ))}
        <div className="pointer-events-none absolute inset-0">
          {Array.from({ length: END_H - START_H + 1 }, (_, i) => (
            <div key={i} className="absolute inset-x-0 border-t border-foreground/[0.05]" style={{ top: `${(i / (END_H - START_H)) * 100}%` }} />
          ))}
        </div>
        {now && (
          <div className="pointer-events-none absolute inset-x-0 flex items-center transition-[top] duration-1000" style={{ top: `${now.top}%` }}>
            <span className="num rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-medium text-background">{now.label}</span>
            <span className="h-px flex-1 bg-brand/60" />
          </div>
        )}
      </div>
    </div>
  )
}

/** Móvil y tablet: las clases de hoy, compactas, sobre el formulario. */
const DAY_NAMES = ["lunes", "martes", "miércoles", "jueves", "viernes"]

function Today() {
  // día real de la semana (fin de semana → lunes); se calcula tras montar para no chocar con el render del servidor
  const [day, setDay] = useState<number | null>(null)
  useEffect(() => {
    const d = new Date().getDay() - 1
    setDay(d >= 0 && d <= 4 ? d : 0)
  }, [])
  if (day === null) return <div className="mb-7 h-[9.5rem] lg:hidden" />
  const today = CLASSES.filter((c) => c[0] === day)
  const isToday = new Date().getDay() - 1 === day
  return (
    <ul aria-hidden className="mb-7 space-y-2 lg:hidden">
      <li className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{isToday ? "Hoy" : "El"} · {DAY_NAMES[day]}</li>
      {today.map(([, a, b, name, room], i) => (
        <li key={name} className="flex animate-rise items-center gap-3 rounded-xl border border-l-2 border-l-brand/70 bg-card px-3.5 py-2.5 text-sm shadow-(--card-shadow)" style={{ animationDelay: `${100 + i * 90}ms` }}>
          <span className="num w-24 shrink-0 text-xs text-muted-foreground">{hh(a)} – {hh(b)}</span>
          <span className="truncate font-medium">{name}</span>
          <span className="num ml-auto shrink-0 text-xs text-muted-foreground">{room}</span>
        </li>
      ))}
    </ul>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="grad grid size-10 shrink-0 place-items-center rounded-2xl shadow-lg shadow-black/20"><GraduationCap className="size-5" /></span>
      <div>
        <p className="font-semibold leading-tight">Mi semestre</p>
        <p className="text-xs text-muted-foreground">Planner universitario</p>
      </div>
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

const field =
  "h-12 w-full rounded-xl border bg-card px-3.5 text-base outline-none transition placeholder:text-muted-foreground/70 focus:border-brand/60 focus:ring-4 focus:ring-brand/15"

export function SignInCard() {
  const [mode, setMode] = useState<"in" | "up">("in")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState<"" | "email" | "google">("")
  const [error, setError] = useState("")

  async function google() {
    setError("")
    setBusy("google")
    try {
      const { error } = await authClient.signIn.social({ provider: "google", callbackURL: "/" })
      if (error) { setError(message(error)); setBusy("") }
    } catch {
      setError("No pudimos conectar con Google. Inténtalo de nuevo.")
      setBusy("")
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setBusy("email")
    try {
      const { error } = mode === "in"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name: name.trim() || email.split("@")[0] })
      if (error) setError(message(error))
      else window.location.replace("/") // recarga completa: el servidor ve la cookie nueva
    } catch (err) {
      setError(message(err as Error))
    }
    setBusy("")
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Vitrina (PC) */}
      <section aria-hidden className="hidden flex-col justify-between gap-10 border-r p-10 lg:flex xl:p-14">
        <Brand />
        <div className="max-w-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Esta semana</p>
          <h2 className="mt-2 text-4xl font-semibold leading-[1.1] tracking-tight xl:text-5xl">
            Todo tu semestre,<br /><span className="text-muted-foreground">en una sola cuadrícula.</span>
          </h2>
          <div className="mt-8"><Week /></div>
        </div>
        <p className="text-xs text-muted-foreground">Horario · Notas · Exámenes · Faltas</p>
      </section>

      {/* Acceso */}
      <section className="flex items-center justify-center px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-8">
        <div className="w-full max-w-sm animate-rise">
          <div className="mb-8 lg:hidden"><Brand /></div>
          <Today />
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{mode === "in" ? "Hola de nuevo" : "Arma tu semestre"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "in" ? "Entra para ver cómo va tu semana." : "Crea tu cuenta: horario, notas y faltas sincronizados en todos tus dispositivos."}
          </p>

          <button
            type="button"
            onClick={google}
            disabled={!!busy}
            className="mt-7 flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-foreground font-semibold text-background transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.98] disabled:opacity-60"
          >
            {busy === "google" ? <Loader2 className="size-5 animate-spin" /> : <span className="grid size-7 place-items-center rounded-full bg-background"><GoogleIcon /></span>}
            Continuar con Google
          </button>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />o con tu correo<span className="h-px flex-1 bg-border" />
          </div>

          <div role="tablist" aria-label="Modo de acceso" className="mb-4 flex gap-0.5 rounded-xl bg-muted p-0.5">
            {([["in", "Entrar"], ["up", "Crear cuenta"]] as const).map(([v, l]) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={mode === v}
                onClick={() => { setMode(v); setError("") }}
                className={cn(
                  "h-10 flex-1 rounded-[0.65rem] text-sm font-medium transition duration-200 active:scale-95",
                  mode === v ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {l}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "up" && (
              <label className="block animate-fade-in">
                <span className="sr-only">Nombre</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" autoComplete="name" className={field} />
              </label>
            )}
            <label className="block">
              <span className="sr-only">Correo</span>
              <input type="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@universidad.edu" autoComplete="email" className={field} />
            </label>
            <label className="relative block">
              <span className="sr-only">Contraseña</span>
              <input
                type={show ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña (mín. 8)"
                autoComplete={mode === "in" ? "current-password" : "new-password"}
                className={cn(field, "pr-20")}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-pressed={show}
                className="absolute right-1.5 top-1/2 h-9 -translate-y-1/2 rounded-lg px-3 text-xs text-muted-foreground transition hover:text-foreground"
              >
                {show ? "Ocultar" : "Ver"}
              </button>
            </label>

            {error && (
              <p role="alert" className="animate-scale-in rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}

            <button
              disabled={!!busy}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border font-medium transition hover:bg-accent active:scale-[0.98] disabled:opacity-60"
            >
              {busy === "email" && <Loader2 className="size-4 animate-spin" />}
              {mode === "in" ? "Entrar" : "Crear cuenta"}
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
