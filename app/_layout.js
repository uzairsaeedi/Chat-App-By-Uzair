// app/_layout.js
import React, { useEffect } from "react";
import { View, Platform } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import "../global.css";
import { AuthContextProvider, useAuth } from "../context/authContext";
import { MenuProvider } from "react-native-popup-menu";
import * as Notifications from "expo-notifications";
import { CallProvider } from "../context/callContext";

if (
  Platform.OS !== "web" &&
  Notifications &&
  typeof Notifications.setNotificationHandler === "function"
) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

const MainLayout = () => {
  const { isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (typeof isAuthenticated === "undefined") return;
    const inApp = segments[0] === "(app)";
    if (isAuthenticated && !inApp) {
      router.replace("home");
    } else if (isAuthenticated === false) {
      router.replace("signIn");
    }
  }, [isAuthenticated, segments, router]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        try {
          const data = response?.notification?.request?.content?.data || {};
          if (data && data.screen === "incomingCallScreen" && data.callId) {
            router.push({
              pathname: "/incomingCallScreen",
              params: { callId: data.callId },
            });
          }
        } catch (e) {
          console.warn("notification response handler err", e);
        }
      }
    );

    return () => {
      try {
        sub && sub.remove && sub.remove();
      } catch (e) {}
    };
  }, [router]);

  return <Slot />;
};

export default function RootLayout() {
  return (
    <MenuProvider>
      <AuthContextProvider>
        <CallProvider>
          <MainLayout />
        </CallProvider>
      </AuthContextProvider>
    </MenuProvider>
  );
}
