import hashlib
import logging
import redis.asyncio as aioredis

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

_redis = None


async def get_redis():
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.REDIS_URL, decode_responses=False)
    return _redis


def make_tts_key(text: str) -> str:
    hash_ = hashlib.md5(text.encode("utf-8")).hexdigest()
    return f"tts:cache:{hash_}"


TTS_TTL = 60 * 60 * 24 * 7  # 7일
STATS_HIT_KEY = "tts:stats:hit"
STATS_MISS_KEY = "tts:stats:miss"


async def get_tts_cache(text: str) -> bytes | None:
    try:
        r = await get_redis()
        data = await r.get(make_tts_key(text))
        if data:
            await r.incr(STATS_HIT_KEY)
            return data
        await r.incr(STATS_MISS_KEY)
        return None
    except Exception as e:
        logger.warning(f"[REDIS] get 실패: {e}")
        return None


async def set_tts_cache(text: str, audio_bytes: bytes) -> None:
    try:
        r = await get_redis()
        await r.set(make_tts_key(text), audio_bytes, ex=TTS_TTL)
    except Exception as e:
        logger.warning(f"[REDIS] set 실패: {e}")


async def get_tts_stats() -> dict:
    try:
        r = await get_redis()
        hit = int(await r.get(STATS_HIT_KEY) or 0)
        miss = int(await r.get(STATS_MISS_KEY) or 0)
        total = hit + miss
        hit_rate = f"{hit / total * 100:.1f}%" if total > 0 else "0%"
        return {"hit": hit, "miss": miss, "total": total, "hit_rate": hit_rate}
    except Exception as e:
        logger.warning(f"[REDIS] stats 조회 실패: {e}")
        return {"hit": 0, "miss": 0, "total": 0, "hit_rate": "0%"}
