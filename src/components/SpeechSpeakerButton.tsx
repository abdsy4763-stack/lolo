import React, { useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { motion } from 'motion/react';
import { sound } from '../utils/audio';

interface SpeechSpeakerButtonProps {
  textToSpeak: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export const SpeechSpeakerButton: React.FC<SpeechSpeakerButtonProps> = ({
  textToSpeak,
  className = '',
  size = 'md',
  label,
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    const unsub = sound.subscribeSpeakingState(setIsSpeaking);
    return () => unsub();
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playTap();
    sound.speak(textToSpeak);
  };

  const sizeClasses = {
    sm: 'w-12 h-12 text-sm',
    md: 'w-16 h-16 text-base',
    lg: 'w-20 h-20 text-lg',
  };

  const iconSizes = {
    sm: 22,
    md: 28,
    lg: 36,
  };

  return (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      animate={
        isSpeaking
          ? {
              scale: [1, 1.1, 1],
              boxShadow: [
                '0 0 0px rgba(245, 158, 11, 0.4)',
                '0 0 16px rgba(245, 158, 11, 0.8)',
                '0 0 0px rgba(245, 158, 11, 0.4)',
              ],
            }
          : {}
      }
      transition={{ duration: 1, repeat: isSpeaking ? Infinity : 0 }}
      onClick={handleClick}
      aria-label="أعد الصوت"
      className={`rounded-full bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-amber-950 flex items-center justify-center shadow-lg border-3 border-amber-100 touch-manipulation cursor-pointer ${sizeClasses[size]} ${className}`}
    >
      <Volume2 size={iconSizes[size]} className={isSpeaking ? 'animate-bounce' : ''} />
      {label && <span className="sr-only">{label}</span>}
    </motion.button>
  );
};
