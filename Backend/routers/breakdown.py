import os
import uuid
from typing import List, Optional
from pathlib import Path
from dotenv import load_dotenv
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

router = APIRouter(
    prefix='/breakdown',
    tags=['breakdown']
)

dotenv_path = Path(__file__).resolve().parent.parent.parent / '.env'
load_dotenv(dotenv_path=dotenv_path)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Esquema estructurado para alfabetización mediática
class CriticalPoint(BaseModel):
    indicator: str = Field(description="Elemento o técnica observada (ej. 'Lenguaje emocional', 'Falta de fuentes primarias', 'Inconsistencia en metadatos/iluminación').")
    observation: str = Field(description="Explicación neutral de por qué este punto requiere atención o verificación adicional.")

class VerificationAction(BaseModel):
    category: str = Field(description="Categoría de la acción (ej. 'Verificación de fuentes', 'Búsqueda inversa', 'Integridad y privacidad', 'Educación').")
    guideline: str = Field(description="Paso o consejo práctico para el usuario.")

class MediaAnalysisSchema(BaseModel):
    neutral_summary: str = Field(description="Resumen objetivo y desapegado de lo que presenta el contenido, sin adjetivos valorativos.")
    critical_analysis_points: List[CriticalPoint] = Field(description="Puntos clave para que el usuario examine el contenido por su cuenta.")
    educational_insights: str = Field(description="Explicación pedagógica sobre cómo identificar patrones similares en el futuro.")
    recommended_actions: List[VerificationAction] = Field(description="Acciones para corroborar información, proteger la integridad digital o profundizar.")

# Respuesta enviada al Frontend
class BreakdownResponse(BaseModel):
    request_id: str
    prompt_received: str
    neutral_summary: str
    critical_analysis_points: List[CriticalPoint]
    educational_insights: str
    recommended_actions: List[VerificationAction]
    has_media: bool

SYSTEM_INSTRUCTION = """
Eres un especialista neutro en alfabetización mediática, análisis crítico de contenido y verificación de datos.
Tu función es educar y equipar al usuario con herramientas de pensamiento crítico para inspeccionar contenidos informativos y multimedia, previniendo la desinformación.

Reglas estrictas de comportamiento:
1. Mantén un tono formal, analítico y estrictamente objetivo. No uses lenguaje emotivo, alarmista ni sarcástico.
2. NO emitas un veredicto definitivo de 'verdad' o 'mentira' ni sentencies si fue generado por IA salvo que existan anomalías técnicas evidentes e irrefutables. En lugar de juzgar, enseña qué indicios observar.
3. Desglosa los elementos que ameritan comprobación: sesgos de urgencia, citas sin atribución, posibles artefactos visuales, contexto ausente o apelaciones al miedo/ira.
4. Proporciona recomendaciones accionables de verificación (ej. consultas en motores de búsqueda especializada, búsqueda inversa de imágenes, sitios oficiales de fact-checking) y medidas de autocuidado digital.
"""

@router.post("/", response_model=BreakdownResponse)
async def process_breakdown(
    prompt: str = Form(...),
    file: Optional[UploadFile] = File(None)
):
    req_id = str(uuid.uuid4())
    contents = [prompt]
    has_media = False

    if file:
        allowed_types = ["image/jpeg", "image/png", "application/pdf"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Formato no soportado: {file.content_type}. Use JPG, PNG o PDF."
            )
        
        file_bytes = await file.read()
        contents.append(
            types.Part.from_bytes(
                data=file_bytes,
                mime_type=file.content_type
            )
        )
        has_media = True

    try:
        # Configuración explícita sin tools/AFC para evitar warnings
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=MediaAnalysisSchema,
            system_instruction=SYSTEM_INSTRUCTION,
            temperature=0.2, # Baja temperatura para máxima consistencia y objetividad
        )

        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=contents,
            config=config,
        )
        
        parsed_data = MediaAnalysisSchema.model_validate_json(response.text)
        
        return BreakdownResponse(
            request_id=req_id,
            prompt_received=prompt,
            neutral_summary=parsed_data.neutral_summary,
            critical_analysis_points=parsed_data.critical_analysis_points,
            educational_insights=parsed_data.educational_insights,
            recommended_actions=parsed_data.recommended_actions,
            has_media=has_media
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en el análisis de verificación: {str(e)}"
        )