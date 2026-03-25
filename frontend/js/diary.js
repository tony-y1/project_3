function createDiaryCard(diary) {
    const book = document.createElement("div");
    book.className = "diary-book";
    book.dataset.diaryId = diary.id;

    book.addEventListener("click", (e) => {
        if (e.target.closest(".diary-book-delete")) return;
        window.location.href = `diary_read.html?id=${encodeURIComponent(diary.id)}`;
    });

    book.innerHTML = `
        <div class="diary-book-spine"></div>
        <div class="diary-book-pages"></div>
        <div class="diary-book-cover"></div>
        <div class="diary-book-inner">
            <div class="diary-book-date">${escapeHtml(formatDiaryDate(diary.diary_date))}</div>
            <div class="diary-book-deco"></div>
            <div class="diary-book-footer">
                <button type="button" class="diary-book-delete">삭제</button>
            </div>
        </div>
    `;

    book.querySelector(".diary-book-delete").addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!window.confirm("이 일기를 삭제할까요?")) return;

        try {
            await deleteDiary(diary.id);
            book.remove();

            const shelf = document.getElementById("diary-shelf");
            if (shelf && !shelf.querySelector(".diary-book")) {
                shelf.innerHTML = `
                    <div class="diary-empty-book" id="diary-empty-state">
                        아직 저장된 일기가 없어요.<br>
                        첫 번째 일기를 작성해보세요.
                    </div>
                `;
            }
            diaryShelfIndex = 0;
            updateDiaryShelfPosition();
            renderDiaryProgress();
        } catch (error) {
            window.alert(error.message || "일기 삭제에 실패했어요.");
        }
    });

    return book;
}

async function fetchDiaries() {
    return apiRequest("/diaries/", { method: "GET" });
}

async function fetchPersonas() {
    return apiRequest("/personas/", { method: "GET" });
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

async function updateDiary(diaryId, payload) {
    return apiRequest(`/diaries/${encodeURIComponent(diaryId)}`, {
        method: "PATCH",
        body: getJsonBody(payload),
    });
}

async function deleteDiary(diaryId) {
    return apiRequest(`/diaries/${encodeURIComponent(diaryId)}`, {
        method: "DELETE",
    });
}

async function populatePersonaSelect(selectElement, selectedPersonaId = "") {
    if (!selectElement) {
        return;
    }

    try {
        const personas = await fetchPersonas();
        selectElement.innerHTML = '<option value="" selected disabled hidden>선택하기</option>';

        personas.forEach((persona) => {
            const option = document.createElement("option");
            option.value = persona.id;
            option.textContent = persona.name;

            if (selectedPersonaId && persona.id === selectedPersonaId) {
                option.selected = true;
            }

            selectElement.appendChild(option);
        });
    } catch (_error) {
        selectElement.innerHTML = '<option value="" selected disabled hidden>선택하기</option>';
    }
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
    const personaSelect = document.getElementById("diary-persona-select");
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
        const diary = await createDiary({
            title: title || null,
            emotion: emotion || null,
            weather: weather || null,
            content,
            diary_date: diaryDate,
            input_type: "text",
            hashtags: [],
            persona_id: personaSelect?.value || null,
        });
        // window.location.href = `diary_read.html?id=${encodeURIComponent(diary.id)}`;
        const autoplay = document.getElementById("ai-autoplay-toggle")?.classList.contains("is-on") ? "1" : "0";
        window.location.href = `diary_read.html?id=${encodeURIComponent(diary.id)}&autoplay=${autoplay}`;

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
    // const autoSummaryToggle = document.getElementById("ai-auto-summary-toggle");
    // const autoSummaryState = document.getElementById("ai-auto-summary-state");
    // const manualSummaryButton = document.getElementById("ai-manual-summary-button");
    const personaSelect = document.getElementById("diary-persona-select");

    if (!form) {
        return;
    }

    const dateInput = document.getElementById("diary-date");
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().slice(0, 10);
    }

    populatePersonaSelect(personaSelect);

    populatePersonaSelect(personaSelect);

    // if (autoSummaryToggle && autoSummaryState && manualSummaryButton) {
    //     autoSummaryToggle.addEventListener("click", () => {
    //         const isOn = autoSummaryToggle.classList.contains("is-on");
    //         autoSummaryToggle.classList.toggle("is-on", !isOn);
    //         autoSummaryToggle.setAttribute("aria-pressed", String(!isOn));
    //         autoSummaryState.textContent = isOn ? "OFF" : "ON";
    //         manualSummaryButton.classList.toggle("hidden", !isOn);
    //     });
    // }

    const autoplayToggle = document.getElementById("ai-autoplay-toggle");
    const autoplayState = document.getElementById("ai-autoplay-state");
    if (autoplayToggle && autoplayState) {
        autoplayToggle.addEventListener("click", () => {
            const isOn = autoplayToggle.classList.contains("is-on");
            autoplayToggle.classList.toggle("is-on", !isOn);
            autoplayToggle.setAttribute("aria-pressed", String(!isOn));
            autoplayState.textContent = isOn ? "OFF" : "ON";
        });
    }

    form.addEventListener("submit", handleDiaryCreateSubmit);
}

function setDiaryReadOnly(fields, isReadOnly) {
    fields.forEach((field) => {
        field.readOnly = isReadOnly;
    });
}

async function initDiaryReadPage() {
    const dateEl = document.getElementById("diary-read-date");
    const emotionEl = document.getElementById("diary-read-emotion");
    const weatherEl = document.getElementById("diary-read-weather");
    const titleEl = document.getElementById("diary-read-title");
    const contentEl = document.getElementById("diary-read-content");
    const editButton = document.getElementById("diary-edit-button");
    const deleteButton = document.getElementById("diary-delete-button");
    const personaSelect = document.getElementById("diary-read-persona-select");
    const rerollSummaryButton = document.getElementById("ai-reroll-summary-button");

    if (!dateEl || !emotionEl || !weatherEl || !titleEl || !contentEl) {
        return;
    }

    const fields = [dateEl, emotionEl, weatherEl, titleEl, contentEl];
    const params = new URLSearchParams(window.location.search);
    const diaryId = params.get("id");
    let isEditing = false;

    if (!diaryId) {
        contentEl.value = "일기 정보를 찾을 수 없습니다.";
        return;
    }

    try {
        const diary = await fetchDiary(diaryId);
        dateEl.value = diary.diary_date || "";
        emotionEl.value = diary.emotion || "";
        weatherEl.value = diary.weather || "";
        titleEl.value = diary.title || "";
        contentEl.value = diary.content || "";
        await populatePersonaSelect(personaSelect, diary.persona_id || "");
        setDiaryReadOnly(fields, true);

        // 피드백 조회 + TTS 버튼 연결
        try {
            const feedback = await apiRequest(`/feedback/${encodeURIComponent(diaryId)}`, { method: "GET" });
            const reviewEl = document.getElementById("diary-read-review");
            const ttsButton = document.getElementById("tts-play-button");
            const audioEl = document.getElementById("tts-audio");
            const autoplay = params.get("autoplay") === "1";

            if (reviewEl && feedback.feedback_text) {
                reviewEl.textContent = feedback.feedback_text;
            }

            async function playTTS() {
                ttsButton.disabled = true;
                ttsButton.textContent = "생성 중...";
                try {
                    const token = localStorage.getItem("access_token");
                    const ttsResponse = await fetch(`${API_BASE_URL}/voice/tts`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify({ text: feedback.feedback_text }),
                    });
                    if (ttsResponse.ok) {
                        const audioBlob = await ttsResponse.blob();
                        audioEl.src = URL.createObjectURL(audioBlob);
                        audioEl.classList.remove("hidden");
                        audioEl.play();
                        ttsButton.textContent = "🔊 다시 듣기";
                    }
                } catch (_) {
                    ttsButton.textContent = "🔊 듣기";
                } finally {
                    ttsButton.disabled = false;
                }
            }

            if (ttsButton && feedback.feedback_text) {
                ttsButton.classList.remove("hidden");
                ttsButton.addEventListener("click", playTTS);
                if (autoplay) {
                    playTTS();
                }
            }
        } catch (_) {
            // 피드백 없어도 페이지는 정상 표시
        }

        if (rerollSummaryButton) {
            rerollSummaryButton.addEventListener("click", () => {
                window.alert("다시 요약하기 버튼을 추가했습니다.");
            });
        }

        if (editButton) {
            editButton.addEventListener("click", async () => {
                if (!isEditing) {
                    isEditing = true;
                    setDiaryReadOnly(fields, false);
                    if (personaSelect) {
                        personaSelect.disabled = false;
                    }
                    editButton.textContent = "저장";
                    titleEl.focus();
                    return;
                }

                if (!dateEl.value.trim() || !contentEl.value.trim()) {
                    window.alert("날짜와 일기 내용을 입력해주세요.");
                    return;
                }

                editButton.disabled = true;
                editButton.textContent = "저장 중...";

                try {
                    const updatedDiary = await updateDiary(diaryId, {
                        title: titleEl.value.trim() || null,
                        emotion: emotionEl.value.trim() || null,
                        weather: weatherEl.value.trim() || null,
                        content: contentEl.value.trim(),
                        diary_date: dateEl.value.trim(),
                        persona_id: personaSelect?.value || null,
                    });

                    dateEl.value = updatedDiary.diary_date || "";
                    emotionEl.value = updatedDiary.emotion || "";
                    weatherEl.value = updatedDiary.weather || "";
                    titleEl.value = updatedDiary.title || "";
                    contentEl.value = updatedDiary.content || "";
                    await populatePersonaSelect(personaSelect, updatedDiary.persona_id || "");

                    isEditing = false;
                    setDiaryReadOnly(fields, true);
                    const voiceBtnWrapper = document.getElementById("voice-btn-wrapper");
                    if (voiceBtnWrapper) voiceBtnWrapper.classList.add("hidden");
                    if (personaSelect) {
                        personaSelect.disabled = true;
                    }
                    editButton.textContent = "수정하기";
                } catch (error) {
                    window.alert(error.message || "일기 수정에 실패했어요.");
                    editButton.textContent = "저장";
                } finally {
                    editButton.disabled = false;
                }
            });
        }

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
        contentEl.value = error.message || "일기 내용을 불러오지 못했습니다.";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initDiaryListPage();
    initDiaryDetailPage();
    initDiaryReadPage();
});