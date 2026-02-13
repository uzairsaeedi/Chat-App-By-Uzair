// app/_layout.js
import React, { useEffect } from "react";
import { View, Platform } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import "../global.css";
import { AuthContextProvider, useAuth } from "../context/authContext";
import { MenuProvider } from "react-native-popup-menu";
import * as Notifications from "expo-notifications";
import { CallProvider } from "../context/callContext";
import ErrorBoundary from "../components/ErrorBoundary";
import codePush from "@revopush/react-native-code-push";

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
    const currentSegment = segments[0];
    // Allow access to auth screens when not authenticated
    const authScreens = ["signIn", "signUp", "forgotPassword"];
    const onAuthScreen = authScreens.includes(currentSegment);
    
    if (isAuthenticated && !inApp) {
      router.replace("home");
    } else if (isAuthenticated === false && !onAuthScreen) {
      router.replace("signIn");
    }
  }, [isAuthenticated, segments, router]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    // Handle notification taps (app in background/killed)
    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        try {
          const data = response?.notification?.request?.content?.data || {};
          console.log('[Notification] Received notification response:', data);
          if (data && data.screen === "incomingCallScreen" && data.callId) {
            console.log('[Notification] Navigating to incoming call screen:', data.callId);
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

    // Handle notifications received while app is in foreground
    const receivedSub = Notifications.addNotificationReceivedListener(
      (notification) => {
        try {
          const data = notification?.request?.content?.data || {};
          console.log('[Notification] Received notification while in foreground:', data);
          if (data && data.screen === "incomingCallScreen" && data.callId) {
            console.log('[Notification] Auto-navigating to incoming call screen:', data.callId);
            router.push({
              pathname: "/incomingCallScreen",
              params: { callId: data.callId },
            });
          }
        } catch (e) {
          console.warn("notification received handler err", e);
        }
      }
    );

    return () => {
      try {
        responseSub && responseSub.remove && responseSub.remove();
        receivedSub && receivedSub.remove && receivedSub.remove();
      } catch (e) {}
    };
  }, [router]);

  return <Slot />;
};

function RootLayout() {
  // CodePush sync for OTA updates (only in production builds)
  useEffect(() => {
    if (Platform.OS !== 'web' && !__DEV__) {
      codePush.sync({
        updateDialog: false,
        installMode: codePush.InstallMode.ON_NEXT_RESUME,
        checkFrequency: codePush.CheckFrequency.ON_APP_RESUME,
      });
    }
  }, []);

  return (
    <ErrorBoundary>
      <MenuProvider>
        <AuthContextProvider>
          <CallProvider>
            <MainLayout />
          </CallProvider>
        </AuthContextProvider>
      </MenuProvider>
    </ErrorBoundary>
  );
}

export default RootLayout;
