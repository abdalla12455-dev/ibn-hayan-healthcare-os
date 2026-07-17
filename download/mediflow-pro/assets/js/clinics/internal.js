/* ============================================================
   MediFlow — Internal Medicine Clinic Module
   Specialty: consultations, ECG, diagnostics notes
   - Clinic-specific fields: procedure, result (clinical notes)
   ============================================================ */

window.MediFlow = window.MediFlow || {};

MediFlow.Clinics = MediFlow.Clinics || {};

MediFlow.Clinics.Internal = (function () {
  'use strict';

  const TYPE = 'INTERNAL';

  const config = {
    type: TYPE,

    extraNav: [],
    extraViews: [],

    extraTableHeaders: `<th data-extra>Procedure</th><th data-extra>Notes</th>`,

    renderFormFields() {
      const { t } = MediFlow.I18n;
      return `
        <div>
          <label class="label">${t('procedure')}</label>
          <input class="input" id="patientProcedureInput" placeholder="e.g. ECG, Consultation" />
        </div>
        <div>
          <label class="label">Clinical Notes</label>
          <input class="input" id="patientResultInput" placeholder="Notes / observations" />
        </div>
      `;
    },

    hydrateFormFields(p) {
      setVal('patientProcedureInput', p.procedure);
      setVal('patientResultInput', p.result);
    },

    collectFormFields() {
      return {
        procedure: getVal('patientProcedureInput'),
        result: getVal('patientResultInput')
      };
    },

    renderExtraCells(p) {
      const { escapeHtml } = MediFlow.UI;
      return `<td class="text-soft">${escapeHtml(p.procedure || '—')}</td><td class="text-soft">${escapeHtml(p.result || '—')}</td>`;
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
