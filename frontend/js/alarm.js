// 담당: 정원님 - 알람 및 Web Push 관련 기능

function getAccessToken() {
  const inputEl = document.getElementById("token-input");
  // test/alarm.html 테스트 편하려고 만든 부분, 다른데서는 사용X
  if (inputEl && inputEl.value.trim()) {
    return inputEl.value.trim();
  }
  return localStorage.getItem("access_token");
}

// 이미 표시한 알림 중복 방지용 저장소
const shownAlarmMap = new Map();

// 브라우저 알림 권한 요청
async function requestAlarmNotificationPermission() {
  if (!("Notification" in window)) return;

  if (Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch (error) {
      console.error("알림 권한 요청 실패:", error);
    }
  }
}

// 선택된 요일 목록 반환
function getSelectedRepeatDays() {
  const dayCheckboxMap = {
    MON: document.getElementById("day-mon"),
    TUE: document.getElementById("day-tue"),
    WED: document.getElementById("day-wed"),
    THU: document.getElementById("day-thu"),
    FRI: document.getElementById("day-fri"),
    SAT: document.getElementById("day-sat"),
    SUN: document.getElementById("day-sun"),
  };

  return Object.entries(dayCheckboxMap)
    .filter(([, checkbox]) => checkbox && checkbox.checked)
    .map(([day]) => day);
}

// 일반 브라우저 알림 표시
// 폴링 방식, 호출안되게 상위에서 주석처리되어있음 : checkDueAlarmsForNotification (폴링) > showAlarmNotification
function showAlarmNotification(alarm) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const now = Date.now();
  const lastShownAt = shownAlarmMap.get(alarm.id);

  // 1분 안에 같은 알람 다시 띄우지 않음
  if (lastShownAt && now - lastShownAt < 60000) {
    return;
  }

  shownAlarmMap.set(alarm.id, now);

  const notification = new Notification("말벗 알람", {
    body: `설정한 알람 시간입니다. (${alarm.alarm_time})`,
  });

  notification.onclick = () => {
    window.focus();
    window.location.href = "/";
  };
}

// 알람 목록 화면 렌더링
function renderAlarmList(alarms) {
  const alarmListEl = document.getElementById("alarm-list");
  if (!alarmListEl) return;

  alarmListEl.innerHTML = "";

  if (!alarms || alarms.length === 0) {
    alarmListEl.innerHTML = "<p>등록된 알람이 없습니다.</p>";
    return;
  }

  alarms.forEach((alarm) => {
    const item = document.createElement("div");
    item.style.border = "1px solid #ccc";
    item.style.borderRadius = "10px";
    item.style.padding = "12px";
    item.style.marginBottom = "12px";

    item.innerHTML = `
      <p><strong>시간:</strong> ${alarm.alarm_time}</p>
      <p><strong>요일:</strong> ${alarm.repeat_days || "-"}</p>
      <p><strong>상태:</strong> ${alarm.is_enabled ? "활성" : "비활성"}</p>
    `;

    alarmListEl.appendChild(item);
  });
}

// 알람 목록 조회
async function loadAlarms() {
  const token = getAccessToken();
  console.log("loadAlarms token:", token);

  if (!token) {
    alert("로그인이 필요합니다.");
    return;
  }

  try {
    const response = await fetch("/api/v1/alarms/", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    console.log("loadAlarms status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`알람 목록 조회 실패: ${response.status} / ${errorText}`);
    }

    const alarms = await response.json();
    console.log("알람 목록:", alarms);

    renderAlarmList(alarms);
  } catch (error) {
    console.error("알람 목록 조회 실패", error);
    alert("알람 목록을 불러오지 못했습니다.");
  }
}

// 알람 저장
async function saveAlarm() {
  const token = getAccessToken();
  const alarmTimeInput = document.getElementById("alarm-time");
  const alarmEnabledInput = document.getElementById("alarm-enabled");

  if (!token) {
    alert("로그인이 필요합니다.");
    return;
  }

  if (!alarmTimeInput || !alarmTimeInput.value) {
    alert("알람 시간을 선택해주세요.");
    return;
  }

  const repeatDays = getSelectedRepeatDays();

  if (repeatDays.length === 0) {
    alert("반복 요일을 하나 이상 선택해주세요.");
    return;
  }

  const body = {
    alarm_time: `${alarmTimeInput.value}:00`,
    repeat_days: repeatDays,
    is_enabled: alarmEnabledInput ? alarmEnabledInput.checked : true,
  };

  try {
    const response = await fetch("/api/v1/alarms/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`알람 저장 실패: ${response.status} / ${errorText}`);
    }

    await response.json();
    alert("알람이 저장되었습니다.");
    await loadAlarms();
  } catch (error) {
    console.error("알람 저장 실패:", error);
    alert("알람 저장에 실패했습니다.");
  }
}

// 웹 푸시용 VAPID 공개키를 Uint8Array 형태로 변환
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

// Service Worker를 등록하고 registration 객체를 반환
async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    console.log("Service Worker 등록 성공:", registration.scope);
    return registration;
  } catch (error) {
    console.error("Service Worker 등록 실패:", error);
    return null;
  }
}

// 브라우저를 푸시 구독 상태로 만들고, 구독 정보를 서버에 저장
async function subscribePush(registration) {
  try {
    const token = getAccessToken();

    if (!token) {
      console.warn("access_token이 없습니다. 로그인 후 재시도 필요.");
      return;
    }

    const keyResponse = await fetch("/api/v1/alarms/push/public-key");
    const keyData = await keyResponse.json();
    const publicKey = keyData.publicKey;

    if (!publicKey) {
      console.error("VAPID 공개키가 없습니다.");
      return;
    }

    // 기존 구독 해제 후 새로 등록 (VAPID 키 변경 시 403 방지)
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      await existing.unsubscribe();
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const response = await fetch("/api/v1/alarms/push/subscribe", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(subscription),
    });

    if (!response.ok) {
      console.error("Push 구독 저장 실패", await response.text());
      return;
    }

    console.log("Push 구독 저장 성공");
  } catch (error) {
    console.error("Push 구독 실패:", error);
  }
}

// 기존 due 알람 조회 방식
// 현재는 웹 푸시가 핵심이지만, 보조 확인용으로 유지 => 호출부 주석처리됨 (호출 X)
// 폴링 방식, 호출안되게 상위에서 주석처리되어있음 : checkDueAlarmsForNotification (폴링) > showAlarmNotification
async function checkDueAlarmsForNotification() {
  const token = getAccessToken();
  if (!token) return;

  try {
    const response = await fetch("/api/v1/alarms/due", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error("due 알람 조회 실패:", response.status);
      return;
    }

    const data = await response.json();
    if (!data.items || data.items.length === 0) return;

    data.items.forEach((alarm) => {
      showAlarmNotification(alarm);
    });
  } catch (error) {
    console.error("due 알람 조회 실패:", error);
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  const saveAlarmBtn = document.getElementById("save-alarm-btn");
  const loadAlarmsBtn = document.getElementById("load-alarms-btn");

  const registration = await registerServiceWorker();
  await requestAlarmNotificationPermission();

  if (registration) {
    await subscribePush(registration);
  }

  if (saveAlarmBtn) {
    saveAlarmBtn.addEventListener("click", saveAlarm);
  }

  if (loadAlarmsBtn) {
    loadAlarmsBtn.addEventListener("click", loadAlarms);
  }

  await loadAlarms();
  // 폴링 방식 주석처리 - web push 동작만 사용하도록 변경
  // await checkDueAlarmsForNotification();

  // setInterval(() => {
  //   checkDueAlarmsForNotification();
  // }, 30000);
});
