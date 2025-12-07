// components/ChatItem.js
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { blurhash } from "../utils/common";
import { db } from "../firebaseConfig";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  doc,
} from "firebase/firestore";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { useAuth } from "../context/authContext";

export default function ChatItem({ item, router, noBorder }) {
  const [lastMessage, setLastMessage] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!item?.roomId) {
      setLastMessage(null);
      return;
    }

    const roomId = item.roomId;
    const pathInfo = `rooms/${roomId}/messages`;
    console.log("[ChatItem] listening to:", pathInfo);

    const q = query(
      collection(db, "rooms", roomId, "messages"),
      orderBy("createdAt", "desc"),
      limit(1)
    );
    const unsub = onSnapshot(
      q,
      async (snapshot) => {
        if (!snapshot.empty) {
          const d = snapshot.docs[0].data();
          setLastMessage(d);
        } else {
          // fallback: try to fetch all messages and pick latest by createdAt or createTime
          try {
            const all = await getDocs(
              collection(db, "rooms", roomId, "messages")
            );
            if (!all.empty) {
              let bestDoc = null;
              let bestTime = -Infinity;
              all.docs.forEach((docSnap) => {
                const data = docSnap.data();
                let t = -Infinity;
                if (
                  data.createdAt &&
                  typeof data.createdAt.toDate === "function"
                ) {
                  t = data.createdAt.toDate().getTime();
                } else if (
                  data.createdAt &&
                  typeof data.createdAt === "number"
                ) {
                  t = data.createdAt;
                } else if (docSnap.createTime) {
                  // parse Firestore createTime string
                  const parsed = Date.parse(docSnap.createTime);
                  if (!Number.isNaN(parsed)) t = parsed;
                } else {
                  // last resort use doc id ordering
                  t = parseInt(docSnap.id.replace(/\D/g, ""), 10) || 0;
                }
                if (t > bestTime) {
                  bestTime = t;
                  bestDoc = docSnap;
                }
              });
              if (bestDoc) setLastMessage(bestDoc.data());
              else setLastMessage(null);
            } else {
              setLastMessage(null);
            }
          } catch (e) {
            console.warn("[ChatItem] fallback getDocs error:", e);
            setLastMessage(null);
          }
        }
      },
      (err) => {
        console.warn("[ChatItem] onSnapshot err:", err);
        setLastMessage(null);
      }
    );

    return () => unsub();
  }, [item?.roomId]);

  const openChatRoom = () => {
    router.push({
      pathname: "/chatRoom",
      params: {
        userId: item.userId || item.id,
        username: item.username || "",
        profileurl: item.profileurl || "",
        roomId: item.roomId || "",
      },
    });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    try {
      if (timestamp.toDate) {
        const d = timestamp.toDate();
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      } else if (typeof timestamp === "number") {
        const d = new Date(timestamp);
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
    } catch (e) {}
    return "";
  };

  const renderLastMessage = () => {
    if (!lastMessage) return "No messages yet";
    if (lastMessage.type === "text") return lastMessage.text || "Message";
    if (lastMessage.type === "image") return "📷 Photo";
    if (lastMessage.type === "video") return "🎥 Video";
    if (lastMessage.type === "file")
      return lastMessage.fileName || "📎 Document";
    return "Message";
  };

  return (
    <TouchableOpacity
      onPress={openChatRoom}
      className={`flex-row items-center mx-4 mb-4 pb-2 ${
        noBorder ? "" : "border-b border-b-neutral-200"
      }`}
    >
      <Image
        style={{ height: hp(6), width: hp(6), borderRadius: 100 }}
        source={item?.profileurl}
        placeholder={blurhash}
        transition={500}
      />

      <View className="flex-1 ml-3">
        <View className="flex-row justify-between items-center">
          <Text
            style={{ fontSize: hp(1.9) }}
            className="font-semibold text-neutral-800"
          >
            {item?.username}
          </Text>
          <Text style={{ fontSize: hp(1.5) }} className="text-neutral-500">
            {lastMessage?.createdAt ? formatTime(lastMessage.createdAt) : ""}
          </Text>
        </View>

        <Text
          numberOfLines={1}
          style={{ fontSize: hp(1.6) }}
          className="text-neutral-500"
        >
          {renderLastMessage()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
