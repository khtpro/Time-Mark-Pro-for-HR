import sqlite3 from 'sqlite3';
import { User, Role } from './types';

const db = new sqlite3.Database('./timetrack.db', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initDb();
  }
});

const initDb = () => {
  db.serialize(() => {
    // Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      password TEXT,
      pin TEXT,
      birthday TEXT,
      role TEXT,
      hourlyRate REAL,
      overtimeRate REAL,
      createdAt TEXT
    )`);

    // Time Logs Table
    db.run(`CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      userId TEXT,
      date TEXT,
      morningIn TEXT,
      morningOut TEXT,
      afternoonIn TEXT,
      afternoonOut TEXT,
      overtimeIn TEXT,
      overtimeOut TEXT
    )`);

    // Payroll Extras Table
    db.run(`CREATE TABLE IF NOT EXISTS payroll_extras (
      userId TEXT PRIMARY KEY,
      daysWorked INTEGER,
      incentives REAL,
      cashAdvance REAL,
      lateUndertimeDeduction REAL,
      transportFee REAL,
      thirtyPercent REAL,
      manualRegularHours REAL,
      manualOvertimeHours REAL
    )`);

    // Seed Admin if empty
    db.get("SELECT count(*) as count FROM users", [], (err, row: any) => {
      if (row && row.count === 0) {
        const defaultAdmin: User = {
            id: 'admin-1',
            name: 'System Admin',
            email: 'admin@admin.com',
            password: 'pass1234',
            pin: '0000',
            birthday: '2000-01-01',
            role: Role.ADMIN,
            hourlyRate: 0,
            overtimeRate: 0,
            createdAt: new Date().toISOString(),
        };
        const stmt = db.prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        stmt.run(
            defaultAdmin.id, defaultAdmin.name, defaultAdmin.email, defaultAdmin.password,
            defaultAdmin.pin, defaultAdmin.birthday, defaultAdmin.role,
            defaultAdmin.hourlyRate, defaultAdmin.overtimeRate, defaultAdmin.createdAt
        );
        stmt.finalize();
        console.log("Seeded default admin user.");
      }
    });
  });
};

export default db;