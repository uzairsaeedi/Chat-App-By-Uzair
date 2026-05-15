import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Platform, PermissionsAndroid, Alert } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useCall } from "../context/callContext";
import { useAuth } from "../context/authContext";
import { Entypo, Ionicons } from "@expo/vector-icons";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ChatRoomHeader({ user }) {
  const router = useRouter();
  const { user: me } = useAuth();
  const { startCall } = useCall();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState({ isOnline: false, lastSeen: null });

  useEffect(() => {
    if (!user?.userId) return;
    
    const unsub = onSnapshot(
      doc(db, "users", user.userId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          let onlineStatus = data.isOnline === true;
          if (onlineStatus && data.lastSeen?.toDate) {
            const lastSeenTime = data.lastSeen.toDate();
            const now = new Date();
            const diffMs = now - lastSeenTime;
            if (diffMs > 120000) {
              onlineStatus = false;
            }
          }
          setStatus({
            isOnline: onlineStatus,
            lastSeen: data.lastSeen || null,
          });
        } else {
          setStatus({ isOnline: false, lastSeen: null });
        }
      },
      (error) => {
        setStatus({ isOnline: false, lastSeen: null });
      }
    );
    
    return () => unsub && unsub();
  }, [user?.userId]);

  const meId = me?.userId || me?.uid || null;
  const meName = me?.username || me?.email?.split("@")[0] || "You";
  const mePhoto = me?.profileurl || null;

  const formatLastSeen = (ts) => {
    if (!ts?.toDate) return "Offline";
    try {
      const d = ts.toDate();
      const now = new Date();
      const same = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (same) return `today ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return "Offline";
    }
  };

  const handleBack = () => {
    console.log('[ChatRoomHeader] Back pressed');
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('home');
    }
  };

  const handleProfile = () => {
    console.log('[ChatRoomHeader] Profile pressed');
    router.push({ 
      pathname: "/profile", 
      params: { userId: user?.userId, username: user?.username, profileurl: user?.profileurl } 
    });
  };

  const handleVoiceCall = async () => {
    console.log('[ChatRoomHeader] Voice call pressed');
    
    try {
      if (!meId || !user?.userId) {
        Alert.alert('Error', 'Cannot make call');
        return;
      }

      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        ]);
        if (granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Required', 'Please grant microphone permission');
          return;
        }
      }

      const res = await startCall(
        {
          caller: { userId: meId, username: meName, profileurl: mePhoto },
          callee: { userId: user.userId, username: user.username, profileurl: user.profileurl },
        },
        { isVideo: false }
      );

      if (res?.success && res.callId) {
        router.push({ pathname: "outgoingCallScreen", params: { callId: res.callId } });
      } else {
        Alert.alert('Call Failed', 'Could not start the call');
      }
    } catch (e) {
      console.error('[ChatRoomHeader] Voice call error:', e);
      Alert.alert('Call Error', e.message || 'An error occurred');
    }
  };

  const handleVideoCall = async () => {
    console.log('[ChatRoomHeader] Video call pressed');
    
    try {
      if (!meId || !user?.userId) {
        Alert.alert('Error', 'Cannot make call');
        return;
      }

      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        ]);
        const audioOk = granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
        const cameraOk = granted[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED;
        if (!audioOk || !cameraOk) {
          Alert.alert('Permissions Required', 'Please grant camera and microphone permissions');
          return;
        }
      }

      const res = await startCall(
        {
          caller: { userId: meId, username: meName, profileurl: mePhoto },
          callee: { userId: user.userId, username: user.username, profileurl: user.profileurl },
        },
        { isVideo: true }
      );

      if (res?.success && res.callId) {
        router.push({ pathname: "outgoingCallScreen", params: { callId: res.callId } });
      } else {
        Alert.alert('Call Failed', 'Could not start the call');
      }
    } catch (e) {
      console.error('[ChatRoomHeader] Video call error:', e);
      Alert.alert('Call Error', e.message || 'An error occurred');
    }
  };

  return (
    <View style={{ 
      paddingTop: insets.top,
      backgroundColor: '#fff',
      borderBottomWidth: 1,
      borderBottomColor: '#e5e5e5'
    }}>
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        height: hp(7)
      }}>
        {/* Left side - Back button + Profile */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flex: 1 }}>
          <TouchableOpacity onPress={handleBack} activeOpacity={0.6}>
            <Entypo name="chevron-left" size={hp(4)} color="#737373" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleProfile} 
            activeOpacity={0.6} 
            style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}
          >
            <Image 
              source={user?.profileurl} 
              style={{ height: hp(4.5), width: hp(4.5), borderRadius: 100 }} 
              contentFit="cover" 
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: hp(2.5), color: "#222", fontWeight: "600" }} numberOfLines={1}>
                {user?.username}
              </Text>
              {status.isOnline ? (
                <Text style={{ color: "#22c55e", fontSize: hp(1.6) }}>Online</Text>
              ) : (
                <Text style={{ color: "#737373", fontSize: hp(1.6) }}>{formatLastSeen(status.lastSeen)}</Text>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Right side - Call buttons */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
          <TouchableOpacity onPress={handleVoiceCall} activeOpacity={0.6}>
            <Ionicons name="call" size={hp(2.8)} color="#737373" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleVideoCall} activeOpacity={0.6}>
            <Ionicons name="videocam" size={hp(2.8)} color="#737373" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
