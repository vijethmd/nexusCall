# Nexus — Video Conferencing App

A production-quality Zoom-like video conferencing application built with React, Node.js, Socket.IO, and WebRTC.

---

## Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Frontend    | React 18, Vite, Tailwind CSS      |
| Backend     | Node.js, Express                  |
| Database    | MongoDB (Mongoose)                |
| Realtime    | Socket.IO                        |
| Video       | WebRTC (peer-to-peer mesh)        |
| Auth        | JWT + bcrypt                      |
| File Upload | Multer                            |

---

## Features

- JWT authentication with signup, login, logout
- Create meetings with optional password and waiting room
- Join via meeting ID or shareable link
- WebRTC peer-to-peer video (mesh topology)
- Noise suppression and echo cancellation
- Screen sharing (one presenter at a time)
- Real-time chat with emoji reactions and file sharing (images, PDFs)
- Active speaker detection and tile highlighting
- Host controls: mute, remove, lock meeting, end for all
- Waiting room with approve/deny flow
- Dark mode and light mode with OS preference detection
- Fully responsive — desktop and mobile

---

## Project Structure

```
/
├── client/                   React frontend (Vite)
│   └── src/
│       ├── components/
│       │   ├── meeting/      VideoGrid, VideoTile, ChatPanel, ParticipantsPanel, Controls, Modals
│       │   └── ui/           Button, Input, Avatar, Modal, ThemeToggle
│       ├── hooks/            useMediaStream, useScreenShare, useActiveSpeaker
│       ├── lib/              api.js (Axios), socket.js, PeerManager.js
│       ├── pages/            Login, Signup, Dashboard, PreJoin, WaitingRoom, MeetingRoom
│       └── store/            authStore, meetingStore, themeStore (Zustand)
│
└── server/                   Node.js + Express backend
    ├── config/               db.js
    ├── controllers/          authController, meetingController, uploadController
    ├── middlewares/          auth, errorHandler, upload
    ├── models/               User, Meeting
    ├── routes/               auth, meetings, upload
    └── sockets/              socketHandler, roomManager
```

---

## Setup

### Prerequisites

- Node.js 18+
- MongoDB (local or MongoDB Atlas)

---

### 1. Clone and install

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

---

### 2. Configure environment variables

**server/.env**
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/nexus
JWT_SECRET=replace_with_a_long_random_string
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

**client/.env**
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

### 3. Run

```bash
# Terminal 1 — backend
cd server
npm run dev

# Terminal 2 — frontend
cd client
npm run dev
```

Open http://localhost:5173

---

## WebRTC Architecture

- Full-mesh topology: every participant connects directly to every other participant
- STUN servers: stun.l.google.com:19302 and stun1.l.google.com:19302
- Signaling via Socket.IO (offer, answer, ICE candidates)
- Audio: noiseSuppression, echoCancellation, autoGainControl all enabled
- Screen sharing: replaces video track on all active peer connections

## Socket.IO Events

| Event                     | Direction       | Description                       |
|---------------------------|-----------------|-----------------------------------|
| room:join                 | Client → Server | Join a meeting room               |
| room:joined               | Server → Client | Confirmation with participant list|
| participant:joined        | Server → Room   | New participant arrived           |
| participant:left          | Server → Room   | Participant disconnected          |
| signal:offer              | Peer → Peer     | WebRTC offer                      |
| signal:answer             | Peer → Peer     | WebRTC answer                     |
| signal:ice-candidate      | Peer → Peer     | ICE candidate                     |
| media:mute-toggle         | Client → Server | Microphone state change           |
| media:video-toggle        | Client → Server | Camera state change               |
| media:hand-raise          | Client → Server | Hand raised/lowered               |
| media:speaking            | Client → Server | Active speaker detection          |
| screen:start/stop         | Client → Server | Screen share lifecycle            |
| chat:message              | Client → Room   | Text message                      |
| chat:file                 | Client → Room   | File share (after REST upload)    |
| chat:reaction             | Client → Room   | Emoji reaction on message         |
| host:mute-participant     | Host → Server   | Force-mute a participant          |
| host:remove-participant   | Host → Server   | Kick a participant                |
| host:lock-meeting         | Host → Server   | Lock/unlock room                  |
| host:end-meeting          | Host → Server   | End meeting for everyone          |
| waiting:approve/deny      | Host → Server   | Admit or deny from waiting room   |
