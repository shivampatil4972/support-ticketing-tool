# Support Ticketing Tool

## Overview
A client-facing support ticketing platform built with React, Express, and MySQL. The application supports clients, agents, and admins with role-based access control, ticket lifecycle management, internal notes, file attachments, email notifications, and SLA handling.

## Features
- Authentication with JWT and bcrypt
- Role-based access control for clients, agents, and admins
- Ticket creation, replies, internal notes, status updates, and assignment
- File attachments on tickets, replies, and internal notes (JPG, PNG, PDF, DOC, DOCX up to 5 MB), downloadable only by users who can view the ticket
- Email notifications for signup, ticket creation, replies, assignment, and approaching SLA deadlines
- SLA-based due dates and overdue tracking
- Responsive dashboard UI with search, pagination, charts, and status badges
- MySQL-backed persistence with normalized schema

## Folder Structure
- backend/ – Express API, middleware, routes, services, validations, jobs, tests, and schema
- frontend/ – React/Vite client application

## Installation
### Backend
1. cd backend
2. npm install
3. Create a MySQL database and import schema.sql
4. Copy .env.example to .env and update values
5. Create the first admin (see below)
6. npm run dev

### Frontend
1. cd frontend
2. npm install
3. Copy .env.example to .env if the API is not at http://localhost:5000/api
4. npm run dev

## Environment Variables
See backend/.env.example for the required configuration. Emails are skipped (and logged) until EMAIL_USER and EMAIL_PASS are set.

## Database Setup
Run the SQL script:
```bash
mysql -u root -p < backend/schema.sql
```

## Creating Users
Public signup always creates a **client** with its own organization. Agents and further admins are created by an admin from the Users page. The first admin is created from the command line:
```bash
cd backend
npm run create-admin -- "Admin Name" admin@example.com "password"
```

## Running Backend
```bash
cd backend
npm run dev
```

## Running Frontend
```bash
cd frontend
npm run dev
```

## Tests
The backend tests run the API against a fake database, so they need no MySQL server:
```bash
cd backend
npm test
```

## API Endpoints
List endpoints accept `page`, `limit` (max 100), and `search`, and return `{ tickets, pagination }`.

- POST /api/auth/signup
- POST /api/auth/login
- GET /api/tickets
- POST /api/tickets
- GET /api/tickets/assigned
- GET /api/tickets/unassigned
- GET /api/tickets/dashboard
- GET /api/tickets/client-dashboard
- GET /api/tickets/:id
- GET /api/tickets/:id/attachment
- GET /api/tickets/:id/comments/:commentId/attachment
- POST /api/tickets/:id/reply
- POST /api/tickets/:id/internal-note
- PATCH /api/tickets/:id/status
- PATCH /api/tickets/:id/assign
- DELETE /api/tickets/:id
- GET /api/admin/dashboard
- GET /api/admin/users
- POST /api/admin/users
- PUT /api/admin/users/:id
- DELETE /api/admin/users/:id
- GET /api/admin/clients
- POST /api/admin/clients
- PUT /api/admin/clients/:id
- DELETE /api/admin/clients/:id

## Screenshots
Placeholders coming soon.

## Future Improvements
- Add audit logs and analytics
- Record which user created each ticket (tickets currently belong to an organization)
- Persist SLA reminder state so reminders survive a restart
- Add frontend tests and linting
