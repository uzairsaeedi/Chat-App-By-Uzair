// utils/webrtc.js
import { RTCPeerConnection, mediaDevices } from "react-native-webrtc";

export const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    // Free TURN servers for testing (consider using your own in production)
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 10,
};

export async function getLocalStream(isVideo = false) {
  const constraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: isVideo ? {
      facingMode: "user",
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 30 },
    } : false,
  };
  
  console.log('[WebRTC] Getting local stream with constraints:', JSON.stringify(constraints));
  const stream = await mediaDevices.getUserMedia(constraints);
  console.log('[WebRTC] Got stream with tracks:', stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));
  return stream;
}

export function createPeerConnection() {
  const pc = new RTCPeerConnection(ICE_SERVERS);
  console.log('[WebRTC] Created peer connection');
  return pc;
}
