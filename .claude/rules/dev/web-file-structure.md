# Application File Structure

Organize source files by feature/domain, not by type. Group everything related to a feature together so it can be reasoned about and deleted as a unit.

## Top-level `src/` layout

```
src/
├── assets/            # Static assets (images, fonts, icons) — served by Vite from /public for unprocessed
├── auth/              # MSAL configuration, ProtectedRoute, useAuth hook
├── components/        # Shared, reusable UI components
├── features/          # Feature modules (see structure below)
├── hooks/             # Shared custom hooks
├── lib/               # Cross-cutting infra: api client, telemetry, formatters
├── mws/               # MWS design system tokens + primitives (placeholder for firm package)
├── pages/             # Route-level page components
├── store/             # Global state (React Context providers, query keys, etc.)
├── styles/            # Global styles (App.css, reset, CSS variables)
├── types/             # Shared TypeScript types and interfaces
└── utils/             # Pure utility functions
```

## Component folder structure

Each component lives in its own folder. All related files are colocated:

```
ComponentName/
├── index.tsx                    # Component implementation and named export
├── ComponentName.module.css     # Scoped styles (CSS Modules — plain CSS, not SCSS)
├── ComponentName.test.tsx       # Unit/integration tests (Vitest)
└── ComponentName.types.ts       # Local TypeScript types (if non-trivial)
```

## Feature folder structure

Features encapsulate a self-contained capability of the application:

```
features/
└── FeatureName/
    ├── components/         # UI components used only by this feature
    ├── hooks/              # Hooks scoped to this feature (often TanStack Query hooks)
    ├── types.ts            # Feature-specific TypeScript types
    ├── utils.ts            # Feature-specific utilities
    └── index.ts            # Public API — export only what other features need
```

**Rules:**

- Never import directly from a feature's internal files from outside that feature — use its `index.ts` barrel export.
- Shared components used by 2+ features belong in `src/components/`, not inside a feature.
- Shared hooks used by 2+ features belong in `src/hooks/`.
- Do not create `index.ts` barrel files in `src/components/` or `src/hooks/` — import from the component folder directly to avoid re-export chains that hurt tree-shaking.
- Keep `src/utils/` for pure, stateless functions only — no React, no side effects.
- Test files live next to the file they test, not in a separate `__tests__/` directory.
- No circular dependencies — module A must not import from B if B imports from A. Restructure shared code into a third module to break the cycle.

## Path aliases

Vite is configured with `@/` → `src/` and `@features/` → `src/features/`. Use them for imports two or more levels deep. Never use `../../../`.
