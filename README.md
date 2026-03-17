## 시작하기

1. 저장소 clone
git clone https://github.com/solrimna/malbeot-diary.git

2. 환경변수 세팅
copy .env.example .env

3. 의존성 설치
- pip install uv
- uv pip install --system -r requirements.txt
  
4. 서버 실행
uvicorn app.main:app --reload
