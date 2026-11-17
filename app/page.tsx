import { auth } from "@/lib/auth"
import { loadPlanner } from "@/lib/planner-server"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { PlannerView } from "@/components/planner-view"

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  // Los datos viajan ya en el HTML: la app pinta con contenido sin esperar un segundo viaje al servidor.
  const initial = await loadPlanner(session.user.id)

  return <PlannerView initial={initial} userName={session.user.name ?? ""} userEmail={session.user.email ?? ""} userImage={session.user.image ?? ""} />
}
