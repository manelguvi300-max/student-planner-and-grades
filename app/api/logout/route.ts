import { cookies, headers } from "next/headers"
import { auth } from "@/lib/auth"

// Cierre de sesión en el servidor: revoca la sesión y borra SIEMPRE las cookies, aunque la revocación falle.
export async function POST() {
  try {
    await auth.api.signOut({ headers: await headers() })
  } catch {}
  const jar = await cookies()
  for (const c of jar.getAll()) {
    if (c.name.includes("better-auth")) jar.set(c.name, "", { path: "/", maxAge: 0, secure: true, httpOnly: true, sameSite: "lax" })
  }
  return Response.json({ ok: true }, { headers: { "Clear-Site-Data": '"cookies", "cache"', "Cache-Control": "no-store" } })
}
