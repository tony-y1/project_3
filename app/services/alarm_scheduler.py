import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.database import AsyncSessionLocal
from app.services.alarm_service import process_due_alarms
from app.config import get_settings

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="Asia/Seoul")


async def check_alarms():
    """
    스케줄러가 주기적으로 실행하는 함수.
    DB 세션을 열고, 현재 시각 기준으로 울려야 하는 알람을 처리한다.
    """
    try:
        async with AsyncSessionLocal() as db:
            await process_due_alarms(db)
    except Exception as error:
        logger.exception("알람 스케줄러 실행 실패: %s", error)


def start_scheduler():
    """
    앱 시작 시 알람 스케줄러를 등록하고 실행한다.
    알람 확인 주기는 config.py 설정값을 따른다.
    """
    if scheduler.running:
        return

    settings = get_settings()

    scheduler.add_job(
        check_alarms,
        "interval",
        seconds=settings.ALARM_CHECK_INTERVAL_SECONDS,
        id="check_alarms",
        replace_existing=True,
        max_instances=1,   # 이전 실행이 끝나지 않아도 중복 실행 방지
        coalesce=True,     # 실행이 밀렸을 때 몰아서 실행하지 않고 1번만 실행
    )
    scheduler.start()
    logger.info("[SCHEDULER] started")


def stop_scheduler():
    """
    앱 종료 시 스케줄러를 안전하게 종료한다.
    """
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("[SCHEDULER] stopped")
