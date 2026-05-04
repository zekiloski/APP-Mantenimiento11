require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const webpush = require('web-push');
const { db, initDB } = require('./config/db');

// Route Imports
const authRoutes = require('./routes/auth');
const machineRoutes = require('./routes/machines');
const sectorRoutes = require('./routes/sectors');
const maintenanceRoutes = require('./routes/maintenance');
const operatorRoutes = require('./routes/operators');
const sparePartRoutes = require('./routes/spareParts');
const settingRoutes = require('./routes/settings');
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Init Database
initDB();

// Init VAPID Keys
db.get(`SELECT vapid_public_key, vapid_private_key FROM system_settings WHERE id = 1`, (err, row) => {
    if (row && row.vapid_public_key && row.vapid_private_key) {
        webpush.setVapidDetails('mailto:admin@mantenimiento.com', row.vapid_public_key, row.vapid_private_key);
    } else {
        const keys = webpush.generateVAPIDKeys();
        db.run(`UPDATE system_settings SET vapid_public_key = ?, vapid_private_key = ? WHERE id = 1`, [keys.publicKey, keys.privateKey], () => {
            webpush.setVapidDetails('mailto:admin@mantenimiento.com', keys.publicKey, keys.privateKey);
        });
    }
});

// API Routes
app.use('/api', authRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/sectors', sectorRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/operators', operatorRoutes);
app.use('/api/spare_parts', sparePartRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/upload', uploadRoutes);

// Dashboards - Usamos el mismo router de mantenimiento para las estadísticas
app.use('/api/dashboard', maintenanceRoutes);
// Permite llamar a /api/dashboard/ y /api/dashboard/monthly

// Servir frontend unificado
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Cualquier otra ruta que no sea API, sirve el index.html del frontend
app.get('*', (req, res) => {
    // Si la ruta empieza con /api, no enviamos el HTML (dejamos que falle o lo maneje otra ruta)
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API endpoint not found' });
    res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Sistema Industrial funcionando en puerto: ${PORT}`);
    console.log(`🌐 Listo para producción.`);
});
