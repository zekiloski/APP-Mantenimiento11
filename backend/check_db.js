const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');
db.all("SELECT COUNT(*) as count FROM machines", (err, rows) => {
    console.log('Machines:', rows[0].count);
    db.all("SELECT COUNT(*) as count FROM maintenance_records", (err, rows) => {
        console.log('Records:', rows[0].count);
        db.close();
    });
});
