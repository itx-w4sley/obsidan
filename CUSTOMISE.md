# Customise Obsidian Studio Pro

## Edit in the running app (no coding)

Open **Settings** after signing in. Only the owner can change global studio appearance or export all records:

- **Customise studio** — name, display name, tagline and accent hex colour, saved in MongoDB and shared with your other devices.
- **Change access code** — each person updates their own code with their current code; other users’ codes do not change. Stored as salted scrypt hashes in MongoDB. No server restart or Vercel redeployment.
- **Team** (owner only) — Hunter Brady and Alex Atwell are created automatically the first time the owner signs in after upgrading, each receiving a different 10-digit access code. Copy the codes on the one-time Team screen. Add more members, disable accounts, or reset codes here.
- **Export records** — download JSON metadata (image binaries require a separate MongoDB backup).

## Edit in Visual Studio Code

```text
src/
  config/studio.js             Default branding text, login copy and accent
  custom.css                   Easy-to-edit colours, radii and Settings styles
  styles.css                   Detailed existing Obsidian design system
  components/
    LoginScreen.jsx            Public locked-page UI + form
    SettingsPanel.jsx          Owner appearance and personal code settings
    TeamPanel.jsx              Owner-only team management, new code reveal
  main.jsx                     Dashboard, tasks, projects and branding kit
server/
  app.mjs                      Express routes, auth and MongoDB records
  config.mjs                   Secure local versus Vercel settings
  db.mjs                       MongoDB and GridFS setup
  schema.mjs                   Validation for records and preferences
  security.mjs                 Hashing and code verification
  team.mjs                     Auto-provisioning, member records and secure code generation
  vercel-route.mjs             Nested API route preservation on Vercel
api/
  index.mjs                    Vercel serverless adapter
vercel.json                    Vercel build and route settings
```

Use `npm run dev` to edit locally, then `npm test && npm run build` before deploying.

## Examples

- Want a new hero heading? Change `STUDIO.loginTitle` and `STUDIO.loginHighlight` in `src/config/studio.js`.
- Want different corner radii? Change `--studio-radius` in `src/custom.css`.
- Want to change the main accent without rebuilding? Sign in → Settings → Customise studio → Accent colour. The value is stored in MongoDB.
- Want a different PIN? Sign in → Settings → Change access code. The owner may also reset staff codes in Team. Never hardcode the PIN in frontend JavaScript.

Keep database credentials and session secrets **only** in the private `.env` on your machine or server-side Vercel environment variables — not in `src/`, public Git repositories, browser storage, or `vercel.json`.
