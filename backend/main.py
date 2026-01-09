from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage
from agent_graph import agent_executor
from fastapi.responses import JSONResponse
from auth_store import router as auth_router   # Import the auth_store module

app = FastAPI()
app.include_router(auth_router, prefix="/auth", tags=["auth"]) # Import and include the auth_store router
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/chat")
async def chat(request: Request):
    body = await request.json()
    user_input = body.get("message")
    prev_context = body.get("context", {}) 
    user_id = body.get("user_id")
    print("Received data:", body)

    if not user_id:
         raise HTTPException(status_code=401, detail="User ID (or email) is required for API access.")

    # Pass both user message and current context to agent
    inputs = {
        "messages": [HumanMessage(content=user_input)],
        "context": prev_context,
        "user_id": user_id
    }

    result = agent_executor.invoke(inputs)

    return JSONResponse({
        "reply": result["messages"][-1].content,
        "context": result["context"]  
    })

