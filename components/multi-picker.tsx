"use client"

import { useState, type ReactNode } from "react"
import { Check, Plus, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

const norm = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()

export type PickItem = {
  id: string
  label: string
  sub?: string
  /** Color de la fila/chip cuando está elegido */
  color: { bg: string; border: string }
  /** Icono o avatar de la fila */
  lead: ReactNode
}

/** Selector múltiple con buscador: elegidos arriba como chips quitables, lista visual abajo. */
export function MultiPicker({ items, value, onChange, noun, nounPlural, onCreate }: {
  items: PickItem[]
  value: string[]
  onChange: (ids: string[]) => void
  /** "profesor" / "materia" */
  noun: string
  nounPlural: string
  /** Si se pasa, aparece «Crear …» cuando lo escrito no existe */
  onCreate?: (name: string) => void
}) {
  const [query, setQuery] = useState("")
  const q = norm(query.trim())
  const matches = q ? items.filter((i) => norm(i.label).includes(q) || norm(i.sub ?? "").includes(q)) : items
  const canCreate = !!onCreate && q.length > 0 && !items.some((i) => norm(i.label) === q)
  const selected = value.map((id) => items.find((i) => i.id === id)).filter((i): i is PickItem => !!i)

  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  const create = () => { onCreate?.(query.trim()); setQuery("") }

  return (
    <div className="space-y-2">
      {/* Elegidos */}
      <div className="flex min-h-8 flex-wrap items-center gap-1.5" aria-live="polite">
        {selected.length === 0 ? (
          <p className="text-xs text-muted-foreground">Ningún {noun} elegido todavía.</p>
        ) : (
          selected.map((i) => (
            <span key={i.id} className="animate-scale-in flex max-w-full items-center gap-1 rounded-full border py-1 pl-3 pr-1 text-xs font-medium text-neutral-900"
              style={{ backgroundColor: i.color.bg, borderColor: i.color.border }}>
              <span className="truncate">{i.label}</span>
              <button type="button" onClick={() => toggle(i.id)} aria-label={`Quitar ${i.label}`} className="tap grid size-5 shrink-0 place-items-center rounded-full transition hover:bg-black/10">
                <X className="size-3" />
              </button>
            </span>
          ))
        )}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Buscar ${noun}…`} aria-label={`Buscar ${noun}`}
            className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            onKeyDown={(e) => {
              if (e.key !== "Enter") return
              e.preventDefault()
              if (matches[0]) { toggle(matches[0].id); setQuery("") } else if (canCreate) create()
            }} />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Borrar búsqueda" className="tap grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-foreground/10">
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <ul className="max-h-60 overflow-y-auto p-1" role="listbox" aria-multiselectable aria-label={nounPlural}>
          {matches.map((i) => {
            const on = value.includes(i.id)
            return (
              <li key={i.id}>
                <button type="button" role="option" aria-selected={on} onClick={() => toggle(i.id)}
                  className={cn("flex min-h-12 w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition active:scale-[0.99]", on ? "" : "hover:bg-foreground/[0.06]")}
                  style={on ? { backgroundColor: `${i.color.bg}55` } : undefined}>
                  {i.lead}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{i.label}</span>
                    {i.sub && <span className="block truncate text-xs text-muted-foreground">{i.sub}</span>}
                  </span>
                  <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border transition", on ? "border-transparent bg-emerald-500 text-white" : "border-foreground/25")}>
                    {on && <Check className="size-3.5" />}
                  </span>
                </button>
              </li>
            )
          })}
          {matches.length === 0 && (
            <li className="px-3 py-3 text-center text-sm text-muted-foreground">
              {items.length === 0 ? `Aún no hay ${nounPlural}.` : `Ningún ${noun} coincide con «${query.trim()}».`}
            </li>
          )}
        </ul>

        {canCreate && (
          <button type="button" onClick={create}
            className="flex min-h-11 w-full items-center gap-2 border-t px-3 py-2.5 text-left text-sm font-medium transition hover:bg-foreground/[0.06]">
            <span className="grid size-6 place-items-center rounded-full bg-foreground text-background"><Plus className="size-3.5" /></span>
            <span className="truncate">Crear {noun} «{query.trim()}»</span>
          </button>
        )}
      </div>
    </div>
  )
}
