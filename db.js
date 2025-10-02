const { Pool } = require('pg');

const pool = new Pool({
  user: 'driver',
  host: 'localhost',
  database: 'Tracker',
  password: 'Malabon',
  port: 5432,
});

module.exports = pool;

pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error(err);
  else console.log('PostgreSQL connected:', res.rows[0].now);
});
