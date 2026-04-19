# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### Chat App (Expo Mobile — `artifacts/chat-app/`)
Real-time WhatsApp-style chat app built with:
- **Firebase** (Auth, Firestore, Storage)
- **react-native-gifted-chat** for WhatsApp-like UI
- **expo-image-picker** for image sharing
- **Anonymous authentication** — no account needed
- **3 public chat rooms**: General, Random, Tech Talk

**Required Firebase Secrets** (set in Replit Secrets panel):
| Secret Key | Description |
|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase API Key |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Project ID |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase App ID |

**Firebase Console Setup Required:**
1. Authentication → Sign-in method → Enable "Anonymous"
2. Firestore Database → Create database (test mode for dev)
3. Storage → Get started (for image sharing)

### API Server (`artifacts/api-server/`)
Express 5 + TypeScript backend with Drizzle ORM.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
