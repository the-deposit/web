import { getUsuarios } from "./actions";
import { UsuariosClient } from "./UsuariosClient";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function UsuariosPage() {
  // Verificar que sea admin antes de cargar datos
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: { user } } = await (supabase as any).auth.getUser();
  if (!user) redirect("/auth/login?redirect=/admin/usuarios");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/admin");

  const { users } = await getUsuarios();

  return <UsuariosClient users={users} />;
}
