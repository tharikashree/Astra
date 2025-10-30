import os
import base64
from email.mime.text import MIMEText
import google.generativeai as genai
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from supabase_client import load_credentials
import json
import re
import dotenv

dotenv.load_dotenv()

# Initialize Gemini Client for summarization
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    # from the agent_graph setup if the application is running correctly.
    print("Warning: GEMINI_API_KEY not set. Summarization will fail.")
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
        
        prompt = f"Provide a concise, one-sentence summary of this email snippet: {snippet}"
        gemini_response = SUMMARIZER_MODEL.generate_content(prompt)
        summary = gemini_response.text.strip()

        return {
            "status": "success",
            "snippet": snippet,
            "summary": summary
        }

    except Exception as e:
        return {"status": "error", "message": f"An error occurred while summarizing the email: {str(e)}"}