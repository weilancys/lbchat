import { useState } from 'react';
import { Modal, Input, List, Avatar, Button, Typography, Spin, Tabs, Form, message } from 'antd';
import { SearchOutlined, UserOutlined, TeamOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Text } = Typography;

export default function NewChatModal({ open, onClose, onCreated }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [groupName, setGroupName] = useState('');
    const [activeTab, setActiveTab] = useState('direct');

    const handleSearch = async (query) => {
        setSearchQuery(query);

        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const response = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
            setSearchResults(response.data.users);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectUser = (user) => {
        if (activeTab === 'direct') {
            // For direct chat, create immediately
            createDirectConversation(user.id);
        } else {
            // For group, toggle selection
            if (selectedUsers.find(u => u.id === user.id)) {
                setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
            } else {
                setSelectedUsers([...selectedUsers, user]);
            }
        }
    };

    const createDirectConversation = async (userId) => {
        setIsCreating(true);
        try {
            const response = await api.post('/conversations', {
                type: 'DIRECT',
                memberIds: [userId]
            });
            onCreated(response.data.conversation);
        } catch (error) {
            message.error('Failed to create conversation');
            console.error('Create conversation error:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const createGroupConversation = async () => {
        if (!groupName.trim() || selectedUsers.length < 1) {
            message.warning('Please enter a group name and select at least one member');
            return;
        }

        setIsCreating(true);
        try {
            const response = await api.post('/conversations', {
                type: 'GROUP',
                name: groupName.trim(),
                memberIds: selectedUsers.map(u => u.id)
            });
            onCreated(response.data.conversation);
        } catch (error) {
            message.error('Failed to create group');
            console.error('Create group error:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleClose = () => {
        setSearchQuery('');
        setSearchResults([]);
        setSelectedUsers([]);
        setGroupName('');
        setActiveTab('direct');
        onClose();
    };

    const tabItems = [
        {
            key: 'direct',
            label: (
                <span>
                    <UserOutlined /> Direct Message
                </span>
            )
        },
        {
            key: 'group',
            label: (
                <span>
                    <TeamOutlined /> New Group
                </span>
            )
        }
    ];

    return (
        <Modal
            title="New Conversation"
            open={open}
            onCancel={handleClose}
            footer={activeTab === 'group' ? (
                <Button
                    type="primary"
                    onClick={createGroupConversation}
                    loading={isCreating}
                    disabled={!groupName.trim() || selectedUsers.length < 1}
                    style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', border: 'none' }}
                >
                    Create Group ({selectedUsers.length} members)
                </Button>
            ) : null}
            width={480}
        >
            <Tabs
                items={tabItems}
                activeKey={activeTab}
                onChange={setActiveTab}
                style={{ marginBottom: 16 }}
            />

            {/* Group Name Input */}
            {activeTab === 'group' && (
                <Input
                    placeholder="Group name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    style={{ marginBottom: 16 }}
                />
            )}

            {/* Selected Users for Group */}
            {activeTab === 'group' && selectedUsers.length > 0 && (
                <div style={styles.selectedContainer}>
                    {selectedUsers.map(user => (
                        <div
                            key={user.id}
                            style={styles.selectedUser}
                            onClick={() => handleSelectUser(user)}
                        >
                            <Avatar size="small" style={styles.selectedAvatar}>
                                {user.displayName?.[0] || user.username?.[0]}
                            </Avatar>
                            <Text ellipsis style={{ fontSize: 12 }}>
                                {user.displayName || user.username}
                            </Text>
                            <span style={styles.removeX}>×</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Search Input */}
            <Input
                prefix={<SearchOutlined style={{ color: 'rgba(255,255,255,0.3)' }} />}
                placeholder="Search users by name or email"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                style={{ marginBottom: 16 }}
                autoFocus
            />

            {/* Search Results */}
            <div style={styles.resultsContainer}>
                {isSearching ? (
                    <div style={styles.loadingContainer}>
                        <Spin />
                    </div>
                ) : searchResults.length > 0 ? (
                    <List
                        dataSource={searchResults}
                        renderItem={(user) => {
                            const isSelected = selectedUsers.find(u => u.id === user.id);

                            return (
                                <List.Item
                                    style={{
                                        ...styles.userItem,
                                        ...(isSelected && styles.userItemSelected)
                                    }}
                                    onClick={() => handleSelectUser(user)}
                                >
                                    <List.Item.Meta
                                        avatar={
                                            <Avatar style={styles.avatar}>
                                                {user.displayName?.[0] || user.username?.[0]}
                                            </Avatar>
                                        }
                                        title={user.displayName || user.username}
                                        description={`@${user.username}`}
                                    />
                                    {user.isOnline && (
                                        <div style={styles.onlineBadge} />
                                    )}
                                </List.Item>
                            );
                        }}
                    />
                ) : searchQuery.length >= 2 ? (
                    <div style={styles.emptyState}>
                        <Text type="secondary">No users found</Text>
                    </div>
                ) : (
                    <div style={styles.emptyState}>
                        <Text type="secondary">
                            {activeTab === 'direct'
                                ? 'Search for someone to start a conversation'
                                : 'Search for users to add to the group'
                            }
                        </Text>
                    </div>
                )}
            </div>
        </Modal>
    );
}

const styles = {
    selectedContainer: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
        padding: 8,
        background: 'rgba(99, 102, 241, 0.1)',
        borderRadius: 8
    },
    selectedUser: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 8px',
        background: 'rgba(99, 102, 241, 0.2)',
        borderRadius: 16,
        cursor: 'pointer'
    },
    selectedAvatar: {
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
    },
    removeX: {
        marginLeft: 4,
        opacity: 0.6,
        fontWeight: 'bold'
    },
    resultsContainer: {
        maxHeight: 300,
        overflowY: 'auto'
    },
    loadingContainer: {
        padding: 40,
        textAlign: 'center'
    },
    userItem: {
        cursor: 'pointer',
        padding: '12px 16px',
        borderRadius: 8,
        transition: 'background 0.15s ease'
    },
    userItemSelected: {
        background: 'rgba(99, 102, 241, 0.15)'
    },
    avatar: {
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
    },
    onlineBadge: {
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: '#22c55e'
    },
    emptyState: {
        padding: 40,
        textAlign: 'center'
    }
};
