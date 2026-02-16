// app/IncomingCallScreen.js
import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Image, Platform, PermissionsAndroid, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useCall } from "../../context/callContext";
import { Audio } from "expo-av";

export default function IncomingCallScreen() {
  const { callId } = useLocalSearchParams();
  const router = useRouter();
  const { answerCall, hangup } = useCall();
  const [callInfo, setCallInfo] = useState(null);
  const soundRef = useRef(null);

  useEffect(() => {
    let unsub;
    if (callId) {
      const ref = doc(db, "calls", callId);
      unsub = onSnapshot(ref, (snap) => {
        if (snap.exists()) setCallInfo(snap.data());
      });
    }
    return () => {
      if (unsub) unsub();
    };
  }, [callId]);

  // Play ringtone when incoming call screen opens
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });
        const s = new Audio.Sound();
        // Use system notification sound as fallback
        await s.loadAsync(
          { uri: Platform.OS === 'android' 
            ? 'content://settings/system/notification_sound'
            : 'ipod-library://ringtone' },
          { shouldPlay: true, isLooping: true }
        );
        if (mounted) {
          soundRef.current = s;
        }
      } catch (e) {
        // If system sound fails, silently continue without ringtone
        console.log('[IncomingCall] Ringtone error:', e.message);
      }
    })();
    return () => {
      mounted = false;
      if (soundRef.current) {
        soundRef.current.stopAsync().catch(() => {});
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const onAccept = async () => {
    if (soundRef.current) {
      soundRef.current.stopAsync().catch(() => {});
    }

    // Request permissions on Android
    if (Platform.OS === 'android') {
      const isVideo = callInfo?.isVideo;
      const permissions = isVideo 
        ? [PermissionsAndroid.PERMISSIONS.CAMERA, PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]
        : [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
      
      const granted = await PermissionsAndroid.requestMultiple(permissions);
      
      const audioGranted = granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
      const cameraGranted = !isVideo || granted[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED;
      
      if (!audioGranted || !cameraGranted) {
        Alert.alert(
          'Permissions Required',
          `Please grant ${isVideo ? 'camera and microphone' : 'microphone'} permissions to accept this call.`
        );
        return;
      }
    }

    const result = await answerCall({ callId }, { isVideo: callInfo?.isVideo });
    if (result?.success) {
      router.replace({
        pathname: '/CallScreen',
        params: { callId },
      });
    }
  };

  const onReject = async () => {
    if (soundRef.current) {
      soundRef.current.stopAsync().catch(() => {});
    }
    await updateDoc(doc(db, "calls", callId), { status: "rejected" });
    router.canGoBack() ? router.back() : router.replace('home');
  };

  if (!callInfo) return null;

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#000",
      }}
    >
      <Image
        source={{ uri: callInfo?.callerPhoto || undefined }}
        style={{ width: 160, height: 160, borderRadius: 90, marginBottom: 20 }}
      />
      <Text style={{ color: "#fff", fontSize: 22 }}>
        {callInfo?.callerName || "Incoming call"}
      </Text>
      <Text style={{ color: "#cfcfcf", marginTop: 6 }}>
        {callInfo?.isVideo ? "Video call" : "Voice call"}
      </Text>

      <View style={{ flexDirection: "row", marginTop: 30, gap: 20 }}>
        <TouchableOpacity
          onPress={onAccept}
          style={{
            backgroundColor: "green",
            padding: 14,
            borderRadius: 40,
            marginRight: 20,
          }}
        >
          <Text style={{ color: "#fff" }}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onReject}
          style={{ backgroundColor: "red", padding: 14, borderRadius: 40 }}
        >
          <Text style={{ color: "#fff" }}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
