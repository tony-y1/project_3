// 서버에서 전송한 push 이벤트를 받아 브라우저 알림으로 표시
self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {
      title: "말벗 알람",
      body: "알람 시간이 되었습니다."
    };
  }

  const title = data.title || "말벗 알람";
  const options = {
    body: data.body || "알람 시간이 되었습니다.",
    icon: "/favicon.ico"
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});