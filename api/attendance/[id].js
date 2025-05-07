const { Pool } = require('@neondatabase/serverless');
const jwt = require('jsonwebtoken');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      const result = await pool.query(`
        SELECT a.*, e.name AS employee_name
        FROM attendance a
        JOIN employees e ON a.employee_id = e.id
        WHERE a.id = $1
      `, [id]);
      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Attendance record not found' });
      }
      res.status(200).json(result.rows[0]);
    } else if (req.method === 'PUT') {
      const { employee_id, date, status } = req.body;
      if (!employee_id || !date || !status) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      const result = await pool.query(
        'UPDATE attendance SET employee_id = $1, date = $2, status = $3 WHERE id = $4 RETURNING *',
        [employee_id, date, status, id]
      );
      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Attendance record not found' });
      }
      res.status(200).json(result.rows[0]);
    } else if (req.method === 'DELETE') {
      const result = await pool.query('DELETE FROM attendance WHERE id = $1 RETURNING id', [id]);
      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Attendance record not found' });
      }
      res.status(204).end();
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('Attendance error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await pool.end();
  }
}