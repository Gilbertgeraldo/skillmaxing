# Maxxing

Personal deliberate-practice tracker built with Next.js, React, TypeScript, and Tailwind CSS.

**Live app:** [skillmaxing.vercel.app](https://skillmaxing.vercel.app)

## Features

- Custom learning topic and session duration (1–240 minutes)
- Accurate start, pause, resume, and stop/save timer flow
- Active timer recovery after a refresh or closed tab
- Device-local session history using `localStorage`
- GitHub-style contribution grid based on focused minutes
- Today, weekly, streak, and completed-session statistics
- Session deletion and safe recovery from malformed browser data
- Responsive editorial interface for desktop and mobile

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validation

```bash
npm run lint
npm run build
```

