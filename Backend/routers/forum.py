from datetime import datetime
from typing import List, Optional
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from service.database import get_database

router = APIRouter(prefix="/forum", tags=["Forum"])

# Helpers para serializar ObjectId
def post_serializer(post) -> dict:
    return {
        "id": str(post["_id"]),
        "title": post["title"],
        "author": post["author"],
        "summary": post["summary"],
        "category": post.get("category", "General"),
        "tags": post.get("tags", []),
        "comments_count": len(post.get("comments", [])),
        "created_at": post.get("created_at", datetime.utcnow()).isoformat(),
    }

def post_detail_serializer(post) -> dict:
    serialized = post_serializer(post)
    serialized["content"] = post.get("content", "")
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

# Schemas
class CreateCommentDto(BaseModel):
    author: str = Field(..., min_length=2, max_length=50)
    text: str = Field(..., min_length=1, max_length=1000)

class CreatePostDto(BaseModel):
    title: str = Field(..., min_length=5, max_length=150)
    author: str = Field(..., min_length=2, max_length=50)
    summary: str = Field(..., min_length=10, max_length=250)
    content: str = Field(..., min_length=10)
    category: str = Field(default="General")
    tags: List[str] = Field(default_factory=list)

# Endpoints
@router.get("/posts")
async def list_posts(
    tag: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50)
):
    db = get_database()
    query = {}

    if tag:
        query["tags"] = {"$in": [tag.strip().lower()]}
    if category and category != "Todas":
        query["category"] = category
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
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
async def create_post(payload: CreatePostDto):
    db = get_database()
    cleaned_tags = [t.strip().lower() for t in payload.tags if t.strip()]
    doc = {
        "title": payload.title,
        "author": payload.author,
        "summary": payload.summary,
        "content": payload.content,
        "category": payload.category,
        "tags": cleaned_tags,
        "comments": [],
        "created_at": datetime.utcnow()
    }
    result = await db.posts.insert_one(doc)
    doc["_id"] = result.inserted_id
    return post_detail_serializer(doc)

@router.get("/posts/{post_id}")
async def get_post(post_id: str):
    db = get_database()
    if not ObjectId.is_valid(post_id):
        raise HTTPException(status_code=400, detail="ID no válido")
    post = await db.posts.find_one({"_id": ObjectId(post_id)})
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    return post_detail_serializer(post)

@router.post("/posts/{post_id}/comments", status_code=status.HTTP_201_CREATED)
async def add_comment(post_id: str, payload: CreateCommentDto):
    db = get_database()
    if not ObjectId.is_valid(post_id):
        raise HTTPException(status_code=400, detail="ID no válido")
    
    comment_data = {
        "_id": ObjectId(),
        "author": payload.author,
        "text": payload.text,
        "created_at": datetime.utcnow()
    }
    result = await db.posts.update_one(
        {"_id": ObjectId(post_id)},
        {"$push": {"comments": comment_data}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    
    return {
        "id": str(comment_data["_id"]),
        "author": comment_data["author"],
        "text": comment_data["text"],
        "created_at": comment_data["created_at"].isoformat()
    }