import { useState } from 'react';
import {
  Download,
  Copy,
  Check,
  FolderOpen,
  Puzzle,
  Pin,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  Chrome,
  Compass,
  Shield,
  Flame,
} from 'lucide-react';
import { BrowserTarget, ExtensionConfig } from '../types/extension';
import { downloadExtensionZip } from '../utils/zipBuilder';

type GuideBrowser = 'chrome' | 'edge' | 'brave' | 'firefox';

interface Props {
  config: ExtensionConfig;
  onChangeBrowser: (target: BrowserTarget) => void;
}

interface BrowserProfile {
  id: GuideBrowser;
  name: string;
  subtitle: string;
  target: BrowserTarget;
  extensionsUrl: string;
  icon: typeof Chrome;
  zipLabel: string;
  step2Title: string;
  step2Text: string;
  step3Steps: Array<{ title: string; detail: string }>;
  friendlyTip: string;
}

const BROWSER_PROFILES: Record<GuideBrowser, BrowserProfile> = {
  chrome: {
    id: 'chrome',
    name: 'Google Chrome',
    subtitle: 'Instalación fija y rápida',
    target: 'chrome',
    extensionsUrl: 'chrome://extensions',
    icon: Chrome,
    zipLabel: 'Google Chrome',
    step2Title: 'Abre el panel de Extensiones en Chrome',
    step2Text:
      'Haz clic en "Copiar dirección", abre una pestaña nueva arriba, pega la dirección en la barra de Chrome y presiona Enter.',
    step3Steps: [
      {
        title: 'Activa el interruptor de arriba a la derecha',
        detail:
          'Se llama "Modo de desarrollador". Es una opción normal y segura de Chrome para instalar extensiones descargadas fuera de la tienda.',
      },
      {
        title: 'Carga la carpeta de Klypex',
        detail:
          'Haz clic en el botón "Cargar descomprimida" (arriba a la izquierda) y selecciona la carpeta que extrajiste en el Paso 1.',
      },
      {
        title: 'Fija el icono de Klypex en tu barra',
        detail:
          'Pulsa el icono del rompecabezas arriba a la derecha de Chrome y haz clic en la tachuela junto a Klypex para tenerlo siempre a mano.',
      },
    ],
    friendlyTip:
      '¡Listo! En Chrome la extensión queda guardada para siempre aunque apagues o reinicies tu computadora. Solo recuerda no borrar la carpeta que descomprimiste.',
  },
  edge: {
    id: 'edge',
    name: 'Microsoft Edge',
    subtitle: 'Instalación fija en Windows',
    target: 'chrome',
    extensionsUrl: 'edge://extensions',
    icon: Compass,
    zipLabel: 'Microsoft Edge',
    step2Title: 'Abre el panel de Extensiones en Edge',
    step2Text:
      'Haz clic en "Copiar dirección", abre una pestaña nueva, pégala en la barra de direcciones arriba y presiona Enter.',
    step3Steps: [
      {
        title: 'Activa "Modo de desarrollador"',
        detail:
          'Verás este interruptor en la columna izquierda (o arriba a la derecha). Enciéndelo para que aparezcan los botones de carga.',
      },
      {
        title: 'Carga la carpeta de Klypex',
        detail:
          'Pulsa "Cargar desempaquetada" (o "Cargar descomprimida") y elige la carpeta de Klypex que descomprimiste en el Paso 1.',
      },
      {
        title: 'Muestra Klypex en la barra superior',
        detail:
          'Haz clic en el icono del rompecabezas arriba a la derecha y activa el icono del ojo junto a Klypex.',
      },
    ],
    friendlyTip:
      'En Microsoft Edge queda instalada de forma permanente. No borres ni muevas la carpeta descomprimida después de instalarla.',
  },
  brave: {
    id: 'brave',
    name: 'Brave',
    subtitle: 'Instalación fija y privada',
    target: 'chrome',
    extensionsUrl: 'brave://extensions',
    icon: Shield,
    zipLabel: 'Brave',
    step2Title: 'Abre el panel de Extensiones en Brave',
    step2Text:
      'Pulsa "Copiar dirección", abre una pestaña nueva en Brave, pégala arriba en el buscador de direcciones y presiona Enter.',
    step3Steps: [
      {
        title: 'Enciende "Modo de desarrollador"',
        detail:
          'Lo encontrarás arriba a la derecha de la pantalla de extensiones de Brave.',
      },
      {
        title: 'Selecciona la carpeta extraída',
        detail:
          'Haz clic en "Cargar descomprimida" arriba a la izquierda y elige la carpeta de Klypex que guardaste en el Paso 1.',
      },
      {
        title: 'Fija el icono en tu barra',
        detail:
          'Abre el icono del rompecabezas junto a la barra de direcciones y fija Klypex con la tachuela.',
      },
    ],
    friendlyTip:
      'Brave mantendrá Klypex instalado de forma permanente cada vez que abras el navegador.',
  },
  firefox: {
    id: 'firefox',
    name: 'Mozilla Firefox',
    subtitle: 'Carga rápida en 3 clics',
    target: 'firefox',
    extensionsUrl: 'about:debugging#/runtime/this-firefox',
    icon: Flame,
    zipLabel: 'Firefox',
    step2Title: 'Abre la pantalla de carga en Firefox',
    step2Text:
      'Haz clic en "Copiar dirección", abre una pestaña nueva en Firefox, pégala en la barra de direcciones y presiona Enter.',
    step3Steps: [
      {
        title: 'Pulsa "Cargar complemento temporal..."',
        detail:
          'Verás este botón en la parte superior derecha de la pantalla que se abrió.',
      },
      {
        title: 'Elige el archivo "manifest.json"',
        detail:
          'Entra a la carpeta que descomprimiste en el Paso 1, selecciona el archivo llamado manifest.json y haz clic en Abrir.',
      },
      {
        title: 'Fija Klypex en la barra superior',
        detail:
          'Toca el icono del rompecabezas arriba a la derecha, pulsa el engranaje junto a Klypex y elige "Fijar en la barra de herramientas".',
      },
    ],
    friendlyTip:
      'Aviso de Firefox: por seguridad propia de Firefox, al cerrar el navegador por completo hay que repetir el Paso 2 y 3 (toma 10 segundos). Si prefieres instalarlo una sola vez para siempre, te recomendamos Chrome, Edge o Brave.',
  },
};

export function InstallGuide({ config, onChangeBrowser }: Props) {
  const [selectedBrowser, setSelectedBrowser] = useState<GuideBrowser>(
    config.browser === 'firefox' ? 'firefox' : 'chrome'
  );
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadedFile, setDownloadedFile] = useState<string | null>(null);

  const profile = BROWSER_PROFILES[selectedBrowser];

  const handleSelectBrowser = (id: GuideBrowser) => {
    setSelectedBrowser(id);
    onChangeBrowser(BROWSER_PROFILES[id].target);
    setDownloadedFile(null);
  };

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(profile.extensionsUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2400);
  };

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadedFile(null);
    try {
      const filename = await downloadExtensionZip({
        ...config,
        browser: profile.target,
      });
      setDownloadedFile(filename);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Intro & Browser Selector */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-5">
        <div className="max-w-2xl">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Instala Klypex en menos de 1 minuto
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            No necesitas conocimientos técnicos ni programas extra. Solo elige qué navegador usas y sigue estos 3 pasos sencillos.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(Object.keys(BROWSER_PROFILES) as GuideBrowser[]).map((id) => {
            const item = BROWSER_PROFILES[id];
            const Icon = item.icon;
            const active = selectedBrowser === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleSelectBrowser(id)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  active
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                    : 'border-slate-200 bg-slate-50/70 text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 mt-0.5 ${
                    active ? 'text-rose-400' : 'text-slate-600'
                  }`}
                />
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{item.name}</div>
                  <div
                    className={`text-xs mt-0.5 truncate ${
                      active ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {item.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Visual 3-Step Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Step 1: Download & Unzip */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
                Paso 1
              </span>
              <FolderOpen className="w-4 h-4 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Descarga y descomprime Klypex
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Pulsa el botón para bajar la extensión para <strong>{profile.name}</strong>. Luego ve a tu carpeta <strong>Descargas</strong>, haz <strong>clic derecho</strong> sobre el archivo <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">.zip</code> y elige <strong>Extraer todo...</strong>
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              {downloading ? 'Preparando archivo...' : `Descargar Klypex (${profile.zipLabel})`}
            </button>

            {downloadedFile && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  ¡Listo! Archivo <strong>{downloadedFile}</strong> guardado en Descargas.
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Step 2: Copy & Open Browser Extensions Page */}
        <section className="bg-slate-900 text-white rounded-xl p-6 flex flex-col justify-between gap-5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                Paso 2
              </span>
              <ArrowRight className="w-4 h-4 text-slate-500" />
            </div>
            <h3 className="text-base font-bold text-white">{profile.step2Title}</h3>
            <p className="text-sm text-slate-300 leading-relaxed">{profile.step2Text}</p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="bg-slate-950 border border-slate-700 rounded-xl p-3 flex items-center justify-between gap-2">
              <code className="text-xs font-mono text-emerald-300 truncate select-all">
                {profile.extensionsUrl}
              </code>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    ¡Copiada!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar dirección
                  </>
                )}
              </button>
            </div>

            <div className="text-[11px] text-slate-400 leading-relaxed">
              Los navegadores no permiten abrir sus pantallas internas con un clic directo desde internet; por eso solo debes copiarla, pegarla arriba (<span className="font-mono text-slate-200">Ctrl + V</span>) y presionar <span className="font-mono text-slate-200">Enter</span>.
            </div>
          </div>
        </section>

        {/* Step 3: Load & Pin */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
                Paso 3
              </span>
              <div className="flex items-center gap-1 text-slate-400">
                <Puzzle className="w-4 h-4" />
                <Pin className="w-3.5 h-3.5" />
              </div>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Activa y fija Klypex en tu barra
            </h3>

            <ol className="flex flex-col gap-2.5 mt-1">
              {profile.step3Steps.map((step, idx) => (
                <li
                  key={idx}
                  className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 flex items-start gap-2.5"
                >
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                    {idx + 1}
                  </span>
                  <div className="text-xs leading-relaxed">
                    <div className="font-semibold text-slate-900">{step.title}</div>
                    <div className="text-slate-600 mt-0.5">{step.detail}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>

      {/* Friendly Persistence Tip */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 flex items-start gap-3 text-sm text-emerald-950">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Consejo útil para {profile.name}: </span>
          <span>{profile.friendlyTip}</span>
        </div>
      </div>

      {/* Everyday User FAQ */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <HelpCircle className="w-4 h-4 text-slate-600" />
          <span>Preguntas frecuentes</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-4 space-y-1">
            <div className="font-semibold text-slate-900">
              ¿Dónde se guardan mis videos o músicas?
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Se guardan automáticamente en la carpeta <strong>Descargas</strong> de tu computadora, igual que cualquier archivo normal. Los MP3 incluyen su portada.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-4 space-y-1">
            <div className="font-semibold text-slate-900">
              ¿Puedo cerrar la ventanita mientras descarga?
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Sí. Una vez que pulsas descargar, puedes seguir viendo videos o cambiar de pestaña; Klypex termina el proceso en segundo plano y guarda el archivo solo.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-4 space-y-1">
            <div className="font-semibold text-slate-900">
              ¿En qué páginas web funciona?
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Funciona en YouTube, TikTok, Instagram, Facebook, X (Twitter), Twitch, SoundCloud, Vimeo y casi cualquier web con video o audio reproductible.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
