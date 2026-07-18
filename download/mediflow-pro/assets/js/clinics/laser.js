/* ============================================================
   MediFlow — Derma / Laser Clinic Module (Premium)
   ============================================================ */

window.MediFlow = window.MediFlow || {};
MediFlow.Clinics = MediFlow.Clinics || {};

MediFlow.Clinics.Laser = (function () {
  'use strict';

  const TYPE = 'DERMA_LASER';

  const config = {
    type: TYPE,

    extraNav: [
      { view: 'view-laser-sessions', icon: 'spa', label: 'Laser Sessions' }
    ],

    extraViews: [
      {
        id: 'view-laser-sessions',
        html: `
          <section id="view-laser-sessions" class="hidden space-y-6 view-enter">
            <div class="page-header">
              <div>
                <h1 class="page-title">Laser Sessions</h1>
                <p class="page-subtitle">Track all laser treatment sessions and parameters</p>
              </div>
            </div>
            <div class="card">
              <div class="table-scroll">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Laser Type</th>
                      <th>Body Area</th>
                      <th>Skin Type</th>
                      <th>Hair Thickness</th>
                      <th>Sessions</th>
                      <th>Status</th>
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

    extraTableHeaders: `<th data-extra>Laser</th><th data-extra>Area</th>`,

    renderFormFields() {
      const { t } = MediFlow.I18n;
      return `
        <div>
          <label class="label">${t('laserType')}</label>
          <select class="select" id="patientLaserTypeInput">
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
          <select class="select" id="patientSkinTypeInput">
            <option value="I">I</option><option value="II">II</option>
            <option value="III">III</option><option value="IV">IV</option>
            <option value="V">V</option><option value="VI">VI</option>
          </select>
        </div>
        <div>
          <label class="label">${t('hairThickness')}</label>
          <select class="select" id="patientHairThicknessInput">
            <option value="Fine">Fine</option>
            <option value="Medium">Medium</option>
            <option value="Coarse">Coarse</option>
          </select>
        </div>
        <div class="col-span-2">
          <label class="label">${t('sessions')}</label>
          <input class="input" type="number" id="patientSessionsInput" value="1" min="1" />
        </div>
      `;
    },

    hydrateFormFields(p) {
      setVal('patientLaserTypeInput', p.laserType);
      setVal('patientBodyAreaInput', p.bodyArea);
      setVal('patientSkinTypeInput', p.skinType);
      setVal('patientHairThicknessInput', p.hairThickness);
      setVal('patientSessionsInput', p.sessions);
    },

    collectFormFields() {
      return {
        laserType: getVal('patientLaserTypeInput'),
        bodyArea: getVal('patientBodyAreaInput'),
        skinType: getVal('patientSkinTypeInput'),
        hairThickness: getVal('patientHairThicknessInput'),
        sessions: Number(getVal('patientSessionsInput')) || 1
      };
    },

    renderExtraCells(p) {
      const { escapeHtml } = MediFlow.UI;
      return `<td class="text-soft">${escapeHtml(p.laserType || '—')}</td><td class="text-soft">${escapeHtml(p.bodyArea || '—')}</td>`;
    },

    render() {
      const { ClinicCore } = MediFlow;
      const { ds } = ClinicCore.getContext();
      const { escapeHtml } = MediFlow.UI;
      const tbody = document.getElementById('laserSessionsBody');
      if (!tbody) return;
      const list = ds.getPatients().filter(p => p.laserType);
      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7"><div class="table-empty"><span class="ms">spa</span><p>No laser sessions yet</p></div></td></tr>`;
        return;
      }
      const statusMeta = {
        arrived:    { badge: 'badge-info',    label: 'Arrived' },
        waiting:    { badge: 'badge-warning', label: 'Waiting' },
        withDoctor: { badge: 'badge-violet',  label: 'In Session' },
        completed:  { badge: 'badge-success', label: 'Completed' },
        cancelled:  { badge: 'badge-danger',  label: 'Cancelled' }
      };
      tbody.innerHTML = list.map(p => {
        const meta = statusMeta[p.status] || statusMeta.arrived;
        return `
          <tr>
            <td>
              <div class="flex items-center gap-3">
                <div class="avatar avatar-sm">${escapeHtml((p.name || '?').slice(0, 2).toUpperCase())}</div>
                <div>
                  <div class="font-semibold text-strong">${escapeHtml(p.name)}</div>
                  <div class="text-xs text-soft">${escapeHtml(p.phone || '—')}</div>
                </div>
              </div>
            </td>
            <td><span class="chip"><span class="ms">bolt</span>${escapeHtml(p.laserType)}</span></td>
            <td class="text-soft">${escapeHtml(p.bodyArea || '—')}</td>
            <td class="tabular">${escapeHtml(p.skinType || '—')}</td>
            <td class="text-soft">${escapeHtml(p.hairThickness || '—')}</td>
            <td class="font-semibold tabular text-strong">${p.sessions || 1}</td>
            <td><span class="badge ${meta.badge} badge-dot">${meta.label}</span></td>
          </tr>
        `;
      }).join('');
    }
  };

  function setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v || ''; }
  function getVal(id) { const el = document.getElementById(id); return el ? el.value : ''; }

  MediFlow.ClinicRegistry.register(config);

  return { config };
})();
