const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const { db } = require('../config/db');
const { auth } = require('../middleware/auth');

// GET settings (Public for branding)
router.get('/', (req, res) => {
    db.get(`SELECT * FROM system_settings WHERE id = 1`, [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || { company_name: 'MantenimientoApp', primary_color: '#3b82f6', logo_url: '', checklists: '{}' });
    });
});

// UPDATE settings
router.put('/', auth, (req, res) => {
    const { company_name, primary_color, logo_url, checklists } = req.body;
    db.run(`UPDATE system_settings SET company_name = ?, primary_color = ?, logo_url = ?, checklists = ? WHERE id = 1`,
        [company_name, primary_color, logo_url, checklists],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ updated: this.changes });
        }
    );
});

// VAPID PUBLIC KEY
router.get('/vapidPublicKey', (req, res) => {
    db.get(`SELECT vapid_public_key FROM system_settings WHERE id = 1`, (err, row) => {
        if (err || !row || !row.vapid_public_key) {
            // Generate if not exists (should already exist from app init)
            const keys = webpush.generateVAPIDKeys();
            db.run(`UPDATE system_settings SET vapid_public_key = ?, vapid_private_key = ? WHERE id = 1`, [keys.publicKey, keys.privateKey]);
            return res.json({ publicKey: keys.publicKey });
        }
        res.json({ publicKey: row.vapid_public_key });
    });
});

// SUBSCRIBE
const subscriptions = [];
router.post('/subscribe', (req, res) => {
    const subscription = req.body;
    subscriptions.push(subscription);
    res.status(201).json({});
});

module.exports = router;
