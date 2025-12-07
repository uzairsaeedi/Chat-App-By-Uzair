import React, { memo, forwardRef, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Linking,
} from "react-native";
import { Video } from "expo-av";
import { useAuth } from "../context/authContext";
import { AntDesign } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const MessagesList = forwardRef(({ messages = [] }, ref) => {
  const { user } = useAuth();
  const listRef = ref || useRef(null);

  const openLink = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        alert("Cannot open this file.");
      }
    } catch (err) {
      console.error("openLink err", err);
      alert("Cannot open file.");
    }
  };

  const formatTime = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderItem = ({ item }) => {
    const isOwn = item.userId === user?.userId;
    const containerStyle = [
      styles.messageContainer,
      isOwn ? styles.own : styles.other,
    ];
    const pending = item.pending;

    return (
      <View style={containerStyle} key={item.id}>
        {item.type === "text" && <Text style={styles.text}>{item.text}</Text>}

        {item.type === "image" && item.mediaUrl && (
          <Image
            source={{ uri: item.mediaUrl }}
            style={styles.mediaImage}
            resizeMode="cover"
          />
        )}

        {item.type === "video" && item.mediaUrl && (
          <Video
            source={{ uri: item.mediaUrl }}
            rate={1.0}
            volume={1.0}
            isMuted={false}
            resizeMode="cover"
            shouldPlay={false}
            useNativeControls
            style={styles.mediaVideo}
          />
        )}

        {item.type === "file" && (
          <TouchableOpacity
            onPress={() => openLink(item.mediaUrl)}
            style={styles.fileContainer}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <AntDesign name="pdffile1" size={22} color="#333" />
              <View style={{ marginLeft: 8 }}>
                <Text style={{ fontWeight: "700" }}>
                  {item.fileName || "Document"}
                </Text>
                <Text style={{ color: "#666", fontSize: 12 }}>
                  {item.text || ""}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {!isOwn && (
          <Text style={styles.timeText}>
            {item.createdAt && item.createdAt.toDate
              ? formatTime(item.createdAt.toDate())
              : ""}
          </Text>
        )}

        {isOwn && (
          <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
            <Text style={styles.timeText}>
              {item.createdAt && item.createdAt.toDate
                ? formatTime(item.createdAt.toDate())
                : ""}
            </Text>
            {item.readBy && item.readBy.length > 1 ? (
              <Text style={[styles.statusText, { color: "#3b82f6" }]}>
                Seen
              </Text>
            ) : pending ? (
              <Text style={[styles.statusText, { color: "#1fd655" }]}>
                Sending...
              </Text>
            ) : (
              <Text style={[styles.statusText, { color: "#1fd655" }]}>
                Sent
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  useEffect(() => {
    if (messages.length > 0 && listRef.current) {
      setTimeout(() => {
        listRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  return (
    <FlatList
      ref={listRef}
      contentContainerStyle={{ padding: 12 }}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      inverted={false}
    />
  );
});

const styles = StyleSheet.create({
  messageWrapper: {
    marginVertical: 6,
    flexDirection: "row",
  },
  messageContainer: {
    maxWidth: width * 0.8,
    padding: 12,
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    marginVertical: 4,
  },
  own: {
    backgroundColor: "#DCF8C6",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  other: {
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  username: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
    color: "#3b82f6",
  },
  text: {
    fontSize: 16,
    color: "#222",
    lineHeight: 22,
  },
  statusText: {
    fontSize: 11,
    marginLeft: 6,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 4,
  },
  timeText: {
    fontSize: 11,
    color: "#666",
  },
  mediaImage: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: 12,
    marginTop: 6,
  },
  mediaVideo: {
    width: width * 0.7,
    height: width * 0.45,
    borderRadius: 12,
    marginTop: 6,
  },
  fileContainer: {
    padding: 10,
    backgroundColor: "#f4f4f4",
    borderRadius: 10,
    marginTop: 6,
  },
});

export default memo(MessagesList, (prevProps, nextProps) => {
  return (
    JSON.stringify(prevProps.messages) === JSON.stringify(nextProps.messages)
  );
});
