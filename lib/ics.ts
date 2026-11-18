// Exporta eventos a un archivo .ics: se abre con Google Calendar, Apple Calendar, Outlook… sin cuentas ni permisos.

export type IcsEvent = {
  uid: string
  title: string
  date: string          // YYYY-MM-DD (primer día)
  startMin?: number     // minutos desde medianoche; sin él, el evento es de todo el día
  endMin?: number
  description?: string
  location?: string
  weeklyCount?: number  // se repite cada semana este número de veces
  alarm?: boolean       // recordatorio previo
}

const pad = (n: number) => String(n).padStart(2, "0")
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n")
const compact = (date: string) => date.replaceAll("-", "")
const clock = (min: number) => `${pad(Math.floor(min / 60))}${pad(min % 60)}00`

// Las líneas de más de 75 caracteres se parten (RFC 5545)
function fold(line: string) {
  const out: string[] = []
  for (let i = 0; i < line.length; i += 73) out.push((i ? " " : "") + line.slice(i, i + 73))
  return out.join("\r\n")
}

export function buildIcs(events: IcsEvent[]) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "")
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Mi semestre//ES", "CALSCALE:GREGORIAN"]
  for (const e of events) {
    lines.push("BEGIN:VEVENT", `UID:${e.uid}@mi-semestre`, `DTSTAMP:${stamp}`)
    if (e.startMin === undefined) {
      const next = new Date(e.date + "T00:00:00"); next.setDate(next.getDate() + 1)
      lines.push(`DTSTART;VALUE=DATE:${compact(e.date)}`, `DTEND;VALUE=DATE:${compact(`${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`)}`)
    } else {
      const end = e.endMin ?? Math.min(e.startMin + 60, 24 * 60 - 1)
      lines.push(`DTSTART:${compact(e.date)}T${clock(e.startMin)}`, `DTEND:${compact(e.date)}T${clock(end)}`)
    }
    lines.push(`SUMMARY:${esc(e.title)}`)
    if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`)
    if (e.location) lines.push(`LOCATION:${esc(e.location)}`)
    if (e.weeklyCount) lines.push(`RRULE:FREQ=WEEKLY;COUNT=${e.weeklyCount}`)
    if (e.alarm) lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(e.title)}`, `TRIGGER:${e.startMin === undefined ? "-PT15H" : "-PT30M"}`, "END:VALARM")
    lines.push("END:VEVENT")
  }
  lines.push("END:VCALENDAR")
  return lines.map(fold).join("\r\n") + "\r\n"
}

export function downloadIcs(filename: string, events: IcsEvent[]) {
  const url = URL.createObjectURL(new Blob([buildIcs(events)], { type: "text/calendar;charset=utf-8" }))
  const a = Object.assign(document.createElement("a"), { href: url, download: filename })
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Enlace que abre Google Calendar con el evento ya rellenado: solo queda pulsar «Guardar». Sin permisos ni archivos. */
export function googleCalendarUrl(e: IcsEvent) {
  let dates: string
  if (e.startMin === undefined) {
    const next = new Date(e.date + "T00:00:00"); next.setDate(next.getDate() + 1)
    dates = `${compact(e.date)}/${compact(`${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`)}`
  } else {
    const end = e.endMin ?? Math.min(e.startMin + 60, 24 * 60 - 1)
    dates = `${compact(e.date)}T${clock(e.startMin)}/${compact(e.date)}T${clock(end)}`
  }
  const q = new URLSearchParams({ action: "TEMPLATE", text: e.title, dates })
  if (e.description) q.set("details", e.description)
  if (e.location) q.set("location", e.location)
  return `https://calendar.google.com/calendar/render?${q}`
}

/** Fecha (YYYY-MM-DD) de la próxima vez que cae el día de la semana `day` (0 = lunes), contando hoy. */
export function nextWeekday(day: number) {
  const d = new Date(); d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + ((day + 1 - d.getDay() + 7) % 7)) // getDay: 0 = domingo
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
