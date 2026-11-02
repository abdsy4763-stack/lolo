import React, { useState } from 'react';
import { Plus, Trash2, CheckCircle2, ToggleLeft, ToggleRight, Sparkles, BookOpen, AlertCircle } from 'lucide-react';
import { CustomEducationalScenario, ParentSettings } from '../types';
import { DIALOGUES } from '../data/dialogue';
import { Storage } from '../utils/storage';
import { sound } from '../utils/audio';

interface CustomScenarioManagerProps {
  onSettingsChanged: () => void;
}

export const CustomScenarioManager: React.FC<CustomScenarioManagerProps> = ({
  onSettingsChanged,
}) => {
  const [settings, setSettings] = useState<ParentSettings>(Storage.getSettings());
  const [customScenarios, setCustomScenarios] = useState<CustomEducationalScenario[]>(() =>
    Storage.getCustomScenarios()
  );

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newIcon, setNewIcon] = useState('🦷');
  const [newChildRequest, setNewChildRequest] = useState('');
  const [newMomInitial, setNewMomInitial] = useState('');
  const [newCompromise, setNewCompromise] = useState('');
  const [newPraise, setNewPraise] = useState('');
  const [formError, setFormError] = useState('');

  const builtInRounds = DIALOGUES.magicWords.rounds;

  const handleToggleScenario = (scenarioId: string, currentEnabled: boolean) => {
    sound.playTap();
    const updatedIds = Storage.toggleScenarioEnabled(scenarioId, !currentEnabled);
    setSettings(prev => ({ ...prev, enabledScenarioIds: updatedIds }));
    onSettingsChanged();
  };

  const handleSaveNewScenario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newChildRequest.trim() || !newMomInitial.trim()) {
      setFormError('يرجى ملء الحقول الأساسية: العنوان، وطلب الطفل، ورد الأم.');
      return;
    }

    sound.playTap();
    const scenario: CustomEducationalScenario = {
      id: `custom_${Date.now()}`,
      title: newTitle.trim(),
      icon: newIcon.trim() || '🌟',
      targetLabel: newTitle.trim(),
      companionRequest: newChildRequest.trim(),
      momInitial: newMomInitial.trim(),
      compromiseProposal:
        newCompromise.trim() ||
        'ما رأيك أن نتفق على حل وسط يُسعدنا معاً ونجرب خطوة بخطوة؟',
      fullRewardPraise:
        newPraise.trim() ||
        'يا لك من بطل ذكي ومفاوض بارع! فخور بأسلوبك الراقي!',
      enabled: true,
      isUserCreated: true,
    };

    const updated = Storage.saveCustomScenario(scenario);
    setCustomScenarios(updated);
    setSettings(Storage.getSettings());
    sound.playSuccessChime();

    // تصفير النموذج
    setNewTitle('');
    setNewChildRequest('');
    setNewMomInitial('');
    setNewCompromise('');
    setNewPraise('');
    setIsAddingNew(false);
    setFormError('');
    onSettingsChanged();
  };

  const handleDeleteCustom = (id: string) => {
    sound.playTap();
    const updated = Storage.deleteCustomScenario(id);
    setCustomScenarios(updated);
    setSettings(Storage.getSettings());
    onSettingsChanged();
  };

  const handleDifficultyChange = (diff: 'normal' | 'easy') => {
    sound.playTap();
    const updated = Storage.saveSettings({ rainbowDifficulty: diff });
    setSettings(updated);
    onSettingsChanged();
  };

  const sampleIcons = ['🦷', '👟', '🛁', '📖', '🥛', '🎒', '🧩', '🎨', '🚲', '🥦'];

  return (
    <div className="space-y-5 text-right">
      {/* تخصيص صعوبة قوس الأمل */}
      <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200">
        <h4 className="font-bold text-amber-950 text-sm mb-1.5 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span>مستوى صعوبة قوس الأمل والتفاوض</span>
        </h4>
        <p className="text-xs text-slate-600 mb-3">
          اختر طول قوس الأمل بما يناسب عمر طفلك ومرحلته التطورية:
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            onClick={() => handleDifficultyChange('easy')}
            className={`p-3 rounded-xl border font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
              settings.rainbowDifficulty === 'easy'
                ? 'bg-amber-500 text-white border-amber-600 shadow'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <span className="text-sm font-black">مبسط (3 ألوان)</span>
            <span className="text-[10px] opacity-80">للأطفال الصغار (3 - 4 سنوات)</span>
          </button>
          <button
            onClick={() => handleDifficultyChange('normal')}
            className={`p-3 rounded-xl border font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
              settings.rainbowDifficulty === 'normal'
                ? 'bg-amber-500 text-white border-amber-600 shadow'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <span className="text-sm font-black">عادي (5 ألوان كاملة)</span>
            <span className="text-[10px] opacity-80">للأطفال الأكبر (5 - 7 سنوات)</span>
          </button>
        </div>
      </div>

      {/* قائمة المواقف التربوية وتفعيلها */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-slate-800 text-sm md:text-base flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-teal-600" />
              <span>المواقف التربوية في اللعبة</span>
            </h4>
            <p className="text-xs text-slate-500">
              فعّل أو عطل أي موقف لتركيز تجربة طفلك على التحديات التي يواجهها حالياً
            </p>
          </div>
          <button
            onClick={() => {
              sound.playTap();
              setIsAddingNew(!isAddingNew);
            }}
            className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{isAddingNew ? 'إغلاق النموذج' : 'إضافة موقف مخصص'}</span>
          </button>
        </div>

        {/* نموذج إضافة موقف جديد */}
        {isAddingNew && (
          <form
            onSubmit={handleSaveNewScenario}
            className="p-4 bg-teal-50/80 rounded-2xl border-2 border-teal-300 space-y-3 text-xs"
          >
            <h5 className="font-bold text-teal-950 text-sm flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-teal-700" />
              <span>إضافة موقف تربوي خاص بعائلتك</span>
            </h5>

            {formError && (
              <p className="text-rose-600 font-bold bg-rose-50 p-2 rounded-lg border border-rose-200">
                {formError}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">عنوان الموقف:</label>
                <input
                  type="text"
                  placeholder="مثال: تنظيف الأسنان قبل النوم"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:border-teal-500 focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">الأيقونة (إيموجي):</label>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newIcon}
                    onChange={e => setNewIcon(e.target.value)}
                    className="w-12 text-center p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-base"
                  />
                  <div className="flex gap-1 overflow-x-auto py-1">
                    {sampleIcons.map(ic => (
                      <button
                        type="button"
                        key={ic}
                        onClick={() => setNewIcon(ic)}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-sm cursor-pointer"
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">طلب أو اعتراض الطفل:</label>
              <input
                type="text"
                placeholder="مثال: لا أريد تفريش أسناني، أريد النوم فوراً!"
                value={newChildRequest}
                onChange={e => setNewChildRequest(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">رد الأم/الأب المبدئي الهادئ:</label>
              <input
                type="text"
                placeholder="مثال: لا يا حبيبي، الفرشاة تحمي أسنانك البيضاء من سوسة الليل."
                value={newMomInitial}
                onChange={e => setNewMomInitial(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">الحل الوسط المقترح (اختياري):</label>
              <input
                type="text"
                placeholder="مثال: ما رأيك أن نتسابق مع أنشودة الدقيقة الواحدة ونشاهد رغوة الصابون؟"
                value={newCompromise}
                onChange={e => setNewCompromise(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-4 py-2 bg-white text-slate-600 rounded-xl font-bold border border-slate-300 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
              >
                حفظ وإضافة للعبة
              </button>
            </div>
          </form>
        )}

        {/* شبكة المواقف الحالية */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {builtInRounds.map(round => {
            const isEnabled = settings.enabledScenarioIds.includes(round.id);
            return (
              <div
                key={round.id}
                className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 transition ${
                  isEnabled ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-2xl shrink-0">{round.icon}</span>
                  <div className="min-w-0">
                    <h5 className="font-bold text-slate-800 text-xs md:text-sm truncate">{round.title}</h5>
                    <p className="text-[11px] text-slate-500 truncate">{round.targetLabel}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleScenario(round.id, isEnabled)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${
                    isEnabled
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isEnabled ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>مفعل</span>
                    </>
                  ) : (
                    <span>معطل</span>
                  )}
                </button>
              </div>
            );
          })}

          {/* المواقف المخصصة المضافة من الأهل */}
          {customScenarios.map(custom => {
            const isEnabled = settings.enabledScenarioIds.includes(custom.id);
            return (
              <div
                key={custom.id}
                className="p-3 rounded-2xl border-2 border-teal-300 bg-teal-50/50 flex items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-2xl shrink-0">{custom.icon}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h5 className="font-bold text-teal-950 text-xs md:text-sm truncate">{custom.title}</h5>
                      <span className="text-[9px] font-black bg-teal-200 text-teal-800 px-1.5 py-0.2 rounded-md">
                        مخصص
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{custom.companionRequest}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleToggleScenario(custom.id, isEnabled)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      isEnabled
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isEnabled ? 'مفعل' : 'معطل'}
                  </button>
                  <button
                    onClick={() => handleDeleteCustom(custom.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                    title="حذف الموقف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
