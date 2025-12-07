// utils/notifications.js
import * as Notifications from "expo-notifications";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

// Send a push through Expo Push API
export async function sendExpoPush(toExpoPushToken, title, body, data = {}) {
  try {
    if (!toExpoPushToken) return null;
    const message = {
      to: toExpoPushToken,
      title: title,
      body: body,
      data: data,
      sound: "default",
      priority: "high",
    };

    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    const json = await res.json();
    return json;
  } catch (e) {
    console.warn("sendExpoPush err", e);
    return null;
  }
}

// Register device's Expo push token to users/{uid}.pushToken
export async function registerPushTokenToFirestore(uid) {
  try {
    if (!uid) return null;

    // Only works on native (dev-client / standalone), may fail on web
    const tokenObj = await Notifications.getExpoPushTokenAsync();
    const token = tokenObj?.data ?? tokenObj?.pushToken ?? null;

    if (token) {
      await updateDoc(
        doc(db, "users", uid),
        { pushToken: token },
        { merge: true }
      );
      return token;
    }
  } catch (e) {
    console.warn("registerPushTokenToFirestore err", e);
    return null;
  }
}
