// Runs in the page. Inserts probes into the field the user picked, and reads
// back what the application did to them after the page reflects the value.
(function () {
  // Guard against running twice in the same page (declared content script plus
  // an on-demand injection from the popup).
  if (globalThis.__uprobeContentLoaded) return;
  globalThis.__uprobeContentLoaded = true;

  const U = globalThis.UPROBE;
  let lastTarget = null;

  // Remember the field the context menu was opened on.
  document.addEventListener(
    'contextmenu',
    (e) => {
      const el = e.target;
      if (isEditable(el)) lastTarget = el;
    },
    true
  );

  function isEditable(el) {
    if (!el) return false;
    if (el.isContentEditable) return true;
    const tag = el.tagName;
    if (tag === 'TEXTAREA') return true;
    if (tag === 'INPUT') {
      const t = (el.type || 'text').toLowerCase();
      return ['text', 'search', 'url', 'email', 'tel', 'password', ''].includes(t);
    }
    return false;
  }

  function setValue(el, value) {
    if (el.isContentEditable) {
      el.textContent = value;
    } else {
      const proto = el.tagName === 'TEXTAREA'
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(el, value);
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function selectedProbes(groups) {
    const all = U.probes || [];
    if (!groups || !groups.length) return all;
    return all.filter((p) => groups.includes(p.group));
  }

  // Everything on the page that could show a reflected value.
  function observedText() {
    const parts = [];
    if (document.body) parts.push(document.body.innerText || '');
    document.querySelectorAll('input, textarea').forEach((el) => {
      if (typeof el.value === 'string') parts.push(el.value);
    });
    document.title && parts.push(document.title);
    return parts.join('\n');
  }

  async function inject(groups) {
    const el = lastTarget || (isEditable(document.activeElement) ? document.activeElement : null);
    if (!el) return { ok: false, error: 'no-field' };
    const probes = selectedProbes(groups);
    const injection = U.buildInjection(probes);
    setValue(el, injection.value);
    await chrome.storage.local.set({ lastInjection: injection });
    return { ok: true, count: probes.length };
  }

  async function scan() {
    const { lastInjection } = await chrome.storage.local.get('lastInjection');
    if (!lastInjection) return { ok: false, error: 'no-injection' };
    const report = U.scan(observedText(), lastInjection);
    return { ok: true, report };
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'ping') {
      sendResponse({ ok: true });
      return false;
    }
    if (msg.type === 'inject') {
      inject(msg.groups).then(sendResponse);
      return true;
    }
    if (msg.type === 'scan') {
      scan().then(sendResponse);
      return true;
    }
    return false;
  });
})();
