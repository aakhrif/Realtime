# 📱 Mobile WebRTC Debugging Guide

## 🚨 Häufige Mobile-Probleme & Lösungen

### **1. HTTPS-Requirement (Hauptproblem)**
```bash
❌ Problem: "Camera access denied" über HTTP
✅ Lösung: Nur HTTPS funktioniert auf Mobile

# Development mit HTTPS:
npm install -g local-ssl-proxy
local-ssl-proxy --source 3001 --target 3000 --cert localhost.pem --key localhost-key.pem

# Oder ngrok für schnelles HTTPS:
npx ngrok http 3000
```

### **2. Browser-spezifische Unterschiede**

#### **Safari iOS:**
```javascript
// Besondere Behandlung für Safari
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

if (isSafari) {
  // Safari braucht User-Interaction für getUserMedia
  // Muss in einem Click-Handler aufgerufen werden
}
```

#### **Chrome Android:**
```javascript
// Chrome Android Optimierungen
const constraints = {
  video: {
    width: { max: 640 },    // Kleinere Auflösung für bessere Performance
    height: { max: 480 },
    frameRate: { max: 15 }  // Niedrigere Framerate
  }
};
```

### **3. Permission-Flow Mobile vs Desktop**

#### **Desktop Flow:**
1. User klickt Button → getUserMedia() → Permission Dialog
2. User erlaubt → Stream verfügbar

#### **Mobile Flow:**
1. User klickt Button → getUserMedia() → Browser Permission
2. Falls verweigert → Browser-Einstellungen ändern nötig
3. **Kein zweiter Versuch möglich** ohne Page Reload!

### **4. Mobile Debug-Schritte**

#### **Step 1: HTTPS Check**
```javascript
console.log('Protocol:', window.location.protocol);
console.log('Is Secure:', window.isSecureContext);

// Muss true sein für Mobile!
```

#### **Step 2: Device Check**
```javascript
console.log('User Agent:', navigator.userAgent);
console.log('Media Devices:', !!navigator.mediaDevices);
console.log('getUserMedia:', !!navigator.mediaDevices?.getUserMedia);
```

#### **Step 3: Permission State**
```javascript
// Check aktuelle Permissions
navigator.permissions.query({name: 'camera'}).then(result => {
  console.log('Camera Permission:', result.state);
  // "granted", "denied", "prompt"
});

navigator.permissions.query({name: 'microphone'}).then(result => {
  console.log('Microphone Permission:', result.state);
});
```

#### **Step 4: Constraint Testing**
```javascript
// Teste verschiedene Auflösungen
const testConstraints = [
  { video: { width: 320, height: 240 } },  // Minimal
  { video: { width: 640, height: 480 } },  // Standard
  { video: { width: 1280, height: 720 } }  // HD
];

for (let constraint of testConstraints) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraint);
    console.log('✅ Constraint works:', constraint);
    stream.getTracks().forEach(track => track.stop());
    break;
  } catch (err) {
    console.log('❌ Constraint failed:', constraint, err.name);
  }
}
```

## 🔧 Mobile Browser Settings

### **Chrome Android:**
1. **URL-Bar** → 🔒 **Lock Icon** → **Permissions**
2. **Camera** → **Allow**
3. **Microphone** → **Allow**

### **Safari iOS:**
1. **Settings** → **Safari** → **Camera & Microphone**
2. **Ask** oder **Allow** wählen
3. **Pro Website:** URL → **AA** → **Website Settings**

### **Firefox Mobile:**
1. **Menu** → **Settings** → **Site Permissions**
2. **Camera** → **Ask to Allow**
3. **Microphone** → **Ask to Allow**

## 🚀 Mobile Production Setup

### **Docker mit HTTPS:**
```yaml
# docker-compose.yml
services:
  nginx:
    ports:
      - "443:443"
    volumes:
      - ./ssl:/etc/nginx/ssl:ro
    environment:
      - SSL_CERT_PATH=/etc/nginx/ssl/cert.pem
      - SSL_KEY_PATH=/etc/nginx/ssl/key.pem
```

### **Environment Variables:**
```bash
# .env.production
PROTOCOL=https
DOMAIN=your-domain.com
SOCKET_IO_CORS_ORIGIN=https://your-domain.com
```

## 📊 Mobile Performance Optimierung

### **Video Constraints:**
```javascript
const mobileOptimized = {
  video: {
    width: { ideal: 640, max: 1280 },
    height: { ideal: 480, max: 720 },
    frameRate: { ideal: 15, max: 30 },
    facingMode: 'user'
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 44100
  }
};
```

### **Bandwidth Optimization:**
```javascript
// RTCPeerConnection Konfiguration für Mobile
const pcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 3  // Reduziert für Mobile
};
```

## 🐛 Häufige Fehlermeldungen

### **"NotAllowedError"**
- **Ursache:** User hat Permission verweigert oder HTTPS fehlt
- **Lösung:** HTTPS verwenden, Browser-Settings prüfen

### **"NotFoundError"**
- **Ursache:** Keine Kamera/Mikrofon verfügbar
- **Lösung:** Andere Apps schließen, die Kamera verwenden

### **"NotReadableError"**
- **Ursache:** Hardware bereits in Verwendung
- **Lösung:** Andere Tabs/Apps mit Kamera-Zugriff schließen

### **"OverconstrainedError"**
- **Ursache:** Angeforderte Auflösung nicht unterstützt
- **Lösung:** Niedrigere Auflösung versuchen

---

## ✅ Mobile Testing Checklist

- [ ] **HTTPS aktiviert**
- [ ] **Browser Permissions erlaubt**
- [ ] **Andere Apps geschlossen**
- [ ] **Mobile-optimierte Constraints**
- [ ] **Error Handling implementiert**
- [ ] **User-friendly Fehlermeldungen**
- [ ] **Fallback für alte Browser**

**Mit diesen Optimierungen sollte Mobile WebRTC einwandfrei funktionieren! 📱✨**
