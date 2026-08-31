import os
import uuid
import traceback
from typing import Optional
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase_client: Optional[Client] = (
    create_client(SUPABASE_URL, SUPABASE_KEY)
    if SUPABASE_URL and SUPABASE_KEY
    else None
)

def upload_media_to_supabase(file_bytes: bytes, filename: str, mime_type: str) -> Optional[str]:
    """
    Sube un archivo al bucket público 'breakdown-media' de Supabase
    y devuelve la URL pública directa.
    """
    if not supabase_client:
        print("⚠️ [SUPABASE STORAGE]: Cliente no configurado. Se omite subida a bucket.")
        return None

    try:
        # Generar nombre único para evitar colisiones
        ext = filename.split(".")[-1] if "." in filename else "jpg"
        unique_name = f"{uuid.uuid4().hex}.{ext}"

        # Subir bytes al bucket
        supabase_client.storage.from_("breakdown-media").upload(
            path=unique_name,
            file=file_bytes,
            file_options={"content-type": mime_type, "upsert": "false"}
        )

        # Obtener URL pública
        public_url = supabase_client.storage.from_("breakdown-media").get_public_url(unique_name)
        return public_url

    except Exception as e:
        print(f"\n❌ [ERROR SUPABASE STORAGE]: Fallo al subir {filename}: {str(e)}")
        traceback.print_exc()
        return None