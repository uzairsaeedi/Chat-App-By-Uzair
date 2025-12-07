// utils/webrtc.js
import { RTCPeerConnection, mediaDevices } from "react-native-webrtc";

export const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export async function getLocalStream(isVideo = false) {
  const constraints = {
    audio: true,
    video: isVideo,
  };
  const stream = await mediaDevices.getUserMedia(constraints);
  return stream;
}

export function createPeerConnection() {
  const pc = new RTCPeerConnection(ICE_SERVERS);
  return pc;
}
