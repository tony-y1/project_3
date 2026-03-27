/* =========================
   Common
========================= */

function initCustomSelect(nativeSelect) {
    if (!nativeSelect || nativeSelect._customSelectInit) return;
    nativeSelect._customSelectInit = true;

    const wrapper = document.createElement("div");
    wrapper.className = "custom-select-wrapper";
    nativeSelect.parentNode.insertBefore(wrapper, nativeSelect);
    wrapper.appendChild(nativeSelect);

    const trigger = document.createElement("div");
    trigger.className = nativeSelect.className + " custom-select-trigger";
    trigger.setAttribute("role", "button");
    trigger.setAttribute("tabindex", "0");

    const triggerText = document.createElement("span");
    triggerText.className = "custom-select-text";

    const triggerArrow = document.createElement("span");
    triggerArrow.className = "custom-select-arrow";
    triggerArrow.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8"><path d="M1 1l5 5 5-5" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;

    trigger.appendChild(triggerText);
    trigger.appendChild(triggerArrow);
    wrapper.insertBefore(trigger, nativeSelect);

    nativeSelect.style.display = "none";

    const dropdown = document.createElement("div");
    dropdown.className = "custom-select-dropdown";
    wrapper.appendChild(dropdown);

    function getDisplayText() {
        const idx = nativeSelect.selectedIndex;
        if (idx < 0) return "선택하기";
        const opt = nativeSelect.options[idx];
        if (opt.disabled && opt.hidden) return "선택하기";
        return opt.textContent;
    }

    function renderOptions() {
        dropdown.innerHTML = "";
        Array.from(nativeSelect.options).forEach((opt) => {
            if (opt.hidden) return;
            const div = document.createElement("div");
            div.className = "custom-select-option";
            if (opt.value === nativeSelect.value) div.classList.add("is-selected");
            div.textContent = opt.textContent;
            div.dataset.value = opt.value;
            div.addEventListener("click", (e) => {
                e.stopPropagation();
                nativeSelect.value = opt.value;
                nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));
                updateTrigger();
                closeDropdown();
            });
            dropdown.appendChild(div);
        });
    }

    function updateTrigger() {
        triggerText.textContent = getDisplayText();
        dropdown.querySelectorAll(".custom-select-option").forEach((div) => {
            div.classList.toggle("is-selected", div.dataset.value === nativeSelect.value);
        });
    }

    function openDropdown() {
        if (nativeSelect.disabled) return;
        renderOptions();
        wrapper.classList.add("is-open");
    }

    function closeDropdown() {
        wrapper.classList.remove("is-open");
    }

    trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        wrapper.classList.contains("is-open") ? closeDropdown() : openDropdown();
    });

    trigger.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            wrapper.classList.contains("is-open") ? closeDropdown() : openDropdown();
        } else if (e.key === "Escape") {
            closeDropdown();
        }
    });

    document.addEventListener("click", (e) => {
        if (!wrapper.contains(e.target)) closeDropdown();
    });

    const childObserver = new MutationObserver(() => {
        updateTrigger();
        if (wrapper.classList.contains("is-open")) renderOptions();
    });
    childObserver.observe(nativeSelect, { childList: true, subtree: true, characterData: true });

    const attrObserver = new MutationObserver(() => {
        wrapper.classList.toggle("is-disabled", nativeSelect.disabled);
    });
    attrObserver.observe(nativeSelect, { attributes: true, attributeFilter: ["disabled"] });

    const valueDescriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
    Object.defineProperty(nativeSelect, "value", {
        get: () => valueDescriptor.get.call(nativeSelect),
        set: (v) => {
            valueDescriptor.set.call(nativeSelect, v);
            updateTrigger();
        },
        configurable: true,
    });

    wrapper.classList.toggle("is-disabled", nativeSelect.disabled);
    updateTrigger();
}

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
        showAppToast("날짜, 제목, 일기 내용을 모두 입력해주세요.", "info", "입력 확인");
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

async function deleteDiaryBook(button) {
    const isConfirmed = await showAppConfirm("삭제하시겠습니까?", "일기 삭제");
    if (!isConfirmed) {
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
        showAppToast("검색하고 싶은 내용을 입력해주세요.", "info", "입력 확인");
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

    const todayKey = formatProfileDateKey(new Date());

    for (let day = 1; day <= lastDay.getDate(); day++) {
        const cellDate = new Date(year, month, day);
        const key = formatProfileDateKey(cellDate);
        const hasDiary = profileDiaryDates.has(key);
        const isToday = key === todayKey;
        const cell = document.createElement("div");

        let badge = "";
        if (hasDiary) {
            badge = '<span class="profile-calendar-mark"><i class="fa-solid fa-book-quran"></i><span>작성 완료</span></span>';
        } else if (isToday) {
            badge = '<a href="diary_write.html" class="profile-calendar-write-link"><i class="fa-solid fa-pen-nib"></i><span>작성하기</span></a>';
        }

        cell.className = `profile-calendar-cell${hasDiary ? " has-diary" : ""}${isToday ? " is-today" : ""}`;
        cell.innerHTML = `
            <span class="profile-calendar-day">${day}</span>
            ${badge}
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

    initCustomSelect(yearSelect);
    initCustomSelect(monthSelect);

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
    card.className = `persona-card${persona.is_active ? " is-default" : ""}`;
    card.dataset.personaId = persona.id;
    card.dataset.name = persona.name;
    card.dataset.tone = tone;
    card.dataset.style = style;

    const defaultBadge = persona.is_active
        ? `<span class="persona-default-badge">기본 페르소나</span>`
        : "";
    const defaultBtn = persona.is_active
        ? ""
        : `<button type="button" class="persona-default-btn" onclick="setDefaultPersona(this)">기본으로 설정</button>`;

    card.innerHTML = `
        <details class="persona-card-details">
            <summary class="persona-card-summary-row">
                <span class="persona-card-title">${escapeHtml(persona.name)}</span>
                <span class="persona-card-summary-right">
                    ${defaultBadge}
                    <span class="persona-card-arrow">▼</span>
                </span>
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
                    ${defaultBtn}
                    <button type="button" class="persona-edit-btn" onclick="editPersona(this)">수정</button>
                    <button type="button" class="persona-delete-btn" onclick="deletePersona(this)">삭제</button>
                </div>
            </div>
        </details>
    `;

    personaList.prepend(card);
}

async function setDefaultPersona(button) {
    const card = button.closest(".persona-card");
    const personaId = card?.dataset.personaId;
    if (!card || !personaId || typeof apiRequest !== "function") return;

    try {
        await apiRequest(`/personas/${encodeURIComponent(personaId)}`, {
            method: "PATCH",
            body: getJsonBody({ is_active: true }),
        });

        // 모든 카드에서 기본 상태 제거
        const personaList = document.getElementById("persona-list");

        document.querySelectorAll(".persona-card").forEach((c) => {
            c.classList.remove("is-default");
            const rightEl = c.querySelector(".persona-card-summary-right");
            const badge = rightEl?.querySelector(".persona-default-badge");
            if (badge) badge.remove();

            const actions = c.querySelector(".persona-card-actions");
            if (!actions) return;
            const existingBtn = actions.querySelector(".persona-default-btn");

            if (c === card) {
                c.classList.add("is-default");
                if (rightEl) rightEl.insertAdjacentHTML("afterbegin", `<span class="persona-default-badge">기본 페르소나</span>`);
                if (existingBtn) existingBtn.remove();
            } else {
                if (!existingBtn) {
                    const editBtn = actions.querySelector(".persona-edit-btn");
                    const newBtn = document.createElement("button");
                    newBtn.type = "button";
                    newBtn.className = "persona-default-btn";
                    newBtn.textContent = "기본으로 설정";
                    newBtn.setAttribute("onclick", "setDefaultPersona(this)");
                    actions.insertBefore(newBtn, editBtn);
                }
            }
        });

        // 기본 페르소나 카드를 목록 최상단으로
        if (personaList) personaList.prepend(card);
    } catch (error) {
        showAppToast(error.message || "기본 페르소나 설정에 실패했어요.", "error", "설정 실패");
    }
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

function editPersona(button) {
    const card = button.closest(".persona-card");
    if (!card) return;

    const personaId = card.dataset.personaId;
    const name = card.dataset.name || "";
    const tone = card.dataset.tone || "";
    const style = card.dataset.style || "";

    document.getElementById("persona-name").value = name;
    document.getElementById("persona-tone").value = tone;
    document.getElementById("persona-style").value = style;
    document.getElementById("persona-edit-id").value = personaId;

    const subtitle = document.getElementById("persona-form-subtitle");
    const title = document.getElementById("persona-form-title");
    const saveBtn = document.getElementById("persona-save-btn");
    const cancelBtn = document.getElementById("persona-cancel-btn");

    if (subtitle) subtitle.textContent = "Edit persona";
    if (title) title.textContent = "페르소나 수정하기";
    if (saveBtn) saveBtn.textContent = "Update Persona";
    if (cancelBtn) cancelBtn.style.display = "";

    const formSection = document.getElementById("persona-form");
    if (formSection) {
        formSection.closest("section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

function cancelPersonaEdit() {
    document.getElementById("persona-name").value = "";
    document.getElementById("persona-tone").value = "";
    document.getElementById("persona-style").value = "";
    document.getElementById("persona-edit-id").value = "";

    const subtitle = document.getElementById("persona-form-subtitle");
    const title = document.getElementById("persona-form-title");
    const saveBtn = document.getElementById("persona-save-btn");
    const cancelBtn = document.getElementById("persona-cancel-btn");

    if (subtitle) subtitle.textContent = "Create persona";
    if (title) title.textContent = "새 페르소나 만들기";
    if (saveBtn) saveBtn.textContent = "Save Persona";
    if (cancelBtn) cancelBtn.style.display = "none";
}

async function addPersona() {
    const nameInput = document.getElementById("persona-name");
    const toneInput = document.getElementById("persona-tone");
    const styleInput = document.getElementById("persona-style");
    const editIdInput = document.getElementById("persona-edit-id");

    if (!nameInput || !toneInput || !styleInput || typeof apiRequest !== "function") {
        return;
    }

    const name = nameInput.value.trim();
    const tone = toneInput.value.trim();
    const style = styleInput.value.trim();
    const editId = editIdInput?.value.trim() || "";

    if (!name || !tone || !style) {
        showAppToast("모든 항목을 입력해주세요.", "info", "입력 확인");
        return;
    }

    if (editId) {
        try {
            const persona = await apiRequest(`/personas/${encodeURIComponent(editId)}`, {
                method: "PATCH",
                body: getJsonBody({
                    name,
                    custom_description: buildPersonaDescription(tone, style),
                }),
            });

            const card = document.querySelector(`.persona-card[data-persona-id="${editId}"]`);
            if (card) {
                card.dataset.name = persona.name;
                card.dataset.tone = tone;
                card.dataset.style = style;

                const titleEl = card.querySelector(".persona-card-title");
                if (titleEl) titleEl.textContent = persona.name;

                const metaValues = card.querySelectorAll(".persona-meta-value");
                if (metaValues[0]) metaValues[0].textContent = tone;
                if (metaValues[1]) metaValues[1].innerHTML = escapeHtml(style).replace(/\n/g, "<br>");
            }

            cancelPersonaEdit();
        } catch (error) {
            showAppToast(error.message || "페르소나 수정에 실패했어요.", "error", "수정 실패");
        }
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
        showAppToast(error.message || "페르소나 저장에 실패했어요.", "error", "저장 실패");
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
        showAppToast(error.message || "페르소나 삭제에 실패했어요.", "error", "삭제 실패");
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

/* =========================
   Toast / Confirm UI
========================= */
function _ensureToastContainer() {
    let container = document.getElementById("alarm-toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "alarm-toast-container";
        container.className = "alarm-toast-container";
        container.setAttribute("aria-live", "polite");
        container.setAttribute("aria-atomic", "true");
        document.body.appendChild(container);
    }
    return container;
}

function _ensureConfirmModal() {
    let modal = document.getElementById("alarm-confirm-modal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "alarm-confirm-modal";
        modal.className = "alarm-feedback-modal hidden";
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        modal.setAttribute("aria-labelledby", "alarm-confirm-title");
        modal.innerHTML = `
            <div class="alarm-feedback-backdrop" data-alarm-confirm-close="backdrop"></div>
            <div class="alarm-feedback-card">
                <p class="profile-calendar-caption">Notice</p>
                <h3 id="alarm-confirm-title" class="alarm-feedback-title">확인</h3>
                <p id="alarm-confirm-message" class="alarm-feedback-message">진행하시겠습니까?</p>
                <div class="alarm-feedback-actions">
                    <button type="button" id="alarm-confirm-cancel-btn" class="profile-calendar-nav">취소</button>
                    <button type="button" id="alarm-confirm-ok-btn" class="profile-calendar-nav is-danger">확인</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    return modal;
}

function showAppToast(message, type = "info", title = "Notice") {
    const container = _ensureToastContainer();

    const toast = document.createElement("div");
    toast.className = `alarm-toast is-${type}`;
    toast.setAttribute("role", "status");
    toast.innerHTML = `
        <div class="alarm-toast-title">${escapeHtml(title)}</div>
        <div class="alarm-toast-message">${escapeHtml(message || "")}</div>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));

    let removed = false;
    const removeToast = () => {
        if (removed) return;
        removed = true;
        toast.classList.remove("show");
        window.setTimeout(() => toast.remove(), 220);
    };
    window.setTimeout(removeToast, 3000);
}

function showAppConfirm(message, title = "확인") {
    const modal = _ensureConfirmModal();
    const messageEl = document.getElementById("alarm-confirm-message");
    const titleEl = document.getElementById("alarm-confirm-title");
    const confirmBtn = document.getElementById("alarm-confirm-ok-btn");
    const cancelBtn = document.getElementById("alarm-confirm-cancel-btn");
    const backdrop = modal.querySelector("[data-alarm-confirm-close='backdrop']");

    messageEl.textContent = message;
    titleEl.textContent = title;
    modal.classList.remove("hidden");

    return new Promise((resolve) => {
        const cleanup = () => {
            modal.classList.add("hidden");
            confirmBtn.removeEventListener("click", handleConfirm);
            cancelBtn.removeEventListener("click", handleCancel);
            backdrop.removeEventListener("click", handleCancel);
            document.removeEventListener("keydown", handleKeydown);
        };
        const handleConfirm = () => { cleanup(); resolve(true); };
        const handleCancel = () => { cleanup(); resolve(false); };
        const handleKeydown = (e) => { if (e.key === "Escape") handleCancel(); };

        confirmBtn.addEventListener("click", handleConfirm);
        cancelBtn.addEventListener("click", handleCancel);
        backdrop.addEventListener("click", handleCancel);
        document.addEventListener("keydown", handleKeydown);
        confirmBtn.focus();
    });
}

window.showAppToast = showAppToast;
window.showAppConfirm = showAppConfirm;