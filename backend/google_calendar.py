# from google.oauth2 import service_account
# from googleapiclient.discovery import build
# from dateutil import parser
# import datetime
# import dotenv
# import pytz
# import os
# import re
# from supabase_client import load_credentials

# dotenv.load_dotenv()

# CALENDAR_ID_DEFAULT = 'primary'
# TZ_KOLKATA = "Asia/Kolkata"

# def get_calendar_service(user_id: str):
#     """Loads credentials from Supabase, refreshes if needed, and builds the service."""
#     creds = load_credentials(user_id)
#     if not creds:
#         return None, "User not authorized or session expired. Please re-connect your calendar."

#     service = build('calendar', 'v3', credentials=creds)
#     return service, None

# # Basic email validation
# def is_valid_email(email):
#     pattern = r"^[\w\.-]+@[\w\.-]+\.\w+$"
#     return re.match(pattern, email) is not None

# def is_time_slot_available(service, start_dt, end_dt):
#     body = {
#         "timeMin": start_dt.isoformat(),
#         "timeMax": end_dt.isoformat(),
#         "timeZone": TZ_KOLKATA,
#         "items": [{"id": CALENDAR_ID_DEFAULT}]
#     }

#     try:
#         response = service.freebusy().query(body=body).execute()
#         busy_times = response["calendars"][CALENDAR_ID_DEFAULT].get("busy", [])
#         return len(busy_times) == 0  # True = free
#     except Exception as e:
#         return {
#             "status": "error",
#             "message": f"Calendar API error: {str(e)}"
#         }

# def create_event(user_id: str, date, time, topic):
#     """Schedules an event for the given user ID."""
#     service, error = get_calendar_service(user_id)
#     if error:
#         return {"status": "error", "message": f"Authorization error: {error}"}

#     try:
#         # Parse and sanitize natural language input
#         start_dt = parser.parse(f"{date} {time}", fuzzy=True)
#         end_dt = start_dt + datetime.timedelta(hours=1)

#         tz = pytz.timezone(TZ_KOLKATA)
#         start_dt = tz.localize(start_dt)
#         end_dt = tz.localize(end_dt)

#         # Check slot availability
#         availability = is_time_slot_available(service, start_dt, end_dt)
#         if isinstance(availability, dict) and availability.get("status") == "error":
#             return availability

#         if not availability:
#             return {
#                 "status": "error",
#                 "message": "The selected time slot is not available. Please choose another time."
#             }
        
#         event = {
#             "summary": topic,
#             "start": {"dateTime": start_dt.isoformat(), "timeZone": TZ_KOLKATA},
#             "end": {"dateTime": end_dt.isoformat(), "timeZone": TZ_KOLKATA}
#         }

#         result = service.events().insert(
#             calendarId=CALENDAR_ID_DEFAULT, 
#             body=event
#         ).execute()

#         return {
#             "status": "success",
#             "eventLink": result.get("htmlLink"),
#             "eventId": result.get("id"),
#         }

#     except Exception as e:
#         return {"status": "error", "message": f"Event creation failed: {str(e)}"}
from googleapiclient.discovery import build
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

def create_event(user_id: str, date, time, topic, **kwargs):
    """Schedules an event with Google Meet link for the given user ID."""
    service, error = get_calendar_service(user_id)
    if error:
        return {"status": "error", "message": f"Authorization error: {error}"}
    
    try:
        # Parse and sanitize natural language input
        start_dt = parser.parse(f"{date} {time}", fuzzy=True)
        end_dt = start_dt + datetime.timedelta(hours=1)
        
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
        
        print(f"[✅ Event Created] ID: {result.get('id')}, Meet Link: {meet_link}")
        
        return {
            "status": "success",
            "eventLink": result.get("htmlLink"),
            "eventId": result.get("id"),
            "meetLink": meet_link,  # Google Meet link
        }
    
    except Exception as e:
        print(f"[❌ Event Creation Error] {str(e)}")
        return {"status": "error", "message": f"Event creation failed: {str(e)}"}