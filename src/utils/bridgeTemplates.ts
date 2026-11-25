import { GeneratedFile } from '../types/extension';

export function generateBridgeFiles(port = 4848): GeneratedFile[] {
  const bridgeMjs = `import http from 'node:http';
import { spawn, execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { URL, fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const PORT = Number(process.env.PORT || ${port});
const HOST = process.env.HOST || '127.0.0.1';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_BIN_DIR = path.join(__dirname, 'bin');

if (process.env.KLYPEX_LOG_FILE) {
  try {
    const logPath = process.env.KLYPEX_LOG_FILE;
    fs.writeFileSync(logPath, '', 'utf8');
    const writeLog = (level, args) => {
      const msg = args
        .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
        .join(' ');
      try {
        fs.appendFileSync(logPath, \`[\${new Date().toLocaleTimeString()}] [\${level}] \${msg}\\n\`, 'utf8');
      } catch {}
    };
    const origLog = console.log.bind(console);
    const origErr = console.error.bind(console);
    console.log = (...args) => {
      origLog(...args);
      writeLog('INFO', args);
    };
    console.error = (...args) => {
      origErr(...args);
      writeLog('ERR', args);
    };
  } catch {}
}

// Almacén temporal de archivos listos y trabajos en progreso
const preparedFiles = new Map();
const jobs = new Map();
const binaryCache = new Map();

function setCorsHeaders(res) {
  if (res.headersSent) return;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
}

function sendJson(res, status, data) {
  if (res.headersSent || res.writableEnded) return;
  setCorsHeaders(res);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function sanitizeFilename(name) {
  return (name || 'mediadrop-archivo')
    .replace(/[<>:"/\\\\|?*\\x00-\\x1F]/g, '')
    .replace(/\\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'mediadrop-archivo';
}

function isValidHttpUrl(input) {
  try {
    const parsed = new URL(input);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function getCandidatePaths(bin) {
  const exe = process.platform === 'win32' ? \`\${bin}.exe\` : bin;
  const candidates = [path.join(LOCAL_BIN_DIR, exe), bin];

  if (process.platform === 'win32') {
    const localApp = process.env.LOCALAPPDATA || '';
    const userProfile = process.env.USERPROFILE || '';
    const programData = process.env.ProgramData || 'C:\\\\ProgramData';
    if (localApp) {
      candidates.push(path.join(localApp, 'Microsoft', 'WinGet', 'Links', exe));
    }
    if (userProfile) {
      candidates.push(path.join(userProfile, 'scoop', 'shims', exe));
    }
    candidates.push(path.join(programData, 'chocolatey', 'bin', exe));
  } else {
    candidates.push(\`/opt/homebrew/bin/\${bin}\`, \`/usr/local/bin/\${bin}\`, \`/usr/bin/\${bin}\`);
  }
  return candidates;
}

function resolveBinary(bin, forceRefresh = false) {
  const cached = binaryCache.get(bin);
  if (!forceRefresh && cached && cached.available) {
    if (cached.path === bin || fs.existsSync(cached.path)) {
      return Promise.resolve(cached);
    }
  }

  return new Promise((resolve) => {
    const candidates = getCandidatePaths(bin);
    let idx = 0;

    function tryNext() {
      if (idx >= candidates.length) {
        resolve({ available: false, path: bin, version: null });
        return;
      }
      const candidate = candidates[idx++];
      if (candidate !== bin && !fs.existsSync(candidate)) {
        tryNext();
        return;
      }
      const versionFlag = bin === 'ffmpeg' ? '-version' : '--version';
      execFile(candidate, [versionFlag], { timeout: 10000 }, (err, stdout) => {
        if (err) {
          tryNext();
        } else {
          const hit = {
            available: true,
            path: candidate,
            version: String(stdout).trim().split('\\n')[0],
          };
          binaryCache.set(bin, hit);
          resolve(hit);
        }
      });
    }

    tryNext();
  });
}

async function downloadFile(url, destPath, gunzip = false) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  const tmpPath = destPath + '.tmp';
  try {
    const resp = await fetch(url, { redirect: 'follow' });
    if (!resp.ok || !resp.body) {
      throw new Error(\`HTTP \${resp.status}\`);
    }
    const bodyStream = Readable.fromWeb(resp.body);
    const outStream = fs.createWriteStream(tmpPath);
    if (gunzip) {
      await pipeline(bodyStream, zlib.createGunzip(), outStream);
    } else {
      await pipeline(bodyStream, outStream);
    }
    if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
    fs.renameSync(tmpPath, destPath);
  } catch (err) {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {}
    throw err;
  }
}

async function ensureWindowsBinaries() {
  if (process.platform !== 'win32') return;

  let yt = await resolveBinary('yt-dlp');
  if (!yt.available) {
    const ytDest = path.join(LOCAL_BIN_DIR, 'yt-dlp.exe');
    console.log('Descargando yt-dlp.exe (~17 MB)...');
    try {
      await downloadFile(
        'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
        ytDest,
        false
      );
      yt = await resolveBinary('yt-dlp', true);
      if (yt.available) console.log('[OK] yt-dlp.exe listo.');
    } catch (err) {
      console.error('[Aviso] Error descargando yt-dlp.exe:', err.message);
    }
  }

  let ff = await resolveBinary('ffmpeg');
  if (!ff.available) {
    const ffDest = path.join(LOCAL_BIN_DIR, 'ffmpeg.exe');
    console.log('Descargando ffmpeg.exe para MP3 y MP4 HD (~25 MB, solo una vez)...');
    const urls = [
      'https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffmpeg-win32-x64.gz',
      'https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0/ffmpeg-win32-x64.gz',
    ];
    for (const url of urls) {
      try {
        await downloadFile(url, ffDest, true);
        ff = await resolveBinary('ffmpeg', true);
        if (ff.available) {
          console.log('[OK] ffmpeg.exe listo.');
          break;
        }
      } catch (err) {
        console.error('[Aviso] Intento ffmpeg falló:', err.message);
      }
    }
  }
}

function cleanupPrepared(id) {
  const item = preparedFiles.get(id);
  if (!item) return;
  preparedFiles.delete(id);
  try {
    fs.rmSync(item.tmpDir, { recursive: true, force: true });
  } catch {}
}

function prepareCookiesForJob(tmpDir) {
  let rawCookies = '';
  if (process.env.YTDLP_COOKIES_B64) {
    try {
      rawCookies = Buffer.from(process.env.YTDLP_COOKIES_B64.trim(), 'base64').toString('utf8');
    } catch {}
  } else if (process.env.YTDLP_COOKIES_TEXT) {
    rawCookies = process.env.YTDLP_COOKIES_TEXT;
  } else {
    const localCookies = path.join(__dirname, 'cookies.txt');
    if (fs.existsSync(localCookies)) {
      try {
        rawCookies = fs.readFileSync(localCookies, 'utf8');
      } catch {}
    }
  }
  if (!rawCookies || !rawCookies.trim()) return null;
  const normalized = rawCookies.replace(/\\r\\n/g, '\\n').trim() + '\\n';
  const dest = path.join(tmpDir, 'cookies.txt');
  fs.writeFileSync(dest, normalized, 'utf8');
  return dest;
}

function buildYtDlpArgs({ ytdlpVersion, ffmpeg, targetUrl, format, quality, outputTemplate, cookiesPath }) {
  const args = ['--no-playlist', '--no-warnings', '--newline', '--progress', '-o', outputTemplate];

  const cleanVer = String(ytdlpVersion || '').trim();
  if (/^\\d{4}\\.\\d{2}/.test(cleanVer) && cleanVer >= '2025.11') {
    args.push(
      '--js-runtimes',
      'deno',
      '--js-runtimes',
      'node',
      '--remote-components',
      'ejs:github'
    );
  }

  if (cookiesPath) {
    args.push('--cookies', cookiesPath);
  }

  if (process.env.YTDLP_PROXY) {
    args.push('--proxy', process.env.YTDLP_PROXY.trim());
  }

  if (ffmpeg.available && ffmpeg.path !== 'ffmpeg') {
    args.push('--ffmpeg-location', path.dirname(ffmpeg.path));
  }

  if (format === 'mp3') {
    const bitrate = ['320', '192', '128'].includes(quality) ? quality : '192';
    args.push(
      '-f',
      'ba/b',
      '-x',
      '--audio-format',
      'mp3',
      '--audio-quality',
      \`\${bitrate}K\`,
      '--embed-thumbnail',
      '--convert-thumbnails',
      'jpg',
      '--embed-metadata'
    );
  } else {
    const maxHeight = ['2160', '1080', '720', '480'].includes(quality) ? quality : '1080';
    // Priorizar H.264 (avc1/h264) + AAC (m4a) y exigir pista de video (vcodec!=none)
    args.push('-S', \`vcodec:h264,acodec:m4a,res:\${maxHeight}\`);
    if (ffmpeg.available) {
      args.push(
        '-f',
        \`bv*[height<=\${maxHeight}][vcodec~='^(avc1|h264)']+ba[ext=m4a]/bv*[height<=\${maxHeight}][vcodec~='^(avc1|h264)']+ba/b[height<=\${maxHeight}][ext=mp4][vcodec~='^(avc1|h264)']/bv*[height<=\${maxHeight}]+ba/b[height<=\${maxHeight}][vcodec!=none]/bv*+ba/b[vcodec!=none]/b\`,
        '--merge-output-format',
        'mp4'
      );
    } else {
      args.push(
        '-f',
        \`b[height<=\${maxHeight}][ext=mp4][vcodec~='^(avc1|h264)']/b[height<=\${maxHeight}][ext=mp4][vcodec!=none]/b[ext=mp4][vcodec!=none]/b[vcodec!=none]/b\`
      );
    }
  }

  args.push(targetUrl);
  return args;
}

function inspectMediaStreams(ffmpegPath, filePath) {
  return new Promise((resolve) => {
    execFile(ffmpegPath, ['-i', filePath], { timeout: 15000 }, (_err, stdout, stderr) => {
      const info = String(stderr || '') + '\\n' + String(stdout || '');
      const videoMatch = info.match(/Stream #[^\\r\\n]*Video:\\s*([a-z0-9_]+)/i);
      const audioMatch = info.match(/Stream #[^\\r\\n]*Audio:\\s*([a-z0-9_]+)/i);
      const is10Bit = /yuv\\d+p10/i.test(info);
      resolve({
        hasVideo: Boolean(videoMatch),
        videoCodec: videoMatch ? videoMatch[1].toLowerCase() : '',
        audioCodec: audioMatch ? audioMatch[1].toLowerCase() : '',
        is10Bit,
      });
    });
  });
}

function transcodeMp4ToH264(ffmpegPath, inputPath, { copyVideo, copyAudio }) {
  return new Promise((resolve, reject) => {
    const outPath = inputPath + '.h264.mp4';
    const args = ['-y', '-i', inputPath];
    if (copyVideo) {
      args.push('-c:v', 'copy');
    } else {
      args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '21');
    }
    if (copyAudio) {
      args.push('-c:a', 'copy');
    } else {
      args.push('-c:a', 'aac', '-b:a', '192k');
    }
    args.push('-movflags', '+faststart', outPath);

    execFile(ffmpegPath, args, { timeout: 300000 }, (err, _stdout, stderr) => {
      if (err || !fs.existsSync(outPath)) {
        try {
          if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
        } catch {}
        reject(new Error(stderr ? String(stderr).slice(-300) : 'Error al convertir video a H.264.'));
        return;
      }
      fs.unlinkSync(inputPath);
      fs.renameSync(outPath, inputPath);
      resolve();
    });
  });
}

async function convertMp3ToId3v23(ffmpegPath, inputPath, uniqueAlbum) {
  const probe = await inspectMediaStreams(ffmpegPath, inputPath);
  const outPath = inputPath + '.id3v23.mp3';
  const ffArgs = [
    '-y',
    '-i',
    inputPath,
    '-map',
    '0',
    '-c',
    'copy',
    '-id3v2_version',
    '3',
    '-write_id3v1',
    '1',
    '-metadata',
    \`album=\${uniqueAlbum}\`,
  ];

  if (probe.hasVideo) {
    ffArgs.push(
      '-disposition:v:0',
      'attached_pic',
      '-metadata:s:v',
      'title=Album cover',
      '-metadata:s:v',
      'comment=Cover (front)'
    );
  }

  ffArgs.push(outPath);

  return new Promise((resolve) => {
    execFile(ffmpegPath, ffArgs, { timeout: 30000 }, (err) => {
      if (err || !fs.existsSync(outPath)) {
        try {
          if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
        } catch {}
        resolve();
        return;
      }
      try {
        fs.unlinkSync(inputPath);
        fs.renameSync(outPath, inputPath);
      } catch {}
      resolve();
    });
  });
}

function parseProgressLine(line, job) {
  const pctMatch = line.match(/\\[download\\]\\s+(\\d+(?:\\.\\d+)?)%/);
  if (pctMatch) {
    const pct = Math.min(94, Math.max(1, Math.round(parseFloat(pctMatch[1]))));
    job.progress = Math.max(job.progress, pct);
    job.stage = job.format === 'mp3' ? 'Descargando audio...' : 'Descargando video y audio...';
    const speedMatch = line.match(/at\\s+([^\\s]+\\/s)/);
    if (speedMatch) job.speed = speedMatch[1];
    const etaMatch = line.match(/ETA\\s+([0-9:]+)/);
    if (etaMatch) job.eta = etaMatch[1];
    return;
  }
  if (line.includes('[Merger]') || line.includes('Merging formats')) {
    job.status = 'converting';
    job.progress = Math.max(job.progress, 95);
    job.stage = 'Combinando video H.264 y audio MP4...';
  } else if (line.includes('[ExtractAudio]') || line.includes('Post-process')) {
    job.status = 'converting';
    job.progress = Math.max(job.progress, 95);
    job.stage = 'Convirtiendo a MP3...';
  } else if (line.includes('[EmbedThumbnail]') || line.includes('[Metadata]')) {
    job.status = 'converting';
    job.progress = Math.max(job.progress, 98);
    job.stage = 'Incrustando carátula y metadatos...';
  }
}

function startJob({ ytdlpPath, ytdlpVersion, ffmpeg, targetUrl, format, quality, publicBase }) {
  const jobId = crypto.randomUUID();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mediadrop-'));
  const outputTemplate = path.join(tmpDir, '%(title).90s.%(ext)s');

  const job = {
    id: jobId,
    format,
    quality,
    status: 'downloading',
    progress: 2,
    stage: 'Analizando video...',
    speed: '',
    eta: '',
    filename: '',
    downloadUrl: '',
    error: null,
  };
  jobs.set(jobId, job);

  if (format === 'mp3' && !ffmpeg.available) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    job.status = 'error';
    job.error = 'Falta ffmpeg.exe en puente-local/bin/ para convertir a MP3.';
    return job;
  }

  const cookiesPath = prepareCookiesForJob(tmpDir);
  const args = buildYtDlpArgs({
    ytdlpVersion,
    ffmpeg,
    targetUrl,
    format,
    quality,
    outputTemplate,
    cookiesPath,
  });
  const child = spawn(ytdlpPath, args);
  let stderr = '';
  let stdoutBuf = '';
  let settled = false;

  const handleOutput = (chunk, isErr) => {
    const text = chunk.toString();
    if (isErr) stderr += text;
    stdoutBuf += text;
    const lines = stdoutBuf.split(/[\\r\\n]+/);
    stdoutBuf = lines.pop() || '';
    for (const line of lines) {
      parseProgressLine(line, job);
    }
  };

  child.stdout.on('data', (c) => handleOutput(c, false));
  child.stderr.on('data', (c) => handleOutput(c, true));

  child.on('error', (err) => {
    if (settled) return;
    settled = true;
    fs.rmSync(tmpDir, { recursive: true, force: true });
    job.status = 'error';
    job.error = \`No se pudo ejecutar yt-dlp: \${err.message}\`;
  });

  child.on('close', async (code) => {
    if (settled) return;
    settled = true;

    if (code !== 0) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      job.status = 'error';
      const rawErr = stderr.trim();
      if (/Sign in to confirm|not a bot/i.test(rawErr)) {
        job.error =
          'YouTube bloqueó la IP del servidor (anti-bot). Agrega YTDLP_COOKIES_TEXT o YTDLP_COOKIES_B64 en Render con cookies de YouTube, o usa el puente local en tu PC (iniciar-windows.bat).';
      } else {
        job.error = rawErr || \`yt-dlp finalizó con código \${code}\`;
      }
      return;
    }

    let files = [];
    try {
      files = fs.readdirSync(tmpDir);
    } catch {}

    if (!files.length) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      job.status = 'error';
      job.error = 'yt-dlp no generó ningún archivo.';
      return;
    }

    const rawName =
      files.find((f) => f.toLowerCase().endsWith('.' + format)) ||
      files.find((f) => !/\\.(jpg|jpeg|png|webp|part|ytdl|temp)$/i.test(f)) ||
      files[0];
    const fullPath = path.join(tmpDir, rawName);
    const ext = path.extname(rawName).replace('.', '') || format;

    const baseTitle = sanitizeFilename(path.parse(rawName).name);

    // Si es MP3 y ffmpeg está disponible, asegurar etiquetas ID3v2.3 y álbum único para evitar caché compartida en Windows Media Player
    if (format === 'mp3' && ffmpeg.available) {
      await convertMp3ToId3v23(ffmpeg.path, fullPath, baseTitle);
    }

    // Si es MP4 y ffmpeg está disponible, garantizar que tenga pista de video H.264 + audio AAC legible en Windows
    if (format === 'mp4' && ffmpeg.available) {
      try {
        const probe = await inspectMediaStreams(ffmpeg.path, fullPath);
        if (!probe.hasVideo) {
          fs.rmSync(tmpDir, { recursive: true, force: true });
          job.status = 'error';
          job.error = 'La plataforma solo entregó pista de audio sin video en ese enlace.';
          return;
        }
        const needVideoTranscode = probe.videoCodec !== 'h264' || probe.is10Bit;
        const needAudioTranscode = Boolean(probe.audioCodec) && probe.audioCodec !== 'aac';
        if (needVideoTranscode || needAudioTranscode) {
          job.status = 'converting';
          job.progress = Math.max(job.progress, 96);
          job.stage = 'Convirtiendo video a H.264 compatible...';
          await transcodeMp4ToH264(ffmpeg.path, fullPath, {
            copyVideo: !needVideoTranscode,
            copyAudio: !needAudioTranscode,
          });
        }
      } catch (convErr) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        job.status = 'error';
        job.error = convErr instanceof Error ? convErr.message : 'Error al compatibilizar el video MP4.';
        return;
      }
    }

    const safeName = sanitizeFilename(path.parse(rawName).name) + '.' + ext;

    const fileId = crypto.randomUUID();
    preparedFiles.set(fileId, { tmpDir, fullPath, safeName, ext });
    setTimeout(() => cleanupPrepared(fileId), 10 * 60 * 1000).unref();

    job.progress = 100;
    job.status = 'ready';
    job.stage = 'Listo para guardar';
    job.filename = safeName;
    job.downloadPath = \`/api/file/\${fileId}\`;
    job.downloadUrl = \`\${publicBase}/api/file/\${fileId}\`;

    setTimeout(() => jobs.delete(jobId), 10 * 60 * 1000).unref();
  });

  return job;
}

function runYtDlpSyncPromise(params) {
  return new Promise((resolve, reject) => {
    const job = startJob(params);
    const timer = setInterval(() => {
      if (job.status === 'ready') {
        clearInterval(timer);
        resolve(job);
      } else if (job.status === 'error') {
        clearInterval(timer);
        reject(new Error(job.error || 'Error al procesar descarga.'));
      }
    }, 300);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      setCorsHeaders(res);
      res.writeHead(204);
      res.end();
      return;
    }

    const proto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
    const safeHost = HOST === '0.0.0.0' ? '127.0.0.1' : HOST;
    const reqHost = req.headers.host || \`\${safeHost}:\${PORT}\`;
    const publicBase = \`\${proto}://\${reqHost}\`;
    const reqUrl = new URL(req.url || '/', publicBase);

    if (reqUrl.pathname === '/' && req.method === 'GET') {
      sendJson(res, 200, { ok: true, service: 'mediadrop-bridge', port: PORT });
      return;
    }

    if (reqUrl.pathname === '/health' && req.method === 'GET') {
      const [ytdlp, ffmpeg] = await Promise.all([
        resolveBinary('yt-dlp'),
        resolveBinary('ffmpeg'),
      ]);
      const hasCookies = Boolean(
        process.env.YTDLP_COOKIES_B64 ||
          process.env.YTDLP_COOKIES_TEXT ||
          fs.existsSync(path.join(__dirname, 'cookies.txt'))
      );
      sendJson(res, 200, {
        ok: true,
        ytdlp: ytdlp.available,
        ytdlpVersion: ytdlp.version,
        ffmpeg: ffmpeg.available,
        mode: process.env.PORT ? 'cloud' : 'local',
        cookiesConfigured: hasCookies,
      });
      return;
    }

    if (reqUrl.pathname === '/api/start' && req.method === 'GET') {
      const targetUrl = reqUrl.searchParams.get('url') || '';
      const format = reqUrl.searchParams.get('format') === 'mp3' ? 'mp3' : 'mp4';
      const quality = reqUrl.searchParams.get('quality') || (format === 'mp3' ? '192' : '1080');

      if (!isValidHttpUrl(targetUrl)) {
        sendJson(res, 400, { error: 'URL inválida.' });
        return;
      }

      const [ytdlp, ffmpeg] = await Promise.all([
        resolveBinary('yt-dlp'),
        resolveBinary('ffmpeg'),
      ]);

      if (!ytdlp.available) {
        sendJson(res, 500, {
          error: 'No se encontró yt-dlp.exe en puente-local/bin/. Reinicia iniciar-windows.bat.',
        });
        return;
      }

      const job = startJob({
        ytdlpPath: ytdlp.path,
        ytdlpVersion: ytdlp.version,
        ffmpeg,
        targetUrl,
        format,
        quality,
        publicBase,
      });

      sendJson(res, 200, { ok: true, jobId: job.id, job });
      return;
    }

    if (reqUrl.pathname.startsWith('/api/jobs/') && req.method === 'GET') {
      const jobId = reqUrl.pathname.replace('/api/jobs/', '').trim();
      const job = jobs.get(jobId);
      if (!job) {
        sendJson(res, 404, { error: 'Trabajo no encontrado.' });
        return;
      }
      sendJson(res, 200, { ok: true, ...job });
      return;
    }

    if (reqUrl.pathname === '/api/prepare' && req.method === 'GET') {
      const targetUrl = reqUrl.searchParams.get('url') || '';
      const format = reqUrl.searchParams.get('format') === 'mp3' ? 'mp3' : 'mp4';
      const quality = reqUrl.searchParams.get('quality') || (format === 'mp3' ? '192' : '1080');

      if (!isValidHttpUrl(targetUrl)) {
        sendJson(res, 400, { error: 'URL inválida.' });
        return;
      }

      const [ytdlp, ffmpeg] = await Promise.all([
        resolveBinary('yt-dlp'),
        resolveBinary('ffmpeg'),
      ]);

      if (!ytdlp.available) {
        sendJson(res, 500, { error: 'No se encontró yt-dlp.exe en puente-local/bin/.' });
        return;
      }

      try {
        const job = await runYtDlpSyncPromise({
          ytdlpPath: ytdlp.path,
          ytdlpVersion: ytdlp.version,
          ffmpeg,
          targetUrl,
          format,
          quality,
          publicBase,
        });
        sendJson(res, 200, {
          ok: true,
          id: job.id,
          filename: job.filename,
          downloadPath: job.downloadPath,
          downloadUrl: job.downloadUrl,
        });
      } catch (err) {
        sendJson(res, 500, {
          error: err instanceof Error ? err.message : 'Error al procesar descarga.',
        });
      }
      return;
    }

    if (reqUrl.pathname.startsWith('/api/file/') && req.method === 'GET') {
      const id = reqUrl.pathname.replace('/api/file/', '').trim();
      const entry = preparedFiles.get(id);
      if (!entry || !fs.existsSync(entry.fullPath)) {
        sendJson(res, 404, { error: 'Archivo temporal expirado o no encontrado.' });
        return;
      }
      const stat = fs.statSync(entry.fullPath);
      setCorsHeaders(res);
      res.writeHead(200, {
        'Content-Type': entry.ext === 'mp3' ? 'audio/mpeg' : 'video/mp4',
        'Content-Length': String(stat.size),
        'Content-Disposition': \`attachment; filename*=UTF-8''\${encodeURIComponent(entry.safeName)}\`,
      });
      const stream = fs.createReadStream(entry.fullPath);
      stream.pipe(res);
      stream.on('close', () => cleanupPrepared(id));
      stream.on('error', () => {
        cleanupPrepared(id);
        if (!res.writableEnded) res.end();
      });
      return;
    }

    sendJson(res, 404, { error: 'Ruta no encontrada.' });
  } catch (err) {
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : 'Error interno del puente local.',
    });
  }
});

async function bootstrap() {
  await ensureWindowsBinaries();
  const [yt, ff] = await Promise.all([
    resolveBinary('yt-dlp'),
    resolveBinary('ffmpeg'),
  ]);
  server.listen(PORT, HOST, () => {
    console.log(\`Puente MediaDrop activo en http://\${HOST}:\${PORT}\`);
    console.log(\`yt-dlp: \${yt.available ? yt.version : 'NO ENCONTRADO'} | ffmpeg: \${ff.available ? 'OK' : 'NO ENCONTRADO'}\`);
    console.log('Mantén esta ventana abierta mientras descargas desde la extensión.');
  });
}

bootstrap();
`;

  const bridgePy = `import gzip
import http.server
import json
import os
import re
import shutil
import subprocess
import tempfile
import threading
import urllib.parse
import urllib.request
import uuid

HOST = '127.0.0.1'
PORT = int(os.environ.get('PORT', '${port}'))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOCAL_BIN = os.path.join(BASE_DIR, 'bin')
PREPARED = {}
JOBS = {}
BIN_CACHE = {}

def sanitize_filename(name):
    cleaned = re.sub(r'[<>:"/\\\\|?*\\x00-\\x1F]', '', name or 'mediadrop-archivo')
    cleaned = re.sub(r'\\s+', ' ', cleaned).strip()[:120]
    return cleaned or 'mediadrop-archivo'

def resolve_bin(name):
    exe = f'{name}.exe' if os.name == 'nt' else name
    local_candidate = os.path.join(LOCAL_BIN, exe)
    if os.path.isfile(local_candidate):
        return local_candidate
    found = shutil.which(name)
    if found:
        return found
    if os.name == 'nt':
        local_app = os.environ.get('LOCALAPPDATA', '')
        candidate = os.path.join(local_app, 'Microsoft', 'WinGet', 'Links', exe)
        if os.path.isfile(candidate):
            return candidate
    return None

def check_bin(name):
    if name in BIN_CACHE and BIN_CACHE[name][0]:
        return BIN_CACHE[name]
    bin_path = resolve_bin(name)
    if not bin_path:
        return False, None, None
    try:
        flag = '-version' if name == 'ffmpeg' else '--version'
        out = subprocess.check_output([bin_path, flag], stderr=subprocess.STDOUT, timeout=8)
        res = (True, bin_path, out.decode('utf-8', errors='ignore').splitlines()[0])
        BIN_CACHE[name] = res
        return res
    except Exception:
        return False, None, None

def ensure_windows_bins():
    if os.name != 'nt':
        return
    os.makedirs(LOCAL_BIN, exist_ok=True)
    if not check_bin('yt-dlp')[0]:
        print('Descargando yt-dlp.exe (~17 MB)...')
        urllib.request.urlretrieve('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe', os.path.join(LOCAL_BIN, 'yt-dlp.exe'))
    if not check_bin('ffmpeg')[0]:
        print('Descargando ffmpeg.exe (~25 MB)...')
        gz_path = os.path.join(LOCAL_BIN, 'ffmpeg.exe.gz')
        urllib.request.urlretrieve('https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffmpeg-win32-x64.gz', gz_path)
        with gzip.open(gz_path, 'rb') as f_in, open(os.path.join(LOCAL_BIN, 'ffmpeg.exe'), 'wb') as f_out:
            shutil.copyfileobj(f_in, f_out)
        os.remove(gz_path)

def run_job_thread(job_id, yt_path, ff_ok, ff_path, target_url, fmt, quality):
    job = JOBS[job_id]
    tmp_dir = tempfile.mkdtemp(prefix='mediadrop-')
    out_tpl = os.path.join(tmp_dir, '%(title).90s.%(ext)s')
    cmd = [yt_path, '--no-playlist', '--no-warnings', '--newline', '--progress', '-o', out_tpl]

    if ff_path:
        cmd += ['--ffmpeg-location', os.path.dirname(ff_path)]

    if fmt == 'mp3':
        bitrate = quality if quality in ('320', '192', '128') else '192'
        cmd += ['-x', '--audio-format', 'mp3', '--audio-quality', f'{bitrate}K', '--embed-thumbnail', '--convert-thumbnails', 'jpg', '--embed-metadata']
    else:
        h = quality if quality in ('2160', '1080', '720', '480') else '1080'
        cmd += ['-S', f'vcodec:h264,acodec:m4a,res:{h}']
        if ff_ok:
            cmd += [
                '-f',
                f"bv*[height<={h}][vcodec~='^(avc1|h264)']+ba[ext=m4a]/bv*[height<={h}][vcodec~='^(avc1|h264)']+ba/b[height<={h}][ext=mp4][vcodec~='^(avc1|h264)']/bv*[height<={h}]+ba/b[height<={h}][vcodec!=none]/bv*+ba/b[vcodec!=none]/b",
                '--merge-output-format',
                'mp4',
            ]
        else:
            cmd += ['-f', f"b[height<={h}][ext=mp4][vcodec~='^(avc1|h264)']/b[height<={h}][ext=mp4][vcodec!=none]/b[ext=mp4][vcodec!=none]/b[vcodec!=none]/b"]

    cmd.append(target_url)

    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
    last_err = ''
    if proc.stdout:
        for line in proc.stdout:
            last_err = line.strip() or last_err
            m = re.search(r'\\[download\\]\\s+(\\d+(?:\\.\\d+)?)%', line)
            if m:
                pct = min(95, max(1, int(float(m.group(1)))))
                job['progress'] = max(job['progress'], pct)
                job['stage'] = 'Descargando audio...' if fmt == 'mp3' else 'Descargando video y audio...'
            elif '[Merger]' in line or 'Merging' in line:
                job['status'] = 'converting'
                job['progress'] = max(job['progress'], 96)
                job['stage'] = 'Combinando video H.264 y audio MP4...'
            elif '[ExtractAudio]' in line:
                job['status'] = 'converting'
                job['progress'] = max(job['progress'], 96)
                job['stage'] = 'Convirtiendo a MP3...'
    code = proc.wait()
    if code != 0:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        job['status'] = 'error'
        job['error'] = last_err or 'Error en yt-dlp'
        return

    files = os.listdir(tmp_dir)
    if not files:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        job['status'] = 'error'
        job['error'] = 'No se genero ningun archivo.'
        return

    full_path = os.path.join(tmp_dir, files[0])
    base_name, raw_ext = os.path.splitext(files[0])
    ext = raw_ext.lstrip('.') or fmt
    safe_name = sanitize_filename(base_name) + '.' + ext
    fid = str(uuid.uuid4())
    PREPARED[fid] = {'tmp_dir': tmp_dir, 'full_path': full_path, 'safe_name': safe_name, 'ext': ext}
    job['progress'] = 100
    job['status'] = 'ready'
    job['stage'] = 'Listo para guardar'
    job['filename'] = safe_name
    job['downloadUrl'] = f'http://{HOST}:{PORT}/api/file/{fid}'

class BridgeHandler(http.server.BaseHTTPRequestHandler):
    def send_cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Private-Network', 'true')

    def send_json(self, code, payload):
        body = json.dumps(payload).encode('utf-8')
        self.send_response(code)
        self.send_cors()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        if parsed.path == '/health':
            yt_ok, _, yt_ver = check_bin('yt-dlp')
            ff_ok, _, _ = check_bin('ffmpeg')
            self.send_json(200, {'ok': True, 'ytdlp': yt_ok, 'ytdlpVersion': yt_ver, 'ffmpeg': ff_ok})
            return

        if parsed.path == '/api/start':
            target_url = (params.get('url') or [''])[0]
            fmt = 'mp3' if (params.get('format') or ['mp4'])[0] == 'mp3' else 'mp4'
            quality = (params.get('quality') or ['192' if fmt == 'mp3' else '1080'])[0]
            if not (target_url.startswith('http://') or target_url.startswith('https://')):
                self.send_json(400, {'error': 'URL invalida.'})
                return
            yt_ok, yt_path, _ = check_bin('yt-dlp')
            ff_ok, ff_path, _ = check_bin('ffmpeg')
            if not yt_ok or not yt_path:
                self.send_json(500, {'error': 'Falta yt-dlp.exe en puente-local/bin/.'})
                return
            if fmt == 'mp3' and not ff_ok:
                self.send_json(500, {'error': 'Falta ffmpeg.exe en puente-local/bin/ para convertir a MP3.'})
                return
            jid = str(uuid.uuid4())
            JOBS[jid] = {'id': jid, 'format': fmt, 'quality': quality, 'status': 'downloading', 'progress': 2, 'stage': 'Analizando video...', 'speed': '', 'eta': '', 'filename': '', 'downloadUrl': '', 'error': None}
            t = threading.Thread(target=run_job_thread, args=(jid, yt_path, ff_ok, ff_path, target_url, fmt, quality), daemon=True)
            t.start()
            self.send_json(200, {'ok': True, 'jobId': jid, 'job': JOBS[jid]})
            return

        if parsed.path.startswith('/api/jobs/'):
            jid = parsed.path.replace('/api/jobs/', '').strip()
            job = JOBS.get(jid)
            if not job:
                self.send_json(404, {'error': 'Trabajo no encontrado.'})
                return
            self.send_json(200, {'ok': True, **job})
            return

        if parsed.path.startswith('/api/file/'):
            fid = parsed.path.replace('/api/file/', '').strip()
            entry = PREPARED.pop(fid, None)
            if not entry or not os.path.isfile(entry['full_path']):
                self.send_json(404, {'error': 'Archivo temporal no encontrado.'})
                return
            size = os.path.getsize(entry['full_path'])
            self.send_response(200)
            self.send_cors()
            self.send_header('Content-Type', 'audio/mpeg' if entry['ext'] == 'mp3' else 'video/mp4')
            self.send_header('Content-Length', str(size))
            self.send_header('Content-Disposition', f"attachment; filename*=UTF-8''{urllib.parse.quote(entry['safe_name'])}")
            self.end_headers()
            with open(entry['full_path'], 'rb') as f:
                shutil.copyfileobj(f, self.wfile)
            shutil.rmtree(entry['tmp_dir'], ignore_errors=True)
            return

        self.send_json(404, {'error': 'Ruta no encontrada.'})

if __name__ == '__main__':
    ensure_windows_bins()
    check_bin('yt-dlp')
    check_bin('ffmpeg')
    print(f'Puente MediaDrop (Python) activo en http://{HOST}:{PORT}')
    print('Manten esta ventana abierta mientras descargas desde la extension.')
    http.server.ThreadingHTTPServer((HOST, PORT), BridgeHandler).serve_forever()
`;

  const packageJson = `{
  "name": "mediadrop-local-bridge",
  "version": "1.4.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node bridge.mjs"
  }
}
`;

  const startWindows = `@echo off
chcp 65001 >nul
title Klypex Servidor Local
cd /d "%~dp0"
if not exist "%~dp0bin" mkdir "%~dp0bin"

where node >nul 2>nul
if errorlevel 1 (
  where python >nul 2>nul
  if errorlevel 1 (
    echo [Error] No se encontro Node.js ni Python en tu PC.
    echo Descarga Node.js gratis desde https://nodejs.org, instalalo y vuelve a abrir este archivo.
    pause
    exit /b 1
  )
)

start "" /min powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "%~dp0puente-tray.ps1"
exit /b 0
`;

  const trayPs1 = `$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$logFile = Join-Path $scriptDir 'bridge.log'
$bridgeMjs = Join-Path $scriptDir 'bridge.mjs'
$bridgePy = Join-Path $scriptDir 'bridge.py'

# Comprobar si ya está encendido para no duplicarlo
$alreadyRunning = $false
try {
  $resp = Invoke-WebRequest -Uri 'http://127.0.0.1:${port}/health' -TimeoutSec 2 -UseBasicParsing
  if ($resp.StatusCode -eq 200) { $alreadyRunning = $true }
} catch {}

# Dibujar icono de bandeja Klypex en memoria
$bmp = New-Object System.Drawing.Bitmap(16, 16)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$brushBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(225, 29, 72))
$g.FillEllipse($brushBg, 1, 1, 14, 14)
$brushWhite = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$pts = [System.Drawing.Point[]]@(
  (New-Object System.Drawing.Point(6, 4)),
  (New-Object System.Drawing.Point(12, 8)),
  (New-Object System.Drawing.Point(6, 12))
)
$g.FillPolygon($brushWhite, $pts)
$g.Dispose()

$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$notifyIcon.Icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
$notifyIcon.Text = 'Klypex - Activo en segundo plano (${port})'
$notifyIcon.Visible = $true

if ($alreadyRunning) {
  $notifyIcon.BalloonTipTitle = 'Klypex'
  $notifyIcon.BalloonTipText = 'Klypex ya se encuentra activo en segundo plano (iconos ocultos).'
  $notifyIcon.ShowBalloonTip(3000)
  Start-Sleep -Seconds 3
  $notifyIcon.Visible = $false
  $notifyIcon.Dispose()
  exit
}

$script:serverProc = $null

function Start-KlypexServer {
  if ($script:serverProc -and -not $script:serverProc.HasExited) { return }
  $hasNode = [bool](Get-Command node -ErrorAction SilentlyContinue)
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  if ($hasNode) {
    $psi.FileName = 'node'
    $psi.Arguments = "\`"$bridgeMjs\`""
  } else {
    $psi.FileName = 'python'
    $psi.Arguments = "\`"$bridgePy\`""
  }
  $psi.WorkingDirectory = $scriptDir
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $psi.EnvironmentVariables['KLYPEX_LOG_FILE'] = $logFile
  $script:serverProc = [System.Diagnostics.Process]::Start($psi)
}

function Stop-KlypexServer {
  if ($script:serverProc -and -not $script:serverProc.HasExited) {
    try { & taskkill /PID $script:serverProc.Id /T /F | Out-Null } catch {}
    try { $script:serverProc.Kill() } catch {}
  }
}

Start-KlypexServer

$menu = New-Object System.Windows.Forms.ContextMenuStrip
$statusItem = $menu.Items.Add('Klypex activo en segundo plano')
$statusItem.Enabled = $false
$menu.Items.Add('-') | Out-Null

$logItem = $menu.Items.Add('Ver registro (bridge.log)')
$logItem.Add_Click({
  if (Test-Path $logFile) {
    Start-Process notepad.exe "\`"$logFile\`""
  }
})

$restartItem = $menu.Items.Add('Reiniciar Klypex')
$restartItem.Add_Click({
  Stop-KlypexServer
  Start-Sleep -Milliseconds 400
  Start-KlypexServer
  $notifyIcon.BalloonTipTitle = 'Klypex'
  $notifyIcon.BalloonTipText = 'Servidor reiniciado correctamente.'
  $notifyIcon.ShowBalloonTip(2500)
})

$exitItem = $menu.Items.Add('Detener y salir')
$exitItem.Add_Click({
  Stop-KlypexServer
  $notifyIcon.Visible = $false
  $notifyIcon.Dispose()
  [System.Windows.Forms.Application]::Exit()
})

$notifyIcon.ContextMenuStrip = $menu
$notifyIcon.Add_MouseClick({
  param($sender, $e)
  if ($e.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
    $notifyIcon.BalloonTipTitle = 'Klypex'
    $notifyIcon.BalloonTipText = 'Activo en segundo plano. Clic derecho aqui para reiniciar o salir.'
    $notifyIcon.ShowBalloonTip(2500)
  }
})

$notifyIcon.BalloonTipTitle = 'Klypex'
$notifyIcon.BalloonTipText = 'Activo en iconos ocultos. Ya puedes cerrar ventanas y descargar.'
$notifyIcon.ShowBalloonTip(3500)

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 5000
$timer.Add_Tick({
  if ($script:serverProc -and $script:serverProc.HasExited) {
    $statusItem.Text = 'Klypex detenido (clic en Reiniciar)'
    $notifyIcon.Text = 'Klypex - Detenido'
  } else {
    $statusItem.Text = 'Klypex activo en segundo plano'
    $notifyIcon.Text = 'Klypex - Activo en segundo plano (${port})'
  }
})
$timer.Start()

[System.Windows.Forms.Application]::Run()
`;

  const startUnix = `#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p bin
export PATH="$(pwd)/bin:$PATH"

if ! command -v yt-dlp >/dev/null 2>&1; then
  echo "Aviso: yt-dlp no esta en PATH. Instalalo con: brew install yt-dlp ffmpeg (macOS) o sudo apt install yt-dlp ffmpeg (Linux)"
fi

if command -v node >/dev/null 2>&1; then
  echo "Iniciando puente con Node.js en http://127.0.0.1:${port} ..."
  exec node bridge.mjs
elif command -v python3 >/dev/null 2>&1; then
  echo "Node.js no detectado; iniciando puente con Python 3 en http://127.0.0.1:${port} ..."
  exec python3 bridge.py
else
  echo "Error: Instala Node.js (https://nodejs.org) o Python 3 para iniciar el puente."
  exit 1
fi
`;

  return [
    {
      path: 'puente-local/bridge.mjs',
      content: bridgeMjs,
      language: 'javascript',
      description: 'Servidor local Node.js con soporte MP4 H.264, MP3 con carátula ID3v2.3 y registro automático.',
    },
    {
      path: 'puente-local/bridge.py',
      content: bridgePy,
      language: 'shell',
      description: 'Alternativa equivalente en Python 3 estándar con H.264/AAC y progreso en vivo.',
    },
    {
      path: 'puente-local/package.json',
      content: packageJson,
      language: 'json',
      description: 'Manifiesto Node.js ESM para ejecutar el servidor local.',
    },
    {
      path: 'puente-local/iniciar-windows.bat',
      content: startWindows,
      language: 'shell',
      description: 'Lanzador silencioso para Windows 10/11: oculta la terminal y deja Klypex en los iconos ocultos.',
    },
    {
      path: 'puente-local/puente-tray.ps1',
      content: trayPs1,
      language: 'shell',
      description: 'Controlador de bandeja del sistema de Windows (iconos ocultos) para iniciar, reiniciar o salir.',
    },
    {
      path: 'puente-local/iniciar-mac-linux.sh',
      content: startUnix,
      language: 'shell',
      description: 'Script de inicio para macOS y Linux.',
    },
  ];
}
