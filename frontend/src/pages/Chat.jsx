import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Input, Button, Avatar, Typography, Dropdown, Badge, Empty, Spin } from 'antd';
import {
    SendOutlined,
    PaperClipOutlined,
    PhoneOutlined,
    VideoCameraOutlined,
    MoreOutlined,
    SearchOutlined,
    LogoutOutlined,
    UserOutlined,
    PlusOutlined,
    MenuOutlined,
    ArrowLeftOutlined
} from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useCallStore } from '../store/callStore';
import api from '../services/api';
import { connectSocket, disconnectSocket, sendMessage, startTyping, stopTyping } from '../services/socket';
import { initiateCall } from '../services/webrtc';
import ConversationList from '../components/ConversationList';
import MessageList from '../components/MessageList';
import VideoCall from '../components/VideoCall';
import IncomingCall from '../components/IncomingCall';
import NewChatModal from '../components/NewChatModal';

const { Sider, Content } = Layout;
const { Text } = Typography;

export default function Chat() {
    const navigate = useNavigate();
    const { conversationId } = useParams();
    const { user, logout } = useAuthStore();
    const {
        conversations,
        setConversations,
        activeConversation,
        setActiveConversation,
        messages,
        setMessages,
        typingUsers
    } = useChatStore();
    const { isInCall, incomingCall } = useCallStore();

    const [messageInput, setMessageInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [showNewChat, setShowNewChat] = useState(false);
    const [typingTimeout, setTypingTimeout] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Connect socket on mount
    useEffect(() => {
        connectSocket();
        loadConversations();

        return () => {
            disconnectSocket();
        };
    }, []);

    // Load conversation when ID changes
    useEffect(() => {
        if (conversationId) {
            loadConversation(conversationId);
        } else {
            setActiveConversation(null);
        }
    }, [conversationId]);

    const loadConversations = async () => {
        try {
            const response = await api.get('/conversations');
            setConversations(response.data.conversations);
        } catch (error) {
            console.error('Error loading conversations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadConversation = async (id) => {
        try {
            // Load conversation details
            const convResponse = await api.get(`/conversations/${id}`);
            setActiveConversation(convResponse.data.conversation);

            // Load messages
            const msgResponse = await api.get(`/messages/conversations/${id}/messages`);
            setMessages(id, msgResponse.data.messages);
        } catch (error) {
            console.error('Error loading conversation:', error);
            navigate('/');
        }
    };

    const handleSendMessage = async () => {
        if (!messageInput.trim() || !activeConversation || isSending) return;

        const content = messageInput.trim();
        setMessageInput('');
        setIsSending(true);

        try {
            sendMessage(activeConversation.id, content);
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsSending(false);
        }
    };

    const handleTyping = (e) => {
        setMessageInput(e.target.value);

        if (activeConversation) {
            startTyping(activeConversation.id);

            // Clear previous timeout
            if (typingTimeout) {
                clearTimeout(typingTimeout);
            }

            // Set new timeout to stop typing indicator
            const timeout = setTimeout(() => {
                stopTyping(activeConversation.id);
            }, 2000);

            setTypingTimeout(timeout);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleCall = async (type) => {
        if (!activeConversation || activeConversation.type !== 'DIRECT') return;

        const otherMember = activeConversation.members.find(m => m.user.id !== user.id);
        if (otherMember) {
            await initiateCall(otherMember.user, type);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const getConversationName = () => {
        if (!activeConversation) return '';

        if (activeConversation.type === 'DIRECT') {
            const other = activeConversation.members.find(m => m.user.id !== user.id);
            return other?.user.displayName || other?.user.username || 'Unknown';
        }

        return activeConversation.name || 'Group Chat';
    };

    const getTypingText = () => {
        if (!activeConversation) return null;

        const typing = typingUsers[activeConversation.id];
        if (!typing) return null;

        const typingList = Object.values(typing);
        if (typingList.length === 0) return null;

        if (typingList.length === 1) {
            return `${typingList[0].displayName || typingList[0].username} is typing...`;
        }

        return 'Several people are typing...';
    };

    const userMenuItems = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: 'Profile'
        },
        {
            type: 'divider'
        },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Logout',
            danger: true,
            onClick: handleLogout
        }
    ];

    if (isLoading) {
        return (
            <div style={styles.loadingContainer}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <Layout style={styles.layout}>
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="mobile-overlay"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <Sider
                width={320}
                style={styles.sider}
                className={sidebarOpen ? 'mobile-open' : ''}
            >
                {/* User Header */}
                <div style={styles.userHeader}>
                    <div style={styles.userInfo}>
                        <Avatar style={styles.userAvatar}>
                            {user?.displayName?.[0] || user?.username?.[0] || '?'}
                        </Avatar>
                        <div>
                            <Text strong style={styles.userName}>
                                {user?.displayName || user?.username}
                            </Text>
                            <Text type="secondary" style={styles.userStatus}>Online</Text>
                        </div>
                    </div>
                    <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
                        <Button type="text" icon={<MoreOutlined />} />
                    </Dropdown>
                </div>

                {/* Search & New Chat */}
                <div style={styles.searchContainer}>
                    <Input
                        prefix={<SearchOutlined style={{ color: 'rgba(255,255,255,0.3)' }} />}
                        placeholder="Search conversations"
                        style={styles.searchInput}
                    />
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setShowNewChat(true)}
                        style={styles.newChatBtn}
                    />
                </div>

                {/* Conversation List */}
                <ConversationList
                    conversations={conversations}
                    activeId={activeConversation?.id}
                    currentUserId={user?.id}
                    onSelect={(conv) => {
                        navigate(`/chat/${conv.id}`);
                        setSidebarOpen(false);
                    }}
                />
            </Sider>

            {/* Main Content */}
            <Content style={styles.content}>
                {/* Mobile Header */}
                <div className="mobile-header">
                    <Button
                        type="text"
                        icon={<MenuOutlined />}
                        onClick={() => setSidebarOpen(true)}
                        className="mobile-menu-btn"
                    />
                    <Text strong style={{ flex: 1 }}>
                        {activeConversation ? getConversationName() : 'LBChat'}
                    </Text>
                </div>

                {activeConversation ? (
                    <>
                        {/* Chat Header */}
                        <div style={styles.chatHeader}>
                            <div style={styles.chatInfo}>
                                <Avatar style={styles.chatAvatar}>
                                    {getConversationName()[0]}
                                </Avatar>
                                <div>
                                    <Text strong>{getConversationName()}</Text>
                                    {getTypingText() ? (
                                        <Text type="secondary" style={styles.typingText}>
                                            {getTypingText()}
                                        </Text>
                                    ) : (
                                        <Text type="secondary" style={styles.onlineText}>
                                            {activeConversation.type === 'DIRECT' ? 'Online' : `${activeConversation.members.length} members`}
                                        </Text>
                                    )}
                                </div>
                            </div>

                            {activeConversation.type === 'DIRECT' && (
                                <div style={styles.callButtons}>
                                    <Button
                                        type="text"
                                        icon={<PhoneOutlined />}
                                        onClick={() => handleCall('audio')}
                                    />
                                    <Button
                                        type="text"
                                        icon={<VideoCameraOutlined />}
                                        onClick={() => handleCall('video')}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Messages */}
                        <MessageList
                            messages={messages[activeConversation.id] || []}
                            currentUserId={user?.id}
                        />

                        {/* Message Input */}
                        <div style={styles.inputContainer}>
                            <Button
                                type="text"
                                icon={<PaperClipOutlined />}
                                style={styles.attachBtn}
                            />
                            <Input.TextArea
                                value={messageInput}
                                onChange={handleTyping}
                                onKeyPress={handleKeyPress}
                                placeholder="Type a message..."
                                autoSize={{ minRows: 1, maxRows: 4 }}
                                style={styles.messageInput}
                            />
                            <Button
                                type="primary"
                                icon={<SendOutlined />}
                                onClick={handleSendMessage}
                                disabled={!messageInput.trim()}
                                loading={isSending}
                                style={styles.sendBtn}
                            />
                        </div>
                    </>
                ) : (
                    <div style={styles.emptyState}>
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="Select a conversation to start chatting"
                        />
                    </div>
                )}
            </Content>

            {/* Video Call Overlay */}
            {isInCall && <VideoCall />}

            {/* Incoming Call Modal */}
            {incomingCall && <IncomingCall />}

            {/* New Chat Modal */}
            <NewChatModal
                open={showNewChat}
                onClose={() => setShowNewChat(false)}
                onCreated={(conv) => {
                    setShowNewChat(false);
                    navigate(`/chat/${conv.id}`);
                }}
            />
        </Layout>
    );
}

const styles = {
    layout: {
        height: '100vh',
        background: 'var(--color-bg-primary)'
    },
    loadingContainer: {
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    sider: {
        background: 'var(--color-bg-secondary)',
        borderRight: '1px solid var(--color-border)'
    },
    userHeader: {
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--color-border)'
    },
    userInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: 12
    },
    userAvatar: {
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
    },
    userName: {
        display: 'block'
    },
    userStatus: {
        fontSize: 12,
        display: 'block'
    },
    searchContainer: {
        padding: 12,
        display: 'flex',
        gap: 8
    },
    searchInput: {
        flex: 1,
        background: 'var(--color-bg-tertiary)',
        border: 'none'
    },
    newChatBtn: {
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        border: 'none'
    },
    content: {
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-bg-primary)'
    },
    chatHeader: {
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-bg-secondary)'
    },
    chatInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: 12
    },
    chatAvatar: {
        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
    },
    typingText: {
        fontSize: 12,
        display: 'block',
        fontStyle: 'italic'
    },
    onlineText: {
        fontSize: 12,
        display: 'block'
    },
    callButtons: {
        display: 'flex',
        gap: 4
    },
    inputContainer: {
        padding: 16,
        display: 'flex',
        alignItems: 'flex-end',
        gap: 8,
        background: 'var(--color-bg-secondary)',
        borderTop: '1px solid var(--color-border)'
    },
    attachBtn: {
        color: 'var(--color-text-secondary)'
    },
    messageInput: {
        flex: 1,
        background: 'var(--color-bg-tertiary)',
        border: 'none',
        resize: 'none'
    },
    sendBtn: {
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        border: 'none'
    },
    emptyState: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    }
};
