"use client"

import { useState, useEffect, useCallback } from "react"
import { FocusSheet } from "@/components/focus"
import { CalendarDays, GraduationCap, ClipboardList, UserX, House, Settings, WifiOff } from "lucide-react"
import { clearOfflineCache } from "@/components/sw-register"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { HoyTab } from "@/components/hoy-tab"
import { NO_HIDDEN, addStudy, studyFromConfigs, withStudy, type HiddenMap } from "@/lib/horario-data"
import dynamic from "next/dynamic"
import type { PlannerState } from "@/app/actions/planner"
import { SemesterSwitcher } from "@/components/semester-switcher"
import { usePlanner } from "@/lib/use-planner"
import { useSettings } from "@/lib/settings"
import { cn } from "@/lib/utils"

// Cada pestaña se descarga aparte (la primera carga pesa menos) y el resto se precarga en segundo plano al quedar libre el navegador.
const tabLoaders = {
  horario: () => import("@/components/horario-tab").then((m) => m.HorarioTab),
  notas: () => import("@/components/notas-tab").then((m) => m.NotasTab),
  examenes: () => import("@/components/examenes-tab").then((m) => m.ExamenesTab),
  faltas: () => import("@/components/faltas-tab").then((m) => m.FaltasTab),
  ajustes: () => import("@/components/settings-tab").then((m) => m.SettingsTab),
}
const TabSkeleton = () => <div aria-hidden className="h-64 animate-pulse rounded-xl bg-muted/40" />
const HorarioTab = dynamic(tabLoaders.horario, { loading: TabSkeleton })
const NotasTab = dynamic(tabLoaders.notas, { loading: TabSkeleton })
const ExamenesTab = dynamic(tabLoaders.examenes, { loading: TabSkeleton })
const FaltasTab = dynamic(tabLoaders.faltas, { loading: TabSkeleton })
const SettingsTab = dynamic(tabLoaders.ajustes, { loading: TabSkeleton })

// "ajustes" va al final: en móvil se abre desde el engranaje del encabezado, no desde la barra inferior.
const NAV_ITEMS = [
  { value: "hoy", label: "Hoy", icon: House },
  { value: "horario", label: "Horario", icon: CalendarDays },
  { value: "notas", label: "Notas", icon: GraduationCap },
  { value: "examenes", label: "Agenda", icon: ClipboardList },
  { value: "faltas", label: "Faltas", icon: UserX },
  { value: "ajustes", label: "Ajustes", icon: Settings },
] as const
const MOBILE_ITEMS = NAV_ITEMS.slice(0, 5)


export function PlannerView({ initial, userName, userEmail, userImage }: { initial: PlannerState; userName: string; userEmail: string; userImage: string }) {
  const { settings, loaded } = useSettings()
  const [tab, setTab] = useState<string>("hoy")
  const {
    semesters, switchSemester, createSemester, renameSemester, deleteSemester,
    subjects, setSubjects,
    classes, setClasses,
    grades, setGrades,
    exams, setExams,
    absences, setAbsences,
    subjectConfigs, setSubjectConfigs,
    teachers, setTeachers,
    kinds, setKinds,
    hidden: hiddenSubjectsByTab, setHidden: setHiddenSubjectsByTab,
  } = usePlanner(initial)

  // Modo enfoque: cada sesión suma sus minutos al registro del día
  const [focusOpen, setFocusOpen] = useState(false)
  const logStudy = useCallback((subjectId: string, minutes: number) => {
    const d = new Date()
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    setSubjectConfigs((prev) => withStudy(prev, addStudy(studyFromConfigs(prev), day, subjectId, minutes)))
  }, [setSubjectConfigs])

  // Precarga el resto de pestañas cuando el navegador está libre (salvo con ahorro de datos): al cambiar de pestaña ya están listas.
  useEffect(() => {
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return
    const run = () => Object.values(tabLoaders).forEach((load) => load())
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number; cancelIdleCallback?: (id: number) => void }
    if (w.requestIdleCallback) { const id = w.requestIdleCallback(run); return () => w.cancelIdleCallback?.(id) }
    const id = window.setTimeout(run, 1500)
    return () => window.clearTimeout(id)
  }, [])

  // Abrir en la pestaña elegida en Ajustes (solo la primera vez que se leen los ajustes)
  useEffect(() => {
    if (!loaded) return
    // los atajos del icono (/?tab=examenes) mandan sobre la pestaña de inicio elegida en Ajustes
    const wanted = new URLSearchParams(window.location.search).get("tab")
    setTab(NAV_ITEMS.some((n) => n.value === wanted) ? wanted! : settings.startTab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded])

  // Sesión siempre verificada: al volver a la pestaña se consulta al servidor y, si ya no hay sesión
  // (cerrada aquí o en otro dispositivo), se va al login. «Atrás» tras cerrar sesión no muestra la página cacheada.
  useEffect(() => {
    let last = 0
    const check = async () => {
      if (document.visibilityState !== "visible") return
      if (Date.now() - last < 20_000) return // no más de una consulta cada 20 s al ir y venir entre apps
      last = Date.now()
      try {
        const r = await fetch("/api/auth/get-session", { cache: "no-store" })
        const d = r.ok ? await r.json() : null
        if (!d?.session) { await clearOfflineCache(); window.location.replace("/sign-in") }
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

  // Aviso de conexión: sin red la app sigue abierta y los cambios se envían al volver
  const [offline, setOffline] = useState(false)
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine)
    sync()
    window.addEventListener("online", sync); window.addEventListener("offline", sync)
    return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync) }
  }, [])

  const idx = Math.max(0, NAV_ITEMS.findIndex((n) => n.value === tab))
  const inSettings = tab === "ajustes"
  const spring = "cubic-bezier(.34,1.4,.5,1)"
  const firstName = userName ? userName.split(" ")[0] : ""
  // se calcula tras montar para evitar diferencias servidor/cliente por zona horaria
  const [today, setToday] = useState("")
  useEffect(() => {
    setToday(new Intl.DateTimeFormat("es", { weekday: "long", day: "numeric", month: "long" }).format(new Date()))
  }, [])

  const semesterSwitcher = (
    <SemesterSwitcher className="max-w-28 sm:max-w-44 lg:max-w-full" semesters={semesters} activeSubjectCount={subjects.length}
      onSwitch={switchSemester} onCreate={createSemester} onRename={renameSemester} onDelete={deleteSemester} />
  )

  return (
    <div className="lg:flex">
      {/* Escritorio: barra lateral con resaltado deslizante */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-2 border-r p-5 lg:flex">
        <div className="mb-4 flex items-center gap-3 px-2">
          <div className="grad grid size-10 place-items-center rounded-xl shadow-lg shadow-black/20">
            <GraduationCap className="size-5" />
          </div>
          <div>
            <p className="font-semibold leading-tight">Mi semestre</p>
            <p className="text-xs text-muted-foreground">Planner universitario</p>
          </div>
        </div>
        <div className="-mt-1 mb-3 px-1">{semesterSwitcher}</div>
        <nav className="relative flex flex-col gap-2">
          {/* los ítems miden h-11 + gap-2 = 3.25rem */}
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-11 rounded-xl bg-foreground/[0.07] ring-1 ring-foreground/10"
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
                "group relative flex h-11 items-center gap-3 rounded-xl px-4 text-sm font-medium transition-colors duration-300",
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

      <main className="pb-nav mx-auto w-full max-w-6xl px-4 sm:px-6 md:pl-24 lg:px-10 lg:pt-10">
        {/* Móvil y tablet: barra superior fija y compacta (marca · semestre · ajustes). En tablet la marca vive en el riel lateral. */}
        <div className="sticky top-0 z-30 -mx-4 mb-4 border-b bg-background px-4 pt-[env(safe-area-inset-top)] md:bg-background/85 md:backdrop-blur-xl sm:-mx-6 sm:px-6 lg:hidden">
          <div className="flex h-14 items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 md:hidden">
                <div className="grad grid size-8 shrink-0 place-items-center rounded-lg">
                  <GraduationCap className="size-[17px]" />
                </div>
                <p className="truncate text-[15px] font-semibold">Mi semestre</p>
              </div>
            </div>
            {semesterSwitcher}
            <button
              type="button"
              onClick={() => setTab(inSettings ? "hoy" : "ajustes")}
              aria-label={inSettings ? "Volver" : "Ajustes"}
              aria-pressed={inSettings}
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-lg transition duration-300 active:scale-90",
                inSettings ? "bg-foreground text-background" : "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
              )}
            >
              <Settings className={cn("size-5 transition-transform duration-500", inSettings && "rotate-90")} />
            </button>
          </div>
        </div>

        {offline && (
          <div role="status" className="mb-4 flex animate-rise items-center gap-2 rounded-lg bg-amber-500/15 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
            <WifiOff className="size-4 shrink-0" />
            <span>Sin conexión. Puedes seguir usando la app; tus cambios se guardan al volver internet.</span>
          </div>
        )}

        {/* Saludo: solo en Hoy y en Ajustes; las demás vistas abren directo con su propio título */}
        {(tab === "hoy" || inSettings) && (
          <header className="mb-5 lg:mb-8">
            <h1 key={inSettings ? "s" : "h"} className="animate-rise text-xl font-semibold tracking-tight text-balance sm:text-2xl lg:text-3xl">
              {inSettings ? "Ajustes" : firstName ? `Hola, ${firstName}` : "Mi semestre"}
            </h1>
            <p className="h-4 truncate text-xs text-muted-foreground first-letter:uppercase sm:h-5 sm:text-sm">
              {inSettings ? "Personaliza tu planner y administra tu cuenta" : today}
            </p>
          </header>
        )}

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
              onFocus={() => setFocusOpen(true)}
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
              setAbsences={setAbsences}
              setSubjectConfigs={setSubjectConfigs}
              teachers={teachers}
              setTeachers={setTeachers}
            />
          </TabsContent>
          <TabsContent value="notas" className="animate-rise">
            <NotasTab
              subjects={subjects}
              grades={grades}
              setGrades={setGrades}
              subjectConfigs={subjectConfigs}
              setSubjectConfigs={setSubjectConfigs}
              hiddenSubjects={hiddenSubjectsByTab.notas}
              onToggleHidden={(id) => toggleHidden("notas", id)}
            />
          </TabsContent>
          <TabsContent value="examenes" className="animate-rise">
            <ExamenesTab
              subjects={subjects}
              exams={exams}
              setExams={setExams}
              kinds={kinds}
              setKinds={setKinds}
              hiddenSubjects={hiddenSubjectsByTab.examenes}
              onToggleHidden={(id) => toggleHidden("examenes", id)}
            />
          </TabsContent>
          <TabsContent value="faltas" className="animate-rise">
            <FaltasTab
              subjects={subjects}
              absences={absences}
              classes={classes}
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
              userImage={userImage}
              hiddenCount={hiddenCount}
              onShowHidden={() => setHiddenSubjectsByTab(NO_HIDDEN)}
            />
          </TabsContent>
        </Tabs>

        <footer className="mt-10 text-center text-xs text-muted-foreground">
          <p>Por Manuel Gutiérrez. Todos los derechos reservados.</p>
        </footer>

        <FocusSheet open={focusOpen} onOpenChange={setFocusOpen} subjects={subjects} onLog={logStudy} />
      </main>

      {/* Tablet: riel lateral con icono y etiqueta */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[4.5rem] flex-col items-center gap-1 border-r bg-background py-4 md:flex lg:hidden">
        <div className="grad mb-4 grid size-10 place-items-center rounded-xl">
          <GraduationCap className="size-5" />
        </div>
        {MOBILE_ITEMS.map((item, i) => {
          const active = i === idx && !inSettings
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setTab(item.value)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex w-16 flex-col items-center gap-1 rounded-xl py-2.5 text-[11px] font-medium transition active:scale-95",
                active ? "bg-foreground/[0.08] text-foreground" : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground"
              )}
            >
              <item.icon className={cn("size-[22px]", active && "text-brand")} />
              {item.label}
            </button>
          )
        })}
      </aside>

      {/* Móvil: barra inferior anclada al borde (no tapa el contenido) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Secciones">
        <div className="mx-auto flex h-16 max-w-md px-2">
          {MOBILE_ITEMS.map((item, i) => {
            const active = i === idx && !inSettings
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setTab(item.value)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors active:scale-95",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <span className={cn("grid h-8 w-14 place-items-center rounded-xl transition-[transform,background-color,color] duration-300", active ? "scale-100 bg-brand/15 text-brand" : "scale-90 bg-transparent")}>
                  <item.icon className={cn("size-[22px]", active && "animate-pop")} />
                </span>
                {item.label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
