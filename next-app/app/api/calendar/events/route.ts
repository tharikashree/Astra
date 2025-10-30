import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { use } from "react";

// Define your FastAPI backend URL using an environment variable,
// falling back to localhost:8000 if the variable is not set.
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

/**
 * Helper to ensure the user is authenticated and get their email (our user_id).
 */
async function authenticateUser(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Use token.email as the persistent user identifier (user_id)
  if (!token || !token.email) {
    return { error: "Unauthorized", status: 401 };
  }
  return { user_id: token.email };
}

/**
 * Handles GET requests to fetch data from the backend.
 * Route: /api/calendar/events (Proxies to /chat POST request)
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateUser(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { user_id } = auth;

  try {
    // Forward the request to the FastAPI backend, passing the user_id and an empty message,
    // which is required by the backend's chat structure (HumanMessage content).
    const response = await fetch(`${BACKEND_URL}/chat`, {
      method: "POST", // We use POST to securely pass the user_id in the body
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user_id, message: "fetch calendar events" }), // <-- FIX: Added empty message
    });

    const data = await response.json();

    if (!response.ok) {
      // Forward the error status from the backend (e.g., 401 if token is missing)
      return NextResponse.json({ error: data.message || "Backend API error" }, { status: response.status });
    }

    // Application-level error check: If the chat response contains a known failure message
    // (like from a failed tool use for calendar actions or email summary), return a 400 error status.
    const replyMessage = data.reply || "";
    if (
      replyMessage.startsWith("Failed to schedule:") ||
      replyMessage.startsWith("Failed to summarize email:") || // <-- Added check for email summarization failure
      replyMessage.includes("Authorization error:")
    ) {
        console.error("Application-level transactional error detected in chat reply:", replyMessage);
        // Returning 400 Bad Request to signal a transactional failure to the client.
        return NextResponse.json({ error: replyMessage }, { status: 400 });
    }

    // Forward the successful response data
    return NextResponse.json(data);
  } catch (err: any) {
    // Explicitly note the failure to connect to the backend URL
    console.error("Proxy error during GET /calendar/events:", err.message);
    return NextResponse.json({ error: `Failed to connect to backend service at ${BACKEND_URL}. Ensure your FastAPI server is running.` }, { status: 500 });
  }
}

/**
 * Handles POST requests to create a new calendar event via the backend.
 * Route: /api/calendar/events
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateUser(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { user_id } = auth;

  try {
    const requestBody = await req.json();

    // Prepare data to send to the backend, including user_id and event details
    const dataToSend = {
      user_id: user_id,
      ...requestBody,
    };

    // Forward the request to the FastAPI backend
    const response = await fetch(`${BACKEND_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataToSend),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.message || "Backend event creation failed." }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Proxy error during POST /calendar/events:", err);
    return NextResponse.json({ error: `Failed to connect to backend service at ${BACKEND_URL} or parse request.` }, { status: 500 });
  }
}
