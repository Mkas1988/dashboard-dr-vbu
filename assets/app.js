(function () {
  'use strict';

  var STORAGE_KEY = 'fom.management-basics.progress.v1';
  var TOC_COLLAPSE_KEY = 'fom.management-basics.toc-collapsed.v1';
  var RIGHT_TOOLS_COLLAPSE_KEY = 'fom.management-basics.right-tools-collapsed.v1';
  var NOTES_KEY_PREFIX = 'fom.management-basics.notes.v2::';

  function padUnit(value) {
    var digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '';
    return digits.length === 1 ? '0' + digits : digits.slice(-2);
  }

  function unitFromHref(href) {
    if (!href) return '';
    var match = href.match(/le(\d+)\.html/i);
    return match ? padUnit(match[1]) : '';
  }

  function readState() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { units: {} };
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.units || typeof parsed.units !== 'object') {
        return { units: {} };
      }
      return parsed;
    } catch (error) {
      return { units: {} };
    }
  }

  function saveState(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      // Ignore storage failures (e.g., private mode restrictions).
    }
  }

  function ensureProgressMarkup(tocItem) {
    var existing = tocItem.querySelector('.toc-progress');
    if (existing) {
      return {
        container: existing,
        text: existing.querySelector('.toc-progress-text'),
        fill: existing.querySelector('.toc-progress-fill')
      };
    }

    var container = document.createElement('span');
    container.className = 'toc-progress';

    var text = document.createElement('span');
    text.className = 'toc-progress-text';

    var track = document.createElement('span');
    track.className = 'toc-progress-track';

    var fill = document.createElement('span');
    fill.className = 'toc-progress-fill';

    track.appendChild(fill);
    container.appendChild(text);
    container.appendChild(track);
    tocItem.appendChild(container);

    return { container: container, text: text, fill: fill };
  }

  function ensureOverallProgressMarkup(tocHeader) {
    if (!tocHeader) return null;

    var existing = tocHeader.querySelector('.toc-overall-progress');
    if (existing) {
      return {
        container: existing,
        value: existing.querySelector('.toc-overall-progress-value'),
        ring: existing.querySelector('.toc-overall-progress-ring')
      };
    }

    var container = document.createElement('div');
    container.className = 'toc-overall-progress';
    container.setAttribute('role', 'img');
    container.setAttribute('aria-label', 'Gesamtfortschritt: 0%');

    container.innerHTML =
      '<svg class="toc-overall-progress-svg" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' +
        '<circle class="toc-overall-progress-track" cx="24" cy="24" r="18" pathLength="100"></circle>' +
        '<circle class="toc-overall-progress-ring" cx="24" cy="24" r="18" pathLength="100"></circle>' +
      '</svg>' +
      '<span class="toc-overall-progress-value">0%</span>';

    var toggleBtn = tocHeader.querySelector('.toc-toggle-btn');
    if (toggleBtn) tocHeader.insertBefore(container, toggleBtn);
    else tocHeader.appendChild(container);

    return {
      container: container,
      value: container.querySelector('.toc-overall-progress-value'),
      ring: container.querySelector('.toc-overall-progress-ring')
    };
  }

  function getUnitProgressPercent(unitState) {
    var total = unitState && typeof unitState.total === 'number' ? unitState.total : 0;
    var done = unitState && Array.isArray(unitState.completedIds) ? unitState.completedIds.length : 0;

    if (total > 0 && done > total) done = total;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }

  function getUnitState(state, unit) {
    if (!state.units[unit]) {
      state.units[unit] = { total: 0, completedIds: [] };
    }

    var current = state.units[unit];
    if (!Array.isArray(current.completedIds)) current.completedIds = [];
    if (typeof current.total !== 'number' || current.total < 0) current.total = 0;
    return current;
  }

  function renderProgress(tocMap, state, overallUi) {
    var overallUnits = [];

    Object.keys(tocMap).forEach(function (unit) {
      var unitState = getUnitState(state, unit);
      var total = unitState.total;
      var done = unitState.completedIds.length;
      if (total > 0 && done > total) done = total;
      var pct = getUnitProgressPercent(unitState);
      var ui = tocMap[unit];

      if (ui.text) ui.text.textContent = pct + '% abgeschlossen';
      if (ui.fill) ui.fill.style.width = pct + '%';

      ui.item.classList.toggle('is-complete', total > 0 && done >= total);
      overallUnits.push(pct);
    });

    if (!overallUi || !overallUnits.length) return;

    var overallPct = Math.round(
      overallUnits.reduce(function (sum, pct) { return sum + pct; }, 0) / overallUnits.length
    );

    if (overallUi.value) overallUi.value.textContent = overallPct + '%';
    if (overallUi.ring) overallUi.ring.style.strokeDasharray = overallPct + ' 100';
    if (overallUi.container) {
      overallUi.container.setAttribute('aria-label', 'Gesamtfortschritt: ' + overallPct + '%');
      overallUi.container.classList.toggle('is-complete', overallPct >= 100);
    }
  }

  function setupCampusProfileMenu() {
    var linksList = document.querySelector('.campus-links-list');
    if (!linksList) return;

    var profileMenu = linksList.querySelector('.campus-profile-menu');
    if (!profileMenu) {
      var profileItem = document.createElement('li');
      profileItem.className = 'campus-links-item campus-profile-menu';
      profileItem.innerHTML =
        '<button type="button" class="campus-profile-toggle campus-profile-link" aria-haspopup="true" aria-expanded="false" aria-label="Profilmen\u00fc \u00f6ffnen">' +
          '<img src="../../assets/profile-placeholder.svg" alt="" class="campus-profile-avatar" />' +
          '<span class="campus-profile-text">Profil</span>' +
        '</button>' +
        '<div class="campus-profile-dropdown" role="menu" aria-label="Profilmen\u00fc">' +
          '<button class="campus-profile-item" role="menuitem" type="button">Profil</button>' +
          '<button class="campus-profile-item" role="menuitem" type="button">Mitteilungen</button>' +
          '<button class="campus-profile-item" role="menuitem" type="button">Kalender</button>' +
          '<button class="campus-profile-item" role="menuitem" type="button">Einstellungen</button>' +
          '<button class="campus-profile-item" role="menuitem" type="button">Sprache</button>' +
        '</div>';
      linksList.appendChild(profileItem);
      profileMenu = profileItem;
    }

    var firstItem = linksList.querySelector('.campus-links-item');
    if (firstItem && !firstItem.classList.contains('campus-home-item')) {
      firstItem.classList.add('campus-home-item');
    }

    function ensureTopbarIconItem(itemClass, buttonClass, ariaLabel, svgMarkup, withDot) {
      var item = linksList.querySelector('.' + itemClass);
      if (!item) {
        item = document.createElement('li');
        item.className = 'campus-links-item ' + itemClass;
        item.innerHTML =
          '<button type="button" class="campus-icon-btn ' + buttonClass + '" aria-label="' + ariaLabel + '">' +
            svgMarkup +
            (withDot ? '<span class="campus-notify-dot" aria-hidden="true"></span>' : '') +
          '</button>';
      }
      if (profileMenu && profileMenu.parentNode === linksList) {
        linksList.insertBefore(item, profileMenu);
      } else {
        linksList.appendChild(item);
      }
      return item;
    }

    ensureTopbarIconItem(
      'campus-menu-item',
      'campus-menu-btn',
      'Men\u00fc',
      '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M5 7h14"></path><path d="M5 12h14"></path><path d="M5 17h14"></path></svg>',
      false
    );

    ensureTopbarIconItem(
      'campus-mail-item',
      'campus-mail-btn',
      'Nachrichten',
      '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M4 7h16v10H4z"></path><path d="M4 8l8 6 8-6"></path></svg>',
      true
    );

    var toggle = profileMenu.querySelector('.campus-profile-toggle');
    if (!toggle) return;

    function setOpen(isOpen) {
      profileMenu.classList.toggle('is-open', isOpen);
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }

    toggle.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(!profileMenu.classList.contains('is-open'));
    });

    profileMenu.querySelectorAll('.campus-profile-item').forEach(function (item) {
      item.addEventListener('click', function () {
        setOpen(false);
      });
    });

    document.addEventListener('click', function (event) {
      if (!profileMenu.contains(event.target)) setOpen(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setOpen(false);
    });
  }

  function setupMainHeaderMenus() {
    var header = document.getElementById('main-header');
    if (!header) return;

    var A11Y_STORAGE_KEY = 'fom.management-basics.a11y.v1';
    var burgerBtn = document.getElementById('burgerMenuBtn');
    var burgerMenu = document.getElementById('burgerMenu');
    var burgerInfoBtn = document.getElementById('burgerInfoBtn');
    var burgerSocialBtn = document.getElementById('burgerSocialBtn');
    var burgerModulesBtn = document.getElementById('burgerModulesBtn');
    var burgerExamsBtn = document.getElementById('burgerExamsBtn');
    var burgerEventsOfferBtn = document.getElementById('burgerEventsOfferBtn');
    var burgerHelpBtn = document.getElementById('burgerHelpBtn');
    var profileBtn = document.getElementById('profileBtn');
    var profileMenu = document.getElementById('profileMenu');
    var openA11yBtn = document.getElementById('openA11yMenuBtn');
    var closeA11yBtn = document.getElementById('closeA11yMenuBtn');
    var a11yContrastToggle = document.getElementById('a11yContrastToggle');
    var a11yMonochromeToggle = document.getElementById('a11yMonochromeToggle');
    var a11yLargeTextToggle = document.getElementById('a11yLargeTextToggle');
    var a11yContrastCheck = document.getElementById('a11yContrastCheck');
    var a11yMonochromeCheck = document.getElementById('a11yMonochromeCheck');
    var a11yLargeTextCheck = document.getElementById('a11yLargeTextCheck');
    var messagesNavBtn = document.getElementById('messagesNavBtn');
    var profileMain = document.getElementById('profileMenuMain');
    var profileA11y = document.getElementById('profileMenuA11y');
    var homeLogoBtn = document.getElementById('homeLogoBtn');

    function readStorageJson(key) {
      try {
        var raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch (error) {
        return null;
      }
    }

    function writeStorageJson(key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        // Ignore storage failures.
      }
    }

    function normalizeA11yState(rawState) {
      var state = rawState && typeof rawState === 'object' ? rawState : {};
      return {
        highContrast: !!state.highContrast,
        monochrome: !!state.monochrome,
        largeText: !!state.largeText
      };
    }

    var accessibilityState = normalizeA11yState(readStorageJson(A11Y_STORAGE_KEY));

    function applyA11yState() {
      document.body.classList.toggle('a11y-high-contrast', accessibilityState.highContrast);
      document.body.classList.toggle('a11y-monochrome', accessibilityState.monochrome);
      document.documentElement.classList.toggle('a11y-large-text', accessibilityState.largeText);
    }

    function persistA11yState() {
      writeStorageJson(A11Y_STORAGE_KEY, accessibilityState);
    }

    function syncA11yChecks() {
      if (a11yContrastCheck) {
        a11yContrastCheck.classList.toggle('hidden', !accessibilityState.highContrast);
      }
      if (a11yMonochromeCheck) {
        a11yMonochromeCheck.classList.toggle('hidden', !accessibilityState.monochrome);
      }
      if (a11yLargeTextCheck) {
        a11yLargeTextCheck.classList.toggle('hidden', !accessibilityState.largeText);
      }
    }

    function toggleA11yOption(optionKey) {
      accessibilityState[optionKey] = !accessibilityState[optionKey];
      applyA11yState();
      persistA11yState();
      syncA11yChecks();
    }

    function hide(el) {
      if (!el) return;
      el.classList.add('hidden');
    }

    function show(el) {
      if (!el) return;
      el.classList.remove('hidden');
    }

    function setProfileMenuView(view) {
      var showA11y = view === 'a11y';
      if (profileMain) profileMain.classList.toggle('hidden', showA11y);
      if (profileA11y) profileA11y.classList.toggle('hidden', !showA11y);
    }

    function resolveTopLevelPath(fileName) {
      var path = String(window.location.pathname || '').replace(/\\/g, '/');
      return /\/modules\//i.test(path) ? '../../' + fileName : fileName;
    }

    function navigateTo(fileName) {
      window.location.href = resolveTopLevelPath(fileName);
    }

    function closeAllMenus() {
      hide(burgerMenu);
      hide(profileMenu);
      setProfileMenuView('main');
    }

    applyA11yState();
    syncA11yChecks();

    if (homeLogoBtn) {
      homeLogoBtn.addEventListener('click', function () {
        navigateTo('dashboard-eu-local/index.html');
      });
    }

    if (burgerBtn && burgerMenu) {
      burgerBtn.addEventListener('click', function (event) {
        event.stopPropagation();
        var willOpen = burgerMenu.classList.contains('hidden');
        closeAllMenus();
        if (willOpen) show(burgerMenu);
      });
    }

    if (profileBtn && profileMenu) {
      profileBtn.addEventListener('click', function (event) {
        event.stopPropagation();
        var willOpen = profileMenu.classList.contains('hidden');
        closeAllMenus();
        if (willOpen) {
          show(profileMenu);
          setProfileMenuView('main');
          syncA11yChecks();
        }
      });
    }

    if (openA11yBtn && profileMain && profileA11y) {
      openA11yBtn.addEventListener('click', function (event) {
        event.stopPropagation();
        setProfileMenuView('a11y');
      });
    }

    if (closeA11yBtn && profileMain && profileA11y) {
      closeA11yBtn.addEventListener('click', function (event) {
        event.stopPropagation();
        setProfileMenuView('main');
      });
    }

    if (a11yContrastToggle) {
      a11yContrastToggle.addEventListener('click', function (event) {
        event.stopPropagation();
        toggleA11yOption('highContrast');
      });
    }

    if (a11yMonochromeToggle) {
      a11yMonochromeToggle.addEventListener('click', function (event) {
        event.stopPropagation();
        toggleA11yOption('monochrome');
      });
    }

    if (a11yLargeTextToggle) {
      a11yLargeTextToggle.addEventListener('click', function (event) {
        event.stopPropagation();
        toggleA11yOption('largeText');
      });
    }

    if (messagesNavBtn) {
      messagesNavBtn.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        closeAllMenus();
      });
    }

    function bindBurgerNavigation(button, targetFile) {
      if (!button) return;
      button.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        closeAllMenus();
      });
    }

    bindBurgerNavigation(burgerInfoBtn, 'index.html');
    bindBurgerNavigation(burgerSocialBtn, 'kurse.html');
    bindBurgerNavigation(burgerModulesBtn, 'kurse.html');
    bindBurgerNavigation(burgerExamsBtn, 'termine.html');
    bindBurgerNavigation(burgerEventsOfferBtn, 'termine.html');
    bindBurgerNavigation(burgerHelpBtn, 'index.html');

    document.addEventListener('click', function (event) {
      if (!header.contains(event.target)) closeAllMenus();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeAllMenus();
    });
  }

  function setupRightToolsRail() {
    var rail = document.querySelector('.right-tools-rail');
    if (!rail) return;
    if (document.body.hasAttribute('data-static-right-tools')) return;
    var body = document.body;

    function resolveAssetPath(assetFile) {
      var path = String(window.location.pathname || '').replace(/\\/g, '/');
      return /\/modules\//i.test(path) ? '../../assets/' + assetFile : 'assets/' + assetFile;
    }

    var notesSupported = !!document.querySelector('.unit-body') && !document.body.hasAttribute('data-no-notes');
    var railInner = rail.querySelector('.right-tools-rail-inner') || rail;
    var railToggleBtn = rail.querySelector('.right-rail-toggle-btn');
    if (!railToggleBtn) {
      railToggleBtn = document.createElement('button');
      railToggleBtn.type = 'button';
      railToggleBtn.className = 'right-rail-toggle-btn';
      railToggleBtn.innerHTML = '<span class="right-rail-toggle-icon" aria-hidden="true">\u203a</span>';
      rail.appendChild(railToggleBtn);
    }
    var notesButton = rail.querySelector('.right-tool-btn[data-tool-id="notes"]');
    var pdfButton = rail.querySelector('.right-tool-btn[data-tool-id="pdf-export"]');
    var notebookLmButton = rail.querySelector('.right-tool-btn[data-tool-id="notebooklm"]');
    var aiButton = rail.querySelector('.right-tool-btn[data-tool-id="ai-assistant"]');
    if (!notesSupported) {
      if (notesButton && notesButton.parentNode) notesButton.parentNode.removeChild(notesButton);
      notesButton = null;
    } else if (!notesButton) {
      notesButton = document.createElement('button');
      notesButton.type = 'button';
      notesButton.className = 'right-tool-btn';
      notesButton.setAttribute('data-tool-id', 'notes');
      notesButton.setAttribute('aria-label', 'Notizen einblenden');
      notesButton.setAttribute('data-tooltip', 'Notizen');
      notesButton.setAttribute('aria-pressed', 'false');
      notesButton.innerHTML =
        '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">' +
        '<rect x="5" y="4.8" width="14" height="14.4" rx="2.4"></rect>' +
        '<path d="M8.5 10h7"></path>' +
        '<path d="M8.5 13.5h5"></path>' +
        '</svg>';
    }
    if (notesButton && railInner.firstElementChild !== notesButton) {
      railInner.insertBefore(notesButton, railInner.firstChild);
    }
    if (!pdfButton) {
      pdfButton = document.createElement('button');
      pdfButton.type = 'button';
      pdfButton.className = 'right-tool-btn';
      pdfButton.setAttribute('data-tool-id', 'pdf-export');
      pdfButton.setAttribute('aria-label', 'Seite als PDF exportieren');
      pdfButton.setAttribute('data-tooltip', 'PDF Export');
      pdfButton.setAttribute('aria-pressed', 'false');
      pdfButton.innerHTML =
        '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">' +
        '<path d="M6 4.8h9l3 3v11.4a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1z"></path>' +
        '<path d="M15 4.8v3h3"></path>' +
        '<path d="M8.5 13h7"></path>' +
        '<path d="M8.5 16h4.6"></path>' +
        '</svg>';
      railInner.appendChild(pdfButton);
    }
    if (!notebookLmButton) {
      notebookLmButton = document.createElement('button');
      notebookLmButton.type = 'button';
      notebookLmButton.className = 'right-tool-btn';
      notebookLmButton.setAttribute('data-tool-id', 'notebooklm');
      notebookLmButton.setAttribute('aria-label', 'NotebookLM \u00f6ffnen');
      notebookLmButton.setAttribute('data-tooltip', 'Google NotebookLM');
      notebookLmButton.setAttribute('aria-pressed', 'false');
      notebookLmButton.innerHTML =
        '<img src="' + resolveAssetPath('google-notebooklm-logo-icon.png.svg') + '" alt="" class="right-tool-brand-icon" loading="lazy" decoding="async">';
      railInner.appendChild(notebookLmButton);
    }
    if (notebookLmButton) {
      notebookLmButton.setAttribute('data-tooltip', 'Google NotebookLM');
    }
    if (!aiButton) {
      aiButton = document.createElement('button');
      aiButton.type = 'button';
      aiButton.className = 'right-tool-btn';
      aiButton.setAttribute('data-tool-id', 'ai-assistant');
      aiButton.setAttribute('aria-label', 'KI-Funktion');
      aiButton.setAttribute('data-tooltip', 'KI-Funktion');
      aiButton.setAttribute('aria-pressed', 'false');
      aiButton.innerHTML =
        '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">' +
        '<path d="M4.8 19.2l7.2-7.2"></path>' +
        '<path d="M8.2 7.4l1.7 1.7"></path>' +
        '<path d="M5.4 10.2l1.7 1.7"></path>' +
        '<path d="M11.7 4.5l.5 1.6 1.6.5-1.6.5-.5 1.6-.5-1.6-1.6-.5 1.6-.5z"></path>' +
        '<path d="M16.5 10.7l.4 1.2 1.2.4-1.2.4-.4 1.2-.4-1.2-1.2-.4 1.2-.4z"></path>' +
        '<path d="M18.8 4.2l.6 1.9 1.9.6-1.9.6-.6 1.9-.6-1.9-1.9-.6 1.9-.6z"></path>' +
        '</svg>';
      railInner.appendChild(aiButton);
    }
    var audioButton = rail.querySelector('.right-tool-btn[data-tool-id="audio"]');
    if (!audioButton) {
      audioButton = document.createElement('button');
      audioButton.type = 'button';
      audioButton.className = 'right-tool-btn';
      audioButton.setAttribute('data-tool-id', 'audio');
      audioButton.setAttribute('aria-label', 'Audiospur abspielen');
      audioButton.setAttribute('data-tooltip', 'Audio');
      audioButton.setAttribute('aria-pressed', 'false');
      audioButton.innerHTML =
        '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">' +
        '<path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>' +
        '<path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"></path>' +
        '<path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>' +
        '</svg>';
      railInner.appendChild(audioButton);
    }
    if (notesButton && audioButton && notesButton.nextElementSibling !== audioButton) {
      railInner.insertBefore(audioButton, notesButton.nextSibling);
    }
    if (audioButton && pdfButton && audioButton.nextElementSibling !== pdfButton) {
      railInner.insertBefore(pdfButton, audioButton.nextSibling);
    } else if (!notesButton && railInner.firstElementChild !== pdfButton) {
      railInner.insertBefore(pdfButton, railInner.firstChild);
    }
    if (pdfButton && notebookLmButton && pdfButton.nextElementSibling !== notebookLmButton) {
      railInner.insertBefore(notebookLmButton, pdfButton.nextSibling);
    }
    if (pdfButton && aiButton && pdfButton.nextElementSibling !== aiButton) {
      railInner.insertBefore(aiButton, pdfButton.nextSibling);
    }
    if (aiButton && notebookLmButton && aiButton.nextElementSibling !== notebookLmButton) {
      railInner.insertBefore(notebookLmButton, aiButton.nextSibling);
    }
    Array.prototype.slice.call(rail.querySelectorAll('.right-tool-btn')).forEach(function (btn) {
      var toolId = btn.getAttribute('data-tool-id') || '';
      if (toolId !== 'notes' && toolId !== 'pdf-export' && toolId !== 'ai-assistant' && toolId !== 'notebooklm' && toolId !== 'audio' && btn.parentNode) {
        btn.parentNode.removeChild(btn);
      }
    });

    function getNotesPanel() {
      return document.querySelector('.fom-notes-panel');
    }

    function setNotesButtonState(isOpen) {
      if (!notesButton) return;
      notesButton.classList.toggle('is-active', !!isOpen);
      notesButton.setAttribute('aria-pressed', isOpen ? 'true' : 'false');
      notesButton.setAttribute('aria-label', isOpen ? 'Notizen ausblenden' : 'Notizen einblenden');
    }

    function setNotesPanelOpen(isOpen) {
      var panel = getNotesPanel();
      if (!panel) return false;
      panel.classList.toggle('is-collapsed', !isOpen);
      panel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
      // Sync the separate notes list wrap visibility
      var listWrap = document.querySelector('.fom-notes-list-wrap');
      if (listWrap) listWrap.classList.toggle('is-collapsed', !isOpen);
      setNotesButtonState(isOpen);
      return true;
    }

    function toggleNotesPanel() {
      var panel = getNotesPanel();
      if (!panel) return false;
      var nextOpen = panel.classList.contains('is-collapsed');
      return setNotesPanelOpen(nextOpen);
    }

    function setAuxButtonState(button, isActive) {
      if (!button) return;
      button.classList.toggle('is-active', !!isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }

    function forceHideFloatingPanel(panelId) {
      var panel = document.getElementById(panelId);
      if (!panel) return;
      panel.classList.add('is-instant-close');
      panel.classList.add('is-collapsed');
      panel.setAttribute('aria-hidden', 'true');
      panel.setAttribute('hidden', '');
      window.setTimeout(function () {
        panel.classList.remove('is-collapsed');
        panel.classList.remove('is-instant-close');
      }, 0);
    }

    function setRightRailCollapsed(collapsed) {
      body.classList.toggle('right-tools-is-collapsed', !!collapsed);
      if (railToggleBtn) {
        railToggleBtn.setAttribute('aria-expanded', String(!collapsed));
        railToggleBtn.setAttribute('aria-label', collapsed ? 'Rechte Leiste ausklappen' : 'Rechte Leiste einklappen');
        var railToggleIcon = railToggleBtn.querySelector('.right-rail-toggle-icon');
        if (railToggleIcon) railToggleIcon.textContent = collapsed ? '\u2039' : '\u203a';
      }

      if (collapsed) {
        setNotesPanelOpen(false);
        forceHideFloatingPanel('audioPlayerPanel');
        forceHideFloatingPanel('pdfExportPanel');
        forceHideFloatingPanel('notebookLmPanel');
        forceHideFloatingPanel('aiAssistantPanel');
        setAuxButtonState(pdfButton, false);
        setAuxButtonState(notebookLmButton, false);
        setAuxButtonState(aiButton, false);
        setAuxButtonState(audioButton, false);
        var audioEl = document.getElementById('audioPlayerEl');
        if (audioEl && typeof audioEl.pause === 'function') audioEl.pause();
      }

      try {
        window.localStorage.setItem(RIGHT_TOOLS_COLLAPSE_KEY, collapsed ? '1' : '0');
      } catch (error) {
        // Ignore storage failures.
      }

      document.dispatchEvent(new CustomEvent('right-tools:collapse-state', {
        detail: { collapsed: !!collapsed }
      }));
    }

    if (railToggleBtn) {
      railToggleBtn.addEventListener('click', function () {
        setRightRailCollapsed(!body.classList.contains('right-tools-is-collapsed'));
      });
    }

    try {
      setRightRailCollapsed(window.localStorage.getItem(RIGHT_TOOLS_COLLAPSE_KEY) === '1');
    } catch (error) {
      setRightRailCollapsed(body.classList.contains('right-tools-is-collapsed'));
    }

    var buttons = Array.prototype.slice.call(rail.querySelectorAll('.right-tool-btn'));
    if (!buttons.length) return;

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        var toolId = button.getAttribute('data-tool-id') || '';
        if (toolId === 'notes') {
          var notesOpen = toggleNotesPanel();
          document.dispatchEvent(new CustomEvent('right-tool:select', {
            detail: { toolId: toolId, notesOpen: notesOpen }
          }));
          return;
        }
        if (toolId === 'pdf-export') {
          document.dispatchEvent(new CustomEvent('right-tool:select', {
            detail: { toolId: toolId }
          }));
          return;
        }
        if (toolId === 'notebooklm') {
          document.dispatchEvent(new CustomEvent('right-tool:select', {
            detail: { toolId: toolId }
          }));
          return;
        }
        if (toolId === 'ai-assistant') {
          document.dispatchEvent(new CustomEvent('right-tool:select', {
            detail: { toolId: toolId }
          }));
          return;
        }

        if (toolId === 'audio') return;
        buttons.forEach(function (other) {
          if ((other.getAttribute('data-tool-id') || '') === 'notes') return;
          if ((other.getAttribute('data-tool-id') || '') === 'audio') return;
          other.classList.toggle('is-active', other === button);
        });

        document.dispatchEvent(new CustomEvent('right-tool:select', {
          detail: { toolId: toolId }
        }));
      });
    });

    document.addEventListener('notes:panel-state', function (event) {
      var detail = event && event.detail ? event.detail : {};
      if (typeof detail.open !== 'boolean') return;
      setNotesButtonState(detail.open);
    });
  }

  function initInlineTocCollapsedByDefault() {
    var inlineTocs = document.querySelectorAll('.fom-inline-toc-collapsible');
    if (!inlineTocs.length) return;

    inlineTocs.forEach(function (tocEl) {
      tocEl.classList.add('is-collapsed');
      var toggle = tocEl.querySelector('.fom-inline-toc-toggle');
      var icon = tocEl.querySelector('.fom-inline-toc-toggle-icon');
      if (toggle) {
        var labelBase = tocEl.getAttribute('data-toggle-label') || 'Inhaltsverzeichnis';
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', labelBase + ' ausklappen');
      }
      if (icon) icon.classList.add('is-collapsed');
    });
  }

  function animateCollapsibleHeight(contentEl, expand) {
    return new Promise(function (resolve) {
      if (!contentEl) {
        resolve();
        return;
      }

      var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion) {
        contentEl.style.removeProperty('transition');
        contentEl.style.removeProperty('overflow');
        contentEl.style.removeProperty('max-height');
        contentEl.style.removeProperty('opacity');
        resolve();
        return;
      }

      var duration = 320;
      var easing = 'cubic-bezier(.22,1,.36,1)';
      var naturalHeight = contentEl.scrollHeight;
      var startHeight = expand ? 0 : naturalHeight;
      var endHeight = expand ? naturalHeight : 0;

      contentEl.style.overflow = 'hidden';
      contentEl.style.maxHeight = startHeight + 'px';
      contentEl.style.opacity = expand ? '0' : '1';
      contentEl.style.transition = 'max-height ' + duration + 'ms ' + easing + ', opacity 220ms ease';

      // Trigger layout so the browser applies the start height before transition.
      contentEl.getBoundingClientRect();

      requestAnimationFrame(function () {
        contentEl.style.maxHeight = endHeight + 'px';
        contentEl.style.opacity = expand ? '1' : '0';
      });

      var done = false;
      function cleanup() {
        if (done) return;
        done = true;
        contentEl.style.removeProperty('transition');
        contentEl.style.removeProperty('overflow');
        contentEl.style.removeProperty('max-height');
        contentEl.style.removeProperty('opacity');
        resolve();
      }

      contentEl.addEventListener('transitionend', function onEnd(event) {
        if (event.target !== contentEl || event.propertyName !== 'max-height') return;
        contentEl.removeEventListener('transitionend', onEnd);
        cleanup();
      });

      window.setTimeout(cleanup, duration + 80);
    });
  }

  function animateDetailsCollapse(detailsEl, openTarget) {
    if (!detailsEl) return;
    if (detailsEl.dataset.collapseAnimating === '1') return;

    var content = detailsEl.querySelector('.fom-collapse-content');
    if (!content) {
      detailsEl.open = !!openTarget;
      return;
    }

    detailsEl.dataset.collapseAnimating = '1';

    if (openTarget) {
      detailsEl.open = true;
      requestAnimationFrame(function () {
        animateCollapsibleHeight(content, true).then(function () {
          delete detailsEl.dataset.collapseAnimating;
        });
      });
      return;
    }

    animateCollapsibleHeight(content, false).then(function () {
      detailsEl.open = false;
      delete detailsEl.dataset.collapseAnimating;
    });
  }

  function setupAnimatedCollapsibles() {
    var detailsBlocks = document.querySelectorAll('details.fom-collapse');
    detailsBlocks.forEach(function (detailsEl) {
      var summary = detailsEl.querySelector('summary');
      if (!summary || summary.dataset.collapseBound === '1') return;
      summary.dataset.collapseBound = '1';
      summary.addEventListener('click', function (event) {
        event.preventDefault();
        animateDetailsCollapse(detailsEl, !detailsEl.open);
      });
    });

    var inlineTocs = document.querySelectorAll('.fom-inline-toc-collapsible');
    inlineTocs.forEach(function (tocEl) {
      var toggle = tocEl.querySelector('.fom-inline-toc-toggle');
      var icon = tocEl.querySelector('.fom-inline-toc-toggle-icon');
      var content = tocEl.querySelector('.fom-inline-toc-content');
      if (!toggle || !content || toggle.dataset.collapseBound === '1') return;

      toggle.dataset.collapseBound = '1';
      toggle.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();

        var collapsed = tocEl.classList.contains('is-collapsed');
        var labelBase = tocEl.getAttribute('data-toggle-label') || 'Inhaltsverzeichnis';
        if (collapsed) tocEl.classList.remove('is-collapsed');

        animateCollapsibleHeight(content, collapsed).then(function () {
          if (!collapsed) tocEl.classList.add('is-collapsed');
        });

        toggle.setAttribute('aria-expanded', String(collapsed));
        toggle.setAttribute('aria-label', collapsed ? labelBase + ' einklappen' : labelBase + ' ausklappen');
        if (icon) icon.classList.toggle('is-collapsed', !collapsed);
      });
    });
  }

  function setupMerkmalTableReveal() {
    var wrap = document.getElementById('merkmal-table-wrap');
    if (!wrap) return;

    var termItems = Array.prototype.slice.call(wrap.querySelectorAll('.merkmal-match-item'));
    var slots = Array.prototype.slice.call(wrap.querySelectorAll('.merkmal-piece-slot'));
    var answerBank = wrap.querySelector('.merkmal-card-bank');
    var answerPieces = Array.prototype.slice.call(wrap.querySelectorAll('.merkmal-piece-answer'));
    var checkBtn = wrap.querySelector('#merkmalMatchCheckBtn');
    var resetBtn = wrap.querySelector('#merkmalMatchResetBtn');
    var feedback = wrap.querySelector('#merkmalMatchFeedback');

    if (!termItems.length || !slots.length || !answerBank || !answerPieces.length) {
      var buttons = document.querySelectorAll('#merkmal-table-wrap .fom-table tbody tr.reveal-row .reveal-btn');
      if (!buttons.length) return;
      buttons.forEach(function (btn) {
        if (btn.dataset.revealBound === '1') return;
        btn.dataset.revealBound = '1';
        btn.addEventListener('click', function () {
          var row = btn.closest('tr');
          if (!row) return;
          row.classList.add('is-revealed');
          btn.setAttribute('aria-hidden', 'true');
          btn.setAttribute('tabindex', '-1');
        });
      });
      return;
    }

    if (wrap.dataset.matchBound === '1') return;
    wrap.dataset.matchBound = '1';

    var draggedPiece = null;

    function shuffle(list) {
      var arr = list.slice();
      for (var i = arr.length - 1; i > 0; i -= 1) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
      }
      return arr;
    }

    function clearFeedback() {
      if (!feedback) return;
      feedback.textContent = '';
      feedback.classList.remove('is-success', 'is-error');
    }

    function clearEvaluation() {
      termItems.forEach(function (item) {
        item.classList.remove('is-correct', 'is-wrong');
      });
      answerPieces.forEach(function (piece) {
        piece.classList.remove('is-correct', 'is-wrong');
      });
      slots.forEach(function (slot) {
        slot.classList.remove('is-over', 'is-correct', 'is-wrong');
      });
      clearFeedback();
    }

    function getAnswerById(id) {
      return answerPieces.find(function (piece) {
        return (piece.getAttribute('data-answer-id') || '') === id;
      }) || null;
    }

    function getPlacedCount() {
      var count = 0;
      slots.forEach(function (slot) {
        if (slot.querySelector('.merkmal-piece-answer')) count += 1;
      });
      return count;
    }

    function placeAnswerInSlot(piece, slot) {
      if (!piece || !slot) return;
      clearEvaluation();
      var existing = slot.querySelector('.merkmal-piece-answer');
      if (existing && existing !== piece) answerBank.appendChild(existing);
      slot.appendChild(piece);
    }

    function returnAnswerToBank(piece) {
      if (!piece) return;
      clearEvaluation();
      answerBank.appendChild(piece);
    }

    function resetTask() {
      clearEvaluation();
      slots.forEach(function (slot) {
        var placed = slot.querySelector('.merkmal-piece-answer');
        if (placed) answerBank.appendChild(placed);
      });
      shuffle(answerPieces).forEach(function (piece) { answerBank.appendChild(piece); });
    }

    answerPieces.forEach(function (piece) {
      piece.addEventListener('dragstart', function (event) {
        draggedPiece = piece;
        piece.classList.add('is-dragging');
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', piece.getAttribute('data-answer-id') || '');
        }
      });

      piece.addEventListener('dragend', function () {
        piece.classList.remove('is-dragging');
        draggedPiece = null;
        slots.forEach(function (slot) { slot.classList.remove('is-over'); });
      });

      piece.addEventListener('dblclick', function () {
        if (piece.parentElement === answerBank) return;
        returnAnswerToBank(piece);
      });
    });

    slots.forEach(function (slot) {
      slot.addEventListener('dragover', function (event) {
        event.preventDefault();
        slot.classList.add('is-over');
      });

      slot.addEventListener('dragleave', function () {
        slot.classList.remove('is-over');
      });

      slot.addEventListener('drop', function (event) {
        event.preventDefault();
        slot.classList.remove('is-over');
        var piece = draggedPiece;
        if (!piece && event.dataTransfer) {
          piece = getAnswerById(event.dataTransfer.getData('text/plain'));
        }
        placeAnswerInSlot(piece, slot);
      });
    });

    answerBank.addEventListener('dragover', function (event) {
      event.preventDefault();
    });

    answerBank.addEventListener('drop', function (event) {
      event.preventDefault();
      var piece = draggedPiece;
      if (!piece && event.dataTransfer) {
        piece = getAnswerById(event.dataTransfer.getData('text/plain'));
      }
      returnAnswerToBank(piece);
    });

    if (checkBtn) {
      checkBtn.addEventListener('click', function () {
        clearEvaluation();
        var correct = 0;
        var assigned = getPlacedCount();

        slots.forEach(function (slot) {
          var termId = slot.getAttribute('data-match-id') || '';
          var answerPiece = slot.querySelector('.merkmal-piece-answer');
          if (!answerPiece) return;
          var answerId = answerPiece.getAttribute('data-answer-id') || '';
          var isCorrect = answerId === termId;
          var item = slot.closest('.merkmal-match-item');
          slot.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
          if (item) item.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
          answerPiece.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
          if (isCorrect) correct += 1;
        });

        if (!feedback) return;
        if (assigned < slots.length) {
          feedback.textContent = 'Bitte verbinde zuerst alle Merkmale mit einer Beschreibung.';
          feedback.classList.add('is-error');
          return;
        }
        if (correct === slots.length) {
          feedback.textContent = 'Super! Alle Zuordnungen sind korrekt.';
          feedback.classList.add('is-success');
          return;
        }
        feedback.textContent = String(correct) + ' von ' + String(slots.length) + ' richtig. Prüfe die markierten Verbindungen.';
        feedback.classList.add('is-error');
      });
    }

    if (resetBtn) resetBtn.addEventListener('click', resetTask);
    resetTask();
  }

  function initUnitBodyScrollFade() {
    var root = document.querySelector('.unit-body');
    if (!root) return;

    var items = Array.prototype.slice.call(root.children).filter(function (el) {
      return el &&
        el.tagName &&
        el.tagName.toLowerCase() !== 'script' &&
        !el.classList.contains('fom-learning-goals-block');
    });
    if (!items.length) return;

    items.forEach(function (el) {
      el.classList.add('fom-scroll-fade');
    });

    function setInitialState(el) {
      var rect = el.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight || 0;
      var isBefore = rect.bottom <= vh * 0.1;
      var isAfter = rect.top >= vh * 0.9;

      if (isBefore) {
        // Above the viewport on initial load should stay fully visible when scrolling up.
        el.classList.add('is-visible');
        el.classList.remove('is-before', 'is-after');
        return;
      }

      if (isAfter) {
        el.classList.add('is-after');
        el.classList.remove('is-before');
        return;
      }

      el.classList.add('is-visible');
      el.classList.remove('is-before', 'is-after');
    }

    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) {
        el.classList.add('is-visible');
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        entry.target.classList.remove('is-before', 'is-after');
        obs.unobserve(entry.target);
      });
    }, {
      threshold: 0.14,
      root: null,
      rootMargin: '0px 0px -10% 0px'
    });

    items.forEach(function (el) {
      setInitialState(el);
      if (el.classList.contains('is-visible')) return;
      observer.observe(el);
    });
  }

  function setupTextNotes() {
    var root = document.querySelector('.unit-body');
    if (!root || document.body.hasAttribute('data-no-notes')) return;

    var NOTE_COLORS = ['gelb', 'rot', 'orange', 'lila'];
    var DEFAULT_NOTE_COLOR = 'gelb';
    var NOTE_FILTERS = ['alle'].concat(NOTE_COLORS);
    var storageKey = NOTES_KEY_PREFIX + window.location.pathname;
    var noteFilterStorageKey = storageKey + '::filter';
    var panelModeStorageKey = storageKey + '::panel-mode';
    var notes = [];
    var selectionRange = null;
    var activeNoteId = null;
    var selectedEditorColor = DEFAULT_NOTE_COLOR;
    var aiSelectionModeActive = false;
    var currentNoteFilter = 'alle';
    var currentPanelMode = 'notes';
    var notesUndoStack = [];
    var MAX_UNDO_STEPS = 80;
    var noteLayoutFrame = 0;
    var editorColorButtons = [];
    var selectionColorButtons = [];
    var selectionMenuNoteId = '';
    var aiAssistantActionBtn = document.getElementById('aiAssistantActionBtn');

    function normalizeNoteColor(color) {
      return NOTE_COLORS.indexOf(color) >= 0 ? color : DEFAULT_NOTE_COLOR;
    }

    function normalizeNoteFilter(filter) {
      return NOTE_FILTERS.indexOf(filter) >= 0 ? filter : 'alle';
    }

    function normalizePanelMode(mode) {
      return mode === 'highlights' ? 'highlights' : 'notes';
    }

    function cloneNote(note) {
      return {
        id: String(note.id || ''),
        quote: String(note.quote || ''),
        text: String(note.text || ''),
        color: normalizeNoteColor(note.color),
        start: Number(note.start) || 0,
        end: Number(note.end) || 0,
        createdAt: typeof note.createdAt === 'number' ? note.createdAt : Date.now()
      };
    }

    function cloneNotesList(list) {
      if (!Array.isArray(list)) return [];
      return list.map(cloneNote);
    }

    function pushUndoState() {
      notesUndoStack.push(cloneNotesList(notes));
      if (notesUndoStack.length > MAX_UNDO_STEPS) notesUndoStack.shift();
    }

    function notesInTextOrder() {
      return notes.slice().sort(function (a, b) {
        if (a.start !== b.start) return a.start - b.start;
        return a.createdAt - b.createdAt;
      });
    }

    function filteredNotesInTextOrder() {
      var filter = normalizeNoteFilter(currentNoteFilter);
      var ordered = notesInTextOrder();
      if (filter === 'alle') return ordered;
      return ordered.filter(function (note) {
        return normalizeNoteColor(note.color) === filter;
      });
    }

    function filteredCommentNotesInTextOrder() {
      return filteredNotesInTextOrder().filter(function (note) {
        return !!String(note.text || '').trim();
      });
    }

    function filteredHighlightNotesInTextOrder() {
      return filteredNotesInTextOrder();
    }

    function readNotes() {
      try {
        var raw = window.localStorage.getItem(storageKey);
        notes = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(notes)) notes = [];
        notes = notes
          .filter(function (note) {
            return note && typeof note === 'object' && typeof note.start === 'number' && typeof note.end === 'number' && note.end > note.start;
          })
          .map(function (note) {
            return {
              id: String(note.id || ('note-' + Date.now() + '-' + Math.floor(Math.random() * 100000))),
              quote: String(note.quote || ''),
              text: String(note.text || ''),
              color: normalizeNoteColor(String(note.color || '')),
              start: note.start,
              end: note.end,
              createdAt: typeof note.createdAt === 'number' ? note.createdAt : Date.now()
            };
          });
      } catch (error) {
        notes = [];
      }
    }

    function saveNotes() {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(notes));
      } catch (error) {
        // Ignore storage failures.
      }
    }

    function readNoteFilter() {
      try {
        var raw = window.localStorage.getItem(noteFilterStorageKey);
        currentNoteFilter = normalizeNoteFilter(raw || 'alle');
      } catch (error) {
        currentNoteFilter = 'alle';
      }
    }

    function saveNoteFilter() {
      try {
        window.localStorage.setItem(noteFilterStorageKey, normalizeNoteFilter(currentNoteFilter));
      } catch (error) {
        // Ignore storage failures.
      }
    }

    function readPanelMode() {
      try {
        var raw = window.localStorage.getItem(panelModeStorageKey);
        currentPanelMode = normalizePanelMode(raw || 'notes');
      } catch (error) {
        currentPanelMode = 'notes';
      }
    }

    function savePanelMode() {
      try {
        window.localStorage.setItem(panelModeStorageKey, normalizePanelMode(currentPanelMode));
      } catch (error) {
        // Ignore storage failures.
      }
    }

    function positionNotesByHighlights() {
      if (!notesList) return;
      var isNotesMode = currentPanelMode === 'notes';
      var orderedNotes = isNotesMode ? filteredCommentNotesInTextOrder() : filteredHighlightNotesInTextOrder();
      if (!orderedNotes.length) {
        notesList.classList.remove('is-anchored');
        notesList.style.minHeight = '';
        return;
      }

      if (!window.matchMedia('(min-width: 1181px)').matches) {
        notesList.classList.remove('is-anchored');
        notesList.style.minHeight = '';
        notesList.querySelectorAll('.fom-note-item').forEach(function (item) {
          item.style.top = '';
        });
        return;
      }

      notesList.classList.add('is-anchored');
      var listRect = notesList.getBoundingClientRect();
      var spacing = 10;
      var cursorTop = 0;
      var filtered = orderedNotes;

      function collapsedAccordionSummaryForNote(note, highlight) {
        var collapse = highlight ? highlight.closest('details.fom-collapse') : null;
        if (!collapse) {
          var startPoint = pointFromOffset(note.start);
          if (startPoint && startPoint.node && startPoint.node.parentElement) {
            collapse = startPoint.node.parentElement.closest('details.fom-collapse');
          }
        }
        if (!collapse || collapse.open) return null;
        return collapse.querySelector('summary');
      }

      filtered.forEach(function (note) {
        var item = notesList.querySelector('.fom-note-item[data-note-id="' + note.id + '"]');
        if (!item) return;

        var desiredTop = cursorTop;
        var highlight = root.querySelector('.fom-note-highlight[data-note-id="' + note.id + '"]');
        var fallbackSummary = collapsedAccordionSummaryForNote(note, highlight);
        if (fallbackSummary) {
          var summaryRect = fallbackSummary.getBoundingClientRect();
          desiredTop = Math.max(0, summaryRect.top - listRect.top + notesList.scrollTop);
        } else if (highlight) {
          var markRect = highlight.getBoundingClientRect();
          desiredTop = Math.max(0, markRect.top - listRect.top + notesList.scrollTop);
        }

        var finalTop = Math.max(cursorTop, desiredTop);
        item.style.top = Math.round(finalTop) + 'px';
        cursorTop = finalTop + item.offsetHeight + spacing;
      });

      notesList.style.minHeight = Math.max(cursorTop, 40) + 'px';
    }

    function scheduleNoteLayout() {
      if (noteLayoutFrame) return;
      noteLayoutFrame = window.requestAnimationFrame(function () {
        noteLayoutFrame = 0;
        positionNotesByHighlights();
      });
    }

    function hideSelectionBtn() {
      selectionBtn.style.display = 'none';
      closeAiSelectionMenu();
      selectionRange = null;
      selectionMenuNoteId = '';
      if (selectionApplyBtn) {
        selectionApplyBtn.textContent = 'Markieren';
        selectionApplyBtn.setAttribute('aria-label', 'Markierten Text hervorheben');
      }
    }

    function closeEditor() {
      editor.classList.remove('is-open');
      editorTextarea.value = '';
      editorCounter.textContent = '0/500';
      setEditorEditId('');
      setEditorColor(DEFAULT_NOTE_COLOR);
    }

    function openEditor(defaultValue, defaultColor) {
      editor.classList.add('is-open');
      editorTextarea.value = defaultValue || '';
      setEditorColor(defaultColor);
      editorCounter.textContent = String(editorTextarea.value.length) + '/500';
      editorTextarea.focus();
      editorTextarea.setSelectionRange(editorTextarea.value.length, editorTextarea.value.length);
    }

    function setEditorEditId(noteId) {
      var id = noteId || '';
      editor.setAttribute('data-edit-id', id);
      if (editorDeleteBtn) {
        editorDeleteBtn.style.display = id ? 'inline-flex' : 'none';
      }
    }

    function findNoteById(noteId) {
      return notes.find(function (note) { return note.id === noteId; }) || null;
    }

    function removeNoteById(noteId) {
      if (!noteId) return;
      pushUndoState();
      notes = notes.filter(function (note) { return note.id !== noteId; });
      saveNotes();
      applyHighlights();
      renderPanel();
      syncUndoButton();
    }

    function positionSelectionMenu(anchorRect) {
      var menuWidth = selectionBtn.offsetWidth || 240;
      var minLeft = 12;
      var maxLeft = Math.max(minLeft, window.innerWidth - menuWidth - 12);
      var suggestedLeft = Math.round(anchorRect.right - menuWidth);
      selectionBtn.style.left = Math.max(minLeft, Math.min(maxLeft, suggestedLeft)) + 'px';

      var suggestedTop = Math.round(anchorRect.bottom + 8);
      var maxTop = window.innerHeight - 52;
      selectionBtn.style.top = Math.max(12, Math.min(maxTop, suggestedTop)) + 'px';
      selectionBtn.style.display = 'inline-flex';
    }

    function openSelectionMenuForNote(note, anchorRect) {
      if (!note || !selectionApplyBtn) return;
      selectionMenuNoteId = note.id;
      selectionRange = null;
      setEditorColor(note.color || DEFAULT_NOTE_COLOR);
      selectionApplyBtn.textContent = 'L\u00f6schen';
      selectionApplyBtn.setAttribute('aria-label', 'Markierung entfernen');
      positionSelectionMenu(anchorRect);
    }

    function setEditorColor(color) {
      selectedEditorColor = normalizeNoteColor(color || DEFAULT_NOTE_COLOR);
      editor.setAttribute('data-note-color', selectedEditorColor);
      selectionColorButtons.forEach(function (btn) {
        var isActive = btn.getAttribute('data-note-color') === selectedEditorColor;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
      editorColorButtons.forEach(function (btn) {
        var isActive = btn.getAttribute('data-note-color') === selectedEditorColor;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    }

    function syncFilterButtons() {
      var filter = normalizeNoteFilter(currentNoteFilter);
      notesFilterButtons.forEach(function (btn) {
        var isActive = btn.getAttribute('data-note-filter') === filter;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    }

    function setActiveNote(noteId) {
      activeNoteId = noteId || null;
      var scope = panelHost || document;
      scope.querySelectorAll('.fom-note-item').forEach(function (item) {
        item.classList.toggle('is-active', item.getAttribute('data-note-id') === activeNoteId);
      });
      root.querySelectorAll('.fom-note-highlight').forEach(function (mark) {
        mark.classList.toggle('is-active', mark.getAttribute('data-note-id') === activeNoteId);
      });
    }

    function unhighlightAll() {
      root.querySelectorAll('.fom-note-highlight').forEach(function (el) {
        var parent = el.parentNode;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      });
    }

    function pointFromOffset(offset) {
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
      var remaining = offset;
      while (walker.nextNode()) {
        var node = walker.currentNode;
        var len = node.textContent.length;
        if (remaining <= len) return { node: node, offset: remaining };
        remaining -= len;
      }
      return null;
    }

    function applyHighlights() {
      unhighlightAll();
      var sorted = notes.slice().sort(function (a, b) { return b.start - a.start; });
      var blockedNoteIds = new Set();

      function bindHighlightInteractions(wrapper, note) {
        wrapper.addEventListener('click', function (event) {
          event.stopPropagation();
          var normalizedColor = normalizeNoteColor(note.color);
          if (normalizeNoteFilter(currentNoteFilter) !== 'alle' && normalizeNoteFilter(currentNoteFilter) !== normalizedColor) {
            currentNoteFilter = normalizedColor;
            saveNoteFilter();
            syncFilterButtons();
            renderPanel();
          }
          setActiveNote(note.id);
          if (!String(note.text || '').trim()) {
            openSelectionMenuForNote(note, wrapper.getBoundingClientRect());
            return;
          }
          var scope = panelHost || document;
          var item = scope.querySelector('.fom-note-item[data-note-id="' + note.id + '"]');
          if (item) item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });

        wrapper.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            wrapper.click();
          }
        });
      }

      function textNodesInRange(range) {
        var nodeRange = document.createRange();
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
        var nodes = [];
        while (walker.nextNode()) {
          var node = walker.currentNode;
          if (!node || !node.textContent || !node.textContent.trim()) continue;
          if (isInsideDisallowedSelectionTarget(node)) continue;
          try {
            if (range.intersectsNode(node)) nodes.push(node);
          } catch (error) {
            nodeRange.selectNodeContents(node);
            var startsBeforeNodeEnds = range.compareBoundaryPoints(Range.START_TO_END, nodeRange) < 0;
            var endsAfterNodeStarts = range.compareBoundaryPoints(Range.END_TO_START, nodeRange) > 0;
            if (startsBeforeNodeEnds && endsAfterNodeStarts) nodes.push(node);
          }
        }
        nodeRange.detach();
        return nodes;
      }

      sorted.forEach(function (note) {
        var start = pointFromOffset(note.start);
        var end = pointFromOffset(note.end);
        if (!start || !end) return;
        if (note.end <= note.start) return;

        var range = document.createRange();
        range.setStart(start.node, start.offset);
        range.setEnd(end.node, end.offset);
        var touched = false;
        var nodes = textNodesInRange(range);
        nodes.forEach(function (node) {
          var subRange = document.createRange();
          var startOffset = node === range.startContainer ? range.startOffset : 0;
          var endOffset = node === range.endContainer ? range.endOffset : node.textContent.length;
          if (endOffset <= startOffset) {
            subRange.detach();
            return;
          }
          subRange.setStart(node, startOffset);
          subRange.setEnd(node, endOffset);

          var wrapper = document.createElement('span');
          wrapper.className = 'fom-note-highlight';
          wrapper.setAttribute('data-note-id', note.id);
          wrapper.setAttribute('data-note-color', normalizeNoteColor(note.color));
          wrapper.setAttribute('title', note.text || 'Notiz');
          wrapper.setAttribute('role', 'button');
          wrapper.setAttribute('tabindex', '0');

          try {
            subRange.surroundContents(wrapper);
            bindHighlightInteractions(wrapper, note);
            touched = true;
          } catch (error) {
            // Ignore unsafe subranges; we keep other safe fragments.
          }
          subRange.detach();
        });
        if (!touched) blockedNoteIds.add(note.id);
        range.detach();
      });
      setActiveNote(activeNoteId);
    }

    function jumpToNote(note) {
      var target = root.querySelector('.fom-note-highlight[data-note-id="' + note.id + '"]');
      if (target) {
        setActiveNote(note.id);
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    function renderPanel() {
      notesList.innerHTML = '';
      var isNotesMode = currentPanelMode === 'notes';
      var filteredNotes = isNotesMode ? filteredCommentNotesInTextOrder() : filteredHighlightNotesInTextOrder();
      var listTarget = notesList;
      if (notesListWrap) notesListWrap.style.display = '';
      if (!filteredNotes.length) {
        notesEmpty.style.display = 'block';
        if (isNotesMode) {
          notesEmpty.textContent = notes.length ? 'Noch keine Notizen in diesem Filter.' : 'Noch keine Notizen.';
        } else {
          notesEmpty.textContent = notes.length ? 'Keine Markierungen in diesem Filter.' : 'Noch keine Markierungen.';
        }
        setActiveNote(null);
        scheduleNoteLayout();
        return;
      }
      notesEmpty.style.display = 'none';

      var orderedNotes = filteredNotes;

      orderedNotes.forEach(function (note) {
        var item = document.createElement('div');
        item.className = 'fom-note-item';
        item.setAttribute('data-note-id', note.id);
        item.setAttribute('data-note-color', normalizeNoteColor(note.color));

        var quoteBtn = document.createElement('button');
        quoteBtn.type = 'button';
        quoteBtn.className = 'fom-note-jump';
        quoteBtn.textContent = '"' + (note.quote || '').slice(0, 120) + '"';

        var text = (note.text || '').trim();
        var textEl = null;
        if (text) {
          textEl = document.createElement('div');
          textEl.className = 'fom-note-text';
          textEl.textContent = text;
        }

        var actions = document.createElement('div');
        actions.className = 'fom-note-actions';

        var editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'fom-note-edit';
        editBtn.setAttribute('aria-label', 'Kommentar hinzuf\u00fcgen oder bearbeiten');
        editBtn.innerHTML =
          '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">' +
          '<path d="M5 6.5h14a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H12l-4.8 3.6a.6.6 0 0 1-1-.48V16.5H5A1.5 1.5 0 0 1 3.5 15V8A1.5 1.5 0 0 1 5 6.5Z"></path>' +
          '<path d="M8 10.5h8"></path><path d="M8 13.5h5.5"></path>' +
          '</svg><span>Notiz</span>';

        var deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'fom-note-delete';
        deleteBtn.textContent = 'L\u00f6schen';

        var highlightOnlyNote = !String(note.text || '').trim();
        if (isNotesMode && highlightOnlyNote) return;

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        item.appendChild(quoteBtn);
        if (isNotesMode && textEl) item.appendChild(textEl);
        item.appendChild(actions);
        if (listTarget) listTarget.appendChild(item);

        quoteBtn.addEventListener('click', function () {
          jumpToNote(note);
        });

        item.addEventListener('click', function (event) {
          if (event.target.closest('button')) return;
          setActiveNote(note.id);
        });

        editBtn.addEventListener('click', function () {
          setActiveNote(note.id);
          openEditor(note.text || '', note.color || DEFAULT_NOTE_COLOR);
          setEditorEditId(note.id);
        });

        deleteBtn.addEventListener('click', function () {
          pushUndoState();
          notes = notes.filter(function (n) { return n.id !== note.id; });
          saveNotes();
          applyHighlights();
          renderPanel();
          syncUndoButton();
        });
      });
      if (!activeNoteId && orderedNotes.length) setActiveNote(orderedNotes[0].id);
      if (activeNoteId && !(listTarget && listTarget.querySelector('.fom-note-item[data-note-id="' + activeNoteId + '"]'))) {
        setActiveNote(orderedNotes.length ? orderedNotes[0].id : null);
      }
      scheduleNoteLayout();
    }

    function rangeOffsets(range) {
      var startRange = range.cloneRange();
      startRange.selectNodeContents(root);
      startRange.setEnd(range.startContainer, range.startOffset);
      var start = startRange.toString().length;

      var endRange = range.cloneRange();
      endRange.selectNodeContents(root);
      endRange.setEnd(range.endContainer, range.endOffset);
      var end = endRange.toString().length;
      return { start: start, end: end };
    }

    function createNoteFromSelection(openCommentEditor) {
      if (!selectionRange) return;
      var quote = selectionRange.toString().replace(/\s+/g, ' ').trim();
      if (!quote) return;
      var offsets = rangeOffsets(selectionRange);
      if (!Number.isFinite(offsets.start) || !Number.isFinite(offsets.end) || offsets.end <= offsets.start) return;

      var noteId = 'note-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
      pushUndoState();
      notes.push({
        id: noteId,
        quote: quote.slice(0, 160),
        text: '',
        color: selectedEditorColor,
        start: offsets.start,
        end: offsets.end,
        createdAt: Date.now()
      });

      saveNotes();
      currentNoteFilter = 'alle';
      saveNoteFilter();
      syncFilterButtons();
      applyHighlights();
      renderPanel();
      setActiveNote(noteId);
      syncUndoButton();
      window.getSelection().removeAllRanges();
      hideSelectionBtn();

      if (openCommentEditor) {
        openEditor('', selectedEditorColor);
        setEditorEditId(noteId);
      }
    }

    var selectionBtn = document.createElement('div');
    selectionBtn.className = 'fom-note-selection-tools';
    selectionBtn.setAttribute('role', 'group');
    selectionBtn.setAttribute('aria-label', 'Markierung erstellen');
    selectionBtn.innerHTML =
      '<div class="fom-note-selection-colors" role="group" aria-label="Markierungsfarbe w\u00e4hlen">' +
      '<button type="button" class="fom-note-select-color is-active" data-note-color="gelb" aria-label="Gelb" aria-pressed="true"></button>' +
      '<button type="button" class="fom-note-select-color" data-note-color="rot" aria-label="Rot" aria-pressed="false"></button>' +
      '<button type="button" class="fom-note-select-color" data-note-color="orange" aria-label="Orange" aria-pressed="false"></button>' +
      '<button type="button" class="fom-note-select-color" data-note-color="lila" aria-label="Lila" aria-pressed="false"></button>' +
      '</div>' +
      '<button type="button" class="fom-note-selection-apply">Markieren</button>' +
      '<button type="button" class="fom-note-selection-comment" aria-label="Kommentar hinterlassen" title="Notiz">' +
      '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">' +
      '<path d="M5 6.5h14a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H12l-4.8 3.6a.6.6 0 0 1-1-.48V16.5H5A1.5 1.5 0 0 1 3.5 15V8A1.5 1.5 0 0 1 5 6.5Z"></path>' +
      '<path d="M8 10.5h8"></path><path d="M8 13.5h5.5"></path>' +
      '</svg>' +
      '</button>' +
      '<button type="button" class="fom-note-selection-ai" aria-label="KI-Funktion" title="KI-Funktion" aria-haspopup="true" aria-expanded="false">' +
      '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">' +
      '<path d="M4.8 19.2l7.2-7.2"></path>' +
      '<path d="M8.2 7.4l1.7 1.7"></path>' +
      '<path d="M5.4 10.2l1.7 1.7"></path>' +
      '<path d="M11.7 4.5l.5 1.6 1.6.5-1.6.5-.5 1.6-.5-1.6-1.6-.5 1.6-.5z"></path>' +
      '<path d="M16.5 10.7l.4 1.2 1.2.4-1.2.4-.4 1.2-.4-1.2-1.2-.4 1.2-.4z"></path>' +
      '<path d="M18.8 4.2l.6 1.9 1.9.6-1.9.6-.6 1.9-.6-1.9-1.9-.6 1.9-.6z"></path>' +
      '</svg>' +
      '</button>' +
      '<div class="fom-note-ai-menu" role="menu" hidden>' +
      '<button type="button" class="fom-note-ai-menu-item" data-ai-action="explain" role="menuitem">Erklärung</button>' +
      '<button type="button" class="fom-note-ai-menu-item" data-ai-action="keywords" role="menuitem">Kernbegriffe</button>' +
      '<button type="button" class="fom-note-ai-menu-item" data-ai-action="example" role="menuitem">Praxisbeispiel</button>' +
      '</div>';
    selectionBtn.style.display = 'none';
    document.body.appendChild(selectionBtn);
    selectionBtn.addEventListener('mousedown', function (event) {
      event.preventDefault();
    });
    selectionColorButtons = Array.prototype.slice.call(selectionBtn.querySelectorAll('.fom-note-select-color'));
    var selectionApplyBtn = selectionBtn.querySelector('.fom-note-selection-apply');
    var selectionCommentBtn = selectionBtn.querySelector('.fom-note-selection-comment');
    var selectionAiBtn = selectionBtn.querySelector('.fom-note-selection-ai');
    var selectionAiMenu = selectionBtn.querySelector('.fom-note-ai-menu');
    var selectionAiMenuItems = selectionBtn.querySelectorAll('.fom-note-ai-menu-item');

    function closeAiSelectionMenu() {
      if (!selectionAiMenu) return;
      selectionAiMenu.hidden = true;
      if (selectionAiBtn) selectionAiBtn.setAttribute('aria-expanded', 'false');
    }

    function toggleAiSelectionMenu() {
      if (!selectionAiMenu) return;
      var shouldOpen = !!selectionAiMenu.hidden;
      selectionAiMenu.hidden = !shouldOpen;
      if (selectionAiBtn) selectionAiBtn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    }

    function getAiSourceText() {
      var sourceText = '';
      if (selectionMenuNoteId) {
        var menuNote = findNoteById(selectionMenuNoteId);
        sourceText = menuNote ? (menuNote.quote || '') : '';
      } else if (selectionRange) {
        sourceText = selectionRange.toString().replace(/\s+/g, ' ').trim();
      }
      return sourceText;
    }

    selectionColorButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        closeAiSelectionMenu();
        var nextColor = btn.getAttribute('data-note-color');
        setEditorColor(nextColor);
        if (selectionMenuNoteId) {
          var selectedNote = findNoteById(selectionMenuNoteId);
          if (!selectedNote) return;
          if (normalizeNoteColor(selectedNote.color) === normalizeNoteColor(nextColor)) return;
          pushUndoState();
          selectedNote.color = normalizeNoteColor(nextColor);
          saveNotes();
          applyHighlights();
          renderPanel();
          setActiveNote(selectionMenuNoteId);
          syncUndoButton();
        }
      });
    });

    if (selectionApplyBtn) {
      selectionApplyBtn.addEventListener('click', function () {
        closeAiSelectionMenu();
        if (selectionMenuNoteId) {
          var noteIdToRemove = selectionMenuNoteId;
          hideSelectionBtn();
          removeNoteById(noteIdToRemove);
          return;
        }
        createNoteFromSelection(false);
      });
    }
    if (selectionCommentBtn) {
      selectionCommentBtn.addEventListener('click', function () {
        closeAiSelectionMenu();
        if (selectionMenuNoteId) {
          var noteForComment = findNoteById(selectionMenuNoteId);
          if (!noteForComment) return;
          setActiveNote(noteForComment.id);
          openEditor(noteForComment.text || '', noteForComment.color || DEFAULT_NOTE_COLOR);
          setEditorEditId(noteForComment.id);
          hideSelectionBtn();
          return;
        }
        createNoteFromSelection(true);
      });
    }
    if (selectionAiBtn) {
      selectionAiBtn.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        toggleAiSelectionMenu();
      });
    }

    Array.prototype.forEach.call(selectionAiMenuItems, function (menuItem) {
      menuItem.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        closeAiSelectionMenu();
        var sourceText = getAiSourceText();
        var action = menuItem.getAttribute('data-ai-action');
        if (action === 'keywords') {
          runAiAction('question', 'Kernbegriffe', sourceText, {
            userQuestion: 'Bitte generiere mir für die markierte Textstelle relevante Kernbegriffe, die mit dem Inhalt der Textstelle in Verbindung stehen.'
          });
          return;
        }
        if (action === 'example') {
          runAiAction('question', 'Praxisbeispiel', sourceText, {
            userQuestion: 'Bitte generiere mir zu dem markierten Text ein passendes Praxisbeispiel, anhand dessen der Inhalt des markierten Textes sinnvoll erläutert wird.'
          });
          return;
        }
        runAiAction('question', 'Erklärung', sourceText, {
          userQuestion: 'Bitte erkläre mir die markierte Textstelle in einfachen Worten.'
        });
      });
    });

    function showAiResponseDialog(title, text) {
      var existing = document.querySelector('.fom-ai-response-overlay');
      if (existing) existing.remove();

      var overlay = document.createElement('div');
      overlay.className = 'fom-ai-response-overlay';
      overlay.innerHTML =
        '<div class="fom-ai-response-dialog" role="dialog" aria-modal="true" aria-label="KI-Antwort">' +
        '<div class="fom-ai-response-head">' +
        '<h3 class="fom-ai-response-title"></h3>' +
        '<button type="button" class="fom-ai-response-close" aria-label="Schlie\u00dfen">&times;</button>' +
        '</div>' +
        '<div class="fom-ai-response-body"></div>' +
        '</div>';
      document.body.appendChild(overlay);

      var titleEl = overlay.querySelector('.fom-ai-response-title');
      var bodyEl = overlay.querySelector('.fom-ai-response-body');
      var closeBtn = overlay.querySelector('.fom-ai-response-close');

      if (titleEl) titleEl.textContent = title || 'KI-Antwort';
      if (bodyEl) bodyEl.textContent = text || 'Keine Antwort erhalten.';

      function close() {
        overlay.remove();
      }

      if (closeBtn) closeBtn.addEventListener('click', close);
      overlay.addEventListener('click', function (event) {
        if (event.target === overlay) close();
      });
    }

    function runAiAction(actionId, actionLabel, sourceText, options) {
      var normalizedText = String(sourceText || '').trim();
      if (!normalizedText) {
        showAiResponseDialog(actionLabel || 'KI-Assistent', 'Bitte markieren Sie zuerst einen Textabschnitt.');
        return;
      }

      var aiOptions = options || {};
      var userQuestion = '';
      if (actionId === 'question') {
        if (aiOptions.userQuestion) {
          userQuestion = String(aiOptions.userQuestion).trim();
        } else {
          userQuestion = window.prompt('Welche Frage soll die KI zu Ihrem markierten Text beantworten?', '') || '';
          userQuestion = userQuestion.trim();
        }
        if (!userQuestion) return;
      }

      showAiResponseDialog(actionLabel || 'KI-Assistent', 'Die KI verarbeitet deine Anfrage ...');

      var aiApiUrl = '/api/ai-assistant';
      if (window.location.protocol === 'file:') {
        aiApiUrl = 'http://127.0.0.1:8080/api/ai-assistant';
      }

      function postAi(url) {
        return fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actionId: actionId,
            actionLabel: actionLabel,
            sourceText: normalizedText,
            userQuestion: userQuestion,
            pagePath: window.location.pathname
          })
        });
      }

      postAi(aiApiUrl).catch(function (error) {
        var canRetryLocalhost = aiApiUrl === '/api/ai-assistant' && window.location.hostname !== '127.0.0.1' && window.location.hostname !== 'localhost';
        if (!canRetryLocalhost) throw error;
        return postAi('http://127.0.0.1:8080/api/ai-assistant');
      }).then(function (response) {
        if (!response.ok) {
          return response.text().then(function (message) {
            throw new Error(message || ('HTTP ' + response.status));
          });
        }
        return response.json();
      })
        .then(function (data) {
          showAiResponseDialog(actionLabel || 'KI-Assistent', (data && data.outputText) ? data.outputText : 'Keine Antwort erhalten.');
        })
        .catch(function (error) {
          var hint = window.location.protocol === 'file:'
            ? ' Bitte \u00f6ffnen Sie die Seite \u00fcber http://127.0.0.1:8080/ statt direkt als Datei.'
            : ' Pr\u00fcfen Sie, ob der lokale KI-Server l\u00e4uft (http://127.0.0.1:8080).';
          showAiResponseDialog(actionLabel || 'KI-Assistent', 'Die KI-Anfrage konnte nicht verarbeitet werden: ' + (error.message || 'Unbekannter Fehler') + hint);
        });
    }

    var panel = document.createElement('aside');
    panel.className = 'fom-notes-panel';
    panel.innerHTML =
      '<div class="fom-notes-head">' +
      '<div class="fom-notes-head-top">' +
      '<div class="fom-notes-title-row">' +
      '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><rect x="5" y="4.8" width="14" height="14.4" rx="2.4"></rect><path d="M8.5 10h7"></path><path d="M8.5 13.5h5"></path></svg>' +
      '<span class="fom-notes-title">Notizen</span>' +
      '</div>' +
      '<button type="button" class="fom-notes-close" aria-label="Notizen schlie\u00dfen">' +
      '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M6 6l12 12"></path><path d="M18 6 6 18"></path></svg>' +
      '</button>' +
      '</div>' +
      '</div>' +
      '<div class="fom-notes-toolbar">' +
      '<div class="fom-notes-tabs" role="tablist" aria-label="Notizansicht">' +
      '<button type="button" class="fom-notes-tab is-active" data-notes-tab="notes" role="tab" aria-selected="true">Notizen</button>' +
      '<button type="button" class="fom-notes-tab" data-notes-tab="highlights" role="tab" aria-selected="false">Markierungen</button>' +
      '</div>' +
      '<div class="fom-notes-toolbar-main">' +
      '<div class="fom-notes-filters" role="group" aria-label="Notizen nach Farbe filtern">' +
      '<button type="button" class="fom-notes-filter fom-notes-filter-all is-color is-active" data-note-filter="alle" aria-label="Alle Farben" title="Alle Farben" aria-pressed="true"><span class="fom-notes-filter-dot" aria-hidden="true"></span></button>' +
      '<button type="button" class="fom-notes-filter is-color" data-note-filter="gelb" aria-label="Gelb" title="Gelb" aria-pressed="false"><span class="fom-notes-filter-dot" aria-hidden="true"></span></button>' +
      '<button type="button" class="fom-notes-filter is-color" data-note-filter="rot" aria-label="Rot" title="Rot" aria-pressed="false"><span class="fom-notes-filter-dot" aria-hidden="true"></span></button>' +
      '<button type="button" class="fom-notes-filter is-color" data-note-filter="orange" aria-label="Orange" title="Orange" aria-pressed="false"><span class="fom-notes-filter-dot" aria-hidden="true"></span></button>' +
      '<button type="button" class="fom-notes-filter is-color" data-note-filter="lila" aria-label="Lila" title="Lila" aria-pressed="false"><span class="fom-notes-filter-dot" aria-hidden="true"></span></button>' +
      '</div>' +
      '<div class="fom-notes-clear-row">' +
      '<button type="button" class="fom-notes-undo" aria-label="L\u00f6schen r\u00fcckg\u00e4ngig">' +
      '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M9 7H4v5"></path><path d="M4 12a8 8 0 1 0 2.34-5.66L4 7"></path></svg>' +
      '</button>' +
      '<button type="button" class="fom-notes-clear">Alle l&ouml;schen</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="fom-notes-empty">Noch keine Notizen.</div>';
    var panelHost = document.querySelector('.course-main') || document.body;
    panelHost.appendChild(panel);

    // Notes list as separate absolute-positioned element in course-main
    var notesListWrap = document.createElement('div');
    notesListWrap.className = 'fom-notes-list-wrap';
    var notesList = document.createElement('div');
    notesList.className = 'fom-notes-list';
    notesListWrap.appendChild(notesList);
    panelHost.appendChild(notesListWrap);

    panel.setAttribute('aria-hidden', 'false');
    document.dispatchEvent(new CustomEvent('notes:panel-state', { detail: { open: true } }));
    var notesTitle = panel.querySelector('.fom-notes-title');
    var notesEmpty = panel.querySelector('.fom-notes-empty');
    var undoBtn = panel.querySelector('.fom-notes-undo');
    var clearBtn = panel.querySelector('.fom-notes-clear');
    var closeBtn = panel.querySelector('.fom-notes-close');
    var notesTabButtons = Array.prototype.slice.call(panel.querySelectorAll('.fom-notes-tab'));
    var notesFilterButtons = Array.prototype.slice.call(panel.querySelectorAll('.fom-notes-filter'));

    function syncPanelModeButtons() {
      notesTabButtons.forEach(function (btn) {
        var mode = normalizePanelMode(btn.getAttribute('data-notes-tab') || 'notes');
        var isActive = mode === currentPanelMode;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      if (notesTitle) {
        notesTitle.textContent = currentPanelMode === 'highlights' ? 'Markierungen' : 'Notizen';
      }
      if (clearBtn) {
        var clearText = 'Alle l\u00f6schen';
        clearBtn.textContent = clearText;
        clearBtn.setAttribute('aria-label', clearText);
      }
    }

    function syncUndoButton() {
      if (!undoBtn) return;
      var canUndo = Array.isArray(notesUndoStack) && notesUndoStack.length > 0;
      undoBtn.disabled = !canUndo;
      undoBtn.setAttribute('aria-label', canUndo ? 'Letzte Aktion r\u00fcckg\u00e4ngig' : 'Keine Aktion zum R\u00fcckg\u00e4ngig machen');
    }

    notesFilterButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        currentNoteFilter = normalizeNoteFilter(btn.getAttribute('data-note-filter') || 'alle');
        saveNoteFilter();
        syncFilterButtons();
        renderPanel();
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        panel.classList.add('is-collapsed');
        panel.setAttribute('aria-hidden', 'true');
        notesListWrap.classList.add('is-collapsed');
        document.dispatchEvent(new CustomEvent('notes:panel-state', { detail: { open: false } }));
      });
    }

    notesTabButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var nextMode = normalizePanelMode(btn.getAttribute('data-notes-tab') || 'notes');
        if (nextMode === currentPanelMode) return;
        currentPanelMode = nextMode;
        savePanelMode();
        syncPanelModeButtons();
        renderPanel();
      });
    });

    var editor = document.createElement('div');
    editor.className = 'fom-note-editor';
    editor.innerHTML =
      '<div class="fom-note-editor-card">' +
      '<div class="fom-note-editor-head"><div class="fom-note-editor-title">Notiz</div></div>' +
      '<div class="fom-note-editor-body">' +
      '<div class="fom-note-editor-colors" role="group" aria-label="Markierungsfarbe">' +
      '<button type="button" class="fom-note-editor-color is-active" data-note-color="gelb" aria-label="Gelb" aria-pressed="true"></button>' +
      '<button type="button" class="fom-note-editor-color" data-note-color="rot" aria-label="Rot" aria-pressed="false"></button>' +
      '<button type="button" class="fom-note-editor-color" data-note-color="orange" aria-label="Orange" aria-pressed="false"></button>' +
      '<button type="button" class="fom-note-editor-color" data-note-color="lila" aria-label="Lila" aria-pressed="false"></button>' +
      '</div>' +
      '<textarea class="fom-note-editor-input" maxlength="500" placeholder="Ihre Notiz zum markierten Text..."></textarea>' +
      '<div class="fom-note-editor-foot">' +
      '<span class="fom-note-editor-counter">0/500</span>' +
      '<div class="fom-note-editor-actions">' +
      '<button type="button" class="fom-note-editor-delete">Markierung entfernen</button>' +
      '<button type="button" class="fom-note-editor-cancel">Abbrechen</button>' +
      '<button type="button" class="fom-note-editor-save">Speichern</button>' +
      '</div></div></div></div>';
    document.body.appendChild(editor);
    var editorTextarea = editor.querySelector('.fom-note-editor-input');
    var editorCounter = editor.querySelector('.fom-note-editor-counter');
    var editorDeleteBtn = editor.querySelector('.fom-note-editor-delete');
    var editorCancelBtn = editor.querySelector('.fom-note-editor-cancel');
    var editorSaveBtn = editor.querySelector('.fom-note-editor-save');
    editorColorButtons = Array.prototype.slice.call(editor.querySelectorAll('.fom-note-editor-color'));
    if (editorDeleteBtn) editorDeleteBtn.style.display = 'none';

    editorColorButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        setEditorColor(btn.getAttribute('data-note-color'));
      });
    });

    var DISALLOWED_SELECTION_SELECTOR = [
      'button',
      '.flip-card',
      'svg',
      'i',
      '.material-icons',
      '.icon',
      '[class^="icon-"]',
      '[class*=" icon-"]',
      '.fom-quiz-block',
      '.fom-note-selection-tools',
      '.fom-note-editor',
      '.fom-notes-panel'
    ].join(', ');

    function isInsideDisallowedSelectionTarget(node) {
      var element = node && node.nodeType === 1 ? node : (node && node.parentElement ? node.parentElement : null);
      if (!element) return false;
      return !!element.closest(DISALLOWED_SELECTION_SELECTOR);
    }

    function rangeContainsDisallowedSelectionTarget(range) {
      if (!range) return true;
      if (isInsideDisallowedSelectionTarget(range.startContainer)) return true;
      if (isInsideDisallowedSelectionTarget(range.endContainer)) return true;
      return false;
    }

    function setAiSelectionMode(active) {
      aiSelectionModeActive = !!active;
      document.body.classList.toggle('ai-selection-mode', aiSelectionModeActive);
      if (aiAssistantActionBtn) {
        aiAssistantActionBtn.setAttribute('aria-pressed', aiSelectionModeActive ? 'true' : 'false');
      }
    }

    function isRangeSelectableForHighlight(range) {
      if (!range) return false;
      if (!root.contains(range.commonAncestorContainer)) return false;
      if (rangeContainsDisallowedSelectionTarget(range)) return false;
      if (!range.toString().trim()) return false;
      return true;
    }

    function updateSelectionButtonFromCurrentSelection() {
      if (selectionMenuNoteId && selectionBtn.style.display !== 'none') {
        var selectedMenuNote = findNoteById(selectionMenuNoteId);
        if (selectedMenuNote) return;
        selectionMenuNoteId = '';
      }

      var sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        hideSelectionBtn();
        return;
      }
      if (sel.isCollapsed) {
        hideSelectionBtn();
        return;
      }

      var range = sel.getRangeAt(0);
      if (aiSelectionModeActive && !isRangeSelectableForHighlight(range)) {
        sel.removeAllRanges();
        hideSelectionBtn();
        return;
      }
      if (!root.contains(range.commonAncestorContainer)) {
        hideSelectionBtn();
        return;
      }
      if (rangeContainsDisallowedSelectionTarget(range)) {
        hideSelectionBtn();
        return;
      }
      if (!range.toString().trim()) {
        hideSelectionBtn();
        return;
      }

      selectionMenuNoteId = '';
      if (selectionApplyBtn) {
        selectionApplyBtn.textContent = 'Markieren';
        selectionApplyBtn.setAttribute('aria-label', 'Markierten Text hervorheben');
      }
      selectionRange = range.cloneRange();
      var rects = Array.prototype.slice.call(range.getClientRects());
      var anchorRect = rects.length ? rects[0] : range.getBoundingClientRect();
      if (rects.length > 1) {
        anchorRect = rects.reduce(function (best, current) {
          if (current.bottom > best.bottom) return current;
          if (current.bottom === best.bottom && current.right > best.right) return current;
          return best;
        });
      }
      positionSelectionMenu(anchorRect);
      if (aiSelectionModeActive) setAiSelectionMode(false);
    }

    document.addEventListener('mouseup', function () {
      window.setTimeout(function () {
        updateSelectionButtonFromCurrentSelection();
      }, 0);
    });

    document.addEventListener('selectionchange', function () {
      if (editor.classList.contains('is-open')) return;
      window.setTimeout(updateSelectionButtonFromCurrentSelection, 0);
    });

    document.addEventListener('mousedown', function (event) {
      var target = event.target;
      var targetEl = target && target.nodeType === 1 ? target : (target && target.parentElement ? target.parentElement : null);
      var inSelectionUi = selectionBtn.contains(target) || editor.contains(target);
      if (!inSelectionUi) hideSelectionBtn();
      if (!aiSelectionModeActive) return;
      var clickedInsideTextArea = root.contains(target);
      var clickedAiToggle = !!(
        (aiAssistantActionBtn && aiAssistantActionBtn.contains(target)) ||
        (targetEl && targetEl.closest('.right-tool-btn[data-tool-id="ai-assistant"]'))
      );
      if (clickedInsideTextArea || inSelectionUi || clickedAiToggle) return;
      setAiSelectionMode(false);
      var selection = window.getSelection();
      if (selection) selection.removeAllRanges();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || !aiSelectionModeActive) return;
      setAiSelectionMode(false);
      var selection = window.getSelection();
      if (selection) selection.removeAllRanges();
      hideSelectionBtn();
    });

    if (aiAssistantActionBtn) {
      aiAssistantActionBtn.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        var nextActive = !aiSelectionModeActive;
        setAiSelectionMode(nextActive);
        if (!nextActive) return;
        var selection = window.getSelection();
        if (selection) selection.removeAllRanges();
        hideSelectionBtn();
        var aiToolBtn = document.querySelector('.right-tool-btn[data-tool-id="ai-assistant"]');
        if (aiToolBtn && aiToolBtn.classList.contains('is-active')) aiToolBtn.click();
      });
    }

    document.addEventListener('right-tool:select', function (event) {
      if (!aiSelectionModeActive) return;
      var detail = event && event.detail ? event.detail : {};
      if (!detail.toolId || detail.toolId === 'ai-assistant') return;
      setAiSelectionMode(false);
      var selection = window.getSelection();
      if (selection) selection.removeAllRanges();
      hideSelectionBtn();
    });

    editorTextarea.addEventListener('input', function () {
      editorCounter.textContent = String(editorTextarea.value.length) + '/500';
    });

    editorCancelBtn.addEventListener('click', function () {
      closeEditor();
    });

    if (editorDeleteBtn) {
      editorDeleteBtn.addEventListener('click', function () {
        var editId = editor.getAttribute('data-edit-id') || '';
        if (!editId) return;
        pushUndoState();
        notes = notes.filter(function (note) { return note.id !== editId; });
        saveNotes();
        applyHighlights();
        renderPanel();
        syncUndoButton();
        closeEditor();
        window.getSelection().removeAllRanges();
        hideSelectionBtn();
      });
    }

    editorSaveBtn.addEventListener('click', function () {
      var text = editorTextarea.value.trim();

      var editId = editor.getAttribute('data-edit-id') || '';
      if (!editId) return;
      pushUndoState();
      notes = notes.map(function (note) {
        if (note.id !== editId) return note;
        return {
          id: note.id,
          quote: note.quote,
          text: text,
          color: selectedEditorColor,
          start: note.start,
          end: note.end,
          createdAt: note.createdAt
        };
      });

      saveNotes();
      applyHighlights();
      renderPanel();
      syncUndoButton();
      closeEditor();
      window.getSelection().removeAllRanges();
      hideSelectionBtn();
    });

    function performClearAll() {
      var removed = [];
      var remaining = [];
      if (currentPanelMode === 'highlights') {
        removed = notes.filter(function (note) { return !String(note.text || '').trim(); });
        remaining = notes.filter(function (note) { return !!String(note.text || '').trim(); });
      } else {
        removed = notes.filter(function (note) { return !!String(note.text || '').trim(); });
        remaining = notes.filter(function (note) { return !String(note.text || '').trim(); });
      }
      if (!removed.length) return;
      pushUndoState();
      notes = remaining;
      saveNotes();
      applyHighlights();
      renderPanel();
      syncUndoButton();
    }

    function showClearConfirmDialog() {
      var existing = document.querySelector('.fom-confirm-overlay');
      if (existing) existing.remove();

      var modeText = currentPanelMode === 'highlights' ? 'alle Markierungen' : 'alle Notizen';
      var overlay = document.createElement('div');
      overlay.className = 'fom-confirm-overlay';
      overlay.innerHTML =
        '<div class="fom-confirm-dialog" role="dialog" aria-modal="true" aria-label="L\u00f6schung best\u00e4tigen">' +
        '<div class="fom-confirm-head">L\u00f6schung best\u00e4tigen</div>' +
        '<div class="fom-confirm-body">M\u00f6chtest du ' + modeText + ' wirklich l\u00f6schen?</div>' +
        '<div class="fom-confirm-actions">' +
        '<button type="button" class="fom-confirm-cancel">Abbrechen</button>' +
        '<button type="button" class="fom-confirm-accept">L\u00f6schung best\u00e4tigen</button>' +
        '</div>' +
        '</div>';
      document.body.appendChild(overlay);

      var cancelBtn = overlay.querySelector('.fom-confirm-cancel');
      var acceptBtn = overlay.querySelector('.fom-confirm-accept');

      function close() {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }

      if (cancelBtn) cancelBtn.addEventListener('click', close);
      if (acceptBtn) {
        acceptBtn.addEventListener('click', function () {
          performClearAll();
          close();
        });
      }

      overlay.addEventListener('click', function (event) {
        if (event.target === overlay) close();
      });
    }

    clearBtn.addEventListener('click', function () {
      showClearConfirmDialog();
    });

    if (undoBtn) {
      undoBtn.addEventListener('click', function () {
        if (!notesUndoStack.length) return;
        notes = cloneNotesList(notesUndoStack.pop());
        saveNotes();
        applyHighlights();
        renderPanel();
        syncUndoButton();
      });
    }

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeEditor();
        hideSelectionBtn();
      }
    });

    readNotes();
    readNoteFilter();
    readPanelMode();
    syncFilterButtons();
    syncPanelModeButtons();
    syncUndoButton();
    applyHighlights();
    renderPanel();
    window.addEventListener('resize', scheduleNoteLayout);
    window.addEventListener('scroll', scheduleNoteLayout, { passive: true });
    root.addEventListener('toggle', function (event) {
      if (event.target && event.target.matches && event.target.matches('details.fom-collapse')) {
        scheduleNoteLayout();
      }
    }, true);
    window.__fomTextNotesInitialized = true;
  }

  function setupQuizEvaluation() {
    function isFinalQuizBlock(quizBlock) {
      if (!quizBlock) return false;
      if (quizBlock.dataset && quizBlock.dataset.quizType === 'final') return true;
      var title = quizBlock.querySelector('.fom-quiz-title');
      var titleText = title ? (title.textContent || '').trim().toLowerCase() : '';
      return titleText === 'abschlusstest';
    }

    function ensureQuizResultNode(quizBlock) {
      if (!quizBlock) return null;
      var form = quizBlock.querySelector('.fom-quiz-form');
      var result = quizBlock.querySelector('.fom-quiz-result');
      if (!result && form) {
        result = document.createElement('div');
        result.className = 'fom-quiz-result';
        result.setAttribute('aria-live', 'polite');
        form.appendChild(result);
      }
      if (result && form && result.parentNode === form && form.lastElementChild !== result) {
        form.appendChild(result);
      }
      return result;
    }

    function getFinalQuizResultMeta(percentValue) {
      if (percentValue >= 80) {
        return {
          level: 'high',
          badge: 'Sehr gut',
          feedback: 'Super gemacht! Du hast die Inhalte dieser Lerneinheit sehr gut verstanden, das merkt man! Weiter geht\'s mit der nächsten Lerneinheit!'
        };
      }
      if (percentValue >= 55) {
        return {
          level: 'mid',
          badge: 'Weiter üben',
          feedback: 'Gute Grundlage! Du hast die meisten Inhalte dieser Lerneinheit gut erfasst. Schau dir die Themen, bei denen du noch unsicher bist, am besten noch einmal an. Wiederhole danach den Abschlusstest, um dein Wissen zu festigen, und starte anschließend sicher und gut vorbereitet in die nächste Lerneinheit.'
        };
      }
      return {
        level: 'low',
        badge: 'Weiter üben',
        feedback: 'Du schaffst das! Das war ein guter Anfang. Arbeite die Inhalte dieser Lerneinheit am besten noch einmal in Ruhe durch. Starte danach einen neuen Versuch im Abschlusstest und gehe dann gut vorbereitet an die Fragen heran. Du wirst sie sicher meistern!'
      };
    }

    function renderFinalQuizResult(resultNode, correctCount, totalCount) {
      if (!resultNode) return;
      var percentValue = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
      var meta = getFinalQuizResultMeta(percentValue);
      resultNode.className = 'fom-quiz-result fom-quiz-result-panel is-' + meta.level;
      resultNode.innerHTML =
        '<div class="fom-quiz-result-top">' +
          '<p class="fom-quiz-result-summary">Ergebnis: ' + correctCount + ' von ' + totalCount + ' richtig beantwortet.</p>' +
          '<span class="fom-quiz-result-badge">' + meta.badge + '</span>' +
        '</div>' +
        '<div class="fom-quiz-result-progress" role="img" aria-label="Ergebnis in Prozent: ' + percentValue + '%">' +
          '<span class="fom-quiz-result-progress-fill" style="width: ' + percentValue + '%;"></span>' +
        '</div>' +
        '<p class="fom-quiz-result-feedback">' + meta.feedback + '</p>';
    }

    function revealQuizResult(resultNode) {
      if (!resultNode || !resultNode.scrollIntoView) return;
      window.requestAnimationFrame(function () {
        var rect = resultNode.getBoundingClientRect();
        var isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
        if (!isVisible) {
          resultNode.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    function scrollToQuizStart(quizBlock) {
      if (!quizBlock) return;
      var anchor = document.getElementById('sec-abschlusstest');
      var target = anchor || quizBlock;

      function getScrollableAncestors(node) {
        var ancestors = [];
        var current = node ? node.parentElement : null;
        while (current && current !== document.body) {
          var style = window.getComputedStyle(current);
          var canScrollY =
            (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
            current.scrollHeight > current.clientHeight;
          if (canScrollY) ancestors.push(current);
          current = current.parentElement;
        }
        return ancestors;
      }

      function scrollInContainer(container, element) {
        if (!container || !element) return;
        var containerRect = container.getBoundingClientRect();
        var elementRect = element.getBoundingClientRect();
        var targetTop = container.scrollTop + (elementRect.top - containerRect.top) - 12;
        container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
      }

      window.requestAnimationFrame(function () {
        var scrollParents = getScrollableAncestors(target);
        if (scrollParents.length) {
          scrollParents.forEach(function (container) {
            scrollInContainer(container, target);
          });
        }

        if (target.scrollIntoView) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        var topOffset = target.getBoundingClientRect().top + window.scrollY - 12;
        window.scrollTo({ top: Math.max(0, topOffset), behavior: 'smooth' });
      });
    }

    function ensureQuizControls(quizBlock) {
      var submitBtn = quizBlock.querySelector('.fom-quiz-submit');
      if (!submitBtn) return;

      var actions = quizBlock.querySelector('.fom-quiz-actions');
      if (!actions) {
        actions = document.createElement('div');
        actions.className = 'fom-quiz-actions';
        submitBtn.parentNode.insertBefore(actions, submitBtn);
      }
      if (!actions.contains(submitBtn)) actions.appendChild(submitBtn);

      var resetBtn = actions.querySelector('.fom-quiz-reset');
      if (!resetBtn) {
        resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'fom-quiz-reset';
        resetBtn.textContent = 'Neuer Versuch';
        actions.appendChild(resetBtn);
      }
    }

    function clearQuestionFeedback(question) {
      question.classList.remove('is-correct', 'is-wrong');
      question.querySelectorAll('label').forEach(function (label) {
        label.classList.remove('fom-quiz-option-correct', 'fom-quiz-option-selected-correct', 'fom-quiz-option-selected-wrong');
      });
      var feedbackBox = question.querySelector('.fom-quiz-feedback-box');
      if (feedbackBox) feedbackBox.remove();
    }

    function readQuestionFeedbackText(question, isCorrect) {
      var stateKey = isCorrect ? 'feedbackCorrect' : 'feedbackWrong';
      var fallbackKey = 'feedback';
      var fromDataset = question.dataset && (question.dataset[stateKey] || question.dataset[fallbackKey]);
      if (fromDataset) return fromDataset;

      var selector = isCorrect ? '.fom-quiz-feedback-correct' : '.fom-quiz-feedback-wrong';
      var node = question.querySelector(selector) || question.querySelector('.fom-quiz-feedback-default');
      if (node) {
        var nodeText = (node.textContent || '').trim();
        if (nodeText) return nodeText;
      }
      return isCorrect
        ? 'Richtig beantwortet. Dieser Hinweistext kann vom Seitenpfleger je Frage individuell hinterlegt werden.'
        : 'Noch nicht korrekt beantwortet. Dieser Hinweistext kann vom Seitenpfleger je Frage individuell hinterlegt werden.';
    }

    function renderQuestionFeedback(question, isCorrect) {
      var text = readQuestionFeedbackText(question, isCorrect);
      if (!text) return;
      var feedbackBox = document.createElement('div');
      feedbackBox.className = 'fom-quiz-feedback-box ' + (isCorrect ? 'is-correct' : 'is-wrong');
      feedbackBox.textContent = text;
      question.appendChild(feedbackBox);
    }

    function evaluateSingleQuestion(question) {
      var selected = question.querySelector("input[type='radio']:checked");
      var answered = !!selected;
      var isCorrect = !!(selected && selected.dataset.correct === 'true');
      if (answered) {
        question.querySelectorAll("input[type='radio']").forEach(function (input) {
          var label = input.closest('label');
          if (!label) return;
          var inputIsCorrect = input.dataset.correct === 'true';
          if (inputIsCorrect) label.classList.add('fom-quiz-option-correct');
          if (input.checked && inputIsCorrect) label.classList.add('fom-quiz-option-selected-correct');
          if (input.checked && !inputIsCorrect) label.classList.add('fom-quiz-option-selected-wrong');
        });
      }
      if (answered) question.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
      return { answered: answered, isCorrect: isCorrect };
    }

    function evaluateMultiQuestion(question) {
      var inputs = Array.prototype.slice.call(question.querySelectorAll("input[type='checkbox']"));
      var selected = inputs.filter(function (input) { return input.checked; });
      var answered = selected.length > 0;
      var correct = inputs.filter(function (input) { return input.dataset.correct === 'true'; });
      var isCorrect =
        selected.length === correct.length &&
        selected.every(function (input) { return input.dataset.correct === 'true'; });

      if (answered) {
        inputs.forEach(function (input) {
          var label = input.closest('label');
          if (!label) return;
          var inputIsCorrect = input.dataset.correct === 'true';
          if (inputIsCorrect) label.classList.add('fom-quiz-option-correct');
          if (input.checked && inputIsCorrect) label.classList.add('fom-quiz-option-selected-correct');
          if (input.checked && !inputIsCorrect) label.classList.add('fom-quiz-option-selected-wrong');
        });
      }
      if (answered) question.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
      return { answered: answered, isCorrect: isCorrect };
    }

    document.querySelectorAll('.fom-quiz-block').forEach(ensureQuizControls);

    document.addEventListener('click', function (event) {
      var resetBtn = event.target.closest('.fom-quiz-reset');
      if (resetBtn) {
        var resetQuizBlock = resetBtn.closest('.fom-quiz-block');
        if (!resetQuizBlock) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        resetQuizBlock.querySelectorAll('.fom-quiz-question').forEach(function (question) {
          clearQuestionFeedback(question);
          question.querySelectorAll("input[type='radio'], input[type='checkbox']").forEach(function (input) {
            input.checked = false;
          });
        });

        var resetResult = resetQuizBlock.querySelector('.fom-quiz-result');
        if (resetResult) {
          resetResult.className = 'fom-quiz-result';
          resetResult.textContent = '';
        }
        if (isFinalQuizBlock(resetQuizBlock)) {
          scrollToQuizStart(resetQuizBlock);
        }
        return;
      }

      var submitBtn = event.target.closest('.fom-quiz-submit');
      if (!submitBtn) return;
      var quizBlock = submitBtn.closest('.fom-quiz-block');
      if (!quizBlock) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      var questions = Array.prototype.slice.call(quizBlock.querySelectorAll('.fom-quiz-question'));
      var isFinalQuiz = isFinalQuizBlock(quizBlock);
      var correctCount = 0;

      questions.forEach(function (question) {
        clearQuestionFeedback(question);
        var evaluation = { answered: false, isCorrect: false };
        if (question.classList.contains('question-single')) {
          evaluation = evaluateSingleQuestion(question);
        } else if (question.classList.contains('question-multi')) {
          evaluation = evaluateMultiQuestion(question);
        }
        if (evaluation.isCorrect) correctCount += 1;
        if (isFinalQuiz) renderQuestionFeedback(question, evaluation.answered && evaluation.isCorrect);
        if (!isFinalQuiz && evaluation.answered) renderQuestionFeedback(question, evaluation.isCorrect);
      });

      var result = ensureQuizResultNode(quizBlock);
      if (!result) return;

      if (isFinalQuiz) {
        renderFinalQuizResult(result, correctCount, questions.length);
        revealQuizResult(result);
        return;
      }

      result.className = 'fom-quiz-result';
      result.textContent = 'Ergebnis: ' + correctCount + ' von ' + questions.length + ' richtig beantwortet.';
      revealQuizResult(result);
    }, true);
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Avoid browser restoring previous scroll position (e.g., when navigating back/forward).
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    // Remove any hash from URL to prevent auto-scrolling to anchors.
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    // Start at top once, but do not keep forcing scroll position.
    function resetScrollTopOnce() {
      window.scrollTo(0, 0);
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }

    resetScrollTopOnce();
    window.addEventListener('load', function () {
      window.setTimeout(resetScrollTopOnce, 0);
    });
    // Some embedded players may steal focus right after load and pull the viewport down.
    // Guard only during initial load and never after the user starts interacting.
    var initialVideoFocusGuardActive = true;
    var userInteracted = false;
    var initialGuardTimeout = null;

    function disableInitialVideoFocusGuard() {
      initialVideoFocusGuardActive = false;
      if (initialGuardTimeout) {
        window.clearTimeout(initialGuardTimeout);
        initialGuardTimeout = null;
      }
    }

    function markUserInteracted() {
      userInteracted = true;
      disableInitialVideoFocusGuard();
    }

    function isVideoEmbedElement(el) {
      if (!el) return false;
      if (el.tagName === 'IFRAME') {
        return !!(el.closest && el.closest('.fom-video-embed'));
      }
      return !!(el.closest && el.closest('.fom-video-embed'));
    }

    function keepTopIfVideoAutofocused() {
      if (!initialVideoFocusGuardActive || userInteracted) return;
      var active = document.activeElement;
      if (!isVideoEmbedElement(active)) return;
      resetScrollTopOnce();
    }

    document.addEventListener('focusin', function () {
      window.setTimeout(keepTopIfVideoAutofocused, 0);
    }, true);

    window.addEventListener('scroll', function () {
      window.requestAnimationFrame(keepTopIfVideoAutofocused);
    }, { passive: true });

    ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (eventName) {
      window.addEventListener(eventName, markUserInteracted, { passive: true, once: true });
    });

    initialGuardTimeout = window.setTimeout(disableInitialVideoFocusGuard, 2200);

    var tocItems = Array.prototype.slice.call(document.querySelectorAll('#tocList .toc-item'));
    setupCampusProfileMenu();
    setupMainHeaderMenus();
    setupRightToolsRail();
    initInlineTocCollapsedByDefault();
    setupAnimatedCollapsibles();
    setupTextNotes();
    setupQuizEvaluation();
    setupMerkmalTableReveal();
    initUnitBodyScrollFade();
    if (!tocItems.length) return;
    var body = document.body;
    var toc = document.querySelector('.toc');
    var tocHeader = toc ? toc.querySelector('.toc-header') : null;
    var overallProgressUi = ensureOverallProgressMarkup(tocHeader);

    function setTocCollapsed(collapsed) {
      body.classList.toggle('toc-is-collapsed', collapsed);
      var toggleBtn = document.querySelector('.toc-toggle-btn');
      var toggleIcon = toggleBtn ? toggleBtn.querySelector('.toc-toggle-icon') : null;
      if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', String(!collapsed));
        toggleBtn.setAttribute('aria-label', collapsed ? 'Navigation ausklappen' : 'Navigation einklappen');
      }
      if (toggleIcon) toggleIcon.textContent = collapsed ? '\u203A' : '\u2039';

      try {
        window.localStorage.setItem(TOC_COLLAPSE_KEY, collapsed ? '1' : '0');
      } catch (error) {
        // Ignore storage failures.
      }
    }

    if (tocHeader && !tocHeader.querySelector('.toc-toggle-btn')) {
      var tocToggleBtn = document.createElement('button');
      tocToggleBtn.type = 'button';
      tocToggleBtn.className = 'toc-toggle-btn';
      tocToggleBtn.innerHTML = '<span class="toc-toggle-icon" aria-hidden="true">\u2039</span>';
      tocHeader.appendChild(tocToggleBtn);

      tocToggleBtn.addEventListener('click', function () {
        setTocCollapsed(!body.classList.contains('toc-is-collapsed'));
      });
    }

    try {
      var storedCollapsed = window.localStorage.getItem(TOC_COLLAPSE_KEY) === '1';
      setTocCollapsed(storedCollapsed);
    } catch (error) {
      setTocCollapsed(body.classList.contains('toc-is-collapsed'));
    }

    var state = readState();
    var tocMap = {};

    tocItems.forEach(function (item) {
      var unit = unitFromHref(item.getAttribute('href') || '');
      if (!unit) return;

      var ui = ensureProgressMarkup(item);
      ui.item = item;
      tocMap[unit] = ui;
      getUnitState(state, unit);
    });

    // Clicking the current unit in left navigation should jump to page start.
    var currentPath = String(window.location.pathname || '').replace(/\\/g, '/');
    tocItems.forEach(function (item) {
      item.addEventListener('click', function (event) {
        var href = item.getAttribute('href') || '';
        if (!href || href.charAt(0) === '#') return;
        var targetUrl;
        try {
          targetUrl = new URL(href, window.location.href);
        } catch (error) {
          return;
        }
        var targetPath = String(targetUrl.pathname || '').replace(/\\/g, '/');
        if (targetPath !== currentPath) return;

        event.preventDefault();
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        var root = document.documentElement;
        var previousBehavior = root && root.style ? root.style.scrollBehavior : '';
        if (root && root.style) root.style.scrollBehavior = 'auto';
        window.scrollTo(0, 0);
        if (root && root.style) root.style.scrollBehavior = previousBehavior;
      });
    });

    var checkboxes = Array.prototype.slice.call(
      document.querySelectorAll('.fom-chapter-complete-checkbox[data-progress-unit][data-progress-id]')
    );

    function ensureConfettiLayer() {
      var layer = document.querySelector('.fom-confetti-layer');
      if (layer) return layer;
      layer = document.createElement('div');
      layer.className = 'fom-confetti-layer';
      layer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(layer);
      return layer;
    }

    function spawnConfettiBurst(strong) {
      var layer = ensureConfettiLayer();
      var palette = ['#9bfff3', '#66ebdb', '#36c9bb', '#20a99a', '#158477'];
      var count = strong ? 160 : 90;

      for (var i = 0; i < count; i += 1) {
        var piece = document.createElement('span');
        piece.className = 'fom-confetti' + (strong ? ' fom-confetti-strong' : '');
        var shapeRoll = Math.random();
        var sizeBase = (strong ? 7 : 5) + Math.random() * (strong ? 9 : 7);
        var width = sizeBase;
        var height = (strong ? 12 : 9) + Math.random() * (strong ? 20 : 15);
        var radius = '24%';
        if (shapeRoll < 0.28) {
          // Round flakes
          width = sizeBase * (0.88 + Math.random() * 0.32);
          height = width * (0.88 + Math.random() * 0.22);
          radius = '50%';
        } else if (shapeRoll < 0.58) {
          // Rounded paper pieces
          radius = (28 + Math.random() * 26).toFixed(1) + '%';
        } else {
          // Slim streamers
          width = Math.max(3.2, sizeBase * 0.56);
          height = height * (1.08 + Math.random() * 0.5);
          radius = (14 + Math.random() * 16).toFixed(1) + '%';
        }

        piece.style.setProperty('--left', (Math.random() * 100) + 'vw');
        piece.style.setProperty('--size', width.toFixed(2) + 'px');
        piece.style.setProperty('--height', height.toFixed(2) + 'px');
        piece.style.setProperty('--radius', radius);
        piece.style.setProperty('--color', palette[Math.floor(Math.random() * palette.length)]);
        piece.style.setProperty('--drift', (-70 + Math.random() * 140) + 'px');
        piece.style.setProperty('--fall-duration', (strong ? 2600 : 2200) + Math.random() * (strong ? 2000 : 1800) + 'ms');
        piece.style.setProperty('--sway-duration', (strong ? 1000 : 900) + Math.random() * (strong ? 1000 : 900) + 'ms');
        piece.style.setProperty('--flip-duration', (strong ? 780 : 700) + Math.random() * (strong ? 800 : 700) + 'ms');
        piece.style.setProperty('--tilt', (-32 + Math.random() * 64).toFixed(2) + 'deg');
        piece.style.animationDelay = (Math.random() * 260) + 'ms';
        layer.appendChild(piece);

        window.setTimeout(function (el) {
          if (el && el.parentNode) el.parentNode.removeChild(el);
        }, 4500, piece);
      }
    }

    function ensureUnitCompleteBanner() {
      var banner = document.querySelector('.fom-unit-complete-banner');
      if (banner) return banner;
      banner = document.createElement('div');
      banner.className = 'fom-unit-complete-banner';
      banner.setAttribute('role', 'status');
      banner.setAttribute('aria-live', 'polite');
      banner.innerHTML =
        '<span class="fom-unit-complete-banner-check-box" aria-hidden="true">' +
          '<span class="fom-unit-complete-banner-check-mark"></span>' +
        '</span>' +
        '<span class="fom-unit-complete-banner-text"></span>';
      document.body.appendChild(banner);
      return banner;
    }

    function showUnitCompleteBanner(message) {
      var banner = ensureUnitCompleteBanner();
      var textEl = banner.querySelector('.fom-unit-complete-banner-text');
      if (textEl) textEl.textContent = message || 'Lerneinheit erfolgreich abgeschlossen';
      banner.classList.remove('is-visible', 'is-exit');
      // Restart animation reliably on repeated completions.
      banner.getBoundingClientRect();
      banner.classList.add('is-visible');
      window.clearTimeout(showUnitCompleteBanner._exitTimerId);
      window.clearTimeout(showUnitCompleteBanner._hideTimerId);
      showUnitCompleteBanner._exitTimerId = window.setTimeout(function () {
        banner.classList.add('is-exit');
      }, 2450);
      showUnitCompleteBanner._hideTimerId = window.setTimeout(function () {
        banner.classList.remove('is-visible', 'is-exit');
      }, 3000);
    }

    function celebrateUnitCompletion() {
      spawnConfettiBurst(true);
      showUnitCompleteBanner('Lerneinheit erfolgreich abgeschlossen');
    }

    if (checkboxes.length) {
      var byUnit = {};

      checkboxes.forEach(function (checkbox) {
        var unit = padUnit(checkbox.getAttribute('data-progress-unit') || '');
        var id = (checkbox.getAttribute('data-progress-id') || '').trim();
        if (!unit || !id) return;

        if (!byUnit[unit]) byUnit[unit] = [];
        byUnit[unit].push({ element: checkbox, id: id });
      });

      Object.keys(byUnit).forEach(function (unit) {
        var unitState = getUnitState(state, unit);
        var ids = byUnit[unit].map(function (entry) { return entry.id; });
        var uniqueIds = Array.from(new Set(ids));

        if (uniqueIds.length > unitState.total) unitState.total = uniqueIds.length;

        byUnit[unit].forEach(function (entry) {
          entry.element.checked = unitState.completedIds.indexOf(entry.id) !== -1;

          entry.element.addEventListener('change', function () {
            var current = getUnitState(state, unit);
            var wasComplete = current.total > 0 && current.completedIds.length >= current.total;
            var set = new Set(current.completedIds);

            if (entry.element.checked) set.add(entry.id);
            else set.delete(entry.id);

            current.completedIds = Array.from(set);
            if (uniqueIds.length > current.total) current.total = uniqueIds.length;
            var isComplete = current.total > 0 && current.completedIds.length >= current.total;

            saveState(state);
            renderProgress(tocMap, state, overallProgressUi);
            if (entry.element.checked && isComplete && !wasComplete) celebrateUnitCompletion();
            else if (entry.element.checked) spawnConfettiBurst(false);
          });
        });
      });

      saveState(state);
    }

    renderProgress(tocMap, state, overallProgressUi);

    var carousels = Array.prototype.slice.call(document.querySelectorAll('.fom-process-carousel'));
    if (carousels.length) {
      carousels.forEach(function (carousel) {
        var slides = Array.prototype.slice.call(carousel.querySelectorAll('.fom-process-slide'));
        if (!slides.length) return;
        var progress = carousel.querySelector('.fom-process-carousel-progress');
        if (!progress) {
          progress = document.createElement('div');
          progress.className = 'fom-process-carousel-progress';
          progress.setAttribute('aria-live', 'polite');
          carousel.appendChild(progress);
        }

        function setActiveSlide(index) {
          var nextIndex = index;
          if (nextIndex < 0) nextIndex = slides.length - 1;
          if (nextIndex >= slides.length) nextIndex = 0;

          slides.forEach(function (slide, slideIndex) {
            var isActive = slideIndex === nextIndex;
            slide.classList.toggle('is-active', isActive);
            slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
          });

          carousel.setAttribute('data-carousel-index', String(nextIndex));
          if (progress) progress.textContent = (nextIndex + 1) + '/' + slides.length;
        }

        var initialIndex = Number.parseInt(carousel.getAttribute('data-carousel-index') || '0', 10);
        if (!Number.isFinite(initialIndex)) initialIndex = 0;
        setActiveSlide(initialIndex);

        carousel.addEventListener('click', function (event) {
          var button = event.target.closest('.fom-process-carousel-btn');
          if (!button || !carousel.contains(button)) return;

          var direction = button.getAttribute('data-direction');
          var currentIndex = Number.parseInt(carousel.getAttribute('data-carousel-index') || '0', 10);
          if (!Number.isFinite(currentIndex)) currentIndex = 0;

          var delta = direction === 'prev' ? -1 : 1;
          setActiveSlide(currentIndex + delta);
        });
      });
    }

    function initTypewriterQuotes() {
      var quotes = Array.prototype.slice.call(
        document.querySelectorAll('.module-title-sheet-quote[data-typewriter]')
      );
      if (!quotes.length) return;

      var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      function escapeHtml(text) {
        return String(text || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      }

      function setTypewriterText(element, text, breakIndex) {
        if (Number.isFinite(breakIndex) && breakIndex > 0 && text.length > breakIndex) {
          element.innerHTML = escapeHtml(text.slice(0, breakIndex)) + '<br>' + escapeHtml(text.slice(breakIndex));
          return;
        }
        element.textContent = text;
      }

      function getStableHeight(element, finalText, breakIndex) {
        var clone = element.cloneNode(false);
        clone.removeAttribute('data-typewriter');
        clone.style.position = 'absolute';
        clone.style.visibility = 'hidden';
        clone.style.pointerEvents = 'none';
        clone.style.left = '-9999px';
        clone.style.top = '0';
        clone.style.width = element.getBoundingClientRect().width + 'px';
        setTypewriterText(clone, finalText, breakIndex);
        document.body.appendChild(clone);
        var h = clone.getBoundingClientRect().height;
        if (clone.parentNode) clone.parentNode.removeChild(clone);
        return h;
      }

      quotes.forEach(function (quoteEl) {
        if (quoteEl.getAttribute('data-typewriter-done') === 'true') return;
        var finalText = (quoteEl.textContent || '').replace(/\s+/g, ' ').trim();
        if (!finalText) return;
        var breakAfterText = (quoteEl.getAttribute('data-typewriter-break-after') || '').trim();
        var breakIndex = -1;
        if (breakAfterText) {
          var breakPosition = finalText.indexOf(breakAfterText);
          if (breakPosition >= 0) breakIndex = breakPosition + breakAfterText.length;
        }
        var finalHeight = Math.ceil(getStableHeight(quoteEl, finalText, breakIndex));
        var oneLineHeight = Math.ceil(getStableHeight(quoteEl, 'A', -1));
        var currentMinHeight = Math.min(finalHeight, Math.max(0, oneLineHeight));
        quoteEl.style.minHeight = currentMinHeight + 'px';

        if (prefersReducedMotion) {
          setTypewriterText(quoteEl, finalText, breakIndex);
          quoteEl.style.minHeight = finalHeight + 'px';
          quoteEl.setAttribute('data-typewriter-done', 'true');
          quoteEl.classList.add('is-typewriter-done');
          return;
        }

        var delay = Number.parseInt(quoteEl.getAttribute('data-typewriter-delay') || '34', 10);
        if (!Number.isFinite(delay) || delay < 12) delay = 34;

        quoteEl.textContent = '';
        quoteEl.classList.add('is-typewriter-running');

        var index = 0;
        function tick() {
          var typedText = finalText.slice(0, index);
          setTypewriterText(quoteEl, typedText, breakIndex);
          if (index > 0) {
            var typedHeight = Math.ceil(getStableHeight(quoteEl, typedText, breakIndex));
            if (typedHeight > currentMinHeight) {
              currentMinHeight = Math.min(finalHeight, typedHeight);
              quoteEl.style.minHeight = currentMinHeight + 'px';
            }
          }
          if (index < finalText.length) {
            index += 1;
            var jitter = Math.round((Math.random() - 0.5) * 12);
            window.setTimeout(tick, Math.max(12, delay + jitter));
            return;
          }

          quoteEl.setAttribute('data-typewriter-done', 'true');
          quoteEl.classList.remove('is-typewriter-running');
          quoteEl.classList.add('is-typewriter-done');
          quoteEl.style.minHeight = finalHeight + 'px';
        }

        tick();
      });
    }

    function initUnitTitleLineReveal() {
      var title = document.querySelector('.unit-title[data-title-animate="line-reveal"]');
      if (!title || title.getAttribute('data-title-animated') === 'true') return;

      var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var textString = (title.textContent || '').replace(/\s+/g, ' ').trim();
      if (!textString) return;

      if (prefersReducedMotion) {
        title.textContent = textString;
        title.removeAttribute('data-title-animate');
        return;
      }

      title.setAttribute('data-title-animated', 'true');
      title.textContent = '';

      var line = document.createElement('span');
      line.className = 'unit-title-anim-line';
      line.setAttribute('aria-hidden', 'true');

      var text = document.createElement('span');
      text.className = 'unit-title-anim-text';
      text.setAttribute('aria-label', textString);

      textString.split(/(\s+)/).forEach(function (token) {
        if (!token) return;
        if (/^\s+$/.test(token)) {
          text.appendChild(document.createTextNode(token));
          return;
        }

        var word = document.createElement('span');
        word.className = 'unit-title-anim-word';

        token.split('').forEach(function (char) {
          var span = document.createElement('span');
          span.className = 'unit-title-anim-char';
          span.textContent = char;
          word.appendChild(span);
        });

        text.appendChild(word);
      });

      title.appendChild(line);
      title.appendChild(text);

      var chars = Array.prototype.slice.call(text.querySelectorAll('.unit-title-anim-char'));
      if (!chars.length) {
        chars.forEach(function (charEl) {
          charEl.style.opacity = '1';
          charEl.style.transform = 'none';
          charEl.style.filter = 'none';
        });
        return;
      }

      function animateLineAndText() {
        title.classList.add('is-reveal');
        window.setTimeout(function () {
          var charRects = chars.map(function (charEl) { return charEl.getBoundingClientRect(); });
          var containerRect = title.getBoundingClientRect();
          var revealPoints = charRects.map(function (rect) {
            return {
              x: (rect.left - containerRect.left) + rect.width * 0.15,
              y: rect.top - containerRect.top
            };
          });
          var duration = Math.max(680, chars.length * 18);
          var startTs = null;
          var revealedCount = 0;
          var revealLag = 10;

          function step(ts) {
            if (startTs === null) startTs = ts;
            var elapsed = ts - startTs;
            var linearProgress = Math.min(elapsed / duration, 1);
            var easedProgress = 0.5 - (Math.cos(Math.PI * linearProgress) / 2);
            var segmentCount = Math.max(revealPoints.length - 1, 1);
            var pathPos = easedProgress * segmentCount;
            var i0 = Math.floor(pathPos);
            var i1 = Math.min(i0 + 1, revealPoints.length - 1);
            var t = pathPos - i0;
            var p0 = revealPoints[i0];
            var p1 = revealPoints[i1];
            var x = p0.x + (p1.x - p0.x) * t;
            var y = p0.y + (p1.y - p0.y) * t;

            title.style.setProperty('--line-x', x + 'px');
            title.style.setProperty('--line-y', y + 'px');
            title.classList.add('is-slide');

            while (revealedCount < chars.length) {
              var point = revealPoints[revealedCount];
              var crossedRow = y > point.y + 2;
              var crossedPoint = Math.abs(y - point.y) <= 4 && x >= point.x + revealLag;
              if (!crossedRow && !crossedPoint) break;
              chars[revealedCount].classList.add('is-visible');
              revealedCount += 1;
            }

            if (linearProgress < 1) {
              window.requestAnimationFrame(step);
              return;
            }

            // Ensure the full title is visible even if the last point was not crossed exactly.
            while (revealedCount < chars.length) {
              chars[revealedCount].classList.add('is-visible');
              revealedCount += 1;
            }

            window.setTimeout(function () {
              line.style.transition = 'transform 0.35s cubic-bezier(.77,0,.18,1), opacity 0.25s ease';
              line.style.opacity = '0';
              line.style.transform = 'scaleY(0) translate(' + x + 'px, ' + y + 'px)';
            }, 18);
          }

          window.requestAnimationFrame(step);
        }, 70);
      }

      window.setTimeout(animateLineAndText, 40);
    }

    function initLearningGoalsRevealOnScroll() {
      var blocks = Array.prototype.slice.call(document.querySelectorAll('.fom-learning-goals-block'));
      if (!blocks.length) return;

      var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      blocks.forEach(function (block) {
        var items = Array.prototype.slice.call(block.querySelectorAll('.fom-learning-goals-list li'));
        items.forEach(function (item, index) {
          item.style.setProperty('--goal-delay', (index * 190) + 'ms');
        });
        if (prefersReducedMotion) block.classList.add('is-visible');
      });
      if (prefersReducedMotion) return;

      if (!('IntersectionObserver' in window)) {
        blocks.forEach(function (block) { block.classList.add('is-visible'); });
        return;
      }

      var observer = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        });
      }, {
        root: null,
        threshold: 0.18,
        rootMargin: '0px 0px -12% 0px'
      });

      blocks.forEach(function (block) { observer.observe(block); });
    }

    initTypewriterQuotes();
    initUnitTitleLineReveal();
    initLearningGoalsRevealOnScroll();

    var scrollTopBtn = document.querySelector('.scroll-top-btn');
    if (!scrollTopBtn) {
      scrollTopBtn = document.createElement('button');
      scrollTopBtn.type = 'button';
      scrollTopBtn.className = 'scroll-top-btn';
      scrollTopBtn.setAttribute('aria-label', 'Nach oben');
      scrollTopBtn.innerHTML =
        '<span class="scroll-top-icon" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" focusable="false">' +
        '<path d="M6 14l6-6 6 6"></path>' +
        '</svg></span>';
      document.body.appendChild(scrollTopBtn);
    }

    scrollTopBtn.style.opacity = '0';
    scrollTopBtn.style.pointerEvents = 'none';
    scrollTopBtn.style.transition = 'opacity 160ms ease';

    function updateScrollTopBtnVisibility() {
      var isVisible = (window.scrollY || window.pageYOffset || 0) > 180;
      scrollTopBtn.style.opacity = isVisible ? '1' : '0';
      scrollTopBtn.style.pointerEvents = isVisible ? 'auto' : 'none';
    }

    function updateScrollTopBtnPosition() {
      var card = document.querySelector('.course-card');
      var main = document.querySelector('.course-main');
      var btnWidth = scrollTopBtn.offsetWidth || 38;
      var left = 12;
      if (card) {
        var cardRect = card.getBoundingClientRect();
        // Align to the actual text card, not to the whole content column.
        left = Math.max(12, Math.round(cardRect.left - btnWidth - 18));
      } else if (main) {
        var rect = main.getBoundingClientRect();
        // Place button just left of the text area, matching the requested layout.
        left = Math.max(12, Math.round(rect.left - btnWidth - 18));
      }

      scrollTopBtn.style.left = left + 'px';
    }

    updateScrollTopBtnPosition();
    updateScrollTopBtnVisibility();
    window.addEventListener('resize', updateScrollTopBtnPosition);
    window.addEventListener('scroll', updateScrollTopBtnVisibility, { passive: true });
    document.addEventListener('click', function (event) {
      if (event.target.closest('.toc-toggle-btn')) {
        window.setTimeout(updateScrollTopBtnPosition, 40);
      }
    });

    scrollTopBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
})();





