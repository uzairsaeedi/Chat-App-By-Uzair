import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  doc,
  setDoc,
  onSnapshot,
  collection,
  addDoc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { createPeerConnection, getLocalStream } from "../utils/webrtc";
import { useRouter } from "expo-router";

const CallContext = createContext();

export const CallProvider = ({ children }) => {
  const router = useRouter(); // fallback router if caller doesn't provide one
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [currentCallId, setCurrentCallId] = useState(null);
  const [isVideoCall, setIsVideoCall] = useState(false);

  const firestoreCallUnsubRef = useRef(null);
  const candidatesUnsubRef = useRef(null);

  const clearLocal = async () => {
    try {
      if (pcRef.current) {
        try {
          pcRef.current.close();
        } catch (e) {}
        pcRef.current = null;
      }
      if (localStreamRef.current) {
        try {
          localStreamRef.current.getTracks().forEach((t) => t.stop());
        } catch (e) {}
        localStreamRef.current = null;
      }
      setLocalStream(null);
      setRemoteStream(null);
      setCurrentCallId(null);
      setIsVideoCall(false);
      if (firestoreCallUnsubRef.current) {
        try {
          firestoreCallUnsubRef.current();
        } catch (e) {}
        firestoreCallUnsubRef.current = null;
      }
      if (candidatesUnsubRef.current) {
        try {
          candidatesUnsubRef.current();
        } catch (e) {}
        candidatesUnsubRef.current = null;
      }
    } catch (e) {
      console.warn("clearLocal err", e);
    }
  };

  // startCall: create pc, local stream, create offer, write call doc and callerCandidates
  // returns { success: true, callId } or { success: false, error }
  const startCall = async ({ caller, callee }, { isVideo = false } = {}) => {
    try {
      await clearLocal();
      setIsVideoCall(isVideo);

      const stream = await getLocalStream(isVideo);
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection();
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // create a unique call doc id
      const callId = `call_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const callDocRef = doc(db, "calls", callId);

      await setDoc(callDocRef, {
        offer: pc.localDescription?.toJSON
          ? pc.localDescription.toJSON()
          : offer,
        callerId: caller.userId,
        callerName: caller.username || "",
        callerPhoto: caller.profileurl || caller.photo || null,
        calleeId: callee.userId,
        calleeName: callee.username || "",
        calleePhoto: callee.profileurl || callee.photo || null,
        isVideo: !!isVideo,
        status: "ringing",
        createdAt: Date.now(),
      });

      const calleeSnap = await getDoc(doc(db, "users", callee.userId));
      const token = calleeSnap.exists() ? calleeSnap.data().pushToken : null;
      if (token) {
        await sendExpoPush(
          token,
          `${caller.username || "Caller"} is calling`,
          isVideo ? "Video call" : "Voice call",
          { screen: "IncomingCallScreen", callId: callDocRef.id }
        );
      }

      const callerCandidatesCol = collection(callDocRef, "callerCandidates");
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          try {
            await addDoc(callerCandidatesCol, event.candidate.toJSON());
          } catch (e) {
            console.warn("add caller candidate err", e);
          }
        }
      };

      // when remote track arrives -> set remoteStream
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      // listen for answer and status changes
      firestoreCallUnsubRef.current = onSnapshot(callDocRef, async (snap) => {
        const data = snap.data();
        if (!data) return;
        if (data.answer && pc && !pc.currentRemoteDescription) {
          try {
            await pc.setRemoteDescription(data.answer);
          } catch (e) {
            console.warn("setRemoteDescription err", e);
          }
        }
        if (
          data.status === "ended" ||
          data.status === "rejected" ||
          data.status === "cancelled"
        ) {
          // remote ended the call
          await clearLocal();
        }
      });

      // listen for calleeCandidates and add them
      const calleeCandidatesCol = collection(callDocRef, "calleeCandidates");
      candidatesUnsubRef.current = onSnapshot(calleeCandidatesCol, (snap) => {
        snap.docChanges().forEach(async (change) => {
          if (change.type === "added") {
            const cand = change.doc.data();
            try {
              await pc.addIceCandidate(cand);
            } catch (e) {
              console.warn("addIceCandidate (incoming) err", e);
            }
          }
        });
      });

      setCurrentCallId(callId);

      return { success: true, callId };
    } catch (err) {
      console.error("startCall err", err);
      await clearLocal();
      return { success: false, error: err };
    }
  };

  // callee answers: read offer, setRemoteDescription, createAnswer, update call doc, add callee candidates
  const answerCall = async ({ callId }, { isVideo = false } = {}) => {
    try {
      await clearLocal();
      setIsVideoCall(isVideo);

      const callDocRef = doc(db, "calls", callId);
      const snap = await callDocRef.get?.(); // defensive - may be undefined in some SDKs
      // listen for changes (answer / status / candidates)
      const stream = await getLocalStream(isVideo);
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection();
      pcRef.current = pc;

      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      // listen for doc and react when offer arrives
      firestoreCallUnsubRef.current = onSnapshot(
        callDocRef,
        async (snapDoc) => {
          const data = snapDoc.data();
          if (!data) return;
          if (data.offer && pc && !pc.currentRemoteDescription) {
            try {
              await pc.setRemoteDescription(data.offer);
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await updateDoc(callDocRef, {
                answer: pc.localDescription?.toJSON
                  ? pc.localDescription.toJSON()
                  : pc.localDescription,
                status: "accepted",
              });
            } catch (e) {
              console.warn("answer handling err", e);
            }
          }
          if (data.status === "ended" || data.status === "cancelled") {
            await clearLocal();
          }
        }
      );

      // add callerCandidates -> pc
      const callerCandidatesCol = collection(callDocRef, "callerCandidates");
      candidatesUnsubRef.current = onSnapshot(callerCandidatesCol, (snap) => {
        snap.docChanges().forEach(async (change) => {
          if (change.type === "added") {
            const cand = change.doc.data();
            try {
              await pc.addIceCandidate(cand);
            } catch (e) {
              console.warn("addIceCandidate (caller) err", e);
            }
          }
        });
      });

      // add our callee ICE candidates into calleeCandidates collection
      pc.onicecandidate = async (e) => {
        if (e.candidate) {
          try {
            await addDoc(
              collection(callDocRef, "calleeCandidates"),
              e.candidate.toJSON()
            );
          } catch (e) {
            console.warn("add callee candidate err", e);
          }
        }
      };

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0])
          setRemoteStream(event.streams[0]);
      };

      setCurrentCallId(callId);

      return { success: true, callId };
    } catch (err) {
      console.error("answerCall err", err);
      await clearLocal();
      return { success: false, error: err };
    }
  };

  const hangup = async (callId) => {
    try {
      const id = callId || currentCallId;
      if (id) {
        const callRef = doc(db, "calls", id);
        try {
          await updateDoc(callRef, { status: "ended" });
        } catch (e) {
          // doc may already be gone or no permissions
        }
      }
      await clearLocal();
    } catch (e) {
      console.warn("hangup err", e);
    }
  };

  return (
    <CallContext.Provider
      value={{
        startCall,
        answerCall,
        hangup,
        localStream,
        remoteStream,
        currentCallId,
        isVideoCall,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => useContext(CallContext);
