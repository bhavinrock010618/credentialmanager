# Secure Credential Manager — Full Functionality Documentation

A self-hosted, full-stack web application for managing website and server credentials with AES-256 encrypted storage, built with React 19, Express, Vite 6, and Tailwind CSS v4.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication](#authentication)
3. [Credential Management (CRUD)](#credential-management-crud)
4. [Project Management](#project-management)
5. [Search & Filtering](#search--filtering)
6. [Encryption & Security](#encryption--security)
7. [REST API Endpoints](#rest-api-endpoints)
8. [UI Features & Interactions](#ui-features--interactions)
9. [Data Model](#data-model)
10. [Configuration & Environment Variables](#configuration--environment-variables)
11. [Build & Run Scripts](#build--run-scripts)
12. [File Structure](#file-structure)

---

## Architecture Overview

| Layer | Technology | File(s) |
|-------|-----------|---------|
| Frontend | React 19, Tailwind CSS v4, Lucide Icons, Motion (Framer Motion) | `src/App.tsx`, `src/main.tsx`, `src/index.css` |
| Backend | Express 4 (Node.js) | `server.ts` |
| Bundler | Vite 6 with React & Tailwind plugins | `vite.config.ts` |
| Storage | Local JSON files with AES-256-CBC encryption | `data.json`, `projects.json` |
| Language | TypeScript (ES2022, bundler module resolution) | `tsconfig.json` |

**Dev mode:** Vite runs as Express middleware (same port 3000 serves both API and frontend with HMR).
**Production:** Express serves the pre-built `dist/` folder as static files with SPA fallback routing.

---

## Authentication

### Master Password Login

- The app is protected by a **client-side master password gate**.
- On load, users see a login screen with a password input field.
- The password is compared against the `VITE_ACCESS_PASSWORD` environment variable (defaults to `password123`).
- On successful login, the vault unlocks and credentials are fetched from the API.
- On failure, an animated error message is displayed.

### Lock Vault

- Authenticated users can click **"Lock Vault"** in the header to log out.
- This resets the authentication state and returns to the login screen.
- No session tokens or cookies are used; authentication is purely in-memory React state.

---

## Credential Management (CRUD)

### Create Credential

- Click the **"Add Credential"** button in the header.
- A modal form opens with the following fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Project | Dropdown | Yes (defaults to first project) | Assigns credential to a project |
| Website URL | Text | Conditional (URL or Host required) | The website address |
| Host / Server | Text | Conditional (URL or Host required) | Server hostname or IP address |
| Protocol | Dropdown | No | SFTP or FTP |
| Login Type | Dropdown | No | Anonymous, Normal, Ask Password, Interactive, Key file |
| Username | Text | No | Login username |
| Password | Password | No | Login password (encrypted at rest) |
| FTP Username | Text | No | Separate FTP username |
| FTP Password | Password | No | Separate FTP password (encrypted at rest) |
| Note | Textarea | No | Free-text notes (HTML tags stripped on server) |
| Secret Key | Textarea | No | Private/secret key (encrypted at rest) |
| Public Key | Textarea | No | Public key |

- Validation: Either **Website URL** or **Host Name** must be provided.
- On submit, a `POST /api/credentials` request is sent.
- The credential is assigned a unique ID (`Date.now()` timestamp).

### Read / View Credentials

- After authentication, all credentials are fetched via `GET /api/credentials`.
- Credentials are displayed as animated cards in a responsive grid layout.
- Each card shows:
  - **Project badge** (blue label)
  - **Protocol badge** (green for SFTP, grey for FTP)
  - **Login type badge** (indigo label)
  - **URL** with an external link icon to open in a new tab
  - **Host** displayed in monospace font
  - **Login Details** section: username and masked password
  - **FTP Details** section (if FTP credentials exist): FTP user and masked FTP password
  - **Security Keys** section (if keys exist): buttons to copy secret/public keys
  - **Notes** section (if notes exist): displayed in a styled quote block

### Update Credential

- Click the **Edit** (pencil icon) button on any credential card.
- The same modal form opens, pre-filled with the existing data.
- On submit, a `PUT /api/credentials/:id` request is sent.
- Only changed fields are merged with existing data on the server.

### Delete Credential

- Click the **Delete** (trash icon) button on any credential card.
- A browser confirmation dialog asks: *"Are you sure you want to delete this credential?"*
- On confirmation, a `DELETE /api/credentials/:id` request is sent.
- The credential is removed and the list refreshes.

---

## Project Management

### View Projects

- Projects are fetched via `GET /api/projects` on authentication.
- They appear in the filter dropdown and the credential form's project selector.
- Default project is **"General"** (created automatically if `projects.json` is missing).

### Add Project

- Click **"Add Project"** in the header.
- A modal appears with a single text input for the project name.
- On submit, a `POST /api/projects` request is sent.
- Duplicate project names are rejected with an error message.
- After creation, the new project is automatically selected in the credential form.

---

## Search & Filtering

### Text Search

- A search bar at the top filters credentials in real-time.
- Searches across three fields simultaneously:
  - **URL** (case-insensitive)
  - **Username** (case-insensitive)
  - **Host** (case-insensitive)

### Project Filter

- A dropdown lets users filter by a specific project or view **"All Projects"**.
- Combined with text search for compound filtering.

### Record Count

- A badge displays the number of matching records (e.g., "5 Records" or "1 Record").
- Updates dynamically as filters change.

---

## Encryption & Security

### AES-256-CBC Encryption

The server encrypts sensitive fields before writing to `data.json`:

| Encrypted Fields | Storage Format |
|-----------------|----------------|
| `password` | `iv_hex:ciphertext_hex` |
| `ftp_pass` | `iv_hex:ciphertext_hex` |
| `secret_key` | `iv_hex:ciphertext_hex` |

- **Algorithm:** AES-256-CBC
- **Key derivation:** SHA-256 hash of the `ENCRYPTION_KEY` environment variable produces a 32-byte key.
- **IV:** 16 random bytes generated per encryption operation.
- **Backward compatibility:** If decryption fails (e.g., data was stored before encryption was added), the original value is returned as-is.

### Atomic File Writes

- Data is written to a `.tmp` file first, then atomically renamed to the target file.
- This prevents data corruption from interrupted writes.

### HTML Sanitization

- The `note` field is stripped of all HTML tags on the server using regex: `/<[^>]*>?/gm`.
- Applied on both create and update operations.

### Client-Side Password Masking

- Passwords and FTP passwords are displayed as `••••••••` by default.
- Users can toggle visibility per field per credential using the eye icon.

---

## REST API Endpoints

### Projects

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|-------------|----------|
| `GET` | `/api/projects` | List all projects | — | `string[]` |
| `POST` | `/api/projects` | Create a new project | `{ "name": "string" }` | `string[]` (updated list) |

### Credentials

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|-------------|----------|
| `GET` | `/api/credentials` | List all credentials (decrypted) | — | `Credential[]` |
| `POST` | `/api/credentials` | Create a new credential | `Credential` fields | `Credential` (created) |
| `PUT` | `/api/credentials/:id` | Update a credential | Partial `Credential` fields | `Credential` (updated) |
| `DELETE` | `/api/credentials/:id` | Delete a credential | — | `204 No Content` |

### Error Responses

| Status | Condition |
|--------|-----------|
| `400` | Missing required fields (URL or Host) or duplicate project name |
| `404` | Credential with given ID not found |

---

## UI Features & Interactions

### Animations (Motion / Framer Motion)

- **Login screen:** Fade-in with scale and vertical slide.
- **Credential cards:** Staggered fade-in with layout animations; exit with scale-down.
- **Modals:** Backdrop blur with scale/slide entrance and exit.
- **Error messages:** Slide-in from the left.

### Copy to Clipboard

- One-click copy buttons for: username, password, FTP user, FTP password, secret key, public key.
- Visual feedback: the copy icon changes to a green checkmark for 2 seconds after copying.

### Password Visibility Toggle

- Per-credential, per-field toggle (password and FTP password are independent).
- Eye/EyeOff icon indicates current state.

### Responsive Design

- Mobile-first layout with Tailwind responsive breakpoints.
- Cards stack vertically on mobile, expand to multi-column on desktop.
- Header actions wrap on small screens.
- Modal forms scroll vertically on small viewports.

### Empty State

- When no credentials match the current filters, a styled empty state is shown with a search icon and helpful message.

### Loading State

- While data is being fetched, a "Loading vault..." message is displayed.

### External Links

- Each credential card has an external link icon next to the URL.
- Clicking it opens the URL in a new tab (auto-prepends `https://` if no protocol is present).

### Action Buttons Visibility

- Edit and Delete buttons on credential cards are hidden by default and appear on hover (desktop) or are always visible (mobile).

---

## Data Model

### Credential Object

```typescript
interface Credential {
  id: number;          // Unique ID (timestamp-based)
  url: string;         // Website URL
  username: string;    // Login username
  password: string;    // Login password (encrypted at rest)
  project: string;     // Project name
  protocol: string;    // "SFTP" | "FTP" | ""
  host: string;        // Server hostname or IP
  login_type: string;  // "Anonymous" | "Normal" | "Ask Password" | "Interactive" | "Key file" | ""
  ftp_user: string;    // FTP username
  ftp_pass: string;    // FTP password (encrypted at rest)
  secret_key: string;  // Private key (encrypted at rest)
  public_key: string;  // Public key
  note: string;        // Free-text notes (HTML stripped)
}
```

### Storage Files

| File | Format | Contents |
|------|--------|----------|
| `data.json` | JSON array | All credentials with sensitive fields encrypted |
| `projects.json` | JSON array of strings | List of project names |

---

## Configuration & Environment Variables

Defined in `.env.example` (copy to `.env` or `.env.local`):

| Variable | Purpose | Default |
|----------|---------|---------|
| `VITE_ACCESS_PASSWORD` | Master password for the UI login gate | `password123` |
| `ENCRYPTION_KEY` | Key used to derive AES-256 encryption key (SHA-256 hashed) | `secure-vault-default-key-2024` |
| `GEMINI_API_KEY` | Google AI API key (injected by Vite but unused in app logic) | — |
| `DISABLE_HMR` | Set to `"true"` to disable Vite Hot Module Replacement | — |
| `NODE_ENV` | `"production"` to serve static build; otherwise dev mode with Vite middleware | — |

---

## Build & Run Scripts

Defined in `package.json`:

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (Express + Vite HMR) via `tsx server.ts` |
| `npm run build` | Build production frontend bundle with Vite |
| `npm run preview` | Preview the production build locally |
| `npm run clean` | Remove the `dist/` build directory |
| `npm run lint` | Type-check with TypeScript (`tsc --noEmit`) |
| `npm start` | Start production server (`node server.ts`) |

---

## File Structure

```
credentialmanager/
├── .env.example          # Environment variable template
├── .gitignore            # Git ignore rules
├── data.json             # Encrypted credential storage
├── index.html            # HTML entry point (SPA shell)
├── metadata.json         # App name and description metadata
├── package.json          # Dependencies and scripts
├── package-lock.json     # Locked dependency versions
├── projects.json         # Project names list
├── server.ts             # Express backend (API + encryption + Vite middleware)
├── tsconfig.json         # TypeScript configuration
├── vite.config.ts        # Vite build configuration
└── src/
    ├── App.tsx           # Main React component (all UI logic)
    ├── index.css         # Global styles (Tailwind v4 import)
    └── main.tsx          # React entry point (mounts App to #root)
```

---

## Tech Stack Summary

| Category | Technology | Version |
|----------|-----------|---------|
| Frontend Framework | React | 19.x |
| Build Tool | Vite | 6.x |
| CSS Framework | Tailwind CSS | 4.x |
| Icons | Lucide React | 0.546.x |
| Animations | Motion (Framer Motion) | 12.x |
| Backend | Express | 4.x |
| Runtime | Node.js with tsx | — |
| Language | TypeScript | 5.8.x |
| Encryption | Node.js crypto (AES-256-CBC) | Built-in |
