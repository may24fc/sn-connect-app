'use client';

/**
 * Static, non-animated hero background texture for subpage heroes.
 * Sits behind the hero content (negative z-index inside the hero's
 * stacking context) and never intercepts pointer events.
 */

type HeroBackdropVariant = 'grid' | 'rings' | 'dots' | 'beams';

const TICK = 'hidden md:block absolute button-mono text-lg text-[#0c1d2e]/20';

export default function HeroBackdrop({ variant }: { variant: HeroBackdropVariant }) {
  return (
    <div
      className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none"
      aria-hidden
      id={`hero-backdrop-${variant}`}
    >
      {variant === 'grid' && (
        <>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(rgba(12,29,46,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(12,29,46,0.05) 1px, transparent 1px)',
              backgroundSize: '56px 56px',
              maskImage:
                'radial-gradient(ellipse 100% 100% at 55% 40%, black 35%, transparent 100%)',
              WebkitMaskImage:
                'radial-gradient(ellipse 100% 100% at 55% 40%, black 35%, transparent 100%)',
            }}
          />
          <div className="absolute -top-40 right-[-6%] w-[480px] h-[480px] rounded-full bg-[#3b86d2]/[0.14] blur-[130px]" />
          <span className={`${TICK} top-[22%] right-[14%]`}>+</span>
          <span className={`${TICK} bottom-[18%] left-[34%]`}>+</span>
        </>
      )}

      {variant === 'rings' && (
        <>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(rgba(12,29,46,0.07) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
              maskImage:
                'radial-gradient(ellipse 110% 110% at 65% 45%, black 25%, transparent 100%)',
              WebkitMaskImage:
                'radial-gradient(ellipse 110% 110% at 65% 45%, black 25%, transparent 100%)',
            }}
          />
          <div className="hidden md:block absolute top-[-300px] right-[-220px] w-[660px] h-[660px]">
            <span className="absolute inset-0 rounded-full border border-[#0c1d2e]/[0.07]" />
            <span className="absolute inset-[95px] rounded-full border border-[#0c1d2e]/[0.08]" />
            <span className="absolute inset-[190px] rounded-full border border-[#0c1d2e]/[0.09]" />
            <span className="absolute inset-[285px] rounded-full border border-[#3b86d2]/[0.14]" />
          </div>
          <div className="absolute bottom-[-30%] left-[-8%] w-[440px] h-[440px] rounded-full bg-white/40 blur-[120px]" />
        </>
      )}

      {variant === 'dots' && (
        <>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(rgba(12,29,46,0.09) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              maskImage:
                'radial-gradient(ellipse 100% 100% at 50% 45%, black 30%, transparent 100%)',
              WebkitMaskImage:
                'radial-gradient(ellipse 100% 100% at 50% 45%, black 30%, transparent 100%)',
            }}
          />
          <div className="absolute -top-32 right-[-4%] w-[460px] h-[460px] rounded-full bg-[#a1c6e7]/50 blur-[120px]" />
          <div className="absolute bottom-[-25%] left-[-6%] w-[380px] h-[380px] rounded-full bg-white/40 blur-[110px]" />
          <span className={`${TICK} top-[18%] left-[46%]`}>+</span>
          <span className={`${TICK} bottom-[22%] right-[10%]`}>+</span>
        </>
      )}

      {variant === 'beams' && (
        <>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'repeating-linear-gradient(135deg, rgba(12,29,46,0.05) 0 1px, transparent 1px 64px)',
              maskImage:
                'radial-gradient(ellipse 110% 100% at 60% 40%, black 30%, transparent 100%)',
              WebkitMaskImage:
                'radial-gradient(ellipse 110% 100% at 60% 40%, black 30%, transparent 100%)',
            }}
          />
          <div className="absolute -top-36 right-[-6%] w-[460px] h-[460px] rounded-full bg-[#3b86d2]/[0.13] blur-[125px]" />
          <div className="absolute bottom-[-28%] left-[-6%] w-[380px] h-[380px] rounded-full bg-white/40 blur-[110px]" />
          <span className={`${TICK} top-[24%] left-[40%]`}>+</span>
          <span className={`${TICK} bottom-[16%] right-[18%]`}>+</span>
        </>
      )}
    </div>
  );
}
