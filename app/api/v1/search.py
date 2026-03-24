# 담당 : A팀원 유가영
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.search_service import SearchService

router = APIRouter()
search_svc = SearchService()


class SearchRequest(BaseModel):
    query: str  # 예: "친구랑 카페 갔던 날"


# ── POST /search ─ AI 기억 검색
@router.post("/")
async def search_diaries(
    body: SearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    사용자가 찾고 싶은 기억을 입력하면
    GPT가 관련 일기를 찾아서 반환합니다.
    """
    results = await search_svc.search_diaries(
        db=db,
        user_id=current_user.id,
        query=body.query,
    )
    return {"query": body.query, "results": results}