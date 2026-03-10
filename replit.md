# VPush - File Deployment Platform

## Overview
VPush is a web platform for pushing and pulling files between VPS servers and hosted project storage. Similar to Git but focused on simple file deployment and management.

## Architecture
- **Frontend**: React + TypeScript, Vite, Tailwind CSS, shadcn/ui, framer-motion
- **Backend**: Express.js, PostgreSQL with Drizzle ORM
- **Auth**: Passport.js with local strategy, session-based
- **Fonts**: Inter (sans), JetBrains Mono (mono), Space Grotesk (headings)

## Project Structure
```
client/src/
  pages/
    landing.tsx          - Marketing landing page
    auth-page.tsx        - Login/register page (signup default, live username validator)
    dashboard.tsx        - User project dashboard
    project-view.tsx     - File manager for a project
    project-settings.tsx - Project settings page
    terms.tsx            - Terms of Service page
    contact.tsx          - Contact Us page
    not-found.tsx        - 404 page
  components/
    header.tsx           - Navigation header
  hooks/
    use-auth.ts          - Authentication hook

server/
  index.ts     - Express app setup
  routes.ts    - All API routes
  storage.ts   - Database storage layer (PostgreSQL)
  auth.ts      - Passport.js auth setup
  db.ts        - Database connection

shared/
  schema.ts    - Drizzle schemas (users, projects, files, fileVersions)
```

## Database Tables
- **users**: id, username, email, password, displayName, createdAt
- **projects**: id, projectId, name, description, userId, visibility, authPin, createdAt, updatedAt
- **files**: id, projectId, name, path, isDirectory, content, size, mimeType, parentPath, createdAt, updatedAt
- **file_versions**: id, fileId, content, size, version, createdAt

## Key Features
- User authentication (signup with email/username/password/confirm/terms, login)
- Live username availability checker (GET /api/auth/check-username/:username)
- Project creation (public/private with Auth PIN)
- File manager (create folders, upload, rename, delete, download)
- In-browser file editor
- File version history with restore
- Responsive design (mobile + desktop)
- Terms of Service and Contact pages

## API Endpoints
- GET /api/auth/check-username/:username
- POST /api/auth/register (username, email, password), /api/auth/login, /api/auth/logout
- GET /api/auth/me
- GET/POST /api/projects
- GET/PATCH/DELETE /api/projects/:projectId
- POST /api/projects/:projectId/generate-pin
- GET/POST /api/projects/:projectId/files
- POST /api/projects/:projectId/upload
- GET/PATCH/DELETE /api/files/:fileId
- GET /api/files/:fileId/versions
- POST /api/files/:fileId/restore/:versionId

## API Signature
`apiRequest(method, url, data)` — NOT `(url, options)`

## Routes
- / - Landing page
- /auth?mode=login|register - Auth page (register is default)
- /dashboard - User dashboard
- /terms - Terms of Service
- /contact - Contact Us
- /:username/:projectId - Project file manager
- /:username/:projectId/settings - Project settings
