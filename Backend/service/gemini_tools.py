import ipaddress
import urllib.parse
import httpx
from bs4 import BeautifulSoup
from service.database import get_database

BLOCKED_IP_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]

CIVIC_DIRECTORY = {
    "MX": {
        "fraude_cibernetico": {
            "entity": "Guardia Nacional - Dirección Científica / CONDUSEF",
            "contact": "088 (Guardia Nacional) | 55 53 400 999 (CONDUSEF)",
            "url": "https://www.gob.mx/guardianacional"
        },
        "extorsion_y_amenazas": {
            "entity": "Coordinación Nacional Antisecuestro y Extorsión",
            "contact": "088 | 911 Emergencias",
            "url": "https://www.gob.mx/conase"
        },
        "salud_mental_desinformacion": {
            "entity": "Línea de la Vida (Secretaría de Salud)",
            "contact": "800 911 2000",
            "url": "https://www.gob.mx/salud"
        }
    },
    "GLOBAL": {
        "fraude_cibernetico": {
            "entity": "Internet Crime Complaint Center (IC3) / Local Cyber Police",
            "contact": "Contact local emergency dispatch",
            "url": "https://www.ic3.gov"
        },
        "salud_mental": {
            "entity": "Befrienders Worldwide / Crisis Lines",
            "contact": "https://www.befrienders.org",
            "url": "https://www.befrienders.org"
        }
    }
}

def is_safe_public_url(url: str) -> bool:
    """Valida que la URL no apunte a localhost, redes privadas o metadatos cloud."""
    try:
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        hostname = parsed.hostname
        if not hostname or hostname in ("localhost", "127.0.0.1"):
            return False
        
        # Si es una dirección IP directa, verificar rangos prohibidos
        try:
            ip_obj = ipaddress.ip_address(hostname)
            for net in BLOCKED_IP_NETWORKS:
                if ip_obj in net:
                    return False
        except ValueError:
            pass  # Es un dominio de texto válido
        return True
    except Exception:
        return False

def extract_safe_url_metadata(url: str) -> dict:
    """
    Tool: Extrae metadatos mínimos y seguros de un enlace público web.
    """
    if not is_safe_public_url(url):
        return {"error": "URL blocked: Private network, localhost or invalid protocol."}

    headers = {
        "User-Agent": "VERAS-Bot/1.0 (+https://veras-platform.org; Media-Forensics-Checker)"
    }

    try:
        with httpx.Client(timeout=4.0, follow_redirects=True) as client:
            with client.stream("GET", url, headers=headers) as response:
                if response.status_code != 200:
                    return {"error": f"HTTP status {response.status_code}"}
                
                content_type = response.headers.get("content-type", "")
                if "text/html" not in content_type:
                    return {"error": "Unsupported content type (not HTML)"}

                # Leer únicamente los primeros 250 KB para prevenir saturación de RAM
                chunk = next(response.iter_bytes(chunk_size=250 * 1024), b"")
                html_text = chunk.decode("utf-8", errors="ignore")

        soup = BeautifulSoup(html_text, "html.parser")
        title = soup.title.string.strip() if soup.title and soup.title.string else "No title found"
        
        description = ""
        meta_desc = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
        if meta_desc and meta_desc.get("content"):
            description = meta_desc["content"].strip()[:300]

        og_site_name = ""
        meta_site = soup.find("meta", attrs={"property": "og:site_name"})
        if meta_site and meta_site.get("content"):
            og_site_name = meta_site["content"].strip()

        return {
            "url": url,
            "title": title[:150],
            "description": description,
            "site_name": og_site_name,
            "extracted": True
        }
    except Exception as e:
        return {"error": f"Failed to fetch metadata: {str(e)}"}

def search_relevant_forum_threads(keywords: str) -> list[dict]:
    """
    Tool: Busca hilos de discusión relacionados en la base de datos de la comunidad.
    """
    try:
        import asyncio
        db = get_database()
        
        # Búsqueda simple por palabras clave en título y etiquetas
        query = {
            "$or": [
                {"title": {"$regex": keywords, "$options": "i"}},
                {"tags": {"$in": [keywords.lower().strip()]}}
            ]
        }
        
        # Obtener hilos completados
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Si corre dentro de async, usamos cursor estándar síncrono o to_list
            import nest_asyncio
            nest_asyncio.apply()
        
        cursor = db.posts.find(query).sort("created_at", -1).limit(3)
        posts = loop.run_until_complete(cursor.to_list(length=3))

        return [
            {
                "id": str(p["_id"]),
                "title": p.get("title", ""),
                "summary": p.get("summary", ""),
                "tags": p.get("tags", [])
            }
            for p in posts
        ]
    except Exception:
        return []

def civic_entity_router(threat_category: str, country_code: str = "MX") -> dict:
    """
    Tool: Retorna directrices y contactos de entidades cívicas y oficiales de emergencia.
    Categorías válidas: 'fraude_cibernetico', 'extorsion_y_amenazas', 'salud_mental_desinformacion'.
    """
    country = country_code.upper()
    directory = CIVIC_DIRECTORY.get(country, CIVIC_DIRECTORY["GLOBAL"])
    
    category_key = threat_category.lower().replace(" ", "_")
    result = directory.get(category_key)
    
    if not result:
        result = directory.get("fraude_cibernetico", CIVIC_DIRECTORY["GLOBAL"]["fraude_cibernetico"])
        
    return {
        "country": country,
        "category": threat_category,
        "recommendation": result
    }