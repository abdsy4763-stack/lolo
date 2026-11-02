import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { CompanionType, SHOP_ITEMS } from '../types';

export type CompanionMood = 'idle' | 'happy' | 'talking' | 'crying' | 'comforting' | 'hugging' | 'sleeping' | 'waving' | 'afraid';

interface CompanionCharacterProps {
  type?: CompanionType;
  mood?: CompanionMood;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  className?: string;
  onClick?: () => void;
  bubbleText?: string;
  accessory?: string | null; // الخاصية الجديدة للإكسسوار
}

export const COMPANIONS_DATA: Record<CompanionType, {
  title: string;
  defaultName: string;
  emoji: string;
  themeColor: string;
  bgGradient: string;
  desc: string;
  starsRequiredToUnlock: number;
}> = {
  lion: { title: 'الأسد الشجاع', defaultName: 'لؤلؤ', emoji: '🦁', themeColor: '#F59E0B', bgGradient: 'from-amber-400 to-orange-400', desc: 'صديقك الأول والمفضل!', starsRequiredToUnlock: 0 },
  bunny: { title: 'الأرنب اللطيف', defaultName: 'فستق', emoji: '🐰', themeColor: '#EC4899', bgGradient: 'from-pink-400 to-rose-400', desc: 'يحب القفز والمرح.', starsRequiredToUnlock: 0 },
  panda: { title: 'الباندا الهادئ', defaultName: 'بامبو', emoji: '🐼', themeColor: '#10B981', bgGradient: 'from-emerald-400 to-teal-500', desc: 'يعلمنا الاسترخاء والهدوء.', starsRequiredToUnlock: 0 },
  fox: { title: 'الثعلب الذكي', defaultName: 'ثعلوب', emoji: '🦊', themeColor: '#EA580C', bgGradient: 'from-orange-400 to-amber-500', desc: 'سريع البديهة ويحب التفكير.', starsRequiredToUnlock: 0 },
  elephant: { title: 'الفيل الحكيم', defaultName: 'فلفول', emoji: '🐘', themeColor: '#3B82F6', bgGradient: 'from-blue-400 to-sky-500', desc: 'ذاكرته قوية وقلبه كبير.', starsRequiredToUnlock: 0 },
  owl: { title: 'البومة الساهرة', defaultName: 'بسبوسة', emoji: '🦉', themeColor: '#8B5CF6', bgGradient: 'from-purple-400 to-indigo-500', desc: 'تحرسك في الليل دائماً.', starsRequiredToUnlock: 0 },
  dino: { title: 'الديناصور السحري', defaultName: 'دينو', emoji: '🦕', themeColor: '#14B8A6', bgGradient: 'from-teal-400 to-emerald-500', desc: 'صديق سري من العصر القديم!', starsRequiredToUnlock: 5 },
};

export const CompanionCharacter: React.FC<CompanionCharacterProps> = ({
  type = 'lion',
  mood = 'idle',
  size = 'md',
  className = '',
  onClick,
  bubbleText,
  accessory = null,
}) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, margin: '50px' });

  useEffect(() => {
    if (mood === 'sleeping' || !isInView) return;
    const interval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    }, 3600 + Math.random() * 2200);
    return () => clearInterval(interval);
  }, [mood, isInView]);

  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-44 h-44',
    lg: 'w-60 h-60',
    hero: 'w-72 h-72 md:w-80 md:h-80',
  };

  const isHappy = mood === 'happy';
  const isHugging = mood === 'hugging' || mood === 'comforting';
  const isSleeping = mood === 'sleeping';
  const isTalking = mood === 'talking';
  const isCrying = mood === 'crying';
  const isWaving = mood === 'waving';
  const isAfraid = mood === 'afraid';

  const renderEyes = () => {
    if (isAfraid) {
      return (
        <g>
          <ellipse cx="118" cy="132" rx="10" ry="13" fill="#1E293B" />
          <circle cx="115" cy="126" r="4.5" fill="#FFFFFF" />
          <ellipse cx="162" cy="132" rx="10" ry="13" fill="#1E293B" />
          <circle cx="159" cy="126" r="4.5" fill="#FFFFFF" />
          <path d="M 108 116 Q 118 122 128 119" stroke="#78350F" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M 152 119 Q 162 122 172 116" stroke="#78350F" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
      );
    }
    if (isSleeping) {
      return (
        <g stroke="#78350F" strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M 110 135 Q 120 144 130 135" />
          <path d="M 150 135 Q 160 144 170 135" />
        </g>
      );
    }
    if (isCrying) {
      return (
        <g>
          <ellipse cx="118" cy="135" rx="8" ry="10" fill="#78350F" />
          <ellipse cx="162" cy="135" rx="8" ry="10" fill="#78350F" />
          <motion.path animate={isInView ? { y: [0, 8, 14], opacity: [0.8, 1, 0] } : { opacity: 0 }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeIn' }} d="M 112 145 C 112 145, 110 152, 110 155 C 110 158, 114 158, 114 155 Z" fill="#38BDF8" />
          <motion.path animate={isInView ? { y: [0, 8, 14], opacity: [0.8, 1, 0] } : { opacity: 0 }} transition={{ duration: 1.4, delay: 0.5, repeat: Infinity, ease: 'easeIn' }} d="M 168 145 C 168 145, 166 152, 166 155 C 166 158, 170 158, 170 155 Z" fill="#38BDF8" />
        </g>
      );
    }
    if (isBlinking) {
      return (
        <g stroke="#1E293B" strokeWidth="4" strokeLinecap="round">
          <line x1="110" y1="135" x2="126" y2="135" />
          <line x1="154" y1="135" x2="170" y2="135" />
        </g>
      );
    }
    return (
      <g>
        <ellipse cx="118" cy="132" rx="9" ry="13" fill="#1E293B" />
        <circle cx="115" cy="127" r="4" fill="#FFFFFF" />
        <circle cx="121" cy="135" r="2" fill="#FFFFFF" />
        <ellipse cx="162" cy="132" rx="9" ry="13" fill="#1E293B" />
        <circle cx="159" cy="127" r="4" fill="#FFFFFF" />
        <circle cx="165" cy="135" r="2" fill="#FFFFFF" />
      </g>
    );
  };

  const renderMouth = () => {
    if (isTalking) {
      return <motion.ellipse animate={isInView ? { ry: [3, 7, 3] } : { ry: 3 }} transition={{ duration: 0.25, repeat: Infinity }} cx="140" cy="163" rx="6" ry="5" fill="#991B1B" />;
    }
    if (isHappy || isWaving) {
      return <path d="M 130 157 Q 140 172 150 157" stroke="#78350F" strokeWidth="4" strokeLinecap="round" fill="#F43F5E" />;
    }
    if (isCrying) {
      return <path d="M 133 164 Q 140 158 147 164" stroke="#78350F" strokeWidth="3.5" strokeLinecap="round" fill="none" />;
    }
    if (isAfraid) {
      return <ellipse cx="140" cy="162" rx="5" ry="6" fill="#78350F" />;
    }
    return <path d="M 132 158 Q 140 166 148 158" stroke="#78350F" strokeWidth="3.5" strokeLinecap="round" fill="none" />;
  };

  const renderArms = (bodyColor = '#FBBF24', strokeColor = '#D97706') => {
    if (isHugging) {
      return (
        <motion.g animate={isInView ? { scale: [1, 1.1, 1] } : { scale: 1 }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>
          <ellipse cx="90" cy="195" rx="22" ry="15" fill={bodyColor} stroke={strokeColor} strokeWidth="2.5" />
          <ellipse cx="190" cy="195" rx="22" ry="15" fill={bodyColor} stroke={strokeColor} strokeWidth="2.5" />
          <motion.path animate={isInView ? { y: [-5, -20], opacity: [0, 1, 0], scale: [0.8, 1.2] } : { opacity: 0 }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }} d="M 140 90 C 135 80, 125 80, 125 90 C 125 100, 140 110, 140 110 C 140 110, 155 100, 155 90 C 155 80, 145 80, 140 90 Z" fill="#F43F5E" />
        </motion.g>
      );
    }
    if (isWaving) {
      return (
        <g>
          <ellipse cx="112" cy="195" rx="14" ry="11" fill={bodyColor} stroke={strokeColor} strokeWidth="2" />
          <motion.g animate={isInView ? { rotate: [0, 30, -10, 25, 0] } : { rotate: 0 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }} style={{ transformOrigin: '175px 190px' }}>
            <ellipse cx="185" cy="170" rx="16" ry="12" fill={bodyColor} stroke={strokeColor} strokeWidth="2" />
          </motion.g>
        </g>
      );
    }
    return (
      <g>
        <ellipse cx="112" cy="195" rx="14" ry="11" fill={bodyColor} stroke={strokeColor} strokeWidth="2" />
        <ellipse cx="168" cy="195" rx="14" ry="11" fill={bodyColor} stroke={strokeColor} strokeWidth="2" />
      </g>
    );
  };

  const renderAccessory = () => {
    if (!accessory) return null;
    const item = SHOP_ITEMS.find(i => i.id === accessory);
    if (!item) return null;
    
    // رسم الإكسسوار باستخدام نصوص SVG كأيقونات للحفاظ على الأداء وبساطة الكود
    if (item.position === 'head') {
      return <text x="140" y="70" fontSize="60" textAnchor="middle" className="filter drop-shadow-md">{item.emoji}</text>;
    }
    if (item.position === 'eyes') {
      return <text x="140" y="145" fontSize="70" textAnchor="middle" className="filter drop-shadow-md">{item.emoji}</text>;
    }
    if (item.position === 'neck') {
      return <text x="140" y="210" fontSize="55" textAnchor="middle" className="filter drop-shadow-md">{item.emoji}</text>;
    }
    return null;
  };

  const renderCharacterContent = () => {
    switch (type) {
      case 'bunny':
        return (
          <>
            <motion.g animate={isInView ? { rotate: isHappy ? [-5, 5, -5] : [0, 2, 0] } : { rotate: 0 }} transition={{ duration: 2, repeat: Infinity }} style={{ transformOrigin: '140px 100px' }}>
              <ellipse cx="105" cy="55" rx="18" ry="48" fill="#FCE7F3" stroke="#F472B6" strokeWidth="2.5" />
              <ellipse cx="105" cy="55" rx="10" ry="36" fill="#F43F5E" opacity="0.6" />
              <ellipse cx="175" cy="55" rx="18" ry="48" fill="#FCE7F3" stroke="#F472B6" strokeWidth="2.5" />
              <ellipse cx="175" cy="55" rx="10" ry="36" fill="#F43F5E" opacity="0.6" />
            </motion.g>
            <ellipse cx="140" cy="205" rx="54" ry="48" fill="#FDF2F8" stroke="#FBCFE8" strokeWidth="2" />
            <ellipse cx="140" cy="212" rx="34" ry="32" fill="#FFFFFF" />
            <circle cx="105" cy="245" r="18" fill="#FCE7F3" stroke="#F472B6" strokeWidth="2" />
            <circle cx="175" cy="245" r="18" fill="#FCE7F3" stroke="#F472B6" strokeWidth="2" />
            <circle cx="140" cy="138" r="62" fill="#FDF2F8" stroke="#FBCFE8" strokeWidth="2" />
            <ellipse cx="102" cy="158" rx="15" ry="11" fill="#FDA4AF" opacity="0.8" />
            <ellipse cx="178" cy="158" rx="15" ry="11" fill="#FDA4AF" opacity="0.8" />
            {renderEyes()}
            <polygon points="135,150 145,150 140,156" fill="#F43F5E" />
            {renderMouth()}
            {renderArms('#FCE7F3', '#F472B6')}
            {renderAccessory()}
          </>
        );
      case 'panda':
        return (
          <>
            <circle cx="85" cy="88" r="22" fill="#1E293B" />
            <circle cx="195" cy="88" r="22" fill="#1E293B" />
            <ellipse cx="140" cy="205" rx="55" ry="48" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
            <ellipse cx="140" cy="214" rx="38" ry="32" fill="#F8FAFC" />
            <circle cx="105" cy="245" r="18" fill="#1E293B" />
            <circle cx="175" cy="245" r="18" fill="#1E293B" />
            <circle cx="140" cy="138" r="62" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
            <ellipse cx="118" cy="134" rx="16" ry="14" fill="#1E293B" transform="rotate(-15 118 134)" />
            <ellipse cx="162" cy="134" rx="16" ry="14" fill="#1E293B" transform="rotate(15 162 134)" />
            <ellipse cx="100" cy="158" rx="12" ry="8" fill="#FDA4AF" opacity="0.75" />
            <ellipse cx="180" cy="158" rx="12" ry="8" fill="#FDA4AF" opacity="0.75" />
            {renderEyes()}
            <ellipse cx="140" cy="152" rx="12" ry="8" fill="#0F172A" />
            {renderMouth()}
            {renderArms('#1E293B', '#0F172A')}
            {renderAccessory()}
          </>
        );
      case 'fox':
        return (
          <>
            <motion.g animate={isInView ? { rotate: isHappy ? [0, 20, -10, 0] : [0, 6, -4, 0] } : { rotate: 0 }} transition={{ duration: 2, repeat: Infinity }} style={{ transformOrigin: '70px 220px' }}>
              <ellipse cx="60" cy="190" rx="28" ry="18" fill="#EA580C" transform="rotate(-30 60 190)" />
              <circle cx="42" cy="175" r="12" fill="#FFFBEB" />
            </motion.g>
            <polygon points="80,105 95,45 125,95" fill="#EA580C" />
            <polygon points="86,95 95,58 116,92" fill="#FEF3C7" />
            <polygon points="155,95 185,45 200,105" fill="#EA580C" />
            <polygon points="164,92 185,58 194,95" fill="#FEF3C7" />
            <ellipse cx="140" cy="205" rx="52" ry="46" fill="#EA580C" />
            <ellipse cx="140" cy="212" rx="34" ry="30" fill="#FFFBEB" />
            <circle cx="105" cy="245" r="17" fill="#C2410C" />
            <circle cx="175" cy="245" r="17" fill="#C2410C" />
            <circle cx="140" cy="138" r="60" fill="#EA580C" />
            <path d="M 85 138 Q 110 170 140 165 Q 170 170 195 138 Q 140 185 85 138 Z" fill="#FFFBEB" />
            <ellipse cx="102" cy="156" rx="12" ry="8" fill="#FB7185" opacity="0.75" />
            <ellipse cx="178" cy="156" rx="12" ry="8" fill="#FB7185" opacity="0.75" />
            {renderEyes()}
            <ellipse cx="140" cy="152" rx="8" ry="6" fill="#1E293B" />
            {renderMouth()}
            {renderArms('#EA580C', '#C2410C')}
            {renderAccessory()}
          </>
        );
      case 'elephant':
        return (
          <>
            <motion.g animate={isInView ? { scale: isHappy ? [1, 1.08, 1] : [1, 1.02, 1] } : { scale: 1 }} transition={{ duration: 2, repeat: Infinity }} style={{ transformOrigin: '140px 140px' }}>
              <circle cx="75" cy="130" r="38" fill="#93C5FD" stroke="#60A5FA" strokeWidth="2.5" />
              <circle cx="78" cy="130" r="24" fill="#DBEAFE" />
              <circle cx="205" cy="130" r="38" fill="#93C5FD" stroke="#60A5FA" strokeWidth="2.5" />
              <circle cx="202" cy="130" r="24" fill="#DBEAFE" />
            </motion.g>
            <ellipse cx="140" cy="205" rx="56" ry="48" fill="#BFDBFE" stroke="#93C5FD" strokeWidth="2" />
            <ellipse cx="140" cy="212" rx="36" ry="32" fill="#EFF6FF" />
            <circle cx="105" cy="245" r="18" fill="#93C5FD" />
            <circle cx="175" cy="245" r="18" fill="#93C5FD" />
            <circle cx="140" cy="138" r="58" fill="#BFDBFE" stroke="#93C5FD" strokeWidth="2" />
            <ellipse cx="105" cy="156" rx="12" ry="8" fill="#FDA4AF" opacity="0.75" />
            <ellipse cx="175" cy="156" rx="12" ry="8" fill="#FDA4AF" opacity="0.75" />
            {renderEyes()}
            <path d="M 136 150 C 136 168, 144 175, 148 168 C 150 162, 144 158, 140 160" fill="none" stroke="#60A5FA" strokeWidth="9" strokeLinecap="round" />
            {renderMouth()}
            {renderArms('#93C5FD', '#60A5FA')}
            {renderAccessory()}
          </>
        );
      case 'owl':
        return (
          <>
            <polygon points="105,85 115,55 130,85" fill="#8B5CF6" />
            <polygon points="150,85 165,55 175,85" fill="#8B5CF6" />
            <ellipse cx="80" cy="200" rx="18" ry="36" fill="#7C3AED" transform="rotate(15 80 200)" />
            <ellipse cx="200" cy="200" rx="18" ry="36" fill="#7C3AED" transform="rotate(-15 200 200)" />
            <ellipse cx="140" cy="175" rx="58" ry="68" fill="#A78BFA" stroke="#7C3AED" strokeWidth="2" />
            <ellipse cx="140" cy="195" rx="36" ry="42" fill="#EDE9FE" />
            <path d="M 130 185 Q 140 190 150 185" stroke="#7C3AED" strokeWidth="2" fill="none" />
            <path d="M 125 200 Q 140 206 155 200" stroke="#7C3AED" strokeWidth="2" fill="none" />
            <circle cx="116" cy="132" r="24" fill="#FFFFFF" stroke="#8B5CF6" strokeWidth="2" />
            <circle cx="164" cy="132" r="24" fill="#FFFFFF" stroke="#8B5CF6" strokeWidth="2" />
            <ellipse cx="102" cy="158" rx="10" ry="7" fill="#FDA4AF" opacity="0.8" />
            <ellipse cx="178" cy="158" rx="10" ry="7" fill="#FDA4AF" opacity="0.8" />
            {renderEyes()}
            <polygon points="135,148 145,148 140,158" fill="#F59E0B" />
            {renderMouth()}
            <circle cx="120" cy="245" r="10" fill="#F59E0B" />
            <circle cx="160" cy="245" r="10" fill="#F59E0B" />
            {renderAccessory()}
          </>
        );
      case 'dino':
        return (
          <>
            <g fill="#0D9488">
              <circle cx="140" cy="74" r="12" />
              <circle cx="125" cy="80" r="10" />
              <circle cx="155" cy="80" r="10" />
            </g>
            <path d="M 80 220 C 50 220, 35 190, 50 165 C 55 180, 75 195, 90 205 Z" fill="#14B8A6" />
            <ellipse cx="140" cy="205" rx="56" ry="48" fill="#2DD4BF" stroke="#14B8A6" strokeWidth="2" />
            <ellipse cx="140" cy="212" rx="36" ry="32" fill="#CCFBF1" />
            <circle cx="105" cy="245" r="18" fill="#14B8A6" />
            <circle cx="175" cy="245" r="18" fill="#14B8A6" />
            <circle cx="140" cy="138" r="60" fill="#2DD4BF" stroke="#14B8A6" strokeWidth="2" />
            <ellipse cx="102" cy="156" rx="14" ry="10" fill="#FDA4AF" opacity="0.75" />
            <ellipse cx="178" cy="156" rx="14" ry="10" fill="#FDA4AF" opacity="0.75" />
            {renderEyes()}
            <circle cx="135" cy="150" r="3" fill="#0F766E" />
            <circle cx="145" cy="150" r="3" fill="#0F766E" />
            {renderMouth()}
            {renderArms('#2DD4BF', '#14B8A6')}
            {renderAccessory()}
          </>
        );
      case 'lion':
      default:
        return (
          <>
            <motion.g animate={isInView ? { rotate: isHappy ? [0, 25, -15, 20, 0] : [0, 8, -6, 0] } : { rotate: 0 }} transition={{ duration: isHappy ? 0.6 : 3, repeat: Infinity, ease: 'easeInOut' }} style={{ transformOrigin: '70px 220px' }}>
              <path d="M 80 220 C 45 220, 30 180, 50 155" fill="none" stroke="#F59E0B" strokeWidth="10" strokeLinecap="round" />
              <circle cx="50" cy="155" r="14" fill="#EA580C" />
            </motion.g>
            <ellipse cx="140" cy="205" rx="55" ry="48" fill="#FBBF24" />
            <ellipse cx="140" cy="212" rx="35" ry="32" fill="#FEF3C7" />
            <circle cx="105" cy="245" r="18" fill="#FBBF24" stroke="#D97706" strokeWidth="2" />
            <circle cx="175" cy="245" r="18" fill="#FBBF24" stroke="#D97706" strokeWidth="2" />
            <g fill="#FB923C">
              <circle cx="140" cy="62" r="28" />
              <circle cx="188" cy="74" r="28" />
              <circle cx="218" cy="114" r="28" />
              <circle cx="218" cy="162" r="28" />
              <circle cx="192" cy="200" r="26" />
              <circle cx="140" cy="212" r="24" />
              <circle cx="88" cy="200" r="26" />
              <circle cx="62" cy="162" r="28" />
              <circle cx="62" cy="114" r="28" />
              <circle cx="92" cy="74" r="28" />
            </g>
            <circle cx="95" cy="90" r="20" fill="#F59E0B" />
            <circle cx="95" cy="90" r="12" fill="#F43F5E" opacity="0.8" />
            <circle cx="185" cy="90" r="20" fill="#F59E0B" />
            <circle cx="185" cy="90" r="12" fill="#F43F5E" opacity="0.8" />
            <circle cx="140" cy="138" r="64" fill="#FBBF24" />
            <ellipse cx="102" cy="158" rx="14" ry="10" fill="#FB7185" opacity="0.75" />
            <ellipse cx="178" cy="158" rx="14" ry="10" fill="#FB7185" opacity="0.75" />
            {renderEyes()}
            <ellipse cx="140" cy="155" rx="22" ry="14" fill="#FFFBEB" />
            <path d="M 132 148 Q 140 143 148 148 Q 140 158 132 148 Z" fill="#991B1B" />
            {renderMouth()}
            {renderArms('#FBBF24', '#D97706')}
            {renderAccessory()}
          </>
        );
    }
  };

  return (
    <div ref={containerRef} className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      {bubbleText && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="mb-3 max-w-xs bg-white/95 backdrop-blur-sm border-2 border-amber-300 rounded-3xl px-5 py-3 shadow-lg text-amber-950 font-bold text-center text-base md:text-lg relative"
        >
          {bubbleText}
          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b-2 border-r-2 border-amber-300 transform rotate-45" />
        </motion.div>
      )}

      <motion.div
        animate={
          isInView
            ? isHappy
              ? { y: [0, -25, 0, -15, 0], scale: [1, 1.06, 1, 1.04, 1] }
              : isWaving
              ? { scale: [1, 1.08, 1], y: [0, -8, 0] }
              : isHugging
              ? { scale: [1, 1.08, 1.03], y: [0, -5, 0] }
              : isSleeping
              ? { y: [0, 2, 0], rotate: [0, 1, 0] }
              : { y: [0, -4, 0] }
            : { y: 0, scale: 1, rotate: 0 }
        }
        transition={{
          duration: isHappy ? 0.9 : isWaving ? 0.8 : isSleeping ? 4 : 3,
          repeat: Infinity,
          repeatType: 'loop',
          ease: 'easeInOut',
        }}
        onClick={onClick}
        className={`${sizeClasses[size]} cursor-pointer touch-manipulation`}
      >
        <svg
          viewBox="0 0 280 280"
          className="w-full h-full drop-shadow-md overflow-visible"
        >
          <ellipse cx="140" cy="265" rx="75" ry="12" fill="#78350F" opacity="0.2" />
          {renderCharacterContent()}
          
          {isSleeping && (
            <motion.text
              x="180"
              y="90"
              fontSize="28"
              fill="#6366F1"
              fontWeight="bold"
              animate={isInView ? { opacity: [0.2, 1, 0.2], y: [90, 75, 90] } : { opacity: 0 }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              Zzz..
            </motion.text>
          )}
        </svg>
      </motion.div>
    </div>
  );
};