import os
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from dotenv import load_dotenv

dotenv_path = Path(__file__).resolve().parent.parent.parent / '.env'
load_dotenv(dotenv_path=dotenv_path)

ATLAS_MONGODB_NAME = os.getenv("ATLAS_MONGODB_NAME")
ATLAS_MONGODB_USER = os.getenv("ATLAS_MONGODB_USER")
ATLAS_MONGODB_PASSWORD = os.getenv("ATLAS_MONGODB_PASSWORD")
ATLAS_MONGODB_CLUSTER = os.getenv("ATLAS_MONGODB_CLUSTER")

url = f"mongodb+srv://{ATLAS_MONGODB_USER}:{ATLAS_MONGODB_PASSWORD}@{ATLAS_MONGODB_CLUSTER}/?retryWrites=true&w=majority&appName={ATLAS_MONGODB_NAME}"

client = AsyncIOMotorClient(url)
db = client[ATLAS_MONGODB_NAME]

def get_database():
    return db