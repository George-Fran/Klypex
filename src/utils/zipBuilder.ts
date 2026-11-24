import JSZip from 'jszip';
import { ExtensionConfig } from '../types/extension';
import { generateBridgeFiles } from './bridgeTemplates';
import { generateExtensionFiles, getAccentPreset } from './extensionTemplates';
import { generateExtensionIconPng } from './iconGenerator';

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function downloadExtensionZip(config: ExtensionConfig): Promise<string> {
  const zip = new JSZip();
  const files = generateExtensionFiles(config);
  const accent = getAccentPreset(config.accentColor);

  for (const file of files) {
    zip.file(file.path, file.content);
  }

  const [icon16, icon48, icon128] = await Promise.all([
    generateExtensionIconPng(16, accent.hex),
    generateExtensionIconPng(48, accent.hex),
    generateExtensionIconPng(128, accent.hex),
  ]);

  zip.file('icons/icon16.png', icon16);
  zip.file('icons/icon48.png', icon48);
  zip.file('icons/icon128.png', icon128);

  const blob = await zip.generateAsync({ type: 'blob' });
  const slug = config.browser === 'firefox' ? 'firefox' : 'chrome';
  const filename = `klypex-${slug}-v1.7.zip`;
  triggerBlobDownload(blob, filename);
  return filename;
}

export async function downloadBridgeZip(): Promise<string> {
  const zip = new JSZip();
  const bridgeFiles = generateBridgeFiles();

  for (const file of bridgeFiles) {
    const relativePath = file.path.replace(/^puente-local\//, '');
    zip.file(relativePath, file.content);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const filename = 'mediadrop-puente-local.zip';
  triggerBlobDownload(blob, filename);
  return filename;
}
