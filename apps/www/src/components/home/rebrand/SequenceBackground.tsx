'use client';

import { ChromaFlow, FilmGrain, FlutedGlass, Shader, Swirl } from 'shaders/react';

export default function SequenceBackground() {
  return (
    <Shader className="absolute inset-0 w-full h-full" style={{ width: '100%', height: '100%' }}>
      {/* Base fluid animation — light blue tones from the homepage palette */}
      <Swirl colorA="#ffffff" colorB="#d6e4f0" detail={1.7} />

      {/* Color flow — palette blues layered for depth */}
      <ChromaFlow
        baseColor="#d6e4f0"
        downColor="#a1c6e7"
        leftColor="#6ba4db"
        rightColor="#a1c6e7"
        upColor="#ffffff"
        momentum={13}
        radius={3.5}
      />

      {/* Glass distortion for a premium fluid look */}
      <FlutedGlass
        aberration={0.61}
        angle={31}
        frequency={8}
        highlight={0.12}
        highlightSoftness={0}
        lightAngle={-90}
        refraction={4}
        shape="rounded"
        softness={1}
        speed={0.15}
      />

      {/* Subtle film grain for texture */}
      <FilmGrain strength={0.05} />
    </Shader>
  );
}
