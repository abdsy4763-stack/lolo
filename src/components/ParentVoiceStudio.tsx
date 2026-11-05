import React, { useState, useEffect } from 'react';
import { Mic, Square, Play, Trash2, CheckCircle2, AlertCircle, Volume2, Sparkles, RefreshCw } from 'lucide-react';
import { ParentVoiceClipKey, ParentVoiceRecording, VoiceSourceMode } from '../types';
import { recordedVoices, PARENT_VOICE_TEMPLATES } from '../utils/recordedVoices';
import { Storage } from '../utils/storage';
import { sound, audioManager } from '../utils/audio';

interface ParentVoiceStudioProps {
  onSettingsChanged: () => void;
}

export const ParentVoiceStudio: React.FC<ParentVoiceStudioProps> = ({
  onSettingsChanged,
}) => {
  const [settings, setSettings] = useState(Storage.getSettings());
  const [recordings, setRecordings] = useState<Record<string, ParentVoiceRecording>>({});
  const [activeRecordingKey, setActiveRecordingKey] = useState<ParentVoiceClipKey | null>(null);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [currentlyPlayingKey, setCurrentlyPlayingKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    refreshRecordings();
    setSettings(Storage.getSettings());
  }, []);

  const refreshRecordings = () => {
    setRecordings(Storage.getAllParentVoiceRecordings());
  };

  const handleStartRecording = async (key: ParentVoiceClipKey) => {
    sound.playTap();
    setErrorMessage(null);
    try {
      setActiveRecordingKey(key);
      setRecordingDurationMs(0);
      await recordedVoices.startRecording(ms => {
        setRecordingDurationMs(ms);
      });
    } catch (err: unknown) {
      setActiveRecordingKey(null);
      const msg = err instanceof Error ? err.message : 'تعذر فتح الميكروفون';
      setErrorMessage(msg);
    }
  };

  const handleStopRecording = async (key: ParentVoiceClipKey) => {
    sound.playTap();
    try {
      await recordedVoices.stopRecording(key);
      setActiveRecordingKey(null);
      setRecordingDurationMs(0);
      refreshRecordings();
      sound.playSuccessChime();

      // تفعيل وضع صوت الأهل تلقائياً إذا سجل
      if (settings.voiceMode !== 'parent_custom') {
        const updated = Storage.saveSettings({ voiceMode: 'parent_custom' });
        setSettings(updated);
        onSettingsChanged();
      }
    } catch (err: unknown) {
      setActiveRecordingKey(null);
      const msg = err instanceof Error ? err.message : 'فشل حفظ التسجيل';
      setErrorMessage(msg);
    }
  };

  const handleCancelRecording = () => {
    sound.playTap();
    recordedVoices.cancelRecording();
    setActiveRecordingKey(null);
    setRecordingDurationMs(0);
  };

  const handlePlayClip = (key: ParentVoiceClipKey) => {
    sound.playTap();
    setCurrentlyPlayingKey(key);
    const played = recordedVoices.playParentClip(key, () => {
      setCurrentlyPlayingKey(null);
    });
    if (!played) {
      setCurrentlyPlayingKey(null);
    }
  };

  const handleDeleteClip = (key: ParentVoiceClipKey) => {
    sound.playTap();
    Storage.deleteParentVoiceRecording(key);
    refreshRecordings();
    onSettingsChanged();
  };

  const handleVoiceModeChange = (mode: VoiceSourceMode) => {
    sound.playTap();
    const updated = Storage.saveSettings({ voiceMode: mode });
    setSettings(updated);
    onSettingsChanged();
  };

  const handleRateChange = (newRate: number) => {
    const updated = Storage.saveSettings({ voiceRate: newRate });
    setSettings(updated);
    onSettingsChanged();
  };

  const handlePitchChange = (newPitch: number) => {
    const updated = Storage.saveSettings({ speechPitch: newPitch });
    setSettings(updated);
    onSettingsChanged();
  };

  const handleTestSpeech = () => {
    sound.playTap();
    sound.speak(`أهلاً بك يا ${settings.childName}! هذا اختبار الصوت المخصص.`);
  };

  return (
    <div className="space-y-5 text-right">
      {/* اختيار مصدر الصوت الأساسي */}
      <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200">
        <h4 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-indigo-600" />
          <span>مصدر ونمط الصوت في اللعبة</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => handleVoiceModeChange('parent_custom')}
            className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
              settings.voiceMode === 'parent_custom'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="text-base">🎙️</span>
            <span>صوت الأهل المسجل</span>
            <span className="text-[10px] opacity-80">تسجيلاتك بالميكروفون</span>
          </button>

          <button
            onClick={() => handleVoiceModeChange('recorded')}
            className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
              settings.voiceMode === 'recorded'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="text-base">🌟</span>
            <span>الأصوات المسجلة والأهازيج</span>
            <span className="text-[10px] opacity-80">أصوات بشرية مشجعة</span>
          </button>


        </div>
      </div>

      {/* تحكم سرعة الصوت وحدته */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-slate-800 text-xs md:text-sm">ضبط سرعة وحدّة النطق</h4>
          <button
            onClick={handleTestSpeech}
            className="px-3 py-1 bg-white hover:bg-slate-100 text-indigo-700 font-bold text-xs rounded-lg border border-slate-300 shadow-xs flex items-center gap-1 cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>تجربة النطق الآن</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-600">سرعة القراءة (Rate):</span>
              <span className="font-bold text-indigo-600">{settings.voiceRate}x</span>
            </div>
            <input
              type="range"
              min="0.6"
              max="1.2"
              step="0.05"
              value={settings.voiceRate}
              onChange={e => handleRateChange(parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>هادئ وبطيء</span>
              <span>سريع</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-600">طبقة الصوت (Pitch):</span>
              <span className="font-bold text-indigo-600">{settings.speechPitch}</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.5"
              step="0.05"
              value={settings.speechPitch}
              onChange={e => handlePitchChange(parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>صوت وقور/عميق</span>
              <span>نبرة طفولية مرحة</span>
            </div>
          </div>
        </div>
      </div>

      {/* استوديو تسجيل صوت الأهل بالميكروفون */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-slate-800 text-sm md:text-base flex items-center gap-1.5">
              <Mic className="w-4 h-4 text-rose-600" />
              <span>استوديو تسجيل صوت الوالدين (7 مواقف أساسية)</span>
            </h4>
            <p className="text-xs text-slate-500 font-medium">
              سجل بصوتك الحقيقي ليسمعك طفلك داخل اللعبة أثناء المواقف التربوية!
            </p>
          </div>
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
            المسجل: {Object.keys(recordings).length} من {PARENT_VOICE_TEMPLATES.length}
          </span>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-2.5">
          {PARENT_VOICE_TEMPLATES.map(template => {
            const hasRec = !!recordings[template.key];
            const isRecordingThis = activeRecordingKey === template.key;
            const isPlayingThis = currentlyPlayingKey === template.key;

            return (
              <div
                key={template.key}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isRecordingThis
                    ? 'bg-rose-50/90 border-rose-400 shadow-md ring-2 ring-rose-200'
                    : hasRec
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="text-2xl shrink-0 mt-0.5">{template.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-bold text-slate-800 text-xs md:text-sm">{template.title}</h5>
                        {hasRec && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>مسجل بصوتك</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{template.description}</p>
                      <div className="mt-1.5 p-2 bg-slate-50 rounded-lg text-[11px] text-slate-700 border border-slate-100">
                        <span className="font-bold text-slate-500 block mb-0.5">النص المقترح للتسجيل:</span>
                        «{template.suggestedScript}»
                      </div>
                    </div>
                  </div>

                  {/* أزرار التحكم بالتسجيل */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {isRecordingThis ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-rose-600 animate-pulse flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block animate-ping" />
                          <span>{(recordingDurationMs / 1000).toFixed(1)} ث</span>
                        </span>
                        <button
                          onClick={() => handleStopRecording(template.key)}
                          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <Square className="w-3.5 h-3.5 fill-white" />
                          <span>حفظ</span>
                        </button>
                        <button
                          onClick={handleCancelRecording}
                          className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {hasRec && (
                          <>
                            <button
                              onClick={() => handlePlayClip(template.key)}
                              disabled={isPlayingThis}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                            >
                              <Play className="w-3.5 h-3.5 fill-white" />
                              <span>{isPlayingThis ? 'مشغل...' : 'استماع'}</span>
                            </button>
                            <button
                              onClick={() => handleDeleteClip(template.key)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer transition"
                              title="حذف التسجيل"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => handleStartRecording(template.key)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-xs ${
                            hasRec
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                        >
                          <Mic className="w-3.5 h-3.5" />
                          <span>{hasRec ? 'إعادة تسجيل' : 'تسجيل الآن'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
