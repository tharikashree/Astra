import { google } from "googleapis";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token || !token.access_token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const calendar = google.calendar({
      version: "v3",
      headers: { Authorization: `Bearer ${token.access_token}` },
    });

    const events = await calendar.events.list({
      calendarId: "primary",
      maxResults: 10,
      orderBy: "startTime",
      singleEvents: true,
    });

    return NextResponse.json({ items: events.data.items || [] });
  } catch (err: any) {
    console.error("Calendar fetch error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.access_token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { summary, start, end } = await req.json();

    if (!summary || !start || !end) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const calendar = google.calendar({
      version: "v3",
      headers: { Authorization: `Bearer ${token.access_token}` },
    });

    const event = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary,
        start: { dateTime: start, timeZone: "Asia/Kolkata" },
        end: { dateTime: end, timeZone: "Asia/Kolkata" },
      },
    });

    return NextResponse.json({ event: event.data }); // ✅ Always return valid JSON
  } catch (err: any) {
    console.error("Error creating event:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
