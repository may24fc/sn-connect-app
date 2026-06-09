'use client';

export default function SectionGlass() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
      {/* Strip 1 — white, far left */}
      <div
        className="absolute top-[-10%] left-[4%] w-[200px] h-[130%] blur-[64px]"
        style={{
          background:
            'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.55) 38%, rgba(255,255,255,0.42) 62%, transparent 100%)',
          transform: 'rotate(3deg)',
        }}
      />

      {/* Strip 2 — soft palette blue, left-center */}
      <div
        className="absolute top-[-5%] left-[23%] w-[130px] h-[120%] blur-[56px]"
        style={{
          background:
            'linear-gradient(180deg, transparent 0%, rgba(161,198,231,0.45) 35%, rgba(161,198,231,0.32) 65%, transparent 100%)',
          transform: 'rotate(-1.5deg)',
        }}
      />

      {/* Strip 3 — white, center, widest */}
      <div
        className="absolute top-[-8%] left-[43%] w-[240px] h-[125%] blur-[72px]"
        style={{
          background:
            'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.48) 28%, rgba(214,228,240,0.35) 55%, rgba(255,255,255,0.28) 80%, transparent 100%)',
          transform: 'rotate(2deg)',
        }}
      />

      {/* Strip 4 — muted blue, right-center */}
      <div
        className="absolute top-[5%] left-[65%] w-[110px] h-[110%] blur-[52px]"
        style={{
          background:
            'linear-gradient(180deg, transparent 0%, rgba(107,164,219,0.30) 40%, rgba(161,198,231,0.22) 65%, transparent 100%)',
          transform: 'rotate(-2.5deg)',
        }}
      />

      {/* Strip 5 — white, far right */}
      <div
        className="absolute top-[-12%] right-[5%] w-[170px] h-[135%] blur-[64px]"
        style={{
          background:
            'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.40) 45%, rgba(255,255,255,0.28) 70%, transparent 100%)',
          transform: 'rotate(1.5deg)',
        }}
      />

      {/* Ambient wash — wide soft glow anchoring mid-section */}
      <div
        className="absolute top-[15%] left-[-5%] w-[110%] h-[600px] blur-[90px]"
        style={{
          background:
            'radial-gradient(ellipse 80% 100% at 50% 50%, rgba(255,255,255,0.28) 0%, transparent 70%)',
        }}
      />
    </div>
  );
}
