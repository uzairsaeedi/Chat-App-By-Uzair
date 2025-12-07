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
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { getRoomId } from "../../utils/common";
import { useAuth } from "../../context/authContext";
import * as ImagePicker from "expo-image-picker";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function ChatRoom() {
  const item = useLocalSearchParams(); //second user
  const router = useRouter(); // logged in user
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const textRef = useRef("");
  const inputRef = useRef(null);

  useEffect(() => {
    createRoomIfNotExists();

    // Listen to messages
    let roomId = getRoomId(user?.userId, item?.userId);
    const docRef = doc(db, "rooms", roomId);
    const messagesRef = collection(docRef, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    let unsub = onSnapshot(q, (snapshot) => {
      let allMessages = snapshot.docs.map((doc) => {
        return { id: doc.id, ...doc.data() };
      });
      setMessages([...allMessages]);
    });

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
      });

      textRef.current = "";
      if (inputRef.current) {
        inputRef.current.clear();
      }
    } catch (err) {
      Alert.alert("Message", err.message);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      await sendMediaMessage(result.assets[0].uri, "image");
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
      });
    } catch (err) {
      Alert.alert("Error", err.message);
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
