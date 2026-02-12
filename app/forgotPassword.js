import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native'
import React, { useRef, useState } from 'react'
import {widthPercentageToDP as wp, heightPercentageToDP as hp} from 'react-native-responsive-screen';
import { StatusBar } from 'expo-status-bar';
import { Octicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Loading from '../components/Loading';
import CustomKeyboardView from '../components/CustomKeyboardView';
import { useAuth } from '../context/authContext';

export default function ForgotPassword() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const emailRef = useRef("");

  const handleResetPassword = async() => {
    if(!emailRef.current){
      Alert.alert('Forgot Password', "Please enter your email address!");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailRef.current)) {
      Alert.alert('Invalid Email', "Please enter a valid email address!");
      return;
    }

    setLoading(true);
    try {
      const response = await resetPassword(emailRef.current);
      setLoading(false);
      
      if(response.success){
        Alert.alert(
          'Success', 
          response.msg,
          [
            {
              text: 'OK',
              onPress: () => router.back()
            }
          ]
        );
      } else {
        Alert.alert('Error', response.msg || "Failed to send reset email. Please try again.");
      }
    } catch(error) {
      setLoading(false);
      Alert.alert("Error", "An error occurred. Please try again later.");
    }
  }

  return (
    <CustomKeyboardView>
      <StatusBar style="dark"/>
      <View style={{paddingTop: hp(8), paddingHorizontal: wp(5)}} className="flex-1 gap-12">
        
        <View className="gap-10">
          <Text style={{fontSize: hp(4)}} className="font-bold tracking-wider text-center text-neutral-800">
            Reset Password
          </Text>
          <Text style={{fontSize: hp(2)}} className="text-center text-neutral-600">
            Enter your email address and we'll send you instructions to reset your password.
          </Text>
          
          {/* Email Input */}
          <View className="gap-4">
            <View style={{height: hp(7)}} className="flex-row gap-4 px-4 bg-neutral-100 items-center rounded-xl">
              <Octicons name="mail" size={hp(2.7)} color="gray" />
              <TextInput
                onChangeText={value => emailRef.current = value}
                style={{fontSize: hp(2)}}
                className="flex-1 font-semibold text-neutral-700"
                placeholder='Email Address'
                placeholderTextColor={'gray'}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View>
              {
                loading ? (
                  <View className="flex-row justify-center">
                    <Loading size={hp(6.5)}/>
                  </View>
                ) : (
                  <TouchableOpacity 
                    onPress={handleResetPassword} 
                    style={{height: hp(6.5)}} 
                    className="bg-indigo-500 rounded-xl justify-center items-center"
                  >
                    <Text style={{fontSize: hp(2.7)}} className="text-white font-bold tracking-wider">
                      Send Reset Email
                    </Text>
                  </TouchableOpacity>
                )
              }
            </View>

            <View className="flex-row justify-center mt-4">
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={{fontSize: hp(1.8)}} className="font-semibold text-indigo-500">
                  Back to Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </CustomKeyboardView>
  )
}
