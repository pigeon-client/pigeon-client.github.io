# Feature: Redesign Pigeon App — "Simple but Easy to Use"

## Overview

A comprehensive UX/UI redesign of the Pigeon API client to reduce visual clutter, streamline the layout, and make common tasks faster without removing any existing functionality. The goal is to go from a dense, multi-row interface with excessive borders to a clean, native-feeling desktop app that follows modern API client UX patterns (Postman, Insomnia, Bruno, Hoppscotch) while retaining Pigeon's unique identity.

## User Stories

- As a **power user**, I want to send requests quickly without navigating through nested tabs, so that I can iterate on API development faster.
- As a **new user**, I want the interface to feel intuitive and uncluttered, so that I don't feel overwhelmed when first opening the app.
- As a **daily user**, I want the layout to be flexible (resizable panels, collapsible sidebar), so that I can optimize screen space for my workflow.
- As a **team member**, I want to organize my requests into collections with clear naming and grouping, so that I can find and share API configurations easily.
- As a **debugger**, I want to see request configuration and response side-by-side or one above the other depending on my preference, so that I can correlate inputs and outputs efficiently.

## Functional Requirements

### 1. Layout Restructuring (the "Big Simplification")

1.1. **Replace the three separate rows** (Header, TabBar, UrlBar) with a **single unified toolbar** at the top that contains:
   - App logo/brand on the far left (small, 20-24px)
   - Tab strip immediately next to the logo (same row)
   - HTTP method dropdown + URL input + Send button grouped as a coherent URL bar (second visual row, below the tab strip, or merged if space allows)
   - Environment selector as a compact dropdown/button in the top-right corner of the toolbar

1.2. **Rationale for the change**: The current layout wastes ~80px of vertical space on three separate rows (Header 40px + TabBar 32px + UrlBar ~45px padding). By merging branding + tabs into one row, we save ~30px for the request/response area.

1.3. **Make the sidebar collapsible**: Add a collapse/expand toggle button. When collapsed, the sidebar shrinks to a narrow icon strip (48px wide) showing just icons for the sections. The sidebar should animate smoothly between states.

1.4. **Support both vertical and horizontal request/response split**:
   - Default: request on top, response on bottom (vertical split, current behavior)
   - Option: request on left, response on right (horizontal split)
   - Persist the user's preference
   - The divider should be more visually apparent with a hover effect and wider hit area

1.5. **Make the sidebar width adjustable**: Draggable right edge of sidebar with a minimum of 200px and maximum of 400px (or the collapsed 48px state).

### 2. Sidebar Redesign

2.1. **Reorganize sidebar into three clear sections**:
   - **Collections** (new): user-organized groups of saved requests, manually created and managed
   - **History**: chronological list of sent requests (replaces the current "history" tab)
   - **Drafts**: auto-saved request drafts (replaces the current "drafts" tab)
   - Each section should be collapsible within the sidebar (section headers that expand/collapse)

2.2. **Collections feature**:
   - Create named collections (folders)
   - Drag-and-drop requests into collections
   - Store collections in SQLite via the Rust backend
   - Collection items show method badge + request name
   - Right-click context menu on collections (rename, delete, export as curl)

2.3. **Improved visual hierarchy in sidebar lists**:
   - Method badges should use color-coded pills (consistent with current colors)
   - Each row should show: method badge | request name | timestamp/relative time
   - Hover state with a subtle background highlight
   - Delete button on hover (consistent with current pattern but visually refined)
   - Domain-based auto-grouping preserved for History and Drafts, but Collections take precedence

2.4. **Search/Filter bar**: Keep the search bar at the top but make it auto-focused when the user presses Cmd+F or Ctrl+F. Add a clear button when text is entered.

### 3. Toolbar & URL Bar Restructuring

3.1. **Unified toolbar row** (first row):
   - **Left**: App logo (small Pigeon icon, 20x20px) + app name "Pigeon" in subtle text
   - **Center/Left**: Tab strip (existing tab behavior preserved, but tabs are more compact)
   - **Right**: Environment selector dropdown (compact, shows active env name or "No Environment")
   - **Right**: Settings/gear icon for future settings

3.2. **URL bar row** (second row, immediately below):
   - **Method selector**: Dropdown with color-coded options (same as current)
   - **URL input**: Full-width input with placeholder "Enter request URL or paste cURL command"
   - **Send button**: Prominent orange button, shows spinner when loading
   - **Import button**: Small icon button next to Send for pasting cURL (replaces the current sidebar import button)
   - Environment variable resolution preview shown below the URL input when variables are present (same as current)

### 4. Request Editor Streamlining

4.1. **Reduce sub-tab visual noise**:
   - Keep the 5 tabs (Params, Auth, Headers, Body, Settings) but use a cleaner tab style
   - Replace the current implementation of header suggestions and auto-focus with a simpler version
   - Remove the orphaned "Cookies" button (it does nothing currently — if cookies support is planned, add it properly or remove it)

4.2. **Auth editor simplification**:
   - Move from the current two-panel layout to a single-panel layout
   - Type selector (dropdown) at the top
   - Fields appear below the selector based on auth type
   - Remove the "Learn more" link (it doesn't go anywhere)
   - Keep the Vault banner but make it less prominent (collapsible info bar)

4.3. **Body editor improvements**:
   - Keep the radio button selector for body types (none, JSON, form-data, etc.)
   - Improve the code editor: instead of the transparent textarea overlay approach (which is fragile), use a single textarea with syntax highlighting OR use a lightweight code editor library
   - The line-number gutter should scroll properly with the content
   - JSON Beautify button should be more visible (not just on the right edge)
   - Raw format sub-selector (Text/XML) should remain

4.4. **Params editor**: Keep the KeyValueEditor pattern but consider inline description/hint for common parameter patterns.

4.5. **Settings tab**: Keep the existing checkboxes (follow redirects, SSL verification) but add visual grouping with clearer labels.

### 5. Response Panel Improvements

5.1. **Compact response header**:
   - Show status badge, response time, and size on the same row
   - Remove the old separator row that just says "Response" — it's redundant
   - Add a "Collapse/Expand" button to minimize the response panel when not needed

5.2. **Response tabs**: Keep Body and Headers tabs but add:
   - A "Preview" tab for HTML responses (existing functionality, promoted to a top-level tab)
   - A "Console" or "Log" tab showing the resolved URL, request headers sent, and timing breakdown

5.3. **Response action buttons**:
   - Keep Copy, Download, cURL export buttons
   - Make them smaller (icon-only with tooltips, or small text buttons)

5.4. **Empty state redesign**:
   - Replace the large astronaut SVG (44x52) with a simpler, smaller illustration or just clean text
   - Show helpful text: "Enter a URL and click Send to get started" with a sample curl command shown as a clickable example

### 6. Environment Variables

6.1. **Env modal redesign**:
   - Replace the textarea-based variable editing with a proper table editor (key-value pairs, same pattern as headers/params)
   - Keep the same modal pattern but make it feel lighter
   - Show variable count and active environment prominently
   - Add an inline "Test" button to preview how `{{VAR}}` will resolve with the current environment

### 7. Keyboard Shortcuts & Navigation

7.1. **Preserve existing shortcuts**:
   - Cmd+Enter / Ctrl+Enter to send request
   - Tab navigation between fields

7.2. **Add new shortcuts**:
   - Cmd+N / Ctrl+N: New tab/request
   - Cmd+W / Ctrl+W: Close current tab
   - Cmd+Shift+[number]: Switch to tab [number]
   - Cmd+F / Ctrl+F: Focus sidebar search
   - Cmd+S / Ctrl+S: Save to collection
   - Escape: Close modals / blur focused element
   - Add a keyboard shortcut reference accessible via `?` key

### 8. Visual Design & Dark Theme Refinements

8.1. **Reduce borders**:
   - Remove the border between sidebar and main content on hover
   - Use subtle background color differences instead of borders between sections
   - Reduce border thickness from 1px to 0.5px where appropriate

8.2. **Improve color palette**:
   - Keep the dark theme as default
   - Add more color contrast between sections (currently bg-primary=#252525, bg-secondary=#2c2c2c — too similar)
   - Use accent colors more intentionally (not just orange for everything)
   - Method colors (GET=green, POST=blue, PUT=orange, PATCH=teal, DELETE=red) are good — keep them

8.3. **Typography**:
   - Increase base font sizes slightly (current 10-12px is very small for a desktop app)
   - Use 12-13px for secondary text, 14px for primary content
   - Improve line-height for readability in code blocks

8.4. **Animations & Transitions**:
   - Add subtle transitions for panel resizing, sidebar collapse, tab switching
   - Loading states should be smoother (skeleton loaders for response area)

## Non-Functional Requirements

- **Performance**: No degradation in request/response times. UI animations should run at 60fps.
- **Usability**: All existing functionality must remain accessible within 1-2 clicks of the main interface (same as current or better).
- **Accessibility**: Tab order must follow visual order. All interactive elements must be keyboard-accessible.
- **Maintainability**: Component decomposition should not increase complexity. Reusable UI primitives should be favored.
- **Responsiveness**: While a desktop-only app, the layout should gracefully handle window sizes from 900px wide (minimum reasonable) to ultrawide.
- **Persistence**: All user preferences (sidebar width, split direction, panel sizes) must persist across app restarts using the Rust backend/SQLite.

## Acceptance Criteria

- [ ] The three-row toolbar (Header + TabBar + UrlBar) is consolidated into a two-row unified toolbar with no loss of functionality
- [ ] Sidebar is collapsible to 48px icon strip and animates smoothly
- [ ] Sidebar has three clear sections (Collections, History, Drafts) with collapsible headers
- [ ] Users can create, rename, and delete collections
- [ ] Users can drag requests into collections
- [ ] Request/response split supports both vertical (top/bottom) and horizontal (left/right) orientations
- [ ] All tabs, sidebar items, and panels are keyboard-navigable
- [ ] New keyboard shortcuts work reliably (Cmd+N, Cmd+W, Cmd+F, Cmd+Shift+[1-9], Escape, ?)
- [ ] Environment variable editor uses a proper table instead of textarea
- [ ] Response panel has a functional collapse/expand toggle
- [ ] The orphaned "Cookies" button is either removed or made functional
- [ ] Auth editor uses single-panel layout instead of two-panel
- [ ] Empty state shows helpful text/example instead of large astronaut illustration
- [ ] All existing features still work (HTTP methods, body types, auth, env vars, curl import/export, history, drafts, Cmd+Enter send)
- [ ] User preferences (sidebar width, split direction, response height) persist across restarts
- [ ] Visual design feels cleaner with fewer borders, better contrast, and appropriate font sizes
