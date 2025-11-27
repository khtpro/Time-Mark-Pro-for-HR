import express from 'express';
import cors from 'cors';
import db from './database';
import { generateId, calculateHours } from './services/utils';
import { User, TimeLog, PayrollEntry, PayrollExtras, Role } from './types';

const app = express();
const PORT = 3001;

app.use(cors() as any);
app.use(express.json());

// --- USERS ---

app.get('/api/users', (req, res) => {
  db.all("SELECT * FROM users", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/users', (req, res) => {
  const user: User = req.body;
  const sql = `INSERT OR REPLACE INTO users (id, name, email, password, pin, birthday, role, hourlyRate, overtimeRate, createdAt) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [user.id, user.name, user.email, user.password, user.pin, user.birthday, user.role, user.hourlyRate, user.overtimeRate, user.createdAt];
  
  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "User saved", id: user.id });
  });
});

app.delete('/api/users/:id', (req, res) => {
  db.run("DELETE FROM users WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "User deleted" });
  });
});

// --- AUTH ---

app.post('/api/login/pin', (req, res) => {
  const { pin } = req.body;
  db.get("SELECT * FROM users WHERE pin = ?", [pin], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: "Invalid PIN" });
    res.json(row);
  });
});

app.post('/api/login/email', (req, res) => {
  const { email, password } = req.body;
  db.get("SELECT * FROM users WHERE email = ? AND password = ?", [email, password], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: "Invalid credentials" });
    res.json(row);
  });
});

// --- LOGS ---

app.get('/api/logs', (req, res) => {
    db.all("SELECT * FROM logs", [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
});

app.post('/api/logs', (req, res) => {
    const log: TimeLog = req.body;
    const sql = `INSERT OR REPLACE INTO logs (id, userId, date, morningIn, morningOut, afternoonIn, afternoonOut, overtimeIn, overtimeOut)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [log.id, log.userId, log.date, log.morningIn, log.morningOut, log.afternoonIn, log.afternoonOut, log.overtimeIn, log.overtimeOut];
    
    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Log saved" });
    });
});

app.get('/api/logs/today/:userId', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    db.get("SELECT * FROM logs WHERE userId = ? AND date = ?", [req.params.userId, today], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            res.json(row);
        } else {
            // Return empty structure
            res.json({
                id: generateId(),
                userId: req.params.userId,
                date: today,
                morningIn: null, morningOut: null, afternoonIn: null, afternoonOut: null, overtimeIn: null, overtimeOut: null
            });
        }
    });
});

// Clock Action Logic (Migrated from mockDb)
app.post('/api/clock', (req, res) => {
    const { userId, slot } = req.body;
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Get or Create Log
    db.get("SELECT * FROM logs WHERE userId = ? AND date = ?", [userId, today], (err, row: any) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let log = row;
        if (!log) {
            log = {
                id: generateId(),
                userId,
                date: today,
                morningIn: null, morningOut: null, afternoonIn: null, afternoonOut: null, overtimeIn: null, overtimeOut: null
            };
        }

        // 2. Validate Sequence
        if (slot === 'afternoonOut') {
            if (!log.afternoonIn && !log.morningIn) {
                 return res.status(400).json({ error: 'You must clock in (Morning or Afternoon) first.' });
            }
        } 
        else if (slot.toLowerCase().includes('out')) {
            const inSlot = slot.replace('Out', 'In');
            if (!log[inSlot]) return res.status(400).json({ error: `You must clock in (${inSlot}) first.` });
        }

        if (log[slot]) return res.status(400).json({ error: 'Already recorded for this slot.' });

        // 3. Update Log
        log[slot] = new Date().toISOString();

        const sql = `INSERT OR REPLACE INTO logs (id, userId, date, morningIn, morningOut, afternoonIn, afternoonOut, overtimeIn, overtimeOut)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const params = [log.id, log.userId, log.date, log.morningIn, log.morningOut, log.afternoonIn, log.afternoonOut, log.overtimeIn, log.overtimeOut];

        db.run(sql, params, function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json(log);
        });
    });
});

// --- PAYROLL ---

app.get('/api/payroll/extras/:userId', (req, res) => {
    db.get("SELECT * FROM payroll_extras WHERE userId = ?", [req.params.userId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || {
            userId: req.params.userId,
            daysWorked: 0,
            incentives: 0,
            cashAdvance: 0,
            lateUndertimeDeduction: 0,
            transportFee: 0,
            thirtyPercent: 0,
            manualRegularHours: null,
            manualOvertimeHours: null 
        });
    });
});

app.post('/api/payroll/extras', (req, res) => {
    const extra: PayrollExtras = req.body;
    const sql = `INSERT OR REPLACE INTO payroll_extras (userId, daysWorked, incentives, cashAdvance, lateUndertimeDeduction, transportFee, thirtyPercent, manualRegularHours, manualOvertimeHours)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [extra.userId, extra.daysWorked, extra.incentives, extra.cashAdvance, extra.lateUndertimeDeduction, extra.transportFee, extra.thirtyPercent, extra.manualRegularHours, extra.manualOvertimeHours];
    
    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Extras saved" });
    });
});

// Payroll Calculation (Migrated from mockDb)
app.get('/api/payroll/report', async (req, res) => {
    try {
        const usersPromise = new Promise<User[]>((resolve, reject) => db.all("SELECT * FROM users WHERE role = ?", [Role.USER], (err, rows) => err ? reject(err) : resolve(rows as User[])));
        const logsPromise = new Promise<TimeLog[]>((resolve, reject) => db.all("SELECT * FROM logs", [], (err, rows) => err ? reject(err) : resolve(rows as TimeLog[])));
        const extrasPromise = new Promise<PayrollExtras[]>((resolve, reject) => db.all("SELECT * FROM payroll_extras", [], (err, rows) => err ? reject(err) : resolve(rows as PayrollExtras[])));

        const [users, logs, allExtras] = await Promise.all([usersPromise, logsPromise, extrasPromise]);

        const report: PayrollEntry[] = users.map(user => {
            const userLogs = logs.filter(l => l.userId === user.id);
            const extras = allExtras.find(e => e.userId === user.id) || {
                userId: user.id, daysWorked: 0, incentives: 0, cashAdvance: 0, lateUndertimeDeduction: 0, transportFee: 0, thirtyPercent: 0
            };

            let calcRegHours = 0;
            let calcOvHours = 0;
            const uniqueDays = new Set<string>();

            userLogs.forEach(log => {
                if (log.morningIn && log.morningOut) calcRegHours += calculateHours(log.morningIn, log.morningOut);
                if (log.afternoonIn && log.afternoonOut) calcRegHours += calculateHours(log.afternoonIn, log.afternoonOut);
                
                // Auto-break logic
                if (log.morningIn && log.afternoonOut && !log.morningOut && !log.afternoonIn) {
                    const rawDiff = calculateHours(log.morningIn, log.afternoonOut);
                    calcRegHours += Math.max(0, rawDiff - 1); 
                }

                calcOvHours += calculateHours(log.overtimeIn, log.overtimeOut);
                if (log.morningIn || log.afternoonIn || log.overtimeIn) uniqueDays.add(log.date);
            });

            const finalRegHours = extras.manualRegularHours != null ? extras.manualRegularHours : calcRegHours;
            const finalOvHours = extras.manualOvertimeHours != null ? extras.manualOvertimeHours : calcOvHours;

            const regularPay = finalRegHours * user.hourlyRate;
            const overtimePay = finalOvHours * user.overtimeRate;
            const finalDays = extras.daysWorked > 0 ? extras.daysWorked : uniqueDays.size;

            const totalPay = (regularPay + overtimePay + extras.incentives + extras.transportFee) 
                           - (extras.cashAdvance + extras.lateUndertimeDeduction + extras.thirtyPercent);

            return {
                userId: user.id,
                userName: user.name,
                email: user.email,
                totalRegularHours: finalRegHours,
                totalOvertimeHours: finalOvHours,
                regularPay,
                overtimePay,
                daysWorked: finalDays,
                incentives: extras.incentives,
                cashAdvance: extras.cashAdvance,
                lateUndertimeDeduction: extras.lateUndertimeDeduction,
                transportFee: extras.transportFee,
                thirtyPercent: extras.thirtyPercent,
                totalPay
            };
        });

        res.json(report);

    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});