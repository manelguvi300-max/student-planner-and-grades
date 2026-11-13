"use client"

import { useState, useEffect } from "react"
import { CalendarDays, GraduationCap, ClipboardList, LogOut, Cloud, Loader2, UserX } from "lucide-react"
import { Tabs, TabsContent } from "@/components/ui/tabs"
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
  const map = {
    loading: { Icon: Loader2, text: "Cargando...", cls: "animate-spin" },
    saving: { Icon: Cloud, text: "Guardando...", cls: "animate-pulse text-primary" },
    saved: { Icon: Cloud, text: "Sincronizado", cls: "text-emerald-500" },
  }[status]
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
      <map.Icon className={cn("size-3.5", map.cls)} />
      {map.text}
    </span>
  )
}

const HIDDEN_STORAGE_KEY = "planner_hidden_subjects"

function loadHiddenFromStorage(): Record<"notas" | "faltas" | "examenes", string[]> {
  if (typeof window === "undefined") return { notas: [], faltas: [], examenes: [] }
  try {
    const saved = localStorage.getItem(HIDDEN_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return {
        notas: Array.isArray(parsed.notas) ? parsed.notas : [],
        faltas: Array.isArray(parsed.faltas) ? parsed.faltas : [],
        examenes: Array.isArray(parsed.examenes) ? parsed.examenes : [],
      }
    }
  } catch {}
  return { notas: [], faltas: [], examenes: [] }
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

  // Hidden subjects are per-tab and independent from each other, persisted in localStorage
  const [hiddenSubjectsByTab, setHiddenSubjectsByTab] = useState<Record<"notas" | "faltas" | "examenes", string[]>>(
    () => loadHiddenFromStorage()
  )

  // Persist to localStorage whenever hidden subjects change
  useEffect(() => {
    try {
      localStorage.setItem(HIDDEN_STORAGE_KEY, JSON.stringify(hiddenSubjectsByTab))
    } catch {}
  }, [hiddenSubjectsByTab])

  function toggleHidden(tabKey: "notas" | "faltas" | "examenes", subjectId: string) {
    setHiddenSubjectsByTab((prev) => {
      const current = prev[tabKey]
      const next = current.includes(subjectId)
        ? current.filter((id) => id !== subjectId)
        : [...current, subjectId]
      return { ...prev, [tabKey]: next }
    })
  }

  async function handleSignOut() {
    await authClient.signOut()
    router.push("/sign-in")
    router.refresh()
  }

  const idx = Math.max(0, NAV_ITEMS.findIndex((n) => n.value === tab))
  const spring = "cubic-bezier(.34,1.4,.5,1)"
  const initial = (userName || userEmail || "?").trim().charAt(0).toUpperCase()
  const firstName = userName ? userName.split(" ")[0] : ""
  // se calcula tras montar para evitar diferencias servidor/cliente por zona horaria
  const [today, setToday] = useState("")
  useEffect(() => {
    setToday(new Intl.DateTimeFormat("es", { weekday: "long", day: "numeric", month: "long" }).format(new Date()))
  }, [])

  return (
    <div className="lg:flex">
      {/* Escritorio: barra lateral con resaltado deslizante */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-2 border-r p-5 lg:flex">
        <div className="mb-6 flex items-center gap-3 px-2">
          <div className="grad grid size-10 place-items-center rounded-2xl shadow-lg shadow-black/20">
            <GraduationCap className="size-5" />
          </div>
          <div>
            <p className="font-semibold leading-tight">Mi semestre</p>
            <p className="text-xs text-muted-foreground">Planner universitario</p>
          </div>
        </div>
        <nav className="relative flex flex-col gap-2">
          {/* los ítems miden h-11 + gap-2 = 3.25rem */}
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-11 rounded-2xl bg-foreground/[0.07] ring-1 ring-foreground/10"
            style={{ transform: `translateY(${idx * 3.25}rem)`, transition: `transform .5s ${spring}` }}
          >
            <span key={idx} className="absolute left-0 top-2.5 h-6 w-1 rounded-full bg-foreground" style={{ animation: `grow .45s ${spring} both` }} />
          </span>
          {NAV_ITEMS.map((item, i) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setTab(item.value)}
              aria-current={i === idx ? "page" : undefined}
              className={cn(
                "group relative flex h-11 items-center gap-3 rounded-2xl px-4 text-sm font-medium transition-colors duration-300",
                i === idx ? "text-foreground" : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
              )}
            >
              <item.icon className={cn("size-5 transition-transform duration-500", i === idx ? "scale-110 text-primary" : "group-hover:translate-x-0.5")} />
              <span className={cn("transition-transform duration-500", i === idx && "translate-x-1")}>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-3 rounded-2xl border bg-card/60 p-3">
          <div className="flex items-center gap-3">
            <span className="grad grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold">{initial}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{firstName || "Estudiante"}</p>
              <p className="truncate text-xs text-muted-foreground">{userEmail || "Sin correo"}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <SyncBadge status={status} />
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1.5">
              <LogOut className="size-4" />
              Salir
            </Button>
          </div>
        </div>
      </aside>

      <main className="pb-nav mx-auto w-full max-w-6xl px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 lg:px-10 lg:pt-10">
        {/* Móvil / tablet: cabecera compacta */}
        <header className="mb-5 flex items-center gap-3 lg:mb-8">
          <div className="grad grid size-10 shrink-0 place-items-center rounded-2xl shadow-lg shadow-black/20 lg:hidden">
            <GraduationCap className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="animate-rise text-xl font-semibold tracking-tight text-balance sm:text-2xl lg:text-3xl">
              {firstName ? `Hola, ${firstName}` : "Mi semestre"}
            </h1>
            <p className="h-4 truncate text-xs text-muted-foreground first-letter:uppercase sm:h-5 sm:text-sm">{today}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1 lg:hidden">
            <span className="hidden sm:block"><SyncBadge status={status} /></span>
            <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Cerrar sesión">
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsContent value="horario" className="animate-rise">
            <HorarioTab
              subjects={subjects}
              setSubjects={setSubjects}
              classes={classes}
              setClasses={setClasses}
              setGrades={setGrades}
              setExams={setExams}
            />
          </TabsContent>
          <TabsContent value="notas" className="animate-rise">
            <NotasTab
              subjects={subjects}
              grades={grades}
              setGrades={setGrades}
              hiddenSubjects={hiddenSubjectsByTab.notas}
              onToggleHidden={(id) => toggleHidden("notas", id)}
            />
          </TabsContent>
          <TabsContent value="examenes" className="animate-rise">
            <ExamenesTab
              subjects={subjects}
              exams={exams}
              setExams={setExams}
              hiddenSubjects={hiddenSubjectsByTab.examenes}
              onToggleHidden={(id) => toggleHidden("examenes", id)}
            />
          </TabsContent>
          <TabsContent value="faltas" className="animate-rise">
            <FaltasTab
              subjects={subjects}
              absences={absences}
              setAbsences={setAbsences}
              subjectConfigs={subjectConfigs}
              setSubjectConfigs={setSubjectConfigs}
              hiddenSubjects={hiddenSubjectsByTab.faltas}
              onToggleHidden={(id) => toggleHidden("faltas", id)}
            />
          </TabsContent>
        </Tabs>

        <footer className="mt-10 text-center text-xs text-muted-foreground">
          <p>Por Manuel Gutiérrez. Todos los derechos reservados.</p>
        </footer>
      </main>

      {/* Móvil / tablet: barra inferior flotante de cristal con píldora deslizante */}
      <nav className="glass fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md rounded-[1.75rem] p-1.5 shadow-2xl shadow-black/30 lg:hidden">
        <span
          aria-hidden
          className="absolute inset-y-1.5 left-1.5 rounded-[1.4rem] bg-foreground/10 ring-1 ring-foreground/10"
          style={{
            width: `calc((100% - 0.75rem) / ${NAV_ITEMS.length})`,
            transform: `translateX(${idx * 100}%)`,
            transition: `transform .5s ${spring}`,
          }}
        />
        {NAV_ITEMS.map((item, i) => {
          const active = i === idx
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setTab(item.value)}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 rounded-[1.4rem] py-2.5 text-[11px] font-medium transition-all duration-300",
                active ? "text-foreground" : "text-muted-foreground active:scale-95"
              )}
            >
              <item.icon className={cn("size-[22px] transition-all duration-300", active && "-translate-y-0.5 text-primary")} />
              {item.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
