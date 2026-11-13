"use client"

import { useState } from "react"
import { CalendarDays, ClipboardList, GraduationCap, Loader2 } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { Ring } from "@/components/ui/ring"

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

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="grad grid size-10 place-items-center rounded-2xl text-white shadow-lg shadow-primary/30">
        <GraduationCap className="size-5" />
      </div>
      <p className="font-semibold">Mi semestre</p>
    </div>
  )
}

const FEATURES = [
  { icon: CalendarDays, text: "Tu horario de clases siempre a mano" },
  { icon: GraduationCap, text: "Seguimiento de notas y cálculo del final" },
  { icon: ClipboardList, text: "Fechas de exámenes y control de faltas" },
]

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
    <div className="relative grid min-h-dvh w-full overflow-hidden lg:grid-cols-[1.1fr_1fr]">
      {/* orbes ambientales */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 size-[28rem] animate-glow rounded-full bg-primary/25 blur-[110px]" />
        <div className="absolute -bottom-40 right-0 size-[32rem] animate-glow rounded-full bg-brand-violet/20 blur-[120px] [animation-delay:1.2s]" />
        <div className="absolute left-1/3 top-1/2 size-72 rounded-full bg-brand-teal/10 blur-[100px]" />
      </div>

      {/* Escaparate (solo escritorio) */}
      <section className="relative hidden flex-col justify-between p-12 lg:flex">
        <Brand />
        <div className="max-w-lg">
          <h1 className="animate-rise text-5xl font-semibold leading-[1.05] tracking-tight">
            Tu semestre,
            <br />
            <span className="text-muted-foreground">bajo control.</span>
          </h1>
          <div className="mt-12 grid grid-cols-[auto_1fr] gap-4">
            <div className="flex animate-rise items-center gap-4 rounded-3xl border bg-card/70 p-5 shadow-(--card-shadow) backdrop-blur [animation-delay:120ms]">
              <Ring value={0.84} size={72} stroke={7}>
                <span className="num text-lg font-semibold">4,2</span>
              </Ring>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Promedio</p>
                <p className="text-sm">acumulado</p>
              </div>
            </div>
            <div className="animate-rise rounded-3xl border bg-card/70 p-5 shadow-(--card-shadow) backdrop-blur [animation-delay:200ms]">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Próximo examen</p>
              <p className="num mt-1 text-3xl font-light">3<span className="ml-1 text-sm text-muted-foreground">días</span></p>
              <p className="mt-1 text-xs text-brand-teal">Cálculo II · 10:00</p>
            </div>
            <div className="col-span-2 flex h-28 animate-rise items-end gap-2 rounded-3xl border bg-card/70 p-5 shadow-(--card-shadow) backdrop-blur [animation-delay:280ms]">
              {[30, 45, 38, 60, 52, 70, 64, 88].map((h, i) => (
                <span
                  key={i}
                  className={`flex-1 origin-bottom rounded-md ${i === 7 ? "bg-primary shadow-[0_0_18px_rgb(66_133_244/0.5)]" : "bg-foreground/10"}`}
                  style={{ height: `${h}%`, animation: `grow .8s ${400 + i * 60}ms cubic-bezier(.2,.8,.2,1) both` }}
                />
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Horario · Notas · Exámenes · Faltas</p>
      </section>

      {/* Formulario */}
      <section className="relative flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm animate-rise">
          <div className="mb-10 lg:hidden"><Brand /></div>
          <h2 className="text-3xl font-semibold tracking-tight text-balance">Hola de nuevo</h2>
          <p className="mt-2 text-sm text-pretty text-muted-foreground">
            Entra con Google para ver tu horario, notas y exámenes desde cualquier dispositivo.
          </p>

          <ul className="mt-8 flex flex-col gap-3">
            {FEATURES.map((f, i) => (
              <li
                key={f.text}
                className="flex animate-rise items-center gap-3 text-sm text-muted-foreground"
                style={{ animationDelay: `${150 + i * 80}ms` }}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="size-4" />
                </span>
                {f.text}
              </li>
            ))}
          </ul>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-2xl border bg-foreground font-semibold text-background shadow-lg shadow-black/10 transition duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-5 animate-spin" /> : <GoogleIcon />}
            {loading ? "Conectando..." : "Continuar con Google"}
          </button>

          {error && (
            <p role="alert" className="mt-4 animate-scale-in rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
