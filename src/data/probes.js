// Probe characters used to detect how an application transforms input.
//
// Each probe is one character with a known behaviour under the common
// transforms (Unicode normalization, case mapping, case folding and Windows
// best-fit). The set is chosen so that the results tell the transforms apart:
// some characters change only under normalization, some only under a case
// change, and some only under best-fit, so the report can say which mechanism
// is in play rather than just "it became ASCII".
//
// `group` is only used to let the popup turn categories on and off.
globalThis.UPROBE = globalThis.UPROBE || {};
globalThis.UPROBE.probes = [
  // Fullwidth ASCII: the characters that matter for filter bypass. They map to
  // ASCII under both NFKC and best-fit, so on their own they don't say which;
  // the discriminators below do.
  { char: '＜', cp: 'U+FF1C', name: 'FULLWIDTH LESS-THAN SIGN', group: 'injection' },
  { char: '＞', cp: 'U+FF1E', name: 'FULLWIDTH GREATER-THAN SIGN', group: 'injection' },
  { char: '＇', cp: 'U+FF07', name: 'FULLWIDTH APOSTROPHE', group: 'injection' },
  { char: '＂', cp: 'U+FF02', name: 'FULLWIDTH QUOTATION MARK', group: 'injection' },
  { char: '／', cp: 'U+FF0F', name: 'FULLWIDTH SOLIDUS', group: 'injection' },
  { char: '．', cp: 'U+FF0E', name: 'FULLWIDTH FULL STOP', group: 'injection' },

  // Discriminators: normalization yes, best-fit no.
  { char: 'ﬁ', cp: 'U+FB01', name: 'LATIN SMALL LIGATURE FI', group: 'discriminator' },
  { char: 'ſ', cp: 'U+017F', name: 'LATIN SMALL LETTER LONG S', group: 'discriminator' },
  { char: '²', cp: 'U+00B2', name: 'SUPERSCRIPT TWO', group: 'discriminator' },
  { char: '℅', cp: 'U+2105', name: 'CARE OF', group: 'length' },

  // Discriminator: best-fit yes, normalization no. If this becomes "8", the app
  // is doing Windows ANSI best-fit, not Unicode normalization.
  { char: '∞', cp: 'U+221E', name: 'INFINITY', group: 'discriminator' },

  // Case mapping, which is separate from normalization.
  { char: 'K', cp: 'U+212A', name: 'KELVIN SIGN', group: 'case' },
  { char: 'ı', cp: 'U+0131', name: 'LATIN SMALL LETTER DOTLESS I', group: 'case' },
  { char: 'ß', cp: 'U+00DF', name: 'LATIN SMALL LETTER SHARP S', group: 'length' },
];
