# Projektname

## Beschreibung
Kurze Beschreibung des Projekts.

## Tech Stack
- **Frontend:** React, TypeScript, Vite
- **Backend:** Node.js, Express, TypeScript
- **Datenbank:** PostgreSQL + Prisma ORM
- **Auth:** JWT

## Setup

### Voraussetzungen
- Node.js >= 18
- PostgreSQL

### Installation

```bash
# Frontend
cd frontend
npm install

# Backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev
```

### Starten

```bash
# Frontend (Entwicklung)
cd frontend && npm run dev

# Backend (Entwicklung)
cd backend && npm run dev
```
