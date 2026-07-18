/* ============================================================
   MediFlow — Dental Clinic Module (Premium)
   Specialty: tooth-level procedures + interactive dental chart
   ============================================================ */

window.MediFlow = window.MediFlow || {};
MediFlow.Clinics = MediFlow.Clinics || {};

MediFlow.Clinics.Dental = (function () {
  'use strict';

  const TYPE = 'DENTAL';
  let _chart = { affected: [], extracted: [] };
  let _mode = 'affected';

  const config = {
    type: TYPE,

    extraNav: [
      { view: 'view-dental-chart', icon: 'dentistry', label: 'Dental Chart' }
    ],

    extraViews: [
      {
        id: 'view-dental-chart',
        html: `
          <section id="view-dental-chart" class="hidden space-y-6 view-enter">
            <div class="page-header">
              <div>
                <h1 class="page-title">Dental Chart</h1>
                <p class="page-subtitle">Interactive tooth map · Universal numbering (1-32)</p>
              </div>
              <div class="page-actions">
                <div class="segmented">
                  <button class="segment active" id="dentalModeAffected"><span class="ms">circle</span>Affected</button>
                  <button class="segment" id="dentalModeExtracted"><span class="ms">remove_circle</span>Extracted</button>
                </div>
                <button class="btn btn-secondary" id="dentalClear">
                  <span class="ms">clear</span>
                  Clear All
                </button>
              </div>
            </div>

            <div class="card">
              <div class="card-body space-y-6">
                <div>
                  <div class="flex items-center gap-2 mb-3">
                    <span class="badge badge-info badge-dot">UPPER</span>
                    <span class="text-xs text-soft">Right → Left (patient's view)</span>
                  </div>
                  <div class="flex flex-wrap gap-2" id="upperTeeth"></div>
                </div>
                <div class="divider"></div>
                <div>
                  <div class="flex items-center gap-2 mb-3">
                    <span class="badge badge-info badge-dot">LOWER</span>
                    <span class="text-xs text-soft">Right → Left (patient's view)</span>
                  </div>
                  <div class="flex flex-wrap gap-2" id="lowerTeeth"></div>
                </div>

                <div class="divider"></div>

                <div class="flex flex-wrap gap-4 text-sm">
                  <div class="flex items-center gap-2">
                    <div style="width:14px; height:14px; border-radius:4px; background:var(--warning-soft); border:1.5px solid var(--warning);"></div>
                    <span class="text-soft">Affected</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <div style="width:14px; height:14px; border-radius:4px; background:var(--danger-soft); border:1.5px solid var(--danger);"></div>
                    <span class="text-soft">Extracted</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <div style="width:14px; height:14px; border-radius:4px; background:var(--surface); border:1.5px solid var(--border-strong);"></div>
                    <span class="text-soft">Healthy</span>
                  </div>
                </div>
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
      return `<td class="text-soft">${escapeHtml(p.toothNumber || '—')}</td><td class="text-soft">${escapeHtml(p.procedure || '—')}</td>`;
    },

    onLayoutApplied() {
      const { ClinicCore } = MediFlow;
      const { clinic } = ClinicCore.getContext();
      _chart = MediFlow.Store.getDentalChart(clinic.id);
      renderChart();
      const modeAff = document.getElementById('dentalModeAffected');
      const modeExt = document.getElementById('dentalModeExtracted');
      const clearBtn = document.getElementById('dentalClear');
      if (modeAff) modeAff.addEventListener('click', () => { _mode = 'affected'; highlightMode(); });
      if (modeExt) modeExt.addEventListener('click', () => { _mode = 'extracted'; highlightMode(); });
      if (clearBtn) clearBtn.addEventListener('click', async () => {
        const ok = await MediFlow.UI.confirm({
          title: 'Clear All',
          headline: 'Clear all tooth marks?',
          message: 'This will reset every tooth to healthy state.',
          confirmText: 'Clear',
          danger: true
        });
        if (!ok) return;
        _chart = { affected: [], extracted: [] };
        saveChart();
        renderChart();
        MediFlow.UI.toast('Dental chart cleared', 'success');
      });
    },

    render() {
      const { ClinicCore } = MediFlow;
      const { clinic } = ClinicCore.getContext();
      _chart = MediFlow.Store.getDentalChart(clinic.id);
      renderChart();
    }
  };

  function highlightMode() {
    const aff = document.getElementById('dentalModeAffected');
    const ext = document.getElementById('dentalModeExtracted');
    if (aff) aff.classList.toggle('active', _mode === 'affected');
    if (ext) ext.classList.toggle('active', _mode === 'extracted');
  }

  function renderChart() {
    const upper = document.getElementById('upperTeeth');
    const lower = document.getElementById('lowerTeeth');
    if (!upper || !lower) return;
    const upperTeeth = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];
    const lowerTeeth = [17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32];
    const cls = (n) => _chart.extracted.includes(n) ? 'extracted' : _chart.affected.includes(n) ? 'affected' : '';
    upper.innerHTML = upperTeeth.map(n =>
      `<div class="tooth ${cls(n)}" onclick="MediFlow.Clinics.Dental.toggleTooth(${n})" title="Tooth #${n}">${n}</div>`
    ).join('');
    lower.innerHTML = lowerTeeth.map(n =>
      `<div class="tooth ${cls(n)}" onclick="MediFlow.Clinics.Dental.toggleTooth(${n})" title="Tooth #${n}">${n}</div>`
    ).join('');
  }

  function toggleTooth(n) {
    if (_chart.extracted.includes(n)) {
      _chart.extracted = _chart.extracted.filter(x => x !== n);
    } else if (_chart.affected.includes(n)) {
      if (_mode === 'extracted') {
        _chart.affected = _chart.affected.filter(x => x !== n);
        _chart.extracted.push(n);
      } else {
        _chart.affected = _chart.affected.filter(x => x !== n);
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

  function setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v || ''; }
  function getVal(id) { const el = document.getElementById(id); return el ? el.value : ''; }

  MediFlow.ClinicRegistry.register(config);

  return { config, toggleTooth };
})();
