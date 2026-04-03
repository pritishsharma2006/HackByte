import json
from fastapi import APIRouter, Form, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uuid
import os
import shutil
import base64
import traceback

from services.gemini_service import GeminiInterviewService
from services.elevenlabs_service import generate_speech

router = APIRouter()

class StartInterviewRequest(BaseModel):
    resume_text: str
    target_company: str
    mode: str

@router.post("/start")
async def start_interview(request: StartInterviewRequest):
    try:
        session_id = str(uuid.uuid4())
        initial_msg = (
            "Hi there! I'm your interviewer for today. "
            "How are you feeling? Aren't you a little anxious? "
            "No need to worry, everything will be good. Let's get started!"
        )

        # Generate voice
        audio_bytes = await generate_speech(initial_msg)
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8') if audio_bytes else None

        return {
            "session_id": session_id,
            "message": initial_msg,
            "audio_base64": audio_base64
        }
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.post("/reply")
async def reply_interview(
    session_id: str = Form(...),
    resume_text: str = Form(...),
    target_company: str = Form(...),
    mode: str = Form(...),
    history: str = Form(...), # JSON string array
    user_text: str = Form(...) # Transcribed speech from browser
):
    try:
        # Parse history from the frontend
        try:
            parsed_history = json.loads(history)
        except Exception:
            parsed_history = []

        system_prompt = GeminiInterviewService.construct_system_prompt(
            resume=resume_text,
            company=target_company,
            style="Realism & Adaptive Pressure"
        )

        reply_text = await GeminiInterviewService.process_text_reply(parsed_history, user_text, system_prompt)

        audio_bytes = await generate_speech(reply_text)
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8') if audio_bytes else None

        return {
            "reply": reply_text,
            "audio_base64": audio_base64
        }
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.post("/end")
async def end_interview(session_id: str = Form(...), history: str = Form(...)):
    return {
        "status": "completed",
        "detailed_report": "Detailed final report — implementation pending LLM summary prompt."
    }
