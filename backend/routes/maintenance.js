const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { auth } = require('../middleware/auth');

// MAINTENANCE RECORDS
router.get('/', auth, (req, res) => {
    db.all(`SELECT r.*, m.name as machine_name, o.name as operator_name 
            FROM maintenance_records r 
            JOIN machines m ON r.machine_id = m.id 
            JOIN operators o ON r.operator_id = o.id 
            ORDER BY r.date DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.post('/', auth, (req, res) => {
    const { machine_id, type, operator_id, failure_details, start_date, end_date, downtime_hours, labor_cost, spare_parts_used_list, evidence_urls, signature_url, checklist_results } = req.body;
    const date = new Date().toISOString().split('T')[0];
    const spare_parts_json = JSON.stringify(spare_parts_used_list || []);
    const evidence_json = JSON.stringify(evidence_urls || []);
    const checklist_json = JSON.stringify(checklist_results || []);

    db.serialize(() => {
        db.run(`INSERT INTO maintenance_records (machine_id, type, operator_id, failure_details, start_date, end_date, date, downtime_hours, labor_cost, spare_parts_used, evidence_urls, signature_url, checklist_results) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [machine_id, type, operator_id, failure_details, start_date, end_date, date, downtime_hours, labor_cost, spare_parts_json, evidence_json, signature_url, checklist_json],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                
                // Update machine status, last maintenance and calculate NEXT maintenance
                db.get(`SELECT maint_period FROM machines WHERE id = ?`, [machine_id], (err, machine) => {
                    const period = machine?.maint_period || 30;
                    const lastDate = new Date(date);
                    lastDate.setDate(lastDate.getDate() + parseInt(period));
                    const nextDate = lastDate.toISOString().split('T')[0];

                    db.run(`UPDATE machines SET status = 'Operativa', last_maintenance = ?, next_maintenance = ? WHERE id = ?`, 
                        [date, nextDate, machine_id]);
                });
                
                // Update stock for spare parts
                if (spare_parts_used_list) {
                    spare_parts_used_list.forEach(part => {
                        db.run(`UPDATE spare_parts SET stock = stock - ? WHERE id = ?`, [part.quantity, part.id]);
                    });
                }
                res.json({ id: this.lastID });
            }
        );
    });
});

// DASHBOARD STATS
router.get('/stats', auth, async (req, res) => {
    try {
        const stats = {};
        
        // Ejecutamos las consultas de forma segura
        db.get("SELECT COUNT(*) as totalMachines FROM machines", (err, m) => {
            db.get("SELECT COUNT(*) as totalRecords FROM maintenance_records", (err, r) => {
                db.get("SELECT COUNT(*) as totalOperators FROM operators", (err, o) => {
                    db.get("SELECT COUNT(*) as totalSpareParts FROM spare_parts", (err, s) => {
                        db.get("SELECT SUM(downtime_hours) as totalDowntime, SUM(labor_cost) as totalCost FROM maintenance_records", (err, sums) => {
                            
                            db.all("SELECT type as name, COUNT(*) as value FROM maintenance_records GROUP BY type", (err, chart) => {
                                
                                db.all("SELECT id, name, next_maintenance, sector FROM machines WHERE next_maintenance IS NOT NULL", (err, machines) => {
                                    const today = new Date();
                                    const alerts = (machines || []).map(m => {
                                        const next = new Date(m.next_maintenance);
                                        const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
                                        let urgency = 'PRÓXIMO MES';
                                        if (diff < 0) urgency = 'CRÍTICO';
                                        else if (diff === 0) urgency = 'HOY';
                                        else if (diff <= 3) urgency = 'URGENTE';
                                        else if (diff <= 7) urgency = 'ESTA SEMANA';
                                        return { ...m, daysUntil: diff, urgency };
                                    }).filter(a => a.daysUntil <= 30);

                                    db.all("SELECT * FROM spare_parts WHERE stock <= min_stock", (err, parts) => {
                                        res.json({
                                            totalMachines: m?.totalMachines || 0,
                                            totalRecords: r?.totalRecords || 0,
                                            totalOperators: o?.totalOperators || 0,
                                            totalSpareParts: s?.totalSpareParts || 0,
                                            totalDowntime: sums?.totalDowntime || 0,
                                            totalCost: sums?.totalCost || 0,
                                            chartData: chart || [],
                                            alerts: alerts || [],
                                            stockAlerts: parts || []
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    } catch (e) {
        res.status(500).json({ error: 'Error al procesar estadísticas' });
    }
});

router.get('/dashboard/monthly', auth, (req, res) => {
    db.all(`SELECT strftime('%Y-%m', date) as month, type, COUNT(*) as count 
            FROM maintenance_records 
            GROUP BY month, type 
            ORDER BY month ASC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

module.exports = router;
