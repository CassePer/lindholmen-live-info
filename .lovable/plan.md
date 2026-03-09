

## Plan: Förenkla TV-dashboard layout

### TvDashboardPage.tsx
- Replace `ResizablePanelGroup`/`ResizablePanel`/`ResizableHandle` with a simple flex layout
- Left side: `w-1/3` with Lunch + Departures
- Right side: `w-2/3` with iframe (always visible, no toggle)
- Remove `useState` for `iframeVisible`, `AnimatePresence`, and motion wrapper
- Remove `iframeVisible`/`onToggleIframe` props from TvToolbar

### TvToolbar.tsx
- Remove iframe toggle button and fullscreen button (and related state/effects)
- Keep only `ThemeToggle`
- Remove `iframeVisible`/`onToggleIframe` props
- Simplify to a minimal floating toolbar with just the theme toggle

