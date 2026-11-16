"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarDays, ChevronRight, List, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { DAYS, getTeachers, initials, type Subject } from "@/lib/horario-data"

type Entry = { subject: Subject; teacherId: string; name: string; role?: string; office?: string; day: number; start: number; end: number; id: string }

type Props = {
  subjects: Subject[]
  nowMin: number | null
  todayIdx: number // 0=Lunes … 4=Viernes; -1 / 5 = fin de semana
  timeLabel: (min: number) => string
  onOpen: (subjectId: string, teacherId: string) => void
}

const PX_HOUR = 48

/** Reparte en carriles las asesorías que se cruzan en un mismo día, para que se vean lado a lado. */
function layout(list: Entry[]) {
  const out: { e: Entry; lane: number; lanes: number }[] = []
  let cluster: { e: Entry; lane: number }[] = []
  let clusterEnd = -1
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((c) => c.lane + 1))
    cluster.forEach((c) => out.push({ ...c, lanes }))
    cluster = []
  }
  for (const e of list) {
    if (cluster.length && e.start >= clusterEnd) { flush(); clusterEnd = -1 }
    const used = new Set(cluster.filter((c) => c.e.end > e.start).map((c) => c.lane))
    let lane = 0
    while (used.has(lane)) lane++
    cluster.push({ e, lane })
    clusterEnd = Math.max(clusterEnd, e.end)
  }
  if (cluster.length) flush()
  return out
}

function WeekGrid({ entries, nowMin, todayIdx, timeLabel, onOpen }: Omit<Props, "subjects"> & { entries: Entry[] }) {
  // el rango se ajusta a las asesorías que hay (no a todo el día) para que quede compacto
  const first = Math.floor(Math.min(...entries.map((e) => e.start)) / 60)
  const last = Math.ceil(Math.max(...entries.map((e) => e.end)) / 60)
  const from = Math.max(0, first - (last - first < 3 ? 1 : 0)) * 60
  const to = Math.min(24, last + (last - first < 3 ? 1 : 0)) * 60
  const hours: number[] = []
  for (let h = from / 60; h <= to / 60; h++) hours.push(h)
  const top = (m: number) => ((m - from) / 60) * PX_HOUR
  const height = ((to - from) / 60) * PX_HOUR

  return (
    <div className="animate-fade-in overflow-hidden rounded-2xl border bg-card">
      <div className="flex border-b py-2 pl-11 pr-1">
        {DAYS.map((d, i) => (
          <span key={d} className={cn("flex-1 text-center text-[11px] font-semibold uppercase tracking-wider", i === todayIdx ? "text-foreground" : "text-muted-foreground")}>
            {d.slice(0, 3)}
            {i === todayIdx && <span className="mx-auto mt-0.5 block size-1 rounded-full bg-foreground" />}
          </span>
        ))}
      </div>
      <div className="relative flex" style={{ height: height + 22, paddingTop: 6 }}>
        <div className="relative w-11 shrink-0">
          {hours.map((h) => (
            <span key={h} className="num absolute right-1.5 -translate-y-1/2 text-[10px] text-muted-foreground" style={{ top: top(h * 60) + 6 }}>{timeLabel(h * 60)}</span>
          ))}
        </div>
        {DAYS.map((d, i) => (
          <div key={d} className="relative flex-1 border-l border-border/50">
            {hours.map((h) => <div key={h} className="absolute inset-x-0 border-t border-dashed border-border/40" style={{ top: top(h * 60) }} />)}
            {i === todayIdx && <div aria-hidden className="pointer-events-none absolute inset-x-0.5 inset-y-0 rounded-lg bg-foreground/[0.04]" />}
            {i === todayIdx && nowMin !== null && nowMin >= from && nowMin <= to && (
              <div aria-hidden className="pointer-events-none absolute inset-x-0 z-10 h-px bg-destructive/70" style={{ top: top(nowMin) }} />
            )}
            {layout(entries.filter((e) => e.day === i)).map(({ e, lane, lanes }) => {
              const h = Math.max(top(e.end) - top(e.start) - 2, 22)
              const first = lanes > 1 ? initials(e.name) : e.name.split(" ")[0]
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onOpen(e.subject.id, e.teacherId)}
                  title={`${e.name} · ${e.subject.name} · ${timeLabel(e.start)}–${timeLabel(e.end)}`}
                  aria-label={`${e.name}, ${e.subject.name}, ${DAYS[i]} ${timeLabel(e.start)} a ${timeLabel(e.end)}`}
                  className="absolute z-[1] overflow-hidden rounded-lg px-1 py-1 text-left text-[10px] leading-tight text-neutral-900 transition hover:z-20 hover:scale-[1.03] active:scale-95"
                  style={{
                    top: top(e.start) + 1, height: h,
                    left: `calc(${(lane / lanes) * 100}% + 2px)`, width: `calc(${100 / lanes}% - 4px)`,
                    backgroundColor: e.subject.bg, boxShadow: `inset 2px 0 0 ${e.subject.border}`,
                  }}
                >
                  <b className="block truncate pl-0.5 text-[11px] font-semibold">{first}</b>
                  {h >= 38 && lanes === 1 && <span className="num block truncate pl-0.5 opacity-70">{timeLabel(e.start)}</span>}
                  {h >= 58 && lanes === 1 && <span className="block truncate pl-0.5 opacity-70">{e.subject.name}</span>}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Horario de asesorías de todos los profesores, en una agenda corta agrupada por día. */
export function AsesoriasView({ subjects, nowMin, todayIdx, timeLabel, onOpen }: Props) {
  // lista o calendario: se recuerda la última elección
  const [mode, setMode] = useState<"lista" | "semana">("lista")
  useEffect(() => {
    try { if (localStorage.getItem("planner.asesoriasView") === "semana") setMode("semana") } catch { /* sin almacenamiento */ }
  }, [])
  const pick = (m: "lista" | "semana") => {
    setMode(m)
    try { localStorage.setItem("planner.asesoriasView", m) } catch { /* sin almacenamiento */ }
  }
  const entries = useMemo(() => {
    const out: Entry[] = []
    for (const subject of subjects)
      for (const t of getTeachers(subject))
        for (const sl of t.slots ?? [])
          out.push({ subject, teacherId: t.id, name: t.name || "Profesor", role: t.role, office: t.office, day: sl.day, start: sl.start, end: sl.end, id: sl.id })
    return out.sort((a, b) => a.day - b.day || a.start - b.start)
  }, [subjects])

  // la próxima asesoría a partir de ahora (si hoy ya pasó, la de la siguiente semana)
  const next = useMemo(() => {
    if (nowMin === null || entries.length === 0) return null
    const scored = entries.map((e) => {
      let offset = (e.day - todayIdx + 7) % 7
      if (offset === 0 && e.end <= nowMin) offset = 7
      return { e, offset, live: offset === 0 && e.start <= nowMin }
    })
    return scored.sort((a, b) => a.offset * 1440 + a.e.start - (b.offset * 1440 + b.e.start))[0]
  }, [entries, nowMin, todayIdx])

  const when = (n: NonNullable<typeof next>) =>
    n.live ? "Ahora mismo" : n.offset === 0 ? "Hoy" : n.offset === 1 ? "Mañana" : DAYS[n.e.day]

  const days = DAYS.map((name, i) => ({ name, i, list: entries.filter((e) => e.day === i) })).filter((d) => d.list.length > 0)

  return (
    <div className="space-y-5 animate-fade-in">
      {next && (
        <button
          type="button"
          onClick={() => onOpen(next.e.subject.id, next.e.teacherId)}
          className="flex w-full animate-pop items-center gap-3 rounded-2xl p-4 text-left text-neutral-900 shadow-(--card-shadow) transition active:scale-[0.99]"
          style={{ backgroundColor: next.e.subject.bg, boxShadow: `inset 0 0 0 1.5px ${next.e.subject.border}` }}
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-black/10 text-sm font-bold">{initials(next.e.name)}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-wider opacity-70">{next.live ? "Asesoría en curso" : "Próxima asesoría"}</span>
            <span className="block truncate font-semibold">{next.e.name}</span>
            <span className="num block truncate text-sm opacity-80">{when(next)} · {timeLabel(next.e.start)} – {timeLabel(next.e.end)} · {next.e.subject.name}</span>
          </span>
          <ChevronRight className="size-4 shrink-0 opacity-50" />
        </button>
      )}

      <div className="flex justify-end">
        <div className="flex gap-0.5 rounded-lg bg-muted p-0.5 text-xs font-medium" role="group" aria-label="Tipo de vista">
          {([["lista", "Lista", List], ["semana", "Semana", CalendarDays]] as const).map(([m, label, Icon]) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => pick(m)}
              className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 transition", mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <Icon className="size-3.5" />{label}
            </button>
          ))}
        </div>
      </div>

      {mode === "semana" ? (
        <WeekGrid entries={entries} nowMin={nowMin} todayIdx={todayIdx} timeLabel={timeLabel} onOpen={onOpen} />
      ) : (
      <div className="space-y-4">
        {days.map(({ name, i, list }) => (
          <section key={i} className="space-y-2">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {name}
              {i === todayIdx && <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] tracking-normal text-background">Hoy</span>}
            </h3>
            <ul className="space-y-1.5">
              {list.map((e) => {
                const past = i === todayIdx && nowMin !== null && e.end <= nowMin
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(e.subject.id, e.teacherId)}
                      className={cn("flex w-full items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left transition hover:border-foreground/25 active:scale-[0.99]", past && "opacity-50")}
                    >
                      <span className="w-1 self-stretch shrink-0 rounded-full" style={{ background: e.subject.border }} />
                      <span className="num w-[6.5rem] shrink-0 text-sm font-medium">{timeLabel(e.start)} – {timeLabel(e.end)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{e.name}</span>
                        <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                          {e.subject.name}{e.role ? ` · ${e.role}` : ""}
                          {e.office && <><MapPin className="ml-1 size-3 shrink-0" />{e.office}</>}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
      )}

      <p className="text-center text-xs text-muted-foreground">Toca una asesoría para ver o cambiar los datos del profesor.</p>
    </div>
  )
}
