"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Check, ChevronDown, Coffee, Flame, Minus, Pause, Play, Plus, Square, Timer } from "lucide-react"
import { Ring } from "@/components/ui/ring"
import { Button } from "@/components/ui/button"
import { SubjectPicker } from "@/components/subject-picker"
import { useSheetBack } from "@/lib/use-sheet-back"
import { cn } from "@/lib/utils"
import { studyFromConfigs, STUDY_KEY, type StudyEntry, type Subject, type SubjectConfig } from "@/lib/horario-data"

/**
 * Modo enfoque: temporizador por materia con pausa, descansos y registro de estudio.
 * La sesión vive en localStorage con marcas de tiempo (no cuenta ticks), así sigue exacta con la pantalla apagada,
 * al cambiar de pestaña o al cerrar y abrir la app. Lo estudiado se guarda en subjectConfigs[STUDY_KEY] (en tu cuenta).
 */

export type FocusKind = "focus" | "break"
export type FocusRun = { kind: FocusKind; subjectId: string; minutes: number; startedAt: number; pausedAt: number | null; pausedMs: number }
type Done = { kind: FocusKind; subjectId: string; minutes: number }

const RUN_KEY = "planner.focus"
const PREFS_KEY = "planner.focus.prefs"
export const DEFAULT_DAILY_GOAL = 60
const PRESETS = [15, 25, 45, 60, 90]
const BREAK_MIN = 5
const MAX_MIN = 240

const read = <T,>(key: string): T | null => { try { const v = window.localStorage.getItem(key); return v ? (JSON.parse(v) as T) : null } catch { return null } }
const write = (key: string, v: unknown) => { try { if (v === null) window.localStorage.removeItem(key); else window.localStorage.setItem(key, JSON.stringify(v)) } catch {} }
const pad = (n: number) => String(n).padStart(2, "0")
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const clampMin = (n: number) => Math.min(MAX_MIN, Math.max(1, Math.round(n)))

export const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(s / 3600)
  return h ? `${h}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}` : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`
}
export const fmtMin = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`)
const endAt = (r: FocusRun) => r.startedAt + r.minutes * 60000 + r.pausedMs
const focusedMin = (r: FocusRun, t: number) => Math.max(0, Math.floor(((r.pausedAt ?? t) - r.startedAt - r.pausedMs) / 60000))

/** Acepta también el formato anterior ({ subjectId, startedAt, minutes }). */
function normalize(v: Partial<FocusRun> | null): FocusRun | null {
  if (!v || typeof v.startedAt !== "number" || typeof v.minutes !== "number") return null
  return { kind: v.kind ?? "focus", subjectId: v.subjectId ?? "", minutes: v.minutes, startedAt: v.startedAt, pausedAt: v.pausedAt ?? null, pausedMs: v.pausedMs ?? 0 }
}

/** Aviso al terminar: vibración, dos tonos y notificación del sistema (si el usuario dio permiso). */
function alertDone(title: string, body: string) {
  try { navigator.vibrate?.([200, 100, 200]) } catch {}
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (Ctx) {
      const ctx = new Ctx()
      ;[0, 0.35].forEach((at, i) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain()
        osc.frequency.value = i ? 1046 : 784; osc.connect(gain); gain.connect(ctx.destination)
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + at)
        gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + at + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.3)
        osc.start(ctx.currentTime + at); osc.stop(ctx.currentTime + at + 0.32)
      })
    }
  } catch {}
  try { if ("Notification" in window && Notification.permission === "granted") new Notification(title, { body, icon: "/icon-192.png" }) } catch {}
}

/* ───────────── Estado del temporizador (vive en PlannerView: se ve desde cualquier pestaña) ───────────── */

export type FocusApi = ReturnType<typeof useFocus>

export function useFocus(onLog: (subjectId: string, minutes: number) => void) {
  const [run, setRun] = useState<FocusRun | null>(null)
  const [done, setDone] = useState<Done | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [open, setOpen] = useState(false) // pantalla inmersiva
  const [prefs, setPrefs] = useState<{ subjectId: string; minutes: number }>({ subjectId: "", minutes: 25 })
  const logRef = useRef(onLog)
  logRef.current = onLog

  const save = (r: FocusRun | null) => { write(RUN_KEY, r); setRun(r) }

  const finish = useCallback((r: FocusRun, complete: boolean, quiet = false) => {
    const mins = complete ? r.minutes : focusedMin(r, Date.now())
    write(RUN_KEY, null)
    setRun(null)
    if (r.kind === "focus" && mins > 0) logRef.current(r.subjectId, mins)
    if (r.kind === "focus" && mins === 0) { setDone(null); setOpen(false); return } // detenida al instante: nada que mostrar
    if (r.kind === "break" && !complete) { setDone(null); setOpen(false); return }
    setDone({ kind: r.kind, subjectId: r.subjectId, minutes: mins })
    if (complete) {
      setOpen(true)
      if (!quiet) alertDone(r.kind === "focus" ? "¡Sesión de enfoque terminada!" : "Se acabó el descanso", r.kind === "focus" ? `${mins} min registrados. Toma un respiro.` : "¿Otra sesión?")
    }
  }, [])

  // Al abrir la app: preferencias y sesión guardada (puede haber terminado mientras estaba cerrada)
  useEffect(() => {
    const p = read<{ subjectId: string; minutes: number }>(PREFS_KEY)
    if (p) setPrefs({ subjectId: p.subjectId ?? "", minutes: clampMin(p.minutes ?? 25) })
    const saved = normalize(read<Partial<FocusRun>>(RUN_KEY))
    if (!saved) return
    if (!saved.pausedAt && endAt(saved) <= Date.now()) finish(saved, true, true)
    else setRun(saved)
  }, [finish])

  // Reloj: siempre con la hora real
  useEffect(() => {
    if (!run || run.pausedAt) return
    const tick = () => {
      const t = Date.now()
      setNow(t)
      if (t >= endAt(run)) finish(run, true)
    }
    tick()
    const id = setInterval(tick, 500)
    document.addEventListener("visibilitychange", tick)
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick) }
  }, [run, finish])

  // Pantalla encendida mientras la sesión está a la vista
  useEffect(() => {
    if (!open || !run || run.pausedAt) return
    let lock: { release: () => Promise<void> } | null = null
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }
    nav.wakeLock?.request("screen").then((l) => { lock = l }).catch(() => {})
    return () => { lock?.release().catch(() => {}) }
  }, [open, run])

  const start = useCallback((subjectId: string, minutes: number, kind: FocusKind = "focus") => {
    const r: FocusRun = { kind, subjectId, minutes: clampMin(minutes), startedAt: Date.now(), pausedAt: null, pausedMs: 0 }
    save(r)
    setNow(r.startedAt); setDone(null); setOpen(true)
    if (kind === "focus") { const p = { subjectId, minutes: r.minutes }; write(PREFS_KEY, p); setPrefs(p) }
    try { if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission() } catch {}
  }, [])

  const pause = () => { if (run && !run.pausedAt) { const t = Date.now(); setNow(t); save({ ...run, pausedAt: t }) } }
  const resume = () => { if (run?.pausedAt) save({ ...run, pausedMs: run.pausedMs + (Date.now() - run.pausedAt), pausedAt: null }) }
  const extend = (m: number) => { if (run) save({ ...run, minutes: Math.min(MAX_MIN, run.minutes + m) }) }
  const stop = () => { if (run) finish(run, false) }

  const remaining = run ? endAt(run) - (run.pausedAt ?? now) : 0
  const total = run ? run.minutes * 60000 : 0
  return { run, done, remaining, total, progress: total ? 1 - remaining / total : 0, open, setOpen, prefs, start, pause, resume, extend, stop, clearDone: () => setDone(null) }
}

/* ───────────── Estadísticas ───────────── */

export function focusStats(study: StudyEntry[], now: Date) {
  const byDay = new Map<string, number>()
  for (const e of study) byDay.set(e.d, (byDay.get(e.d) ?? 0) + e.m)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i))
    return { key: ymd(d), letter: d.toLocaleDateString("es", { weekday: "narrow" }), min: byDay.get(ymd(d)) ?? 0 }
  })
  const week = new Set(days.map((d) => d.key))
  const bySubject = new Map<string, number>()
  for (const e of study) if (week.has(e.d)) bySubject.set(e.s, (bySubject.get(e.s) ?? 0) + e.m)
  // racha: días seguidos con estudio, contando desde hoy (o desde ayer si hoy aún no hay nada)
  let streak = 0
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (!byDay.get(ymd(d))) d.setDate(d.getDate() - 1)
  while (byDay.get(ymd(d))) { streak++; d.setDate(d.getDate() - 1) }
  return { today: days[6].min, days, week: days.reduce((n, x) => n + x.min, 0), streak, bySubject: [...bySubject].sort((a, b) => b[1] - a[1]) }
}

export const dailyGoalOf = (c: Record<string, SubjectConfig>) => c[STUDY_KEY]?.goal ?? DEFAULT_DAILY_GOAL

/* ───────────── Pestaña Enfoque ───────────── */

export function FocusTab({ focus, subjects, subjectConfigs, onGoal }: {
  focus: FocusApi
  subjects: Subject[]
  subjectConfigs: Record<string, SubjectConfig>
  onGoal: (minutes: number) => void
}) {
  const [subjectId, setSubjectId] = useState(focus.prefs.subjectId)
  const [minutes, setMinutes] = useState(focus.prefs.minutes)
  const [draft, setDraft] = useState<string | null>(null)
  const [today, setToday] = useState<Date | null>(null)
  useEffect(() => { setToday(new Date()) }, [])
  // las preferencias guardadas llegan tras montar
  useEffect(() => { setSubjectId(focus.prefs.subjectId); setMinutes(focus.prefs.minutes) }, [focus.prefs])

  const study = studyFromConfigs(subjectConfigs)
  const stats = useMemo(() => (today ? focusStats(study, today) : null), [study, today])
  const goal = dailyGoalOf(subjectConfigs)
  const valid = subjects.some((s) => s.id === subjectId) ? subjectId : ""
  const run = focus.run
  const runSubject = run ? subjects.find((s) => s.id === run.subjectId) : undefined
  const accent = (run ? runSubject?.border : subjects.find((s) => s.id === valid)?.border) ?? "var(--brand)"

  const commit = () => { if (draft !== null) { const n = Number(draft); if (Number.isFinite(n) && n > 0) setMinutes(clampMin(n)) } setDraft(null) }
  const peak = Math.max(goal, ...(stats?.days.map((d) => d.min) ?? [0]), 1)
  const maxSub = stats?.bySubject[0]?.[1] ?? 1

  const subjectsShown = stats ? stats.bySubject.filter(([id]) => id === "" || subjects.some((s) => s.id === id)) : []
  const reached = stats ? stats.today >= goal : false

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Cabecera: mismo formato que Horario o Agenda (título + resumen en una línea) */}
      <header className="min-w-0">
        <h2 className="text-xl font-semibold tracking-tight">Enfoque</h2>
        <p className="num flex items-center gap-1.5 text-sm text-muted-foreground">
          {stats ? <>Hoy {fmtMin(stats.today)} de {fmtMin(goal)}</> : "Estudia por bloques"}
          {stats && stats.streak > 0 && <><span aria-hidden>·</span><Flame className="size-3.5 text-orange-500" />{stats.streak} {stats.streak === 1 ? "día" : "días"} seguidos</>}
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 md:items-start lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        {/* Sesión: nueva o en curso (con un leve tinte del color de la materia) */}
        <section className={cn(card, "relative md:sticky md:top-20 lg:top-10")}>
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 transition-[background] duration-500"
            style={{ background: `linear-gradient(to bottom, color-mix(in oklab, ${accent} 16%, transparent), transparent)` }} />
          {run ? (
            <div className="relative flex flex-col items-center gap-4 p-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{run.kind === "break" ? "Descanso en curso" : run.pausedAt ? "En pausa" : "Sesión en curso"}</p>
              <span style={{ color: runSubject?.border ?? "var(--brand)" }}>
                <Ring value={focus.progress} size={168} stroke={9} className="text-current">
                  <span className="text-foreground">
                    <span className={cn("num block text-4xl font-semibold", run.pausedAt && "animate-glow")}>{clock(focus.remaining)}</span>
                    <span className="mt-1 block max-w-32 truncate text-xs text-muted-foreground">{run.kind === "break" ? "Respira un poco" : runSubject?.name ?? "Sin materia"}</span>
                  </span>
                </Ring>
              </span>
              <Button onClick={() => focus.setOpen(true)} className="h-14 w-full rounded-2xl text-lg font-semibold sm:h-14" style={{ boxShadow: `0 12px 28px -14px ${accent}` }}>Abrir la sesión</Button>
            </div>
          ) : (
            <div className="relative space-y-5 p-4 sm:p-5 lg:p-6">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><span aria-hidden className="size-2 rounded-full transition-colors duration-500" style={{ background: accent }} />Nueva sesión</p>

              {/* Duración: − / número (toca para escribir) / + */}
              <div className="flex items-center justify-center gap-5">
                <Button variant="outline" size="icon" onClick={() => setMinutes((m) => clampMin(m - 5))} aria-label="Restar 5 minutos" disabled={minutes <= 1} className="size-11 rounded-full sm:size-11"><Minus className="size-5" /></Button>
                <div className="w-32 text-center">
                  {draft !== null ? (
                    <input autoFocus value={draft} inputMode="numeric" maxLength={3} aria-label="Minutos de la sesión"
                      onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") commit() }}
                      className="num w-full bg-transparent text-center text-6xl font-semibold leading-none outline-none lg:text-7xl" />
                  ) : (
                    <button type="button" onClick={() => setDraft(String(minutes))} aria-label={`${minutes} minutos. Toca para escribir otra duración`}
                      className="num w-full text-6xl font-semibold leading-none tracking-tight transition active:scale-95 lg:text-7xl">{minutes}</button>
                  )}
                  <p className="mt-1.5 text-xs text-muted-foreground">{draft !== null ? "escribe los minutos" : "minutos · toca para editar"}</p>
                </div>
                <Button variant="outline" size="icon" onClick={() => setMinutes((m) => clampMin(m + 5))} aria-label="Sumar 5 minutos" disabled={minutes >= MAX_MIN} className="size-11 rounded-full sm:size-11"><Plus className="size-5" /></Button>
              </div>

              {/* Atajos con el mismo selector segmentado de Horario (Lista / Horas) */}
              <div className="grid grid-cols-5 rounded-xl bg-muted p-1 text-sm font-medium" role="radiogroup" aria-label="Duraciones rápidas">
                {PRESETS.map((m) => (
                  <button key={m} type="button" role="radio" aria-checked={minutes === m} onClick={() => { setMinutes(m); setDraft(null) }}
                    className={cn("num rounded-lg py-1.5 transition active:scale-95", minutes === m ? "bg-background text-brand shadow-sm ring-1 ring-border/60" : "text-muted-foreground hover:text-foreground")}>{m}</button>
                ))}
              </div>

              <SubjectPicker subjects={subjects} value={valid} onChange={setSubjectId} noneLabel="Sin materia" />

              <Button onClick={() => focus.start(valid, minutes)} className="h-14 w-full rounded-2xl text-lg font-semibold sm:h-14 transition-shadow duration-500"
                style={{ boxShadow: `0 12px 28px -14px ${accent}` }}>
                <Play className="size-5 fill-current" />Empezar · {fmtMin(minutes)}
              </Button>
            </div>
          )}
        </section>

        {stats && (
          <div className="space-y-6">
            {/* Hoy + meta diaria */}
            <section>
              <Heading title="Hoy" />
              <div className={card}>
                <div className="flex items-center gap-4 p-4">
                  <span className={reached ? "text-emerald-500" : "text-brand"}>
                    <Ring value={stats.today / goal} size={56} stroke={5} className="text-current">
                      {reached ? <Check className="size-5 text-emerald-500" strokeWidth={3} /> : <span className="num text-[11px] font-semibold text-foreground">{Math.round((stats.today / goal) * 100)}%</span>}
                    </Ring>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="num text-xl font-semibold leading-tight">{fmtMin(stats.today)}</p>
                    <p className={cn("text-xs", reached ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>{reached ? "¡Cumpliste tu meta diaria!" : `te faltan ${fmtMin(goal - stats.today)} para tu meta`}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t px-4 py-2">
                  <span className="text-sm text-muted-foreground">Meta diaria</span>
                  <span className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onGoal(Math.max(15, goal - 15))} aria-label="Bajar meta 15 minutos" className="size-8 rounded-full"><Minus className="size-4" /></Button>
                    <span className="num w-16 text-center text-sm font-semibold">{fmtMin(goal)}</span>
                    <Button variant="ghost" size="icon" onClick={() => onGoal(Math.min(600, goal + 15))} aria-label="Subir meta 15 minutos" className="size-8 rounded-full"><Plus className="size-4" /></Button>
                  </span>
                </div>
              </div>
            </section>

            {/* Semana */}
            <section>
              <Heading title="Últimos 7 días" note={fmtMin(stats.week)} />
              <div className={cn(card, "p-4")}>
                <div className="relative flex h-24 items-end gap-2" role="img" aria-label="Minutos estudiados por día en la última semana">
                  <span aria-hidden className="absolute inset-x-0 border-t border-dashed border-foreground/20" style={{ bottom: `${(goal / peak) * 100}%` }} />
                  {stats.days.map((d, i) => (
                    <div key={d.key} className="flex h-full flex-1 flex-col justify-end">
                      <div className={cn("bar-grow w-full rounded-md", d.min >= goal ? "bg-emerald-500" : i === 6 ? "bg-brand" : "bg-foreground/25")}
                        style={{ height: `${Math.max(d.min ? 6 : 3, (d.min / peak) * 100)}%`, opacity: d.min ? 1 : 0.4, animationDelay: `${i * 40}ms` }} />
                    </div>
                  ))}
                </div>
                <div className="mt-1.5 flex gap-2">
                  {stats.days.map((d, i) => <span key={d.key} className={cn("flex-1 text-center text-[10px] uppercase", i === 6 ? "font-semibold text-foreground" : "text-muted-foreground")}>{d.letter}</span>)}
                </div>
              </div>
            </section>

            {/* Por materia */}
            <section>
              <Heading title="Por materia" note="esta semana" />
              {subjectsShown.length === 0 ? (
                <p className="rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">Cuando termines una sesión verás aquí a qué le dedicas más tiempo.</p>
              ) : (
                <ul className={cn(card, "space-y-3 p-4")}>
                  {subjectsShown.map(([id, min]) => {
                    const s = subjects.find((x) => x.id === id)
                    return (
                      <li key={id || "none"}>
                        <div className="mb-1 flex items-center gap-2 text-sm">
                          <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: s?.border ?? "var(--muted-foreground)" }} />
                          <span className="min-w-0 flex-1 truncate">{s?.name ?? "Sin materia"}</span>
                          <span className="num shrink-0 text-xs text-muted-foreground">{fmtMin(min)}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
                          <div className="bar-fill h-full rounded-full" style={{ width: `${(min / maxSub) * 100}%`, background: s?.border ?? "var(--muted-foreground)" }} />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

/** Título pequeño de cada bloque (el mismo de Hoy). */
function Heading({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between px-1">
      <h3 className="text-sm font-semibold">{title}</h3>
      {note && <span className="num text-xs text-muted-foreground">{note}</span>}
    </div>
  )
}

const card = "overflow-hidden rounded-2xl border bg-card"

/* ───────────── Pantalla inmersiva (sesión en curso y final) ───────────── */

export function FocusOverlay({ focus, subjects, subjectConfigs }: { focus: FocusApi; subjects: Subject[]; subjectConfigs: Record<string, SubjectConfig> }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const { run, done, open } = focus
  const visible = open && (run !== null || done !== null)
  const close = () => { focus.setOpen(false); if (!run) focus.clearDone() }
  useSheetBack(visible, close)

  if (!mounted || !visible) return null

  const subjectId = run?.subjectId ?? done?.subjectId ?? ""
  const subject = subjects.find((s) => s.id === subjectId)
  const isBreak = (run?.kind ?? done?.kind) === "break"
  const color = isBreak ? "rgb(52 211 153)" : subject?.border ?? "var(--brand)"
  const endsAt = run && !run.pausedAt ? new Date(Date.now() + focus.remaining).toLocaleTimeString("es", { hour: "numeric", minute: "2-digit" }) : null
  const today = focusStats(studyFromConfigs(subjectConfigs), new Date()).today
  const goal = dailyGoalOf(subjectConfigs)

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={isBreak ? "Descanso" : "Sesión de enfoque"}
      className="fixed inset-0 z-[60] flex animate-fade-in flex-col overflow-hidden bg-background pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]">
      {/* Fondo vivo con el color de la materia (degradados, sin desenfoque: barato en móvil) */}
      <span aria-hidden className="drift-a pointer-events-none absolute -left-1/3 -top-1/4 size-[120vmax] rounded-full opacity-30" style={{ background: `radial-gradient(circle, ${color} 0%, transparent 55%)` }} />
      <span aria-hidden className="drift-b pointer-events-none absolute -bottom-1/2 -right-1/3 size-[110vmax] rounded-full opacity-20" style={{ background: `radial-gradient(circle, ${color} 0%, transparent 55%)` }} />

      <div className="relative flex h-14 items-center justify-between px-3">
        <button type="button" onClick={close} aria-label="Minimizar" className="grid size-11 place-items-center rounded-full text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground active:scale-90">
          <ChevronDown className="size-6" />
        </button>
        <p className="text-sm font-semibold">{isBreak ? "Descanso" : "Enfoque"}</p>
        <span className="size-11" />
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
        {run ? (
          <>
            <div>
              <p className="text-sm text-muted-foreground">{isBreak ? "Despeja la mente" : "Estudiando"}</p>
              <p className="mt-0.5 max-w-xs truncate text-2xl font-semibold tracking-tight">{isBreak ? `${run.minutes} min de pausa` : subject?.name ?? "Sin materia"}</p>
            </div>
            <span style={{ color }} className={cn(!run.pausedAt && "breathe")}>
              <Ring value={focus.progress} size={268} stroke={12} className="text-current">
                <span className="text-foreground">
                  <span className={cn("num block text-6xl font-semibold tracking-tight", run.pausedAt && "animate-glow")}>{clock(focus.remaining)}</span>
                  <span className="mt-2 block text-sm text-muted-foreground">{run.pausedAt ? "En pausa" : `termina ${endsAt}`}</span>
                </span>
              </Ring>
            </span>
            <div className="flex items-center gap-5">
              <button type="button" onClick={() => focus.extend(5)} aria-label="Sumar 5 minutos" className="num grid size-14 place-items-center rounded-full border bg-background/60 text-sm font-semibold transition active:scale-90">+5</button>
              <button type="button" onClick={run.pausedAt ? focus.resume : focus.pause} aria-label={run.pausedAt ? "Reanudar" : "Pausar"}
                className="grid size-20 place-items-center rounded-full bg-foreground text-background shadow-xl shadow-black/30 transition active:scale-90">
                {run.pausedAt ? <Play className="size-8 translate-x-0.5 fill-current" /> : <Pause className="size-8 fill-current" />}
              </button>
              <button type="button" onClick={focus.stop} aria-label={isBreak ? "Terminar descanso" : "Terminar y guardar lo estudiado"} className="grid size-14 place-items-center rounded-full border bg-background/60 transition active:scale-90">
                <Square className="size-5 fill-current" />
              </button>
            </div>
            <p className="-mt-3 max-w-64 text-xs text-muted-foreground">{isBreak ? "Puedes cerrar esta pantalla; te avisamos al terminar." : "Si terminas antes, se guarda lo que llevas. Puedes minimizar: el tiempo sigue."}</p>
          </>
        ) : done && done.kind === "focus" ? (
          <>
            <div className="relative grid size-28 place-items-center">
              <span aria-hidden className="ripple absolute inset-0 rounded-full" style={{ background: color }} />
              <span className="grid size-28 animate-pop place-items-center rounded-full text-neutral-900" style={{ background: color }}><Check className="size-14" strokeWidth={3} /></span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-semibold tracking-tight">¡Buen trabajo!</p>
              <p className="text-muted-foreground"><span className="num font-semibold text-foreground">{fmtMin(done.minutes)}</span> de {subject?.name ?? "estudio"} registrados</p>
              <p className="text-sm text-muted-foreground">Hoy llevas <span className="num">{fmtMin(today)}</span>{today >= goal ? " · meta diaria cumplida ✓" : ` de ${fmtMin(goal)}`}</p>
            </div>
            <div className="flex w-full max-w-xs flex-col gap-2">
              <button type="button" onClick={() => focus.start(done.subjectId, BREAK_MIN, "break")} className="flex h-13 items-center justify-center gap-2 rounded-2xl bg-foreground py-3.5 text-base font-semibold text-background transition active:scale-[0.98]">
                <Coffee className="size-5" />Descanso de {BREAK_MIN} min
              </button>
              <button type="button" onClick={() => focus.start(done.subjectId, focus.prefs.minutes)} className="h-12 rounded-2xl border bg-background/60 text-sm font-semibold transition active:scale-[0.98]">Otra sesión de {fmtMin(focus.prefs.minutes)}</button>
              <button type="button" onClick={close} className="h-11 text-sm text-muted-foreground transition hover:text-foreground">Listo por ahora</button>
            </div>
          </>
        ) : (
          <>
            <span className="grid size-24 animate-pop place-items-center rounded-full bg-emerald-400/20 text-emerald-500"><Timer className="size-11" /></span>
            <div className="space-y-1">
              <p className="text-3xl font-semibold tracking-tight">¿Seguimos?</p>
              <p className="text-muted-foreground">Terminó tu descanso.</p>
            </div>
            <div className="flex w-full max-w-xs flex-col gap-2">
              <button type="button" onClick={() => focus.start(done?.subjectId ?? focus.prefs.subjectId, focus.prefs.minutes)} className="flex items-center justify-center gap-2 rounded-2xl bg-foreground py-3.5 text-base font-semibold text-background transition active:scale-[0.98]">
                <Play className="size-5 fill-current" />Otra sesión de {fmtMin(focus.prefs.minutes)}
              </button>
              <button type="button" onClick={close} className="h-11 text-sm text-muted-foreground transition hover:text-foreground">Ahora no</button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

/** Indicador compacto para la barra de navegación: anillo de progreso con el tiempo restante. */
export function FocusNavBadge({ focus, size = 52 }: { focus: FocusApi; size?: number }) {
  const run = focus.run
  if (!run) return <Timer className="size-6" />
  const m = Math.max(0, Math.ceil(focus.remaining / 60000))
  return (
    <Ring value={focus.progress} size={size} stroke={3} className="text-current">
      <span className={cn("num text-[13px] font-bold leading-none", run.pausedAt && "animate-glow")}>{m >= 60 ? clock(focus.remaining).slice(0, -3) : `${m}′`}</span>
    </Ring>
  )
}
