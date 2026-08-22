from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from routers.breakdown import router as breakdown_router
from routers.forum import router as forum_router

app = FastAPI(title="VERAS API")
app.include_router(breakdown_router)
app.include_router(forum_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    return {"status": "ok", "service": "ready"}