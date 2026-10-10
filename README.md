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
- Agents can claim tickets from the unassigned queue; admins can assign, reassign, and unassign
- Ticket lists with search, filters (status, priority, overdue), and sorting (newest, oldest, due soonest, highest priority)
- Audit timeline on every ticket: who created, claimed, assigned, reopened it or changed its status, and when
- Status rules: a client reply moves a pending ticket back to open, clients cannot reply to a closed ticket, and clients can reopen a closed ticket for 7 days (REOPEN_WINDOW_DAYS)
- In-app notifications (header bell) for new tickets, replies, assignments, status changes, reopens, and approaching SLA deadlines
- Performance dashboard for admins: first-response time, resolution time, and SLA hit rate, overall and per agent
- Responsive dashboard UI with pagination, charts, and status badges
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
5. npm run migrate
6. Create the first admin (see below)
7. npm run dev

### Frontend
1. cd frontend
2. npm install
3. Copy .env.example to .env if the API is not at http://localhost:5000/api
4. npm run dev

## Environment Variables
See backend/.env.example for the required configuration. Emails are skipped (and logged) until EMAIL_USER and EMAIL_PASS are set.

## Database Setup
Import the baseline schema, then apply the migrations:
```bash
mysql -u root -p < backend/schema.sql
cd backend
npm run migrate
```
`schema.sql` is the baseline. Every later schema change is a `.sql` file in `backend/migrations`; `npm run migrate` applies the ones that have not run yet, so run it again after pulling new code.

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

## Tests and Linting
The backend unit tests run the API against a fake database, so they need no MySQL server:
```bash
cd backend
npm test
npm run lint
```
The end-to-end test runs the full workflow for every role against your real MySQL server. It creates its own temporary database (`support_ticketing_e2e_tmp`) and drops it afterwards, so your data is not touched:
```bash
cd backend
npm run test:e2e
```
```bash
cd frontend
npm run lint
```

## Security Notes
- Uploads are checked by extension, MIME type, and file contents, and are deleted if the request is rejected.
- Rate limits apply per IP: login, signup (10 per hour by default), and a general ceiling on all /api requests. See backend/.env.example to change them.

## API Endpoints
List endpoints accept `page`, `limit` (max 100), `search`, `status`, `priority`, `sla=overdue`, and `sort` (`newest`, `oldest`, `due`, `priority`), and return `{ tickets, pagination }`.

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
- PATCH /api/tickets/:id/assign (`assigned_agent_id: null` unassigns)
- POST /api/tickets/:id/claim
- POST /api/tickets/:id/reopen
- DELETE /api/tickets/:id
- GET /api/notifications
- PATCH /api/notifications/read-all
- PATCH /api/notifications/:id/read
- GET /api/admin/dashboard
- GET /api/admin/performance
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
- Persist SLA reminder state so reminders survive a restart
- Live updates over WebSockets (notifications currently poll every 30 seconds)
- Add frontend tests
