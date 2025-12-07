import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useCall } from "../context/callContext";
import { useAuth } from "../context/authContext";
import { Entypo, Ionicons } from "@expo/vector-icons";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";

export default function ChatRoomHeader({ user }) {
  const router = useRouter();
  const { user: me } = useAuth();
  const { startCall } = useCall();
  const [status, setStatus] = useState({ isOnline: false, lastSeen: null });

  useEffect(() => {
    if (!user?.userId) return;
    const unsub = onSnapshot(doc(db, "users", user.userId), (snap) => {
      if (snap.exists()) setStatus(snap.data());
    });
    return () => unsub && unsub();
  }, [user?.userId]);

  const meId = me?.userId || me?.uid || null;
  const meName = me?.username || me?.email?.split("@")[0] || "You";
  const mePhoto = me?.profileurl || null;

  const handleCall = async (isVideo) => {
    try {
      if (!meId) {
        console.warn("No local user id available (meId)");
        return;
      }
      const res = await startCall(
        {
          caller: { userId: meId, username: meName, profileurl: mePhoto },
          callee: {
            userId: user.userId,
            username: user.username,
            profileurl: user.profileurl,
          },
        },
        { isVideo }
      );

      if (res?.success && res.callId) {
        router.push({
          pathname: "outgoingCallScreen",
          params: { callId: res.callId },
        });
      } else {
        console.warn("startCall failed", res);
      }
    } catch (e) {
      console.warn("handleCall err", e);
    }
  };

  const handleVoiceCall = () => handleCall(false);
  const handleVideoCall = () => handleCall(true);

  const formatLastSeen = (ts) => {
    if (!ts?.toDate) return "";
    const d = ts.toDate();
    const now = new Date();
    const same =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (same)
      return `Last seen today ${d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    return `Last seen ${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  return (
    <Stack.Screen
      options={{
        title: "",
        headerLeft: () => (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity onPress={() => router.back()}>
              <Entypo name="chevron-left" size={hp(4)} color="#737373" />
            </TouchableOpacity>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <Image
                source={user?.profileurl}
                style={{ height: hp(4.5), width: hp(4.5), borderRadius: 100 }}
              />
              <View>
                <Text
                  style={{
                    fontSize: hp(2.5),
                    color: "#222",
                    fontWeight: "600",
                  }}
                >
                  {user?.username}
                </Text>
                {status.isOnline ? (
                  <Text style={{ color: "#3b82f6" }}>Online</Text>
                ) : (
                  <Text style={{ color: "#22c55e" }}>
                    {formatLastSeen(status.lastSeen)}
                  </Text>
                )}
              </View>
            </View>
          </View>
        ),
        headerRight: () => (
          <View style={{ flexDirection: "row", gap: 18, alignItems: "center" }}>
            <TouchableOpacity onPress={handleVoiceCall}>
              <Ionicons name="call" size={hp(2.8)} color="#737373" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleVideoCall}>
              <Ionicons name="videocam" size={hp(2.8)} color="#737373" />
            </TouchableOpacity>
          </View>
        ),
      }}
    />
  );
}
