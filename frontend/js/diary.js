function createDiaryCard(diary) {
    const book = document.createElement("div");
    book.className = "diary-book";
    book.dataset.diaryId = diary.id;
    book.addEventListener("click", () => {
        window.location.href = `diary_read.html?id=${encodeURIComponent(diary.id)}`;
    });

    book.innerHTML = `
        <div class="diary-book-inner">
            <div class="diary-book-date">${escapeHtml(formatDiaryDate(diary.diary_date))}</div>
            <div class="diary-book-title">${escapeHtml(diary.title || "제목 없음")}</div>
        </div>
    `;

    return book;
}

async function fetchDiaries() {
    return apiRequest("/diaries/", { method: "GET" });
}

async function fetchDiary(diaryId) {
    return apiRequest(`/diaries/${encodeURIComponent(diaryId)}`, { method: "GET" });
}

async function createDiary(payload) {
    return apiRequest("/diaries/", {
        method: "POST",
        body: getJsonBody(payload),
    });
}

async function deleteDiary(diaryId) {
    return apiRequest(`/diaries/${encodeURIComponent(diaryId)}`, {
        method: "DELETE",
    });
}

async function renderDiaryShelfFromApi() {
    const shelf = document.getElementById("diary-shelf");
    if (!shelf) {
        return;
    }

    try {
        const diaries = await fetchDiaries();
        shelf.innerHTML = "";

        if (!diaries.length) {
            shelf.innerHTML = `
                <div class="diary-empty-book" id="diary-empty-state">
                    아직 저장된 일기가 없어요.<br>
                    첫 번째 일기를 작성해보세요.
                </div>
            `;
        } else {
            diaries.forEach((diary) => {
                shelf.appendChild(createDiaryCard(diary));
            });
        }

        diaryShelfIndex = 0;
        updateDiaryShelfPosition();
        renderDiaryProgress();
    } catch (error) {
        shelf.innerHTML = `
            <div class="diary-empty-book" id="diary-empty-state">
                일기를 불러오지 못했어요.<br>
                ${escapeHtml(error.message || "다시 시도해주세요.")}
            </div>
        `;
        renderDiaryProgress();
    }
}

async function handleDiaryCreateSubmit(event) {
    event.preventDefault();

    const dateInput = document.getElementById("diary-date");
    const emotionInput = document.getElementById("diary-emotion");
    const weatherInput = document.getElementById("diary-weather");
    const titleInput = document.getElementById("diary-title");
    const contentInput = document.getElementById("diary-content");
    const saveButton = document.getElementById("diary-save-button");

    if (!dateInput || !titleInput || !contentInput || !saveButton) {
        return;
    }

    const diaryDate = dateInput.value.trim();
    const emotion = emotionInput ? emotionInput.value.trim() : "";
    const weather = weatherInput ? weatherInput.value.trim() : "";
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    if (!diaryDate || !content) {
        window.alert("날짜와 일기 내용을 입력해주세요.");
        return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "저장 중...";

    try {
        await createDiary({
            title: title || null,
            emotion: emotion || null,
            weather: weather || null,
            content,
            diary_date: diaryDate,
            input_type: "text",
            hashtags: [],
            persona_id: null,
        });

        window.location.href = "my-diary.html";
    } catch (error) {
        window.alert(error.message || "일기 저장에 실패했어요.");
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "저장하기";
    }
}

function initDiaryListPage() {
    const shelf = document.getElementById("diary-shelf");
    if (!shelf) {
        return;
    }

    renderDiaryShelfFromApi();
}

function initDiaryDetailPage() {
    const form = document.getElementById("diary-create-form");
    if (!form) {
        return;
    }

    const dateInput = document.getElementById("diary-date");
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().slice(0, 10);
    }

    form.addEventListener("submit", handleDiaryCreateSubmit);
}

async function initDiaryReadPage() {
    const dateEl = document.getElementById("diary-read-date");
    const emotionEl = document.getElementById("diary-read-emotion");
    const weatherEl = document.getElementById("diary-read-weather");
    const titleEl = document.getElementById("diary-read-title");
    const contentEl = document.getElementById("diary-read-content");
    const deleteButton = document.getElementById("diary-delete-button");

    if (!dateEl || !emotionEl || !weatherEl || !titleEl || !contentEl) {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const diaryId = params.get("id");

    if (!diaryId) {
        contentEl.textContent = "일기 정보를 찾을 수 없습니다.";
        return;
    }

    try {
        const diary = await fetchDiary(diaryId);
        dateEl.textContent = diary.diary_date || "-";
        emotionEl.textContent = diary.emotion || "-";
        weatherEl.textContent = diary.weather || "-";
        titleEl.textContent = diary.title || "제목 없음";
        contentEl.textContent = diary.content || "-";

        if (deleteButton) {
            deleteButton.addEventListener("click", async () => {
                const isConfirmed = window.confirm("이 일기를 삭제할까요?");
                if (!isConfirmed) {
                    return;
                }

                try {
                    deleteButton.disabled = true;
                    await deleteDiary(diaryId);
                    window.location.href = "my-diary.html";
                } catch (error) {
                    window.alert(error.message || "일기 삭제에 실패했어요.");
                    deleteButton.disabled = false;
                }
            });
        }
    } catch (error) {
        contentEl.textContent = error.message || "일기 내용을 불러오지 못했습니다.";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initDiaryListPage();
    initDiaryDetailPage();
    initDiaryReadPage();
});
