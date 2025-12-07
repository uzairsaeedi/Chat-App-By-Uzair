// utils/sendPush.js
export async function sendExpoPush(expoPushToken, title, body, data = {}) {
  if (!expoPushToken) return;
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: expoPushToken,
      title,
      body,
      data,
      sound: "default",
      priority: "high",
    }),
  });
}
