import { useState } from 'react';
import {
  Download,
  SlidersHorizontal,
  BookOpen,
  Menu,
  X,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import {
  AccentColorId,
  BrowserTarget,
  ExtensionConfig,
  MediaFormat,
  PlatformCapability,
} from './types/extension';
import { ACCENT_PRESETS } from './utils/extensionTemplates';
import { downloadExtensionZip } from './utils/zipBuilder';
import { ExtensionSimulator } from './components/ExtensionSimulator';
import { InstallGuide } from './components/InstallGuide';

type ActiveSection = 'builder' | 'install';

const PLATFORM_MATRIX: PlatformCapability[] = [
  {
    platform: 'YouTube',
    formats: 'MP4 / MP3',
    maxQuality: '2160p · 320 kbps',
    extractionMethod: 'Video HD y MP3 con carátula',
  },
  {
    platform: 'TikTok',
    formats: 'MP4 / MP3',
    maxQuality: '1080p · 320 kbps',
    extractionMethod: 'Descarga directa en 1 clic',
  },
  {
    platform: 'Instagram Reels',
    formats: 'MP4 / MP3',
    maxQuality: '1080p · 192 kbps',
    extractionMethod: 'Descarga directa en 1 clic',
  },
  {
    platform: 'Facebook',
    formats: 'MP4 / MP3',
    maxQuality: '1080p · 192 kbps',
    extractionMethod: 'Video compatible MP4',
  },
  {
    platform: 'X (Twitter) · Twitch · SoundCloud',
    formats: 'MP4 / MP3',
    maxQuality: '1080p · 320 kbps',
    extractionMethod: 'Clips, videos y audio',
  },
  {
    platform: 'Páginas web con video',
    formats: 'MP4 / MP3',
    maxQuality: 'Calidad original',
    extractionMethod: 'Detección automática en pestaña',
  },
];

const NAV_ITEMS: Array<{ id: ActiveSection; label: string; icon: typeof SlidersHorizontal }> = [
  { id: 'builder', label: 'Personalizar y descargar', icon: SlidersHorizontal },
  { id: 'install', label: 'Guía de instalación', icon: BookOpen },
];

export default function App() {
  const [section, setSection] = useState<ActiveSection>('builder');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadedNotice, setDownloadedNotice] = useState<string | null>(null);

  const [config, setConfig] = useState<ExtensionConfig>({
    browser: 'chrome',
    extensionName: 'Klypex',
    defaultFormat: 'mp4',
    defaultVideoQuality: '1080',
    defaultAudioBitrate: '320',
    defaultEngine: 'auto',
    bridgeUrl: 'http://127.0.0.1:4848',
    cobaltUrl: '',
    accentColor: 'crimson',
    includeBridgeInZip: true,
  });

  const handleDownloadExtension = async () => {
    setDownloading(true);
    setDownloadedNotice(null);
    try {
      const filename = await downloadExtensionZip(config);
      setDownloadedNotice(
        `¡Descarga lista! Guarda y descomprime ${filename} para instalarlo en ${
          config.browser === 'firefox' ? 'Firefox' : 'Chrome, Edge o Brave'
        }.`
      );
    } finally {
      setDownloading(false);
    }
  };

  const sectionTitle =
    NAV_ITEMS.find((item) => item.id === section)?.label ?? 'Personalizar y descargar';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-[260px] md:shrink-0 md:flex-col bg-white border-r border-slate-200 sticky top-0 h-screen">
        <div className="h-16 px-6 flex items-center border-b border-slate-200">
          <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            Klypex
          </span>
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-1" aria-label="Navegación principal">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2.5 transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 text-xs text-slate-500 space-y-1">
          <div className="font-medium text-slate-700">
            Navegador: {config.browser === 'firefox' ? 'Firefox' : 'Chrome · Edge · Brave'}
          </div>
          <div>100% gratuito · Sin anuncios</div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-64 max-w-full bg-white h-full border-r border-slate-200 flex flex-col z-50">
            <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200">
              <span className="text-base font-bold text-slate-900">Klypex</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-slate-500 hover:text-slate-900"
                aria-label="Cerrar menú"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="p-4 flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSection(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2.5 cursor-pointer ${
                      active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Breadcrumb on left, 1 primary action on right */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-500 hidden sm:inline whitespace-nowrap">Klypex</span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="font-semibold text-slate-900 truncate">{sectionTitle}</h1>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadExtension}
            disabled={downloading}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
          >
            <Download className="w-3.5 h-3.5" />
            {downloading
              ? 'Preparando...'
              : `Descargar para ${config.browser === 'firefox' ? 'Firefox' : 'Chrome / Edge'} (.zip)`}
          </button>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-[1280px] w-full mx-auto flex flex-col gap-6">
          {downloadedNotice && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-4 text-sm text-emerald-950">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{downloadedNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setSection('install')}
                className="text-xs font-semibold text-emerald-800 underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                Ver guía paso a paso
              </button>
            </div>
          )}

          {section === 'builder' && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-6 items-stretch">
                {/* Configuration Panel */}
                <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-5">
                  <div className="flex flex-col gap-5">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">
                        Descarga videos en MP4 y música en MP3 gratis
                      </h2>
                      <p className="text-sm text-slate-600 mt-1">
                        Elige tu navegador y personaliza Klypex a tu gusto antes de descargarlo.
                      </p>
                    </div>

                    {/* Browser Target */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-slate-700">
                        ¿Qué navegador usas?
                      </label>
                      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                        {(['chrome', 'firefox'] as BrowserTarget[]).map((target) => (
                          <button
                            key={target}
                            type="button"
                            onClick={() => setConfig((c) => ({ ...c, browser: target }))}
                            className={`py-2.5 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                              config.browser === target
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {target === 'firefox'
                              ? 'Mozilla Firefox'
                              : 'Chrome · Edge · Brave'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Extension Name & Accent */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="extName" className="text-xs font-semibold text-slate-700">
                          Nombre visible de la extensión
                        </label>
                        <input
                          id="extName"
                          type="text"
                          value={config.extensionName}
                          onChange={(e) =>
                            setConfig((c) => ({ ...c, extensionName: e.target.value }))
                          }
                          maxLength={40}
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-400"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold text-slate-700">Color</span>
                        <div className="grid grid-cols-4 gap-2">
                          {ACCENT_PRESETS.map((preset) => {
                            const active = config.accentColor === preset.id;
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() =>
                                  setConfig((c) => ({
                                    ...c,
                                    accentColor: preset.id as AccentColorId,
                                  }))
                                }
                                className={`py-2 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                                  active
                                    ? 'border-slate-900 bg-slate-900 text-white'
                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <span
                                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                                  style={{ backgroundColor: preset.hex }}
                                />
                                <span className="truncate">{preset.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Format & Default Quality */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="defFormat" className="text-xs font-semibold text-slate-700">
                          Formato favorito
                        </label>
                        <select
                          id="defFormat"
                          value={config.defaultFormat}
                          onChange={(e) =>
                            setConfig((c) => ({
                              ...c,
                              defaultFormat: e.target.value as MediaFormat,
                            }))
                          }
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:border-slate-400"
                        >
                          <option value="mp4">MP4 (Video)</option>
                          <option value="mp3">MP3 (Música / Audio)</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="defVideoQ" className="text-xs font-semibold text-slate-700">
                          Calidad de video (MP4)
                        </label>
                        <select
                          id="defVideoQ"
                          value={config.defaultVideoQuality}
                          onChange={(e) =>
                            setConfig((c) => ({
                              ...c,
                              defaultVideoQuality: e.target.value as ExtensionConfig['defaultVideoQuality'],
                            }))
                          }
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:border-slate-400"
                        >
                          <option value="2160">2160p (Ultra HD 4K)</option>
                          <option value="1080">1080p Full HD</option>
                          <option value="720">720p HD</option>
                          <option value="480">480p Ligero</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="defAudioQ" className="text-xs font-semibold text-slate-700">
                          Calidad de audio (MP3)
                        </label>
                        <select
                          id="defAudioQ"
                          value={config.defaultAudioBitrate}
                          onChange={(e) =>
                            setConfig((c) => ({
                              ...c,
                              defaultAudioBitrate: e.target.value as ExtensionConfig['defaultAudioBitrate'],
                            }))
                          }
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:border-slate-400"
                        >
                          <option value="320">320 kbps (Máxima)</option>
                          <option value="192">192 kbps (Estándar)</option>
                          <option value="128">128 kbps (Ligera)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Action footer inside builder */}
                  <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleDownloadExtension}
                      disabled={downloading}
                      className="px-5 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg inline-flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                    >
                      <Download className="w-4 h-4" />
                      {downloading
                        ? 'Preparando archivo...'
                        : `Descargar Klypex para ${
                            config.browser === 'firefox' ? 'Firefox' : 'Chrome / Edge / Brave'
                          }`}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSection('install')}
                      className="text-xs font-semibold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      ¿Primera vez? Ver guía de instalación
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </section>

                {/* Live Extension Popup Simulator */}
                <ExtensionSimulator config={config} />
              </div>

              {/* Supported Platforms Data Table */}
              <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      Páginas y formatos compatibles con Klypex
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Listo para guardar videos y canciones directamente en tu computadora
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                        <th className="py-2.5 px-6">Plataforma</th>
                        <th className="py-2.5 px-6">Formatos</th>
                        <th className="py-2.5 px-6">Calidad máxima</th>
                        <th className="py-2.5 px-6">Resultado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {PLATFORM_MATRIX.map((row) => (
                        <tr key={row.platform} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-6 font-medium text-slate-900">
                            {row.platform}
                          </td>
                          <td className="py-2.5 px-6 font-mono text-xs text-slate-700 tabular-nums">
                            {row.formats}
                          </td>
                          <td className="py-2.5 px-6 font-mono text-xs text-slate-700 tabular-nums">
                            {row.maxQuality}
                          </td>
                          <td className="py-2.5 px-6 text-slate-600 text-xs">
                            {row.extractionMethod}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {section === 'install' && (
            <InstallGuide
              config={config}
              onChangeBrowser={(target) => setConfig((c) => ({ ...c, browser: target }))}
            />
          )}
        </main>
      </div>
    </div>
  );
}
