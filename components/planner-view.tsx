"use client"

import { useState } from "react"
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
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { value: "horario", label: "Horario", icon: CalendarDays },
  { value: "notas", label: "Notas", icon: GraduationCap },
  { value: "examenes", label: "Exámenes", icon: ClipboardList },
  { value: "faltas", label: "Faltas", icon: UserX },
] as const

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
  const [tab, setTab] = useState("horario")
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
    <main className="mx-auto min-h-svh w-full max-w-5xl px-3 pb-24 pt-5 sm:px-4 sm:py-6 sm:pb-6 md:py-12 md:pb-12 animate-fade-in">
      {/* Header: compacto en móvil (todo en una fila), más espacioso en pantallas grandes */}
      <header className="mb-4 flex flex-col gap-3 rounded-2xl border bg-card/70 p-3 shadow-sm backdrop-blur sm:mb-8 sm:gap-4 sm:p-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-balance sm:text-2xl md:text-3xl">Mi semestre</h1>
          <p className="mt-0.5 text-xs text-muted-foreground text-pretty sm:mt-1 sm:text-sm">
            Hola{userName ? `, ${userName.split(" ")[0]}` : ""}.
          </p>
        </div>
        <div className="flex flex-row items-center justify-between gap-2 sm:flex-col sm:items-end">
          <div className="flex min-w-0 items-center gap-2">
            <div className="min-w-0 truncate rounded-full border bg-background/80 px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm sm:px-3 sm:text-xs">
              <span className="font-medium text-foreground">{userEmail || "Sin correo"}</span>
            </div>
            <div className="hidden sm:block">
              <SyncBadge status={status} />
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="shrink-0 gap-1.5 sm:gap-2">
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Salir</span>
          </Button>
        </div>
        {/* En móvil el badge de sincronización va en su propia fila para no apretar el header */}
        <div className="sm:hidden">
          <SyncBadge status={status} />
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        {/* Navegación de escritorio: pestañas con más espacio entre sí para que no se sientan "pegadas" */}
        <TabsList className="hidden w-full gap-2 rounded-2xl bg-muted/50 p-2 sm:inline-flex sm:w-auto sm:items-stretch sm:shadow-sm">
          {NAV_ITEMS.map((item) => (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className="group min-h-12 gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:bg-background hover:shadow-md data-[state=active]:bg-background data-[state=active]:shadow-md"
            >
              <item.icon className="size-4 transition-transform duration-200 group-hover:scale-110" />
              <span className="text-sm">{item.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="horario" className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300 sm:mt-6">
          <HorarioTab
            subjects={subjects}
            setSubjects={setSubjects}
            classes={classes}
            setClasses={setClasses}
            setGrades={setGrades}
            setExams={setExams}
          />
        </TabsContent>
        <TabsContent value="notas" className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300 sm:mt-6">
          <NotasTab subjects={subjects} grades={grades} setGrades={setGrades} />
        </TabsContent>
        <TabsContent value="examenes" className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300 sm:mt-6">
          <ExamenesTab subjects={subjects} exams={exams} setExams={setExams} />
        </TabsContent>
        <TabsContent value="faltas" className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300 sm:mt-6">
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

      {/* Navegación de móvil: barra inferior fija, más cómoda para el pulgar que las pestañas apretadas arriba */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 shadow-[0_-2px_10px_rgba(0,0,0,0.04)] backdrop-blur sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-5xl items-stretch justify-around gap-1 px-2 py-1.5">
          {NAV_ITEMS.map((item) => {
            const active = tab === item.value
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setTab(item.value)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors",
                  active ? "bg-muted text-foreground" : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("size-5", active && "text-foreground")} />
                {item.label}
              </button>
            )
          })}
        </div>
      </nav>
    </main>
  )
}