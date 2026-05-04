const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { auth } = require('../middleware/auth');
const multer = require('multer');
const XLSX = require('xlsx');

const upload = multer({ storage: multer.memoryStorage() });

router.get('/', auth, (req, res) => {
    db.all(`SELECT * FROM spare_parts`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.post('/', auth, (req, res) => {
    const { name, stock, min_stock, unit } = req.body;
    db.run(`INSERT INTO spare_parts (name, stock, min_stock, unit) VALUES (?, ?, ?, ?)`, [name, stock, min_stock, unit], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
    });
});

router.put('/:id', auth, (req, res) => {
    const { name, stock, min_stock, unit } = req.body;
    db.run(`UPDATE spare_parts SET name = ?, stock = ?, min_stock = ?, unit = ? WHERE id = ?`, [name, stock, min_stock, unit, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ updated: this.changes });
    });
});

router.delete('/:id', auth, (req, res) => {
    db.run(`DELETE FROM spare_parts WHERE id = ?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

router.post('/import', auth, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });
    try {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);
        
        db.serialize(() => {
            data.forEach(item => {
                db.run(`INSERT INTO spare_parts (name, stock, min_stock) VALUES (?, ?, ?)`, [item.Nombre || item.name, item.Stock || item.stock, item.Minimo || item.min_stock]);
            });
        });
        res.json({ success: true, count: data.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
