interface SegmentedControlProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SegmentedControl({ options, value, onChange, className = '' }: SegmentedControlProps) {
  return (
    <div className={`segmented-control ${className}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`segmented-option ${value === opt.value ? 'segmented-active' : 'segmented-inactive'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
