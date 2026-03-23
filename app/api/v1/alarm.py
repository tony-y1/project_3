from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import TEMP_USER_ID
from app.database import get_db
from app.models.alarm import Alarm
from app.schemas.alarm import AlarmCreate, AlarmResponse
from app.services.alarm_service import get_due_alarms

router = APIRouter(prefix="/alarms", tags=["alarms"])


@router.get("/", response_model=list[AlarmResponse])
async def read_alarms(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Alarm).where(Alarm.user_id == TEMP_USER_ID)
    )
    alarms = result.scalars().all()
    return alarms


@router.get("/due")
async def read_due_alarms(db: AsyncSession = Depends(get_db)):
    due_alarms = await get_due_alarms(db)

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
):
    result = await db.execute(
        select(Alarm).where(
            Alarm.user_id == TEMP_USER_ID,
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


@router.post("/", response_model=AlarmResponse)
async def create_alarm(
    alarm_data: AlarmCreate,
    db: AsyncSession = Depends(get_db),
):
    new_alarm = Alarm(
        user_id=TEMP_USER_ID,
        alarm_time=alarm_data.alarm_time,
        repeat_days=alarm_data.repeat_days,
        is_enabled=alarm_data.is_enabled,
    )

    db.add(new_alarm)
    await db.commit()
    await db.refresh(new_alarm)

    return new_alarm