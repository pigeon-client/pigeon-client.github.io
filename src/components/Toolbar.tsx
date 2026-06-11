import { useState, useRef, useEffect } from 'react';
import { useTabStore } from '../store/tabStore';
import { useEnvStore } from '../store/envStore';
import { Plus, X, Settings, Globe } from 'lucide-react';

interface ToolbarProps {
  onOpenEnv: () => void;
  onOpenSettings: () => void;
}

export function Toolbar({ onOpenEnv: _onOpenEnv, onOpenSettings }: ToolbarProps) {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const closeTab = useTabStore((s) => s.closeTab);
  const addTab = useTabStore((s) => s.addTab);
  const setTabName = useTabStore((s) => s.setTabName);
  const environments = useEnvStore((s) => s.environments);
  const activeEnv = useEnvStore((s) => s.activeEnv);
  const setActiveEnv = useEnvStore((s) => s.setActiveEnv);

  const [editingId, setEditingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const stopEditing = () => setEditingId(null);

  return (
    <div className="flex items-center h-10 px-3 bg-bg-tertiary shrink-0 select-none gap-2">
      {/* Left: Brand */}
      <div className="flex items-center gap-1.5 shrink-0 pr-2">
        <svg
          width="20"
          height="20"
          viewBox="-2 8 74 56"
          preserveAspectRatio="xMidYMid meet"
          fill="#ff6c37"
          className="shrink-0"
        >
          <path d="M70.3903427,53.2526093l-4.3100586-4.0800781l3.6799316-3.7299805   c0.615509-0.6375084,0.1758194-1.7001953-0.7199707-1.7001953h-3.6999512l1.1099854-5.1098633   c0.178154-0.8692818-0.7422409-1.5009804-1.4801025-1.0800781l-5.6298828,3.2299805   c-4.7437592,2.7238312-9.4159889,2.3334999-9.7299805,2.3701172c4.8898926-3.6899414,5.5499268-8.1401367,5.6098633-9.8701172   c5.6900635-2.989748,5.3901367-9.3598652,5.130127-11.4199238c3.8299561-3.0400391,3.7399902-7.3701162,3.1298828-9.2998037   c-0.2168961-0.6734962-0.9864044-0.8966436-1.5299072-0.5200195c-2.6773682,1.8710938-6.3294678,3.1782227-9.5716553,4.0541983   c-0.1427002-0.5644522-0.3127441-1.0898428-0.498291-1.5444326c2.8299561-3.6401367,1.789917-7.6000981,0.7999268-9.2397461   c-0.3584099-0.5907469-1.179245-0.6422362-1.6099854-0.1503906c-2.6799316,3.0302739-7.1199951,5.5302739-10.3699951,7.1000981   c-4.8299561,2.340332-8.2600098,6.5703115-9.4100342,11.6201162c-0.3399658,1.5-0.5999756,3.0600586-0.7900391,4.6000977   c-2.8295307-2.1624737-5.2085838-3.912674-8.6899414-3.0200195c-4.0087891,1.0219727-5.1831055,4.3476563-5.5223389,6.3007813   l-4.4073477,4.9936543L7.1602407,34.392746c-1.6701946-0.8352776-3.5894344-0.0632744-4.3599854,1.4399414   c-7.0623417,14.1049232-4.6265821,9.2400932-5.1535645,10.2924805c-0.8021483,1.6002541-0.150368,3.5492744,1.451172,4.3515625   l16.9956055,8.5214844c1.5943737,0.797184,3.5454655,0.1564713,4.3486328-1.4443359l2.6376953-5.2612305   c0.7045898,0.8295898,1.4752197,1.5844727,2.3504639,2.2197266c6.9699707,5.0703125,17.3900146,2.3598633,21.5499268,0.9501953   c1.630127-0.5400391,3.3500977-0.5297852,4.8400879,0.0498047c5.4099121,2.0800781,12.0100098,7.3803711,12.0700684,7.4301758   c0.756012,0.5966454,1.7721634-0.058754,1.619873-0.9501953l-1.0699463-5.8095703l5.4799805-1.2304688   C70.6671295,54.7861748,70.9766541,53.8386421,70.3903427,53.2526093z" />
          <circle cx="24.1330185" cy="31.6959667" r="1.6875" />
        </svg>
        <span className="text-xs font-medium text-text-secondary hidden sm:inline">Pigeon</span>
      </div>

      {/* Center: Tabs */}
      <div className="flex items-center flex-1 overflow-x-auto gap-0 min-w-0">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            onMouseDown={(e) => { if (e.button === 1) closeTab(tab.id); }}
            className={`group relative flex items-center gap-1.5 px-2 h-8 text-xs font-medium
              rounded-t-md cursor-pointer select-none shrink-0 max-w-[160px] transition-colors
              ${activeTabId === tab.id
                ? 'bg-bg-secondary text-text-primary'
                : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-hover'
              }`}
          >
            {/* Status dot */}
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              tab.isLoading ? 'bg-accent-orange' :
              !tab.response ? 'opacity-0' :
              tab.response.status >= 200 && tab.response.status < 300 ? 'bg-accent-green' : 'bg-accent-red'
            }`} />

            {/* Name */}
            {editingId === tab.id ? (
              <input
                ref={inputRef}
                value={tab.name}
                onChange={(e) => setTabName(tab.id, e.target.value)}
                onBlur={stopEditing}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') stopEditing();
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-transparent border-none outline-none text-xs font-medium text-inherit min-w-0 truncate cursor-text"
              />
            ) : (
              <span
                onDoubleClick={(e) => { e.stopPropagation(); setEditingId(tab.id); }}
                className="flex-1 text-xs font-medium text-inherit min-w-0 truncate"
              >
                {tab.name}
              </span>
            )}

            {/* Close */}
            <button
              onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded cursor-pointer
                text-text-tertiary hover:text-text-primary transition-all shrink-0"
            >
              <X size={11} />
            </button>
          </div>
        ))}

        {/* New tab */}
        <button
          onClick={() => addTab()}
          className="flex items-center justify-center w-7 h-7 rounded cursor-pointer
            text-text-tertiary hover:text-text-secondary hover:bg-bg-hover transition-colors shrink-0 ml-0.5"
          title="New Tab"
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Right: Env + Settings */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Environment selector */}
        <div className="relative">
          <select
            value={activeEnv?.id ?? ''}
            onChange={(e) => {
              const id = e.target.value;
              if (id === '') {
                setActiveEnv(null);
              } else {
                const env = environments.find((env) => String(env.id) === id);
                setActiveEnv(env ?? null);
              }
            }}
              className="appearance-none pl-2 pr-6 py-1 text-xs bg-bg-hover text-text-primary
                border border-border-primary rounded-md cursor-pointer max-w-[160px] truncate focus-ring"
          >
            <option value="">No Environment</option>
            {environments.map((env) => (
              <option key={env.id} value={env.id}>{env.name}</option>
            ))}
          </select>
          <Globe size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-tertiary" />
        </div>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="btn-icon"
          title="Settings"
        >
          <Settings size={16} />
        </button>
      </div>
    </div>
  );
}
