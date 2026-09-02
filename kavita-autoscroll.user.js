// ==UserScript==
// @name         Kavita Webtoon Auto-scroll
// @namespace    https://github.com/nautxx/kavita-autoscroll
// @version      0.2.0
// @description  Adjustable, pausable auto-scrolling for Kavita's Webtoon reader.
// @author       nautxx
// @license      MIT
// @match        *://*/*/manga/*
// @homepageURL  https://github.com/nautxx/kavita-autoscroll
// @supportURL   https://github.com/nautxx/kavita-autoscroll/issues
// @downloadURL  https://raw.githubusercontent.com/nautxx/kavita-autoscroll/main/kavita-autoscroll.user.js
// @updateURL    https://raw.githubusercontent.com/nautxx/kavita-autoscroll/main/kavita-autoscroll.user.js
// @grant        none
// @run-at       document-idle
// @noframes
// ==/UserScript==

(() => {
  'use strict';

  const VERSION = '0.2.0';
  const INSTALL_MARKER = 'data-kavita-autoscroll';
  const STORAGE_KEY = 'kavita-autoscroll.speed';
  const DEFAULT_SPEED = 55;
  const MIN_SPEED = 10;
  const MAX_SPEED = 300;
  const READER_ROUTE = /\/manga(?:\/|$)/i;
  const CONTROL_ID = 'kavita-autoscroll';
  const ICONS = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>',
  };

  if (document.documentElement.hasAttribute(INSTALL_MARKER)) return;
  document.documentElement.setAttribute(INSTALL_MARKER, VERSION);

  let running = false;
  let speed = clamp(Number(localStorage.getItem(STORAGE_KEY)) || DEFAULT_SPEED);
  let animationFrame = 0;
  let previousTime = 0;
  let fractionalDistance = 0;
  let lastAutomaticScroll = 0;
  let controls;
  let toggleButton;
  let speedOutput;
  let speedSlider;

  function clamp(value) {
    return Math.min(MAX_SPEED, Math.max(MIN_SPEED, value));
  }

  function isReaderRoute() {
    return READER_ROUTE.test(location.pathname);
  }

  function isEditableTarget(target) {
    return target instanceof HTMLElement && (
      target.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
    );
  }

  function findScrollContainer() {
    const reader = document.querySelector('.reader');
    const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
    const readerOwnsScroll = reader instanceof HTMLElement &&
      (Boolean(fullscreenElement) || /(auto|scroll)/.test(getComputedStyle(reader).overflowY)) &&
      reader.scrollHeight > reader.clientHeight;

    // This mirrors Kavita's InfiniteScrollerComponent: the promoted .reader
    // owns scrolling in fullscreen; otherwise the browser viewport/body does.
    return readerOwnsScroll ? reader : document.body;
  }

  function scrollByPixels(element, pixels) {
    lastAutomaticScroll = performance.now();
    if (element !== document.body) {
      element.scrollTop += pixels;
      return element.scrollTop;
    }

    // Kavita subscribes to scroll events on document.body outside fullscreen.
    // Safari's standards-mode scroll owner can nevertheless vary, so try each
    // browser representation in order and stop as soon as one actually moves.
    const bodyBefore = document.body.scrollTop;
    document.body.scrollTop = bodyBefore + pixels;
    if (document.body.scrollTop !== bodyBefore) return document.body.scrollTop;

    const rootBefore = document.documentElement.scrollTop;
    document.documentElement.scrollTop = rootBefore + pixels;
    if (document.documentElement.scrollTop !== rootBefore) return document.documentElement.scrollTop;

    const windowBefore = window.scrollY;
    window.scrollBy(0, pixels);
    return window.scrollY !== windowBefore ? window.scrollY : bodyBefore;
  }

  function tick(now) {
    if (!running) return;

    if (!previousTime) previousTime = now;
    const elapsedSeconds = Math.min((now - previousTime) / 1000, 0.1);
    previousTime = now;
    fractionalDistance += speed * elapsedSeconds;

    const wholePixels = Math.floor(fractionalDistance);
    if (wholePixels > 0) {
      fractionalDistance -= wholePixels;
      const scrollContainer = findScrollContainer();
      scrollByPixels(scrollContainer, wholePixels);
    }

    animationFrame = requestAnimationFrame(tick);
  }

  function setRunning(nextRunning) {
    running = nextRunning && isReaderRoute();
    previousTime = 0;
    fractionalDistance = 0;
    const action = running ? 'Pause' : 'Start';
    toggleButton.innerHTML = running ? ICONS.pause : ICONS.play;
    toggleButton.setAttribute('aria-label', `${action} auto-scroll`);
    toggleButton.title = `${action} auto-scroll (S)`;
    toggleButton.setAttribute('aria-pressed', String(running));
    controls.dataset.running = String(running);

    cancelAnimationFrame(animationFrame);
    if (running) animationFrame = requestAnimationFrame(tick);
  }

  function setSpeed(nextSpeed) {
    speed = clamp(Number(nextSpeed));
    speedSlider.value = String(speed);
    speedOutput.textContent = `${speed} px/s`;
    localStorage.setItem(STORAGE_KEY, String(speed));
  }

  function installControls() {
    if (document.getElementById(CONTROL_ID)) return;

    const style = document.createElement('style');
    style.textContent = `
      #${CONTROL_ID} {
        position: fixed;
        right: max(16px, env(safe-area-inset-right));
        bottom: max(16px, env(safe-area-inset-bottom));
        z-index: 2147483647;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border: 1px solid rgba(255,255,255,.24);
        border-radius: 999px;
        color: #fff;
        background: rgba(18,18,18,.88);
        box-shadow: 0 4px 18px rgba(0,0,0,.35);
        font: 13px/1.2 system-ui, sans-serif;
        backdrop-filter: blur(8px);
        user-select: none;
        -webkit-user-select: none;
      }
      #${CONTROL_ID}[hidden] { display: none; }
      #${CONTROL_ID} button {
        display: grid;
        place-items: center;
        width: 34px;
        height: 34px;
        min-width: 34px;
        padding: 0;
        border: 0;
        border-radius: 999px;
        color: #fff;
        background: #6f42c1;
        cursor: pointer;
      }
      #${CONTROL_ID}[data-running="true"] button { background: #b02a37; }
      #${CONTROL_ID} button:focus-visible {
        outline: 2px solid #fff;
        outline-offset: 2px;
      }
      #${CONTROL_ID} button svg {
        width: 16px;
        height: 16px;
        fill: currentColor;
      }
      #${CONTROL_ID} input { width: min(30vw, 150px); }
      #${CONTROL_ID} output { min-width: 58px; font-variant-numeric: tabular-nums; }
    `;
    document.head.append(style);

    controls = document.createElement('aside');
    controls.id = CONTROL_ID;
    controls.setAttribute('aria-label', 'Webtoon auto-scroll controls');
    controls.innerHTML = `
      <button type="button" aria-pressed="false" aria-label="Start auto-scroll" title="Start auto-scroll (S)">${ICONS.play}</button>
      <input type="range" min="${MIN_SPEED}" max="${MAX_SPEED}" step="5" aria-label="Scroll speed">
      <output></output>
    `;
    document.body.append(controls);

    toggleButton = controls.querySelector('button');
    speedSlider = controls.querySelector('input');
    speedOutput = controls.querySelector('output');
    toggleButton.addEventListener('click', () => setRunning(!running));
    speedSlider.addEventListener('input', () => setSpeed(speedSlider.value));
    setSpeed(speed);
    syncRoute();
  }

  function syncRoute() {
    const readerActive = isReaderRoute();
    controls.hidden = !readerActive;
    if (!readerActive && running) setRunning(false);
  }

  function pauseForManualInput(event) {
    if (!running || controls.contains(event.target)) return;
    setRunning(false);
  }

  document.addEventListener('wheel', pauseForManualInput, { passive: true, capture: true });
  document.addEventListener('touchstart', pauseForManualInput, { passive: true, capture: true });
  document.addEventListener('pointerdown', pauseForManualInput, { passive: true, capture: true });
  document.addEventListener('scroll', (event) => {
    if (running && performance.now() - lastAutomaticScroll > 150) pauseForManualInput(event);
  }, { passive: true, capture: true });
  document.addEventListener('keydown', (event) => {
    if (isEditableTarget(event.target)) return;
    if (event.key.toLowerCase() === 's' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      setRunning(!running);
    } else if (event.key === '[') {
      setSpeed(speed - 5);
    } else if (event.key === ']') {
      setSpeed(speed + 5);
    }
  });

  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    queueMicrotask(syncRoute);
  };
  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    queueMicrotask(syncRoute);
  };
  addEventListener('popstate', syncRoute);

  installControls();
})();
