// app/IncomingCallScreen.js
import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Image, Platform } from "react-native";
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

  // Ringtone functionality disabled - add ringtone.mp3 to assets folder to enable
  // useEffect(() => {
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
  //     if (soundRef.current) {
  //       soundRef.current.stopAsync().catch(() => {});
  //       soundRef.current.unloadAsync().catch(() => {});
  //     }
  //   };
  // }, []);

  const onAccept = async () => {
    if (soundRef.current) {
      soundRef.current.stopAsync().catch(() => {});
    }
    await answerCall({ callId }, { isVideo: callInfo?.isVideo, router });
  };

  const onReject = async () => {
    if (soundRef.current) {
      soundRef.current.stopAsync().catch(() => {});
    }
    await updateDoc(doc(db, "calls", callId), { status: "rejected" });
    router.back();
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
