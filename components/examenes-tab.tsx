"use client"

import { useState } from "react"
import { Plus, Trash2, Users, User, FileText, Presentation } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SUBJECTS, getSubject, type Exam } from "@/lib/horario-data"

type Props = {
  exams: Exam[]
  setExams: React.Dispatch<React.SetStateAction<Exam[]>>
}

export function ExamenesTab({ exams, setExams }: Props) {
  const [subjectId, setSubjectId] = useState(SUBJECTS[0].id)
  const [date, setDate] = useState("")
  const [group, setGroup] = useState<Exam["group"]>("individual")
  const [kind, setKind] = useState<Exam["kind"]>("examen")
  const [weight, setWeight] = useState("")

  function add() {
    if (!date) return
    const exam: Exam = {
      id: crypto.randomUUID(),
      subjectId,
      date,
      group,
      kind,
      weight: Number(weight) || 0,
    }
    setExams((prev) => [...prev, exam])
    setDate("")
    setWeight("")
  }

  function remove(id: string) {
    setExams((prev) => prev.filter((e) => e.id !== id))
  }

  const sorted = [...exams].sort((a, b) => a.date.localeCompare(b.date))

  function formatDate(d: string) {
    const date = new Date(d + "T00:00:00")
    return date.toLocaleDateString("es-CO", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-semibold">Fechas de exámenes</h2>
        <p className="text-sm text-muted-foreground">
          Registra tus exámenes y presentaciones con su modalidad y porcentaje.
        </p>
      </div>

      {/* Form */}
      <Card className="p-4 animate-slide-up">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
          <div className="space-y-1 lg:col-span-2">
            <Label>Materia</Label>
            <Select value={subjectId} onValueChange={(v) => v && setSubjectId(v)}>
              <SelectTrigger>
                <SelectValue>{() => getSubject(subjectId)?.name}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SUBJECTS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="exam-date">Fecha</Label>
            <Input
              id="exam-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Modalidad</Label>
            <Select value={group} onValueChange={(v) => v && setGroup(v as Exam["group"])}>
              <SelectTrigger>
                <SelectValue>{(v) => (v === "grupal" ? "Grupal" : "Individual")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="grupal">Grupal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select value={kind} onValueChange={(v) => v && setKind(v as Exam["kind"])}>
              <SelectTrigger>
                <SelectValue>{(v) => (v === "presentacion" ? "Presentación" : "Examen")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="examen">Examen</SelectItem>
                <SelectItem value="presentacion">Presentación</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="exam-weight">Vale %</Label>
            <div className="flex gap-2">
              <Input
                id="exam-weight"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="25"
                inputMode="numeric"
              />
              <Button onClick={add} size="icon" aria-label="Agregar examen" className="shrink-0">
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Lista */}
      {sorted.length > 0 ? (
        <div className="space-y-3 animate-slide-up" style={{ animationDelay: '100ms' }}>
          {sorted.map((e) => {
            const subject = getSubject(e.subjectId)
            return (
              <div
                key={e.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 animate-pop"
              >
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: subject?.border }}
                  aria-hidden
                />
                <div className="min-w-[140px] flex-1">
                  <p className="font-medium leading-tight">{subject?.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">{formatDate(e.date)}</p>
                </div>
                <Badge variant="secondary" className="gap-1">
                  {e.group === "grupal" ? <Users className="size-3" /> : <User className="size-3" />}
                  {e.group === "grupal" ? "Grupal" : "Individual"}
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  {e.kind === "presentacion" ? (
                    <Presentation className="size-3" />
                  ) : (
                    <FileText className="size-3" />
                  )}
                  {e.kind === "presentacion" ? "Presentación" : "Examen"}
                </Badge>
                <Badge className="tabular-nums">{e.weight}%</Badge>
                <button
                  type="button"
                  onClick={() => remove(e.id)}
                  aria-label="Eliminar examen"
                  className="text-muted-foreground transition hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No has agregado fechas todavía.
        </p>
      )}
    </div>
  )
}
