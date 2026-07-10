# User Guide

## First Start

```bash
npm run setup
npm run dev:main
npm run dev:code
```

Mobile web iteration:

```bash
npm run dev:mobile:web
npm run dev:code-mobile:web
```

## Local Workspace

Nexus local workspace features are designed to stay useful without production cloud credentials:

- Notes
- Tasks
- Reminders
- Canvas
- Files
- Local code workflows

## Nexus Cloud

Optional Nexus Cloud features are account-bound. When cloud features are unavailable, the app should explain that local workspace features remain available.

Use this style of message:

> Cloud features are currently unavailable. Local workspace features remain available.

Avoid implementation details in user-facing messages.

## Free And Pro

Free features focus on local-first work. Pro/Nexus Cloud features can include sync, backups, AI/Flux, multi-device use, sharing, team workflows and higher limits.

Cloud and Pro permissions are enforced server-side.

## Troubleshooting

- If a local app does not start, run the app-specific build or dev command from the repository root.
- If a cloud-backed feature is unavailable, continue with local workspace features and retry later.
- Do not paste secrets, tokens or private account data into public issues.
