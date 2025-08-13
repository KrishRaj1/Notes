(function () {
  const noteElement = document.getElementById('note');
  const statusElement = document.getElementById('saveState');
  const slugBadgeElement = document.getElementById('slugBadge');

  function deriveSlugFromPath() {
    const pathname = window.location.pathname;
    if (!pathname || pathname === '/' || pathname === '') {
      return 'default';
    }
    const slug = decodeURIComponent(pathname.replace(/^\//, ''));
    const valid = /^[A-Za-z0-9-_]{1,100}$/.test(slug);
    return valid ? slug : 'default';
  }

  const slug = deriveSlugFromPath();
  slugBadgeElement.textContent = '/' + slug;
  document.title = slug === 'default' ? 'Notepad' : slug + ' — Notepad';

  let lastLoadedContent = '';
  let saveTimer = null;

  function setStatus(text) {
    statusElement.textContent = text;
  }

  async function loadNote() {
    setStatus('Loading...');
    try {
      const response = await fetch('/api/note/' + encodeURIComponent(slug), { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load');
      const data = await response.json();
      const content = typeof data.content === 'string' ? data.content : '';
      lastLoadedContent = content;
      noteElement.value = content;
      setStatus(data.updatedAt ? 'Loaded (' + new Date(data.updatedAt).toLocaleString() + ')' : 'Loaded');
    } catch (error) {
      console.error(error);
      // fallback to localStorage if available
      const local = localStorage.getItem('note:' + slug);
      if (local != null) {
        noteElement.value = local;
        setStatus('Offline (local copy)');
      } else {
        setStatus('Offline');
      }
    }
  }

  async function saveNow() {
    clearTimeout(saveTimer);
    const content = noteElement.value;

    // Avoid sending if content hasn't changed since last successful load/save
    if (content === lastLoadedContent) {
      setStatus('Saved');
      return;
    }

    try {
      const response = await fetch('/api/note/' + encodeURIComponent(slug), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      if (!response.ok) throw new Error('Failed to save');
      const data = await response.json();
      lastLoadedContent = content;
      setStatus('Saved ' + (data.updatedAt ? new Date(data.updatedAt).toLocaleTimeString() : ''));
    } catch (error) {
      console.error(error);
      setStatus('Offline — will retry');
    }
  }

  function scheduleSave() {
    localStorage.setItem('note:' + slug, noteElement.value);
    setStatus('Saving...');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 500);
  }

  function saveWithBeacon() {
    try {
      const content = noteElement.value;
      const url = '/api/note/' + encodeURIComponent(slug);
      const payload = JSON.stringify({ content });
      const blob = new Blob([payload], { type: 'application/json' });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, blob);
      }
    } catch (_) {
      // ignore
    }
  }

  noteElement.addEventListener('input', scheduleSave);
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saveWithBeacon();
    }
  });
  window.addEventListener('beforeunload', saveWithBeacon);

  loadNote();
})();