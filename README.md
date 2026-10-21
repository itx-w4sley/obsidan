# Obsidian Studio Pro 3 — Vercel + MongoDB Edition

A personal, shared creative workspace for Roblox / ER:LC design projects, tasks, notes, server branding kits, colour palettes and uploaded images. This edition keeps the existing React/Vite design and MongoDB database, adds **editable workspace branding and access code settings**, and provides a **Vercel serverless API** in addition to the existing local Node.js server.

## What's new

- **Deploy on Vercel**: the frontend builds to `dist/` and the API runs through `api/index.mjs` as a serverless function. `vercel.json` routes `/api/*` to the function and all other paths to the React app.
- **Change your access code inside the app**: Settings → Change access code → enter your current 6–12 digit code and your new one. The new salted hash is stored in MongoDB, and other sessions are invalidated. No redeploy needed.
- **Customise workspace appearance inside the app**: Settings → Customise studio → edit your workspace name, display name, tagline and colour. These values are stored in MongoDB and visible across devices.
- **Edit the design in source code**: `src/config/studio.js` holds branding and login copy; `src/custom.css` holds theme overrides; `src/components/LoginScreen.jsx` and `src/components/SettingsPanel.jsx` are separate from the main dashboard code.
- **Production-friendly defaults**: HTTP-only secure cookies on Vercel, origin checking for each deployment hostname, persistent MongoDB sessions, shared login attempt tracking in MongoDB and reusable database connections per warm function instance.
- **Credential hygiene**: sample configuration contains placeholders only; real `.env` credentials and `node_modules` are excluded from this ZIP.

## 1. Deploy to Vercel (recommended)

### Prepare MongoDB Atlas

1. Use an Atlas cluster that Vercel can reach over the internet. Create a database user with access to your chosen database.
2. Obtain the MongoDB connection string: **Atlas → Connect → Drivers → Node.js**. Make sure any special characters in the DB password are URL encoded.
3. Configure **Atlas → Network Access** for Vercel's outgoing connections. Vercel Functions do not inherently have one fixed outgoing IP. A managed/static outbound IP setup is preferable for a strict allowlist. If you choose Atlas's “access from anywhere” entry (`0.0.0.0/0`) to test, understand the exposure and use a unique strong database password, database-specific privileges and TLS.

### Set environment variables in Vercel

Import your repository at https://vercel.com/new or deploy with the Vercel CLI. In **Project → Settings → Environment Variables**, add the following **server-side** variables for Production (and Preview only if you deliberately allow previews to use your DB):

| Name | Value |
|---|---|
| `MONGODB_URI` | The **private** MongoDB Atlas connection string |
| `MONGODB_DB` | `obsidian_studio_pro` or your existing database name |
| `ACCESS_CODE_HASH` | The **salted hash**, not the raw code; use the value from your original, private `.env` |
| `SESSION_SECRET` | A random secret at least 32 characters long; reuse your original value to keep sessions valid, or rotate it to sign everyone out |

**Do not** create `VITE_MONGODB_URI`, `VITE_SESSION_SECRET` or any other `VITE_`-prefixed secret. Frontend `VITE_` values become publicly readable. You do not need to set `APP_ORIGIN`, `COOKIE_SECURE`, `TRUST_PROXY`, `PORT` or `HOST` on Vercel.

To create an access-code hash from scratch, extract the project, run `npm ci` and `npm run setup` on your computer, and then copy the resulting `ACCESS_CODE_HASH` and `SESSION_SECRET` values from your private `.env`. The setup flow also asks for your MongoDB URI. Do not upload that `.env` file to GitHub.

### Deploy

**GitHub route**: push the ZIP's extracted source files into a **private** GitHub repository (do **not** include `.env`); open [vercel.com/new](https://vercel.com/new); import the repository; use **Vite** as the framework preset, **`npm run build`** as the build command and **`dist`** as the output directory (all provided in `vercel.json`). Add the environment variables above and click Deploy.

**CLI route**: in a terminal opened inside the extracted project directory:

```sh
npm ci
npx vercel
npx vercel --prod
```

Follow Vercel's prompts, then add any missing environment variables in its dashboard and redeploy if needed. On the first request, the function connects to MongoDB and creates the required indexes. Your existing data is preserved **when you use the same MongoDB URI and database name as before**.

### Production details

- API endpoints are routed to **one Vercel Function**. `api/index.mjs` exports the request handler; it never opens a listening port.
- The React application is a normal Vite SPA, served from `dist`.
- MongoDB stores all tasks, sessions, branding preferences, access-code hashes, activity and GridFS image binaries. Neither the app nor Vercel's ephemeral filesystem holds durable user records.
- Images: **4 MB max on Vercel** due to Vercel Function request-body limits; local server uploads allow **10 MB**. Large images should be resized before upload.
- Sessions last 12 hours. Vercel previews are publicly accessible unless you configure Vercel Deployment Protection. Protect the production URL and avoid short/guessable access codes.
- `MONGODB_URI`, `SESSION_SECRET` and the initial `ACCESS_CODE_HASH` **must remain in server-side environment variables**. Changing your code inside the application stores the new hash in MongoDB, overriding the initial environment hash.
- New settings are in the `settings` collection. Keep using the same MongoDB database as your previous version to retain all work.

## 2. Run locally on Windows

1. Install Node.js 22.13+.
2. Extract the ZIP to an ordinary directory.
3. Copy your **original private `.env`** into the new directory, **or** double-click `START-WINDOWS.bat` and run its first-time setup.
4. Run `START-WINDOWS.bat` or use the commands below.

```sh
npm ci
npm run setup       # only on a first install without .env
npm run check-db
npm run dev         # editing with Vite hot reload + Express API
```

Open <http://localhost:3000>. For a production-style local run:

```sh
npm run build
npm start
```

`npm run setup` **does not overwrite** an existing `.env`. The ZIP deliberately contains no original `.env` because it contains database passwords, your code hash and session secrets.

## 3. Editing the app

See [CUSTOMISE.md](CUSTOMISE.md) for the file map and exact edit locations. For no-code editing, open the web app → **Settings**. For login copy or styling, edit `src/config/studio.js` or `src/custom.css`, then build/deploy again. Those two files never contain passwords.

## 4. Reset your code if you forgot it

Run `node scripts/reset-code.mjs` **on a trusted local computer** with a private `.env` pointing to the right MongoDB database. The script updates the current MongoDB hash (including hashes previously changed in Settings) and invalidates existing sessions. You do not need to redeploy Vercel. If you don't have local MongoDB environment settings, first obtain them from your own private configuration or Vercel project settings.

## 5. Troubleshooting

| Symptom | Check |
|---|---|
| Vercel says 503 on login | Environment variables, Atlas cluster connectivity and Atlas Network Access |
| API says request origin mismatch | Access the site using its real `https://…vercel.app` / custom domain; ensure your reverse proxy preserves Host and HTTPS |
| Wrong access code | Use the most recently saved code from Settings; the initial hash is used only until the first change |
| No changes saved | Confirm `MONGODB_URI`, `MONGODB_DB`, DB user's read/write privileges and Atlas network connectivity |
| Local setup is incomplete | Restore a private `.env` or run `npm run setup`; a raw 6-digit code in `ACCESS_CODE_HASH` is not valid |
| Upload fails on Vercel | Use a valid PNG, JPEG, GIF or WebP under 4 MB |
| Old data disappeared | Ensure `MONGODB_DB` and `MONGODB_URI` point to the original database, not a new empty database |

## 6. Tests

```sh
npm test
npm run build
```

Tests cover access-code hashing, record validation, preference validation, deployment origin/cookie behaviour and Vercel route preservation.

## Important security notice

An older project archive contained a **live MongoDB URI in `.env.example`**. This version replaces it with placeholders and excludes original secrets. If the old archive was shared or committed anywhere, **rotate the Atlas database user's password** before you publish a Vercel deployment, and update your local and Vercel environment variables. Keep your Atlas account credentials separate from the database user's credentials.
