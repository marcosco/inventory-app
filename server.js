const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const { v4: uuidv4, validate: isValidUUID } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Database setup
const dbPath = process.env.DB_PATH || './data/inventory.db';
const fs = require('fs');
const dbDir = path.dirname(dbPath);

// Crea directory data se non esiste
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Inizializza database
db.exec(`
  CREATE TABLE IF NOT EXISTS inventories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventory_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inventory_id) REFERENCES inventories(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_inventory_uuid ON inventories(uuid);
  CREATE INDEX IF NOT EXISTS idx_product_inventory ON products(inventory_id);
`);

// Helper functions
function getOrCreateInventory(uuid) {
  let inventory = db.prepare('SELECT * FROM inventories WHERE uuid = ?').get(uuid);

  if (!inventory) {
    const insert = db.prepare('INSERT INTO inventories (uuid) VALUES (?)');
    const result = insert.run(uuid);
    inventory = { id: result.lastInsertRowid, uuid, created_at: new Date().toISOString() };
  }

  return inventory;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes

// GET /api/:uuid/products - Lista prodotti
app.get('/api/:uuid/products', (req, res) => {
  try {
    const { uuid } = req.params;

    if (!isValidUUID(uuid)) {
      return res.status(400).json({ error: 'UUID non valido' });
    }

    const inventory = getOrCreateInventory(uuid);
    const products = db.prepare(
      'SELECT * FROM products WHERE inventory_id = ? ORDER BY name ASC'
    ).all(inventory.id);

    res.json({ products });
  } catch (error) {
    console.error('Errore GET products:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// POST /api/:uuid/products - Aggiungi prodotto
app.post('/api/:uuid/products', (req, res) => {
  try {
    const { uuid } = req.params;
    const { name, quantity } = req.body;

    if (!isValidUUID(uuid)) {
      return res.status(400).json({ error: 'UUID non valido' });
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Nome prodotto richiesto' });
    }

    const qty = parseInt(quantity) || 1;
    if (qty < 0) {
      return res.status(400).json({ error: 'Quantità deve essere positiva' });
    }

    const inventory = getOrCreateInventory(uuid);
    const insert = db.prepare(
      'INSERT INTO products (inventory_id, name, quantity) VALUES (?, ?, ?)'
    );
    const result = insert.run(inventory.id, name.trim(), qty);

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ product });
  } catch (error) {
    console.error('Errore POST product:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// PUT /api/:uuid/products/:productId - Modifica quantità
app.put('/api/:uuid/products/:productId', (req, res) => {
  try {
    const { uuid, productId } = req.params;
    const { quantity } = req.body;

    if (!isValidUUID(uuid)) {
      return res.status(400).json({ error: 'UUID non valido' });
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 0) {
      return res.status(400).json({ error: 'Quantità non valida' });
    }

    const inventory = getOrCreateInventory(uuid);

    // Verifica che il prodotto appartenga all'inventario
    const product = db.prepare(
      'SELECT * FROM products WHERE id = ? AND inventory_id = ?'
    ).get(productId, inventory.id);

    if (!product) {
      return res.status(404).json({ error: 'Prodotto non trovato' });
    }

    const update = db.prepare('UPDATE products SET quantity = ? WHERE id = ?');
    update.run(qty, productId);

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);

    res.json({ product: updated });
  } catch (error) {
    console.error('Errore PUT product:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// DELETE /api/:uuid/products/:productId - Elimina prodotto
app.delete('/api/:uuid/products/:productId', (req, res) => {
  try {
    const { uuid, productId } = req.params;

    if (!isValidUUID(uuid)) {
      return res.status(400).json({ error: 'UUID non valido' });
    }

    const inventory = getOrCreateInventory(uuid);

    // Verifica che il prodotto appartenga all'inventario
    const product = db.prepare(
      'SELECT * FROM products WHERE id = ? AND inventory_id = ?'
    ).get(productId, inventory.id);

    if (!product) {
      return res.status(404).json({ error: 'Prodotto non trovato' });
    }

    const del = db.prepare('DELETE FROM products WHERE id = ?');
    del.run(productId);

    res.json({ success: true });
  } catch (error) {
    console.error('Errore DELETE product:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Catch-all route per servire index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📦 Database: ${dbPath}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close();
  console.log('\n👋 Server chiuso');
  process.exit(0);
});
