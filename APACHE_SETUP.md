# Apache Configuration for WikiPortraits

This guide explains how to set up Apache as a reverse proxy for your Next.js WikiPortraits application running on port 3022.

## Setup Instructions

### 1. Copy Configuration File

Copy the `wikiportraits.conf` file to your Apache configuration directory:

```bash
sudo cp wikiportraits.conf /etc/apache2/sites-available/
```

### 2. Enable Required Apache Modules

```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod headers
sudo a2enmod ssl
sudo a2enmod rewrite
```

### 3. Enable the Site

```bash
sudo a2ensite wikiportraits.conf
```

### 4. Test Configuration

```bash
sudo apache2ctl configtest
```

### 5. Reload Apache

```bash
sudo systemctl reload apache2
```

## Configuration Details

The Apache configuration includes:

### HTTP Virtual Host (Port 80)
- Proxies all requests to `localhost:3022`
- Handles Next.js API routes (`/api/`)
- Supports static files (`/_next/`)
- Security headers
- 50MB file upload limit

### HTTPS Virtual Host (Port 443)
- SSL/TLS encryption
- Modern SSL configuration
- HSTS security header
- Content Security Policy
- Same proxy configuration as HTTP

## SSL Certificate Setup

### Option 1: Let's Encrypt (Recommended)

```bash
sudo apt install certbot python3-certbot-apache
sudo certbot --apache -d wikiportraits.menneske.no
```

### Option 2: Self-Signed Certificate (Development)

The configuration includes default self-signed certificates. For production, update these lines in the HTTPS virtual host:

```apache
SSLCertificateFile /etc/letsencrypt/live/wikiportraits.menneske.no/fullchain.pem
SSLCertificateKeyFile /etc/letsencrypt/live/wikiportraits.menneske.no/privkey.pem
```

## Domain Configuration

Update the domain names in `wikiportraits.conf`:

```apache
ServerName your-actual-domain.com
ServerAlias www.your-actual-domain.com
```

## Security Features

### Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (HTTPS only)
- Content Security Policy for Wikimedia APIs

### Upload Limits
- Maximum file size: 50MB (`LimitRequestBody 52428800`)

### SSL Security
- Modern cipher suites only
- TLS 1.2+ only
- HSTS enabled

## Troubleshooting

### Check Apache Status
```bash
sudo systemctl status apache2
```

### Check Apache Error Logs
```bash
sudo tail -f /var/log/apache2/wikiportraits_error.log
sudo tail -f /var/log/apache2/wikiportraits_ssl_error.log
```

### Check Next.js Application
```bash
sudo pm2 logs wikiportraits-uploader
```

### Test Proxy Connection
```bash
curl -I http://localhost:3022
curl -I http://wikiportraits.menneske.no
```

### Common Issues

1. **502 Bad Gateway**: Next.js app not running on port 3022
   ```bash
   sudo pm2 restart wikiportraits-uploader
   ```

2. **Module not loaded**: Enable required Apache modules
   ```bash
   sudo a2enmod proxy proxy_http
   sudo systemctl reload apache2
   ```

3. **Permission denied**: Check file permissions
   ```bash
   sudo chown -R www-data:www-data /var/www/wikiportraits-uploader
   ```

4. **Upload size limit**: Increase in both Apache and Next.js
   - Apache: `LimitRequestBody` directive
   - Next.js: Add to `next.config.ts`

## Performance Tuning

### Enable Compression
```apache
<Location />
    SetOutputFilter DEFLATE
    SetEnvIfNoCase Request_URI \.(?:gif|jpe?g|png)$ no-gzip dont-vary
    SetEnvIfNoCase Request_URI \.(?:exe|t?gz|zip|bz2|sit|rar)$ no-gzip dont-vary
</Location>
```

### Caching Static Assets
```apache
<LocationMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 month"
</LocationMatch>
```

## Monitoring

### Apache Access Logs
```bash
sudo tail -f /var/log/apache2/wikiportraits_access.log
```

### Check Site Availability
```bash
curl -f http://wikiportraits.menneske.no
curl -f https://wikiportraits.menneske.no
```