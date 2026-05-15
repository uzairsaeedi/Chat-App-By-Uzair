// app/CallScreen.js
import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { RTCView } from "react-native-webrtc";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useCall } from "../../context/callContext";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebaseConfig";

export default function CallScreen() {
  const router = useRouter();
  const { callId } = useLocalSearchParams();
  const { localStream, remoteStream, hangup, isVideoCall } = useCall();
  const [callEnded, setCallEnded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Listen for call status changes to detect when remote ends the call
  useEffect(() => {
    if (!callId) {
      setIsLoading(false);
      return;
    }

    const callRef = doc(db, "calls", callId);
    const unsub = onSnapshot(callRef, (snap) => {
      setIsLoading(false);
      const data = snap.data();
      if (data && (data.status === "ended" || data.status === "cancelled" || data.status === "rejected")) {
        console.log('[CallScreen] Call ended remotely, status:', data.status);
        setCallEnded(true);
      }
    }, (error) => {
      console.error('[CallScreen] Firestore error:', error);
      setIsLoading(false);
    });

    return () => unsub();
  }, [callId]);

  // Navigate away when call ends
  useEffect(() => {
    if (callEnded) {
      hangup(callId).then(() => {
        router.canGoBack() ? router.back() : router.replace('home');
      });
    }
  }, [callEnded]);

  const onEnd = async () => {
    await hangup(callId);
    router.canGoBack() ? router.back() : router.replace('home');
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "black", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={{ color: "#fff", marginTop: 16 }}>Connecting call...</Text>
      </View>
    );
  }

  if (!callId) {
    return (
      <View style={{ flex: 1, backgroundColor: "black", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#fff", fontSize: 18 }}>Call not found</Text>
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace('home')}
          style={{ marginTop: 20, padding: 14, backgroundColor: "#444", borderRadius: 8 }}
        >
          <Text style={{ color: "#fff" }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      {isVideoCall ? (
        <>
          {remoteStream ? (
            <RTCView
              streamURL={remoteStream.toURL()}
              style={{ flex: 1 }}
              objectFit="cover"
              mirror={false}
              zOrder={0}
            />
          ) : (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <Text style={{ color: "white", textAlign: "center", fontSize: 18 }}>
                Connecting video...
              </Text>
            </View>
          )}

          {localStream && (
            <RTCView
              streamURL={localStream.toURL()}
              style={{
                width: 120,
                height: 160,
                position: "absolute",
                top: 40,
                right: 20,
                backgroundColor: "#333",
                borderRadius: 8,
              }}
              objectFit="cover"
              mirror={true}
              zOrder={1}
            />
          )}
        </>
      ) : (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: "white", fontSize: 24, marginBottom: 10 }}>Voice Call</Text>
          <Text style={{ color: "#aaa", fontSize: 16 }}>
            {remoteStream ? "Connected" : "Connecting..."}
          </Text>
        </View>
      )}

      <Pressable
        onPress={onEnd}
        style={({ pressed }) => ({
          backgroundColor: pressed ? "#b22222" : "red",
          padding: 18,
          borderRadius: 50,
          alignSelf: "center",
          position: "absolute",
          bottom: 40,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>End Call</Text>
      </Pressable>
    </View>
  );
}
