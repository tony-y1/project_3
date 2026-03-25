from fastapi import APIRouter
from app.api.v1 import auth, diary, persona, feedback, voice, alarm, search

api_router = APIRouter()

api_router.include_router(auth.router,     prefix="/auth",     tags=["Auth"])
api_router.include_router(diary.router,    prefix="/diaries",  tags=["Diary"])       # A팀원
api_router.include_router(persona.router,  prefix="/personas", tags=["Persona"])     # A팀원
api_router.include_router(feedback.router, prefix="/feedback", tags=["AI Feedback"]) # A팀원
api_router.include_router(voice.router,    prefix="/voice",    tags=["Voice"])       # 나
api_router.include_router(alarm.router,    prefix="/alarms",   tags=["Alarm"])       # C팀원
api_router.include_router(search.router, prefix="/search", tags=["AI Search"])
