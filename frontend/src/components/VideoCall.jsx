import { useEffect, useRef } from 'react';
import { Button, Typography, Avatar } from 'antd';
import {
    PhoneOutlined,
    AudioMutedOutlined,
    VideoCameraOutlined,
    VideoCameraAddOutlined
} from '@ant-design/icons';
import { useCallStore } from '../store/callStore';
import { endCurrentCall } from '../services/webrtc';

const { Text } = Typography;

export default function VideoCall() {
    const {
        callType,
        remoteUser,
        localStream,
        remoteStream,
        isMuted,
        isVideoOff,
        toggleMute,
        toggleVideo
    } = useCallStore();

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    // Set up video streams
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    return (
        <div style={styles.overlay}>
            {/* Remote Video / Audio */}
            <div style={styles.remoteContainer}>
                {callType === 'video' && remoteStream ? (
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        style={styles.remoteVideo}
                    />
                ) : (
                    <div style={styles.audioOnlyContainer}>
                        <Avatar
                            size={120}
                            style={styles.remoteAvatar}
                        >
                            {remoteUser?.displayName?.[0] || remoteUser?.username?.[0] || '?'}
                        </Avatar>
                        <Text style={styles.remoteName}>
                            {remoteUser?.displayName || remoteUser?.username}
                        </Text>
                        <Text type="secondary" style={styles.callStatus}>
                            {remoteStream ? 'Connected' : 'Connecting...'}
                        </Text>
                    </div>
                )}
            </div>

            {/* Local Video (Picture-in-Picture) */}
            {callType === 'video' && localStream && !isVideoOff && (
                <div style={styles.localContainer}>
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        style={styles.localVideo}
                    />
                </div>
            )}

            {/* Call Controls */}
            <div style={styles.controls}>
                {/* Mute Toggle */}
                <Button
                    shape="circle"
                    size="large"
                    icon={isMuted ? <AudioMutedOutlined /> : <PhoneOutlined />}
                    onClick={toggleMute}
                    style={{
                        ...styles.controlButton,
                        ...(isMuted && styles.controlButtonActive)
                    }}
                />

                {/* Video Toggle (only for video calls) */}
                {callType === 'video' && (
                    <Button
                        shape="circle"
                        size="large"
                        icon={isVideoOff ? <VideoCameraAddOutlined /> : <VideoCameraOutlined />}
                        onClick={toggleVideo}
                        style={{
                            ...styles.controlButton,
                            ...(isVideoOff && styles.controlButtonActive)
                        }}
                    />
                )}

                {/* End Call */}
                <Button
                    shape="circle"
                    size="large"
                    icon={<PhoneOutlined style={{ transform: 'rotate(135deg)' }} />}
                    onClick={endCurrentCall}
                    style={styles.endCallButton}
                />
            </div>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
    },
    remoteContainer: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%'
    },
    remoteVideo: {
        width: '100%',
        height: '100%',
        objectFit: 'cover'
    },
    audioOnlyContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16
    },
    remoteAvatar: {
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        fontSize: 48
    },
    remoteName: {
        fontSize: 24,
        fontWeight: 600
    },
    callStatus: {
        fontSize: 14
    },
    localContainer: {
        position: 'absolute',
        bottom: 120,
        right: 24,
        width: 160,
        height: 220,
        borderRadius: 16,
        overflow: 'hidden',
        border: '2px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
    },
    localVideo: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        transform: 'scaleX(-1)' // Mirror local video
    },
    controls: {
        position: 'absolute',
        bottom: 40,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 20
    },
    controlButton: {
        width: 56,
        height: 56,
        background: 'rgba(255, 255, 255, 0.1)',
        border: 'none',
        color: 'white'
    },
    controlButtonActive: {
        background: '#f59e0b',
        color: 'black'
    },
    endCallButton: {
        width: 56,
        height: 56,
        background: '#ef4444',
        border: 'none',
        color: 'white'
    }
};
