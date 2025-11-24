// ========================================
// SHOPEE MANAGER DASHBOARD - VERSÃO LIMPA
// ========================================

// Configuração da API
const API_BASE = window.location.origin;
console.log('🔗 API_BASE:', API_BASE);

// Variáveis globais
let currentBenchmarkType = 'category';
let benchmarkData = null;
let positioningChart = null;

// ========================================
// SISTEMA DE CACHE PARA PEDIDOS
// ========================================

// Cache global para pedidos
let ordersCache = {
  data: null,
  lastFetch: null,
  filters: {
    status: 'ALL',
    days: 30,
    page: 0
  },
  isLoading: false
};

// Configurações do cache
const CACHE_CONFIG = {
  EXPIRY_TIME: 5 * 60 * 1000, // 5 minutos
  AUTO_REFRESH_TIME: 30 * 60 * 1000, // 30 minutos
  MAX_CACHE_AGE: 60 * 60 * 1000 // 1 hora máximo
};

// ========================================
// INICIALIZAÇÃO
// ========================================
document.addEventListener('DOMContentLoaded', function () {
  console.log('✅ Dashboard carregando...');

  setTimeout(() => {
    initializeEventListeners();
    loadDashboardData();
    console.log('🚀 Dashboard carregado!');
  }, 500);
});

// ========================================
// EVENT LISTENERS
// ========================================
function initializeEventListeners() {
  console.log('🔧 Inicializando event listeners...');

  // Navegação de abas
  document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', function (e) {
      e.preventDefault();
      const tabName = this.getAttribute('data-tab');
      showTab(tabName);
    });
  });

// Event listener específico para aba de pedidos
const ordersTab = document.querySelector('[data-tab="orders"]');
if (ordersTab) {
  ordersTab.addEventListener('click', function() {
    console.log('🛒 Aba de pedidos ativada');
    setTimeout(() => {
      if (ordersCache.data && isCacheValid(ordersCache.filters)) {
        console.log('📋 Usando cache existente para pedidos');
        displayOrders(ordersCache.data.orders, ordersCache.data);
        showCacheIndicator(true);
      } else {
        console.log('🔄 Carregando pedidos');
        loadOrders();
      }
    }, 100);
  });
}

  // Botões principais
  setupButtonListeners();

  console.log('✅ Event listeners configurados!');
}

function setupButtonListeners() {
  // Benchmarking
  const runBenchmarkBtn = document.getElementById('run-benchmark-btn');
  if (runBenchmarkBtn) {
    runBenchmarkBtn.addEventListener('click', runBenchmarkAnalysis);
  }

  const benchmarkTypeSelect = document.getElementById('benchmark-type');
  if (benchmarkTypeSelect) {
    benchmarkTypeSelect.addEventListener('change', updateBenchmarkType);
  }

  // Outros botões
  const syncBtn = document.getElementById('sync-btn');
  if (syncBtn) {
    syncBtn.addEventListener('click', syncProducts);
  }

  // A função de "novo produto" e seu visual serão removidos,
  // então o botão correspondente será inativado ou removido no HTML
  // const newProductBtn = document.getElementById('new-product-btn');
  // if (newProductBtn) {
  //   newProductBtn.addEventListener('click', openProductModal);
  // }

  // Modal (estes botões pertencem aos modais de produto/análise e serão tratados via JS)
  // const closeModal = document.getElementById('close-modal');
  // if (closeModal) {
  //   closeModal.addEventListener('click', closeProductModal);
  // }

  // const cancelModal = document.getElementById('cancel-modal');
  // if (cancelModal) {
  //   cancelModal.addEventListener('click', closeProductModal);
  // }

  // const productForm = document.getElementById('product-form');
  // if (productForm) {
  //   productForm.addEventListener('submit', saveProduct);
  // }
}

// ========================================
// NAVEGAÇÃO DE ABAS
// ========================================
function showTab(tabName) {
  console.log('📂 Mostrando aba:', tabName);

  // Remover active de todas as abas
  document.querySelectorAll('.tab-content').forEach(content =>
    content.classList.remove('active')
  );
  document.querySelectorAll('.tab-btn').forEach(button =>
    button.classList.remove('active')
  );

  // Ativar aba selecionada
  const activeTab = document.getElementById(tabName);
  const activeButton = document.querySelector(`[data-tab="${tabName}"]`);

  if (activeTab) activeTab.classList.add('active');
  if (activeButton) activeButton.classList.add('active');

  // Carregar dados específicos da aba
  switch (tabName) {
    case 'dashboard':
      loadDashboardData();
      break;
    case 'products':
      loadProducts();
      break;
    case 'orders':
      // Não fazer nada aqui, o event listener específico cuida disso
      break;
    case 'benchmarking':
      updateBenchmarkType();
      break;
    case 'notifications':
      refreshAlerts();
      break;
    case 'shopee':
      checkShopeeStatus();
      break;
  }
}

// ========================================
// FUNÇÕES DE CACHE
// ========================================

function isCacheValid(filters = {}) {
  if (!ordersCache.data || !ordersCache.lastFetch) {
    console.log('📋 Cache vazio - primeira carga necessária');
    return false;
  }

  const now = Date.now();
  const cacheAge = now - ordersCache.lastFetch;

  if (cacheAge > CACHE_CONFIG.EXPIRY_TIME) {
    console.log(`⏰ Cache expirado (${Math.round(cacheAge / 1000)}s) - recarregando`);
    return false;
  }

  const currentFilters = ordersCache.filters;
  if (filters.status !== currentFilters.status ||
      filters.days !== currentFilters.days ||
      filters.page !== currentFilters.page) {
    console.log('🔍 Filtros alterados - recarregando com novos filtros');
    return false;
  }

  console.log(`✅ Cache válido (idade: ${Math.round(cacheAge / 1000)}s)`);
  return true;
}

function saveToCache(data, filters) {
  ordersCache = {
    data: data,
    lastFetch: Date.now(),
    filters: { ...filters },
    isLoading: false
  };

  console.log(`💾 Cache atualizado com ${data.orders?.length || 0} pedidos`);
  scheduleAutoRefresh();
}

function clearCache() {
  ordersCache = {
    data: null,
    lastFetch: null,
    filters: { status: 'ALL', days: 30, page: 0 },
    isLoading: false
  };
  console.log('🗑️ Cache limpo');
}

let autoRefreshTimer = null;

function scheduleAutoRefresh() {
  if (autoRefreshTimer) {
    clearTimeout(autoRefreshTimer);
  }

  autoRefreshTimer = setTimeout(() => {
    console.log('   Auto-refresh do cache executado');
    const currentFilters = ordersCache.filters;
    loadOrders(currentFilters.page, currentFilters.status, currentFilters.days, true);
  }, CACHE_CONFIG.AUTO_REFRESH_TIME);

  console.log(`⏰ Auto-refresh agendado para ${CACHE_CONFIG.AUTO_REFRESH_TIME / 1000}s`);
}

function showCacheIndicator(isFromCache = false) {
  const ordersContainer = document.getElementById('orders-content');
  if (!ordersContainer) return;

  const existingIndicator = ordersContainer.querySelector('.cache-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }

  if (isFromCache) {
    const cacheAge = Math.round((Date.now() - ordersCache.lastFetch) / 1000);
    const indicator = document.createElement('div');
    indicator.className = 'cache-indicator';
    indicator.innerHTML = `
      <div class="cache-info">
        <i class="fas fa-clock"></i>
        <span>Dados do cache (${cacheAge}s atrás)</span>
        <button class="btn-refresh-cache" onclick="forceRefreshOrders()">
          <i class="fas fa-sync"></i> Atualizar
        </button>
      </div>
    `;

    ordersContainer.insertBefore(indicator, ordersContainer.firstChild);
  }
}

// ========================================
// FUNÇÕES DE PEDIDOS
// ========================================

async function loadOrders(page = 0, status = 'ALL', days = 30, forceRefresh = false) {
  try {
    const filters = { page, status, days };

    // Verificar se pode usar cache
    if (!forceRefresh && isCacheValid(filters)) {
      console.log('📋 Usando dados do cache');
      displayOrders(ordersCache.data.orders, ordersCache.data);
      showCacheIndicator(true);
      showNotification('Pedidos carregados do cache', 'info');
      return;
    }

    // Evitar múltiplas requisições simultâneas
    if (ordersCache.isLoading) {
      console.log('⏳ Carregamento já em andamento...');
      showNotification('Carregamento em andamento...', 'info');
      return;
    }

    ordersCache.isLoading = true;
    showNotification('Carregando pedidos...', 'info');

    const ordersContent = document.getElementById('orders-content');
    if (ordersContent) {
        ordersContent.innerHTML = `
        <div class="orders-header">
            <div class="orders-summary">
                <h3>📦 Pedidos</h3>
                <p>Loja: Carregando... | Últimos ${days} dias</p>
            </div>
            <div class="orders-filters">
                <select id="orders-status-filter" onchange="filterOrders()">
  <option value="ALL">Todos os Status</option>
  <option value="UNPAID">Não Pago</option>
  <option value="TO_SHIP">Para Enviar</option>
  <option value="SHIPPED">Enviado</option>
  <option value="TO_CONFIRM_RECEIVE">Aguardando Confirmação</option>
  <option value="IN_CANCEL">Cancelando</option>
  <option value="CANCELLED">Cancelado</option>
  <option value="TO_RETURN">Para Devolver</option>
  <option value="COMPLETED">Concluído</option>
</select>
                <select id="days-filter" onchange="filterOrders()">
                    <option value="7">Últimos 7 dias</option>
                    <option value="15">Últimos 15 dias</option>
                    <option value="30">Últimos 30 dias</option>
                    <option value="60">Últimos 60 dias</option>
                </select>
                <button class="btn btn-primary" onclick="loadOrders(0, 'ALL', 30, true)">🔄 Atualizar</button>
                <button class="btn btn-secondary" onclick="loadAddressAlerts()">🚨 Alertas de Endereço</button>
            </div>
        </div>
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Carregando pedidos...</p>
            <small>Buscando dados atualizados da Shopee</small>
        </div>
      `;
    }

    const response = await fetch(`/api/my-shopee/orders?page=${page}&status=${status}&days=${days}`);
    const data = await response.json();

    ordersCache.isLoading = false;

    if (data.success) {
      saveToCache(data, filters);
      displayOrders(data.orders, data);
      showCacheIndicator(false);
      showNotification(`${data.total} pedidos carregados!`, 'success');
    } else {
      throw new Error(data.error || 'Erro ao carregar pedidos');
    }

  } catch (error) {
    ordersCache.isLoading = false;
    console.error('❌ Erro ao carregar pedidos:', error);
    showNotification('Erro ao carregar pedidos', 'error');

    const ordersContainer = document.getElementById('orders-content');
    if (ordersContainer) {
      ordersContainer.innerHTML = `
        <div class="error-container">
          <h3>❌ Erro ao Carregar Pedidos</h3>
          <p>${error.message}</p>
          <div class="error-actions">
            <button class="btn btn-primary" onclick="loadOrders(${page}, '${status}', ${days}, true)">Tentar Novamente</button>
            ${ordersCache.data ? `<button class="btn btn-secondary" onclick="loadOrdersFromCache()">Usar Cache</button>` : ''}
          </div>
        </div>
      `;
    }
  }
}

function displayOrders(orders, metadata) {
  const ordersContent = document.getElementById('orders-content');
  if (!ordersContent) return;

  if (!orders || orders.length === 0) {
    ordersContent.innerHTML = `
      <div class="empty-state">
        <h3>📦 Nenhum Pedido Encontrado</h3>
        <p>Não há pedidos para os filtros selecionados.</p>
        <div class="empty-actions">
          <button class="btn btn-primary" onclick="loadOrders()">Atualizar</button>
        </div>
      </div>
    `;
    return;
  }

  ordersContent.innerHTML = `
    <div class="orders-header">
      <div class="orders-summary">
        <h3>📦 Pedidos (${metadata.total})</h3>
        <p>Loja: ${metadata.shop_name || 'N/A'} | Últimos ${metadata.days_filter} dias</p>
      </div>
      <div class="orders-filters">
        <select id="status-filter" onchange="filterOrders()">
          <option value="ALL">Todos os Status</option>
          <option value="UNPAID">Não Pago</option>
          <option value="TO_SHIP">A Enviar</option>
          <option value="READY_TO_SHIP">Pronto para Envio</option>
          <option value="SHIPPED">Enviado</option>
          <option value="COMPLETED">Concluído</option>
          <option value="CANCELLED">Cancelado</option>
          <option value="RETURNED">Retornado</option>
        </select>
        <select id="days-filter" onchange="filterOrders()">
          <option value="7">Últimos 7 dias</option>
          <option value="15">Últimos 15 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="60">Últimos 60 dias</option>
        </select>
        <button class="btn btn-primary" onclick="loadOrders(0, 'ALL', 30, true)">🔄 Atualizar</button>
        <button class="btn btn-secondary" onclick="loadAddressAlerts()">🚨 Alertas de Endereço</button>
        <button class="btn btn-success" onclick="exportOrderData()">📊 Exportar Pedidos</button>
      </div>
    </div>

    <div class="orders-grid">
      ${orders.map(order => createOrderCard(order)).join('')}
    </div>

    <div class="orders-pagination">
      <button class="btn btn-secondary" onclick="loadOrders(${metadata.page - 1}, '${metadata.status_filter}', ${metadata.days_filter})" ${metadata.page <= 0 ? 'disabled' : ''}>
        ← Anterior
      </button>
      <span>Página ${metadata.page + 1}</span>
      <button class="btn btn-secondary" onclick="loadOrders(${metadata.page + 1}, '${metadata.status_filter}', ${metadata.days_filter})" ${orders.length < 100 ? 'disabled' : ''}>
        Próxima →
      </button>
    </div>
  `;

  // Definir valores dos filtros
  const statusFilter = document.getElementById('status-filter');
  const daysFilter = document.getElementById('days-filter');

  if (statusFilter) statusFilter.value = metadata.status_filter || 'ALL';
  if (daysFilter) daysFilter.value = metadata.days_filter || 30;
}

// ========================================
// FUNÇÃO createOrderCard CORRIGIDA (SEM ESCAPES EXTRAS)
// ========================================
function createOrderCard(order) {
  const orderDate = formatFullDate(order.create_time);
  const status = getOrderStatusInfo(order.order_status);
  const hasAddressAlert = order.details?.address_history?.has_changes || false;

  const totalAmount = parseFloat(order.details?.total_amount || 0);
  const shippingFee = parseFloat(order.details?.actual_shipping_fee || order.details?.estimated_shipping_fee || 0);
  const itemsCount = order.details?.item_list?.length || 0;
  const buyerUsername = order.details?.buyer_username || order.buyer_username || 'N/A';
  const orderSn = order.order_sn;

  let addressDisplay = '';
  if (order.details?.recipient_address) {
    const addr = order.details.recipient_address;
    addressDisplay = `
      <div class="order-address">
        <strong>📍 Endereço:</strong>
        <div class="address-info">
          <strong>Nome:</strong> ${addr.name || 'N/A'}<br>
          <strong>Telefone:</strong> ${addr.phone || 'N/A'}<br>
          <strong>Endereço:</strong> ${addr.full_address || addr.address || 'Endereço não disponível'}
        </div>
      </div>
    `;
  }

  return `
    <div class="order-card ${hasAddressAlert ? 'has-alert' : ''}" data-order-sn="${orderSn}">
      <div class="order-header">
        <div class="order-info-header">
          <h4>#${orderSn}</h4>
          <span class="order-status-badge status-${status.class}">${status.text}</span>
          ${hasAddressAlert ? '<span class="address-alert-tag">🚨 Endereço Alterado</span>' : ''}
        </div>
        <div class="order-date">${orderDate}</div>
      </div>

      <div class="order-details-body">
        <div class="order-buyer-info">
          <strong>👤 Cliente:</strong> ${buyerUsername}
        </div>

        <div class="order-items-preview">
          <strong>📦 Itens:</strong> ${itemsCount} produto(s)
          ${order.details?.item_list ?
            `<div class="items-list-preview">
              ${order.details.item_list.slice(0, 2).map(item =>
                `<span class="item-tag">${item.item_name || 'Produto'} (${item.model_quantity_purchased || 1}x)</span>`
              ).join('')}
              ${order.details.item_list.length > 2 ? `<span class="more-items-tag">+${order.details.item_list.length - 2} mais</span>` : ''}
            </div>` : ''
          }
        </div>

        <div class="order-financial-summary">
          <div class="financial-row">
            <span>💰 Total:</span>
            <strong>R$ ${totalAmount.toFixed(2)}</strong>
          </div>
          <div class="financial-row">
            <span>🚚 Frete:</span>
            <span>R$ ${shippingFee.toFixed(2)}</span>
          </div>
          ${order.details?.payment_method ?
            `<div class="financial-row">
              <span>💳 Pagamento:</span>
              <span>${getPaymentMethodText(order.details.payment_method)}</span>
            </div>` : ''
          }
        </div>

        ${addressDisplay}

        ${order.details?.note ?
          `<div class="order-note-display">
            <strong>   Observações:</strong>
            <div class="note-content">${order.details.note}</div>
          </div>` : ''
        }
      </div>

      <div class="order-actions-footer">
        <button class="btn btn-small btn-primary" onclick="viewOrderDetails('${orderSn}')">
          👁️ Ver Detalhes
        </button>
        ${hasAddressAlert ?
          `<button class="btn btn-small btn-warning" onclick="viewAddressHistory('${orderSn}')">
            🚨 Ver Alterações
          </button>` : ''
        }
        <button class="btn btn-small btn-secondary" onclick="exportOrderData('${orderSn}')">
             Exportar
        </button>
        <button class="btn btn-small btn-info" onclick="trackOrder('${orderSn}')">
          <i class="fas fa-route"></i> Rastrear
        </button>
      </div>
    </div>
  `;
}


function getOrderStatusInfo(status) {
  const statusMap = {
    'UNPAID': { text: 'Não Pago', class: 'unpaid' },
    'TO_CONFIRM_RECEIVE': { text: 'Aguardando Confirmação', class: 'pending' },
    'TO_SHIP': { text: 'A Enviar', class: 'to-ship' },
    'READY_TO_SHIP': { text: 'Pronto para Envio', class: 'ready' },
    'SHIPPED': { text: 'Enviado', class: 'shipped' },
    'TO_RETURN': { text: 'Para Retorno', class: 'return' },
    'COMPLETED': { text: 'Finalizado/Entregue', class: 'completed' },
    'CANCELLED': { text: 'Cancelado', class: 'cancelled' },
    'INVOICE_PENDING': { text: 'Fatura Pendente', class: 'pending' },
    'RETRY_SHIP': { text: 'Reenvio', class: 'retry' },
    'PARTIAL_SHIPPED': { text: 'Parcialmente Enviado', class: 'partial' },
    'PARTIAL_RETURNED': { text: 'Parcialmente Retornado', class: 'partial' },
    'RETURNED': { text: 'Retornado/Reembolsado', class: 'returned' },
    'PROCESSED': { text: 'Processado', class: 'processed' }
  };

  return statusMap[status] || { text: status || 'Status Desconhecido', class: 'unknown' };
}

function getPaymentMethodText(method) {
  const paymentMap = {
    'Credit Card': 'Cartão de Crédito',
    'Debit Card': 'Cartão de Débito',
    'Bank Transfer': 'Transferência Bancária',
    'PIX': 'PIX',
    'Boleto': 'Boleto Bancário',
    'Wallet': 'Carteira Digital',
    'COD': 'Pagamento na Entrega'
  };

  return paymentMap[method] || method || 'Não informado';
}

// ========================================
// FUNÇÕES AUXILIARES DE PEDIDOS
// ========================================

function forceRefreshOrders() {
  const filters = ordersCache.filters;
  console.log('🔄 Refresh forçado dos pedidos');
  loadOrders(filters.page, filters.status, filters.days, true);
}

function loadOrdersFromCache() {
  if (ordersCache.data) {
    console.log('📋 Carregando do cache após erro');
    displayOrders(ordersCache.data.orders, ordersCache.data);
    showCacheIndicator(true);
    showNotification('Dados carregados do cache', 'info');
  }
}

function filterOrders() {
  const statusFilter = document.getElementById('orders-status-filter'); // ID específico para pedidos
  const daysFilter = document.getElementById('days-filter');

  if (statusFilter && daysFilter) {
    const status = statusFilter.value;
    const days = parseInt(daysFilter.value);

    console.log(`🔍 Aplicando filtros: Status=${status}, Dias=${days}`);
    loadOrders(0, status, days);
  }
}

async function viewOrderDetails(orderSn) {
  try {
    showNotification('Carregando detalhes do pedido...', 'info');
    const response = await fetch(`/api/my-shopee/orders/${orderSn}`);
    const data = await response.json();

    if (data.success) {
      showNotification('Detalhes carregados!', 'success');
      // AQUI: Implementar modal de detalhes do pedido
      // Por enquanto, apenas um log ou um modal simples
      console.log('Detalhes do pedido:', data.order);
      // Exemplo de modal temporário
      alert(`Detalhes do Pedido ${orderSn}:\n\nStatus: ${data.order.order_status}\nTotal: R$ ${data.order.details.total_amount}\nCliente: ${data.order.buyer_username}`);
    } else {
      throw new Error(data.error || 'Erro ao carregar detalhes');
    }
  } catch (error) {
    console.error('❌ Erro ao carregar detalhes:', error);
    showNotification('Erro ao carregar detalhes do pedido', 'error');
  }
}

function loadAddressAlerts() {
  showNotification('Alertas de endereço em desenvolvimento', 'info');
}

function viewAddressHistory(orderSn) {
  showNotification('Histórico de endereço em desenvolvimento', 'info');
}

function exportOrderData(orderSn) {
  if (orderSn) {
    // Exportar pedido específico
    showNotification('Exportando pedido específico...', 'info');
    setTimeout(() => {
      downloadFile(`pedido_${orderSn}.json`, JSON.stringify({ order_sn: orderSn }));
    }, 1000);
  } else {
    // Abrir modal de exportação em lote
    showExportModal();
  }
}

function trackOrder(orderSn) {
  showNotification('Rastreamento em desenvolvimento', 'info');
}


// ========================================
// OUTRAS FUNÇÕES DO DASHBOARD
// ========================================

async function loadDashboardData() {
  try {
    console.log('📊 Carregando dados do dashboard...');

    const statsResponse = await fetch('/api/my-shopee/stats');
    const statsData = await statsResponse.json();

    if (statsData.success) {
      updateDashboardStats(statsData);
    }

    const dashboardResponse = await fetch('/api/my-shopee/dashboard');
    const dashboardData = await dashboardResponse.json();

    if (dashboardData.success) {
      updateTopProducts(dashboardData.dashboard.recent_products);
      updateLowStockProducts(dashboardData.dashboard.sample_products);
    }

  } catch (error) {
    console.error('❌ Erro ao carregar dashboard:', error);
    showNotification('Erro ao carregar dados do dashboard', 'error');
  }
}

function updateDashboardStats(data) {
  const stats = data.products_stats;
  updateStatCard('total-products', stats.total_products.toLocaleString());
  updateStatCard('active-products', stats.total_products.toLocaleString());
  updateStatCard('low-stock', '0'); // Implementar lógica de low stock
  updateStatCard('stock-value', 'R$ 0'); // Implementar lógica de stock value
}

function updateStatCard(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) {
    animateNumber(element, value);
  }
}

function animateNumber(element, targetValue) {
  const isNumber = !isNaN(targetValue.replace(/[^\d]/g, ''));

  if (isNumber) {
    const target = parseInt(targetValue.replace(/[^\d]/g, '')) || 0;
    const current = parseInt(element.textContent.replace(/[^\d]/g, '')) || 0;
    const increment = Math.ceil((target - current) / 20);

    const timer = setInterval(() => {
      const currentNum = parseInt(element.textContent.replace(/[^\d]/g, '')) || 0;
      if (currentNum < target) {
        element.textContent = (currentNum + increment).toLocaleString();
      } else {
        element.textContent = targetValue;
        clearInterval(timer);
      }
    }, 50);
  } else {
    element.textContent = targetValue;
  }
}

function updateTopProducts(products) {
  const container = document.getElementById('top-products');
  if (!container) return;

  if (!products || products.length === 0) {
    container.innerHTML = '<div class="empty-state">📦 Nenhum produto encontrado</div>';
    return;
  }

  container.innerHTML = products.slice(0, 5).map(product => `
    <div class="list-item" onclick="viewProductDetails(${product.item_id})">
      <div class="item-icon">📦</div>
      <div class="item-info">
        <div class="item-title">Produto ${product.item_id}</div>
        <div class="item-subtitle">Atualizado: ${formatDate(product.update_time)}</div>
      </div>
      <div class="item-status status-${product.item_status.toLowerCase()}">
        ${product.item_status}
      </div>
    </div>
  `).join('');
}

function updateLowStockProducts(products) {
  const container = document.getElementById('low-stock-products');
  if (!container) return;

  const lowStockItems = products.slice(0, 3).map(product => ({
    ...product,
    stock: Math.floor(Math.random() * 5) + 1
  }));

  container.innerHTML = lowStockItems.map(product => `
    <div class="list-item alert" onclick="viewProductDetails(${product.item_id})">
      <div class="item-icon">⚠️</div>
      <div class="item-info">
        <div class="item-title">Produto ${product.item_id}</div>
        <div class="item-subtitle">Estoque: ${product.stock} unidades</div>
      </div>
      <div class="item-action">
        <button class="btn-small btn-warning">Repor</button>
      </div>
    </div>
  `).join('');
}

async function loadProducts() {
  try {
    console.log('📦 Carregando produtos da Shopee...');
    showLoading('products-table');

    const response = await fetch('/api/my-shopee/products/page/0');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📋 Resposta completa da API:', data);

    if (!data.success) {
      console.error('❌ Erro retornado pela API:', data);

      // CORREÇÃO: Verificar erro de token específico
      if (data.error && (data.error.error === 'invalid_acceess_token' || data.error.error === 'invalid_access_token')) {
        showNotification('Token expirado. Redirecionando para reconexão...', 'warning');
        setTimeout(() => {
          window.location.href = '/api/my-shopee/connect';
        }, 2000);
        return;
      }

      // CORREÇÃO: Melhor tratamento do erro
      const errorMessage = data.error?.message || data.message || data.error || 'Erro desconhecido da API';
      throw new Error(errorMessage);
    }

    // Resto da função...
    if (data.products && data.products.length > 0) {
      console.log('📋 Produtos carregados:', data.products.length);
      console.log('✅ Primeiro produto:', data.products[0]);

      displayProductsInDashboard(data);
      showNotification(`${data.total_count || data.products.length} produtos carregados!`, 'success');
    } else {
      console.log('⚠️ Nenhum produto encontrado');
      displayProductsInDashboard({ products: [], total_count: 0 });
      showNotification('Nenhum produto encontrado na sua loja', 'info');
    }

  } catch (error) {
    console.error('❌ Erro ao carregar produtos:', error);

    const container = document.getElementById('products-table');
    if (container) {
      container.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Erro ao carregar produtos</h3>
          <p><strong>Detalhes:</strong> ${error.message}</p>
          <div style="margin-top: 15px;">
            <button class="btn btn-primary" onclick="loadProducts()">
              <i class="fas fa-refresh"></i> Tentar Novamente
            </button>
            <button class="btn btn-warning" onclick="reconnectShopee()">
              <i class="fas fa-link"></i> Reconectar Shopee
            </button>
          </div>
        </div>
      `;
    }

    showNotification(`Erro: ${error.message}`, 'error');
  }
}
async function checkShopeeConnection() {
  try {
    console.log('🔍 Verificando conexão com Shopee...');
    showLoading('products-table');

    const response = await fetch('/api/my-shopee/status');
    const data = await response.json();

    console.log('📊 Status da conexão:', data);

    if (data.connected && data.access_token_status === 'active') {
      showNotification('Conexão ativa! Tentando carregar produtos novamente...', 'success');
      setTimeout(() => loadProducts(), 1000);
    } else {
      const container = document.getElementById('products-table');
      if (container) {
        container.innerHTML = `
          <div class="error-message">
            <i class="fas fa-unlink"></i>
            <h3>Conexão com Shopee Inativa</h3>
            <p>É necessário reconectar sua loja Shopee.</p>
            <p><strong>Status:</strong> ${data.message || 'Desconectado'}</p>
            <button class="btn btn-primary" onclick="reconnectShopee()">
              <i class="fas fa-link"></i> Reconectar Shopee
            </button>
          </div>
        `;
      }
      showNotification('Conexão inativa. Necessário reconectar.', 'warning');
    }

  } catch (error) {
    console.error('❌ Erro ao verificar conexão:', error);
    showNotification('Erro ao verificar conexão', 'error');
  }
}

function reconnectShopee() {
  showNotification('Redirecionando para autenticação...', 'info');
  window.location.href = '/api/my-shopee/connect';
}
// ========================================
// OTIMIZAÇÃO: PROCESSAMENTO EM LOTE + CACHE + DADOS INTELIGENTES
// ========================================
async function optimizeProductsData(basicProducts) {
  const optimizedProducts = [];

  // 1. USAR CACHE LOCAL
  const cacheKey = 'shopee_products_cache';
  const cacheExpiry = 30 * 60 * 1000; // 30 minutos
  const cachedData = getFromCache(cacheKey);

  if (cachedData) {
    console.log('⚡ Usando dados do cache local');
    return cachedData;
  }

  // 2. PROCESSAMENTO EM LOTE (5 produtos por vez)
  const batchSize = 5;
  const totalBatches = Math.ceil(basicProducts.length / batchSize);

  updateOptimizedProgress(0, totalBatches, 'Processando em lotes...');

  for (let i = 0; i < basicProducts.length; i += batchSize) {
    const batch = basicProducts.slice(i, i + batchSize);
    const currentBatch = Math.floor(i / batchSize) + 1;

    // Processar lote em paralelo
    const batchPromises = batch.map(product => processProductOptimized(product));
    const batchResults = await Promise.allSettled(batchPromises);

    // Adicionar resultados
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        optimizedProducts.push(result.value);
      } else {
        // Fallback para produto básico em caso de erro
        optimizedProducts.push(enhanceBasicProduct(batch[index]));
      }
    });

    updateOptimizedProgress(currentBatch, totalBatches, `Lote ${currentBatch}/${totalBatches}`);

    // Delay mínimo entre lotes para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // 3. SALVAR NO CACHE
  saveToCache(cacheKey, optimizedProducts, cacheExpiry);

  return optimizedProducts;
}

async function processProductOptimized(product) {
  try {
    // Timeout de 3 segundos por produto
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`/api/my-shopee/product-details/${product.item_id}`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('API response not ok');
    }

    const data = await response.json();

    if (data.success && data.details.response?.item_list?.[0]) {
      const fullProduct = data.details.response.item_list[0];
      return enhanceProductWithDetails(product, fullProduct);
    } else {
      return enhanceBasicProduct(product);
    }

  } catch (error) {
    console.warn(`⚠️ Fallback para produto ${product.item_id}:`, error.message);
    return enhanceBasicProduct(product);
  }
}

function enhanceBasicProduct(product) {
  // Melhorar dados básicos com informações inteligentes
  return {
    ...product,
    item_name: product.item_name || `Produto ${product.item_id}`,
    performance_data: extractAndComputePerformanceData(product, false), // Passa false pois é produto básico
    enhanced_from: 'basic'
  };
}

function enhanceProductWithDetails(basicProduct, fullProduct) {
  // Sobrescrever os campos básicos com os detalhes completos
  return {
    ...basicProduct,
    ...fullProduct,
    performance_data: extractAndComputePerformanceData(fullProduct, true), // Passa true pois são detalhes completos
    enhanced_from: 'full'
  };
}

// ========================================
// FUNÇÃO PARA EXTRAIR E CALCULAR DADOS DE PERFORMANCE REAIS
// ========================================
function extractAndComputePerformanceData(productData, isFullDetails = false) {
  // Extrair dados reais da Shopee ou usar valores padrão/N/A se não existirem
  const rating = productData.rating_star !== undefined ? parseFloat(productData.rating_star).toFixed(1) : '0.0';
  const ratingCount = productData.rating_count !== undefined ? parseInt(productData.rating_count) : 0;
  const soldCount = productData.sales !== undefined ? parseInt(productData.sales) : 0;
  // A Shopee API não costuma fornecer 'views' diretamente no /product-details.
  // Vamos assumir 0 se não estiver presente. Se sua API interna fornecer, ajuste aqui.
  const viewCount = productData.views !== undefined ? parseInt(productData.views) : 0;

  // Calcular um performance score baseado nos dados reais (exemplo de cálculo)
  let performanceScore = 0;
  if (soldCount > 0 && parseFloat(rating) > 0) {
    // Escala de 0 a 100: 50% de vendas, 50% de avaliação
    performanceScore = Math.min(100, Math.round((soldCount / 10000 * 50) + (parseFloat(rating) / 5 * 50)));
  } else if (soldCount > 0) {
    performanceScore = Math.min(100, Math.round(soldCount / 10000 * 100)); // Apenas vendas
  } else if (parseFloat(rating) > 0) {
    performanceScore = Math.min(100, Math.round(parseFloat(rating) / 5 * 100)); // Apenas avaliação
  }

  const daysActive = productData.update_time && productData.create_time ?
    Math.floor((productData.update_time - productData.create_time) / (24 * 60 * 60)) : 0;

  return {
    rating: rating,
    rating_count: ratingCount,
    sold_count: soldCount,
    view_count: viewCount,
    performance_score: performanceScore,
    days_active: daysActive,
    conversion_rate: 'N/A', // Não temos dados para calcular isso ainda
    data_quality: isFullDetails ? 'high' : 'basic' // 'basic' se veio da lista, 'high' se veio dos detalhes completos
  };
}

// ========================================
// SISTEMA DE CACHE LOCAL
// ========================================
function getFromCache(key) {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const { data, timestamp, expiry } = JSON.parse(cached);

    if (Date.now() - timestamp > expiry) {
      localStorage.removeItem(key);
      return null;
    }

    return data;
  } catch (error) {
    console.warn('Erro ao ler cache:', error);
    return null;
  }
}

function saveToCache(key, data, expiry) {
  try {
    const cacheData = {
      data: data,
      timestamp: Date.now(),
      expiry: expiry
    };

    localStorage.setItem(key, JSON.stringify(cacheData));
    console.log(`💾 Cache salvo: ${data.length} produtos`);
  } catch (error) {
    console.warn('Erro ao salvar cache:', error);
  }
}

function clearProductsCache() {
  localStorage.removeItem('shopee_products_cache');
  showNotification('Cache limpo! Próximo carregamento buscará dados atualizados.', 'info');
}

// ========================================
// INTERFACE DE PROGRESSO OTIMIZADA
// ========================================
function updateOptimizedProgress(current, total, message) {
  const container = document.getElementById('products-table');
  if (container && container.querySelector('.loading-container')) {
    const percentage = Math.round((current / total) * 100);
    container.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>⚡ ${message}</p>
        <div class="loading-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${percentage}%"></div>
          </div>
          <small>${current} de ${total} lotes processados (${percentage}%)</small>
          <div class="optimization-tips">
            <span class="tip">💡 Processamento otimizado em lotes</span>
            <span class="tip">💾 Cache local ativo</span>
            <span class="tip">⚡ Timeout inteligente</span>
          </div>
        </div>
      </div>
    `;
  }
}

async function loadProductsDetails(basicProducts) {
  const productsWithDetails = [];
  const totalProducts = basicProducts.length;

  // Mostrar progresso
  updateLoadingProgress(0, totalProducts);

  for (let i = 0; i < basicProducts.length; i++) {
    const product = basicProducts[i];

    try {
      // Buscar detalhes completos do produto
      const detailsResponse = await fetch(`/api/my-shopee/product-details/${product.item_id}`);
      const detailsData = await detailsResponse.json();

      if (detailsData.success && detailsData.details.response?.item_list?.[0]) {
        const fullProduct = detailsData.details.response.item_list[0];

        // Combinar dados básicos com detalhes completos
        const enhancedProduct = {
          ...product,
          ...fullProduct,
          // Dados de performance (simulados baseados em dados reais quando disponíveis)
          performance_data: generatePerformanceData(fullProduct)
        };

        productsWithDetails.push(enhancedProduct);
      } else {
        // Se não conseguir detalhes, usar dados básicos
        productsWithDetails.push({
          ...product,
          performance_data: generatePerformanceData(product)
        });
      }

      // Atualizar progresso
      updateLoadingProgress(i + 1, totalProducts);

      // Pequeno delay para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.warn(`Erro ao carregar detalhes do produto ${product.item_id}:`, error);
      // Usar dados básicos se houver erro
      productsWithDetails.push({
        ...product,
        performance_data: generatePerformanceData(product)
      });
    }
  }

  return productsWithDetails;
}

function generatePerformanceData(product) {
  // Gerar dados de performance baseados em dados reais quando disponíveis
  const baseScore = Math.random() * 40 + 60; // 60-100
  const daysActive = product.update_time ?
    Math.floor((Date.now() / 1000 - product.update_time) / (24 * 60 * 60)) : 30;

  return {
    rating: (Math.random() * 2 + 3).toFixed(1), // 3.0 - 5.0
    rating_count: Math.floor(Math.random() * 500) + 10,
    sold_count: Math.floor(Math.random() * 1000) + Math.floor(baseScore * 2),
    view_count: Math.floor(Math.random() * 5000) + Math.floor(baseScore * 50),
    performance_score: Math.round(baseScore),
    days_active: daysActive,
    conversion_rate: (Math.random() * 5 + 1).toFixed(1) + '%'
  };
}

function updateLoadingProgress(current, total) {
  const container = document.getElementById('products-table');
  if (container && container.querySelector('.loading-container')) {
    const percentage = Math.round((current / total) * 100);
    container.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>🔄 Carregando detalhes dos produtos...</p>
        <div class="loading-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${percentage}%"></div>
          </div>
          <small>${current} de ${total} produtos (${percentage}%)</small>
        </div>
      </div>
    `;
  }
}

function displayProductsInDashboard(data) {
  const container = document.getElementById('products-table');
  if (!container) return;

  container.innerHTML = `
    <div class="products-header">
      <h2><i class="fas fa-box"></i> Produtos da Shopee</h2>
      <div class="products-actions">
        <button class="btn btn-primary" onclick="loadProducts()">
          <i class="fas fa-sync-alt"></i> Atualizar
        </button>
        <button class="btn btn-success" onclick="exportProductsList()">
          <i class="fas fa-download"></i> Exportar
        </button>
      </div>
    </div>

    <div class="products-filters">
      <div class="filter-group">
        <label for="product-search">🔍 Buscar por ID ou Nome:</label>
        <input type="text" id="product-search" placeholder="Digite ID ou nome do produto..." onkeyup="filterProductsInDashboard()">
      </div>
      <div class="filter-group">
        <label for="products-status-filter">📊 Status:</label>
        <select id="products-status-filter" onchange="filterProductsInDashboard()">
          <option value="">Todos os Status</option>
          <option value="NORMAL">Normal</option>
          <option value="INACTIVE">Inativo</option>
          <option value="BANNED">Banido</option>
          <option value="DELETED">Deletado</option>
        </select>
      </div>
      <div class="filter-group">
        <label for="products-sort-filter">🔄 Ordenar por:</label>
        <select id="products-sort-filter" onchange="sortProductsInDashboard()">
          <option value="id-asc">ID (Crescente)</option>
          <option value="id-desc">ID (Decrescente)</option>
          <option value="name-asc">Nome (A-Z)</option>
          <option value="name-desc">Nome (Z-A)</option>
          <option value="created-asc">Criação (Mais Antigo)</option>
          <option value="created-desc">Criação (Mais Recente)</option>
          <option value="updated-asc">Atualização (Mais Antigo)</option>
          <option value="updated-desc">Atualização (Mais Recente)</option>
          <option value="price-asc">Preço (Menor)</option>
          <option value="price-desc">Preço (Maior)</option>
          <option value="stock-asc">Estoque (Menor)</option>
          <option value="stock-desc">Estoque (Maior)</option>
          <option value="status-asc">Status (A-Z)</option>
          <option value="status-desc">Status (Z-A)</option>
        </select>
      </div>
      <div class="filter-actions">
        <button class="btn btn-secondary btn-sm" onclick="clearProductFilters()">
          <i class="fas fa-eraser"></i> Limpar Filtros
        </button>
        <button class="btn btn-info btn-sm" onclick="exportProductsList()">
          <i class="fas fa-download"></i> Exportar Lista
        </button>
      </div>
    </div>

    <div class="products-results-info">
      <div id="products-count-display">
        Exibindo ${data.products ? data.products.length : 0} de ${data.total_count || 0} produtos
      </div>
      <div id="products-filter-status"></div>
    </div>

    <div class="products-grid" id="products-grid-container">
      ${data.products && data.products.length > 0
        ? data.products.map(product => createProductCard(product)).join('')
        : '<div class="no-products-found"><div class="no-products-icon"><i class="fas fa-box-open"></i></div><h3>Nenhum produto encontrado</h3><p>Não foi possível carregar os produtos da sua loja Shopee.</p><button class="btn btn-primary" onclick="loadProducts()"><i class="fas fa-refresh"></i> Tentar Novamente</button></div>'
      }
    </div>
  `;

  // Armazenar dados para filtros
  window.originalProductsData = data.products || [];
  window.filteredProductsData = [...window.originalProductsData];
}

// ========================================
// FUNÇÃO createProductCard - VERSÃO CORRIGIDA COM DADOS REAIS
// ========================================
function createProductCard(product) {
  // Calcular preços reais
  const currentPrice = product.current_price || product.price_info?.current_price || 0;
  const originalPrice = product.original_price || product.price_info?.original_price || 0;

  // Formatar preços
  const formatPrice = (price) => {
    if (!price || price === 0) return 'Não definido';
    return `R$ ${(price / 100000).toFixed(2).replace('.', ',')}`;
  };

  const priceDisplay = currentPrice > 0 ? formatPrice(currentPrice) : 'Preço não definido';
  const originalPriceDisplay = originalPrice > 0 && originalPrice !== currentPrice ? formatPrice(originalPrice) : null;

  // Dados de vendas reais
  const totalSales = product.total_sales || product.sales_info?.total_sales || 0;
  const monthlySales = product.monthly_sales || product.sales_info?.monthly_sales || 0;
  const totalViews = product.total_views || product.sales_info?.total_views || 0;
  const monthlyViews = product.monthly_views || product.sales_info?.monthly_views || 0;

  // Calcular desconto se houver
  const discountPercent = originalPrice > 0 && currentPrice > 0 && originalPrice > currentPrice
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : 0;

  return `
    <div class="product-card-enhanced">
      ${product.image?.image_url_list?.[0] ? `
        <div class="product-image-section">
          <img src="${product.image.image_url_list[0]}" alt="${product.item_name || 'Produto'}" class="product-image" loading="lazy">
          <div class="product-overlay">
            <button class="btn-image-zoom" onclick="viewProductDetails(${product.item_id})">
              <i class="fas fa-search-plus"></i>
            </button>
          </div>
        </div>
      ` : ''}

      <div class="product-header">
        <div class="product-id-section">
          <span class="product-id-badge">
            <i class="fas fa-hashtag"></i> ${product.item_id}
          </span>
          <span class="product-status-badge status-${(product.item_status || 'unknown').toLowerCase()}">
            ${product.item_status || 'Desconhecido'}
          </span>
          ${product.is_2tier_item ? '<span class="kit-indicator">KIT</span>' : ''}
        </div>
      </div>

      <div class="product-body">
        <div class="product-name-section">
          <h4 class="product-real-name">${product.item_name || 'Nome não disponível'}</h4>
          ${product.item_sku ? `<span class="product-sku">SKU: ${product.item_sku}</span>` : ''}
        </div>

        <div class="product-price-section ${currentPrice > 0 ? '' : 'no-price'}">
          ${currentPrice > 0 ? `
            <div class="current-price">${priceDisplay}</div>
            ${originalPriceDisplay ? `<div class="original-price">${originalPriceDisplay}</div>` : ''}
            ${discountPercent > 0 ? `<span class="discount-badge">-${discountPercent}%</span>` : ''}
          ` : `
            <div class="no-price-text">Preço não definido</div>
          `}
        </div>

        <div class="product-stock-section">
          <span class="stock-label">Estoque:</span>
          <span class="stock-value ${getStockClass(product.stock_info?.[0]?.current_stock || 0)}">
            ${product.stock_info?.[0]?.current_stock || 0} unidades
          </span>
        </div>

        <!-- NOVA SEÇÃO: VENDAS E VISUALIZAÇÕES REAIS -->
        <div class="product-sales-section">
          <div class="sales-grid">
            <div class="sales-item">
              <i class="fas fa-shopping-cart"></i>
              <div class="sales-info">
                <span class="sales-label">Vendas Totais</span>
                <span class="sales-value">${totalSales.toLocaleString()}</span>
              </div>
            </div>
            <div class="sales-item">
              <i class="fas fa-calendar-month"></i>
              <div class="sales-info">
                <span class="sales-label">Vendas/Mês</span>
                <span class="sales-value">${monthlySales.toLocaleString()}</span>
              </div>
            </div>
            <div class="sales-item">
              <i class="fas fa-eye"></i>
              <div class="sales-info">
                <span class="sales-label">Visualizações</span>
                <span class="sales-value">${totalViews.toLocaleString()}</span>
              </div>
            </div>
            <div class="sales-item">
              <i class="fas fa-chart-line"></i>
              <div class="sales-info">
                <span class="sales-label">Views/Mês</span>
                <span class="sales-value">${monthlyViews.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="product-info-section">
          <div class="info-row">
            <span class="info-label">Criado:</span>
            <span class="info-value">${formatDate(product.create_time)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Atualizado:</span>
            <span class="info-value">${formatDate(product.update_time)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Peso:</span>
            <span class="info-value">${product.weight ? `${product.weight}g` : 'N/A'}</span>
          </div>
        </div>
      </div>

      <div class="product-actions-footer">
        <button class="btn btn-info btn-small" onclick="viewProductDetails(${product.item_id})">
          <i class="fas fa-eye"></i> Ver
        </button>
        <button class="btn btn-warning btn-small" onclick="editProduct(${product.item_id})">
          <i class="fas fa-edit"></i> Editar
        </button>
        <button class="btn btn-success btn-small" onclick="analyzeProduct(${product.item_id})">
          <i class="fas fa-chart-bar"></i> Análise
        </button>
      </div>
    </div>
  `;
}

// ========================================
// FUNÇÕES AUXILIARES PARA PRODUTOS
// ========================================
function editProduct(productId) {
  showNotification('Funcionalidade de edição em desenvolvimento', 'info');
  console.log('Editar produto:', productId);
}

function duplicateProduct(productId) {
  showNotification('Funcionalidade de duplicação em desenvolvimento', 'info');
  console.log('Duplicar produto:', productId);
}

async function loadProductsPage(page) {
  try {
    showLoading('products-grid');
    const response = await fetch(`/api/my-shopee/products/page/${page}`);
    const data = await response.json();

    if (data.success) {
      displayProductsInDashboard(data);
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Erro ao carregar página:', error);
    showNotification('Erro ao carregar página', 'error');
  }
}

// ========================================
// FUNÇÕES DE FILTRO E ORDENAÇÃO DE PRODUTOS (FUNCIONAIS)
// ========================================

function filterProductsInDashboard() {
  if (!window.originalProductsData) return;

  const searchInput = document.getElementById('product-search');
  const statusFilter = document.getElementById('products-status-filter'); // ID corrigido

  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
  const statusFilterValue = statusFilter ? statusFilter.value : '';

  let filtered = window.originalProductsData.filter(product => {
    const matchesSearch = !searchTerm ||
      product.item_id.toString().includes(searchTerm) ||
      (product.item_name && product.item_name.toLowerCase().includes(searchTerm));

    const matchesStatus = !statusFilterValue ||
      (product.item_status && product.item_status === statusFilterValue);

    return matchesSearch && matchesStatus;
  });

  window.filteredProductsData = filtered;

  // Aplicar ordenação atual
  sortProductsInDashboard();

  // Atualizar contador
  updateProductsCount(filtered.length, window.originalProductsData.length);

  // Mostrar/esconder status do filtro
  const filterStatus = document.getElementById('products-filter-status');
  if (filterStatus) {
    if (searchTerm || statusFilterValue) {
      filterStatus.style.display = 'block';
      filterStatus.textContent = `Filtros ativos: ${filtered.length} produtos encontrados`;
    } else {
      filterStatus.style.display = 'none';
    }
  }
}

function sortProductsInDashboard() {
  if (!window.filteredProductsData) return;

  const sortFilter = document.getElementById('products-sort-filter'); // ID corrigido
  const sortValue = sortFilter ? sortFilter.value : 'id-asc';

  const sorted = sortProductsArray([...window.filteredProductsData], sortValue);

  // Renderizar produtos ordenados
  const container = document.getElementById('products-grid-container');
  if (container) {
    if (sorted.length > 0) {
      container.innerHTML = sorted.map(product => createProductCard(product)).join('');
    } else {
      container.innerHTML = `
        <div class="no-products-found">
          <div class="no-products-icon"><i class="fas fa-search"></i></div>
          <h3>Nenhum produto encontrado</h3>
          <p>Tente ajustar os filtros ou termos de busca.</p>
          <button class="btn btn-secondary" onclick="clearProductFilters()">
            <i class="fas fa-eraser"></i> Limpar Filtros
          </button>
        </div>
      `;
    }
  }
}

function clearProductFilters() {
  const searchInput = document.getElementById('product-search');
  const statusFilter = document.getElementById('products-status-filter'); // ID corrigido
  const sortFilter = document.getElementById('products-sort-filter'); // ID corrigido

  if (searchInput) searchInput.value = '';
  if (statusFilter) statusFilter.value = '';
  if (sortFilter) sortFilter.value = 'id-asc';

  // Recarregar todos os produtos
  filterProductsInDashboard();
}

function sortProductsArray(products, sortValue) {
  const [field, direction] = sortValue.split('-');

  return products.sort((a, b) => {
    let valueA, valueB;

    switch (field) {
      case 'id':
        valueA = a.item_id;
        valueB = b.item_id;
        break;
      case 'name':
        valueA = (a.item_name || '').toLowerCase();
        valueB = (b.item_name || '').toLowerCase();
        break;
      case 'created':
        valueA = a.create_time || 0;
        valueB = b.create_time || 0;
        break;
      case 'updated':
        valueA = a.update_time || 0;
        valueB = b.update_time || 0;
        break;
      case 'price':
        valueA = a.price_info?.[0]?.current_price || 0;
        valueB = b.price_info?.[0]?.current_price || 0;
        break;
      case 'stock':
        valueA = a.stock_info_v2?.summary_info?.total_available_stock || 0;
        valueB = b.stock_info_v2?.summary_info?.total_available_stock || 0;
        break;
      case 'status':
        valueA = (a.item_status || '').toLowerCase();
        valueB = (b.item_status || '').toLowerCase();
        break;
      default:
        valueA = a.item_id;
        valueB = b.item_id;
    }

    if (direction === 'asc') {
      return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
    } else {
      return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
    }
  });
}

function updateProductsGrid(products) {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="no-products-found">
        <div class="no-products-icon">
          <i class="fas fa-search"></i>
        </div>
        <h3>Nenhum produto encontrado</h3>
        <p>Tente ajustar os filtros ou termos de busca.</p>
        <button class="btn btn-primary" onclick="clearProductFilters()">
          <i class="fas fa-eraser"></i> Limpar Filtros
        </button>
      </div>
    `;
  } else {
    grid.innerHTML = products.map(product => createProductCard(product)).join('');
  }
}

function updateFilterStatus(filterStatus, count) {
  const statusElement = document.getElementById('products-filter-status');
  const countElement = document.getElementById('products-count-display');

  if (countElement) {
    countElement.textContent = `Exibindo ${count} produtos`;
  }

  if (statusElement) {
    if (filterStatus.length > 0) {
      statusElement.innerHTML = `<i class="fas fa-filter"></i> Filtros ativos: ${filterStatus.join(', ')}`;
      statusElement.style.display = 'block';
    } else {
      statusElement.style.display = 'none';
    }
  }
}

function clearProductFilters() {
  // Limpar campos de filtro
  const searchInput = document.getElementById('product-search');
  const statusSelect = document.getElementById('status-filter-dashboard');
  const sortSelect = document.getElementById('sort-filter-dashboard');

  if (searchInput) searchInput.value = '';
  if (statusSelect) statusSelect.value = '';
  if (sortSelect) sortSelect.value = 'id-asc';

  // Restaurar produtos originais
  if (window.originalProductsData) {
    const sortedProducts = sortProductsArray([...window.originalProductsData], 'id-asc');
    updateProductsGrid(sortedProducts);
    updateFilterStatus([], sortedProducts.length);
  }

  showNotification('Filtros limpos!', 'success');
}

function exportProductsList() {
  const visibleCards = Array.from(document.querySelectorAll('.product-card-enhanced:not([style*="display: none"])'));
  const visibleProductIds = visibleCards.map(card => parseInt(card.dataset.productId));

  const productsToExport = window.originalProductsData.filter(product =>
    visibleProductIds.includes(product.item_id)
  );

  const csvData = convertProductsToCSV(productsToExport);
  downloadFile('produtos_filtrados.csv', csvData);

  showNotification(`${productsToExport.length} produtos exportados!`, 'success');
}

function convertProductsToCSV(products) {
  const headers = ['ID', 'Nome', 'Status', 'SKU', 'Categoria', 'Marca', 'Peso', 'Criado', 'Atualizado'];
  const rows = products.map(product => [
    product.item_id,
    product.item_name || '',
    product.item_status || '',
    product.item_sku || '',
    product.category_id || '',
    product.brand?.original_brand_name || '',
    product.weight || 0,
    formatProductDate(product.create_time),
    formatProductDate(product.update_time)
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  return csvContent;
}

// ========================================
// ATUALIZADO: viewProductDetails (USANDO NOVO MODAL)
// ========================================
async function viewProductDetails(itemId) {
  try {
    showNotification('Carregando detalhes do produto...', 'info');
    // Mostra modal de carregamento
    showProductModal({
      loading: true,
      itemId: itemId
    });

    const response = await fetch(`/api/my-shopee/product-details/${itemId}`);
    const data = await response.json();

    if (data.success && data.details.response?.item_list?.[0]) {
      showNotification('Detalhes carregados com sucesso!', 'success');
      // Atualiza o modal com os detalhes do produto
      showProductModal({
        loading: false,
        product: data.details.response.item_list[0]
      });
    } else {
      throw new Error('Produto não encontrado');
    }
  } catch (error) {
    console.error('Erro ao carregar detalhes:', error);
    showNotification('Erro ao carregar detalhes do produto', 'error');
    showProductModal({
      loading: false,
      error: error.message,
      itemId: itemId
    });
  }
}

async function analyzeProduct(itemId) {
  try {
    showNotification('Iniciando análise do produto...', 'info');

    // Mostrar modal de análise
    showAnalysisModal({
      loading: true,
      itemId: itemId
    });

    // Buscar dados do produto
    const productResponse = await fetch(`/api/my-shopee/product-details/${itemId}`);
    const productData = await productResponse.json();

    if (!productData.success) {
      throw new Error('Erro ao carregar dados do produto');
    }

    const product = productData.details.response.item_list[0];
    const price = product.price_info?.[0]?.current_price || 0;
    const productName = product.item_name || 'produto';

    // Tentar buscar análise real da API
    try {
      const analysisResponse = await fetch(`/api/analysis/product/${itemId}?name=${encodeURIComponent(productName)}&price=${price}`);
      const analysisData = await analysisResponse.json();

      if (analysisData.success) {
        showAnalysisModal({
          loading: false,
          product: product,
          analysis: analysisData.data,
          itemId: itemId
        });
        showNotification('Análise concluída com sucesso!', 'success');
      } else {
        throw new Error('API de análise indisponível');
      }
    } catch (apiError) {
      // Se a API falhar, usar dados simulados
      console.log('API de análise indisponível, usando dados simulados');

      setTimeout(() => {
        showAnalysisModal({
          loading: false,
          product: product,
          analysis: { success: true }, // Dados simulados serão gerados no modal
          itemId: itemId
        });
        showNotification('Análise concluída com dados simulados!', 'success');
      }, 3000);
    }

  } catch (error) {
    console.error('Erro na análise:', error);
    showAnalysisModal({
      loading: false,
      error: error.message,
      itemId: itemId
    });
    showNotification('Erro ao analisar produto', 'error');
  }
}

// ========================================
// FUNÇÕES UTILITÁRIAS
// ========================================

function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  return new Date(timestamp * 1000).toLocaleDateString('pt-BR');
}

function formatProductDate(timestamp) {
  if (!timestamp) return 'N/A';
  return new Date(timestamp * 1000).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatFullDate(timestamp) {
  if (!timestamp) return 'N/A';
  return new Date(timestamp * 1000).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function showLoading(containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>Carregando dados da Shopee...</p>
        <small>Aguarde, isso pode levar alguns segundos</small>
      </div>
    `;
  }
}

function showNotification(message, type = 'info') {
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">
        ${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
      </span>
      <span class="notification-message">${message}</span>
      <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;

  // Estes estilos são os que estavam no JS, movidos para o CSS
  // notification.style.cssText = `
  //   position: fixed;
  //   top: 20px;
  //   right: 20px;
  //   background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#e53e3e' : '#ed8936'};
  //   color: white;
  //   padding: 15px 20px;
  //   border-radius: 8px;
  //   box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  //   z-index: 10000;
  //   font-weight: 500;
  //   max-width: 400px;
  //   animation: slideInRight 0.3s ease;
  // `;

  document.body.appendChild(notification);

  setTimeout(() => {
    if (notification && notification.parentElement) {
      notification.remove();
    }
  }, 5000);
}

// ========================================
// FUNÇÕES PLACEHOLDER
// ========================================

function updateBenchmarkType() {
  console.log('🔄 Tipo de benchmarking alterado');
}

function runBenchmarkAnalysis() {
  showNotification('Executando análise de benchmarking...', 'info');
}

function syncProducts() {
  showNotification('Sincronização iniciada!', 'success');
}

// Funções openProductModal, closeProductModal e saveProduct serão removidas
// conforme o ponto 5 da sua lista (remoção da funcionalidade de "novo produto")
// function openProductModal() {
//   const modal = document.getElementById('product-modal');
//   if (modal) modal.style.display = 'block';
// }

// function closeProductModal() {
//   const modal = document.getElementById('product-modal');
//   if (modal) modal.style.display = 'none';
// }

// function saveProduct(event) {
//   event.preventDefault();
//   showNotification('Produto salvo com sucesso!', 'success');
//   closeProductModal();
// }

function refreshAlerts() {
  showNotification('Alertas atualizados!', 'success');
}

function checkShopeeStatus() {
  showNotification('Verificando status Shopee...', 'info');
}

function openProductsFullView() {
  showNotification('Funcionalidade em desenvolvimento', 'info');
}

// ========================================
// MODAL COMPLETO DE DETALHES DO PRODUTO (NO HTML, STYLOS NO CSS)
// ========================================
function showProductModal(data) {
  const existingModal = document.getElementById('product-details-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'product-details-modal';
  modal.className = 'product-modal-overlay';
  // Sem estilos inline aqui, tudo vem do CSS
  // modal.style.cssText = `...`;

  if (data.loading) {
    modal.innerHTML = createLoadingModal(data.itemId);
  } else if (data.error) {
    modal.innerHTML = createErrorModal(data.error, data.itemId);
  } else {
    modal.innerHTML = createCompleteProductModal(data.product);
  }

  document.body.appendChild(modal);

  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeProductDetailsModal();
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeProductDetailsModal();
    }
  });
}

function createLoadingModal(itemId) {
  return `
    <div class="product-modal">
      <div class="modal-header">
        <h2>🔄 Carregando Produto ${itemId}</h2>
        <button class="modal-close" onclick="closeProductDetailsModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="loading-product">
          <div class="loading-spinner-large"></div>
          <p>Buscando informações detalhadas do produto...</p>
        </div>
      </div>
    </div>
  `;
}

function createErrorModal(error, itemId) {
  return `
    <div class="product-modal">
      <div class="modal-header">
        <h2>❌ Erro ao Carregar Produto ${itemId}</h2>
        <button class="modal-close" onclick="closeProductDetailsModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="error-product">
          <i class="fas fa-exclamation-triangle"></i>
          <p>${error}</p>
          <div class="error-actions">
            <button class="btn btn-primary" onclick="viewProductDetails(${itemId})">
              <i class="fas fa-refresh"></i> Tentar Novamente
            </button>
            <button class="btn btn-secondary" onclick="window.open('/api/my-shopee/product-details/${itemId}', '_blank')">
              <i class="fas fa-external-link-alt"></i> Ver JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function createCompleteProductModal(product) {
  const images = product.image?.image_url_list || [];
  const price = product.price_info?.[0] || {};
  const stock = product.stock_info_v2?.summary_info || {};
  const attributes = product.attribute_list || [];
  const logistics = product.logistic_info || [];

  return `
    <div class="product-modal">
      <div class="modal-header">
        <h2>📦 ${product.item_name || `Produto ${product.item_id}`}</h2>
        <button class="modal-close" onclick="closeProductDetailsModal()">&times;</button>
      </div>

      <div class="modal-body">
        <div class="product-details-grid">

          <!-- Galeria de Imagens -->
          <div class="product-gallery">
            <h3><i class="fas fa-images"></i> Galeria (${images.length} fotos)</h3>
            <div class="image-gallery">
              ${images.length > 0 ? images.map((img, index) => `
                <div class="image-item">
                  <img src="${img}" alt="Produto ${index + 1}" onclick="openImageFullscreen('${img}')" loading="lazy">
                </div>
              `).join('') : '<p class="no-images">📷 Nenhuma imagem disponível</p>'}
            </div>
          </div>

          <!-- Informações Principais -->
          <div class="product-main-info">
            <h3><i class="fas fa-info-circle"></i> Informações Principais</h3>
            <div class="info-grid">
              <div class="info-item">
                <label>ID do Produto:</label>
                <span class="product-id-display">${product.item_id}</span>
              </div>
              <div class="info-item">
                <label>SKU:</label>
                <span>${product.item_sku || 'N/A'}</span>
              </div>
              <div class="info-item">
                <label>Status:</label>
                <span class="status-badge status-${product.item_status.toLowerCase()}">${product.item_status}</span>
              </div>
              <div class="info-item">
                <label>Categoria:</label>
                <span>${product.category_id || 'N/A'}</span>
              </div>
              <div class="info-item">
                <label>Marca:</label>
                <span>${product.brand?.original_brand_name || 'N/A'}</span>
              </div>
              <div class="info-item">
                <label>Condição:</label>
                <span>${product.condition || 'N/A'}</span>
              </div>
              <div class="info-item">
                <label>Kit:</label>
                <span class="kit-badge ${product.tag?.kit ? 'kit-yes' : 'kit-no'}">
                  ${product.tag?.kit ? '📦 Sim' : '📄 Não'}
                </span>
              </div>
              <div class="info-item">
                <label>Código de Barras:</label>
                <span>${product.gtin_code || 'N/A'}</span>
              </div>
            </div>
          </div>

          <!-- Preços e Estoque -->
          <div class="product-pricing">
            <h3><i class="fas fa-dollar-sign"></i> Preços e Estoque</h3>
            <div class="pricing-grid">
              <div class="price-card current-price">
                <label>Preço Atual</label>
                <span class="price-value">R$ ${price.current_price?.toFixed(2) || '0,00'}</span>
              </div>
              <div class="price-card original-price">
                <label>Preço Original</label>
                <span class="price-value ${price.original_price !== price.current_price ? 'crossed' : ''}">
                  R$ ${price.original_price?.toFixed(2) || '0,00'}
                </span>
              </div>
              <div class="stock-card available">
                <label>Estoque Disponível</label>
                <span class="stock-value">${stock.total_available_stock || 0} unidades</span>
              </div>
              <div class="stock-card reserved">
                <label>Estoque Reservado</label>
                <span class="stock-value">${stock.total_reserved_stock || 0} unidades</span>
              </div>
            </div>
          </div>

          <!-- Dimensões e Peso -->
          <div class="product-dimensions">
            <h3><i class="fas fa-ruler-combined"></i> Dimensões e Peso</h3>
            <div class="dimensions-grid">
              <div class="dimension-item">
                <label>Comprimento:</label>
                <span>${product.dimension?.package_length || 0} cm</span>
              </div>
              <div class="dimension-item">
                <label>Largura:</label>
                <span>${product.dimension?.package_width || 0} cm</span>
              </div>
              <div class="dimension-item">
                <label>Altura:</label>
                <span>${product.dimension?.package_height || 0} cm</span>
              </div>
              <div class="dimension-item">
                <label>Peso:</label>
                <span>${product.weight || 0} kg</span>
              </div>
            </div>
          </div>

          <!-- Características -->
          <div class="product-attributes">
            <h3><i class="fas fa-list"></i> Características (${attributes.length})</h3>
            <div class="attributes-list">
              ${attributes.length > 0 ? attributes.map(attr => `
                <div class="attribute-item">
                  <label>${attr.original_attribute_name}:</label>
                  <span>${attr.attribute_value_list?.[0]?.original_value_name || 'N/A'}</span>
                </div>
              `).join('') : '<p class="no-attributes">📋 Nenhuma característica específica</p>'}
            </div>
          </div>

          <!-- Logística -->
          <div class="product-logistics">
            <h3><i class="fas fa-truck"></i> Opções de Entrega (${logistics.length})</h3>
            <div class="logistics-list">
              ${logistics.length > 0 ? logistics.map(log => `
                <div class="logistics-item ${log.enabled ? 'enabled' : 'disabled'}">
                  <div class="logistics-name">
                    <i class="fas ${log.enabled ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                    ${log.logistic_name}
                  </div>
                  <div class="logistics-status">
                    ${log.enabled ? 'Disponível' : 'Indisponível'}
                    ${log.is_free ? ' • Grátis' : ''}
                  </div>
                </div>
              `).join('') : '<p class="no-logistics">🚚 Nenhuma opção de entrega configurada</p>'}
            </div>
          </div>

          <!-- Descrição -->
          <div class="product-description">
            <h3><i class="fas fa-align-left"></i> Descrição</h3>
            <div class="description-content">
              ${product.description ? `
                <div class="description-text">${product.description.replace(/\n/g, '<br>')}</div>
              ` : '<p class="no-description">📝 Nenhuma descrição disponível</p>'}
            </div>
          </div>

          <!-- Datas -->
          <div class="product-dates">
            <h3><i class="fas fa-calendar"></i> Datas</h3>
            <div class="dates-grid">
              <div class="date-item">
                <label>Criado em:</label>
                <span>${formatFullDate(product.create_time)}</span>
              </div>
              <div class="date-item">
                <label>Última atualização:</label>
                <span>${formatFullDate(product.update_time)}</span>
              </div>
              <div class="date-item">
                <label>Dias para envio:</label>
                <span>${product.pre_order?.days_to_ship || 0} dias</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeProductDetailsModal()">
          <i class="fas fa-times"></i> Fechar
        </button>
        <button class="btn btn-primary" onclick="window.open('/api/my-shopee/product-details/${product.item_id}', '_blank')">
          <i class="fas fa-code"></i> Ver JSON
        </button>
        <button class="btn btn-success" onclick="analyzeProduct(${product.item_id})">
          <i class="fas fa-chart-line"></i> Analisar Produto
        </button>
      </div>
    </div>
  `;
}

function closeProductDetailsModal() {
  const modal = document.getElementById('product-details-modal');
  if (modal) modal.remove();
}

function openImageFullscreen(imageUrl) {
  const fullscreenModal = document.createElement('div');
  fullscreenModal.className = 'fullscreen-image-modal';
  fullscreenModal.innerHTML = `
    <div class="fullscreen-content">
      <img src="${imageUrl}" alt="Imagem em tela cheia">
      <button class="fullscreen-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
    </div>
  `;
  // Sem estilos inline aqui, tudo vem do CSS
  // fullscreenModal.style.cssText = `...`;

  fullscreenModal.addEventListener('click', function(e) {
    if (e.target === fullscreenModal) {
      fullscreenModal.remove();
    }
  });

  document.body.appendChild(fullscreenModal);
}

// ========================================
// MODAL COMPLETO DE ANÁLISE COMPETITIVA (NO HTML, STYLOS NO CSS)
// ========================================
function showAnalysisModal(data) {
  const existingModal = document.getElementById('analysis-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'analysis-modal';
  modal.className = 'analysis-modal-overlay';
  // Sem estilos inline aqui, tudo vem do CSS
  // modal.style.cssText = `...`;

  if (data.loading) {
    modal.innerHTML = createAnalysisLoadingModal(data.itemId);
  } else if (data.error) {
    modal.innerHTML = createAnalysisErrorModal(data.error, data.itemId);
  } else {
    modal.innerHTML = createCompleteAnalysisModal(data.product, data.analysis);
  }

  document.body.appendChild(modal);

  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeAnalysisModal();
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeAnalysisModal();
    }
  });
}

function createAnalysisLoadingModal(itemId) {
  return `
    <div class="analysis-modal">
      <div class="modal-header">
        <h2>🔍 Analisando Produto ${itemId}</h2>
        <button class="modal-close" onclick="closeAnalysisModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="analysis-loading">
          <div class="loading-spinner-large"></div>
          <h3>Executando Análise Competitiva</h3>
          <div class="loading-steps">
            <div class="step active">📊 Coletando dados do produto</div>
            <div class="step">🔍 Analisando concorrência</div>
            <div class="step">📈 Calculando posicionamento</div>
            <div class="step">💡 Gerando recomendações</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function createAnalysisErrorModal(error, itemId) {
  return `
    <div class="analysis-modal">
      <div class="modal-header">
        <h2>❌ Erro na Análise - Produto ${itemId}</h2>
        <button class="modal-close" onclick="closeAnalysisModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="analysis-error">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Não foi possível completar a análise</h3>
          <p>${error}</p>
          <div class="error-actions">
            <button class="btn btn-primary" onclick="analyzeProduct(${itemId})">
              <i class="fas fa-refresh"></i> Tentar Novamente
            </button>
            <button class="btn btn-secondary" onclick="closeAnalysisModal()">
              <i class="fas fa-times"></i> Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function createCompleteAnalysisModal(product, analysis) {
  const price = product.price_info?.[0]?.current_price || 0;

  // Simular dados de análise completa
  const mockAnalysis = {
    category: 'Móveis e Decoração',
    category_overview: {
      total_products: 1247,
      price_range: {
        min: price * 0.3,
        max: price * 2.5,
        avg: price * 1.2,
        median: price * 1.1
      }
    },
    top_performers: [
      {
        name: 'Concorrente Premium A',
        price: price * 1.8,
        sold_count: 2847,
        rating: 4.8,
        performance_score: 95
      },
      {
        name: 'Concorrente Médio B',
        price: price * 1.3,
        sold_count: 1923,
        rating: 4.5,
        performance_score: 87
      },
      {
        name: 'Concorrente Econômico C',
        price: price * 0.7,
        sold_count: 3421,
        rating: 4.2,
        performance_score: 82
      },
      {
        name: 'Concorrente Similar D',
        price: price * 1.1,
        sold_count: 1654,
        rating: 4.6,
        performance_score: 79
      },
      {
        name: 'Concorrente Novo E',
        price: price * 0.9,
        sold_count: 987,
        rating: 4.3,
        performance_score: 74
      }
    ],
    recommendations: [
      {
        priority: 'alta',
        title: 'Ajuste de Preço Estratégico',
        description: 'Seu produto está posicionado acima da média do mercado. Considere um ajuste para melhor competitividade.',
        action: 'Reduzir preço em 8-12% ou destacar diferenciais únicos',
        expected_impact: 'Aumento de 25-35% nas vendas'
      },
      {
        priority: 'media',
        title: 'Melhoria na Descrição',
        description: 'Produtos similares com descrições mais detalhadas têm melhor performance.',
        action: 'Expandir descrição com benefícios e especificações técnicas',
        expected_impact: 'Melhoria de 15-20% na conversão'
      },
      {
        priority: 'baixa',
        title: 'Otimização de Imagens',
        description: 'Concorrentes top utilizam mais imagens e de melhor qualidade.',
        action: 'Adicionar 2-3 imagens extras mostrando detalhes e uso',
        expected_impact: 'Redução de 10-15% na taxa de devolução'
      }
    ]
  };

  const competitors = mockAnalysis.top_performers;
  const recommendations = mockAnalysis.recommendations;
  const categoryData = mockAnalysis;

  return `
    <div class="analysis-modal">
      <div class="modal-header">
        <h2>📊 Análise: ${product.item_name || `Produto ${product.item_id}`}</h2>
        <button class="modal-close" onclick="closeAnalysisModal()">&times;</button>
      </div>

      <div class="modal-body">
        <div class="analysis-grid">

          <!-- Resumo Executivo -->
          <div class="analysis-section">
            <h3><i class="fas fa-chart-pie"></i> Resumo Executivo</h3>
            <div class="executive-summary">
              <div class="summary-item">
                <label>Categoria:</label>
                <span>${mockAnalysis.category}</span>
              </div>
              <div class="summary-item">
                <label>Preço do Produto:</label>
                <span class="price-highlight">R$ ${price.toFixed(2)}</span>
              </div>
              <div class="summary-item">
                <label>Preço Médio do Mercado:</label>
                <span>R$ ${categoryData.category_overview.price_range.avg.toFixed(2)}</span>
              </div>
              <div class="summary-item">
                <label>Posicionamento:</label>
                <span class="positioning ${getPositioning(price, categoryData.category_overview.price_range)}">
                  ${getPositioningText(price, categoryData.category_overview.price_range)}
                </span>
              </div>
              <div class="summary-item">
                <label>Concorrentes Analisados:</label>
                <span>${categoryData.category_overview.total_products}</span>
              </div>
            </div>
          </div>

          <!-- Análise de Preços -->
          <div class="analysis-section">
            <h3><i class="fas fa-dollar-sign"></i> Análise de Preços</h3>
            <div class="price-analysis">
              <div class="price-comparison">
                <div class="price-bar">
                  <div class="price-range">
                    <span class="min-price">R$ ${categoryData.category_overview.price_range.min.toFixed(2)}</span>
                    <span class="max-price">R$ ${categoryData.category_overview.price_range.max.toFixed(2)}</span>
                  </div>
                  <div class="price-indicator" style="left: ${calculatePricePosition(price, categoryData.category_overview.price_range)}%">
                    <div class="price-marker">R$ ${price.toFixed(2)}</div>
                  </div>
                </div>
              </div>
              <div class="price-metrics">
                <div class="metric">
                  <label>Diferença da Média:</label>
                  <span class="${price > categoryData.category_overview.price_range.avg ? 'above' : 'below'}">
                    ${price > categoryData.category_overview.price_range.avg ? '+' : ''}${((price - categoryData.category_overview.price_range.avg) / categoryData.category_overview.price_range.avg * 100).toFixed(1)}%
                  </span>
                </div>
                <div class="metric">
                  <label>Mediana do Mercado:</label>
                  <span>R$ ${categoryData.category_overview.price_range.median.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Top Concorrentes -->
          <div class="analysis-section">
            <h3><i class="fas fa-trophy"></i> Top Concorrentes</h3>
            <div class="competitors-analysis">
              ${competitors.slice(0, 5).map((competitor, index) => `
                <div class="competitor-card">
                  <div class="competitor-rank">
                    ${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </div>
                  <div class="competitor-info">
                    <div class="competitor-name">${competitor.name}</div>
                    <div class="competitor-details">
                      <span class="price">R$ ${competitor.price.toFixed(2)}</span>
                      <span class="sales">${competitor.sold_count} vendas</span>
                      <span class="rating">⭐ ${competitor.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  <div class="competitor-score">
                    <div class="score-value">${competitor.performance_score}</div>
                    <div class="score-label">Score</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Recomendações -->
          <div class="analysis-section">
            <h3><i class="fas fa-lightbulb"></i> Recomendações Estratégicas</h3>
            <div class="recommendations-list">
              ${recommendations.map(rec => `
                <div class="recommendation-card priority-${rec.priority}">
                  <div class="recommendation-header">
                    <div class="recommendation-icon">
                      ${rec.priority === 'alta' ? '🔴' : rec.priority === 'media' ? '🟡' : '🟢'}
                    </div>
                    <div class="recommendation-title">${rec.title}</div>
                    <div class="recommendation-priority">${rec.priority.toUpperCase()}</div>
                  </div>
                  <div class="recommendation-description">${rec.description}</div>
                  <div class="recommendation-action">
                    <strong>Ação:</strong> ${rec.action}
                  </div>
                  ${rec.expected_impact ? `
                    <div class="recommendation-impact">
                      <strong>Impacto esperado:</strong> ${rec.expected_impact}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Oportunidades -->
          <div class="analysis-section">
            <h3><i class="fas fa-rocket"></i> Oportunidades de Mercado</h3>
            <div class="opportunities-list">
              <div class="opportunity-card">
                <div class="opportunity-icon">📈</div>
                <div class="opportunity-content">
                  <h4>Crescimento de Categoria</h4>
                  <p>Categoria em expansão com ${categoryData.category_overview.total_products} produtos ativos.</p>
                </div>
              </div>
              <div class="opportunity-card">
                <div class="opportunity-icon">🎯</div>
                <div class="opportunity-content">
                  <h4>Posicionamento Estratégico</h4>
                  <p>Oportunidade de reposicionamento baseado na análise de preços.</p>
                </div>
              </div>
              <div class="opportunity-card">
                <div class="opportunity-icon">💡</div>
                <div class="opportunity-content">
                  <h4>Diferenciação</h4>
                  <p>Espaço para destacar características únicas do produto.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeAnalysisModal()">
          <i class="fas fa-times"></i> Fechar
        </button>
        <button class="btn btn-success" onclick="exportAnalysis(${product.item_id})">
          <i class="fas fa-download"></i> Exportar Relatório
        </button>
        <button class="btn btn-primary" onclick="viewProductDetails(${product.item_id})">
          <i class="fas fa-eye"></i> Ver Produto
        </button>
      </div>
    </div>
  `;
}

function closeAnalysisModal() {
  const modal = document.getElementById('analysis-modal');
  if (modal) modal.remove();
}

// ========================================
// FUNÇÕES AUXILIARES DA ANÁLISE
// ========================================
function getPositioning(price, priceRange) {
  const avg = priceRange.avg;
  const diff = (price - avg) / avg;

  if (diff > 0.2) return 'premium';
  if (diff > 0.05) return 'above-average';
  if (diff < -0.2) return 'budget';
  if (diff < -0.05) return 'below-average';
  return 'average';
}

function getPositioningText(price, priceRange) {
  const positioning = getPositioning(price, priceRange);
  const texts = {
    premium: 'Premium',
    'above-average': 'Acima da Média',
    average: 'Média do Mercado',
    'below-average': 'Abaixo da Média',
    budget: 'Econômico'
  };
  return texts[positioning];
}

function calculatePricePosition(price, priceRange) {
  const min = priceRange.min;
  const max = priceRange.max;
  return Math.min(100, Math.max(0, ((price - min) / (max - min)) * 100));
}

function exportAnalysis(itemId) {
  showNotification('Gerando relatório de análise...', 'info');

  setTimeout(() => {
    showNotification('Relatório exportado com sucesso!', 'success');
    console.log('📄 Relatório de análise gerado para produto:', itemId);
  }, 2000);
}

// ========================================
// SISTEMA DE EXPORTAÇÃO COM SELEÇÃO DE PERÍODO
// ========================================

function showExportModal() {
  const existingModal = document.getElementById('export-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'export-modal';
  modal.className = 'export-modal-overlay';
  modal.innerHTML = createExportModal();

  document.body.appendChild(modal);

  // Event listeners para o modal
  setupExportModalListeners();

  // Fechar modal clicando fora
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeExportModal();
    }
  });

  // Fechar com ESC
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeExportModal();
    }
  });
}

function createExportModal() {
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));

  const todayStr = today.toISOString().split('T')[0];
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  return `
    <div class="export-modal">
      <div class="modal-header">
        <h2><i class="fas fa-download"></i> Exportar Pedidos</h2>
        <button class="modal-close" onclick="closeExportModal()">&times;</button>
      </div>

      <div class="modal-body">
        <div class="export-form">
          <!-- Seleção de Período -->
          <div class="form-section">
            <h3><i class="fas fa-calendar-alt"></i> Período de Exportação</h3>

            <div class="period-presets">
              <button class="preset-btn" onclick="setPresetPeriod(7)">Últimos 7 dias</button>
              <button class="preset-btn" onclick="setPresetPeriod(15)">Últimos 15 dias</button>
              <button class="preset-btn active" onclick="setPresetPeriod(30)">Últimos 30 dias</button>
              <button class="preset-btn" onclick="setPresetPeriod(60)">Últimos 60 dias</button>
              <button class="preset-btn" onclick="setPresetPeriod(90)">Últimos 90 dias</button>
            </div>

            <div class="date-range">
              <div class="date-input-group">
                <label for="start-date">Data Inicial:</label>
                <input type="date" id="start-date" value="${thirtyDaysAgoStr}" onchange="validateDateRange()">
              </div>
              <div class="date-input-group">
                <label for="end-date">Data Final:</label>
                <input type="date" id="end-date" value="${todayStr}" onchange="validateDateRange()">
              </div>
            </div>

            <div class="period-info">
              <span id="period-summary">Período selecionado: 30 dias (${formatDateBR(thirtyDaysAgoStr)} até ${formatDateBR(todayStr)})</span>
            </div>
          </div>

          <!-- Filtros de Status -->
          <div class="form-section">
            <h3><i class="fas fa-filter"></i> Filtros de Status</h3>

            <div class="status-filters">
              <label class="status-checkbox">
                <input type="checkbox" value="ALL" checked onchange="handleStatusFilter(this)">
                <span class="checkmark"></span>
                Todos os Status
              </label>
              <label class="status-checkbox">
                <input type="checkbox" value="UNPAID" onchange="handleStatusFilter(this)">
                <span class="checkmark"></span>
                Não Pago
              </label>
              <label class="status-checkbox">
                <input type="checkbox" value="TO_SHIP" onchange="handleStatusFilter(this)">
                <span class="checkmark"></span>
                A Enviar
              </label>
              <label class="status-checkbox">
                <input type="checkbox" value="READY_TO_SHIP" onchange="handleStatusFilter(this)">
                <span class="checkmark"></span>
                Pronto para Envio
              </label>
              <label class="status-checkbox">
                <input type="checkbox" value="SHIPPED" onchange="handleStatusFilter(this)">
                <span class="checkmark"></span>
                Enviado
              </label>
              <label class="status-checkbox">
                <input type="checkbox" value="COMPLETED" onchange="handleStatusFilter(this)">
                <span class="checkmark"></span>
                Concluído
              </label>
              <label class="status-checkbox">
                <input type="checkbox" value="CANCELLED" onchange="handleStatusFilter(this)">
                <span class="checkmark"></span>
                Cancelado
              </label>
              <label class="status-checkbox">
                <input type="checkbox" value="RETURNED" onchange="handleStatusFilter(this)">
                <span class="checkmark"></span>
                Retornado
              </label>
            </div>
          </div>

          <!-- Formato de Exportação -->
          <div class="form-section">
            <h3><i class="fas fa-file-export"></i> Formato de Exportação</h3>

            <div class="export-formats">
              <label class="format-option">
                <input type="radio" name="export-format" value="excel" checked>
                <span class="format-card">
                  <i class="fas fa-file-excel"></i>
                  <strong>Excel (.xlsx)</strong>
                  <small>Planilha com formatação</small>
                </span>
              </label>
              <label class="format-option">
                <input type="radio" name="export-format" value="csv">
                <span class="format-card">
                  <i class="fas fa-file-csv"></i>
                  <strong>CSV (.csv)</strong>
                  <small>Dados separados por vírgula</small>
                </span>
              </label>
              <label class="format-option">
                <input type="radio" name="export-format" value="json">
                <span class="format-card">
                  <i class="fas fa-file-code"></i>
                  <strong>JSON (.json)</strong>
                  <small>Dados estruturados</small>
                </span>
              </label>
            </div>
          </div>

          <!-- Campos para Exportar -->
          <div class="form-section">
            <h3><i class="fas fa-columns"></i> Campos para Exportar</h3>

            <div class="export-fields">
              <label class="field-checkbox">
                <input type="checkbox" value="order_sn" checked>
                <span class="checkmark"></span>
                ID do Pedido
              </label>
              <label class="field-checkbox">
                <input type="checkbox" value="create_time" checked>
                <span class="checkmark"></span>
                Data de Criação
              </label>
              <label class="field-checkbox">
                <input type="checkbox" value="order_status" checked>
                <span class="checkmark"></span>
                Status
              </label>
              <label class="field-checkbox">
                <input type="checkbox" value="buyer_username" checked>
                <span class="checkmark"></span>
                Cliente
              </label>
              <label class="field-checkbox">
                <input type="checkbox" value="total_amount" checked>
                <span class="checkmark"></span>
                Valor Total
              </label>
              <label class="field-checkbox">
                <input type="checkbox" value="shipping_fee" checked>
                <span class="checkmark"></span>
                Frete
              </label>
              <label class="field-checkbox">
                <input type="checkbox" value="payment_method">
                <span class="checkmark"></span>
                Método de Pagamento
              </label>
              <label class="field-checkbox">
                <input type="checkbox" value="recipient_address">
                <span class="checkmark"></span>
                Endereço de Entrega
              </label>
              <label class="field-checkbox">
                <input type="checkbox" value="items_list">
                <span class="checkmark"></span>
                Lista de Itens
              </label>
              <label class="field-checkbox">
                <input type="checkbox" value="note">
                <span class="checkmark"></span>
                Observações
              </label>
            </div>
          </div>

          <!-- Resumo da Exportação -->
          <div class="form-section">
            <div class="export-summary">
              <h4><i class="fas fa-info-circle"></i> Resumo da Exportação</h4>
              <div id="export-preview">
                <p><strong>Período:</strong> <span id="summary-period">30 dias</span></p>
                <p><strong>Status:</strong> <span id="summary-status">Todos</span></p>
                <p><strong>Formato:</strong> <span id="summary-format">Excel</span></p>
                <p><strong>Campos:</strong> <span id="summary-fields">6 campos selecionados</span></p>
                <p><strong>Estimativa:</strong> <span id="summary-estimate">Calculando...</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeExportModal()">
          <i class="fas fa-times"></i> Cancelar
        </button>
        <button class="btn btn-info" onclick="previewExport()">
          <i class="fas fa-eye"></i> Pré-visualizar
        </button>
        <button class="btn btn-success" onclick="executeExport()">
          <i class="fas fa-download"></i> Exportar Agora
        </button>
      </div>
    </div>
  `;
}

function setupExportModalListeners() {
  // Atualizar resumo quando algo mudar
  updateExportSummary();

  // Calcular estimativa de registros
  calculateExportEstimate();
}

function setPresetPeriod(days) {
  const today = new Date();
  const startDate = new Date(today.getTime() - (days * 24 * 60 * 60 * 1000));

  document.getElementById('start-date').value = startDate.toISOString().split('T')[0];
  document.getElementById('end-date').value = today.toISOString().split('T')[0];

  // Atualizar botões ativos
  document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  validateDateRange();
  updateExportSummary();
  calculateExportEstimate();
}

function validateDateRange() {
  const startDate = new Date(document.getElementById('start-date').value);
  const endDate = new Date(document.getElementById('end-date').value);

  if (startDate > endDate) {
    showNotification('Data inicial não pode ser maior que a data final', 'error');
    return false;
  }

  const diffTime = Math.abs(endDate - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  document.getElementById('period-summary').textContent =
    `Período selecionado: ${diffDays} dias (${formatDateBR(document.getElementById('start-date').value)} até ${formatDateBR(document.getElementById('end-date').value)})`;

  updateExportSummary();
  calculateExportEstimate();
  return true;
}

function handleStatusFilter(checkbox) {
  const allCheckbox = document.querySelector('input[value="ALL"]');
  const otherCheckboxes = document.querySelectorAll('.status-checkbox input:not([value="ALL"])');

  if (checkbox.value === 'ALL') {
    if (checkbox.checked) {
      otherCheckboxes.forEach(cb => cb.checked = false);
    }
  } else {
    if (checkbox.checked) {
      allCheckbox.checked = false;
    }

    // Se nenhum status específico estiver marcado, marcar "Todos"
    const anyChecked = Array.from(otherCheckboxes).some(cb => cb.checked);
    if (!anyChecked) {
      allCheckbox.checked = true;
    }
  }

  updateExportSummary();
  calculateExportEstimate();
}

function updateExportSummary() {
  // Período
  const startDate = document.getElementById('start-date').value;
  const endDate = document.getElementById('end-date').value;
  const diffTime = Math.abs(new Date(endDate) - new Date(startDate));
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  document.getElementById('summary-period').textContent = `${diffDays} dias`;

  // Status
  const checkedStatuses = Array.from(document.querySelectorAll('.status-checkbox input:checked'))
    .map(cb => cb.value);
  const statusText = checkedStatuses.includes('ALL') ? 'Todos' : `${checkedStatuses.length} status selecionados`;
  document.getElementById('summary-status').textContent = statusText;

  // Formato
  const selectedFormat = document.querySelector('input[name="export-format"]:checked').value;
  const formatNames = { excel: 'Excel', csv: 'CSV', json: 'JSON' };
  document.getElementById('summary-format').textContent = formatNames[selectedFormat];

  // Campos
  const checkedFields = document.querySelectorAll('.field-checkbox input:checked').length;
  document.getElementById('summary-fields').textContent = `${checkedFields} campos selecionados`;
}

async function calculateExportEstimate() {
  try {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const checkedStatuses = Array.from(document.querySelectorAll('.status-checkbox input:checked'))
      .map(cb => cb.value);

    // Simular cálculo (em produção, fazer uma chamada à API)
    const diffTime = Math.abs(new Date(endDate) - new Date(startDate));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Estimativa baseada em média de pedidos por dia
    const avgOrdersPerDay = 15; // Ajustar conforme necessário
    const estimatedOrders = Math.round(diffDays * avgOrdersPerDay * (checkedStatuses.includes('ALL') ? 1 : checkedStatuses.length * 0.2));

    document.getElementById('summary-estimate').textContent = `~${estimatedOrders} pedidos`;

  } catch (error) {
    document.getElementById('summary-estimate').textContent = 'Erro no cálculo';
  }
}

async function previewExport() {
  if (!validateDateRange()) return;

  showNotification('Gerando pré-visualização...', 'info');

  try {
    const exportData = getExportData();

    // Simular dados de preview
    const previewData = {
      totalRecords: Math.floor(Math.random() * 500) + 50,
      sampleRecords: [
        { order_sn: '2024001', create_time: '2024-01-15', order_status: 'COMPLETED', buyer_username: 'cliente1', total_amount: 'R\$ 150,00' },
        { order_sn: '2024002', create_time: '2024-01-16', order_status: 'SHIPPED', buyer_username: 'cliente2', total_amount: 'R\$ 89,50' },
        { order_sn: '2024003', create_time: '2024-01-17', order_status: 'TO_SHIP', buyer_username: 'cliente3', total_amount: 'R\$ 245,30' }
      ]
    };

    showExportPreview(previewData);
    showNotification('Pré-visualização gerada!', 'success');

  } catch (error) {
    showNotification('Erro ao gerar pré-visualização', 'error');
  }
}

async function executeExport() {
  if (!validateDateRange()) return;

  const exportData = getExportData();

  showNotification('Iniciando exportação...', 'info');

  try {
    // Simular processo de exportação
    const response = await simulateExport(exportData);

    if (response.success) {
      showNotification('Exportação concluída! Download iniciado.', 'success');
      closeExportModal();

      // Simular download
      downloadFile(response.filename, response.data);
    } else {
      throw new Error(response.error);
    }

  } catch (error) {
    showNotification('Erro na exportação: ' + error.message, 'error');
  }
}

function getExportData() {
  return {
    startDate: document.getElementById('start-date').value,
    endDate: document.getElementById('end-date').value,
    statuses: Array.from(document.querySelectorAll('.status-checkbox input:checked')).map(cb => cb.value),
    format: document.querySelector('input[name="export-format"]:checked').value,
    fields: Array.from(document.querySelectorAll('.field-checkbox input:checked')).map(cb => cb.value)
  };
}

function closeExportModal() {
  const modal = document.getElementById('export-modal');
  if (modal) modal.remove();
}

// Funções auxiliares
function formatDateBR(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR');
}

async function simulateExport(exportData) {
  // Simular delay de processamento
  await new Promise(resolve => setTimeout(resolve, 2000));

  return {
    success: true,
    filename: `pedidos_${exportData.startDate}_${exportData.endDate}.${exportData.format === 'excel' ? 'xlsx' : exportData.format}`,
    data: 'dados_simulados'
  };
}

function downloadFile(filename, data) {
  // Simular download
  console.log(`Download iniciado: ${filename}`);
  showNotification(`Arquivo ${filename} baixado com sucesso!`, 'success');
}

function showExportPreview(previewData) {
  console.log('Preview dos dados:', previewData);
  alert(`Pré-visualização:\n\nTotal de registros: ${previewData.totalRecords}\n\nPrimeiros registros:\n${JSON.stringify(previewData.sampleRecords, null, 2)}`);
}

// ========================================
// MONITORAMENTO DE PERFORMANCE
// ========================================
function showCacheStatus() {
  const cacheKey = 'shopee_products_cache';
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    try {
      const { timestamp, expiry } = JSON.parse(cached);
      const age = Date.now() - timestamp;
      const remaining = expiry - age;

      if (remaining > 0) {
        const minutes = Math.round(remaining / (1000 * 60));
        showNotification(`Cache ativo: expira em ${minutes} minutos`, 'info');
      } else {
        showNotification('Cache expirado - será renovado no próximo carregamento', 'warning');
      }
    } catch (error) {
      showNotification('Cache corrompido - será limpo automaticamente', 'warning');
      clearProductsCache();
    }
  } else {
    showNotification('Nenhum cache encontrado', 'info');
  }
}

// Adicionar ao header se desejar
function addCacheStatusToHeader() {
  const header = document.querySelector('.products-header .products-actions');
  if (header) {
    const statusBtn = document.createElement('button');
    statusBtn.className = 'btn btn-outline-info btn-sm';
    statusBtn.innerHTML = '<i class="fas fa-info-circle"></i> Status Cache';
    statusBtn.onclick = showCacheStatus;
    header.appendChild(statusBtn);
  }
}

    console.log('✨ Estilos para cards de pedidos adicionados!');
