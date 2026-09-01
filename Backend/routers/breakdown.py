import os
import uuid
import httpx

from bson import ObjectId
from datetime import datetime
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status, Request, Depends, Header
from pydantic import BaseModel, Field
from typing import List, Optional
from qstash import QStash, Receiver

from service.storage_service import upload_media_to_supabase
from service.database import get_database
from service.gemini import analyze_media_content, CriticalPoint, VerificationAction
from service.ratelimit import check_rate_limit
from routers.auth import get_current_user

router = APIRouter(
    prefix='/breakdown',
    tags=['Breakdown']
)

QSTASH_TOKEN = os.getenv("QSTASH_TOKEN")
BACKEND_PUBLIC_URL = os.getenv("BACKEND_PUBLIC_URL", "").rstrip("/")

qstash_client = QStash(QSTASH_TOKEN) if QSTASH_TOKEN else None
receiver = Receiver(
    current_signing_key=os.getenv("QSTASH_CURRENT_SIGNING_KEY", ""),
    next_signing_key=os.getenv("QSTASH_NEXT_SIGNING_KEY", "")
)

MAX_FILE_SIZE_BYTES = 6 * 1024 * 1024  # 6 M

# Respuesta enviada al Frontend
class BreakdownResponse(BaseModel):
    request_id: str
    prompt_received: str
    neutral_summary: str
    critical_analysis_points: list[CriticalPoint]
    educational_insights: str
    recommended_actions: list[VerificationAction]
    has_media: bool
    created_at: Optional[str] = None
    author: Optional[str] = None

@router.post("/", status_code=status.HTTP_202_ACCEPTED)
async def process_breakdown(
    request: Request,
    prompt: str = Form(..., max_length=5000),
    is_public: bool = Form(False),
    file: Optional[UploadFile] = File(None),
    current_user: str = Depends(get_current_user)
):
    try:
        check_rate_limit(request, action_name="breakdown", max_requests=3, window_seconds=300)

        file_bytes, mime_type, has_media = None, None, False
        if file:
            file_bytes = await file.read()
            mime_type = file.content_type
            has_media = True

            # upload a S3 asincrono
            media_url = upload_media_to_supabase(
                file_bytes=file_bytes,
                filename=file.filename or "media.jpg",
                mime_type=mime_type
            )

        # analysis = analyze_media_content(prompt=prompt, file_bytes=file_bytes, mime_type=mime_type)

    except HTTPException:
        raise # pasar error

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

    db = get_database()
    doc = {
        "prompt_received": prompt,
        "status": "processing",
        # "neutral_summary": analysis.neutral_summary,
        # "critical_analysis_points": [p.model_dump() for p in analysis.critical_analysis_points],
        # "educational_insights": analysis.educational_insights,
        # "recommended_actions": [a.model_dump() for a in analysis.recommended_actions],
        "has_media": has_media,
        "media_url": media_url,
        "mime_type": mime_type,
        "author": current_user,
        "is_public": is_public,
        "created_at": datetime.utcnow()
    }
    result = await db.breakdowns.insert_one(doc)
    breakdown_id = str(result.inserted_id)

    # Publicar tarea a QStash
    if qstash_client and BACKEND_PUBLIC_URL:
        webhook_target = f"{BACKEND_PUBLIC_URL}/breakdown/api/internal/process-breakdown"
        qstash_client.message.publish_json(
            url=webhook_target,
            body={"breakdown_id": breakdown_id},
            retries=3
        )
    else:
        # Fallback de emergencia en ejecución directa si QStash no estuviera configurado
        pass

    return {
        "request_id": breakdown_id,
        "status": "processing",
        "message": "Solicitud encolada exitosamente."
    }

@router.post("/api/internal/process-breakdown")
async def process_breakdown_webhook(
    request: Request,
    upstash_signature: Optional[str] = Header(None, alias="upstash-signature")
):
    body_bytes = await request.body()
    body_str = body_bytes.decode("utf-8")

    # Validar firma criptográfica de QStash
    if os.getenv("QSTASH_CURRENT_SIGNING_KEY"):
        try:
            receiver.verify(
                body=body_str,
                signature=upstash_signature or "",
                url=str(request.url)
            )
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Firma de QStash no válida: {str(e)}")

    data = await request.json()
    breakdown_id = data.get("breakdown_id")
    if not breakdown_id or not ObjectId.is_valid(breakdown_id):
        return {"status": "invalid_id"}

    db = get_database()
    doc = await db.breakdowns.find_one({"_id": ObjectId(breakdown_id)})
    if not doc or doc.get("status") == "completed":
        return {"status": "already_processed"}

    file_bytes = None
    # Si incluye imagen/PDF, la descargamos desde la URL pública de Supabase
    if doc.get("has_media") and doc.get("media_url"):
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(doc["media_url"])
                if res.status_code == 200:
                    file_bytes = res.content
        except Exception as err:
            print(f"⚠️ No se pudo descargar el archivo para el análisis: {err}")

    try:
        # Llamada a Gemini con retry interno
        analysis = analyze_media_content(
            prompt=doc["prompt_received"],
            file_bytes=file_bytes,
            mime_type=doc.get("mime_type")
        )

        # Actualizar en MongoDB a 'completed'
        await db.breakdowns.update_one(
            {"_id": ObjectId(breakdown_id)},
            {"$set": {
                "neutral_summary": analysis.neutral_summary,
                "critical_analysis_points": [p.model_dump() for p in analysis.critical_analysis_points],
                "educational_insights": analysis.educational_insights,
                "recommended_actions": [a.model_dump() for a in analysis.recommended_actions],
                "status": "completed",
                "completed_at": datetime.utcnow()
            }}
        )
        return {"status": "success"}

    except Exception as e:
        # Al arrojar 500, QStash reconoce el fallo y reintenta según su política de backoff
        await db.breakdowns.update_one(
            {"_id": ObjectId(breakdown_id)},
            {"$set": {"last_error": str(e)}}
        )
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/global")
async def get_global_breakdowns():
    db = get_database()
    cursor = db.breakdowns.find({"is_public": True}).sort("created_at", -1).limit(6)
    items = await cursor.to_list(length=6)
    return [
        {
            "id": str(b["_id"]),
            "status": b.get("status", "completed"),
            "prompt_received": b["prompt_received"],
            "neutral_summary": b.get(
                "neutral_summary",
                "Análisis en proceso con IA..." if b.get("status") == "processing" else "Resumen no disponible"
            ),
            "media_url": b.get("media_url"),
            "educational_insights": b.get("educational_insights", ""),
            "author": b.get("author", "anónimo"),
            "created_at": b.get("created_at", datetime.utcnow()).isoformat()
        }
        for b in items
    ]

@router.get("/my-breakdowns")
async def get_my_breakdowns(current_user: str = Depends(get_current_user)):
    db = get_database()
    cursor = db.breakdowns.find({"author": current_user}).sort("created_at", -1).limit(20)
    items = await cursor.to_list(length=20)

    return [
        {
            "id": str(b["_id"]),
            "status": b.get("status", "completed"),
            "prompt_received": b.get("prompt_received", ""),
            "neutral_summary": b.get(
                "neutral_summary",
                "Análisis en proceso con IA..." if b.get("status") == "processing" else "Resumen no disponible"
            ),
            "media_url": b.get("media_url"),
            "author": b.get("author", "anonymous"),
            "created_at": (
                b["created_at"].isoformat() 
                if isinstance(b.get("created_at"), datetime) 
                else datetime.utcnow().isoformat()
            )
        }
        for b in items
    ]

# 3. ENDPOINT DE CONSULTA DE ESTADO
@router.get("/{breakdown_id}")
async def get_breakdown_status(breakdown_id: str):
    if not ObjectId.is_valid(breakdown_id):
        raise HTTPException(status_code=400, detail="ID no válido")

    db = get_database()
    doc = await db.breakdowns.find_one({"_id": ObjectId(breakdown_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Análisis no encontrado")

    return {
        "request_id": str(doc["_id"]),
        "status": doc.get("status", "completed"),
        "prompt_received": doc.get("prompt_received"),
        "neutral_summary": doc.get("neutral_summary"),
        "critical_analysis_points": doc.get("critical_analysis_points", []),
        "educational_insights": doc.get("educational_insights"),
        "recommended_actions": doc.get("recommended_actions", []),
        "media_url": doc.get("media_url"),
        "author": doc.get("author", "anonymous"),
        "created_at": doc.get("created_at", datetime.utcnow()).isoformat()
    }