import os
import uuid
from typing import List, Optional
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

dotenv_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=dotenv_path)

app = FastAPI(title="Hackathon AI Breakdown API")

# Configurar CORS (ajustar orígenes en producción)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar cliente de Google GenAI
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Esquema para respuesta estructurada de Gemini
class GeminiBreakdownSchema(BaseModel):
    summary: str = Field(description="Resumen conciso y claro de la entrada del usuario.")
    recommended_actions: List[str] = Field(description="Lista de acciones o pasos recomendados basados en el contexto.")

# Esquema de respuesta final de FastAPI
class BreakdownResponse(BaseModel):
    request_id: str
    prompt_received: str
    summary: str
    recommended_actions: List[str]
    has_media: bool

@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    return {"status": "ok", "service": "ready"}

@app.post("/breakdown", response_model=BreakdownResponse)
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
        # Llamada estructurada a Gemini 2.5 Flash
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=GeminiBreakdownSchema,
                system_instruction="Analiza el texto y archivos provistos. Genera un resumen y una lista de acciones clave."
            ),
        )
        
        parsed_data = GeminiBreakdownSchema.model_validate_json(response.text)
        
        return BreakdownResponse(
            request_id=req_id,
            prompt_received=prompt,
            summary=parsed_data.summary,
            recommended_actions=parsed_data.recommended_actions,
            has_media=has_media
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error procesando con Gemini: {str(e)}"
        )