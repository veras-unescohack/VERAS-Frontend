import uuid

from datetime import datetime
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status, Request, Depends
from pydantic import BaseModel, Field
from typing import List, Optional

from service.database import get_database
from service.gemini import analyze_media_content, CriticalPoint, VerificationAction
from service.ratelimit import check_rate_limit
from routers.auth import get_current_user

router = APIRouter(
    prefix='/breakdown',
    tags=['Breakdown']
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

@router.post("/", response_model=BreakdownResponse)
async def process_breakdown(
    request: Request,
    prompt: str = Form(..., max_length=5000),
    is_public: bool = Form(False),
    file: Optional[UploadFile] = File(None)
):
    try:
        check_rate_limit(request, action_name="breakdown", max_requests=3, window_seconds=300)

        file_bytes, mime_type, has_media = None, None, False
        if file:
            file_bytes = await file.read()
            mime_type = file.content_type
            has_media = True

        analysis = analyze_media_content(prompt=prompt, file_bytes=file_bytes, mime_type=mime_type)

    except HTTPException:
        raise # pasar error

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    # Identificar si hay usuario autenticado opcional
    author = "anonymous"
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            import jwt, os
            token = auth_header.split(" ")[1]
            payload = jwt.decode(token, os.getenv("JWT_SECRET", "hackathon_secret_key_change_in_prod"), algorithms=["HS256"])
            author = payload.get("sub", "anonymous")
        except Exception:
            pass

    db = get_database()
    doc = {
        "prompt_received": prompt,
        "neutral_summary": analysis.neutral_summary,
        "critical_analysis_points": [p.model_dump() for p in analysis.critical_analysis_points],
        "educational_insights": analysis.educational_insights,
        "recommended_actions": [a.model_dump() for a in analysis.recommended_actions],
        "has_media": has_media,
        "author": author,
        "is_public": True,
        "created_at": datetime.utcnow()
    }
    result = await db.breakdowns.insert_one(doc)

    return BreakdownResponse(
        request_id=str(result.inserted_id),
        prompt_received=prompt,
        neutral_summary=analysis.neutral_summary,
        critical_analysis_points=analysis.critical_analysis_points,
        educational_insights=analysis.educational_insights,
        recommended_actions=analysis.recommended_actions,
        has_media=has_media,
        author=author
    )

@router.get("/global")
async def get_global_breakdowns():
    db = get_database()
    cursor = db.breakdowns.find({"is_public": True}).sort("created_at", -1).limit(6)
    items = await cursor.to_list(length=6)
    return [
        {
            "id": str(b["_id"]),
            "prompt_received": b["prompt_received"],
            "neutral_summary": b["neutral_summary"],
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
            "prompt_received": b["prompt_received"],
            "neutral_summary": b["neutral_summary"],
            "created_at": b.get("created_at", datetime.utcnow()).isoformat()
        }
        for b in items
    ]