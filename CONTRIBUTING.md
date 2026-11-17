# Contributing

Thanks for your interest in GlyphProbe. Bug reports, probe ideas and code are
welcome.

## Development

The extension is plain JavaScript with no build step. Load it unpacked from
`chrome://extensions` (Developer mode → **Load unpacked** → this folder) and
reload the card after a change.

The detection engine (`src/data`, `src/lib`) runs without a browser, so it can be
tested directly:

```bash
node test/run.js
```

The same test runs in CI on every pull request. Add or update a case when you
change detection behaviour.

## Adding a probe

A good probe is a single character whose behaviour under the transforms is known
and, ideally, tells one mechanism apart from another (for example a character
that changes under Windows best-fit but not under NFKC). Add it to
`src/data/probes.js`, and if its case folding differs from `toLowerCase`, add it
to the table in `src/lib/transforms.js`.

## Scope

GlyphProbe is for testing applications you own or are authorized to test. Please
keep contributions within that purpose.

## Pull requests

1. Fork and branch from `main`.
2. Keep each pull request focused.
3. Sign off your commits with `git commit -s`.
4. Run `node test/run.js` before opening the pull request.
