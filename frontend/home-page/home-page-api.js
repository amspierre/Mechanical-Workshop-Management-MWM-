const API_URL = window.MWM_API_URL || 'http://localhost:3000/api/v1';
const TOKEN_KEY = 'mwm_access_token';
const NHTSA_API_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles';
const ALLBRANDS_API_URL = 'https://allbrands.com.br/api/veiculos';
let DB = { clientes: [], funcionarios: [], veiculos: [], ordens_servico: [] };
let VEHICLE_CATALOG = { marcas: [] };

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = '../login-page/login.html';
    throw new Error('Session expired. Please log in again.');
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Could not communicate with the API.');
  }
  return response.status === 204 ? null : response.json();
}

function showApiError(error) { console.error(error); window.alert(error.message || 'An error occurred while communicating with the API.'); }
function getClient(id) { return DB.clientes.find(item => Number(item.id) === Number(id)) || null; }
function getEmployee(id) { return DB.funcionarios.find(item => Number(item.id) === Number(id)) || null; }
function getVehicle(id) { return DB.veiculos.find(item => Number(item.id) === Number(id)) || null; }
function getOrder(id) { return DB.ordens_servico.find(item => Number(item.id) === Number(id)); }

async function loadDB() {
  const [clients, staff, vehicles, orders] = await Promise.all([
    apiFetch('/clientes?limit=1000'), apiFetch('/funcionarios?limit=1000'),
    apiFetch('/veiculos?limit=1000'), apiFetch('/ordens-servico?limit=1000&sort=data_inicio_desc')
  ]);
  DB = { clientes: clients.data || [], funcionarios: staff.data || [], veiculos: vehicles.data || [], ordens_servico: orders.data || [] };
}

async function loadDashboard() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return apiFetch(`/dashboard/resumo?de=${from}&ate=${to}`);
}

function entityLink(type, id, label) {
  const link = document.createElement('a'); link.href = '#'; link.className = 'entity-link';
  link.dataset.profileType = type; link.dataset.profileId = id; link.textContent = label; return link;
}

async function loadVehicleCatalog() {
  try {
    const response = await fetch(`${NHTSA_API_URL}/GetAllMakes?format=json`, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('NHTSA unavailable');
    const payload = await response.json();
    const brands = Array.isArray(payload.Results) ? payload.Results : [];
    VEHICLE_CATALOG = {
      marcas: brands
        .map(brand => ({
          codigo: String(brand.Make_ID || brand.make_id || ''),
          marca: String(brand.Make_Name || brand.make_name || '').trim(),
          modelos: []
        }))
        .filter(brand => brand.marca)
    };
  } catch (error) {
    VEHICLE_CATALOG = { marcas: [] };
  }
}

function getCatalogVehicleOptions() {
  return VEHICLE_CATALOG?.marcas || [];
}

function getCatalogBrandByName(marca) {
  const brands = getCatalogVehicleOptions();
  if (!marca) return null;
  return brands.find(item => String(item.marca || '').toLowerCase() === String(marca).trim().toLowerCase()) || null;
}

function normalizeThumbPayload(payload) {
  if (!payload) return '';

  if (Array.isArray(payload)) {
    const item = payload[0] || {};
    return item.thumb || item.thumbnail || item.imagem || item.image || item.logo || item.url || '';
  }

  if (Array.isArray(payload.data)) {
    const item = payload.data[0] || {};
    return item.thumb || item.thumbnail || item.imagem || item.image || item.logo || item.url || '';
  }

  if (payload.data && typeof payload.data === 'object') {
    const item = payload.data;
    return item.thumb || item.thumbnail || item.imagem || item.image || item.logo || item.url || '';
  }

  if (payload.results && Array.isArray(payload.results)) {
    const item = payload.results[0] || {};
    return item.thumb || item.thumbnail || item.imagem || item.image || item.logo || item.url || '';
  }

  return payload.thumb || payload.thumbnail || payload.imagem || payload.image || payload.logo || payload.url || '';
}

async function fetchAllBrandsThumb(marca, modelo) {
  try {
    const params = new URLSearchParams();
    params.set('marca', String(marca || '').trim());
    params.set('modelo', String(modelo || '').trim());

    const response = await fetch(`${ALLBRANDS_API_URL}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      mode: 'cors'
    });

    if (!response.ok) return '';
    const payload = await response.json().catch(() => ({}));
    const thumb = normalizeThumbPayload(payload);
    return thumb;
  } catch (error) {
    return '';
  }
}

function vehicleCardFallbackImage(vehicle) {
  return `<div class="vehicle-image-fallback"><i class="bi bi-car-front"></i></div>`;
}

async function renderVehicles() {
  const container = document.getElementById('vehiclesList'); if (!container) return;
  container.innerHTML = '';
  if (!DB.veiculos.length) { container.innerHTML = '<div class="card p-3">No vehicles</div>'; return; }

  const grid = document.createElement('div');
  grid.className = 'vehicles-grid';

  const promises = DB.veiculos.map(async vehicle => {
    const card = document.createElement('article');
    card.className = 'vehicle-card';

    const imgWrap = document.createElement('div');
    imgWrap.className = 'vehicle-card-image';

    const img = document.createElement('img');
    img.alt = `${vehicle.marca || ''} ${vehicle.modelo || ''}`;

    const allBrandsThumb = await fetchAllBrandsThumb(vehicle.marca, vehicle.modelo);
    const imageUrl = vehicle.thumbnail_url || vehicle.imagem || vehicle.image_url || allBrandsThumb || '';
    img.src = imageUrl;

    img.onerror = () => {
      if (img.parentNode) {
        img.parentNode.innerHTML = vehicleCardFallbackImage(vehicle);
      }
    };

    if (imageUrl) {
      imgWrap.appendChild(img);
    } else {
      imgWrap.innerHTML = vehicleCardFallbackImage(vehicle);
    }

    const body = document.createElement('div');
    body.className = 'vehicle-card-body';

    const titleRow = document.createElement('div');
    titleRow.className = 'vehicle-card-title';

    const title = document.createElement('strong');
    title.textContent = `${vehicle.marca || 'Unknown'} ${vehicle.modelo || ''}`;

    const plate = document.createElement('span');
    plate.className = 'vehicle-card-plate';
    plate.textContent = vehicle.placa || 'No plate';

    titleRow.append(title, plate);

    const model = document.createElement('div');
    model.className = 'vehicle-card-model';
    model.textContent = `${vehicle.cor || 'Vehicle'} · ${vehicle.carroceria || 'Body'} · ${vehicle.quilometragem ?? 0} km`;

    const ownerLine = document.createElement('div');
    ownerLine.className = 'vehicle-card-client';
    const owner = getClient(vehicle.cliente_id);
    if (owner) {
      ownerLine.innerHTML = `<span class="owner-label">Owner:</span> ${entityLink('client', owner.id, owner.nome).outerHTML}`;
    } else {
      ownerLine.textContent = 'Owner: -';
    }

    body.append(titleRow, model, ownerLine);
    card.append(imgWrap, body);
    grid.appendChild(card);
  });

  await Promise.all(promises);
  container.appendChild(grid);
}

function renderClients() {
  const container = document.getElementById('clientsList'); if (!container) return;
  container.innerHTML = ''; if (!DB.clientes.length) { container.innerHTML = '<div class="card p-3">No clients</div>'; return; }
  const list = document.createElement('div'); list.className = 'list-group';
  DB.clientes.forEach(client => {
    const item = document.createElement('div'); item.className = 'list-group-item';
    const heading = document.createElement('div'); heading.className = 'd-flex w-100 justify-content-between';
    const name = entityLink('client', client.id, client.nome); name.className += ' h6 mb-1';
    const documentNumber = document.createElement('small'); documentNumber.textContent = client.cpf_cnpj || '-'; heading.append(name, documentNumber);
    const contact = document.createElement('p'); contact.className = 'mb-1'; contact.textContent = `${client.email || '-'} | ${client.telefone || '-'}`;
    const address = document.createElement('small'); address.textContent = client.endereco || '-'; item.append(heading, contact, address); list.appendChild(item);
  });
  container.appendChild(list);
}

function renderStaff() {
  const container = document.getElementById('staffList'); if (!container) return;
  container.innerHTML = ''; if (!DB.funcionarios.length) { container.innerHTML = '<div class="card p-3">No staff members</div>'; return; }
  const list = document.createElement('div'); list.className = 'list-group';
  DB.funcionarios.forEach(staff => {
    const item = document.createElement('div'); item.className = 'list-group-item';
    const heading = document.createElement('div'); heading.className = 'd-flex w-100 justify-content-between';
    const name = entityLink('staff', staff.id, staff.nome); name.className += ' h6 mb-1';
    const registration = document.createElement('small'); registration.textContent = staff.matricula || '-'; heading.append(name, registration);
    const role = document.createElement('p'); role.className = 'mb-0'; role.textContent = staff.cargo || '-'; item.append(heading, role); list.appendChild(item);
  });
  container.appendChild(list);
}

function renderSummaries(summary) {
  const cards = document.querySelectorAll('.summary-grid .display-4'); if (cards.length < 4) return;
  cards[0].textContent = summary?.ordens_abertas ?? DB.ordens_servico.filter(order => order.status === 'em_andamento').length;
  cards[1].textContent = summary?.veiculos_total ?? DB.veiculos.length;
  cards[2].textContent = `$${Number(summary?.receita_periodo ?? 0).toFixed(2)}`;
  cards[3].textContent = summary?.clientes_ativos ?? DB.clientes.length;
}

function renderOrdersTable(orders) {
  const tbody = document.querySelector('.data-table tbody'); if (!tbody) return; tbody.innerHTML = '';
  orders.forEach(order => {
    const row = document.createElement('tr'); row.className = 'order-row'; row.dataset.orderId = order.id; const employee = getEmployee(order.responsavel_id); const vehicle = getVehicle(order.veiculo_id);
    const id = document.createElement('td'); id.className = 'text-truncate align-middle'; id.textContent = String(order.id).padStart(4, '0');
    const title = document.createElement('td'); title.className = 'text-truncate align-middle'; title.textContent = order.titulo;
    const responsible = document.createElement('td'); responsible.className = 'text-truncate align-middle'; if (employee) responsible.appendChild(entityLink('staff', employee.id, employee.nome)); else responsible.textContent = '-';
    const vehicleCell = document.createElement('td'); vehicleCell.className = 'd-none d-sm-table-cell text-truncate align-middle'; if (vehicle) vehicleCell.appendChild(entityLink('vehicle', vehicle.id, `${vehicle.marca} ${vehicle.modelo}`)); else vehicleCell.textContent = '-';
    const value = document.createElement('td'); value.className = 'd-none d-sm-table-cell text-end text-truncate align-middle'; value.textContent = order.valor ? `$${Number(order.valor).toFixed(2)}` : '-';
    const actions = document.createElement('td'); actions.className = 'text-end'; actions.style.whiteSpace = 'nowrap';
    const edit = document.createElement('button'); edit.className = 'btn btn-sm btn-outline-primary me-1'; edit.textContent = 'Edit'; edit.dataset.id = order.id;
    const remove = document.createElement('button'); remove.className = 'btn btn-sm btn-outline-danger'; remove.textContent = 'Delete'; remove.dataset.id = order.id; actions.append(edit, remove);
    row.append(id, title, responsible, vehicleCell, value, actions); tbody.appendChild(row);
  });
}

function populateResponsibleFilter() {
  const select = document.querySelector('select[aria-label="Responsible"]'); if (!select) return;
  select.innerHTML = '<option value="All">All</option>'; DB.funcionarios.forEach(staff => select.appendChild(new Option(staff.nome, staff.id)));
}

async function filterOrders() {
  const form = document.querySelector('.filters form'); const params = new URLSearchParams({ limit: '1000', sort: 'data_inicio_desc' });
  const orderBy = form.querySelector('[aria-label="Order by"]').value.toLowerCase(); const responsible = form.querySelector('[aria-label="Responsible"]').value;
  const from = form.querySelector('[aria-label="From date"]').value; const to = form.querySelector('[aria-label="To date"]').value;
  const min = form.querySelector('[aria-label="Min value"]').value; const max = form.querySelector('[aria-label="Max value"]').value;
  if (responsible !== 'All') params.set('responsavel_id', responsible); if (from) params.set('data_inicio_de', from); if (to) params.set('data_inicio_ate', to); if (min) params.set('valor_min', min); if (max) params.set('valor_max', max);
  if (orderBy.includes('oldest')) params.set('sort', 'data_inicio_asc'); if (orderBy.includes('value')) params.set('sort', orderBy.includes('high') ? 'valor_desc' : 'valor_asc');
  const result = await apiFetch(`/ordens-servico?${params}`); renderOrdersTable(result.data || []);
}

function syncStatusButtons(form) {
  const statusValue = form.status.value || 'em_andamento';
  const buttons = form.querySelectorAll('.status-chip');
  buttons.forEach(button => button.classList.toggle('active', button.dataset.status === statusValue));

  const endBlock = form.closest('#orderModal').querySelector('.timeline-fim-block');
  const endInputs = endBlock ? endBlock.querySelectorAll('input') : [];
  const shouldEnableEnd = statusValue === 'finalizado';
  endInputs.forEach(input => {
    input.disabled = !shouldEnableEnd;
    input.toggleAttribute('readonly', !shouldEnableEnd);
  });

  if (endBlock) {
    endBlock.classList.toggle('is-disabled', !shouldEnableEnd);
  }
}

function openOrderModal(mode, order) {
  const modal = document.getElementById('orderModal'); const form = modal.querySelector('form'); form.dataset.mode = mode; form.dataset.id = order?.id || '';
  modal.querySelector('.modal-title').textContent = mode === 'edit' ? 'Edit Order' : 'New Order';
  const clients = form.querySelector('[name="cliente_id"]'); const vehicles = form.querySelector('[name="veiculo_id"]'); const staff = form.querySelector('[name="responsavel_id"]');
  clients.innerHTML = ''; vehicles.innerHTML = ''; staff.innerHTML = '';
  DB.clientes.forEach(item => clients.appendChild(new Option(item.nome, item.id))); DB.veiculos.forEach(item => vehicles.appendChild(new Option(`${item.marca} ${item.modelo} (${item.placa})`, item.id))); DB.funcionarios.forEach(item => staff.appendChild(new Option(item.nome, item.id)));
  form.reset();

  if (order) {
    form.titulo.value = order.titulo || '';
    clients.value = order.cliente_id || '';
    vehicles.value = order.veiculo_id || '';
    staff.value = order.responsavel_id || '';
    form.status.value = order.status || 'em_andamento';
    form.data_inicio.value = order.data_inicio ? order.data_inicio.substring(0, 16) : '';
    form.observacao.value = order.observacao || '';
    form.valor.value = order.valor || '';

    const startValue = typeof order.data_inicio === 'string' ? order.data_inicio : '';
    if (startValue) {
      const start = new Date(startValue);
      if (!Number.isNaN(start.getTime())) {
        const date = start.toISOString().slice(0, 10);
        const time = start.toTimeString().slice(0, 5);
        form.data_inicio_date.value = date;
        form.data_inicio_time.value = time;
      }
    }

    if (order.data_fim) {
      const end = new Date(order.data_fim);
      if (!Number.isNaN(end.getTime())) {
        form.data_fim_date.value = end.toISOString().slice(0, 10);
        form.data_fim_time.value = end.toTimeString().slice(0, 5);
      }
    }
  }

  syncStatusButtons(form);
  new bootstrap.Modal(modal).show();
}

function populateVehicleMakeModelInputs(form) {
  const makeSelect = form.marca;
  const modelSelect = form.modelo;
  const makeManual = form.marca_manual;
  const modelManual = form.modelo_manual;

  makeSelect.innerHTML = '<option value="">Choose a brand</option>';
  modelSelect.innerHTML = '<option value="">Choose a model</option>';

  const brands = getCatalogVehicleOptions();
  brands.forEach(brand => {
    makeSelect.appendChild(new Option(brand.marca, brand.marca));
  });

  makeSelect.addEventListener('change', async () => {
    const selectedBrand = makeSelect.value;
    modelSelect.innerHTML = '<option value="">Choose a model</option>';

    if (!selectedBrand) {
      modelSelect.innerHTML = '<option value="">No model available</option>';
      return;
    }

    try {
      const response = await fetch(`${NHTSA_API_URL}/GetModelsForMake/${encodeURIComponent(selectedBrand)}?format=json`, {
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error('Model list unavailable');
      const payload = await response.json();
      const options = Array.isArray(payload.Results) ? payload.Results : [];
      if (options.length) {
        options.forEach(model => {
          modelSelect.appendChild(new Option(model.Model_Name, model.Model_Name));
        });
      } else {
        modelSelect.innerHTML = '<option value="">No model available</option>';
      }
    } catch (error) {
      modelSelect.innerHTML = '<option value="">No model available</option>';
    }
  });

  const fallbackMode = () => {
    makeSelect.disabled = !!makeManual.value.trim();
    modelSelect.disabled = !!modelManual.value.trim();
  };

  makeManual.addEventListener('input', fallbackMode);
  modelManual.addEventListener('input', fallbackMode);
}

function openEntityModal(id) {
  const modal = document.getElementById(id); const form = modal.querySelector('form'); form.reset();
  if (id === 'vehicleModal') {
    const select = form.cliente_id;
    select.innerHTML = '';
    DB.clientes.forEach(item => select.appendChild(new Option(item.nome, item.id)));
    populateVehicleMakeModelInputs(form);
  }
  new bootstrap.Modal(modal).show();
}

function showProfile(type, id) {
  const record = { client: getClient(id), staff: getEmployee(id), vehicle: getVehicle(id) }[type]; if (!record) return;
  document.querySelector('#profileModal .modal-title').textContent = { client: 'Client profile', staff: 'Staff profile', vehicle: 'Vehicle profile' }[type];
  const content = document.getElementById('profileContent'); content.innerHTML = '';
  const labels = { cpf_cnpj: 'Tax ID', telefone: 'Phone', endereco: 'Address', cliente_id: 'Owner ID', placa: 'Plate', marca: 'Make', modelo: 'Model', cor: 'Color', quilometragem: 'Mileage', ultima_visita: 'Last visit', carroceria: 'Body type', cargo: 'Role', matricula: 'Registration' };
  Object.entries(record).forEach(([key, value]) => { if (key !== 'id') { const row = document.createElement('p'); row.className = 'mb-2'; row.textContent = `${labels[key] || key.replaceAll('_', ' ')}: ${value ?? '-'}`; content.appendChild(row); } });
  new bootstrap.Modal(document.getElementById('profileModal')).show();
}

async function refreshData() {
  await loadDB();
  await loadVehicleCatalog();
  const summary = await loadDashboard().catch(() => null);
  populateResponsibleFilter();
  renderSummaries(summary);
  renderOrdersTable(DB.ordens_servico);
  renderVehicles();
  renderClients();
  renderStaff();
}

async function saveEntityForm(form) {
  if (form.closest('#clientModal')) return ['/clientes', { nome: form.nome.value.trim(), cpf_cnpj: form.cpf_cnpj.value.trim(), email: form.email.value.trim(), telefone: form.telefone.value.trim(), endereco: form.endereco.value.trim() }];
  if (form.closest('#vehicleModal')) {
    const finalBrand = (form.marca_manual && form.marca_manual.value.trim()) || form.marca.value.trim();
    const finalModel = (form.modelo_manual && form.modelo_manual.value.trim()) || form.modelo.value.trim();
    return ['/veiculos', {
      cliente_id: Number(form.cliente_id.value),
      placa: form.placa.value.trim(),
      marca: finalBrand,
      modelo: finalModel,
      cor: form.cor.value.trim(),
      quilometragem: Number(form.quilometragem.value) || 0,
      carroceria: form.carroceria.value.trim(),
      thumbnail_url: '',
      imagem: ''
    }];
  }
  if (form.closest('#staffModal')) return ['/funcionarios', { nome: form.nome.value.trim(), cargo: form.cargo.value.trim(), matricula: form.matricula.value.trim() }];
  return null;
}

document.addEventListener('click', async event => {
  const statusChip = event.target.closest?.('.status-chip');
  if (statusChip) {
    const form = statusChip.closest('#orderModal')?.querySelector('form');
    if (form) {
      form.status.value = statusChip.dataset.status;
      if (statusChip.dataset.status === 'finalizado') {
        const today = new Date();
        const dateValue = today.toISOString().slice(0, 10);
        const timeValue = today.toTimeString().slice(0, 5);
        form.data_fim_date.value = form.data_fim_date.value || dateValue;
        form.data_fim_time.value = form.data_fim_time.value || timeValue;
      }
      syncStatusButtons(form);
    }
    return;
  }

  const buttonOrLink = event.target.closest?.('button, a');
  const row = event.target.closest?.('.order-row');

  if (row && !event.target.closest('button')) {
    const order = getOrder(row.dataset.orderId);
    if (order) {
      event.preventDefault();
      openOrderModal('edit', order);
      return;
    }
  }

  if (!buttonOrLink) return;
  try {
    if (buttonOrLink.matches('.entity-link')) { event.preventDefault(); showProfile(buttonOrLink.dataset.profileType, Number(buttonOrLink.dataset.profileId)); return; }
    if (buttonOrLink.id === 'btnAddOrder') return openOrderModal('create', null); if (buttonOrLink.id === 'btnAddClient') return openEntityModal('clientModal'); if (buttonOrLink.id === 'btnAddVehicle') return openEntityModal('vehicleModal'); if (buttonOrLink.id === 'btnAddStaff') return openEntityModal('staffModal');
    if (buttonOrLink.matches('.btn-outline-primary')) { const order = getOrder(buttonOrLink.dataset.id); if (order) openOrderModal('edit', order); return; }
    if (buttonOrLink.matches('.btn-outline-danger')) { if (!confirm(`Delete order #${buttonOrLink.dataset.id}?`)) return; await apiFetch(`/ordens-servico/${buttonOrLink.dataset.id}`, { method: 'DELETE' }); await refreshData(); }
  } catch (error) { showApiError(error); }
});

document.addEventListener('submit', async event => {
  const form = event.target; if (!form.closest) return;
  try {
    const entity = await saveEntityForm(form);
    if (entity) { event.preventDefault(); await apiFetch(entity[0], { method: 'POST', body: JSON.stringify(entity[1]) }); bootstrap.Modal.getInstance(form.closest('.modal')).hide(); await refreshData(); return; }
    if (!form.closest('#orderModal')) return;
    event.preventDefault(); const data = { titulo: form.titulo.value.trim(), cliente_id: Number(form.cliente_id.value), veiculo_id: Number(form.veiculo_id.value), responsavel_id: Number(form.responsavel_id.value), status: form.status.value, data_inicio: form.data_inicio.value, observacao: form.observacao.value.trim(), valor: Number(form.valor.value) || 0 };
    const id = form.dataset.id; await apiFetch(id ? `/ordens-servico/${id}` : '/ordens-servico', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(data) }); bootstrap.Modal.getInstance(form.closest('.modal')).hide(); await refreshData();
  } catch (error) { event.preventDefault(); showApiError(error); }
});

(function setupNavigation() {
  const links = document.querySelectorAll('.sidebar-nav .nav-link'); const offcanvas = document.getElementById('mobileSidebar');
  function showSection(target) { document.querySelectorAll('.page-section, #service-orders').forEach(section => { const active = section.id === target; section.classList.toggle('d-none', !active); section.classList.toggle('active', active); }); if (target === 'vehicles') renderVehicles(); if (target === 'clients') renderClients(); if (target === 'staff') renderStaff(); }
  links.forEach(link => link.addEventListener('click', event => { event.preventDefault(); showSection(link.dataset.target); links.forEach(item => item.classList.toggle('active', item.dataset.target === link.dataset.target)); const instance = offcanvas && bootstrap.Offcanvas.getInstance(offcanvas); if (instance) instance.hide(); }));
  const toggle = document.getElementById('sidebarToggle'); const sidebar = document.getElementById('sidebar'); if (toggle && sidebar) toggle.addEventListener('click', () => { const pinned = sidebar.classList.toggle('pinned'); toggle.setAttribute('aria-expanded', String(pinned)); });
})();

document.addEventListener('DOMContentLoaded', async () => {
  if (!localStorage.getItem(TOKEN_KEY)) { window.location.href = '../login-page/login.html'; return; }
  const filters = document.querySelector('.filters form'); filters?.addEventListener('submit', event => { event.preventDefault(); filterOrders().catch(showApiError); }); filters?.addEventListener('reset', () => setTimeout(() => renderOrdersTable(DB.ordens_servico), 0));
  try { await refreshData(); } catch (error) { showApiError(error); }
});
