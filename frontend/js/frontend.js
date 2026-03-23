/* =========================
   Common
========================= */
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function formatDiaryDate(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}.${month}.${day}`;
}

function disableAutocompleteOutsideLogin() {
    const body = document.body;
    if (!body || body.classList.contains("page-login")) {
        return;
    }

    document.querySelectorAll("form").forEach((form) => {
        form.setAttribute("autocomplete", "off");
    });

    document.querySelectorAll("input, textarea").forEach((field) => {
        const type = (field.getAttribute("type") || "").toLowerCase();
        if (["hidden", "checkbox", "radio", "button", "submit"].includes(type)) {
            return;
        }

        field.setAttribute("autocomplete", "off");
        field.setAttribute("autocorrect", "off");
        field.setAttribute("autocapitalize", "off");
        field.setAttribute("spellcheck", "false");
    });
}

/* =========================
   login.html
========================= */
function toggleForm(type) {
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");

    if (!loginForm || !signupForm) {
        return;
    }

    if (type === "signup") {
        loginForm.classList.add("hidden-form");
        signupForm.classList.remove("hidden-form");
    } else {
        signupForm.classList.add("hidden-form");
        loginForm.classList.remove("hidden-form");
    }
}

/* =========================
   ai-persona.html
========================= */
function addPersona() {
    const nameInput = document.getElementById("persona-name");
    const summaryInput = document.getElementById("persona-summary");
    const toneInput = document.getElementById("persona-tone");
    const styleInput = document.getElementById("persona-style");
    const expressionInput = document.getElementById("persona-expression");
    const personaList = document.getElementById("persona-list");

    if (!nameInput || !summaryInput || !toneInput || !styleInput || !expressionInput || !personaList) {
        return;
    }

    const name = nameInput.value.trim();
    const summary = summaryInput.value.trim();
    const tone = toneInput.value.trim();
    const style = styleInput.value.trim();
    const expression = expressionInput.value.trim();

    if (!name || !summary || !tone || !style || !expression) {
        alert("모든 항목을 입력해주세요.");
        return;
    }

    const emptyBox = personaList.querySelector(".persona-empty");
    if (emptyBox) {
        emptyBox.remove();
    }

    const card = document.createElement("div");
    card.className = "persona-card";

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
                <div class="persona-meta-value">${escapeHtml(style).replace(/\n/g, "<br>")}</div>
            </div>

            <div class="persona-meta-item">
                <span class="persona-meta-label">자주 쓰는 표현</span>
                <div class="persona-meta-value">${escapeHtml(expression).replace(/\n/g, "<br>")}</div>
            </div>
        </div>
    `;

    personaList.prepend(card);

    nameInput.value = "";
    summaryInput.value = "";
    toneInput.value = "";
    styleInput.value = "";
    expressionInput.value = "";
}

function deletePersona(button) {
    const card = button.closest(".persona-card");
    const personaList = document.getElementById("persona-list");

    if (!card || !personaList) {
        return;
    }

    card.remove();

    const cards = personaList.querySelectorAll(".persona-card");
    if (cards.length === 0) {
        personaList.innerHTML = `
            <div class="persona-empty">
                아직 만든 페르소나가 없어요.<br>
                왼쪽에서 첫 번째 페르소나를 만들어보세요.
            </div>
        `;
    }
}

/* =========================
   my-diary.html
========================= */
let diaryShelfIndex = 0;

function openDiaryModal() {
    const modal = document.getElementById("diary-modal");
    if (!modal) return;
    modal.classList.remove("hidden");
}

function closeDiaryModal() {
    const modal = document.getElementById("diary-modal");
    if (!modal) return;
    modal.classList.add("hidden");
}

function openSearchModal() {
    const modal = document.getElementById("search-modal");
    if (!modal) return;
    modal.classList.remove("hidden");
}

function closeSearchModal() {
    const modal = document.getElementById("search-modal");
    if (!modal) return;
    modal.classList.add("hidden");
}

function saveDiaryEntry() {
    const dateInput = document.getElementById("diary-date");
    const titleInput = document.getElementById("diary-title");
    const contentInput = document.getElementById("diary-content");
    const shelf = document.getElementById("diary-shelf");
    const emptyState = document.getElementById("diary-empty-state");

    if (!dateInput || !titleInput || !contentInput || !shelf) return;

    const date = dateInput.value.trim();
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    if (!date || !title || !content) {
        alert("날짜, 제목, 일기 내용을 모두 입력해주세요.");
        return;
    }

    if (emptyState) {
        emptyState.remove();
    }

    const book = document.createElement("div");
    book.className = "diary-book";

    book.innerHTML = `
        <div class="diary-book-inner">
            <div class="diary-book-date">${escapeHtml(formatDiaryDate(date))}</div>
            <div class="diary-book-title">${escapeHtml(title)}</div>

            <div class="diary-book-footer">
                <button type="button" class="diary-book-delete" onclick="deleteDiaryBook(this)">삭제</button>
            </div>
        </div>
    `;

    shelf.prepend(book);

    dateInput.value = "";
    titleInput.value = "";
    contentInput.value = "";

    diaryShelfIndex = 0;
    updateDiaryShelfPosition();
    renderDiaryProgress();
    closeDiaryModal();
}

function deleteDiaryBook(button) {
    if (!confirm("삭제하시겠습니까?")) {
        return;
    }

    const book = button.closest(".diary-book");
    const shelf = document.getElementById("diary-shelf");

    if (!book || !shelf) return;

    book.remove();

    const remainingBooks = shelf.querySelectorAll(".diary-book");
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
    renderDiaryProgress();
}

function moveDiaryShelf(direction) {
    const shelf = document.getElementById("diary-shelf");
    if (!shelf) return;

    const books = shelf.querySelectorAll(".diary-book");
    if (!books.length) return;

    const maxIndex = Math.max(0, books.length - 1);
    diaryShelfIndex += direction;

    if (diaryShelfIndex < 0) diaryShelfIndex = 0;
    if (diaryShelfIndex > maxIndex) diaryShelfIndex = maxIndex;

    updateDiaryShelfPosition();
    renderDiaryProgress();
}

function updateDiaryShelfPosition() {
    const shelf = document.getElementById("diary-shelf");
    if (!shelf) return;

    const isMobile = window.innerWidth <= 768;
    const step = isMobile ? 90 : 106;
    const offset = diaryShelfIndex * step;

    shelf.style.transform = `translateX(-${offset}px)`;
}

function renderDiaryProgress() {
    const progress = document.getElementById("diary-progress");
    const shelf = document.getElementById("diary-shelf");

    if (!progress || !shelf) return;

    const books = shelf.querySelectorAll(".diary-book");
    progress.innerHTML = "";

    if (!books.length) {
        for (let i = 0; i < 18; i++) {
            const dot = document.createElement("span");
            dot.className = "diary-progress-dot";
            progress.appendChild(dot);
        }
        return;
    }

    books.forEach((_, index) => {
        const dot = document.createElement("span");
        dot.className = "diary-progress-dot";

        if (index === diaryShelfIndex) {
            dot.classList.add("active");
        }

        progress.appendChild(dot);
    });
}

function fakeDiarySearch() {
    const input = document.getElementById("diary-search-input");
    const result = document.getElementById("diary-search-result");

    if (!input || !result) return;

    const keyword = input.value.trim();

    if (!keyword) {
        alert("검색하고 싶은 내용을 입력해주세요.");
        return;
    }

    result.innerHTML = `
        "${escapeHtml(keyword)}"과 관련한 일기를 찾는 AI 검색 기능이 들어갈 자리예요.<br>
        지금은 UI만 만든 상태이고, 나중에 키워드 일치 일기 내용이나 해당 날짜를 찾아주는 기능으로 연결하면 좋아요.
    `;
}

/* =========================
   profile.html
========================= */
let profileCalendarDate = new Date();
let profileDiaryDates = new Set();
const PROFILE_ALARM_STORAGE_KEY = "profile_alarm_settings";

function formatProfileDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function renderProfileCalendar() {
    const title = document.getElementById("profile-calendar-title");
    const grid = document.getElementById("profile-calendar-grid");

    if (!title || !grid) return;

    const current = new Date(profileCalendarDate.getFullYear(), profileCalendarDate.getMonth(), 1);
    const year = current.getFullYear();
    const month = current.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    title.textContent = `${year}년 ${month + 1}월`;
    grid.innerHTML = "";

    for (let i = 0; i < firstDay.getDay(); i++) {
        const emptyCell = document.createElement("div");
        emptyCell.className = "profile-calendar-cell is-empty";
        grid.appendChild(emptyCell);
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
        const cellDate = new Date(year, month, day);
        const key = formatProfileDateKey(cellDate);
        const hasDiary = profileDiaryDates.has(key);
        const cell = document.createElement("div");

        cell.className = `profile-calendar-cell${hasDiary ? " has-diary" : ""}`;
        cell.innerHTML = `
            <span class="profile-calendar-day">${day}</span>
            ${hasDiary ? '<span class="profile-calendar-mark">작성 완료</span>' : ""}
        `;

        grid.appendChild(cell);
    }
}

function showProfileTab(target) {
    const tabButtons = document.querySelectorAll(".profile-tab-button");
    const panels = document.querySelectorAll(".profile-tab-panel");

    tabButtons.forEach((button) => {
        button.classList.toggle("is-active", button.dataset.tabTarget === target);
    });

    panels.forEach((panel) => {
        const isTarget = panel.id === `profile-panel-${target}`;
        panel.classList.toggle("hidden", !isTarget);
    });
}

function setProfileAlarmRowState(row, enabled) {
    const timeInput = row.querySelector(".profile-alarm-time");
    if (!timeInput) {
        return;
    }

    row.classList.toggle("is-disabled", !enabled);
    timeInput.disabled = !enabled;
}

function loadProfileAlarmSettings() {
    try {
        const raw = localStorage.getItem(PROFILE_ALARM_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (_error) {
        return {};
    }
}

function saveProfileAlarmSettings(settings) {
    localStorage.setItem(PROFILE_ALARM_STORAGE_KEY, JSON.stringify(settings));
}

function initProfileTabs() {
    const tabButtons = document.querySelectorAll(".profile-tab-button");
    if (!tabButtons.length) {
        return;
    }

    tabButtons.forEach((button) => {
        button.addEventListener("click", () => {
            showProfileTab(button.dataset.tabTarget);
        });
    });
}

function initProfileAlarmPage() {
    const rows = document.querySelectorAll(".profile-alarm-row");
    const saveButton = document.getElementById("profile-alarm-save");
    const message = document.getElementById("profile-alarm-message");

    if (!rows.length || !saveButton) {
        return;
    }

    const settings = loadProfileAlarmSettings();

    rows.forEach((row) => {
        const day = row.dataset.day;
        const enabledInput = row.querySelector(".profile-alarm-enabled");
        const timeInput = row.querySelector(".profile-alarm-time");

        if (!day || !enabledInput || !timeInput) {
            return;
        }

        const saved = settings[day];
        enabledInput.checked = Boolean(saved?.enabled);
        timeInput.value = saved?.time || timeInput.value || "08:00";
        setProfileAlarmRowState(row, enabledInput.checked);

        enabledInput.addEventListener("change", () => {
            setProfileAlarmRowState(row, enabledInput.checked);
            if (message) {
                message.classList.add("hidden");
                message.textContent = "";
            }
        });
    });

    saveButton.addEventListener("click", () => {
        const nextSettings = {};

        rows.forEach((row) => {
            const day = row.dataset.day;
            const enabledInput = row.querySelector(".profile-alarm-enabled");
            const timeInput = row.querySelector(".profile-alarm-time");

            if (!day || !enabledInput || !timeInput) {
                return;
            }

            nextSettings[day] = {
                enabled: enabledInput.checked,
                time: timeInput.value || "08:00",
            };
        });

        saveProfileAlarmSettings(nextSettings);

        if (message) {
            message.textContent = "알람 설정이 저장되었어요.";
            message.classList.remove("hidden");
        }
    });
}

async function initProfilePage() {
    const grid = document.getElementById("profile-calendar-grid");
    const prevButton = document.getElementById("profile-calendar-prev");
    const nextButton = document.getElementById("profile-calendar-next");

    initProfileTabs();
    initProfileAlarmPage();

    if (!grid || typeof apiRequest !== "function") {
        return;
    }

    profileCalendarDate = new Date();
    profileCalendarDate.setDate(1);

    try {
        const diaries = await apiRequest("/diaries/", { method: "GET" });
        profileDiaryDates = new Set(
            diaries
                .map((diary) => diary.diary_date)
                .filter(Boolean)
        );
    } catch (_error) {
        profileDiaryDates = new Set();
    }

    renderProfileCalendar();

    prevButton?.addEventListener("click", () => {
        profileCalendarDate = new Date(profileCalendarDate.getFullYear(), profileCalendarDate.getMonth() - 1, 1);
        renderProfileCalendar();
    });

    nextButton?.addEventListener("click", () => {
        profileCalendarDate = new Date(profileCalendarDate.getFullYear(), profileCalendarDate.getMonth() + 1, 1);
        renderProfileCalendar();
    });
}

/* =========================
   my-diary.html Events
========================= */
window.addEventListener("resize", () => {
    updateDiaryShelfPosition();
    renderDiaryProgress();
});

window.addEventListener("DOMContentLoaded", () => {
    disableAutocompleteOutsideLogin();
    initProfilePage();

    const shelfWrapper = document.querySelector(".diary-shelf-wrapper");

    if (shelfWrapper) {
        shelfWrapper.addEventListener("wheel", (event) => {
            const shelf = document.getElementById("diary-shelf");
            if (!shelf) return;

            const books = shelf.querySelectorAll(".diary-book");
            if (!books.length) return;

            event.preventDefault();

            if (event.deltaY > 0) {
                moveDiaryShelf(1);
            } else {
                moveDiaryShelf(-1);
            }
        }, { passive: false });
    }

    renderDiaryProgress();
});
