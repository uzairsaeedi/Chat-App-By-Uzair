import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
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

export const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(undefined);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setIsAuthenticated(true);
        setUser(firebaseUser);
        await updateUserData(firebaseUser.uid);
        await setUserOnline(firebaseUser.uid);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    });

    const subscription = AppState.addEventListener(
      "change",
      async (nextAppState) => {
        if (auth.currentUser) {
          if (nextAppState === "active") {
            await setUserOnline(auth.currentUser.uid);
          } else if (nextAppState.match(/inactive|background/)) {
            await setUserOffline(auth.currentUser.uid);
          }
        }
      }
    );

    return () => {
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
          { username: defaultName, profileurl: null, userId },
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
        if (
          Platform.OS !== "web" &&
          typeof Notifications.getExpoPushTokenAsync === "function"
        ) {
          await registerPushTokenToFirestore(userId);
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
      });
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
    } catch (e) {
      console.log("Error setting user offline:", e.message);
    }
  };

  const login = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (e) {
      let msg = e.message;
      if (msg.includes("(auth/invalid-credential)"))
        msg = "Invalid Credentials";
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
      return { success: false, msg: e.message, error: e };
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
        lastSeen: serverTimestamp(),
      });
      return { success: true, data: response?.user };
    } catch (e) {
      let msg = e.message;
      if (msg.includes("(auth/invalid-email)")) msg = "Invalid Email";
      if (msg.includes("(auth/email-already-in-use)"))
        msg = "This Email is already registered";
      return { success: false, msg };
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, login, register, logout }}
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
