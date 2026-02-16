import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import React, { useState, useRef, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import ChatRoomHeader from "../../components/ChatRoomHeader";
import MessagesList from "../../components/MessagesList";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { Feather, Ionicons } from "@expo/vector-icons";
import CustomKeyboardView from "../../components/CustomKeyboardView";
import {
  addDoc,
  collection,
  doc,
  setDoc,
  Timestamp,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  where,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { getRoomId } from "../../utils/common";
import { useAuth } from "../../context/authContext";
import * as ImagePicker from "expo-image-picker";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { formatFirestoreError, formatStorageError, logError } from "../../utils/errorHandler";
import { sendExpoPush, playMessageSound } from "../../utils/notification";

export default function ChatRoom() {
  const item = useLocalSearchParams(); //second user
  const router = useRouter(); // logged in user
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const textRef = useRef("");
  const isInitialLoadRef = useRef(true);
  const inputRef = useRef(null);

  useEffect(() => {
    createRoomIfNotExists();

    // Listen to messages
    let roomId = getRoomId(user?.userId, item?.userId);
    const docRef = doc(db, "rooms", roomId);
    const messagesRef = collection(docRef, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    let unsub = onSnapshot(q, async (snapshot) => {
      let allMessages = snapshot.docs.map((doc) => {
        return { id: doc.id, ...doc.data() };
      });
      
      // Check for new messages from the other user (not initial load)
      if (!isInitialLoadRef.current) {
        const newMessages = snapshot.docChanges().filter(
          change => change.type === 'added' && change.doc.data().userId !== user?.userId
        );
        if (newMessages.length > 0) {
          // Play notification sound for new incoming message
          playMessageSound();
        }
      }
      isInitialLoadRef.current = false;
      
      setMessages([...allMessages]);

      // Mark incoming messages as delivered first, then read
      const undeliveredMessages = snapshot.docs.filter((doc) => {
        const data = doc.data();
        return data.userId !== user?.userId && data.delivered === false;
      });

      // Mark as delivered
      for (const doc of undeliveredMessages) {
        await updateDoc(doc.ref, { delivered: true });
      }

      // Mark incoming messages as read
      await markMessagesAsRead(roomId);
    });

    // Mark messages as read when entering chat
    markMessagesAsRead(roomId);

    return unsub;
  }, []);

  const createRoomIfNotExists = async () => {
    //roomId
    let roomId = getRoomId(user?.userId, item?.userId);
    await setDoc(doc(db, "rooms", roomId), {
      roomId,
      createdAt: Timestamp.fromDate(new Date()),
    });
  };

  const markMessagesAsRead = async (roomId) => {
    try {
      const messagesRef = collection(db, "rooms", roomId, "messages");
      
      // Use a simpler query without composite index for now
      const snapshot = await getDocs(messagesRef);
      
      const updatePromises = snapshot.docs
        .filter((document) => {
          const data = document.data();
          // Only update messages from other user that are unread
          return data.userId !== user?.userId && data.read === false;
        })
        .map((document) =>
          updateDoc(doc(db, "rooms", roomId, "messages", document.id), {
            read: true,
          })
        );
      
      await Promise.all(updatePromises);
    } catch (err) {
      // Silently fail - read status is not critical
      console.log("Mark as read error:", err.message);
    }
  };

  const handleSendMessage = async () => {
    let message = textRef.current.trim();
    if (!message) return;
    try {
      let roomId = getRoomId(user?.userId, item?.userId);
      const docRef = doc(db, "rooms", roomId);
      const messagesRef = collection(docRef, "messages");

      const newDoc = await addDoc(messagesRef, {
        userId: user?.userId,
        text: message,
        type: "text",
        profileurl: user?.profileurl,
        username: user?.username,
        createdAt: Timestamp.fromDate(new Date()),
        delivered: false,
        read: false,
      });

      // Send push notification to recipient
      try {
        const recipientDoc = await getDoc(doc(db, "users", item?.userId));
        if (recipientDoc.exists()) {
          const recipientData = recipientDoc.data();
          if (recipientData?.pushToken) {
            await sendExpoPush(
              recipientData.pushToken,
              user?.username || "New message",
              message.length > 50 ? message.substring(0, 50) + "..." : message,
              { screen: "chatRoom", roomId, userId: user?.userId }
            );
          }
        }
      } catch (pushErr) {
        console.log("[ChatRoom] Push notification failed:", pushErr.message);
      }

      // Mark message as delivered after a short delay (simulating network)
      setTimeout(async () => {
        await updateDoc(doc(db, "rooms", roomId, "messages", newDoc.id), {
          delivered: true,
        });
      }, 500);

      textRef.current = "";
      if (inputRef.current) {
        inputRef.current.clear();
      }
    } catch (err) {
      logError(err, 'handleSendMessage');
      const errorMsg = formatFirestoreError(err);
      Alert.alert("Message Error", errorMsg);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        await sendMediaMessage(result.assets[0].uri, "image");
      }
    } catch (err) {
      logError(err, 'pickImage');
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const sendMediaMessage = async (uri, type) => {
    try {
      const roomId = getRoomId(user?.userId, item?.userId);
      const storage = getStorage();
      const filename = `${Date.now()}_${type}`;
      const storageRef = ref(storage, `chatMedia/${roomId}/${filename}`);

      const response = await fetch(uri);
      const blob = await response.blob();
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      const docRef = doc(db, "rooms", roomId);
      const messagesRef = collection(docRef, "messages");

      await addDoc(messagesRef, {
        userId: user?.userId,
        type: type,
        mediaUrl: downloadURL,
        profileurl: user?.profileurl,
        username: user?.username,
        createdAt: Timestamp.fromDate(new Date()),
        delivered: false,
        read: false,
      });

      // Send push notification for media message
      try {
        const recipientDoc = await getDoc(doc(db, "users", item?.userId));
        if (recipientDoc.exists()) {
          const recipientData = recipientDoc.data();
          if (recipientData?.pushToken) {
            await sendExpoPush(
              recipientData.pushToken,
              user?.username || "New message",
              type === "image" ? "📷 Sent an image" : "Sent a file",
              { screen: "chatRoom", roomId, userId: user?.userId }
            );
          }
        }
      } catch (pushErr) {
        console.log("[ChatRoom] Push notification failed:", pushErr.message);
      }

      // Mark message as delivered
      setTimeout(async () => {
        const snapshot = await getDocs(messagesRef);
        const lastMessage = snapshot.docs[snapshot.docs.length - 1];
        if (lastMessage) {
          await updateDoc(doc(db, "rooms", roomId, "messages", lastMessage.id), {
            delivered: true,
          });
        }
      }, 500);
    } catch (err) {
      logError(err, 'sendMediaMessage');
      const errorMsg = formatStorageError(err);
      Alert.alert("Upload Error", errorMsg);
    }
  };
  return (
    <CustomKeyboardView inChat={true}>
      <View className="flex-1 bg-white">
        <StatusBar style="dark" />
        <ChatRoomHeader user={item} router={router} />
        <View className="h-3 border-b border-neutral-300" />
        <View className="flex-1 justify-between bg-neutral-100 overflo-visible">
          <View className="flex-1">
            <MessagesList messages={messages} />
          </View>

          <View style={{ marginBottom: hp(1.7) }} className="pt-2">
            <View className="flex-row mx-3 justify-between bg-white border p-2 border-neutral-300 rounded-full pl-5">
              <TouchableOpacity onPress={pickImage} className="p-2 mr-[1px]">
                <Ionicons name="image-outline" size={hp(2.7)} color="#737373" />
              </TouchableOpacity>

              <TextInput
                ref={inputRef}
                onChangeText={(value) => (textRef.current = value)}
                placeholder="Type message..."
                style={{ fontSize: hp(2) }}
                className="flex-1 mr-2"
              />

              <TouchableOpacity
                onPress={handleSendMessage}
                className="bg-neutral-200 p-2 mr-[1px] rounded-full"
              >
                <Feather name="send" size={hp(2.7)} color="#737373" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </CustomKeyboardView>
  );
}
