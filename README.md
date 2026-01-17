# LBChat

A modern, full-featured real-time chat application with text messaging, file sharing, and audio/video calls.

## Features

- 🔐 **User Authentication** - Register, login, JWT-based auth
- 💬 **Real-time Messaging** - 1-to-1 and group text chat
- 📁 **File Sharing** - Share images and files (up to 50MB)
- 📹 **Video/Audio Calls** - 1-to-1 WebRTC calls
- 🔔 **Push Notifications** - Browser push for new messages and calls
- 🐳 **Docker Deployment** - Fully containerized with docker-compose

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite, Ant Design, Zustand |
| Backend | Node.js, Express, Socket.IO, Prisma |
| Database | PostgreSQL |
| Cache | Redis |
| File Storage | MinIO (S3-compatible) |
| WebRTC | Coturn TURN/STUN |
| Deployment | Docker Compose |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)

### 1. Clone and Configure

```bash
cd /path/to/chat

# Copy environment template
cp .env.example .env

# Edit .env with your settings
# - Set strong passwords for POSTGRES_PASSWORD, JWT_SECRET, MINIO_SECRET_KEY
# - Generate VAPID keys: npx web-push generate-vapid-keys
```

### 2. Start with Docker

```bash
# Create data directories
mkdir -p data/{postgres,redis,minio}

# Copy TURN server config
cp coturn/turnserver.conf.example coturn/turnserver.conf
# Edit coturn/turnserver.conf with your settings

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
```

### 3. Access the Application

- **Web App**: http://localhost
- **MinIO Console**: http://localhost:9001 (for debugging)

## Development

### Backend

```bash
cd backend

# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run migrations (requires running PostgreSQL)
npm run db:migrate

# Start dev server
npm run dev
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

## Project Structure

```
chat/
├── docker-compose.yml      # Container orchestration
├── .env.example            # Environment template
│
├── frontend/               # React + Vite SPA
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route pages
│   │   ├── services/       # API, Socket, WebRTC
│   │   └── store/          # Zustand state
│   └── public/
│       └── sw.js           # Push notification service worker
│
├── backend/                # Node.js API
│   ├── src/
│   │   ├── routes/         # REST endpoints
│   │   ├── socket/         # WebSocket handlers
│   │   ├── services/       # Business logic
│   │   └── middleware/     # Auth, error handling
│   └── prisma/
│       └── schema.prisma   # Database schema
│
├── nginx/                  # Reverse proxy
└── data/                   # Persistent volumes (gitignored)
```

## API Documentation

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Create account |
| `/api/auth/login` | POST | Login |
| `/api/auth/logout` | POST | Logout |
| `/api/auth/refresh` | POST | Refresh token |

### Conversations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/conversations` | GET | List conversations |
| `/api/conversations` | POST | Create conversation |
| `/api/conversations/:id` | GET | Get conversation |
| `/api/conversations/:id/members` | POST | Add member |

### Messages

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/messages/conversations/:id/messages` | GET | Get messages |
| `/api/messages/conversations/:id/messages` | POST | Send message |

### Files

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/files/upload` | POST | Upload file |
| `/api/files/:id` | GET | Get file URL |

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `message:send` | Client → Server | Send message |
| `message:new` | Server → Client | New message |
| `typing:start` | Bidirectional | Typing indicator |
| `call:offer` | Client → Server | Initiate call |
| `call:answer` | Client → Server | Accept call |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `POSTGRES_PASSWORD` | Database password |
| `JWT_SECRET` | JWT signing key (min 32 chars) |
| `MINIO_SECRET_KEY` | MinIO secret key |
| `VAPID_PUBLIC_KEY` | Web Push public key |
| `VAPID_PRIVATE_KEY` | Web Push private key |

## Production Deployment

1. Set `NODE_ENV=production`
2. Use strong, unique passwords
3. Enable HTTPS (configure nginx with SSL certificates)
4. Set up a proper TURN server with your public IP
5. Configure backup for `./data` directory

## License

MIT
