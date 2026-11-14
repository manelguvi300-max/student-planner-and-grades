"use client"

import { useState, useEffect } from "react"
import { CalendarDays, GraduationCap, ClipboardList, Cloud, Loader2, UserX, House, Settings } from "lucide-react"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { HoyTab } from "@/components/hoy-tab"
import { NO_HIDDEN, type HiddenMap } from "@/lib/horario-data"
import { HorarioTab } from "@/components/horario-tab"
import { NotasTab } from "@/components/notas-tab"
import { ExamenesTab } from "@/components/examenes-tab"
import { FaltasTab } from "@/components/faltas-tab"
import { SettingsTab } from "@/components/settings-tab"
import { usePlanner } from "@/lib/use-planner"
import { useSettings } from "@/lib/settings"
import { cn } from "@/lib/utils"
import { AppSwitcher } from "@/components/app-switcher"

// "ajustes" va al final: en móvil se abre desde el engranaje del encabezado, no desde la barra inferior.
const NAV_ITEMS = [
  { value: "hoy", label: "Hoy", icon: House },
  { value: "horario", label: "Horario", icon: CalendarDays },
  { value: "notas", label: "Notas", icon: GraduationCap },
  { value: "examenes", label: "Exámenes", icon: ClipboardList },
  { value: "faltas", label: "Faltas", icon: UserX },
  { value: "ajustes", label: "Ajustes", icon: Settings },
] as const
const MOBILE_ITEMS = NAV_ITEMS.slice(0, 5)

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

export function PlannerView({ userName, userEmail }: { userName: string; userEmail: string }) {
  const { settings, loaded } = useSettings()
  const [tab, setTab] = useState<string>("hoy")
  const {
    subjects, setSubjects,
    classes, setClasses,
    grades, setGrades,
    exams, setExams,
    absences, setAbsences,
    subjectConfigs, setSubjectConfigs,
    hidden: hiddenSubjectsByTab, setHidden: setHiddenSubjectsByTab,
    status,
  } = usePlanner()

  // Abrir en la pestaña elegida en Ajustes (solo la primera vez que se leen los ajustes)
  useEffect(() => {
    if (loaded) setTab(settings.startTab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded])

  // Sesión siempre verificada: al volver a la pestaña se consulta al servidor y, si ya no hay sesión
  // (cerrada aquí o en otro dispositivo), se va al login. «Atrás» tras cerrar sesión no muestra la página cacheada.
  useEffect(() => {
    const check = async () => {
      if (document.visibilityState !== "visible") return
      try {
        const r = await fetch("/api/auth/get-session", { cache: "no-store" })
        const d = r.ok ? await r.json() : null
        if (!d?.session) window.location.replace("/sign-in")
      } catch {} // sin red: se vuelve a comprobar en la próxima visita
    }
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) window.location.reload() }
    document.addEventListener("visibilitychange", check)
    window.addEventListener("pageshow", onShow)
    return () => { document.removeEventListener("visibilitychange", check); window.removeEventListener("pageshow", onShow) }
  }, [])

  // Atajos de teclado en escritorio: 1–6 cambian de pestaña
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (e.ctrlKey || e.metaKey || e.altKey || el?.closest("input, textarea, select, [contenteditable], [role=dialog]")) return
      const item = NAV_ITEMS[Number(e.key) - 1]
      if (item) setTab(item.value)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Materias ocultas por pestaña: viven en el planner (base de datos), así se ven igual en todos los dispositivos
  function toggleHidden(tabKey: keyof HiddenMap, subjectId: string) {
    setHiddenSubjectsByTab((prev) => {
      const current = prev[tabKey]
      const next = current.includes(subjectId)
        ? current.filter((id) => id !== subjectId)
        : [...current, subjectId]
      return { ...prev, [tabKey]: next }
    })
  }

  const hiddenCount = Object.values(hiddenSubjectsByTab).reduce((n, ids) => n + ids.length, 0)

  const idx = Math.max(0, NAV_ITEMS.findIndex((n) => n.value === tab))
  const inSettings = tab === "ajustes"
  const spring = "cubic-bezier(.34,1.4,.5,1)"
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
        <div className="mb-4 flex items-center gap-3 px-2">
          <div className="grad grid size-10 place-items-center rounded-2xl shadow-lg shadow-black/20">
            <GraduationCap className="size-5" />
          </div>
          <div>
            <p className="font-semibold leading-tight">Mi semestre</p>
            <p className="text-xs text-muted-foreground">Planner universitario</p>
          </div>
        </div>
        <AppSwitcher className="mb-4" />
        <nav className="relative flex flex-col gap-2">
          {/* los ítems miden h-11 + gap-2 = 3.25rem */}
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-11 rounded-2xl bg-foreground/[0.07] ring-1 ring-foreground/10"
            style={{ transform: `translateY(${idx * 3.25}rem)`, transition: `transform .5s ${spring}` }}
          >
            <span key={idx} className="absolute left-0 top-2.5 h-6 w-1 rounded-full bg-brand" style={{ animation: `grow .45s ${spring} both` }} />
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
              <item.icon className={cn("size-5 transition-transform duration-500", i === idx ? "scale-110 text-brand" : "group-hover:translate-x-0.5")} />
              <span className={cn("flex-1 text-left transition-transform duration-500", i === idx && "translate-x-1")}>{item.label}</span>
              <kbd className="num hidden rounded border px-1.5 text-[10px] text-muted-foreground/60 xl:block">{i + 1}</kbd>
            </button>
          ))}
        </nav>
      </aside>

      <main className="pb-nav mx-auto w-full max-w-6xl px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 lg:px-10 lg:pt-10">
        {/* Móvil / tablet: cabecera compacta */}
        <header className="mb-5 flex items-center gap-3 lg:mb-8">
          <div className="grad grid size-10 shrink-0 place-items-center rounded-2xl shadow-lg shadow-black/20 lg:hidden">
            <GraduationCap className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 key={inSettings ? "s" : "h"} className="animate-rise text-xl font-semibold tracking-tight text-balance sm:text-2xl lg:text-3xl">
              {inSettings ? "Ajustes" : firstName ? `Hola, ${firstName}` : "Mi semestre"}
            </h1>
            <p className="h-4 truncate text-xs text-muted-foreground first-letter:uppercase sm:h-5 sm:text-sm">
              {inSettings ? "Personaliza tu planner y administra tu cuenta" : today}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1 lg:hidden">
            <span className="hidden sm:block"><SyncBadge status={status} /></span>
            <AppSwitcher className="w-28" />
            <button
              type="button"
              onClick={() => setTab(inSettings ? "hoy" : "ajustes")}
              aria-label={inSettings ? "Volver" : "Ajustes"}
              aria-pressed={inSettings}
              className={cn(
                "grid size-10 place-items-center rounded-xl transition duration-300 active:scale-90",
                inSettings ? "bg-foreground text-background" : "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
              )}
            >
              <Settings className={cn("size-5 transition-transform duration-500", inSettings && "rotate-90")} />
            </button>
          </div>
        </header>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsContent value="hoy" className="animate-rise">
            <HoyTab
              subjects={subjects}
              classes={classes}
              grades={grades}
              exams={exams}
              absences={absences}
              subjectConfigs={subjectConfigs}
              hiddenNotas={hiddenSubjectsByTab.notas}
              onNavigate={setTab}
            />
          </TabsContent>
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
          <TabsContent value="ajustes">
            <SettingsTab
              userName={userName}
              userEmail={userEmail}
              hiddenCount={hiddenCount}
              onShowHidden={() => setHiddenSubjectsByTab(NO_HIDDEN)}
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
            width: `calc((100% - 0.75rem) / ${MOBILE_ITEMS.length})`,
            transform: `translateX(${Math.min(idx, MOBILE_ITEMS.length - 1) * 100}%)`,
            opacity: inSettings ? 0 : 1,
            transition: `transform .5s ${spring}, opacity .3s`,
          }}
        />
        {MOBILE_ITEMS.map((item, i) => {
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
              <item.icon className={cn("size-[22px] transition-all duration-300", active && "-translate-y-0.5 text-brand")} />
              {item.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
