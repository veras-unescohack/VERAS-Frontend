from fastapi import Request, Header, HTTPException
from qstash import Receiver

receiver = Receiver(
    current_signing_key=os.getenv("QSTASH_CURRENT_SIGNING_KEY"),
    next_signing_key=os.getenv("QSTASH_NEXT_SIGNING_KEY")
)

@router.post("/api/internal/process-gemini")
async def process_gemini_webhook(
    request: Request,
    upstash_signature: str = Header(None, alias="upstash-signature")
):
    body_bytes = await request.body()
    
    # Validar que la petición venga legítimamente de QStash
    try:
        receiver.verify(
            signature=upstash_signature,
            body=body_bytes.decode("utf-8"),
            url=str(request.url)
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Firma de QStash inválida")

    data = await request.json()
    post_id = data.get("post_id")

    # 1. Obtener documento original de MongoDB
    post = await db.posts.find_one({"_id": ObjectId(post_id)})
    if not post or post.get("status") == "completed":
        return {"status": "already_processed"}

    try:
        # 2. Ejecutar llamada a Gemini
        enrichment = await generate_gemini_enrichment(post["raw_content"])
        
        # 3. Actualizar MongoDB a 'completed'
        await db.posts.update_one(
            {"_id": ObjectId(post_id)},
            {"$set": {
                "title": enrichment.title,
                "summary": enrichment.summary,
                "tags": enrichment.tags,
                "status": "completed"
            }}
        )
        return {"status": "ok"}
    except Exception as e:
        # Si lanzas un error 500, QStash sabrá que falló y reintentará más tarde
        raise HTTPException(status_code=500, detail=str(e))