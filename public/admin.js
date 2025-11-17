// Admin Dashboard JavaScript

// State
let adminToken = null;
let inventories = [];
let stats = {
  total_inventories: 0,
  total_products: 0,
  total_connected_clients: 0
};

// DOM Elements
const elements = {
  loginView: document.getElementById('loginView'),
  dashboardView: document.getElementById('dashboardView'),
  loginForm: document.getElementById('loginForm'),
  passwordInput: document.getElementById('password'),
  logoutBtn: document.getElementById('logoutBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  statTotalInventories: document.getElementById('statTotalInventories'),
  statTotalProducts: document.getElementById('statTotalProducts'),
  statConnectedClients: document.getElementById('statConnectedClients'),
  inventoriesTableContainer: document.getElementById('inventoriesTableContainer'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  toastContainer: document.getElementById('toastContainer')
};

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

// Loading Overlay
function showLoading() {
  elements.loadingOverlay.style.display = 'flex';
}

function hideLoading() {
  elements.loadingOverlay.style.display = 'none';
}

// Token Management
function saveToken(token) {
  adminToken = token;
  try {
    localStorage.setItem('admin-token', token);
  } catch (error) {
    console.error('Errore nel salvare il token:', error);
  }
}

function loadToken() {
  try {
    const token = localStorage.getItem('admin-token');
    if (token) {
      adminToken = token;
      return true;
    }
  } catch (error) {
    console.error('Errore nel caricare il token:', error);
  }
  return false;
}

function clearToken() {
  adminToken = null;
  try {
    localStorage.removeItem('admin-token');
  } catch (error) {
    console.error('Errore nel rimuovere il token:', error);
  }
}

// API Calls
async function login(password) {
  try {
    showLoading();

    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Errore durante il login');
    }

    saveToken(data.token);
    showDashboard();
    await loadDashboardData();
    showToast('Login effettuato con successo!', 'success');
  } catch (error) {
    console.error('Errore login:', error);
    showToast(error.message || 'Errore durante il login', 'error');
  } finally {
    hideLoading();
  }
}

async function logout() {
  try {
    showLoading();

    if (adminToken) {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: {
          'X-Admin-Token': adminToken
        }
      });
    }

    clearToken();
    showLogin();
    showToast('Logout effettuato', 'success');
  } catch (error) {
    console.error('Errore logout:', error);
    clearToken();
    showLogin();
  } finally {
    hideLoading();
  }
}

async function fetchStats() {
  try {
    const response = await fetch('/api/admin/stats', {
      headers: {
        'X-Admin-Token': adminToken
      }
    });

    if (response.status === 401) {
      clearToken();
      showLogin();
      showToast('Sessione scaduta. Effettua nuovamente il login.', 'error');
      return;
    }

    if (!response.ok) {
      throw new Error('Errore nel caricamento delle statistiche');
    }

    const data = await response.json();
    stats = data;
    renderStats();
  } catch (error) {
    console.error('Errore fetch stats:', error);
    showToast('Errore nel caricamento delle statistiche', 'error');
  }
}

async function fetchInventories() {
  try {
    const response = await fetch('/api/admin/inventories', {
      headers: {
        'X-Admin-Token': adminToken
      }
    });

    if (response.status === 401) {
      clearToken();
      showLogin();
      showToast('Sessione scaduta. Effettua nuovamente il login.', 'error');
      return;
    }

    if (!response.ok) {
      throw new Error('Errore nel caricamento degli inventari');
    }

    const data = await response.json();
    inventories = data.inventories || [];
    renderInventories();
  } catch (error) {
    console.error('Errore fetch inventories:', error);
    showToast('Errore nel caricamento degli inventari', 'error');
  }
}

async function deleteInventory(uuid, name) {
  if (!confirm(`Sei sicuro di voler eliminare l'inventario "${name}"?\n\nQuesta azione è irreversibile e eliminerà tutti i prodotti associati.`)) {
    return;
  }

  try {
    showLoading();

    const response = await fetch(`/api/admin/inventories/${uuid}`, {
      method: 'DELETE',
      headers: {
        'X-Admin-Token': adminToken
      }
    });

    if (response.status === 401) {
      clearToken();
      showLogin();
      showToast('Sessione scaduta. Effettua nuovamente il login.', 'error');
      return;
    }

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Errore durante l\'eliminazione');
    }

    showToast('Inventario eliminato con successo', 'success');
    await loadDashboardData();
  } catch (error) {
    console.error('Errore delete inventory:', error);
    showToast(error.message || 'Errore durante l\'eliminazione', 'error');
  } finally {
    hideLoading();
  }
}

// Dashboard Data Loading
async function loadDashboardData() {
  showLoading();
  try {
    await Promise.all([
      fetchStats(),
      fetchInventories()
    ]);
  } finally {
    hideLoading();
  }
}

// Rendering Functions
function renderStats() {
  elements.statTotalInventories.textContent = stats.total_inventories || 0;
  elements.statTotalProducts.textContent = stats.total_products || 0;
  elements.statConnectedClients.textContent = stats.total_connected_clients || 0;
}

function renderInventories() {
  if (inventories.length === 0) {
    elements.inventoriesTableContainer.innerHTML = `
      <div class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M20 7h-9"></path>
          <path d="M14 17H5"></path>
          <circle cx="17" cy="17" r="3"></circle>
          <circle cx="7" cy="7" r="3"></circle>
        </svg>
        <h3>Nessun inventario trovato</h3>
        <p>Gli inventari verranno creati automaticamente quando un utente visita un nuovo UUID.</p>
      </div>
    `;
    return;
  }

  const tableHtml = `
    <table class="inventories-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>UUID</th>
          <th>Prodotti</th>
          <th>Quantità Totale</th>
          <th>Client Connessi</th>
          <th>Ultima Modifica</th>
          <th>Creato</th>
          <th>Azioni</th>
        </tr>
      </thead>
      <tbody>
        ${inventories.map(inv => `
          <tr>
            <td>
              <div class="inventory-name">${escapeHtml(inv.name)}</div>
            </td>
            <td>
              <div class="inventory-uuid">${truncateUUID(inv.uuid)}</div>
            </td>
            <td>${inv.product_count}</td>
            <td>${inv.total_quantity}</td>
            <td>
              <span class="badge-clients ${inv.connected_clients === 0 ? 'offline' : ''}">
                ${inv.connected_clients === 0 ? '⚪' : '🟢'} ${inv.connected_clients}
              </span>
            </td>
            <td>${formatDate(inv.updated_at)}</td>
            <td>${formatDate(inv.created_at)}</td>
            <td>
              <div class="actions-cell">
                <a href="/${inv.uuid}" target="_blank" class="btn-view">
                  Apri
                </a>
                <button
                  class="btn-delete"
                  onclick="handleDeleteInventory('${inv.uuid}', '${escapeHtml(inv.name)}')"
                >
                  Elimina
                </button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  elements.inventoriesTableContainer.innerHTML = tableHtml;
}

// View Management
function showLogin() {
  elements.loginView.style.display = 'block';
  elements.dashboardView.style.display = 'none';
  elements.passwordInput.value = '';
  elements.passwordInput.focus();
}

function showDashboard() {
  elements.loginView.style.display = 'none';
  elements.dashboardView.style.display = 'block';
}

// Utility Functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncateUUID(uuid) {
  if (!uuid) return '...';
  return `${uuid.substring(0, 8)}...${uuid.substring(uuid.length - 4)}`;
}

function formatDate(dateString) {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return dateString;
  }
}

// Global Event Handlers (for inline onclick)
function handleDeleteInventory(uuid, name) {
  deleteInventory(uuid, name);
}

// Event Listeners
elements.loginForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const password = elements.passwordInput.value.trim();

  if (!password) {
    showToast('Inserisci la password', 'error');
    return;
  }

  login(password);
});

elements.logoutBtn.addEventListener('click', () => {
  logout();
});

elements.refreshBtn.addEventListener('click', () => {
  loadDashboardData();
  showToast('Dati aggiornati', 'success');
});

// Auto-refresh every 10 seconds
setInterval(() => {
  if (adminToken && elements.dashboardView.style.display === 'block') {
    fetchStats();
    fetchInventories();
  }
}, 10000);

// Initialize App
function initApp() {
  // Check if already logged in
  if (loadToken()) {
    showDashboard();
    loadDashboardData();
  } else {
    showLogin();
  }
}

// Start app
initApp();
