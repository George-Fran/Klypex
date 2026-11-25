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
  EyeOff,
  ExternalLink,
} from 'lucide-react';
import { BrowserTarget, ExtensionConfig } from '../types/extension';
import { downloadBridgeZip, downloadExtensionZip } from '../utils/zipBuilder';

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
  step3Title: string;
  step3Text: string;
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
    step3Title: 'Carga Klypex en Google Chrome',
    step3Text:
      'Haz clic en "Copiar dirección", abre una pestaña nueva, pégala en la barra de Chrome y presiona Enter.',
    step3Steps: [
      {
        title: 'Enciende "Modo de desarrollador" (arriba a la derecha)',
        detail:
          'Es una opción normal y segura de Chrome para cargar extensiones propias.',
      },
      {
        title: 'Pulsa "Cargar descomprimida"',
        detail:
          'Elige la carpeta que extrajiste en el Paso 1 (donde está manifest.json).',
      },
      {
        title: 'Fija Klypex en tu barra',
        detail:
          'Toca el icono del rompecabezas arriba a la derecha y haz clic en la tachuela junto a Klypex.',
      },
    ],
    friendlyTip:
      '¡Listo! En Chrome queda instalada de forma permanente aunque reinicies la computadora. Solo recuerda no borrar la carpeta descomprimida.',
  },
  edge: {
    id: 'edge',
    name: 'Microsoft Edge',
    subtitle: 'Instalación fija en Windows',
    target: 'chrome',
    extensionsUrl: 'edge://extensions',
    icon: Compass,
    zipLabel: 'Microsoft Edge',
    step3Title: 'Carga Klypex en Microsoft Edge',
    step3Text:
      'Haz clic en "Copiar dirección", abre una pestaña nueva, pégala en la barra de direcciones y presiona Enter.',
    step3Steps: [
      {
        title: 'Activa "Modo de desarrollador"',
        detail:
          'Lo verás en el menú izquierdo o en la esquina superior derecha.',
      },
      {
        title: 'Pulsa "Cargar desempaquetada"',
        detail:
          'Selecciona la carpeta que extrajiste en el Paso 1.',
      },
      {
        title: 'Muestra Klypex en tu barra',
        detail:
          'Abre el icono del rompecabezas arriba a la derecha y activa el icono del ojo junto a Klypex.',
      },
    ],
    friendlyTip:
      'En Microsoft Edge queda guardada para siempre. No borres ni muevas la carpeta extraída después de instalarla.',
  },
  brave: {
    id: 'brave',
    name: 'Brave',
    subtitle: 'Instalación fija y privada',
    target: 'chrome',
    extensionsUrl: 'brave://extensions',
    icon: Shield,
    zipLabel: 'Brave',
    step3Title: 'Carga Klypex en Brave',
    step3Text:
      'Pulsa "Copiar dirección", abre una pestaña nueva en Brave, pégala arriba y presiona Enter.',
    step3Steps: [
      {
        title: 'Enciende "Modo de desarrollador"',
        detail:
          'Está en la esquina superior derecha de la pantalla de extensiones.',
      },
      {
        title: 'Pulsa "Cargar descomprimida"',
        detail:
          'Elige la carpeta de Klypex que descomprimiste en el Paso 1.',
      },
      {
        title: 'Fija el icono de Klypex',
        detail:
          'Abre el icono del rompecabezas y fija Klypex con la tachuela.',
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
    step3Title: 'Carga Klypex en Firefox',
    step3Text:
      'Haz clic en "Copiar dirección", abre una pestaña nueva en Firefox, pégala arriba y presiona Enter.',
    step3Steps: [
      {
        title: 'Pulsa "Cargar complemento temporal..."',
        detail:
          'Verás este botón en la parte superior derecha.',
      },
      {
        title: 'Elige el archivo "manifest.json"',
        detail:
          'Entra a la carpeta que extrajiste en el Paso 1, selecciona manifest.json y pulsa Abrir.',
      },
      {
        title: 'Fija Klypex arriba',
        detail:
          'Toca el rompecabezas arriba a la derecha, pulsa el engranaje junto a Klypex y elige "Fijar en la barra de herramientas".',
      },
    ],
    friendlyTip:
      'Aviso de Firefox: por seguridad propia de Firefox, al cerrar el navegador por completo deberás volver a cargar manifest.json (toma 10 segundos). En Chrome, Edge o Brave queda fijo para siempre.',
  },
};

export function InstallGuide({ config, onChangeBrowser }: Props) {
  const [selectedBrowser, setSelectedBrowser] = useState<GuideBrowser>(
    config.browser === 'firefox' ? 'firefox' : 'chrome'
  );
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingBridge, setDownloadingBridge] = useState(false);
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

  const handleDownloadBridgeOnly = async () => {
    setDownloadingBridge(true);
    try {
      const filename = await downloadBridgeZip();
      setDownloadedFile(filename);
    } finally {
      setDownloadingBridge(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Intro & Browser Selector */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-5">
        <div className="max-w-2xl">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Instala Klypex en tu PC en 3 pasos fáciles
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Funciona a máxima velocidad usando tu propia conexión, sin bloqueos de YouTube y sin dejar ventanas de terminal abiertas.
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
              Descarga y extrae Klypex
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Descarga el paquete completo para <strong>{profile.name}</strong>. Ve a tu carpeta <strong>Descargas</strong>, haz <strong>clic derecho</strong> en el <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">.zip</code> y elige <strong>Extraer todo...</strong>
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

            <button
              type="button"
              onClick={handleDownloadBridgeOnly}
              disabled={downloadingBridge}
              className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-60"
            >
              {downloadingBridge ? 'Generando...' : 'Solo actualizar motor local (.zip)'}
            </button>

            {downloadedFile && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Guardado <strong>{downloadedFile}</strong> en Descargas.
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Step 2: Silent Background Tray Server */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
                Paso 2
              </span>
              <EyeOff className="w-4 h-4 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Enciende el motor oculto (1 clic)
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Entra a la carpeta <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">puente-local</code> que está dentro y haz doble clic en{' '}
              <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">iniciar-windows.bat</code>.
            </p>

            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 text-xs text-slate-600 space-y-2 leading-relaxed">
              <div>
                <strong className="text-slate-900">Sin ventanas molestas:</strong> la terminal se ocultará sola en 1 segundo y verás el pequeño icono rojo de <strong>Klypex</strong> en los <strong>iconos ocultos</strong> (la flechita <span className="font-mono">^</span> junto al reloj de Windows).
              </div>
              <div>
                La primera vez descargará automáticamente sus herramientas en silencio (~15 seg). En Mac o Linux ejecuta <code className="font-mono bg-white px-1 rounded border border-slate-200">bash iniciar-mac-linux.sh</code>.
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-500">
            <span>Requisito único en PC: Node.js</span>
            <a
              href="https://nodejs.org/es"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
            >
              Descargar Node.js gratis
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </section>

        {/* Step 3: Browser Installation */}
        <section className="bg-slate-900 text-white rounded-xl p-6 flex flex-col justify-between gap-5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                Paso 3
              </span>
              <div className="flex items-center gap-1 text-slate-400">
                <Puzzle className="w-4 h-4" />
                <Pin className="w-3.5 h-3.5" />
              </div>
            </div>
            <h3 className="text-base font-bold text-white">{profile.step3Title}</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{profile.step3Text}</p>

            <div className="bg-slate-950 border border-slate-700 rounded-xl p-2.5 flex items-center justify-between gap-2">
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

            <ol className="flex flex-col gap-2 mt-1">
              {profile.step3Steps.map((step, idx) => (
                <li
                  key={idx}
                  className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-2.5 flex items-start gap-2.5"
                >
                  <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                    {idx + 1}
                  </span>
                  <div className="text-xs leading-relaxed">
                    <div className="font-semibold text-white">{step.title}</div>
                    <div className="text-slate-300 mt-0.5">{step.detail}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ArrowRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>Pega la ruta en la barra de arriba (<span className="font-mono text-slate-200">Ctrl + V</span>) y pulsa Enter.</span>
          </div>
        </section>
      </div>

      {/* Friendly Persistence Tip */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 flex items-start gap-3 text-sm text-emerald-950">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Consejo para {profile.name}: </span>
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
              ¿Cómo cierro o reinicio el motor oculto?
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Haz clic en la flechita <strong>^ (Iconos ocultos)</strong> junto al reloj de Windows, busca el círculo rojo de <strong>Klypex</strong> y haz clic derecho para ver opciones como <em>Reiniciar</em> o <em>Detener y salir</em>.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-4 space-y-1">
            <div className="font-semibold text-slate-900">
              ¿Dónde se guardan mis videos o músicas?
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Directo en tu carpeta <strong>Descargas</strong>. Los videos MP4 son compatibles con Windows y celular, y los MP3 traen su portada incrustada.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-4 space-y-1">
            <div className="font-semibold text-slate-900">
              ¿Puedo cerrar la ventanita mientras descarga?
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Sí. Klypex sigue descargando y convirtiendo en segundo plano aunque cambies de pestaña o cierres la ventana de la extensión.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
