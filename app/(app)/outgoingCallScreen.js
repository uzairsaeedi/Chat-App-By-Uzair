// app/OutgoingCallScreen.js
import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCall } from "../../context/callContext";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";
import { Audio } from "expo-av";

export default function OutgoingCallScreen() {
  const { callId } = useLocalSearchParams();
  const { hangup } = useCall();
  const router = useRouter();
  const [callInfo, setCallInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const soundRef = useRef(null);

  useEffect(() => {
    let unsub;
    if (callId) {
      const ref = doc(db, "calls", callId);
      unsub = onSnapshot(ref, (snap) => {
        setIsLoading(false);
        if (snap.exists()) {
          const data = snap.data();
          setCallInfo(data);
          
          // Navigate to CallScreen when call is accepted
          if (data.status === "accepted") {
            if (soundRef.current) {
              soundRef.current.stopAsync().catch(() => {});
            }
            router.replace({
              pathname: '/CallScreen',
              params: { callId },
            });
          }
          // Go back if call was rejected or ended
          else if (data.status === "rejected" || data.status === "ended") {
            if (soundRef.current) {
              soundRef.current.stopAsync().catch(() => {});
            }
            router.canGoBack() ? router.back() : router.replace('home');
          }
        }
      }, (error) => {
        console.error('[OutgoingCall] Error listening to call:', error);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
    return () => {
      if (unsub) unsub();
    };
  }, [callId, router]);

  // Play ringback tone while waiting for answer
  useEffect(() => {
    let mounted = true;
    let sound = null;
    
    (async () => {
      try {
        const { sound: s } = await Audio.Sound.createAsync(
          { uri: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg' },
          { shouldPlay: true, isLooping: true, volume: 0.5 }
        );
        if (mounted) {
          sound = s;
          soundRef.current = s;
        } else {
          await s.unloadAsync();
        }
      } catch (e) {
        console.log('[OutgoingCall] Ringback tone error:', e.message);
      }
    })();
    
    return () => {
      mounted = false;
      if (soundRef.current) {
        soundRef.current.stopAsync().catch(() => {});
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, []);

  const onCancel = async () => {
    // Stop the ringback sound
    if (soundRef.current) {
      soundRef.current.stopAsync().catch(() => {});
      soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    
    try {
      await hangup(callId);
    } catch (e) {
      console.error('[OutgoingCall] hangup error:', e);
    }
    router.canGoBack() ? router.back() : router.replace('home');
  };

  // Show loading while fetching call info
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={{ color: "#fff", marginTop: 16 }}>Connecting...</Text>
      </View>
    );
  }

  // Handle missing callId
  if (!callId) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
        <Text style={{ color: "#fff", fontSize: 18 }}>Call not found</Text>
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace('home')}
          style={({ pressed }) => ({ 
            marginTop: 20, 
            backgroundColor: "#333", 
            padding: 14, 
            borderRadius: 10,
            opacity: pressed ? 0.7 : 1
          })}
        >
          <Text style={{ color: "#fff" }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const avatarUri = callInfo?.calleePhoto || callInfo?.calleeAvatar || null;

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#000",
      }}
    >
      {avatarUri ? (
        <Image
          source={avatarUri}
          style={{ width: 140, height: 140, borderRadius: 80, marginBottom: 18 }}
          contentFit="cover"
        />
      ) : (
        <View style={{ 
          width: 140, 
          height: 140, 
          borderRadius: 80, 
          marginBottom: 18,
          backgroundColor: '#333',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Text style={{ color: '#fff', fontSize: 48 }}>
            {callInfo?.calleeName?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
      )}
      <Text style={{ color: "#fff", fontSize: 22, marginBottom: 6 }}>
        {callInfo?.calleeName || "Calling..."}
      </Text>
      <Text style={{ color: "#cfcfcf", marginBottom: 16 }}>
        {callInfo?.isVideo ? "Video call" : "Voice call"}
      </Text>
      <Text style={{ color: "#7f7f7f", marginBottom: 30 }}>Ringing…</Text>

      <Pressable
        onPress={onCancel}
        style={({ pressed }) => ({ 
          backgroundColor: "#D10000", 
          padding: 14, 
          borderRadius: 40,
          opacity: pressed ? 0.7 : 1
        })}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>Cancel</Text>
      </Pressable>
    </View>
  );
}
