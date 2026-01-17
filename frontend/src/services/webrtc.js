import { useCallStore } from '../store/callStore';
import { sendCallOffer, sendCallAnswer, sendIceCandidate, sendCallEnd } from './socket';
import api from './api';

let peerConnection = null;
let cachedIceServers = null;
let pendingIceCandidates = [];

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

// Check available devices
const getAvailableDevices = async () => {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasAudio = devices.some(d => d.kind === 'audioinput');
        const hasVideo = devices.some(d => d.kind === 'videoinput');
        return { hasAudio, hasVideo };
    } catch (error) {
        console.error('Error enumerating devices:', error);
        return { hasAudio: false, hasVideo: false };
    }
};

// Get media stream with fallbacks
const getMediaStream = async (callType) => {
    const { hasAudio, hasVideo } = await getAvailableDevices();

    // Determine what to request based on call type and available devices
    const constraints = {
        audio: hasAudio,
        video: callType === 'video' && hasVideo
    };

    // If no devices available at all, return null
    if (!constraints.audio && !constraints.video) {
        console.warn('No audio or video devices available');
        return null;
    }

    try {
        return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
        console.error('Error getting media stream:', error);

        // Try audio only as fallback
        if (callType === 'video' && hasAudio) {
            try {
                return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            } catch (e) {
                console.error('Audio fallback failed:', e);
            }
        }
        return null;
    }
};

// Process queued ICE candidates
const processPendingCandidates = async () => {
    if (!peerConnection || !peerConnection.remoteDescription) {
        return;
    }

    console.log(`Processing ${pendingIceCandidates.length} pending ICE candidates`);

    for (const candidate of pendingIceCandidates) {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('Added pending ICE candidate');
        } catch (error) {
            console.error('Error adding pending candidate:', error);
        }
    }
    pendingIceCandidates = [];
};

// Initialize WebRTC call
export const initiateCall = async (targetUser, callType) => {
    try {
        const callStore = useCallStore.getState();

        // Get ICE server configuration
        const iceConfig = await getIceServers();

        // Get local media stream with device checking
        const localStream = await getMediaStream(callType);

        if (!localStream) {
            console.error('No media devices available for call');
            alert('No camera or microphone found. Please connect a device to make calls.');
            return false;
        }

        callStore.setLocalStream(localStream);
        callStore.startCall(targetUser, callType);

        // Reset pending candidates
        pendingIceCandidates = [];

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

        // Get local media stream - try to get what we can
        const localStream = await getMediaStream(callType);

        // Even without a local stream, we can still receive audio/video
        if (localStream) {
            callStore.setLocalStream(localStream);
        } else {
            console.warn('No local media available, will only receive');
        }

        callStore.startCall(caller, callType);

        // Reset pending candidates
        pendingIceCandidates = [];

        // Create peer connection with ICE servers
        peerConnection = new RTCPeerConnection(iceConfig);

        // Add local tracks if available
        if (localStream) {
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });
        }

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
            }
        };

        peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', peerConnection.iceConnectionState);
        };

        // Set remote description FIRST
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

        // Process any pending ICE candidates
        await processPendingCandidates();

        // Create and send answer
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
            // Process any pending ICE candidates
            await processPendingCandidates();
        }
    } catch (error) {
        console.error('Error handling answer:', error);
    }
};

// Handle received ICE candidate
export const handleIceCandidate = async (candidate) => {
    try {
        if (!peerConnection) {
            console.log('No peer connection, ignoring ICE candidate');
            return;
        }

        if (!peerConnection.remoteDescription) {
            // Queue the candidate for later
            console.log('Queuing ICE candidate (no remote description yet)');
            pendingIceCandidates.push(candidate);
            return;
        }

        console.log('Adding ICE candidate');
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
        console.error('Error handling ICE candidate:', error);
    }
};

// End call
export const endCurrentCall = () => {
    const callStore = useCallStore.getState();
    const { remoteUser, localStream } = callStore;

    if (remoteUser) {
        sendCallEnd(remoteUser.id);
    }

    // Stop all tracks
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }

    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    pendingIceCandidates = [];
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
