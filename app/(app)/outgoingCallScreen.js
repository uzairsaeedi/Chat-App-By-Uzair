// app/OutgoingCallScreen.js
import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCall } from "../../context/callContext";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { Audio } from "expo-av";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";

export default function OutgoingCallScreen() {
  const { callId } = useLocalSearchParams();
  const { hangup } = useCall();
  const router = useRouter();
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

  // Ringtone functionality disabled - add ringtone.mp3 to assets folder to enable
  // useEffect(() => {
  //   let mounted = true;
  //   (async () => {
  //     const s = new Audio.Sound();
  //     try {
  //       await s.loadAsync(require("../../assets/ringtone.mp3"));
  //       await s.setIsLoopingAsync(true);
  //       await s.playAsync();
  //       soundRef.current = s;
  //     } catch (e) {}
  //   })();
  //   return () => {
  //     mounted = false;
  //     if (soundRef.current) {
  //       soundRef.current.stopAsync().catch(() => {});
  //       soundRef.current.unloadAsync().catch(() => {});
  //     }
  //   };
  // }, []);

  const onCancel = async () => {
    await hangup(callId);
    router.back();
  };

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
        source={{
          uri: callInfo?.calleePhoto || callInfo?.calleeAvatar || undefined,
        }}
        style={{ width: 140, height: 140, borderRadius: 80, marginBottom: 18 }}
      />
      <Text style={{ color: "#fff", fontSize: 22, marginBottom: 6 }}>
        {callInfo?.calleeName || "Calling..."}
      </Text>
      <Text style={{ color: "#cfcfcf", marginBottom: 16 }}>
        {callInfo?.isVideo ? "Video call" : "Voice call"}
      </Text>
      <Text style={{ color: "#7f7f7f", marginBottom: 30 }}>Ringing…</Text>

      <TouchableOpacity
        onPress={onCancel}
        style={{ backgroundColor: "red", padding: 14, borderRadius: 40 }}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}
