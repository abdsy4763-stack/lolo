import React, { useRef } from 'react';
import { motion, useInView } from 'motion/react';

export type MotherMood = 'denying' | 'smiling' | 'givingCookie' | 'thinking' | 'compromise' | 'celebrating';

interface MotherCharacterProps {
  mood?: MotherMood;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const MotherCharacter: React.FC<MotherCharacterProps> = ({
  mood = 'denying',
  size = 'md',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, margin: '50px' });

  const sizeClasses = {
    sm: 'w-24 h-28',
    md: 'w-36 h-44 md:w-44 md:h-52',
    lg: 'w-52 h-60',
  };

  const isSmiling = mood === 'smiling' || mood === 'givingCookie' || mood === 'compromise' || mood === 'celebrating';
  const hasCookie = mood === 'givingCookie';
  const isThinking = mood === 'thinking';
  const isCompromise = mood === 'compromise';
  const isCelebrating = mood === 'celebrating';

  const headRotation = isThinking ? -8 : isCompromise ? 5 : 0;

  return (
    <div ref={containerRef} className={`relative flex flex-col items-center select-none ${className}`}>
      <motion.div
        animate={
          isInView
            ? isThinking
              ? { rotate: [-6, -10, -6], y: [0, -2, 0] }
              : isCelebrating
              ? { y: [0, -8, 0], scale: [1, 1.04, 1] }
              : { y: [0, -3, 0] }
            : { y: 0, rotate: 0, scale: 1 } // إيقاف الحركة إذا كان المكون خارج الشاشة
        }
        transition={{
          duration: isCelebrating ? 0.8 : isThinking ? 2.5 : 3.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={`${sizeClasses[size]}`}
      >
        <svg viewBox="0 0 200 240" className="w-full h-full drop-shadow-md overflow-visible">
          <defs>
            <radialGradient id="mom_fur" cx="50%" cy="40%" r="50%">
              <stop offset="0%" stopColor="#FCD34D" />
              <stop offset="100%" stopColor="#D97706" />
            </radialGradient>
            <linearGradient id="mom_dress" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          <ellipse cx="100" cy="230" rx="55" ry="10" fill="#047857" opacity="0.2" />
          <path d="M 65 150 C 60 210, 50 225, 50 225 L 150 225 C 150 225, 140 210, 135 150 Z" fill="url(#mom_dress)" />
          <path d="M 85 150 Q 100 162 115 150" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" fill="none" />
          
          <g transform={`rotate(${headRotation} 100 95)`}>
            <circle cx="100" cy="95" r="48" fill="url(#mom_fur)" />
            <circle cx="65" cy="58" r="16" fill="#D97706" />
            <circle cx="65" cy="58" r="9" fill="#F43F5E" opacity="0.75" />
            <circle cx="135" cy="58" r="16" fill="#D97706" />
            <circle cx="135" cy="58" r="9" fill="#F43F5E" opacity="0.75" />
            
            <g transform="translate(136, 52) scale(0.8)">
              <circle cx="-6" cy="0" r="5" fill="#F43F5E" />
              <circle cx="6" cy="0" r="5" fill="#F43F5E" />
              <circle cx="0" cy="-6" r="5" fill="#F43F5E" />
              <circle cx="0" cy="6" r="5" fill="#F43F5E" />
              <circle cx="0" cy="0" r="4" fill="#FDE047" />
            </g>
            
            <ellipse cx="70" cy="108" rx="10" ry="7" fill="#FB7185" opacity="0.7" />
            <ellipse cx="130" cy="108" rx="10" ry="7" fill="#FB7185" opacity="0.7" />
            
            {isSmiling ? (
              <g stroke="#78350F" strokeWidth="3.5" strokeLinecap="round" fill="none">
                <path d="M 75 92 Q 83 83 91 92" />
                <path d="M 109 92 Q 117 83 125 92" />
              </g>
            ) : isThinking ? (
              <g>
                <ellipse cx="83" cy="88" rx="6.5" ry="8" fill="#1E293B" />
                <circle cx="84" cy="85" r="2.5" fill="#FFFFFF" />
                <ellipse cx="117" cy="88" rx="6.5" ry="8" fill="#1E293B" />
                <circle cx="118" cy="85" r="2.5" fill="#FFFFFF" />
                <path d="M 77 78 Q 84 74 91 79" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M 109 79 Q 116 74 123 78" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </g>
            ) : (
              <g>
                <ellipse cx="83" cy="90" rx="6" ry="8" fill="#1E293B" />
                <circle cx="81" cy="88" r="2.5" fill="#FFFFFF" />
                <ellipse cx="117" cy="90" rx="6" ry="8" fill="#1E293B" />
                <circle cx="115" cy="88" r="2.5" fill="#FFFFFF" />
                <path d="M 77 81 Q 84 78 91 81" stroke="#78350F" strokeWidth="2" strokeLinecap="round" fill="none" />
                <path d="M 109 81 Q 116 78 123 81" stroke="#78350F" strokeWidth="2" strokeLinecap="round" fill="none" />
              </g>
            )}
            
            <ellipse cx="100" cy="108" rx="18" ry="12" fill="#FEF3C7" />
            <path d="M 94 102 Q 100 98 106 102 Q 100 110 94 102 Z" fill="#991B1B" />
            
            {isSmiling ? (
              <path d="M 92 112 Q 100 122 108 112" stroke="#78350F" strokeWidth="3" strokeLinecap="round" fill="#F43F5E" />
            ) : isThinking ? null : (
              <path d="M 94 112 Q 100 116 106 112" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            )}
          </g>
          
          {hasCookie ? (
            <motion.g
              animate={isInView ? { y: [0, -4, 0] } : { y: 0 }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ellipse cx="100" cy="165" rx="16" ry="12" fill="#FCD34D" stroke="#D97706" strokeWidth="2" />
              <circle cx="100" cy="165" r="18" fill="#D97706" stroke="#92400E" strokeWidth="2.5" />
              <circle cx="95" cy="160" r="3" fill="#451A03" />
              <circle cx="106" cy="162" r="3.5" fill="#451A03" />
              <circle cx="98" cy="172" r="3" fill="#451A03" />
            </motion.g>
          ) : isThinking ? (
            <g>
              <circle cx="75" cy="160" r="11" fill="#FCD34D" stroke="#D97706" strokeWidth="2" />
              <ellipse cx="112" cy="135" rx="10" ry="8" fill="#FCD34D" stroke="#D97706" strokeWidth="2" transform="rotate(-20 112 135)" />
            </g>
          ) : isCelebrating ? (
            <motion.g
              animate={isInView ? { y: [0, -4, 0] } : { y: 0 }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <circle cx="68" cy="138" r="12" fill="#FCD34D" stroke="#D97706" strokeWidth="2" />
              <circle cx="132" cy="138" r="12" fill="#FCD34D" stroke="#D97706" strokeWidth="2" />
            </motion.g>
          ) : (
            <g>
              <circle cx="80" cy="160" r="12" fill="#FCD34D" stroke="#D97706" strokeWidth="2" />
              <circle cx="120" cy="160" r="12" fill="#FCD34D" stroke="#D97706" strokeWidth="2" />
            </g>
          )}
        </svg>
      </motion.div>
    </div>
  );
};