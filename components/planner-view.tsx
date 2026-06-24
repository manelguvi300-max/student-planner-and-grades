"use client"

import { CalendarDays, GraduationCap, ClipboardList, LogOut, Cloud, CloudOff, Loader2, UserX } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { HorarioTab } from "@/components/horario-tab"
import { NotasTab } from "@/components/notas-tab"
import { ExamenesTab } from "@/components/examenes-tab"
import { FaltasTab } from "@/components/faltas-tab"
import { usePlanner } from "@/lib/use-planner"
import { authClient } from "@/lib/auth-client"
import { useRouter } from "next/navigation"

function SyncBadge({ status }: { status: "loading" | "saving" | "saved" }) {
  if (status === "loading") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Cargando...
      </span>
    )
  }
  if (status === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Cloud className="size-3.5" />
        Guardando...
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Cloud className="size-3.5 text-foreground" />
      Sincronizado
    </span>
  )
}

export function PlannerView({ userName, userEmail }: { userName: string; userEmail: string }) {
  const router = useRouter()
  const {
    subjects, setSubjects,
    classes, setClasses,
    grades, setGrades,
    exams, setExams,
    absences, setAbsences,
    subjectConfigs, setSubjectConfigs,
    status,
  } = usePlanner()

  async function handleSignOut() {
    await authClient.signOut()
    router.push("/sign-in")
    router.refresh()
  }

  return (
    <main className="mx-auto min-h-svh w-full max-w-5xl px-3 py-6 md:px-4 md:py-12 animate-fade-in">
      <header className="mb-6 md:mb-8 flex flex-col gap-4 rounded-2xl border bg-card/70 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-balance md:text-3xl">Mi semestre</h1>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            Hola{userName ? `, ${userName.split(" ")[0]}` : ""}.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="rounded-full border bg-background/80 px-3 py-1 text-xs text-muted-foreground shadow-sm">
            <span className="font-medium text-foreground">{userEmail || "Sin correo"}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Salir</span>
          </Button>
          <SyncBadge status={status} />
        </div>
      </header>

      <Tabs defaultValue="horario" className="w-full">
        <TabsList className="grid w-full grid-cols-4 sm:w-auto sm:inline-flex p-1 bg-muted/50 rounded-xl">
          <TabsTrigger value="horario" className="gap-2 rounded-lg data-[state=active]:shadow-sm">
            <CalendarDays className="size-4" />
            <span className="text-xs sm:text-sm">Horario</span>
          </TabsTrigger>
          <TabsTrigger value="notas" className="gap-2 rounded-lg data-[state=active]:shadow-sm">
            <GraduationCap className="size-4" />
            <span className="text-xs sm:text-sm">Notas</span>
          </TabsTrigger>
          <TabsTrigger value="examenes" className="gap-2 rounded-lg data-[state=active]:shadow-sm">
            <ClipboardList className="size-4" />
            <span className="text-xs sm:text-sm">Exámenes</span>
          </TabsTrigger>
          <TabsTrigger value="faltas" className="gap-2 rounded-lg data-[state=active]:shadow-sm">
            <UserX className="size-4" />
            <span className="text-xs sm:text-sm">Faltas</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="horario" className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <HorarioTab
            subjects={subjects}
            setSubjects={setSubjects}
            classes={classes}
            setClasses={setClasses}
            setGrades={setGrades}
            setExams={setExams}
          />
        </TabsContent>
        <TabsContent value="notas" className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <NotasTab subjects={subjects} grades={grades} setGrades={setGrades} />
        </TabsContent>
        <TabsContent value="examenes" className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <ExamenesTab subjects={subjects} exams={exams} setExams={setExams} />
        </TabsContent>
        <TabsContent value="faltas" className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <FaltasTab
            subjects={subjects}
            absences={absences}
            setAbsences={setAbsences}
            subjectConfigs={subjectConfigs}
            setSubjectConfigs={setSubjectConfigs}
          />
        </TabsContent>
      </Tabs>

      <footer className="mt-10 flex flex-col items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <div className="flex items-center justify-center gap-1.5">
          <CloudOff className="size-3.5" />
          <span>La información se sincroniza entre dispositivos.</span>
        </div>
        <p>Por Manuel Gutiérrez. Todos los derechos reservados.</p>
      </footer>
    </main>
  )
}