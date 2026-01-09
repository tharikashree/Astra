from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from google.oauth2.credentials import Credentials
import json
from supabase_client import store_credentials
import os 
import dotenv
router = APIRouter()

dotenv.load_dotenv()

# Define the data structure for the incoming token payload
class TokenData(BaseModel):
    user_id: str
    refresh_token: str
    access_token: str
    expires_at: int
    
@router.post("/store-google-tokens")
async def store_google_tokens(data: TokenData):
    """
    Receives and stores the Google Refresh Token into Supabase.
    This is the secure backend step after NextAuth acquires the token.
    """
    
    # Use os.getenv() for Python environment variables
    client_id = os.getenv("GOOGLE_CLIENT_ID") 
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")

    # CRITICAL CHECK: Ensure client credentials are set for token refresh
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=500,
            detail="Server configuration error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables must be set for token storage/refresh."
        )
    
    # Create a temporary Credentials object from the received data
    creds = Credentials(
        token=data.access_token,
        refresh_token=data.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id, 
        client_secret=client_secret, 
        scopes=None,
    )
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())

    try:
        # Store the serialized credentials (including the refresh token)
        store_credentials(data.user_id, creds)
        return {"status": "success", "message": "Tokens stored/updated successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to store tokens in Supabase: {str(e)}")
