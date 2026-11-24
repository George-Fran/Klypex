export type BrowserTarget = 'firefox' | 'chrome';

export type MediaFormat = 'mp4' | 'mp3';

export type VideoQuality = '2160' | '1080' | '720' | '480';

export type AudioBitrate = '320' | '192' | '128';

export type EngineMode = 'auto' | 'bridge' | 'cobalt' | 'direct';

export type AccentColorId = 'crimson' | 'indigo' | 'emerald' | 'slate';

export interface AccentPreset {
  id: AccentColorId;
  label: string;
  hex: string;
  hoverHex: string;
}

export interface ExtensionConfig {
  browser: BrowserTarget;
  extensionName: string;
  defaultFormat: MediaFormat;
  defaultVideoQuality: VideoQuality;
  defaultAudioBitrate: AudioBitrate;
  defaultEngine: EngineMode;
  bridgeUrl: string;
  cobaltUrl: string;
  accentColor: AccentColorId;
  includeBridgeInZip: boolean;
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: 'json' | 'html' | 'css' | 'javascript' | 'markdown' | 'shell';
  description: string;
}

export interface PlatformCapability {
  platform: string;
  formats: string;
  maxQuality: string;
  extractionMethod: string;
}
