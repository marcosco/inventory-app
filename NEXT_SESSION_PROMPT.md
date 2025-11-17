# 🚀 Prompt per la Prossima Sessione - PWA Multi-Inventario

## 📊 Stato Attuale del Progetto

### ✅ Funzionalità Completate
- **Multi-inventario con UUID routing** - Ogni inventario ha un UUID unico
- **CRUD prodotti completo** - Aggiungi, modifica, elimina prodotti
- **PWA con Service Worker** - Funziona offline
- **Docker deployment ready** - Containerizzato e pronto per deploy
- **Mobile-first responsive design** - Ottimizzato per dispositivi mobili
- **Nome inventario modificabile** - Gli utenti possono personalizzare il nome

### 🏗️ Stack Tecnologico
- **Backend**: Node.js + Express + SQLite + better-sqlite3
- **Frontend**: Vanilla JavaScript (no framework)
- **PWA**: Service Worker per funzionalità offline
- **Database**: SQLite con migrazione automatica
- **Deploy**: Docker + docker-compose

---

## 💡 Idee per Nuove Funzionalità

### 🎯 Priorità Alta

#### 1. **Ricerca e Filtro Prodotti**
Aggiungere una barra di ricerca per filtrare i prodotti per nome in tempo reale.

**Implementazione**:
- Input di ricerca nella sezione prodotti
- Filtro client-side sui prodotti già caricati
- Evidenziazione del testo cercato
- Pulsante per pulire la ricerca

#### 2. **Ordinamento Prodotti**
Permettere agli utenti di ordinare i prodotti per diversi criteri.

**Criteri di ordinamento**:
- Nome (A-Z, Z-A)
- Quantità (crescente, decrescente)
- Data creazione (più recenti, più vecchi)

**Implementazione**:
- Dropdown o toggle buttons per selezione
- Persistenza della preferenza in localStorage
- Animazioni smooth per il riordino

#### 3. **Categorie Prodotti**
Organizzare i prodotti in categorie personalizzabili.

**Funzionalità**:
- Aggiungere campo `category` alla tabella products
- UI per creare/modificare categorie
- Filtro per categoria
- Visualizzazione raggruppata per categoria
- Colori personalizzati per categoria

#### 4. **Esportazione Dati**
Permettere l'esportazione dell'inventario in vari formati.

**Formati supportati**:
- CSV - Per Excel/Sheets
- JSON - Per backup/import
- PDF - Per stampa/archiviazione

**Implementazione**:
- Pulsante "Esporta" nella sezione prodotti
- Modal con scelta del formato
- Download automatico del file generato

#### 5. **Storico Modifiche**
Tracciare le modifiche alle quantità dei prodotti.

**Database**:
```sql
CREATE TABLE product_history (
  id INTEGER PRIMARY KEY,
  product_id INTEGER,
  old_quantity INTEGER,
  new_quantity INTEGER,
  changed_at DATETIME,
  change_type TEXT -- 'increase', 'decrease', 'set'
);
```

**UI**:
- Icona "cronologia" per ogni prodotto
- Modal con lista modifiche
- Grafici andamento quantità (opzionale)

---

### 🎨 Priorità Media

#### 6. **Tema Scuro (Dark Mode)**
Aggiungere supporto per tema scuro.

**Implementazione**:
- CSS custom properties per colori
- Toggle nel header
- Rilevamento preferenza sistema
- Persistenza in localStorage

#### 7. **Immagini Prodotti**
Permettere di associare immagini ai prodotti.

**Funzionalità**:
- Upload immagine prodotto
- Salvataggio in base64 o file system
- Thumbnail nella lista prodotti
- Modal per visualizzazione ingrandita

#### 8. **Codici a Barre / QR Code**
Generare e scansionare codici per prodotti.

**Funzionalità**:
- Generazione QR code per ogni prodotto
- Scansione QR per aggiunta veloce
- Link condivisibili per singolo prodotto

#### 9. **Notifiche Scorte Basse**
Avvisare quando un prodotto sta finendo.

**Implementazione**:
- Campo `min_quantity` per prodotto
- Badge rosso quando quantity < min_quantity
- Notifiche push PWA (opzionale)
- Sezione "Prodotti in esaurimento"

#### 10. **Multi-lingua (i18n)**
Supporto per più lingue.

**Lingue**:
- Italiano (default)
- Inglese
- Altre lingue a scelta

**Implementazione**:
- File JSON per traduzioni
- Rilevamento lingua browser
- Selector lingua nel UI

---

### 🌟 Priorità Bassa (Features Avanzate)

#### 11. **Autenticazione Utenti**
Sistema di login per inventari privati.

#### 12. **Condivisione Inventari**
Permettere condivisione read-only o collaborativa.

#### 13. **Analytics Dashboard**
Statistiche e grafici sull'inventario.

#### 14. **Import da File**
Importare prodotti da CSV/Excel.

#### 15. **API REST Documentata**
Swagger/OpenAPI per integrazioni esterne.

---

## 🎯 Prompt Suggerito per la Prossima Sessione

```
PWA Multi-Inventario - Sviluppo Nuove Funzionalità
Branch: main

Stack: Node.js + Express + SQLite + Vanilla JS + PWA

Stato attuale:
✅ CRUD prodotti completo
✅ UUID routing multi-inventario
✅ Nome inventario modificabile e persistente
✅ PWA con Service Worker
✅ Docker deployment ready
✅ Mobile-first responsive design

Prossimo sviluppo:
[SCEGLI UNA O PIÙ FUNZIONALITÀ TRA QUELLE ELENCATE IN NEXT_SESSION_PROMPT.md]

Esempio:
"Implementa la funzionalità di ricerca e filtro prodotti con barra di ricerca
in tempo reale, evidenziazione del testo cercato e pulsante per pulire.
Aggiungi anche l'ordinamento prodotti con criteri: nome A-Z/Z-A, quantità
crescente/decrescente. Mantieni le preferenze in localStorage."

Esegui questa modifica in un branch dedicato, testa la funzionalità,
e crea la PR per il merge in main.
```

---

## 📝 Note per lo Sviluppatore

### Convenzioni Progetto
- **Commit**: Usa conventional commits (feat:, fix:, docs:, etc.)
- **Branch**: Usa pattern `claude/feature-name-<session-id>`
- **Testing**: Testa sempre le API con curl prima del commit
- **Database**: Usa migrazioni con ALTER TABLE, non ricreare tabelle

### File Importanti
- `server.js` - Backend API
- `public/app.js` - Frontend logica
- `public/index.html` - UI structure
- `public/style.css` - Styling
- `public/service-worker.js` - PWA offline support
- `data/inventory.db` - Database SQLite (gitignored)

### Comandi Utili
```bash
# Sviluppo
npm start              # Avvia server (porta 3000)
npm run dev            # Avvia con nodemon (auto-reload)

# Docker
docker-compose up      # Avvia con Docker
docker-compose down    # Ferma container

# Database
sqlite3 data/inventory.db ".schema"     # Vedi schema
sqlite3 data/inventory.db "SELECT * FROM inventories;"  # Query

# Git
git checkout -b claude/feature-name-<id>  # Nuovo branch
git push -u origin <branch-name>          # Push branch
```

---

## 🎉 Buon Lavoro!

Questo progetto è ben strutturato e pronto per essere esteso. Scegli una o più funzionalità dalla lista sopra e divertiti a implementarle!

Ricorda di:
- ✅ Creare un branch dedicato per ogni feature
- ✅ Testare approfonditamente prima del commit
- ✅ Scrivere commit messages descrittivi
- ✅ Creare PR con descrizioni dettagliate
- ✅ Mantenere il codice pulito e ben commentato
