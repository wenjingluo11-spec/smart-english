from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import auth, chat, practice, writing, reading, vocabulary

app = FastAPI(title="Smart English API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(practice.router)
app.include_router(writing.router)
app.include_router(reading.router)
app.include_router(vocabulary.router)


@app.get("/")
async def root():
    return {"message": "Smart English API is running"}
