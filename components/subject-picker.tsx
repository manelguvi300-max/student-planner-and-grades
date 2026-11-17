"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Subject } from "@/lib/horario-data"

const norm = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()

/**
 * Selector de una materia: un campo que muestra la elegida y, al tocarlo, despliega buscador + lista.
 * Sin materia elegida se muestra desplegado de entrada.
 */
export function SubjectPicker({ subjects, value, onChange, invalid, hint, noneLabel }: {
  subjects: Subject[]
  value: string
  onChange: (id: string) => void
  invalid?: boolean
  /** Texto secundario de cada fila (p. ej. «2 pendientes») */
  hint?: (s: Subject) => string
  /** Si se da, «ninguna materia» (value = "") es una opción válida con este texto */
  noneLabel?: string
}) {
  const selected = subjects.find((s) => s.id === value)
  const none = noneLabel !== undefined && value === ""
  const [open, setOpen] = useState(!selected && !none)
  const [query, setQuery] = useState("")

  const q = norm(query.trim())
  const matches = subjects.filter((s) => norm(s.name).includes(q))
  const choose = (id: string) => { onChange(id); setOpen(false); setQuery("") }

  return (
    <div className="space-y-2">
      {(selected || none) && (
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
          className={cn("flex min-h-11 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition hover:border-foreground/30 active:scale-[0.99]", open && "border-ring ring-3 ring-ring/30", invalid && "border-destructive")}>
          {selected
            ? <span className="size-3.5 shrink-0 rounded-full" style={{ backgroundColor: selected.bg, boxShadow: `0 0 0 1.5px ${selected.border}` }} />
            : <span className="size-3.5 shrink-0 rounded-full border border-dashed border-foreground/40" />}
          <span className={cn("min-w-0 flex-1 truncate text-sm font-medium", !selected && "text-muted-foreground")}>{selected ? selected.name : noneLabel}</span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      )}

      {open && (
        <div className={cn("animate-rise overflow-hidden rounded-lg border bg-card", invalid && !selected && "border-destructive")}>
          {subjects.length > 0 && (
            <div className="flex items-center gap-2 border-b px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              {/* en el móvil no se enfoca solo: el teclado taparía la lista */}
              <input autoFocus={(!!selected || none) && !window.matchMedia("(pointer: coarse)").matches} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar materia…" aria-label="Buscar materia" enterKeyHint="done"
                className="h-10 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); if (matches[0]) choose(matches[0].id) }
                  else if (e.key === "Escape" && (selected || none)) { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setOpen(false) }
                }} />
            </div>
          )}
          <ul className="max-h-60 overflow-y-auto p-1" role="listbox" aria-label="Materias">
            {noneLabel !== undefined && !q && (
              <li>
                <button type="button" role="option" aria-selected={value === ""} onClick={() => choose("")}
                  className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm text-muted-foreground transition hover:bg-foreground/[0.06] active:bg-foreground/[0.1]">
                  <span className="size-3 shrink-0 rounded-full border border-dashed border-foreground/40" />
                  <span className="min-w-0 flex-1 truncate">{noneLabel}</span>
                  {value === "" && <Check className="size-4 shrink-0 text-emerald-500" />}
                </button>
              </li>
            )}
            {matches.map((s) => (
              <li key={s.id}>
                <button type="button" role="option" aria-selected={s.id === value} onClick={() => choose(s.id)}
                  className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-foreground/[0.06] active:bg-foreground/[0.1]">
                  <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: s.bg, boxShadow: `0 0 0 1.5px ${s.border}` }} />
                  <span className="min-w-0 flex-1 truncate">{s.name}</span>
                  {hint && <span className="num shrink-0 text-xs text-muted-foreground">{hint(s)}</span>}
                  {s.id === value && <Check className="size-4 shrink-0 text-emerald-500" />}
                </button>
              </li>
            ))}
            {matches.length === 0 && <li className="px-3 py-3 text-center text-sm text-muted-foreground">{subjects.length ? `Ninguna materia coincide con «${query.trim()}».` : "Aún no hay materias. Créalas en Horario → Materias."}</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
