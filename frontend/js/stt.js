const STT_MODE_KEY = "stt_mode";

const stt = (() => {
    let mode = localStorage.getItem(STT_MODE_KEY) || "webspeech";
    let isRecording = false;

    // Azure 관련
    let ws = null;
    let audioContext = null;
    let processor = null;

    // Web Speech 관련
    let recognition = null;
    let isStopped = false;

    function setStatus(text) {
        const el = document.getElementById("stt-status");
        if (!el) return;
        if (text) {
            el.textContent = text;
            el.classList.remove("hidden");
        } else {
            el.textContent = "";
            el.classList.add("hidden");
        }
    }

    function appendText(text) {
        const textarea = document.getElementById("diary-content")
            || document.getElementById("diary-read-content")
            || document.getElementById("diary-search-input");
        if (!textarea || !text.trim()) return;
        if (textarea.readOnly) return;
        const current = textarea.value;
        textarea.value = current ? current + " " + text.trim() : text.trim();
    }

    function setRecordingState(recording) {
        isRecording = recording;
        const btn = document.getElementById("voice-btn");
        if (!btn) return;
        if (recording) {
            btn.textContent = "⏹ 녹음 중지";
            btn.classList.add("recording");
        } else {
            btn.textContent = "음성으로 입력";
            btn.classList.remove("recording");
            setStatus("");
        }
    }

    function updateModeToggle() {
        const btn = document.getElementById("stt-mode-toggle");
        if (!btn) return;
        btn.textContent = mode === "azure" ? "Azure" : "Web Speech";
    }

    // ── Azure WebSocket STT ──
    async function startAzure() {
        const token = localStorage.getItem("access_token");
        if (!token) {
            setStatus("로그인이 필요해요.");
            setRecordingState(false);
            return;
        }
        const wsProtocol = location.protocol === "https:" ? "wss:" : "ws:";
        ws = new WebSocket(`${wsProtocol}//${location.host}/api/v1/voice/ws/stt`);

        ws.onopen = () => {
            console.log("STT WebSocket 연결됨");
            ws.send(JSON.stringify({ token }));
        };
        ws.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data.type === "partial") {
                setStatus("인식 중: " + data.text);
            } else if (data.type === "final") {
                appendText(data.text);
                setStatus("");
            } else if (data.type === "error") {
                setStatus(data.text);
            }
        };
        ws.onerror = (e) => {
            console.error("STT WebSocket 에러:", e);
            setStatus("연결 오류가 발생했어요.");
        };
        ws.onclose = () => console.log("STT WebSocket 끊김");

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new AudioContext({ sampleRate: 16000 });
        const source = audioContext.createMediaStreamSource(stream);
        processor = audioContext.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = (e) => {
            const float32 = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(float32.length);
            for (let i = 0; i < float32.length; i++) {
                int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768));
            }
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(int16.buffer);
            }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
        setRecordingState(true);
    }

    function stopAzure() {
        if (processor) { processor.disconnect(); processor = null; }
        if (audioContext) { audioContext.close(); audioContext = null; }
        if (ws) { ws.close(); ws = null; }
        setRecordingState(false);
    }

    // ── Web Speech STT ──
    function startWebSpeech() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            showAppToast("이 브라우저는 Web Speech API를 지원하지 않아요. Chrome을 사용해주세요.", "error", "지원 안 함");
            return;
        }

        isStopped = false;
        recognition = new SpeechRecognition();
        recognition.lang = "ko-KR";
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (e) => {
            let interim = "";
            let final = "";
            for (let i = e.resultIndex; i < e.results.length; i++) {
                if (e.results[i].isFinal) {
                    final += e.results[i][0].transcript;
                } else {
                    interim += e.results[i][0].transcript;
                }
            }
            if (interim) setStatus("인식 중: " + interim);
            if (final) {
                appendText(final);
                setStatus("");
            }
        };

        recognition.onend = () => {
            if (!isStopped) recognition.start();
        };

        recognition.onerror = (e) => {
            console.error("Web Speech 에러:", e.error);
            if (e.error !== "no-speech") setStatus("인식 오류: " + e.error);
        };

        recognition.start();
        setRecordingState(true);
    }

    function stopWebSpeech() {
        isStopped = true;
        if (recognition) { recognition.stop(); recognition = null; }
        setRecordingState(false);
    }

    // ── Public ──
    async function toggle() {
        if (isRecording) {
            if (mode === "azure") stopAzure();
            else stopWebSpeech();
        } else {
            try {
                if (mode === "azure") await startAzure();
                else startWebSpeech();
            } catch (err) {
                console.error("STT 시작 실패:", err);
                setStatus("마이크 권한이 필요해요.");
                setRecordingState(false);
            }
        }
    }

    function toggleMode() {
        if (isRecording) return;
        mode = mode === "azure" ? "webspeech" : "azure";
        localStorage.setItem(STT_MODE_KEY, mode);
        updateModeToggle();
    }

    function init() {
        const voiceBtn = document.getElementById("voice-btn");
        const modeToggle = document.getElementById("stt-mode-toggle");
        if (voiceBtn) voiceBtn.addEventListener("click", toggle);
        if (modeToggle) modeToggle.addEventListener("click", toggleMode);
        updateModeToggle();

        // diary_read.html: 수정 버튼 클릭 시 textarea readonly 상태에 따라 음성 버튼 표시/숨김
        const editBtn = document.getElementById("diary-edit-button");
        const voiceBtnWrapper = document.getElementById("voice-btn-wrapper");
        if (editBtn && voiceBtnWrapper) {
            editBtn.addEventListener("click", () => {
                setTimeout(() => {
                    const content = document.getElementById("diary-read-content");
                    if (content) {
                        voiceBtnWrapper.classList.toggle("hidden", content.readOnly);
                    }
                }, 0);
            });
        }
    }

    return { init };
})();

document.addEventListener("DOMContentLoaded", stt.init);
