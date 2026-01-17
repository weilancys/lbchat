# LBChat Remote Server Deployment Guide

This guide covers deploying LBChat to a remote Linux server with Docker.

---

## Prerequisites

### Server Requirements
- **OS**: Ubuntu 22.04 LTS (recommended) or any Linux with Docker support
- **RAM**: Minimum 2GB, recommended 4GB+
- **Storage**: 20GB+ (depends on file uploads)
- **CPU**: 2+ cores
- **Ports**: 80, 443, 3478 (TURN), 5349 (TURNS)

### Domain (Recommended)
- A domain name pointing to your server's IP (e.g., `chat.yourdomain.com`)
- For SSL/HTTPS (required for WebRTC in production)

---

## Step 1: Prepare Your Server

### 1.1 Connect to Your Server
```bash
ssh user@your-server-ip
```

### 1.2 Install Docker & Docker Compose
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh

# Add your user to docker group (logout/login after)
sudo usermod -aG docker $USER

# Install Docker Compose plugin
sudo apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

### 1.3 Install Required Tools
```bash
sudo apt install git rsync -y
```

---

## Step 2: Transfer Project Files

### Option A: Using Git (Recommended)
```bash
# On your local machine, push to a Git repo first
cd /path/to/project/directory
git init
git add .
git commit -m "Initial LBChat commit"
git remote add origin git@github.com:yourusername/lbchat.git
git push -u origin main

# On the server
cd ~
git clone git@github.com:yourusername/lbchat.git
cd lbchat
```

### Option B: Using rsync
```bash
# From your local machine
rsync -avz --exclude 'node_modules' --exclude 'data' \
  /home/lightblue/source/playground/chat/ \
  user@your-server-ip:~/lbchat/
```

### Option C: Using scp
```bash
# From your local machine (create tarball first)
cd /path/to/project/directory
tar --exclude='chat/node_modules' --exclude='chat/data' -czvf lbchat.tar.gz chat/

scp lbchat.tar.gz user@your-server-ip:~/

# On the server
cd ~
tar -xzvf lbchat.tar.gz
mv chat lbchat
```

---

## Step 3: Configure for Production

### 3.1 Create Environment File
```bash
cd ~/lbchat
cp .env.example .env
nano .env  # or vim .env
```

### 3.2 Update Environment Variables

```env
# Application
NODE_ENV=production
FRONTEND_URL=https://chat.yourdomain.com

# Database - USE STRONG PASSWORDS!
POSTGRES_USER=lbchat
POSTGRES_PASSWORD=GENERATE_A_STRONG_PASSWORD_HERE
POSTGRES_DB=lbchat

# JWT - USE A LONG RANDOM STRING!
JWT_SECRET=GENERATE_A_64_CHARACTER_RANDOM_STRING
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# MinIO - USE STRONG CREDENTIALS!
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=lbchat_minio_admin
MINIO_SECRET_KEY=GENERATE_A_STRONG_PASSWORD_HERE
MINIO_BUCKET=lbchat-files
MINIO_USE_SSL=false

# File Limits
MAX_FILE_SIZE=52428800
MAX_IMAGE_SIZE=10485760

# TURN Server (WebRTC) - IMPORTANT for video calls
# Replace YOUR_SERVER_PUBLIC_IP with your actual VPS public IP
# The password MUST match what's in coturn/turnserver.conf
TURN_SERVER_URL=turn:YOUR_SERVER_PUBLIC_IP:3478
TURN_USERNAME=lbchat
TURN_PASSWORD=change_this_turn_password

# Push Notifications (generate with: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:admin@yourdomain.com
```

> **Generate secure passwords:**
> ```bash
> openssl rand -base64 32  # For passwords
> openssl rand -hex 32    # For JWT secret
> ```

### 3.3 Configure TURN Server
```bash
cp coturn/turnserver.conf.example coturn/turnserver.conf
nano coturn/turnserver.conf
```

Update these settings (must match your .env):
```conf
# Use your domain (same as DOMAIN in .env)
realm=yourname.duckdns.org

# REQUIRED: Uncomment and set your server's public IP
external-ip=YOUR_SERVER_PUBLIC_IP

# REQUIRED: Password must match TURN_PASSWORD in .env
user=lbchat:change_this_turn_password
```

> **Important**: The password in `turnserver.conf` (`user=lbchat:PASSWORD`) must exactly match `TURN_PASSWORD` in your `.env` file!

### 3.4 Configure SSL with Let's Encrypt

Create an updated nginx configuration for SSL:

```bash
nano nginx/nginx.conf
```

Replace with SSL-enabled config (see next section).

---

## Step 4: Enable HTTPS (SSL)

### 4.1 Install Certbot on Host
```bash
sudo apt install certbot -y

# Get certificate (temporarily stop any web server on port 80)
sudo certbot certonly --standalone -d chat.yourdomain.com
```

### 4.2 Update docker-compose.yml for SSL

Add volume mounts for SSL certificates:
```yaml
nginx:
  # ... existing config ...
  volumes:
    - /etc/letsencrypt:/etc/letsencrypt:ro
```

### 4.3 Update nginx/nginx.conf for HTTPS

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name chat.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name chat.yourdomain.com;

        # SSL Certificates
        ssl_certificate /etc/letsencrypt/live/chat.yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/chat.yourdomain.com/privkey.pem;
        
        # Modern SSL settings
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
        ssl_prefer_server_ciphers off;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Strict-Transport-Security "max-age=31536000" always;

        # Frontend
        location / {
            proxy_pass http://frontend:3000;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # API
        location /api {
            proxy_pass http://backend:4000;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            client_max_body_size 52M;
        }

        # WebSocket
        location /socket.io {
            proxy_pass http://backend:4000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_read_timeout 86400;
        }
    }
}
```

---

## Step 5: Deploy

### 5.1 Create Data Directories
```bash
cd ~/lbchat
mkdir -p data/{postgres,redis,minio}
```

### 5.2 Build and Start Services
```bash
# Build all images
docker compose build

# Start in detached mode
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### 5.3 Run Database Migrations
```bash
docker compose exec backend npx prisma db push
```

### 5.4 Verify Services
```bash
# Check all containers are running
docker compose ps

# Test health endpoint
curl http://localhost/api/health
```

---

## Step 6: Configure Firewall

```bash
# Allow required ports
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 3478/tcp    # TURN
sudo ufw allow 3478/udp    # TURN
sudo ufw allow 5349/tcp    # TURNS (TLS)
sudo ufw allow 49152:65535/udp  # TURN relay ports

# Enable firewall
sudo ufw enable
```

---

## Step 7: Set Up Auto-Restart & Monitoring

### 7.1 Enable Docker to Start on Boot
```bash
sudo systemctl enable docker
```

### 7.2 Configure Containers to Restart
Already configured in docker-compose.yml with `restart: unless-stopped`

### 7.3 Set Up SSL Certificate Auto-Renewal
```bash
# Add to crontab
sudo crontab -e

# Add this line (renews at 3am daily)
0 3 * * * certbot renew --quiet && docker compose -f ~/lbchat/docker-compose.yml restart nginx
```

---

## Step 8: Backup Strategy

### 8.1 Backup Script
```bash
nano ~/backup-lbchat.sh
```

```bash
#!/bin/bash
BACKUP_DIR=~/backups/lbchat
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker compose -f ~/lbchat/docker-compose.yml exec -T postgres \
  pg_dump -U lbchat lbchat > $BACKUP_DIR/db_$DATE.sql

# Backup uploaded files
tar -czvf $BACKUP_DIR/files_$DATE.tar.gz ~/lbchat/data/minio

# Keep only last 7 days
find $BACKUP_DIR -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
chmod +x ~/backup-lbchat.sh

# Add to crontab (daily at 2am)
crontab -e
0 2 * * * ~/backup-lbchat.sh
```

---

## Quick Commands Reference

| Task | Command |
|------|---------|
| Start services | `docker compose up -d` |
| Stop services | `docker compose down` |
| View logs | `docker compose logs -f` |
| Restart service | `docker compose restart backend` |
| Rebuild & restart | `docker compose up -d --build` |
| Database shell | `docker compose exec postgres psql -U lbchat` |
| Run migrations | `docker compose exec backend npx prisma db push` |

---

## Troubleshooting

### Containers won't start
```bash
docker compose logs backend  # Check for errors
docker compose down && docker compose up -d  # Full restart
```

### Database connection issues
```bash
# Check if postgres is healthy
docker compose ps
docker compose logs postgres
```

### WebRTC calls not connecting
1. Ensure TURN server is running: `docker compose logs coturn`
2. Verify public IP in `coturn/turnserver.conf`
3. Check firewall allows UDP ports

### SSL certificate issues
```bash
sudo certbot certificates  # Check certificate status
sudo certbot renew --dry-run  # Test renewal
```

---

## Security Checklist

- [ ] Strong passwords for all services (Postgres, MinIO, TURN)
- [ ] JWT secret is 64+ random characters
- [ ] HTTPS enabled with valid SSL certificate
- [ ] Firewall configured (only necessary ports open)
- [ ] Regular backups configured
- [ ] Server updated regularly (`apt update && apt upgrade`)
- [ ] SSH key authentication (disable password auth)
