// State
let currentUUID = null;
let products = [];
let ws = null;
let wsReconnectTimeout = null;
let wsReconnectAttempts = 0;
const WS_MAX_RECONNECT_ATTEMPTS = 10;
const WS_RECONNECT_DELAY = 2000;

// DOM Elements
const elements = {
  inventoryTitle: document.getElementById('inventoryTitle'),
  editTitleBtn: document.getElementById('editTitleBtn'),
  inventoryTitleInput: document.getElementById('inventoryTitleInput'),
  uuidDisplay: document.getElementById('uuidDisplay'),
  copyUuidBtn: document.getElementById('copyUuidBtn'),
  totalBadge: document.getElementById('totalBadge'),
  addProductForm: document.getElementById('addProductForm'),
  productName: document.getElementById('productName'),
  productQuantity: document.getElementById('productQuantity'),
  productsList: document.getElementById('productsList'),
  loadingState: document.getElementById('loadingState'),
  emptyState: document.getElementById('emptyState'),
  newInventoryBtn: document.getElementById('newInventoryBtn'),
  offlineMessage: document.getElementById('offlineMessage'),
  toastContainer: document.getElementById('toastContainer'),
  exportBtn: document.getElementById('exportBtn'),
  exportModal: document.getElementById('exportModal'),
  exportModalOverlay: document.getElementById('exportModalOverlay'),
  closeExportModal: document.getElementById('closeExportModal')
};

// Utility: Generate UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Utility: Validate UUID
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Utility: Get UUID from URL
function getUUIDFromURL() {
  const path = window.location.pathname;
  const uuid = path.substring(1); // Remove leading slash

  if (!uuid || uuid === '') {
    return null;
  }

  return isValidUUID(uuid) ? uuid : null;
}

// Utility: Truncate UUID for display
function truncateUUID(uuid) {
  if (!uuid) return '...';
  return `${uuid.substring(0, 8)}...${uuid.substring(uuid.length - 4)}`;
}

// Utility: Copy to clipboard
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('UUID copiato negli appunti!', 'success');
  } catch (err) {
    // Fallback per browser più vecchi
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showToast('UUID copiato negli appunti!', 'success');
    } catch (e) {
      showToast('Errore durante la copia', 'error');
    }
    document.body.removeChild(textarea);
  }
}

// Toast Notifications
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => {
      elements.toastContainer.removeChild(toast);
    }, 300);
  }, 3000);
}

// API Calls
async function fetchProducts() {
  try {
    const response = await fetch(`/api/${currentUUID}/products`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    products = data.products || [];
    renderProducts();
  } catch (error) {
    console.error('Errore nel caricamento dei prodotti:', error);
    showToast('Errore nel caricamento dei prodotti', 'error');
    renderProducts(); // Mostra empty state
  }
}

async function addProduct(name, quantity) {
  try {
    const response = await fetch(`/api/${currentUUID}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, quantity })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Errore durante l\'aggiunta');
    }

    const data = await response.json();
    products.push(data.product);
    products.sort((a, b) => a.name.localeCompare(b.name));
    renderProducts();
    showToast('Prodotto aggiunto con successo!', 'success');

    // Reset form
    elements.productName.value = '';
    elements.productQuantity.value = '1';
    elements.productName.focus();
  } catch (error) {
    console.error('Errore nell\'aggiunta del prodotto:', error);
    showToast(error.message || 'Errore nell\'aggiunta del prodotto', 'error');
  }
}

async function updateProductQuantity(productId, newQuantity) {
  // Update ottimistico
  const productIndex = products.findIndex(p => p.id === productId);
  if (productIndex === -1) return;

  const oldQuantity = products[productIndex].quantity;
  products[productIndex].quantity = newQuantity;
  renderProducts();

  try {
    const response = await fetch(`/api/${currentUUID}/products/${productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ quantity: newQuantity })
    });

    if (!response.ok) {
      throw new Error('Errore durante l\'aggiornamento');
    }

    const data = await response.json();
    products[productIndex] = data.product;
    renderProducts();
  } catch (error) {
    console.error('Errore nell\'aggiornamento:', error);
    // Rollback
    products[productIndex].quantity = oldQuantity;
    renderProducts();
    showToast('Errore nell\'aggiornamento della quantità', 'error');
  }
}

async function deleteProduct(productId, productName) {
  if (!confirm(`Sei sicuro di voler eliminare "${productName}"?`)) {
    return;
  }

  try {
    const response = await fetch(`/api/${currentUUID}/products/${productId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Errore durante l\'eliminazione');
    }

    products = products.filter(p => p.id !== productId);
    renderProducts();
    showToast('Prodotto eliminato', 'success');
  } catch (error) {
    console.error('Errore nell\'eliminazione:', error);
    showToast('Errore nell\'eliminazione del prodotto', 'error');
  }
}

// Inventory Name Functions
async function fetchInventoryInfo() {
  try {
    const response = await fetch(`/api/${currentUUID}/info`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    updateInventoryTitle(data.name || 'Inventario Magazzino');
  } catch (error) {
    console.error('Errore nel caricamento delle info inventario:', error);
    updateInventoryTitle('Inventario Magazzino');
  }
}

async function updateInventoryName(newName) {
  try {
    const response = await fetch(`/api/${currentUUID}/name`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: newName })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Errore durante l\'aggiornamento');
    }

    const data = await response.json();
    updateInventoryTitle(data.name);
    showToast('Nome inventario aggiornato!', 'success');
  } catch (error) {
    console.error('Errore nell\'aggiornamento del nome:', error);
    showToast(error.message || 'Errore nell\'aggiornamento del nome', 'error');
    // Ricarica il nome originale
    fetchInventoryInfo();
  }
}

function updateInventoryTitle(name) {
  elements.inventoryTitle.textContent = `📦 ${name}`;
}

function showTitleEdit() {
  const currentName = elements.inventoryTitle.textContent.replace('📦 ', '').trim();
  elements.inventoryTitleInput.value = currentName;
  elements.inventoryTitle.style.display = 'none';
  elements.editTitleBtn.style.display = 'none';
  elements.inventoryTitleInput.style.display = 'block';
  elements.inventoryTitleInput.focus();
  elements.inventoryTitleInput.select();
}

function hideTitleEdit() {
  elements.inventoryTitle.style.display = 'block';
  elements.editTitleBtn.style.display = 'inline-flex';
  elements.inventoryTitleInput.style.display = 'none';
}

function saveTitleEdit() {
  const newName = elements.inventoryTitleInput.value.trim();

  if (!newName) {
    showToast('Il nome non può essere vuoto', 'error');
    elements.inventoryTitleInput.value = elements.inventoryTitle.textContent.replace('📦 ', '').trim();
    return;
  }

  if (newName.length > 100) {
    showToast('Nome troppo lungo (max 100 caratteri)', 'error');
    return;
  }

  hideTitleEdit();
  updateInventoryName(newName);
}

// Render Functions
function renderProducts() {
  // Hide loading
  elements.loadingState.style.display = 'none';

  // Update total badge
  const total = products.length;
  elements.totalBadge.textContent = `${total} prodott${total === 1 ? 'o' : 'i'}`;

  // Show empty state if no products
  if (products.length === 0) {
    elements.emptyState.style.display = 'block';
    elements.productsList.innerHTML = '';
    return;
  }

  elements.emptyState.style.display = 'none';

  // Render products
  elements.productsList.innerHTML = products.map(product => `
    <div class="product-card">
      <div class="product-info">
        <div class="product-name">${escapeHtml(product.name)}</div>
        <div class="product-quantity">Quantità disponibile</div>
      </div>
      <div class="product-actions">
        <button
          class="btn-icon btn-decrease"
          onclick="handleDecreaseQuantity(${product.id}, ${product.quantity})"
          aria-label="Diminuisci quantità"
        >−</button>
        <span class="quantity-display">${product.quantity}</span>
        <button
          class="btn-icon btn-increase"
          onclick="handleIncreaseQuantity(${product.id}, ${product.quantity})"
          aria-label="Aumenta quantità"
        >+</button>
        <button
          class="btn-icon btn-delete"
          onclick="handleDeleteProduct(${product.id}, '${escapeHtml(product.name)}')"
          aria-label="Elimina prodotto"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// WebSocket Functions
function connectWebSocket() {
  if (!currentUUID) return;

  // Close existing connection if any
  if (ws) {
    ws.close();
  }

  // Clear any pending reconnect
  if (wsReconnectTimeout) {
    clearTimeout(wsReconnectTimeout);
    wsReconnectTimeout = null;
  }

  // Determine WebSocket protocol (ws:// or wss://)
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  console.log('🔌 Connessione WebSocket a:', wsUrl);

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('✅ WebSocket connesso');
    wsReconnectAttempts = 0;

    // Subscribe to current inventory
    ws.send(JSON.stringify({
      type: 'subscribe',
      uuid: currentUUID
    }));
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    } catch (error) {
      console.error('Errore nel parsing del messaggio WebSocket:', error);
    }
  };

  ws.onerror = (error) => {
    console.error('❌ Errore WebSocket:', error);
  };

  ws.onclose = () => {
    console.log('🔌 WebSocket disconnesso');
    ws = null;

    // Attempt to reconnect
    if (wsReconnectAttempts < WS_MAX_RECONNECT_ATTEMPTS) {
      wsReconnectAttempts++;
      const delay = WS_RECONNECT_DELAY * wsReconnectAttempts;
      console.log(`🔄 Tentativo di riconnessione ${wsReconnectAttempts}/${WS_MAX_RECONNECT_ATTEMPTS} tra ${delay}ms...`);

      wsReconnectTimeout = setTimeout(() => {
        connectWebSocket();
      }, delay);
    } else {
      console.error('❌ Impossibile riconnettersi al WebSocket dopo multipli tentativi');
      showToast('Connessione real-time interrotta. Ricarica la pagina.', 'error');
    }
  };
}

function handleWebSocketMessage(message) {
  console.log('📡 Messaggio WebSocket ricevuto:', message);

  switch (message.type) {
    case 'connected':
      console.log('✅ WebSocket connesso al server');
      break;

    case 'subscribed':
      console.log(`✅ Sottoscritto all'inventario: ${message.uuid}`);
      break;

    case 'product:added':
      handleProductAdded(message.data.product);
      break;

    case 'product:updated':
      handleProductUpdated(message.data.product);
      break;

    case 'product:deleted':
      handleProductDeleted(message.data.productId);
      break;

    case 'inventory:name-changed':
      handleInventoryNameChanged(message.data.name);
      break;

    default:
      console.warn('Tipo di messaggio WebSocket sconosciuto:', message.type);
  }
}

function handleProductAdded(product) {
  // Check if product already exists (to avoid duplicates)
  const exists = products.find(p => p.id === product.id);
  if (exists) return;

  products.push(product);
  products.sort((a, b) => a.name.localeCompare(b.name));
  renderProducts();
  showToast(`Nuovo prodotto aggiunto: ${product.name}`, 'info');
}

function handleProductUpdated(product) {
  const index = products.findIndex(p => p.id === product.id);
  if (index === -1) {
    // Product doesn't exist locally, add it
    products.push(product);
    products.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    // Update existing product
    products[index] = product;
  }
  renderProducts();
}

function handleProductDeleted(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  products = products.filter(p => p.id !== productId);
  renderProducts();
  showToast(`Prodotto eliminato: ${product.name}`, 'info');
}

function handleInventoryNameChanged(newName) {
  updateInventoryTitle(newName);
  showToast('Nome inventario aggiornato', 'info');
}

// Event Handlers (global functions for inline onclick)
function handleDecreaseQuantity(productId, currentQuantity) {
  const newQuantity = Math.max(0, currentQuantity - 1);
  updateProductQuantity(productId, newQuantity);
}

function handleIncreaseQuantity(productId, currentQuantity) {
  const newQuantity = currentQuantity + 1;
  updateProductQuantity(productId, newQuantity);
}

function handleDeleteProduct(productId, productName) {
  deleteProduct(productId, productName);
}

// Export Functions
function showExportModal() {
  elements.exportModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function hideExportModal() {
  elements.exportModal.style.display = 'none';
  document.body.style.overflow = '';
}

async function exportInventory(format) {
  try {
    hideExportModal();
    showToast(`Generazione ${format.toUpperCase()} in corso...`, 'info');

    const url = `/api/${currentUUID}/export/${format}`;

    // Crea un link nascosto per scaricare il file
    const a = document.createElement('a');
    a.href = url;
    a.download = ''; // Il nome file viene dall'header Content-Disposition
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      showToast(`File ${format.toUpperCase()} scaricato con successo!`, 'success');
    }, 500);
  } catch (error) {
    console.error('Errore durante l\'esportazione:', error);
    showToast('Errore durante l\'esportazione', 'error');
  }
}

// Initialize App
function initApp() {
  // Get or create UUID
  currentUUID = getUUIDFromURL();

  if (!currentUUID) {
    // Generate new UUID and redirect
    const newUUID = generateUUID();
    window.location.href = `/${newUUID}`;
    return;
  }

  // Display UUID
  elements.uuidDisplay.textContent = truncateUUID(currentUUID);

  // Load inventory info and products
  fetchInventoryInfo();
  fetchProducts();

  // Connect to WebSocket for real-time updates
  connectWebSocket();

  // Check online/offline status
  updateOnlineStatus();
}

// Online/Offline Detection
function updateOnlineStatus() {
  if (navigator.onLine) {
    elements.offlineMessage.style.display = 'none';
  } else {
    elements.offlineMessage.style.display = 'block';
  }
}

window.addEventListener('online', () => {
  updateOnlineStatus();
  // Reconnect WebSocket when coming back online
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    connectWebSocket();
  }
});

window.addEventListener('offline', () => {
  updateOnlineStatus();
});

// Close WebSocket on page unload
window.addEventListener('beforeunload', () => {
  if (ws) {
    ws.close();
  }
});

// Event Listeners
elements.copyUuidBtn.addEventListener('click', () => {
  copyToClipboard(currentUUID);
});

elements.addProductForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = elements.productName.value.trim();
  const quantity = parseInt(elements.productQuantity.value) || 1;

  if (!name) {
    showToast('Inserisci il nome del prodotto', 'error');
    return;
  }

  if (quantity < 0) {
    showToast('La quantità deve essere positiva', 'error');
    return;
  }

  addProduct(name, quantity);
});

elements.newInventoryBtn.addEventListener('click', () => {
  if (confirm('Creare un nuovo inventario? Verrai reindirizzato a un nuovo URL.')) {
    const newUUID = generateUUID();
    window.location.href = `/${newUUID}`;
  }
});

// Inventory title edit listeners
elements.editTitleBtn.addEventListener('click', () => {
  showTitleEdit();
});

elements.inventoryTitleInput.addEventListener('blur', () => {
  saveTitleEdit();
});

elements.inventoryTitleInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    saveTitleEdit();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    hideTitleEdit();
  }
});

// Export modal listeners
elements.exportBtn.addEventListener('click', () => {
  showExportModal();
});

elements.closeExportModal.addEventListener('click', () => {
  hideExportModal();
});

elements.exportModalOverlay.addEventListener('click', () => {
  hideExportModal();
});

// Export format selection listeners
document.querySelectorAll('.export-option-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const format = btn.getAttribute('data-format');
    exportInventory(format);
  });
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && elements.exportModal.style.display === 'flex') {
    hideExportModal();
  }
});

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registrato:', registration.scope);
      })
      .catch(error => {
        console.error('Errore nella registrazione del Service Worker:', error);
      });
  });
}

// Start app
initApp();
