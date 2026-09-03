// ==UserScript==
// @name         Kavita Webtoon Auto-scroll
// @namespace    https://github.com/nautxx/kavita-autoscroll
// @version      0.6.1
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

  const VERSION = '0.6.1';
  const INSTALL_MARKER = 'data-kavita-autoscroll';
  const STORAGE_KEY = 'kavita-autoscroll.speed';
  const POSITION_STORAGE_KEY = 'kavita-autoscroll.position';
  const AUTO_START_STORAGE_KEY = 'kavita-autoscroll.auto-start';
  const DEFAULT_SPEED = 100;
  const MIN_SPEED = 25;
  const MAX_SPEED = 600;
  const AUTO_HIDE_DELAY = 2500;
  const READER_MENU_GAP = 8;
  const READER_MENU_TRACK_DURATION = 350;
  const READER_ROUTE = /\/manga(?:\/|$)/i;
  const CONTROL_ID = 'kavita-autoscroll';
  const POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  const injectedConfig = document.currentScript?.dataset ?? {};
  const SPEED_STEP = normalizeSpeedStep(injectedConfig.speedStep);
  const SHORTCUTS = Object.freeze({
    toggle: normalizeShortcut(injectedConfig.toggleKey, 's'),
    slower: normalizeShortcut(injectedConfig.slowerKey, '['),
    faster: normalizeShortcut(injectedConfig.fasterKey, ']'),
  });
  const ICONS = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>',
    position: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.43 12.98c.04-.32.07-.65.07-.98s-.03-.66-.08-.98l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.3 7.3 0 0 0-1.69-.98L14.5 2.42A.49.49 0 0 0 14 2h-4a.49.49 0 0 0-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1a.49.49 0 0 0-.61.22l-2 3.46a.49.49 0 0 0 .12.64l2.11 1.65c-.04.32-.08.66-.08.98s.03.66.08.98l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46c.12.22.38.31.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.04.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.08.49 0 .61-.22l2-3.46a.5.5 0 0 0-.12-.64zM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5"/></svg>',
    autoStart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 0-8.1 5H1l3.6 3.6L8.2 8H6.1A7 7 0 1 1 5 15.7l-1.7 1A9 9 0 1 0 12 3z"/><path d="M10 8v8l6-4z"/></svg>',
  };

  if (document.documentElement.hasAttribute(INSTALL_MARKER)) return;
  document.documentElement.setAttribute(INSTALL_MARKER, VERSION);

  let running = false;
  let speed = clamp(Number(localStorage.getItem(STORAGE_KEY)) || DEFAULT_SPEED);
  let position = normalizePosition(localStorage.getItem(POSITION_STORAGE_KEY));
  let autoStart = localStorage.getItem(AUTO_START_STORAGE_KEY) === 'true';
  let webtoonModeActive = false;
  let animationFrame = 0;
  let autoHideTimer = 0;
  let readerMenuFrame = 0;
  let readerMenuTrackUntil = 0;
  let mouseOverControls = false;
  let previousTime = 0;
  let fractionalDistance = 0;
  let lastAutomaticScroll = 0;
  let controls;
  let toggleButton;
  let speedOutput;
  let speedSlider;
  let positionButton;
  let positionMenu;
  let positionOptions;
  let autoStartToggle;

  function clamp(value) {
    return Math.min(MAX_SPEED, Math.max(MIN_SPEED, value));
  }

  function normalizeShortcut(value, fallback) {
    if (typeof value !== 'string' || value.length === 0) return fallback;
    return value.toLocaleLowerCase() === 'space' ? ' ' : value;
  }

  function normalizeSpeedStep(value) {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 5;
  }

  function shortcutLabel(key) {
    return key === ' ' ? 'Space' : key;
  }

  function isShortcut(event, key) {
    return !event.ctrlKey && !event.metaKey && !event.altKey &&
      event.key.toLocaleLowerCase() === key.toLocaleLowerCase();
  }

  function normalizePosition(value) {
    return POSITIONS.includes(value) ? value : 'bottom-right';
  }

  function isReaderRoute() {
    return READER_ROUTE.test(location.pathname);
  }

  function isWebtoonModeActive() {
    return isReaderRoute() && Boolean(document.querySelector('app-infinite-scroller'));
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

  function cancelAutoHide() {
    clearTimeout(autoHideTimer);
    autoHideTimer = 0;
  }

  function hideControls() {
    autoHideTimer = 0;
    const keyboardFocusWithin = controls.contains(document.activeElement) &&
      document.activeElement.matches(':focus-visible');
    if (!running || mouseOverControls || keyboardFocusWithin || !positionMenu.hidden) {
      if (running) scheduleAutoHide();
      return;
    }

    controls.dataset.autohidden = 'true';
  }

  function scheduleAutoHide() {
    cancelAutoHide();
    if (running) autoHideTimer = window.setTimeout(hideControls, AUTO_HIDE_DELAY);
  }

  function revealControls() {
    if (!controls) return;
    controls.dataset.autohidden = 'false';
    scheduleAutoHide();
  }

  function findReaderOverlays(className) {
    const reader = document.querySelector('.reader');
    if (!(reader instanceof HTMLElement)) return [];

    return Array.from(reader.children).filter((child) =>
      child instanceof HTMLElement &&
      child.classList.contains(className) &&
      child.classList.contains('overlay')
    );
  }

  function syncReaderMenuOffsets() {
    if (!controls) return;

    const viewportHeight = window.innerHeight;
    const bottomOverlays = findReaderOverlays('fixed-bottom');
    const menuOpen = bottomOverlays.length > 0;
    const topEdge = menuOpen
      ? Math.max(0, ...findReaderOverlays('fixed-top').map((overlay) =>
          Math.min(viewportHeight, overlay.getBoundingClientRect().bottom)
        ))
      : 0;
    const bottomEdge = menuOpen
      ? Math.max(0, ...bottomOverlays.map((overlay) =>
          Math.min(viewportHeight, viewportHeight - overlay.getBoundingClientRect().top)
        ))
      : 0;

    controls.style.setProperty(
      '--reader-menu-top-edge',
      `${topEdge > 0 ? topEdge + READER_MENU_GAP : 0}px`
    );
    controls.style.setProperty(
      '--reader-menu-bottom-edge',
      `${bottomEdge > 0 ? bottomEdge + READER_MENU_GAP : 0}px`
    );
  }

  function trackReaderMenuOffsets(duration = READER_MENU_TRACK_DURATION) {
    readerMenuTrackUntil = Math.max(readerMenuTrackUntil, performance.now() + duration);
    if (readerMenuFrame) return;

    const track = (now) => {
      syncReaderMenuOffsets();
      if (now < readerMenuTrackUntil) {
        readerMenuFrame = requestAnimationFrame(track);
      } else {
        readerMenuFrame = 0;
      }
    };
    readerMenuFrame = requestAnimationFrame(track);
  }

  function setPosition(nextPosition) {
    position = normalizePosition(nextPosition);
    controls.dataset.position = position;
    localStorage.setItem(POSITION_STORAGE_KEY, position);
    positionOptions.forEach((option) => {
      option.setAttribute('aria-checked', String(option.dataset.value === position));
    });
  }

  function setAutoStart(enabled) {
    autoStart = Boolean(enabled);
    autoStartToggle.setAttribute('aria-pressed', String(autoStart));
    autoStartToggle.title = `${autoStart ? 'Disable' : 'Enable'} auto-start in Webtoon mode`;
    localStorage.setItem(AUTO_START_STORAGE_KEY, String(autoStart));
    if (autoStart && isWebtoonModeActive() && !running) setRunning(true);
  }

  function setPositionMenu(open, restoreFocus = true) {
    positionMenu.hidden = !open;
    positionButton.setAttribute('aria-expanded', String(open));
    if (open) {
      cancelAutoHide();
      const selectedOption = positionMenu.querySelector('[aria-checked="true"]');
      selectedOption?.focus({ preventScroll: true });
    } else {
      if (restoreFocus) positionButton.focus({ preventScroll: true });
      scheduleAutoHide();
    }
  }

  function setRunning(nextRunning) {
    running = nextRunning && isWebtoonModeActive();
    previousTime = 0;
    fractionalDistance = 0;
    const action = running ? 'Pause' : 'Start';
    toggleButton.innerHTML = running ? ICONS.pause : ICONS.play;
    toggleButton.setAttribute('aria-label', `${action} auto-scroll`);
    toggleButton.title = `${action} auto-scroll (${shortcutLabel(SHORTCUTS.toggle)})`;
    toggleButton.setAttribute('aria-pressed', String(running));
    controls.dataset.running = String(running);

    cancelAnimationFrame(animationFrame);
    if (running) {
      animationFrame = requestAnimationFrame(tick);
      scheduleAutoHide();
    } else {
      cancelAutoHide();
      revealControls();
    }
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
        bottom: max(16px, env(safe-area-inset-bottom), var(--reader-menu-bottom-edge, 0px));
        z-index: 2147483647;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 7px 11px 7px 7px;
        border: 1px solid rgba(255, 255, 255, .18);
        border-radius: 999px;
        color: #fff;
        background: rgba(38, 38, 40, .58);
        box-shadow:
          0 8px 24px rgba(0, 0, 0, .24),
          inset 0 1px 0 rgba(255, 255, 255, .16);
        font: 600 13px/1.2 -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
        letter-spacing: -.01em;
        backdrop-filter: blur(30px) saturate(160%);
        -webkit-backdrop-filter: blur(30px) saturate(160%);
        user-select: none;
        -webkit-user-select: none;
        transition: opacity 200ms ease, transform 200ms ease;
        will-change: opacity, transform;
      }
      #${CONTROL_ID}[hidden] { display: none; }
      #${CONTROL_ID}[data-autohidden="true"] {
        opacity: 0;
        transform: translateY(8px) scale(.97);
        pointer-events: none;
      }
      #${CONTROL_ID}[data-position="top-left"] {
        top: max(16px, env(safe-area-inset-top), var(--reader-menu-top-edge, 0px));
        right: auto;
        bottom: auto;
        left: max(16px, env(safe-area-inset-left));
      }
      #${CONTROL_ID}[data-position="top-right"] {
        top: max(16px, env(safe-area-inset-top), var(--reader-menu-top-edge, 0px));
        bottom: auto;
      }
      #${CONTROL_ID}[data-position="bottom-left"] {
        right: auto;
        left: max(16px, env(safe-area-inset-left));
      }
      #${CONTROL_ID}[data-position^="top"][data-autohidden="true"] {
        transform: translateY(-8px) scale(.97);
      }
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
        background: rgba(255, 255, 255, .13);
        cursor: pointer;
        transition: background-color 150ms ease, transform 150ms ease;
      }
      #${CONTROL_ID}[data-running="true"] > .toggle-button { background: rgba(255, 255, 255, .22); }
      #${CONTROL_ID} button:hover { background: rgba(255, 255, 255, .2); }
      #${CONTROL_ID} button:active { transform: scale(.94); }
      #${CONTROL_ID} button:focus-visible {
        outline: 3px solid rgba(10, 132, 255, .9);
        outline-offset: 2px;
      }
      #${CONTROL_ID} button svg {
        width: 16px;
        height: 16px;
        fill: currentColor;
      }
      #${CONTROL_ID} input[type="range"] {
        width: min(30vw, 150px);
        height: 26px;
        margin: 0;
        padding: 0;
        accent-color: #0a84ff;
        cursor: pointer;
      }
      #${CONTROL_ID} output {
        min-width: 58px;
        font-variant-numeric: tabular-nums;
      }
      #${CONTROL_ID} .position-menu {
        position: absolute;
        display: flex;
        flex-direction: column;
        gap: 7px;
        padding: 6px;
        border: 1px solid rgba(255, 255, 255, .18);
        border-radius: 14px;
        background: rgba(38, 38, 40, .72);
        box-shadow:
          0 8px 24px rgba(0, 0, 0, .24),
          inset 0 1px 0 rgba(255, 255, 255, .16);
        backdrop-filter: blur(30px) saturate(160%);
        -webkit-backdrop-filter: blur(30px) saturate(160%);
      }
      #${CONTROL_ID} .position-menu[hidden] { display: none; }
      #${CONTROL_ID}[data-position^="bottom"] .position-menu { bottom: calc(100% + 8px); }
      #${CONTROL_ID}[data-position^="top"] .position-menu { top: calc(100% + 8px); }
      #${CONTROL_ID}[data-position$="left"] .position-menu { left: 0; }
      #${CONTROL_ID}[data-position$="right"] .position-menu { right: 0; }
      #${CONTROL_ID} .position-grid {
        display: grid;
        grid-template-columns: repeat(2, 32px);
        gap: 5px;
      }
      #${CONTROL_ID} .position-option {
        width: 32px;
        height: 32px;
        min-width: 32px;
      }
      #${CONTROL_ID} .position-option[aria-checked="true"] {
        background: rgba(10, 132, 255, .72);
      }
      #${CONTROL_ID} .corner-preview {
        position: relative;
        width: 16px;
        height: 16px;
        border: 1.5px solid currentColor;
        border-radius: 4px;
      }
      #${CONTROL_ID} .corner-preview::after {
        content: '';
        position: absolute;
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: currentColor;
      }
      #${CONTROL_ID} [data-value="top-left"] .corner-preview::after { top: 2px; left: 2px; }
      #${CONTROL_ID} [data-value="top-right"] .corner-preview::after { top: 2px; right: 2px; }
      #${CONTROL_ID} [data-value="bottom-left"] .corner-preview::after { bottom: 2px; left: 2px; }
      #${CONTROL_ID} [data-value="bottom-right"] .corner-preview::after { right: 2px; bottom: 2px; }
      #${CONTROL_ID} .auto-start-row {
        display: flex;
        justify-content: center;
        padding-top: 6px;
        border-top: 1px solid rgba(255, 255, 255, .12);
      }
      #${CONTROL_ID}[data-position^="bottom"] .auto-start-row {
        order: -1;
        padding-top: 0;
        padding-bottom: 6px;
        border-top: 0;
        border-bottom: 1px solid rgba(255, 255, 255, .12);
      }
      #${CONTROL_ID} .auto-start-toggle {
        width: 32px;
        height: 32px;
        min-width: 32px;
      }
      #${CONTROL_ID} .auto-start-toggle[aria-pressed="true"] {
        background: rgba(10, 132, 255, .72);
      }
      @media (prefers-reduced-transparency: reduce) {
        #${CONTROL_ID} {
          background: rgba(32, 32, 34, .94);
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        #${CONTROL_ID}, #${CONTROL_ID} button { transition: none; }
      }
    `;
    document.head.append(style);

    controls = document.createElement('aside');
    controls.id = CONTROL_ID;
    controls.setAttribute('aria-label', 'Webtoon auto-scroll controls');
    controls.hidden = true;
    controls.innerHTML = `
      <button class="toggle-button" type="button" aria-pressed="false" aria-label="Start auto-scroll" title="Start auto-scroll (${shortcutLabel(SHORTCUTS.toggle)})">${ICONS.play}</button>
      <input type="range" min="${MIN_SPEED}" max="${MAX_SPEED}" step="${SPEED_STEP}" aria-label="Scroll speed">
      <output></output>
      <button class="position-button" type="button" aria-expanded="false" aria-haspopup="dialog" aria-label="Open auto-scroll settings" title="Auto-scroll settings">${ICONS.position}</button>
      <div class="position-menu" role="dialog" aria-label="Auto-scroll settings" hidden>
        <div class="position-grid" role="menu" aria-label="Control position">
          ${POSITIONS.map((value) => `
            <button class="position-option" type="button" role="menuitemradio" data-value="${value}" aria-checked="false" aria-label="${value.replace('-', ' ')}">
              <span class="corner-preview" aria-hidden="true"></span>
            </button>
          `).join('')}
        </div>
        <div class="auto-start-row">
          <button class="auto-start-toggle" type="button" aria-pressed="false" aria-label="Auto-start in Webtoon mode" title="Enable auto-start in Webtoon mode">${ICONS.autoStart}</button>
        </div>
      </div>
    `;
    document.body.append(controls);

    toggleButton = controls.querySelector('button');
    speedSlider = controls.querySelector('input[type="range"]');
    speedOutput = controls.querySelector('output');
    positionButton = controls.querySelector('.position-button');
    positionMenu = controls.querySelector('.position-menu');
    positionOptions = controls.querySelectorAll('.position-option');
    autoStartToggle = controls.querySelector('.auto-start-toggle');
    toggleButton.addEventListener('click', () => setRunning(!running));
    speedSlider.addEventListener('input', () => {
      setSpeed(speedSlider.value);
      revealControls();
    });
    controls.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse') mouseOverControls = true;
      revealControls();
    });
    controls.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'mouse') mouseOverControls = false;
      scheduleAutoHide();
    });
    controls.addEventListener('focusin', revealControls);
    controls.addEventListener('focusout', scheduleAutoHide);
    positionButton.addEventListener('click', () => setPositionMenu(positionMenu.hidden));
    autoStartToggle.addEventListener('click', () => setAutoStart(!autoStart));
    positionOptions.forEach((option) => {
      option.addEventListener('click', () => {
        setPosition(option.dataset.value);
        setPositionMenu(false);
      });
    });
    setSpeed(speed);
    setPosition(position);
    setAutoStart(autoStart);
    syncReaderState();
    syncReaderMenuOffsets();
  }

  function syncReaderState() {
    const nextWebtoonModeActive = isWebtoonModeActive();
    if (controls.hidden === nextWebtoonModeActive) controls.hidden = !nextWebtoonModeActive;

    if (!nextWebtoonModeActive) {
      if (running) setRunning(false);
    } else if (!webtoonModeActive && autoStart && !running) {
      setRunning(true);
    }

    webtoonModeActive = nextWebtoonModeActive;
  }

  function pauseForManualInput(event) {
    revealControls();
    const outsideControls = !controls.contains(event.target);
    if (outsideControls && !positionMenu.hidden) setPositionMenu(false, false);
    if (!running || !outsideControls) return;
    setRunning(false);
  }

  document.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse') revealControls();
  }, { passive: true });
  document.addEventListener('wheel', pauseForManualInput, { passive: true, capture: true });
  document.addEventListener('touchstart', pauseForManualInput, { passive: true, capture: true });
  document.addEventListener('pointerdown', pauseForManualInput, { passive: true, capture: true });
  document.addEventListener('scroll', (event) => {
    if (running && performance.now() - lastAutomaticScroll > 150) pauseForManualInput(event);
  }, { passive: true, capture: true });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !positionMenu.hidden) {
      event.preventDefault();
      setPositionMenu(false);
      return;
    }
    if (isEditableTarget(event.target)) return;
    revealControls();
    if (!positionMenu.hidden && document.activeElement?.classList.contains('position-option') &&
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      const options = Array.from(positionOptions);
      const currentIndex = Math.max(0, options.indexOf(document.activeElement));
      const offset = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
      options[(currentIndex + offset + options.length) % options.length].focus({ preventScroll: true });
      return;
    }
    if (isShortcut(event, SHORTCUTS.toggle)) {
      event.preventDefault();
      setRunning(!running);
    } else if (isShortcut(event, SHORTCUTS.slower)) {
      event.preventDefault();
      setSpeed(speed - SPEED_STEP);
    } else if (isShortcut(event, SHORTCUTS.faster)) {
      event.preventDefault();
      setSpeed(speed + SPEED_STEP);
    }
  });

  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    queueMicrotask(syncReaderState);
  };
  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    queueMicrotask(syncReaderState);
  };
  addEventListener('popstate', syncReaderState);
  addEventListener('resize', () => trackReaderMenuOffsets());
  window.visualViewport?.addEventListener('resize', () => trackReaderMenuOffsets());
  document.addEventListener('animationstart', (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.classList.contains('overlay') &&
        (target.classList.contains('fixed-top') || target.classList.contains('fixed-bottom'))) {
      trackReaderMenuOffsets();
    }
  }, { capture: true });

  installControls();
  new MutationObserver(() => {
    syncReaderState();
    trackReaderMenuOffsets();
  }).observe(document.body, { childList: true, subtree: true });
})();
