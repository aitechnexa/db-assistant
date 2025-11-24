# Nginx Setup Guide for DB Assistant

## Quick Setup

### 1. Install Nginx (if not already installed)

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# macOS (using Homebrew)
brew install nginx
```

### 2. Copy Configuration

```bash
# Copy the nginx.conf to your nginx sites-available directory
sudo cp nginx.conf /etc/nginx/sites-available/db-assistant

# Create symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/db-assistant /etc/nginx/sites-enabled/

# Test the configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### 3. SSL Certificate Setup

You have several options for SSL certificates:

#### Option A: Let's Encrypt (Free, Recommended)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain and install certificate
sudo certbot --nginx -d db-assistant.aitechnexa.com

# Auto-renewal is configured automatically
```

#### Option B: Manual Certificate

If you have your own certificate, update these paths in `nginx.conf`:

```nginx
ssl_certificate /path/to/your/certificate.crt;
ssl_certificate_key /path/to/your/private.key;
```

### 4. Update Environment Variables

Make sure your frontend knows the correct API URL:

**In `docker-compose.yml`:**
```yaml
environment:
  - VITE_API_URL=https://db-assistant.aitechnexa.com/api
```

Or create a `.env` file in the frontend directory:
```bash
VITE_API_URL=https://db-assistant.aitechnexa.com/api
```

### 5. Start Your Application

```bash
# Start the Docker containers
docker-compose up -d

# Check logs
docker-compose logs -f
```

## DNS Configuration

Make sure your DNS is configured to point to your server:

```
A Record: db-assistant.aitechnexa.com → Your Server IP
```

## Testing

### Test HTTP to HTTPS Redirect
```bash
curl -I http://db-assistant.aitechnexa.com
# Should return: HTTP/1.1 301 Moved Permanently
```

### Test HTTPS
```bash
curl -I https://db-assistant.aitechnexa.com
# Should return: HTTP/2 200
```

### Test API
```bash
curl https://db-assistant.aitechnexa.com/api/health
```

## Troubleshooting

### Check Nginx Status
```bash
sudo systemctl status nginx
```

### View Nginx Error Logs
```bash
sudo tail -f /var/log/nginx/db-assistant-error.log
```

### Check if Ports are Listening
```bash
sudo netstat -tlnp | grep -E '(5010|5020)'
```

### Firewall Configuration

Make sure ports 80 and 443 are open:

```bash
# UFW (Ubuntu)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Or using iptables
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

## Production Optimizations (Optional)

### Enable Gzip Compression

Add to the `http` block in `/etc/nginx/nginx.conf`:

```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;
```

### Rate Limiting

Add to prevent abuse:

```nginx
# In http block
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

# In location /api/ block
limit_req zone=api_limit burst=20 nodelay;
```

## Monitoring

### Check Request Logs
```bash
sudo tail -f /var/log/nginx/db-assistant-access.log
```

### Monitor SSL Certificate Expiry
```bash
echo | openssl s_client -servername db-assistant.aitechnexa.com -connect db-assistant.aitechnexa.com:443 2>/dev/null | openssl x509 -noout -dates
```

## URLs After Setup

- **Main Application**: https://db-assistant.aitechnexa.com
- **API Documentation**: https://db-assistant.aitechnexa.com/docs
- **API Endpoints**: https://db-assistant.aitechnexa.com/api/*
