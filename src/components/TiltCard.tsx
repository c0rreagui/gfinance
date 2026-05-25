'use client';

import React, { useRef, useState } from 'react';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const TiltCard: React.FC<TiltCardProps> = ({ children, className = '', style = {} }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [transformStyle, setTransformStyle] = useState<React.CSSProperties>({});

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const x = (e.clientX - left) / width;
    const y = (e.clientY - top) / height;
    
    // Rotate card slightly towards mouse position
    const rotateX = (y - 0.5) * -12; // max 6 degrees X
    const rotateY = (x - 0.5) * 12;  // max 6 degrees Y
    
    setTransformStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
    });
  };

  const handleMouseLeave = () => {
    setTransformStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)',
    });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`tilt-card transition-transform duration-100 ease-out ${className}`}
      style={{ ...style, ...transformStyle }}
    >
      <div className="tilt-card-inner">
        {children}
      </div>
    </div>
  );
};
