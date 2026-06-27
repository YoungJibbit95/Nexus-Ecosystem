<a id="top"></a>

<div align="center">

<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=0:1a1b27,45:24283b,72:7aa2f7,100:bb9af7&height=220&section=header&text=NEXUS%20ECOSYSTEM&fontSize=46&fontColor=c0caf5&animation=fadeIn&fontAlignY=36&desc=Unified%20Workspace%20Infrastructure&descAlignY=57&descSize=16&descColor=7dcfff" alt="Nexus Ecosystem header" />

### Multi-App Workspace System for Planning, Development & Daily Operations

<p>
  <a href="https://nexusproject.dev"><img src="https://img.shields.io/badge/OPEN%20WEBSITE-nexusproject.dev-7aa2f7?style=for-the-badge&logo=googlechrome&logoColor=c0caf5&labelColor=1a1b27" alt="Open Nexus website" /></a>
  <a href="https://youngjibbit95.github.io/Nexus-Ecosystem/"><img src="https://img.shields.io/badge/READ%20THE%20DOCS-Nexus%20Wiki-bb9af7?style=for-the-badge&logo=gitbook&logoColor=c0caf5&labelColor=1a1b27" alt="Open Nexus Wiki" /></a>
</p>

<p>
  <img src="https://img.shields.io/github/last-commit/YoungJibbit95/Nexus-Ecosystem?style=flat-square&logo=git&color=7aa2f7&labelColor=1a1b27" alt="Last commit" />
  <img src="https://img.shields.io/github/repo-size/YoungJibbit95/Nexus-Ecosystem?style=flat-square&logo=github&color=bb9af7&labelColor=1a1b27" alt="Repository size" />
  <img src="https://img.shields.io/github/issues/YoungJibbit95/Nexus-Ecosystem?style=flat-square&logo=github&color=f7768e&labelColor=1a1b27" alt="Open issues" />
  <img src="https://img.shields.io/github/stars/YoungJibbit95/Nexus-Ecosystem?style=flat-square&logo=github&color=e0af68&labelColor=1a1b27" alt="GitHub stars" />
</p>

<a href="#overview">Overview</a>
&nbsp;&nbsp;•&nbsp;&nbsp;
<a href="#ecosystem">Ecosystem</a>
&nbsp;&nbsp;•&nbsp;&nbsp;
<a href="#architecture">Architecture</a>
&nbsp;&nbsp;•&nbsp;&nbsp;
<a href="#getting-started">Getting Started</a>
&nbsp;&nbsp;•&nbsp;&nbsp;
<a href="#security">Security</a>
&nbsp;&nbsp;•&nbsp;&nbsp;
<a href="#development-activity">Activity</a>

</div>

---

<a id="overview"></a>

<div align="center">

## Overview

</div>

> [!IMPORTANT]
> Nexus ist ein Multi-App Workspace-System für Planung, Entwicklung und Daily Operations.  
> Dieses Repository enthaelt die produktiven Clients, Shared Core Runtime-Logik und die Wiki-/Website-Dokumentation.

<div align="center">

<p>
  <img src="https://img.shields.io/badge/PRODUCT%20CLIENTS-4-7aa2f7?style=for-the-badge&labelColor=1a1b27" alt="Four product clients" />
  <img src="https://img.shields.io/badge/TARGETS-DESKTOP%20%2B%20MOBILE-7dcfff?style=for-the-badge&labelColor=1a1b27" alt="Desktop and mobile targets" />
  <img src="https://img.shields.io/badge/RUNTIME-SHARED%20CORE-bb9af7?style=for-the-badge&labelColor=1a1b27" alt="Shared core runtime" />
</p>

<p>
  <img src="https://img.shields.io/badge/React-19.2.x-7dcfff?style=flat-square&logo=react&logoColor=c0caf5&labelColor=1a1b27" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-7aa2f7?style=flat-square&logo=typescript&logoColor=c0caf5&labelColor=1a1b27" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Electron-Desktop-73daca?style=flat-square&logo=electron&logoColor=c0caf5&labelColor=1a1b27" alt="Electron" />
  <img src="https://img.shields.io/badge/Capacitor-Mobile-bb9af7?style=flat-square&logo=capacitor&logoColor=c0caf5&labelColor=1a1b27" alt="Capacitor" />
  <img src="https://img.shields.io/badge/Rust-Native%20Installer-f7768e?style=flat-square&logo=rust&logoColor=c0caf5&labelColor=1a1b27" alt="Rust" />
</p>

</div>

---

<a id="ecosystem"></a>

<div align="center">

## Ecosystem

<sub>One shared runtime across workspace, mobile and development surfaces.</sub>

<br /><br />

<a href="./Nexus%20Main/README.md"><img src="https://img.shields.io/badge/NEXUS%20MAIN-DESKTOP%20WORKSPACE-7aa2f7?style=for-the-badge&logo=electron&logoColor=c0caf5&labelColor=1a1b27" alt="Nexus Main README" /></a>
<a href="./Nexus%20Mobile/README.md"><img src="https://img.shields.io/badge/NEXUS%20MOBILE-MOBILE%20WORKSPACE-7dcfff?style=for-the-badge&logo=capacitor&logoColor=c0caf5&labelColor=1a1b27" alt="Nexus Mobile README" /></a>

<br />

<a href="./Nexus%20Code/README.md"><img src="https://img.shields.io/badge/NEXUS%20CODE-DESKTOP%20IDE-bb9af7?style=for-the-badge&logo=visualstudiocode&logoColor=c0caf5&labelColor=1a1b27" alt="Nexus Code README" /></a>
<a href="./Nexus%20Code%20Mobile/README.md"><img src="https://img.shields.io/badge/CODE%20MOBILE-MOBILE%20IDE-73daca?style=for-the-badge&logo=androidstudio&logoColor=c0caf5&labelColor=1a1b27" alt="Nexus Code Mobile README" /></a>

<br />

<a href="./packages/nexus-core/README.md"><img src="https://img.shields.io/badge/@NEXUS%2FCORE-SHARED%20RUNTIME-e0af68?style=for-the-badge&logo=npm&logoColor=c0caf5&labelColor=1a1b27" alt="Nexus Core README" /></a>
<a href="./Nexus%20Installer/README.md"><img src="https://img.shields.io/badge/NATIVE%20INSTALLER-RUST-f7768e?style=for-the-badge&logo=rust&logoColor=c0caf5&labelColor=1a1b27" alt="Nexus Installer README" /></a>

</div>

<br />

| App | Platform | Primary Scope | Stack |
| --- | --- | --- | --- |
| `Nexus Main` | Desktop | planning, notes, tasks, canvas, workspace | Electron + React + Vite |
| `Nexus Mobile` | Android / iOS | mobile parity for core workspace flows | Capacitor + React + Vite |
| `Nexus Code` | Desktop IDE | editor, run/debug, terminal, project workflow | Electron + React + Vite |
| `Nexus Code Mobile` | Android / iOS IDE | mobile coding and project ops | Capacitor + React + Vite |

<details>
<summary><b>Core View Matrix — Main / Mobile</b></summary>

<br />

| View | Primary Job | Key Capabilities |
| --- | --- | --- |
| `dashboard` | command center | Today layer, resume lane, quick capture, workspace context, engine health |
| `notes` | knowledge and docs | markdown editor, preview/reading mode, templates, backlinks and linking helpers |
| `tasks` | execution | kanban lanes, focus lane, priorities/deadlines, batch actions |
| `reminders` | scheduling | due/overdue grouping, snooze/completion, health/control center |
| `canvas` | visual planning | node graph, templates/magic, auto-layout, inspector, keyboard/pointer flows |
| `files` | workspace and handoff | workspace folders, import/export handoff, status and history surfaces |
| `flux` | ops and throughput | queue/signal view, action routing, bottleneck support |
| `code` | embedded coding view | fast edit/run path integrated in Main/Mobile shell |
| `devtools` | internal tooling | diagnostics, recipe/testing surfaces, development helpers |
| `settings` | system controls | appearance, typography, panel behavior, motion/render controls |
| `info` | in-app docs | architecture, diagnostics explanation, view guides and release notes |

</details>

---

<a id="architecture"></a>

<div align="center">

## Architecture

<sub>Product clients share runtime contracts, API integration and documentation surfaces.</sub>

</div>

```mermaid
flowchart LR
  subgraph Clients[Product Clients]
    A["Nexus Main / Mobile"]
    B["Nexus Code / Code Mobile"]
  end

  subgraph Runtime[Shared Runtime]
    C["@nexus/core"]
    G["@nexus/api"]
  end

  subgraph Services[Services & Documentation]
    D["nexus-api.cloud"]
    E["InfoView / In-App Docs"]
    F["Nexus Wiki + Website"]
  end

  A --> C
  B --> C
  C --> G
  G --> D
  E --> A
  E --> B
  F --> E
```

<div align="center">

<img src="https://img.shields.io/badge/CLIENTS-4-7aa2f7?style=for-the-badge&labelColor=1a1b27" alt="Four clients" />
<img src="https://img.shields.io/badge/RUNTIME-SHARED%20CORE-bb9af7?style=for-the-badge&labelColor=1a1b27" alt="Shared core runtime" />
<img src="https://img.shields.io/badge/API-PRIVATE%20BACKEND-f7768e?style=for-the-badge&labelColor=1a1b27" alt="Private backend" />

</div>

### Render and Motion Pipeline

> [!NOTE]
> All clients are aligned to the shared runtime model in `@nexus/core`.

| Stage | Runtime Model |
| --- | --- |
| Pipeline | `Measure → Resolve → Allocate → Commit → Cleanup` |
| Surface resolution | `surfaceClass · effectClass · budgetPriority · visibilityState · interactionState` |
| Motion degradation | `full → rich-reduced → composed-light → critical-only → static-safe` |
| Guardrails | Central ownership of `transform`, `filter` and `opacity` |

This keeps UX smooth while still degrading safely under low power, reduced motion, or lag pressure.

<details>
<summary><b>Repository Map</b></summary>

<br />

| Area | Purpose |
| --- | --- |
| `Nexus Main/` | desktop workspace app |
| `Nexus Mobile/` | mobile workspace app |
| `Nexus Code/` | desktop IDE app |
| `Nexus Code Mobile/` | mobile IDE app |
| `Nexus Installer/` | native Rust installer for build+install from GitHub |
| `packages/nexus-core/` | shared render/motion/runtime contracts |
| `packages/nexus-api/` | shared API clients/contracts |
| `tools/` | verify/release guard scripts |
| `Nexus Wiki/` | wiki site source |
| `nexusproject.dev/` | website source |

</details>

---

<a id="getting-started"></a>

<div align="center">

## Getting Started

</div>

```bash
git clone https://github.com/YoungJibbit95/Nexus-Ecosystem.git
cd Nexus-Ecosystem
npm run setup
```

### Development

```bash
npm run dev:all
npm run dev:all:with-control-ui
npm run dev:main
npm run dev:mobile:web
npm run dev:code
npm run dev:code-mobile:web
```

### Build and Verify

```bash
npm run build:ecosystem
npm run verify:single-react
npm run verify:ecosystem
npm run doctor:release
```

<div align="center">

<img src="https://img.shields.io/badge/BUILD-ECOSYSTEM-9ece6a?style=for-the-badge&logo=githubactions&logoColor=c0caf5&labelColor=1a1b27" alt="Ecosystem build" />
<img src="https://img.shields.io/badge/VERIFY-SINGLE%20REACT-7dcfff?style=for-the-badge&logo=checkmarx&logoColor=c0caf5&labelColor=1a1b27" alt="Single React verification" />
<img src="https://img.shields.io/badge/DOCTOR-RELEASE-bb9af7?style=for-the-badge&logo=dependabot&logoColor=c0caf5&labelColor=1a1b27" alt="Release doctor" />

</div>

<details>
<summary><b>Dependency Baseline — April 2026</b></summary>

<br />

> Major dependency refresh is applied across all 4 apps and validated with full builds plus verify scripts.

| Dependency | Version |
| --- | --- |
| React / React DOM | `19.2.x` |
| Framer Motion | `12.38.x` |
| Lucide React | `1.8.x` |
| Monaco Editor | `0.55.x` |
| Three.js | `0.184.x` |
| Zustand | `5.0.x` |
| React Markdown | `10.1.x` |

</details>

---

<a id="security"></a>

<div align="center">

## Security & Environment

</div>

> [!TIP]
> Security checks for high-severity production dependencies currently report `0 vulnerabilities` across all four product clients.

<div align="center">

<img src="https://img.shields.io/badge/HIGH%20SEVERITY-0%20VULNERABILITIES-9ece6a?style=for-the-badge&logo=securityscorecard&logoColor=c0caf5&labelColor=1a1b27" alt="Zero high severity vulnerabilities" />
<img src="https://img.shields.io/badge/BACKEND-NOT%20PUBLIC-f7768e?style=for-the-badge&logo=protonvpn&logoColor=c0caf5&labelColor=1a1b27" alt="Private backend" />

</div>

### Production API Host

```env
VITE_NEXUS_CONTROL_URL=https://nexus-api.cloud
VITE_NEXUS_CONTROL_INGEST_KEY=<per-app key>
```

<details>
<summary><b>Optional Environment Overrides</b></summary>

```env
VITE_NEXUS_USER_ID
VITE_NEXUS_USERNAME
VITE_NEXUS_USER_TIER
```

</details>

### Security Boundary

> [!CAUTION]
> This repository does not include the private backend implementation or private secrets.

| Included in repo | Excluded from repo |
| --- | --- |
| clients | backend services |
| shared core | infrastructure |
| wiki | private secrets |
| web/docs | — |

---

<a id="development-activity"></a>

<div align="center">

## Development Activity

<sub>Commit history, contribution flow and repository development overview.</sub>

<br /><br />

<a href="https://github.com/YoungJibbit95/Nexus-Ecosystem">
  <img width="470" src="https://github-readme-stats.vercel.app/api/pin/?username=YoungJibbit95&repo=Nexus-Ecosystem&theme=tokyonight&hide_border=true&border_radius=14&show_owner=true" alt="Nexus Ecosystem repository card" />
</a>

<br /><br />

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://github-readme-stats.vercel.app/api?username=YoungJibbit95&show_icons=true&theme=tokyonight&hide_border=true&border_radius=14&include_all_commits=true&rank_icon=github" />
  <source media="(prefers-color-scheme: light)" srcset="https://github-readme-stats.vercel.app/api?username=YoungJibbit95&show_icons=true&theme=tokyonight&hide_border=true&border_radius=14&include_all_commits=true&rank_icon=github" />
  <img height="180" src="https://github-readme-stats.vercel.app/api?username=YoungJibbit95&show_icons=true&theme=tokyonight&hide_border=true&border_radius=14&include_all_commits=true&rank_icon=github" alt="GitHub statistics" />
</picture>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://streak-stats.demolab.com?user=YoungJibbit95&theme=tokyonight&hide_border=true&border_radius=14" />
  <source media="(prefers-color-scheme: light)" srcset="https://streak-stats.demolab.com?user=YoungJibbit95&theme=tokyonight&hide_border=true&border_radius=14" />
  <img height="180" src="https://streak-stats.demolab.com?user=YoungJibbit95&theme=tokyonight&hide_border=true&border_radius=14" alt="GitHub contribution streak" />
</picture>

<br /><br />

<img width="98%" src="https://github-readme-activity-graph.vercel.app/graph?username=YoungJibbit95&theme=tokyo-night&hide_border=true&radius=14&area=true&custom_title=Nexus%20Development%20Activity" alt="Development activity graph" />

<br />

<img width="98%" src="https://github-profile-summary-cards.vercel.app/api/cards/profile-details?username=YoungJibbit95&theme=tokyonight" alt="GitHub contribution summary" />

</div>

---

<div align="center">

### Nexus Ecosystem

**One ecosystem. Every workflow.**

<p>
  <a href="https://github.com/YoungJibbit95/Nexus-Ecosystem"><img src="https://img.shields.io/badge/EXPLORE%20THE%20REPOSITORY-1a1b27?style=for-the-badge&logo=github&logoColor=c0caf5" alt="Explore repository" /></a>
  <a href="#top"><img src="https://img.shields.io/badge/BACK%20TO%20TOP-7aa2f7?style=for-the-badge&logo=rocket&logoColor=c0caf5&labelColor=1a1b27" alt="Back to top" /></a>
</p>

<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=0:1a1b27,45:24283b,72:7aa2f7,100:bb9af7&height=130&section=footer" alt="Footer wave" />

</div>
