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
        if (!await showAppConfirm("이 일기를 삭제할까요?", "일기 삭제")) return;

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
            showAppToast(error.message || "일기 삭제에 실패했어요.", "error", "삭제 실패");
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

async function fetchDiaryHashtags(diaryId) {
    return apiRequest(`/diaries/${encodeURIComponent(diaryId)}/hashtags`, { method: "GET" });
}

function renderHashtags(hashtags, showEmpty = false) {
    const wrapper = document.getElementById("diary-hashtag-wrapper");
    if (!wrapper) return;
    wrapper.innerHTML = "";
    if (!hashtags || !hashtags.length) {
        if (showEmpty) {
            const msg = document.createElement("p");
            msg.className = "text-sm text-white/40 italic w-full";
            msg.textContent = "해시태그를 생성할 수 없어요.";
            wrapper.appendChild(msg);
        }
        return;
    }
     // # 포함되거나 너무 긴 태그 필터링
    hashtags = hashtags.filter(tag => !tag.includes("#") && tag.length <= 10);

    if (!hashtags.length) {
        const msg = document.createElement("p");
        msg.className = "text-sm text-white/40 italic w-full";
        msg.textContent = "해시태그를 생성할 수 없는 내용이에요.";
        wrapper.appendChild(msg);
        return;
    }

    hashtags.forEach((tag) => {
        const span = document.createElement("span");
        span.className = "group relative px-3 py-1 rounded-full text-sm text-white/80 border border-white/20 bg-white/10 cursor-pointer hover:border-white/50 transition-all";
        span.innerHTML = `
            <span class="tag-text">#${escapeHtml(tag)}</span>
            <button type="button"
                class="tag-delete hidden group-hover:inline-block ml-1 text-white/50 hover:text-white text-xs font-bold"
                onclick="removeHashtag(this, '${escapeHtml(tag)}')">✕</button>
        `;
        
        wrapper.appendChild(span);
    });
}

async function removeHashtag(button, tagName) {
    const span = button.closest("span");
    if (!span) return;

    const params = new URLSearchParams(window.location.search);
    const diaryId = params.get("id");
    if (!diaryId) return;

    try {
        await apiRequest(
            `/diaries/${encodeURIComponent(diaryId)}/hashtags/${encodeURIComponent(tagName)}`,
            { method: "DELETE" }
        );
        span.remove();
    } catch (_) {
        showAppToast("해시태그 삭제에 실패했어요.", "error", "삭제 실패");
    }
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

async function populatePersonaSelect(selectElement, selectedPersonaId = "", useActiveAsDefault = false) {
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
            } else if (!selectedPersonaId && useActiveAsDefault && persona.is_active) {
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
        showAppToast("날짜와 일기 내용을 입력해주세요.", "info", "입력 확인");
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
        const autoplay = document.getElementById("ai-autoplay-toggle")?.classList.contains("is-on") ? "1" : "0";
        window.location.href = `diary_read.html?id=${encodeURIComponent(diary.id)}&autoplay=${autoplay}`;

    } catch (error) {
        showAppToast(error.message || "일기 저장에 실패했어요.", "error", "저장 실패");
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

const EMOTION_OPTIONS = [
    { emoji: "😊", label: "행복" },
    { emoji: "🥰", label: "설렘" },
    { emoji: "🤩", label: "신남" },
    { emoji: "😌", label: "평온" },
    { emoji: "😢", label: "슬픔" },
    { emoji: "😔", label: "우울" },
    { emoji: "😡", label: "화남" },
    { emoji: "😤", label: "답답" },
    { emoji: "😰", label: "불안" },
    { emoji: "😴", label: "피곤" },
];

const WEATHER_OPTIONS = [
    { emoji: "☀️", label: "맑음" },
    { emoji: "⛅", label: "구름" },
    { emoji: "☁️", label: "흐림" },
    { emoji: "🌧️", label: "비" },
    { emoji: "⛈️", label: "천둥" },
    { emoji: "🌨️", label: "눈" },
    { emoji: "🌬️", label: "바람" },
    { emoji: "🌫️", label: "안개" },
];

function initIconSelect(wrapperId, options, hiddenInputId) {
    const wrapper = document.getElementById(wrapperId);
    const hiddenInput = document.getElementById(hiddenInputId);
    if (!wrapper || !hiddenInput) return;

    const trigger = wrapper.querySelector(".diary-icon-select-trigger");
    const emojiEl = wrapper.querySelector(".diary-icon-select-emoji");
    const labelEl = wrapper.querySelector(".diary-icon-select-label");

    // 드롭다운을 body에 직접 붙여 overflow/backdrop-filter 영향 차단
    const dropdown = document.createElement("div");
    dropdown.className = "diary-icon-select-dropdown";
    dropdown.hidden = true;
    document.body.appendChild(dropdown);

    options.forEach(({ emoji, label }) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "diary-icon-option";
        btn.innerHTML = `<span>${emoji}</span><span>${label}</span>`;
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            hiddenInput.value = label;
            emojiEl.textContent = emoji;
            labelEl.textContent = label;
            labelEl.style.color = "#ffffff";
            dropdown.hidden = true;
            wrapper.classList.remove("is-open");
        });
        dropdown.appendChild(btn);
    });

    trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = !dropdown.hidden;
        document.querySelectorAll(".diary-icon-select-dropdown").forEach((el) => {
            el.hidden = true;
        });
        document.querySelectorAll(".diary-icon-select.is-open").forEach((el) => {
            el.classList.remove("is-open");
        });
        if (!isOpen) {
            const rect = trigger.getBoundingClientRect();
            dropdown.style.top = (rect.bottom + 6) + "px";
            dropdown.style.left = rect.left + "px";
            dropdown.style.width = Math.max(rect.width, 260) + "px";
            dropdown.hidden = false;
            wrapper.classList.add("is-open");
        }
    });

    document.addEventListener("click", () => {
        dropdown.hidden = true;
        wrapper.classList.remove("is-open");
    });
}

function setIconSelectValue(wrapperId, options, label) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;
    const opt = options.find(o => o.label === label);
    if (!opt) return;
    wrapper.querySelector(".diary-icon-select-emoji").textContent = opt.emoji;
    const labelEl = wrapper.querySelector(".diary-icon-select-label");
    labelEl.textContent = opt.label;
    labelEl.style.color = "#ffffff";
    wrapper.querySelector("input[type=hidden]") && (wrapper.querySelector("input[type=hidden]").value = opt.label);
}

function setIconSelectDisabled(wrapperId, disabled) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;
    wrapper.querySelector(".diary-icon-select-trigger").disabled = disabled;
    wrapper.classList.toggle("is-disabled", disabled);
}

function initIconSelects() {
    initIconSelect("emotion-icon-select", EMOTION_OPTIONS, "diary-emotion");
    initIconSelect("weather-icon-select", WEATHER_OPTIONS, "diary-weather");
}

function initDiaryDetailPage() {
    const form = document.getElementById("diary-create-form");
    const personaSelect = document.getElementById("diary-persona-select");

    if (!form) {
        return;
    }

    const dateInput = document.getElementById("diary-date");
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().slice(0, 10);
    }

    initIconSelects();
    if (typeof initCustomSelect === "function") initCustomSelect(personaSelect);
    populatePersonaSelect(personaSelect, "", true);

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
    const emotionInput = document.getElementById("diary-read-emotion");
    const weatherInput = document.getElementById("diary-read-weather");
    const titleEl = document.getElementById("diary-read-title");
    const contentEl = document.getElementById("diary-read-content");
    const editButton = document.getElementById("diary-edit-button");
    const deleteButton = document.getElementById("diary-delete-button");
    const personaSelect = document.getElementById("diary-read-persona-select");
    const rerollSummaryButton = document.getElementById("ai-reroll-summary-button");

    if (!dateEl || !emotionInput || !weatherInput || !titleEl || !contentEl) {
        return;
    }

    if (typeof initCustomSelect === "function") initCustomSelect(personaSelect);

    initIconSelect("emotion-read-icon-select", EMOTION_OPTIONS, "diary-read-emotion");
    initIconSelect("weather-read-icon-select", WEATHER_OPTIONS, "diary-read-weather");

    const fields = [dateEl, titleEl, contentEl];
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
        emotionInput.value = diary.emotion || "";
        weatherInput.value = diary.weather || "";
        setIconSelectValue("emotion-read-icon-select", EMOTION_OPTIONS, diary.emotion);
        setIconSelectValue("weather-read-icon-select", WEATHER_OPTIONS, diary.weather);
        setIconSelectDisabled("emotion-read-icon-select", true);
        setIconSelectDisabled("weather-read-icon-select", true);
        titleEl.value = diary.title || "";
        contentEl.value = diary.content || "";

        // 해시태그 로드
        try {
            const hashtagData = await fetchDiaryHashtags(diaryId);
            renderHashtags(hashtagData.hashtags || [], true);
        } catch (_) {
            renderHashtags([], true);
        }
        
        await populatePersonaSelect(personaSelect, diary.persona_id || "");
        setDiaryReadOnly(fields, true);

        // --- 여기부터 수정한 코드 ---
        if (personaSelect && !diary.persona_id) {
            const defaultOption = personaSelect.querySelector('option[value=""]');
            if (defaultOption) {
                defaultOption.textContent = "기본 말벗";
            }
        }
        // --- 여기까지 수정한 코드 ---

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
                //console.log("[TTS 호출 텍스트]", reviewEl.textContent);
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
                        body: JSON.stringify({ text: reviewEl.textContent }),
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
            rerollSummaryButton.addEventListener("click", async () => {
                rerollSummaryButton.disabled = true;
                rerollSummaryButton.textContent = "새로운 반응 생성 중...";
                try {
                    const newFeedback = await apiRequest(
                        `/feedback/${encodeURIComponent(diaryId)}/regenerate`,
                        { method: "PUT" }
                    );
                    const reviewEl = document.getElementById("diary-read-review");
                    if (reviewEl && newFeedback.feedback_text) {
                        reviewEl.textContent = newFeedback.feedback_text;
                    }
                } catch (_) {
                    showAppToast("새로운 반응을 가져오지 못했어요. 다시 시도해주세요.", "error", "오류");
                } finally {
                    rerollSummaryButton.disabled = false;
                    rerollSummaryButton.textContent = "반응이 마음에 안드시면 여기를 눌러주세요!";
                }
            });
        }

        if (editButton) {
            editButton.addEventListener("click", async () => {
                if (!isEditing) {
                    isEditing = true;
                    setDiaryReadOnly(fields, false);
                    setIconSelectDisabled("emotion-read-icon-select", false);
                    setIconSelectDisabled("weather-read-icon-select", false);
                    if (personaSelect) {
                        personaSelect.disabled = false;
                    }
                    editButton.textContent = "저장";
                    titleEl.focus();
                    return;
                }

                if (!dateEl.value.trim() || !contentEl.value.trim()) {
                    showAppToast("날짜와 일기 내용을 입력해주세요.", "info", "입력 확인");
                    return;
                }

                editButton.disabled = true;
                editButton.textContent = "저장 중...";

                try {
                    const updatedDiary = await updateDiary(diaryId, {
                        title: titleEl.value.trim() || null,
                        emotion: emotionInput.value.trim() || null,
                        weather: weatherInput.value.trim() || null,
                        content: contentEl.value.trim(),
                        diary_date: dateEl.value.trim(),
                        persona_id: personaSelect?.value || null,
                    });

                    dateEl.value = updatedDiary.diary_date || "";
                    emotionInput.value = updatedDiary.emotion || "";
                    weatherInput.value = updatedDiary.weather || "";
                    setIconSelectValue("emotion-read-icon-select", EMOTION_OPTIONS, updatedDiary.emotion);
                    setIconSelectValue("weather-read-icon-select", WEATHER_OPTIONS, updatedDiary.weather);
                    titleEl.value = updatedDiary.title || "";
                    contentEl.value = updatedDiary.content || "";
                    await populatePersonaSelect(personaSelect, updatedDiary.persona_id || "");

                    isEditing = false;
                    setDiaryReadOnly(fields, true);
                    setIconSelectDisabled("emotion-read-icon-select", true);
                    setIconSelectDisabled("weather-read-icon-select", true);
                    const voiceBtnWrapper = document.getElementById("voice-btn-wrapper");
                    if (voiceBtnWrapper) voiceBtnWrapper.classList.add("hidden");
                    if (personaSelect) {
                        personaSelect.disabled = true;
                    }
                    editButton.textContent = "수정하기";

                    // 일기 수정 후 AI 피드백 자동 갱신
                    try {
                        const updatedFeedback = await apiRequest(
                            `/feedback/${encodeURIComponent(diaryId)}`,
                            { method: "GET" }
                        );
                        const reviewEl = document.getElementById("diary-read-review");
                        if (reviewEl && updatedFeedback.feedback_text) {
                            //console.log("[수정 후 새 피드백]", updatedFeedback.feedback_text);
                            reviewEl.textContent = updatedFeedback.feedback_text;

                            // 이전 TTS 음성 초기화
                            const audioEl = document.getElementById("tts-audio");
                            const ttsButton = document.getElementById("tts-play-button");
                            if (audioEl) {
                                audioEl.pause();
                                audioEl.src = "";
                                audioEl.classList.add("hidden");
                            }
                            if (ttsButton) {
                                ttsButton.textContent = "🔊 듣기";
                            }
                        }
                    } catch (_) {
                        // 피드백 갱신 실패해도 수정은 성공으로 처리
                    }

                      // 해시태그 재생성 후 다시 불러오기
                    try {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        const hashtagData = await fetchDiaryHashtags(diaryId);
                        renderHashtags(hashtagData.hashtags || [], true);
                    } catch (_) {
                        // 해시태그 갱신 실패해도 수정은 성공으로 처리
                    }

                } catch (error) {
                    showAppToast(error.message || "일기 수정에 실패했어요.", "error", "수정 실패");
                    editButton.textContent = "저장";
                } finally {
                    editButton.disabled = false;
                }
            });
        }

        if (deleteButton) {
            deleteButton.addEventListener("click", async () => {
                if (!await showAppConfirm("이 일기를 삭제할까요?", "일기 삭제")) return;

                try {
                    deleteButton.disabled = true;
                    await deleteDiary(diaryId);
                    window.location.href = "my-diary.html";
                } catch (error) {
                    showAppToast(error.message || "일기 삭제에 실패했어요.", "error", "삭제 실패");
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