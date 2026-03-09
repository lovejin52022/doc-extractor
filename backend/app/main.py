from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.health import router as health_router
from app.routes.upload import router as upload_router
from app.routes.extract import router as extract_router


def create_app() -> FastAPI:
    app = FastAPI(title="Doc Extractor API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router, prefix="/api", tags=["health"])
    app.include_router(upload_router, prefix="/api", tags=["documents"])
    app.include_router(extract_router, prefix="/api", tags=["extract"])
    return app


app = create_app()
