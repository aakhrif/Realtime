# 🎥 Real-time Video Chat App

Eine moderne, webbasierte Video-Chat-Anwendung mit **Next.js**, **Socket.IO** und **WebRTC**. Unterstützt Echtzeit-Video-/Audio-Kommunikation, Bildschirmfreigabe und mehrere Teilnehmer.

## ✨ Features

- 🎥 **Real-time Video & Audio Calls** - Peer-to-Peer Kommunikation mit WebRTC
- 📺 **Screen Sharing** - Teilen Sie Ihren Bildschirm mit anderen Teilnehmern  
- 👥 **Multi-User Support** - Mehrere Personen können gleichzeitig teilnehmen
- 🏠 **Room-based** - Erstellen oder betreten Sie Video-Räume mit eindeutigen IDs
- 📱 **Responsive Design** - Funktioniert auf Desktop und Mobile
- 🔧 **No Registration** - Einfach Name eingeben und loslegen
- 🎛️ **Media Controls** - Video/Audio ein-/ausschalten

## 🚀 Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Real-time**: Socket.IO für Signaling
- **WebRTC**: simple-peer für P2P Video/Audio
- **Styling**: Tailwind CSS mit responsivem Design

## 📋 Voraussetzungen

- Node.js 18+ 
- NPM oder Yarn
- Moderne Browser mit WebRTC-Support (Chrome, Firefox, Safari, Edge)

## 🛠️ Installation & Setup

1. **Dependencies installieren:**
   ```bash
   npm install
   ```

2. **Development Server starten:**
   ```bash
   npm run dev
   ```

3. **App öffnen:**
   Navigieren Sie zu [http://localhost:3000](http://localhost:3000)

## 📖 Verwendung

1. **Namen eingeben** - Geben Sie Ihren Namen ein
2. **Room ID** - Erstellen Sie eine neue Room-ID oder treten Sie einem bestehenden Raum bei
3. **Kamera/Mikrofon-Berechtigung** - Erlauben Sie den Zugriff auf Ihre Medien
4. **Video Chat starten** - Teilen Sie die Room-ID mit anderen Personen

### Steuerungselemente:
- 🎤 **Mikrofon** - Audio ein/aus
- 📹 **Kamera** - Video ein/aus  
- 📺 **Bildschirm teilen** - Screen Sharing starten/stoppen
- ❌ **Anruf verlassen** - Video-Raum verlassen

## 🏗️ Projektstruktur

```
src/
├── app/
│   └── page.tsx              # Hauptseite mit Join-Formular
├── components/
│   ├── VideoRoom.tsx         # Haupt-Video-Chat-Komponente
│   ├── VideoPlayer.tsx       # Video-Player für Local/Remote Streams
│   └── VideoControls.tsx     # Media-Steuerungselemente
├── hooks/
│   ├── useSocket.ts          # Socket.IO Client Hook
│   └── useWebRTC.ts          # WebRTC Logic Hook
└── pages/api/
    └── socket.ts             # Socket.IO Server API Route
```

## 🔧 API Endpoints

- `GET /api/socket` - Socket.IO Server Initialisierung
- **Socket Events:**
  - `join-room` - Raum beitreten
  - `offer/answer/ice-candidate` - WebRTC Signaling
  - `user-joined/user-left` - Benutzer-Management
  - `chat-message` - Text-Nachrichten (erweiterbar)

## 🌐 Browser-Kompatibilität

| Browser | Unterstützung |
|---------|---------------|
| Chrome  | ✅ Vollständig |
| Firefox | ✅ Vollständig |
| Safari  | ✅ Vollständig |
| Edge    | ✅ Vollständig |

## 🔒 Sicherheit & Datenschutz

- **Peer-to-Peer**: Direkte Verbindung zwischen Benutzern
- **Keine Datenerfassung**: Keine Registrierung oder Datenspeicherung
- **HTTPS erforderlich**: Für Produktions-Deployment
- **Temporäre Räume**: Räume existieren nur während aktiver Verbindungen

## 🚀 Deployment

### Vercel (Empfohlen)
```bash
npm run build
vercel --prod
```

### Docker
```bash
docker build -t video-chat-app .
docker run -p 3000:3000 video-chat-app
```

## 🛠️ Development

**Entwicklungsserver starten:**
```bash
npm run dev
```

**Build für Produktion:**
```bash
npm run build
npm start
```

**Linting:**
```bash
npm run lint
```

## 📝 Zukünftige Erweiterungen

- [ ] Text-Chat während Video-Calls
- [ ] Datei-Upload und -Transfer
- [ ] Recording-Funktionalität
- [ ] Virtuelle Hintergründe
- [ ] Mobile App (React Native)
- [ ] Persistent Rooms mit Datenbank
- [ ] User Authentication
- [ ] Admin-Panel für Room-Management

## 🤝 Contributing

1. Fork das Repository
2. Erstellen Sie einen Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit Ihre Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. Push zum Branch (`git push origin feature/AmazingFeature`)
5. Öffnen Sie eine Pull Request

## 📄 Lizenz

Dieses Projekt steht unter der MIT Lizenz. Siehe [LICENSE](LICENSE) Datei für Details.

## 🙏 Danksagungen

- [Next.js](https://nextjs.org/) - React Framework
- [Socket.IO](https://socket.io/) - Real-time Engine
- [simple-peer](https://github.com/feross/simple-peer) - WebRTC wrapper
- [Tailwind CSS](https://tailwindcss.com/) - CSS Framework
