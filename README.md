# 하루.commit() - 말벗 AI 일기장

> 음성 입력과 AI 공감 피드백이 결합된 감성 일기 서비스

## 시작하기

### 1. 저장소 clone
```bash
git clone https://github.com/solrimna/malbeot-diary.git
cd malbeot-diary
```

### 2. 환경변수 세팅
```bash
copy .env.example .env
```

`.env` 파일을 열어서 아래 값들을 채워주세요.
```dotenv
SECRET_KEY=             # 랜덤 키 생성: python -c "import secrets; print(secrets.token_hex(32))"
OPENAI_API_KEY=         # https://platform.openai.com/api-keys
AZURE_SPEECH_KEY=       # https://portal.azure.com → Speech Services
AZURE_SPEECH_REGION=koreacentral
```

### 3. 의존성 설치
```bash
pip install uv
uv pip install -r requirements.txt
```

### 4. 서버 실행
```bash
uvicorn app.main:app --reload
```

### Azure Speech API Key 발급
1. [Azure Portal](https://portal.azure.com) 접속
2. 리소스 만들기 → Speech Services 검색 및 생성
   - 가격 책정: F0 (무료, 월 5시간)
   - 리전: Korea Central
3. 리소스 → 키 및 엔드포인트에서 키 복사
4. `.env` 파일에 추가

---

## Git 작업 가이드

### 0. Git 명령어 기본 용어

| 용어 | 의미 | 예시 |
|------|------|------|
| `origin` | GitHub 원격 저장소의 별명 ||
| `feature/infra` | 내 컴퓨터(로컬)의 브랜치 | `git checkout feature/각자_이니셜` → 로컬 브랜치 이동 |
| `origin/main` | GitHub(원격)의 main 브랜치 | `git merge origin/main` → GitHub의 main 코드를 가져와 합치기 |

**origin을 붙이는 기준:**
- **내 컴퓨터에서 이동**할 때 → origin 안 붙임 (`git checkout feature/infra`)
- **GitHub의 코드를 참조**할 때 → origin 붙임 (`git merge origin/main`, `git push origin 내브랜치`)

자주 쓰는 명령어 정리:

| 명령어 | 하는 일 |
|--------|---------|
| `git fetch origin` | GitHub에서 최신 정보를 가져옴 (내 코드는 안 바뀜) |
| `git merge origin/dev` | GitHub의 dev 코드를 내 브랜치에 합침 |
| `git checkout 브랜치명` | 다른 브랜치로 이동 |
| `git status` | 변경된 파일 목록 확인 |
| `git add 파일명` | 커밋할 파일을 지정 |
| `git commit -m "메시지"` | 변경사항을 저장 (커밋) |
| `git push origin 브랜치명` | 내 커밋을 GitHub에 업로드 |

### 1. PR 올리기 전 dev 최신화 필수

PR을 올리기 전에 반드시 최신 dev를 내 브랜치에 반영해야 합니다.
하루 중간에 다른 팀원이 PR을 머지했을 수 있으므로, **작업 시작 전과 PR 전에** 최신화해주세요.

```bash
git fetch origin
git merge origin/dev
# 충돌이 있으면 해결 후 커밋
```

> 추가로 매일 일과 종료 후 팀장이 모든 feature 브랜치를 일괄 최신화합니다.

### 2. `git add .` 사용 금지 — 본인 파일만 지정해서 add

`git add .`이나 `git add -A`를 사용하면 **본인이 수정하지 않은 파일까지 커밋에 포함**됩니다.
이렇게 되면 다른 팀원의 작업을 자기 브랜치 버전으로 덮어쓰는 사고가 발생합니다.

#### 올바른 커밋 순서

```bash
# 1단계: 변경된 파일 목록 확인
git status

# 2단계: 본인이 작업한 파일만 골라서 추가
git add app/domain/feedback/service.py
git add app/domain/feedback/models.py

# 3단계: 스테이징된 파일이 내 것만인지 다시 확인
git diff --staged --stat

# 4단계: 커밋
git commit -m "[feedback] 피드백 서비스 함수 구현"
```

#### 여러 파일을 한번에 추가하고 싶을 때

```bash
# 특정 폴더 안의 파일만 추가 (본인 담당 폴더)
git add app/폴더/

# 또는 파일을 나열해서 추가
git add app/파일1.py app/파일2.py
```

#### 실수로 다른 파일까지 add 했을 때

```bash
# 특정 파일을 스테이징에서 제거 (파일 내용은 유지됨)
git restore --staged app/config.py
```

#### 이미 커밋까지 해버렸을 때 (아직 push 안 한 경우)

```bash
# 직전 커밋을 취소 (변경사항은 그대로 유지됨)
git reset HEAD~1

# 내 파일만 다시 add
git add app/블라블라.py
git add app/블라블라.py

# 다시 커밋
git commit -m "[feedback] 피드백 서비스 함수 구현"
```

### 3. 공통 파일 수정 시 팀 공유

아래 파일들은 여러 파트에서 사용하므로, 수정 전에 반드시 팀에 알려주세요.
사전 공유 없이 수정하면 머지 시 충돌이나 덮어쓰기가 발생할 수 있습니다.

| 공통 파일/폴더 | 역할 |
|-----------|------|
| `app/config.py` | 환경변수 설정 |
| `app/models` |  database |
| `app/main.py` | FastAPI 앱 진입점 |
| `requirements.txt` | 패키지 의존성 |

공통 파일 수정이 필요하면:
1. 팀 채팅에 수정 내용 공유
2. **별도 PR로 먼저 머지**
3. 나머지 팀원이 `git fetch origin && git merge origin/main`으로 반영
4. 추가로 팀장이 일과 종료 시 각 브랜치를 일괄 최신화합니다

### 4. 전체 작업 흐름 요약

```
작업 시작
  └─ git fetch origin && git merge origin/main   (최신화)
  └─ 코드 작업
  └─ git status                                   (변경 파일 확인)
  └─ git add 내파일만                              (본인 파일만 추가)
  └─ git diff --staged --stat                     (스테이징 확인)
  └─ git commit -m "[파트] 작업내용"                (커밋)
  └─ git fetch origin && git merge origin/main    (PR 전 다시 최신화)
  └─ git push origin 내브랜치                      (푸시)
  └─ GitHub에서 PR 생성
```

> 추가로 매일 일과 종료 후 팀장이 모든 feature 브랜치를 일괄 최신화합니다.

### 현재 브랜치 관리
```
main   ← 최종 배포용 (직접 push 금지)
dev    ← 통합 브랜치 (PR 머지 대상)
feature/이니셜 ← 개인 작업 브랜치
```
### 커밋 메시지 규칙
```
feat:     새 기능 추가
fix:      버그 수정
refactor: 코드 수정 (기능 변화 없음)
docs:     주석, README 수정
chore:    설정, 패키지 변경
```
