"""通用图片上传端点。"""

import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from app.routers.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/upload", tags=["upload"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
ALLOWED_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif"}
MAX_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "仅支持 PNG/JPEG/WebP/GIF 图片")

    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(400, "图片大小不能超过 10MB")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "png"
    filename = f"{user.id}_{uuid.uuid4().hex[:8]}.{ext}"
    path = UPLOAD_DIR / filename
    path.write_bytes(data)

    return {"url": f"/uploads/{filename}", "filename": filename}
