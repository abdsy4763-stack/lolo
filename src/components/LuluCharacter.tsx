import React from 'react';
import { CompanionCharacter, CompanionMood } from './CompanionCharacter';
import { CompanionType } from '../types';
import { Storage } from '../utils/storage';

export type LuluMood = CompanionMood;

interface LuluCharacterProps {
  mood?: LuluMood;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  className?: string;
  onClick?: () => void;
  bubbleText?: string;
  type?: CompanionType;
}

export const LuluCharacter: React.FC<LuluCharacterProps> = ({
  type,
  mood = 'idle',
  size = 'md',
  className = '',
  onClick,
  bubbleText,
}) => {
  // استخدام رفيق الطفل المختار المحفوظ كقيمة افتراضية
  const resolvedType = type || Storage.getCompanionProfile().type;

  return (
    <CompanionCharacter
      type={resolvedType}
      mood={mood}
      size={size}
      className={className}
      onClick={onClick}
      bubbleText={bubbleText}
    />
  );
};
