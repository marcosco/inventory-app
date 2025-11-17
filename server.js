const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const { v4: uuidv4, validate: isValidUUID } = require('uuid');
const PDFDocument = require('pdfkit');
const WebSocket = require('ws');
const http = require('http');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Admin session tokens (in-memory storage)
// Structure: { token: { createdAt: timestamp } }
const adminTokens = new Map();
const ADMIN_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Create HTTP server
const server = http.createServer(app);

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

// Migrazione: aggiungi colonna 'name' se non esiste
try {
  // Controlla se la colonna esiste
  const tableInfo = db.prepare("PRAGMA table_info(inventories)").all();
  const hasNameColumn = tableInfo.some(col => col.name === 'name');

  if (!hasNameColumn) {
    console.log('🔄 Migrazione: aggiunta colonna name alla tabella inventories');
    db.exec(`ALTER TABLE inventories ADD COLUMN name TEXT NOT NULL DEFAULT 'Inventario Magazzino'`);
    console.log('✅ Migrazione completata');
  }
} catch (error) {
  console.error('❌ Errore durante la migrazione:', error);
  // Se la colonna esiste già, ignora l'errore
}

// WebSocket Server Setup
const wss = new WebSocket.Server({ server });

// Map to store WebSocket connections by inventory UUID
// Structure: { uuid: Set<WebSocket> }
const inventoryConnections = new Map();

wss.on('connection', (ws, req) => {
  let currentInventoryUUID = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // Handle subscription to inventory
      if (data.type === 'subscribe' && data.uuid) {
        // Unsubscribe from previous inventory if any
        if (currentInventoryUUID) {
          const connections = inventoryConnections.get(currentInventoryUUID);
          if (connections) {
            connections.delete(ws);
            if (connections.size === 0) {
              inventoryConnections.delete(currentInventoryUUID);
            }
          }
        }

        // Subscribe to new inventory
        currentInventoryUUID = data.uuid;
        if (!inventoryConnections.has(currentInventoryUUID)) {
          inventoryConnections.set(currentInventoryUUID, new Set());
        }
        inventoryConnections.get(currentInventoryUUID).add(ws);

        // Send confirmation
        ws.send(JSON.stringify({
          type: 'subscribed',
          uuid: currentInventoryUUID
        }));

        console.log(`📡 Client connesso all'inventario: ${currentInventoryUUID}`);
      }
    } catch (error) {
      console.error('Errore nel parsing del messaggio WebSocket:', error);
    }
  });

  ws.on('close', () => {
    // Remove connection from inventory
    if (currentInventoryUUID) {
      const connections = inventoryConnections.get(currentInventoryUUID);
      if (connections) {
        connections.delete(ws);
        if (connections.size === 0) {
          inventoryConnections.delete(currentInventoryUUID);
        }
      }
      console.log(`📡 Client disconnesso dall'inventario: ${currentInventoryUUID}`);
    }
  });

  ws.on('error', (error) => {
    console.error('Errore WebSocket:', error);
  });

  // Send initial connection message
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'WebSocket connesso'
  }));
});

// Helper function to notify all clients connected to an inventory
function notifyInventoryClients(uuid, event) {
  const connections = inventoryConnections.get(uuid);
  if (!connections) return;

  const message = JSON.stringify(event);
  connections.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });

  console.log(`📡 Notifica inviata a ${connections.size} client dell'inventario ${uuid}:`, event.type);
}

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

// GET /api/:uuid/info - Ottieni informazioni inventario
app.get('/api/:uuid/info', (req, res) => {
  try {
    const { uuid } = req.params;

    if (!isValidUUID(uuid)) {
      return res.status(400).json({ error: 'UUID non valido' });
    }

    const inventory = getOrCreateInventory(uuid);
    res.json({
      uuid: inventory.uuid,
      name: inventory.name || 'Inventario Magazzino',
      created_at: inventory.created_at
    });
  } catch (error) {
    console.error('Errore GET inventory info:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// PUT /api/:uuid/name - Aggiorna nome inventario
app.put('/api/:uuid/name', (req, res) => {
  try {
    const { uuid } = req.params;
    const { name } = req.body;

    if (!isValidUUID(uuid)) {
      return res.status(400).json({ error: 'UUID non valido' });
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Nome inventario richiesto' });
    }

    if (name.trim().length > 100) {
      return res.status(400).json({ error: 'Nome troppo lungo (max 100 caratteri)' });
    }

    const inventory = getOrCreateInventory(uuid);
    const update = db.prepare('UPDATE inventories SET name = ? WHERE id = ?');
    update.run(name.trim(), inventory.id);

    const updated = db.prepare('SELECT * FROM inventories WHERE id = ?').get(inventory.id);

    // Notify all connected clients
    notifyInventoryClients(uuid, {
      type: 'inventory:name-changed',
      data: {
        uuid: updated.uuid,
        name: updated.name
      }
    });

    res.json({
      uuid: updated.uuid,
      name: updated.name,
      created_at: updated.created_at
    });
  } catch (error) {
    console.error('Errore PUT inventory name:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

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

// GET /api/:uuid/products/search - Ricerca prodotti per nome
app.get('/api/:uuid/products/search', (req, res) => {
  try {
    const { uuid } = req.params;
    const { q } = req.query;

    if (!isValidUUID(uuid)) {
      return res.status(400).json({ error: 'UUID non valido' });
    }

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.json({ products: [] });
    }

    const inventory = getOrCreateInventory(uuid);
    const searchTerm = `%${q.trim()}%`;

    const products = db.prepare(
      'SELECT * FROM products WHERE inventory_id = ? AND name LIKE ? COLLATE NOCASE ORDER BY name ASC LIMIT 5'
    ).all(inventory.id, searchTerm);

    res.json({ products });
  } catch (error) {
    console.error('Errore search products:', error);
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

    // Notify all connected clients
    notifyInventoryClients(uuid, {
      type: 'product:added',
      data: { product }
    });

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

    // Notify all connected clients
    notifyInventoryClients(uuid, {
      type: 'product:updated',
      data: { product: updated }
    });

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

    // Notify all connected clients
    notifyInventoryClients(uuid, {
      type: 'product:deleted',
      data: { productId: parseInt(productId) }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Errore DELETE product:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// GET /api/:uuid/export/csv - Esporta inventario in CSV
app.get('/api/:uuid/export/csv', (req, res) => {
  try {
    const { uuid } = req.params;

    if (!isValidUUID(uuid)) {
      return res.status(400).json({ error: 'UUID non valido' });
    }

    const inventory = getOrCreateInventory(uuid);
    const products = db.prepare(
      'SELECT * FROM products WHERE inventory_id = ? ORDER BY name ASC'
    ).all(inventory.id);

    // Genera CSV
    let csv = 'Nome Prodotto,Quantità\n';
    products.forEach(product => {
      // Escape virgole e virgolette nel nome
      const escapedName = product.name.replace(/"/g, '""');
      csv += `"${escapedName}",${product.quantity}\n`;
    });

    const inventoryName = inventory.name || 'Inventario';
    const filename = `${inventoryName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv); // BOM per UTF-8
  } catch (error) {
    console.error('Errore export CSV:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// GET /api/:uuid/export/pdf - Esporta inventario in PDF
app.get('/api/:uuid/export/pdf', (req, res) => {
  try {
    const { uuid } = req.params;

    if (!isValidUUID(uuid)) {
      return res.status(400).json({ error: 'UUID non valido' });
    }

    const inventory = getOrCreateInventory(uuid);
    const products = db.prepare(
      'SELECT * FROM products WHERE inventory_id = ? ORDER BY name ASC'
    ).all(inventory.id);

    const inventoryName = inventory.name || 'Inventario';
    const filename = `${inventoryName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

    // Crea PDF
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // Header
    doc.fontSize(20).text(inventoryName, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Data: ${new Date().toLocaleDateString('it-IT')}`, { align: 'center' });
    doc.fontSize(10).text(`Totale prodotti: ${products.length}`, { align: 'center' });
    doc.moveDown(2);

    // Tabella
    if (products.length === 0) {
      doc.fontSize(12).text('Nessun prodotto nell\'inventario', { align: 'center' });
    } else {
      const tableTop = doc.y;
      const itemCodeX = 50;
      const itemNameX = 50;
      const quantityX = 450;

      // Header tabella
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('Prodotto', itemNameX, tableTop);
      doc.text('Quantità', quantityX, tableTop);
      doc.moveDown();

      // Linea separatore
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      // Righe prodotti
      doc.font('Helvetica').fontSize(10);
      products.forEach((product, i) => {
        const y = doc.y;

        // Controlla se serve nuova pagina
        if (y > 700) {
          doc.addPage();
          doc.y = 50;
        }

        doc.text(product.name, itemNameX, doc.y, { width: 370, continued: false });
        doc.text(product.quantity.toString(), quantityX, y);
        doc.moveDown(0.5);
      });
    }

    doc.end();
  } catch (error) {
    console.error('Errore export PDF:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// GET /api/:uuid/export/text - Esporta inventario in formato TESTO
app.get('/api/:uuid/export/text', (req, res) => {
  try {
    const { uuid } = req.params;

    if (!isValidUUID(uuid)) {
      return res.status(400).json({ error: 'UUID non valido' });
    }

    const inventory = getOrCreateInventory(uuid);
    const products = db.prepare(
      'SELECT * FROM products WHERE inventory_id = ? ORDER BY name ASC'
    ).all(inventory.id);

    const inventoryName = inventory.name || 'Inventario';
    const filename = `${inventoryName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.txt`;

    // Genera tabella ASCII
    let text = '';
    text += '='.repeat(60) + '\n';
    text += `  ${inventoryName}\n`;
    text += `  Data: ${new Date().toLocaleDateString('it-IT')}\n`;
    text += `  Totale prodotti: ${products.length}\n`;
    text += '='.repeat(60) + '\n\n';

    if (products.length === 0) {
      text += 'Nessun prodotto nell\'inventario\n';
    } else {
      // Calcola larghezza massima del nome prodotto
      const maxNameLength = Math.max(...products.map(p => p.name.length), 'Prodotto'.length);
      const nameWidth = Math.min(maxNameLength + 2, 40);
      const qtyWidth = 10;

      // Header tabella
      text += padRight('Prodotto', nameWidth) + ' | ' + padRight('Quantità', qtyWidth) + '\n';
      text += '-'.repeat(nameWidth) + '-+-' + '-'.repeat(qtyWidth) + '\n';

      // Righe prodotti
      products.forEach(product => {
        const name = product.name.length > nameWidth ? product.name.substring(0, nameWidth - 3) + '...' : product.name;
        text += padRight(name, nameWidth) + ' | ' + padRight(product.quantity.toString(), qtyWidth) + '\n';
      });

      text += '\n';
      text += `Totale articoli: ${products.reduce((sum, p) => sum + p.quantity, 0)}\n`;
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(text);
  } catch (error) {
    console.error('Errore export TEXT:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Helper function per padding testo
function padRight(str, length) {
  return str + ' '.repeat(Math.max(0, length - str.length));
}

// ============================================
// ADMIN ROUTES
// ============================================

// Helper: Generate random token
function generateAdminToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Helper: Verify admin token
function verifyAdminToken(token) {
  if (!token) return false;

  const session = adminTokens.get(token);
  if (!session) return false;

  // Check if token is expired
  const now = Date.now();
  if (now - session.createdAt > ADMIN_TOKEN_EXPIRY) {
    adminTokens.delete(token);
    return false;
  }

  return true;
}

// Middleware: Require admin authentication
function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];

  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Non autorizzato' });
  }

  next();
}

// POST /api/admin/login - Admin login
app.post('/api/admin/login', (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Password non valida' });
    }

    // Generate token
    const token = generateAdminToken();
    adminTokens.set(token, { createdAt: Date.now() });

    console.log('🔐 Admin login effettuato');

    res.json({
      success: true,
      token,
      expiresIn: ADMIN_TOKEN_EXPIRY
    });
  } catch (error) {
    console.error('Errore admin login:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// POST /api/admin/logout - Admin logout
app.post('/api/admin/logout', requireAdmin, (req, res) => {
  try {
    const token = req.headers['x-admin-token'];
    adminTokens.delete(token);

    console.log('🔐 Admin logout effettuato');

    res.json({ success: true });
  } catch (error) {
    console.error('Errore admin logout:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// GET /api/admin/inventories - Lista tutti gli inventari
app.get('/api/admin/inventories', requireAdmin, (req, res) => {
  try {
    const inventories = db.prepare('SELECT * FROM inventories ORDER BY created_at DESC').all();

    // Per ogni inventario, ottieni il conteggio prodotti e client connessi
    const inventoriesWithDetails = inventories.map(inventory => {
      // Conteggio prodotti
      const productCount = db.prepare(
        'SELECT COUNT(*) as count FROM products WHERE inventory_id = ?'
      ).get(inventory.id).count;

      // Client connessi
      const connections = inventoryConnections.get(inventory.uuid);
      const clientCount = connections ? connections.size : 0;

      // Totale quantità articoli
      const totalQuantity = db.prepare(
        'SELECT SUM(quantity) as total FROM products WHERE inventory_id = ?'
      ).get(inventory.id).total || 0;

      return {
        uuid: inventory.uuid,
        name: inventory.name || 'Inventario Magazzino',
        created_at: inventory.created_at,
        product_count: productCount,
        total_quantity: totalQuantity,
        connected_clients: clientCount
      };
    });

    res.json({
      inventories: inventoriesWithDetails,
      total: inventoriesWithDetails.length
    });
  } catch (error) {
    console.error('Errore GET admin inventories:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// DELETE /api/admin/inventories/:uuid - Elimina inventario
app.delete('/api/admin/inventories/:uuid', requireAdmin, (req, res) => {
  try {
    const { uuid } = req.params;

    if (!isValidUUID(uuid)) {
      return res.status(400).json({ error: 'UUID non valido' });
    }

    const inventory = db.prepare('SELECT * FROM inventories WHERE uuid = ?').get(uuid);

    if (!inventory) {
      return res.status(404).json({ error: 'Inventario non trovato' });
    }

    // Elimina tutti i prodotti (CASCADE dovrebbe gestirlo, ma facciamolo esplicitamente)
    db.prepare('DELETE FROM products WHERE inventory_id = ?').run(inventory.id);

    // Elimina l'inventario
    db.prepare('DELETE FROM inventories WHERE id = ?').run(inventory.id);

    // Chiudi connessioni WebSocket per questo inventario
    const connections = inventoryConnections.get(uuid);
    if (connections) {
      connections.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'inventory:deleted',
            message: 'Questo inventario è stato eliminato dall\'amministratore'
          }));
          client.close();
        }
      });
      inventoryConnections.delete(uuid);
    }

    console.log(`🗑️  Inventario eliminato: ${uuid} (${inventory.name})`);

    res.json({ success: true });
  } catch (error) {
    console.error('Errore DELETE admin inventory:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// GET /api/admin/stats - Statistiche generali
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  try {
    const totalInventories = db.prepare('SELECT COUNT(*) as count FROM inventories').get().count;
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    const totalConnections = Array.from(inventoryConnections.values())
      .reduce((sum, connections) => sum + connections.size, 0);

    res.json({
      total_inventories: totalInventories,
      total_products: totalProducts,
      total_connected_clients: totalConnections
    });
  } catch (error) {
    console.error('Errore GET admin stats:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Admin page route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Catch-all route per servire index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📦 Database: ${dbPath}`);
  console.log(`📡 WebSocket server ready for real-time sync`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  // Close all WebSocket connections
  wss.clients.forEach(client => {
    client.close();
  });
  wss.close();

  db.close();
  console.log('\n👋 Server chiuso');
  process.exit(0);
});
