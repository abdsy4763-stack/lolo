export type EmotionType = 'happy' | 'sad' | 'angry' | 'afraid';

export type CompanionType = 
  | 'lion'
  | 'bunny'
  | 'panda'
  | 'fox'
  | 'elephant'
  | 'owl'
  | 'dino';

export interface CompanionDefinition {
  type: CompanionType;
  title: string;
  defaultName: string;
  emoji: string;
  themeColor: string;
  bgGradient: string;
  desc: string;
  starsRequiredToUnlock: number;
}

export interface CompanionProfile {
  type: CompanionType;
  name: string;
  unlockedTypes: CompanionType[];
  coins: number; 
  ownedAccessories: string[]; 
  equippedAccessory: string | null; 
}

export type StageId = 
  | 'magic_words' 
  | 'hourglass' 
  | 'plan_b' 
  | 'rose_breathing' 
  | 'when_i_cry'
  | 'memory_game'
  | 'zen_bubbles'
  | 'sharing'
  | 'empathy'
  | 'decision_maze'
  | 'pattern_secret'
  | 'balance_scale'
  | 'spot_difference';

export interface StageInfo {
  id: StageId;
  title: string;
  subtitle: string;
  icon: string;
  badgeColor: string;
  accentBg: string;
}

export type BiomeType = 
  | 'meadow'
  | 'river'
  | 'rain_valley'
  | 'desert'
  | 'crystal_mountain'
  | 'forest'
  | 'calm_garden'
  | 'royal_castle';

export interface DialogueLine {
  id: string;
  speakerName: string;
  speakerType: 'companion' | 'mom' | 'friend' | 'mentor' | 'narrator';
  speakerMood?: 'idle' | 'happy' | 'crying' | 'talking' | 'comforting' | 'afraid';
  speakerEmoji?: string;
  position?: 'left' | 'right' | 'center';
  text: string;
  soundFx?: 'tap' | 'tada' | 'warm_hug' | 'bubble_pop' | 'success_chime';
  voiceClipKey?: ParentVoiceClipKey;
}

export interface StoryEpisode {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  biome: BiomeType;
  biomeName: string;
  icon: string;
  requiredAccessoryId?: string; // e.g. 'glasses' for Desert
  requiredAccessoryPrompt?: string; // Guidance to visit shop
  stageId: StageId; // Mini-game solving the crisis
  introStory: DialogueLine[];
  victoryStory: DialogueLine[];
  starSticker: string;
  coinReward: number;
  mapX: number; // percentage 0 - 100
  mapY: number; // percentage 0 - 100
}

export interface WorldMapEpisode {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  isLocked: boolean;
  isCompleted: boolean;
  isCurrent: boolean;
  color: string;
  emoji: string;
  stageId?: StageId;
}

export interface BraveryStar {
  id: string;
  stageId: StageId;
  stageTitle: string;
  timestamp: number;
  sticker: string;
  note: string;
}

export interface ActionLog {
  id: string;
  timestamp: number;
  type: 'crying_chosen' | 'magic_word_used' | 'hourglass_waited' | 'plan_b_picked' | 'rose_completed' | 'hug_received' | 'emotion_selected' | 'game_played' | 'sharing_solved' | 'empathy_given';
  stageId?: StageId;
  label: string;
  detail?: string;
}

export type ArgumentType = 'please' | 'promiseAfter' | 'helpFirst' | 'begging' | 'crying' | 'custom';

export interface ArgumentStats {
  please: number;
  promiseAfter: number;
  helpFirst: number;
  begging: number;
  crying: number;
  custom: number;
}

export type VoiceSourceMode = 'recorded' | 'parent_custom';

export type ParentVoiceClipKey = 
  | 'welcome' 
  | 'mom_denial' 
  | 'praise_hero' 
  | 'magic_please' 
  | 'warm_hug' 
  | 'waiting_patient' 
  | 'sharing_turn';

export interface ParentVoiceRecording {
  key: ParentVoiceClipKey;
  title: string;
  audioDataUrl: string; // base64 data url from MediaRecorder
  durationMs: number;
  recordedAt: number;
}

export interface CustomEducationalScenario {
  id: string;
  title: string;
  icon: string;
  targetLabel: string;
  companionRequest: string;
  momInitial: string;
  compromiseProposal: string;
  fullRewardPraise: string;
  enabled: boolean;
  isUserCreated?: boolean;
}

export interface ParentSettings {
  dailyLimitMinutes: number; 
  soundEnabled: boolean;
  voiceRate: number; 
  speechPitch: number; 
  customArgument?: string; 
  childName: string;
  childGender: 'boy' | 'girl';
  voiceMode: VoiceSourceMode;
  preferredVoiceName: string | null;
  enabledScenarioIds: string[];
  customScenarios: CustomEducationalScenario[];
  rainbowDifficulty: 'normal' | 'easy';
  hapticsEnabled: boolean;
  soundEffectsEnabled: boolean;
}

export interface DailyPlayStats {
  dateStr: string; 
  minutesPlayed: number;
  magicWordsCount: number;
  cryingChosenCount: number;
  stagesCompleted: number;
  emotions: EmotionType[];
}

export interface AccessoryItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
  position: 'head' | 'eyes' | 'neck';
}

export const SHOP_ITEMS: AccessoryItem[] = [
  { id: 'crown', name: 'تاج الملك', emoji: '👑', price: 30, position: 'head' },
  { id: 'glasses', name: 'نظارة شمسية', emoji: '🕶️', price: 20, position: 'eyes' },
  { id: 'party_hat', name: 'قبعة الحفلة', emoji: '🎉', price: 15, position: 'head' },
  { id: 'bow_tie', name: 'ربطة عنق', emoji: '🎀', price: 10, position: 'neck' },
];