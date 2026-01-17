import { Avatar, Badge, Typography } from 'antd';

const { Text } = Typography;

export default function ConversationList({ conversations, activeId, currentUserId, onSelect }) {
    const getDisplayInfo = (conversation) => {
        if (conversation.type === 'DIRECT') {
            const other = conversation.members.find(m => m.user.id !== currentUserId);
            return {
                name: other?.user.displayName || other?.user.username || 'Unknown',
                avatar: other?.user.avatarUrl,
                isOnline: other?.user.isOnline
            };
        }

        return {
            name: conversation.name || 'Group Chat',
            avatar: conversation.avatarUrl,
            isOnline: false
        };
    };

    const getLastMessage = (conversation) => {
        const lastMsg = conversation.messages?.[0];
        if (!lastMsg) return 'No messages yet';

        const sender = lastMsg.sender?.id === currentUserId ? 'You' : lastMsg.sender?.displayName;

        if (lastMsg.type === 'IMAGE') return `${sender}: 📷 Image`;
        if (lastMsg.type === 'FILE') return `${sender}: 📎 File`;

        const content = lastMsg.content || '';
        const preview = content.length > 30 ? content.substring(0, 30) + '...' : content;
        return `${sender}: ${preview}`;
    };

    const formatTime = (dateString) => {
        if (!dateString) return '';

        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        // Less than 24 hours
        if (diff < 86400000) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        // Less than a week
        if (diff < 604800000) {
            return date.toLocaleDateString([], { weekday: 'short' });
        }

        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    if (conversations.length === 0) {
        return (
            <div style={styles.empty}>
                <Text type="secondary">No conversations yet</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Start a new chat to begin messaging
                </Text>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {conversations.map((conversation) => {
                const info = getDisplayInfo(conversation);
                const isActive = conversation.id === activeId;

                return (
                    <div
                        key={conversation.id}
                        style={{
                            ...styles.item,
                            ...(isActive && styles.itemActive)
                        }}
                        onClick={() => onSelect(conversation)}
                    >
                        <div style={styles.avatarContainer}>
                            <Badge dot={info.isOnline} offset={[-4, 36]} color="#22c55e">
                                <Avatar
                                    src={info.avatar}
                                    style={styles.avatar}
                                    size={48}
                                >
                                    {info.name[0]}
                                </Avatar>
                            </Badge>
                        </div>

                        <div style={styles.content}>
                            <div style={styles.header}>
                                <Text strong style={styles.name}>{info.name}</Text>
                                <Text type="secondary" style={styles.time}>
                                    {formatTime(conversation.messages?.[0]?.createdAt)}
                                </Text>
                            </div>
                            <Text
                                type="secondary"
                                style={styles.preview}
                                ellipsis
                            >
                                {getLastMessage(conversation)}
                            </Text>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

const styles = {
    container: {
        flex: 1,
        overflowY: 'auto'
    },
    empty: {
        padding: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        textAlign: 'center'
    },
    item: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        cursor: 'pointer',
        transition: 'background 0.15s ease',
        borderLeft: '3px solid transparent'
    },
    itemActive: {
        background: 'rgba(99, 102, 241, 0.1)',
        borderLeftColor: '#6366f1'
    },
    avatarContainer: {
        flexShrink: 0
    },
    avatar: {
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
    },
    content: {
        flex: 1,
        minWidth: 0
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2
    },
    name: {
        color: 'var(--color-text-primary)'
    },
    time: {
        fontSize: 11,
        flexShrink: 0
    },
    preview: {
        fontSize: 13,
        display: 'block'
    }
};
