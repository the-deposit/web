import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url);
  const next = searchParams.get("next") ?? "/auth/login";
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${origin}${next}`);
}
