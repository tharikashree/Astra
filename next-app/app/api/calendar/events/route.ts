// import { getToken } from "next-auth/jwt";
// import { NextRequest, NextResponse } from "next/server";
// import { use } from "react";

// // Define your FastAPI backend URL using an environment variable,
// // falling back to localhost:8000 if the variable is not set.
// const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

// /**
//  * Helper to ensure the user is authenticated and get their email (our user_id).
//  */
// async function authenticateUser(req: NextRequest) {
//   const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

//   // Use token.email as the persistent user identifier (user_id)
//   if (!token || !token.email) {
//     return { error: "Unauthorized", status: 401 };
//   }
//   return { user_id: token.email };
// }

// /**
//  * Handles GET requests to fetch data from the backend.
//  * Route: /api/calendar/events (Proxies to /chat POST request)
//  */
// export async function GET(req: NextRequest) {
//   const auth = await authenticateUser(req);
//   if (auth.error) {
//     return NextResponse.json({ error: auth.error }, { status: auth.status });
//   }
//   const { user_id } = auth;

//   try {
//     // Forward the request to the FastAPI backend, passing the user_id and an empty message,
//     // which is required by the backend's chat structure (HumanMessage content).
//     const response = await fetch(`${BACKEND_URL}/chat`, {
//       method: "POST", // We use POST to securely pass the user_id in the body
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ user_id: user_id, message: "fetch calendar events" }), // <-- FIX: Added empty message
//     });

//     const data = await response.json();

//     if (!response.ok) {
//       // Forward the error status from the backend (e.g., 401 if token is missing)
//       return NextResponse.json({ error: data.message || "Backend API error" }, { status: response.status });
//     }

//     // Application-level error check: If the chat response contains a known failure message
//     // (like from a failed tool use for calendar actions or email summary), return a 400 error status.
//     const replyMessage = data.reply || "";
//     if (
//       replyMessage.startsWith("Failed to schedule:") ||
//       replyMessage.startsWith("Failed to summarize email:") || // <-- Added check for email summarization failure
//       replyMessage.includes("Authorization error:")
//     ) {
//         console.error("Application-level transactional error detected in chat reply:", replyMessage);
//         // Returning 400 Bad Request to signal a transactional failure to the client.
//         return NextResponse.json({ error: replyMessage }, { status: 400 });
//     }

//     // Forward the successful response data
//     return NextResponse.json(data);
//   } catch (err: any) {
//     // Explicitly note the failure to connect to the backend URL
//     console.error("Proxy error during GET /calendar/events:", err.message);
//     return NextResponse.json({ error: `Failed to connect to backend service at ${BACKEND_URL}. Ensure your FastAPI server is running.` }, { status: 500 });
//   }
// }

// /**
//  * Handles POST requests to create a new calendar event via the backend.
//  * Route: /api/calendar/events
//  */
// export async function POST(req: NextRequest) {
//   const auth = await authenticateUser(req);
//   if (auth.error) {
//     return NextResponse.json({ error: auth.error }, { status: auth.status });
//   }
//   const { user_id } = auth;

//   try {
//     const requestBody = await req.json();

//     // Prepare data to send to the backend, including user_id and event details
//     const dataToSend = {
//       user_id: user_id,
//       ...requestBody,
//     };

//     // Forward the request to the FastAPI backend
//     const response = await fetch(`${BACKEND_URL}/chat`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(dataToSend),
//     });

//     const data = await response.json();

//     if (!response.ok) {
//       return NextResponse.json({ error: data.message || "Backend event creation failed." }, { status: response.status });
//     }

//     return NextResponse.json(data);
//   } catch (err: any) {
//     console.error("Proxy error during POST /calendar/events:", err);
//     return NextResponse.json({ error: `Failed to connect to backend service at ${BACKEND_URL} or parse request.` }, { status: 500 });
//   }
// }
import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

// Helper function to get user credentials from Supabase
async function getUserCredentials(userId: string) {
  const { data, error } = await supabase
    .from("user_tokens")
    .select("google_credentials")
    .eq("user_id", userId)
    .maybeSingle();
    console.log("Looking for user:", userId);
    console.log("Supabase returned:", data);
    console.log("SUPABASE_URL:", process.env.SUPABASE_URL);

  if (error || !data) {
    console.error("Failed to fetch credentials:", error);
    throw new Error("No credentials found");
  }

  // Check if it's already an object or a string
  let credentials;
  try {
    if (typeof data.google_credentials === 'string') {
      credentials = JSON.parse(data.google_credentials);
    } else {
      credentials = data.google_credentials;
    }
  } catch (e) {
    console.error("Failed to parse credentials:", e);
    throw new Error("Invalid credentials format");
  }

  return credentials;
}

// Helper function to refresh token if expired
async function getValidOAuth2Client(userId: string) {
  const credentials = await getUserCredentials(userId);
  
  const oauth2Client = new google.auth.OAuth2(
    credentials.client_id,
    credentials.client_secret,
    process.env.NEXTAUTH_URL + "/api/auth/callback/google"
  );

  oauth2Client.setCredentials({
    access_token: credentials.token,
    refresh_token: credentials.refresh_token,
    expiry_date: new Date(credentials.expiry).getTime(),
  });

  // Check if token is expired and refresh if needed
  try {
    const tokenInfo = await oauth2Client.getAccessToken();
    
    if (tokenInfo.token && tokenInfo.token !== credentials.token) {
      // Token was refreshed, update in database
      const updatedCredentials = {
        ...credentials,
        token: tokenInfo.token,
        expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
      };

      // Store as JSON string or object based on column type
      const credentialsToStore = JSON.stringify(updatedCredentials);

      await supabase
        .from("user_tokens")
        .update({ google_credentials: credentialsToStore })
        .eq("user_id", userId);
    }
  } catch (error) {
    console.error("Token refresh error:", error);
  }

  return oauth2Client;
}

// ✅ GET — Fetch recent calendar events
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized - No session found" }, { status: 401 });
    }

    console.log("Fetching calendar for user:", session.user.email);
    
    const userId = session.user.email;
    const oauth2Client = await getValidOAuth2Client(userId);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const events = await calendar.events.list({
      calendarId: "primary",
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
      timeMin: new Date().toISOString(),
      // CRITICAL: Must explicitly request conferenceData to get Meet links
      fields: "items(id,summary,start,end,hangoutLink,conferenceData,htmlLink)",
    });

    console.log("✅ Fetched events:", events.data.items?.length || 0);

    return NextResponse.json({ items: events.data.items || [] });
  } catch (err: any) {
    console.error("Calendar fetch error:", err);
    return NextResponse.json({ 
      error: err.message || "Failed to fetch events" 
    }, { status: 500 });
  }
}

// ✅ POST — Create new calendar event with Google Meet link
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized - No session found" }, { status: 401 });
    }

    const userId = session.user.email;
    const body = await req.json();
    const { summary, description, start: rawStart, end: rawEnd, attendees, timeZone } = body;

    // ✅ Validate input
    if (!summary || !rawStart || !rawEnd) {
      console.error("Missing fields:", { summary, rawStart, rawEnd });
      return NextResponse.json({ error: "Missing required fields: summary, start, end" }, { status: 400 });
    }

    // ✅ Convert start and end to valid ISO strings
    const start = new Date(rawStart).toISOString();
    const end = new Date(rawEnd).toISOString();

    // ✅ Validate end time is after start time
    if (new Date(end) <= new Date(start)) {
      return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
    }

    // ✅ Get valid OAuth2 client with auto-refresh
    const oauth2Client = await getValidOAuth2Client(userId);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // ✅ Format attendees array properly
    const formattedAttendees = Array.isArray(attendees) 
      ? attendees.map((item: any) => 
          typeof item === 'string' ? { email: item } : item
        )
      : [];

    // ✅ Create the event with Google Meet link
    const response = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1, // CRITICAL: Required for Google Meet link generation
      sendNotifications: true,
      requestBody: {
        summary,
        description: description || "",
        start: { 
          dateTime: start, 
          timeZone: timeZone || "Asia/Kolkata" 
        },
        end: { 
          dateTime: end, 
          timeZone: timeZone || "Asia/Kolkata" 
        },
        attendees: formattedAttendees,
        // CRITICAL: This creates the Google Meet link automatically
        conferenceData: {
          createRequest: {
            requestId: `worktwin-meet-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            conferenceSolutionKey: { 
              type: "hangoutsMeet" // This generates a Google Meet link
            },
          },
        },
      },
    });

    // ✅ Extract Meet link from multiple possible locations
    const meetLink = 
      response.data.hangoutLink || 
      response.data.conferenceData?.entryPoints?.find(
        (entry: any) => entry.entryPointType === "video"
      )?.uri ||
      null;

    console.log("✅ Event created successfully:", {
      id: response.data.id,
      summary: response.data.summary,
      meetLink,
      hasConferenceData: !!response.data.conferenceData
    });

    return NextResponse.json({
      event: response.data,
      meetLink: meetLink,
      message: "Event created successfully with Google Meet link",
    });
  } catch (err: any) {
    console.error("Google Calendar API error:", {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status
    });
    
    // ✅ Better error messages
    if (err.response?.status === 401) {
      return NextResponse.json({ 
        error: "Authentication failed. Please reconnect your Google account." 
      }, { status: 401 });
    }
    
    if (err.response?.status === 403) {
      return NextResponse.json({ 
        error: "Permission denied. Please grant calendar access." 
      }, { status: 403 });
    }

    return NextResponse.json({ 
      error: err.message || "Failed to create calendar event" 
    }, { status: 500 });
  }
}