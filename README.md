# CRM Order Control Center (Zaneva)

A centralized order management system for e-commerce/hijab business.

## Features

- **Dashboard** — Real-time stats, sales charts, order table with filters
- **Input Order** — Manual form entry or bulk Excel upload
- **Finance Approval** — Approve/reject CASH orders (single or bulk)
- **Upload Resi** — Upload Excel to auto-match tracking numbers
- **Print Resi** — Generate & print shipping labels with barcodes
- **Export Center** — Download CSV templates for SAP, J&T, CRM
- **Master Data** — Manage Products, Kecamatan, Shipping Services
- **Customer Management** — Auto-created customer database
- **Audit Log** — Track all import/delete actions
- **User Management** — Invite users, assign roles, reset data

## Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS + Recharts
- **Backend:** Express.js + PostgreSQL
- **Deploy:** Docker + Easypanel

## Quick Start (Docker)

```bash
# Clone and configure
cp .env.example .env
# Edit .env with your secrets

# Build and run
docker-compose up -d

# Access at http://localhost:3000
```

## Development

```bash
# Install dependencies
cd client && npm install
cd ../server && npm install

# Setup database
# Create PostgreSQL database and run db/init.sql

# Configure .env
cp .env.example .env
# Edit DATABASE_URL and secrets

# Run migrations
cd server && node utils/migrate.js

# Start dev servers
cd .. && npm run dev
# Frontend: http://localhost:5173
# Backend: http://localhost:3001
```

## Default Login

- **Email:** admin@zaneva.com
- **Password:** admin123

⚠️ Change the default password immediately in production!

## User Roles

| Role | Access |
|------|--------|
| **OWNER** | Full access to all features |
| **STAFF** | Dashboard (own orders), Input Order, Customers |
| **FINANCE** | All main menus + Finance Approval + Export |
| **INVENTORI** | Dashboard, Upload Resi, Print Resi, Export |

## Easypanel Deployment

1. Push to GitHub
2. Connect repo in Easypanel
3. Easypanel will use `docker-compose.yml` automatically
4. Set environment variables: `JWT_SECRET`, `SESSION_SECRET`
5. PostgreSQL data persists in Docker volume `pgdata`

## Project Structure

```
crm-app/
├── client/          # React frontend
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── pages/        # Page components
│   │   └── lib/          # API client
│   └── dist/        # Built frontend
├── server/          # Express backend
│   ├── routes/      # API routes
│   ├── middleware/   # Auth middleware
│   └── utils/       # Helpers
├── db/              # Database schema
├── Dockerfile       # Production build
├── docker-compose.yml
└── .github/workflows/  # CI/CD
```

## License

Private - Internal use only
