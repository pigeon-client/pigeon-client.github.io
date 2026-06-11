import { PlatformAsset } from '../types/release';

/**
 * Parse release data (imported at build time from release.json)
 */
export function parseRelease(release: { tag_name: string; body: string; published_at: string; assets: { name: string; browser_download_url: string }[] }): {
  version: string;
  notes: string;
  publishedAt: string;
  assets: PlatformAsset[];
} {
  const assets: PlatformAsset[] = [];

  for (const asset of release.assets) {
    const name = asset.name.toLowerCase();

    if (name.includes('darwin') && name.includes('aarch64') || name.includes('darwin') && name.includes('arm64')) {
      assets.push({
        platform: 'darwin-arm64',
        name: asset.name,
        downloadUrl: asset.browser_download_url,
      });
    } else if (name.includes('darwin') && (name.includes('x64') || name.includes('x86_64') || name.includes('intel'))) {
      assets.push({
        platform: 'darwin-x64',
        name: asset.name,
        downloadUrl: asset.browser_download_url,
      });
    } else if (name.includes('windows') || name.includes('win') || name.includes('.exe') || name.includes('.msi')) {
      assets.push({
        platform: 'windows',
        name: asset.name,
        downloadUrl: asset.browser_download_url,
      });
    } else if (name.includes('linux') || name.includes('.appimage') || name.includes('.deb')) {
      assets.push({
        platform: 'linux',
        name: asset.name,
        downloadUrl: asset.browser_download_url,
      });
    }
  }

  return {
    version: release.tag_name.replace(/^v/, ''),
    notes: release.body || '',
    publishedAt: release.published_at,
    assets,
  };
}

/**
 * Detect user's OS from browser platform
 */
export function detectOS(): 'darwin-arm64' | 'darwin-x64' | 'windows' | 'linux' {
  const platform = navigator.platform.toLowerCase();

  if (platform.includes('mac')) {
    // Check if it's Apple Silicon (ARM64) or Intel
    // navigator.platform no longer reliably区分 ARM vs Intel in modern browsers
    // We'll check userAgent for CPU type hint
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('arm') || ua.includes('aarch64')) {
      return 'darwin-arm64';
    }
    // Default to x64 for macOS (most common, universal binary may work)
    return 'darwin-x64';
  }
  if (platform.includes('win')) return 'windows';
  if (platform.includes('linux')) return 'linux';

  return 'darwin-x64'; // safe fallback
}

export const PLATFORM_LABELS: Record<PlatformAsset['platform'], string> = {
  'darwin-arm64': 'macOS (Apple Silicon)',
  'darwin-x64': 'macOS (Intel)',
  'windows': 'Windows',
  'linux': 'Linux',
};

export const PLATFORM_ICONS: Record<PlatformAsset['platform'], string> = {
  'darwin-arm64': '🍎',
  'darwin-x64': '🍎',
  'windows': '🪟',
  'linux': '🐧',
};