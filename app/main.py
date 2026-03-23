import logging
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from app.services.alarm_scheduler import start_scheduler, stop_scheduler
from app.database import engine, Base
from app.api.v1.router import api_router

app = FastAPI()

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="말벗 AI 일기장",
    description="음성 입력 + AI 공감 피드백 일기 서비스",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "ok"}

# / (루트 경로)를 프론트엔드가 다 먹어버려 오류발생해 수정
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s"
)