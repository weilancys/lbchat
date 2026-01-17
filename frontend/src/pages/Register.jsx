import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Typography, message } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';

const { Title, Text } = Typography;

export default function Register() {
    const navigate = useNavigate();
    const { register, isLoading } = useAuthStore();
    const [form] = Form.useForm();

    const handleSubmit = async (values) => {
        const result = await register({
            email: values.email,
            username: values.username,
            password: values.password,
            displayName: values.displayName || values.username
        });

        if (result.success) {
            message.success('Account created successfully!');
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
                    <Title level={2} style={styles.title}>Create Account</Title>
                    <Text type="secondary">Join LBChat and start chatting</Text>
                </div>

                {/* Register Form */}
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
                        name="username"
                        rules={[
                            { required: true, message: 'Please enter a username' },
                            { min: 3, message: 'Username must be at least 3 characters' },
                            { max: 30, message: 'Username must be at most 30 characters' },
                            { pattern: /^[a-zA-Z0-9_]+$/, message: 'Only letters, numbers, and underscores' }
                        ]}
                    >
                        <Input
                            prefix={<UserOutlined style={styles.inputIcon} />}
                            placeholder="Username"
                            autoComplete="username"
                        />
                    </Form.Item>

                    <Form.Item
                        name="displayName"
                    >
                        <Input
                            prefix={<UserOutlined style={styles.inputIcon} />}
                            placeholder="Display name (optional)"
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[
                            { required: true, message: 'Please enter a password' },
                            { min: 8, message: 'Password must be at least 8 characters' }
                        ]}
                    >
                        <Input.Password
                            prefix={<LockOutlined style={styles.inputIcon} />}
                            placeholder="Password"
                            autoComplete="new-password"
                        />
                    </Form.Item>

                    <Form.Item
                        name="confirmPassword"
                        dependencies={['password']}
                        rules={[
                            { required: true, message: 'Please confirm your password' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('password') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('Passwords do not match'));
                                }
                            })
                        ]}
                    >
                        <Input.Password
                            prefix={<LockOutlined style={styles.inputIcon} />}
                            placeholder="Confirm password"
                            autoComplete="new-password"
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
                            Create Account
                        </Button>
                    </Form.Item>
                </Form>

                {/* Login Link */}
                <div style={styles.footer}>
                    <Text type="secondary">Already have an account? </Text>
                    <Link to="/login">Sign in</Link>
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
        marginBottom: 24
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
        marginTop: 20
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
        marginTop: 20
    },
    bgDecoration: {
        position: 'absolute',
        width: 600,
        height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none'
    }
};
