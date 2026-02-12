# Chat App By Uzair 💬

A full-featured real-time chat application built with React Native, Expo, Firebase, and WebRTC. This app supports text messaging, image sharing, audio/video calls, push notifications, and more.

![React Native](https://img.shields.io/badge/React_Native-0.76.9-blue)
![Expo](https://img.shields.io/badge/Expo-52.0.28-lightblue)
![Firebase](https://img.shields.io/badge/Firebase-11.2.0-orange)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

### 🔐 Authentication
- Email/Password authentication
- User registration with profile picture
- Password reset via email
- Secure session management
- Online/Offline status tracking

### 💬 Real-time Messaging
- One-on-one chat
- Text messages
- Image sharing
- Real-time message synchronization
- Message timestamps
- User typing indicators

### 📞 Audio/Video Calls
- WebRTC-based peer-to-peer calling
- Audio-only calls
- Video calls with camera preview
- Incoming/Outgoing call screens
- Call notifications

### 🔔 Push Notifications
- Expo push notifications
- Call notifications
- Message notifications
- Background notification handling

### 👤 User Features
- Custom profile pictures
- Username customization
- User presence (online/offline)
- Last seen timestamps

### 🎨 UI/UX
- Modern, responsive design
- Dark/Light mode support
- Smooth animations
- Custom keyboard handling
- Loading states
- Error boundaries

## 📱 Screenshots

> Add your app screenshots here

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for Mac) or Android Emulator
- Firebase account
- Expo account (for push notifications)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Chat-App-By-Uzair.git
   cd Chat-App-By-Uzair
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup Firebase**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password)
   - Create a Firestore Database
   - Enable Firebase Storage
   - Copy your Firebase configuration

4. **Configure Environment Variables**
   - Copy `.env.example` to `.env`
     ```bash
     cp .env.example .env
     ```
   - Fill in your Firebase credentials in `.env`:
     ```env
     EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
     EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
     EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
     EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
     EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
     EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id_here
     ```

5. **Setup Firestore Security Rules**
   
   Go to Firestore Database → Rules and add:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && request.auth.uid == userId;
       }
       match /rooms/{roomId} {
         allow read, write: if request.auth != null;
         match /messages/{messageId} {
           allow read, write: if request.auth != null;
         }
       }
       match /calls/{callId} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

   **Note:** The app uses a filtering approach for read/unread messages that doesn't require composite indexes, making it faster to set up.

6. **Setup Firebase Storage Rules**
   
   Go to Storage → Rules and add:
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /profile_pictures/{userId}/{fileName} {
         allow read: if request.auth != null;
         allow write: if request.auth != null;
       }
       match /chatMedia/{roomId}/{fileName} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

### Running the App

#### Development Mode

```bash
# Start Expo development server
npx expo start
```

Then choose your platform:
- Press `a` for Android emulator
- Press `i` for iOS simulator
- Scan QR code with Expo Go app on your physical device

#### Run on Android

```bash
npm run android
```

#### Run on iOS (Mac only)

```bash
npm run ios
```

#### Run on Web

```bash
npm run web
```

## 📂 Project Structure

```
Chat-App-By-Uzair/
├── app/                      # App screens and navigation
│   ├── (app)/               # Protected routes
│   │   ├── home.js          # Home screen with user list
│   │   ├── chatRoom.js      # Chat conversation screen
│   │   ├── CallScreen.js    # Active call screen
│   │   ├── incomingCallScreen.js
│   │   ├── outgoingCallScreen.js
│   │   └── profile.js       # User profile screen
│   ├── signIn.js            # Sign in screen
│   ├── signUp.js            # Sign up screen
│   ├── forgotPassword.js    # Password reset screen
│   ├── index.js             # App entry point
│   └── _layout.js           # Root layout with providers
├── components/              # Reusable components
│   ├── ChatItem.js
│   ├── ChatList.js
│   ├── ChatRoomHeader.js
│   ├── CustomKeyboardView.js
│   ├── ErrorBoundary.js     # Error handling component
│   ├── HomeHeader.js
│   ├── Loading.js
│   ├── MessagesList.js
│   └── CustomMenuItems.js
├── context/                 # React Context providers
│   ├── authContext.js       # Authentication state
│   └── callContext.js  # WebRTC call management
├── utils/                   # Utility functions
│   ├── callHandler.js       # Call handling logic
│   ├── common.js            # Common utilities
│   ├── errorHandler.js      # Error handling utilities
│   ├── notification.js      # Push notification setup
│   ├── sendPush.js          # Send push notifications
│   └── webrtc.js            # WebRTC configuration
├── assets/                  # Images, fonts, animations
├── android/                 # Android native code
├── constants/               # App constants
├── firebaseConfig.js        # Firebase initialization
├── .env                     # Environment variables (gitignored)
├── .env.example             # Environment variables template
├── app.json                 # Expo configuration
├── package.json             # Dependencies
└── README.md               # This file
```

## 🛠️ Built With

### Core Technologies
- **[React Native](https://reactnative.dev/)** - Mobile framework
- **[Expo](https://expo.dev/)** - Development platform
- **[Firebase](https://firebase.google.com/)** - Backend services
  - Authentication
  - Firestore Database
  - Cloud Storage
- **[WebRTC](https://webrtc.org/)** - Real-time communication

### Key Libraries
- **expo-router** - File-based routing
- **react-native-webrtc** - WebRTC implementation
- **expo-notifications** - Push notifications
- **NativeWind** - Tailwind CSS for React Native
- **react-native-gifted-chat** - Chat UI components
- **expo-image-picker** - Image selection
- **lottie-react-native** - Animations

## 📝 Key Features Implementation

### Authentication Flow
1. User signs up with email, password, and optional profile picture
2. Firebase Authentication creates the user account
3. User data stored in Firestore `/users` collection
4. Profile picture uploaded to Firebase Storage
5. Session persisted with AsyncStorage

### Real-time Messaging
1. Messages stored in Firestore at `/rooms/{roomId}/messages`
2. Real-time listeners using `onSnapshot`
3. Room ID generated from sorted user IDs
4. Support for text, image, video, and file messages

### WebRTC Calling
1. Caller creates offer and stores in `/calls` collection
2. Callee receives notification via Expo Push
3. Callee accepts and creates answer
4. ICE candidates exchanged via Firestore
5. Peer-to-peer connection established

### Push Notifications
1. Device token registered on login
2. Stored in Firestore user document
3. Sent via Expo Push Notification API
4. Handled in foreground and background

## 🔒 Security Best Practices

- ✅ Firebase credentials stored in environment variables
- ✅ `.env` file excluded from git
- ✅ Firestore security rules implemented
- ✅ Storage security rules configured
- ✅ Input validation on all forms
- ✅ Password minimum length requirement
- ✅ Error messages sanitized

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test
```

## 📦 Building for Production

### Android

1. **Configure EAS Build**
   ```bash
   npm install -g eas-cli
   eas login
   eas build:configure
   ```

2. **Build APK/AAB**
   ```bash
   eas build --platform android
   ```

### iOS

1. **Build for iOS**
   ```bash
   eas build --platform ios
   ```

## 🐛 Troubleshooting

### Common Issues

**Issue: Firebase not initialized**
- Solution: Ensure `.env` file exists with correct Firebase credentials

**Issue: Push notifications not working**
- Solution: Make sure you're using Expo Dev Client, not Expo Go
- Run: `npx expo run:android` or `npx expo run:ios`

**Issue: WebRTC connection failed**
- Solution: Check internet connection and firewall settings
- Ensure STUN/TURN servers are accessible

**Issue: Images not uploading**
- Solution: Check Firebase Storage rules and permissions

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

**Uzair Saeedi**
- GitHub: [@uzairsaeedi](https://github.com/uzairsaeedi)
- Expo: [@uzairsaeedi](https://expo.dev/@uzairsaeedi)

## 🙏 Acknowledgments

- Firebase for backend services
- Expo team for the amazing development platform
- React Native community for excellent libraries
- WebRTC for real-time communication

## 📞 Support

For support, email your-email@example.com or open an issue in the repository.

## 🗺️ Roadmap

- [ ] Group chat functionality
- [ ] Voice messages
- [ ] Message reactions
- [ ] Read receipts
- [ ] User blocking
- [ ] Chat archiving
- [ ] End-to-end encryption
- [ ] Desktop web version
- [ ] Message search
- [ ] File sharing
- [ ] Location sharing
- [ ] Stickers and GIFs

---

**Made with ❤️ by Uzair**
