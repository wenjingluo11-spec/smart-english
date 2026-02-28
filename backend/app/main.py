import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.middleware.security import SecurityHeadersMiddleware, RateLimitMiddleware
from app.routers import auth, chat, practice, writing, reading, vocabulary, stats
from app.routers import upload, screenshot, clinic
from app.routers import story, knowledge
from app.routers import arena, quest
from app.routers import exam
from app.routers import error_notebook
from app.routers import onboarding
from app.routers import textbook
from app.routers import grammar
from app.routers import admin
from app.routers import notifications
from app.routers import tts
from app.routers import cognitive
from app.routers import behavior
from app.routers import feedback
from app.routers import dashboard

async def _auto_distill_loop():
    """每24小时自动执行一次知识蒸馏。"""
    from app.database import async_session
    from app.services.distillation import auto_distill
    while True:
        await asyncio.sleep(86400)
        try:
            async with async_session() as db:
                await auto_distill(db)
        except Exception:
            pass

@asynccontextmanager
async def lifespan(app):
    task = asyncio.create_task(_auto_distill_loop())
    yield
    task.cancel()

app = FastAPI(title="Smart English API", version="0.1.0", lifespan=lifespan)

# Middleware added via add_middleware runs in REVERSE order (last added = outermost).
# CORSMiddleware MUST be outermost to handle preflight before anything else.
# So it must be added LAST.
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware, max_requests=60, window_seconds=60)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """捕获所有未处理异常，确保 500 响应也带 CORS 头。"""
    import logging
    logging.getLogger(__name__).exception("Unhandled error: %s", exc)
    origin = request.headers.get("origin")
    headers = {}
    if origin and origin in settings.cors_origins:
        headers["access-control-allow-origin"] = origin
        headers["access-control-allow-credentials"] = "true"
    return JSONResponse(
        status_code=500,
        content={"detail": "服务器内部错误"},
        headers=headers,
    )

# Static files for uploads
uploads_dir = Path(__file__).resolve().parent.parent / "uploads"
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(practice.router)
app.include_router(writing.router)
app.include_router(reading.router)
app.include_router(vocabulary.router)
app.include_router(stats.router)
app.include_router(upload.router)
app.include_router(screenshot.router)
app.include_router(clinic.router)
app.include_router(story.router)
app.include_router(knowledge.router)
app.include_router(arena.router)
app.include_router(quest.router)
app.include_router(exam.router)
app.include_router(error_notebook.router)
app.include_router(onboarding.router)
app.include_router(textbook.router)
app.include_router(grammar.router)
app.include_router(admin.router)
app.include_router(notifications.router)
app.include_router(tts.router)
app.include_router(cognitive.router)
app.include_router(behavior.router)
app.include_router(feedback.router)
app.include_router(dashboard.router)


@app.get("/")
async def root():
    return {"message": "Smart English API is running"}
