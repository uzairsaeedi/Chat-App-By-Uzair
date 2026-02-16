// utils/notifications.js
import * as Notifications from "expo-notifications";
import { doc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

// Send a push through Expo Push API
export async function sendExpoPush(toExpoPushToken, title, body, data = {}) {
  try {
    if (!toExpoPushToken) {
      console.warn('[Notification] No push token provided');
      return null;
    }
    
    // Check if this is an Expo token or FCM token
    const isExpoToken = toExpoPushToken.startsWith('ExponentPushToken');
    
    const message = {
      to: toExpoPushToken,
      title: title,
      body: body,
      data: data,
      sound: "default",
      priority: "high",
      // Android specific settings for background delivery
      channelId: data.screen === "incomingCallScreen" ? "calls" : "default",
      // These help with background delivery
      _displayInForeground: true,
      // For calls, use high priority to wake the device
      ...(data.screen === "incomingCallScreen" && {
        categoryId: "call",
        ttl: 60, // Call notifications expire in 60 seconds
      }),
    };

    console.log('[Notification] Sending push to:', toExpoPushToken.substring(0, 30) + '...');

    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(message),
    });

    const json = await res.json();
    console.log('[Notification] Push response:', JSON.stringify(json));
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
      await setDoc(
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

// Play a local notification sound for incoming messages
let messageSound = null;

export async function playMessageSound() {
  try {
    // Import Audio dynamically to avoid issues on web
    const { Audio } = require('expo-av');
    
    // Stop any existing sound
    if (messageSound) {
      try {
        await messageSound.stopAsync();
        await messageSound.unloadAsync();
      } catch (e) {}
      messageSound = null;
    }

    // Create and play message notification sound
    const { sound } = await Audio.Sound.createAsync(
      { uri: 'https://www.soundjay.com/communication/sounds/notification-sound-7062.mp3' },
      { shouldPlay: true, volume: 0.7 }
    );
    
    messageSound = sound;
    
    // Auto unload after playing
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        messageSound = null;
      }
    });
    
    console.log('[Notification] Message sound played');
  } catch (e) {
    console.log('[Notification] Could not play message sound:', e.message);
  }
}
