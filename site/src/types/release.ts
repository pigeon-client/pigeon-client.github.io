export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  label?: string;
}

export interface Release {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  assets: ReleaseAsset[];
}

export interface ParsedRelease {
  version: string;
  notes: string;
  publishedAt: string;
  assets: PlatformAsset[];
}

export interface PlatformAsset {
  platform: 'darwin-arm64' | 'darwin-x64' | 'windows' | 'linux';
  name: string;
  downloadUrl: string;
  size?: number;
}