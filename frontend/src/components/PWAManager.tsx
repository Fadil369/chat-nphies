import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useServiceWorker, useOnlineStatus, useInstallPrompt } from '../hooks/useServiceWorker';

export function PWAManager() {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();
  const { isWaiting, skipWaiting } = useServiceWorker();
  const { isInstallable, promptInstall } = useInstallPrompt();
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showOfflineNotification, setShowOfflineNotification] = useState(false);

  useEffect(() => {
    setShowUpdateNotification(isWaiting);
  }, [isWaiting]);

  useEffect(() => {
    // Show install prompt after a delay if app is installable
    if (isInstallable) {
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
      }, 10000); // Show after 10 seconds

      return () => clearTimeout(timer);
    }
  }, [isInstallable]);

  useEffect(() => {
    // Show offline notification when going offline
    if (!isOnline) {
      setShowOfflineNotification(true);
    } else {
      setShowOfflineNotification(false);
    }
  }, [isOnline]);

  const handleUpdate = async () => {
    await skipWaiting();
    setShowUpdateNotification(false);
  };

  const handleInstall = async () => {
    const accepted = await promptInstall();
    setShowInstallPrompt(false);
  };

  return (
    <>
      {/* Update Available Notification */}
      {showUpdateNotification && (
        <div className="fixed top-4 right-4 z-50 max-w-sm bg-primary text-gray-900 rounded-lg shadow-lg p-4 border border-primary/20">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-semibold">
                {t('pwa_update_available')}
              </h3>
              <p className="text-xs mt-1 opacity-90">
                {t('pwa_update_description')}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleUpdate}
                  className="text-xs bg-gray-900 text-primary px-3 py-1 rounded font-medium hover:bg-gray-800 transition-colors"
                >
                  {t('pwa_update_now')}
                </button>
                <button
                  onClick={() => setShowUpdateNotification(false)}
                  className="text-xs text-gray-700 hover:text-gray-900 transition-colors"
                >
                  {t('pwa_update_later')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Install App Prompt */}
      {showInstallPrompt && (
        <div className="fixed bottom-4 left-4 right-4 mx-auto max-w-sm bg-gray-900 border border-primary/20 rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-semibold text-primary">
                {t('pwa_install_available')}
              </h3>
              <p className="text-xs mt-1 text-gray-400">
                {t('pwa_install_description')}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleInstall}
                  className="text-xs bg-primary text-gray-900 px-3 py-1 rounded font-medium hover:bg-primary/90 transition-colors"
                >
                  {t('pwa_install_now')}
                </button>
                <button
                  onClick={() => setShowInstallPrompt(false)}
                  className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {t('pwa_install_dismiss')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offline Notification */}
      {showOfflineNotification && (
        <div className="fixed top-0 left-0 right-0 bg-accent text-white px-4 py-2 text-center text-sm z-50">
          <div className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.5v6m0 7v6M2.5 12h6m7 0h6" />
            </svg>
            <span>{t('pwa_offline_mode')}</span>
          </div>
        </div>
      )}
    </>
  );
}