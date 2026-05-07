# Whispero Nepal - PRD

## Original Problem Statement
Build a complete, production-ready, mobile-first web application called "Whispero Nepal" — an anonymous confession, media sharing, and chat platform with Facebook-style UI/UX, mandatory strict onboarding (Name and Age required), admin logic (username MUST be exactly "Santoshi@60poudel"), 24-hour auto-delete for all data, anonymous Global Group Chat, and anonymous 1-on-1 Stranger Chat with text, photo, and GIF sharing.

## Tech Stack
- Frontend: React, Tailwind CSS, Context API, Shadcn UI
- Backend: FastAPI (REST + WebSockets), Motor (Async MongoDB)
- Database: MongoDB
- Hosting: K8s with ingress (all backend calls prefixed with `/api`)

## What's Been Implemented
- [x] Full-stack app setup (React + FastAPI + MongoDB)
- [x] Premium dark ruby/warm theme (Whispero Nepal branding)
- [x] Strict Onboarding as full-screen gate (Name & Age validation)
- [x] AuthContext with role-based access (admin = "Santoshi@60poudel")
- [x] Confession feed with categories, 6 reactions, infinite scroll, image compression
- [x] Media upload via Emergent Object Storage
- [x] 1-on-1 Stranger Chat with WebSocket (matching, messaging, next/skip)
- [x] GIF sharing via Tenor API, Photo sharing in chat
- [x] 24-hour auto-delete backend cron job
- [x] Admin Panel with analytics, user management, moderation
- [x] Confession of the day feature
- [x] WebSocket 8s ping keepalive for K8s stability
- [x] Chat input bar: fixed-bottom capsule style
- [x] WebSocket resilience: asyncio lock, retry logic, safeSend, 5-attempt reconnect
- [x] UI/UX overhaul: pill category tabs, rounded card design, polished bottom nav
- [x] Share button graceful clipboard fallback
- [x] Nested reply system for comments (backend + frontend)
- [x] Fixed ghost WebSocket toasts — mountedRef guard prevents orphaned reconnects (Apr 2026)

## Pending Tasks
### P0
- [ ] Global Group Chat (anonymous, live feed, typing indicators, image support)

### P1
- [ ] Backend-powered notifications (real-time triggers for likes/comments)

### P2
- [ ] Voice messages in Stranger Chat

### P3
- [ ] Nepali language localization

## Key Architecture Notes
- WebSocket endpoint: `/api/ws/stranger-chat` (K8s ingress requires `/api` prefix)
- Admin check: `user.name === 'Santoshi@60poudel'` in AuthContext
- Session stored in localStorage key `gupt_kura_user`
- All new WebSocket endpoints MUST use <=10s server-side ping keepalive
- StrangerChatManager uses asyncio.Lock to prevent race conditions
- Comment model: `parent_id` (nullable) for replies, `replies_count` for nested count
- Reply endpoints: GET/POST `/api/confessions/{id}/comments/{comment_id}/replies`
