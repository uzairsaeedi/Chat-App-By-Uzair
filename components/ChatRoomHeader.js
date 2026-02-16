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
    
    const unsub = onSnapshot(
      doc(db, "users", user.userId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          // Explicitly set the status, ensuring isOnline is a boolean
          const onlineStatus = data.isOnline === true;
          console.log(`[ChatRoomHeader] User ${user.username} status:`, {
            isOnline: onlineStatus,
            rawIsOnline: data.isOnline,
            lastSeen: data.lastSeen
          });
          setStatus({
            isOnline: onlineStatus,
            lastSeen: data.lastSeen || null,
          });
        } else {
          // If document doesn't exist, user is offline
          console.log(`[ChatRoomHeader] User ${user.username} document not found`);
          setStatus({ isOnline: false, lastSeen: null });
        }
      },
      (error) => {
        console.log("Status listener error:", error);
        setStatus({ isOnline: false, lastSeen: null });
      }
    );
    
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
    if (!ts?.toDate) return "Offline";
    try {
      const d = ts.toDate();
      const now = new Date();
      const same =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();
      if (same)
        return `Last seen today at ${d.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`;
      return `Last seen ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
    } catch (e) {
      return "Offline";
    }
  };

  const handleUserPress = () => {
    // Only pass essential params - profile page fetches status in real-time
    router.push({
      pathname: "/profile",
      params: {
        userId: user.userId,
        username: user.username,
        profileurl: user.profileurl,
      },
    });
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('home');
    }
  };

  return (
    <Stack.Screen
      options={{
        title: "",
        headerLeft: () => (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity onPress={handleGoBack}>
              <Entypo name="chevron-left" size={hp(4)} color="#737373" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleUserPress}
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
                  <Text style={{ color: "#22c55e", fontSize: hp(1.6) }}>Online</Text>
                ) : (
                  <Text style={{ color: "#737373", fontSize: hp(1.6) }}>
                    {formatLastSeen(status.lastSeen)}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
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
