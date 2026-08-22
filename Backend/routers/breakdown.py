import uuid

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from typing import List, Optional

from service.gemini import analyze_media_content, CriticalPoint, VerificationAction

router = APIRouter(
    prefix='/breakdown',
    tags=['breakdown']
)

# Respuesta enviada al Frontend
class BreakdownResponse(BaseModel):
    request_id: str
    prompt_received: str
    neutral_summary: str
    critical_analysis_points: List[CriticalPoint]
    educational_insights: str
    recommended_actions: List[VerificationAction]
    has_media: bool

@router.post("/", response_model=BreakdownResponse)
async def process_breakdown(
    prompt: str = Form(...),
    file: Optional[UploadFile] = File(None)
):
    req_id = str(uuid.uuid4())
    file_bytes = None
    mime_type = None
    has_media = False

    if file:
        allowed_types = ["image/jpeg", "image/png", "application/pdf"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Formato no soportado: {file.content_type}. Use JPG, PNG o PDF."
            )
        file_bytes = await file.read()
        mime_type = file.content_type
        has_media = True

    try:
        analysis = analyze_media_content(
            prompt=prompt,
            file_bytes=file_bytes,
            mime_type=mime_type
        )

        return BreakdownResponse(
            request_id=req_id,
            prompt_received=prompt,
            neutral_summary=analysis.neutral_summary,
            critical_analysis_points=analysis.critical_analysis_points,
            educational_insights=analysis.educational_insights,
            recommended_actions=analysis.recommended_actions,
            has_media=has_media
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en el servicio de análisis: {str(e)}"
        )