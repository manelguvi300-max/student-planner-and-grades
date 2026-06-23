"use client"

import { CalendarDays, GraduationCap, ClipboardList } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HorarioTab } from "@/components/horario-tab"
import { NotasTab } from "@/components/notas-tab"
import { ExamenesTab } from "@/components/examenes-tab"
import { useLocalStorage } from "@/lib/use-local-storage"
import { DEFAULT_CLASSES, type ClassSession, type Exam, type Grade } from "@/lib/horario-data"

export default function Page() {
  const [classes, setClasses] = useLocalStorage<ClassSession[]>("horario.classes", DEFAULT_CLASSES)
  const [grades, setGrades] = useLocalStorage<Record<string, Grade[]>>("horario.grades", {})
  const [exams, setExams] = useLocalStorage<Exam[]>("horario.exams", [])

  return (
    <main className="mx-auto min-h-svh w-full max-w-5xl px-4 py-8 md:py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-balance md:text-3xl">
          Mi semestre
        </h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Horario de clases, seguimiento de notas y fechas de exámenes en un solo lugar.
        </p>
      </header>

      <Tabs defaultValue="horario" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-flex">
          <TabsTrigger value="horario" className="gap-2">
            <CalendarDays className="size-4" />
            <span className="hidden sm:inline">Horario</span>
          </TabsTrigger>
          <TabsTrigger value="notas" className="gap-2">
            <GraduationCap className="size-4" />
            <span className="hidden sm:inline">Notas</span>
          </TabsTrigger>
          <TabsTrigger value="examenes" className="gap-2">
            <ClipboardList className="size-4" />
            <span className="hidden sm:inline">Exámenes</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="horario" className="mt-6">
          <HorarioTab classes={classes} setClasses={setClasses} />
        </TabsContent>
        <TabsContent value="notas" className="mt-6">
          <NotasTab grades={grades} setGrades={setGrades} />
        </TabsContent>
        <TabsContent value="examenes" className="mt-6">
          <ExamenesTab exams={exams} setExams={setExams} />
        </TabsContent>
      </Tabs>

      <footer className="mt-10 text-center text-xs text-muted-foreground">
        Tus datos se guardan automáticamente en este navegador.
      </footer>
    </main>
  )
}
