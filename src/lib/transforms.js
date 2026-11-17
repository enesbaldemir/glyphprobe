// Compute what a character becomes under each transform, so an observed result
// can be matched back to the transform that produced it.
//
// Normalization and case mapping come from the platform (String.normalize,
// toUpperCase, toLowerCase). JavaScript has no case-folding API, so a small
// table covers the probe characters where full case folding differs from
// toLowerCase (for example sharp s folds to "ss", the long s folds to "s");
// for anything else, folding falls back to toLowerCase.
globalThis.UPROBE = globalThis.UPROBE || {};

(function () {
  const caseFoldTable = {
    'ß': 'ss', // SHARP S
    'ﬁ': 'fi', // LIGATURE FI
    'ſ': 's',  // LONG S
    'K': 'k',  // KELVIN SIGN
    'ı': 'ı', // DOTLESS I (unchanged under default folding)
    '℅': 'c/o', // CARE OF
  };

  function caseFold(ch) {
    if (Object.prototype.hasOwnProperty.call(caseFoldTable, ch)) return caseFoldTable[ch];
    return ch.toLowerCase();
  }

  function bestfit(ch) {
    const map = globalThis.UPROBE.bestfit || {};
    let out = '';
    let mapped = false;
    for (const cp of ch) {
      const key = cp.codePointAt(0).toString(16);
      if (Object.prototype.hasOwnProperty.call(map, key)) {
        out += map[key];
        mapped = true;
      } else {
        out += cp;
      }
    }
    return mapped ? out : ch;
  }

  // All transforms whose output can be compared against an observed value.
  // The order sets how results are listed when more than one matches.
  globalThis.UPROBE.transformsFor = function (ch) {
    return {
      nfc: ch.normalize('NFC'),
      nfd: ch.normalize('NFD'),
      nfkc: ch.normalize('NFKC'),
      nfkd: ch.normalize('NFKD'),
      uppercase: ch.toUpperCase(),
      lowercase: ch.toLowerCase(),
      casefold: caseFold(ch),
      bestfit: bestfit(ch),
    };
  };

  // Human-readable label per transform key, shown in the report.
  globalThis.UPROBE.transformLabel = {
    nfc: 'NFC',
    nfd: 'NFD',
    nfkc: 'NFKC',
    nfkd: 'NFKD',
    uppercase: 'uppercasing',
    lowercase: 'lowercasing',
    casefold: 'case folding',
    bestfit: 'Windows best-fit',
  };
})();
