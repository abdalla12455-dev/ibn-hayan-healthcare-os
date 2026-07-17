/* ============================================================
   MediFlow — Derma / Laser Clinic Module
   Registers a config with ClinicRegistry describing:
   - clinic-specific patient form fields
   - extra table columns
   - any specialty behavior
   Shares common utilities from ClinicCore (CRUD, lifecycle,
   financial engine) — only the *differences* live here.
   ============================================================ */

window.MediFlow = window.MediFlow || {};

MediFlow.Clinics = MediFlow.Clinics || {};

MediFlow.Clinics.Laser = (function () {
  'use strict';

  const TYPE = 'DERMA_LASER';

  const config = {
    type: TYPE,

    // ---- Sidebar nav items unique to this clinic ----
    extraNav: [
      { view: 'view-laser-sessions', icon: 'spa', label: 'Laser Sessions' }
    ],

    // ---- Extra content-canvas sections ----
    extraViews: [
      {
        id: 'view-laser-sessions',
        html: `
          <section id="view-laser-sessions" class="hidden space-y-6">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">Laser Sessions Overview</h3>
            </div>
            <div class="mf-card overflow-hidden">
              <div class="overflow-x-auto">
                <table class="mf-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Laser Type</th>
                      <th>Body Area</th>
                      <th>Skin Type</th>
                      <th>Hair Thickness</th>
                      <th>Sessions</th>
                    </tr>
                  </thead>
                  <tbody id="laserSessionsBody"></tbody>
                </table>
              </div>
            </div>
          </section>
        `
      }
    ],

    // ---- Extra <th> for patient tables (appended before Actions) ----
    extraTableHeaders: `<th data-extra>Laser</th><th data-extra>Area</th>`,

    // ---- Render form fields inside Add/Edit Patient modal ----
    renderFormFields() {
      const { t } = MediFlow.I18n;
      return `
        <div>
          <label class="label">${t('laserType')}</label>
          <select class="input" id="patientLaserTypeInput">
            <option value="Diode">Diode</option>
            <option value="Alexandrite">Alexandrite</option>
            <option value="Nd:YAG">Nd:YAG</option>
            <option value="IPL">IPL</option>
          </select>
        </div>
        <div>
          <label class="label">${t('bodyArea')}</label>
          <input class="input" id="patientBodyAreaInput" placeholder="e.g. Underarm, Legs" />
        </div>
        <div>
          <label class="label">${t('skinType')}</label>
          <select class="input" id="patientSkinTypeInput">
            <option value="I">I</option><option value="II">II</option>
            <option value="III">III</option><option value="IV">IV</option>
            <option value="V">V</option><option value="VI">VI</option>
          </select>
        </div>
        <div>
          <label class="label">${t('hairThickness')}</label>
          <select class="input" id="patientHairThicknessInput">
            <option value="Fine">Fine</option>
            <option value="Medium">Medium</option>
            <option value="Coarse">Coarse</option>
          </select>
        </div>
        <div>
          <label class="label">${t('sessions')}</label>
          <input class="input" type="number" id="patientSessionsInput" value="1" min="1" />
        </div>
      `;
    },

    // ---- Hydrate form fields when editing existing patient ----
    hydrateFormFields(p) {
      setVal('patientLaserTypeInput', p.laserType);
      setVal('patientBodyAreaInput', p.bodyArea);
      setVal('patientSkinTypeInput', p.skinType);
      setVal('patientHairThicknessInput', p.hairThickness);
      setVal('patientSessionsInput', p.sessions);
    },

    // ---- Collect form values into the patient payload ----
    collectFormFields() {
      return {
        laserType: getVal('patientLaserTypeInput'),
        bodyArea: getVal('patientBodyAreaInput'),
        skinType: getVal('patientSkinTypeInput'),
        hairThickness: getVal('patientHairThicknessInput'),
        sessions: Number(getVal('patientSessionsInput')) || 1
      };
    },

    // ---- Extra cells appended to patient table rows ----
    renderExtraCells(p) {
      const { escapeHtml } = MediFlow.UI;
      return `<td>${escapeHtml(p.laserType || '—')}</td><td>${escapeHtml(p.bodyArea || '—')}</td>`;
    },

    // ---- Render the Laser Sessions view ----
    render() {
      const { ClinicCore } = MediFlow;
      const { ds } = ClinicCore.getContext();
      const { escapeHtml } = MediFlow.UI;
      const tbody = document.getElementById('laserSessionsBody');
      if (!tbody) return;
      const list = ds.getPatients().filter(p => p.laserType);
      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8" style="color: var(--mf-text-soft);">No laser sessions yet</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(p => `
        <tr>
          <td class="font-medium">${escapeHtml(p.name)}</td>
          <td>${escapeHtml(p.laserType || '—')}</td>
          <td>${escapeHtml(p.bodyArea || '—')}</td>
          <td>${escapeHtml(p.skinType || '—')}</td>
          <td>${escapeHtml(p.hairThickness || '—')}</td>
          <td>${p.sessions || 1}</td>
        </tr>
      `).join('');
    }
  };

  // ---- Helpers ----
  function setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v || ''; }
  function getVal(id) { const el = document.getElementById(id); return el ? el.value : ''; }

  // ---- Self-register ----
  MediFlow.ClinicRegistry.register(config);

  return { config };
})();
