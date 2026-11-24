import { useEffect, useState } from 'react';
import { Download, Settings, Check, AlertCircle, Globe, Music, Film } from 'lucide-react';
import { ExtensionConfig, MediaFormat } from '../types/extension';
import { getAccentPreset } from '../utils/extensionTemplates';

interface Props {
  config: ExtensionConfig;
}

interface SampleTab {
  id: string;
  label: string;
  platform: string;
  title: string;
  url: string;
  hasDirectHtml5: boolean;
}

const SAMPLE_TABS: SampleTab[] = [
  {
    id: 'youtube',
    label: 'YouTube',
    platform: 'YouTube',
    title: 'Documental 4K: Arquitectura Moderna y Sonido Espacial',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    hasDirectHtml5: false,
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    platform: 'TikTok',
    title: 'Tutorial rápido de edición en 60fps sin marca de agua',
    url: 'https://www.tiktok.com/@creator/video/734829104218',
    hasDirectHtml5: true,
  },
  {
    id: 'soundcloud',
    label: 'SoundCloud',
    platform: 'SoundCloud',
    title: 'Session Live 04 - Synthwave & Ambient Mix',
    url: 'https://soundcloud.com/artist/session-live-04',
    hasDirectHtml5: false,
  },
];

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

export function ExtensionSimulator({ config }: Props) {
  const accent = getAccentPreset(config.accentColor);
  const [selectedSample, setSelectedSample] = useState<SampleTab>(SAMPLE_TABS[0]);
  const [customUrl, setCustomUrl] = useState(SAMPLE_TABS[0].url);
  const [format, setFormat] = useState<MediaFormat>(config.defaultFormat);
  const [videoQuality, setVideoQuality] = useState(config.defaultVideoQuality);
  const [audioBitrate, setAudioBitrate] = useState(config.defaultAudioBitrate);
  const [showSettings, setShowSettings] = useState(false);
  const [simProgress, setSimProgress] = useState<{ pct: number; stage: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; kind: 'ok' | 'info' | 'err' } | null>(null);
  const [history, setHistory] = useState<Array<{ title: string; format: string; quality: string }>>([
    { title: 'Podcast Episodio 12 — Audio maestro', format: 'MP3', quality: '320k' },
  ]);

  useEffect(() => {
    setFormat(config.defaultFormat);
  }, [config.defaultFormat]);

  useEffect(() => {
    setVideoQuality(config.defaultVideoQuality);
  }, [config.defaultVideoQuality]);

  useEffect(() => {
    setAudioBitrate(config.defaultAudioBitrate);
  }, [config.defaultAudioBitrate]);

  const handleSelectSample = (sample: SampleTab) => {
    setSelectedSample(sample);
    setCustomUrl(sample.url);
    setStatusMessage(null);
  };

  const handleSimulatedAction = () => {
    const activeQuality = format === 'mp3' ? `${audioBitrate}k` : `${videoQuality}p`;
    setStatusMessage(null);
    let current = 12;
    setSimProgress({
      pct: current,
      stage: format === 'mp3' ? 'Preparando audio MP3...' : 'Descargando video MP4...',
    });
    const timer = setInterval(() => {
      current += 28;
      if (current < 95) {
        setSimProgress({
          pct: current,
          stage: format === 'mp3' ? 'Preparando audio MP3...' : 'Descargando video MP4...',
        });
      } else if (current < 110) {
        setSimProgress({
          pct: 96,
          stage:
            format === 'mp3'
              ? 'Agregando carátula al MP3...'
              : 'Optimizando video MP4...',
        });
      } else {
        clearInterval(timer);
        setSimProgress(null);
        setHistory((prev) => [
          { title: selectedSample.title, format: format.toUpperCase(), quality: activeQuality },
          ...prev.slice(0, 3),
        ]);
        setStatusMessage({
          text: `Listo: ${format.toUpperCase()} (${activeQuality}) guardado en Descargas.`,
          kind: 'ok',
        });
      }
    }, 280);
  };

  const displayName = config.extensionName.trim() || 'Klypex';

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Vista previa interactiva del popup</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Simula el comportamiento real de tu extensión en {config.browser === 'firefox' ? 'Firefox' : 'Chrome'}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {SAMPLE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelectSample(tab)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedSample.id === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Browser bar mockup + centered extension popup */}
      <div className="flex-1 bg-slate-100 p-5 flex flex-col items-center justify-center">
        <div className="w-full max-w-[390px] bg-slate-200/80 border border-slate-300 rounded-t-xl px-3 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[11px] font-mono truncate max-w-[230px]">
              {customUrl}
            </span>
          </div>
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center text-white shrink-0"
            style={{ backgroundColor: accent.hex }}
            title={displayName}
          >
            <Download className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Simulated Dark Popup */}
        <div className="w-full max-w-[390px] bg-slate-900 text-slate-50 border border-t-0 border-slate-800 rounded-b-xl p-4 shadow-lg flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: accent.hex }}
              >
                <Download className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-semibold truncate">{displayName}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowSettings((s) => !s)}
              className="px-2.5 py-1 text-xs text-slate-300 hover:text-white border border-slate-700 rounded-md flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Settings className="w-3 h-3" />
              Ajustes
            </button>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 flex flex-col gap-1.5">
            <div className="text-[11px] text-slate-400">
              {selectedSample.platform} · Pestaña activa
            </div>
            <div className="text-xs font-semibold text-white line-clamp-2">
              {selectedSample.title}
            </div>
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              aria-label="URL simulada"
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-slate-500"
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-medium text-slate-400">Formato de salida</span>
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setFormat('mp4')}
                className={`py-1.5 px-2 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  format === 'mp4' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                style={format === 'mp4' ? { backgroundColor: accent.hex } : undefined}
              >
                <Film className="w-3.5 h-3.5" />
                MP4 Video
              </button>
              <button
                type="button"
                onClick={() => setFormat('mp3')}
                className={`py-1.5 px-2 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  format === 'mp3' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                style={format === 'mp3' ? { backgroundColor: accent.hex } : undefined}
              >
                <Music className="w-3.5 h-3.5" />
                MP3 Audio
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-slate-400">
                {format === 'mp3' ? 'Calidad de audio (MP3)' : 'Calidad de video (MP4)'}
              </label>
              <select
                value={format === 'mp3' ? audioBitrate : videoQuality}
                onChange={(e) =>
                  format === 'mp3'
                    ? setAudioBitrate(e.target.value as ExtensionConfig['defaultAudioBitrate'])
                    : setVideoQuality(e.target.value as ExtensionConfig['defaultVideoQuality'])
                }
                className="bg-slate-950 border border-slate-700 text-slate-100 rounded-md px-2.5 py-1.5 text-xs focus:outline-none"
              >
                {(format === 'mp3' ? AUDIO_BITRATES : VIDEO_QUALITIES).map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {showSettings && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-[11px] text-slate-300">
              Todo viene configurado automáticamente para descargar con 1 clic en formato MP4 o MP3.
            </div>
          )}

          <button
            type="button"
            onClick={handleSimulatedAction}
            disabled={Boolean(simProgress)}
            className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: accent.hex }}
          >
            <Download className="w-3.5 h-3.5" />
            {format === 'mp3' ? 'Descargar audio MP3' : 'Descargar video MP4'}
          </button>

          {simProgress && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-200 truncate">{simProgress.stage}</span>
                <span className="text-white font-mono font-semibold tabular-nums">
                  {simProgress.pct}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-950 border border-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-200 rounded-full"
                  style={{ width: `${simProgress.pct}%`, backgroundColor: accent.hex }}
                />
              </div>
              <span className="text-[10px] text-slate-400">
                Puedes cerrar el popup; continúa en segundo plano.
              </span>
            </div>
          )}

          {statusMessage && (
            <div
              className={`px-2.5 py-2 rounded-md border text-[11px] flex items-start gap-2 ${
                statusMessage.kind === 'ok'
                  ? 'border-emerald-700 bg-emerald-950/60 text-emerald-200'
                  : statusMessage.kind === 'info'
                    ? 'border-amber-700 bg-amber-950/60 text-amber-200'
                    : 'border-rose-700 bg-rose-950/60 text-rose-200'
              }`}
            >
              {statusMessage.kind === 'ok' ? (
                <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <div className="pt-2.5 border-t border-slate-800 flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-slate-400">Descargas recientes</span>
            {history.map((item, idx) => (
              <div
                key={`${item.title}-${idx}`}
                className="flex items-center justify-between gap-2 bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-[11px]"
              >
                <span className="text-slate-200 truncate">{item.title}</span>
                <span className="text-slate-400 font-mono tabular-nums whitespace-nowrap shrink-0">
                  {item.format} · {item.quality}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
