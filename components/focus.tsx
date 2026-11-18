"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Check, Play, Square, Timer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Ring } from "@/components/ui/ring"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SubjectPicker } from "@/components/subject-picker"
import { useSheetBack } from "@/lib/use-sheet-back"
import { cn } from "@/lib/utils"
import type { Subject } from "@/lib/horario-data"

/**
 * Modo enfoque: un temporizador por materia. Al terminar (o al detenerlo) los minutos quedan en el registro de estudio
 * y se ven en Hoy. El estado vive en localStorage con la hora de inicio, así sigue contando con la pantalla apagada,
 * al cambiar de pestaña o al cerrar y abrir la app.
 */

type Run = { subjectId: string; startedAt: number; minutes: number }
const RUN_KEY = "planner.focus"
const PREFS_KEY = "planner.focus.prefs"
const DURATIONS = [15, 25, 45, 60, 90]

const read = <T,>(key: string): T | null => { try { const v = window.localStorage.getItem(key); return v ? (JSON.parse(v) as T) : null } catch { return null } }
const write = (key: string, v: unknown) => { try { if (v === null) window.localStorage.removeItem(key); else window.localStorage.setItem(key, JSON.stringify(v)) } catch {} }

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`
}

/** Aviso al terminar: vibración, dos tonos y notificación del sistema (si el usuario dio permiso). */
function alertDone(title: string, body: string) {
  try { navigator.vibrate?.([200, 100, 200]) } catch {}
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (Ctx) {
      const ctx = new Ctx()
      ;[0, 0.35].forEach((at) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain()
        osc.frequency.value = 880; osc.connect(gain); gain.connect(ctx.destination)
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + at)
        gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + at + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.28)
        osc.start(ctx.currentTime + at); osc.stop(ctx.currentTime + at + 0.3)
      })
    }
  } catch {}
  try { if ("Notification" in window && Notification.permission === "granted") new Notification(title, { body, icon: "/icon-192.png" }) } catch {}
}

export function FocusSheet({ open, onOpenChange, subjects, onLog }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  subjects: Subject[]
  onLog: (subjectId: string, minutes: number) => void
}) {
  const [run, setRun] = useState<Run | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [subjectId, setSubjectId] = useState("")
  const [minutes, setMinutes] = useState(25)
  const [done, setDone] = useState<number | null>(null) // minutos de la última sesión terminada
  const logRef = useRef(onLog)
  logRef.current = onLog

  useSheetBack(open, () => onOpenChange(false))

  // Estado guardado: sesión en curso (puede haber terminado mientras la app estaba cerrada) y últimas preferencias
  useEffect(() => {
    const prefs = read<{ subjectId: string; minutes: number }>(PREFS_KEY)
    if (prefs) { setSubjectId(prefs.subjectId); setMinutes(prefs.minutes) }
    const saved = read<Run>(RUN_KEY)
    if (!saved) return
    if (saved.startedAt + saved.minutes * 60000 <= Date.now()) {
      write(RUN_KEY, null)
      logRef.current(saved.subjectId, saved.minutes)
      setDone(saved.minutes)
    } else setRun(saved)
  }, [])

  const finish = useCallback((r: Run, complete: boolean) => {
    const mins = complete ? r.minutes : Math.floor((Date.now() - r.startedAt) / 60000)
    write(RUN_KEY, null)
    setRun(null)
    if (mins > 0) logRef.current(r.subjectId, mins)
    if (complete) { setDone(mins); alertDone("¡Sesión de enfoque terminada!", `${mins} min registrados. Toma un descanso.`) }
  }, [])

  // Reloj: se calcula siempre con la hora real (no cuenta ticks), así no se atrasa en segundo plano
  useEffect(() => {
    if (!run) return
    const tick = () => {
      const t = Date.now()
      setNow(t)
      if (t >= run.startedAt + run.minutes * 60000) finish(run, true)
    }
    tick()
    const id = setInterval(tick, 500)
    document.addEventListener("visibilitychange", tick)
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick) }
  }, [run, finish])

  function start() {
    const r: Run = { subjectId, startedAt: Date.now(), minutes }
    write(RUN_KEY, r)
    write(PREFS_KEY, { subjectId, minutes })
    setDone(null); setNow(r.startedAt); setRun(r)
    try { if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission() } catch {}
  }

  const subject = run ? subjects.find((s) => s.id === run.subjectId) : undefined
  const total = run ? run.minutes * 60000 : 0
  const left = run ? run.startedAt + total - now : 0

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="gap-5 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Modo enfoque</DialogTitle>
            <DialogDescription>{run ? "El temporizador sigue aunque cierres esta ventana." : "Elige en qué vas a trabajar y por cuánto tiempo."}</DialogDescription>
          </DialogHeader>

          {run ? (
            <div className="flex flex-col items-center gap-4 py-2">
              <Ring value={1 - left / total} size={200} stroke={10} className="text-brand">
                <span className="text-center">
                  <span className="num block text-5xl font-semibold tracking-tight">{clock(left)}</span>
                  <span className="mt-1 block max-w-36 truncate text-sm text-muted-foreground">{subject?.name ?? "Sin materia"}</span>
                </span>
              </Ring>
              <Button variant="outline" onClick={() => finish(run, false)} className="min-h-11 w-full">
                <Square className="size-4" />Detener y guardar lo estudiado
              </Button>
            </div>
          ) : done !== null ? (
            <div className="space-y-4 py-2 text-center">
              <div className="mx-auto grid size-16 animate-pop place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"><Check className="size-8" strokeWidth={3} /></div>
              <div>
                <p className="text-lg font-semibold">¡Buen trabajo!</p>
                <p className="text-sm text-muted-foreground"><span className="num">{done}</span> min registrados en tu semana.</p>
              </div>
              <Button onClick={() => setDone(null)} className="min-h-11 w-full">Otra sesión</Button>
            </div>
          ) : (
            <>
              <SubjectPicker subjects={subjects} value={subjectId} onChange={setSubjectId} noneLabel="Sin materia" />
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Duración</p>
                <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Duración en minutos">
                  {DURATIONS.map((m) => (
                    <button key={m} type="button" role="radio" aria-checked={minutes === m} onClick={() => setMinutes(m)}
                      className={cn("num min-h-11 rounded-lg border text-sm font-semibold transition active:scale-95", minutes === m ? "border-transparent bg-foreground text-background" : "text-muted-foreground hover:border-foreground/30 hover:text-foreground")}>
                      {m}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">minutos</p>
              </div>
              <Button onClick={start} className="min-h-12 w-full text-base"><Play className="size-4" />Empezar</Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Con una sesión en curso y la ventana cerrada, un botón flotante muestra el tiempo y la reabre */}
      {run && !open && (
        <button type="button" onClick={() => onOpenChange(true)} aria-label={`Enfoque en curso, quedan ${clock(left)}`}
          className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)] left-1/2 z-30 flex h-11 -translate-x-1/2 animate-pop items-center gap-2 rounded-full bg-foreground px-4 text-background shadow-lg shadow-black/30 transition active:scale-95 md:bottom-6">
          <Timer className="size-4" />
          <span className="num text-sm font-semibold">{clock(left)}</span>
          {subject && <span aria-hidden className="size-2.5 rounded-full" style={{ background: subject.border }} />}
        </button>
      )}
    </>
  )
}
