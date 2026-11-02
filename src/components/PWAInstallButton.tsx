import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 px-3.5 py-1.5 text-xs md:text-sm font-bold text-white shadow-md transition touch-manipulation cursor-pointer border border-emerald-300"
      >
        <Download className="w-4 h-4" />
        <span>تثبيت اللعبة</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 px-3.5 py-1.5 text-xs md:text-sm font-bold text-white shadow-md transition touch-manipulation cursor-pointer border border-emerald-300"
        >
          <Download className="w-4 h-4" />
          <span>تثبيت على الشاشة</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border-4 border-amber-300 text-right">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-amber-950">تثبيت اللعبة على الآيفون / الآيباد</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-full p-1 bg-amber-100 text-amber-900 hover:bg-amber-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed space-y-2">
                1. اضغط على زر <strong>المشاركة (Share)</strong> في شريط متصفح سفاري.<br />
                2. انزل للأسفل واختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.<br />
                3. ستعمل اللعبة مثل تطبيق أصلي بدون إنترنت!
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-2xl bg-amber-500 py-3 text-sm font-bold text-white hover:bg-amber-600 active:bg-amber-700 shadow"
              >
                فهمت، شكراً!
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
