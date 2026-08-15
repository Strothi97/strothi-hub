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


#### PLESK
cd /var/www/vhosts/strothi.de/hub.strothi.de/backend && PATH=/opt/plesk/node/22/bin:$PATH /opt/plesk/node/22/bin/npm install

cd /var/www/vhosts/strothi.de/hub.strothi.de/backend && GENERATE_SOURCEMAP=false NODE_OPTIONS="--max-old-space-size=3072" PATH=/opt/plesk/node/22/bin:$PATH /opt/plesk/node/22/bin/npm run build

cd /var/www/vhosts/strothi.de/hub.strothi.de/frontend && PATH=/opt/plesk/node/22/bin:$PATH /opt/plesk/node/22/bin/npm install

cd /var/www/vhosts/strothi.de/hub.strothi.de/frontend && GENERATE_SOURCEMAP=false NODE_OPTIONS="--max-old-space-size=3072" PATH=/opt/plesk/node/22/bin:$PATH /opt/plesk/node/22/bin/npm run build

Node.js: run_script -> Wenn DB geändert
db:migrate:prod