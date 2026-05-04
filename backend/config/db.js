const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

const initDB = () => {
    db.serialize(() => {
        // Machines Table
        db.run(`CREATE TABLE IF NOT EXISTS machines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            machine_type TEXT,
            model TEXT,
            sector TEXT,
            internal_id TEXT,
            asset_code TEXT,
            voltage TEXT,
            pressure TEXT,
            status TEXT DEFAULT 'Operativa',
            purchase_date TEXT,
            last_maintenance TEXT,
            next_maintenance TEXT,
            maint_period INTEGER DEFAULT 30,
            image_url TEXT
        )`);

        // Maintenance Records Table
        db.run(`CREATE TABLE IF NOT EXISTS maintenance_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            machine_id INTEGER,
            type TEXT,
            operator_id INTEGER,
            failure_details TEXT,
            start_date TEXT,
            end_date TEXT,
            date TEXT,
            downtime_hours REAL,
            labor_cost REAL,
            spare_parts_used TEXT,
            evidence_urls TEXT,
            signature_url TEXT,
            checklist_results TEXT,
            FOREIGN KEY(machine_id) REFERENCES machines(id)
        )`);

        // Operators Table
        db.run(`CREATE TABLE IF NOT EXISTS operators (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            specialty TEXT
        )`);

        // Spare Parts Table
        db.run(`CREATE TABLE IF NOT EXISTS spare_parts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            stock INTEGER DEFAULT 0,
            min_stock INTEGER DEFAULT 0,
            unit TEXT DEFAULT 'uds'
        )`);

        // Sectors Table
        db.run(`CREATE TABLE IF NOT EXISTS sectors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE
        )`);

        // System Settings Table
        db.run(`CREATE TABLE IF NOT EXISTS system_settings (
            id INTEGER PRIMARY KEY DEFAULT 1,
            company_name TEXT DEFAULT 'MantenimientoApp',
            primary_color TEXT DEFAULT '#3b82f6',
            logo_url TEXT,
            checklists TEXT DEFAULT '{}',
            vapid_public_key TEXT,
            vapid_private_key TEXT
        )`);

        // Users Table for Auth
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT
        )`);

        // Seed initial data
        db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
            if (row.count === 0) {
                const salt = bcrypt.genSaltSync(10);
                const hashedAdmin = bcrypt.hashSync('admin123', salt);
                const hashedMec = bcrypt.hashSync('mec123', salt);

                db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['admin', hashedAdmin, 'Administrador']);
                db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['mecanico1', hashedMec, 'Mecánico']);
                db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['mecanico2', hashedMec, 'Mecánico']);
                console.log('✅ Usuarios iniciales creados.');
            }
        });

        db.get("SELECT COUNT(*) as count FROM system_settings", (err, row) => {
            if (row.count === 0) {
                const defaultChecklists = {
                    'Preventivo': ['Limpieza general', 'Lubricación de ejes', 'Revisión de niveles'],
                    'Diario': ['Verificar parada de emergencia', 'Limpieza de viruta', 'Control de presión de aire'],
                    'Mensual': ['Revisión de correas', 'Ajuste de tornillería', 'Limpieza de filtros'],
                    'Fin de año': ['Calibración completa', 'Cambio de aceite hidráulico', 'Pintura y tratamiento anticorrosivo']
                };
                db.run("INSERT INTO system_settings (id, company_name, checklists) VALUES (1, 'MantenimientoApp', ?)", [JSON.stringify(defaultChecklists)]);
            }
        });
        
        db.get("SELECT COUNT(*) as count FROM sectors", (err, row) => {
            if (row.count === 0) {
                ['Producción', 'Mecanizado', 'Mantenimiento', 'Inyección', 'Depósito'].forEach(s => {
                    db.run("INSERT INTO sectors (name) VALUES (?)", [s]);
                });
            }
        });
    });
};

module.exports = { db, initDB };
