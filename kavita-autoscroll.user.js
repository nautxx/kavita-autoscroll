// ==UserScript==
// @name         Kavita Webtoon Auto-scroll
// @namespace    https://github.com/nautxx/kavita-autoscroll
// @version      0.4.0
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

  const VERSION = '0.4.0';
  const INSTALL_MARKER = 'data-kavita-autoscroll';
  const STORAGE_KEY = 'kavita-autoscroll.speed';
  const POSITION_STORAGE_KEY = 'kavita-autoscroll.position';
  const DEFAULT_SPEED = 55;
  const MIN_SPEED = 10;
  const MAX_SPEED = 300;
  const AUTO_HIDE_DELAY = 2500;
  const READER_ROUTE = /\/manga(?:\/|$)/i;
  const CONTROL_ID = 'kavita-autoscroll';
  const POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  const ICONS = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>',
    position: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 0h2v6h-6v-2h4z"/></svg>',
  };

  if (document.documentElement.hasAttribute(INSTALL_MARKER)) return;
  document.documentElement.setAttribute(INSTALL_MARKER, VERSION);

  let running = false;
  let speed = clamp(Number(localStorage.getItem(STORAGE_KEY)) || DEFAULT_SPEED);
  let position = normalizePosition(localStorage.getItem(POSITION_STORAGE_KEY));
  let animationFrame = 0;
  let autoHideTimer = 0;
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

  function clamp(value) {
    return Math.min(MAX_SPEED, Math.max(MIN_SPEED, value));
  }

  function normalizePosition(value) {
    return POSITIONS.includes(value) ? value : 'bottom-right';
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

  function setPosition(nextPosition) {
    position = normalizePosition(nextPosition);
    controls.dataset.position = position;
    localStorage.setItem(POSITION_STORAGE_KEY, position);
    positionOptions.forEach((option) => {
      option.setAttribute('aria-checked', String(option.dataset.value === position));
    });
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
        bottom: max(16px, env(safe-area-inset-bottom));
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
        top: max(16px, env(safe-area-inset-top));
        right: auto;
        bottom: auto;
        left: max(16px, env(safe-area-inset-left));
      }
      #${CONTROL_ID}[data-position="top-right"] {
        top: max(16px, env(safe-area-inset-top));
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
      #${CONTROL_ID} input {
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
        display: grid;
        grid-template-columns: repeat(2, 32px);
        gap: 5px;
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
    controls.innerHTML = `
      <button class="toggle-button" type="button" aria-pressed="false" aria-label="Start auto-scroll" title="Start auto-scroll (S)">${ICONS.play}</button>
      <input type="range" min="${MIN_SPEED}" max="${MAX_SPEED}" step="5" aria-label="Scroll speed">
      <output></output>
      <button class="position-button" type="button" aria-expanded="false" aria-haspopup="menu" aria-label="Change control position" title="Change control position">${ICONS.position}</button>
      <div class="position-menu" role="menu" aria-label="Control position" hidden>
        ${POSITIONS.map((value) => `
          <button class="position-option" type="button" role="menuitemradio" data-value="${value}" aria-checked="false" aria-label="${value.replace('-', ' ')}">
            <span class="corner-preview" aria-hidden="true"></span>
          </button>
        `).join('')}
      </div>
    `;
    document.body.append(controls);

    toggleButton = controls.querySelector('button');
    speedSlider = controls.querySelector('input');
    speedOutput = controls.querySelector('output');
    positionButton = controls.querySelector('.position-button');
    positionMenu = controls.querySelector('.position-menu');
    positionOptions = controls.querySelectorAll('.position-option');
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
    positionOptions.forEach((option) => {
      option.addEventListener('click', () => {
        setPosition(option.dataset.value);
        setPositionMenu(false);
      });
    });
    setSpeed(speed);
    setPosition(position);
    syncRoute();
  }

  function syncRoute() {
    const readerActive = isReaderRoute();
    controls.hidden = !readerActive;
    if (!readerActive && running) setRunning(false);
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
    if (isEditableTarget(event.target)) return;
    revealControls();
    if (event.key === 'Escape' && !positionMenu.hidden) {
      event.preventDefault();
      setPositionMenu(false);
      return;
    }
    if (!positionMenu.hidden && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      const options = Array.from(positionOptions);
      const currentIndex = Math.max(0, options.indexOf(document.activeElement));
      const offset = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
      options[(currentIndex + offset + options.length) % options.length].focus({ preventScroll: true });
      return;
    }
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
