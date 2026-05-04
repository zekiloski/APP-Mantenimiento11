const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { auth } = require('../middleware/auth');

// MACHINES
router.get('/', auth, (req, res) => {
    db.all(`SELECT * FROM machines`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.get('/:id', auth, (req, res) => {
    db.get(`SELECT * FROM machines WHERE id = ?`, [req.params.id], (err, machine) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!machine) return res.status(404).json({ error: 'Máquina no encontrada' });
        
        db.all(`SELECT r.*, o.name as operator_name 
                FROM maintenance_records r 
                LEFT JOIN operators o ON r.operator_id = o.id 
                WHERE r.machine_id = ? ORDER BY r.date DESC LIMIT 5`, 
        [req.params.id], (err, history) => {
            machine.history = history || [];
            res.json(machine);
        });
    });
});

router.post('/', auth, (req, res) => {
    const { name, machine_type, model, sector, internal_id, asset_code, voltage, pressure, status, purchase_date, last_maintenance, maint_period, image_url } = req.body;
    
    // Calcular automáticamente el próximo mantenimiento si hay una fecha base
    let next_maintenance = req.body.next_maintenance;
    if (!next_maintenance && last_maintenance && maint_period) {
        const last = new Date(last_maintenance);
        last.setDate(last.getDate() + parseInt(maint_period));
        next_maintenance = last.toISOString().split('T')[0];
    }

    db.run(`INSERT INTO machines (name, machine_type, model, sector, internal_id, asset_code, voltage, pressure, status, purchase_date, last_maintenance, next_maintenance, maint_period, image_url) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, machine_type, model, sector, internal_id, asset_code, voltage, pressure, status, purchase_date, last_maintenance, next_maintenance, maint_period, image_url],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

router.put('/:id', auth, (req, res) => {
    const m = req.body;
    const sql = `UPDATE machines SET 
        name=?, machine_type=?, model=?, sector=?, internal_id=?, 
        asset_code=?, voltage=?, pressure=?, status=?, purchase_date=?, 
        last_maintenance=?, next_maintenance=?, maint_period=?, image_url=? 
        WHERE id=?`;
    
    const params = [
        m.name || '', m.machine_type || '', m.model || '', m.sector || '', m.internal_id || '',
        m.asset_code || '', m.voltage || '', m.pressure || '', m.status || 'Operativa', m.purchase_date || '',
        m.last_maintenance || '', m.next_maintenance || '', m.maint_period || 30, m.image_url || '',
        req.params.id
    ];

    db.run(sql, params, function(err) {
        if (err) {
            console.error("ERROR EN UPDATE MACHINE:", err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json({ updated: this.changes });
    });
});

router.delete('/:id', auth, (req, res) => {
    db.serialize(() => {
        db.run(`DELETE FROM maintenance_records WHERE machine_id = ?`, [req.params.id]);
        db.run(`DELETE FROM machines WHERE id = ?`, [req.params.id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ deleted: this.changes });
        });
    });
});

module.exports = router;
