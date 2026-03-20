const API_BASE_URL = "/api/v1";

async function apiRequest(path, options = {}) {
    const token = localStorage.getItem("access_token");

    const response = await fetch(`${API_BASE_URL}${path}`, {
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
        ...options,
    });

    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get("content-type") || "";
    const rawText = await response.text();
    const payload = contentType.includes("application/json") && rawText
        ? JSON.parse(rawText)
        : rawText;

    if (!response.ok) {
        const detail = typeof payload === "object" && payload !== null
            ? payload.detail
            : payload;
        throw new Error(detail || "요청 처리 중 오류가 발생했습니다.");
    }

    return payload;
}

function getJsonBody(data) {
    return JSON.stringify(data);
}
