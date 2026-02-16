// app/IncomingCallScreen.js
import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Image, Platform, PermissionsAndroid, Alert, Vibration } from "react-native";
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
  const vibrationRef = useRef(null);

  useEffect(() => {
    let unsub;
    if (callId) {
      const ref = doc(db, "calls", callId);
      unsub = onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setCallInfo(data);
          // If call was cancelled or ended, navigate away
          if (data.status === "cancelled" || data.status === "ended") {
            stopRingtone();
            router.canGoBack() ? router.back() : router.replace('home');
          }
        }
      });
    }
    return () => {
      if (unsub) unsub();
    };
  }, [callId]);

  const stopRingtone = () => {
    if (soundRef.current) {
      soundRef.current.stopAsync().catch(() => {});
      soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    if (vibrationRef.current) {
      clearInterval(vibrationRef.current);
      vibrationRef.current = null;
    }
    Vibration.cancel();
  };

  // Play ringtone when incoming call screen opens
  useEffect(() => {
    let mounted = true;
    
    const startRingtone = async () => {
      try {
        // Set audio mode for ringtone
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
        });

        // Create and play sound - use a tone generator approach
        const { sound } = await Audio.Sound.createAsync(
          // Use a data URI for a simple beep tone (440Hz sine wave)
          { uri: 'https://www.soundjay.com/phone/phone-calling-1.mp3' },
          { 
            shouldPlay: true, 
            isLooping: true,
            volume: 1.0,
          }
        );
        
        if (mounted) {
          soundRef.current = sound;
          console.log('[IncomingCall] Ringtone started');
        } else {
          await sound.unloadAsync();
        }
      } catch (e) {
        console.log('[IncomingCall] Sound error, using vibration only:', e.message);
      }

      // Always start vibration pattern as backup
      if (mounted) {
        // Vibration pattern: vibrate 1s, pause 1s, repeat
        const VIBRATION_PATTERN = [0, 1000, 1000];
        
        if (Platform.OS === 'android') {
          Vibration.vibrate(VIBRATION_PATTERN, true); // true = repeat
        } else {
          // iOS doesn't support repeating vibration, so we use interval
          Vibration.vibrate(1000);
          vibrationRef.current = setInterval(() => {
            Vibration.vibrate(1000);
          }, 2000);
        }
      }
    };

    startRingtone();

    return () => {
      mounted = false;
      stopRingtone();
    };
  }, []);

  const onAccept = async () => {
    stopRingtone();

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
    stopRingtone();
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
