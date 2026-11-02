import { BraveryStar, ActionLog, ParentSettings, DailyPlayStats, EmotionType, CompanionProfile, CompanionType, ArgumentStats, ArgumentType, StageId, ParentVoiceClipKey, ParentVoiceRecording, CustomEducationalScenario } from '../types';

const STORAGE_KEYS = {
  STARS: 'lulu_bravery_stars_v1',
  LOGS: 'lulu_action_logs_v1',
  SETTINGS: 'lulu_parent_settings_v1',
  DAILY_STATS: 'lulu_daily_stats_v1',
  TODAY_PLAYTIME: 'lulu_today_playtime_v1',
  LAST_DATE: 'lulu_last_active_date_v1',
  COMPANION: 'lulu_companion_profile_v1',
  COMPANION_INITIAL_DONE: 'lulu_companion_initial_done_v1',
  ARGUMENT_STATS: 'lulu_argument_stats_v1',
  CUSTOM_ARGUMENT: 'lulu_custom_argument_v1',
  PARENT_VOICES: 'lulu_parent_voices_v1',
  CUSTOM_SCENARIOS: 'lulu_custom_scenarios_v1',
  CURRENT_EPISODE: 'lulu_current_episode_v2',
  COMPLETED_EPISODES: 'lulu_completed_episodes_v2',
  UNLOCKED_EPISODES: 'lulu_unlocked_episodes_v2',
};

const DEFAULT_ARG_STATS: ArgumentStats = {
  please: 0,
  promiseAfter: 0,
  helpFirst: 0,
  begging: 0,
  crying: 0,
  custom: 0,
};

const DEFAULT_SETTINGS: ParentSettings = {
  dailyLimitMinutes: 15,
  soundEnabled: true,
  voiceRate: 0.8,
  speechPitch: 1.15,
  customArgument: '',
  childName: 'لؤلؤ',
  childGender: 'boy',
  voiceMode: 'recorded',
  preferredVoiceName: null,
  enabledScenarioIds: ['cookie', 'toy', 'outdoors', 'cartoon', 'bedtime', 'sharing', 'veggies', 'cleaning'],
  customScenarios: [],
  rainbowDifficulty: 'normal',
  hapticsEnabled: true,
  soundEffectsEnabled: true,
};

const DEFAULT_COMPANION: CompanionProfile = {
  type: 'lion',
  name: 'لؤلؤ',
  unlockedTypes: ['lion', 'bunny', 'panda', 'fox', 'elephant', 'owl'],
  coins: 0,
  ownedAccessories: [],
  equippedAccessory: null,
};

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// متغيرات للتحكم في الحفظ المؤقت وتقليل الضغط على I/O
let pendingPlaySeconds = 0;
let lastSaveTimestamp = Date.now();

// ضمان حفظ الثواني المتبقية عند إغلاق التطبيق
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (pendingPlaySeconds > 0) {
      Storage.forceSavePlaySeconds();
    }
  });
}

export const Storage = {
  getCompanionProfile(): CompanionProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.COMPANION);
      if (!data) return DEFAULT_COMPANION;
      const parsed = JSON.parse(data);
      return {
        ...DEFAULT_COMPANION,
        ...parsed,
        unlockedTypes: Array.from(new Set([...DEFAULT_COMPANION.unlockedTypes, ...(parsed.unlockedTypes || [])])),
      };
    } catch {
      return DEFAULT_COMPANION;
    }
  },

  saveCompanionProfile(profile: Partial<CompanionProfile>): CompanionProfile {
    const current = this.getCompanionProfile();
    const updated: CompanionProfile = {
      ...current,
      ...profile,
      unlockedTypes: Array.from(new Set([...current.unlockedTypes, ...(profile.unlockedTypes || [])])),
    };
    try {
      localStorage.setItem(STORAGE_KEYS.COMPANION, JSON.stringify(updated));
    } catch {
      // ignore
    }
    return updated;
  },

  hasChosenInitialCompanion(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEYS.COMPANION_INITIAL_DONE) === 'true';
    } catch {
      return false;
    }
  },

  markInitialCompanionChosen(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.COMPANION_INITIAL_DONE, 'true');
    } catch {
      // ignore
    }
  },

  checkAndUpdateStarUnlocks(totalStars: number): CompanionProfile {
    const profile = this.getCompanionProfile();
    const updatedUnlocked = [...profile.unlockedTypes];
    if (totalStars >= 5 && !updatedUnlocked.includes('dino')) {
      updatedUnlocked.push('dino');
      return this.saveCompanionProfile({ unlockedTypes: updatedUnlocked });
    }
    return profile;
  },

  getSettings(): ParentSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) return DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: Partial<ParentSettings>): ParentSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    } catch {
      // ignore
    }
    return updated;
  },

  getArgumentStats(): ArgumentStats {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ARGUMENT_STATS);
      if (!data) return DEFAULT_ARG_STATS;
      return { ...DEFAULT_ARG_STATS, ...JSON.parse(data) };
    } catch {
      return DEFAULT_ARG_STATS;
    }
  },

  incrementArgumentCount(type: ArgumentType): ArgumentStats {
    const current = this.getArgumentStats();
    const updated: ArgumentStats = {
      ...current,
      [type]: (current[type] || 0) + 1,
    };
    try {
      localStorage.setItem(STORAGE_KEYS.ARGUMENT_STATS, JSON.stringify(updated));
    } catch {
      // ignore
    }
    return updated;
  },

  getCustomArgument(): string {
    try {
      return localStorage.getItem(STORAGE_KEYS.CUSTOM_ARGUMENT) || '';
    } catch {
      return '';
    }
  },

  setCustomArgument(val: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_ARGUMENT, val.trim());
    } catch {
      // ignore
    }
  },

  getStars(): BraveryStar[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STARS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addStar(star: Omit<BraveryStar, 'id' | 'timestamp'>): BraveryStar {
    const current = this.getStars();
    const newStar: BraveryStar = {
      ...star,
      id: 'star_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: Date.now(),
    };
    const updated = [newStar, ...current];
    try {
      localStorage.setItem(STORAGE_KEYS.STARS, JSON.stringify(updated));
    } catch {
      // ignore
    }
    return newStar;
  },

  getLogs(): ActionLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LOGS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  getCompletedStageIds(): StageId[] {
    const completed = new Set<StageId>();
    this.getLogs().forEach(log => {
      if (log.stageId && (log.type === 'game_played' || log.type === 'hourglass_waited' || log.type === 'plan_b_picked' || log.type === 'rose_completed' || log.type === 'hug_received')) {
        completed.add(log.stageId);
      }
    });
    return Array.from(completed);
  },

  markStageCompleted(stageId: StageId): void {
    this.addLog({
      type: 'game_played',
      stageId,
      label: `إكمال مرحلة ${stageId}`,
      detail: 'إنجاز التحدي الدرامي في القصة',
    });
  },

  addLog(entry: Omit<ActionLog, 'id' | 'timestamp'>): void {
    const current = this.getLogs();
    const newLog: ActionLog = {
      ...entry,
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      timestamp: Date.now(),
    };
    const updated = [newLog, ...current].slice(0, 200);
    try {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(updated));
    } catch {
      // ignore
    }
    this.updateDailyStatCounters(entry.type);
  },

  getDailyStats(): DailyPlayStats[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DAILY_STATS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  updateDailyStatCounters(actionType: ActionLog['type']): void {
    const today = getTodayString();
    const statsList = this.getDailyStats();
    let todayStat = statsList.find(s => s.dateStr === today);
    if (!todayStat) {
      todayStat = {
        dateStr: today,
        minutesPlayed: 0,
        magicWordsCount: 0,
        cryingChosenCount: 0,
        stagesCompleted: 0,
        emotions: [],
      };
      statsList.unshift(todayStat);
    }
    if (actionType === 'magic_word_used') {
      todayStat.magicWordsCount += 1;
    } else if (actionType === 'crying_chosen') {
      todayStat.cryingChosenCount += 1;
    } else if (actionType === 'hourglass_waited' || actionType === 'plan_b_picked' || actionType === 'rose_completed' || actionType === 'hug_received') {
      todayStat.stagesCompleted += 1;
    }
    try {
      localStorage.setItem(STORAGE_KEYS.DAILY_STATS, JSON.stringify(statsList.slice(0, 30)));
    } catch {
      // ignore
    }
  },

  logEmotion(emotion: EmotionType): void {
    this.addLog({
      type: 'emotion_selected',
      label: `المشاعر المختارة : ${emotion}`,
      detail: emotion,
    });
    const today = getTodayString();
    const statsList = this.getDailyStats();
    let todayStat = statsList.find(s => s.dateStr === today);
    if (!todayStat) {
      todayStat = {
        dateStr: today,
        minutesPlayed: 0,
        magicWordsCount: 0,
        cryingChosenCount: 0,
        stagesCompleted: 0,
        emotions: [emotion],
      };
      statsList.unshift(todayStat);
    } else {
      if (!todayStat.emotions.includes(emotion)) {
        todayStat.emotions.push(emotion);
      }
    }
    try {
      localStorage.setItem(STORAGE_KEYS.DAILY_STATS, JSON.stringify(statsList.slice(0, 30)));
    } catch {
      // ignore
    }
  },

  getTodayPlaySeconds(): number {
    try {
      const lastDate = localStorage.getItem(STORAGE_KEYS.LAST_DATE);
      const today = getTodayString();
      if (lastDate !== today) {
        localStorage.setItem(STORAGE_KEYS.LAST_DATE, today);
        localStorage.setItem(STORAGE_KEYS.TODAY_PLAYTIME, '0');
        return 0;
      }
      const secs = localStorage.getItem(STORAGE_KEYS.TODAY_PLAYTIME);
      return secs ? parseInt(secs, 10) : 0;
    } catch {
      return 0;
    }
  },

  incrementPlaySeconds(amount = 5): number {
    pendingPlaySeconds += amount;
    const now = Date.now();
    
    // حفظ فعلي كل 60 ثانية لتقليل الإدخال/الإخراج
    if (now - lastSaveTimestamp >= 60000) {
      return this.forceSavePlaySeconds();
    }
    
    // إرجاع القيمة التقديرية الحالية للعرض في الواجهة
    return this.getTodayPlaySeconds() + pendingPlaySeconds;
  },

  forceSavePlaySeconds(): number {
    if (pendingPlaySeconds === 0) return this.getTodayPlaySeconds();
    
    const current = this.getTodayPlaySeconds();
    const updated = current + pendingPlaySeconds;
    const today = getTodayString();
    
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_DATE, today);
      localStorage.setItem(STORAGE_KEYS.TODAY_PLAYTIME, updated.toString());
      
      const statsList = this.getDailyStats();
      const todayStat = statsList.find(s => s.dateStr === today);
      if (todayStat) {
        todayStat.minutesPlayed = Math.round(updated / 60);
        localStorage.setItem(STORAGE_KEYS.DAILY_STATS, JSON.stringify(statsList));
      }
    } catch {
      // ignore
    }
    
    pendingPlaySeconds = 0;
    lastSaveTimestamp = Date.now();
    
    return updated;
  },

  resetTodayPlaytime(): void {
    pendingPlaySeconds = 0;
    lastSaveTimestamp = Date.now();
    try {
      localStorage.setItem(STORAGE_KEYS.TODAY_PLAYTIME, '0');
    } catch {
      // ignore
    }
  },

  seedDemoStatsForParents(): void {
    const days = [
      { d: 4, magic: 2, cry: 5, stages: 3 },
      { d: 3, magic: 4, cry: 4, stages: 4 },
      { d: 2, magic: 6, cry: 3, stages: 5 },
      { d: 1, magic: 8, cry: 2, stages: 6 },
    ];
    const now = new Date();
    const demoStats: DailyPlayStats[] = days.map(item => {
      const targetDate = new Date(now.getTime() - item.d * 86400000);
      return {
        dateStr: `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`,
        minutesPlayed: 12 + item.d,
        magicWordsCount: item.magic,
        cryingChosenCount: item.cry,
        stagesCompleted: item.stages,
        emotions: ['happy', 'sad'],
      };
    });
    const current = this.getDailyStats();
    const merged = [...current, ...demoStats];
    try {
      localStorage.setItem(STORAGE_KEYS.DAILY_STATS, JSON.stringify(merged));
    } catch {
      // ignore
    }
  },

  // --- أصوات الأهل المسجلة (Parent Voice Recordings) ---
  getAllParentVoiceRecordings(): Record<string, ParentVoiceRecording> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PARENT_VOICES);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  getParentVoiceRecording(key: ParentVoiceClipKey): ParentVoiceRecording | null {
    try {
      const all = this.getAllParentVoiceRecordings();
      return all[key] || null;
    } catch {
      return null;
    }
  },

  hasParentVoiceRecording(key: ParentVoiceClipKey): boolean {
    return !!this.getParentVoiceRecording(key);
  },

  saveParentVoiceRecording(recording: ParentVoiceRecording): void {
    try {
      const all = this.getAllParentVoiceRecordings();
      all[recording.key] = recording;
      localStorage.setItem(STORAGE_KEYS.PARENT_VOICES, JSON.stringify(all));
    } catch {
      // ignore
    }
  },

  deleteParentVoiceRecording(key: ParentVoiceClipKey): void {
    try {
      const all = this.getAllParentVoiceRecordings();
      delete all[key];
      localStorage.setItem(STORAGE_KEYS.PARENT_VOICES, JSON.stringify(all));
    } catch {
      // ignore
    }
  },

  // --- المواقف التربوية المخصصة (Custom Scenarios) ---
  getCustomScenarios(): CustomEducationalScenario[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_SCENARIOS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveCustomScenario(scenario: CustomEducationalScenario): CustomEducationalScenario[] {
    try {
      const current = this.getCustomScenarios();
      const existingIdx = current.findIndex(s => s.id === scenario.id);
      let updated: CustomEducationalScenario[];
      if (existingIdx >= 0) {
        updated = [...current];
        updated[existingIdx] = scenario;
      } else {
        updated = [scenario, ...current];
      }
      localStorage.setItem(STORAGE_KEYS.CUSTOM_SCENARIOS, JSON.stringify(updated));

      // التأكد من تفعيل الموقف الجديد في الإعدادات
      const settings = this.getSettings();
      if (!settings.enabledScenarioIds.includes(scenario.id)) {
        this.saveSettings({
          enabledScenarioIds: [...settings.enabledScenarioIds, scenario.id],
        });
      }
      return updated;
    } catch {
      return [];
    }
  },

  deleteCustomScenario(id: string): CustomEducationalScenario[] {
    try {
      const current = this.getCustomScenarios();
      const updated = current.filter(s => s.id !== id);
      localStorage.setItem(STORAGE_KEYS.CUSTOM_SCENARIOS, JSON.stringify(updated));

      const settings = this.getSettings();
      this.saveSettings({
        enabledScenarioIds: settings.enabledScenarioIds.filter(sid => sid !== id),
      });
      return updated;
    } catch {
      return [];
    }
  },

  toggleScenarioEnabled(id: string, enabled: boolean): string[] {
    const settings = this.getSettings();
    let currentEnabled = [...settings.enabledScenarioIds];
    if (enabled) {
      if (!currentEnabled.includes(id)) {
        currentEnabled.push(id);
      }
    } else {
      currentEnabled = currentEnabled.filter(sid => sid !== id);
    }
    this.saveSettings({ enabledScenarioIds: currentEnabled });
    return currentEnabled;
  },

  // --- نظام القصة وخريطة العالم (Story Episodes & World Map) ---
  getCurrentEpisodeId(): string {
    try {
      return localStorage.getItem(STORAGE_KEYS.CURRENT_EPISODE) || 'ep_1';
    } catch {
      return 'ep_1';
    }
  },

  setCurrentEpisodeId(id: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_EPISODE, id);
    } catch {}
  },

  getCompletedEpisodeIds(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.COMPLETED_EPISODES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  markEpisodeCompleted(id: string): string[] {
    try {
      const current = this.getCompletedEpisodeIds();
      const updated = Array.from(new Set([...current, id]));
      localStorage.setItem(STORAGE_KEYS.COMPLETED_EPISODES, JSON.stringify(updated));
      return updated;
    } catch {
      return [];
    }
  },

  getUnlockedEpisodeIds(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.UNLOCKED_EPISODES);
      return data ? JSON.parse(data) : ['ep_1'];
    } catch {
      return ['ep_1'];
    }
  },

  unlockEpisode(id: string): string[] {
    try {
      const current = this.getUnlockedEpisodeIds();
      const updated = Array.from(new Set([...current, id]));
      localStorage.setItem(STORAGE_KEYS.UNLOCKED_EPISODES, JSON.stringify(updated));
      return updated;
    } catch {
      return ['ep_1'];
    }
  },

  isEpisodeUnlocked(id: string): boolean {
    return this.getUnlockedEpisodeIds().includes(id);
  },
};
