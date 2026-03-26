from datetime import datetime
import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pywebpush import webpush, WebPushException

from app.config import get_settings
from app.models.alarm import Alarm
from app.models.push_subscription import PushSubscription


async def get_due_alarms(db: AsyncSession, user_id: str | None = None):
    """
    현재 시각 기준으로 실행되어야 하는 알람 목록을 반환한다.
    user_id가 주어지면 해당 사용자의 알람만 조회한다.
    """
    now = datetime.now()
    current_time = now.strftime("%H:%M")

    weekday_map = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
    today = weekday_map[now.weekday()]

    query = select(Alarm).where(Alarm.is_enabled.is_(True))

    if user_id is not None:
        query = query.where(Alarm.user_id == user_id)

    result = await db.execute(query)
    alarms = result.scalars().all()

    due_alarms = []

    for alarm in alarms:
        # 알람 시간이 없으면 제외
        if not alarm.alarm_time:
            continue

        # 반복 요일 정보가 없으면 제외
        if not alarm.repeat_days:
            continue

        alarm_time_str = alarm.alarm_time.strftime("%H:%M")
        repeat_days_list = [
            day.strip() for day in alarm.repeat_days.split(",") if day.strip()
        ]

        # 현재 시각과 알람 시각이 같아야 함
        if alarm_time_str != current_time:
            continue

        # 오늘 요일이 반복 요일에 포함되어야 함
        if today not in repeat_days_list:
            continue

        # 같은 분에 이미 실행된 경우 중복 실행 방지
        if alarm.last_triggered_at:
            last_triggered = alarm.last_triggered_at.replace(second=0, microsecond=0)
            current_minute = now.replace(second=0, microsecond=0)

            if last_triggered == current_minute:
                continue

        due_alarms.append(alarm)

    return due_alarms


async def trigger_alarm(db: AsyncSession, alarm: Alarm):
    """
    알람 1건을 실제 실행한다.
    - 웹 푸시 전송
    - 마지막 실행 시간 갱신
    """
    print(f"[ALARM TRIGGERED] id={alarm.id}, time={alarm.alarm_time}")

    # 기존 메모리 조회에서 DB 조회로 확장하였다.
    result = await db.execute(
        select(PushSubscription).where(PushSubscription.user_id == str(alarm.user_id))
    )
    sub = result.scalar_one_or_none()
    settings = get_settings()

    if sub:
        try:
            payload = json.dumps({
                "title": "말벗 알람",
                "body": f"설정한 알람 시간입니다. ({alarm.alarm_time})"
            })

            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=payload,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={"sub": settings.VAPID_CLAIMS_SUB},
            )
            print(f"[PUSH SENT] user_id={alarm.user_id}, time={alarm.alarm_time}")
        except WebPushException as e:
            print(f"[PUSH FAILED] {e}")
    else:
        print(f"[NO SUBSCRIPTION] user_id={alarm.user_id}")

    alarm.last_triggered_at = datetime.now()

    db.add(alarm)
    await db.commit()
    await db.refresh(alarm)


async def process_due_alarms(db: AsyncSession):
    """
    현재 시점에 울려야 하는 알람들을 찾아 순서대로 실행한다.
    """
    due_alarms = await get_due_alarms(db)

    for alarm in due_alarms:
        await trigger_alarm(db, alarm)