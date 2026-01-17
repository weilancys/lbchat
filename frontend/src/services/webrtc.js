import { useCallStore } from '../store/callStore';
import { sendCallOffer, sendCallAnswer, sendIceCandidate, sendCallEnd } from './socket';
import api from './api';

let peerConnection = null;
let cachedIceServers = null;

// Fetch ICE server configuration from backend
const getIceServers = async () => {
    if (cachedIceServers) {
        return cachedIceServers;
    }

    try {
        const response = await api.get('/turn');
        cachedIceServers = response.data;
        console.log('ICE servers loaded:', cachedIceServers.iceServers.length, 'servers');
        return cachedIceServers;
    } catch (error) {
        console.error('Failed to fetch ICE servers, using defaults:', error);
        return {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
    }
};

// Initialize WebRTC call
export const initiateCall = async (targetUser, callType) => {
    try {
        const callStore = useCallStore.getState();

        // Get ICE server configuration
        const iceConfig = await getIceServers();

        // Get local media stream
        const constraints = {
            audio: true,
            video: callType === 'video'
        };

        const localStream = await navigator.mediaDevices.getUserMedia(constraints);
        callStore.setLocalStream(localStream);
        callStore.startCall(targetUser, callType);

        // Create peer connection with ICE servers
        peerConnection = new RTCPeerConnection(iceConfig);

        // Add local tracks
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Handle remote tracks
        peerConnection.ontrack = (event) => {
            console.log('Received remote track:', event.track.kind);
            callStore.setRemoteStream(event.streams[0]);
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('Sending ICE candidate');
                sendIceCandidate(targetUser.id, event.candidate);
            }
        };

        // Monitor connection state
        peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', peerConnection.connectionState);
            if (peerConnection.connectionState === 'failed') {
                console.error('WebRTC connection failed');
                callStore.endCall();
            }
        };

        peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', peerConnection.iceConnectionState);
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

        // Get ICE server configuration
        const iceConfig = await getIceServers();

        // Get local media stream
        const constraints = {
            audio: true,
            video: callType === 'video'
        };

        const localStream = await navigator.mediaDevices.getUserMedia(constraints);
        callStore.setLocalStream(localStream);
        callStore.startCall(caller, callType);

        // Create peer connection with ICE servers
        peerConnection = new RTCPeerConnection(iceConfig);

        // Add local tracks
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Handle remote tracks
        peerConnection.ontrack = (event) => {
            console.log('Received remote track:', event.track.kind);
            callStore.setRemoteStream(event.streams[0]);
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('Sending ICE candidate');
                sendIceCandidate(caller.id, event.candidate);
            }
        };

        // Monitor connection state
        peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', peerConnection.connectionState);
            if (peerConnection.connectionState === 'failed') {
                console.error('WebRTC connection failed');
                callStore.endCall();
            }
        };

        peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', peerConnection.iceConnectionState);
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
        if (peerConnection && peerConnection.signalingState !== 'stable') {
            console.log('Setting remote answer');
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        }
    } catch (error) {
        console.error('Error handling answer:', error);
    }
};

// Handle received ICE candidate
export const handleIceCandidate = async (candidate) => {
    try {
        if (peerConnection && peerConnection.remoteDescription) {
            console.log('Adding ICE candidate');
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
            console.log('Queuing ICE candidate (no remote description yet)');
            // Queue candidates if remote description not set yet
            setTimeout(() => handleIceCandidate(candidate), 100);
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
