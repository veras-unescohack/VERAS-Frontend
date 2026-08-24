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
Eres un moderador de contenido neutral y preciso para un foro cívico de verificación mediática.
Analiza el comentario del usuario bajo las siguientes reglas estrictas:

1. RECHAZO TOTAL (is_allowed: false):
   - Bloquea cualquier discurso de odio dirigido a grupos o individuos (raza, etnia, religión, género, orientación sexual, nacionalidad).
   - Bloquea amenazas, incitación a la violencia, doxing o ataques personales graves.
   - Proporciona un `rejection_reason` conciso y respetuoso.

2. CENSURA LEVE (is_allowed: true con cleaned_text):
   - Si el comentario expresa un argumento válido pero contiene malas palabras, obscenidades o insultos menores, censura esas palabras específicas con asteriscos (ej. m*****).
   - Si el texto está completamente limpio, `cleaned_text` debe ser idéntico al texto original.

3. Pasos obligatorios:
   - En 'reasoning', detalla textualmente tu veredicto.
   - Si detectas insultos hacia otro usuario o discurso de odio, marca 'is_allowed: false'.
   - Si el mensaje es constructivo pero contiene palabras altisonantes menores, censúralas obligatoriamente en 'cleaned_text' (ej. 'm*****, 'c*****') y marca 'is_allowed: true'.
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
        print(f"\n--- [MODERACIÓN GEMINI] ---")
        print(f"Texto original: {text}")
        print(f"Razonamiento: {result.reasoning}")
        print(f"Permitido: {result.is_allowed}")
        print(f"Texto limpio: {result.cleaned_text}")
        print(f"---------------------------\n")

        return result
    except Exception as e:
        print(f"[ERROR MODERACIÓN]: {str(e)}")
        return CommentModerationSchema(
            reasoning="Fallo en la API, se aplicó fallback seguro.",
            is_allowed=False,
            cleaned_text=text,
            rejection_reason="Fallo en la API, se aplicó fallback seguro."
        )

# Esquema para estructurar el post con Gemini
class PostEnrichmentSchema(BaseModel):
    title: str = Field(description="Título corto, descriptivo y neutral generado a partir del mensaje del usuario.")
    summary: str = Field(description="Descripción u observación objetiva de 1 o 2 oraciones sobre el contenido.")
    tags: List[str] = Field(description="Lista de 3 a 5 tags en minúsculas sobre el mensaje del usuario, los tags deben ser tópicos relacionados a desinformacion mediática.")

FORUM_SYSTEM_INSTRUCTION = """
Analiza el mensaje del usuario para un foro de alfabetización mediática.
Genera un título neutral conciso, un resumen objetivo sin sesgos, sin emitir juicios y 3-5 tags clave (en minúsculas y sin caracteres especiales).
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