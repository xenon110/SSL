"use client";

import React, { useState, useEffect, CSSProperties } from 'react';

export interface BackgroundSceneProps {
  /** Number of animated light beams */
  beamCount?: number;
}

const BACKGROUND_BEAM_COUNT = 60;

const BackgroundScene: React.FC<BackgroundSceneProps> = ({
  beamCount = BACKGROUND_BEAM_COUNT,
}) => {
  const [beams, setBeams] = useState<
    Array<{ id: number; style: CSSProperties }>
  >([]);

  useEffect(() => {
    const generated = Array.from({ length: beamCount }).map((_, i) => {
      const riseDur = Math.random() * 2 + 4;    // 4–6s rise
      const fadeDur = riseDur;                  // sync fade
      const dropDur = Math.random() * 3 + 3;    // 3–6s drop

      return {
        id: i,
        style: {
          left: `${Math.random() * 100}%`,
          width: `${Math.floor(Math.random() * 3) + 1}px`,
          animationDelay: `${Math.random() * 5}s`,
          animationDuration: `${riseDur}s, ${fadeDur}s, ${dropDur}s`,
          // Using inline style to bind the custom keyframes and background color
          animationName: 'rise, fade',
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
        },
      };
    });
    setBeams(generated);
  }, [beamCount]);

  return (
    <div 
      className="absolute inset-0 overflow-hidden pointer-events-none z-0" 
      style={{ backgroundColor: 'var(--bg-color)' }}
      role="img" 
      aria-label="Animated digital data background"
    >
      {/* Floor Glow */}
      <div 
        className="absolute bottom-0 w-full h-1/2 opacity-70"
        style={{
          background: 'radial-gradient(ellipse at bottom, var(--glow-color-1) 0%, transparent 60%)',
          animation: 'floorGlow 6s ease-in-out infinite'
        }}
      />
      
      {/* Main Column Glow */}
      <div 
        className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[30%] h-[70%]"
        style={{
          background: 'linear-gradient(to top, var(--glow-color-2), transparent)',
          animation: 'mainGlow 4s alternate infinite'
        }}
      />

      {/* Light Streams Container */}
      <div className="absolute inset-0">
        {beams.map((beam) => (
          <div 
            key={beam.id} 
            className="absolute bottom-0 h-full rounded-t-full shadow-[0_0_8px_var(--light-color)]" 
            style={{
              ...beam.style,
              backgroundColor: 'var(--light-color)',
            }} 
          />
        ))}
      </div>
    </div>
  );
}

export default BackgroundScene;
