function toggleForm(type) {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    if (!loginForm || !signupForm) {
        return;
    }

    if (type === 'signup') {
        loginForm.classList.add('hidden-form');
        signupForm.classList.remove('hidden-form');
    } else {
        signupForm.classList.add('hidden-form');
        loginForm.classList.remove('hidden-form');
    }
}

function addPersona() {
    const nameInput = document.getElementById('persona-name');
    const summaryInput = document.getElementById('persona-summary');
    const toneInput = document.getElementById('persona-tone');
    const styleInput = document.getElementById('persona-style');
    const expressionInput = document.getElementById('persona-expression');
    const personaList = document.getElementById('persona-list');

    if (!nameInput || !summaryInput || !toneInput || !styleInput || !expressionInput || !personaList) {
        return;
    }

    const name = nameInput.value.trim();
    const summary = summaryInput.value.trim();
    const tone = toneInput.value.trim();
    const style = styleInput.value.trim();
    const expression = expressionInput.value.trim();

    if (!name || !summary || !tone || !style || !expression) {
        alert('모든 항목을 입력해주세요.');
        return;
    }

    const emptyBox = personaList.querySelector('.persona-empty');
    if (emptyBox) {
        emptyBox.remove();
    }

    const card = document.createElement('div');
    card.className = 'persona-card';

    card.innerHTML = `
        <div class="persona-card-header">
            <div>
                <div class="persona-card-title">${escapeHtml(name)}</div>
                <div class="persona-card-summary">${escapeHtml(summary)}</div>
            </div>
            <button type="button" class="persona-delete-btn" onclick="deletePersona(this)">삭제</button>
        </div>

        <div class="mb-4">
            <span class="persona-badge">Persona</span>
        </div>

        <div class="persona-meta">
            <div class="persona-meta-item">
                <span class="persona-meta-label">말투 / 분위기</span>
                <div class="persona-meta-value">${escapeHtml(tone)}</div>
            </div>

            <div class="persona-meta-item">
                <span class="persona-meta-label">AI 반응 스타일</span>
                <div class="persona-meta-value">${escapeHtml(style).replace(/\n/g, '<br>')}</div>
            </div>

            <div class="persona-meta-item">
                <span class="persona-meta-label">자주 쓰는 표현</span>
                <div class="persona-meta-value">${escapeHtml(expression).replace(/\n/g, '<br>')}</div>
            </div>
        </div>
    `;

    personaList.prepend(card);

    nameInput.value = '';
    summaryInput.value = '';
    toneInput.value = '';
    styleInput.value = '';
    expressionInput.value = '';
}

function deletePersona(button) {
    const card = button.closest('.persona-card');
    const personaList = document.getElementById('persona-list');

    if (!card || !personaList) {
        return;
    }

    card.remove();

    const cards = personaList.querySelectorAll('.persona-card');
    if (cards.length === 0) {
        personaList.innerHTML = `
            <div class="persona-empty">
                아직 만든 페르소나가 없어요.<br>
                왼쪽에서 첫 번째 페르소나를 만들어보세요.
            </div>
        `;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

let diaryShelfIndex = 0;

function openDiaryModal() {
    const modal = document.getElementById('diary-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
}

function closeDiaryModal() {
    const modal = document.getElementById('diary-modal');
    if (!modal) return;
    modal.classList.add('hidden');
}

function openSearchModal() {
    const modal = document.getElementById('search-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
}

function closeSearchModal() {
    const modal = document.getElementById('search-modal');
    if (!modal) return;
    modal.classList.add('hidden');
}

function saveDiaryEntry() {
    const dateInput = document.getElementById('diary-date');
    const titleInput = document.getElementById('diary-title');
    const contentInput = document.getElementById('diary-content');
    const shelf = document.getElementById('diary-shelf');
    const emptyState = document.getElementById('diary-empty-state');

    if (!dateInput || !titleInput || !contentInput || !shelf) return;

    const date = dateInput.value.trim();
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    if (!date || !title || !content) {
        alert('날짜, 제목, 일기 내용을 모두 입력해주세요.');
        return;
    }

    if (emptyState) {
        emptyState.remove();
    }

    const book = document.createElement('div');
    book.className = 'diary-book';

    book.innerHTML = `
        <div class="diary-book-inner">
            <div>
                <div class="diary-book-date">${escapeHtml(formatDiaryDate(date))}</div>
                <div class="diary-book-title">${escapeHtml(title)}</div>
                <div class="diary-book-preview">${escapeHtml(content).replace(/\n/g, '<br>')}</div>
            </div>

            <div class="diary-book-footer">
                <span class="diary-book-badge">Diary</span>
                <button type="button" class="diary-book-delete" onclick="deleteDiaryBook(this)">삭제</button>
            </div>
        </div>
    `;

    shelf.prepend(book);

    dateInput.value = '';
    titleInput.value = '';
    contentInput.value = '';

    diaryShelfIndex = 0;
    updateDiaryShelfPosition();
    closeDiaryModal();
}

function deleteDiaryBook(button) {
    const book = button.closest('.diary-book');
    const shelf = document.getElementById('diary-shelf');

    if (!book || !shelf) return;

    book.remove();

    const remainingBooks = shelf.querySelectorAll('.diary-book');
    if (remainingBooks.length === 0) {
        shelf.innerHTML = `
            <div class="diary-empty-book" id="diary-empty-state">
                아직 저장된 일기가 없어요.<br>
                첫 번째 하루를 책으로 만들어보세요.
            </div>
        `;
        diaryShelfIndex = 0;
    } else {
        const maxIndex = Math.max(0, remainingBooks.length - 1);
        if (diaryShelfIndex > maxIndex) {
            diaryShelfIndex = maxIndex;
        }
    }

    updateDiaryShelfPosition();
}

function moveDiaryShelf(direction) {
    const shelf = document.getElementById('diary-shelf');
    if (!shelf) return;

    const books = shelf.querySelectorAll('.diary-book');
    if (!books.length) return;

    const maxIndex = Math.max(0, books.length - 1);
    diaryShelfIndex += direction;

    if (diaryShelfIndex < 0) diaryShelfIndex = 0;
    if (diaryShelfIndex > maxIndex) diaryShelfIndex = maxIndex;

    updateDiaryShelfPosition();
}

function updateDiaryShelfPosition() {
    const shelf = document.getElementById('diary-shelf');
    if (!shelf) return;

    const isMobile = window.innerWidth <= 768;
    const step = isMobile ? 240 : 286;
    const offset = diaryShelfIndex * step;

    shelf.style.transform = `translateX(-${offset}px)`;
}

function fakeDiarySearch() {
    const input = document.getElementById('diary-search-input');
    const result = document.getElementById('diary-search-result');

    if (!input || !result) return;

    const keyword = input.value.trim();

    if (!keyword) {
        alert('검색하고 싶은 내용을 입력해주세요.');
        return;
    }

    result.innerHTML = `
        "${escapeHtml(keyword)}" 와 관련된 일기를 찾는 AI 검색 기능이 들어갈 자리예요.<br>
        지금은 UI만 만든 상태이고, 나중에 비슷한 일기 내용이나 해당 날짜를 찾아주는 기능으로 연결하면 돼요.
    `;
}

function formatDiaryDate(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
}

window.addEventListener('resize', updateDiaryShelfPosition);

window.addEventListener('DOMContentLoaded', () => {
    const shelfWrapper = document.querySelector('.diary-shelf-wrapper');

    if (shelfWrapper) {
        shelfWrapper.addEventListener('wheel', (event) => {
            const shelf = document.getElementById('diary-shelf');
            if (!shelf) return;

            const books = shelf.querySelectorAll('.diary-book');
            if (!books.length) return;

            event.preventDefault();

            if (event.deltaY > 0) {
                moveDiaryShelf(1);
            } else {
                moveDiaryShelf(-1);
            }
        }, { passive: false });
    }
});