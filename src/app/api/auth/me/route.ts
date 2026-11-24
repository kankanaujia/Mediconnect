import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { accountTables } from "@/lib/accounts";
import { getSession } from "@/lib/session";

// Who is logged in (used by the navbar). 200 with { loggedIn: false } when nobody is.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ loggedIn: false });
  }

  const { data } = await supabaseAdmin
    .from(accountTables[session.role])
    .select("name")
    .eq("id", session.id)
    .maybeSingle();

  return NextResponse.json({
    loggedIn: true,
    role: session.role,
    name: data?.name ?? (session.role === "patient" ? "Demo Patient" : "Demo Doctor"),
  });
}
