import { PlatformAsset } from '../types/release';

interface PlatformCardProps {
  asset: PlatformAsset;
  isActive?: boolean;
  onClick: () => void;
}

export function PlatformCard({ asset, isActive, onClick }: PlatformCardProps) {
  const labels: Record<PlatformAsset['platform'], string> = {
    'darwin-arm64': 'macOS (ARM64)',
    'darwin-x64': 'macOS (x86_64)',
    'windows': 'Windows',
    'linux': 'Linux',
  };

  const icons: Record<PlatformAsset['platform'], string> = {
    'darwin-arm64': '🍎',
    'darwin-x64': '🍎',
    'windows': '🪟',
    'linux': '🐧',
  };

  return (
    <button
      className={`platform-card ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <span className="platform-icon">{icons[asset.platform]}</span>
      <span className="platform-name">{labels[asset.platform]}</span>
    </button>
  );
}