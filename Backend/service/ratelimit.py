import os
import time
import jwt
from fastapi import Request, HTTPException, status
from upstash_redis import Redis
from dotenv import load_dotenv

load_dotenv()

UPSTASH_URL = os.getenv("UPSTASH_REDIS_REST_URL")
UPSTASH_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN")
SECRET_KEY = os.getenv("JWT_SECRET", "hackathon_secret_key_change_in_prod")
ALGORITHM = "HS256"

# Cliente Redis de Upstash (comunicación HTTP ligera)
redis_client = Redis(url=UPSTASH_URL, token=UPSTASH_TOKEN) if UPSTASH_URL and UPSTASH_TOKEN else None

def get_client_identifier(request: Request) -> str:
    """Extrae el username del JWT si está autenticado; de lo contrario, usa la IP."""
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username = payload.get("sub")
            if username:
                return f"user:{username}"
        except Exception:
            pass

    # Fallback para IP de cliente (considerando proxies/load balancers)
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return f"ip:{forwarded_for.split(',')[0].strip()}"
    return f"ip:{request.client.host if request.client else 'unknown'}"

def check_rate_limit(request: Request, action_name: str, max_requests: int = 3, window_seconds: int = 300):
    """
    Verifica si el cliente superó el límite de peticiones.
    Por defecto: 3 peticiones por 300 segundos (5 minutos).
    """
    if not redis_client:
        # Fallback de seguridad si no están configuradas las credenciales de Upstash
        return

    identifier = get_client_identifier(request)
    key = f"ratelimit:{action_name}:{identifier}"

    # Incrementar atómicamente el contador
    current_count = redis_client.incr(key)

    # Si es la primera petición en la ventana, asignar el TTL
    if current_count == 1:
        redis_client.expire(key, window_seconds)

    if current_count > max_requests:
        ttl = redis_client.ttl(key)
        ttl_display = ttl if ttl > 0 else window_seconds
        minutes = ttl_display // 60
        seconds = ttl_display % 60
        time_str = f"{minutes}m {seconds}s" if minutes > 0 else f"{seconds}s"

        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Has superado el límite de {max_requests} peticiones cada 5 minutos para esta acción. Intenta de nuevo en {time_str}."
        )
