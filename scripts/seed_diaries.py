"""
테스트용 일기 대량 생성 스크립트
- 페이지네이션 동작 확인을 위해 기본 30개 생성 (limit=20 기준 2배치)
- DB에 등록된 첫 번째 유저에게 일기를 삽입함

실행 방법:
    python -m scripts.seed_diaries              # 기본 30개
    python -m scripts.seed_diaries --count 50   # 50개
    python -m scripts.seed_diaries --clear      # 해당 유저 일기 전체 삭제 후 재생성
"""

import asyncio
import argparse
from datetime import date, timedelta

from sqlalchemy import select, delete

from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.diary import Diary


SAMPLE_CONTENTS = [
    "오늘은 날씨가 맑아서 기분이 좋았다. 산책을 오래 했다.",
    "피곤한 하루였지만 저녁에 좋아하는 음악을 들으며 마음이 풀렸다.",
    "새로운 카페를 발견했다. 분위기가 아늑해서 또 오고 싶다.",
    "오늘 프로젝트 발표가 잘 끝났다. 팀원들 덕분에 잘 마무리됐다.",
    "비가 많이 왔다. 빗소리를 들으며 책을 읽었다.",
    "오랜만에 친구를 만났다. 이야기가 끊이지 않았다.",
    "아침에 일찍 일어나 운동을 했다. 개운한 하루였다.",
    "새로 시작한 드라마가 재밌다. 다음 화가 기다려진다.",
    "맛있는 걸 잔뜩 먹은 날. 내일부터 다시 건강하게 먹어야지.",
    "오늘은 별일 없이 평온했다. 이런 날이 좋다.",
]


async def seed(count: int, clear: bool) -> None:
    async with AsyncSessionLocal() as db:
        # 첫 번째 유저 조회
        result = await db.execute(select(User).limit(1))
        user = result.scalar_one_or_none()
        if not user:
            print("유저가 없습니다. 먼저 회원가입을 해주세요.")
            return

        print(f"대상 유저: {user.username} ({user.id})")

        if clear:
            await db.execute(delete(Diary).where(Diary.user_id == user.id))
            await db.commit()
            print("기존 일기를 모두 삭제했습니다.")

        # 오늘부터 하루씩 거슬러 올라가며 일기 생성
        today = date.today()
        for i in range(count):
            diary_date = today - timedelta(days=i)
            content = SAMPLE_CONTENTS[i % len(SAMPLE_CONTENTS)]
            db.add(Diary(
                user_id=user.id,
                title=f"테스트 일기 {i + 1}번",
                content=f"[{diary_date}] {content}",
                diary_date=diary_date,
                input_type="text",
            ))

        await db.commit()
        print(f"일기 {count}개 생성 완료!")
        print(f"  → 날짜 범위: {today - timedelta(days=count - 1)} ~ {today}")
        print(f"  → 페이지네이션 기준: 첫 배치 20개 + 추가 배치 {count - 20}개")


if __name__ == "__main__":
    parser = argparse.ArgumentParser() 
    parser.add_argument("--count", type=int, default=30, help="생성할 일기 수 (기본 30)")
    parser.add_argument("--clear", action="store_true", help="기존 일기 삭제 후 재생성")
    args = parser.parse_args()

    asyncio.run(seed(args.count, args.clear))
