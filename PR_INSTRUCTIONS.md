# 📋 Istruzioni per Pull Request e Merge

## 🔗 Crea Pull Request

Usa il seguente comando per creare la PR:

```bash
gh pr create --title "feat: Nome inventario modificabile e persistente" --body "$(cat <<'EOF'
## 📝 Descrizione

Aggiunta funzionalità per rendere il nome dell'inventario modificabile e persistente nel database. Gli utenti possono ora personalizzare il nome del proprio inventario per identificarlo più facilmente quando lavorano con più UUID.

## ✨ Funzionalità Implementate

### Backend
- ✅ Aggiunto campo `name` alla tabella `inventories`
- ✅ Migrazione automatica del database per compatibilità retroattiva
- ✅ Endpoint `GET /api/:uuid/info` - Recupera informazioni inventario
- ✅ Endpoint `PUT /api/:uuid/name` - Aggiorna nome inventario
- ✅ Validazione server-side (nome obbligatorio, max 100 caratteri)

### Frontend
- ✅ Pulsante di modifica accanto al titolo dell'inventario
- ✅ Modifica inline con input dedicato
- ✅ Salvataggio con Enter o blur
- ✅ Annullamento con Escape
- ✅ Notifiche toast per feedback utente
- ✅ Design responsive e accessibile

## 🎯 Caratteristiche

- **Nome di default**: "Inventario Magazzino" per nuovi inventari
- **Persistenza**: Il nome è salvato nel database SQLite
- **Migrazione**: Compatibilità retroattiva con database esistenti
- **UX ottimizzata**: Feedback visivo e interazioni intuitive
- **PWA compatible**: Funziona perfettamente con il Service Worker esistente

## 🧪 Test Eseguiti

- ✅ Endpoint API testati con successo
- ✅ Persistenza verificata
- ✅ Migrazione database testata
- ✅ Compatibilità con database esistenti

## 📦 Commit Inclusi

1. \`feat: aggiungi funzionalità di modifica nome inventario\`
   - Implementazione completa backend e frontend

2. \`fix: aggiungi migrazione database per colonna 'name'\`
   - Risolve compatibilità con database esistenti
   - Migrazione automatica con PRAGMA table_info

## 🔄 Migrazione Database

La migrazione viene eseguita automaticamente all'avvio del server:
- Controlla se la colonna \`name\` esiste
- La aggiunge solo se necessario
- Imposta il valore di default per inventari esistenti
- Idempotente e sicura

## 📸 Come Usare

1. Aprire un inventario
2. Cliccare sull'icona matita accanto al titolo
3. Modificare il nome
4. Premere Enter o cliccare fuori per salvare
5. Premere Escape per annullare
EOF
)" --head claude/continue-pwa-inventory-012a543GVV4cxWFuc58LuGpv --base main
```

## ✅ Merge della PR

Dopo aver creato la PR, esegui il merge:

```bash
# Opzione 1: Merge diretto dalla riga di comando
gh pr merge --merge --delete-branch

# Opzione 2: Merge tramite GitHub web interface
# Vai su https://github.com/marcosco/inventory-app/pulls
# Clicca sulla PR
# Clicca "Merge pull request"
# Conferma il merge
# Elimina il branch
```

## 🧹 Pulizia Locale

Dopo il merge, aggiorna il branch main locale:

```bash
git checkout main
git pull origin main
git branch -D claude/continue-pwa-inventory-012a543GVV4cxWFuc58LuGpv
```

---

## 📝 Riepilogo Modifiche

**Branch**: `claude/continue-pwa-inventory-012a543GVV4cxWFuc58LuGpv`

**File Modificati**:
- `server.js` - Backend API + migrazione database
- `public/index.html` - UI per modifica nome
- `public/app.js` - Logica frontend
- `public/style.css` - Stili per UI modifica nome

**Commit**: 2
1. `2115e77` - feat: aggiungi funzionalità di modifica nome inventario
2. `4bf169b` - fix: aggiungi migrazione database per colonna 'name'
