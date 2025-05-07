const { Pool } = require('@neondatabase/serverless');
const jwt = require('jsonwebtoken');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

  try {
    if (req.method === 'GET') {
      const result = await pool.query('SELECT * FROM certificates ORDER BY created_at DESC');
      res.status(200).json(result.rows);
    } else if (req.method === 'POST') {
      const { name, start_date, end_date, type } = req.body;
      if (!name || !start_date || !end_date || !type) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      const result = await pool.query(
        'INSERT INTO certificates (name, start_date, end_date, type) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, start_date, end_date, type]
      );
      res.status(201).json(result.rows[0]);
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('Certificates error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await pool.end();
  }
}