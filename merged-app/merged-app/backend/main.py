import os
import json
from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from typing import Optional
from google.oauth2 import id_token
from google.auth.transport import requests
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Load .env file from root
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(BASE_DIR, "..", ".env")
load_dotenv(env_path)

print(f"DEBUG: Loading .env from {env_path}")
api_key_check = os.environ.get("GEMINI_API_KEY")
if api_key_check:
    print(f"DEBUG: GEMINI_API_KEY found: {api_key_check[:4]}...{api_key_check[-4:]}")
else:
    print("DEBUG: GEMINI_API_KEY NOT FOUND in environment")

# MongoDB Configuration
MONGO_URI = os.environ.get("MONGODB_URI")
DB_NAME = "boom_resume"
client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]
users_col = db["users"]
usernames_col = db["usernames"]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com")

class TokenRequest(BaseModel):
    token: str

class OnboardRequest(BaseModel):
    email: str
    username: str

class CoverLetterRequest(BaseModel):
    job_description: Optional[str] = None

@app.post("/api/auth/google")
async def google_auth(req: TokenRequest):
    try:
        # Verify the ID token
        idinfo = id_token.verify_oauth2_token(req.token, requests.Request(), GOOGLE_CLIENT_ID)
        
        email = idinfo['email'].lower()
        name = idinfo.get('name')
        
        user_record = await users_col.find_one({"email": email})
        user_exists = user_record is not None
        
        response = {
            "email": email,
            "name": name,
            "status": "existing" if user_exists else "new"
        }
        
        if user_exists:
            response["username"] = user_record["username"]
            response["data"] = user_record.get("data")
            
        return response
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token")

@app.get("/api/user/check-username/{username}")
async def check_username(username: str):
    username = username.lower().strip()
    if not username.isalnum():
         return {"available": False, "message": "Username must be alphanumeric"}
    
    existing = await usernames_col.find_one({"username": username})
    return {"available": existing is None}

@app.post("/api/user/onboard")
async def onboard_user(req: OnboardRequest):
    email = req.email.lower()
    username = req.username.lower().strip()
    
    if not username.isalnum():
         raise HTTPException(status_code=400, detail="Username must be alphanumeric.")
    
    # Check if username exists
    existing_user = await usernames_col.find_one({"username": username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already taken.")
    
    # Update or Create user
    await users_col.update_one(
        {"email": email},
        {"$set": {"username": username}},
        upsert=True
    )
    
    # Map username to email
    await usernames_col.update_one(
        {"username": username},
        {"$set": {"email": email}},
        upsert=True
    )
    
    return {"message": "Onboarding successful", "username": username}

@app.post("/api/upload")
async def upload_resume(email: str = Form(...), resume: UploadFile = File(...)):
    email = email.lower().strip()
    
    user_record = await users_col.find_one({"email": email})
    if not user_record:
        raise HTTPException(status_code=404, detail="User not found. Please onboard first.")

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
         raise HTTPException(status_code=500, detail="GEMINI_API_KEY environment variable is missing.")

    genai.configure(api_key=api_key)
    file_bytes = await resume.read()
    
    pdf_part = {
        "mime_type": resume.content_type,
        "data": file_bytes
    }
    
    prompt = """
    You are an expert document and image parser. Read the attached PDF document and extract the following information. Return it strictly as a valid JSON object. 
    Make sure the keys exactly match this schema:
    {
      "name": "Full Name",
      "email": "Email Address",
      "phone": "Phone Number",
      "linkedin": "LinkedIn URL",
      "summary": "Brief summary",
      "skills": ["Skill 1"],
      "experience": [{"role": "Title", "company": "Company", "duration": "Dates", "details": ["Point"]}],
      "projects": [{"title": "Name", "duration": "Dates", "details": "Desc"}],
      "education": [{"degree": "Major", "institution": "School", "year": "Year"}]
    }
    Return purely the JSON object. NO MARKDOWN.
    """
    
    try:
        model = genai.GenerativeModel("gemini-flash-latest")
        response = model.generate_content([prompt, pdf_part])
        output_text = response.text.strip()
        
        if output_text.startswith("```json"):
            output_text = output_text[7:-3].strip()
        elif output_text.startswith("```"):
            output_text = output_text[3:-3].strip()
            
        structured_data = json.loads(output_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse resume: {str(e)}")
        
    await users_col.update_one(
        {"email": email},
        {"$set": {"data": structured_data}}
    )
    
    return {"message": "Resume uploaded and parsed successfully", "username": user_record["username"], "data": structured_data}

@app.get("/api/resume/{username}")
async def get_resume(username: str):
    username = username.lower()
    
    mapping = await usernames_col.find_one({"username": username})
    if not mapping:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    email = mapping["email"]
    user_record = await users_col.find_one({"email": email})
    
    if not user_record or not user_record.get("data"):
        raise HTTPException(status_code=404, detail="Resume data not found for this user")
        
    return user_record["data"]

@app.post("/api/cover-letter/{username}")
async def generate_cover_letter(username: str, req: CoverLetterRequest):
    username = username.lower()
    
    mapping = await usernames_col.find_one({"username": username})
    if not mapping:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    email = mapping["email"]
    user_record = await users_col.find_one({"email": email})
    
    if not user_record or not user_record.get("data"):
        raise HTTPException(status_code=404, detail="Resume data not found")
        
    resume_data = user_record["data"]
    api_key = os.environ.get("GEMINI_API_KEY")
    genai.configure(api_key=api_key)
    
    prompt = f"Write a professional cover letter based on this resume JSON:\n{json.dumps(resume_data, indent=2)}\n\n"
    if req.job_description:
        prompt += f"Target Job: {req.job_description}\n"
    prompt += "Output as plain text, no markdown."
    
    try:
        model = genai.GenerativeModel("gemini-flash-latest")
        response = model.generate_content(prompt)
        return {"cover_letter": response.text.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate cover letter: {str(e)}")

# ========== AI Interview Platform Integration ==========
from routers.interview_routes import router as interview_router
app.include_router(interview_router, prefix="/api/interview")
