import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import React, { useRef, useState } from "react";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { StatusBar } from "expo-status-bar";
import { Feather, Octicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Loading from "../components/Loading";
import CustomKeyboardView from "../components/CustomKeyboardView";
import { useAuth } from "../context/authContext";
import * as ImagePicker from "expo-image-picker";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "../firebaseConfig";

export default function SignUp() {
  const router = useRouter();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);

  const emailRef = useRef("");
  const passwordRef = useRef("");
  const usernameRef = useRef("");
  const profileRef = useRef("");

  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        const selectedImage = result.assets[0].uri;
        setImage(selectedImage);
        await uploadImageToFirebase(selectedImage);
      }
    } catch (error) {
      console.error("Image picking error:", error);
      Alert.alert("Error", "Could not open gallery.");
    }
  };

  const uploadImageToFirebase = async (uri) => {
    try {
      // Convert image URI to blob
      const response = await fetch(uri);
      const blob = await response.blob();

      const storage = getStorage(app);
      const filename = `profile_pictures/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);

      // Upload image
      await uploadBytes(storageRef, blob);

      // Get image URL from Firebase
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error("Upload error:", error);
      setLoading(false);
      Alert.alert("Upload Failed", "Something went wrong. Try again.");
      return null;
    }
  };

  const handleRegister = async () => {
    if (!emailRef.current || !passwordRef.current || !usernameRef.current) {
      Alert.alert("Sign Up", "Please fill all the fields!");
      return;
    }
    setLoading(true);

    try {
      let profileurl = null;

      if (image) {
        profileurl = await uploadImageToFirebase(image);
      }
      let response = await register(
        emailRef.current,
        passwordRef.current,
        usernameRef.current,
        profileurl
      );
      setLoading(false);

      if (!response.success) {
        Alert.alert("Sign Up", response.msg);
      } else {
        Alert.alert("Success", "Account created successfully!");
        router.push("signIn");
      }
    } catch (error) {
      setLoading(false);
      console.error("Registration error:", error);
      Alert.alert("Error", "An error occurred during registration.");
    }
  };

  return (
    <CustomKeyboardView>
      <StatusBar style="dark" />
      <View
        style={{ paddingTop: hp(7), paddingHorizontal: wp(5) }}
        className="flex-1 gap-12"
      >
        <View className="items-center">
          <Image
            source={
              image ? { uri: image } : require("../assets/images/register.png")
            }
            style={{ height: hp(20), width: hp(20), borderRadius: hp(10) }}
            resizeMode="contain"
          />
        </View>

        <TouchableOpacity
          onPress={pickImage}
          style={{
            marginTop: hp(2),
            backgroundColor: "#4F46E5",
            paddingVertical: hp(1.5),
            paddingHorizontal: wp(10),
            borderRadius: 10,
          }}
        >
          <Text style={{ color: "white", fontSize: hp(2), fontWeight: "bold" }}>
            Select Profile Picture
          </Text>
        </TouchableOpacity>

        {/* Loading Indicator */}
        {loading && (
          <ActivityIndicator
            size="large"
            color="#4F46E5"
            style={{ marginTop: hp(2) }}
          />
        )}

        <View className="gap-10">
          <Text
            style={{ fontSize: hp(4) }}
            className="font-bold tracking wider text-center text-neutral-800"
          >
            Sign Up
          </Text>

          {/* inputs */}

          <View className="gap-4">
            <View
              style={{ height: hp(7) }}
              className="flex-row gap-4 px-4 bg-neutral-100 items-center rounded-xl"
            >
              <Octicons name="mail" size={hp(2.7)} color="gray" />
              <TextInput
                onChangeText={(value) => (emailRef.current = value)}
                style={{ fontSize: hp(2) }}
                className="flex-1 font-semibold text-neutral-700"
                placeholder="Email Address"
                placeholderTextColor={"gray"}
              />
            </View>

            <View
              style={{ height: hp(7) }}
              className="flex-row gap-4 px-4 bg-neutral-100 items-center rounded-xl"
            >
              <Feather name="user" size={hp(2.7)} color="gray" />
              <TextInput
                onChangeText={(value) => (usernameRef.current = value)}
                style={{ fontSize: hp(2) }}
                className="flex-1 font-semibold text-neutral-700"
                placeholder="Username"
                placeholderTextColor={"gray"}
              />
            </View>

            <View
              style={{ height: hp(7) }}
              className="flex-row gap-4 px-4 bg-neutral-100 items-center rounded-xl"
            >
              <Octicons name="lock" size={hp(2.7)} color="gray" />
              <TextInput
                onChangeText={(value) => (passwordRef.current = value)}
                style={{ fontSize: hp(2) }}
                className="flex-1 font-semibold text-neutral-700"
                placeholder="Password"
                secureTextEntry
                placeholderTextColor={"gray"}
              />
            </View>

            <View>
              {loading ? (
                <View className="flex-row justify-center">
                  <Loading size={hp(6.5)} />
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleRegister}
                  style={{ height: hp(6.5) }}
                  className="bg-indigo-500 rounded-xl justify-center items-center"
                >
                  <Text
                    style={{ fontSize: hp(2.7) }}
                    className="text-white font-bold tracking-wider"
                  >
                    Sign Up
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View className="flex-row justify-center">
              <Text
                style={{ fontSize: hp(1.8) }}
                className="font-semibold text-neutral-500"
              >
                Already have an account?
              </Text>
              <Pressable>
                <Text
                  style={{ fontSize: hp(1.8) }}
                  className="font-bold text-indigo-500"
                >
                  Log In
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </CustomKeyboardView>
  );
}
