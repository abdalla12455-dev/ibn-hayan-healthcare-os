/* ============================================================
   MediFlow — Laboratory Clinic Module (Premium)
   ============================================================ */

window.MediFlow = window.MediFlow || {};
MediFlow.Clinics = MediFlow.Clinics || {};

MediFlow.Clinics.Lab = (function () {
  'use strict';

  const TYPE = 'LAB';

  const config = {
    type: TYPE,

    extraNav: [
      { view: 'view-inventory', icon: 'inventory_2', label: 'Inventory' }
    ],

    extraViews: [
      {
        id: 'view-inventory',
        html: `
          <section id="view-inventory" class="hidden space-y-6 view-enter">
            <div class="page-header">
              <div>
                <h1 class="page-title">Lab Inventory</h1>
                <p class="page-subtitle">Manage reagents, supplies, and consumables</p>
              </div>
              <div class="page-actions">
                <button class="btn btn-primary" onclick="MediFlow.Clinics.Lab.openInventoryModal()">
                  <span class="ms">add</span>
                  Add Item
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4" id="inventoryStats"></div>

            <div class="card">
              <div class="table-scroll">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Quantity</th>
                      <th>Unit</th>
                      <th>Expiry</th>
                      <th style="text-align:right;">Actions</th>
                    </tr>
                  </thead>
                  <tbody id="inventoryTableBody"></tbody>
                </table>
              </div>
            </div>
          </section>

          <!-- Inventory Modal -->
          <div class="modal-overlay" id="inventoryModal">
            <div class="modal-card">
              <div class="modal-header">
                <h3 class="modal-title" id="inventoryModalTitle">Add Inventory Item</h3>
                <div class="modal-close" onclick="MediFlow.UI.closeModal('inventoryModal')">
                  <span class="ms">close</span>
                </div>
              </div>
              <div class="modal-body space-y-4">
                <input type="hidden" id="inventoryEditId" />
                <div>
                  <label class="label">Item Name</label>
                  <input class="input" id="inventoryNameInput" placeholder="e.g. Lancets" />
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="label">Quantity</label>
                    <input class="input" type="number" id="inventoryQtyInput" value="0" />
                  </div>
                  <div>
                    <label class="label">Unit</label>
                    <select class="select" id="inventoryUnitInput">
                      <option value="pcs">pcs</option>
                      <option value="vials">vials</option>
                      <option value="boxes">boxes</option>
                      <option value="liters">liters</option>
                      <option value="ml">ml</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label class="label">Expiry Date</label>
                  <input class="input" type="date" id="inventoryExpiryInput" />
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary" onclick="MediFlow.UI.closeModal('inventoryModal')">Cancel</button>
                <button class="btn btn-primary" onclick="MediFlow.Clinics.Lab.saveInventory()">
                  <span class="ms">save</span>Save
                </button>
              </div>
            </div>
          </div>
        `
      }
    ],

    extraTableHeaders: `<th data-extra>Test Type</th><th data-extra>Result</th>`,

    renderFormFields() {
      const { t } = MediFlow.I18n;
      return `
        <div>
          <label class="label">${t('testType')}</label>
          <input class="input" id="patientTestTypeInput" placeholder="e.g. CBC, Lipid Panel" />
        </div>
        <div>
          <label class="label">${t('result')}</label>
          <input class="input" id="patientResultInput" placeholder="Pending..." />
        </div>
      `;
    },

    hydrateFormFields(p) {
      setVal('patientTestTypeInput', p.testType);
      setVal('patientResultInput', p.result);
    },

    collectFormFields() {
      return {
        testType: getVal('patientTestTypeInput'),
        result: getVal('patientResultInput')
      };
    },

    renderExtraCells(p) {
      const { escapeHtml } = MediFlow.UI;
      return `<td class="text-soft">${escapeHtml(p.testType || '—')}</td><td class="text-soft">${escapeHtml(p.result || '—')}</td>`;
    },

    render() {
      const { ClinicCore, UI } = MediFlow;
      const { ds } = ClinicCore.getContext();
      const { escapeHtml, fmtDate, fmtDateInput, fmtNum } = UI;

      // Render inventory stats
      const statsHost = document.getElementById('inventoryStats');
      if (statsHost) {
        const list = ds.getInventory();
        const totalItems = list.length;
        const lowStock = list.filter(it => it.quantity <= 20).length;
        const expiringSoon = list.filter(it => {
          if (!it.expiry) return false;
          const days = Math.floor((new Date(it.expiry) - new Date()) / 86400000);
          return days >= 0 && days < 60;
        }).length;
        statsHost.innerHTML = `
          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-label">Total Items</span>
              <div class="kpi-icon tint-info"><span class="ms">inventory_2</span></div>
            </div>
            <div class="kpi-value">${fmtNum(totalItems)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-label">Low Stock</span>
              <div class="kpi-icon tint-warning"><span class="ms">warning</span></div>
            </div>
            <div class="kpi-value">${fmtNum(lowStock)}</div>
            <div class="kpi-meta"><span class="kpi-caption">≤ 20 units left</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-label">Expiring Soon</span>
              <div class="kpi-icon tint-danger"><span class="ms">schedule</span></div>
            </div>
            <div class="kpi-value">${fmtNum(expiringSoon)}</div>
            <div class="kpi-meta"><span class="kpi-caption">within 60 days</span></div>
          </div>
        `;
      }

      const tbody = document.getElementById('inventoryTableBody');
      if (!tbody) return;
      const list = ds.getInventory();
      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="table-empty"><span class="ms">inventory_2</span><p>No inventory items</p></div></td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(it => {
        const lowStock = it.quantity <= 20;
        const expDays = it.expiry ? Math.floor((new Date(it.expiry) - new Date()) / 86400000) : null;
        const expBadge = expDays === null ? '' :
          expDays < 0 ? `<span class="badge badge-danger badge-dot ml-2">Expired</span>` :
          expDays < 60 ? `<span class="badge badge-warning badge-dot ml-2">${expDays}d left</span>` : '';
        return `
          <tr>
            <td>
              <div class="flex items-center gap-3">
                <div class="kpi-icon tint-info" style="width:32px; height:32px;">
                  <span class="ms" style="font-size:18px;">science</span>
                </div>
                <div class="font-semibold text-strong">${escapeHtml(it.name)}</div>
              </div>
            </td>
            <td>
              <div class="flex items-center gap-2">
                <span class="font-semibold tabular ${lowStock ? 'text-warning' : 'text-strong'}">${it.quantity}</span>
                ${lowStock ? '<span class="badge badge-warning badge-dot">Low</span>' : ''}
              </div>
            </td>
            <td class="text-soft">${escapeHtml(it.unit || '—')}</td>
            <td>
              <span class="text-soft">${fmtDate(it.expiry)}</span>
              ${expBadge}
            </td>
            <td>
              <div class="row-actions">
                <button class="btn btn-ghost btn-icon btn-sm" onclick="MediFlow.Clinics.Lab.editInventory('${it.id}')" title="Edit">
                  <span class="ms">edit</span>
                </button>
                <button class="btn btn-ghost btn-icon btn-sm" onclick="MediFlow.Clinics.Lab.deleteInventory('${it.id}')" title="Delete" style="color: var(--danger);">
                  <span class="ms">delete</span>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }
  };

  function openInventoryModal() {
    document.getElementById('inventoryModalTitle').textContent = 'Add Inventory Item';
    document.getElementById('inventoryEditId').value = '';
    document.getElementById('inventoryNameInput').value = '';
    document.getElementById('inventoryQtyInput').value = '0';
    document.getElementById('inventoryUnitInput').value = 'pcs';
    document.getElementById('inventoryExpiryInput').value = fmtDateInput(new Date(Date.now() + 180*86400000).toISOString());
    MediFlow.UI.openModal('inventoryModal');
  }

  function editInventory(id) {
    const { ClinicCore } = MediFlow;
    const { ds } = ClinicCore.getContext();
    const it = ds.getInventory().find(x => x.id === id);
    if (!it) return;
    document.getElementById('inventoryModalTitle').textContent = 'Edit Inventory Item';
    document.getElementById('inventoryEditId').value = it.id;
    document.getElementById('inventoryNameInput').value = it.name;
    document.getElementById('inventoryQtyInput').value = it.quantity;
    document.getElementById('inventoryUnitInput').value = it.unit || 'pcs';
    document.getElementById('inventoryExpiryInput').value = it.expiry || '';
    MediFlow.UI.openModal('inventoryModal');
  }

  function saveInventory() {
    const { ClinicCore, UI } = MediFlow;
    const { ds } = ClinicCore.getContext();
    const id = document.getElementById('inventoryEditId').value;
    const name = document.getElementById('inventoryNameInput').value.trim();
    if (!name) {
      UI.toast('Item name is required', 'warning');
      return;
    }
    const payload = {
      name,
      quantity: Number(document.getElementById('inventoryQtyInput').value) || 0,
      unit: document.getElementById('inventoryUnitInput').value,
      expiry: document.getElementById('inventoryExpiryInput').value
    };
    const list = ds.getInventory();
    if (id) {
      const idx = list.findIndex(x => x.id === id);
      if (idx > -1) list[idx] = { ...list[idx], ...payload };
    } else {
      payload.id = UI.uid('inv');
      list.push(payload);
    }
    ds.setInventory(list);
    UI.closeModal('inventoryModal');
    UI.toast(id ? 'Item updated' : 'Item added', 'success');
    ClinicCore.renderAll();
  }

  async function deleteInventory(id) {
    const { ClinicCore, UI } = MediFlow;
    const { ds } = ClinicCore.getContext();
    const ok = await UI.confirm({
      title: 'Delete Item',
      headline: 'Delete this inventory item?',
      message: 'This action cannot be undone.',
      confirmText: 'Delete',
      danger: true
    });
    if (!ok) return;
    ds.setInventory(ds.getInventory().filter(x => x.id !== id));
    UI.toast('Item deleted', 'success');
    ClinicCore.renderAll();
  }

  function setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v || ''; }
  function getVal(id) { const el = document.getElementById(id); return el ? el.value : ''; }
  function fmtDateInput(iso) {
    if (!iso) return '';
    try { return new Date(iso).toISOString().slice(0, 10); } catch { return ''; }
  }

  MediFlow.ClinicRegistry.register(config);

  return { config, openInventoryModal, editInventory, saveInventory, deleteInventory };
})();
