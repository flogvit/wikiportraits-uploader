# Deployment Guide

This project includes an automated deployment script that builds and deploys to your SSH server.

## Quick Start

```bash
npm run deploy
```

## What the Deploy Script Does

1. **Builds** the Next.js application
2. **Creates** a deployment archive with all necessary files
3. **Uploads** to `ssh menneske:/var/www/wikiportraits-uploader/`
4. **Installs** dependencies on the server
5. **Restarts** the application (PM2 or systemd)
6. **Runs** a health check

## Prerequisites

### Local Machine
- SSH access to `menneske` server configured
- Node.js and npm installed
- Project built successfully (`npm run build`)

### Server Setup (menneske)
1. **Create application directory**:
   ```bash
   sudo mkdir -p /var/www/wikiportraits-uploader
   sudo chown www-data:www-data /var/www/wikiportraits-uploader
   ```

2. **Install Node.js and PM2**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo npm install -g pm2
   ```

3. **Create log directory**:
   ```bash
   sudo mkdir -p /var/log/wikiportraits-uploader
   sudo chown www-data:www-data /var/log/wikiportraits-uploader
   ```

4. **Configure environment variables**:
   ```bash
   sudo cp .env.production /var/www/wikiportraits-uploader/.env.local
   # Edit with actual values
   sudo nano /var/www/wikiportraits-uploader/.env.local
   ```

## Environment Variables

Update `/var/www/wikiportraits-uploader/.env.local` on the server:

```bash
NEXTAUTH_URL=https://your-actual-domain.com
NEXTAUTH_SECRET=your-actual-secret
WIKIMEDIA_CLIENT_ID=your-oauth-consumer-key
WIKIMEDIA_CLIENT_SECRET=your-oauth-consumer-secret
```

## Process Management

The deployment script supports both PM2 and systemd:

### PM2 (Recommended)
```bash
# Start application
pm2 start ecosystem.config.js

# View logs
pm2 logs wikiportraits-uploader

# Restart
pm2 restart wikiportraits-uploader

# Stop
pm2 stop wikiportraits-uploader
```

### Systemd Service
Create `/etc/systemd/system/wikiportraits-uploader.service`:

```ini
[Unit]
Description=WikiPortraits Bulk Uploader
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/wikiportraits-uploader
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable wikiportraits-uploader
sudo systemctl start wikiportraits-uploader
```

## Nginx Configuration

Create `/etc/nginx/sites-available/wikiportraits-uploader`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/wikiportraits-uploader /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL Certificate

Use Certbot for free SSL:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Troubleshooting

### Check application status
```bash
ssh menneske
sudo pm2 status
# or
sudo systemctl status wikiportraits-uploader
```

### View logs
```bash
sudo pm2 logs wikiportraits-uploader
# or
sudo journalctl -u wikiportraits-uploader -f
```

### Manual deployment steps
If the script fails, you can deploy manually:
```bash
# Build locally
npm run build

# Upload files
scp -r .next package.json src menneske:/var/www/wikiportraits-uploader/

# Install on server
ssh menneske
cd /var/www/wikiportraits-uploader
sudo npm ci --only=production
sudo pm2 restart wikiportraits-uploader
```

## Security Notes

- Ensure `.env.local` has restricted permissions (600)
- Keep OAuth secrets secure
- Use HTTPS in production
- Regularly update dependencies
- Monitor application logs for security issues