import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { PlannerView } from "@/components/planner-view"

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  return <PlannerView userName={session.user.name ?? ""} userEmail={session.user.email ?? ""} />
}
