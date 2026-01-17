import { useCallStore } from '../store/callStore';
import { sendCallOffer, sendCallAnswer, sendIceCandidate, sendCallEnd } from './socket';

// ICE servers configuration
const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Add TURN server if configured
        ...(import.meta.env.VITE_TURN_URL ? [{
            urls: import.meta.env.VITE_TURN_URL,
            username: import.meta.env.VITE_TURN_USERNAME,
            credential: import.meta.env.VITE_TURN_PASSWORD
        }] : [])
    ]
};

let peerConnection = null;

// Initialize WebRTC call
export const initiateCall = async (targetUser, callType) => {
    try {
        const callStore = useCallStore.getState();

        // Get local media stream
        const constraints = {
            audio: true,
            video: callType === 'video'
        };

        const localStream = await navigator.mediaDevices.getUserMedia(constraints);
        callStore.setLocalStream(localStream);
        callStore.startCall(targetUser, callType);

        // Create peer connection
        peerConnection = new RTCPeerConnection(ICE_SERVERS);

        // Add local tracks
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Handle remote tracks
        peerConnection.ontrack = (event) => {
            callStore.setRemoteStream(event.streams[0]);
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                sendIceCandidate(targetUser.id, event.candidate);
            }
        };

        // Create and send offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        sendCallOffer(targetUser.id, offer, callType);

        return true;
    } catch (error) {
        console.error('Error initiating call:', error);
        useCallStore.getState().endCall();
        return false;
    }
};

// Answer incoming call
export const answerCall = async () => {
    try {
        const callStore = useCallStore.getState();
        const { incomingCall } = callStore;

        if (!incomingCall) return false;

        const { caller, offer, callType } = incomingCall;

        // Get local media stream
        const constraints = {
            audio: true,
            video: callType === 'video'
        };

        const localStream = await navigator.mediaDevices.getUserMedia(constraints);
        callStore.setLocalStream(localStream);
        callStore.startCall(caller, callType);

        // Create peer connection
        peerConnection = new RTCPeerConnection(ICE_SERVERS);

        // Add local tracks
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Handle remote tracks
        peerConnection.ontrack = (event) => {
            callStore.setRemoteStream(event.streams[0]);
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                sendIceCandidate(caller.id, event.candidate);
            }
        };

        // Set remote description and create answer
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        sendCallAnswer(caller.id, answer);

        return true;
    } catch (error) {
        console.error('Error answering call:', error);
        useCallStore.getState().endCall();
        return false;
    }
};

// Handle received answer
export const handleAnswer = async (answer) => {
    try {
        if (peerConnection) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        }
    } catch (error) {
        console.error('Error handling answer:', error);
    }
};

// Handle received ICE candidate
export const handleIceCandidate = async (candidate) => {
    try {
        if (peerConnection) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    } catch (error) {
        console.error('Error handling ICE candidate:', error);
    }
};

// End call
export const endCurrentCall = () => {
    const callStore = useCallStore.getState();
    const { remoteUser } = callStore;

    if (remoteUser) {
        sendCallEnd(remoteUser.id);
    }

    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    callStore.endCall();
};

// Set up event listeners
if (typeof window !== 'undefined') {
    window.addEventListener('call:answered', (event) => {
        handleAnswer(event.detail.answer);
    });

    window.addEventListener('call:ice-candidate', (event) => {
        handleIceCandidate(event.detail.candidate);
    });
}
