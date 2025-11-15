# 📦 Inventario Magazzino - PWA Multi-Inventario

Applicazione web progressiva (PWA) per la gestione di inventari magazzino multipli, identificati tramite UUID univoci.

## ✨ Caratteristiche

- **Multi-inventario**: Ogni inventario ha un UUID univoco nell'URL
- **Accesso diretto**: Chi conosce l'UUID può accedere all'inventario (no autenticazione)
- **PWA**: Installabile su dispositivi mobile e desktop
- **Offline-first**: Funziona anche senza connessione (Service Worker)
- **Responsive**: Design mobile-first ottimizzato per tutti i dispositivi
- **Real-time updates**: Aggiornamenti ottimistici per una UX fluida
- **Persistenza**: Database SQLite per salvare tutti i dati

## 🏗️ Architettura

### Backend
- **Node.js** + **Express**: Server HTTP
- **better-sqlite3**: Database SQLite sincrono e performante
- **uuid**: Generazione e validazione UUID v4

### Frontend
- **HTML/CSS/JS vanilla**: Nessun framework, massima performance
- **Service Worker**: Caching e supporto offline
- **Manifest.json**: Configurazione PWA

### Database
```sql
inventories (id, uuid, created_at)
products (id, inventory_id, name, quantity, created_at)
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

### 2. Gestione Prodotti
- **Aggiungi**: Inserisci nome e quantità, premi "Aggiungi"
- **Modifica quantità**: Usa i pulsanti +/- per ogni prodotto
- **Elimina**: Clicca l'icona cestino (con conferma)

### 3. Condivisione Inventario
Copia l'UUID (pulsante in header) e condividi l'URL completo:
```
http://localhost:3000/f47ac10b-58cc-4372-a567-0e02b2c3d479
```

Chiunque abbia questo link può accedere allo stesso inventario.

### 4. Nuovo Inventario
Clicca "Nuovo Inventario" per generare un nuovo UUID e iniziare un inventario separato.

## 🔌 API Endpoints

Tutti gli endpoint richiedono un UUID valido nel path.

### `GET /api/:uuid/products`
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

### `POST /api/:uuid/products`
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

### `PUT /api/:uuid/products/:productId`
Modifica quantità prodotto.

**Body:**
```json
{
  "quantity": 15
}
```

### `DELETE /api/:uuid/products/:productId`
Elimina un prodotto.

**Risposta:**
```json
{
  "success": true
}
```

### `GET /health`
Health check endpoint per monitoring.

**Risposta:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-15T10:40:00.000Z"
}
```

## 🐳 Deployment

### Variabili d'Ambiente

```bash
NODE_ENV=production     # Modalità produzione
PORT=3000              # Porta server (default: 3000)
DB_PATH=./data/inventory.db  # Path database SQLite
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

### Scalabilità
Per traffic elevato:
- Usa PostgreSQL invece di SQLite
- Aggiungi Redis per caching
- Deploy multipli dietro load balancer

## 🛠️ Sviluppo

### Struttura File
```
inventory-app/
├── server.js              # Server Express + API
├── package.json           # Dipendenze
├── Dockerfile             # Container config
├── docker-compose.yml     # Orchestrazione
├── .dockerignore          # Esclusioni build
├── data/                  # Database SQLite (gitignored)
│   └── inventory.db
└── public/                # Frontend
    ├── index.html         # Template HTML
    ├── style.css          # Stili
    ├── app.js             # Logica frontend
    ├── manifest.json      # PWA config
    └── service-worker.js  # Offline support
```

### Testing

```bash
# Test manuale
curl http://localhost:3000/health

# Test API
UUID="f47ac10b-58cc-4372-a567-0e02b2c3d479"

# Lista prodotti
curl http://localhost:3000/api/$UUID/products

# Aggiungi prodotto
curl -X POST http://localhost:3000/api/$UUID/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Product","quantity":5}'
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
