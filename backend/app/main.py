from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

app = FastAPI(title="Smart English API", version="0.1.0")

# Security middleware
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware, max_requests=60, window_seconds=60)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


@app.get("/")
async def root():
    return {"message": "Smart English API is running"}
