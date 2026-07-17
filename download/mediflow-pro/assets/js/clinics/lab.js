/* ============================================================
   MediFlow — Laboratory Clinic Module
   Specialty: test types, results, and full inventory CRUD
   - Clinic-specific fields: testType, result
   - Extra view: Inventory management (reagents/supplies)
   - Inventory persists at clinic_${id}_inventory
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
          <section id="view-inventory" class="hidden space-y-6">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">Lab Inventory</h3>
              <button class="btn btn-primary" onclick="MediFlow.Clinics.Lab.openInventoryModal()">
                <span class="ms ms-sm">add</span>Add Item
              </button>
            </div>
            <div class="mf-card overflow-hidden">
              <div class="overflow-x-auto">
                <table class="mf-table">
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th>Quantity</th>
                      <th>Unit</th>
                      <th>Expiry</th>
                      <th>Actions</th>
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
                <h3 class="font-semibold text-lg" id="inventoryModalTitle">Add Inventory Item</h3>
                <button onclick="MediFlow.UI.closeModal('inventoryModal')" style="color: var(--mf-text-soft);">
                  <span class="ms ms-md">close</span>
                </button>
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
                    <select class="input" id="inventoryUnitInput">
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
                <button class="btn btn-ghost" onclick="MediFlow.UI.closeModal('inventoryModal')">Cancel</button>
                <button class="btn btn-primary" onclick="MediFlow.Clinics.Lab.saveInventory()">Save</button>
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
      return `<td>${escapeHtml(p.testType || '—')}</td><td>${escapeHtml(p.result || '—')}</td>`;
    },

    // ---- Render the Inventory view ----
    render() {
      const { ClinicCore, UI, I18n } = MediFlow;
      const { ds } = ClinicCore.getContext();
      const { escapeHtml, fmtDate, fmtDateInput } = UI;
      const tbody = document.getElementById('inventoryTableBody');
      if (!tbody) return;
      const list = ds.getInventory();
      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8" style="color: var(--mf-text-soft);">No inventory items</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(it => {
        const lowStock = it.quantity <= 20;
        const expDays = it.expiry ? Math.floor((new Date(it.expiry) - new Date()) / 86400000) : null;
        const expBadge = expDays === null ? '' :
          expDays < 0 ? `<span class="badge badge-expired ml-2">Expired</span>` :
          expDays < 60 ? `<span class="badge badge-expiring ml-2">${expDays}d left</span>` : '';
        return `
          <tr>
            <td class="font-medium">${escapeHtml(it.name)}</td>
            <td>
              <span class="${lowStock ? 'text-red-500 font-semibold' : ''}">${it.quantity}</span>
              ${lowStock ? '<span class="badge badge-expiring ml-2">Low</span>' : ''}
            </td>
            <td>${escapeHtml(it.unit || '—')}</td>
            <td>${fmtDate(it.expiry)} ${expBadge}</td>
            <td>
              <div class="flex gap-1">
                <button class="btn btn-ghost btn-sm" onclick="MediFlow.Clinics.Lab.editInventory('${it.id}')">
                  <span class="ms ms-sm">edit</span>
                </button>
                <button class="btn btn-ghost btn-sm text-red-500" onclick="MediFlow.Clinics.Lab.deleteInventory('${it.id}')">
                  <span class="ms ms-sm">delete</span>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }
  };

  // ---- Inventory CRUD ----
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
    if (!name) { UI.toast('Item name is required', 'warning'); return; }
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
      payload.id = MediFlow.UI.uid('inv');
      list.push(payload);
    }
    ds.setInventory(list);
    UI.closeModal('inventoryModal');
    UI.toast(id ? 'Item updated' : 'Item added', 'success');
    MediFlow.ClinicCore.renderAll();
  }

  function deleteInventory(id) {
    const { ClinicCore, UI } = MediFlow;
    const { ds } = ClinicCore.getContext();
    if (!confirm('Delete this inventory item?')) return;
    ds.setInventory(ds.getInventory().filter(x => x.id !== id));
    UI.toast('Item deleted', 'success');
    MediFlow.ClinicCore.renderAll();
  }

  // ---- Helpers ----
  function setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v || ''; }
  function getVal(id) { const el = document.getElementById(id); return el ? el.value : ''; }
  function fmtDateInput(iso) {
    if (!iso) return '';
    try { return new Date(iso).toISOString().slice(0, 10); } catch { return ''; }
  }

  // ---- Self-register ----
  MediFlow.ClinicRegistry.register(config);

  return { config, openInventoryModal, editInventory, saveInventory, deleteInventory };
})();
