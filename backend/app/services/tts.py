"""TTS 语音合成服务 — 基于 edge-tts，支持流式音频输出和词级时间戳。"""

import hashlib
from collections.abc import AsyncIterator
from pathlib import Path

import edge_tts

# 音频缓存目录
CACHE_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "tts_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# 可用语音列表（英语学习场景精选）
VOICES = [
    {"id": "en-US-JennyNeural", "name": "Jenny", "gender": "female", "accent": "美式", "description": "清晰自然的美式女声"},
    {"id": "en-US-GuyNeural", "name": "Guy", "gender": "male", "accent": "美式", "description": "沉稳清晰的美式男声"},
    {"id": "en-US-AriaNeural", "name": "Aria", "gender": "female", "accent": "美式", "description": "富有表现力的美式女声"},
    {"id": "en-US-DavisNeural", "name": "Davis", "gender": "male", "accent": "美式", "description": "温和友好的美式男声"},
    {"id": "en-GB-SoniaNeural", "name": "Sonia", "gender": "female", "accent": "英式", "description": "标准英式女声"},
    {"id": "en-GB-RyanNeural", "name": "Ryan", "gender": "male", "accent": "英式", "description": "标准英式男声"},
]

DEFAULT_VOICE = "en-US-JennyNeural"
DEFAULT_RATE = "+0%"


def _cache_key(text: str, voice: str, rate: str) -> str:
    """生成缓存文件名。"""
    raw = f"{text}|{voice}|{rate}"
    return hashlib.sha256(raw.encode()).hexdigest()


async def synthesize_stream(
    text: str,
    voice: str = DEFAULT_VOICE,
    rate: str = DEFAULT_RATE,
) -> AsyncIterator[bytes]:
    """流式生成 MP3 音频数据。优先从缓存读取。"""
    key = _cache_key(text, voice, rate)
    cache_path = CACHE_DIR / f"{key}.mp3"

    # 缓存命中：直接读取文件
    if cache_path.exists():
        with open(cache_path, "rb") as f:
            while chunk := f.read(4096):
                yield chunk
        return

    # 缓存未命中：调用 edge-tts 并同时写入缓存
    communicate = edge_tts.Communicate(text, voice, rate=rate)
    chunks: list[bytes] = []

    async for item in communicate.stream():
        if item["type"] == "audio":
            chunks.append(item["data"])
            yield item["data"]

    # 写入缓存
    if chunks:
        with open(cache_path, "wb") as f:
            for c in chunks:
                f.write(c)


async def synthesize_with_timestamps(
    text: str,
    voice: str = DEFAULT_VOICE,
    rate: str = DEFAULT_RATE,
) -> dict:
    """生成音频并返回词级时间戳（用于视听同步，V2 预留）。

    返回:
        {
            "audio_key": "缓存key，可通过 /tts/audio/{key} 获取音频",
            "word_boundaries": [{"text": "hello", "offset_ms": 500, "duration_ms": 300}, ...]
        }
    """
    key = _cache_key(text, voice, rate)
    cache_path = CACHE_DIR / f"{key}.mp3"

    communicate = edge_tts.Communicate(text, voice, rate=rate)
    word_boundaries: list[dict] = []
    audio_chunks: list[bytes] = []

    async for item in communicate.stream():
        if item["type"] == "audio":
            audio_chunks.append(item["data"])
        elif item["type"] == "WordBoundary":
            word_boundaries.append({
                "text": item["text"],
                "offset_ms": item["offset"] // 10000,  # 100ns -> ms
                "duration_ms": item["duration"] // 10000,
            })

    # 写入缓存
    if audio_chunks and not cache_path.exists():
        with open(cache_path, "wb") as f:
            for c in audio_chunks:
                f.write(c)

    return {
        "audio_key": key,
        "word_boundaries": word_boundaries,
    }


def get_voices() -> list[dict]:
    """返回可用语音列表。"""
    return VOICES
