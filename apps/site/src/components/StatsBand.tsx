interface Stat {
  num: string;
  lbl: string;
  star?: boolean;
}

const STATS: Stat[] = [
  { num: "$0", lbl: "forever, no tiers" },
  { num: "0", lbl: "accounts required" },
  { num: "fast", lbl: "request engine" },
  { num: "100%", lbl: "local, no cloud" },
  { num: "MIT", lbl: "open source" },
  { num: "∞", lbl: "requests stored" },
  { num: "Rust", lbl: "native core" },
  { num: "0kb", lbl: "telemetry sent" },
];

function Group() {
  return (
    <div className="marquee-group" aria-hidden="true">
      {STATS.map((s) => (
        <div className="stat" key={s.lbl}>
          {s.star ? <span className="star">★</span> : null}
          <span className="num">{s.num}</span>
          <span className="lbl">{s.lbl}</span>
        </div>
      ))}
    </div>
  );
}

export function StatsBand() {
  return (
    <section className="stats-band">
      <div className="marquee">
        <Group />
        <Group />
      </div>
    </section>
  );
}
