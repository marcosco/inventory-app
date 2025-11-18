# 📦 Inventario Magazzino - PWA Multi-Inventario

Applicazione web progressiva (PWA) per la gestione di inventari magazzino multipli, identificati tramite UUID univoci.

## ✨ Caratteristiche

### Core
- **Multi-inventario**: Ogni inventario ha un UUID univoco nell'URL
- **Accesso diretto**: Chi conosce l'UUID può accedere all'inventario (no autenticazione)
- **PWA**: Installabile su dispositivi mobile e desktop
- **Offline-first**: Funziona anche senza connessione (Service Worker)
- **Responsive**: Design mobile-first ottimizzato per tutti i dispositivi
- **Persistenza**: Database SQLite per salvare tutti i dati

### Funzionalità Avanzate
- **🔄 Sincronizzazione Real-time**: WebSocket per aggiornamenti multi-utente in tempo reale
- **📊 Esportazione**: Esporta inventario in CSV, PDF o formato TESTO
- **🔍 Ricerca Prodotti**: Ricerca in tempo reale con filtro dinamico
- **📋 Ordinamento**: Ordina prodotti per nome, quantità o data
- **✏️ Autocomplete**: Suggerimenti intelligenti durante l'aggiunta prodotti (lookup)
- **📱 QR Code**: Genera e condividi QR code per accesso rapido all'inventario
- **🏷️ Nomi Personalizzati**: Rinomina gli inventari con nomi descrittivi
- **⏰ Timestamp**: Traccia data di creazione e ultima modifica degli inventari
- **🔐 Pannello Admin**: Dashboard amministrativo per gestire tutti gli inventari

## 🏗️ Architettura

### Backend
- **Node.js** + **Express**: Server HTTP
- **better-sqlite3**: Database SQLite sincrono e performante
- **uuid**: Generazione e validazione UUID v4
- **pdfkit**: Generazione PDF per export
- **ws**: WebSocket server per sincronizzazione real-time

### Frontend
- **HTML/CSS/JS vanilla**: Nessun framework, massima performance
- **Service Worker**: Caching e supporto offline
- **Manifest.json**: Configurazione PWA
- **QRCode.js**: Generazione QR code per condivisione
- **WebSocket Client**: Sincronizzazione real-time multi-utente

### Database
```sql
inventories (
  id INTEGER PRIMARY KEY,
  uuid TEXT UNIQUE NOT NULL,
  name TEXT DEFAULT 'Inventario Magazzino',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME
)

products (
  id INTEGER PRIMARY KEY,
  inventory_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inventory_id) REFERENCES inventories(id) ON DELETE CASCADE
)
```

## 🚀 Quick Start

### Prerequisiti
- Node.js 18+
- npm o yarn
- (Opzionale) Docker e Docker Compose

### Installazione e Avvio

#### Metodo 1: Node.js locale

```bash
# 1. Clona repository
git clone <repo-url>
cd inventory-app

# 2. Installa dipendenze
npm install

# 3. Avvia il server
npm start

# 4. Apri browser
open http://localhost:3000
```

Il server creerà automaticamente:
- Directory `data/` per il database
- File `data/inventory.db` con le tabelle necessarie

#### Metodo 2: Docker Compose (Consigliato per produzione)

```bash
# 1. Build e avvio
npm run docker:up

# oppure manualmente:
docker-compose up -d

# 2. Verifica logs
npm run docker:logs

# 3. Apri browser
open http://localhost:3000
```

Comandi Docker utili:
```bash
npm run docker:build    # Build immagine
npm run docker:up       # Avvia container in background
npm run docker:down     # Ferma e rimuovi container
npm run docker:logs     # Visualizza logs
```

### Sviluppo

```bash
# Installa nodemon (già incluso in devDependencies)
npm install

# Avvia in modalità sviluppo con auto-reload
npm run dev
```

## 📱 Come Funziona

### 1. Creazione Inventario
Visita `http://localhost:3000/` e verrai automaticamente reindirizzato a un nuovo UUID:
```
http://localhost:3000/f47ac10b-58cc-4372-a567-0e02b2c3d479
```

### 2. Personalizzazione Inventario
- **Rinomina**: Clicca l'icona matita accanto al titolo per personalizzare il nome
- **Nome predefinito**: "Inventario Magazzino" (modificabile in qualsiasi momento)

### 3. Gestione Prodotti
- **Aggiungi**: Inserisci nome e quantità, premi "Aggiungi"
  - **Autocomplete**: Suggerimenti automatici basati su prodotti esistenti
- **Modifica quantità**: Usa i pulsanti +/- per ogni prodotto
- **Elimina**: Clicca l'icona cestino (con conferma)
- **Ricerca**: Filtra prodotti in tempo reale con la barra di ricerca
- **Ordinamento**: Ordina per nome, quantità o data (crescente/decrescente)

### 4. Condivisione Inventario
- **Copia UUID**: Clicca il badge UUID in header
- **QR Code**: Genera un QR code scansionabile per condivisione rapida
- **URL completo**: Condividi `http://localhost:3000/f47ac10b-58cc-4372-a567-0e02b2c3d479`

Chiunque abbia questo link può accedere allo stesso inventario.

### 5. Esportazione Dati
Clicca "Esporta" per scaricare l'inventario in:
- **CSV**: Per Excel/Google Sheets
- **PDF**: Per stampa o archiviazione professionale
- **TESTO**: Per condivisione rapida (formato tabella ASCII)

### 6. Sincronizzazione Real-time
- **Multi-utente**: Più persone possono modificare lo stesso inventario simultaneamente
- **Aggiornamenti istantanei**: Le modifiche appaiono in tempo reale su tutti i dispositivi connessi
- **WebSocket**: Connessione persistente per sincronizzazione bidirezionale

### 7. Nuovo Inventario
Clicca "Nuovo Inventario" per generare un nuovo UUID e iniziare un inventario separato.

### 8. Pannello Amministrazione
Accedi a `http://localhost:3000/admin` per:
- Visualizzare tutti gli inventari del sistema
- Monitorare statistiche (totale inventari, prodotti, client connessi)
- Vedere ultima modifica e client attivi per inventario
- Eliminare inventari (con conferma)
- **Password predefinita**: `admin123` (modificabile via env `ADMIN_PASSWORD`)

## 🔌 API Endpoints

### Inventario

#### `GET /api/:uuid/info`
Ottieni informazioni sull'inventario.

**Risposta:**
```json
{
  "uuid": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "name": "Magazzino Principale",
  "created_at": "2025-11-15T10:30:00.000Z"
}
```

#### `PUT /api/:uuid/name`
Aggiorna il nome dell'inventario.

**Body:**
```json
{
  "name": "Magazzino Principale"
}
```

### Prodotti

#### `GET /api/:uuid/products`
Lista tutti i prodotti dell'inventario.

**Risposta:**
```json
{
  "products": [
    {
      "id": 1,
      "inventory_id": 1,
      "name": "Laptop Dell XPS 15",
      "quantity": 5,
      "created_at": "2025-11-15T10:30:00.000Z"
    }
  ]
}
```

#### `GET /api/:uuid/products/search?q=term`
Ricerca prodotti per nome (autocomplete).

**Query params:**
- `q`: Termine di ricerca (min 1 carattere)

**Risposta:**
```json
{
  "products": [
    {
      "id": 1,
      "name": "Laptop Dell XPS 15",
      "quantity": 5
    }
  ]
}
```

#### `POST /api/:uuid/products`
Aggiungi un nuovo prodotto.

**Body:**
```json
{
  "name": "Mouse Logitech",
  "quantity": 10
}
```

**Risposta:**
```json
{
  "product": {
    "id": 2,
    "inventory_id": 1,
    "name": "Mouse Logitech",
    "quantity": 10,
    "created_at": "2025-11-15T10:35:00.000Z"
  }
}
```

#### `PUT /api/:uuid/products/:productId`
Modifica quantità prodotto.

**Body:**
```json
{
  "quantity": 15
}
```

#### `DELETE /api/:uuid/products/:productId`
Elimina un prodotto.

**Risposta:**
```json
{
  "success": true
}
```

### Esportazione

#### `GET /api/:uuid/export/csv`
Esporta inventario in formato CSV.

**Risposta:** File CSV scaricabile

#### `GET /api/:uuid/export/pdf`
Esporta inventario in formato PDF.

**Risposta:** File PDF scaricabile

#### `GET /api/:uuid/export/text`
Esporta inventario in formato TESTO (tabella ASCII).

**Risposta:** File TXT scaricabile

### Amministrazione

#### `POST /api/admin/login`
Login amministratore.

**Body:**
```json
{
  "password": "admin123"
}
```

**Risposta:**
```json
{
  "success": true,
  "token": "abc123...",
  "expiresIn": 86400000
}
```

#### `POST /api/admin/logout`
Logout amministratore.

**Headers:** `X-Admin-Token: <token>`

#### `GET /api/admin/inventories`
Lista tutti gli inventari (richiede autenticazione).

**Headers:** `X-Admin-Token: <token>`

**Risposta:**
```json
{
  "inventories": [
    {
      "uuid": "f47ac10b-...",
      "name": "Magazzino Principale",
      "created_at": "2025-11-15T10:30:00.000Z",
      "updated_at": "2025-11-15T12:00:00.000Z",
      "product_count": 25,
      "total_quantity": 150,
      "connected_clients": 2
    }
  ],
  "total": 1
}
```

#### `DELETE /api/admin/inventories/:uuid`
Elimina un inventario (richiede autenticazione).

**Headers:** `X-Admin-Token: <token>`

#### `GET /api/admin/stats`
Statistiche generali (richiede autenticazione).

**Headers:** `X-Admin-Token: <token>`

**Risposta:**
```json
{
  "total_inventories": 10,
  "total_products": 250,
  "total_connected_clients": 5
}
```

### Sistema

#### `GET /health`
Health check endpoint per monitoring.

**Risposta:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-15T10:40:00.000Z"
}
```

### WebSocket

#### Connessione WebSocket
```javascript
const ws = new WebSocket('ws://localhost:3000');

// Subscribe to inventory updates
ws.send(JSON.stringify({
  type: 'subscribe',
  uuid: 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
}));
```

**Eventi ricevuti:**
- `product:added` - Nuovo prodotto aggiunto
- `product:updated` - Prodotto modificato
- `product:deleted` - Prodotto eliminato
- `inventory:name-changed` - Nome inventario modificato
- `inventory:deleted` - Inventario eliminato

## 🐳 Deployment

### Variabili d'Ambiente

```bash
NODE_ENV=production              # Modalità produzione
PORT=3000                        # Porta server (default: 3000)
DB_PATH=./data/inventory.db      # Path database SQLite
ADMIN_PASSWORD=admin123          # Password pannello admin (default: admin123)
```

### Docker Production

Il Dockerfile è ottimizzato per produzione:
- Multi-stage build per immagini leggere
- User non-root per sicurezza
- Health check integrato
- Gestione segnali con dumb-init

```bash
# Build
docker build -t inventory-app .

# Run
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --name inventory-app \
  inventory-app
```

### Persistenza Dati

I dati sono salvati in `./data/inventory.db`. In Docker, usa un volume:

```yaml
volumes:
  - ./data:/app/data
```

**Backup database:**
```bash
# Copia database
cp data/inventory.db data/inventory.backup.db

# Oppure da Docker
docker cp inventory-app:/app/data/inventory.db ./backup.db
```

## 🔒 Sicurezza

### Considerazioni
- **Nessuna autenticazione**: Chiunque con l'UUID può accedere
- **UUID come security**: Usa UUID lunghi e casuali (v4)
- **Validazione input**: Tutti gli input sono validati lato server
- **XSS Protection**: Escaping HTML nel frontend
- **SQL Injection**: Uso di prepared statements

### Best Practices
1. Non condividere UUID pubblicamente se contiene dati sensibili
2. Usa HTTPS in produzione (reverse proxy con Nginx/Caddy)
3. Implementa rate limiting per API in produzione
4. Backup regolari del database

## 📊 Performance

### Ottimizzazioni
- **Database**: Indici su `uuid` e `inventory_id`
- **Frontend**: Vanilla JS (no framework overhead)
- **Service Worker**: Cache-first per assets statici
- **Docker**: Alpine Linux per immagini leggere (~100MB)
- **WebSocket**: Connessioni persistenti per ridurre overhead HTTP
- **Client-side filtering**: Ricerca e ordinamento lato client per UX istantanea

### Scalabilità
Per traffic elevato:
- Usa PostgreSQL invece di SQLite
- Aggiungi Redis per caching e sessioni admin
- Deploy multipli dietro load balancer
- Implementa Redis pub/sub per WebSocket multi-istanza

## 🚀 Funzionalità Implementate

### Release 1.0 - Core Features
- ✅ Multi-inventario con UUID routing
- ✅ CRUD prodotti (Create, Read, Update, Delete)
- ✅ PWA installabile (offline-first)
- ✅ UI responsive mobile-first

### Release 2.0 - Advanced Features
- ✅ **Real-time Sync** (WebSocket): Sincronizzazione multi-utente istantanea
- ✅ **Export Multi-formato**: CSV, PDF, TESTO con formattazione professionale
- ✅ **Product Search**: Ricerca full-text in tempo reale con filtro client-side
- ✅ **Product Sorting**: 6 criteri di ordinamento (nome, quantità, data)
- ✅ **Autocomplete**: Lookup prodotti esistenti durante l'inserimento
- ✅ **QR Code Sharing**: Generazione QR code per condivisione rapida
- ✅ **Inventory Naming**: Nomi personalizzati per ogni inventario
- ✅ **Admin Dashboard**: Pannello amministrativo con autenticazione
  - Visualizzazione tutti gli inventari
  - Statistiche real-time (prodotti, client connessi)
  - Gestione inventari (elimina con conferma)
  - Monitoraggio ultima modifica
- ✅ **Enhanced Database**: Colonne `name` e `updated_at` per inventari
- ✅ **Migrazioni Auto**: Aggiornamento schema DB automatico

### In Roadmap
- 🔜 Importazione CSV/Excel
- 🔜 Barcode scanning
- 🔜 Notifiche push per stock basso
- 🔜 Report analytics e grafici
- 🔜 Role-based access control (RBAC)
- 🔜 API key per integrations

## 🛠️ Sviluppo

### Struttura File
```
inventory-app/
├── server.js              # Server Express + API + WebSocket
├── package.json           # Dipendenze
├── Dockerfile             # Container config
├── docker-compose.yml     # Orchestrazione
├── .dockerignore          # Esclusioni build
├── data/                  # Database SQLite (gitignored)
│   └── inventory.db
└── public/                # Frontend
    ├── index.html         # Template HTML principale
    ├── admin.html         # Pannello amministrazione
    ├── style.css          # Stili globali
    ├── app.js             # Logica frontend principale
    ├── admin.js           # Logica pannello admin
    ├── manifest.json      # PWA config
    └── service-worker.js  # Offline support
```

### Testing

```bash
# Test manuale
curl http://localhost:3000/health

# Test API
UUID="f47ac10b-58cc-4372-a567-0e02b2c3d479"

# Info inventario
curl http://localhost:3000/api/$UUID/info

# Rinomina inventario
curl -X PUT http://localhost:3000/api/$UUID/name \
  -H "Content-Type: application/json" \
  -d '{"name":"Magazzino Principale"}'

# Lista prodotti
curl http://localhost:3000/api/$UUID/products

# Ricerca prodotti (autocomplete)
curl "http://localhost:3000/api/$UUID/products/search?q=lap"

# Aggiungi prodotto
curl -X POST http://localhost:3000/api/$UUID/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Product","quantity":5}'

# Modifica quantità
curl -X PUT http://localhost:3000/api/$UUID/products/1 \
  -H "Content-Type: application/json" \
  -d '{"quantity":10}'

# Elimina prodotto
curl -X DELETE http://localhost:3000/api/$UUID/products/1

# Esporta CSV
curl -o inventory.csv http://localhost:3000/api/$UUID/export/csv

# Esporta PDF
curl -o inventory.pdf http://localhost:3000/api/$UUID/export/pdf

# Esporta TESTO
curl -o inventory.txt http://localhost:3000/api/$UUID/export/text

# Test Admin API
# Login
TOKEN=$(curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"admin123"}' | jq -r '.token')

# Lista inventari
curl http://localhost:3000/api/admin/inventories \
  -H "X-Admin-Token: $TOKEN"

# Statistiche
curl http://localhost:3000/api/admin/stats \
  -H "X-Admin-Token: $TOKEN"

# Elimina inventario
curl -X DELETE http://localhost:3000/api/admin/inventories/$UUID \
  -H "X-Admin-Token: $TOKEN"

# Logout
curl -X POST http://localhost:3000/api/admin/logout \
  -H "X-Admin-Token: $TOKEN"
```

## 🤝 Contribuire

1. Fork il repository
2. Crea feature branch (`git checkout -b feature/amazing-feature`)
3. Commit modifiche (`git commit -m 'Add amazing feature'`)
4. Push al branch (`git push origin feature/amazing-feature`)
5. Apri Pull Request

## 📝 License

MIT License - vedi file LICENSE per dettagli

## 🆘 Troubleshooting

### Errore: "Port 3000 already in use"
```bash
# Cambia porta
PORT=3001 npm start

# Oppure trova e ferma processo
lsof -ti:3000 | xargs kill
```

### Database locked
```bash
# Ferma tutti i processi che usano il DB
fuser -k data/inventory.db

# Rimuovi journal file
rm data/inventory.db-journal
```

### Service Worker non si aggiorna
```bash
# Chrome DevTools > Application > Service Workers > Unregister
# Poi ricarica con Shift+F5 (hard reload)
```

### Docker: Permission denied
```bash
# Assicurati che data/ sia scrivibile
chmod -R 777 data/

# O cambia owner
sudo chown -R 1001:1001 data/
```

## 📞 Supporto

Per bug, feature request o domande:
- Apri una issue su GitHub
- Email: support@example.com

---

**Fatto con ❤️ usando Node.js, Express, SQLite e vanilla JavaScript**
