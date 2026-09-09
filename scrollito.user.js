// ==UserScript==
// @name         Scrollito: auto-scroll for Kavita
// @namespace    https://github.com/nautxx/scrollito
// @version      1.3.1
// @description  Adjustable, pausable auto-scrolling for Kavita's Webtoon reader.
// @author       nautxx
// @license      MIT
// @match        *://*/*/manga/*
// @homepageURL  https://github.com/nautxx/scrollito
// @supportURL   https://github.com/nautxx/scrollito/issues
// @downloadURL  https://raw.githubusercontent.com/nautxx/scrollito/main/scrollito.user.js
// @updateURL    https://raw.githubusercontent.com/nautxx/scrollito/main/scrollito.user.js
// @grant        none
// @run-at       document-idle
// @noframes
// ==/UserScript==

(() => {
  'use strict';

  const VERSION = '1.3.1';
  const INSTALL_MARKER = 'data-scrollito';
  const CALLOUT_MARKER = 'data-scrollito-no-callout';
  const STORAGE_KEY = 'scrollito.speed';
  const POSITION_STORAGE_KEY = 'scrollito.position';
  const AUTO_START_STORAGE_KEY = 'scrollito.auto-start';
  const SLIP_STORAGE_KEY = 'scrollito.slip';
  const SHORTCUTS_STORAGE_KEY = 'scrollito.shortcuts';
  const DEFAULT_SPEED = 100;
  const MIN_SPEED = 25;
  const MAX_SPEED = 600;
  const DEFAULT_SPEED_STEP = 25;
  const AUTO_HIDE_DELAY = 2500;
  const READER_MENU_GAP = 8;
  const READER_MENU_TRACK_DURATION = 350;
  const SCROLL_CONTAINER_TTL = 250;
  const MOMENTUM_SETTLE_DELAY = 120;
  const LONG_PRESS_DELAY = 300;
  const READER_ROUTE = /\/manga(?:\/|$)/i;
  const CONTROL_ID = 'scrollito';
  const POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  const SHORTCUT_ACTIONS = ['toggle', 'slower', 'faster', 'hide'];
  const SHORTCUT_LABELS = { toggle: 'Toggle', slower: 'Slower', faster: 'Faster', hide: 'Hide' };
  const SHORTCUT_DEFAULTS = { toggle: 's', slower: '[', faster: ']', hide: 'a' };
  const SHORTCUT_INJECTED_KEYS = {
    toggle: 'toggleKey',
    slower: 'slowerKey',
    faster: 'fasterKey',
    hide: 'hideKey',
  };
  const injectedConfig = document.currentScript?.dataset ?? {};
  const SPEED_STEP = normalizeSpeedStep(injectedConfig.speedStep);
  // Same contract as the shortcuts below: a value the reader has toggled wins,
  // and the injector's data-* value only supplies the starting position.
  const AUTO_START_DEFAULT = normalizeFlag(injectedConfig.autoStart, false);
  const SLIP_DEFAULT = normalizeFlag(injectedConfig.slip, false);
  // A stored remap always wins; otherwise the injector's data-* value (if any)
  // is the default, so Docker-injected shortcuts still apply until remapped.
  const SHORTCUTS = loadShortcuts();
  // Font Awesome Free 7.3.1 (fontawesome.com), icons licensed CC BY 4.0. Kavita's
  // own UI ships the same set, so these match the reader's icon language.
  const ICONS = {
    play: '<svg viewBox="0 0 448 512" aria-hidden="true"><path d="M91.2 36.9c-12.4-6.8-27.4-6.5-39.6 .7S32 57.9 32 72l0 368c0 14.1 7.5 27.2 19.6 34.4s27.2 7.5 39.6 .7l336-184c12.8-7 20.8-20.5 20.8-35.1s-8-28.1-20.8-35.1l-336-184z"/></svg>',
    pause: '<svg viewBox="0 0 384 512" aria-hidden="true"><path d="M48 32C21.5 32 0 53.5 0 80L0 432c0 26.5 21.5 48 48 48l64 0c26.5 0 48-21.5 48-48l0-352c0-26.5-21.5-48-48-48L48 32zm224 0c-26.5 0-48 21.5-48 48l0 352c0 26.5 21.5 48 48 48l64 0c26.5 0 48-21.5 48-48l0-352c0-26.5-21.5-48-48-48l-64 0z"/></svg>',
    position: '<svg viewBox="0 0 512 512" aria-hidden="true"><path d="M32 64C14.3 64 0 78.3 0 96s14.3 32 32 32l86.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48L480 128c17.7 0 32-14.3 32-32s-14.3-32-32-32L265.3 64C253 35.7 224.8 16 192 16s-61 19.7-73.3 48L32 64zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l246.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48l54.7 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-54.7 0c-12.3-28.3-40.5-48-73.3-48s-61 19.7-73.3 48L32 224zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l54.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48L480 448c17.7 0 32-14.3 32-32s-14.3-32-32-32l-246.7 0c-12.3-28.3-40.5-48-73.3-48s-61 19.7-73.3 48L32 384z"/></svg>',
    autoStart: '<svg viewBox="0 0 448 512" aria-hidden="true"><path d="M338.8-9.9c11.9 8.6 16.3 24.2 10.9 37.8L271.3 224 416 224c13.5 0 25.5 8.4 30.1 21.1s.7 26.9-9.6 35.5l-288 240c-11.3 9.4-27.4 9.9-39.3 1.3s-16.3-24.2-10.9-37.8L176.7 288 32 288c-13.5 0-25.5-8.4-30.1-21.1s-.7-26.9 9.6-35.5l288-240c11.3-9.4 27.4-9.9 39.3-1.3z"/></svg>',
    shortcuts: '<svg viewBox="0 0 576 512" aria-hidden="true"><path d="M64 64C28.7 64 0 92.7 0 128L0 384c0 35.3 28.7 64 64 64l448 0c35.3 0 64-28.7 64-64l0-256c0-35.3-28.7-64-64-64L64 64zm16 64l32 0c8.8 0 16 7.2 16 16l0 32c0 8.8-7.2 16-16 16l-32 0c-8.8 0-16-7.2-16-16l0-32c0-8.8 7.2-16 16-16zM64 240c0-8.8 7.2-16 16-16l32 0c8.8 0 16 7.2 16 16l0 32c0 8.8-7.2 16-16 16l-32 0c-8.8 0-16-7.2-16-16l0-32zM176 128l32 0c8.8 0 16 7.2 16 16l0 32c0 8.8-7.2 16-16 16l-32 0c-8.8 0-16-7.2-16-16l0-32c0-8.8 7.2-16 16-16zM160 240c0-8.8 7.2-16 16-16l32 0c8.8 0 16 7.2 16 16l0 32c0 8.8-7.2 16-16 16l-32 0c-8.8 0-16-7.2-16-16l0-32zm16 80l224 0c8.8 0 16 7.2 16 16l0 32c0 8.8-7.2 16-16 16l-224 0c-8.8 0-16-7.2-16-16l0-32c0-8.8 7.2-16 16-16zm80-176c0-8.8 7.2-16 16-16l32 0c8.8 0 16 7.2 16 16l0 32c0 8.8-7.2 16-16 16l-32 0c-8.8 0-16-7.2-16-16l0-32zm16 80l32 0c8.8 0 16 7.2 16 16l0 32c0 8.8-7.2 16-16 16l-32 0c-8.8 0-16-7.2-16-16l0-32c0-8.8 7.2-16 16-16zm80-80c0-8.8 7.2-16 16-16l32 0c8.8 0 16 7.2 16 16l0 32c0 8.8-7.2 16-16 16l-32 0c-8.8 0-16-7.2-16-16l0-32zm16 80l32 0c8.8 0 16 7.2 16 16l0 32c0 8.8-7.2 16-16 16l-32 0c-8.8 0-16-7.2-16-16l0-32c0-8.8 7.2-16 16-16zm80-80c0-8.8 7.2-16 16-16l32 0c8.8 0 16 7.2 16 16l0 32c0 8.8-7.2 16-16 16l-32 0c-8.8 0-16-7.2-16-16l0-32zm16 80l32 0c8.8 0 16 7.2 16 16l0 32c0 8.8-7.2 16-16 16l-32 0c-8.8 0-16-7.2-16-16l0-32c0-8.8 7.2-16 16-16z"/></svg>',
    eye: '<svg viewBox="0 0 576 512" aria-hidden="true"><path d="M288 32c-80.8 0-145.5 36.8-192.6 80.6-46.8 43.5-78.1 95.4-93 131.1-3.3 7.9-3.3 16.7 0 24.6 14.9 35.7 46.2 87.7 93 131.1 47.1 43.7 111.8 80.6 192.6 80.6s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1 3.3-7.9 3.3-16.7 0-24.6-14.9-35.7-46.2-87.7-93-131.1-47.1-43.7-111.8-80.6-192.6-80.6zM144 256a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm144-64c0 35.3-28.7 64-64 64-11.5 0-22.3-3-31.7-8.4-1 10.9-.1 22.1 2.9 33.2 13.7 51.2 66.4 81.6 117.6 67.9s81.6-66.4 67.9-117.6c-12.2-45.7-55.5-74.8-101.1-70.8 5.3 9.3 8.4 20.1 8.4 31.7z"/></svg>',
    slip: '<svg viewBox="0 0 320 512" aria-hidden="true"><path d="M182.6 9.4c-12.5-12.5-32.8-12.5-45.3 0l-96 96c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L128 109.3l0 293.5-41.4-41.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l96 96c12.5 12.5 32.8 12.5 45.3 0l96-96c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 402.7l0-293.5 41.4 41.4c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-96-96z"/></svg>',
    autoScroll: '<svg viewBox="0 0 512 512" aria-hidden="true"><path d="M256 0a256 256 0 1 0 0 512 256 256 0 1 0 0-512zM135 241c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l87 87 87-87c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9L273 345c-9.4 9.4-24.6 9.4-33.9 0L135 241z"/></svg>',
    eyeOff: '<svg viewBox="0 0 576 512" aria-hidden="true"><path d="M41-24.9c-9.4-9.4-24.6-9.4-33.9 0S-2.3-.3 7 9.1l528 528c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-96.4-96.4c2.7-2.4 5.4-4.8 8-7.2 46.8-43.5 78.1-95.4 93-131.1 3.3-7.9 3.3-16.7 0-24.6-14.9-35.7-46.2-87.7-93-131.1-47.1-43.7-111.8-80.6-192.6-80.6-56.8 0-105.6 18.2-146 44.2L41-24.9zM204.5 138.7c23.5-16.8 52.4-26.7 83.5-26.7 79.5 0 144 64.5 144 144 0 31.1-9.9 59.9-26.7 83.5l-34.7-34.7c12.7-21.4 17-47.7 10.1-73.7-13.7-51.2-66.4-81.6-117.6-67.9-8.6 2.3-16.7 5.7-24 10l-34.7-34.7zM325.3 395.1c-11.9 3.2-24.4 4.9-37.3 4.9-79.5 0-144-64.5-144-144 0-12.9 1.7-25.4 4.9-37.3L69.4 139.2c-32.6 36.8-55 75.8-66.9 104.5-3.3 7.9-3.3 16.7 0 24.6 14.9 35.7 46.2 87.7 93 131.1 47.1 43.7 111.8 80.6 192.6 80.6 37.3 0 71.2-7.9 101.5-20.6l-64.2-64.2z"/></svg>',
  };

  if (document.documentElement.hasAttribute(INSTALL_MARKER)) return;
  document.documentElement.setAttribute(INSTALL_MARKER, VERSION);

  let running = false;
  let speed = clamp(Number(readStored(STORAGE_KEY)) || DEFAULT_SPEED);
  let position = normalizePosition(readStored(POSITION_STORAGE_KEY));
  let autoStart = readStoredFlag(AUTO_START_STORAGE_KEY, AUTO_START_DEFAULT);
  let slipMode = readStoredFlag(SLIP_STORAGE_KEY, SLIP_DEFAULT);
  let gestureActive = false;
  let controlsHidden = false;
  let controlsAutoHidden = false;
  let animationFrame = 0;
  let autoHideTimer = 0;
  let readerMenuFrame = 0;
  let readerMenuTrackUntil = 0;
  let mouseOverControls = false;
  let previousTime = 0;
  let fractionalDistance = 0;
  let lastAutomaticScroll = 0;
  let momentumSettlesAt = 0;
  let calloutHeld = false;
  let touchStartedAt = 0;
  let swallowNextClick = false;
  let cachedScrollContainer = null;
  let cachedInfiniteScroller = null;
  let scrollWriter = null;
  let scrollContainerCheckedAt = 0;
  let controls;
  let toggleButton;
  let speedOutput;
  let speedSlider;
  let positionButton;
  let positionMenu;
  let positionOptions;
  let autoStartToggle;
  let slipToggle;
  let shortcutsButton;
  let shortcutsMenu;
  let hideToggle;
  let revealButton;
  const shortcutButtons = {};
  let remappingAction = null;
  let menuToggleSlot = null;
  let readerMenuLayoutUnsupported = false;

  function clamp(value) {
    return Math.min(MAX_SPEED, Math.max(MIN_SPEED, value));
  }

  // Blocking site data (Safari's "Block All Cookies", and the equivalent
  // elsewhere) makes even reading localStorage throw, so every access goes
  // through these. Preferences then last only as long as the page, which beats
  // taking the whole control down with them.
  function readStored(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeStored(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage is unavailable; the in-memory value still applies.
    }
  }

  function normalizeShortcut(value, fallback) {
    if (typeof value !== 'string' || value.length === 0) return fallback;
    return value.toLocaleLowerCase() === 'space' ? ' ' : value;
  }

  function normalizeFlag(value, fallback) {
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim().toLocaleLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    return fallback;
  }

  // An unset key means the reader has never touched this toggle, so the
  // injected default still applies. Once written, even 'false' wins.
  function readStoredFlag(key, fallback) {
    return normalizeFlag(readStored(key), fallback);
  }

  function normalizeSpeedStep(value) {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : DEFAULT_SPEED_STEP;
  }

  function shortcutLabel(key) {
    return key === ' ' ? 'Space' : key;
  }

  function isShortcut(event, key) {
    return !event.ctrlKey && !event.metaKey && !event.altKey &&
      event.key.toLocaleLowerCase() === key.toLocaleLowerCase();
  }

  function readStoredShortcuts() {
    try {
      const parsed = JSON.parse(readStored(SHORTCUTS_STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function loadShortcuts() {
    const stored = readStoredShortcuts();
    const shortcuts = {};
    for (const action of SHORTCUT_ACTIONS) {
      const injectedDefault = normalizeShortcut(
        injectedConfig[SHORTCUT_INJECTED_KEYS[action]],
        SHORTCUT_DEFAULTS[action]
      );
      shortcuts[action] = normalizeShortcut(stored[action], injectedDefault);
    }
    return shortcuts;
  }

  function persistShortcuts() {
    writeStored(SHORTCUTS_STORAGE_KEY, JSON.stringify(SHORTCUTS));
  }

  function normalizePosition(value) {
    return POSITIONS.includes(value) ? value : 'bottom-right';
  }

  function isReaderRoute() {
    return READER_ROUTE.test(location.pathname);
  }

  function isWebtoonModeActive() {
    if (!isReaderRoute()) return false;
    // The MutationObserver asks this on every batch, and Kavita's page images
    // make those constant. A disconnected node answers it without a search,
    // and going stale is self-healing: leaving the reader detaches it.
    if (!cachedInfiniteScroller?.isConnected) {
      cachedInfiniteScroller = document.querySelector('app-infinite-scroller');
    }
    return Boolean(cachedInfiniteScroller);
  }

  // Anything the reader itself would act on, which a long press has no business
  // swallowing. Kavita's tap-to-menu is bound to the page, not to these.
  const INTERACTIVE_SELECTOR =
    'a, button, input, select, textarea, label, [role="button"], [contenteditable]';

  function isInteractiveTarget(target) {
    return target instanceof Element && Boolean(target.closest(INTERACTIVE_SELECTOR));
  }

  function isEditableTarget(target) {
    return target instanceof HTMLElement && (
      target.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
    );
  }

  function findScrollContainer(now) {
    // tick() runs every frame, and resolving this costs a querySelector plus a
    // style recalc. The answer only changes when the reader enters or leaves
    // fullscreen, or when its content first grows past the viewport, so a short
    // cache keeps that off the hot path without noticeably delaying a switch.
    if (cachedScrollContainer?.isConnected &&
        now - scrollContainerCheckedAt < SCROLL_CONTAINER_TTL) {
      return cachedScrollContainer;
    }

    const reader = document.querySelector('.reader');
    const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
    const readerOwnsScroll = reader instanceof HTMLElement &&
      (Boolean(fullscreenElement) || /(auto|scroll)/.test(getComputedStyle(reader).overflowY)) &&
      reader.scrollHeight > reader.clientHeight;

    // This mirrors Kavita's InfiniteScrollerComponent: the promoted .reader
    // owns scrolling in fullscreen; otherwise the browser viewport/body does.
    scrollContainerCheckedAt = now;
    cachedScrollContainer = readerOwnsScroll ? reader : document.body;
    return cachedScrollContainer;
  }

  // Kavita subscribes to scroll events on document.body outside fullscreen.
  // Safari's standards-mode scroll owner can nevertheless vary, so these are
  // tried in order until one actually moves.
  const SCROLL_WRITERS = [
    {
      read: () => document.body.scrollTop,
      write: (pixels) => { document.body.scrollTop += pixels; },
    },
    {
      read: () => document.documentElement.scrollTop,
      write: (pixels) => { document.documentElement.scrollTop += pixels; },
    },
    {
      read: () => window.scrollY,
      write: (pixels) => window.scrollBy(0, pixels),
    },
  ];

  function scrollByPixels(element, pixels, now) {
    lastAutomaticScroll = now;
    if (element !== document.body) {
      element.scrollTop += pixels;
      return;
    }

    // Whichever representation won last frame almost always wins again, so
    // spend one write on it rather than replaying the whole chain. Re-probing
    // only on a miss keeps a fullscreen switch working without costing a
    // wasted write and two forced layout reads on every other frame.
    if (scrollWriter) {
      const before = scrollWriter.read();
      scrollWriter.write(pixels);
      if (scrollWriter.read() !== before) return;
    }

    for (const writer of SCROLL_WRITERS) {
      if (writer === scrollWriter) continue;
      const before = writer.read();
      writer.write(pixels);
      if (writer.read() !== before) {
        scrollWriter = writer;
        return;
      }
    }
  }

  // True while the page is under someone else's control: a finger is down, or
  // iOS is still running its own momentum after one lifted. Writing scrollTop
  // during either fights whoever owns the position — a momentum step lands on
  // the next frame and discards ours — which shows up as jitter at the tail of
  // a throw, where the two step sizes finally match.
  function isPageMoving(now) {
    return gestureActive || now < momentumSettlesAt;
  }

  function tick(now) {
    if (!running) return;

    // Slip mode keeps running through a manual gesture, but advancing while
    // something else owns the scroll position would fight it, so hold the clock
    // — and the pace with it — until the page settles. Derived here rather than
    // latched when the gesture starts, so toggling slip mode or pausing mid-drag
    // needs no separate reset.
    if (slipMode && isPageMoving(now)) {
      previousTime = now;
      animationFrame = requestAnimationFrame(tick);
      return;
    }

    if (!previousTime) previousTime = now;
    const elapsedSeconds = Math.min((now - previousTime) / 1000, 0.1);
    previousTime = now;
    fractionalDistance += speed * elapsedSeconds;

    const wholePixels = Math.floor(fractionalDistance);
    if (wholePixels > 0) {
      fractionalDistance -= wholePixels;
      const scrollContainer = findScrollContainer(now);
      scrollByPixels(scrollContainer, wholePixels, now);
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
    if (!running || mouseOverControls || keyboardFocusWithin || anyMenuOpen()) {
      if (running) scheduleAutoHide();
      return;
    }

    setAutoHidden(true);
  }

  function scheduleAutoHide() {
    cancelAutoHide();
    if (running) autoHideTimer = window.setTimeout(hideControls, AUTO_HIDE_DELAY);
  }

  // Called from pointermove, wheel and every keydown, so touching the DOM only
  // on an actual transition keeps a style invalidation off those paths.
  function setAutoHidden(hidden) {
    if (controlsAutoHidden === hidden) return;
    controlsAutoHidden = hidden;
    controls.dataset.autohidden = String(hidden);
  }

  // Holding a finger still is how you pause on a touchscreen, and iOS reads the
  // same press on an image as "save this picture" and puts its own menu over the
  // page. Suppress the callout only while the script owns the scroll, so a
  // deliberate long press on a stopped page still saves the image.
  function syncTouchCallout() {
    document.documentElement.toggleAttribute(CALLOUT_MARKER, running || calloutHeld);
  }

  function revealControls() {
    if (!controls) return;
    setAutoHidden(false);
    scheduleAutoHide();
  }

  function setControlsHidden(nextHidden) {
    controlsHidden = Boolean(nextHidden);
    controls.dataset.userHidden = String(controlsHidden);
    syncMenuToggleButton();
    if (controlsHidden) {
      closeMenus();
      if (running) setRunning(false);
      // The control is about to be display:none, so focus has to move off it or
      // the browser drops it to <body> and the tab order restarts. Hand it to
      // whichever reveal control is on screen; with the menu closed there is
      // none, and falling back to the document is then the honest outcome.
      const menuToggle = controls.dataset.revealInMenu === 'true'
        ? menuToggleSlot?.firstElementChild
        : revealButton;
      menuToggle?.focus({ preventScroll: true });
    } else {
      revealControls();
    }
  }

  // The one place that knows how Kavita marks a reader overlay. Everything
  // else — the offset maths, the resize observer, the animation tracking and
  // the mutation filter — asks through here.
  function readerOverlayEdge(node) {
    if (!(node instanceof HTMLElement) || !node.classList.contains('overlay')) return null;
    if (node.classList.contains('fixed-top')) return 'top';
    if (node.classList.contains('fixed-bottom')) return 'bottom';
    return null;
  }

  // Both edges from a single .reader lookup and one children pass: callers used
  // to run this twice per frame to ask about one class each.
  function findReaderOverlays() {
    const reader = document.querySelector('.reader');
    const overlays = { top: [], bottom: [] };
    if (!(reader instanceof HTMLElement)) return overlays;

    for (const child of reader.children) {
      const edge = readerOverlayEdge(child);
      if (edge) overlays[edge].push(child);
    }
    return overlays;
  }

  // Kavita lays its bottom-bar icons out as Bootstrap columns in a .row, so an
  // extra .col is spaced evenly with the rest for free. The row sits outside
  // the settings pane's @if block, which is why it survives that toggling.
  function anyMenuOpen() {
    return !positionMenu.hidden || !shortcutsMenu.hidden;
  }

  function closeMenus() {
    if (!positionMenu.hidden) setPositionMenu(false, false);
    if (!shortcutsMenu.hidden) setShortcutsMenu(false, false);
  }

  function findReaderMenuIconRow(bottomOverlay) {
    const rows = Array.from(bottomOverlay.querySelectorAll(':scope > .row'));
    return rows.reverse().find((row) => row.querySelector(':scope > .col > button')) ?? null;
  }

  // The slot is permanent rather than added only while hidden: a column that
  // came and went would shift Kavita's own icons on every toggle.
  function syncMenuToggleButton() {
    const [bottomOverlay] = findReaderOverlays().bottom;
    const row = bottomOverlay ? findReaderMenuIconRow(bottomOverlay) : null;

    // Whether this Kavita can carry the button is a property of its markup, not
    // of whether a menu happens to be open right now, so remember the answer.
    // A menu that turns up without a usable row means the tab is needed even
    // once that menu closes; finding a row again clears it, so a menu caught
    // mid-render does not strand us on the tab forever.
    if (bottomOverlay) readerMenuLayoutUnsupported = !row;

    if (!row) {
      menuToggleSlot = null;
      // With a readable layout a closed menu leaves nothing on screen to
      // clutter, and reopening it brings the button back.
      controls.dataset.revealInMenu = readerMenuLayoutUnsupported ? 'false' : 'true';
      return;
    }

    if (menuToggleSlot?.parentElement !== row) {
      menuToggleSlot = document.createElement('div');
      menuToggleSlot.className = 'col d-flex justify-content-center';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-icon';
      button.addEventListener('click', () => setControlsHidden(!controlsHidden));
      // Sized the way Font Awesome matches its own inline SVGs to its glyphs,
      // in em so it tracks whatever font size the reader uses. Set once here:
      // none of it depends on state, only the fill below does.
      button.innerHTML = ICONS.autoScroll;
      const icon = button.firstElementChild;
      icon.style.width = 'auto';
      icon.style.height = '1em';
      icon.style.verticalAlign = '-0.125em';
      menuToggleSlot.append(button);
      row.prepend(menuToggleSlot);
    }

    updateMenuToggleButton();
    controls.dataset.revealInMenu = 'true';
  }

  function updateMenuToggleButton() {
    const button = menuToggleSlot?.firstElementChild;
    if (!button) return;

    const action = controlsHidden ? 'Show' : 'Hide';
    button.setAttribute('aria-label', `${action} auto-scroll controls`);
    button.setAttribute('aria-pressed', String(controlsHidden));
    button.title = `${action} auto-scroll controls (${shortcutLabel(SHORTCUTS.hide)})`;
    // Lit in the reader's own accent while the control is up, plain when it is
    // not. Dimming would be the obvious cue, but Kavita disables its
    // reading-direction button in Webtoon mode, so a faded icon already sits
    // next to this one meaning something else entirely.
    button.firstElementChild.style.fill =
      controlsHidden ? 'currentColor' : 'var(--primary-color, #0a84ff)';
  }

  // Re-running these writes every frame invalidates style on an element that
  // carries a transition, so only write what actually changed.
  const writtenMenuEdges = new Map();

  function setMenuEdge(property, edge, maxEdge) {
    const value = `${edge > 0 ? Math.min(edge + READER_MENU_GAP, maxEdge) : 0}px`;
    if (writtenMenuEdges.get(property) === value) return;
    writtenMenuEdges.set(property, value);
    controls.style.setProperty(property, value);
  }

  function syncReaderMenuOffsets() {
    if (!controls) return;

    const viewportHeight = window.innerHeight;
    const { top: topOverlays, bottom: bottomOverlays } = findReaderOverlays();
    const menuOpen = bottomOverlays.length > 0;
    const topEdge = menuOpen
      ? Math.max(0, ...topOverlays.map((overlay) =>
          Math.min(viewportHeight, overlay.getBoundingClientRect().bottom)
        ))
      : 0;
    const bottomEdge = menuOpen
      ? Math.max(0, ...bottomOverlays.map((overlay) =>
          Math.min(viewportHeight, viewportHeight - overlay.getBoundingClientRect().top)
        ))
      : 0;

    // The settings drawer can make the menu tall enough to cover most of the
    // screen, so cap the offset at the point where the control would start
    // leaving the viewport.
    const maxEdge = Math.max(0, viewportHeight - controls.offsetHeight - READER_MENU_GAP * 2);

    setMenuEdge('--reader-menu-top-edge', topEdge, maxEdge);
    setMenuEdge('--reader-menu-bottom-edge', bottomEdge, maxEdge);
  }

  function trackReaderMenuOffsets(duration = READER_MENU_TRACK_DURATION) {
    observeReaderOverlays();
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

  // Kavita renders its settings drawer inside the existing .fixed-bottom
  // overlay, so opening it grows that element without adding or removing a node
  // the MutationObserver would recognize. Watching the overlays directly keeps
  // the control clear of the taller menu, and follows the slide animation for
  // free since ResizeObserver reports every frame the box changes.
  const readerOverlayResize = new ResizeObserver(() => syncReaderMenuOffsets());
  let trackedReaderOverlays = [];

  function observeReaderOverlays() {
    const { top, bottom } = findReaderOverlays();
    const overlays = [...top, ...bottom];
    // Resizing fires this far more often than menus open, and re-observing an
    // unchanged set costs a teardown plus an initial callback per element.
    const unchanged = overlays.length === trackedReaderOverlays.length &&
      overlays.every((overlay, index) => overlay === trackedReaderOverlays[index]);
    if (unchanged) return;

    trackedReaderOverlays = overlays;
    readerOverlayResize.disconnect();
    for (const overlay of overlays) readerOverlayResize.observe(overlay);
  }

  function setPosition(nextPosition) {
    position = normalizePosition(nextPosition);
    controls.dataset.position = position;
    writeStored(POSITION_STORAGE_KEY, position);
    positionOptions.forEach((option) => {
      option.setAttribute('aria-checked', String(option.dataset.value === position));
    });
  }

  function setAutoStart(enabled) {
    autoStart = Boolean(enabled);
    autoStartToggle.setAttribute('aria-pressed', String(autoStart));
    autoStartToggle.title = `${autoStart ? 'Disable' : 'Enable'} auto-start in Webtoon mode`;
    writeStored(AUTO_START_STORAGE_KEY, String(autoStart));
    if (autoStart && isWebtoonModeActive() && !running) setRunning(true);
  }

  function setSlipMode(enabled) {
    slipMode = Boolean(enabled);
    slipToggle.setAttribute('aria-pressed', String(slipMode));
    slipToggle.title = `${slipMode ? 'Disable' : 'Enable'} slip mode (keep scrolling after a manual scroll)`;
    writeStored(SLIP_STORAGE_KEY, String(slipMode));
  }

  function setPositionMenu(open, restoreFocus = true) {
    positionMenu.hidden = !open;
    positionButton.setAttribute('aria-expanded', String(open));
    if (open) {
      cancelAutoHide();
      const selectedOption = positionMenu.querySelector('[aria-checked="true"]');
      selectedOption?.focus({ preventScroll: true });
    } else {
      if (!shortcutsMenu.hidden) setShortcutsMenu(false, false);
      if (restoreFocus) positionButton.focus({ preventScroll: true });
      scheduleAutoHide();
    }
  }

  function setShortcutsMenu(open, restoreFocus = true) {
    shortcutsMenu.hidden = !open;
    shortcutsButton.setAttribute('aria-expanded', String(open));
    if (open) {
      cancelAutoHide();
      shortcutButtons.toggle?.focus({ preventScroll: true });
    } else {
      if (remappingAction) {
        remappingAction = null;
        renderShortcutButtons();
      }
      if (restoreFocus) shortcutsButton.focus({ preventScroll: true });
      scheduleAutoHide();
    }
  }

  function renderShortcutButtons() {
    SHORTCUT_ACTIONS.forEach((action) => {
      const button = shortcutButtons[action];
      if (!button) return;
      const listening = remappingAction === action;
      button.textContent = listening ? '…' : shortcutLabel(SHORTCUTS[action]);
      button.title = listening
        ? 'Press a key, or Escape to cancel'
        : `${SHORTCUT_LABELS[action]} shortcut: ${shortcutLabel(SHORTCUTS[action])} (select to change)`;
      button.dataset.listening = String(listening);
    });
  }

  function startRemap(action) {
    remappingAction = remappingAction === action ? null : action;
    renderShortcutButtons();
  }

  function finishRemap(key) {
    const action = remappingAction;
    const conflicts = SHORTCUT_ACTIONS.some((other) =>
      other !== action && SHORTCUTS[other].toLocaleLowerCase() === key.toLocaleLowerCase()
    );
    remappingAction = null;
    if (!conflicts) {
      SHORTCUTS[action] = key;
      persistShortcuts();
      updateToggleButtonLabel();
      updateHideButtonLabels();
    }
    renderShortcutButtons();
  }

  function updateToggleButtonLabel() {
    const action = running ? 'Pause' : 'Start';
    toggleButton.setAttribute('aria-label', `${action} auto-scroll`);
    toggleButton.title = `${action} auto-scroll (${shortcutLabel(SHORTCUTS.toggle)})`;
  }

  function updateHideButtonLabels() {
    const key = shortcutLabel(SHORTCUTS.hide);
    hideToggle.title = `Hide auto-scroll controls (${key})`;
    revealButton.title = `Show auto-scroll controls (${key})`;
    updateMenuToggleButton();
  }

  function setRunning(nextRunning) {
    running = nextRunning && isWebtoonModeActive();
    previousTime = 0;
    fractionalDistance = 0;
    toggleButton.innerHTML = running ? ICONS.pause : ICONS.play;
    updateToggleButtonLabel();
    toggleButton.setAttribute('aria-pressed', String(running));
    controls.dataset.running = String(running);
    syncTouchCallout();

    cancelAnimationFrame(animationFrame);
    if (running) {
      animationFrame = requestAnimationFrame(tick);
      scheduleAutoHide();
    } else {
      cancelAutoHide();
      revealControls();
    }
  }

  function snapToStep(value) {
    // The slider can only rest on multiples of the step above MIN_SPEED, so a
    // speed saved under a different step — an older default, or an injector
    // value that changed — would leave the thumb and the readout disagreeing.
    return MIN_SPEED + Math.round((value - MIN_SPEED) / SPEED_STEP) * SPEED_STEP;
  }

  function setSpeed(nextSpeed) {
    speed = clamp(snapToStep(Number(nextSpeed)));
    speedSlider.value = String(speed);
    speedSlider.style.setProperty('--fill', `${((speed - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)) * 100}%`);
    speedOutput.textContent = `${speed} px/s`;
    writeStored(STORAGE_KEY, String(speed));
  }

  function installControls() {
    if (document.getElementById(CONTROL_ID)) return;

    const style = document.createElement('style');
    style.textContent = `
      #${CONTROL_ID} {
        --accent: color-mix(in srgb, var(--primary-color, #0a84ff) 72%, transparent);
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
        backdrop-filter: blur(30px);
        -webkit-backdrop-filter: blur(30px);
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
        outline: 3px solid color-mix(in srgb, var(--primary-color, #0a84ff) 90%, transparent);
        outline-offset: 2px;
      }
      #${CONTROL_ID} button svg {
        width: auto;
        height: 16px;
        /* Font Awesome draws on a 512-tall grid with per-icon widths, and a few
           icons (eye-slash, bolt) extend past their own viewBox, so size by
           height and let them overflow the way Font Awesome's own CSS does. */
        overflow: visible;
        fill: currentColor;
      }
      /* Font Awesome's keyboard glyph fills only 75% of its 512-unit box, where
         the others fill ~88%, so at a shared height it reads noticeably lighter
         than its neighbours. Size this one to match their drawn height. */
      #${CONTROL_ID} .shortcuts-button svg { height: 19px; }
      #${CONTROL_ID} input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        width: min(30vw, 150px);
        height: 26px;
        margin: 0;
        padding: 0;
        background: transparent;
        cursor: pointer;
      }
      #${CONTROL_ID} input[type="range"]::-webkit-slider-runnable-track {
        height: 4px;
        border-radius: 2px;
        background: linear-gradient(
          to right,
          var(--accent) var(--fill, 0%),
          rgba(255, 255, 255, .25) var(--fill, 0%)
        );
      }
      #${CONTROL_ID} input[type="range"]::-moz-range-track {
        height: 4px;
        border-radius: 2px;
        background: rgba(255, 255, 255, .25);
      }
      #${CONTROL_ID} input[type="range"]::-moz-range-progress {
        height: 4px;
        border-radius: 2px;
        background: var(--accent);
      }
      #${CONTROL_ID} input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        margin-top: -7px;
        border-radius: 999px;
        background: #fff;
        box-shadow: 0 1px 3px rgba(0, 0, 0, .4);
      }
      #${CONTROL_ID} input[type="range"]::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border: 0;
        border-radius: 999px;
        background: #fff;
        box-shadow: 0 1px 3px rgba(0, 0, 0, .4);
      }
      #${CONTROL_ID} output {
        min-width: 58px;
        font-variant-numeric: tabular-nums;
      }
      #${CONTROL_ID} .position-menu,
      #${CONTROL_ID} .shortcuts-menu {
        position: absolute;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 7px;
        border: 1px solid rgba(255, 255, 255, .18);
        border-radius: 20px;
        background: rgba(38, 38, 40, .58);
        box-shadow:
          0 8px 24px rgba(0, 0, 0, .24),
          inset 0 1px 0 rgba(255, 255, 255, .16);
        backdrop-filter: blur(30px);
        -webkit-backdrop-filter: blur(30px);
      }
      #${CONTROL_ID} .position-menu[hidden],
      #${CONTROL_ID} .shortcuts-menu[hidden] { display: none; }
      #${CONTROL_ID}[data-position^="bottom"] .position-menu { bottom: calc(100% + 8px); }
      #${CONTROL_ID}[data-position^="top"] .position-menu { top: calc(100% + 8px); }
      #${CONTROL_ID}[data-position$="left"] .position-menu { left: 0; }
      #${CONTROL_ID}[data-position$="right"] .position-menu { right: 0; }
      #${CONTROL_ID} .shortcuts-menu {
        top: 7px;
        left: calc(100% + 8px);
      }
      #${CONTROL_ID}[data-position^="bottom"] .shortcuts-menu {
        top: auto;
        bottom: 7px;
      }
      #${CONTROL_ID}[data-position$="right"] .shortcuts-menu {
        left: auto;
        right: calc(100% + 8px);
      }
      #${CONTROL_ID} .position-menu-top {
        display: flex;
        align-items: center;
        gap: 7px;
      }
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
        background: var(--accent);
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
      /* The menu mirrors with the corner it opens from, so the toggles sit on
         the outer edge and the divider always faces the position grid. The
         column holding the hide button stays outermost either way. */
      #${CONTROL_ID} .menu-columns {
        display: flex;
        flex-direction: row-reverse;
        gap: 7px;
        padding-left: 7px;
        border-left: 1px solid rgba(255, 255, 255, .12);
      }
      #${CONTROL_ID}[data-position$="right"] .menu-columns {
        order: -1;
        flex-direction: row;
        padding-left: 0;
        padding-right: 7px;
        border-left: 0;
        border-right: 1px solid rgba(255, 255, 255, .12);
      }
      #${CONTROL_ID} .menu-column {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      /* The menu opens downward from a top corner, so flip each column to keep
         the same pair sitting against the pill from either side. */
      #${CONTROL_ID}[data-position^="top"] .menu-column {
        flex-direction: column-reverse;
      }
      #${CONTROL_ID} .menu-column button {
        width: 32px;
        height: 32px;
        min-width: 32px;
      }
      #${CONTROL_ID} .auto-start-toggle[aria-pressed="true"],
      #${CONTROL_ID} .slip-toggle[aria-pressed="true"] {
        background: var(--accent);
      }
      #${CONTROL_ID} .reveal-button { display: none; }
      /* Kavita's menu is holding the reveal button, so leave the page clean.
         Without that slot the tab below stays, so hiding is never a dead end. */
      #${CONTROL_ID}[data-user-hidden="true"][data-reveal-in-menu="true"] { display: none; }
      #${CONTROL_ID}[data-user-hidden="true"] {
        padding: 7px;
        gap: 0;
      }
      #${CONTROL_ID}[data-user-hidden="true"] > *:not(.reveal-button) {
        display: none;
      }
      #${CONTROL_ID}[data-user-hidden="true"] > .reveal-button {
        display: grid;
      }
      #${CONTROL_ID} .shortcut-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
      }
      #${CONTROL_ID} .shortcut-row-label {
        opacity: .8;
      }
      #${CONTROL_ID} .shortcut-key {
        width: auto;
        min-width: 40px;
        height: 26px;
        padding: 0 8px;
        border-radius: 8px;
        font: inherit;
        font-variant-numeric: tabular-nums;
      }
      #${CONTROL_ID} .shortcut-key[data-listening="true"] {
        background: var(--accent);
      }
      @media (prefers-reduced-transparency: reduce) {
        #${CONTROL_ID}, #${CONTROL_ID} .position-menu, #${CONTROL_ID} .shortcuts-menu {
          background: rgba(32, 32, 34, .94);
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        #${CONTROL_ID}, #${CONTROL_ID} button { transition: none; }
      }
      /* The only rules that reach outside the control, and they only apply
         while the marker is on <html>. touch-callout and user-select both
         inherit, so the containers cover the pages without the script having to
         know Kavita's image class; -webkit-user-drag does not, and is what lets
         a long press lift an image out of the page on iPad, so it needs the
         images. user-select is what gates Live Text: WebKit offers the lettering
         inside a manga page as selectable text, and the loupe comes with it. */
      [${CALLOUT_MARKER}] .reader,
      [${CALLOUT_MARKER}] app-infinite-scroller {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
      }
      [${CALLOUT_MARKER}] .reader img,
      [${CALLOUT_MARKER}] app-infinite-scroller img {
        -webkit-user-drag: none;
      }
      /* Kavita's bottom bar lives inside .reader and can be opened mid-scroll,
         so keep its fields typable. A UA rule on the control itself likely wins
         over the inherited none already; this makes that independent of how the
         UA sheet resolves. */
      [${CALLOUT_MARKER}] .reader input,
      [${CALLOUT_MARKER}] .reader textarea {
        -webkit-user-select: auto;
        user-select: auto;
      }
    `;
    document.head.append(style);

    controls = document.createElement('aside');
    controls.id = CONTROL_ID;
    controls.setAttribute('aria-label', 'Webtoon auto-scroll controls');
    controls.hidden = true;
    controls.innerHTML = `
      <button class="reveal-button" type="button" aria-label="Show auto-scroll controls" title="Show auto-scroll controls">${ICONS.eyeOff}</button>
      <button class="toggle-button" type="button" aria-pressed="false" aria-label="Start auto-scroll" title="Start auto-scroll (${shortcutLabel(SHORTCUTS.toggle)})">${ICONS.play}</button>
      <input type="range" min="${MIN_SPEED}" max="${MAX_SPEED}" step="${SPEED_STEP}" aria-label="Scroll speed">
      <output></output>
      <button class="position-button" type="button" aria-expanded="false" aria-haspopup="dialog" aria-label="Open auto-scroll settings" title="Auto-scroll settings">${ICONS.position}</button>
      <div class="position-menu" role="dialog" aria-label="Auto-scroll settings" hidden>
        <div class="position-menu-top">
          <div class="position-grid" role="menu" aria-label="Control position">
            ${POSITIONS.map((value) => {
              const label = value.split('-').map((word) => word[0].toUpperCase() + word.slice(1)).join(' ');
              return `
                <button class="position-option" type="button" role="menuitemradio" data-value="${value}" aria-checked="false" aria-label="${label}" title="${label}">
                  <span class="corner-preview" aria-hidden="true"></span>
                </button>
              `;
            }).join('')}
          </div>
          <div class="menu-columns">
            <div class="menu-column">
              <button class="hide-toggle" type="button" aria-label="Hide auto-scroll controls" title="Hide auto-scroll controls">${ICONS.eye}</button>
              <button class="shortcuts-button" type="button" aria-expanded="false" aria-haspopup="dialog" aria-label="Open keyboard shortcuts" title="Keyboard shortcuts">${ICONS.shortcuts}</button>
            </div>
            <div class="menu-column">
              <button class="auto-start-toggle" type="button" aria-pressed="false" aria-label="Auto-start in Webtoon mode" title="Enable auto-start in Webtoon mode">${ICONS.autoStart}</button>
              <button class="slip-toggle" type="button" aria-pressed="false" aria-label="Slip mode" title="Enable slip mode (keep scrolling after a manual scroll)">${ICONS.slip}</button>
            </div>
          </div>
        </div>
        <div class="shortcuts-menu" role="dialog" aria-label="Keyboard shortcuts" hidden>
          ${SHORTCUT_ACTIONS.map((action) => `
            <div class="shortcut-row">
              <span class="shortcut-row-label" id="shortcut-row-label-${action}">${SHORTCUT_LABELS[action]}</span>
              <button class="shortcut-key" type="button" data-action="${action}" aria-labelledby="shortcut-row-label-${action}"></button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    document.body.append(controls);

    toggleButton = controls.querySelector('.toggle-button');
    speedSlider = controls.querySelector('input[type="range"]');
    speedOutput = controls.querySelector('output');
    positionButton = controls.querySelector('.position-button');
    positionMenu = controls.querySelector('.position-menu');
    positionOptions = controls.querySelectorAll('.position-option');
    autoStartToggle = controls.querySelector('.auto-start-toggle');
    slipToggle = controls.querySelector('.slip-toggle');
    shortcutsButton = controls.querySelector('.shortcuts-button');
    shortcutsMenu = controls.querySelector('.shortcuts-menu');
    hideToggle = controls.querySelector('.hide-toggle');
    revealButton = controls.querySelector('.reveal-button');
    controls.querySelectorAll('.shortcut-key').forEach((button) => {
      shortcutButtons[button.dataset.action] = button;
      button.addEventListener('click', () => startRemap(button.dataset.action));
    });
    renderShortcutButtons();
    shortcutsButton.addEventListener('click', () => setShortcutsMenu(shortcutsMenu.hidden));
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
    slipToggle.addEventListener('click', () => setSlipMode(!slipMode));
    hideToggle.addEventListener('click', () => setControlsHidden(true));
    revealButton.addEventListener('click', () => setControlsHidden(false));
    positionOptions.forEach((option) => {
      option.addEventListener('click', () => {
        setPosition(option.dataset.value);
        setPositionMenu(false);
      });
    });
    setSpeed(speed);
    setPosition(position);
    setAutoStart(autoStart);
    setSlipMode(slipMode);
    updateHideButtonLabels();
    syncReaderState();
    observeReaderOverlays();
    // The reader menu can already be open by the time the script runs, and
    // nothing would mutate an overlay afterwards to prompt us, so claim the
    // slot now rather than waiting for the menu's next open.
    syncMenuToggleButton();
    syncReaderMenuOffsets();
  }

  function syncReaderState() {
    const active = isWebtoonModeActive();
    // controls.hidden already records whether the reader was active last time,
    // so read it before overwriting rather than shadowing it in a variable.
    const wasActive = !controls.hidden;
    controls.hidden = !active;

    if (!active) {
      if (running) setRunning(false);
    } else if (!wasActive && autoStart && !running) {
      setRunning(true);
    }
  }

  function pauseForManualInput(event) {
    revealControls();
    const outsideControls = !controls.contains(event.target);
    if (outsideControls) closeMenus();
    if (!running || !outsideControls) return;
    // Slip mode reads a manual scroll as a seek rather than a stop: the pace
    // resumes from wherever the gesture left the page.
    if (slipMode) return;
    setRunning(false);
  }

  function beginGesture(event) {
    if (controls.contains(event.target)) return;
    gestureActive = true;
    // Latched rather than read live: pausing clears `running` in this same
    // handler, and WebKit re-reads the style when the long press finally fires
    // half a second later. Holding it for the whole gesture keeps the touch
    // that pauses from also opening the menu.
    calloutHeld = running;
    syncTouchCallout();
  }

  function endGesture() {
    gestureActive = false;
    calloutHeld = false;
    syncTouchCallout();
  }

  function endTouchGesture(event) {
    if (event.touches.length !== 0) return;
    // Decided here rather than in the click handler: touchend clears the latch,
    // and the click that Kavita acts on only arrives afterwards.
    swallowNextClick = calloutHeld &&
      performance.now() - touchStartedAt >= LONG_PRESS_DELAY;
    endGesture();
  }

  function endMouseGesture(event) {
    if (event.pointerType === 'mouse') endGesture();
  }

  const CAPTURE_PASSIVE = { passive: true, capture: true };

  document.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    // A button released outside the window never delivers pointerup, so treat
    // any buttonless move as the end of a mouse-driven gesture.
    if (gestureActive && event.buttons === 0) endGesture();
    revealControls();
  }, { passive: true });
  document.addEventListener('wheel', pauseForManualInput, CAPTURE_PASSIVE);
  // Touch gestures run off touch events, not pointer ones: Safari cancels the
  // pointer as soon as it takes the gesture over for native scrolling, which is
  // exactly the stretch slip mode has to cover. Mice keep the pointer stream,
  // so a drag on a scrollbar counts too.
  document.addEventListener('touchstart', (event) => {
    touchStartedAt = performance.now();
    // A gesture that never produced a click — a scroll, a cancel — must not
    // leave the flag armed for whatever is tapped next.
    swallowNextClick = false;
    // Before pauseForManualInput, which is what clears `running`.
    beginGesture(event);
    pauseForManualInput(event);
  }, CAPTURE_PASSIVE);
  // Kavita toggles its reader menu on a tap anywhere in the page, which collides
  // with holding a finger down to pause: the press pauses, and the release drops
  // the menu over what you were reading. A tap is short by definition, so only
  // the long ones are swallowed — and only for a press that began while
  // Scrollito was driving, so a stopped or hidden control leaves Kavita's own
  // behavior exactly as it was. Capture, because the point is to get there
  // first; not passive, because preventDefault is half the job.
  document.addEventListener('click', (event) => {
    if (!swallowNextClick) return;
    swallowNextClick = false;
    if (controls.contains(event.target) || isInteractiveTarget(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    // Kavita may well have bound this on document too, and a later listener on
    // the same node outlives a plain stopPropagation.
    event.stopImmediatePropagation();
  }, { capture: true });
  document.addEventListener('touchend', endTouchGesture, CAPTURE_PASSIVE);
  document.addEventListener('touchcancel', endTouchGesture, CAPTURE_PASSIVE);
  document.addEventListener('pointerdown', (event) => {
    pauseForManualInput(event);
    if (event.pointerType === 'mouse') beginGesture(event);
  }, CAPTURE_PASSIVE);
  document.addEventListener('pointerup', endMouseGesture, CAPTURE_PASSIVE);
  document.addEventListener('pointercancel', endMouseGesture, CAPTURE_PASSIVE);
  document.addEventListener('scroll', (event) => {
    const now = performance.now();
    // Momentum keeps firing scroll events every frame until it stops, so each
    // one pushes the handover back. Only extend a window a gesture already
    // opened, or the script's own writes would keep renewing it forever.
    if (isPageMoving(now)) momentumSettlesAt = now + MOMENTUM_SETTLE_DELAY;
    if (running && now - lastAutomaticScroll > 150) pauseForManualInput(event);
  }, CAPTURE_PASSIVE);
  document.addEventListener('keydown', (event) => {
    if (remappingAction) {
      if (event.key === 'Escape') {
        event.preventDefault();
        remappingAction = null;
        renderShortcutButtons();
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      finishRemap(event.key);
      return;
    }
    if (event.key === 'Escape' && !shortcutsMenu.hidden) {
      event.preventDefault();
      setShortcutsMenu(false);
      return;
    }
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
    } else if (isShortcut(event, SHORTCUTS.hide)) {
      event.preventDefault();
      setControlsHidden(!controlsHidden);
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
    if (readerOverlayEdge(event.target)) trackReaderMenuOffsets();
  }, { capture: true });

  function isReaderOverlayNode(node) {
    return Boolean(readerOverlayEdge(node));
  }

  function mutatesReaderOverlay(records) {
    return records.some((record) =>
      Array.prototype.some.call(record.addedNodes, isReaderOverlayNode) ||
      Array.prototype.some.call(record.removedNodes, isReaderOverlayNode)
    );
  }

  // Kavita renders its settings drawer as a child of the bottom overlay, so
  // opening it resizes a menu we already track rather than adding a new one.
  // With no menu open the list is empty and this costs nothing.
  function mutatesInsideReaderOverlay(records) {
    return trackedReaderOverlays.length > 0 && records.some((record) =>
      trackedReaderOverlays.some((overlay) => overlay.contains(record.target))
    );
  }

  installControls();
  new MutationObserver((records) => {
    syncReaderState();
    // Kavita adds and removes page images constantly while a webtoon scrolls.
    // Only a reader menu appearing or leaving can move our anchor, so don't let
    // image traffic restart the offset-tracking animation loop.
    if (mutatesReaderOverlay(records)) {
      trackReaderMenuOffsets();
      syncMenuToggleButton();
    } else if (mutatesInsideReaderOverlay(records)) {
      // The menu is already open and only changed size, and its own slider
      // churns as pages advance, so recompute once rather than restarting the
      // loop on every update.
      syncReaderMenuOffsets();
    }
  }).observe(document.body, { childList: true, subtree: true });
})();
