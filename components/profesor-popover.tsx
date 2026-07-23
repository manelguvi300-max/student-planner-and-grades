"use client"

import { useEffect, useState } from "react"
import { User, Mail, Phone, Clock, Copy, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Subject } from "@/lib/horario-data"

export type TeacherField = "teacherName" | "teacherEmail" | "teacherPhone" | "officeHours"

type FieldsProps = {
  subject: Subject
  onUpdate: (field: TeacherField, value: string) => void
  autoFocus?: boolean
}

/** Formulario de datos del profesor, compartido entre el panel inline de escritorio y la hoja móvil. */
export function TeacherFormFields({ subject, onUpdate, autoFocus }: FieldsProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopyEmail() {
    if (!subject.teacherEmail) return
    try {
      await navigator.clipboard.writeText(subject.teacherEmail)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // portapapeles no disponible, se ignora silenciosamente
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
          <User className="size-3" /> Profesor
        </Label>
        <Input
          autoFocus={autoFocus}
          placeholder="Nombre del profesor"
          value={subject.teacherName ?? ""}
          onChange={(e) => onUpdate("teacherName", e.target.value)}
          className="h-9 text-sm bg-background"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Mail className="size-3" /> Correo
        </Label>
        <div className="flex gap-1.5">
          <Input
            type="email"
            placeholder="correo@universidad.edu.co"
            value={subject.teacherEmail ?? ""}
            onChange={(e) => onUpdate("teacherEmail", e.target.value)}
            className="h-9 text-sm bg-background flex-1"
          />
          <button
            type="button"
            onClick={handleCopyEmail}
            disabled={!subject.teacherEmail}
            title="Copiar correo"
            className="shrink-0 grid place-items-center size-9 rounded-md border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Phone className="size-3" /> Número
          </Label>
          <Input
            type="tel"
            placeholder="Ej: 300 123 4567"
            value={subject.teacherPhone ?? ""}
            onChange={(e) => onUpdate("teacherPhone", e.target.value)}
            className="h-9 text-sm bg-background"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Clock className="size-3" /> Asesorías
          </Label>
          <Input
            placeholder="Ej: Martes 2-4pm, of. 305"
            value={subject.officeHours ?? ""}
            onChange={(e) => onUpdate("officeHours", e.target.value)}
            className="h-9 text-sm bg-background"
          />
        </div>
      </div>
    </div>
  )
}

type SheetProps = {
  subject: Subject
  onClose: () => void
  onUpdate: (field: TeacherField, value: string) => void
}

/**
 * Hoja inferior para móvil. Se oculta vía CSS (no JS) en pantallas sm+, así que
 * convive sin conflicto con el panel inline de escritorio y no depende de
 * detectar el viewport con matchMedia (evita bugs de hidratación/timing).
 */
export function ProfesorMobileSheet({ subject, onClose, onUpdate }: SheetProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [onClose])

  return (
    <div className="sm:hidden">
      {/* z-index muy alto a propósito: garantiza que quede SIEMPRE por encima
          de cualquier barra de navegación inferior fija de la app */}
      <div
        className="fixed inset-0 z-[90] bg-black/30 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-label={`Información del profesor de ${subject.name}`}
        className="fixed inset-x-0 bottom-0 z-[100] rounded-t-2xl border-t bg-card shadow-xl p-4 animate-slide-up max-h-[75vh] overflow-y-auto"
        style={{ paddingBottom: "max(1.5rem, calc(env(safe-area-inset-bottom) + 4.5rem))" }}
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/30 -mt-1 mb-3" />
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="size-3 rounded-full shrink-0"
              style={{ backgroundColor: subject.bg, border: `1.5px solid ${subject.border}` }}
            />
            <p className="text-sm font-semibold truncate">{subject.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-medium text-primary px-2 py-1 -mr-2 rounded hover:bg-muted transition-colors"
            type="button"
          >
            Listo
          </button>
        </div>
        <TeacherFormFields subject={subject} onUpdate={onUpdate} />
      </div>
    </div>
  )
}