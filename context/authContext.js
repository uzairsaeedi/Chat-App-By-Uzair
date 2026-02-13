import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { createContext, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { registerPushTokenToFirestore } from "../utils/notification";
import { formatAuthError, logError } from "../utils/errorHandler";

export const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(undefined);

  useEffect(() => {
    let currentUserId = null;
    let appState = AppState.currentState;
    let offlineTimeout = null;

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        currentUserId = firebaseUser.uid;
        setIsAuthenticated(true);
        setUser(firebaseUser);
        await updateUserData(firebaseUser.uid);
        await setUserOnline(firebaseUser.uid);
      } else {
        // User logged out - set previous user offline if exists
        if (currentUserId) {
          console.log('[Auth] User logged out, setting offline');
          await setUserOffline(currentUserId);
        }
        setIsAuthenticated(false);
        setUser(null);
        currentUserId = null;
      }
    });

    const subscription = AppState.addEventListener(
      "change",
      async (nextAppState) => {
        console.log('[Auth] AppState changed:', appState, '->', nextAppState);
        
        if (auth.currentUser?.uid) {
          // Clear any pending offline timeout
          if (offlineTimeout) {
            clearTimeout(offlineTimeout);
            offlineTimeout = null;
          }

          // App moved to foreground
          if (appState.match(/inactive|background/) && nextAppState === "active") {
            console.log('[Auth] App became active');
            await setUserOnline(auth.currentUser.uid);
          }
          // App moved to background or inactive
          else if (appState === "active" && nextAppState.match(/inactive|background/)) {
            console.log('[Auth] App became inactive/background - setting offline in 3s');
            // Delay setting offline by 3 seconds to avoid flickering when switching apps
            offlineTimeout = setTimeout(async () => {
              if (auth.currentUser?.uid) {
                await setUserOffline(auth.currentUser.uid);
              }
            }, 3000);
          }
        }
        
        appState = nextAppState;
      }
    );

    // Cleanup: set user offline when component unmounts
    return () => {
      console.log('[Auth] AuthContext unmounting, setting offline');
      if (offlineTimeout) {
        clearTimeout(offlineTimeout);
      }
      if (currentUserId) {
        // Fire and forget - this might not complete if app force closes
        setUserOffline(currentUserId).catch(err => 
          console.error('[Auth] Error in cleanup offline:', err)
        );
      }
      unsub();
      subscription.remove();
    };
  }, []);

  const updateUserData = async (userId) => {
    try {
      if (!userId) return;
      global.__MY_USER_ID__ = userId;
      const docRef = doc(db, "users", userId);
      const docSnap = await getDoc(docRef);
      const authUser = auth.currentUser || null;

      if (docSnap.exists()) {
        const data = docSnap.data();
        setUser((prev) => ({
          ...(prev || {}),
          username:
            data.username ??
            prev?.username ??
            authUser?.email?.split("@")[0] ??
            "",
          profileurl: data.profileurl ?? prev?.profileurl ?? null,
          userId: data.userId ?? userId,
          uid: authUser?.uid ?? userId,
          email: authUser?.email ?? prev?.email ?? "",
        }));
      } else {
        const defaultName = authUser?.email?.split("@")[0] ?? "User";
        await setDoc(
          docRef,
          { 
            username: defaultName, 
            profileurl: null, 
            userId,
            isOnline: true,
            lastOnline: serverTimestamp(),
            lastSeen: serverTimestamp(),
          },
          { merge: true }
        );
        setUser((prev) => ({
          ...(prev || {}),
          username: defaultName,
          profileurl: null,
          userId,
          uid: authUser?.uid ?? userId,
          email: authUser?.email ?? prev?.email ?? "",
        }));
      }

      // Try to register push token (only on native)
      try {
        if (Platform.OS !== "web") {
          const token = await registerPushTokenToFirestore(userId);
          if (token) {
            console.log('[Auth] Push token registered successfully');
          } else {
            console.warn('[Auth] Failed to register push token');
          }
        }
      } catch (e) {
        console.warn("push token registration failed", e);
      }
    } catch (err) {
      console.warn("updateUserData error", err);
    }
  };

  const setUserOnline = async (userId) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        isOnline: true,
        lastOnline: serverTimestamp(), // Track when user was last confirmed online
      });
      console.log(`[Auth] User ${userId} set to ONLINE`);
    } catch (e) {
      console.log("Error setting user online:", e.message);
    }
  };

  const setUserOffline = async (userId) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        isOnline: false,
        lastSeen: serverTimestamp(),
      });
      console.log(`[Auth] User ${userId} set to OFFLINE at`, new Date().toISOString());
    } catch (e) {
      console.log("Error setting user offline:", e.message);
    }
  };

  const login = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (e) {
      logError(e, 'login');
      const msg = formatAuthError(e);
      return { success: false, msg };
    }
  };

  const logout = async () => {
    try {
      if (user?.uid) {
        await setUserOffline(user.uid);
      }
      await signOut(auth);
      return { success: true };
    } catch (e) {
      logError(e, 'logout');
      const msg = formatAuthError(e);
      return { success: false, msg, error: e };
    }
  };

  const register = async (email, password, username, profileurl) => {
    try {
      const response = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await setDoc(doc(db, "users", response?.user?.uid), {
        username,
        profileurl,
        userId: response?.user?.uid,
        isOnline: true,
        lastOnline: serverTimestamp(),
        lastSeen: serverTimestamp(),
      });
      return { success: true, data: response?.user };
    } catch (e) {
      logError(e, 'register');
      const msg = formatAuthError(e);
      return { success: false, msg };
    }
  };

  const resetPassword = async (email) => {
    try {
      if (!email) {
        return { success: false, msg: "Please provide an email address" };
      }
      await sendPasswordResetEmail(auth, email);
      return { 
        success: true, 
        msg: "Password reset email sent! Please check your inbox." 
      };
    } catch (e) {
      logError(e, 'resetPassword');
      const msg = formatAuthError(e);
      return { success: false, msg };
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, login, register, logout, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be wrapped inside AuthContextProvider");
  }
  return value;
};
