import os
import bcrypt
import jwt
from datetime import datetime, timedelta
from typing import Optional 
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from service.database import get_database

router = APIRouter(prefix="/auth", tags=["Auth"])

# Configuración de JWT y Hashing
SECRET_KEY = os.getenv("JWT_SECRET", "hackathon_secret_key_change_in_prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

security = HTTPBearer()

def hash_password(password: str) -> str:
    # bcrypt nativo requiere bytes
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    pwd_bytes = plain_password.encode('utf-8')
    hash_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(pwd_bytes, hash_bytes)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sesión inválida o expirada",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    db = get_database()
    user = await db.users.find_one({"username": username})
    if user is None:
        raise credentials_exception
    return username

# Schemas
class AuthDto(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    password: str = Field(..., min_length=4)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str

# Endpoints
@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: AuthDto):
    db = get_database()
    clean_username = payload.username.strip().lower()

    existing_user = await db.users.find_one({"username": clean_username})
    if existing_user:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está registrado.")

    try:
        hashed = hash_password(payload.password)
        doc = {
            "username": clean_username,
            "password": hashed,
            "created_at": datetime.utcnow()
        }
        await db.users.insert_one(doc)

        token = create_access_token(data={"sub": clean_username})
        return TokenResponse(access_token=token, username=clean_username)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creando usuario: {str(e)}"
        )

@router.post("/login", response_model=TokenResponse)
async def login(payload: AuthDto):
    db = get_database()
    clean_username = payload.username.strip().lower()

    user = await db.users.find_one({"username": clean_username})
    if not user or not verify_password(payload.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas."
        )

    token = create_access_token(data={"sub": clean_username})
    return TokenResponse(access_token=token, username=clean_username)

@router.get("/me")
async def get_me(current_user: str = Depends(get_current_user)):
    return {"username": current_user}