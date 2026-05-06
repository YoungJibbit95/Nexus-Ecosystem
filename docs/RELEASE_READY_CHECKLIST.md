# Nexus v6 Release Ready Checklist

Use this before pushing tags, uploading installers, or deploying the VPS stack.

## Local Validation

- `nexusproject.dev`: run `npm run build` and `npm run build:ci`.
- `Nexus Main`: run `npm run build`.
- `Nexus Code`: run `npm run build`.
- `Nexus-Ecosystem`: run `npm run verify:encoding`, `npm run verify:ecosystem`, and `npm run doctor:release`.
- `nexus-control-plane`: run `cargo fmt --check` and `cargo check` when the Windows MSVC linker is installed.

## Website Downloads

- Main Windows: `nexusproject.dev/public/downloads/nexus-main/Nexus_Main_Setup.exe`
- Main macOS: `nexusproject.dev/public/downloads/nexus-main/Nexus_Main_macOS.dmg`
- Main Linux: `nexusproject.dev/public/downloads/nexus-main/Nexus_Main_Linux.AppImage`
- Code Windows: `nexusproject.dev/public/downloads/nexus-code/Nexus_Code_Setup.exe`
- Code macOS: `nexusproject.dev/public/downloads/nexus-code/Nexus_Code_macOS.dmg`
- Code Linux: `nexusproject.dev/public/downloads/nexus-code/Nexus_Code_Linux.AppImage`

If binaries are too large for Git, upload them during deploy and keep the same
server paths under `/downloads/...`.

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
