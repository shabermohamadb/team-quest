/**
 * Browser Fullscreen API Utility & Hook
 * Safely manages full-screen mode across desktop, tablet, and mobile browsers.
 */
import { useState, useEffect, useCallback } from 'react';

export function isBrowserFullscreen() {
  if (typeof document === 'undefined') return false;
  return Boolean(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

export function requestFullscreenMode() {
  if (typeof document === 'undefined') return Promise.resolve(false);
  try {
    const docEl = document.documentElement;
    const requestMethod =
      docEl.requestFullscreen ||
      docEl.webkitRequestFullscreen ||
      docEl.mozRequestFullScreen ||
      docEl.msRequestFullscreen;

    if (requestMethod) {
      const res = requestMethod.call(docEl);
      if (res && typeof res.then === 'function') {
        return res
          .then(() => true)
          .catch((err) => {
            console.log('[Fullscreen] Request not allowed or cancelled:', err?.message || err);
            return false;
          });
      }
      return Promise.resolve(true);
    }
  } catch (err) {
    console.log('[Fullscreen] Error calling requestFullscreen:', err?.message || err);
  }
  return Promise.resolve(false);
}

export function exitFullscreenMode() {
  if (typeof document === 'undefined') return Promise.resolve(false);
  try {
    const exitMethod =
      document.exitFullscreen ||
      document.webkitExitFullscreen ||
      document.mozCancelFullScreen ||
      document.msExitFullscreen;

    if (exitMethod && isBrowserFullscreen()) {
      const res = exitMethod.call(document);
      if (res && typeof res.then === 'function') {
        return res.then(() => true).catch(() => false);
      }
      return Promise.resolve(true);
    }
  } catch (err) {
    console.log('[Fullscreen] Error calling exitFullscreen:', err?.message || err);
  }
  return Promise.resolve(false);
}

export function useFullscreenStatus() {
  const [isFullscreen, setIsFullscreen] = useState(isBrowserFullscreen);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(isBrowserFullscreen());
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const request = useCallback(() => requestFullscreenMode(), []);
  const exit = useCallback(() => exitFullscreenMode(), []);

  return { isFullscreen, request, exit };
}
