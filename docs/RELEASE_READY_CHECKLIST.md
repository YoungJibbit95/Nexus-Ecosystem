# Nexus v6 Release Ready Checklist

Use this before pushing tags, uploading installers, or deploying the VPS stack.

## Local Validation

- `nexusproject.dev`: run `npm run build` and `npm run build:ci`.
- `Nexus Main`: run `npm run build`.
- `Nexus Code`: run `npm run build`.
- `Nexus-Ecosystem`: run `npm run verify:encoding`, `npm run verify:ecosystem`, and `npm run doctor:release`.
- `Nexus-Ecosystem`: run `npm run release:gate -- --fast` for a fast RC preflight.
- `Nexus-Ecosystem`: run `npm run release:gate -- --with-api-contract` before a public RC.
- `Nexus Wiki`: run `npm --prefix "Nexus Wiki" run build:ci`.
- `nexus-control-plane`: run `cargo fmt --check` and `cargo check` when the Windows MSVC linker is installed.

## API Data Hygiene

- Production runtime values come from environment variables, service secrets, or the managed database layer only.
- No local ingest keys, admin passwords, seed tokens, or dev-only user data are committed into release-relevant JSON/dist data.
- Staging and production datasets are separated and documented before promotion.
- API release data is regenerated after cleanup and checked before VPS deploy.
- `docs/KNOWN_ISSUES.md` is updated if any data or secret hygiene risk remains accepted for an internal RC.

## Website Downloads

- Main Windows: `nexusproject.dev/public/downloads/nexus-main/Nexus_Main_Setup.exe`
- Main macOS: `nexusproject.dev/public/downloads/nexus-main/Nexus_Main_macOS.dmg`
- Main Linux: `nexusproject.dev/public/downloads/nexus-main/Nexus_Main_Linux.AppImage`
- Code Windows: `nexusproject.dev/public/downloads/nexus-code/Nexus_Code_Setup.exe`
- Code macOS: `nexusproject.dev/public/downloads/nexus-code/Nexus_Code_macOS.dmg`
- Code Linux: `nexusproject.dev/public/downloads/nexus-code/Nexus_Code_Linux.AppImage`

If binaries are too large for Git, upload them during deploy and keep the same
server paths under `/downloads/...`.

## Installer Builds

- Build Windows installers on Windows: `npm run build:main` and `npm run build:code`.
- Build macOS installers on macOS or the GitHub installer workflow.
- Build Linux AppImage/deb on Ubuntu or the GitHub installer workflow. The local Windows wrapper skips Linux packaging when Symlink-Rechte fehlen; set `NEXUS_STRICT_LINUX_PACKAGING=true` if a local release script must fail instead of skipping.

## Visual Smoke and Evidence

- Run the manual matrix in `docs/VIEW_SMOKE_MATRIX.md`.
- Store screenshots/videos under `docs/release-evidence/<version>/` using `docs/RELEASE_EVIDENCE_GUIDE.md`.
- Cover Main, Mobile, Code, Code Mobile, Control, Website, and Wiki.
- Verify that animated UI does not move active click targets during hover, press, drag, or panel transitions.
- Verify Light Theme text/chrome contrast separately from the dark default.
- Link any unresolved issue in `docs/KNOWN_ISSUES.md`.

## Public Docs and Wiki

- Nexus Wiki contains entries for Release Checklist, Known Issues, Completion Plan, View-Smoke Matrix, and visual evidence rules.
- Product page screenshots match the current Nexus v6 UI and have enough display space to be readable.
- Website downloads point to the expected public paths or to deployed server files with the same URL structure.
- Public text does not expose internal Control/admin workflows as end-user product features.
- Login/account copy explains website registration, app login, remember-me, tier access, and logout in user-facing language.

## VPS Deploy Inputs

- SSH host, user, port, and target path.
- Domain mapping for `nexusproject.dev` and `nexus-api.cloud`.
- API runtime environment variables.
- TLS/HTTPS reverse proxy config.
- Persistent data directory for control-plane JSON/database state.
- Payment provider webhook secrets and plan IDs.

## Security Gate

- No admin self-escalation from website registration.
- Browser-visible `VITE_*` values contain no secrets.
- API CORS/trusted origins include production domains only.
- Payment entitlements are written by server-side checkout/webhook flows only.
- Download binaries are checksummed before public upload.
- Control, DevTools, diagnostics, and admin-only views are hidden or gated for normal packaged-mode users.
- Account persistence uses explicit remember-me behavior and never stores raw passwords client-side.
