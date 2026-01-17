import { create } from 'zustand';

export const useCallStore = create((set) => ({
    isInCall: false,
    callType: null, // 'audio' or 'video'
    remoteUser: null,
    localStream: null,
    remoteStream: null,
    isMuted: false,
    isVideoOff: false,
    incomingCall: null,

    // Start call
    startCall: (remoteUser, callType) => {
        set({
            isInCall: true,
            callType,
            remoteUser,
            incomingCall: null
        });
    },

    // Set incoming call
    setIncomingCall: (caller, offer, callType) => {
        set({
            incomingCall: { caller, offer, callType }
        });
    },

    // Clear incoming call
    clearIncomingCall: () => {
        set({ incomingCall: null });
    },

    // Set streams
    setLocalStream: (stream) => set({ localStream: stream }),
    setRemoteStream: (stream) => set({ remoteStream: stream }),

    // Toggle mute
    toggleMute: () => {
        set((state) => {
            if (state.localStream) {
                state.localStream.getAudioTracks().forEach(track => {
                    track.enabled = state.isMuted;
                });
            }
            return { isMuted: !state.isMuted };
        });
    },

    // Toggle video
    toggleVideo: () => {
        set((state) => {
            if (state.localStream) {
                state.localStream.getVideoTracks().forEach(track => {
                    track.enabled = state.isVideoOff;
                });
            }
            return { isVideoOff: !state.isVideoOff };
        });
    },

    // End call
    endCall: () => {
        set((state) => {
            // Stop all tracks
            if (state.localStream) {
                state.localStream.getTracks().forEach(track => track.stop());
            }
            if (state.remoteStream) {
                state.remoteStream.getTracks().forEach(track => track.stop());
            }

            return {
                isInCall: false,
                callType: null,
                remoteUser: null,
                localStream: null,
                remoteStream: null,
                isMuted: false,
                isVideoOff: false,
                incomingCall: null
            };
        });
    }
}));
