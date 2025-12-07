import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore, collection } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCd8ogrtCrcoUoyvtrVYft9CNVoVvOTdKI",
  authDomain: "food-delivery-2b886.firebaseapp.com",
  projectId: "food-delivery-2b886",
  storageBucket: "food-delivery-2b886.appspot.com",
  messagingSenderId: "1078336900454",
  appId: "1:1078336900454:web:1ec6c8d896d69ec0420ca7",
};

export const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);

export const usersRef = collection(db, "users");
export const roomRef = collection(db, "rooms");
