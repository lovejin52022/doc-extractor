from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.health import router as health_router
from app.routes.upload import router as upload_router
from app.routes.extract import router as extract_router
from app.routes.tags import router as tags_router
from app.routes.documents import router as documents_router
from app.routes.knowledgeBases import router as knowledge_bases_router
from app.routes.system import router as system_router
from app.routes.stats import router as stats_router


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
    app.include_router(documents_router, prefix="/api", tags=["documents"])
    app.include_router(tags_router, prefix="/api", tags=["tags"])
    app.include_router(extract_router, prefix="/api", tags=["extract"])
    app.include_router(knowledge_bases_router, prefix="/api", tags=["knowledge-bases"])
    app.include_router(system_router, prefix="/api", tags=["system"])
    app.include_router(stats_router, prefix="/api", tags=["stats"])
    return app


app = create_app()
