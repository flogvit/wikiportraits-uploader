#!/bin/bash

# WikiPortraits Deployment Script
# Deploys to ssh menneske:/var/www/wikiportraits-uploader/

set -e  # Exit on any error

echo "🚀 Starting WikiPortraits deployment..."

# Configuration
REMOTE_HOST="menneske"
REMOTE_PATH="/var/www/wikiportraits-uploader"
BUILD_DIR=".next"
STATIC_DIR="public"
SRC_DIR="src"
PACKAGE_FILES="package.json package-lock.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[DEPLOY]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we can connect to the remote server
log "Testing SSH connection to $REMOTE_HOST..."
if ! ssh -o ConnectTimeout=5 "$REMOTE_HOST" exit 2>/dev/null; then
    error "Cannot connect to $REMOTE_HOST. Please check your SSH configuration."
    exit 1
fi
success "SSH connection successful"

# Build the application
log "Building Next.js application..."
npm run build
if [ $? -ne 0 ]; then
    error "Build failed!"
    exit 1
fi
success "Build completed successfully"

# Create deployment archive
log "Creating deployment archive..."
DEPLOY_ARCHIVE="deploy-$(date +%Y%m%d-%H%M%S).tar.gz"

# Create temporary directory for deployment files
TEMP_DIR=$(mktemp -d)
log "Using temporary directory: $TEMP_DIR"

# Copy files to temporary directory
cp -r $BUILD_DIR "$TEMP_DIR/"
cp -r $STATIC_DIR "$TEMP_DIR/"
cp -r $SRC_DIR "$TEMP_DIR/"
cp $PACKAGE_FILES "$TEMP_DIR/"
cp next.config.ts "$TEMP_DIR/"
cp tsconfig.json "$TEMP_DIR/"

# Copy other necessary files if they exist
[ -f ".env.production" ] && cp .env.production "$TEMP_DIR/"
[ -f "ecosystem.config.js" ] && cp ecosystem.config.js "$TEMP_DIR/"

# Create archive
cd "$TEMP_DIR"
tar -czf "../$DEPLOY_ARCHIVE" .
cd - > /dev/null

mv "$TEMP_DIR/../$DEPLOY_ARCHIVE" .
rm -rf "$TEMP_DIR"

success "Deployment archive created: $DEPLOY_ARCHIVE"

# Upload to server
log "Uploading to $REMOTE_HOST:$REMOTE_PATH..."
scp "$DEPLOY_ARCHIVE" "$REMOTE_HOST:/tmp/"
if [ $? -ne 0 ]; then
    error "Failed to upload deployment archive"
    rm "$DEPLOY_ARCHIVE"
    exit 1
fi

# Deploy on remote server
log "Deploying on remote server..."
ssh "$REMOTE_HOST" << EOF
set -e

# Create backup of current deployment
if [ -d "$REMOTE_PATH" ]; then
    echo "Creating backup..."
    sudo cp -r "$REMOTE_PATH" "${REMOTE_PATH}.backup.\$(date +%Y%m%d-%H%M%S)" || true
fi

# Create directory if it doesn't exist
sudo mkdir -p "$REMOTE_PATH"

# Extract new deployment
cd "$REMOTE_PATH"
sudo tar -xzf "/tmp/$DEPLOY_ARCHIVE"

# Install/update dependencies
echo "Installing dependencies..."
sudo npm ci --only=production

# Set proper permissions
sudo chown -R www-data:www-data "$REMOTE_PATH"
sudo chmod -R 755 "$REMOTE_PATH"

# Restart application (assuming PM2 or systemd)
if command -v pm2 &> /dev/null; then
    echo "Restarting with PM2..."
    sudo pm2 reload wikiportraits-uploader || sudo pm2 start npm --name "wikiportraits-uploader" -- start
elif systemctl is-active --quiet wikiportraits-uploader; then
    echo "Restarting with systemctl..."
    sudo systemctl restart wikiportraits-uploader
else
    echo "No process manager found. You may need to manually restart the application."
fi

# Clean up
rm "/tmp/$DEPLOY_ARCHIVE"
echo "Deployment completed successfully!"
EOF

if [ $? -ne 0 ]; then
    error "Deployment failed on remote server"
    rm "$DEPLOY_ARCHIVE"
    exit 1
fi

# Clean up local archive
rm "$DEPLOY_ARCHIVE"

success "🎉 Deployment completed successfully!"
log "Application should be running at: http://$REMOTE_HOST"

# Optional: Run a quick health check
log "Running health check..."
if ssh "$REMOTE_HOST" "curl -f http://localhost:3022 > /dev/null 2>&1"; then
    success "Health check passed - application is responding"
else
    warn "Health check failed - you may need to check the application manually"
fi

echo ""
echo "📋 Post-deployment checklist:"
echo "1. Verify the application is running correctly"
echo "2. Check that environment variables are properly set"
echo "3. Test OAuth authentication flow"
echo "4. Verify file upload functionality"
echo ""
echo "🔧 Useful commands:"
echo "  ssh $REMOTE_HOST"
echo "  sudo pm2 logs wikiportraits-uploader"
echo "  sudo journalctl -u wikiportraits-uploader -f"