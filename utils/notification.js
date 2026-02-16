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

    // Request notification permissions first
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('[Notification] Permission not granted');
      return null;
    }

    // Get Expo push token - this works with or without Firebase
    // For standalone Android APKs, ensure Firebase is initialized in native code
    let token = null;
    try {
      const tokenObj = await Notifications.getExpoPushTokenAsync({
        projectId: '18412ab2-1411-4cf5-afeb-26ca690a230e'
      });
      token = tokenObj?.data ?? tokenObj?.pushToken ?? null;
    } catch (tokenErr) {
      // If Expo token fails on Android, try device push token as fallback
      console.warn('[Notification] Expo token failed, trying device token:', tokenErr.message);
      try {
        const deviceToken = await Notifications.getDevicePushTokenAsync();
        token = deviceToken?.data ?? null;
      } catch (deviceErr) {
        console.warn('[Notification] Device token also failed:', deviceErr.message);
        return null;
      }
    }

    if (token) {
      await updateDoc(
        doc(db, "users", uid),
        { pushToken: token },
        { merge: true }
      );
      console.log('[Notification] Push token registered:', token.substring(0, 25) + '...');
      return token;
    }
    
    console.warn('[Notification] No token obtained');
    return null;
  } catch (e) {
    console.warn("[Notification] registerPushTokenToFirestore err:", e.message);
    return null;
  }
}
