// utils/callHandler.js
import {
  doc,
  setDoc,
  onSnapshot,
  collection,
  addDoc,
  updateDoc,
  getDoc,
  deleteDoc,
  onSnapshot as onSnap,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { createPeer, createLocalStream, RTCIceCandidate } from "./webrtc";
import { RTCPeerConnection } from "react-native-webrtc";
import { sendExpoPush } from "./notifications";

const pcs = new Map(); // callId => { pc, localStream, unsubDoc, unsubCandidates }

async function attachCandidatesListener(callId, pc) {
  const callDoc = doc(db, "calls", callId);
  const candidatesCol = collection(callDoc, "candidates");
  const unsub = onSnap(candidatesCol, (snap) => {
    snap.docChanges().forEach(async (change) => {
      if (change.type === "added") {
        const cand = change.doc.data();
        try {
          const ice = new RTCIceCandidate(cand);
          await pc.addIceCandidate(ice);
        } catch (e) {
          console.warn("addIceCandidate error", e);
        }
      }
    });
  });
  return unsub;
}

export async function startCall({ caller, callee, isVideo = false, router }) {
  const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const pc = createPeer(isVideo);
  const localStream = await createLocalStream(isVideo);

  localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  const callDocRef = doc(db, "calls", callId);
  await setDoc(callDocRef, {
    offer: offer,
    callerId: caller.userId,
    callerName: caller.username,
    calleeId: callee.userId,
    isVideo: !!isVideo,
    status: "ringing",
    createdAt: Date.now(),
  });

  const candidatesCol = collection(callDocRef, "candidates");
  pc.onicecandidate = async (event) => {
    if (event.candidate) {
      try {
        await addDoc(candidatesCol, event.candidate.toJSON());
      } catch (e) {
        console.warn("add candidate err", e);
      }
    }
  };

  pc.ontrack = (event) => {
    // remote stream will be accessible through event.streams[0]
  };

  try {
    const calleeDoc = await getDoc(doc(db, "users", callee.userId));
    const calleeToken = calleeDoc.exists()
      ? calleeDoc.data().pushToken || calleeDoc.data().pushToken
      : null;
    if (calleeToken) {
      await sendExpoPush(
        calleeToken,
        `${caller.username || "Caller"} is calling`,
        isVideo ? "Video call" : "Voice call",
        {
          screen: "IncomingCallScreen",
          callId,
          isVideo: !!isVideo,
          callerName: caller.username,
        }
      );
    } else {
      console.log("callee has no push token");
    }
  } catch (e) {
    console.warn("failed to send push to callee", e);
  }

  const unsubDoc = onSnapshot(callDocRef, async (snap) => {
    const data = snap.data();
    if (!data) return;
    if (data.answer && !pc.currentRemoteDescription) {
      try {
        await pc.setRemoteDescription(data.answer);
      } catch (err) {
        console.warn("setRemoteDescription err", err);
      }
    }
    if (data.status === "ended") {
      try {
        pc.getSenders().forEach((s) => s.track && s.track.stop());
      } catch (e) {}
      pc.close();
      const item = pcs.get(callId);
      if (item && item.unsubCandidates) item.unsubCandidates();
      if (unsubDoc) unsubDoc();
      pcs.delete(callId);
    }
  });

  const unsubCandidates = await attachCandidatesListener(callId, pc);

  pcs.set(callId, { pc, localStream, unsubDoc, unsubCandidates });

  return { callId, pc, localStream, callDocRef };
}

export async function answerCall({ callId, isVideo = false, router }) {
  const callDocRef = doc(db, "calls", callId);
  const snap = await getDoc(callDocRef);
  if (!snap.exists()) throw new Error("Call not found");

  const callData = snap.data();
  const pc = createPeer(isVideo);
  const localStream = await createLocalStream(isVideo);
  localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

  try {
    await pc.setRemoteDescription(callData.offer);
  } catch (err) {
    console.warn("setRemoteDescription(answer) err", err);
  }

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  await updateDoc(callDocRef, {
    answer: answer,
    status: "accepted",
  });

  const candidatesCol = collection(callDocRef, "candidates");
  pc.onicecandidate = async (event) => {
    if (event.candidate) {
      try {
        await addDoc(candidatesCol, event.candidate.toJSON());
      } catch (e) {
        console.warn("add candidate err", e);
      }
    }
  };

  const unsubCandidates = await attachCandidatesListener(callId, pc);

  pc.ontrack = (event) => {
    // handle remote stream event.streams[0]
  };

  const unsubDoc = onSnapshot(callDocRef, (snap) => {
    const data = snap.data();
    if (!data) return;
    if (data.status === "ended") {
      try {
        pc.getSenders().forEach((s) => s.track && s.track.stop());
      } catch (e) {}
      pc.close();
      if (pcs.get(callId)?.unsubCandidates) pcs.get(callId).unsubCandidates();
      if (unsubDoc) unsubDoc();
      pcs.delete(callId);
    }
  });

  pcs.set(callId, { pc, localStream, unsubDoc, unsubCandidates });

  return { callId, pc, localStream, callDocRef };
}

export async function hangupCall(callId) {
  const callDocRef = doc(db, "calls", callId);
  try {
    await updateDoc(callDocRef, { status: "ended" });
    const entry = pcs.get(callId);
    if (entry) {
      try {
        entry.localStream.getTracks().forEach((t) => t.stop());
      } catch (e) {}
      try {
        entry.pc.close();
      } catch (e) {}
      if (entry.unsubCandidates) entry.unsubCandidates();
      if (entry.unsubDoc) entry.unsubDoc();
      pcs.delete(callId);
    }
  } catch (e) {
    console.warn("hangup err", e);
  }
}

export function getPcForCall(callId) {
  return pcs.get(callId);
}
