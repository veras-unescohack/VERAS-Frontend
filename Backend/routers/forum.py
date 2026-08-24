from datetime import datetime
from typing import List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from pydantic import BaseModel, Field
from service.database import get_database
from service.gemini import enrich_forum_post
from service.gemini import moderate_comment
from routers.auth import get_current_user
from service.ratelimit import check_rate_limit

router = APIRouter(prefix="/forum", tags=["Forum"])

# Serializadores
def post_serializer(post) -> dict:
    return {
        "id": str(post["_id"]),
        "title": post.get("title", "Sin título"),
        "author": post["author"],
        "summary": post.get("summary", ""),
        "tags": post.get("tags", []),
        "comments_count": len(post.get("comments", [])),
        "created_at": post.get("created_at", datetime.utcnow()).isoformat(),
    }

def post_detail_serializer(post) -> dict:
    serialized = post_serializer(post)
    serialized["content"] = post.get("content", "")
    serialized["upvotes"] = post.get("upvotes", 0)
    serialized["comments"] = [
        {
            "id": str(c.get("_id", ObjectId())),
            "author": c["author"],
            "text": c["text"],
            "created_at": c.get("created_at", datetime.utcnow()).isoformat()
        }
        for c in post.get("comments", [])
    ]
    return serialized

# Schemas de Entrada
class CreatePostDto(BaseModel):
    content: str = Field(..., min_length=10)

class CreateCommentDto(BaseModel):
    text: str = Field(..., min_length=10, max_length=1000)

# Endpoints
@router.get("/posts")
async def list_posts(
    tag: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50)
):
    db = get_database()
    query = {}

    if tag:
        query["tags"] = {"$in": [tag.strip().lower()]}
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"summary": {"$regex": search, "$options": "i"}},
            {"tags": {"$in": [search.strip().lower()]}}
        ]

    skip = (page - 1) * limit
    total_posts = await db.posts.count_documents(query)
    cursor = db.posts.find(query).sort("created_at", -1).skip(skip).limit(limit)
    posts = await cursor.to_list(length=limit)

    return {
        "posts": [post_serializer(p) for p in posts],
        "page": page,
        "limit": limit,
        "total": total_posts,
        "has_next": (skip + limit) < total_posts
    }

@router.post("/posts", status_code=status.HTTP_201_CREATED)
async def create_post(
    request: Request,
    payload: CreatePostDto,
    current_user: str = Depends(get_current_user)
):
    try:
        check_rate_limit(request, action_name="forum_post", max_requests=3, window_seconds=300)

        enriched = enrich_forum_post(payload.content)
        cleaned_tags = [t.strip().lower().replace("#", "") for t in enriched.tags if t.strip()]

        db = get_database()
        doc = {
            "author": current_user,
            "content": payload.content,
            "title": enriched.title,
            "summary": enriched.summary,
            "tags": cleaned_tags,
            "upvotes": 0,
            "comments": [],
            "created_at": datetime.utcnow()
        }
        result = await db.posts.insert_one(doc)
        doc["_id"] = result.inserted_id

        return post_detail_serializer(doc)

    except HTTPException:
        raise # pasar error

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error: {str(e)}"
        )

@router.get("/posts/{post_id}")
async def get_post(post_id: str):
    db = get_database()
    if not ObjectId.is_valid(post_id):
        raise HTTPException(status_code=400, detail="ID no válido")
    post = await db.posts.find_one({"_id": ObjectId(post_id)})
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    return post_detail_serializer(post)

@router.post("/posts/{post_id}/upvote")
async def upvote_post(post_id: str):
    db = get_database()
    if not ObjectId.is_valid(post_id):
        raise HTTPException(status_code=400, detail="ID no válido")
    
    result = await db.posts.find_one_and_update(
        {"_id": ObjectId(post_id)},
        {"$inc": {"upvotes": 1}},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    
    return {"upvotes": result.get("upvotes", 0)}

@router.post("/posts/{post_id}/comments", status_code=status.HTTP_201_CREATED)
async def add_comment(
    request: Request,
    post_id: str,
    payload: CreateCommentDto,
    current_user: str = Depends(get_current_user)
):
    try:
        check_rate_limit(request, action_name="forum_comment", max_requests=3, window_seconds=300)

        if not ObjectId.is_valid(post_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid post ID")
        
        moderation = moderate_comment(payload.text)
        if not moderation.is_allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=moderation.rejection_reason or "Your comment breaks the community rules"
            )

        db = get_database()
        comment_data = {
            "_id": ObjectId(),
            "author": current_user,
            "text": moderation.cleaned_text,
            "created_at": datetime.utcnow()
        }
        result = await db.posts.update_one(
            {"_id": ObjectId(post_id)},
            {"$push": {"comments": comment_data}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
        
        return {
            "id": str(comment_data["_id"]),
            "author": comment_data["author"],
            "text": comment_data["text"],
            "created_at": comment_data["created_at"].isoformat()
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=moderation.rejection_reason or "Tu comentario infringe las normas de la comunidad sobre discurso de odio o acoso."
        )                

@router.post("/posts/{post_id}/bookmark")
async def toggle_bookmark(post_id: str, current_user: str = Depends(get_current_user)):
    db = get_database()
    user = await db.users.find_one({"username": current_user})
    saved = user.get("saved_posts", [])
    
    if post_id in saved:
        await db.users.update_one({"username": current_user}, {"$pull": {"saved_posts": post_id}})
        return {"saved": False}
    else:
        await db.users.update_one({"username": current_user}, {"$addToSet": {"saved_posts": post_id}})
        return {"saved": True}

@router.get("/saved-posts")
async def get_saved_posts(current_user: str = Depends(get_current_user)):
    db = get_database()
    user = await db.users.find_one({"username": current_user})
    saved_ids = user.get("saved_posts", [])
    
    obj_ids = [ObjectId(pid) for pid in saved_ids if ObjectId.is_valid(pid)]
    posts = await db.posts.find({"_id": {"$in": obj_ids}}).to_list(length=50)
    return [post_serializer(p) for p in posts]