import { useEffect, useRef } from 'react';
import { Avatar, Typography, Image } from 'antd';
import { FileOutlined, DownloadOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Text } = Typography;

export default function MessageList({ messages, currentUserId }) {
    const containerRef = useRef(null);
    const bottomRef = useRef(null);

    // Scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        }
        if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        }
        return date.toLocaleDateString([], {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        });
    };

    const shouldShowDateSeparator = (msg, prevMsg) => {
        if (!prevMsg) return true;

        const date1 = new Date(msg.createdAt).toDateString();
        const date2 = new Date(prevMsg.createdAt).toDateString();
        return date1 !== date2;
    };

    const handleDownload = async (file) => {
        try {
            const response = await api.get(`/files/${file.id}`);
            window.open(response.data.url, '_blank');
        } catch (error) {
            console.error('Download error:', error);
        }
    };

    const renderMessageContent = (message) => {
        if (message.isDeleted) {
            return (
                <Text italic style={{ opacity: 0.6 }}>
                    This message was deleted
                </Text>
            );
        }

        switch (message.type) {
            case 'IMAGE':
                return (
                    <div style={styles.imageContainer}>
                        {message.file && (
                            <Image
                                src={`/api/files/${message.file.id}`}
                                alt={message.file.originalName}
                                style={styles.image}
                                placeholder
                            />
                        )}
                        {message.content && (
                            <Text style={{ marginTop: 8, display: 'block' }}>
                                {message.content}
                            </Text>
                        )}
                    </div>
                );

            case 'FILE':
                return (
                    <div
                        style={styles.fileContainer}
                        onClick={() => handleDownload(message.file)}
                    >
                        <FileOutlined style={styles.fileIcon} />
                        <div style={styles.fileInfo}>
                            <Text strong ellipsis>
                                {message.file?.originalName || 'File'}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {formatFileSize(message.file?.size)}
                            </Text>
                        </div>
                        <DownloadOutlined style={styles.downloadIcon} />
                    </div>
                );

            default:
                return <Text>{message.content}</Text>;
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
    };

    return (
        <div ref={containerRef} style={styles.container}>
            {messages.map((message, index) => {
                const isSent = message.sender.id === currentUserId;
                const prevMessage = messages[index - 1];
                const showDateSeparator = shouldShowDateSeparator(message, prevMessage);

                // Group consecutive messages from same sender
                const showAvatar = !prevMessage ||
                    prevMessage.sender.id !== message.sender.id ||
                    showDateSeparator;

                return (
                    <div key={message.id}>
                        {/* Date Separator */}
                        {showDateSeparator && (
                            <div style={styles.dateSeparator}>
                                <Text type="secondary" style={styles.dateText}>
                                    {formatDate(message.createdAt)}
                                </Text>
                            </div>
                        )}

                        {/* Message */}
                        <div style={{
                            ...styles.messageRow,
                            justifyContent: isSent ? 'flex-end' : 'flex-start'
                        }}>
                            {/* Avatar (only for received messages) */}
                            {!isSent && (
                                <div style={styles.avatarSpace}>
                                    {showAvatar && (
                                        <Avatar
                                            src={message.sender.avatarUrl}
                                            size={32}
                                            style={styles.avatar}
                                        >
                                            {message.sender.displayName?.[0] || message.sender.username?.[0]}
                                        </Avatar>
                                    )}
                                </div>
                            )}

                            <div style={{
                                ...styles.messageBubble,
                                ...(isSent ? styles.sentBubble : styles.receivedBubble)
                            }}>
                                {/* Sender name for group chats */}
                                {!isSent && showAvatar && (
                                    <Text strong style={styles.senderName}>
                                        {message.sender.displayName || message.sender.username}
                                    </Text>
                                )}

                                {/* Message content */}
                                {renderMessageContent(message)}

                                {/* Time & edited indicator */}
                                <div style={styles.messageFooter}>
                                    {message.isEdited && (
                                        <Text type="secondary" style={styles.editedText}>edited</Text>
                                    )}
                                    <Text type="secondary" style={styles.timeText}>
                                        {formatTime(message.createdAt)}
                                    </Text>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
            <div ref={bottomRef} />
        </div>
    );
}

const styles = {
    container: {
        flex: 1,
        overflowY: 'auto',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4
    },
    dateSeparator: {
        display: 'flex',
        justifyContent: 'center',
        padding: '16px 0'
    },
    dateText: {
        fontSize: 12,
        background: 'var(--color-bg-tertiary)',
        padding: '4px 12px',
        borderRadius: 12
    },
    messageRow: {
        display: 'flex',
        alignItems: 'flex-end',
        gap: 8
    },
    avatarSpace: {
        width: 32,
        flexShrink: 0
    },
    avatar: {
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
    },
    messageBubble: {
        maxWidth: '65%',
        padding: '10px 14px',
        borderRadius: 16
    },
    sentBubble: {
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        borderBottomRightRadius: 4,
        color: 'white'
    },
    receivedBubble: {
        background: 'var(--color-bg-tertiary)',
        borderBottomLeftRadius: 4
    },
    senderName: {
        fontSize: 12,
        color: '#8b5cf6',
        display: 'block',
        marginBottom: 4
    },
    messageFooter: {
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 6,
        marginTop: 4
    },
    editedText: {
        fontSize: 10,
        fontStyle: 'italic'
    },
    timeText: {
        fontSize: 10
    },
    imageContainer: {
        maxWidth: 280
    },
    image: {
        borderRadius: 8,
        maxWidth: '100%'
    },
    fileContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 12px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'background 0.15s ease',
        minWidth: 200
    },
    fileIcon: {
        fontSize: 24,
        color: '#8b5cf6'
    },
    fileInfo: {
        flex: 1,
        minWidth: 0
    },
    downloadIcon: {
        fontSize: 18,
        color: 'var(--color-text-secondary)'
    }
};
