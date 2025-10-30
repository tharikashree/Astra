from langgraph.graph import StateGraph
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from langchain_core.runnables import Runnable
from typing import TypedDict, List, Union
from datetime import datetime, timedelta
import google.generativeai as genai
from google_calendar import create_event
from gmail_tools import send_email_message, summarize_last_email
import os
import json
import re
import dateparser
import dotenv

dotenv.load_dotenv()

# ==== Gemini Setup ====
schedule_meeting_function = {
    "name": "schedule_meeting",
    "description": "Schedules a meeting at a given time and date. Only use this for scheduling.",
    "parameters": {
        "type": "object",
        "properties": {
            "date": {"type": "string"},
            "time": {"type": "string"},
            "topic": {"type": "string"},
        },
        "required": ["date", "time", "topic"]
    }
}

# Email sending function declaration
send_email_function = {
    "name": "send_email_message",
    "description": "Sends an email to a recipient with a subject and body.",
    "parameters": {
        "type": "object",
        "properties": {
            "to_email": {"type": "string", "description": "The recipient's full email address."},
            "subject": {"type": "string", "description": "The subject line of the email."},
            "body": {"type": "string", "description": "The content of the email message."}
        },
        "required": ["to_email", "subject", "body"]
    }
}

# Email summarization function declaration
summarize_email_function = {
    "name": "summarize_last_email",
    "description": "Fetches and summarizes the content of the last received email in the user's inbox.",
    "parameters": {"type": "object", "properties": {}, "required": []}
}

google_api_key = os.getenv("GEMINI_API_KEY")
if not google_api_key:
    raise ValueError("GEMINI_API_KEY is not set in the environment.")

genai.configure(api_key=google_api_key)

model = genai.GenerativeModel(
    model_name="gemini-2.5-flash",
    tools=[{"function_declarations": [schedule_meeting_function, send_email_function, summarize_email_function]}]
)

# ==== LangGraph State ====
MessageList = List[Union[HumanMessage, AIMessage, ToolMessage]]

class AgentState(TypedDict):
    messages: MessageList
    context: dict
    user_id: str

# ==== Convert messages to Gemini-compatible format ====
def to_gemini_messages(messages: List[Union[HumanMessage, AIMessage, ToolMessage]]) -> List[dict]:
    gemini_msgs = []
    for msg in messages:
        if isinstance(msg, HumanMessage):
            gemini_msgs.append({"role": "user", "parts": [msg.content]})
        elif isinstance(msg, AIMessage):
            gemini_msgs.append({"role": "model", "parts": [msg.content]})
        elif isinstance(msg, ToolMessage):
            gemini_msgs.append({"role": "function", "parts": [msg.content]})
    return gemini_msgs

def normalize_date(date_str):
    if not date_str:
        return None
    parsed = dateparser.parse(date_str)
    if parsed:
        return parsed.strftime("%Y-%m-%d")
    return date_str

def normalize_time(time_str):
    if not time_str:
        return None
    time_str = time_str.lower().replace(" ", "")
    try:
        # Handle formats like 4pm, 4:30pm, 04:30pm
        if ":" in time_str:
            dt = datetime.strptime(time_str, "%I:%M%p")
        else:
            dt = datetime.strptime(time_str, "%I%p")
        return dt.strftime("%I:%M %p")
    except:
        return time_str  # fallback

def preprocess_user_text(user_text: str) -> str:
    """Converts relative date words like 'tomorrow' or 'today' to explicit dates."""
    today = datetime.now()
    replacements = {
        "today": today.strftime("%Y-%m-%d"),
        "tomorrow": (today + timedelta(days=1)).strftime("%Y-%m-%d"),
    }
    for word, date_str in replacements.items():
        user_text = re.sub(rf"\b{word}\b", date_str, user_text, flags=re.IGNORECASE)
    return user_text


def extract_with_gemini(user_text: str, prev_context: dict) -> dict:
    user_text = preprocess_user_text(user_text)
    missing = [k for k in ["date", "time", "topic"] if not prev_context.get(k)]
    instruction = (
        "You are an assistant that extracts missing meeting details from the user message.\n"
        "Current known values:\n"
        f"- Date: {prev_context.get('date') or 'None'}\n"
        f"- Time: {prev_context.get('time') or 'None'}\n"
        f"- Topic: {prev_context.get('topic') or 'None'}\n\n"
        "Extract only the missing fields from this message:\n"
        f"User: {user_text}\n\n"
        "Respond in this exact JSON format:\n"
        "{\"date\": \"<date or null>\", \"time\": \"<time or null>\", \"topic\": \"<topic or null>\", \"follow_up\": \"<question if any>\"}"
    )

    model_v2 = genai.GenerativeModel("gemini-2.5-flash")
    response = model_v2.generate_content(instruction)
    content = response.text.strip()

    print("[🧠 Gemini Raw Response]", content)

    if content.startswith("```"):
        content = re.sub(r"```(?:json)?", "", content).strip("` \n")

    try:
        parsed = json.loads(content)
        return {
            "date": normalize_date(parsed.get("date")),
            "time": normalize_time(parsed.get("time")),
            "topic": parsed.get("topic"),
            "follow_up": parsed.get("follow_up")
        }
    except Exception as e:
        print("[❌ Gemini Extraction Error]", e)
        return {
            "date": None, "time": None, "topic": None,
            "follow_up": "Sorry, I didn’t understand. Can you rephrase?"
        }


# ==== Gemini Agent ====
class GeminiFunctionAgent(Runnable):
    def invoke(self, state: AgentState, config=None) -> AgentState:
        gemini_msgs = to_gemini_messages(state["messages"])
        response = model.generate_content(gemini_msgs)
        content = response.candidates[0].content

        # Check for immediate function call (used for all tools, including new email tools)
        if response.candidates and response.candidates[0].content.parts[0].function_call:
            call = response.candidates[0].content.parts[0].function_call
            function_call = {
                "name": call.name,
                "args": dict(call.args)
            }
            ai_msg = AIMessage(
                content=f"Attempting to call {call.name}...",
                additional_kwargs={"function_call": function_call}
            )
            # Route directly to tool executor for execution
            return {
                "messages": state["messages"] + [ai_msg],
                "context": state["context"],
                "user_id": state["user_id"],
                "next": "tool"
            }
        
        last_user_msg = next(
            (msg.content for msg in reversed(state["messages"]) if isinstance(msg, HumanMessage)), ""
        )

        prev_context = state.get("context", {})
        new_context = extract_with_gemini(last_user_msg, prev_context)

        print("[🔍 Extracted Context]", new_context)
        print("[📥 Last User Input]", last_user_msg)

        # Correct merging
        merged_context = {}
        for key in ["date", "time", "topic"]:
            merged_context[key] = prev_context.get(key) or new_context.get(key)

        print("[🔗 Final Merged Context]", merged_context)

        if all(merged_context.get(k) for k in ["date", "time", "topic"]):
            function_call = {
                "name": "schedule_meeting",
                "args": merged_context
            }
            ai_msg = AIMessage(
                content="Let me schedule that for you.",
                additional_kwargs={"function_call": function_call}
            )
            return {
                "messages": state["messages"] + [ai_msg],
                "context": merged_context,
                "user_id": state["user_id"],
                "next": "tool"
            }

        follow_up = new_context.get("follow_up") or "Could you provide more details?"
        ai_msg = AIMessage(content=follow_up)
        return {
            "messages": state["messages"] + [ai_msg],
            "context": merged_context,
            "user_id": state["user_id"],
            "next": "end"
        }

# ==== Tool Executor ====
def tool_executor(state: AgentState) -> AgentState:
    call = state["messages"][-1].additional_kwargs.get("function_call")
    if not call:
        return {**state, "next": "end"}

    tool_name = call["name"]
    tool_args = call["args"]
    user_id = state["user_id"]
    result = {"status": "error", "message": "Unknown function call."}
    
    user_result_msg = ""
    
    tool_args_with_user = {**tool_args, "user_id": user_id}

    if tool_name == "schedule_meeting":
        result = create_event(**tool_args_with_user)
        user_result_msg = f"Meeting scheduled: {result.get('eventLink', 'See result for details')}" if result.get('status') == 'success' else f"Failed to schedule: {result.get('message', 'Unknown error')}"

    elif tool_name == "send_email_message": 
        result = send_email_message(**tool_args_with_user)
        user_result_msg = f"Email sent successfully to {tool_args.get('to_email')}. Status: {result.get('status')}." if result.get('status') == 'success' else f"Failed to send email: {result.get('message', 'Unknown error')}"
        
    elif tool_name == "summarize_last_email": 
        result = summarize_last_email(**tool_args_with_user)
        if result.get('status') == 'success':
            user_result_msg = f"Last email summary: **{result['summary']}**"
        else:
            user_result_msg = f"Failed to summarize email: {result.get('message', 'Unknown error')}"
        
    else:
        user_result_msg = f"Unknown command: {tool_name}"

    # Append the execution result and the final user-facing reply
    return {
        "messages": state["messages"] + [
            ToolMessage(
                name=tool_name,
                content=str(result),
                tool_call_id="tool_call_id_fallback"
            ),
            AIMessage(content=user_result_msg) 
        ],
        "context": state["context"],
        "user_id": user_id,
        "next": "end"
    }

# ==== LangGraph Setup ====
graph = StateGraph(AgentState)
graph.add_node("agent", GeminiFunctionAgent())
graph.add_node("tool", tool_executor)
graph.add_node("end", lambda x: x)

graph.set_entry_point("agent")

graph.add_conditional_edges(
    "agent",
    lambda state: state.get("next", "end"),
    {
        "tool": "tool",
        "end": "end"
    }
)
graph.add_conditional_edges(
    "tool",
    lambda state: state.get("next", "end"),
    {
        "agent": "agent",
        "end": "end"
    }
)

graph.set_finish_point("end")
agent_executor = graph.compile()
