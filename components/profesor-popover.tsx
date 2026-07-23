"use client"

import { useEffect, useRef, useState } from "react"
import { User, Mail, Phone, Clock, X, GraduationCap } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Subject } from "@/lib/horario-data"

type TeacherField = "teacherName" | "teacherEmail" | "teacherPhone" | "officeHours"

type Props = {
  subject: Subject
  anchorRect: DOMRect
  onClose: () => void
  onUpdate: (field: TeacherField, value: string) => void
}

const POPOVER_WIDTH = 288
const MARGIN = 12
const MOBILE_BREAKPOINT = 640 // debe coincidir con el breakpoint "sm" de Tailwind

export function ProfesorPopover({ subject, anchorRect, onClose, onUpdate }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  // Detectar si estamos en viewport móvil (una sola vez + al rotar pantalla)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  // Cerrar al tocar afuera o con Escape
  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleKey)
    }
  }, [onClose])

  // Cerrar solo si cambia el ANCHO real de la ventana (rotación de pantalla).
  // El teclado en móvil solo cambia el ALTO del viewport, así que no debe cerrar el panel.
  useEffect(() => {
    const startWidth = window.innerWidth
    function handleResize() {
      if (window.innerWidth !== startWidth) onClose()
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [onClose])

  // Evita parpadeo: no renderizamos hasta saber si es móvil o escritorio
  if (isMobile === null) return null

  if (isMobile) {
    return (
      <>
        <div
          className="fixed inset-0 z-40 bg-black/30 animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-label={`Información del profesor de ${subject.name}`}
          className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t bg-card shadow-xl p-4 space-y-3 animate-slide-up max-h-[80vh] overflow-y-auto"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/30 -mt-1 mb-1" />
          <TeacherFormHeader subject={subject} onClose={onClose} />
          <TeacherFormFields subject={subject} onUpdate={onUpdate} autoFocus={false} />
        </div>
      </>
    )
  }

  const placement = computePlacement(anchorRect)

  return (
    <>
      <div className="fixed inset-0 z-40 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-label={`Información del profesor de ${subject.name}`}
        className="fixed z-50 w-72 rounded-2xl border bg-card shadow-xl p-4 space-y-3 animate-scale-in origin-top"
        style={{ top: placement.top, left: placement.left }}
      >
        {!placement.flipped ? (
          <div className="absolute size-3 rotate-45 bg-card border-l border-t" style={{ top: -6, left: 20 }} />
        ) : (
          <div className="absolute size-3 rotate-45 bg-card border-r border-b" style={{ bottom: -6, left: 20 }} />
        )}
        <TeacherFormHeader subject={subject} onClose={onClose} />
        <TeacherFormFields subject={subject} onUpdate={onUpdate} autoFocus />
      </div>
    </>
  )
}

function TeacherFormHeader({ subject, onClose }: { subject: Subject; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="grid place-items-center size-6 rounded-full shrink-0"
          style={{ backgroundColor: subject.bg, border: `1px solid ${subject.border}` }}
        >
          <GraduationCap className="size-3.5 text-neutral-900/70" />
        </span>
        <p className="text-sm font-semibold truncate">{subject.name}</p>
      </div>
      <button
        onClick={onClose}
        className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors shrink-0"
        type="button"
        title="Cerrar"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}

function TeacherFormFields({
  subject,
  onUpdate,
  autoFocus,
}: {
  subject: Subject
  onUpdate: (field: TeacherField, value: string) => void
  autoFocus: boolean
}) {
  return (
    <>
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
          <User className="size-3" /> Profesor
        </Label>
        <Input
          autoFocus={autoFocus}
          placeholder="Nombre del profesor"
          value={subject.teacherName ?? ""}
          onChange={(e) => onUpdate("teacherName", e.target.value)}
          className="h-9 text-sm"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Mail className="size-3" /> Correo
        </Label>
        <Input
          type="email"
          placeholder="correo@universidad.edu.co"
          value={subject.teacherEmail ?? ""}
          onChange={(e) => onUpdate("teacherEmail", e.target.value)}
          className="h-9 text-sm"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Phone className="size-3" /> Número
        </Label>
        <Input
          type="tel"
          placeholder="Ej: 300 123 4567"
          value={subject.teacherPhone ?? ""}
          onChange={(e) => onUpdate("teacherPhone", e.target.value)}
          className="h-9 text-sm"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Clock className="size-3" /> Horario de asesorías
        </Label>
        <Input
          placeholder="Ej: Martes 2-4pm, oficina 305"
          value={subject.officeHours ?? ""}
          onChange={(e) => onUpdate("officeHours", e.target.value)}
          className="h-9 text-sm"
        />
      </div>
    </>
  )
}

function computePlacement(anchorRect: DOMRect) {
  const viewportW = window.innerWidth
  const viewportH = window.innerHeight
  const estimatedHeight = 340

  let left = anchorRect.left
  if (left + POPOVER_WIDTH > viewportW - MARGIN) left = viewportW - POPOVER_WIDTH - MARGIN
  if (left < MARGIN) left = MARGIN

  let top = anchorRect.bottom + 10
  let flipped = false
  if (top + estimatedHeight > viewportH - MARGIN) {
    flipped = true
    top = Math.max(MARGIN, anchorRect.top - estimatedHeight - 10)
  }

  return { top, left, flipped }
}