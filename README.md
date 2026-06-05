# StudyCollab — Frontend

This is the frontend for StudyCollab, a platform I built so students can study together online. You get study rooms, real-time chat, shared notes, file uploads, an AI assistant, tasks, topic tracking, and a Pomodoro timer — all in one place.

Built with React and Vite.

---

## What this does

- Login / register with email activation
- Dashboard shows all your rooms — ones you created and ones you joined
- Create a room (pick an icon and category), get an invite code, share it
- Join a room using someone else's invite code
- Inside a room there are tabs: Notes, Resources, Tasks, Topics, Chat, AI Assistant
- Chat is real-time via WebSocket
- Upload PDFs to Resources — the AI tab can then answer questions about them, summarize, or generate a quiz
- Tasks tab is a simple shared to-do list
- Topic tracker lets members claim topics and mark progress
- Floating Pomodoro timer that syncs across the room

---

## Tech I used

- React 18
- Vite
- React Router v6
- STOMP.js + SockJS for WebSocket
- Fetch API for all HTTP calls
- JWT stored in localStorage

No UI library — all styles are written by hand with inline styles and a shared color token object.

---

## Folder structure

```
src/
├── components/
│   ├── AiassistentTab.jsx
│   ├── ChatTab.jsx
│   ├── Notes.jsx
│   ├── ResourcesTab.jsx
│   ├── TaskTab.jsx
│   ├── TopicTracker.jsx
│   ├── MemberDrawer.jsx
│   └── PomodoroWidget.jsx
├── context/
│   └── AuthContext.jsx
├── pages/
│   ├── Dashboard.jsx
│   └── RoomPage.jsx
└── main.jsx
```

---

## Running locally

**You'll need:**
- Node 18+
- The backend running ([backend repo](https://github.com/SIVATEJA2005/studycollaboration_backend))

```bash
git clone https://github.com/SIVATEJA2005/studycollaboration_frontend.git
cd studycollaboration_frontend
npm install
```

Create a `.env` file:

```env
VITE_API_URL=http://localhost:8080
```

Then:

```bash
npm run dev
```

Opens at `http://localhost:5173`

---

## Routes

```
/            → login / register
/dashboard   → your rooms
/room/:id    → room workspace
```

---

## Notes

- JWT token is saved to localStorage on login and sent as a Bearer token on every request
- WebSocket connects to `/ws` using SockJS, subscribes to `/topic/room{roomId}`
- The AI features only work if you've uploaded and indexed a PDF in that room first

---

## GitHub

[github.com/SIVATEJA2005/studycollaboration_frontend](https://github.com/SIVATEJA2005/studycollaboration_frontend)
