// 담당: 정원님 - 알람 및 Web Push 관련 기능

function populateAlarmTimeSelects() {
  const hourSelect = document.getElementById("alarm-hour");
  const minuteSelect = document.getElementById("alarm-minute");
  if (!hourSelect || !minuteSelect) return;

  for (let h = 1; h <= 12; h++) {
    const opt = document.createElement("option");
    opt.value = String(h);
    opt.textContent = h + "시";
    hourSelect.appendChild(opt);
  }

  for (let m = 0; m <= 59; m++) {
    const opt = document.createElement("option");
    opt.value = String(m).padStart(2, "0");
    opt.textContent = String(m).padStart(2, "0") + "분";
    minuteSelect.appendChild(opt);
  }

  initCustomSelect(document.getElementById("alarm-ampm"));
  initCustomSelect(hourSelect);
  initCustomSelect(minuteSelect);
}

function getAlarmTimeValue() {
  const ampm = document.getElementById("alarm-ampm")?.value;
  const hourRaw = parseInt(document.getElementById("alarm-hour")?.value || "0", 10);
  const minute = document.getElementById("alarm-minute")?.value || "00";

  if (!ampm || !hourRaw) return null;

  let hour24 = hourRaw;
  if (ampm === "AM" && hourRaw === 12) hour24 = 0;
  else if (ampm === "PM" && hourRaw !== 12) hour24 = hourRaw + 12;

  return `${String(hour24).padStart(2, "0")}:${minute}:00`;
}

function setAlarmTimeSelects(timeStr) {
  const [hhStr, mmStr] = timeStr.split(":");
  const hh = parseInt(hhStr, 10);

  const ampm = hh < 12 ? "AM" : "PM";
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;

  const ampmSelect = document.getElementById("alarm-ampm");
  const hourSelect = document.getElementById("alarm-hour");
  const minuteSelect = document.getElementById("alarm-minute");

  if (ampmSelect) ampmSelect.value = ampm;
  if (hourSelect) hourSelect.value = String(hour12);
  if (minuteSelect) minuteSelect.value = mmStr.slice(0, 2);
}

const DAY_KOR = {
  MON: "월요일", TUE: "화요일", WED: "수요일",
  THU: "목요일", FRI: "금요일", SAT: "토요일", SUN: "일요일",
};
const ALL_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function formatDaysKorean(repeatDaysStr) {
  if (!repeatDaysStr) return "-";
  const days = repeatDaysStr.split(",").map((d) => d.trim());
  if (days.length === 7) return "매일";
  return days.map((d) => DAY_KOR[d] || d).join(", ");
}

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
  const dayIdMap = {
    MON: "day-mon", TUE: "day-tue", WED: "day-wed",
    THU: "day-thu", FRI: "day-fri", SAT: "day-sat", SUN: "day-sun",
  };

  return Object.entries(dayIdMap)
    .filter(([, id]) => document.getElementById(id)?.classList.contains("is-active"))
    .map(([day]) => day);
}

// 매일 버튼 ↔ 개별 요일 버튼 연동
function setupDayAllToggle() {
  const allBtn = document.getElementById("day-all");
  const dayIds = ALL_DAYS.map((d) => `day-${d.toLowerCase()}`);

  if (!allBtn) return;

  allBtn.addEventListener("click", () => {
    const isActive = allBtn.classList.toggle("is-active");
    dayIds.forEach((id) => {
      document.getElementById(id)?.classList.toggle("is-active", isActive);
    });
  });

  dayIds.forEach((id) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener("click", () => {
      btn.classList.toggle("is-active");
      allBtn.classList.toggle("is-active", dayIds.every((i) => document.getElementById(i)?.classList.contains("is-active")));
    });
  });
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

// 현재 수정 중인 알람 ID (null이면 신규 생성 모드)
let editingAlarmId = null;

function showAlarmListView() {
  document.getElementById("alarm-view-list")?.classList.remove("hidden");
  document.getElementById("alarm-view-form")?.classList.add("hidden");
  editingAlarmId = null;
}

function showAlarmFormView(mode) {
  document.getElementById("alarm-view-list")?.classList.add("hidden");
  document.getElementById("alarm-view-form")?.classList.remove("hidden");

  const title = document.getElementById("alarm-form-title");
  if (title) title.textContent = mode === "edit" ? "알람 수정" : "알람 추가";

  if (mode === "create") {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    setAlarmTimeSelects(`${hh}:${mm}`);

    ALL_DAYS.forEach((d) => {
      document.getElementById(`day-${d.toLowerCase()}`)?.classList.remove("is-active");
    });
    document.getElementById("day-all")?.classList.remove("is-active");

    const enabledCb = document.getElementById("alarm-enabled");
    if (enabledCb) enabledCb.checked = true;
  }
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
    item.className = "profile-alarm-row";

    const korDays = formatDaysKorean(alarm.repeat_days);
    const timeDisplay = alarm.alarm_time.slice(0, 5);

    item.innerHTML = `
      <div>
        <p class="profile-calendar-caption" style="margin-bottom:4px;">Alarm</p>
        <p class="profile-alarm-item-time">${timeDisplay}</p>
        <p class="profile-alarm-item-days">${korDays}</p>
      </div>
      <div class="profile-alarm-item-actions">
        <button type="button" data-alarm-id="${alarm.id}" class="edit-alarm-btn profile-calendar-nav">수정</button>
        <button type="button" data-alarm-id="${alarm.id}" class="delete-alarm-btn profile-calendar-nav is-danger">삭제</button>
      </div>
    `;

    alarmListEl.appendChild(item);
  });

  // 수정 버튼 이벤트 등록
  alarmListEl.querySelectorAll(".edit-alarm-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const alarmId = parseInt(btn.dataset.alarmId);
      const alarm = alarms.find((a) => a.id === alarmId);
      if (alarm) fillFormForEdit(alarm);
    });
  });

  // 삭제 버튼 이벤트 등록
  alarmListEl.querySelectorAll(".delete-alarm-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const alarmId = parseInt(btn.dataset.alarmId);
      deleteAlarm(alarmId);
    });
  });
}

// 폼에 기존 알람 데이터를 채우고 수정 모드로 전환
function fillFormForEdit(alarm) {
  editingAlarmId = alarm.id;

  setAlarmTimeSelects(alarm.alarm_time.slice(0, 5));

  // 요일 버튼 상태 설정
  const dayIdMap = { MON: "day-mon", TUE: "day-tue", WED: "day-wed", THU: "day-thu", FRI: "day-fri", SAT: "day-sat", SUN: "day-sun" };
  const activeDays = alarm.repeat_days ? alarm.repeat_days.split(",").map((d) => d.trim()) : [];

  ALL_DAYS.forEach((day) => {
    const btn = document.getElementById(dayIdMap[day]);
    if (btn) btn.classList.toggle("is-active", activeDays.includes(day));
  });

  // 매일 버튼 상태 동기화
  const allBtn = document.getElementById("day-all");
  if (allBtn) allBtn.classList.toggle("is-active", activeDays.length === 7);

  const alarmEnabledInput = document.getElementById("alarm-enabled");
  if (alarmEnabledInput) alarmEnabledInput.checked = alarm.is_enabled;

  showAlarmFormView("edit");
}

// 알람 목록 조회
async function loadAlarms() {
  const token = getAccessToken();
  console.log("loadAlarms token:", token);

  if (!token) {
    showAppToast("로그인이 필요합니다.", "error", "인증 오류");
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
    showAppToast("알람 목록을 불러오지 못했습니다.", "error", "오류");
  }
}

// 알람 삭제
async function deleteAlarm(alarmId) {
  if (!await showAppConfirm("알람을 삭제할까요?", "알람 삭제")) return;

  const token = getAccessToken();
  if (!token) {
    showAppToast("로그인이 필요합니다.", "error", "인증 오류");
    return;
  }

  try {
    const response = await fetch(`/api/v1/alarms/${alarmId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`알람 삭제 실패: ${response.status} / ${errorText}`);
    }

    await loadAlarms();
  } catch (error) {
    console.error("알람 삭제 실패:", error);
    showAppToast("알람 삭제에 실패했습니다.", "error", "삭제 실패");
  }
}

// 알람 저장 (신규: POST / 수정: PUT)
async function saveAlarm() {
  const token = getAccessToken();
  if (!token) {
    showAppToast("로그인이 필요합니다.", "error", "인증 오류");
    return;
  }

  const alarmTime = getAlarmTimeValue();
  if (!alarmTime) {
    showAppToast("알람 시간을 선택해주세요.", "info", "입력 확인");
    return;
  }

  const repeatDays = getSelectedRepeatDays();

  if (repeatDays.length === 0) {
    showAppToast("반복 요일을 하나 이상 선택해주세요.", "info", "입력 확인");
    return;
  }

  const body = {
    alarm_time: alarmTime,
    repeat_days: repeatDays,
    is_enabled: true,
  };

  const isEditMode = editingAlarmId !== null;
  const url = isEditMode ? `/api/v1/alarms/${editingAlarmId}` : "/api/v1/alarms/";
  const method = isEditMode ? "PUT" : "POST";

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`알람 ${isEditMode ? "수정" : "저장"} 실패: ${response.status} / ${errorText}`);
    }

    await response.json();
    showAppToast(isEditMode ? "알람이 수정되었습니다." : "알람이 저장되었습니다.", "success", isEditMode ? "수정 완료" : "저장 완료");

    showAlarmListView();
    await loadAlarms();
  } catch (error) {
    console.error("알람 저장/수정 실패:", error);
    showAppToast("알람 저장에 실패했습니다.", "error", "저장 실패");
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
  populateAlarmTimeSelects();
  setupDayAllToggle();

  const registration = await registerServiceWorker();
  await requestAlarmNotificationPermission();

  if (registration) {
    await subscribePush(registration);
  }

  document.getElementById("save-alarm-btn")?.addEventListener("click", saveAlarm);
  document.getElementById("add-alarm-btn")?.addEventListener("click", () => showAlarmFormView("create"));
  document.getElementById("back-to-list-btn")?.addEventListener("click", showAlarmListView);
  document.getElementById("cancel-alarm-btn")?.addEventListener("click", showAlarmListView);

  await loadAlarms();
  // 폴링 방식 주석처리 - web push 동작만 사용하도록 변경
  // await checkDueAlarmsForNotification();

  // setInterval(() => {
  //   checkDueAlarmsForNotification();
  // }, 30000);
});
