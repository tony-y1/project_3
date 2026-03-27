self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(clients.claim()));

// 서버에서 전송한 push 이벤트를 받아 브라우저 알림으로 표시
self.addEventListener("push", (event) => {
  let data = {
    title: "말벗 알람",
    body: "알람 시간이 되었습니다.",
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    // 파싱 실패 시 위 기본값 유지
  }

  const title = data.title || "말벗 알람";
  const options = {
    body: data.body || "알람 시간이 되었습니다.",
    icon: "/favicon.ico",
    badge: "/favicon.ico",       // 모바일 상태바에 표시되는 작은 아이콘
    data: data,
    requireInteraction: true,    // 사용자가 직접 닫기 전까지 알림 유지
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// WEB PUSH 알림 일 경우 사용됨
  // 알람 수정한거 바로 적용 안되는 case의 경우
  // 1. 개발자도구(F12) → Application 탭
  // 2. 좌측 Service Workers 클릭
  // 3. sw.js 옆 Update 버튼 클릭
  // 4. 그 아래 "Update on reload" 체크박스도 켜두기
self.addEventListener("notificationclick", (event) => {
  console.log("notificationclick 발생");
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow("/diary_write.html");
    })
  );
});