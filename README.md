# PrimeSchool Management System

Full-stack MVP for school administration.

## Stack

- `frontend`: Next.js App Router, TypeScript, plain CSS with shared design tokens
- `backend`: Django + Django REST Framework with JWT authentication
- Database: PostgreSQL

## Configuration

The backend reads its settings from `backend/.env`. Copy the template and fill it in:

```powershell
cd backend
Copy-Item .env.example .env
```

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection URL, preferred for Render deployments |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | PostgreSQL connection |
| `SECRET_KEY` | Django signing key — use a long random value in production |
| `DEBUG` | `True` locally, `False` in production |
| `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS` | Comma-separated lists |

The frontend uses `PRIMESCHOOL_API_URL` to proxy `/api/*` to Django. It defaults to `http://127.0.0.1:8000` for local development; set it to the deployed Django origin in the frontend's production environment. The previous `PRIMEX_API_URL` variable remains supported for existing deployments.

`.env` is git-ignored; never commit real credentials.

When `DATABASE_URL` is set, it takes precedence over the individual `DB_*`
variables. For Render, use the complete internal PostgreSQL URL supplied by
Render, including the full hostname and port when provided.

## Run locally

### Backend

Install Python 3.12+ and PostgreSQL, then:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
py create_database.py
py manage.py migrate
py manage.py runserver
```

`create_database.py` creates the database named in `.env` if it does not exist yet.

The API runs on `http://127.0.0.1:8000`.

### Render deployment

For a Django web service, set Render's **Root Directory** to `backend`. Use
`pip install -r requirements.txt` as the build command and
`python manage.py migrate && gunicorn config.wsgi:application` as the start
command. If the service remains rooted at the repository root, the root
`requirements.txt` delegates to `backend/requirements.txt`, but the start
command must run from the backend directory:
`cd backend && python manage.py migrate && gunicorn config.wsgi:application`.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. The frontend proxies `/api/*` to the backend, so both servers must be running. Both development and production use PostgreSQL; SQLite is not supported.

No demo records or shared demo credentials are created. Provision the first administrator through a controlled deployment procedure, then enter the school's real setup and operational records in the application.

The current MVP is for school staff operations. Parent/guardian contact records are maintained for school use, but parent and student sign-in portals and self-service account registration are not enabled. School profile and academic setup live under **Settings → School setup**.

## Managing user accounts

Sign in as an administrator and open **Users** in the sidebar (`/users`) to:

- create an account with a username, contact details and a role
- reveal what you typed with the eye icon next to any password field
- reset another person's password from the row's actions menu

School profile and academic setup are maintained from **Settings → School setup**. Operational tables provide row actions from the ellipsis menu.

Passwords must be at least 8 characters and are checked against Django's common-password and numeric-only validators. The same reveal toggle is on the sign-in screen.

To create the very first administrator from the command line:

```powershell
cd backend
py manage.py createsuperuser
```

If the Render service does not provide Shell access, provision a SaaS admin
during deployment. Add these temporary environment variables to the backend:

```env
PROVISION_SAAS_ADMIN=true
SAAS_ADMIN_USERNAME=your-admin-username
SAAS_ADMIN_EMAIL=your-admin@example.com
SAAS_ADMIN_PASSWORD=use-a-strong-password
```

Set the Render start command to:

```text
python manage.py migrate && python manage.py provision_saas_admin && gunicorn config.wsgi:application
```

If the service root is the repository root, use:

```text
cd backend && python manage.py migrate && python manage.py provision_saas_admin && gunicorn config.wsgi:application
```

After the deployment succeeds, remove the three `SAAS_ADMIN_*` variables and
set `PROVISION_SAAS_ADMIN=false`, then redeploy. The command is idempotent and
does not print or store the password.

## MVP phases

1. Authentication and role permissions
2. School, academic year, term, class, and subject setup
3. Student and parent records
4. Teacher records and assignments
5. Attendance capture and summaries
6. Exams, grading, and report cards
7. Timetable management
8. Fee structures, invoices, and payments
9. Dashboard, notifications, and exports
10. Audit logs, deployment, backups, and production hardening
