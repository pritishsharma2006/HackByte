from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv(override=True)

from routers import interview_routes
from services.db import connect_to_mongo, close_mongo_connection

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()

app = FastAPI(title="AI Interview Platform API", lifespan=lifespan)

# CORS — allow the Vite dev server origin explicitly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(interview_routes.router, prefix="/api/interview", tags=["Interview"])

@app.get("/")
def read_root():
    return {"message": "AI Interview Backend is running successfully!"}
