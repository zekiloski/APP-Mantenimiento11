const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const XLSX = require('xlsx');
const webpush = require('web-push');
const cron = require('node-cron');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname);
      cb(null, 'IMG_' + Date.now() + ext)
    }
});
const upload = multer({ storage: storage });

// Web Push Configuration
const vapidKeys = webpush.generateVAPIDKeys();
// In a real app, these should be persistent and stored in env/db
webpush.setVapidDetails(
  'mailto:admin@mantenimientoapp.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);


const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
    } else {
        console.log('Connected to SQLite database');
        createTables();
    }
});

function createTables() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS machines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            status TEXT,
            model TEXT,
            machine_type TEXT,
            voltage TEXT,
            pressure TEXT,
            purchase_date TEXT,
            image_url TEXT,
            last_maintenance TEXT,
            next_maintenance TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS operators (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            specialty TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS spare_parts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            stock INTEGER
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS sectors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS maintenance_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            machine_id INTEGER,
            operator_id INTEGER,
            type TEXT,
            failure_details TEXT,
            date TEXT,
            start_date TEXT,
            end_date TEXT,
            next_maintenance TEXT,
            spare_parts_used TEXT
        )`);

        // Migrations fallbacks
        db.run('ALTER TABLE maintenance_records ADD COLUMN start_date TEXT', () => {});
        db.run('ALTER TABLE maintenance_records ADD COLUMN end_date TEXT', () => {});
        db.run('ALTER TABLE maintenance_records ADD COLUMN next_maintenance TEXT', () => {});
        db.run('ALTER TABLE maintenance_records ADD COLUMN evidence_url TEXT', () => {});
        db.run('ALTER TABLE machines ADD COLUMN next_maintenance TEXT', () => {});
        db.run('ALTER TABLE machines ADD COLUMN asset_code TEXT', () => {}); // Alphanumeric asset code
        db.run('ALTER TABLE machines ADD COLUMN sector TEXT', () => {}); // Sector of the machine
        db.run('ALTER TABLE spare_parts ADD COLUMN min_stock INTEGER', () => {}); // Minimum stock for alerts
        db.run('ALTER TABLE maintenance_records ADD COLUMN downtime_hours REAL', () => {});
        db.run('ALTER TABLE maintenance_records ADD COLUMN labor_cost REAL', () => {});
        db.run('ALTER TABLE maintenance_records ADD COLUMN checklist_results TEXT', () => {});
        db.run('ALTER TABLE system_settings ADD COLUMN checklists TEXT', () => {});

        db.run(`CREATE TABLE IF NOT EXISTS system_settings (
            id INTEGER PRIMARY KEY CHECK (id = 1), -- Only one row
            company_name TEXT,
            primary_color TEXT,
            logo_url TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS maintenance_spare_parts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            record_id INTEGER,
            part_id INTEGER,
            quantity INTEGER,
            FOREIGN KEY(record_id) REFERENCES maintenance_records(id),
            FOREIGN KEY(part_id) REFERENCES spare_parts(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS push_subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subscription_json TEXT UNIQUE
        )`);

        // Migrations fallbacks
        db.run('ALTER TABLE maintenance_records ADD COLUMN evidence_urls TEXT', () => {}); // Stored as JSON array
        db.run('ALTER TABLE maintenance_records ADD COLUMN signature_url TEXT', () => {});

        // Seed System Settings
        db.get("SELECT COUNT(*) AS count FROM system_settings", (err, row) => {
            if (row && row.count === 0) {
                db.run("INSERT INTO system_settings (id, company_name, primary_color, logo_url) VALUES (1, 'MantenimientoApp', '#3b82f6', '')");
            }
        });

        // Seed Users
        db.get("SELECT COUNT(*) AS count FROM users", (err, row) => {
            if (row && row.count === 0) {
                const stmt = db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");
                stmt.run('admin', 'admin123', 'Administrador');
                stmt.run('mecanico1', 'mec123', 'Mecánico');
                stmt.run('electrico1', 'elec123', 'Eléctrico');
                stmt.run('gral1', 'gral123', 'Mantenimiento General');
                stmt.finalize();
            }
        });
        
        // Seed Sectors
        db.get("SELECT COUNT(*) AS count FROM sectors", (err, row) => {
            if (row && row.count === 0) {
                const stmt = db.prepare("INSERT INTO sectors (name) VALUES (?)");
                ['Tornería', 'Frezado', 'Mecanizado', 'Envasado', 'Inyección', 'Montaje', 'Taller General'].forEach(s => stmt.run(s));
                stmt.finalize();
            }
        });
        
    });
}

// 7:00 AM Cron Job for Alarms
cron.schedule('0 7 * * *', () => {
    console.log('Running 7:00 AM maintenance check...');
    db.all(`SELECT id, name, next_maintenance FROM machines WHERE next_maintenance IS NOT NULL`, [], (err, rows) => {
        if (!err && rows) {
            const today = new Date().toISOString().split('T')[0];
            const overdue = rows.filter(m => m.next_maintenance <= today);
            
            if (overdue.length > 0) {
                const payload = JSON.stringify({
                    title: '🛠️ Alerta de Mantenimiento',
                    body: `Hay ${overdue.length} máquinas con mantenimiento vencido o programado para hoy.`
                });

                db.all(`SELECT subscription_json FROM push_subscriptions`, [], (err, subs) => {
                    if (!err && subs) {
                        subs.forEach(s => {
                            try {
                                const sub = JSON.parse(s.subscription_json);
                                webpush.sendNotification(sub, payload).catch(e => console.error(e));
                            } catch(e) {}
                        });
                    }
                });
            }
        }
    });
});

// ------ ROUTES ------

// Multer Upload
app.post('/api/upload', upload.array('files'), (req, res) => {
    if (!req.files || req.files.length === 0) return res.status(400).json({error: "No files uploaded"});
    const urls = req.files.map(f => '/uploads/' + f.filename);
    res.json({ urls });
});

// VAPID Public Key endpoint
app.get('/api/vapidPublicKey', (req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
});

// Subscribe to push notifications
app.post('/api/subscribe', (req, res) => {
    const subscription = req.body;
    db.run(`INSERT OR IGNORE INTO push_subscriptions (subscription_json) VALUES (?)`, [JSON.stringify(subscription)], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({});
    });
});

// System Settings
app.get('/api/settings', (req, res) => {
    db.get(`SELECT * FROM system_settings WHERE id = 1`, [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || { company_name: 'MantenimientoApp', primary_color: '#3b82f6', logo_url: '', checklists: '{}' });
    });
});

app.put('/api/settings', (req, res) => {
    const { company_name, primary_color, logo_url, checklists } = req.body;
    db.run(`UPDATE system_settings SET company_name = ?, primary_color = ?, logo_url = ?, checklists = ? WHERE id = 1`,
    [company_name, primary_color, logo_url, checklists || '{}'], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Auth
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT id, username, role FROM users WHERE username = ? AND password = ?`, [username, password], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(401).json({ error: 'Invalid credentials' });
        res.json({ message: 'Login successful', user: row });
    });
});

// -- Machines --
app.get('/api/machines', (req, res) => {
    db.all(`SELECT * FROM machines`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/machines/:id', (req, res) => {
    db.get(`SELECT * FROM machines WHERE id = ?`, [req.params.id], (err, machine) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!machine) return res.status(404).json({ error: 'Machine not found' });
        
        db.all(`
            SELECT r.*, o.name as operator_name 
            FROM maintenance_records r
            LEFT JOIN operators o ON r.operator_id = o.id
            WHERE r.machine_id = ? 
            ORDER BY r.date DESC 
            LIMIT 3
        `, [req.params.id], (err, history) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ ...machine, history: history || [] });
        });
    });
});

app.post('/api/machines', (req, res) => {
    const { name, status, model, machine_type, voltage, pressure, purchase_date, image_url, last_maintenance, sector, internal_id } = req.body;
    const query = `INSERT INTO machines (name, status, model, machine_type, voltage, pressure, purchase_date, image_url, last_maintenance, sector, internal_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
        name || '', 
        status || 'Operativa', 
        model || '', 
        machine_type || '', 
        voltage || '', 
        pressure || '', 
        purchase_date || null, 
        image_url || null, 
        last_maintenance || null, 
        sector || null, 
        internal_id || null
    ];
    
    db.run(query, params, function(err) {
        if (err) {
            console.error("SQL Error (POST):", err.message);
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: this.lastID });
    });
});

app.put('/api/machines/:id', (req, res) => {
    const { name, status, model, machine_type, voltage, pressure, purchase_date, image_url, last_maintenance, sector, internal_id } = req.body;
    const query = `UPDATE machines SET name = ?, status = ?, model = ?, machine_type = ?, voltage = ?, pressure = ?, purchase_date = ?, image_url = ?, last_maintenance = ?, sector = ?, internal_id = ? WHERE id = ?`;
    const params = [
        name || '', 
        status || 'Operativa', 
        model || '', 
        machine_type || '', 
        voltage || '', 
        pressure || '', 
        purchase_date || null, 
        image_url || null, 
        last_maintenance || null, 
        sector || null, 
        internal_id || null, 
        req.params.id
    ];
    
    db.run(query, params, function(err) {
        if (err) {
            console.error("SQL Error (PUT):", err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
    });
});

app.delete('/api/machines/:id', (req, res) => {
    db.run(`DELETE FROM machines WHERE id = ?`, req.params.id, function(err){
        if (err) return res.status(500).json({ error: err.message });
         res.json({ deleted: this.changes });
    });
});


// -- Sectors --
app.get('/api/sectors', (req, res) => {
    db.all(`SELECT * FROM sectors`, [], (err, rows) => res.json(rows));
});
app.post('/api/sectors', (req, res) => {
    db.run(`INSERT INTO sectors (name) VALUES (?)`, [req.body.name], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, ...req.body });
    });
});
app.put('/api/sectors/:id', (req, res) => {
    db.run(`UPDATE sectors SET name = ? WHERE id = ?`, [req.body.name, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ changes: this.changes });
    });
});
app.delete('/api/sectors/:id', (req, res) => {
    db.run(`DELETE FROM sectors WHERE id = ?`, req.params.id, function(err){
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

// -- Operators --
app.get('/api/operators', (req, res) => {
    db.all(`SELECT * FROM operators`, [], (err, rows) => res.json(rows));
});
app.post('/api/operators', (req, res) => {
    db.run(`INSERT INTO operators (name, specialty) VALUES (?, ?)`, [req.body.name, req.body.specialty], function(err) {
        res.json({ id: this.lastID, ...req.body });
    });
});
app.put('/api/operators/:id', (req, res) => {
    db.run(`UPDATE operators SET name = ?, specialty = ? WHERE id = ?`, [req.body.name, req.body.specialty, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ changes: this.changes });
    });
});
app.delete('/api/operators/:id', (req, res) => {
    db.run(`DELETE FROM operators WHERE id = ?`, req.params.id, function(err){
        if (err) return res.status(500).json({ error: err.message });
         res.json({ deleted: this.changes });
    });
});


// -- Spare Parts --
app.get('/api/spare_parts', (req, res) => {
    db.all(`SELECT * FROM spare_parts`, [], (err, rows) => res.json(rows));
});
app.post('/api/spare_parts', (req, res) => {
    db.run(`INSERT INTO spare_parts (name, stock, min_stock) VALUES (?, ?, ?)`, [req.body.name, req.body.stock, req.body.min_stock || 0], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, ...req.body });
    });
});
app.put('/api/spare_parts/:id', (req, res) => {
    db.run(`UPDATE spare_parts SET name = ?, stock = ?, min_stock = ? WHERE id = ?`, [req.body.name, req.body.stock, req.body.min_stock || 0, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ changes: this.changes });
    });
});
app.delete('/api/spare_parts/:id', (req, res) => {
    db.run(`DELETE FROM spare_parts WHERE id = ?`, req.params.id, function(err){
        if (err) return res.status(500).json({ error: err.message });
         res.json({ deleted: this.changes });
    });
});

// -- Excel Import Spare Parts --
app.post('/api/spare_parts/import', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    
    try {
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        db.serialize(() => {
            const stmt = db.prepare(`
                INSERT INTO spare_parts (name, stock) 
                VALUES (?, ?)
                ON CONFLICT(id) DO UPDATE SET stock = excluded.stock
            `); // Note: SQLite 3.24+ supports ON CONFLICT. For older, we'd use separate logic.
            
            // If name is the unique key, we should handle by name.
            // Let's use a more compatible approach: check if exists by name.
            
            data.forEach(row => {
                const name = row['Nombre'] || row['name'] || row['Repuesto'];
                const stock = parseInt(row['Stock'] || row['stock'] || 0, 10);
                
                if (name) {
                    db.get("SELECT id FROM spare_parts WHERE name = ?", [name], (err, existing) => {
                        if (existing) {
                            db.run("UPDATE spare_parts SET stock = ? WHERE id = ?", [stock, existing.id]);
                        } else {
                            db.run("INSERT INTO spare_parts (name, stock) VALUES (?, ?)", [name, stock]);
                        }
                    });
                }
            });
        });

        res.json({ success: true, count: data.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    }
});

// -- Maintenance Records --
app.get('/api/maintenance', (req, res) => {
    db.all(`SELECT m.*, mac.name as machine_name, op.name as operator_name 
            FROM maintenance_records m
            LEFT JOIN machines mac ON m.machine_id = mac.id
            LEFT JOIN operators op ON m.operator_id = op.id
            ORDER BY m.date DESC`, [], (err, rows) => res.json(rows));
});
app.post('/api/maintenance', (req, res) => {
    const { machine_id, operator_id, type, failure_details, start_date, end_date, next_days, spare_parts_used_list, evidence_urls, signature_url, downtime_hours, labor_cost, checklist_results } = req.body;
    
    let next_maintenance = null;
    if ((type === 'Preventivo' || type === 'Predictivo' || type === 'Mensual') && next_days) {
         let end = new Date(end_date || start_date);
         end.setDate(end.getDate() + parseInt(next_days, 10));
         next_maintenance = end.toISOString().split('T')[0];
    }

    db.run(`INSERT INTO maintenance_records (machine_id, operator_id, type, failure_details, date, start_date, end_date, next_maintenance, spare_parts_used, evidence_urls, signature_url, downtime_hours, labor_cost, checklist_results) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
    [machine_id, operator_id, type, failure_details, new Date().toISOString().split('T')[0], start_date, end_date, next_maintenance, '', JSON.stringify(evidence_urls || []), signature_url || null, downtime_hours || 0, labor_cost || 0, JSON.stringify(checklist_results || [])], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        const recordId = this.lastID;

        // Process Spare Parts List
        if (spare_parts_used_list && Array.isArray(spare_parts_used_list)) {
            spare_parts_used_list.forEach(p => {
                db.run("INSERT INTO maintenance_spare_parts (record_id, part_id, quantity) VALUES (?, ?, ?)", [recordId, p.id, p.quantity]);
                db.run("UPDATE spare_parts SET stock = stock - ? WHERE id = ?", [p.quantity, p.id]);
            });
        }
        
        let q = `UPDATE machines SET last_maintenance = ?`;
        let params = [end_date || start_date || null];
        if (next_maintenance) {
            q += `, next_maintenance = ?`;
            params.push(next_maintenance);
        }
        q += ` WHERE id = ?`;
        params.push(machine_id);
        
        db.run(q, params, () => {
            res.json({ id: recordId });
        });
    });
});

app.get('/api/machines/:id/parts_history', (req, res) => {
    const q = `
        SELECT msp.*, sp.name as part_name, mr.date, mr.type as record_type
        FROM maintenance_spare_parts msp
        JOIN maintenance_records mr ON msp.record_id = mr.id
        JOIN spare_parts sp ON msp.part_id = sp.id
        WHERE mr.machine_id = ?
        ORDER BY mr.date DESC
    `;
    db.all(q, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/dashboard', (req, res) => {
    db.serialize(() => {
        let metrics = { totalMachines: 0, totalOperators: 0, totalSpareParts: 0, totalRecords: 0, totalDowntime: 0, totalCost: 0, chartData: [] };
        db.get(`SELECT COUNT(*) as c FROM machines`, [], (err, row) => metrics.totalMachines = row ? row.c : 0);
        db.get(`SELECT COUNT(*) as c FROM operators`, [], (err, row) => metrics.totalOperators = row ? row.c : 0);
        db.get(`SELECT COUNT(*) as c FROM spare_parts`, [], (err, row) => metrics.totalSpareParts = row ? row.c : 0);
        db.get(`SELECT COUNT(*) as c, SUM(downtime_hours) as dh, SUM(labor_cost) as lc FROM maintenance_records`, [], (err, row) => {
            metrics.totalRecords = row ? row.c : 0;
            metrics.totalDowntime = row ? row.dh || 0 : 0;
            metrics.totalCost = row ? row.lc || 0 : 0;
            
            db.all(`SELECT type as name, COUNT(*) as value FROM maintenance_records GROUP BY type`, [], (err, rows) => {
                if(!err && rows) metrics.chartData = rows;
                
                const today = new Date().toISOString().split('T')[0];
                db.all(`SELECT id, name, next_maintenance, machine_type, sector FROM machines WHERE next_maintenance IS NOT NULL ORDER BY next_maintenance ASC`, [], (err, mRows) => {
                    let alerts = [];
                    if (!err && mRows) {
                       mRows.forEach(m => {
                           const nextDate = new Date(m.next_maintenance);
                           const t = new Date(today);
                           const diffDays = Math.ceil((nextDate - t) / (1000 * 60 * 60 * 24));
                           if (diffDays <= 30) {
                               let urgency, alert_type;
                               if (diffDays < 0) {
                                   alert_type = 'Vencido';
                                   urgency = diffDays < -7 ? 'CRÍTICO' : 'VENCIDO';
                               } else if (diffDays === 0) {
                                   alert_type = 'Hoy';
                                   urgency = 'HOY';
                               } else if (diffDays <= 3) {
                                   alert_type = 'Urgente';
                                   urgency = 'URGENTE';
                               } else if (diffDays <= 7) {
                                   alert_type = 'Próximo';
                                   urgency = 'ESTA SEMANA';
                               } else {
                                   alert_type = 'Programado';
                                   urgency = 'PRÓXIMO MES';
                               }
                               alerts.push({ ...m, daysUntil: diffDays, alert_type, urgency });
                           }
                       });
                    }
                    metrics.alerts = alerts;
                    
                    db.all(`SELECT * FROM spare_parts WHERE min_stock IS NOT NULL AND min_stock > 0 AND stock <= min_stock`, [], (err, sRows) => {
                        metrics.stockAlerts = (!err && sRows) ? sRows : [];
                        res.json(metrics);
                    });
                });
            });
        });
    });
});

// -- Monthly trend data for dashboard chart --
app.get('/api/dashboard/monthly', (req, res) => {
    db.all(`
        SELECT strftime('%Y-%m', COALESCE(start_date, date)) as month,
               type,
               COUNT(*) as count
        FROM maintenance_records
        WHERE COALESCE(start_date, date) >= date('now', '-6 months')
        GROUP BY month, type
        ORDER BY month ASC
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.listen(4000, '0.0.0.0', () => {
    console.log('Backend server running on http://0.0.0.0:4000');
});
