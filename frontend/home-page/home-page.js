// Pin/unpin the sidebar open on desktop (independent from hover)
(function () {
  const btn = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("sidebar");
  if (!btn || !sidebar) return;
  btn.addEventListener("click", () => {
    const pinned = sidebar.classList.toggle("pinned");
    btn.setAttribute("aria-expanded", String(pinned));
    // swap inline SVG: list <-> x (close)
    if (pinned) {
      btn.innerHTML =
        '<svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>';
    } else {
      btn.innerHTML =
        '<svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill-rule="evenodd" d="M2.5 12.5a.5.5 0 0 0 0 1h11a.5.5 0 0 0 0-1h-11zm0-4a.5.5 0 0 0 0 1h11a.5.5 0 0 0 0-1h-11zm0-4a.5.5 0 0 0 0 1h11a.5.5 0 0 0 0-1h-11z"/></svg>';
    }
  });
})();

// Page navigation: show/hide sections based on sidebar/menu selection
(function () {
  const links = document.querySelectorAll('.sidebar-nav .nav-link');
  const offcanvasEl = document.getElementById('mobileSidebar');

  function showSection(targetId) {
    // (re-query at runtime to avoid stale NodeLists)
    const sections = document.querySelectorAll('.page-section, #service-orders');

    // show target, hide others
    sections.forEach((s) => {
      if (s.id === targetId) {
        s.classList.remove('d-none');
        s.classList.add('active');
      } else {
        s.classList.remove('active');
        s.classList.add('d-none');
      }
    });

    // render dynamic content when switching
    if (targetId === 'vehicles') renderVehicles();
    if (targetId === 'clients') renderClients();
    if (targetId === 'staff') renderStaff();
  }

  function setActiveLink(clicked) {
    links.forEach((l) => {
      const same = l.getAttribute('data-target') === clicked.getAttribute('data-target');
      if (same) l.classList.add('active'); else l.classList.remove('active');
    });
  }

  links.forEach((link) => {
    link.addEventListener('click', (ev) => {
      ev.preventDefault();
      const target = link.getAttribute('data-target');
      if (!target) return;
      showSection(target);
      setActiveLink(link);

      // close mobile offcanvas if open
      if (offcanvasEl) {
        const bsOff = bootstrap.Offcanvas.getInstance(offcanvasEl);
        if (bsOff) bsOff.hide();
      }
    });
  });

  // initialize view from active nav (or default to service-orders)
  document.addEventListener('DOMContentLoaded', () => {
    const active = document.querySelector('.sidebar-nav .nav-link.active');
    const initial = (active && active.getAttribute('data-target')) || 'service-orders';
    showSection(initial);
  });
})();

// Lightweight DB loader + CRUD (uses db.json and localStorage)
let DB = { clientes: [], funcionarios: [], veiculos: [], ordens_servico: [] };

function fallbackEmbedded() {
  DB = {
    clientes: [
      { id: 1, nome: "João da Silva", cpf_cnpj: "000.000.000-00", email: "joao@email.com", telefone: "(49) 99999-9999", endereco: "Rua Exemplo, 100" }
    ],
    funcionarios: [ { id: 1, nome: "Carlos Oliveira", cargo: "Mecânico", matricula: "FUNC001" } ],
    veiculos: [ { id: 1, cliente_id:1, placa:"ABC1D23", marca:"Volkswagen", modelo:"Gol", cor:"Prata", quilometragem:85000, ultima_visita:"2026-08-20", carroceria:"Hatch" } ],
    ordens_servico: [ { id:1, titulo:"Revisão geral", cliente_id:1, veiculo_id:1, responsavel_id:1, status:"em_andamento", observacao:"Realizar revisão dos componentes.", data_inicio:"2026-09-04T08:30:00", data_fim:null, tempo_decorrido_minutos:0, valor:120.0 } ]
  };
}

// Render vehicles
function renderVehicles() {
  const container = document.getElementById('vehiclesList');
  if (!container) return;
  container.innerHTML = '';
  if (!DB.veiculos.length) { container.innerHTML = '<div class="card p-3">No vehicles</div>'; return; }
  const table = document.createElement('table'); table.className = 'table table-sm';
  const thead = document.createElement('thead'); thead.innerHTML = '<tr><th>Plate</th><th>Model</th><th>Owner</th><th>Last visit</th></tr>';
  const tb = document.createElement('tbody');
  DB.veiculos.forEach(v => {
    const tr = document.createElement('tr');
    const owner = getClient(v.cliente_id);
    const plate = document.createElement('td'); plate.textContent = v.placa;
    const model = document.createElement('td'); model.textContent = `${v.marca} ${v.modelo}`;
    const ownerCell = document.createElement('td');
    if (owner) ownerCell.appendChild(entityLink('client', owner.id, owner.nome)); else ownerCell.textContent = '-';
    const visit = document.createElement('td'); visit.textContent = v.ultima_visita || '-';
    tr.append(plate, model, ownerCell, visit);
    tb.appendChild(tr);
  });
  table.appendChild(thead); table.appendChild(tb); container.appendChild(table);
}

// Render clients
function renderClients() {
  const container = document.getElementById('clientsList');
  if (!container) return;
  container.innerHTML = '';
  if (!DB.clientes.length) { container.innerHTML = '<div class="card p-3">No clients</div>'; return; }
  const list = document.createElement('div');
  list.className = 'list-group';
  DB.clientes.forEach(c => {
    const item = document.createElement('div'); item.className = 'list-group-item';
    const heading = document.createElement('div'); heading.className = 'd-flex w-100 justify-content-between';
    const name = entityLink('client', c.id, c.nome); name.className += ' h6 mb-1';
    const documentNumber = document.createElement('small'); documentNumber.textContent = c.cpf_cnpj || '-';
    heading.append(name, documentNumber);
    const contact = document.createElement('p'); contact.className = 'mb-1'; contact.textContent = `${c.email || '-'} | ${c.telefone || '-'}`;
    const address = document.createElement('small'); address.textContent = c.endereco || '-';
    item.append(heading, contact, address); list.appendChild(item);
  });
  container.appendChild(list);
}

function renderStaff() {
  const container = document.getElementById('staffList');
  if (!container) return;
  container.innerHTML = '';
  if (!DB.funcionarios.length) { container.innerHTML = '<div class="card p-3">No staff members</div>'; return; }
  const list = document.createElement('div'); list.className = 'list-group';
  DB.funcionarios.forEach(f => {
    const item = document.createElement('div'); item.className = 'list-group-item';
    const heading = document.createElement('div'); heading.className = 'd-flex w-100 justify-content-between';
    const name = entityLink('staff', f.id, f.nome); name.className += ' h6 mb-1';
    const registration = document.createElement('small'); registration.textContent = f.matricula || '-';
    heading.append(name, registration);
    const role = document.createElement('p'); role.className = 'mb-0'; role.textContent = f.cargo || '-';
    item.append(heading, role); list.appendChild(item);
  });
  container.appendChild(list);
}

function saveDB() { try { localStorage.setItem('mwm_db', JSON.stringify(DB)); } catch(e) { console.warn('save failed', e); } }
function loadFromLocalStorage() { try { const s = localStorage.getItem('mwm_db'); if (s) { DB = JSON.parse(s); return true; } } catch(e) { } return false; }

async function loadDB() {
  // Prefer the on-disk `db.json` as the source of truth. If fetch fails,
  // fall back to localStorage (if present) or the embedded data.
  try {
    const resp = await fetch('db.json?cb=' + Date.now()); // cache-bust during development
    if (!resp.ok) throw new Error('fetch failed: ' + resp.status);
    const data = await resp.json();
    DB = data;
    loadFromLocalStorage();
    return;
  } catch (e) {
    console.warn('Could not load db.json, trying localStorage fallback.', e);
    if (loadFromLocalStorage()) return;
    fallbackEmbedded();
  }
}

function getClient(id) { return DB.clientes.find(c => c.id === id) || null; }
function getEmployee(id) { return DB.funcionarios.find(f => f.id === id) || null; }
function getVehicle(id) { return DB.veiculos.find(v => v.id === id) || null; }

function entityLink(type, id, label) {
  const link = document.createElement('a');
  link.href = '#';
  link.className = 'entity-link';
  link.dataset.profileType = type;
  link.dataset.profileId = id;
  link.textContent = label;
  return link;
}

function renderSummaries() {
  const cards = document.querySelectorAll('.summary-grid .display-4');
  if (!cards || cards.length < 4) return;
  const openOrders = DB.ordens_servico.filter(o => o.status === 'em_andamento').length;
  const vehicles = DB.veiculos.length;
  const clients = DB.clientes.length;
  const revenue = DB.ordens_servico.reduce((s, o) => s + (Number(o.valor) || 0), 0);
  cards[0].textContent = openOrders;
  cards[1].textContent = vehicles;
  cards[2].textContent = `$${revenue.toFixed(2)}`;
  cards[3].textContent = clients;
}

function renderOrdersTable(list) {
  const tbody = document.querySelector('.data-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  list.forEach(o => {
    const tr = document.createElement('tr');
    const emp = getEmployee(o.responsavel_id);
    const veh = getVehicle(o.veiculo_id);

    const tdId = document.createElement('td'); tdId.className = 'text-truncate align-middle'; tdId.textContent = String(o.id).padStart(4, '0');
    const tdTitle = document.createElement('td'); tdTitle.className = 'text-truncate align-middle'; tdTitle.textContent = o.titulo;
    const tdResp = document.createElement('td'); tdResp.className = 'text-truncate align-middle';
    if (emp) tdResp.appendChild(entityLink('staff', emp.id, emp.nome)); else tdResp.textContent = '-';
    const tdVeh = document.createElement('td'); tdVeh.className = 'd-none d-sm-table-cell text-truncate align-middle';
    if (veh) tdVeh.appendChild(entityLink('vehicle', veh.id, `${veh.marca} ${veh.modelo}`)); else tdVeh.textContent = '-';
    const tdValue = document.createElement('td'); tdValue.className = 'd-none d-sm-table-cell text-end text-truncate align-middle'; tdValue.textContent = o.valor ? `$${Number(o.valor).toFixed(2)}` : '-';

    const tdActions = document.createElement('td'); tdActions.className = 'text-end';
    tdActions.style.whiteSpace = 'nowrap';
    const btnEdit = document.createElement('button'); btnEdit.className = 'btn btn-sm btn-outline-primary me-1'; btnEdit.textContent = 'Edit'; btnEdit.dataset.id = o.id;
    const btnDel = document.createElement('button'); btnDel.className = 'btn btn-sm btn-outline-danger'; btnDel.textContent = 'Delete'; btnDel.dataset.id = o.id;
    tdActions.appendChild(btnEdit); tdActions.appendChild(btnDel);

    tr.appendChild(tdId);
    tr.appendChild(tdTitle);
    tr.appendChild(tdResp);
    tr.appendChild(tdVeh);
    tr.appendChild(tdValue);
    tr.appendChild(tdActions);
    tbody.appendChild(tr);
  });
}

// Filters form wiring (same as before but using DB)
function populateResponsibleFilter() {
  const sel = document.querySelector('select[aria-label="Responsible"]');
  if (!sel) return;
  sel.innerHTML = '';
  const optAll = document.createElement('option'); optAll.textContent = 'All'; optAll.value = 'All'; sel.appendChild(optAll);
  DB.funcionarios.forEach(f => { const o = document.createElement('option'); o.value = f.nome; o.textContent = f.nome; sel.appendChild(o); });
}

(function attachFilters() {
  const form = document.querySelector('.filters form');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const orderBy = form.querySelector('select[aria-label="Order by"]').value;
    const minVal = parseFloat(form.querySelector('input[aria-label="Min value"]').value || '') || null;
    const maxVal = parseFloat(form.querySelector('input[aria-label="Max value"]').value || '') || null;
    const from = form.querySelector('input[aria-label="From date"]').value;
    const to = form.querySelector('input[aria-label="To date"]').value;
    const responsible = form.querySelector('select[aria-label="Responsible"]').value;

    let results = DB.ordens_servico.slice();

    if (responsible && responsible !== 'All') {
      results = results.filter(r => {
        const emp = getEmployee(r.responsavel_id);
        return emp && emp.nome === responsible;
      });
    }

    if (from) {
      const fromDate = new Date(from);
      results = results.filter(r => new Date(r.data_inicio) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23,59,59,999);
      results = results.filter(r => new Date(r.data_inicio) <= toDate);
    }

    if (minVal !== null) { results = results.filter(r => (r.valor || 0) >= minVal); }
    if (maxVal !== null) { results = results.filter(r => (r.valor || 0) <= maxVal); }

    if (orderBy && orderBy.toLowerCase().includes('newest')) {
      results.sort((a,b) => new Date(b.data_inicio) - new Date(a.data_inicio));
    } else if (orderBy && orderBy.toLowerCase().includes('oldest')) {
      results.sort((a,b) => new Date(a.data_inicio) - new Date(b.data_inicio));
    } else if (orderBy && orderBy.toLowerCase().includes('value')) {
      if (orderBy.toLowerCase().includes('high')) results.sort((a,b) => (b.valor||0) - (a.valor||0));
      else results.sort((a,b) => (a.valor||0) - (b.valor||0));
    }

    renderOrdersTable(results);
  });

  form.addEventListener('reset', function () { setTimeout(() => { renderOrdersTable(DB.ordens_servico); }, 0); });
})();

// CRUD modal + handlers
function openOrderModal(mode, order) {
  const modalEl = document.getElementById('orderModal');
  const modal = new bootstrap.Modal(modalEl);
  modalEl.querySelector('.modal-title').textContent = mode === 'edit' ? 'Edit Order' : 'New Order';
  const form = modalEl.querySelector('form');
  form.dataset.mode = mode;
  form.dataset.id = order ? order.id : '';

  // populate selects
  const selClient = form.querySelector('select[name="cliente_id"]');
  const selVehicle = form.querySelector('select[name="veiculo_id"]');
  const selResp = form.querySelector('select[name="responsavel_id"]');
  selClient.innerHTML = ''; selVehicle.innerHTML = ''; selResp.innerHTML = '';
  DB.clientes.forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = c.nome; selClient.appendChild(o); });
  DB.veiculos.forEach(v => { const o = document.createElement('option'); o.value = v.id; o.textContent = `${v.marca} ${v.modelo} (${v.placa})`; selVehicle.appendChild(o); });
  DB.funcionarios.forEach(f => { const o = document.createElement('option'); o.value = f.id; o.textContent = f.nome; selResp.appendChild(o); });

  if (mode === 'edit' && order) {
    form.querySelector('input[name="titulo"]').value = order.titulo || '';
    form.querySelector('select[name="cliente_id"]').value = order.cliente_id || '';
    form.querySelector('select[name="veiculo_id"]').value = order.veiculo_id || '';
    form.querySelector('select[name="responsavel_id"]').value = order.responsavel_id || '';
    form.querySelector('select[name="status"]').value = order.status || 'em_andamento';
    form.querySelector('input[name="data_inicio"]').value = order.data_inicio ? order.data_inicio.substring(0,16) : '';
    form.querySelector('textarea[name="observacao"]').value = order.observacao || '';
    form.querySelector('input[name="valor"]').value = order.valor || '';
  } else {
    form.reset();
  }

  modal.show();
}

function openEntityModal(id) {
  const modalEl = document.getElementById(id);
  const form = modalEl.querySelector('form');
  form.reset();
  if (id === 'vehicleModal') {
    const select = form.querySelector('select[name="cliente_id"]');
    select.innerHTML = '';
    DB.clientes.forEach(c => { const option = document.createElement('option'); option.value = c.id; option.textContent = c.nome; select.appendChild(option); });
  }
  new bootstrap.Modal(modalEl).show();
}

function showProfile(type, id) {
  const records = { client: getClient(id), staff: getEmployee(id), vehicle: getVehicle(id) };
  const record = records[type];
  if (!record) return;
  const labels = { client: 'Client profile', staff: 'Staff profile', vehicle: 'Vehicle profile' };
  const content = document.getElementById('profileContent');
  content.innerHTML = '';
  const title = document.querySelector('#profileModal .modal-title'); title.textContent = labels[type];
  Object.entries(record).forEach(([key, value]) => {
    if (key === 'id') return;
    const row = document.createElement('p'); row.className = 'mb-2';
    const label = document.createElement('strong'); label.textContent = `${key.replaceAll('_', ' ')}: `;
    row.append(label, document.createTextNode(value ?? '-')); content.appendChild(row);
  });
  new bootstrap.Modal(document.getElementById('profileModal')).show();
}

// attach Add/Edit/Delete handlers
document.addEventListener('click', function (e) {
  const target = e.target.closest ? e.target.closest('button, a') : e.target;
  if (!target) return;
  if (target.matches('.entity-link')) {
    e.preventDefault();
    showProfile(target.dataset.profileType, Number(target.dataset.profileId));
    return;
  }
  if (target.id === 'btnAddOrder') {
    openOrderModal('create', null);
  }
  if (target.id === 'btnAddClient') openEntityModal('clientModal');
  if (target.id === 'btnAddVehicle') openEntityModal('vehicleModal');
  if (target.id === 'btnAddStaff') openEntityModal('staffModal');
  if (target.matches('.btn-outline-primary')) {
    const id = Number(target.dataset.id);
    const order = DB.ordens_servico.find(o => o.id === id);
    if (order) openOrderModal('edit', order);
  }
  if (target.matches('.btn-outline-danger')) {
    const id = Number(target.dataset.id);
    if (!confirm('Delete order #' + id + '?')) return;
    DB.ordens_servico = DB.ordens_servico.filter(o => o.id !== id);
    saveDB(); renderOrdersTable(DB.ordens_servico); renderSummaries();
  }
});

// modal form submit
document.addEventListener('submit', function (e) {
  const form = e.target;
  if (!form.closest) return;
  if (form.closest('#clientModal')) {
    e.preventDefault();
    const newId = (DB.clientes.reduce((m, item) => Math.max(m, item.id), 0) || 0) + 1;
    DB.clientes.push({ id: newId, nome: form.nome.value.trim(), cpf_cnpj: form.cpf_cnpj.value.trim(), email: form.email.value.trim(), telefone: form.telefone.value.trim(), endereco: form.endereco.value.trim() });
    saveDB(); renderClients(); renderSummaries(); bootstrap.Modal.getInstance(document.getElementById('clientModal')).hide(); return;
  }
  if (form.closest('#vehicleModal')) {
    e.preventDefault();
    const newId = (DB.veiculos.reduce((m, item) => Math.max(m, item.id), 0) || 0) + 1;
    DB.veiculos.push({ id: newId, cliente_id: Number(form.cliente_id.value), placa: form.placa.value.trim(), marca: form.marca.value.trim(), modelo: form.modelo.value.trim(), cor: form.cor.value.trim(), quilometragem: Number(form.quilometragem.value) || 0, carroceria: form.carroceria.value.trim(), ultima_visita: null });
    saveDB(); renderVehicles(); renderSummaries(); bootstrap.Modal.getInstance(document.getElementById('vehicleModal')).hide(); return;
  }
  if (form.closest('#staffModal')) {
    e.preventDefault();
    const newId = (DB.funcionarios.reduce((m, item) => Math.max(m, item.id), 0) || 0) + 1;
    DB.funcionarios.push({ id: newId, nome: form.nome.value.trim(), cargo: form.cargo.value.trim(), matricula: form.matricula.value.trim() });
    saveDB(); renderStaff(); populateResponsibleFilter(); bootstrap.Modal.getInstance(document.getElementById('staffModal')).hide(); return;
  }
  if (!form.closest('#orderModal')) return;
  e.preventDefault();
  const mode = form.dataset.mode;
  const id = Number(form.dataset.id) || null;
  const data = {
    titulo: form.querySelector('input[name="titulo"]').value,
    cliente_id: Number(form.querySelector('select[name="cliente_id"]').value) || null,
    veiculo_id: Number(form.querySelector('select[name="veiculo_id"]').value) || null,
    responsavel_id: Number(form.querySelector('select[name="responsavel_id"]').value) || null,
    status: form.querySelector('select[name="status"]').value,
    data_inicio: form.querySelector('input[name="data_inicio"]').value,
    observacao: form.querySelector('textarea[name="observacao"]').value,
    valor: parseFloat(form.querySelector('input[name="valor"]').value) || 0
  };

  if (mode === 'edit' && id) {
    const idx = DB.ordens_servico.findIndex(o => o.id === id);
    if (idx !== -1) { DB.ordens_servico[idx] = { ...DB.ordens_servico[idx], ...data }; }
  } else {
    const newId = (DB.ordens_servico.reduce((m, o) => Math.max(m, o.id), 0) || 0) + 1;
    DB.ordens_servico.push({ id: newId, ...data });
  }

  saveDB(); renderOrdersTable(DB.ordens_servico); renderSummaries();
  const modalEl = document.getElementById('orderModal');
  bootstrap.Modal.getInstance(modalEl).hide();
});

// initialize: load DB, populate filters and table
document.addEventListener('DOMContentLoaded', async function () {
  await loadDB();
  populateResponsibleFilter();
  renderSummaries();
  renderOrdersTable(DB.ordens_servico);
  renderVehicles();
  renderClients();
  renderStaff();
});
