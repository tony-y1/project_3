"""
말벗 목소리 선택 미리보기용 샘플 mp3 생성 스크립트
Usage: python scripts/generate_voice_samples.py
결과: frontend/audio/voice_sample_{voice}.mp3 (6개)
"""

import asyncio
import os
import sys

# 프로젝트 루트를 경로에 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from openai import AsyncOpenAI
from app.config import get_settings

SAMPLE_TEXT = "안녕하세요, 저는 오늘 하루도 당신 곁에 있을게요. 일기를 함께 써봐요."

VOICES = ["alloy", "nova", "echo", "fable", "onyx", "shimmer"]

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "audio")


async def generate():
    settings = get_settings()
    if not settings.OPENAI_API_KEY:
        print("❌ OPENAI_API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요.")
        sys.exit(1)

    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for voice in VOICES:
        output_path = os.path.join(OUTPUT_DIR, f"voice_sample_{voice}.mp3")
        print(f"생성 중: {voice} ...", end=" ", flush=True)
        try:
            response = await client.audio.speech.create(
                model="tts-1",
                voice=voice,
                input=SAMPLE_TEXT,
                response_format="mp3",
            )
            with open(output_path, "wb") as f:
                f.write(response.content)
            print(f"완료 ({len(response.content) // 1024}KB) → {output_path}")
        except Exception as e:
            print(f"실패: {e}")

    print("\n✅ 샘플 생성 완료!")


if __name__ == "__main__":
    asyncio.run(generate())
