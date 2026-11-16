"use client"

import { useMemo } from "react"
import { ChevronRight, MapPin } from "lucide-react"
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

/** Horario de asesorías de todos los profesores, en una agenda corta agrupada por día. */
export function AsesoriasView({ subjects, nowMin, todayIdx, timeLabel, onOpen }: Props) {
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

      <p className="text-center text-xs text-muted-foreground">Toca una asesoría para ver o cambiar los datos del profesor.</p>
    </div>
  )
}
