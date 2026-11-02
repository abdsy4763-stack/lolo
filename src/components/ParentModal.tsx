import React, { useState, useEffect } from 'react';
import {
  X, Lock, CheckCircle, BarChart3, Clock, Sparkles, BookOpen, AlertCircle, RefreshCw, Volume2, Mic, Settings, User, Sliders
} from 'lucide-react';
import { Storage } from '../utils/storage';
import { ParentSettings, DailyPlayStats, ActionLog } from '../types';
import { DIALOGUES } from '../data/dialogue';
import { sound, audioManager, AudioDiagnostics } from '../utils/audio';
import { ParentVoiceStudio } from './ParentVoiceStudio';
import { CustomScenarioManager } from './CustomScenarioManager';

interface ParentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsUpdated: () => void;
}

type ParentTab = 'customization' | 'scenarios' | 'audio_studio' | 'limits' | 'stats' | 'tips';

export const ParentModal: React.FC<ParentModalProps> = ({
  isOpen,
  onClose,
  onSettingsUpdated,
}) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [mathQuestion, setMathQuestion] = useState({ a: 0, b: 0, answer: 0 });
  const [parentAnswer, setParentAnswer] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<ParentTab>('customization');

  const [settings, setSettings] = useState<ParentSettings>(Storage.getSettings());
  const [stats, setStats] = useState<DailyPlayStats[]>([]);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [todaySeconds, setTodaySeconds] = useState(0);
  const [diagnostics, setDiagnostics] = useState<AudioDiagnostics>(() => audioManager.getDiagnostics());
  const [isTestingAudio, setIsTestingAudio] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStats(Storage.getDailyStats());
      setLogs(Storage.getLogs());
      setSettings(Storage.getSettings());
      setTodaySeconds(Storage.getTodayPlaySeconds());
      setDiagnostics(audioManager.getDiagnostics());
      generateMathProblem();
    } else {
      setIsUnlocked(false);
      setParentAnswer('');
      setErrorMsg('');
    }
  }, [isOpen]);

  const generateMathProblem = () => {
    const a = Math.floor(Math.random() * 7) + 3;
    const b = Math.floor(Math.random() * 7) + 3;
    setMathQuestion({ a, b, answer: a * b });
  };

  const refreshDiagnostics = () => {
    setDiagnostics(audioManager.getDiagnostics());
  };

  const handleVerifyMath = (e: React.FormEvent) => {
    e.preventDefault();
    if (parseInt(parentAnswer, 10) === mathQuestion.answer) {
      setIsUnlocked(true);
      setErrorMsg('');
      sound.playSuccessChime();
      refreshDiagnostics();
    } else {
      setErrorMsg('إجابة خاطئة، حاول مجدداً.');
      setParentAnswer('');
    }
  };

  const handleChildProfileChange = (childName: string, childGender: 'boy' | 'girl') => {
    const updated = Storage.saveSettings({ childName: childName.trim() || 'لؤلؤ', childGender });
    setSettings(updated);
    onSettingsUpdated();
  };

  const handleTimeLimitChange = (minutes: number) => {
    sound.playTap();
    const updated = Storage.saveSettings({ dailyLimitMinutes: minutes });
    setSettings(updated);
    onSettingsUpdated();
  };

  const handleResetPlaytime = () => {
    sound.playTap();
    Storage.resetTodayPlaytime();
    setTodaySeconds(0);
    onSettingsUpdated();
  };

  const handleSeedDemoData = () => {
    sound.playTap();
    Storage.seedDemoStatsForParents();
    setStats(Storage.getDailyStats());
  };

  const handleTestAudio = () => {
    setIsTestingAudio(true);
    sound.playTap();
    audioManager.testAudio(() => {
      setIsTestingAudio(false);
      refreshDiagnostics();
    });
  };

  const handleToggleSound = (enabled: boolean) => {
    sound.playTap();
    const updated = Storage.saveSettings({ soundEnabled: enabled });
    setSettings(updated);
    onSettingsUpdated();
  };

  const handleToggleHaptics = (enabled: boolean) => {
    sound.playTap();
    const updated = Storage.saveSettings({ hapticsEnabled: enabled });
    setSettings(updated);
    onSettingsUpdated();
  };

  const totalMagicWords = stats.reduce((acc, curr) => acc + (curr.magicWordsCount || 0), 0);
  const totalCryingChosen = stats.reduce((acc, curr) => acc + (curr.cryingChosenCount || 0), 0);
  const totalStagesCompleted = stats.reduce((acc, curr) => acc + (curr.stagesCompleted || 0), 0);
  const uniqueStagesCompleted = Storage.getCompletedStageIds().length;
  const totalDays = stats.length || 1;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-slate-900/80 backdrop-blur-md select-none">
      <div className="relative w-full max-w-2xl max-h-[92vh] bg-white rounded-3xl shadow-2xl p-4 md:p-6 flex flex-col overflow-hidden text-right border-4 border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-slate-800">بوابة الوالدين والتخصيص</h2>
              <p className="text-xs text-slate-500 font-medium">تخصيص الأصوات، المواقف التربوية، ومتابعة الطفل</p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isUnlocked ? (
          <div className="my-auto py-8 text-center max-w-sm mx-auto">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">المنطقة الخاصة بالكبار</h3>
            <p className="text-sm text-slate-600 mb-5">للتحقق من أنك ولي الأمر، يرجى حل العملية التالية:</p>
            <form onSubmit={handleVerifyMath} className="space-y-4">
              <div className="text-3xl font-black tracking-wider text-indigo-600 bg-indigo-50 py-3 rounded-2xl border border-indigo-200">
                {mathQuestion.a} × {mathQuestion.b} = ?
              </div>
              <input
                type="number"
                pattern="[0-9]*"
                inputMode="numeric"
                value={parentAnswer}
                onChange={e => setParentAnswer(e.target.value)}
                placeholder="أدخل الناتج هنا"
                autoFocus
                className="w-full text-center text-xl font-bold p-3 border-2 border-slate-300 rounded-2xl focus:border-indigo-500 focus:outline-none"
              />
              {errorMsg && <p className="text-rose-600 text-xs font-bold">{errorMsg}</p>}
              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-2xl shadow transition cursor-pointer"
              >
                دخول لوحة التحكم
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden mt-2">
            {/* شريط التبويبات */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-100 text-xs scrollbar-none">
              <button
                onClick={() => { sound.playTap(); setActiveTab('customization'); }}
                className={`px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'customization'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>تخصيص الطفل والتجربة</span>
              </button>

              <button
                onClick={() => { sound.playTap(); setActiveTab('audio_studio'); }}
                className={`px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'audio_studio'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>استوديو الأصوات المسجلة</span>
              </button>

              <button
                onClick={() => { sound.playTap(); setActiveTab('scenarios'); }}
                className={`px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'scenarios'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>المواقف التربوية</span>
              </button>

              <button
                onClick={() => { sound.playTap(); setActiveTab('limits'); }}
                className={`px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'limits'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>حد اللعب</span>
              </button>

              <button
                onClick={() => { sound.playTap(); setActiveTab('stats'); }}
                className={`px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'stats'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>التقدم</span>
              </button>

              <button
                onClick={() => { sound.playTap(); setActiveTab('tips'); }}
                className={`px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'tips'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>نصائح الأهل</span>
              </button>
            </div>

            {/* محتوى التبويب النشط */}
            <div className="flex-1 overflow-y-auto pr-1 pl-1 py-3">
              {activeTab === 'customization' && (
                <div className="space-y-4 text-xs">
                  {/* تخصيص اسم وجنس الطفل */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-indigo-200 space-y-3">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <User className="w-4 h-4 text-indigo-600" />
                      <span>تخصيص اسم الطفل والمخاطبة</span>
                    </h4>
                    <p className="text-slate-600 text-xs">
                      يتم استخدام هذا الاسم في التحيات، والتشجيع، والحوارات التربوية في اللعبة:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">اسم طفلك:</label>
                        <input
                          type="text"
                          value={settings.childName}
                          onChange={e => handleChildProfileChange(e.target.value, settings.childGender)}
                          placeholder="مثلاً: لؤلؤ، عمر، سارة..."
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-none font-bold text-sm"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">صيغة المخاطبة:</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleChildProfileChange(settings.childName, 'boy')}
                            className={`p-2 rounded-xl border font-bold flex items-center justify-center gap-1 cursor-pointer transition ${
                              settings.childGender === 'boy'
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-300'
                            }`}
                          >
                            <span>👦</span>
                            <span>يا بطل (مذكر)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleChildProfileChange(settings.childName, 'girl')}
                            className={`p-2 rounded-xl border font-bold flex items-center justify-center gap-1 cursor-pointer transition ${
                              settings.childGender === 'girl'
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-300'
                            }`}
                          >
                            <span>👧</span>
                            <span>يا بطلة (مؤنث)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* مفاتيح الصوت والاهتزاز */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <Settings className="w-4 h-4 text-slate-600" />
                      <span>المؤثرات التفاعلية العامة</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-800 block">الصوت التفاعلي</span>
                          <span className="text-[11px] text-slate-500">تشغيل الأصوات والأهازيج</span>
                        </div>
                        <button
                          onClick={() => handleToggleSound(!settings.soundEnabled)}
                          className={`px-3 py-1 rounded-lg font-bold text-xs cursor-pointer ${
                            settings.soundEnabled
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {settings.soundEnabled ? 'مفعل' : 'مكتوم'}
                        </button>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-800 block">الاهتزاز اللمسي (Haptics)</span>
                          <span className="text-[11px] text-slate-500">اهتزاز لطيف عند النقر على الهواتف</span>
                        </div>
                        <button
                          onClick={() => handleToggleHaptics(!settings.hapticsEnabled)}
                          className={`px-3 py-1 rounded-lg font-bold text-xs cursor-pointer ${
                            settings.hapticsEnabled
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {settings.hapticsEnabled ? 'مفعل' : 'معطل'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'audio_studio' && (
                <ParentVoiceStudio onSettingsChanged={onSettingsUpdated} />
              )}

              {activeTab === 'scenarios' && (
                <CustomScenarioManager onSettingsChanged={onSettingsUpdated} />
              )}

              {activeTab === 'limits' && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      <span>الحد الزمني اليومي للعب</span>
                    </h4>
                    <span className="font-bold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full">
                      المتبقي اليوم: {Math.max(0, settings.dailyLimitMinutes - Math.round(todaySeconds / 60))} دقيقة
                    </span>
                  </div>
                  <p className="text-slate-600 leading-normal">
                    اختر المدة المسموح بها يومياً. بعد انتهاء الوقت، سيذهب الرفيق للنوم لتعويد الطفل على التوازن.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[10, 15, 20, 30, 999].map(mins => (
                      <button
                        key={mins}
                        onClick={() => handleTimeLimitChange(mins)}
                        className={`px-3.5 py-2 rounded-xl font-bold transition border cursor-pointer ${
                          settings.dailyLimitMinutes === mins
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {mins === 999 ? 'بدون حد (مفتوح)' : `${mins} دقيقة`}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleResetPlaytime}
                    className="flex items-center gap-1.5 text-xs text-rose-600 font-bold hover:underline pt-2 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>تصفير وقت اللعب لليوم (إلغاء شاشة النوم)</span>
                  </button>
                </div>
              )}

              {activeTab === 'stats' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                      <span className="text-2xl font-black text-emerald-700 block">{totalMagicWords}</span>
                      <span className="text-xs text-emerald-900 font-bold">كلمات سحرية</span>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-center">
                      <span className="text-2xl font-black text-amber-700 block">{totalCryingChosen}</span>
                      <span className="text-xs text-amber-900 font-bold">نوبات بكاء</span>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200 text-center">
                      <span className="text-2xl font-black text-blue-700 block">{totalStagesCompleted}</span>
                      <span className="text-xs text-blue-900 font-bold">مراحل مكتملة</span>
                    </div>
                    <div className="p-3 bg-teal-50 rounded-2xl border border-teal-200 text-center">
                      <span className="text-2xl font-black text-teal-700 block">{uniqueStagesCompleted}/9</span>
                      <span className="text-xs text-teal-900 font-bold">مراحل مختلفة</span>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-center">
                      <span className="text-2xl font-black text-purple-700 block">{totalDays}</span>
                      <span className="text-xs text-purple-900 font-bold">أيام النشاط</span>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                        <BarChart3 className="w-4 h-4 text-indigo-600" />
                        <span>نسبة الحوار مقابل نوبات البكاء</span>
                      </h4>
                      {stats.length < 2 && (
                        <button
                          onClick={handleSeedDemoData}
                          className="text-[11px] text-indigo-600 font-bold hover:underline cursor-pointer"
                        >
                          توليد بيانات تجريبية
                        </button>
                      )}
                    </div>
                    {totalMagicWords + totalCryingChosen === 0 ? (
                      <p className="text-slate-500 py-3 text-center">
                        لا توجد بيانات كافية بعد. دع طفلك يجرب اللعبة بضع مرات!
                      </p>
                    ) : (
                      <div>
                        <div className="h-6 w-full rounded-full bg-slate-200 overflow-hidden flex">
                          <div
                            style={{
                              width: `${Math.round((totalMagicWords / (totalMagicWords + totalCryingChosen || 1)) * 100)}%`,
                            }}
                            className="bg-emerald-500 h-full flex items-center justify-center text-[10px] text-white font-bold"
                          >
                            {totalMagicWords > 0 && `${Math.round((totalMagicWords / (totalMagicWords + totalCryingChosen || 1)) * 100)}%`}
                          </div>
                          <div
                            style={{
                              width: `${Math.round((totalCryingChosen / (totalMagicWords + totalCryingChosen || 1)) * 100)}%`,
                            }}
                            className="bg-amber-400 h-full flex items-center justify-center text-[10px] text-amber-950 font-bold"
                          >
                            {totalCryingChosen > 0 && `${Math.round((totalCryingChosen / (totalMagicWords + totalCryingChosen || 1)) * 100)}%`}
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-2 font-medium text-slate-600">
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                            استخدام الحوار ({totalMagicWords})
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                            اختيار البكاء ({totalCryingChosen})
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'tips' && (
                <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-3">
                  <h4 className="font-bold text-amber-950 flex items-center gap-1.5 text-sm">
                    <BookOpen className="w-4 h-4 text-amber-700" />
                    <span>نصائح تربوية عملية لكِ</span>
                  </h4>
                  <div className="space-y-2.5">
                    {DIALOGUES.parentTips.map((tipItem, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-amber-200/80 shadow-xs text-xs">
                        <h5 className="font-black text-amber-900 mb-1">{idx + 1}. {tipItem.title}</h5>
                        <p className="text-slate-700 leading-relaxed">{tipItem.tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1 text-emerald-700 font-bold">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>البيانات والتسجيلات الصوتية محفوظة بأمان على جهازك فقط</span>
              </span>
              <button
                onClick={handleTestAudio}
                disabled={isTestingAudio}
                className="text-indigo-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{isTestingAudio ? 'فحص...' : 'فحص الصوت'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
