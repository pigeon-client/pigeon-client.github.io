# Design: Auto-Update Marketing Site

## Concept Overview

A developer-focused single-page marketing site for Pigeon, deployed on GitHub Pages. The site serves as the canonical download hub, auto-detecting the user's OS and presenting the correct installer, while also providing manual selection for all supported platforms. The dark theme with orange accent conveys a modern, developer-friendly aesthetic. Update notifications use a lightweight browser-native flow with console progress logging and auto-relaunch.

---

## Marketing Site Design

### Visual Design

**Color Palette**
```
Background (dark):     #0d1117   (GitHub Dark-inspired)
Surface (cards):      #161b22
Border:               #30363d
Text (primary):       #e6edf3
Text (muted):          #8b949e
Accent (orange):      #ff6c37
Accent (hover):       #ff8c5a
Success (green):      #3fb950
```

**Typography**
```
Font family:   Inter, system-ui, -apple-system, sans-serif
Heading 1:    3rem / 700 weight
Heading 2:    2rem / 600 weight
Body:         1rem / 400 weight
Code/Version: JetBrains Mono, monospace
```

**Spacing System**
```
Base unit: 8px
Section padding: 80px vertical, 24px horizontal
Card padding: 24px
Gap between elements: 16px / 24px
Max content width: 1120px
```

### ASCII Wireframe

```
+------------------------------------------------------------------------------+
|  [GitHub Icon] Star on GitHub                              [v1.2.3 latest]   |
+------------------------------------------------------------------------------+

                                    PIGEON

                     API Testing, Simplified.

               [ Get Started for Your Platform  v ]
                     or scroll to learn more


+------------------------------------------------------------------------------+
|  FEATURES                                                                     |
|                                                                               |
|  +------------------------+  +------------------------+  +---------------+  |
|  | [icon] One-Click       |  | [icon] Cross-Platform  |  | [icon] Auto   |  |
|  |      Testing           |  |      Works on Mac,     |  |      Updates  |  |
|  |      Send requests     |  |      Windows, Linux    |  |      Stay up  |  |
|  |      instantly         |  |                        |  |      to date  |  |
|  +------------------------+  +------------------------+  +---------------+  |
+------------------------------------------------------------------------------+

+------------------------------------------------------------------------------+
|  DOWNLOAD                                                                     |
|                                                                               |
|    Detected: macOS ARM64                                                      |
|    +---------------------------+                                             |
|    |  Download for macOS (ARM64)  [dmg icon]                                 |
|    |  Version 1.2.3  |  48.2 MB                                             |
|    +---------------------------+                                             |
|                                                                               |
|    Other platforms:                                                           |
|    [macOS x86_64]  [Windows]  [Linux AppImage]                               |
+------------------------------------------------------------------------------+

+------------------------------------------------------------------------------+
|  [GitHub] Pigeon on GitHub                                                    |
|                                                                               |
|  Built with Tauri  |  View Documentation  |  Report an Issue                 |
+------------------------------------------------------------------------------+
```

### Component Structure

| Component | Description |
|-----------|-------------|
| `Header` | Logo/name, GitHub star button, latest version badge |
| `HeroSection` | App name, tagline, OS-auto-detecting primary CTA button |
| `FeaturesSection` | 3-column grid of feature cards with icons |
| `DownloadSection` | Detected OS card + manual platform selector buttons |
| `PlatformCard` | Individual download option with icon, version, file size |
| `Footer` | GitHub link, docs, issue tracker, tech badges |
| `OSDetectionBanner` | Small banner showing detected OS |

### Responsive Breakpoints

```
Mobile (< 640px):   Single column, stacked cards, full-width buttons
Tablet (640-1024px): 2-column grid, reduced padding
Desktop (> 1024px): 3-column features, side-by-side elements
```

### Interactions

- **Primary CTA (Hero)**: On click → fetch latest release → redirect to correct .dmg/.exe/.AppImage
- **Platform Cards**: Hover lifts card with subtle shadow, click triggers download
- **OS Selector Buttons**: Toggle active state, immediately update download URL
- **Version Badge**: Tooltip shows "Latest release" on hover
- **GitHub Star**: Opens GitHub in new tab

### Assets Needed

- App icon/logo (SVG or PNG, 1x/2x)
- Feature icons (SVG, 24x24 or 32x32)
- Platform icons: Apple (macOS), Windows, Linux (SVG)
- Optional: Hero illustration or screenshot of app

---

## Update Notification UX

### Update Flow

```
App Startup
    │
    ▼
checkForUpdates() called
    │
    ├──► [No update] ──────────────────► App runs normally
    │
    └──► [Update available] ──► Show browser confirm() dialog
                                      │
                                      ├──► [User declines] ──► App runs normally
                                      │
                                      └──► [User accepts] ──► Download + Install
                                                                  │
                                                                  ├──► console.log progress
                                                                  │
                                                                  └──► exit(0) after install
```

### confirm() Dialog Spec

```javascript
const userConfirmed = window.confirm(
  "Pigeon v1.2.4 is available. You've got v1.2.3.\n\n" +
  "Download and install the update?"
);
```

**Dialog behavior:**
- Blocking (synchronous) — app waits for user response
- Title: browser-determined (shows origin domain)
- Buttons: "OK" = accept, "Cancel" = decline
- No custom UI for simplicity (works across all platforms)

### Console Progress Logging

```typescript
// src/lib/updater.ts

import { checkUpdate } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export async function checkForUpdates(): Promise<void> {
  console.log("[Pigeon] Checking for updates...");

  try {
    const update = await checkUpdate();

    if (!update) {
      console.log("[Pigeon] No updates available. Current version is latest.");
      return;
    }

    console.log(`[Pigeon] Update available: ${update.version}`);
    console.log(`[Pigeon] Current version: ${update.currentVersion}`);

    const userConfirmed = window.confirm(
      `Pigeon v${update.version} is available. You've got v${update.currentVersion}.\n\n` +
      `Download and install the update?`
    );

    if (!userConfirmed) {
      console.log("[Pigeon] User declined update.");
      return;
    }

    console.log("[Pigeon] User accepted update. Downloading...");
    // Download and install would emit progress events here
    // After install:
    await relaunch();

  } catch (error) {
    console.error("[Pigeon] Update check failed:", error);
  }
}
```

### Progress Logging During Download

```typescript
update.download((event) => {
  if (event.event === "Started") {
    console.log(`[Pigeon] Downloading update: ${event.data.contentLength} bytes`);
  } else if (event.event === "Progress") {
    const percent = Math.round((event.data.chunkLength / event.data.contentLength) * 100);
    console.log(`[Pigeon] Download progress: ${percent}%`);
  } else if (event.event === "Finished") {
    console.log("[Pigeon] Download complete. Installing update...");
  }
});
```

### Auto-Relaunch After Install

```typescript
// After download is complete and install is triggered
await relaunch(); // Restarts the application
```

---

## Implementation Notes

### Marketing Site Tech Stack

- **Framework**: Vite + React + TypeScript in `/site` directory
- **Styling**: Plain CSS with CSS variables (no Tailwind to keep bundle small)
- **Routing**: Single page, no router needed
- **State**: React hooks only (no Redux/Zustand for this simple site)

### GitHub API Integration

```typescript
// Fetch latest release
const release = await fetch(
  "https://api.github.com/repos/<owner>/<repo>/releases/latest"
).then(r => r.json());

// OS detection
const detectOS = (): string => {
  const platform = navigator.platform.toLowerCase();
  if (platform.includes("mac")) return "darwin-arm64";
  if (platform.includes("win")) return "windows";
  if (platform.includes("linux")) return "linux";
  return "unknown";
};
```

### Asset Naming Convention (for updater mapping)

```
pigeon_1.2.3_aarch64.dmg          # macOS ARM64
pigeon_1.2.3_x64.dmg              # macOS x86_64
pigeon_1.2.3_x64-setup.exe        # Windows
pigeon_1.2.3_amd64.AppImage        # Linux
```

### File Structure

```
/site
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── App.css
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── HeroSection.tsx
│   │   ├── FeaturesSection.tsx
│   │   ├── DownloadSection.tsx
│   │   ├── PlatformCard.tsx
│   │   └── Footer.tsx
│   ├── lib/
│   │   └── github.ts           # API fetch helpers
│   └── types/
│       └── release.ts           # GitHub release types
└── public/
    └── (static assets)
```