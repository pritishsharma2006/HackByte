import json
from fastapi import APIRouter, Form, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uuid
import os
import shutil
import base64
import traceback
import random
from services.gemini_service import GeminiInterviewService
from services.question_bank_service import QuestionBankService

router = APIRouter()

class StartInterviewRequest(BaseModel):
    candidate_name: str = "Candidate"
    resume_text: str
    target_company: str
    mode: str

@router.post("/start")
async def start_interview(request: StartInterviewRequest):
    try:
        session_id = str(uuid.uuid4())
        
        # Select an ambient mood to keep interviews completely unique
        moods = ["Strict & Intense", "Warm & Encouraging", "Skeptical", "Calm & Methodical"]
        selected_mood = random.choice(moods)

        # Preload target questions so the greeting understands what it's preparing the candidate for
        question_data = None
        if request.mode in ["DSA Round", "Full-Fledged"]:
            question_data = QuestionBankService.get_random_question(request.target_company)

        # Hook into Gemini to establish context using generative pipelines
        initial_msg = await GeminiInterviewService.generate_initial_greeting(
            candidate_name=request.candidate_name,
            mode=request.mode,
            company=request.target_company,
            mood=selected_mood,
            question_data=question_data
        )

        return {
            "session_id": session_id,
            "message": initial_msg,
            "question_data": question_data
        }
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.post("/reply")
async def reply_interview(
    session_id: str = Form(...),
    candidate_name: str = Form("Candidate"),
    resume_text: str = Form(...),
    target_company: str = Form(...),
    mode: str = Form(...),
    history: str = Form(...), # JSON string array
    user_text: str = Form(...), # Transcribed speech from browser
    question_title: str = Form(None),
    question_difficulty: str = Form(None),
    current_code: str = Form(None) # Optional code string from Monaco
):
    try:
        # Parse history from the frontend
        try:
            parsed_history = json.loads(history)
        except Exception:
            parsed_history = []

        # Re-initialize the EXACT locked problem from the frontend state
        question_data = None
        if question_title:
            question_data = {"title": question_title, "difficulty": question_difficulty}

        system_prompt = GeminiInterviewService.construct_system_prompt(
            candidate_name=candidate_name,
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
async def end_interview(
    session_id: str = Form(...), 
    history: str = Form(...),
    mode: str = Form("Full-Fledged"),
    target_company: str = Form("Google"),
    question_title: str = Form(None)
):
    try:
        try:
            parsed_history = json.loads(history)
        except Exception:
            parsed_history = []

        question_data = None
        if question_title:
            question_data = {"title": question_title}

        detailed_report = await GeminiInterviewService.generate_interview_report(
            history=parsed_history,
            mode=mode,
            company=target_company,
            question_data=question_data
        )

        # Parse score from the last line e.g. "SCORE: 72/100"
        import re
        score = None
        score_match = re.search(r'SCORE:\s*(\d+)\s*/\s*100', detailed_report)
        if score_match:
            score = int(score_match.group(1))
            # Strip the score line from the report body
            detailed_report = re.sub(r'\n*SCORE:\s*\d+\s*/\s*100\s*$', '', detailed_report).strip()

        return {
            "status": "completed",
            "detailed_report": detailed_report,
            "score": score
        }
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})
