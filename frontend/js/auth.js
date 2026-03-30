const ACCESS_TOKEN_KEY = "access_token";
const AUTH_USER_KEY = "auth_user";

function setMessage(element, message, isError = false) {
    if (!element) {
        return;
    }

    element.textContent = message;
    element.classList.remove("hidden");
    // 다크 배경에서 눈에 띄도록 에러일 경우 밝은 빨간색으로 표시합니다.
    element.style.color = isError ? "#ff4d4d" : "#6B8F5E";
}

function clearMessage(element) {
    if (!element) {
        return;
    }

    element.textContent = "";
    element.classList.add("hidden");
}

function setButtonLoading(button, isLoading, idleText, loadingText) {
    if (!button) {
        return;
    }

    button.disabled = isLoading;
    button.textContent = isLoading ? loadingText : idleText;
    button.style.opacity = isLoading ? "0.7" : "";
    button.style.cursor = isLoading ? "not-allowed" : "";
}

function saveAuth(token, user) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function clearAuth() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
}

function getAuthUser() {
    try {
        const raw = localStorage.getItem(AUTH_USER_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (_error) {
        return null;
    }
}


async function logout() {
    try {
        if (typeof apiRequest === "function") {
            await apiRequest("/auth/logout", {
                method: "POST",
            });
        }
    } catch (_error) {
        // JWT logout is client-side, so local cleanup is enough.
    } finally {
        clearAuth();
    }
}

function initProfileLogout() {
    const logoutButton = document.getElementById("profile-logout-button");
    if (!logoutButton) {
        return;
    }

    logoutButton.addEventListener("click", async () => {
        await logout();
        window.location.href = "index.html";
    });
}

function requireAuth() {
    if (!getAccessToken()) {
        window.location.href = "login.html";
        return false;
    }

    return true;
}

function initAuthNav() {
    const authLink = document.getElementById("auth-link");
    if (!authLink) {
        return;
    }

    if (getAccessToken()) {
        authLink.textContent = "내 프로필";
        authLink.href = "profile.html";
        return;
    }

    authLink.textContent = "로그인/회원가입";
    authLink.href = "login.html";
}

function initIndexGreeting() {
    const greeting = document.getElementById("index-user-greeting");
    if (!greeting || !getAccessToken()) {
        return;
    }

    const user = getAuthUser();
    const nickname = user?.nickname?.trim();

    if (!nickname) {
        return;
    }

    greeting.textContent = `안녕하세요 ${nickname}님!\n오늘 하루를 남겨보세요!`;
    greeting.classList.remove("hidden");
}

function checkPasswordMatch() {
    const pw = document.getElementById("signup-password")?.value || "";
    const pwConfirm = document.getElementById("signup-password-confirm")?.value || "";
    const msg = document.getElementById("password-match-msg");
    const confirmInput = document.getElementById("signup-password-confirm");

    if (!msg || !confirmInput) {
        return pw === pwConfirm;
    }

    if (pwConfirm === "") {
        msg.classList.add("hidden");
        confirmInput.style.borderColor = "";
        return false;
    }

    if (pw === pwConfirm) {
        msg.textContent = "Passwords match.";
        msg.style.color = "#6B8F5E";
        msg.classList.remove("hidden");
        confirmInput.style.borderColor = "#6B8F5E";
        return true;
    }

    msg.textContent = "Passwords do not match.";
    msg.style.color = "#ff4d4d";
    msg.classList.remove("hidden");
    confirmInput.style.borderColor = "#ff4d4d";
    return false;
}

async function login(username, password) {
    return apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
    });
}

async function register(userData) {
    return apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify(userData),
    });
}

async function handleLoginSubmit(event) {
    event.preventDefault(); // 여기서 폼 제출 새로고침을 완벽하게 1차 차단합니다.

    const usernameInput = document.getElementById("login-username");
    const passwordInput = document.getElementById("login-password");
    const message = document.getElementById("login-message");
    const submitButton = document.getElementById("login-submit");

    clearMessage(message);

    const username = usernameInput?.value.trim() || "";
    const password = passwordInput?.value || "";

    if (!username || !password) {
        setMessage(message, "아이디와 비밀번호를 모두 입력해주세요.", true);
        return;
    }

    setButtonLoading(submitButton, true, "Sign In", "Signing In...");

    try {
        const result = await login(username, password);
        saveAuth(result.access_token, result.user);
        setMessage(message, "로그인 성공! 이동 중...", false);

        // custom 페르소나 없으면 온보딩으로, 있으면 프로필로
        // GET /personas/는 기본 preset 3개를 자동 생성하므로 length가 아닌
        // custom 타입 존재 여부로 온보딩 완료 여부를 판단
        window.setTimeout(async () => {
            try {
                const personas = await apiRequest("/personas/", { method: "GET" });
                const hasOnboarded = personas.some(p => p.preset_type === "custom");
                window.location.href = hasOnboarded ? "profile.html" : "persona-onboarding.html";
            } catch (_) {
                window.location.href = "profile.html";
            }
        }, 500);
    } catch (error) {
        // api.js의 수정 덕분에 여기로 무사히 넘어와서 빨간색 에러 메시지를 띄우게 됩니다.
        setMessage(message, "아이디 또는 비밀번호가 잘못되었습니다.", true);
    } finally {
        setButtonLoading(submitButton, false, "Sign In", "Signing In...");
    }
}

async function handleSignupSubmit(event) {
    event.preventDefault();

    const nicknameInput = document.getElementById("signup-nickname");
    const usernameInput = document.getElementById("signup-username");
    const passwordInput = document.getElementById("signup-password");
    const message = document.getElementById("signup-message");
    const submitButton = document.getElementById("signup-submit");

    clearMessage(message);

    const nickname = nicknameInput?.value.trim() || "";
    const username = usernameInput?.value.trim() || "";
    const password = passwordInput?.value || "";

    if (!nickname || !username || !password) {
        setMessage(message, "모든 항목을 입력해주세요.", true);
        return;
    }

    if (!checkPasswordMatch()) {
        setMessage(message, "비밀번호 확인이 일치하지 않습니다.", true);
        return;
    }

    setButtonLoading(submitButton, true, "Join Us", "Joining...");

    try {
        await register({ nickname, username, password });
        setMessage(message, "회원가입이 완료되었습니다. 로그인해주세요.", false);
        event.target.reset();

        const pwMessage = document.getElementById("password-match-msg");
        clearMessage(pwMessage);

        const confirmInput = document.getElementById("signup-password-confirm");
        if (confirmInput) {
            confirmInput.style.borderColor = "";
        }

        toggleForm("login");
        document.getElementById("login-username")?.focus();
    } catch (error) {
        setMessage(message, error.message || "회원가입에 실패했습니다.", true);
    } finally {
        setButtonLoading(submitButton, false, "Join Us", "Joining...");
    }
}

function initLoginPage() {
    const loginForm = document.getElementById("login-form-element");
    const signupForm = document.getElementById("signup-form-element");
    const passwordInput = document.getElementById("signup-password");
    const passwordConfirmInput = document.getElementById("signup-password-confirm");

    if (!loginForm || !signupForm) {
        return;
    }

    if (getAccessToken()) {
        window.location.href = "profile.html";
        return;
    }

    loginForm.addEventListener("submit", handleLoginSubmit);
    signupForm.addEventListener("submit", handleSignupSubmit);
    passwordInput?.addEventListener("input", checkPasswordMatch);
    passwordConfirmInput?.addEventListener("input", checkPasswordMatch);
}

function initProtectedPage() {
    const body = document.body;
    if (!body) {
        return;
    }

    if (
        body.classList.contains("page-diary") ||
        body.classList.contains("page-diary-detail") ||
        body.classList.contains("page-persona") ||
        body.classList.contains("page-profile")
    ) {
        requireAuth();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initAuthNav();
    initIndexGreeting();
    initProfileLogout();
    initLoginPage();
    initProtectedPage();
});