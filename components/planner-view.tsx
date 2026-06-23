"use client"

import { CalendarDays, GraduationCap, ClipboardList, LogOut, Cloud, CloudOff, Loader2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { HorarioTab } from "@/components/horario-tab"
import { NotasTab } from "@/components/notas-tab"
import { ExamenesTab } from "@/components/examenes-tab"
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

export function PlannerView({ userName }: { userName: string }) {
  const router = useRouter()
  const { classes, setClasses, grades, setGrades, exams, setExams, status } = usePlanner()

  async function handleSignOut() {
    await authClient.signOut()
    router.push("/sign-in")
    router.refresh()
  }

  return (
    <main className="mx-auto min-h-svh w-full max-w-5xl px-4 py-8 md:py-12">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-balance md:text-3xl">Mi semestre</h1>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            Hola{userName ? `, ${userName.split(" ")[0]}` : ""}. Horario, notas y exámenes sincronizados en tu cuenta.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Salir</span>
          </Button>
          <SyncBadge status={status} />
        </div>
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

      <footer className="mt-10 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <CloudOff className="size-3.5" />
        Tus datos se guardan en tu cuenta y se sincronizan entre dispositivos.
      </footer>
    </main>
  )
}
