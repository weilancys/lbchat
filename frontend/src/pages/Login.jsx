import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Typography, message } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';

const { Title, Text } = Typography;

export default function Login() {
    const navigate = useNavigate();
    const { login, isLoading } = useAuthStore();
    const [form] = Form.useForm();

    const handleSubmit = async (values) => {
        const result = await login(values.email, values.password);

        if (result.success) {
            message.success('Welcome back!');
            navigate('/');
        } else {
            message.error(result.error);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                {/* Logo/Brand */}
                <div style={styles.header}>
                    <div style={styles.logo}>💬</div>
                    <Title level={2} style={styles.title}>Welcome to LBChat</Title>
                    <Text type="secondary">Sign in to continue to your conversations</Text>
                </div>

                {/* Login Form */}
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    size="large"
                    style={styles.form}
                >
                    <Form.Item
                        name="email"
                        rules={[
                            { required: true, message: 'Please enter your email' },
                            { type: 'email', message: 'Please enter a valid email' }
                        ]}
                    >
                        <Input
                            prefix={<MailOutlined style={styles.inputIcon} />}
                            placeholder="Email address"
                            autoComplete="email"
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: 'Please enter your password' }]}
                    >
                        <Input.Password
                            prefix={<LockOutlined style={styles.inputIcon} />}
                            placeholder="Password"
                            autoComplete="current-password"
                        />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 16 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            loading={isLoading}
                            style={styles.submitButton}
                        >
                            Sign In
                        </Button>
                    </Form.Item>
                </Form>

                {/* Register Link */}
                <div style={styles.footer}>
                    <Text type="secondary">Don't have an account? </Text>
                    <Link to="/register">Create one</Link>
                </div>
            </div>

            {/* Background decoration */}
            <div style={styles.bgDecoration} />
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        position: 'relative',
        overflow: 'hidden'
    },
    card: {
        width: '100%',
        maxWidth: 420,
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(20px)',
        borderRadius: 24,
        padding: 40,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'relative',
        zIndex: 1
    },
    header: {
        textAlign: 'center',
        marginBottom: 32
    },
    logo: {
        fontSize: 48,
        marginBottom: 16
    },
    title: {
        margin: '0 0 8px 0',
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
    },
    form: {
        marginTop: 24
    },
    inputIcon: {
        color: 'rgba(255, 255, 255, 0.3)',
        marginRight: 8
    },
    submitButton: {
        height: 48,
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        border: 'none',
        fontWeight: 600,
        fontSize: 16
    },
    footer: {
        textAlign: 'center',
        marginTop: 24
    },
    bgDecoration: {
        position: 'absolute',
        width: 600,
        height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none'
    }
};
