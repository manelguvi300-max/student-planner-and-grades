"use client"

import { useRef, useState, type ReactNode } from "react"
import { Check, Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"

const norm = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()

export type PickItem = {
  id: string
  label: string
  sub?: string
  /** Color del chip cuando está elegido */
  color: { bg: string; border: string }
  /** Icono o avatar pequeño de la fila */
  lead: ReactNode
}

/**
 * Campo de etiquetas con buscador integrado: lo elegido vive como chips dentro del propio campo
 * y las sugerencias solo se abren al tocarlo (sin lista ni cuadro de búsqueda siempre a la vista).
 */
export function MultiPicker({ items, value, onChange, noun, onCreate }: {
  items: PickItem[]
  value: string[]
  onChange: (ids: string[]) => void
  /** "profesor" / "materia" */
  noun: string
  /** Si se pasa, aparece «Crear …» cuando lo escrito no existe */
  onCreate?: (name: string) => void
}) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const q = norm(query.trim())
  const selected = value.map((id) => items.find((i) => i.id === id)).filter((i): i is PickItem => !!i)
  // lo ya elegido está en los chips: la lista solo ofrece lo que falta
  const options = items.filter((i) => !value.includes(i.id) && (!q || norm(i.label).includes(q) || norm(i.sub ?? "").includes(q)))
  const canCreate = !!onCreate && q.length > 0 && !items.some((i) => norm(i.label) === q)
  const rows = options.length + (canCreate ? 1 : 0)
  const idx = Math.min(active, Math.max(rows - 1, 0))

  const add = (id: string) => { onChange([...value, id]); setQuery(""); setActive(0) }
  const remove = (id: string) => onChange(value.filter((x) => x !== id))
  const create = () => { onCreate?.(query.trim()); setQuery(""); setActive(0) }
  const pick = (i: number) => (i < options.length ? add(options[i].id) : create())

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      if (open && rows > 0) pick(idx)
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      setOpen(true)
      if (rows > 0) setActive((idx + (e.key === "ArrowDown" ? 1 : rows - 1)) % rows)
    } else if (e.key === "Escape" && open) {
      e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation()
      setOpen(false)
    } else if (e.key === "Backspace" && !query && value.length) {
      remove(value[value.length - 1])
    }
  }

  const keepFocus = (e: React.MouseEvent) => e.preventDefault()

  return (
    <div ref={rootRef} className="relative" onBlur={(e) => { if (!rootRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false) }}>
      <div onClick={() => inputRef.current?.focus()}
        className={cn("flex min-h-11 cursor-text flex-wrap items-center gap-1.5 rounded-xl border bg-transparent px-2 py-1.5 transition", open ? "border-ring ring-3 ring-ring/30" : "hover:border-foreground/30")}>
        {selected.map((i) => (
          <span key={i.id} className="animate-scale-in flex max-w-full items-center gap-1.5 rounded-full border py-0.5 pl-1 pr-1 text-xs font-medium text-neutral-900"
            style={{ backgroundColor: i.color.bg, borderColor: i.color.border }}>
            {i.lead}
            <span className="truncate">{i.label}</span>
            <button type="button" onMouseDown={keepFocus} onClick={() => remove(i.id)} aria-label={`Quitar ${i.label}`}
              className="tap grid size-5 shrink-0 place-items-center rounded-full transition hover:bg-black/10">
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input ref={inputRef} value={query} onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true) }}
          onFocus={() => setOpen(true)} onKeyDown={onKeyDown} role="combobox" aria-expanded={open} aria-autocomplete="list" aria-label={`Agregar ${noun}`}
          placeholder={selected.length ? `Agregar otro…` : `Buscar o agregar ${noun}…`} enterKeyHint="done"
          className="h-7 min-w-28 flex-1 bg-transparent px-1.5 text-sm outline-none placeholder:text-muted-foreground" />
      </div>

      {open && rows > 0 && (
        <ul role="listbox" aria-label={noun} className="animate-rise mt-1.5 max-h-44 overflow-y-auto rounded-xl border bg-card p-1 shadow-(--card-shadow)">
          {options.map((i, n) => (
            <li key={i.id}>
              <button type="button" role="option" aria-selected={n === idx} onMouseDown={keepFocus} onClick={() => add(i.id)} onMouseEnter={() => setActive(n)}
                className={cn("flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition", n === idx && "bg-foreground/[0.07]")}>
                {i.lead}
                <span className="min-w-0 flex-1 truncate text-sm">
                  {i.label}
                  {i.sub && <span className="ml-1.5 text-xs text-muted-foreground">{i.sub}</span>}
                </span>
                <Plus className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
          {canCreate && (
            <li>
              <button type="button" role="option" aria-selected={options.length === idx} onMouseDown={keepFocus} onClick={create} onMouseEnter={() => setActive(options.length)}
                className={cn("flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm font-medium transition", options.length === idx && "bg-foreground/[0.07]")}>
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-foreground text-background"><Check className="size-3.5" /></span>
                <span className="truncate">Crear {noun} «{query.trim()}»</span>
              </button>
            </li>
          )}
        </ul>
      )}
      {open && rows === 0 && (
        <p className="animate-rise mt-1.5 rounded-xl border bg-card px-3 py-2.5 text-xs text-muted-foreground">
          {items.length === 0 ? `Aún no hay ${noun}s.` : q ? `Ningún ${noun} coincide con «${query.trim()}».` : `Ya agregaste todos los ${noun}s.`}
        </p>
      )}
    </div>
  )
}
