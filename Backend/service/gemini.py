import os
from pathlib import Path
from dotenv import load_dotenv

from google import genai
from google.genai import types

from typing import List, Optional
from pydantic import BaseModel, Field

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

SYSTEM_INSTRUCTION = """
Eres un especialista neutro en alfabetización mediática, análisis crítico de contenido y verificación de datos.
Tu función es educar y equipar al usuario con herramientas de pensamiento crítico para inspeccionar contenidos informativos y multimedia, previniendo la desinformación.

Reglas estrictas de comportamiento:
1. Mantén un tono formal, analítico y estrictamente objetivo. No uses lenguaje emotivo, alarmista ni sarcástico.
2. NO emitas un veredicto definitivo de 'verdad' o 'mentira' ni sentencies si fue generado por IA salvo que existan anomalías técnicas evidentes e irrefutables. En lugar de juzgar, enseña qué indicios observar.
3. Desglosa los elementos que ameritan comprobación: sesgos de urgencia, citas sin atribución, posibles artefactos visuales, contexto ausente o apelaciones al miedo/ira.
4. Proporciona recomendaciones accionables de verificación (ej. consultas en motores de búsqueda especializada, búsqueda inversa de imágenes, sitios oficiales de fact-checking) y medidas de autocuidado digital.
"""

def analyze_media_content(prompt: str, file_bytes: Optional[bytes] = None, mime_type: Optional[str] = None) -> MediaAnalysisSchema:
    """
    Envía el prompt y el archivo multimedia opcional a Gemini 2.5 Flash
    y devuelve la estructura validada según MediaAnalysisSchema.
    """
    contents = [prompt]

    if file_bytes and mime_type:
        contents.append(
            types.Part.from_bytes(
                data=file_bytes,
                mime_type=mime_type
            )
        )

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=MediaAnalysisSchema,
        system_instruction=SYSTEM_INSTRUCTION,
        temperature=0.2
    )

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=contents,
        config=config
    )

    return MediaAnalysisSchema.model_validate_json(response.text)

# Esquema para estructurar el post con Gemini
class PostEnrichmentSchema(BaseModel):
    title: str = Field(description="Título corto, descriptivo y neutral generado a partir del mensaje del usuario.")
    summary: str = Field(description="Descripción u observación objetiva de 1 o 2 oraciones sobre el contenido.")
    tags: List[str] = Field(description="Lista de 3 a 5 tags en minúsculas sobre el mensaje del usuario, los tags deben ser tópicos relacionados a desinformacion mediática.")

FORUM_SYSTEM_INSTRUCTION = """
Analiza el mensaje del usuario para un foro de alfabetización mediática.
Genera un título neutral conciso, un resumen objetivo sin sesgos, sin emitir juicios y 3-5 tags clave (en minúsculas, sin almohadillas # y sin caracteres especiales).
"""

def enrich_forum_post(content: str) -> PostEnrichmentSchema:
    """Genera automáticamente título, resumen y tags a partir del contenido de un post."""

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=PostEnrichmentSchema,
        system_instruction=FORUM_SYSTEM_INSTRUCTION,
        temperature=0.2
    )
    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=[content],
        config=config
    )
    return PostEnrichmentSchema.model_validate_json(response.text)