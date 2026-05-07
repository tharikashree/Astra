# import os
# import base64
# from email.mime.text import MIMEText
# import google.generativeai as genai
# from google.oauth2.credentials import Credentials
# from googleapiclient.discovery import build
# from supabase_client import load_credentials
# import json
# import re
# import dotenv

# dotenv.load_dotenv()

# # Initialize Gemini Client for summarization
# GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# if not GEMINI_API_KEY:
#     # from the agent_graph setup if the application is running correctly.
#     print("Warning: GEMINI_API_KEY not set. Summarization will fail.")
# genai.configure(api_key=GEMINI_API_KEY)
# SUMMARIZER_MODEL = genai.GenerativeModel("gemini-2.5-flash")

# def get_gmail_service(user_id: str):
#     """Loads credentials from Supabase, refreshes if needed, and builds the service."""
#     creds = load_credentials(user_id)
#     if not creds:
#         return None, "User not authorized or session expired. Please re-connect your Google account."

#     service = build('gmail', 'v1', credentials=creds)
#     return service, None

# def send_email_message(user_id: str, to_email: str, subject: str, body: str) -> dict:
#     """Sends an email message via the Gmail API using the user ID to fetch credentials."""
#     service, error = get_gmail_service(user_id)
#     if error:
#         return {"status": "error", "message": f"Authorization error: {error}"}
    
#     try:
#         message = MIMEText(body)
#         message['to'] = to_email
#         message['from'] = 'me' 
#         message['subject'] = subject
        
#         raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        
#         sent_message = service.users().messages().send(
#             userId='me', 
#             body={'raw': raw_message}
#         ).execute()

#         return {
#             "status": "success",
#             "message": f"Email sent to {to_email} with subject '{subject}'. Message ID: {sent_message.get('id')}"
#         }

#     except Exception as e:
#         return {"status": "error", "message": f"An error occurred while sending the email: {str(e)}"}
    
# def summarize_last_email(user_id: str) -> dict:
#     """Fetches the last received email and returns its summary using Gemini."""
#     service, error = get_gmail_service(user_id)
#     if error:
#         return {"status": "error", "message": f"Authorization error: {error}"}

#     try:
#         response = service.users().messages().list(userId='me', maxResults=1, labelIds=['INBOX']).execute()
        
#         messages = response.get('messages', [])
#         if not messages:
#             return {"status": "error", "message": "No emails found in the inbox."}
        
#         msg_id = messages[0]['id']
#         message = service.users().messages().get(userId='me', id=msg_id, format='full').execute()
        
#         snippet = message.get('snippet', '')
        
#         prompt = f"Provide a concise, one-sentence summary of this email snippet: {snippet}"
#         gemini_response = SUMMARIZER_MODEL.generate_content(prompt)
#         summary = gemini_response.text.strip()

#         return {
#             "status": "success",
#             "snippet": snippet,
#             "summary": summary
#         }

#     except Exception as e:
#         return {"status": "error", "message": f"An error occurred while summarizing the email: {str(e)}"}
import os
import base64
from email.mime.text import MIMEText
import google.generativeai as genai
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.oauth2 import service_account
from dateutil import parser
import datetime
import dotenv
import pytz
import os
import re
import uuid
from supabase_client import load_credentials

dotenv.load_dotenv()

CALENDAR_ID_DEFAULT = 'primary'
TZ_KOLKATA = "Asia/Kolkata"

def get_calendar_service(user_id: str):
    """Loads credentials from Supabase, refreshes if needed, and builds the service."""
    creds = load_credentials(user_id)
    if not creds:
        return None, "User not authorized or session expired. Please re-connect your calendar."

    service = build('calendar', 'v3', credentials=creds)
    return service, None

# Basic email validation
def is_valid_email(email):
    pattern = r"^[\w\.-]+@[\w\.-]+\.\w+$"
    return re.match(pattern, email) is not None

def is_time_slot_available(service, start_dt, end_dt):
    body = {
        "timeMin": start_dt.isoformat(),
        "timeMax": end_dt.isoformat(),
        "timeZone": TZ_KOLKATA,
        "items": [{"id": CALENDAR_ID_DEFAULT}]
    }

    try:
        response = service.freebusy().query(body=body).execute()
        busy_times = response["calendars"][CALENDAR_ID_DEFAULT].get("busy", [])
        return len(busy_times) == 0  # True = free
    except Exception as e:
        return {
            "status": "error",
            "message": f"Calendar API error: {str(e)}"
        }

def create_event(user_id: str, date, time, topic, attendees=None, duration_hours=1, **kwargs):
    """Schedules an event with Google Meet link for the given user ID."""
    service, error = get_calendar_service(user_id)
    if error:
        return {"status": "error", "message": f"Authorization error: {error}"}

    try:
        # Parse and sanitize natural language input
        start_dt = parser.parse(f"{date} {time}", fuzzy=True)
        end_dt = start_dt + datetime.timedelta(hours=duration_hours)

        tz = pytz.timezone(TZ_KOLKATA)
        start_dt = tz.localize(start_dt)
        end_dt = tz.localize(end_dt)

        # Check slot availability
        availability = is_time_slot_available(service, start_dt, end_dt)
        if isinstance(availability, dict) and availability.get("status") == "error":
            return availability

        if not availability:
            return {
                "status": "error",
                "message": "The selected time slot is not available. Please choose another time."
            }
        
        # Build event with Google Meet conference data
        event = {
            "summary": topic,
            "start": {"dateTime": start_dt.isoformat(), "timeZone": TZ_KOLKATA},
            "end": {"dateTime": end_dt.isoformat(), "timeZone": TZ_KOLKATA},
            # CRITICAL: Add conferenceData to create Google Meet link
            "conferenceData": {
                "createRequest": {
                    "requestId": f"meet-{uuid.uuid4()}",  # Unique request ID
                    "conferenceSolutionKey": {
                        "type": "hangoutsMeet"  # This creates a Google Meet link
                    }
                }
            }
        }

        # Add attendees if provided
        if attendees:
            event["attendees"] = [{"email": email} for email in attendees if is_valid_email(email)]

        # CRITICAL: Must include conferenceDataVersion=1 to generate Meet link
        result = service.events().insert(
            calendarId=CALENDAR_ID_DEFAULT, 
            body=event,
            conferenceDataVersion=1,  # Required for Google Meet link generation
            sendNotifications=True
        ).execute()

        # Extract Google Meet link from response
        meet_link = None
        if result.get("conferenceData"):
            entry_points = result["conferenceData"].get("entryPoints", [])
            for entry in entry_points:
                if entry.get("entryPointType") == "video":
                    meet_link = entry.get("uri")
                    break
        
        # Also check hangoutLink as fallback
        if not meet_link:
            meet_link = result.get("hangoutLink")

        return {
            "status": "success",
            "eventLink": result.get("htmlLink"),
            "eventId": result.get("id"),
            "meetLink": meet_link,  # Google Meet link
            "message": f"Meeting '{topic}' scheduled successfully with Google Meet link"
        }

    except Exception as e:
        return {"status": "error", "message": f"Event creation failed: {str(e)}"}

def get_upcoming_events(user_id: str, max_results=10):
    """Fetches upcoming calendar events with Google Meet links."""
    service, error = get_calendar_service(user_id)
    if error:
        return {"status": "error", "message": f"Authorization error: {error}"}

    try:
        now = datetime.datetime.utcnow().isoformat() + 'Z'
        
        # CRITICAL: Must explicitly request conferenceData field
        events_result = service.events().list(
            calendarId=CALENDAR_ID_DEFAULT,
            timeMin=now,
            maxResults=max_results,
            singleEvents=True,
            orderBy='startTime',
            fields='items(id,summary,start,end,hangoutLink,conferenceData,htmlLink)'
        ).execute()
        
        events = events_result.get('items', [])
        
        # Format events with Meet links
        formatted_events = []
        for event in events:
            meet_link = None
            
            # Check for Google Meet link in conferenceData
            if event.get("conferenceData"):
                entry_points = event["conferenceData"].get("entryPoints", [])
                for entry in entry_points:
                    if entry.get("entryPointType") == "video":
                        meet_link = entry.get("uri")
                        break
            
            # Fallback to hangoutLink
            if not meet_link:
                meet_link = event.get("hangoutLink")
            
            formatted_events.append({
                "id": event.get("id"),
                "summary": event.get("summary"),
                "start": event.get("start"),
                "end": event.get("end"),
                "meetLink": meet_link,
                "htmlLink": event.get("htmlLink")
            })
        
        return {
            "status": "success",
            "events": formatted_events
        }

    except Exception as e:
        return {"status": "error", "message": f"Failed to fetch events: {str(e)}"}


# Gmail functions remain the same
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    SUMMARIZER_MODEL = genai.GenerativeModel("gemini-2.5-flash")

def get_gmail_service(user_id: str):
    """Loads credentials from Supabase, refreshes if needed, and builds the service."""
    creds = load_credentials(user_id)
    if not creds:
        return None, "User not authorized or session expired. Please re-connect your Google account."

    service = build('gmail', 'v1', credentials=creds)
    return service, None

def send_email_message(user_id: str, to_email: str, subject: str, body: str) -> dict:
    """Sends an email message via the Gmail API using the user ID to fetch credentials."""
    service, error = get_gmail_service(user_id)
    if error:
        return {"status": "error", "message": f"Authorization error: {error}"}
    
    try:
        message = MIMEText(body)
        message['to'] = to_email
        message['from'] = 'me' 
        message['subject'] = subject
        
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        
        sent_message = service.users().messages().send(
            userId='me', 
            body={'raw': raw_message}
        ).execute()

        return {
            "status": "success",
            "message": f"Email sent to {to_email} with subject '{subject}'. Message ID: {sent_message.get('id')}"
        }

    except Exception as e:
        return {"status": "error", "message": f"An error occurred while sending the email: {str(e)}"}
    
def summarize_last_email(user_id: str) -> dict:
    """Fetches the last received email and returns its summary using Gemini."""
    service, error = get_gmail_service(user_id)
    if error:
        return {"status": "error", "message": f"Authorization error: {error}"}

    try:
        response = service.users().messages().list(userId='me', maxResults=1, labelIds=['INBOX']).execute()
        
        messages = response.get('messages', [])
        if not messages:
            return {"status": "error", "message": "No emails found in the inbox."}
        
        msg_id = messages[0]['id']
        message = service.users().messages().get(userId='me', id=msg_id, format='full').execute()
        
        snippet = message.get('snippet', '')
        
        if GEMINI_API_KEY:
            prompt = f"Provide a concise, one-sentence summary of this email snippet: {snippet}"
            gemini_response = SUMMARIZER_MODEL.generate_content(prompt)
            summary = gemini_response.text.strip()
        else:
            summary = snippet

        return {
            "status": "success",
            "snippet": snippet,
            "summary": summary
        }

    except Exception as e:
        return {"status": "error", "message": f"An error occurred while summarizing the email: {str(e)}"}