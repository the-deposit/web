import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MiPerfilClient } from "./MiPerfilClient";

export default async function MiPerfilPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/tienda/mi-perfil");

  const [{ data: profile }, { data: addresses }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, email, avatar_url").eq("id", user.id).single(),
    supabase.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }),
  ]);

  return (
    <MiPerfilClient
      profile={profile ?? { full_name: null, phone: null, email: user.email ?? null, avatar_url: null }}
      addresses={addresses ?? []}
    />
  );
}
