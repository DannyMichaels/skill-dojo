# Skill Dojo

Live Website: https://www.skill-dojo.com

A full-stack skill-tracking application built with React, Express, and MongoDB.

## Prerequisites

- [Node.js](https://nodejs.org/) v22+
- [pnpm](https://pnpm.io/installation) v10+
- [MongoDB](https://www.mongodb.com/docs/manual/installation/) (local instance or [MongoDB Atlas](https://www.mongodb.com/atlas))
- [Anthropic API key](https://console.anthropic.com/) (for AI features)

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string (default: `mongodb://localhost:27017/code-dojo`) |
| `JWT_SECRET` | Secret key for JWT authentication |
| `ANTHROPIC_API_KEY` | API key from [Anthropic Console](https://console.anthropic.com/) |
| `PORT` | Server port (default: `3001`) |
| `NODE_ENV` | `development` or `production` |

### 3. Start development servers

```bash
pnpm dev
```

This starts both the client and server concurrently:
- **Client** — [http://localhost:5173](http://localhost:5173) (Vite dev server, proxies API requests to the server)
- **Server** — [http://localhost:3001](http://localhost:3001)

You can also run them individually:

```bash
pnpm dev:client    # Vite dev server only
pnpm dev:server    # Express server only (with --watch)
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start client + server in parallel |
| `pnpm build` | Build the client for production |
| `pnpm start` | Start the production server |
| `pnpm test` | Run server tests (Vitest) |
| `pnpm test:watch` | Run server tests in watch mode |

## Project Structure

```
code-dojo-app/
  client/       React + Vite + TypeScript frontend
  server/       Express.js API server
  shared/       Shared constants
```

## Tech Stack

**Client:** React 19, Vite, TypeScript, Zustand, React Router, CodeMirror 6, SCSS

**Server:** Express, Mongoose, JWT, Anthropic AI SDK, Zod
