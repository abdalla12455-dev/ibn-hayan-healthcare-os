/* ============================================================
   MediFlow — Pediatrics Clinic Module
   Specialty: child patients with weight tracking and guardian info
   - Clinic-specific fields: weight, guardian
   - No extra views — relies on shared dashboard/tables
   ============================================================ */

window.MediFlow = window.MediFlow || {};

MediFlow.Clinics = MediFlow.Clinics || {};

MediFlow.Clinics.Pediatrics = (function () {
  'use strict';

  const TYPE = 'PEDIATRICS';

  const config = {
    type: TYPE,

    // No extra nav or views — pediatrics uses the standard layout
    extraNav: [],
    extraViews: [],

    extraTableHeaders: `<th data-extra>Weight</th><th data-extra>Guardian</th>`,

    renderFormFields() {
      const { t } = MediFlow.I18n;
      return `
        <div>
          <label class="label">${t('weight')}</label>
          <input class="input" type="number" step="0.1" id="patientWeightInput" placeholder="e.g. 22.5" />
        </div>
        <div>
          <label class="label">${t('guardian')}</label>
          <input class="input" id="patientGuardianInput" placeholder="Parent / Guardian name" />
        </div>
      `;
    },

    hydrateFormFields(p) {
      setVal('patientWeightInput', p.weight);
      setVal('patientGuardianInput', p.guardian);
    },

    collectFormFields() {
      return {
        weight: Number(getVal('patientWeightInput')) || 0,
        guardian: getVal('patientGuardianInput')
      };
    },

    renderExtraCells(p) {
      const { escapeHtml } = MediFlow.UI;
      const w = p.weight ? `${p.weight} kg` : '—';
      return `<td>${w}</td><td>${escapeHtml(p.guardian || '—')}</td>`;
    },

    render() { /* nothing specialty to render */ }
  };

  // ---- Helpers ----
  function setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v || ''; }
  function getVal(id) { const el = document.getElementById(id); return el ? el.value : ''; }

  // ---- Self-register ----
  MediFlow.ClinicRegistry.register(config);

  return { config };
})();
