import os
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from dotenv import load_dotenv

dotenv_path = Path(__file__).resolve().parent.parent.parent / '.env'
load_dotenv(dotenv_path=dotenv_path)

MONGODB_URL = os.getenv("MONGODB_URL")
ATLAS_MONGODB_NAME = os.getenv("ATLAS_MONGODB_NAME")

client = AsyncIOMotorClient(MONGODB_URL)
db = client[ATLAS_MONGODB_NAME]

def get_database():
    return db