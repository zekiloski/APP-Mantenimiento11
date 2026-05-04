const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { auth } = require('../middleware/auth');

router.get('/', auth, (req, res) => {
    db.all(`SELECT * FROM sectors`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.post('/', auth, (req, res) => {
    const { name } = req.body;
    db.run(`INSERT INTO sectors (name) VALUES (?)`, [name], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
    });
});

router.put('/:id', auth, (req, res) => {
    const { name } = req.body;
    db.run(`UPDATE sectors SET name = ? WHERE id = ?`, [name, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ updated: this.changes });
    });
});

router.delete('/:id', auth, (req, res) => {
    db.run(`DELETE FROM sectors WHERE id = ?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

module.exports = router;
