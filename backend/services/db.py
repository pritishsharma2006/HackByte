import os
from motor.motor_asyncio import AsyncIOMotorClient

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def connect_to_mongo():
    mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    try:
        db_instance.client = AsyncIOMotorClient(mongo_uri, serverSelectionTimeoutMS=5000)
        db_instance.db = db_instance.client.ai_interview_db
        # Quick ping to verify connection
        await db_instance.client.admin.command('ping')
        print("Connected to MongoDB!")
    except Exception as e:
        print(f"MongoDB connection warning: {e}")
        print("Server will start without DB. Endpoints that need DB may fail.")

async def close_mongo_connection():
    if db_instance.client is not None:
        db_instance.client.close()
        print("MongoDB connection closed.")

def get_db():
    return db_instance.db
