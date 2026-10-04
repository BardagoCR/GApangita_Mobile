# GApangita

GApangita is a **lost and found web application** for a school or campus environment. It lets users:

- search for lost or found items
- report new items
- upload item and claim proof images
- claim found items
- log in and manage authenticated actions

The repository is split into two parts:

1. **Backend**: a Flask API that handles authentication, item reporting, claims, and database access.
2. **Frontend**: a static HTML/CSS/JavaScript UI that connects to the API.

## What is in this repo

- `backend/app.py` – Flask server and API endpoints
- `backend/requirements.txt` – Python dependencies
- `backend/start.bat` – Windows launcher for the Flask server
- `backend/pip_install.bat` – installs the Python dependencies
- `database_setup_test.sql` – database schema, seed data, views, and stored procedures used by the current app
- `frontend/` – static pages and JavaScript for the browser UI
- `Implementation.md` – notes about current security and standards issues

## Tech stack

- **Backend:** Flask, Flask-Bcrypt, Flask-CORS, mysql-connector-python
- **Frontend:** plain HTML, CSS, and JavaScript
- **Database:** MySQL / MariaDB

## Prerequisites

Before running the app locally, make sure you have:

- Python 3.10+ installed
- `pip` available
- MySQL or MariaDB running locally (XAMPP is a common setup for this repo)
- A browser (Chrome, Edge, or Firefox)

## Database setup

The current backend is configured to connect to the database named `gapangita_db_test` using the credentials in `backend/app.py`.

### Recommended setup

1. Start MySQL / MariaDB in XAMPP.
2. Import `database_setup_test.sql` into your MySQL server.

If you are using the MySQL CLI, this is typically:

```bash
mysql -u root -p < database_setup_test.sql
```

If you are using phpMyAdmin, open the SQL tab and import `database_setup_test.sql`.

> This script creates the database, seed data, views, and stored procedures expected by the current backend.

## Python dependencies

Install the backend dependencies:

```bash
cd backend
pip install -r requirements.txt
```

On Windows, you can also run:

```bat
backend\pip_install.bat
```

## Run the backend

### Option 1: Manual start

```bash
cd backend
python app.py
```

If `python` is not recognized, try `py app.py`.

### Option 2: Windows batch file

```bat
backend\start.bat
```

The API will run on:

- `http://localhost:5000`

## Run the frontend

The frontend is **not served by Flask**. After starting the backend, open it in your browser.

If you are running this repo from XAMPP/`htdocs`, use:

- `http://localhost/GApangita/frontend/index.html`

If you prefer, you can also open the file directly:

- `frontend/index.html`

If you use VS Code, you can also open it with Live Server.

## Default login

The seeded test database includes a default admin account:

- **Username:** `Admin123`
- **Password:** `Admin123`

This is stored in `database_setup_test.sql`.

## How the app works

### Public browsing

You can browse the site and search for items without logging in.

### Authenticated actions

You must log in to:

- report items
- claim items
- access archive-related actions

The frontend sends requests to the Flask backend at `http://localhost:5000/api`.

## Notes about the current codebase

- The backend uses `debug=True` in `backend/app.py`, so it is intended for local development.
- Uploads are saved under `backend/uploads/`.
- The project currently has an `Implementation.md` file documenting security and standards issues that are still open.

## Troubleshooting

### `ModuleNotFoundError`

Run the dependency install again:

```bash
cd backend
pip install -r requirements.txt
```

### Database connection errors

- Confirm MySQL/MariaDB is running.
- Confirm the schema was imported with `database_setup_test.sql`.
- Confirm the database credentials in `backend/app.py` match your local MySQL setup.

### Frontend cannot reach backend

- Confirm the Flask server is running on `http://localhost:5000`.
- Confirm the frontend is loading from a browser context that can reach `localhost`.
- If you are opening files directly from disk, the browser should still be able to call `http://localhost:5000`.

### Login fails

- Make sure you imported `database_setup_test.sql`.
- Try the seeded account `Admin123` / `Admin123`.

## Suggested local workflow

1. Start MySQL / XAMPP
2. Import `database_setup_test.sql`
3. Install Python dependencies
4. Start Flask with `backend/start.bat` or `python app.py`
5. Open `http://localhost/GApangita/frontend/index.html` in your browser
6. Make sure the is no s in http://localhost/GApangita...
7. Log in using `Admin123` / `Admin123`
