import { NextResponse } from "next/server";
import { sendDailyAgendas } from "@/lib/doctorAlerts";
import { appBaseUrl } from "@/lib/email";
import { getSession } from "@/lib/session";

// Morning agenda for doctors. Runs daily at 08:00 IST via Vercel Cron
// (vercel.json), which sends "Authorization: Bearer <CRON_SECRET>".
// An admin can also trigger it by hand from the admin panel.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const fromCron = secret && req.headers.get("authorization") === `Bearer ${secret}`;
  const session = fromCron ? null : await getSession();

  if (!fromCron && session?.role !== "admin") {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }

  const result = await sendDailyAgendas(appBaseUrl(req));
  return NextResponse.json(result);
}
