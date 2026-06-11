# Design: Redesign Pigeon App — "Simple but Easy to Use"

## Concept Overview

A comprehensive visual and interaction redesign of Pigeon that consolidates the three-row header/tab/url mess into a clean two-row unified toolbar, introduces a collapsible three-section sidebar (Collections, History, Drafts), enables flexible request/response panel layouts, and streamlines every editor surface. The design follows modern API client patterns (Postman, Bruno, Hoppscotch) while preserving Pigeon's dark-first, minimal identity.

---

## Visual Design Principles

### Color Palette

Maintain the existing dark-first theme with improved contrast between surface layers.

| Token | Current Value | New Value | Rationale |
|-------|---------------|-----------|-----------|
| `--bg-primary` | `#252525` | `#1e1e1e` | Darker base for better contrast with secondary surfaces |
| `--bg-secondary` | `#2c2c2c` | `#252525` | Subtly lighter than primary for layering |
| `--bg-tertiary` | `#1e1e1e` | `#1a1a1a` | Darkest surface for toolbars/modals |
| `--bg-hover` | `rgba(255,255,255,0.06)` | `rgba(255,255,255,0.08)` | More visible hover state |
| `--bg-active` | `rgba(255,255,255,0.10)` | `rgba(255,255,255,0.14)` | More distinct active state |
| `--border-primary` | `#3d3d3d` | `#333333` | Subtler borders |
| `--border-secondary` | `#454545` | `#383838` | Very subtle borders |

**Method badge colors** (unchanged — keep these):
- GET: `#49cc90` (green)
- POST: `#61affe` (blue)
- PUT: `#fca130` (orange)
- PATCH: `#50e3c2` (teal)
- DELETE: `#f93e3e` (red)

**Accent color** (unchanged): `--accent-orange: #ff6c37` — primary accent for send button, active indicators.

### Typography

| Token | Current | New | Use |
|-------|---------|-----|-----|
| Base font size | 10-12px | **13px** | Primary content text |
| Secondary text | 10-11px | **12px** | Labels, descriptions, metadata |
| Small/tiny text | 9-10px | **11px** | Method badges, timestamps, status codes |
| Tab font | 11px | **12px** | Tab labels |
| Code font | 11px | **12px** | URL input, body editor, response body |
| Line-height (code) | 1.5 | **1.6** | Better readability |

Font stack remains:
```
--font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
--font-mono: "SF Mono", "SFMono-Regular", "JetBrains Mono", "Fira Code", monospace;
```

### Spacing Rhythm

Standardize on a 4px grid:
- **4px** (gap between close icon and edge)
- **8px** (tight gaps between related elements)
- **12px** (standard padding inside panels)
- **16px** (section padding, modal padding)
- **20px** (generous spacing between sections)

### Borders & Shadows

- **Reduce border usage**: Use background color differences between sections instead of borders where possible
- **Border radius**: Stick to `rounded-lg` (8px) for containers, `rounded-md` (6px) for inputs, `rounded-xl` (12px) for modals
- **Shadows**: `shadow-sm` for toolbars, `shadow-lg` for modals/dropdowns
- **Active indicator**: 2px orange underline on active tabs (keep current pattern)

---

## New Layout

### Layout Diagram (Text-based)

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo] [Tab 1] [Tab 2] [Tab 3] [+] │ [No Env ▼] [⚙] │  ← Row 1: Toolbar (40px)
├─────────────────────────────────────────────────────────────┤
│ [GET ▼] [https://api.example.com/users.................... │  ← Row 2: URL Bar (44px)
│          .........................] [Import] [🚀 Send]    │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│  Sidebar │  ┌─ Params │ Auth │ Headers │ Body │ Settings ─┐│
│  (256px, │  │                                              ││
│  collaps. │  │  [ Key ]            [ Value ]               ││
│  to 48px) │  │  ───────────────────────────────────────     ││
│          │  │  │ user_id │         │ 42         │ ✓ │ × │  ││
│  ──────── │  │  ───────────────────────────────────────     ││
│  📁 Coll. │  │  │ created_at│      │ 2024       │ ✓ │ × │  ││
│  📁 Hist. │  │  ───────────────────────────────────────     ││
│  📁 Drafts│  │  │           │         │            │ + │  ││
│          │  │                                              ││
│  [Filter] │  └──────────────────────────────────────────────┘│
│          │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│  GET /use…│  │↕ Drag Handle                                │
│  POST /lo…│  ┌──────────────────────────────────────────────┐│
│  GET /use…│  │ 200 OK │ 342ms │ 2.4 KB              [−]  ││
│          │  ├──────────────────────────────────────────────┤│
│          │  │ [Body │ Headers │ Preview │ Console]         ││
│          │  │                                              ││
│          │  │  {                                           ││
│          │  │    "id": 1,                                  ││
│          │  │    "name": "John"                             ││
│          │  │  }                                           ││
│          │  │                                              ││
├──────────┴──────────────────────────────────────────────────┤
│  15 requests · 3 collections · 8 drafts          [? help]  │
└─────────────────────────────────────────────────────────────┘
```

### Layout Sizing

| Area | Default Height | Notes |
|------|---------------|-------|
| Toolbar (row 1) | 40px | Fixed, shrink-0 |
| URL Bar (row 2) | 44px | Fixed, shrink-0 |
| Sidebar | 100% height | 256px default, 200-400px variable |
| Request editor | Flexible (fills remaining) | Min 150px |
| Response panel | 300px default | Range 100px to 80% of container |
| Status bar (new) | 24px | Optional, at bottom |

### Window Minimum Size

- **Minimum width**: 900px (collapsed sidebar + min request panel + min response panel)
- **Minimum height**: 500px

---

## Component Hierarchy

### New Component Tree

```
App
├── Toolbar (NEW — merges Header + TabBar)
│   ├── AppBrand (logo + name)
│   ├── TabStrip (compact tabs)
│   ├── EnvSelector (compact dropdown)
│   └── SettingsButton (gear icon)
├── UrlBar (renovated)
│   ├── MethodSelector (color-coded dropdown)
│   ├── UrlInput (full-width, "paste cURL" placeholder)
│   ├── ImportButton (curl paste icon)
│   ├── SendButton (prominent, spinner while loading)
│   └── EnvPreview (resolved URL text)
├── MainContent (flex row)
│   ├── Sidebar (collapsible, redesigned)
│   │   ├── SidebarToggle (collapse/expand button)
│   │   ├── SearchBar (auto-focus on Cmd+F)
│   │   ├── SidebarSection (Collections)
│   │   │   ├── SectionHeader (collapsible, with add button)
│   │   │   ├── CollectionItem (folder icon, name, right-click menu)
│   │   │   └── RequestItem (method badge + name)
│   │   ├── SidebarSection (History)
│   │   │   ├── SectionHeader
│   │   │   ├── HistoryGroup (domain groups)
│   │   │   └── HistoryItem (status badge + method + name + time)
│   │   └── SidebarSection (Drafts)
│   │       ├── SectionHeader
│   │       └── DraftItem (method badge + name)
│   ├── ResizablePanel (NEW — handles split direction)
│   │   ├── RequestEditor (refined)
│   │   │   ├── SubTabBar (Params, Auth, Headers, Body, Settings — cleaner)
│   │   │   ├── ParamsEditor (KeyValueEditor with hints)
│   │   │   ├── AuthEditor (single-panel layout — simplified)
│   │   │   ├── HeadersEditor (KeyValueEditor with suggestions)
│   │   │   ├── BodyEditor (radio select + improved code editor)
│   │   │   └── SettingsEditor (grouped checkboxes)
│   │   └── ResponsePanel (improved)
│   │       ├── ResponseHeader (compact: status badge + time + size + collapse)
│   │       ├── ResponseTabs (Body, Headers, Preview, Console — NEW)
│   │       ├── ResponseActions (icon-only with tooltips)
│   │       └── ResponseContent (code/preview/empty state)
│   └── PanelDivider (vertical or horizontal, wider hit area)
├── EnvModal (redesigned — table editor)
├── ImportModal (unchanged)
├── KeyboardShortcutsModal (NEW — triggered by ? key)
└── StatusBar (NEW — optional bottom bar for quick stats)
```

### New/Modified Component Summary

| Component | Status | Key Change |
|-----------|--------|------------|
| `Header.tsx` | **DELETED** | Merged into Toolbar |
| `TabBar.tsx` | **DELETED** | Merged into Toolbar |
| `Toolbar.tsx` | **NEW** | Brand + tabs + env selector + settings |
| `UrlBar.tsx` | **MODIFIED** | Add curl import button, new placeholder text |
| `Sidebar.tsx` | **RENOVATED** | Three collapsible sections, Collections support |
| `RequestEditor.tsx` | **MODIFIED** | Remove "Cookies" button, cleaner tabs |
| `ResponsePanel.tsx` | **MODIFIED** | New empty state, Preview/Console tabs, collapse toggle |
| `BodyEditor.tsx` | **MODIFIED** | Improved code editor (synthetic textarea) |
| `AuthEditor.tsx` | **MODIFIED** | Single-panel layout, remove "Learn more" |
| `EnvModal.tsx` | **RENOVATED** | Table-based key-value editor instead of textarea |
| `ResizablePanel.tsx` | **NEW** | Supports vertical AND horizontal split |
| `StatusBar.tsx` | **NEW** | Optional bottom bar with stats |
| `KeyboardShortcutsModal.tsx` | **NEW** | Shortcut reference overlay |

---

## Key UI Changes

### 1. Unified 2-Row Toolbar

**Before**: Three separate rows — Header (40px) + TabBar (32px) + UrlBar (~45px) = ~117px
**After**: Two rows — Toolbar (40px) + UrlBar (44px) = 84px

**Row 1 — Toolbar** (`Toolbar.tsx`):
```
┌─────────────────────────────────────────────────────────────────────┐
│ [🐦 Pigeon]  [Tab 1 ✕]  [Tab 2 ✕]  [+]  │  [No Environment ▼] [⚙] │
└─────────────────────────────────────────────────────────────────────┘
```
- Background: `bg-bg-tertiary` (darkest surface), no bottom border
- Logo + "Pigeon" text on far left (20x20px logo SVG, 12px font-medium text)
- Tabs immediately after logo (more compact: reduced horizontal padding to 8px instead of 12px)
- Environment selector: compact `<select>` on right, width ~160px max
- Settings gear: `Lucide Settings` icon, 16px, opens future settings
- Tab behavior preserved: double-click to rename, middle-click to close, status dot

**Row 2 — URL Bar** (`UrlBar.tsx`):
```
┌──────────────────────────────────────────────────────────────────────────┐
│ [GET ▼]  [https://api.example.com/users...........................] [⤻] [🚀 Send] │
└──────────────────────────────────────────────────────────────────────────┘
```
- Background: `bg-bg-secondary`, no top border (separates from toolbar by color only)
- Method dropdown: Same pattern, 60px wide
- URL input: Full-width, placeholder: `"Enter request URL or paste cURL command"`
- Import button: Small icon button `Upload` (14px), tooltip "Import cURL"
- Send button: 80px wide, `bg-accent-orange`, spinner when loading

### 2. Collapsible Sidebar

**Collapsed state** (48px):
```
┌──┐
│🐦│  ← App icon (mini, acts as expand)
│📁│  ← Collections section icon
│📋│  ← History section icon
│📝│  ← Drafts section icon
│🔍│  ← Search icon (focuses search when expanded)
├──┤
│║ │  ← Drag handle for resize
└──┘
```

**Expanded state** (256px default):
```
┌────────────────────┐
│ [🔍 Search...    ✕] │  ← Auto-focused on Cmd+F
├────────────────────┤
│ 📁 Collections   [+]│  ← Section header (collapsible, add button)
│ ─────────────────── │
│  │ 🟢 GET /api/users │  ← Method badge + name
│  │ 🔵 POST /api/login│
├────────────────────┤
│ 📋 History          │  ← Section header (collapsible)
│ ─────────────────── │
│  │ api.example.com   │  ← Domain group header
│  │  🟢 GET /users  2m│  ← Status + method + name + time
│  │  🔴 DELETE /posts │
├────────────────────┤
│ 📝 Drafts           │  ← Section header (collapsible)
│ ─────────────────── │
│  │ 🟢 GET /products  │
└────────────────────┘
```

**Visual changes**:
- Each section has a collapsible header with chevron icon
- Section headers: `text-xs font-semibold uppercase tracking-wider text-text-secondary`
- Add button for collections: small `+` icon on hover over section header
- Items: `py-1.5 px-3`, method badge (colored pill `text-[10px] font-bold w-10`), name, timestamp
- Domain grouping preserved in History and Drafts
- Search bar stays at top, gains `clear` button (`X` icon) when text entered

### 3. Flexible Request/Response Layout

**Vertical split** (default):
```
┌─────────────────────────────┐
│      Request Editor         │
├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤  ← Horizontal divider (wider hit area)
│      Response Panel         │
└─────────────────────────────┘
```

**Horizontal split**:
```
┌──────────────┬──────────────┐
│  Request     │   Response   │
│  Editor      │   Panel      │
│              │              │
├─ ─ ─ ─ ─ ─ ─┼─ ─ ─ ─ ─ ─ ─┤  ← Vertical divider
└──────────────┴──────────────┘
```

**Divider improvements**:
- 4px hit area (currently 1.5px), centered on a 1px visual line
- Hover: line becomes 2px with `bg-accent-orange/60`
- Active: line becomes 2px with `bg-accent-orange`
- Layout toggle button in the divider: small icon button in center, cycles between vertical/horizontal
- Preference persisted in localStorage/SQLite

**Implementation**: New `ResizablePanel` component that wraps both children and handles the split direction.

### 4. Cleaner Request Editor Tabs

**Before**: 5 tabs + orphaned "Cookies" button with underline indicator
**After**: 5 tabs only (Cookies button removed), cleaner tab style

```
┌──────────────────────────────────────────────────────────────┐
│  Params │ Auth │ Headers (3) │ Body ● │ Settings            │
├──────────────────────────────────────────────────────────────┤
```

Changes:
- Active tab indicator: 2px orange bottom bar (unchanged)
- Tab text: `text-sm` (was `text-xs`), `font-medium`
- Badge count for Headers: `(3)` in `text-text-secondary`
- Green dot for Body when body is active
- **Removed**: "Cookies" button entirely (orphaned functionality)
- Tab content area: `px-4 py-3 bg-bg-secondary`

### 5. Auth Editor — Single Panel

**Before**: Two-column layout (type selector on left, fields on right) with "Learn more" link and Vault banner
**After**: Single column, stacked layout

```
┌─────────────────────────────────┐
│ Type: [Bearer Token ▼]         │ ← Full-width dropdown
│                                 │
│ Token:                         │
│ [eyJhbGciOiJIUzI1NiIs...    ] │ ← Full-width input
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 🔒 Store your secrets...    │ │ ← Collapsible info bar (smaller)
│ │ [Store in Vault]            │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

Key changes:
- Remove the two-panel split layout
- Make type selector full width
- Show fields below in a vertical stack
- Remove "Learn more about authorization" link (goes nowhere)
- Vault banner: collapsible info bar with toggle (default collapsed)

### 6. Body Editor — Improved Code Editor

**Current issue**: Transparent textarea overlay approach is fragile — line numbers don't scroll properly, highlight overlay gets out of sync.

**New approach**: Switch to a controlled `<textarea>` with a synthetic overlay:

```
┌────────────────────────────────────────────────────┐
│  ○ none  ● JSON  ○ form-data  ○ urlencoded  ○ raw │
│  │ Text ▼ │                          [Beautify]   │
├────────────────────────────────────────────────────┤
│  1 │ {                                             │
│  2 │   "key": "value"                              │
│  3 │ }                                             │
│    │                                               │
└────────────────────────────────────────────────────┘
```

Implementation options (choose one):
1. **Enhanced textarea** with fixed line numbers (simpler, less fragile)
2. **CodeMirror 6** lightweight integration (better UX, ~30KB gzip)
3. **Monaco editor** (heavy, avoid)

**Recommendation**: Option 1 — Keep textarea but fix the line-number sync with `overflow: auto` on both, using a shared scroll container. Add a small `ResizeObserver` to handle dynamic content height. This avoids adding dependencies.

Changes:
- Line number gutter: fixed 40px, scrolls in sync via shared scroll container
- "Beautify" button: moved to the radio row (more visible), not floating on edge
- JSON mode: placeholder shows `{ "key": "value" }` example
- Height: `min-h-[200px]`, grows with content up to `max-h-[400px]`

### 7. Response Panel — Improved

**Empty state redesign**:
```
┌─────────────────────────────────────┐
│ 200 OK │ 342ms │ 2.4 KB        [−] │  ← Compact header (always visible)
├─────────────────────────────────────┤
│                                     │
│        ┌─────────────────┐         │
│        │  🚀 → 🌍        │         │  ← Simple rocket icon (small)
│        └─────────────────┘         │
│    Enter a URL and click Send       │
│    to get a response                │
│                                     │
│    Try:  [curl https://api...]      │  ← Clickable example (prefills URL)
│                                     │
└─────────────────────────────────────┘
```

- **Removed**: Astronaut SVG (44x52), replaced with small 32x32 rocket icon
- **Added**: Clickable curl example that auto-fills the URL bar
- **Added**: "Collapse/Expand" toggle button `[−]` in header — collapses response panel to just 32px header

**Response tabs** (was 2, now 4):
| Tab | Condition | Description |
|-----|-----------|-------------|
| Body | Always | Formatted response body with syntax highlighting |
| Headers | Always | Response headers table |
| Preview | Only if HTML | Iframe render of HTML response |
| Console | Always | Resolved URL, request headers sent, timing breakdown |

**Action buttons**: Make them icon-only with tooltips:
| Button | Icon | Tooltip |
|--------|------|---------|
| Copy | `Clipboard` (14px) | "Copy response body" |
| Download | `Download` (14px) | "Download response" |
| cURL | `Terminal` (14px) | "Copy as cURL" |
| Clear | `XCircle` (14px) | "Clear response" |

### 8. Env Modal — Table Editor

**Before**: Textarea where users type `KEY=VALUE` lines
**After**: Key-value table editor (same pattern as KeyValueEditor)

```
┌────────────────────────────────────────────┐
│ 🌐 Environment Manager                     ✕ │
├────────────────────────────────────────────┤
│                                            │
│ [New environment name...        ] [Add]    │
│                                            │
│ ┌─ Production (Active) ──────────────────┐ │
│ │ [●] Production                    [✎] [🗑] │
│ │ ──────────────────────────────────────── │ │
│ │  ✓ │ Key             │ Value           │ │
│ │  ☑ │ BASE_URL        │ https://api...  │ │
│ │  ☑ │ API_KEY         │ abc123          │ │
│ │  ☐ │ DEBUG           │ false           │ │
│ │     │                 │            [+]  │ │
│ │                           [🔍 Test]     │ │
│ └─────────────────────────────────────────┘ │
│                                            │
│ ┌─ Staging ──────────────────────────────┐ │
│ │ [○] Staging                       [✎] [🗑] │
│ ...                                       │ │
└────────────────────────────────────────────┘
```

Changes:
- Replace textarea with KeyValueEditor component
- "Test" button: opens a small preview modal showing how `{{VAR}}` resolves
- Each env is a card with header row (name + actions) and table body
- Active env has a filled radio button + "Active" badge
- Variable count shown in env header: `(3 variables)`

### 9. Keyboard Shortcuts

**New modal** (triggered by `?` key):

| Shortcut | Action |
|----------|--------|
| `Cmd+Enter` | Send request |
| `Cmd+N` | New tab/request |
| `Cmd+W` | Close current tab |
| `Cmd+Shift+1-9` | Switch to tab [number] |
| `Cmd+F` | Focus sidebar search |
| `Cmd+S` | Save to collection |
| `Tab` | Navigate between fields |
| `Escape` | Close modals / blur focused element |
| `?` | Show this reference |

Implementation: Register all shortcuts in `App.tsx` with a `useEffect` + `keydown` listener. Use a Zustand store `shortcutStore` or just inline.

---

## Interaction Design

### Animations & Transitions

| Interaction | Duration | Easing | Details |
|-------------|----------|--------|---------|
| Sidebar collapse/expand | 200ms | `ease-in-out` | Width transitions from 256px to 48px. Content fades. Icons shift. |
| Tab switch | 150ms | `ease-out` | Content cross-fade, active indicator slides |
| Panel divider hover | 100ms | `ease-out` | Line thickens, color changes to accent |
| Panel divider drag | Instant | N/A | Real-time resize |
| Dropdown open | 150ms | `ease-out` | Opacity + translateY(2px) |
| Modal open | 200ms | `ease-out` | Backdrop fades in, modal scales from 0.98 to 1.0 |
| Section collapse | 150ms | `ease-in-out` | Max-height transition |
| Hover highlight | 100ms | `ease-out` | Background color change |

### Hover States

| Element | Default | Hover | Active |
|---------|---------|-------|--------|
| Tab | `text-text-tertiary` | `text-text-secondary` + `bg-bg-hover` | `text-text-primary` + `bg-bg-secondary` |
| Sidebar item | `text-text-secondary` | `bg-bg-hover` | `bg-bg-active` |
| Button (ghost) | `text-text-secondary` | `bg-bg-hover` + `text-text-primary` | `bg-bg-active` |
| Button (primary) | `bg-accent-orange` | `brightness-110` | `brightness-90` |
| Input | `border-border-primary` | `border-accent-orange/50` | `border-accent-orange` + ring |
| Collection folder | `text-text-primary` | `bg-bg-hover` | `bg-bg-active` |

### Focus States

All interactive elements use a focus ring: `focus:outline-none focus:ring-2 focus:ring-accent-orange/30 focus:border-accent-orange`

### Loading States

- Send button: Shows spinner (existing pattern is fine)
- Response panel: Pulsing skeleton (new — replace current simple spinner)

---

## Responsive & Flexibility

### Sidebar Collapse

```
Expanded (256px):
┌──────────────────┬─────────────────────┐
│ 📁 Collections   │  Request/Response   │
│ 📋 History       │  Panels             │
│ 📝 Drafts        │                     │
└──────────────────┴─────────────────────┘

Collapsed (48px):
┌──┬────────────────────────────────────┐
│📁│  Request/Response Panels           │
│📋│                                    │
│📝│                                    │
└──┴────────────────────────────────────┘
```

- Toggle button: `chevron-left` / `chevron-right` icon in the sidebar header
- Animate width with `transition-all duration-200`
- In collapsed state, show only icons vertically centered (no text)
- Section icons: `Folder`, `Clock`, `FileText` from Lucide
- Hovering over a collapsed section icon shows a tooltip with section name
- Double-clicking sidebar edge re-expands

### Panel Resize

- Sidebar: Draggable right edge (cursor `col-resize`), min 200px, max 400px
- Response panel: Draggable horizontal divider (cursor `ns-resize` for vertical split), or vertical divider (cursor `ew-resize` for horizontal split)
- Divider hit area: 5px (current: 1.5px)
- Store sizes in localStorage: `pigeon-sidebar-width`, `pigeon-response-size`

### Layout Orientation Toggle

- Button in the divider (small icon, shows on hover): Cycles `vertical` ↔ `horizontal`
- Stored in localStorage: `pigeon-layout-orientation`
- Implemented via the new `ResizablePanel` wrapper component

### Window Size Handling

| Width | Behavior |
|-------|----------|
| < 900px | Auto-collapse sidebar, compact toolbar |
| 900-1200px | Default layout, sidebar at 220px |
| 1200-1600px | Comfortable layout, sidebar at 256px |
| > 1600px | Spacious, sidebar can be up to 400px |

---

## Component Implementation Notes

### 1. New: `Toolbar.tsx`

```tsx
// Location: src/components/Toolbar.tsx
// Replaces: Header.tsx + TabBar.tsx

interface ToolbarProps {
  onOpenEnv: () => void;
  onOpenSettings: () => void;
}
```

**Props & State**:
- Reads tabs + activeTabId from `useTabStore`
- `editingId` local state for tab rename (same as old TabBar)
- Tab behavior preserved (status dot, close, rename, middle-click)

**Layout**:
```
<div className="flex items-center h-10 px-3 bg-bg-tertiary shrink-0 select-none gap-2">
  {/* Left: Brand */}
  <div className="flex items-center gap-1.5 shrink-0 pr-2">
    <PigeonLogo size={20} />
    <span className="text-xs font-medium text-text-secondary hidden sm:inline">Pigeon</span>
  </div>

  {/* Center: Tabs */}
  <div className="flex items-center flex-1 overflow-x-auto gap-0">
    {tabs.map(tab => <TabItem ... />)}
    <AddTabButton />
  </div>

  {/* Right: Env + Settings */}
  <div className="flex items-center gap-1 shrink-0">
    <EnvSelectorCompact />
    <SettingsButton />
  </div>
</div>
```

**Key classes for tabs** (more compact than before):
```tsx
// Tab item: px-2 instead of px-3, h-8 instead of h-full
className={`flex items-center gap-1.5 px-2 h-8 text-xs font-medium
  rounded-t-md cursor-pointer select-none shrink-0 max-w-[160px] transition-colors
  ${activeTabId === tab.id
    ? 'bg-bg-secondary text-text-primary'
    : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-hover'
  }`}
```

**EnvSelectorCompact** (new subcomponent):
```tsx
// Compact dropdown, < 160px width
<select className="appearance-none px-2 py-1 pr-6 text-xs bg-bg-hover text-text-primary
  border border-border-primary rounded-md cursor-pointer max-w-[160px] truncate
  focus:outline-none">
  <option value="">No Environment</option>
  {environments.map(env => <option key={env.id} value={env.id}>{env.name}</option>)}
</select>
```

### 2. Modified: `UrlBar.tsx`

**Changes**:
- Add `ImportCurlButton` (small icon button between URL input and Send button)
- Update placeholder text to `"Enter request URL or paste cURL command"`
- Add `onImportClick` prop callback

```tsx
// Import button
<button
  onClick={onImportClick}
  className="p-2 text-text-tertiary hover:text-text-primary hover:bg-bg-hover rounded
    transition-colors cursor-pointer shrink-0"
  title="Import cURL"
>
  <Upload size={16} />
</button>
```

### 3. Renovated: `Sidebar.tsx`

**Structural changes**:
- Remove the Drafts/History tab toggle at top
- Replace with three collapsible sections: Collections, History, Drafts
- Add `SidebarSection` reusable subcomponent

```tsx
// New SidebarSection component
interface SidebarSectionProps {
  title: string;
  icon: ReactNode;
  defaultOpen?: boolean;
  onAdd?: () => void;
  children: ReactNode;
}

// Usage
<SidebarSection title="Collections" icon={<Folder size={14} />} onAdd={handleAddCollection}>
  {collectionItems}
</SidebarSection>
<SidebarSection title="History" icon={<Clock size={14} />}>
  {historyItems}
</SidebarSection>
<SidebarSection title="Drafts" icon={<FileText size={14} />}>
  {draftItems}
</SidebarSection>
```

**SidebarSection implementation**:
```tsx
function SidebarSection({ title, icon, defaultOpen = true, onAdd, children }: SidebarSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-1">
      <div
        className="flex items-center justify-between px-3 py-1.5 cursor-pointer hover:bg-bg-hover group"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <ChevronRight size={12}
            className={`text-text-tertiary transition-transform ${open ? 'rotate-90' : ''}`} />
          <span className="text-text-secondary text-[11px] font-semibold">{icon}</span>
          <span className="text-text-secondary text-[11px] font-semibold uppercase tracking-wider">{title}</span>
        </div>
        {onAdd && (
          <button
            onClick={(e) => { e.stopPropagation(); onAdd(); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 text-text-tertiary hover:text-text-primary"
          >
            <Plus size={14} />
          </button>
        )}
      </div>
      {open && <div className="ml-1">{children}</div>}
    </div>
  );
}
```

**Collections** (new data model needed in store):
```ts
// New types
interface Collection {
  id: string;
  name: string;
  items: CollectionItem[];
  createdAt: number;
}

interface CollectionItem {
  requestId?: string; // links to a saved request
  name: string;
  method: HttpMethod;
  url: string;
}
```

- Add `collections` to the history store or create a new `collectionStore.ts`
- Store in SQLite via Rust backend (same pattern as history/drafts)
- Drag-and-drop: Use HTML5 drag API (HTML `draggable`, `onDragStart`, `onDrop` on collection folders)
- Right-click context menu: Simple custom `<ContextMenu>` component or use native `onContextMenu`

**Sidebar collapsed state**:
```tsx
const [collapsed, setCollapsed] = useState(false);

return (
  <div className={`h-full flex flex-col bg-bg-tertiary transition-all duration-200
    ${collapsed ? 'w-12' : 'w-64'} shrink-0 border-r border-border-primary`}>
    {/* Collapse toggle */}
    <button onClick={() => setCollapsed(!collapsed)}
      className="p-3 text-text-tertiary hover:text-text-primary">
      <PanelLeftClose size={16} />
    </button>

    {collapsed ? (
      // Icon-only mode
      <div className="flex flex-col items-center gap-4 py-4">
        <Folder size={18} className="text-text-secondary" title="Collections" />
        <Clock size={18} className="text-text-secondary" title="History" />
        <FileText size={18} className="text-text-secondary" title="Drafts" />
      </div>
    ) : (
      // Full mode (existing)
      <SearchBar />
      <SidebarSectionCollections ... />
      <SidebarSectionHistory ... />
      <SidebarSectionDrafts ... />
    )}
  </div>
);
```

### 4. Modified: `RequestEditor.tsx`

**Changes**:
- Remove the "Cookies" button from the tab bar
- The rest of the component stays structurally the same

```tsx
// Before: Tab bar with Cookies button at end
<div className="flex items-center border-b border-border-primary bg-bg-secondary shrink-0 px-1">
  <div className="flex items-center flex-1">
    {tabDefs.map(/* tabs */)}
  </div>
  <button className="px-4 py-2.5 text-xs text-accent-orange">
    Cookies  // ← REMOVE THIS
  </button>
</div>

// After: Just the tabs, no extra button
<div className="flex items-center border-b border-border-primary bg-bg-secondary shrink-0 px-1">
  {tabDefs.map(/* tabs */)}
</div>
```

### 5. Modified: `AuthEditor.tsx`

**Structural change**: Remove two-panel layout, use single column.

```tsx
// New layout
<div className="space-y-4">
  {/* Type selector (full width) */}
  <div>
    <label className="text-xs text-text-secondary mb-1.5 block">Type</label>
    <div className="relative max-w-xs">
      <select ...>
        <option value="none">No Auth</option>
        <option value="bearer">Bearer Token</option>
        <option value="basic">Basic Auth</option>
        <option value="api-key">API Key</option>
      </select>
    </div>
  </div>

  {/* Description text */}
  <p className="text-xs text-text-secondary">{AUTH_DESCRIPTIONS[auth.type]}</p>

  {/* Fields (full width) — dynamically shown based on type */}
  {auth.type === 'bearer' && (
    <div>
      <label className="text-xs text-text-secondary mb-1.5 block">Token</label>
      <input type="text" ... className="w-full max-w-lg" />
    </div>
  )}
  {auth.type === 'basic' && (
    <div className="grid grid-cols-2 gap-4 max-w-lg">
      <div>
        <label className="text-xs text-text-secondary mb-1.5 block">Username</label>
        <input type="text" ... />
      </div>
      <div>
        <label className="text-xs text-text-secondary mb-1.5 block">Password</label>
        <input type="password" ... />
      </div>
    </div>
  )}
  {auth.type === 'api-key' && (
    <>
      <div className="grid grid-cols-2 gap-4 max-w-lg">
        <div>
          <label className="text-xs text-text-secondary mb-1.5 block">Key</label>
          <input type="text" ... />
        </div>
        <div>
          <label className="text-xs text-text-secondary mb-1.5 block">Value</label>
          <input type="text" ... />
        </div>
      </div>
      <div className="max-w-xs">
        <label className="text-xs text-text-secondary mb-1.5 block">Add to</label>
        <select ...>
          <option value="header">Header</option>
          <option value="query">Query Params</option>
        </select>
      </div>
    </>
  )}

  {/* Vault banner — collapsible */}
  <details className="group">
    <summary className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer
      py-2 px-3 bg-bg-hover rounded-md hover:bg-bg-active transition-colors">
      <Lock size={14} />
      Store your secrets with Vault
    </summary>
    <div className="mt-2 px-3">
      <p className="text-xs text-text-tertiary mb-2">
        Store your secrets with end-to-end encryption locally using Vault.
      </p>
      <button className="px-3 py-1.5 text-xs text-text-secondary border border-border-primary rounded
        hover:bg-bg-hover transition-colors">
        Store in Vault
      </button>
    </div>
  </details>
</div>
```

### 6. Modified: `BodyEditor.tsx`

**Key fix**: Replace the transparent textarea overlay approach with a simpler, more robust pattern.

```tsx
// New approach: Side-by-side line numbers + textarea in a flex container
<div className="flex border border-border-primary rounded-lg overflow-hidden bg-bg-code min-h-[200px] max-h-[400px]">
  {/* Line numbers (synchronized) */}
  <div
    ref={lineNumRef}
    className="py-3 px-2 text-right text-xs font-mono leading-[1.6] select-none
      text-text-tertiary bg-bg-hover border-r border-border-primary overflow-hidden shrink-0"
    style={{ minWidth: '40px' }}
    onScroll={() => syncScroll(textareaRef, lineNumRef)}
  >
    {Array.from({ length: lineCount }, (_, i) => (
      <div key={i} style={{ height: '1.6em', lineHeight: '1.6' }}>{i + 1}</div>
    ))}
  </div>

  {/* Textarea (single, no overlay) */}
  <textarea
    ref={textareaRef}
    value={body}
    onChange={(e) => onBodyChange(e.target.value)}
    onScroll={() => syncScroll(lineNumRef, textareaRef)}
    placeholder={isJson ? '{\n  "key": "value"\n}' : 'Enter request body...'}
    className="flex-1 p-3 text-xs font-mono leading-[1.6] bg-transparent text-text-primary
      border-none resize-none focus:outline-none focus:ring-0
      placeholder:text-text-tertiary"
    spellCheck={false}
    style={{ tabSize: 2 }}
  />
</div>

// Sync function
const syncScroll = (source: RefObject, target: RefObject) => {
  if (source.current && target.current) {
    target.current.scrollTop = source.current.scrollTop;
  }
};
```

This removes the fragile overlay approach. The textarea is the single source of truth. Syntax highlighting via highlight.js is applied on copy/download only (or replaced with a lightweight approach).

**Move Beautify button** to the radio row area, adjacent to the radio buttons:
```tsx
{activeRadio === 'json' && (
  <button onClick={formatJson}
    className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium
      text-accent-orange bg-accent-orange/10 rounded-md
      hover:bg-accent-orange/20 transition-colors cursor-pointer">
    <Wand2 size={12} />
    Beautify
  </button>
)}
```

### 7. Modified: `ResponsePanel.tsx`

**Empty state**:
```tsx
// Replace AstronautIllustration with:
function RocketIllustration() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      className="text-text-tertiary">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

// Empty state content
<div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
  <RocketIllustration />
  <div className="text-center">
    <p className="text-sm font-medium text-text-secondary mb-1">Ready to send a request</p>
    <p className="text-xs text-text-tertiary max-w-xs">
      Enter a URL above and click Send to get started
    </p>
  </div>
  {/* Clickable example */}
  <button
    onClick={() => {
      const tabStore = useTabStore.getState();
      const tabId = tabStore.activeTabId;
      if (tabId) tabStore.updateTabRequest(tabId, {
        method: 'GET',
        url: 'https://jsonplaceholder.typicode.com/posts/1'
      });
    }}
    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-accent-orange
      bg-accent-orange/10 rounded-md hover:bg-accent-orange/20 transition-colors cursor-pointer"
  >
    <Terminal size={12} />
    Try: <code className="font-mono">curl https://jsonplaceholder.typicode.com/posts/1</code>
  </button>
</div>
```

**Response header** (more compact):
```tsx
<div className="flex items-center justify-between px-4 py-1.5 bg-bg-secondary border-b border-border-primary shrink-0">
  <div className="flex items-center gap-3">
    {response && (
      <>
        <Badge variant={getStatusVariant(response.status)} className="text-[11px]">
          {response.status} {response.statusText}
        </Badge>
        <span className="text-[11px] text-text-secondary flex items-center gap-1">
          <Clock size={11} /> {response.responseTime}ms
        </span>
        <span className="text-[11px] text-text-secondary">
          {(response.body.length / 1024).toFixed(1)} KB
        </span>
      </>
    )}
  </div>
  <button
    onClick={onToggleCollapse}
    className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
    title={collapsed ? "Expand response" : "Collapse response"}
  >
    {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
  </button>
</div>
```

**New tabs** (Preview and Console):
```tsx
// Tab bar
<div className="flex items-center gap-2 px-4 py-2 border-b border-border-primary bg-bg-secondary shrink-0">
  <SegmentedControl
    options={[
      { value: 'body', label: 'Body' },
      { value: 'headers', label: 'Headers' },
      ...(isHtml ? [{ value: 'preview', label: 'Preview' }] : []),
      { value: 'console', label: 'Console' },
    ]}
    value={activeTab}
    onChange={(v) => setActiveTab(v as TabId)}
  />
  <div className="flex-1" />
  {/* Action buttons (icon-only) */}
  <IconButton icon={<Clipboard size={14} />} tooltip="Copy response body" onClick={...} />
  <IconButton icon={<Download size={14} />} tooltip="Download response" onClick={...} />
  <IconButton icon={<Terminal size={14} />} tooltip="Copy as cURL" onClick={...} />
  <IconButton icon={<XCircle size={14} />} tooltip="Clear response" onClick={...} />
</div>
```

**Console tab content**:
```tsx
{activeTab === 'console' && (
  <div className="p-4 space-y-4 text-xs">
    <div>
      <h4 className="font-medium text-text-secondary mb-2">Resolved URL</h4>
      <code className="text-text-primary bg-bg-code px-2 py-1 rounded block break-all">{resolvedUrl}</code>
    </div>
    <div>
      <h4 className="font-medium text-text-secondary mb-2">Request Headers Sent</h4>
      <div className="space-y-1">
        {Object.entries(sentHeaders).map(([k, v]) => (
          <div key={k} className="flex gap-3">
            <span className="font-medium text-text-primary min-w-[160px]">{k}</span>
            <span className="text-text-secondary">{v}</span>
          </div>
        ))}
      </div>
    </div>
    <div>
      <h4 className="font-medium text-text-secondary mb-2">Timing</h4>
      <div className="flex items-center gap-4">
        <span className="text-text-tertiary">Response time:</span>
        <span className="font-mono text-text-primary">{response.responseTime}ms</span>
      </div>
    </div>
  </div>
)}
```

### 8. Renovated: `EnvModal.tsx`

**Replace textarea with KeyValueEditor**:
```tsx
// In the editing section, instead of textarea:
{editingId === env.id && (
  <div className="px-4 py-3">
    <KeyValueEditor
      items={variableItems}  // Convert Record<string, string> to KeyValue[]
      onChange={handleVariableChange}
      keyPlaceholder="Variable name (e.g. BASE_URL)"
      valuePlaceholder="Variable value"
    />
    <div className="flex items-center justify-between mt-3">
      <p className="text-[10px] text-text-tertiary">
        Use {'{{VARIABLE_NAME}}'} in URLs and headers
      </p>
      <button
        onClick={handleTestVariables}
        className="flex items-center gap-1 px-2 py-1 text-[11px] text-accent-blue
          bg-accent-blue/10 rounded-md hover:bg-accent-blue/20 transition-colors"
      >
        <Play size={11} />
        Test Variables
      </button>
    </div>
  </div>
)}

// Helper to convert Record<string,string> → KeyValue[]
const toKeyValueItems = (vars: Record<string, string>): KeyValue[] => {
  const entries = Object.entries(vars);
  return entries.length === 0
    ? [{ key: '', value: '', enabled: true }]
    : entries.map(([k, v]) => ({ key: k, value: v, enabled: true }));
};
```

### 9. New: `ResizablePanel.tsx`

```tsx
interface ResizablePanelProps {
  orientation: 'vertical' | 'horizontal';
  defaultSize?: number;  // Size of first panel in px or %
  minSize?: number;
  maxSize?: number;
  children: [ReactNode, ReactNode];  // [RequestEditor, ResponsePanel]
  onOrientationChange: (orientation: 'vertical' | 'horizontal') => void;
  onSizeChange: (size: number) => void;
}
```

**Implementation**:
```tsx
function ResizablePanel({ orientation, defaultSize = 300, minSize = 100, maxSize = 800, children, onOrientationChange }: ResizablePanelProps) {
  const [size, setSize] = useState(defaultSize);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = orientation === 'vertical' ? 'ns-resize' : 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let newSize: number;
      if (orientation === 'vertical') {
        newSize = Math.max(minSize, Math.min(maxSize, rect.bottom - e.clientY));
      } else {
        newSize = Math.max(minSize, Math.min(maxSize, e.clientX - rect.left));
      }
      setSize(newSize);
    };
    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [orientation, minSize, maxSize]);

  return (
    <div
      ref={containerRef}
      className={`flex-1 flex ${orientation === 'horizontal' ? 'flex-row' : 'flex-col'} min-h-0`}
    >
      {/* First panel (request) */}
      <div className={orientation === 'horizontal' ? 'flex-1 overflow-hidden' : 'flex-1 overflow-hidden min-h-0'}>
        {children[0]}
      </div>

      {/* Divider */}
      <div
        onMouseDown={handleMouseDown}
        className={`group relative ${orientation === 'vertical' ? 'h-2 cursor-ns-resize' : 'w-2 cursor-ew-resize'} shrink-0 z-10 flex items-center justify-center`}
      >
        <div className={`bg-border-primary group-hover:bg-accent-orange/60 transition-colors rounded-full
          ${orientation === 'vertical' ? 'w-full h-0.5' : 'w-0.5 h-full'}`} />
        {/* Orientation toggle */}
        <button
          onClick={() => onOrientationChange(orientation === 'vertical' ? 'horizontal' : 'vertical')}
          className="absolute opacity-0 group-hover:opacity-100 p-0.5 rounded bg-bg-secondary border border-border-primary
            text-text-tertiary hover:text-text-primary transition-all z-20"
          title="Toggle layout orientation"
        >
          <RotateCcw size={12} />
        </button>
      </div>

      {/* Second panel (response) */}
      <div
        className="overflow-hidden shrink-0 bg-bg-primary"
        style={orientation === 'vertical'
          ? { height: size }
          : { width: size }
        }
      >
        {children[1]}
      </div>
    </div>
  );
}
```

### 10. New: `KeyboardShortcutsModal.tsx`

```tsx
// Triggered by `?` key or from settings button
<div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-modal-overlay" onClick={onClose}>
  <div className="bg-bg-secondary rounded-xl shadow-lg w-[480px] max-h-[70vh] flex flex-col
    border border-border-primary" onClick={e => e.stopPropagation()}>
    <div className="flex items-center justify-between px-5 py-4 border-b border-border-primary">
      <h2 className="text-sm font-semibold text-text-primary">
        <Kbd className="mr-2">⌘</Kbd> Keyboard Shortcuts
      </h2>
      <button onClick={onClose}><X size={18} className="text-text-tertiary hover:text-text-primary" /></button>
    </div>
    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
      <ShortcutGroup title="Requests">
        <Shortcut keys={['⌘', 'Enter']} action="Send request" />
        <Shortcut keys={['⌘', 'N']} action="New tab/request" />
        <Shortcut keys={['⌘', 'W']} action="Close current tab" />
        <Shortcut keys={['⌘', 'S']} action="Save to collection" />
      </ShortcutGroup>
      <ShortcutGroup title="Navigation">
        <Shortcut keys={['⌘', '⇧', '1-9']} action="Switch to tab" />
        <Shortcut keys={['⌘', 'F']} action="Focus sidebar search" />
        <Shortcut keys={['Tab']} action="Navigate between fields" />
        <Shortcut keys={['Esc']} action="Close modals / blur" />
        <Shortcut keys={['?']} action="Show this reference" />
      </ShortcutGroup>
    </div>
  </div>
</div>
```

### 11. New/Modified: `App.tsx`

**Structural changes**:
- Remove `<Header />` and `<TabBar />` — replace with `<Toolbar />`
- Replace the manual response height state with `<ResizablePanel />`
- Add layout orientation state (localStorage persisted)
- Add sidebar collapse state (localStorage persisted)
- Add keyboard shortcut handler for new shortcuts
- Add `<StatusBar />` at bottom

```tsx
function AppContent() {
  // ... existing theme setup ...

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('pigeon-sidebar-collapsed') === 'true';
  });
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    return parseInt(localStorage.getItem('pigeon-sidebar-width') || '256');
  });
  const [layoutOrientation, setLayoutOrientation] = useState<'vertical' | 'horizontal'>(() => {
    return (localStorage.getItem('pigeon-layout-orientation') as 'vertical' | 'horizontal') || 'vertical';
  });
  const [responseSize, setResponseSize] = useState(() => {
    return parseInt(localStorage.getItem('pigeon-response-size') || '300');
  });

  // Persist preferences
  useEffect(() => {
    localStorage.setItem('pigeon-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);
  useEffect(() => {
    localStorage.setItem('pigeon-sidebar-width', String(sidebarWidth));
  }, [sidebarWidth]);
  useEffect(() => {
    localStorage.setItem('pigeon-layout-orientation', layoutOrientation);
  }, [layoutOrientation]);
  useEffect(() => {
    localStorage.setItem('pigeon-response-size', String(responseSize));
  }, [responseSize]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Cmd+Enter — send (already handled in UrlBar)
      // Cmd+N — new tab
      if (mod && e.key === 'n') {
        e.preventDefault();
        const id = useTabStore.getState().addTab();
        useTabStore.getState().setActiveTab(id);
      }
      // Cmd+W — close tab
      if (mod && e.key === 'w') {
        e.preventDefault();
        const { activeTabId, closeTab } = useTabStore.getState();
        if (activeTabId) closeTab(activeTabId);
      }
      // Cmd+Shift+[1-9] — switch to tab
      if (mod && e.shiftKey && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        const tabs = useTabStore.getState().tabs;
        if (tabs[idx]) useTabStore.getState().setActiveTab(tabs[idx].id);
      }
      // Cmd+F — focus search
      if (mod && e.key === 'f') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('[data-sidebar-search]')?.focus();
      }
      // Cmd+S — save to collection (future)
      if (mod && e.key === 's') {
        e.preventDefault();
        // TODO: Open save-to-collection dialog
      }
      // Escape — close modals / blur
      if (e.key === 'Escape') {
        (document.activeElement as HTMLElement)?.blur();
      }
      // ? — show shortcuts modal
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setShowShortcuts(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-bg-primary">
      <Toolbar onOpenEnv={() => setShowEnvModal(true)} onOpenSettings={() => {}} />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar with drag resize */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          width={sidebarWidth}
          onWidthChange={setSidebarWidth}
        />

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          <UrlBar onImportClick={() => setShowImport(true)} />

          {/* Tab content + Response in resizable panels */}
          <ResizablePanel
            orientation={layoutOrientation}
            defaultSize={responseSize}
            onOrientationChange={setLayoutOrientation}
            onSizeChange={setResponseSize}
          >
            {/* Request Editor */}
            <div className="h-full flex flex-col bg-bg-secondary">
              {tabs.map((tab) => (
                <div key={tab.id} className={tab.id === activeTabId ? 'flex-1 flex flex-col' : 'hidden'}>
                  <RequestEditor tabId={tab.id} />
                </div>
              ))}
            </div>

            {/* Response Panel */}
            <div className="h-full flex flex-col">
              {tabs.map((tab) => (
                <div key={tab.id} className={tab.id === activeTabId ? 'flex-1 flex flex-col' : 'hidden'}>
                  <ResponsePanel tabId={tab.id} />
                </div>
              ))}
            </div>
          </ResizablePanel>
        </div>
      </div>

      {/* Status Bar (optional) */}
      <StatusBar />

      {/* Modals */}
      {showEnvModal && <EnvModal onClose={() => setShowEnvModal(false)} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
      {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}
```

### 12. CSS Additions (`index.css`)

Add new CSS variables and utility classes:

```css
/* Improved contrast */
.dark {
  --bg-primary: #1e1e1e;
  --bg-secondary: #252525;
  --bg-tertiary: #1a1a1a;
  --bg-hover: rgba(255, 255, 255, 0.08);
  --bg-active: rgba(255, 255, 255, 0.14);
  --border-primary: #333333;
  --border-secondary: #383838;
}

/* Larger base font sizes */
@theme {
  --text-xs: 0.75rem;     /* 12px (was 10-11px) */
  --text-sm: 0.8125rem;   /* 13px (was 12px) */
  --text-base: 0.875rem;  /* 14px font-medium for primary content */
  --font-size-tiny: 0.6875rem; /* 11px for badges/metadata */
}

/* Kbd component for shortcut modal */
kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 22px;
  padding: 0 6px;
  font-size: 11px;
  font-family: var(--font-sans);
  background: var(--bg-hover);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  box-shadow: 0 1px 0 var(--border-primary);
}
```

### 13. New Store: `collectionStore.ts`

```typescript
// src/store/collectionStore.ts
import { create } from 'zustand';
import { HttpMethod } from '../types';

export interface CollectionItem {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  request: Record<string, any>; // serialized RequestConfig minus file
  createdAt: number;
}

export interface Collection {
  id: string;
  name: string;
  items: CollectionItem[];
  createdAt: number;
}

interface CollectionState {
  collections: Collection[];
  addCollection: (name: string) => void;
  renameCollection: (id: string, name: string) => void;
  deleteCollection: (id: string) => void;
  addItemToCollection: (collectionId: string, item: Omit<CollectionItem, 'id' | 'createdAt'>) => void;
  removeItemFromCollection: (collectionId: string, itemId: string) => void;
  reorderCollectionItems: (collectionId: string, items: CollectionItem[]) => void;
}

export const useCollectionStore = create<CollectionState>((set) => ({
  collections: [],
  addCollection: (name) => set((s) => ({
    collections: [...s.collections, {
      id: crypto.randomUUID(),
      name,
      items: [],
      createdAt: Date.now(),
    }],
  })),
  renameCollection: (id, name) => set((s) => ({
    collections: s.collections.map((c) => c.id === id ? { ...c, name } : c),
  })),
  deleteCollection: (id) => set((s) => ({
    collections: s.collections.filter((c) => c.id !== id),
  })),
  addItemToCollection: (collectionId, item) => set((s) => ({
    collections: s.collections.map((c) =>
      c.id === collectionId
        ? { ...c, items: [...c.items, { ...item, id: crypto.randomUUID(), createdAt: Date.now() }] }
        : c
    ),
  })),
  removeItemFromCollection: (collectionId, itemId) => set((s) => ({
    collections: s.collections.map((c) =>
      c.id === collectionId
        ? { ...c, items: c.items.filter((i) => i.id !== itemId) }
        : c
    ),
  })),
  reorderCollectionItems: (collectionId, items) => set((s) => ({
    collections: s.collections.map((c) =>
      c.id === collectionId ? { ...c, items } : c
    ),
  })),
}));
```

---

## Assets Needed

| Asset | Purpose | Format |
|-------|---------|--------|
| Small rocket icon | Response empty state | Inline SVG (48x48) |
| Collection folder icons | Sidebar sections | Lucide `Folder`, `Clock`, `FileText` |
| Kbd component | Shortcut modal | Pure CSS (no image) |
| Pigeon logo | Toolbar brand | Existing SVG (resize to 20x20) |

No new image assets are required. All icons come from Lucide or are inline SVGs.

---

## Implementation Order

Suggested sequence for implementation:

1. **CSS variables** (`index.css`): Update color palette, typography sizes
2. **Toolbar.tsx**: Create the merged toolbar (replaces Header + TabBar)
3. **UrlBar.tsx**: Add import button, update placeholder
4. **ResizablePanel.tsx**: Create the dual-orientation resizable panel
5. **App.tsx**: Wire up new layout, remove old Header/TabBar, add ResizablePanel
6. **Sidebar.tsx**: Add collapsible state, three-section layout, Collections support
7. **collectionStore.ts**: Create the collections data store
8. **RequestEditor.tsx**: Remove "Cookies" button
9. **AuthEditor.tsx**: Single-panel layout
10. **BodyEditor.tsx**: Fix code editor (remove overlay approach)
11. **ResponsePanel.tsx**: New empty state, Preview/Console tabs, icon-only actions
12. **EnvModal.tsx**: Replace textarea with KeyValueEditor
13. **KeyboardShortcutsModal.tsx** + keyboard handler in App.tsx
14. **StatusBar.tsx** (optional, low priority)
