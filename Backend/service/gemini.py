import os
from pathlib import Path
from dotenv import load_dotenv

from google import genai
from google.genai import types

from typing import List, Optional
from pydantic import BaseModel, Field

from service.gemini_tools import (
    extract_safe_url_metadata, 
    search_relevant_forum_threads, 
    civic_entity_router
)

dotenv_path = Path(__file__).resolve().parent.parent.parent / '.env'
load_dotenv(dotenv_path=dotenv_path)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Esquema estructurado para alfabetización mediática
class CriticalPoint(BaseModel):
    indicator: str = Field(description="Elemento o técnica observada (ej. 'Lenguaje emocional', 'Falta de fuentes primarias').")
    observation: str = Field(description="Explicación neutral de por qué este punto requiere atención o verificación adicional.")

class VerificationAction(BaseModel):
    category: str = Field(description="Categoría de la acción (ej. 'Verificación de fuentes', 'Búsqueda inversa', 'Integridad y privacidad', 'Educación').")
    guideline: str = Field(description="Paso o consejo práctico para el usuario.")

class MediaAnalysisSchema(BaseModel):
    neutral_summary: str = Field(description="Resumen objetivo y desapegado de lo que presenta el contenido, sin adjetivos valorativos.")
    critical_analysis_points: List[CriticalPoint] = Field(description="Puntos clave para que el usuario examine el contenido por su cuenta.")
    educational_insights: str = Field(description="Explicación pedagógica sobre cómo identificar patrones similares en el futuro.")
    recommended_actions: List[VerificationAction] = Field(description="Acciones para corroborar información, proteger la integridad digital o profundizar.")

BREAKDOWN_SYSTEM_INSTRUCTION = """
Eres VERAS un especialista neutro en alfabetización mediática, análisis crítico de contenido y verificación de datos.
Tu función es educar y equipar al usuario con herramientas de pensamiento crítico para inspeccionar contenidos informativos y multimedia, previniendo la desinformación.

Reglas estrictas:
1. IDIOMA DE RESPUESTA: Detecta el idioma principal del contenido analizado (español, inglés, etc.) y genera TODO el JSON de respuesta (resumen, puntos críticos, insights y acciones) EN ESE MISMO IDIOMA EXACTO.
2. Mantén un tono formal, analítico y estrictamente objetivo.
3. NO emitas un veredicto definitivo de 'verdad' o 'mentira' ni sentencies si fue generado por IA salvo que existan anomalías técnicas evidentes. En lugar de juzgar, enseña qué indicios observar.
4. Desglosa elementos a comprobar: sesgos de urgencia, citas sin atribución, posibles artefactos visuales, contexto ausente o apelaciones emocionales.
5. Proporciona recomendaciones accionables de verificación y medidas de autocuidado digital.
6. Siempre responde con el JSON Schema

Definicion de funciones:
1. Si el usuario provee un link web llama a 'extract_safe_url_metadata' para verificar la fuente.
2. Si el case involucra crimenes cibernéticos, estafas, o emergencias de salud mental llama a 'civic_entity_router'.
3. Llama a 'search_relevant_forum_threads' para encontrar discusiones existentes de apoyo.
"""

def analyze_media_content(prompt: str, file_bytes: Optional[bytes] = None, mime_type: Optional[str] = None) -> MediaAnalysisSchema:
    """
    Envía el prompt y el archivo multimedia opcional a Gemini
    y devuelve la estructura validada según MediaAnalysisSchema.
    """
    tools = [
        extract_safe_url_metadata,
        search_relevant_forum_threads,
        civic_entity_router
    ]

    contents = [prompt]

    if file_bytes and mime_type:
        contents.append(
            types.Part.from_bytes(
                data=file_bytes,
                mime_type=mime_type
            )
        )

    try:
        config = types.GenerateContentConfig(
            system_instruction=BREAKDOWN_SYSTEM_INSTRUCTION,
            tools=tools,
            temperature=0.2,
            response_mime_type="application/json",
            response_schema=MediaAnalysisSchema
        )

        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=contents,
            config=config
        )

        return MediaAnalysisSchema.model_validate_json(response.text)
    except Exception as e:
        raise RuntimeError(f"GEMINI Error: {str(e)}") from e

# Esquema para moderación de comentarios
class CommentModerationSchema(BaseModel):
    reasoning: str = Field(
        description="Paso a paso del análisis: enumera las palabras explícitas, insultos o patrones detectados y explica por qué se permite o bloquea."
    )
    is_allowed: bool = Field(
        description="Falso si contiene discurso de odio, discriminación, incitación a la violencia o acoso grave."
    )
    rejection_reason: Optional[str] = Field(
        default=None, 
        description="Motivo pedagógico breve en caso de ser bloqueado."
    )
    cleaned_text: str = Field(
        description="El texto original con malas palabras o groserías leves reemplazadas por asteriscos (ej. p***). Si no hay groserías, se mantiene intacto."
    )

COMMENT_MODERATION_INSTRUCTION = """
Eres un moderador estricto para una comunidad cívica contra la desinformación.
Reglas estrictas:
1. IDIOMA: Analiza y censura en el idioma del comentario. El 'reasoning' debe redactarse en inglés y 'rejection_reason' deben redactarse en el mismo idioma en que está escrito el comentario del usuario.
2. RECHAZO TOTAL (is_allowed: false): Bloquea discurso de odio, discriminación, acoso grave o amenazas.
3. CENSURA (cleaned_text): Si hay insultos menores u obscenidades, reemplázalos por asteriscos (ej. p***, f***, s***) respetando el idioma original.
"""

def moderate_comment(text: str) -> CommentModerationSchema:
    """Modera y sanitiza el comentario de un usuario con Gemini 2.5 Flash."""
    try:
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=CommentModerationSchema,
            system_instruction=COMMENT_MODERATION_INSTRUCTION,
            temperature=0.1
        )
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=[text],
            config=config
        )
        result = CommentModerationSchema.model_validate_json(response.text)
        print(f"[GEMINI] Razonamiento: {result.reasoning}")

        return result
    except Exception as e:
        raise RuntimeError(f"GEMINI Error: {str(e)}") from e

# Esquema para estructurar el post con Gemini
class PostEnrichmentSchema(BaseModel):
    title: str = Field(description="Título corto, descriptivo y neutral generado a partir del mensaje del usuario.")
    summary: str = Field(description="Descripción u observación objetiva de 1 o 2 oraciones sobre el contenido.")
    tags: List[str] = Field(description="Lista de 3 a 5 tags en minúsculas, en inglés sobre el mensaje del usuario, los tags deben ser tópicos relacionados a desinformacion mediática.")

FORUM_SYSTEM_INSTRUCTION = """
Analiza el mensaje del usuario para un foro de discusión y alfabetización mediática.
Reglas estrictas:
1. IDIOMA: Genera el título y resumen estrictamente en el MISMO IDIOMA en que está escrito el contenido original del usuario. Los tags siempre se escriben en INGLÉS.
2. Genera un título conciso y neutral, un resumen objetivo sin sesgos y una lista de 3 a 5 tags en minúsculas y sin caracteres especiales.
"""

def enrich_forum_post(content: str) -> PostEnrichmentSchema:
    """Genera automáticamente título, resumen y tags a partir del contenido de un post."""

    try:
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
    except Exception as e:
        raise RuntimeError(f"GEMINI Error: {str(e)}") from e