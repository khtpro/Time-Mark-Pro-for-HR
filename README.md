# Time Track - Employee Payroll & Time Management System

A portable, full-stack web application for tracking employee time logs and calculating payroll. Built with React (Frontend), Node.js/Express (Backend), and SQLite (Database).

## Features

- **Role-Based Access**: Admin dashboard for management, User dashboard for clock-in/out.
- **Time Tracking**: Log Morning In/Out, Afternoon In/Out, and Overtime.
- **Payroll Calculation**: Automated calculation of hours, overtime, and deductions.
- **Portable Database**: Uses a local SQLite file (`timetrack.db`), so no external database server is required.
- **Excel Export**: Export payroll reports to CSV.

## Prerequisites

- **Node.js**: Ensure you have Node.js installed (v18 or higher recommended).
- **NPM**: Comes with Node.js.

## Installation & Setup

1.  **Open the project folder** in your terminal.

2.  **Clean Install**:
    Since `package.json` has been updated, run the following command to install the new dependencies:
    ```bash
    npm install
    ```

## Running the Application

You can run both the Backend (Node.js/Express) and the Frontend (React/Vite) with a single command:

```bash
npm run dev
```

*   **Frontend**: Accessible at `http://localhost:5173`
*   **Backend**: Running at `http://localhost:3001`

*Note: The SQLite database file (`timetrack.db`) will be automatically created in the root directory upon the first run.*

## Default Login Credentials

When the database is first initialized, a default Admin account is created:

**Admin Access (Email Mode):**
- **Email**: `admin@admin.com`
- **Password**: `pass1234`

**Admin Access (PIN Mode):**
- **PIN**: `0000`

## Project Structure

- `server.ts`: Main entry point for the Node.js Express backend.
- `database.ts`: SQLite connection and table initialization.
- `src/`: React frontend source code.
    - `pages/`: Application views (Login, UserDashboard, AdminDashboard).
    - `services/api.ts`: Frontend service interacting with the backend API.
- `timetrack.db`: The local database file (created after running the app).

## Troubleshooting

- **Vite/Module Errors**: If you see errors about missing modules (e.g., `@vitejs/plugin-react`), ensure you ran `npm install` successfully.
- **Port in use**: If port 3001 or 5173 is busy, the app might fail to start. Ensure these ports are free.
- **Database errors**: If you encounter database schema errors after an update, simply delete `timetrack.db` and restart the server to regenerate it fresh.
