// ==UserScript==
// @name         Scrollito: auto-scroll for Kavita
// @namespace    https://github.com/nautxx/scrollito
// @version      1.2.0
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

  const VERSION = '1.2.0';
  const INSTALL_MARKER = 'data-scrollito';
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
    eyeOff: '<svg viewBox="0 0 576 512" aria-hidden="true"><path d="M41-24.9c-9.4-9.4-24.6-9.4-33.9 0S-2.3-.3 7 9.1l528 528c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-96.4-96.4c2.7-2.4 5.4-4.8 8-7.2 46.8-43.5 78.1-95.4 93-131.1 3.3-7.9 3.3-16.7 0-24.6-14.9-35.7-46.2-87.7-93-131.1-47.1-43.7-111.8-80.6-192.6-80.6-56.8 0-105.6 18.2-146 44.2L41-24.9zM204.5 138.7c23.5-16.8 52.4-26.7 83.5-26.7 79.5 0 144 64.5 144 144 0 31.1-9.9 59.9-26.7 83.5l-34.7-34.7c12.7-21.4 17-47.7 10.1-73.7-13.7-51.2-66.4-81.6-117.6-67.9-8.6 2.3-16.7 5.7-24 10l-34.7-34.7zM325.3 395.1c-11.9 3.2-24.4 4.9-37.3 4.9-79.5 0-144-64.5-144-144 0-12.9 1.7-25.4 4.9-37.3L69.4 139.2c-32.6 36.8-55 75.8-66.9 104.5-3.3 7.9-3.3 16.7 0 24.6 14.9 35.7 46.2 87.7 93 131.1 47.1 43.7 111.8 80.6 192.6 80.6 37.3 0 71.2-7.9 101.5-20.6l-64.2-64.2z"/></svg>',
  };

  if (document.documentElement.hasAttribute(INSTALL_MARKER)) return;
  document.documentElement.setAttribute(INSTALL_MARKER, VERSION);

  let running = false;
  let speed = clamp(Number(readStored(STORAGE_KEY)) || DEFAULT_SPEED);
  let position = normalizePosition(readStored(POSITION_STORAGE_KEY));
  let autoStart = readStored(AUTO_START_STORAGE_KEY) === 'true';
  let slipMode = readStored(SLIP_STORAGE_KEY) === 'true';
  let slipHeld = false;
  let webtoonModeActive = false;
  let controlsHidden = false;
  let animationFrame = 0;
  let autoHideTimer = 0;
  let readerMenuFrame = 0;
  let readerMenuTrackUntil = 0;
  let mouseOverControls = false;
  let previousTime = 0;
  let fractionalDistance = 0;
  let lastAutomaticScroll = 0;
  let cachedScrollContainer = null;
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
  let shortcutButtons = {};
  let remappingAction = null;
  let menuToggleSlot = null;

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
    return isReaderRoute() && Boolean(document.querySelector('app-infinite-scroller'));
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

    // Slip mode keeps running through a manual gesture, but advancing while a
    // finger is still down would fight the drag, so hold the clock — and the
    // pace with it — until the pointer lifts.
    if (slipHeld) {
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
    if (!running || mouseOverControls || keyboardFocusWithin || !positionMenu.hidden || !shortcutsMenu.hidden) {
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

  function setControlsHidden(nextHidden) {
    controlsHidden = Boolean(nextHidden);
    controls.dataset.userHidden = String(controlsHidden);
    if (controlsHidden) {
      if (!positionMenu.hidden) setPositionMenu(false, false);
      if (!shortcutsMenu.hidden) setShortcutsMenu(false, false);
      if (running) setRunning(false);
      syncMenuToggleButton();
      if (controls.dataset.revealInMenu !== 'true') revealButton.focus({ preventScroll: true });
    } else {
      syncMenuToggleButton();
      revealControls();
    }
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

  // Kavita lays its bottom-bar icons out as Bootstrap columns in a .row, so an
  // extra .col is spaced evenly with the rest for free. The row sits outside
  // the settings pane's @if block, which is why it survives that toggling.
  function findReaderMenuIconRow(bottomOverlay) {
    const rows = Array.from(bottomOverlay.querySelectorAll(':scope > .row'));
    return rows.reverse().find((row) => row.querySelector(':scope > .col > button')) ?? null;
  }

  // The slot is permanent rather than added only while hidden: a column that
  // came and went would shift Kavita's own icons on every toggle.
  function syncMenuToggleButton() {
    const [bottomOverlay] = findReaderOverlays('fixed-bottom');
    const row = bottomOverlay ? findReaderMenuIconRow(bottomOverlay) : null;

    if (!row) {
      menuToggleSlot = null;
      // A closed menu leaves nothing on screen to clutter, so stay hidden and
      // wait for it to reopen. Only a layout we cannot read needs the tab.
      controls.dataset.revealInMenu = bottomOverlay ? 'false' : 'true';
      return;
    }

    if (menuToggleSlot?.parentElement !== row) {
      menuToggleSlot = document.createElement('div');
      menuToggleSlot.className = 'col d-flex justify-content-center';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-icon';
      button.addEventListener('click', () => setControlsHidden(!controlsHidden));
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
    button.innerHTML = controlsHidden ? ICONS.eye : ICONS.eyeOff;

    // Scrollito's stylesheet does not reach inside Kavita's DOM, so size the
    // icon the way Font Awesome sizes its own inline SVGs against its glyphs.
    // Staying in em keeps it matched to whatever font size the reader uses.
    const icon = button.querySelector('svg');
    icon.style.width = 'auto';
    icon.style.height = '1em';
    icon.style.verticalAlign = '-0.125em';
    icon.style.fill = 'currentColor';
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

    // The settings drawer can make the menu tall enough to cover most of the
    // screen, so cap the offset at the point where the control would start
    // leaving the viewport.
    const maxEdge = Math.max(0, viewportHeight - controls.offsetHeight - READER_MENU_GAP * 2);

    controls.style.setProperty(
      '--reader-menu-top-edge',
      `${topEdge > 0 ? Math.min(topEdge + READER_MENU_GAP, maxEdge) : 0}px`
    );
    controls.style.setProperty(
      '--reader-menu-bottom-edge',
      `${bottomEdge > 0 ? Math.min(bottomEdge + READER_MENU_GAP, maxEdge) : 0}px`
    );
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
    trackedReaderOverlays = [...findReaderOverlays('fixed-top'), ...findReaderOverlays('fixed-bottom')];
    readerOverlayResize.disconnect();
    for (const overlay of trackedReaderOverlays) readerOverlayResize.observe(overlay);
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
    slipHeld = false;
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
    slipHeld = false;
    toggleButton.innerHTML = running ? ICONS.pause : ICONS.play;
    updateToggleButtonLabel();
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
    controls.dataset.revealInMenu = 'false';
    syncReaderState();
    observeReaderOverlays();
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
    if (outsideControls && !shortcutsMenu.hidden) setShortcutsMenu(false, false);
    if (!running || !outsideControls) return;
    // Slip mode reads a manual scroll as a seek rather than a stop: the pace
    // resumes from wherever the gesture left the page.
    if (slipMode) return;
    setRunning(false);
  }

  function holdForSlip(event) {
    if (slipMode && running && !controls.contains(event.target)) slipHeld = true;
  }

  function releaseTouchSlipHold(event) {
    if (event.touches.length === 0) slipHeld = false;
  }

  function holdMouseForSlip(event) {
    if (event.pointerType === 'mouse') holdForSlip(event);
  }

  function releaseMouseSlipHold(event) {
    if (event.pointerType === 'mouse') slipHeld = false;
  }

  document.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    // A button released outside the window never delivers pointerup, so treat
    // any buttonless move as the end of a mouse-driven slip hold.
    if (slipHeld && event.buttons === 0) slipHeld = false;
    revealControls();
  }, { passive: true });
  document.addEventListener('wheel', pauseForManualInput, { passive: true, capture: true });
  document.addEventListener('touchstart', pauseForManualInput, { passive: true, capture: true });
  document.addEventListener('pointerdown', pauseForManualInput, { passive: true, capture: true });
  // Touch holds run off touch events, not pointer ones: Safari cancels the
  // pointer as soon as it takes the gesture over for native scrolling, which is
  // exactly the stretch the hold has to cover. Mice keep the pointer stream, so
  // a drag on a scrollbar holds too.
  document.addEventListener('touchstart', holdForSlip, { passive: true, capture: true });
  document.addEventListener('touchend', releaseTouchSlipHold, { passive: true, capture: true });
  document.addEventListener('touchcancel', releaseTouchSlipHold, { passive: true, capture: true });
  document.addEventListener('pointerdown', holdMouseForSlip, { passive: true, capture: true });
  document.addEventListener('pointerup', releaseMouseSlipHold, { passive: true, capture: true });
  document.addEventListener('pointercancel', releaseMouseSlipHold, { passive: true, capture: true });
  document.addEventListener('scroll', (event) => {
    if (running && performance.now() - lastAutomaticScroll > 150) pauseForManualInput(event);
  }, { passive: true, capture: true });
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
    const target = event.target;
    if (target instanceof HTMLElement && target.classList.contains('overlay') &&
        (target.classList.contains('fixed-top') || target.classList.contains('fixed-bottom'))) {
      trackReaderMenuOffsets();
    }
  }, { capture: true });

  function isReaderOverlayNode(node) {
    return node instanceof HTMLElement && node.classList.contains('overlay') &&
      (node.classList.contains('fixed-top') || node.classList.contains('fixed-bottom'));
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
