import os
import json
import dotenv
from supabase import create_client, Client
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from typing import Optional

dotenv.load_dotenv()

# --- Supabase Configuration ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_TABLE = "user_tokens"
CALENDAR_SCOPES = [
    'https://www.googleapis.com/auth/calendar.events', 
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly'
]

# Initialize Supabase client
supabase: Optional[Client] = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"Error initializing Supabase client: {e}")
        supabase = None
else:
    print("Warning: SUPABASE_URL or SUPABASE_KEY is missing. Database operations will fail.")

def store_credentials(user_id: str, credentials: Credentials):
    """Stores/Updates the Google Credentials JSON for a user in the Supabase table."""
    if not supabase: return 

    creds_dict = json.loads(credentials.to_json())
    creds_dict['expiry'] = credentials.expiry.isoformat() if credentials.expiry else None

    try:
        # Use upsert to insert or update the row based on user_id (email)
        supabase.table(SUPABASE_TABLE).upsert({
            "user_id": user_id,
            "google_credentials": creds_dict
        }).execute()
        # print(f"Successfully stored credentials for user: {user_id}")
    except Exception as e:
        print(f"Supabase Store Error for {user_id}: {e}")

def load_credentials(user_id: str) -> Optional[Credentials]:
    """Loads and rebuilds the Google Credentials object for a given user, refreshing if expired."""
    if not supabase: return None

    try:
        # 1. Fetch credentials from Supabase
        response = supabase.table(SUPABASE_TABLE)\
            .select("google_credentials")\
            .eq("user_id", user_id)\
            .single()\
            .execute()
        
        data = response.data
        if not data or not data.get('google_credentials'):
            return None
            
        creds_info = data['google_credentials']
        
        # 2. Recreate Credentials object
        # Credentials.from_authorized_user_info correctly handles the stored data
        creds = Credentials.from_authorized_user_info(creds_info, scopes=CALENDAR_SCOPES)
        
        # 3. Check for expiry and refresh if needed
        if creds.expired and creds.refresh_token:
            # print(f"Token expired for {user_id}. Attempting refresh...")
            creds.refresh(Request())
            # Store the refreshed credentials back to the database
            store_credentials(user_id, creds)
        
        if not creds.valid:
            # print(f"Credentials invalid/not refreshable for {user_id}.")
            return None
            
        return creds
        
    except Exception as e:
        # This catches exceptions like "Postgrest API error: The result contains 0 rows"
        # which means the user has not authorized yet.
        # print(f"Supabase/Auth Load Error for {user_id}: {e}")
        return None
