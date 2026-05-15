// app/_layout.js
import React, { useEffect, useState } from "react";
import { View, Platform } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import "../global.css";
import { AuthContextProvider, useAuth } from "../context/authContext";
import { MenuProvider } from "react-native-popup-menu";
import * as Notifications from "expo-notifications";
import { CallProvider } from "../context/callContext";
import ErrorBoundary from "../components/ErrorBoundary";
import codePush from "@revopush/react-native-code-push";

// Set up notification handler
if (
  Platform.OS !== "web" &&
  Notifications &&
  typeof Notifications.setNotificationHandler === "function"
) {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification?.request?.content?.data || {};
      // Always show call notifications prominently
      const isCall = data.screen === "incomingCallScreen";
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        priority: isCall ? Notifications.AndroidNotificationPriority.MAX : Notifications.AndroidNotificationPriority.HIGH,
      };
    },
  });
}

// Create notification channels for Android
async function setupNotificationChannels() {
  if (Platform.OS === 'android') {
    // Default channel for messages
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#818cf8',
      sound: 'default',
    });

    // High priority channel for calls
    await Notifications.setNotificationChannelAsync('calls', {
      name: 'Calls',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500, 200, 500],
      lightColor: '#22c55e',
      sound: 'default',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });

    console.log('[Notifications] Channels created');
  }
}

// Initialize channels
setupNotificationChannels();

const MainLayout = () => {
  const { isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  // Debounce navigation to prevent flickering on app resume
  useEffect(() => {
    // Wait a tick after auth state is determined before navigating
    if (typeof isAuthenticated === "undefined") {
      setIsNavigationReady(false);
      return;
    }
    
    // Small delay to ensure we don't flash on quick state changes
    const timer = setTimeout(() => {
      setIsNavigationReady(true);
    }, 50);
    
    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isNavigationReady || typeof isAuthenticated === "undefined") return;
    
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
  }, [isAuthenticated, segments, router, isNavigationReady]);

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
          } else if (data && data.screen === "chatRoom" && data.userId) {
            console.log('[Notification] Navigating to chat room:', data.userId);
            router.push({
              pathname: "/chatRoom",
              params: { userId: data.userId },
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
