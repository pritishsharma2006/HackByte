from services.db import get_db

async def create_session(session_id: str, resume_text: str, target_company: str, mode: str):
    db = get_db()
    session_data = {
        "session_id": session_id,
        "resume_text": resume_text,
        "target_company": target_company,
        "mode": mode,
        "hint_count": 0,
        "history": [],
        "status": "active"
    }
    await db.sessions.insert_one(session_data)

async def get_session(session_id: str) -> dict:
    db = get_db()
    return await db.sessions.find_one({"session_id": session_id})

async def update_session_history(session_id: str, role: str, content: str):
    db = get_db()
    await db.sessions.update_one(
        {"session_id": session_id},
        {"$push": {"history": {"role": role, "content": content}}}
    )
