// Service worker: adds the context-menu item and forwards the insert request to
// the page. If the page was open before the extension loaded, the declared
// content script is not there yet, so it is injected on demand first.
importScripts(
  'data/bestfit.js',
  'data/probes.js',
  'lib/transforms.js',
  'lib/detect.js'
);

const CONTENT_FILES = [
  'src/data/bestfit.js',
  'src/data/probes.js',
  'src/lib/transforms.js',
  'src/lib/detect.js',
  'src/content.js',
];

async function ensureContent(tabId, frameId) {
  try {
    const target = frameId != null ? { frameId } : undefined;
    await chrome.tabs.sendMessage(tabId, { type: 'ping' }, target);
    return true;
  } catch (e) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId, frameIds: frameId != null ? [frameId] : undefined },
        files: CONTENT_FILES,
      });
      return true;
    } catch (e2) {
      return false; // Restricted page (chrome://, web store, etc.).
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'uprobe-insert',
    title: 'Insert GlyphProbe probes',
    contexts: ['editable'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'uprobe-insert' || !tab || tab.id === undefined) return;
  const ok = await ensureContent(tab.id, info.frameId);
  if (!ok) return;
  const target = info.frameId != null ? { frameId: info.frameId } : undefined;
  chrome.tabs.sendMessage(tab.id, { type: 'inject' }, target).catch(() => {});
});
