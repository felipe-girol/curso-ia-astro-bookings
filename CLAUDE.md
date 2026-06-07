# Agents Instructions

## Product Overview
- AstroBookings is a backend API for rocket launch bookings.
- Manages rockets, launches, customers, and seat reservations.
- Includes a Vue frontend and Playwright smoke tests.

## Technical Implementation

### Tech Stack
- Language: **TypeScript ~6.0**
- Backend: **Express 5 on Node >= 20**
- Frontend: **Vue 3.5 with Vite 6**
- Database: **In-memory Map (no external DB)**
- Security: **CORS enabled**
- Testing: **Playwright**
- Logging: **console (stdout)**

### Development workflow
```bash
# Install dependencies
cd backend && npm install
cd frontend && npm install
npm install # root for Playwright

# Run backend (dev mode with hot reload)
cd backend && npm run dev

# Run frontend (dev mode)
cd frontend && npm run dev

# Build backend
cd backend && npm run build

# Build frontend
cd frontend && npm run build

# Run smoke tests (backend must be running)
npm test

# Run only smoke tests
npm run test:smoke
```

### Folder structure
```text
.                              # Project root (monorepo)
├── CLAUDE.md                  # Instructions for AI agents
├── README.md                  # Human documentation
├── package.json               # Root: Playwright tests
├── playwright.config.ts       # Playwright configuration
├── tests/                     # Playwright test files
│   ├── smoke.spec.ts          # Smoke tests
│   └── rockets.spec.ts        # Rockets API tests
├── backend/                   # Express API
│   ├── package.json           # Backend dependencies
│   ├── tsconfig.json          # TypeScript config
│   └── src/
│       ├── main.ts            # Entry point (port 3000)
│       ├── routes/
│       │   └── index.ts       # Root router (/api)
│       ├── types/
│       │   └── rockets.type.ts       # Types and DTOs
│       ├── utils/
│       │   ├── validation.ts         # Rocket validation functions
│       │   └── error-handler.ts      # Centralized error responses
│       └── rockets/
│           ├── rockets.repository.ts # In-memory data store
│           └── rockets.router.ts     # CRUD endpoints
└── frontend/                  # Vue 3 + Vite app
    ├── package.json           # Frontend dependencies
    ├── vite.config.ts         # Vite configuration
    ├── index.html             # HTML entry point
    └── src/
        ├── main.ts            # Vue app entry
        ├── App.vue            # Root component
        └── components/        # Vue components
```

### API Endpoints
- `GET /api/health` - Health check
- `GET /api/rockets` - List all rockets
- `GET /api/rockets/:id` - Get rocket by ID
- `POST /api/rockets` - Create rocket
- `PUT /api/rockets/:id` - Update rocket
- `DELETE /api/rockets/:id` - Delete rocket

### Rocket Validation Rules
- `name`: required, non-empty string
- `range`: one of `suborbital`, `orbital`, `moon`, `mars`
- `capacity`: integer between 1 and 10

## Environment
- Code and documentation must be in English.
- Chat responses must be in the language of the user prompt.
- Sacrifice grammar for conciseness in responses.
- This is a windows environment using git bash terminal.
- My default branch is `main`.
