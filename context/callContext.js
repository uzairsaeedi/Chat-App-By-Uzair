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
import { sendExpoPush } from "../utils/notification";
import { useRouter } from "expo-router";

const CallContext = createContext();

export const CallProvider = ({ children }) => {
  const router = useRouter();
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [currentCallId, setCurrentCallId] = useState(null);
  const [isVideoCall, setIsVideoCall] = useState(false);

  const firestoreCallUnsubRef = useRef(null);
  const candidatesUnsubRef = useRef(null);
  
  // Track if we've already processed the offer/answer to prevent duplicate setRemoteDescription calls
  const hasProcessedOfferRef = useRef(false);
  const hasProcessedAnswerRef = useRef(false);

  const clearLocal = async () => {
    try {
      // Reset processing flags
      hasProcessedOfferRef.current = false;
      hasProcessedAnswerRef.current = false;
      
      if (pcRef.current) {
        try {
          pcRef.current.close();
        } catch (e) {}
        pcRef.current = null;
      }
      if (localStreamRef.current) {
        try {
          localStreamRef.current.getTracks().forEach((t) => {
            try { t.stop(); } catch (e) {}
          });
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
      console.log('[Call] Got local stream with tracks:', stream.getTracks().map(t => t.kind));

      const pc = createPeerConnection();
      pcRef.current = pc;

      // Add tracks to peer connection
      stream.getTracks().forEach((track) => {
        console.log('[Call] Adding track to PC:', track.kind);
        pc.addTrack(track, stream);
      });

      // Handle incoming remote tracks
      pc.ontrack = (event) => {
        console.log('[Call] Received remote track:', event.track?.kind);
        if (event.streams && event.streams[0]) {
          console.log('[Call] Setting remote stream');
          setRemoteStream(event.streams[0]);
        }
      };

      // Monitor connection state
      pc.onconnectionstatechange = () => {
        console.log('[Call] Connection state:', pc.connectionState);
      };

      pc.oniceconnectionstatechange = () => {
        console.log('[Call] ICE connection state:', pc.iceConnectionState);
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('[Call] Created and set local offer');

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
        console.log('[Call] Sending notification to callee...');
        const result = await sendExpoPush(
          token,
          `${caller.username || "Caller"} is calling`,
          isVideo ? "Video call" : "Voice call",
          { screen: "incomingCallScreen", callId: callDocRef.id }
        );
        console.log('[Call] Notification sent:', result?.data?.[0]?.status || 'success');
      } else {
        console.warn('[Call] Callee has no push token registered');
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

      // listen for answer and status changes
      firestoreCallUnsubRef.current = onSnapshot(callDocRef, async (snap) => {
        const data = snap.data();
        if (!data) return;
        
        // Only process answer once to avoid "stable state" error
        if (data.answer && pc && !hasProcessedAnswerRef.current) {
          const signalingState = pc.signalingState;
          console.log('[Call] Caller received answer, signalingState:', signalingState);
          
          // Only set remote description if we're in the right state
          if (signalingState === 'have-local-offer') {
            hasProcessedAnswerRef.current = true;
            try {
              await pc.setRemoteDescription(data.answer);
              console.log('[Call] Remote description set successfully');
            } catch (e) {
              console.warn("setRemoteDescription err", e);
              hasProcessedAnswerRef.current = false; // Allow retry on error
            }
          }
        }
        
        if (
          data.status === "ended" ||
          data.status === "rejected" ||
          data.status === "cancelled"
        ) {
          console.log('[Call] Call status changed to:', data.status);
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
      
      // Get the call document first to read the offer
      const callSnap = await getDoc(callDocRef);
      if (!callSnap.exists()) {
        console.error('[Call] Call document not found');
        return { success: false, error: 'Call not found' };
      }
      
      const callData = callSnap.data();
      if (!callData.offer) {
        console.error('[Call] No offer in call document');
        return { success: false, error: 'No offer found' };
      }

      const stream = await getLocalStream(isVideo);
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection();
      pcRef.current = pc;

      // Add tracks to peer connection
      stream.getTracks().forEach((track) => {
        console.log('[Call] Adding track to PC:', track.kind);
        pc.addTrack(track, stream);
      });

      // Handle incoming remote tracks
      pc.ontrack = (event) => {
        console.log('[Call] Received remote track:', event.track?.kind);
        if (event.streams && event.streams[0]) {
          console.log('[Call] Setting remote stream');
          setRemoteStream(event.streams[0]);
        }
      };

      // Set remote description (offer) and create answer immediately
      console.log('[Call] Setting remote offer...');
      await pc.setRemoteDescription(callData.offer);
      hasProcessedOfferRef.current = true;
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('[Call] Created and set local answer');

      // Update the call document with our answer
      await updateDoc(callDocRef, {
        answer: pc.localDescription?.toJSON
          ? pc.localDescription.toJSON()
          : pc.localDescription,
        status: "accepted",
      });
      console.log('[Call] Answer sent to Firebase');

      // Listen for call status changes (ended, cancelled)
      firestoreCallUnsubRef.current = onSnapshot(callDocRef, async (snapDoc) => {
        const data = snapDoc.data();
        if (!data) return;
        if (data.status === "ended" || data.status === "cancelled") {
          console.log('[Call] Call ended by remote');
          await clearLocal();
        }
      });

      // Listen for caller's ICE candidates and add them
      const callerCandidatesCol = collection(callDocRef, "callerCandidates");
      candidatesUnsubRef.current = onSnapshot(callerCandidatesCol, (snap) => {
        snap.docChanges().forEach(async (change) => {
          if (change.type === "added") {
            const cand = change.doc.data();
            try {
              if (pc.remoteDescription) {
                await pc.addIceCandidate(cand);
              }
            } catch (e) {
              console.warn("addIceCandidate (caller) err", e);
            }
          }
        });
      });

      // Send our ICE candidates to calleeCandidates collection
      pc.onicecandidate = async (e) => {
        if (e.candidate) {
          try {
            await addDoc(
              collection(callDocRef, "calleeCandidates"),
              e.candidate.toJSON()
            );
          } catch (err) {
            console.warn("add callee candidate err", err);
          }
        }
      };

      // Monitor connection state
      pc.onconnectionstatechange = () => {
        console.log('[Call] Connection state:', pc.connectionState);
      };

      pc.oniceconnectionstatechange = () => {
        console.log('[Call] ICE connection state:', pc.iceConnectionState);
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
