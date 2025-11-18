# Deployment Guide

This guide covers deploying the Lencopay Payment API to production.

## Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Supabase database schema is up to date
- [ ] Lencopay production API credentials obtained
- [ ] Webhook URL configured in Lencopay dashboard
- [ ] SSL certificate configured for HTTPS
- [ ] Domain/subdomain configured

## Environment Variables for Production

```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key

# Lencopay Configuration (PRODUCTION)
LENCO_PUBLIC_KEY=your-production-public-key
LENCO_SECRET_KEY=your-production-secret-key
LENCO_API_BASE_URL=https://api.lenco.co/access/v2

# Webhook Configuration
WEBHOOK_SECRET=your-secure-webhook-secret

# Payment Configuration
SUBSCRIPTION_AMOUNT=100.00
CONTACT_UNLOCK_AMOUNT=30.00
DEFAULT_CURRENCY=ZMW

# Security
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## Deployment Options

### Option 1: VPS (Ubuntu/Debian)

1. **Install Node.js**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Clone and setup**:
   ```bash
   cd /var/www
   git clone <your-repo-url> paymentapi
   cd paymentapi
   npm install
   npm run build
   ```

3. **Setup PM2**:
   ```bash
   sudo npm install -g pm2
   pm2 start dist/index.js --name lencopay-api
   pm2 startup
   pm2 save
   ```

4. **Setup Nginx reverse proxy**:
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;

       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

5. **Setup SSL with Let's Encrypt**:
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d api.yourdomain.com
   ```

### Option 2: Docker

1. **Create Dockerfile**:
   ```dockerfile
   FROM node:18-alpine

   WORKDIR /app

   COPY package*.json ./
   RUN npm ci --only=production

   COPY . .
   RUN npm run build

   EXPOSE 3001

   CMD ["node", "dist/index.js"]
   ```

2. **Create docker-compose.yml**:
   ```yaml
   version: '3.8'
   services:
     api:
       build: .
       ports:
         - "3001:3001"
       env_file:
         - .env
       restart: unless-stopped
       volumes:
         - ./logs:/app/logs
   ```

3. **Deploy**:
   ```bash
   docker-compose up -d
   ```

### Option 3: Heroku

1. **Create Procfile**:
   ```
   web: npm start
   ```

2. **Deploy**:
   ```bash
   heroku create your-app-name
   heroku config:set NODE_ENV=production
   heroku config:set SUPABASE_URL=your-url
   # ... set all other env vars
   git push heroku main
   ```

### Option 4: Railway

1. **Connect GitHub repository**
2. **Add environment variables in Railway dashboard**
3. **Deploy automatically on push**

## Webhook Configuration

1. **Login to Lencopay Dashboard**
2. **Navigate to Settings > Webhooks**
3. **Add webhook URL**: `https://api.yourdomain.com/api/webhooks/lencopay`
4. **Select events**: `collection.successful`
5. **Save webhook configuration**

## Monitoring

### Setup Logging

Ensure logs directory exists and has proper permissions:
```bash
mkdir -p logs
chmod 755 logs
```

### Monitor with PM2 (if using PM2)

```bash
# View logs
pm2 logs lencopay-api

# Monitor CPU/Memory
pm2 monit

# View status
pm2 status
```

### Setup Log Rotation

Create `/etc/logrotate.d/lencopay-api`:
```
/var/www/paymentapi/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
```

## Health Checks

Setup a monitoring service to check:
```bash
curl https://api.yourdomain.com/health
```

Expected response:
```json
{
  "success": true,
  "message": "Lencopay Payment API is running",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Security Hardening

1. **Firewall Configuration**:
   ```bash
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

2. **Fail2ban** (optional):
   ```bash
   sudo apt-get install fail2ban
   sudo systemctl enable fail2ban
   sudo systemctl start fail2ban
   ```

3. **Regular Updates**:
   ```bash
   sudo apt-get update
   sudo apt-get upgrade
   ```

## Backup Strategy

1. **Database**: Supabase handles automatic backups
2. **Application**: Keep code in version control (Git)
3. **Environment Variables**: Store securely (1Password, AWS Secrets Manager, etc.)

## Rollback Plan

If deployment fails:

1. **With PM2**:
   ```bash
   pm2 stop lencopay-api
   git checkout previous-stable-tag
   npm install
   npm run build
   pm2 restart lencopay-api
   ```

2. **With Docker**:
   ```bash
   docker-compose down
   git checkout previous-stable-tag
   docker-compose up -d --build
   ```

## Performance Optimization

1. **Enable compression**:
   ```typescript
   import compression from 'compression';
   app.use(compression());
   ```

2. **Database connection pooling**: Already handled by Supabase client

3. **Caching**: Consider Redis for frequently accessed data

## Troubleshooting Production Issues

### Check Logs
```bash
# PM2
pm2 logs lencopay-api --lines 100

# Docker
docker-compose logs -f --tail=100

# Direct
tail -f logs/combined.log
```

### Common Production Issues

1. **Port already in use**:
   ```bash
   sudo lsof -i :3001
   sudo kill -9 <PID>
   ```

2. **Permission denied for logs**:
   ```bash
   sudo chown -R $USER:$USER logs/
   ```

3. **Out of memory**:
   - Check PM2 memory usage: `pm2 monit`
   - Increase server RAM or optimize code

## Support

For production issues:
1. Check application logs
2. Check Lencopay API status
3. Check Supabase status
4. Review recent deployments
