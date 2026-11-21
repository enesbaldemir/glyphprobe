// Popup: drive inject and scan on the active tab, and render the report.
(function () {
  const U = globalThis.UPROBE;
  const WSTG = 'https://github.com/OWASP/wstg/blob/master/document/11-Injection/24-Unicode_Normalization_and_Case_Mapping.md';

  const statusEl = document.getElementById('status');
  const summaryEl = document.getElementById('summary');
  const resultsEl = document.getElementById('results');
  document.getElementById('wstg').href = WSTG;

  function chosenGroups() {
    return Array.from(document.querySelectorAll('fieldset input:checked')).map((c) => c.value);
  }

  async function activeTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  const CONTENT_FILES = [
    'src/data/bestfit.js',
    'src/data/probes.js',
    'src/lib/transforms.js',
    'src/lib/detect.js',
    'src/content.js',
  ];

  // Make sure the content script is present before messaging it. If the page was
  // open before the extension loaded, inject it on demand so the user does not
  // have to reload the page first.
  async function ensureContent(tabId) {
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'ping' });
      return;
    } catch (e) {
      await chrome.scripting.executeScript({ target: { tabId }, files: CONTENT_FILES });
    }
  }

  async function send(message) {
    const tab = await activeTab();
    if (!tab || tab.id === undefined) throw new Error('no-tab');
    await ensureContent(tab.id);
    return chrome.tabs.sendMessage(tab.id, message);
  }

  function setStatus(text) {
    statusEl.textContent = text || '';
  }

  document.getElementById('insert').addEventListener('click', async () => {
    try {
      const res = await send({ type: 'inject', groups: chosenGroups() });
      if (!res || !res.ok) {
        setStatus(res && res.error === 'no-field'
          ? 'Click into a text field first, or right-click it and choose "Insert Unicode probes".'
          : 'Could not insert here.');
        return;
      }
      setStatus(`Inserted ${res.count} probes. Submit the form, then come back and scan.`);
    } catch (e) {
      setStatus('This page cannot be scripted (for example a browser page).');
    }
  });

  document.getElementById('scan').addEventListener('click', async () => {
    try {
      const res = await send({ type: 'scan' });
      if (!res || !res.ok) {
        setStatus(res && res.error === 'no-injection'
          ? 'No probes inserted yet. Insert them into a field first.'
          : 'Nothing to scan.');
        summaryEl.hidden = true;
        resultsEl.innerHTML = '';
        return;
      }
      render(res.report);
    } catch (e) {
      setStatus('This page cannot be scripted (for example a browser page).');
    }
  });

  function render(report) {
    if (!report.anyObserved) {
      setStatus('None of the probes were found on this page. The value may not be reflected here, or it was removed.');
    } else {
      const changed = report.rows.filter((r) => r.status === 'transformed' || r.status === 'changed').length;
      setStatus(changed ? `Scan complete. ${changed} of ${report.rows.length} probes were transformed.`
        : 'Scan complete. No probe was transformed on this page.');
    }

    const mechanisms = ['normalization', 'bestfit', 'uppercasing', 'lowercasing', 'casefolding'];
    const label = {
      normalization: 'Normalization', bestfit: 'Windows best-fit',
      uppercasing: 'Uppercasing', lowercasing: 'Lowercasing', casefolding: 'Case folding',
    };
    summaryEl.innerHTML = '';
    mechanisms.forEach((m) => {
      const chip = document.createElement('span');
      chip.className = 'chip' + (report.active.includes(m) ? ' on' : '');
      chip.textContent = label[m];
      summaryEl.appendChild(chip);
    });
    summaryEl.hidden = false;

    const rows = report.rows.map((r) => {
      const tags = r.transforms.map((k) => U.transformLabel[k]).join(', ');
      const cls = 's-' + r.status;
      const note = r.status === 'transformed' ? tags
        : r.status === 'unchanged' ? 'unchanged'
        : r.status === 'changed' ? 'changed (no known transform)'
        : 'not reflected';
      const obs = r.observed === null ? '—' : r.observed;
      return `<tr>
        <td class="char" title="${r.name}">${escape(r.char)}</td>
        <td>${r.cp}</td>
        <td class="obs">${escape(obs)}</td>
        <td class="tag ${cls}">${escape(note)}${r.grew ? ' <span class="grew">+len</span>' : ''}</td>
      </tr>`;
    }).join('');

    resultsEl.innerHTML = `<table>
      <thead><tr><th>Char</th><th>Code point</th><th>Became</th><th>Result</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  function escape(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }
})();
