const express = require('express');
const { query } = require('../utils/db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;
    let where = [];
    let params = [];
    let idx = 1;

    if (search) {
      where.push(`(nama_produk ILIKE $${idx} OR sku ILIKE $${idx} OR brand ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const result = await query(
      `SELECT * FROM products ${whereClause} ORDER BY nama_produk LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    const countResult = await query(`SELECT COUNT(*) FROM products ${whereClause}`, params);
    res.json({ products: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { sku, nama_produk, harga, brand } = req.body;
    const result = await query(
      'INSERT INTO products (sku, nama_produk, harga, brand) VALUES ($1,$2,$3,$4) RETURNING *',
      [sku, nama_produk, harga, brand]
    );
    res.status(201).json({ product: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { sku, nama_produk, harga, brand } = req.body;
    const result = await query(
      'UPDATE products SET sku=$1, nama_produk=$2, harga=$3, brand=$4, updated_at=NOW() WHERE id=$5 RETURNING *',
      [sku, nama_produk, harga, brand, req.params.id]
    );
    res.json({ product: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
