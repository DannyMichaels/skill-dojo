# Code Dojo Web App - Implementation Plan

## Context

The Code Dojo is currently a CLI-based AI programming training system using YAML files for storage. We're building a web app version with user accounts, MongoDB persistence, and a chat-based training UI. New repo at `C:\Users\itzda\projects\code-dojo-app`.

## Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** MongoDB + Mongoose
- **Auth:** Email/password (bcrypt + JWT, 7-day expiry)
- **AI:** Anthropic API (Sonnet for training, Opus for assessments)
- **Code Editor:** CodeMirror 6 (lightweight, ~300KB vs Monaco's ~4MB)
- **Monorepo:** npm workspaces (server + client packages)
- **API Tests:** Supertest + Vitest (server)
- **E2E Tests:** Cypress (client)

## MongoDB Schema

### 3 Collections

**`users`** - One per account
- email (unique), passwordHash, name, created, lastSession, totalSessions, currentStreak, longestStreak, preferences (sessionLength, difficultyPreference, feedbackStyle)

**`skills`** - 1-5 per user, concepts embedded inside
- userId, skillName, currentBelt, assessmentAvailable, beltHistory[]
- `trainingContext` (string) - the skill-specific CLAUDE.md content
- `concepts` (embedded map) - each concept with mastery, exposureCount, successCount, lastSeen, streak, contexts[], observations[], beltLevel, readyForNewContext
- `reinforcementQueue[]` - embedded, typically 3-10 items

**`sessions`** - Separate collection (grows unboundedly, 10-500+ per skill)
- skillId, userId, date, type, status (active/completed/abandoned)
- problem, solution, evaluation, observations[], questions[], masteryUpdates
- `messages[]` - the actual chat conversation [{role, content, timestamp}]

**Why this split:** Concepts are always read/written with the skill (bounded at ~60 items). Sessions grow forever and are accessed individually/paginated - embedding them would eventually hit the 16MB doc limit.

## How Claude Integration Works

### System Prompt Assembly (per message)

Built fresh on every API call from 5 layers:

1. **Core Protocol** (~3K tokens) - condensed training philosophy, observation types, feedback rules, belt system
2. **Skill Context** (~1K tokens) - from `skill.trainingContext` (idiomatic patterns, anti-patterns, concept areas)
3. **Current State** (~1.5K tokens) - dynamic snapshot of concept mastery, reinforcement queue, belt status
4. **Session Instructions** (~300 tokens) - varies by session type (training/assessment/onboarding)
5. **Output Format** (~300 tokens) - tool use instructions

### Tool Use (not response parsing)

Claude gets tools to record structured data - no fragile text parsing:

- `record_observation` - logs anti-patterns, breakthroughs, struggles
- `update_mastery` - updates concept mastery scores
- `queue_reinforcement` - adds concepts to reinforcement queue
- `complete_session` - marks session done with evaluation
- `set_training_context` - one-time during skill onboarding

Server intercepts tool calls, writes to MongoDB, returns confirmation. User only sees Claude's text responses.

### Streaming

SSE (Server-Sent Events) for streaming Claude's responses. Simpler than WebSockets - the pattern is request-response with streaming, not bidirectional.

## API Routes

```
POST /api/auth/register          - Create account
POST /api/auth/login             - Get JWT
GET  /api/auth/me                - Current user
PUT  /api/auth/me                - Update profile/preferences

GET  /api/skills                 - List user's skills (summary)
POST /api/skills                 - Create new skill
GET  /api/skills/:id             - Full skill detail with concepts

GET  /api/skills/:id/sessions         - Paginated session list
POST /api/skills/:id/sessions         - Start new session
GET  /api/skills/:id/sessions/:sid    - Full session with messages
POST /api/skills/:id/sessions/:sid/messages - Send message (SSE response)

GET  /api/progress               - Cross-skill dashboard data
GET  /api/progress/:skillId      - Detailed skill progress
```

## Frontend Pages

```
/               - Landing page
/login          - Login
/register       - Register
/dashboard      - Main hub: skill cards, streaks, belt badges
/skills/:id     - Skill detail: concept grid, session history, belt timeline
/train/:id      - Training session: split-pane chat + CodeMirror editor
/sessions/:id   - Session review (read-only)
/settings       - Preferences
```

**Training page layout:** 60% chat panel / 40% code editor, stacks vertically on mobile.

## Project Structure

```
code-dojo-app/
├── package.json              (npm workspaces root)
├── .env.example
├── server/
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── config/            (db.js, env.js)
│       ├── middleware/        (auth.js, errorHandler.js)
│       ├── models/            (User.js, Skill.js, Session.js)
│       ├── routes/            (auth, skills, sessions, chat, progress)
│       ├── controllers/       (matching route handlers)
│       ├── services/
│       │   ├── anthropic.js       (SDK wrapper)
│       │   ├── promptBuilder.js   (system prompt assembly)
│       │   ├── toolHandler.js     (process Claude's tool calls)
│       │   └── masteryCalc.js     (decay + calculation)
│       └── prompts/
│           ├── trainingProtocol.js (core system prompt text)
│           └── tools.js            (tool definitions)
└── client/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── api/               (client API calls)
        ├── contexts/          (AuthContext)
        ├── hooks/             (useAuth, useChat, useSkills, etc.)
        ├── pages/             (all page components)
        ├── components/
        │   ├── layout/        (Sidebar, ProtectedLayout)
        │   ├── chat/          (ChatPanel, MessageList, ChatInput)
        │   ├── editor/        (CodePanel, CodeEditor)
        │   ├── dashboard/     (SkillCard, BeltBadge, MasteryRing)
        │   └── common/        (Button, Card, Modal)
        └── styles/
```

## Implementation Phases

### Phase 1: Foundation
Monorepo setup, MongoDB + Mongoose models, auth routes, React + routing, login/register, empty dashboard.

### Phase 2: Skills + Chat Core
Skills CRUD, session creation, Anthropic streaming service, basic promptBuilder, chat SSE endpoint, TrainingPage with ChatPanel, useChat hook. **Goal:** user can create a skill and chat with Claude.

### Phase 3: Code Editor + Tool Use
CodeMirror integration, "Submit Solution" flow, tool definitions, toolHandler service. **Goal:** user writes and submits code, Claude evaluates and records observations to DB.

### Phase 4: Full System Prompt + Smart Training
Complete promptBuilder with all 5 layers, skill onboarding flow, initial assessment, concept state + reinforcement queue in prompts. **Goal:** training is adaptive and context-aware.

### Phase 5: Dashboard + Progress
Progress API, DashboardPage (skill cards, belts, streaks), SkillDetailPage (concept grid, history), SessionReviewPage, mastery decay calculation.

### Phase 6: Polish + Assessments
Belt assessment eligibility, assessment flow, mobile responsiveness, error states, loading states.

## Testing Strategy

- **Server API tests:** Supertest + Vitest - test all API routes with in-memory MongoDB (mongodb-memory-server)
- **E2E tests:** Cypress - test critical user flows through the browser
- Tests are written and run after each phase before committing

## Verification

After each phase:
- **Phase 1:** Register, login, see dashboard, JWT persists on refresh. Supertest: auth routes. Cypress: register/login flow.
- **Phase 2:** Create a skill, start a session, send messages, see streamed responses. Supertest: skill/session CRUD. Cypress: create skill flow.
- **Phase 3:** Write code in editor, submit, see Claude evaluate, check MongoDB for observation/mastery writes. Supertest: tool handler writes. Cypress: editor + submit flow.
- **Phase 4:** Start new skill → onboarding assessment → concepts populated → next session targets weak spots. Supertest: prompt builder output. Cypress: onboarding flow.
- **Phase 5:** Dashboard shows accurate belts, mastery, streaks, session history. Supertest: progress endpoints. Cypress: dashboard rendering.
- **Phase 6:** Belt assessment unlocks at threshold, full flow from white to yellow promotion. Supertest: assessment eligibility. Cypress: full assessment flow.
