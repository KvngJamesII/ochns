# VPush - File Deployment Platform

## Overview
VPush is a web platform for pushing and pulling files between VPS servers and hosted project storage. Similar to Git but focused on simple file deployment and management.

## Architecture
- **Frontend**: React + TypeScript, Vite, Tailwind CSS, shadcn/ui, framer-motion
- **Backend**: Express.js, PostgreSQL with Drizzle ORM
- **Auth**: Passport.js with local strategy, session-based (web) + API token-based (CLI)
- **Fonts**: Inter (sans), JetBrains Mono (mono), Space Grotesk (headings)
- **Theme**: Dark/light mode toggle with localStorage persistence, class-based (.dark)

## Project Structure
```
client/src/
  pages/
    landing.tsx          - Marketing landing page
    auth-page.tsx        - Login/register page (signup default, live username validator)
    dashboard.tsx        - User project dashboard
    project-view.tsx     - File manager for a project
    project-settings.tsx - Project settings page
    admin.tsx            - Admin panel (stats, users, contacts, announcements)
    terms.tsx            - Terms of Service page
    contact.tsx          - Contact Us page (posts to /api/contacts)
    cli-docs.tsx         - CLI documentation page
    settings.tsx         - User settings (profile, API tokens, logout)
    not-found.tsx        - 404 page
  components/
    header.tsx           - Navigation header with theme toggle
    theme-provider.tsx   - Dark/light mode context provider
  hooks/
    use-auth.ts          - Authentication hook (includes role)

cli/
  index.js             - VPush CLI tool (standalone Node.js script)
  package.json         - CLI package metadata

server/
  index.ts     - Express app setup
  routes.ts    - All API routes (including admin routes)
  storage.ts   - Database storage layer (PostgreSQL)
  auth.ts      - Passport.js auth setup
  db.ts        - Database connection

shared/
  schema.ts    - Drizzle schemas (users, projects, files, fileVersions, announcements, contacts, notifications, apiTokens)
```

## Database Tables
- **users**: id, username, email, password, displayName, role (default "user"), createdAt
- **projects**: id, projectId, name, description, userId, visibility, authPin, createdAt, updatedAt
- **files**: id, projectId, name, path, isDirectory, content, size, mimeType, parentPath, createdAt, updatedAt
- **file_versions**: id, fileId, content, size, version, createdAt
- **announcements**: id, title, content, authorId, createdAt
- **contacts**: id, name, email, subject, message, read, createdAt
- **notifications**: id, userId, title, message, type (system/admin), read, createdAt
- **api_tokens**: id, userId, name, token (unique), lastUsed, createdAt

## Key Features
- User authentication (signup with email/username/password/confirm/terms, login)
- Live username availability checker
- Dark/light mode toggle with system preference detection
- Project creation (public/private with Auth PIN)
- File manager (create folders, upload, rename, delete, download)
- In-browser file editor
- File version history with restore
- Contact form (saves to DB)
- Admin panel for "idledev" user (stats, users, contacts, announcements, send notifications)
- Notification bell in header with unread badge, mark-as-read, mark-all-read
- Welcome modal after signup → redirects to homepage
- Auto welcome notification on registration
- Responsive design (mobile + desktop)

## Admin
- Admin user: "idledev" (auto-assigned admin role on registration)
- Admin panel at /admin
- Features: overview stats, user list, contact message management, announcement publishing, send notifications
- Access: requireAdmin middleware checks role === "admin" OR username === "idledev"

## API Endpoints
- GET /api/auth/check-username/:username
- POST /api/auth/register (username, email, password), /api/auth/login, /api/auth/logout
- GET /api/auth/me (includes role, supports Bearer token auth)
- POST /api/auth/token (generate API token, requires auth)
- GET /api/auth/tokens (list user's tokens with preview)
- DELETE /api/auth/tokens/:id (revoke token)
- GET/POST /api/projects
- GET/PATCH/DELETE /api/projects/:projectId
- POST /api/projects/:projectId/generate-pin
- GET/POST /api/projects/:projectId/files
- POST /api/projects/:projectId/upload
- GET/PATCH/DELETE /api/files/:fileId
- GET /api/files/:fileId/versions
- POST /api/files/:fileId/restore/:versionId
- POST /api/contacts
- GET /api/announcements
- GET /api/admin/stats, /api/admin/users, /api/admin/contacts, /api/admin/announcements
- POST /api/admin/announcements
- PATCH /api/admin/contacts/:id
- DELETE /api/admin/contacts/:id, /api/admin/announcements/:id
- GET /api/notifications, GET /api/notifications/unread-count
- PATCH /api/notifications/:id/read, POST /api/notifications/read-all
- POST /api/admin/notifications (title, message, optional userId)

## API Signature
`apiRequest(method, url, data)` — NOT `(url, options)`

## Routes
- / - Landing page
- /auth?mode=login|register - Auth page (register is default)
- /dashboard - User dashboard
- /admin - Admin panel (idledev only)
- /settings - User settings (profile, API tokens, logout)
- /terms - Terms of Service
- /contact - Contact Us
- /:username/:projectId - Project file manager
- /:username/:projectId/settings - Project settings
