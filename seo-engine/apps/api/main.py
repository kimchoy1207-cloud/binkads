from fastapi import FastAPI
from prometheus_client import make_asgi_app
from packages.shared.logging import setup
setup()
app = FastAPI(title="seo-engine", version="0.1.0")
app.mount("/metrics", make_asgi_app())
@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
