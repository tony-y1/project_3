from datetime import datetime

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.core.security import get_current_user
from app.database import get_db
from app.models.alarm import Alarm
from app.models.push_subscription import PushSubscription
from app.schemas.alarm import AlarmCreate, AlarmResponse
from app.services.alarm_service import get_due_alarms
from app.config import get_settings


router = APIRouter()


class PushSubscriptionCreate(BaseModel):
    endpoint: str
    keys: dict


@router.get("/push/public-key")
async def get_push_public_key():
    """
    프론트엔드에서 웹 푸시 구독 시 사용하는 VAPID 공개키를 반환한다.
    """
    settings = get_settings()
    return {"publicKey": settings.VAPID_PUBLIC_KEY}


@router.post("/push/subscribe")
async def save_push_subscription(
    payload: PushSubscriptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    현재 로그인한 사용자의 웹 푸시 구독 정보를 저장한다.
    기존 메모리 저장 방식에서 DB 저장으로 확장하였다.
    이미 구독 정보가 있으면 덮어쓰고, 없으면 새로 생성한다.
    """
    user_id = str(current_user.id)
    result = await db.execute(
        select(PushSubscription).where(PushSubscription.user_id == user_id)
    )
    sub = result.scalar_one_or_none()

    if sub:
        sub.endpoint = payload.endpoint
        sub.p256dh = payload.keys.get("p256dh", "")
        sub.auth = payload.keys.get("auth", "")
    else:
        sub = PushSubscription(
            user_id=user_id,
            endpoint=payload.endpoint,
            p256dh=payload.keys.get("p256dh", ""),
            auth=payload.keys.get("auth", ""),
        )
        db.add(sub)

    await db.commit()
    return {"message": "구독 저장 완료"}


@router.get("/", response_model=list[AlarmResponse])
async def read_alarms(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    현재 로그인한 사용자의 알람 목록을 조회한다.
    """
    result = await db.execute(
        select(Alarm).where(Alarm.user_id == str(current_user.id))
    )
    alarms = result.scalars().all()
    return alarms


@router.get("/due")
async def read_due_alarms(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    현재 로그인한 사용자의 알람 중,
    지금 시각 기준으로 실행 대상인 알람만 반환한다.
    """
    due_alarms = await get_due_alarms(db, str(current_user.id))

    return {
        "count": len(due_alarms),
        "items": [
            {
                "id": alarm.id,
                "user_id": alarm.user_id,
                "alarm_time": str(alarm.alarm_time),
                "repeat_days": alarm.repeat_days,
                "is_enabled": alarm.is_enabled,
                "last_triggered_at": (
                    alarm.last_triggered_at.isoformat()
                    if alarm.last_triggered_at else None
                ),
            }
            for alarm in due_alarms
        ],
    }


@router.get("/test")
async def test_due_alarms(
    time: str = Query(..., description="테스트 시간. 예: 11:40"),
    day: str = Query(..., description="테스트 요일. 예: MON, TUE, WED"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    특정 시간/요일을 기준으로 알람 매칭이 올바른지 확인하는 테스트용 API.
    """
    result = await db.execute(
        select(Alarm).where(
            Alarm.user_id == str(current_user.id),
            Alarm.is_enabled.is_(True),
        )
    )
    alarms = result.scalars().all()

    matched = []

    for alarm in alarms:
        if not alarm.alarm_time:
            continue

        if not alarm.repeat_days:
            continue

        alarm_time_str = alarm.alarm_time.strftime("%H:%M")
        repeat_days_list = [
            d.strip() for d in alarm.repeat_days.split(",") if d.strip()
        ]

        if alarm_time_str != time:
            continue

        if day not in repeat_days_list:
            continue

        matched.append(
            {
                "id": alarm.id,
                "user_id": alarm.user_id,
                "alarm_time": str(alarm.alarm_time),
                "repeat_days": alarm.repeat_days,
                "is_enabled": alarm.is_enabled,
                "last_triggered_at": (
                    alarm.last_triggered_at.isoformat()
                    if alarm.last_triggered_at else None
                ),
            }
        )

    return {
        "input": {
            "time": time,
            "day": day,
        },
        "count": len(matched),
        "items": matched,
    }


def _has_day_overlap(days_a: list[str], days_b_str: str | None) -> bool:
    if not days_b_str:
        return False
    days_b = {d.strip() for d in days_b_str.split(",")}
    return bool(set(days_a) & days_b)


@router.post("/", response_model=AlarmResponse)
async def create_alarm(
    alarm_data: AlarmCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    현재 로그인한 사용자의 알람을 새로 생성한다.
    동일한 시간 + 겹치는 요일의 알람이 이미 존재하면 409를 반환한다.
    repeat_days는 리스트 입력을 DB 저장용 문자열로 변환한다.
    """
    same_time = await db.execute(
        select(Alarm).where(
            Alarm.user_id == str(current_user.id),
            Alarm.alarm_time == alarm_data.alarm_time,
        )
    )
    for existing in same_time.scalars().all():
        if _has_day_overlap(alarm_data.repeat_days, existing.repeat_days):
            raise HTTPException(status_code=409, detail="동일한 시간 및 요일의 알람이 이미 존재합니다.")

    repeat_days_str = ",".join(alarm_data.repeat_days) if alarm_data.repeat_days else None

    new_alarm = Alarm(
        user_id=str(current_user.id),
        alarm_time=alarm_data.alarm_time,
        repeat_days=repeat_days_str,
        is_enabled=alarm_data.is_enabled,
    )

    db.add(new_alarm)
    await db.commit()
    await db.refresh(new_alarm)

    return new_alarm


@router.put("/{alarm_id}", response_model=AlarmResponse)
async def update_alarm(
    alarm_id: int,
    alarm_data: AlarmCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    알람 ID로 특정 알람을 수정한다.
    다른 사용자의 알람은 수정할 수 없다.
    수정하려는 시간이 다른 알람과 중복되면 409를 반환한다.
    """
    result = await db.execute(
        select(Alarm).where(
            Alarm.id == alarm_id,
            Alarm.user_id == str(current_user.id),
        )
    )
    alarm = result.scalar_one_or_none()
    if not alarm:
        raise HTTPException(status_code=404, detail="알람을 찾을 수 없습니다.")

    same_time = await db.execute(
        select(Alarm).where(
            Alarm.user_id == str(current_user.id),
            Alarm.alarm_time == alarm_data.alarm_time,
            Alarm.id != alarm_id,
        )
    )
    for existing in same_time.scalars().all():
        if _has_day_overlap(alarm_data.repeat_days, existing.repeat_days):
            raise HTTPException(status_code=409, detail="동일한 시간 및 요일의 알람이 이미 존재합니다.")

    alarm.alarm_time = alarm_data.alarm_time
    alarm.repeat_days = ",".join(alarm_data.repeat_days) if alarm_data.repeat_days else None
    alarm.is_enabled = alarm_data.is_enabled

    await db.commit()
    await db.refresh(alarm)

    return alarm