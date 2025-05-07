const { Pool } = require('@neondatabase/serverless');
const bcrypt = require('bcrypt');
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
      const result = await pool.query('SELECT id, email, created_at FROM admins WHERE id = $1', [id]);
      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Admin not found' });
      }
      res.status(200).json(result.rows[0]);
    } else if (req.method === 'PUT') {
      const { email, password } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      let query = 'UPDATE admins SET email = $1';
      const params = [email, id];
      if (password) {
        const passwordHash = await bcrypt.hash(password, 10);
        query += ', password_hash = $3';
        params.splice(1, 0, passwordHash);
      }
      query += ' WHERE id = $2 RETURNING id, email, created_at';

      const result = await pool.query(query, params);
      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Admin not found' });
      }
      res.status(200).json(result.rows[0]);
    } else if (req.method === 'DELETE') {
      const result = await pool.query('DELETE FROM admins WHERE id = $1 RETURNING id', [id]);
      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Admin not found' });
      }
      res.status(204).end();
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('Admins error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await pool.end();
  }
}