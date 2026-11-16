"use client"

import { useEffect, useId, useState } from "react"
import { Plus, Trash2, AlertTriangle, CheckCircle2, XCircle, UserX, ChevronDown, EyeOff, Eye, Calculator, PenLine, Hash, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { Ring } from "@/components/ui/ring"
import { CountUp } from "@/components/ui/count-up"
import {
  type Subject, type Absence, type SubjectConfig, type AbsenceMode, type AbsenceUnit,
  GLOBAL_CONFIG_KEY, hasOwnRule, absenceStatus, calcAbsenceLimit, fmtHours, DEFAULT_PERCENT, DEFAULT_BLOCK_HOURS,
} from "@/lib/horario-data"

type Props = {
  subjects: Subject[]
  absences: Absence[]
  setAbsences: React.Dispatch<React.SetStateAction<Absence[]>>
  subjectConfigs: Record<string, SubjectConfig>
  setSubjectConfigs: React.Dispatch<React.SetStateAction<Record<string, SubjectConfig>>>
  hiddenSubjects: string[]
  onToggleHidden: (subjectId: string) => void
}

const MODES: { value: AbsenceMode; title: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "calc", title: "Con cálculo", desc: "Un % de las horas de trabajo directo (HD)", icon: Calculator },
  { value: "manual", title: "Máximo manual", desc: "Tú escribes cuántas faltas puedes tener", icon: PenLine },
  { value: "none", title: "Solo contar", desc: "Sin máximo: solo llevas el conteo", icon: Hash },
]

const num = (v: string) => (v.trim() === "" ? NaN : Number(v.replace(",", ".")))

/** Texto corto de una regla (la global o la propia de una materia). */
function describeRule(rule: SubjectConfig | undefined) {
  const mode = rule?.mode ?? "calc"
  const hours = rule?.unit === "hours"
  if (mode === "none") return "Solo conteo, sin máximo"
  if (mode === "manual") return rule?.maxAbsences !== undefined ? `Máximo ${rule.maxAbsences} ${hours ? "h" : "faltas"}` : "Máximo manual"
  const pct = rule?.percent ?? DEFAULT_PERCENT
  return hours
    ? `${pct}% de las HD, contado en horas`
    : `${pct}% de las HD, en clases de ${rule?.blockHours ?? rule?.weeklyHours ?? DEFAULT_BLOCK_HOURS} h`
}

/** Campo numérico que se confirma al salir (evita problemas al escribir decimales). */
function NumField({ label, value, placeholder, onCommit }: {
  label: string
  value: number | undefined
  placeholder?: string
  onCommit: (v: number | undefined) => void
}) {
  const id = useId()
  const [text, setText] = useState(value === undefined ? "" : String(value))
  useEffect(() => setText(value === undefined ? "" : String(value)), [value])
  const commit = () => {
    const n = num(text)
    onCommit(n > 0 ? n : undefined)
    if (!(n > 0)) setText("")
  }
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-[11px] font-normal text-muted-foreground">{label}</Label>
      <Input
        id={id}
        inputMode="decimal"
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur() }}
        className="h-8 text-sm"
      />
    </div>
  )
}

export function FaltasTab({ subjects, absences, setAbsences, subjectConfigs, setSubjectConfigs, hiddenSubjects, onToggleHidden }: Props) {
  const [draftDate, setDraftDate] = useState<string>(() => new Date().toISOString().split("T")[0])
  const [draftAbsHours, setDraftAbsHours] = useState("") // horas que faltó (reglas en horas); vacío = un bloque
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  // Diálogo de regla: "global" (para todas) o el id de una materia (regla propia)
  const [dialog, setDialog] = useState<{ open: boolean; scope: string }>({ open: false, scope: "global" })
  const [draftMode, setDraftMode] = useState<AbsenceMode>("calc")
  const [draftUnit, setDraftUnit] = useState<AbsenceUnit>("classes")
  const [draftHours, setDraftHours] = useState("")
  const [draftBlock, setDraftBlock] = useState(String(DEFAULT_BLOCK_HOURS))
  const [draftPercent, setDraftPercent] = useState(String(DEFAULT_PERCENT))
  const [draftMax, setDraftMax] = useState("")

  const globalCfg = subjectConfigs[GLOBAL_CONFIG_KEY]
  const isGlobalScope = dialog.scope === "global"

  // Todas las materias inician contraídas (en móvil y en escritorio).
  useEffect(() => {
    setExpanded((prev) => {
      let changed = false
      const next = { ...prev }
      for (const s of subjects) {
        if (!(s.id in next)) {
          next[s.id] = false
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [subjects])

  const toggleExpanded = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !(prev[id] ?? false) }))

  function handleAddAbsence(subjectId: string, unit: AbsenceUnit, block: number) {
    if (!draftDate) return
    const h = num(draftAbsHours)
    const hours = unit === "hours" ? (h > 0 ? h : block) : undefined
    setAbsences((prev) => [...prev, { id: crypto.randomUUID(), subjectId, date: draftDate, ...(hours ? { hours } : {}) }])
  }
  const handleDeleteAbsence = (id: string) => setAbsences((prev) => prev.filter((a) => a.id !== id))

  /* ── configuración ── */

  const patchConfig = (id: string, patch: Partial<SubjectConfig>) =>
    setSubjectConfigs((prev) => {
      const next = { ...prev[id], ...patch }
      for (const k of Object.keys(next) as (keyof SubjectConfig)[]) if (next[k] === undefined) delete next[k]
      return { ...prev, [id]: next }
    })

  function openRule(scope: string) {
    const own = scope === "global" ? globalCfg : subjectConfigs[scope]
    const rule = scope === "global" || hasOwnRule(own) ? own : globalCfg // una materia sin regla propia parte copiando la global
    setDialog({ open: true, scope })
    setDraftMode(rule?.mode ?? "calc")
    setDraftUnit(rule?.unit ?? "classes")
    setDraftPercent(String(rule?.percent ?? DEFAULT_PERCENT))
    setDraftMax(rule?.maxAbsences !== undefined ? String(rule.maxAbsences) : "")
    const subj = scope === "global" ? undefined : subjectConfigs[scope]
    setDraftBlock(String(subj?.blockHours ?? subj?.weeklyHours ?? rule?.blockHours ?? rule?.weeklyHours ?? DEFAULT_BLOCK_HOURS))
    setDraftHours(subj?.directHours ? String(subj.directHours) : "")
  }

  const hours = num(draftHours), block = num(draftBlock), percent = num(draftPercent), max = num(draftMax)
  const percentOk = percent > 0 && percent <= 100
  const calcOk = block > 0 && percentOk && (isGlobalScope || hours > 0)
  const maxOk = Number.isFinite(max) && max >= 0 && (draftUnit === "hours" || Number.isInteger(max))
  const canSave = draftMode === "none" || (draftMode === "calc" ? calcOk : maxOk)
  const inHours = draftUnit === "hours"

  function saveRule() {
    if (!canSave) return
    const rule: SubjectConfig =
      draftMode === "calc" ? { mode: "calc", unit: draftUnit, percent, blockHours: block }
      : draftMode === "manual" ? { mode: "manual", unit: draftUnit, maxAbsences: max, ...(block > 0 ? { blockHours: block } : {}) }
      : { mode: "none" }
    if (isGlobalScope) {
      setSubjectConfigs((prev) => ({ ...prev, [GLOBAL_CONFIG_KEY]: rule }))
    } else {
      patchConfig(dialog.scope, {
        custom: true, mode: rule.mode, unit: rule.unit, percent: rule.percent, maxAbsences: rule.maxAbsences,
        ...(draftMode === "calc" ? { directHours: hours } : {}),
        ...(draftMode !== "none" && block > 0 ? { blockHours: block, weeklyHours: undefined } : {}),
      })
    }
    setDialog((d) => ({ ...d, open: false }))
  }

  const useGlobalRule = (id: string) => patchConfig(id, { custom: undefined, mode: undefined, unit: undefined, percent: undefined, maxAbsences: undefined })

  const getAbsencesForSubject = (subjectId: string) =>
    absences.filter((a) => a.subjectId === subjectId).sort((a, b) => a.date.localeCompare(b.date))

  function formatDate(dateStr: string) {
    const [year, month, day] = dateStr.split("-")
    return `${day}/${month}/${year}`
  }

  if (subjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed rounded-xl bg-card animate-scale-in">
        <div className="bg-primary/10 p-3 rounded-full mb-4">
          <UserX className="size-6 text-primary" />
        </div>
        <h3 className="font-semibold text-lg mb-1">Sin materias</h3>
      </div>
    )
  }

  // resumen de las materias visibles
  const visible = subjects.filter((s) => !hiddenSubjects.includes(s.id))
  let atRisk = 0, needsHD = 0, totalAbsences = 0
  for (const s of visible) {
    const list = absences.filter((a) => a.subjectId === s.id)
    totalAbsences += list.length
    const st = absenceStatus(subjectConfigs[s.id], globalCfg, list)
    if (st.needsHours) needsHD++
    else if (st.cancelled || st.atRisk) atRisk++
  }

  const renderCard = (subject: Subject) => {
    const config = subjectConfigs[subject.id]
    const subjectAbsences = getAbsencesForSubject(subject.id)
    const count = subjectAbsences.length
    const st = absenceStatus(config, globalCfg, subjectAbsences)
    const { limit, remaining, used, unit, block, cancelled: isCancelled, atRisk: isAtRisk } = st
    const hoursUnit = unit === "hours"
    const isExpanded = expanded[subject.id] ?? false
    const ownRule = st.custom ? config : undefined
    const unitLabel = hoursUnit ? "h" : ""

    // subtítulo del encabezado
    const sub =
      st.needsHours ? "Falta ingresar las horas HD"
      : st.mode === "calc" ? `${config?.directHours} h HD · ${hoursUnit ? "en horas" : `clases de ${block} h`}`
      : st.mode === "manual" ? (hoursUnit ? "Máximo manual en horas" : "Máximo manual")
      : "Solo conteo"

    return (
      <div key={subject.id} className="animate-pop overflow-hidden rounded-2xl border bg-card shadow-(--card-shadow)">
        {/* Header de la materia (clic para contraer/expandir) */}
        <div
          onClick={() => toggleExpanded(subject.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              toggleExpanded(subject.id)
            }
          }}
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          className="flex min-h-[4.5rem] cursor-pointer select-none items-center gap-3 px-4 py-3.5 transition-colors hover:bg-foreground/[0.03]"
        >
          <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: subject.border }} />
          <div className="min-w-0 flex-1">
            <span className="block truncate font-semibold leading-tight">{subject.name}</span>
            <span className="num flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="truncate">{sub}</span>
              {st.custom && <span className="shrink-0 rounded-full bg-foreground/10 px-1.5 py-px text-[10px] font-medium not-italic">Regla propia</span>}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {st.needsHours ? (
              <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">Falta HD</span>
            ) : (
              <span
                className={cn(
                  "num rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                  isCancelled ? "bg-destructive text-white" : isAtRisk ? "bg-amber-500 text-white" : "bg-foreground/10"
                )}
              >
                {isCancelled
                  ? "Cancelada"
                  : limit !== null
                    ? `${fmtHours(used)}/${fmtHours(limit)}${hoursUnit ? " h" : ""}`
                    : hoursUnit ? `${fmtHours(used)} h` : `${count} ${count === 1 ? "falta" : "faltas"}`}
              </span>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleHidden(subject.id) }}
              aria-label="Ocultar materia de esta vista"
              className="tap rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
              title="Ocultar de esta vista"
            >
              <EyeOff className="size-4" />
            </button>
            <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-300", isExpanded && "rotate-180")} />
          </div>
        </div>

        {/* Cuerpo colapsable (animación fluida con CSS grid) */}
        <div className={cn("grid transition-[grid-template-rows] duration-300 ease-in-out", isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
          <div className="overflow-hidden">
            <div className="space-y-4 p-4">
              {/* Datos de la materia para la regla de cálculo (si usa la global) */}
              {st.mode === "calc" && !st.custom && (
                <div className="grid grid-cols-2 gap-3">
                  <NumField label="Horas de trabajo directo (HD)" placeholder="Ej: 48" value={config?.directHours} onCommit={(v) => patchConfig(subject.id, { directHours: v })} />
                  <NumField label="Horas por clase" placeholder={String(block)} value={config?.blockHours ?? config?.weeklyHours} onCommit={(v) => patchConfig(subject.id, { blockHours: v, weeklyHours: undefined })} />
                </div>
              )}

              {/* Estado: anillo + mensaje + una marca por cada falta permitida */}
              {st.needsHours ? (
                <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-3 text-sm text-muted-foreground">
                  <AlertTriangle className="size-4 shrink-0 text-amber-500" />
                  <span>Ingresa las horas HD de esta materia para calcular su límite de faltas.</span>
                </div>
              ) : limit === null || remaining === null ? (
                <div className="flex items-center gap-4 rounded-xl bg-muted/50 px-4 py-3">
                  <CountUp value={count} className="num text-4xl font-light" />
                  <p className="text-sm text-muted-foreground">{count === 1 ? "falta registrada" : "faltas registradas"}<span className="block text-xs">Sin máximo: solo conteo.</span></p>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Ring
                    value={limit > 0 ? Math.min(used / limit, 1) : used > 0 ? 1 : 0}
                    size={76}
                    stroke={7}
                    className={isCancelled ? "text-destructive" : isAtRisk ? "text-amber-500" : "text-emerald-500"}
                  >
                    <span className="text-center leading-none">
                      <span className="num text-2xl font-bold">{fmtHours(used)}</span>
                      <span className="num mt-0.5 block text-[10px] text-muted-foreground">de {fmtHours(limit)}{hoursUnit ? " h" : ""}</span>
                    </span>
                  </Ring>
                  <div className="min-w-0 flex-1 space-y-2.5">
                    <p className={cn("flex items-start gap-1.5 text-sm", isCancelled ? "font-semibold text-destructive" : isAtRisk ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>
                      {isCancelled ? <XCircle className="mt-0.5 size-4 shrink-0" /> : isAtRisk ? <AlertTriangle className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />}
                      <span>
                        {hoursUnit ? (
                          isCancelled
                            ? <>Materia cancelada: pasaste el límite de {fmtHours(limit)} h.</>
                            : isAtRisk
                              ? <>¡Cuidado! {remaining === 0 ? "No te quedan horas." : <>Solo te quedan <strong>{fmtHours(remaining)} h</strong>.</>}</>
                              : <>Te quedan <strong>{fmtHours(remaining)} h</strong> seguras.</>
                        ) : (
                          isCancelled
                            ? <>Materia cancelada: pasaste el límite de {limit} falta{limit !== 1 ? "s" : ""}.</>
                            : isAtRisk
                              ? <>¡Cuidado! {remaining === 0 ? "No te quedan faltas." : <>Solo te queda <strong>1</strong> falta.</>}</>
                              : <>Te quedan <strong>{remaining}</strong> falta{remaining !== 1 ? "s" : ""} segura{remaining !== 1 ? "s" : ""}.</>
                        )}
                      </span>
                    </p>
                    {!hoursUnit && limit > 0 && limit <= 24 && (
                      <div className="flex flex-wrap gap-1" aria-hidden>
                        {Array.from({ length: limit }, (_, i) => (
                          <span
                            key={i}
                            className={cn(
                              "h-2 w-5 rounded-full transition-colors duration-500",
                              i < count ? (isCancelled ? "bg-destructive" : isAtRisk ? "bg-amber-500" : "bg-emerald-500") : "bg-foreground/10"
                            )}
                            style={{ transitionDelay: `${i * 50}ms` }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Historial de faltas */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground">Historial</p>
                  <div className="flex items-center gap-2">
                    <Input type="date" value={draftDate} onChange={(e) => setDraftDate(e.target.value)} className="h-7 px-2 text-[11px] w-[115px]" />
                    {hoursUnit && (
                      <Input
                        inputMode="decimal"
                        value={draftAbsHours}
                        onChange={(e) => setDraftAbsHours(e.target.value)}
                        placeholder={`${fmtHours(block)} h`}
                        aria-label="Horas que faltó ese día"
                        title="Horas que faltó ese día"
                        className="h-7 w-14 px-2 text-center text-[11px]"
                      />
                    )}
                    <Button size="icon" variant="secondary" className="h-7 w-7 rounded-md shrink-0" onClick={() => handleAddAbsence(subject.id, unit, block)} title="Agregar falta">
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                </div>
                {hoursUnit && <p className="text-[11px] text-muted-foreground">Indica cuántas horas faltaste ese día (si la dejas vacía, {fmtHours(block)} h).</p>}

                {subjectAbsences.length > 0 ? (
                  <ul className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {subjectAbsences.map((absence, index) => (
                      <li key={absence.id} className="flex animate-fade-in items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2 text-sm">
                        <div className="flex items-center gap-2.5">
                          <span className="num grid size-6 shrink-0 place-items-center rounded-md bg-foreground/10 text-[11px] font-semibold">{index + 1}</span>
                          <span className="num">{formatDate(absence.date)}</span>
                          {hoursUnit && <span className="num rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-medium">{fmtHours(absence.hours ?? block)} h</span>}
                        </div>
                        <button
                          onClick={() => handleDeleteAbsence(absence.id)}
                          className="tap p-1 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                          title="Eliminar falta"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground italic text-center py-2">Sin faltas registradas.</p>
                )}
              </div>

              {/* Regla: la global, o una propia solo para esta materia */}
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t pt-3 text-xs">
                <span className="min-w-0 text-muted-foreground">
                  {st.custom ? <>Regla propia: {describeRule(ownRule)}</> : "Usa la regla global"}
                </span>
                <span className="flex shrink-0 items-center gap-3 font-medium">
                  {st.custom ? (
                    <>
                      <button type="button" onClick={() => openRule(subject.id)} className="text-foreground underline-offset-4 hover:underline">Editar</button>
                      <button type="button" onClick={() => useGlobalRule(subject.id)} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Usar la global</button>
                    </>
                  ) : (
                    <button type="button" onClick={() => openRule(subject.id)} className="inline-flex items-center gap-1.5 text-muted-foreground transition hover:text-foreground">
                      <SlidersHorizontal className="size-3.5" />Esta materia cuenta distinto
                    </button>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const shown = subjects.filter((s) => !hiddenSubjects.includes(s.id))
  const hiddenList = subjects.filter((s) => hiddenSubjects.includes(s.id))
  const scopeName = isGlobalScope ? "" : subjects.find((s) => s.id === dialog.scope)?.name
  const pctLabel = percentOk ? percent : DEFAULT_PERCENT

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative animate-rise overflow-hidden rounded-3xl border bg-card p-4 shadow-(--card-shadow) sm:p-6">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-foreground/10 blur-3xl" />
        <h2 className="relative text-xl font-semibold tracking-tight">Faltas</h2>
        <p className="relative mt-0.5 hidden text-sm text-muted-foreground sm:block">
          Las faltas permitidas son un % de inasistencia sobre las horas de trabajo directo (HD). Define la regla una vez; en cada materia solo anotas sus HD.
        </p>

        {/* Regla global */}
        <div className="relative mt-4 flex items-center gap-3 rounded-2xl border bg-background/40 px-4 py-3">
          <Calculator className="size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Regla para todas las materias</p>
            <p className="truncate text-xs text-muted-foreground">{describeRule(globalCfg)}{globalCfg ? "" : " · predeterminada"}</p>
          </div>
          <Button size="sm" variant={globalCfg ? "secondary" : "default"} onClick={() => openRule("global")} className="shrink-0 rounded-full">
            {globalCfg ? "Cambiar" : "Configurar"}
          </Button>
        </div>

        <div className="relative mt-3 grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { label: "Registradas", value: totalAbsences, tone: "" },
            { label: "En riesgo", value: atRisk, tone: atRisk ? "text-amber-500" : "" },
            { label: "Falta HD", value: needsHD, tone: "" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-muted/50 px-3 py-3">
              <p className={cn("text-3xl font-light", s.tone)}><CountUp value={s.value} /></p>
              <p className="mt-0.5 truncate text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Móvil: una sola lista en el orden original */}
      <div className="space-y-4 sm:hidden">{shown.map(renderCard)}</div>

      {/* Escritorio: dos columnas independientes, conservando el mismo orden/emparejamiento de siempre */}
      <div className="hidden gap-4 sm:grid sm:grid-cols-2 sm:items-start">
        <div className="space-y-4">{shown.filter((_, i) => i % 2 === 0).map(renderCard)}</div>
        <div className="space-y-4">{shown.filter((_, i) => i % 2 === 1).map(renderCard)}</div>
      </div>

      {/* Materias ocultas */}
      {hiddenList.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground px-1">Materias ocultas en esta vista</p>
          <div className="flex flex-wrap gap-2">
            {hiddenList.map((s) => (
              <button
                key={s.id}
                onClick={() => onToggleHidden(s.id)}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                style={{ borderColor: s.border, backgroundColor: s.bg + "60" }}
              >
                <Eye className="size-3" />
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dialog: regla de faltas (global o propia de una materia) */}
      <Dialog open={dialog.open} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{isGlobalScope ? "Regla de faltas" : `Regla propia · ${scopeName}`}</DialogTitle>
            <DialogDescription>
              {isGlobalScope ? "Se aplica a todas las materias, salvo las que tengan regla propia." : "Solo para esta materia; las demás siguen con la global."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div role="radiogroup" aria-label="Tipo de control de faltas" className="grid gap-2">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={draftMode === m.value}
                  onClick={() => setDraftMode(m.value)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 text-left transition",
                    draftMode === m.value ? "border-foreground/40 bg-foreground/[0.06]" : "hover:bg-foreground/[0.03]"
                  )}
                >
                  <m.icon className={cn("mt-0.5 size-4 shrink-0", draftMode === m.value ? "text-foreground" : "text-muted-foreground")} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{m.title}</span>
                    <span className="block text-xs text-muted-foreground">{m.desc}</span>
                  </span>
                </button>
              ))}
            </div>

            {/* Contar en clases enteras o en horas */}
            {draftMode !== "none" && (
              <div className="space-y-1.5">
                <Label>Contar las faltas en</Label>
                <div role="radiogroup" aria-label="Unidad de las faltas" className="grid grid-cols-2 gap-1 rounded-xl border bg-muted/30 p-1">
                  {([["classes", "Clases enteras"], ["hours", "Horas"]] as const).map(([v, label]) => (
                    <button key={v} type="button" role="radio" aria-checked={draftUnit === v} onClick={() => setDraftUnit(v)}
                      className={cn("h-8 rounded-lg text-xs font-medium transition", draftUnit === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {inHours
                    ? "Cada falta guarda cuántas horas faltaste ese día, y el límite se mide en horas."
                    : `Cada falta es una clase completa de ${block > 0 ? fmtHours(block) : DEFAULT_BLOCK_HOURS} h.`}
                </p>
              </div>
            )}

            {draftMode === "calc" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 items-end gap-3">
                  {!isGlobalScope && (
                    <div className="space-y-1.5">
                      <Label htmlFor="direct-hours">Trabajo directo, HD (h)</Label>
                      <Input id="direct-hours" inputMode="decimal" placeholder="Ej: 48" value={draftHours} onChange={(e) => setDraftHours(e.target.value)} />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="percent">% de inasistencia permitido</Label>
                    <Input id="percent" inputMode="decimal" value={draftPercent} onChange={(e) => setDraftPercent(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="block-hours">{inHours ? "Horas por clase (por defecto)" : "Horas por clase"}</Label>
                    <Input id="block-hours" inputMode="decimal" placeholder="Ej: 2" value={draftBlock} onChange={(e) => setDraftBlock(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                  <p className="text-xs text-muted-foreground">
                    {inHours ? "Faltas permitidas = % × HD (en horas)" : "Faltas permitidas = ⌊ % × HD ÷ horas por clase ⌋"}
                  </p>
                  {calcOk ? (
                    isGlobalScope ? (
                      <p className="text-xs text-muted-foreground">Ejemplo: con 48 h de HD → <strong className="text-foreground">{fmtHours(calcAbsenceLimit(48, block, percent, draftUnit))}{inHours ? " h" : " faltas"}</strong> como máximo. En cada materia solo anotas su HD.</p>
                    ) : inHours ? (
                      <>
                        <p className="num">{pctLabel}% × {hours} h</p>
                        <p className="font-bold text-primary">Máximo: {fmtHours(calcAbsenceLimit(hours, block, percent, "hours"))} h de inasistencia</p>
                      </>
                    ) : (
                      <>
                        <p className="num">{pctLabel}% × {hours} h = {fmtHours((hours * percent) / 100)} h → ÷ {fmtHours(block)} h por clase = {((hours * percent) / 100 / block).toFixed(1)}</p>
                        <p className="font-bold text-primary">Máximo: {calcAbsenceLimit(hours, block, percent)} faltas</p>
                        <p className="text-xs text-muted-foreground">Con {calcAbsenceLimit(hours, block, percent) + 1} faltas la materia queda cancelada. Se redondea hacia abajo.</p>
                      </>
                    )
                  ) : (
                    <p className="text-xs text-muted-foreground">Completa {isGlobalScope ? "las horas por clase y un porcentaje entre 1 y 100." : "las horas HD, las horas por clase y un porcentaje entre 1 y 100."}</p>
                  )}
                </div>
              </div>
            )}

            {draftMode === "manual" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="max-absences">{inHours ? "Máximo de horas de inasistencia" : isGlobalScope ? "Máximo de faltas por materia" : "Máximo de faltas permitidas"}</Label>
                  <Input id="max-absences" inputMode="decimal" placeholder={inHours ? "Ej: 9.6" : "Ej: 4"} value={draftMax} onChange={(e) => setDraftMax(e.target.value)} />
                  <p className="text-xs text-muted-foreground">
                    {maxOk ? (inHours ? "Pasar de ese tiempo cancela la materia." : `Con ${max + 1} faltas la materia queda cancelada.`) : inHours ? "Escribe un número de horas (0 o más)." : "Escribe un número entero (0 o más)."}
                  </p>
                </div>
                {inHours && (
                  <div className="space-y-1.5">
                    <Label htmlFor="block-hours-m">Horas por clase (por defecto)</Label>
                    <Input id="block-hours-m" inputMode="decimal" placeholder="Ej: 2" value={draftBlock} onChange={(e) => setDraftBlock(e.target.value)} />
                  </div>
                )}
              </div>
            )}

            {draftMode === "none" && (
              <p className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                Solo registrarás tus faltas, sin máximo ni alertas. Puedes cambiarlo cuando quieras.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={saveRule} className="w-full rounded-full" disabled={!canSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
