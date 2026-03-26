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
   Unicorn Studio Global Init
========================= */
function initUnicornStudio() {
    !function(){var u=window.UnicornStudio;if(u&&u.init){if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",function(){u.init()})}else{u.init()}}else{window.UnicornStudio={isInitialized:!1};var i=document.createElement("script");i.src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.1.5/dist/unicornStudio.umd.js",i.onload=function(){if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",function(){UnicornStudio.init()})}else{UnicornStudio.init()}},(document.head||document.body).appendChild(i)}}();

    function removeUnicornWatermark() {
        document.querySelectorAll(
            'a[href*="unicorn.studio"], a[href*="hiunicornstudio"], ' +
            '.unicorn-studio-watermark, [class*="unicorn-studio"], [id*="unicorn-studio"]'
        ).forEach((node) => node.remove());
    }

    removeUnicornWatermark();

    new MutationObserver(removeUnicornWatermark).observe(document.body, {
        childList: true,
        subtree: true,
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

async function DiarySearch() {
    const input = document.getElementById("diary-search-input");
    const result = document.getElementById("diary-search-result");
    const searchButton = document.getElementById("diary-search-button");

    if (!input || !result) return;

    const keyword = input.value.trim();


    if (!keyword) {
        alert("검색하고 싶은 내용을 입력해주세요.");
        return;
    }

     // 검색 중 표시
    if (searchButton) {
        searchButton.disabled = true;
        searchButton.textContent = "검색 중...";
    }
    result.innerHTML = "검색 중이에요...";

    try {
        const response = await apiRequest("/search/", {
            method: "POST",
            body: getJsonBody({ query: keyword }),
        });

        // AI 답변 표시
        let html = `<p class="mb-3">${escapeHtml(response.answer)}</p>`;

        // 관련 일기 목록 표시
        if (response.results && response.results.length > 0) {
            html += `<div class="space-y-2 mt-3">`;
            response.results.forEach((diary) => {
                html += `
                    <div class="search-result-item cursor-pointer hover:opacity-80"
                         onclick="window.location.href='diary_read.html?id=${encodeURIComponent(diary.id)}'">
                        <div class="text-sm text-white/50">${escapeHtml(diary.diary_date)}</div>
                        <div class="text-sm text-white/80 mt-1">${escapeHtml(diary.content.slice(0, 80))}${diary.content.length > 80 ? "..." : ""}</div>
                    </div>
                `;
            });
            html += `</div>`;
        }

        result.innerHTML = html;

    } catch (error) {
        result.innerHTML = `검색 중 오류가 발생했어요. 다시 시도해주세요.`;
    } finally {
        if (searchButton) {
            searchButton.disabled = false;
            searchButton.textContent = "검색하기";
        }
    }
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

function renderProfileCalendar() {
    const yearSelect = document.getElementById("profile-calendar-year");
    const monthSelect = document.getElementById("profile-calendar-month");
    const grid = document.getElementById("profile-calendar-grid");

    if (!yearSelect || !monthSelect || !grid) {
        return;
    }

    const current = new Date(profileCalendarDate.getFullYear(), profileCalendarDate.getMonth(), 1);
    const year = current.getFullYear();
    const month = current.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    yearSelect.value = String(year);
    monthSelect.value = String(month + 1);
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

function initProfileCalendarControls() {
    const yearSelect = document.getElementById("profile-calendar-year");
    const monthSelect = document.getElementById("profile-calendar-month");

    if (!yearSelect || !monthSelect) {
        return;
    }

    if (!yearSelect.options.length) {
        for (let year = 2020; year <= 2035; year++) {
            const option = document.createElement("option");
            option.value = String(year);
            option.textContent = `${year}년`;
            yearSelect.appendChild(option);
        }
    }

    if (!monthSelect.options.length) {
        for (let month = 1; month <= 12; month++) {
            const option = document.createElement("option");
            option.value = String(month);
            option.textContent = `${month}월`;
            monthSelect.appendChild(option);
        }
    }

    yearSelect.value = String(profileCalendarDate.getFullYear());
    monthSelect.value = String(profileCalendarDate.getMonth() + 1);

    yearSelect.addEventListener("change", () => {
        profileCalendarDate = new Date(Number(yearSelect.value), profileCalendarDate.getMonth(), 1);
        renderProfileCalendar();
    });

    monthSelect.addEventListener("change", () => {
        profileCalendarDate = new Date(profileCalendarDate.getFullYear(), Number(monthSelect.value) - 1, 1);
        renderProfileCalendar();
    });
}

async function initProfilePage() {
    const grid = document.getElementById("profile-calendar-grid");

    initProfileTabs();
    initProfileAlarmPage();

    if (!grid || typeof apiRequest !== "function") {
        return;
    }

    profileCalendarDate = new Date();
    profileCalendarDate.setDate(1);
    initProfileCalendarControls();

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
}

function fillNickname() {
    var el = document.getElementById("profile-nickname");
    if (!el) return;
    try {
        var raw  = localStorage.getItem("auth_user");
        var user = raw ? JSON.parse(raw) : null;
        var name = user && user.nickname ? user.nickname.trim() : "";
        el.textContent = name || "—";
    } catch (_) {
        el.textContent = "—";
    }
}

function renderAttendance() {
    var el = document.getElementById("profile-attendance-message");
    if (!el) return;

    var today     = new Date();
    var year      = today.getFullYear();
    var month     = today.getMonth();
    var todayDate = today.getDate();
    var written   = 0;

    for (var d = 1; d <= todayDate; d++) {
        var key =
            year + "-" +
            String(month + 1).padStart(2, "0") + "-" +
            String(d).padStart(2, "0");

        if (typeof profileDiaryDates !== "undefined" && profileDiaryDates.has(key)) {
            written++;
        }
    }

    if (written === todayDate) {
        el.textContent = "이번달은 하루도 빠짐없이 일기를 썼어요! 🎉";
        el.classList.add("is-perfect");
    } else if (written === 0) {
        el.textContent = "아직 이번달 일기를 작성하지 않았어요.";
    } else {
        el.textContent = "이번달에는 " + written + "일이나 일기를 작성했어요!!";
    }
}

function waitAndRenderAttendance(tries) {
    if (tries <= 0) { renderAttendance(); return; }
    if (typeof profileDiaryDates !== "undefined") {
        renderAttendance();
    } else {
        setTimeout(function () { waitAndRenderAttendance(tries - 1); }, 350);
    }
}

/* =========================
   ai-persona.html
========================= */
function buildPersonaDescription(tone, style) {
    return JSON.stringify({ tone, style });
}

function parsePersonaDescription(description) {
    if (!description) {
        return { tone: "", style: "" };
    }

    try {
        const parsed = JSON.parse(description);
        return {
            tone: parsed.tone || "",
            style: parsed.style || "",
        };
    } catch (_error) {
        return { tone: "", style: description };
    }
}

function renderPersonaCard(persona) {
    const personaList = document.getElementById("persona-list");
    if (!personaList) {
        return;
    }

    const { tone, style } = parsePersonaDescription(persona.custom_description);
    const card = document.createElement("div");
    card.className = "persona-card";
    card.dataset.personaId = persona.id;

    card.innerHTML = `
        <details class="persona-card-details">
            <summary class="persona-card-summary-row">
                <span class="persona-card-title">${escapeHtml(persona.name)}</span>
                <span class="persona-card-arrow">▼</span>
            </summary>
            <div class="persona-card-content">
                <div class="persona-meta">
                    <div class="persona-meta-item">
                        <span class="persona-meta-label">말투 / 분위기</span>
                        <div class="persona-meta-value">${escapeHtml(tone)}</div>
                    </div>
                    <div class="persona-meta-item">
                        <span class="persona-meta-label">AI 반응 스타일</span>
                        <div class="persona-meta-value">${escapeHtml(style).replace(/\n/g, "<br>")}</div>
                    </div>
                </div>
                <div class="persona-card-actions">
                    <button type="button" class="persona-delete-btn" onclick="deletePersona(this)">삭제</button>
                </div>
            </div>
        </details>
    `;

    personaList.prepend(card);
}

function renderPersonaEmpty() {
    const personaList = document.getElementById("persona-list");
    if (!personaList) {
        return;
    }

    personaList.innerHTML = `
        <div class="persona-empty">
            아직 만든 페르소나가 없어요.<br>
            왼쪽에서 첫 번째 페르소나를 만들어보세요.
        </div>
    `;
}

async function loadPersonaList() {
    const personaList = document.getElementById("persona-list");
    if (!personaList || typeof apiRequest !== "function") {
        return;
    }

    try {
        const personas = await apiRequest("/personas/", { method: "GET" });
        personaList.innerHTML = "";

        if (!personas.length) {
            renderPersonaEmpty();
            return;
        }

        personas.forEach((persona) => {
            renderPersonaCard(persona);
        });
    } catch (_error) {
        renderPersonaEmpty();
    }
}

async function addPersona() {
    const nameInput = document.getElementById("persona-name");
    const toneInput = document.getElementById("persona-tone");
    const styleInput = document.getElementById("persona-style");

    if (!nameInput || !toneInput || !styleInput || typeof apiRequest !== "function") {
        return;
    }

    const name = nameInput.value.trim();
    const tone = toneInput.value.trim();
    const style = styleInput.value.trim();

    if (!name || !tone || !style) {
        alert("모든 항목을 입력해주세요.");
        return;
    }

    try {
        const persona = await apiRequest("/personas/", {
            method: "POST",
            body: getJsonBody({
                name,
                preset_type: "custom",
                custom_description: buildPersonaDescription(tone, style),
            }),
        });

        const emptyBox = document.querySelector("#persona-list .persona-empty");
        if (emptyBox) {
            emptyBox.remove();
        }

        renderPersonaCard(persona);

        nameInput.value = "";
        toneInput.value = "";
        styleInput.value = "";
    } catch (error) {
        alert(error.message || "페르소나 저장에 실패했어요.");
    }
}

async function deletePersona(button) {
    const card = button.closest(".persona-card");
    const personaList = document.getElementById("persona-list");
    const personaId = card?.dataset.personaId;

    if (!card || !personaList || !personaId || typeof apiRequest !== "function") {
        return;
    }

    try {
        await apiRequest(`/personas/${encodeURIComponent(personaId)}`, {
            method: "DELETE",
        });

        card.remove();

        if (!personaList.querySelector(".persona-card")) {
            renderPersonaEmpty();
        }
    } catch (error) {
        alert(error.message || "페르소나 삭제에 실패했어요.");
    }
}

function initPersonaPage() {
    if (!document.getElementById("persona-list")) {
        return;
    }

    loadPersonaList();
}

/* =========================
   Global Events (DOMContentLoaded / Resize)
========================= */
window.addEventListener("resize", () => {
    updateDiaryShelfPosition();
    renderDiaryProgress();
});

window.addEventListener("DOMContentLoaded", () => {
    disableAutocompleteOutsideLogin();
    initPersonaPage();
    initProfilePage();
    initUnicornStudio(); // 전역으로 통합된 유니콘 스튜디오 로드 함수 호출

    // profile.html 렌더링 스크립트 실행
    const body = document.body;
    if (body && body.classList.contains("page-profile")) {
        fillNickname();
        setTimeout(function () { waitAndRenderAttendance(20); }, 1000);
    }

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