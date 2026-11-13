"use client"

import { createPortal } from "react-dom"
import { DAYS, getSubject, hourLabel, minutesToLabel, type ClassSession, type Subject, type TimeFormat } from "@/lib/horario-data"

const GRID_MM = 138 // alto del cuadro en la hoja (A4 horizontal)
const SHORT = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]

/**
 * Versión imprimible del horario. Vive en <body> (portal) y solo se ve al imprimir:
 * ver `#print-root` en globals.css. Usa colores fijos (siempre sobre blanco, aunque la app esté en oscuro).
 */
export function HorarioPrint({ subjects, classes, format }: { subjects: Subject[]; classes: ClassSession[]; format: TimeFormat }) {
  const list = classes.filter((c) => getSubject(subjects, c.subjectId)).sort((a, b) => a.startTime - b.startTime)
  if (list.length === 0 || typeof document === "undefined") return null

  const startH = Math.floor(Math.min(...list.map((c) => c.startTime)) / 60)
  const endH = Math.max(startH + 1, Math.ceil(Math.max(...list.map((c) => c.endTime)) / 60))
  const span = (endH - startH) * 60
  const hours = Array.from({ length: endH - startH + 1 }, (_, i) => startH + i)
  const pct = (min: number) => ((min - startH * 60) / span) * 100
  const mm = (min: number) => (min / span) * GRID_MM
  const totalH = list.reduce((n, c) => n + (c.endTime - c.startTime), 0) / 60
  const used = subjects.filter((s) => list.some((c) => c.subjectId === s.id))

  return createPortal(
    <div id="print-root" style={{ fontFamily: "var(--font-sora), system-ui, sans-serif", color: "#18181b", background: "#fff" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "8mm", marginBottom: "5mm" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "22pt", fontWeight: 700, letterSpacing: "-0.02em" }}>Mi horario</h1>
          <p style={{ margin: "1mm 0 0", fontSize: "9pt", color: "#71717a" }}>
            {list.length} clase{list.length === 1 ? "" : "s"} · {Number.isInteger(totalH) ? totalH : totalH.toFixed(1)} h por semana
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: "1.5mm 4mm", maxWidth: "62%" }}>
          {used.map((s) => (
            <span key={s.id} style={{ display: "inline-flex", alignItems: "center", gap: "1.5mm", fontSize: "8pt" }}>
              <span style={{ width: "3mm", height: "3mm", borderRadius: "1mm", background: s.bg, border: `0.4mm solid ${s.border}` }} />
              {s.name}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "15mm repeat(5, 1fr)", border: "0.3mm solid #e4e4e7", borderRadius: "4mm", overflow: "hidden" }}>
        <div style={{ background: "#f4f4f5", borderBottom: "0.3mm solid #e4e4e7" }} />
        {SHORT.map((d, i) => (
          <div key={d} style={{ background: "#f4f4f5", borderBottom: "0.3mm solid #e4e4e7", borderLeft: "0.3mm solid #e4e4e7", padding: "2.5mm 0", textAlign: "center", fontSize: "8pt", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#3f3f46" }}>
            {DAYS[i] && d}
          </div>
        ))}

        <div style={{ position: "relative", height: `${GRID_MM}mm` }}>
          {hours.map((h, i) => (
            <span key={h} style={{ position: "absolute", right: "2mm", top: `${pct(h * 60)}%`, transform: i === 0 ? "translateY(0.6mm)" : i === hours.length - 1 ? "translateY(-100%) translateY(-0.6mm)" : "translateY(-50%)", fontSize: "7pt", color: "#71717a" }}>
              {hourLabel(h, format)}
            </span>
          ))}
        </div>

        {DAYS.map((d, day) => (
          <div key={d} style={{ position: "relative", height: `${GRID_MM}mm`, borderLeft: "0.3mm solid #e4e4e7" }}>
            {hours.map((h) => (
              <div key={h} style={{ position: "absolute", left: 0, right: 0, top: `${pct(h * 60)}%`, borderTop: "0.25mm dashed #e4e4e7" }} />
            ))}
            {list
              .filter((c) => c.day === day)
              .map((c) => {
                const s = getSubject(subjects, c.subjectId)!
                const h = mm(c.endTime - c.startTime)
                return (
                  <div
                    key={c.id}
                    style={{
                      position: "absolute",
                      left: "0.8mm",
                      right: "0.8mm",
                      top: `calc(${pct(c.startTime)}% + 0.3mm)`,
                      height: `calc(${(h / GRID_MM) * 100}% - 0.6mm)`,
                      background: s.bg,
                      borderLeft: `1.2mm solid ${s.border}`,
                      borderRadius: "1.8mm",
                      padding: "1.2mm 1.8mm",
                      overflow: "hidden",
                      color: "#18181b",
                      breakInside: "avoid",
                    }}
                  >
                    <div style={{ fontSize: "8.5pt", fontWeight: 700, lineHeight: 1.15 }}>{s.name}</div>
                    {h >= 9 && <div style={{ fontSize: "7pt", opacity: 0.75, marginTop: "0.6mm" }}>{minutesToLabel(c.startTime, format)}–{minutesToLabel(c.endTime, format)}</div>}
                    {h >= 14 && (c.room || c.group) && (
                      <div style={{ fontSize: "7pt", opacity: 0.75 }}>{[c.room, c.group && `Gr. ${c.group}`].filter(Boolean).join(" · ")}</div>
                    )}
                  </div>
                )
              })}
          </div>
        ))}
      </div>

      <p style={{ margin: "3mm 0 0", textAlign: "right", fontSize: "7pt", color: "#a1a1aa" }}>Mi semestre</p>
    </div>,
    document.body
  )
}
