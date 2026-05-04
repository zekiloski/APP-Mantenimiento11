const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { auth } = require('../middleware/auth');

router.get('/', auth, (req, res) => {
    db.all(`SELECT * FROM operators`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.post('/', auth, (req, res) => {
    const { name, specialty } = req.body;
    db.run(`INSERT INTO operators (name, specialty) VALUES (?, ?)`, [name, specialty], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
    });
});

router.put('/:id', auth, (req, res) => {
    const { name, specialty } = req.body;
    db.run(`UPDATE operators SET name = ?, specialty = ? WHERE id = ?`, [name, specialty, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ updated: this.changes });
    });
});

router.delete('/:id', auth, (req, res) => {
    db.run(`DELETE FROM operators WHERE id = ?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

module.exports = router;
