// Build the probe string that goes into a field, and read back what the
// application did to each probe.
//
// Each probe is prefixed with an ASCII marker ("uprb" + index) so the probe can
// be found again in the response even after the value is reflected, reordered
// or wrapped in other text. Markers are matched case-insensitively, since the
// only transform that touches ASCII letters is a case change.
globalThis.UPROBE = globalThis.UPROBE || {};

(function () {
  const PREFIX = 'uprb';
  const SENTINEL = 'uprbzz';

  function pad(i) {
    return String(i).padStart(2, '0');
  }

  // Build the value to insert, and the map needed to read it back.
  globalThis.UPROBE.buildInjection = function (probes) {
    let value = '';
    const markers = [];
    probes.forEach((p, i) => {
      const marker = PREFIX + pad(i);
      value += marker + p.char;
      markers.push({ marker, index: i, cp: p.cp, name: p.name, char: p.char });
    });
    value += SENTINEL;
    return { value, markers, createdAt: Date.now() };
  };

  // Pull the observed text that followed each marker out of the response.
  function extract(observedText, markers) {
    const found = {};
    const re = /uprb(\d\d|zz)([\s\S]*?)(?=uprb(?:\d\d|zz)|$)/gi;
    let m;
    while ((m = re.exec(observedText)) !== null) {
      const tag = m[1].toLowerCase();
      if (tag === 'zz') continue;
      const index = parseInt(tag, 10);
      if (!(index in found)) found[index] = m[2];
    }
    return found;
  }

  function cp(ch) {
    return Array.from(ch).length;
  }

  // Compare one probe's observed value against every transform.
  function classify(probe, observed) {
    if (observed === undefined) {
      return { status: 'not-observed', transforms: [], observed: null, grew: false };
    }
    if (observed === probe.char) {
      return { status: 'unchanged', transforms: [], observed, grew: false };
    }
    const t = globalThis.UPROBE.transformsFor(probe.char);
    const transforms = [];
    for (const key of Object.keys(t)) {
      if (t[key] !== probe.char && t[key] === observed) transforms.push(key);
    }
    const grew = cp(observed) > cp(probe.char);
    return {
      status: transforms.length ? 'transformed' : 'changed',
      transforms,
      observed,
      grew,
    };
  }

  // Produce the full report: one row per probe plus a short summary of which
  // mechanisms are in play.
  globalThis.UPROBE.scan = function (observedText, injection) {
    const probesByCp = {};
    (globalThis.UPROBE.probes || []).forEach((p) => { probesByCp[p.cp] = p; });

    const extracted = extract(observedText, injection.markers);
    const rows = injection.markers.map((mk) => {
      const probe = probesByCp[mk.cp] || { char: mk.char, cp: mk.cp, name: mk.name };
      const result = classify(probe, extracted[mk.index]);
      return {
        cp: mk.cp,
        name: mk.name,
        char: mk.char,
        observed: result.observed,
        status: result.status,
        transforms: result.transforms,
        grew: result.grew,
      };
    });

    // Decide which mechanisms are in play from the probes that can only be
    // explained by one of them. A character that maps to ASCII under both
    // normalization and best-fit (the fullwidth set) cannot tell them apart, so
    // the summary leans on the single-mechanism probes: infinity for best-fit,
    // superscript two for normalization, sharp s for case folding.
    const active = new Set();
    rows.forEach((r) => {
      const has = (k) => r.transforms.includes(k);
      if (has('bestfit') && !has('nfkc') && !has('nfkd')) active.add('bestfit');
      if ((has('nfkc') || has('nfkd')) && !has('bestfit')) active.add('normalization');
      if ((has('nfc') || has('nfd')) && !has('nfkc') && !has('nfkd')) active.add('normalization');
      if (has('uppercase')) active.add('uppercasing');
      if (has('lowercase')) active.add('lowercasing');
      if (has('casefold') && !has('lowercase') && !has('nfkc') && !has('nfkd')) active.add('casefolding');
    });

    const anyObserved = rows.some((r) => r.status !== 'not-observed');
    return {
      createdAt: injection.createdAt,
      active: Array.from(active),
      anyObserved,
      rows,
    };
  };
})();
