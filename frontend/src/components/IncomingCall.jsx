import { Modal, Button, Avatar, Typography } from 'antd';
import { PhoneOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { useCallStore } from '../store/callStore';
import { answerCall, endCurrentCall } from '../services/webrtc';
import { sendCallReject } from '../services/socket';

const { Text, Title } = Typography;

export default function IncomingCall() {
    const { incomingCall, clearIncomingCall } = useCallStore();

    if (!incomingCall) return null;

    const { caller, callType } = incomingCall;

    const handleAccept = async () => {
        await answerCall();
    };

    const handleReject = () => {
        sendCallReject(caller.id);
        clearIncomingCall();
    };

    return (
        <Modal
            open={true}
            closable={false}
            footer={null}
            centered
            width={320}
            styles={{
                content: {
                    background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 24
                }
            }}
        >
            <div style={styles.container}>
                {/* Caller Avatar with pulse animation */}
                <div style={styles.avatarContainer}>
                    <div style={styles.pulseRing} />
                    <Avatar
                        size={100}
                        src={caller.avatarUrl}
                        style={styles.avatar}
                    >
                        {caller.displayName?.[0] || caller.username?.[0]}
                    </Avatar>
                </div>

                {/* Caller Info */}
                <Title level={4} style={styles.name}>
                    {caller.displayName || caller.username}
                </Title>

                <Text type="secondary" style={styles.callType}>
                    {callType === 'video' ? (
                        <>
                            <VideoCameraOutlined style={{ marginRight: 6 }} />
                            Incoming Video Call
                        </>
                    ) : (
                        <>
                            <PhoneOutlined style={{ marginRight: 6 }} />
                            Incoming Audio Call
                        </>
                    )}
                </Text>

                {/* Action Buttons */}
                <div style={styles.actions}>
                    <Button
                        shape="circle"
                        size="large"
                        icon={<PhoneOutlined style={{ transform: 'rotate(135deg)' }} />}
                        onClick={handleReject}
                        style={styles.rejectButton}
                    />
                    <Button
                        shape="circle"
                        size="large"
                        icon={callType === 'video' ? <VideoCameraOutlined /> : <PhoneOutlined />}
                        onClick={handleAccept}
                        style={styles.acceptButton}
                    />
                </div>
            </div>

            {/* CSS Animation */}
            <style>{`
        @keyframes pulse-ring {
          0% {
            transform: scale(0.8);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }
      `}</style>
        </Modal>
    );
}

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px 0'
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 20
    },
    pulseRing: {
        position: 'absolute',
        inset: -10,
        borderRadius: '50%',
        border: '3px solid #22c55e',
        animation: 'pulse-ring 1.5s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite'
    },
    avatar: {
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        fontSize: 40
    },
    name: {
        margin: 0,
        color: 'white'
    },
    callType: {
        marginTop: 8,
        fontSize: 14
    },
    actions: {
        display: 'flex',
        gap: 40,
        marginTop: 32
    },
    rejectButton: {
        width: 64,
        height: 64,
        background: '#ef4444',
        border: 'none',
        color: 'white',
        fontSize: 24
    },
    acceptButton: {
        width: 64,
        height: 64,
        background: '#22c55e',
        border: 'none',
        color: 'white',
        fontSize: 24
    }
};
