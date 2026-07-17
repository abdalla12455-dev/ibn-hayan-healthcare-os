/* ============================================================
   MediFlow — Dental Clinic Module
   Specialty: tooth-level procedures + interactive dental chart
   - Clinic-specific fields: toothNumber, procedure
   - Extra view: 32-tooth chart with affected/extracted markers
   - Dental chart persists globally under mediflow_dental_chart
   ============================================================ */

window.MediFlow = window.MediFlow || {};

MediFlow.Clinics = MediFlow.Clinics || {};

MediFlow.Clinics.Dental = (function () {
  'use strict';

  const TYPE = 'DENTAL';

  // ---- Local mirror of dental chart state ----
  let _chart = { affected: [], extracted: [] };

  const config = {
    type: TYPE,

    extraNav: [
      { view: 'view-dental-chart', icon: 'dentistry', label: 'Dental Chart' }
    ],

    extraViews: [
      {
        id: 'view-dental-chart',
        html: `
          <section id="view-dental-chart" class="hidden space-y-6">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">Dental Chart</h3>
              <div class="flex gap-2">
                <button class="btn btn-ghost" id="dentalModeAffected">
                  <span class="ms ms-sm">circle</span>Mark Affected
                </button>
                <button class="btn btn-ghost" id="dentalModeExtracted">
                  <span class="ms ms-sm">remove_circle</span>Mark Extracted
                </button>
                <button class="btn btn-ghost text-red-500" id="dentalClear">
                  <span class="ms ms-sm">clear</span>Clear All
                </button>
              </div>
            </div>
            <div class="mf-card p-6">
              <p class="text-sm mb-4" style="color: var(--mf-text-soft);">
                Click a tooth to toggle its state. Universal numbering (1-32).
              </p>
              <div class="space-y-4">
                <div>
                  <p class="text-xs font-semibold mb-2" style="color: var(--mf-text-soft);">UPPER</p>
                  <div class="flex flex-wrap gap-2" id="upperTeeth"></div>
                </div>
                <div>
                  <p class="text-xs font-semibold mb-2" style="color: var(--mf-text-soft);">LOWER</p>
                  <div class="flex flex-wrap gap-2" id="lowerTeeth"></div>
                </div>
              </div>
              <div class="mt-6 flex gap-6 text-xs" style="color: var(--mf-text-soft);">
                <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-amber-400"></div>Affected</div>
                <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-red-500"></div>Extracted</div>
                <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full border-2 border-slate-300"></div>Healthy</div>
              </div>
            </div>
          </section>
        `
      }
    ],

    extraTableHeaders: `<th data-extra>Tooth</th><th data-extra>Procedure</th>`,

    renderFormFields() {
      const { t } = MediFlow.I18n;
      return `
        <div>
          <label class="label">${t('toothNumber')}</label>
          <input class="input" id="patientToothInput" placeholder="e.g. 16, 21" />
        </div>
        <div>
          <label class="label">${t('procedure')}</label>
          <input class="input" id="patientProcedureInput" placeholder="e.g. Filling, Extraction" />
        </div>
      `;
    },

    hydrateFormFields(p) {
      setVal('patientToothInput', p.toothNumber);
      setVal('patientProcedureInput', p.procedure);
    },

    collectFormFields() {
      return {
        toothNumber: getVal('patientToothInput'),
        procedure: getVal('patientProcedureInput')
      };
    },

    renderExtraCells(p) {
      const { escapeHtml } = MediFlow.UI;
      return `<td>${escapeHtml(p.toothNumber || '—')}</td><td>${escapeHtml(p.procedure || '—')}</td>`;
    },

    // ---- Hook fired after layout is applied — bind chart events ----
    onLayoutApplied() {
      const { ClinicCore } = MediFlow;
      const { clinic } = ClinicCore.getContext();
      _chart = MediFlow.Store.getDentalChart(clinic.id);
      renderChart();
      // Bind mode toggles + clear
      const modeAff = document.getElementById('dentalModeAffected');
      const modeExt = document.getElementById('dentalModeExtracted');
      const clearBtn = document.getElementById('dentalClear');
      if (modeAff) modeAff.addEventListener('click', () => { _mode = 'affected'; highlightMode(); });
      if (modeExt) modeExt.addEventListener('click', () => { _mode = 'extracted'; highlightMode(); });
      if (clearBtn) clearBtn.addEventListener('click', () => {
        if (!confirm('Clear all tooth marks?')) return;
        _chart = { affected: [], extracted: [] };
        saveChart();
        renderChart();
      });
    },

    // ---- Render the dental chart view ----
    render() {
      // Refresh chart from store on every render cycle (in case view switched)
      const { ClinicCore } = MediFlow;
      const { clinic } = ClinicCore.getContext();
      _chart = MediFlow.Store.getDentalChart(clinic.id);
      renderChart();
    }
  };

  // ---- Local mode state ----
  let _mode = 'affected';

  function highlightMode() {
    const aff = document.getElementById('dentalModeAffected');
    const ext = document.getElementById('dentalModeExtracted');
    if (aff) aff.classList.toggle('ring-2', _mode === 'affected');
    if (ext) ext.classList.toggle('ring-2', _mode === 'extracted');
  }

  function renderChart() {
    const upper = document.getElementById('upperTeeth');
    const lower = document.getElementById('lowerTeeth');
    if (!upper || !lower) return;
    const upperTeeth = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];
    const lowerTeeth = [17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32];
    const cls = (n) => _chart.extracted.includes(n) ? 'extracted' : _chart.affected.includes(n) ? 'affected' : '';
    upper.innerHTML = upperTeeth.map(n =>
      `<div class="tooth ${cls(n)}" onclick="MediFlow.Clinics.Dental.toggleTooth(${n})">${n}</div>`
    ).join('');
    lower.innerHTML = lowerTeeth.map(n =>
      `<div class="tooth ${cls(n)}" onclick="MediFlow.Clinics.Dental.toggleTooth(${n})">${n}</div>`
    ).join('');
  }

  function toggleTooth(n) {
    if (_chart.extracted.includes(n)) _chart.extracted = _chart.extracted.filter(x => x !== n);
    else if (_chart.affected.includes(n)) {
      if (_mode === 'extracted') {
        _chart.affected = _chart.affected.filter(x => x !== n);
        _chart.extracted.push(n);
      } else {
        _chart.affected = _chart.affected.filter(x => x !== n); // toggle off
      }
    } else {
      if (_mode === 'extracted') _chart.extracted.push(n);
      else _chart.affected.push(n);
    }
    saveChart();
    renderChart();
  }

  function saveChart() {
    const { ClinicCore } = MediFlow;
    const { clinic } = ClinicCore.getContext();
    MediFlow.Store.setDentalChart(clinic.id, _chart);
  }

  // ---- Helpers ----
  function setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v || ''; }
  function getVal(id) { const el = document.getElementById(id); return el ? el.value : ''; }

  // ---- Self-register ----
  MediFlow.ClinicRegistry.register(config);

  return { config, toggleTooth };
})();
