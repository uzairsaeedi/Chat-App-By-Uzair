import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import React, { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { Entypo, Feather } from "@expo/vector-icons";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { blurhash } from "../../utils/common";

export default function Profile() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [userStatus, setUserStatus] = useState({ isOnline: false, lastSeen: null });

  useEffect(() => {
    if (!params?.userId) return;

    const unsub = onSnapshot(
      doc(db, "users", params.userId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setUserStatus({
            isOnline: data.isOnline === true,
            lastSeen: data.lastSeen || null,
          });
        }
      },
      (error) => {
        console.log("Profile status listener error:", error);
      }
    );

    return () => unsub && unsub();
  }, [params?.userId]);

  const formatLastSeen = (ts) => {
    if (!ts?.toDate) return "Unknown";
    try {
      const d = ts.toDate();
      const now = new Date();
      const diffMs = now - d;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return "Unknown";
    }
  };

  return (
    <>
      <StatusBar style="dark" />
      <Stack.Screen
        options={{
          title: "User Profile",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Entypo name="chevron-left" size={hp(4)} color="#737373" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView className="flex-1 bg-white">
        <View className="items-center pt-8 pb-6">
          <View className="relative">
            <Image
              source={params?.profileurl}
              placeholder={blurhash}
              style={{
                height: hp(20),
                width: hp(20),
                borderRadius: hp(10),
              }}
              transition={500}
            />
            <View
              className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-white ${
                userStatus.isOnline ? "bg-green-500" : "bg-gray-400"
              }`}
            />
          </View>

          <Text
            style={{ fontSize: hp(3.5) }}
            className="font-bold text-neutral-800 mt-4"
          >
            {params?.username}
          </Text>

          <View className="flex-row items-center mt-2 gap-1">
            <View
              className={`w-2 h-2 rounded-full ${
                userStatus.isOnline ? "bg-green-500" : "bg-gray-400"
              }`}
            />
            <Text style={{ fontSize: hp(1.8) }} className="text-neutral-600">
              {userStatus.isOnline
                ? "Online"
                : `Last seen ${formatLastSeen(userStatus.lastSeen)}`}
            </Text>
          </View>
        </View>

        <View className="mx-4 mt-4">
          <View className="bg-neutral-50 rounded-2xl p-4 mb-4">
            <View className="flex-row items-center mb-3">
              <Feather name="user" size={hp(2.5)} color="#737373" />
              <Text
                style={{ fontSize: hp(2) }}
                className="ml-3 font-semibold text-neutral-700"
              >
                About
              </Text>
            </View>
            <Text style={{ fontSize: hp(1.8) }} className="text-neutral-600 ml-9">
              Username: {params?.username}
            </Text>
          </View>

          <View className="bg-neutral-50 rounded-2xl p-4 mb-4">
            <View className="flex-row items-center mb-3">
              <Feather name="info" size={hp(2.5)} color="#737373" />
              <Text
                style={{ fontSize: hp(2) }}
                className="ml-3 font-semibold text-neutral-700"
              >
                Status
              </Text>
            </View>
            <Text style={{ fontSize: hp(1.8) }} className="text-neutral-600 ml-9">
              {userStatus.isOnline
                ? "Currently active"
                : `Last active ${formatLastSeen(userStatus.lastSeen)}`}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-indigo-500 rounded-xl py-4 items-center mt-4"
          >
            <Text
              style={{ fontSize: hp(2.2) }}
              className="text-white font-bold"
            >
              Back to Chat
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}
