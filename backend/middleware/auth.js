const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'mantenimiento-super-secret-key-2024';

const auth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Acceso no autorizado: Token faltante' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Acceso no autorizado: Token inválido' });
    }
};

module.exports = { auth, JWT_SECRET };
