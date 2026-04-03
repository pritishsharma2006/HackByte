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
from services.question_bank_service import QuestionBankService

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

        return {
            "session_id": session_id,
            "message": initial_msg
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
    user_text: str = Form(...), # Transcribed speech from browser
    current_code: str = Form(None) # Optional code string from Monaco
):
    try:
        # Parse history from the frontend
        try:
            parsed_history = json.loads(history)
        except Exception:
            parsed_history = []

        # Inject algorithmic dynamic selection if logic requires it
        question_data = None
        if mode in ["DSA Round", "Full-Fledged"]:
            question_data = QuestionBankService.get_random_question(target_company)

        system_prompt = GeminiInterviewService.construct_system_prompt(
            resume=resume_text,
            company=target_company,
            mode=mode,
            question_data=question_data
        )

        reply_text = await GeminiInterviewService.process_text_reply(parsed_history, user_text, system_prompt, current_code)

        # Intercept and clean the coding tag so it isn't spoken aloud
        is_coding = False
        if "[CODING_ROUND]" in reply_text:
            is_coding = True
            reply_text = reply_text.replace("[CODING_ROUND]", "").strip()

        return {
            "reply": reply_text,
            "is_coding_round": is_coding
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
