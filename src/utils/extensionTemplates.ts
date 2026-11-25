import { AccentPreset, ExtensionConfig, GeneratedFile } from '../types/extension';
import { generateBridgeFiles } from './bridgeTemplates';

export const ACCENT_PRESETS: AccentPreset[] = [
  { id: 'crimson', label: 'Carmesí', hex: '#E11D48', hoverHex: '#BE123C' },
  { id: 'indigo', label: 'Índigo', hex: '#4F46E5', hoverHex: '#4338CA' },
  { id: 'emerald', label: 'Esmeralda', hex: '#059669', hoverHex: '#047857' },
  { id: 'slate', label: 'Obsidiana', hex: '#0F172A', hoverHex: '#1E293B' },
];

export function getAccentPreset(id: ExtensionConfig['accentColor']): AccentPreset {
  return ACCENT_PRESETS.find((p) => p.id === id) ?? ACCENT_PRESETS[0];
}

export function generateExtensionFiles(config: ExtensionConfig): GeneratedFile[] {
  const accent = getAccentPreset(config.accentColor);
  const safeName = config.extensionName.trim() || 'MediaDrop Downloader';

  const manifestObj: Record<string, unknown> = {
    manifest_version: 3,
    name: safeName,
    version: '1.7.0',
    description:
      'Descarga videos y audio de YouTube, TikTok, Instagram, X, Vimeo y medios HTML5 en formato MP4 o MP3.',
    permissions: ['activeTab', 'downloads', 'storage', 'scripting'],
    host_permissions: ['http://127.0.0.1/*', 'http://localhost/*', 'https://*/*'],
    icons: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png',
    },
    action: {
      default_title: safeName,
      default_popup: 'popup.html',
      default_icon: {
        '16': 'icons/icon16.png',
        '48': 'icons/icon48.png',
        '128': 'icons/icon128.png',
      },
    },
    content_scripts: [
      {
        matches: ['<all_urls>'],
        js: ['content.js'],
        run_at: 'document_idle',
      },
    ],
  };

  if (config.browser === 'firefox') {
    manifestObj.background = {
      scripts: ['background.js'],
    };
    manifestObj.browser_specific_settings = {
      gecko: {
        id: 'mediadrop-downloader@local.addon',
        strict_min_version: '109.0',
      },
    };
  } else {
    manifestObj.background = {
      service_worker: 'background.js',
    };
  }

  const manifestJson = JSON.stringify(manifestObj, null, 2);

  const popupHtml = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeName}</title>
    <link rel="stylesheet" href="popup.css" />
  </head>
  <body>
    <main class="app">
      <header class="header">
        <div class="brand">
          <img src="icons/icon48.png" alt="" class="brand-icon" />
          <span class="brand-name">${safeName}</span>
        </div>
        <button id="toggleSettingsBtn" class="icon-btn" type="button" title="Configurar motor">
          Ajustes
        </button>
      </header>

      <section class="media-card">
        <div class="media-source" id="mediaPlatform">Detectando pestaña...</div>
        <h1 class="media-title" id="mediaTitle">Cargando información de la página</h1>
        <input
          id="urlInput"
          type="url"
          class="url-input"
          placeholder="https://www.youtube.com/watch?v=..."
          aria-label="URL del video o audio"
        />
      </section>

      <section class="controls">
        <div class="field-label">Formato de salida</div>
        <div class="segmented" role="tablist" aria-label="Formato de descarga">
          <button type="button" class="seg-btn active" data-format="mp4" id="btnMp4">
            MP4 Video
          </button>
          <button type="button" class="seg-btn" data-format="mp3" id="btnMp3">
            MP3 Audio
          </button>
        </div>

        <div class="row-split">
          <div class="field-group">
            <label class="field-label" for="qualitySelect" id="qualityLabel">Calidad</label>
            <select id="qualitySelect" class="select-input"></select>
          </div>
          <div class="field-group">
            <label class="field-label" for="engineSelect">Motor</label>
            <select id="engineSelect" class="select-input">
              <option value="auto">Automático (Sin instalar)</option>
              <option value="bridge">Puente local (yt-dlp)</option>
              <option value="cobalt">API Cobalt</option>
              <option value="direct">HTML5 directo</option>
            </select>
          </div>
        </div>
      </section>

      <section id="settingsPanel" class="settings-panel hidden">
        <label class="field-label" for="bridgeUrlInput">URL Servicio Local</label>
        <input id="bridgeUrlInput" type="url" class="url-input" placeholder="http://127.0.0.1:4848" />

        <label class="field-label" for="cobaltUrlInput">URL API Cobalt (v10)</label>
        <input id="cobaltUrlInput" type="url" class="url-input" placeholder="https://tu-instancia-cobalt.tld" />

        <button id="saveSettingsBtn" type="button" class="secondary-btn">
          Guardar endpoints
        </button>
      </section>

      <div id="directStreamsBox" class="direct-box hidden">
        <div class="field-label">Flujos detectados en esta pestaña</div>
        <ul id="directStreamsList" class="direct-list"></ul>
      </div>

      <button id="downloadBtn" type="button" class="primary-btn">
        Descargar ahora
      </button>

      <section id="progressWrap" class="progress-wrap hidden" aria-live="polite">
        <div class="progress-top">
          <span id="progressStage" class="progress-stage">Preparando descarga...</span>
          <span id="progressPct" class="progress-pct">0%</span>
        </div>
        <div class="progress-track">
          <div id="progressFill" class="progress-fill" style="width: 0%"></div>
        </div>
        <div id="progressNote" class="progress-note">
          Puedes cerrar esta ventana; la descarga continuará en segundo plano.
        </div>
      </section>

      <div id="statusBox" class="status-box hidden" role="status"></div>

      <section id="fallbackBox" class="fallback-box hidden">
        <div class="fallback-title">Este video requiere extractor externo o puente local</div>
        <p class="fallback-desc">
          El puente local (<span class="mono">127.0.0.1:4848</span>) no está abierto ahora mismo y la plataforma cifra este flujo. Puedes descargarlo gratis al instante así:
        </p>
        <button id="openCobaltWebBtn" type="button" class="secondary-btn">
          Copiar enlace y abrir en Cobalt Web
        </button>
        <div class="fallback-hint">
          O ejecuta <span class="mono">puente-local/iniciar-windows.bat</span> (Windows) o <span class="mono">iniciar-mac-linux.sh</span> (Mac/Linux) para descargas directas en 1 clic.
        </div>
      </section>

      <section class="history-section">
        <div class="history-header">
          <span class="field-label">Descargas recientes</span>
          <button id="clearHistoryBtn" type="button" class="link-btn">Limpiar</button>
        </div>
        <ul id="historyList" class="history-list"></ul>
      </section>
    </main>
    <script src="popup.js"></script>
  </body>
</html>
`;

  const popupCss = `:root {
  --bg: #0f172a;
  --surface: #1e293b;
  --surface-alt: #0b1120;
  --border: #334155;
  --text: #f8fafc;
  --muted: #94a3b8;
  --accent: ${accent.hex};
  --accent-hover: ${accent.hoverHex};
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  width: 375px;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 13px;
  line-height: 1.45;
}

.app {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-icon {
  width: 22px;
  height: 22px;
  border-radius: 5px;
}

.brand-name {
  font-weight: 700;
  font-size: 14px;
  letter-spacing: -0.01em;
}

.icon-btn,
.link-btn {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--muted);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
}

.link-btn {
  border: none;
  padding: 2px 4px;
}

.icon-btn:hover,
.link-btn:hover {
  color: var(--text);
  border-color: #475569;
}

.media-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.media-source {
  font-size: 11px;
  color: var(--muted);
}

.media-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.url-input,
.select-input {
  width: 100%;
  background: var(--surface-alt);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 6px;
  padding: 7px 9px;
  font-size: 12px;
  outline: none;
}

.url-input:focus,
.select-input:focus {
  border-color: var(--accent);
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
}

.segmented {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  background: var(--surface-alt);
  border: 1px solid var(--border);
  padding: 3px;
  border-radius: 8px;
}

.seg-btn {
  background: transparent;
  border: none;
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
  padding: 7px 8px;
  border-radius: 6px;
  cursor: pointer;
}

.seg-btn.active {
  background: var(--accent);
  color: #ffffff;
}

.row-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.settings-panel,
.direct-box,
.fallback-box,
.progress-wrap {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
}

.progress-stage {
  color: var(--text);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.progress-pct {
  color: var(--text);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.progress-track {
  width: 100%;
  height: 8px;
  background: var(--surface-alt);
  border: 1px solid var(--border);
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 999px;
  transition: width 0.22s ease;
}

.progress-note {
  font-size: 11px;
  color: var(--muted);
}

.fallback-title {
  font-size: 12px;
  font-weight: 600;
  color: #fde68a;
}

.fallback-desc,
.fallback-hint {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.45;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--text);
}

.primary-btn {
  width: 100%;
  background: var(--accent);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.primary-btn:hover {
  background: var(--accent-hover);
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.secondary-btn {
  background: #334155;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.secondary-btn:hover {
  background: #475569;
}

.status-box {
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
}

.status-box.error {
  border-color: #dc2626;
  color: #fecaca;
}

.status-box.success {
  border-color: #16a34a;
  color: #bbf7d0;
}

.direct-list,
.history-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 120px;
  overflow-y: auto;
}

.direct-item,
.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: var(--surface-alt);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 11px;
}

.history-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.history-meta {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.history-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px solid var(--border);
  padding-top: 10px;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hidden {
  display: none !important;
}
`;

  const popupJs = `const extApi = typeof browser !== 'undefined' ? browser : chrome;

const DEFAULTS = {
  format: '${config.defaultFormat}',
  videoQuality: '${config.defaultVideoQuality}',
  audioBitrate: '${config.defaultAudioBitrate}',
  engine: '${config.defaultEngine}',
  bridgeUrl: '${config.bridgeUrl.replace(/'/g, '')}',
  cobaltUrl: '${config.cobaltUrl.replace(/'/g, '')}',
};

const VIDEO_QUALITIES = [
  { value: '2160', label: '2160p (4K)' },
  { value: '1080', label: '1080p Full HD' },
  { value: '720', label: '720p HD' },
  { value: '480', label: '480p SD' },
];

const AUDIO_BITRATES = [
  { value: '320', label: '320 kbps (Alta)' },
  { value: '192', label: '192 kbps (Estándar)' },
  { value: '128', label: '128 kbps (Ligero)' },
];

let state = {
  ...DEFAULTS,
  tabTitle: 'Multimedia web',
  directStreams: [],
};

const els = {
  mediaPlatform: document.getElementById('mediaPlatform'),
  mediaTitle: document.getElementById('mediaTitle'),
  urlInput: document.getElementById('urlInput'),
  btnMp4: document.getElementById('btnMp4'),
  btnMp3: document.getElementById('btnMp3'),
  qualityLabel: document.getElementById('qualityLabel'),
  qualitySelect: document.getElementById('qualitySelect'),
  engineSelect: document.getElementById('engineSelect'),
  settingsPanel: document.getElementById('settingsPanel'),
  toggleSettingsBtn: document.getElementById('toggleSettingsBtn'),
  bridgeUrlInput: document.getElementById('bridgeUrlInput'),
  cobaltUrlInput: document.getElementById('cobaltUrlInput'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  directStreamsBox: document.getElementById('directStreamsBox'),
  directStreamsList: document.getElementById('directStreamsList'),
  downloadBtn: document.getElementById('downloadBtn'),
  progressWrap: document.getElementById('progressWrap'),
  progressStage: document.getElementById('progressStage'),
  progressPct: document.getElementById('progressPct'),
  progressFill: document.getElementById('progressFill'),
  statusBox: document.getElementById('statusBox'),
  fallbackBox: document.getElementById('fallbackBox'),
  openCobaltWebBtn: document.getElementById('openCobaltWebBtn'),
  historyList: document.getElementById('historyList'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),
};

function showStatus(message, type = 'info') {
  els.statusBox.textContent = message;
  els.statusBox.className = 'status-box ' + type;
  els.statusBox.classList.remove('hidden');
}

function hideStatus() {
  els.statusBox.classList.add('hidden');
}

function hideFallback() {
  els.fallbackBox.classList.add('hidden');
}

function showFallback() {
  els.fallbackBox.classList.remove('hidden');
}

function renderActiveJob(job) {
  if (!job || job.status === 'idle') {
    els.progressWrap.classList.add('hidden');
    els.downloadBtn.disabled = false;
    return;
  }

  if (job.status === 'running') {
    hideStatus();
    hideFallback();
    els.progressWrap.classList.remove('hidden');
    const pct = Math.max(0, Math.min(100, Number(job.progress || 0)));
    els.progressStage.textContent = job.stage || 'Procesando...';
    els.progressPct.textContent = pct + '%';
    els.progressFill.style.width = pct + '%';
    els.downloadBtn.disabled = true;
    return;
  }

  if (job.status === 'done') {
    els.progressWrap.classList.add('hidden');
    els.downloadBtn.disabled = false;
    showStatus('Descarga iniciada: ' + (job.filename || 'archivo listo'), 'success');
    return;
  }

  if (job.status === 'needs_fallback') {
    els.progressWrap.classList.add('hidden');
    els.downloadBtn.disabled = false;
    showStatus(job.error || 'Se requiere puente local o extractor web.', 'error');
    showFallback();
    return;
  }

  if (job.status === 'error') {
    els.progressWrap.classList.add('hidden');
    els.downloadBtn.disabled = false;
    showStatus(job.error || 'Error inesperado.', 'error');
  }
}

function detectPlatformName(rawUrl) {
  try {
    const host = new URL(rawUrl).hostname.replace(/^www\\./, '');
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'YouTube';
    if (host.includes('tiktok.com')) return 'TikTok';
    if (host.includes('instagram.com')) return 'Instagram';
    if (host.includes('twitter.com') || host.includes('x.com')) return 'X / Twitter';
    if (host.includes('vimeo.com')) return 'Vimeo';
    if (host.includes('twitch.tv')) return 'Twitch';
    if (host.includes('soundcloud.com')) return 'SoundCloud';
    if (host.includes('facebook.com') || host.includes('fb.watch')) return 'Facebook';
    return host;
  } catch {
    return 'Enlace personalizado';
  }
}

function renderQualityOptions() {
  const list = state.format === 'mp3' ? AUDIO_BITRATES : VIDEO_QUALITIES;
  const activeValue = state.format === 'mp3' ? state.audioBitrate : state.videoQuality;
  els.qualityLabel.textContent = state.format === 'mp3' ? 'Bitrate MP3' : 'Resolución MP4';
  els.qualitySelect.innerHTML = '';
  for (const item of list) {
    const opt = document.createElement('option');
    opt.value = item.value;
    opt.textContent = item.label;
    if (item.value === activeValue) opt.selected = true;
    els.qualitySelect.appendChild(opt);
  }
}

function setFormat(format) {
  state.format = format === 'mp3' ? 'mp3' : 'mp4';
  els.btnMp4.classList.toggle('active', state.format === 'mp4');
  els.btnMp3.classList.toggle('active', state.format === 'mp3');
  renderQualityOptions();
  els.downloadBtn.textContent =
    state.format === 'mp3' ? 'Descargar audio MP3' : 'Descargar video MP4';
}

function renderDirectStreams() {
  if (!state.directStreams.length) {
    els.directStreamsBox.classList.add('hidden');
    return;
  }
  els.directStreamsBox.classList.remove('hidden');
  els.directStreamsList.innerHTML = '';
  for (const stream of state.directStreams) {
    const li = document.createElement('li');
    li.className = 'direct-item';

    const label = document.createElement('span');
    label.className = 'history-title';
    label.textContent = stream.label;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'icon-btn';
    btn.textContent = 'Bajar';
    btn.addEventListener('click', async () => {
      await extApi.runtime.sendMessage({
        type: 'MEDIADROP_DIRECT_DOWNLOAD',
        payload: {
          url: stream.url,
          filename: stream.filename,
          title: state.tabTitle,
          format: stream.kind === 'audio' ? 'AUDIO' : 'MP4',
        },
      });
      showStatus('Descarga directa iniciada.', 'success');
    });

    li.appendChild(label);
    li.appendChild(btn);
    els.directStreamsList.appendChild(li);
  }
}

async function renderHistory() {
  const stored = await extApi.storage.local.get({ history: [] });
  const items = Array.isArray(stored.history) ? stored.history : [];
  els.historyList.innerHTML = '';
  if (!items.length) {
    const empty = document.createElement('li');
    empty.className = 'history-item';
    empty.textContent = 'Sin descargas todavía.';
    els.historyList.appendChild(empty);
    return;
  }
  for (const item of items.slice(0, 5)) {
    const li = document.createElement('li');
    li.className = 'history-item';

    const title = document.createElement('span');
    title.className = 'history-title';
    title.textContent = item.title;

    const meta = document.createElement('span');
    meta.className = 'history-meta';
    meta.textContent = item.format.toUpperCase() + ' · ' + item.quality;

    li.appendChild(title);
    li.appendChild(meta);
    els.historyList.appendChild(li);
  }
}

function sanitizeName(name) {
  return (name || 'mediadrop-descarga')
    .replace(/[<>:"/\\\\|?*\\x00-\\x1F]/g, '')
    .replace(/\\s+/g, ' ')
    .trim()
    .slice(0, 90);
}

async function inspectPageMainWorld(tabId) {
  if (!extApi.scripting || !extApi.scripting.executeScript) return [];
  try {
    const results = await extApi.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => {
        const found = [];
        const seen = new Set();
        const add = (url, label, kind, ext) => {
          if (!url || !/^https?:\\/\\//i.test(url) || seen.has(url)) return;
          seen.add(url);
          found.push({ url, label, kind, ext });
        };

        try {
          const pr = window.ytInitialPlayerResponse;
          const currentVid = new URLSearchParams(window.location.search).get('v');
          const prVid = pr && pr.videoDetails && pr.videoDetails.videoId;
          const matchesCurrent = !currentVid || !prVid || currentVid === prVid;
          if (pr && pr.streamingData && matchesCurrent) {
            const muxed = Array.isArray(pr.streamingData.formats) ? pr.streamingData.formats : [];
            for (const f of muxed) {
              if (f.url) {
                add(
                  f.url,
                  'YouTube ' + (f.qualityLabel || 'MP4') + ' (Directo)',
                  'video',
                  'mp4'
                );
              }
            }
            const adaptive = Array.isArray(pr.streamingData.adaptiveFormats)
              ? pr.streamingData.adaptiveFormats
              : [];
            for (const a of adaptive) {
              if (a.url && typeof a.mimeType === 'string' && a.mimeType.startsWith('audio/mp4')) {
                add(a.url, 'Audio YouTube (M4A)', 'audio', 'm4a');
              }
            }
          }
        } catch {}

        try {
          const entries = performance.getEntriesByType('resource') || [];
          for (const entry of entries) {
            const name = entry.name || '';
            if (/\\.(mp4|m4v)(\\?|$)/i.test(name)) {
              add(name, 'Flujo MP4 detectado', 'video', 'mp4');
            } else if (/\\.(mp3|m4a)(\\?|$)/i.test(name)) {
              const ext = /\\.mp3/i.test(name) ? 'mp3' : 'm4a';
              add(name, 'Flujo Audio (' + ext.toUpperCase() + ')', 'audio', ext);
            }
          }
        } catch {}

        return found;
      },
    });
    const list = results && results[0] && Array.isArray(results[0].result) ? results[0].result : [];
    return list.map((item, idx) => ({
      url: item.url,
      label: item.label,
      kind: item.kind,
      filename: sanitizeName(state.tabTitle) + (idx > 0 ? '-' + idx : '') + '.' + item.ext,
    }));
  } catch {
    return [];
  }
}

function pickBestDirectStream() {
  if (!state.directStreams.length) return null;
  if (state.format === 'mp3') {
    return state.directStreams.find((s) => s.kind === 'audio') || null;
  }
  return state.directStreams.find((s) => s.kind === 'video') || null;
}

async function handleDownload() {
  const targetUrl = els.urlInput.value.trim();
  if (!targetUrl) {
    showStatus('Ingresa o abre una URL válida primero.', 'error');
    return;
  }

  hideFallback();
  hideStatus();
  const quality = els.qualitySelect.value;
  const engine = els.engineSelect.value;
  const bridgeBase = (els.bridgeUrlInput.value || state.bridgeUrl).replace(/\\/+$/, '');
  const cobaltBase = (els.cobaltUrlInput.value || state.cobaltUrl).replace(/\\/+$/, '');
  const directStream = pickBestDirectStream();

  els.downloadBtn.disabled = true;
  renderActiveJob({ status: 'running', progress: 2, stage: 'Iniciando en segundo plano...' });

  try {
    await extApi.runtime.sendMessage({
      type: 'MEDIADROP_START_DOWNLOAD',
      payload: {
        targetUrl,
        format: state.format,
        quality,
        engine,
        bridgeBase,
        cobaltBase,
        tabTitle: state.tabTitle,
        directStream,
      },
    });
  } catch (err) {
    renderActiveJob({
      status: 'error',
      error: err instanceof Error ? err.message : 'No se pudo iniciar la descarga en segundo plano.',
    });
  }
}

async function init() {
  const saved = await extApi.storage.local.get({
    format: DEFAULTS.format,
    videoQuality: DEFAULTS.videoQuality,
    audioBitrate: DEFAULTS.audioBitrate,
    engine: DEFAULTS.engine,
    bridgeUrl: DEFAULTS.bridgeUrl,
    cobaltUrl: DEFAULTS.cobaltUrl,
    activeJob: null,
  });

  state = { ...state, ...saved };
  els.engineSelect.value = state.engine;
  els.bridgeUrlInput.value = state.bridgeUrl;
  els.cobaltUrlInput.value = state.cobaltUrl;
  setFormat(state.format);

  if (saved.activeJob && saved.activeJob.status === 'running') {
    renderActiveJob(saved.activeJob);
  }

  extApi.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.activeJob) {
      renderActiveJob(changes.activeJob.newValue);
    }
    if (changes.history) {
      renderHistory();
    }
  });

  const tabs = await extApi.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs && tabs[0];
  if (activeTab) {
    state.tabTitle = activeTab.title || 'Página actual';
    els.mediaTitle.textContent = state.tabTitle;
    els.urlInput.value = activeTab.url || '';
    els.mediaPlatform.textContent = detectPlatformName(activeTab.url || '');

    if (activeTab.id) {
      const merged = [];
      const seenUrls = new Set();

      try {
        const pageData = await extApi.tabs.sendMessage(activeTab.id, { type: 'MEDIADROP_SCAN' });
        if (pageData && pageData.title) {
          state.tabTitle = pageData.title;
          els.mediaTitle.textContent = pageData.title;
        }
        if (pageData && Array.isArray(pageData.streams)) {
          for (const s of pageData.streams) {
            if (s.url && !seenUrls.has(s.url)) {
              seenUrls.add(s.url);
              merged.push(s);
            }
          }
        }
      } catch {}

      const mainStreams = await inspectPageMainWorld(activeTab.id);
      for (const s of mainStreams) {
        if (s.url && !seenUrls.has(s.url)) {
          seenUrls.add(s.url);
          merged.push(s);
        }
      }

      state.directStreams = merged;
      renderDirectStreams();
    }
  }

  els.btnMp4.addEventListener('click', () => {
    setFormat('mp4');
    extApi.storage.local.set({ format: 'mp4' });
  });

  els.btnMp3.addEventListener('click', () => {
    setFormat('mp3');
    extApi.storage.local.set({ format: 'mp3' });
  });

  els.qualitySelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (state.format === 'mp3') {
      state.audioBitrate = val;
      extApi.storage.local.set({ audioBitrate: val });
    } else {
      state.videoQuality = val;
      extApi.storage.local.set({ videoQuality: val });
    }
  });

  els.engineSelect.addEventListener('change', (e) => {
    state.engine = e.target.value;
    extApi.storage.local.set({ engine: state.engine });
    hideFallback();
  });

  els.urlInput.addEventListener('input', (e) => {
    els.mediaPlatform.textContent = detectPlatformName(e.target.value);
  });

  els.toggleSettingsBtn.addEventListener('click', () => {
    els.settingsPanel.classList.toggle('hidden');
  });

  els.saveSettingsBtn.addEventListener('click', async () => {
    state.bridgeUrl = els.bridgeUrlInput.value.trim() || DEFAULTS.bridgeUrl;
    state.cobaltUrl = els.cobaltUrlInput.value.trim();
    await extApi.storage.local.set({
      bridgeUrl: state.bridgeUrl,
      cobaltUrl: state.cobaltUrl,
    });
    showStatus('Configuración guardada.', 'success');
    els.settingsPanel.classList.add('hidden');
  });

  els.openCobaltWebBtn.addEventListener('click', async () => {
    const targetUrl = els.urlInput.value.trim();
    if (targetUrl && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(targetUrl);
      } catch {}
    }
    extApi.tabs.create({ url: 'https://cobalt.tools/' });
  });

  els.clearHistoryBtn.addEventListener('click', async () => {
    await extApi.storage.local.set({ history: [] });
    await renderHistory();
  });

  els.downloadBtn.addEventListener('click', handleDownload);
  await renderHistory();
}

init();
`;

  const contentJs = `const extApi = typeof browser !== 'undefined' ? browser : chrome;

function collectPageMedia() {
  const streams = [];
  const seen = new Set();

  const h1Title = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, h1.ytd-watch-metadata, h1')?.textContent?.trim();
  const docTitle = (document.title || '').replace(/\\s*-\\s*YouTube$/i, '').trim();
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
  const title = (h1Title || docTitle || ogTitle || 'Multimedia').trim();

  const ogVideo = document.querySelector('meta[property="og:video:secure_url"], meta[property="og:video"], meta[property="og:video:url"]')?.getAttribute('content');
  const ogVideoType = document.querySelector('meta[property="og:video:type"]')?.getAttribute('content') || '';
  const isRealMediaFile =
    ogVideo &&
    /^https?:\\/\\//i.test(ogVideo) &&
    !/\\/embed\\//i.test(ogVideo) &&
    (ogVideoType.startsWith('video/') || /\\.(mp4|m4v|webm)(\\?|$)/i.test(ogVideo));
  if (isRealMediaFile && !seen.has(ogVideo)) {
    seen.add(ogVideo);
    streams.push({
      url: ogVideo,
      label: 'Video Meta (MP4)',
      kind: 'video',
      filename: 'video-web.mp4',
    });
  }

  document.querySelectorAll('video, audio').forEach((el, index) => {
    const src = el.currentSrc || el.getAttribute('src');
    if (src && /^https?:\\/\\//i.test(src) && !seen.has(src)) {
      seen.add(src);
      const isAudio = el.tagName.toLowerCase() === 'audio';
      streams.push({
        url: src,
        label: (isAudio ? 'Audio HTML5 #' : 'Video HTML5 #') + (index + 1),
        kind: isAudio ? 'audio' : 'video',
        filename: isAudio ? 'audio-' + (index + 1) + '.mp3' : 'video-' + (index + 1) + '.mp4',
      });
    }
    el.querySelectorAll('source').forEach((sourceEl) => {
      const s = sourceEl.getAttribute('src');
      if (s && /^https?:\\/\\//i.test(s) && !seen.has(s)) {
        seen.add(s);
        const type = sourceEl.getAttribute('type') || 'media';
        const isAudio = type.startsWith('audio/');
        streams.push({
          url: s,
          label: 'Fuente directa (' + type + ')',
          kind: isAudio ? 'audio' : 'video',
          filename: isAudio ? 'audio-stream.mp3' : 'media-stream.mp4',
        });
      }
    });
  });

  return {
    title,
    url: window.location.href,
    streams,
  };
}

extApi.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message && message.type === 'MEDIADROP_SCAN') {
    sendResponse(collectPageMedia());
  }
  return true;
});
`;

  const backgroundJs = `const extApi = typeof browser !== 'undefined' ? browser : chrome;

extApi.runtime.onInstalled.addListener(() => {
  extApi.storage.local.get({ history: [] }, (data) => {
    if (!Array.isArray(data?.history)) {
      extApi.storage.local.set({ history: [] });
    }
  });
});

function setBadge(text, color = '#E11D48') {
  try {
    if (extApi.action && extApi.action.setBadgeText) {
      extApi.action.setBadgeText({ text });
      if (text) extApi.action.setBadgeBackgroundColor({ color });
    }
  } catch {}
}

function sanitizeName(name) {
  return (name || 'mediadrop-descarga')
    .replace(/[<>:"/\\\\|?*\\x00-\\x1F]/g, '')
    .replace(/\\s+/g, ' ')
    .trim()
    .slice(0, 90);
}

async function setActiveJob(job) {
  await extApi.storage.local.set({ activeJob: job });
  if (job && job.status === 'running') {
    setBadge(String(job.progress || 0) + '%');
  } else {
    setBadge('');
  }
}

async function appendHistory(entry) {
  const stored = await extApi.storage.local.get({ history: [] });
  const history = Array.isArray(stored.history) ? stored.history : [];
  history.unshift(entry);
  await extApi.storage.local.set({ history: history.slice(0, 15) });
}

async function checkBridgeHealth(base) {
  const controller = new AbortController();
  const isRemote = /^https:\\/\\//i.test(base);
  const timeoutMs = isRemote ? 55000 : 2500;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(base + '/health', { signal: controller.signal });
    clearTimeout(timer);
    if (!resp.ok) return false;
    const data = await resp.json();
    return Boolean(data && data.ok);
  } catch {
    clearTimeout(timer);
    return false;
  }
}

async function runBridgeJobInBackground(payload) {
  const { bridgeBase, targetUrl, format, quality, tabTitle } = payload;
  await setActiveJob({
    status: 'running',
    progress: 3,
    stage: 'Iniciando descarga en puente local...',
  });

  const startUrl =
    bridgeBase +
    '/api/start?url=' +
    encodeURIComponent(targetUrl) +
    '&format=' +
    encodeURIComponent(format) +
    '&quality=' +
    encodeURIComponent(quality);

  const startResp = await fetch(startUrl);
  const startData = await startResp.json();
  if (!startResp.ok || !startData.jobId) {
    throw new Error(startData.error || 'No se pudo iniciar la tarea en el puente local.');
  }

  const jobId = startData.jobId;
  while (true) {
    await new Promise((r) => setTimeout(r, 450));
    const pollResp = await fetch(bridgeBase + '/api/jobs/' + encodeURIComponent(jobId));
    const job = await pollResp.json();
    if (!pollResp.ok) {
      throw new Error(job.error || 'Se perdió el seguimiento del trabajo.');
    }

    if (job.status === 'ready') {
      await setActiveJob({
        status: 'running',
        progress: 99,
        stage: 'Guardando archivo en Descargas...',
      });
      const cleanBase = bridgeBase.replace(/\\/+$/, '');
      const finalDownloadUrl = job.downloadPath ? cleanBase + job.downloadPath : job.downloadUrl;
      await extApi.downloads.download({
        url: finalDownloadUrl,
        filename: job.filename || undefined,
        saveAs: false,
      });
      await appendHistory({
        title: job.filename || tabTitle,
        format,
        quality: format === 'mp3' ? quality + 'k' : quality + 'p',
      });
      await setActiveJob({
        status: 'done',
        progress: 100,
        filename: job.filename || tabTitle,
      });
      return;
    }

    if (job.status === 'error') {
      throw new Error(job.error || 'Error procesando el video.');
    }

    await setActiveJob({
      status: 'running',
      progress: job.progress || 5,
      stage: job.stage || 'Procesando...',
    });
  }
}

async function runCobaltInBackground(payload) {
  const { cobaltBase, targetUrl, format, quality, tabTitle } = payload;
  await setActiveJob({
    status: 'running',
    progress: 35,
    stage: 'Consultando instancia Cobalt...',
  });

  const body = {
    url: targetUrl,
    downloadMode: format === 'mp3' ? 'audio' : 'auto',
    audioFormat: 'mp3',
    audioBitrate: quality,
    videoQuality: quality,
    filenameStyle: 'pretty',
  };

  const resp = await fetch(cobaltBase + '/', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!resp.ok || data.status === 'error') {
    throw new Error(data?.error?.code || 'Error al procesar enlace en Cobalt.');
  }
  const mediaUrl = data.url || (Array.isArray(data.picker) && data.picker[0]?.url);
  if (!mediaUrl) {
    throw new Error('Cobalt no devolvió un enlace descargable.');
  }

  const ext = format === 'mp3' ? 'mp3' : 'mp4';
  const filename = sanitizeName(tabTitle) + '.' + ext;
  await extApi.downloads.download({ url: mediaUrl, filename, saveAs: false });
  await appendHistory({
    title: tabTitle,
    format,
    quality: format === 'mp3' ? quality + 'k' : quality + 'p',
  });
  await setActiveJob({ status: 'done', progress: 100, filename });
}

async function handleStartDownload(payload) {
  const { engine, bridgeBase, cobaltBase, directStream, tabTitle, format } = payload;

  try {
    if (engine === 'auto') {
      const connectStage = /^https:\\/\\//i.test(bridgeBase)
        ? 'Conectando con el servidor...'
        : 'Verificando puente local...';
      await setActiveJob({ status: 'running', progress: 2, stage: connectStage });
      const bridgeOk = await checkBridgeHealth(bridgeBase);
      if (bridgeOk) {
        await runBridgeJobInBackground(payload);
        return;
      }

      if (cobaltBase) {
        await runCobaltInBackground(payload);
        return;
      }

      if (directStream) {
        await extApi.downloads.download({
          url: directStream.url,
          filename: directStream.filename || undefined,
          saveAs: false,
        });
        await appendHistory({
          title: tabTitle,
          format: directStream.kind === 'audio' ? 'AUDIO' : 'MP4',
          quality: 'Directo',
        });
        await setActiveJob({ status: 'done', progress: 100, filename: directStream.filename });
        return;
      }

      await setActiveJob({
        status: 'needs_fallback',
        error: 'No hay flujos sin cifrar ni puente local activo.',
      });
      return;
    }

    if (engine === 'direct') {
      if (!directStream) {
        await setActiveJob({
          status: 'needs_fallback',
          error: 'No se detectaron flujos HTML5 directos en esta pestaña.',
        });
        return;
      }
      await extApi.downloads.download({
        url: directStream.url,
        filename: directStream.filename || undefined,
        saveAs: false,
      });
      await appendHistory({ title: tabTitle, format, quality: 'Directo' });
      await setActiveJob({ status: 'done', progress: 100, filename: directStream.filename });
      return;
    }

    if (engine === 'bridge') {
      const connectStage = /^https:\\/\\//i.test(bridgeBase)
        ? 'Conectando con el servidor...'
        : 'Verificando puente local...';
      await setActiveJob({ status: 'running', progress: 2, stage: connectStage });
      const bridgeOk = await checkBridgeHealth(bridgeBase);
      if (!bridgeOk) {
        await setActiveJob({
          status: 'needs_fallback',
          error: 'Puente local no detectado en ' + bridgeBase + '.',
        });
        return;
      }
      await runBridgeJobInBackground(payload);
      return;
    }

    if (engine === 'cobalt') {
      if (!cobaltBase) {
        throw new Error('Configura primero una URL de API Cobalt en Ajustes.');
      }
      await runCobaltInBackground(payload);
    }
  } catch (err) {
    await setActiveJob({
      status: 'error',
      error: err instanceof Error ? err.message : 'Error inesperado en la descarga.',
    });
  }
}

extApi.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message) return false;

  if (message.type === 'MEDIADROP_START_DOWNLOAD') {
    handleStartDownload(message.payload);
    sendResponse({ started: true });
    return true;
  }

  if (message.type === 'MEDIADROP_DIRECT_DOWNLOAD') {
    const p = message.payload || {};
    extApi.downloads
      .download({ url: p.url, filename: p.filename || undefined, saveAs: false })
      .then(() =>
        appendHistory({
          title: p.title || 'Archivo directo',
          format: p.format || 'MP4',
          quality: 'Directo',
        })
      );
    sendResponse({ started: true });
    return true;
  }

  return false;
});
`;

  const readmeMd = `# ${safeName} (${config.browser === 'firefox' ? 'Firefox' : 'Chrome / Edge / Brave'})

Extensión gratuita para descargar videos y audio en formato **MP4 (H.264 + AAC compatible)** y **MP3** desde YouTube, TikTok, Instagram, X, Vimeo, Twitch, SoundCloud y páginas HTML5.

## Instalación rápida

${
  config.browser === 'firefox'
    ? `### En Firefox
1. Descomprime este archivo ZIP en una carpeta permanente (por ejemplo: \`Documentos/MediaDrop-Firefox\`).
2. Abre Firefox y escribe en la barra de direcciones: \`about:debugging#/runtime/this-firefox\`.
3. Haz clic en **Cargar complemento temporal...**.
4. Selecciona el archivo \`manifest.json\` dentro de la carpeta descomprimida.`
    : `### En Chrome, Edge o Brave
1. Descomprime este archivo ZIP en una carpeta permanente (por ejemplo: \`Documentos/MediaDrop-Chrome\`).
2. Abre \`chrome://extensions\` (o \`edge://extensions\`).
3. Activa el interruptor **Modo de desarrollador** arriba a la derecha.
4. Haz clic en **Cargar descomprimida** y selecciona la carpeta descomprimida.`
}
`;

  const files: GeneratedFile[] = [
    {
      path: 'manifest.json',
      content: manifestJson,
      language: 'json',
      description:
        config.browser === 'firefox'
          ? 'Manifiesto WebExtension MV3 con gecko ID y permisos de descarga para Firefox.'
          : 'Manifiesto Manifest V3 con service worker y permisos de descarga para Chrome/Edge/Brave.',
    },
    {
      path: 'popup.html',
      content: popupHtml,
      language: 'html',
      description: 'Interfaz del popup con barra de progreso en vivo y controles MP4/MP3.',
    },
    {
      path: 'popup.css',
      content: popupCss,
      language: 'css',
      description: 'Hoja de estilos del popup con barra de progreso y color personalizado.',
    },
    {
      path: 'popup.js',
      content: popupJs,
      language: 'javascript',
      description: 'Conecta con background.js y sincroniza la barra de progreso incluso al cerrar y reabrir el popup.',
    },
    {
      path: 'content.js',
      content: contentJs,
      language: 'javascript',
      description: 'Script de contenido que lee el título del video y detecta flujos HTML5 directos.',
    },
    {
      path: 'background.js',
      content: backgroundJs,
      language: 'javascript',
      description: 'Worker persistente en segundo plano: continúa descargando y convirtiendo aunque cierres el popup.',
    },
    {
      path: 'README.md',
      content: readmeMd,
      language: 'markdown',
      description: 'Instrucciones paso a paso incluidas dentro del paquete.',
    },
  ];

  if (config.includeBridgeInZip) {
    files.push(...generateBridgeFiles());
  }

  return files;
}
