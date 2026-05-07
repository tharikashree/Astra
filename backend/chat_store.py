import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

CHAT_TABLE = "chat_history"


def save_chat_message(user_id: str, role: str, message: str):

    try:

        supabase.table(CHAT_TABLE).insert({
            "user_id": user_id,
            "role": role,
            "message": message
        }).execute()

        print(f"✅ Saved {role} message")

    except Exception as e:
        print("❌ Chat Save Error:", e)