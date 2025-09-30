import { useEffect, useState } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isInstalling: boolean;
  isWaiting: boolean;
  isControlling: boolean;
  error: string | null;
  registration: ServiceWorkerRegistration | null;
}

interface ServiceWorkerActions {
  register: () => Promise<void>;
  skipWaiting: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
}

export function useServiceWorker(): ServiceWorkerState & ServiceWorkerActions {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: 'serviceWorker' in navigator,
    isRegistered: false,
    isInstalling: false,
    isWaiting: false,
    isControlling: !!navigator.serviceWorker?.controller,
    error: null,
    registration: null
  });

  const updateState = (updates: Partial<ServiceWorkerState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const register = async () => {
    if (!state.isSupported) {
      updateState({ error: 'Service Workers are not supported in this browser' });
      return;
    }

    try {
      updateState({ isInstalling: true, error: null });
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      updateState({
        isRegistered: true,
        isInstalling: false,
        registration
      });

      console.log('Service Worker registered successfully:', registration);

      // Set up event listeners
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        updateState({ isInstalling: true });

        newWorker.addEventListener('statechange', () => {
          switch (newWorker.state) {
            case 'installed':
              updateState({ 
                isInstalling: false,
                isWaiting: !!navigator.serviceWorker.controller 
              });
              break;
            case 'activated':
              updateState({ 
                isWaiting: false,
                isControlling: true 
              });
              break;
          }
        });
      });

    } catch (error) {
      console.error('Service Worker registration failed:', error);
      updateState({
        isInstalling: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      });
    }
  };

  const skipWaiting = async () => {
    if (state.registration?.waiting) {
      state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  const checkForUpdates = async () => {
    if (state.registration) {
      await state.registration.update();
    }
  };

  useEffect(() => {
    if (!state.isSupported) return;

    // Listen for controller changes
    const handleControllerChange = () => {
      updateState({ isControlling: !!navigator.serviceWorker.controller });
      // Reload the page when a new service worker takes control
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // Check if there's already a service worker controlling the page
    if (navigator.serviceWorker.controller) {
      updateState({ isControlling: true });
    }

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [state.isSupported]);

  return {
    ...state,
    register,
    skipWaiting,
    checkForUpdates
  };
}

// Hook for detecting online/offline status
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// Hook for installation prompt
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return false;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    setDeferredPrompt(null);
    setIsInstallable(false);
    
    return outcome === 'accepted';
  };

  return {
    isInstallable,
    isInstalled,
    promptInstall
  };
}