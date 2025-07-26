# 🐳 Docker Production Deployment Guide

## 📋 Überblick

Diese Anleitung erklärt, wie Sie die **Realtime Video Chat App** mit Docker in der Produktion deployen.

## 🛠️ Voraussetzungen

- **Docker** (Version 20.10+)
- **Docker Compose** (Version 2.0+)
- **Git** für Code-Updates
- **SSL-Zertifikate** (für HTTPS in Produktion)

## 🚀 Quick Start

### 1. Repository klonen
```bash
git clone <your-repo-url>
cd realtime
```

### 2. Umgebungsvariablen konfigurieren
```bash
cp .env.production.example .env.production
# Bearbeiten Sie .env.production mit Ihren Werten
```

### 3. SSL-Zertifikate (für HTTPS)
```bash
mkdir ssl
# Kopieren Sie Ihre SSL-Zertifikate in das ssl/ Verzeichnis
# cert.pem und key.pem
```

### 4. App deployen
```bash
npm run deploy
# oder
./deploy.sh production
```

## 📁 Docker-Dateien Übersicht

```
realtime/
├── Dockerfile              # Production Build
├── Dockerfile.dev          # Development Build  
├── docker-compose.yml      # Production Services
├── docker-compose.dev.yml  # Development Services
├── nginx.conf              # Nginx Reverse Proxy
├── deploy.sh               # Deployment Script
└── .env.production.example # Environment Template
```

## 🏗️ Deployment-Optionen

### Option 1: Automatisches Deployment
```bash
npm run deploy
```

### Option 2: Manuelles Deployment
```bash
# Build und Start
docker-compose up --build -d

# Status prüfen
docker-compose ps

# Logs ansehen
docker-compose logs -f
```

### Option 3: Development mit Docker
```bash
npm run docker:dev
```

## 🌐 Service-Architektur

### Production Stack:
- **realtime-app**: Next.js Anwendung (Port 3000)
- **nginx**: Reverse Proxy (Port 80/443)
- **redis**: Session Storage (Port 6379)

### Netzwerk:
- **realtime-network**: Bridge-Netzwerk für alle Services

## 🔧 Konfiguration

### Environment Variables (.env.production)
```bash
NODE_ENV=production
DOMAIN=your-domain.com
SOCKET_IO_CORS_ORIGIN=https://your-domain.com
SSL_CERT_PATH=/etc/nginx/ssl/cert.pem
SSL_KEY_PATH=/etc/nginx/ssl/key.pem
```

### Nginx Configuration
- **Rate Limiting**: API (10 req/s), WebSocket (30 req/s)
- **SSL Termination**: HTTPS-Unterstützung
- **WebSocket Proxy**: Socket.IO-Weiterleitung
- **Security Headers**: XSS, CSRF-Schutz

## 📊 Monitoring & Health Checks

### Health Check Endpoint
```bash
curl http://localhost:3000/api/health
```

### Service Status
```bash
docker-compose ps
docker-compose logs realtime-app
```

### Metriken
- **Uptime**: Verfügbar über Health Check
- **Memory/CPU**: `docker stats`
- **Logs**: `docker-compose logs -f`

## 🚦 Load Balancing & Scaling

### Horizontal Scaling
```yaml
# docker-compose.yml
realtime-app:
  deploy:
    replicas: 3
  ports:
    - "3000-3002:3000"
```

### Load Balancer (Nginx)
```nginx
upstream realtime-app {
    server realtime-app-1:3000;
    server realtime-app-2:3000;
    server realtime-app-3:3000;
}
```

## 🔒 Sicherheit

### SSL/TLS
```bash
# SSL-Zertifikate installieren
sudo cp cert.pem /etc/nginx/ssl/
sudo cp key.pem /etc/nginx/ssl/
```

### Firewall
```bash
# Nur notwendige Ports öffnen
ufw allow 80
ufw allow 443
ufw allow 22
```

### CORS Configuration
```javascript
// Nur vertraute Domänen erlauben
const allowedOrigins = [
    'https://your-domain.com',
    'https://www.your-domain.com'
];
```

## 🔄 Updates & Wartung

### App Update
```bash
git pull origin main
docker-compose down
docker-compose up --build -d
```

### Datenbank-Backup (falls verwendet)
```bash
docker exec redis redis-cli BGSAVE
```

### Log-Rotation
```bash
# Logs begrenzen
docker-compose logs --tail=1000 > app.log
docker system prune -f
```

## 🐛 Troubleshooting

### Häufige Probleme

#### 1. Container startet nicht
```bash
docker-compose logs realtime-app
docker inspect realtime-app
```

#### 2. WebSocket-Verbindung fehlschlägt
```bash
# Nginx Logs prüfen
docker-compose logs nginx

# Netzwerk testen
docker network ls
docker network inspect realtime_realtime-network
```

#### 3. Permission-Errors
```bash
# Docker ohne sudo
sudo usermod -aG docker $USER
newgrp docker
```

#### 4. Port bereits in Verwendung
```bash
# Port freigeben
sudo lsof -i :3000
sudo kill -9 <PID>
```

### Debug-Modus
```bash
# Development Container mit Debug
docker-compose -f docker-compose.dev.yml up
```

## 📈 Performance-Optimierung

### Docker Optimierungen
```dockerfile
# Multi-stage Build für kleinere Images
FROM node:18-alpine AS base
# Nur Production Dependencies
RUN npm ci --only=production
```

### Nginx Caching
```nginx
# Static File Caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Redis Session Store
```javascript
// Für Session-Management
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
```

## 🌍 Deployment auf verschiedenen Plattformen

### AWS EC2
```bash
# Docker installieren
sudo yum update -y
sudo yum install docker -y
sudo service docker start

# App deployen
git clone <repo>
cd realtime
./deploy.sh
```

### DigitalOcean Droplet
```bash
# Docker Compose installieren
sudo apt update
sudo apt install docker-compose -y

# Firewall konfigurieren
ufw allow 80,443/tcp
```

### Google Cloud Run
```dockerfile
# Cloud Run optimierte Dockerfile
ENV PORT 8080
EXPOSE 8080
```

## 📞 Support

Bei Problemen:
1. **Logs prüfen**: `docker-compose logs -f`
2. **Health Check**: `curl localhost:3000/api/health`
3. **GitHub Issues**: Erstellen Sie ein Issue im Repository
4. **Documentation**: Siehe README.md

---

**🎉 Viel Erfolg mit Ihrer Video Chat App in Production!**
