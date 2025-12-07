// app/CallScreen.js
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { RTCView } from "react-native-webrtc";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useCall } from "../../context/callContext";

export default function CallScreen() {
  const router = useRouter();
  const { callId } = useLocalSearchParams();
  const { localStream, remoteStream, hangUp, isVideoCall } = useCall();

  const onEnd = async () => {
    await hangUp(callId);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      {isVideoCall ? (
        <>
          {remoteStream ? (
            <RTCView
              streamURL={remoteStream.toURL()}
              style={{ flex: 1 }}
              objectFit="cover"
            />
          ) : (
            <Text
              style={{ color: "white", textAlign: "center", marginTop: 20 }}
            >
              Connecting...
            </Text>
          )}

          {localStream && (
            <RTCView
              streamURL={localStream.toURL()}
              style={{
                width: 120,
                height: 160,
                position: "absolute",
                top: 20,
                right: 20,
                backgroundColor: "black",
                borderRadius: 8,
              }}
            />
          )}
        </>
      ) : (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: "white", fontSize: 20 }}>Voice Call...</Text>
        </View>
      )}

      <TouchableOpacity
        onPress={onEnd}
        style={{
          backgroundColor: "red",
          padding: 15,
          borderRadius: 50,
          alignSelf: "center",
          marginBottom: 40,
          position: "absolute",
          bottom: 20,
        }}
      >
        <Text style={{ color: "white", fontWeight: "bold" }}>End Call</Text>
      </TouchableOpacity>
    </View>
  );
}
