const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { auth } = require('../middleware/auth');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage });

router.post('/', auth, upload.array('files'), (req, res) => {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No se subieron archivos' });
    const urls = req.files.map(f => `/uploads/${f.filename}`);
    res.json({ urls });
});

module.exports = router;
