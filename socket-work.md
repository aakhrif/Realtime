VideoRoomV2: Holt Socket direkt aus SocketManager, verwaltet eigenen State.
VideoRoomMobile: Initialisiert eigenen Socket per ioClient.
RoomDebugger: Initialisiert eigenen Socket per io.
useWebRTC: Erwartet Socket als Prop, arbeitet mit Socket-Events.
useSocket (Hook): Initialisiert eigenen Socket, bietet joinRoom/sendOffer etc.
Refactoring-Plan: