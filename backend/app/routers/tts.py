"""TTS 语音合成路由。"""

from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel, Field
from pathlib import Path
from app.services.tts import (
    synthesize_stream,
    synthesize_with_timestamps,
    get_voices,
    VOICES,
    CACHE_DIR,
)

router = APIRouter(prefix="/tts", tags=["tts"])

# 合法语音 ID 集合
_VALID_VOICE_IDS = {v["id"] for v in VOICES}


class SynthesizeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=50000, description="要合成的文本")
    voice: str = Field("en-US-JennyNeural", description="语音ID")
    rate: str = Field("+0%", description="语速，如 +0%, -20%, +50%")


def _validate_voice(voice: str) -> str:
    if voice not in _VALID_VOICE_IDS:
        raise HTTPException(status_code=400, detail=f"不支持的语音: {voice}")
    return voice


def _validate_rate(rate: str) -> str:
    """校验语速格式，如 +0%, -20%, +50%。"""
    rate = rate.strip()
    if not rate.endswith("%"):
        raise HTTPException(status_code=400, detail="语速格式错误，示例: +0%, -20%, +50%")
    try:
        val = int(rate[:-1])
        if val < -50 or val > 100:
            raise ValueError
    except ValueError:
        raise HTTPException(status_code=400, detail="语速范围: -50% ~ +100%")
    return rate


@router.get("/voices")
async def list_voices():
    """获取可用语音列表。"""
    return get_voices()


@router.get("/synthesize")
async def synthesize(
    text: str = Query(..., min_length=1, max_length=5000, description="要合成的文本"),
    voice: str = Query("en-US-JennyNeural", description="语音ID"),
    rate: str = Query("+0%", description="语速，如 +0%, -20%, +50%"),
):
    """流式返回 MP3 音频。支持 HTML5 <audio> 和 expo-av 直接播放。"""
    voice = _validate_voice(voice)
    rate = _validate_rate(rate)

    return StreamingResponse(
        synthesize_stream(text, voice, rate),
        media_type="audio/mpeg",
        headers={
            "Content-Disposition": "inline; filename=speech.mp3",
            "Cache-Control": "public, max-age=86400",
        },
    )


@router.get("/synthesize-with-timestamps")
async def synthesize_ts(
    text: str = Query(..., min_length=1, max_length=5000),
    voice: str = Query("en-US-JennyNeural"),
    rate: str = Query("+0%"),
):
    """生成音频并返回词级时间戳（用于视听同步）。"""
    voice = _validate_voice(voice)
    rate = _validate_rate(rate)

    result = await synthesize_with_timestamps(text, voice, rate)
    return result


@router.post("/synthesize")
async def synthesize_post(req: SynthesizeRequest):
    """POST 方式流式返回 MP3 音频，支持长文本。"""
    voice = _validate_voice(req.voice)
    rate = _validate_rate(req.rate)

    return StreamingResponse(
        synthesize_stream(req.text, voice, rate),
        media_type="audio/mpeg",
        headers={
            "Content-Disposition": "inline; filename=speech.mp3",
            "Cache-Control": "public, max-age=86400",
        },
    )


@router.post("/synthesize-with-timestamps")
async def synthesize_ts_post(req: SynthesizeRequest):
    """POST 方式生成音频并返回词级时间戳。"""
    voice = _validate_voice(req.voice)
    rate = _validate_rate(req.rate)

    result = await synthesize_with_timestamps(req.text, voice, rate)
    return result


@router.get("/audio/{audio_key}")
async def get_cached_audio(audio_key: str):
    """通过缓存 key 获取已生成的音频文件。"""
    # 安全校验：key 只能是 hex 字符
    if not all(c in "0123456789abcdef" for c in audio_key):
        raise HTTPException(status_code=400, detail="无效的音频 key")

    cache_path = CACHE_DIR / f"{audio_key}.mp3"
    if not cache_path.exists():
        raise HTTPException(status_code=404, detail="音频不存在或已过期")

    return FileResponse(
        cache_path,
        media_type="audio/mpeg",
        headers={"Cache-Control": "public, max-age=86400"},
    )
