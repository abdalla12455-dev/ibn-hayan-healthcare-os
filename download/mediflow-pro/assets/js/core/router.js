/* ============================================================
   MediFlow — SPA Router
   navigate(viewId) swaps visibility of <section> children
   inside #content-canvas without reloading the page.
   ============================================================ */

window.MediFlow = window.MediFlow || {};

MediFlow.Router = (function () {
  'use strict';

  let _titleEl = null;
  let _subtitleEl = null;
  let _titleMap = {};
  let _beforeHooks = [];
  let _afterHooks  = [];

  function configure(opts = {}) {
    _titleEl = opts.titleEl ? (typeof opts.titleEl === 'string' ? document.getElementById(opts.titleEl) : opts.titleEl) : _titleEl;
    _subtitleEl = opts.subtitleEl ? (typeof opts.subtitleEl === 'string' ? document.getElementById(opts.subtitleEl) : opts.subtitleEl) : _subtitleEl;
    _titleMap = opts.titleMap || _titleMap;
  }

  function before(fn) { _beforeHooks.push(fn); }
  function after(fn)  { _afterHooks.push(fn); }

  function navigate(viewId) {
    const canvas = document.getElementById('content-canvas');
    if (!canvas) { console.warn('[Router] #content-canvas not found'); return; }

    // Run pre-navigate hooks
    _beforeHooks.forEach(fn => { try { fn(viewId); } catch (e) { console.error(e); } });

    // Hide every section inside the canvas (including nested ones in #clinicExtraViews)
    canvas.querySelectorAll('section').forEach(s => s.classList.add('hidden'));

    // Show target (find anywhere inside canvas, not just direct children)
    const target = canvas.querySelector(`#${viewId}`);
    if (!target) { console.warn(`[Router] section #${viewId} not found`); return; }
    target.classList.remove('hidden');

    // If the target is inside a wrapper (e.g. #clinicExtraViews), make sure the wrapper is also visible
    let parent = target.parentElement;
    while (parent && parent !== canvas) {
      if (parent.classList.contains('hidden')) parent.classList.remove('hidden');
      parent = parent.parentElement;
    }

    // Update sidebar active state
    document.querySelectorAll('.nav-item[data-view]').forEach(n => n.classList.remove('active'));
    const navItem = document.querySelector(`.nav-item[data-view="${viewId}"]`);
    if (navItem) navItem.classList.add('active');

    // Update page title
    const titleKey = _titleMap[viewId];
    if (_titleEl && titleKey) _titleEl.textContent = MediFlow.I18n.t(titleKey);

    // Update URL hash for shareable / refreshable links
    if (location.hash !== `#${viewId}`) {
      history.replaceState(null, '', `#${viewId}`);
    }

    // Run post-navigate hooks (re-render data-driven views)
    _afterHooks.forEach(fn => { try { fn(viewId); } catch (e) { console.error(e); } });
  }

  function bindNav() {
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
      item.addEventListener('click', () => navigate(item.getAttribute('data-view')));
    });
  }

  function init() {
    bindNav();
    // Restore from URL hash on load
    const hash = location.hash.replace('#', '');
    if (hash && document.getElementById(hash)) {
      navigate(hash);
    } else {
      // Default to first section
      const canvas = document.getElementById('content-canvas');
      if (canvas) {
        const first = canvas.querySelector(':scope > section');
        if (first) navigate(first.id);
      }
    }
  }

  return { navigate, init, bindNav, configure, before, after };
})();
