/**
 * DocFlow — UI Utilities, Theme, Toasts, Tabs & Modals
 */

(function (window) {
  'use strict';

  // DOM Shorthands
  const $ = selector => document.querySelector(selector);
  const $$ = selector => document.querySelectorAll(selector);

  // HTML escaping utility (escapes single quotes as &#39; as well)
  function escHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Toast Notification System (Issue 5: max 3 visible at once, dismisses previous top toast on new one)
  let lastToastMsg = '';
  let lastToastTime = 0;

  function showToast(message, type = 'info') {
    if (!message) return;
    const now = Date.now();
    if (message === lastToastMsg && (now - lastToastTime) < 300) {
      return; // Ignore rapid spam
    }
    lastToastMsg = message;
    lastToastTime = now;

    let container = $('#toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }

    // Ensure that only 3 toast notifications are visible at a time (Issue 5).
    // When a new notification appears, automatically close the previous top notification before displaying the new one.
    const activeToasts = Array.from(container.querySelectorAll('.toast:not(.toast-closing)'));
    while (activeToasts.length >= 3) {
      const topToast = activeToasts.shift();
      if (topToast) {
        topToast.classList.remove('show');
        topToast.classList.add('toast-closing');
        setTimeout(() => {
          if (topToast.parentNode) topToast.remove();
        }, 280);
      }
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = {
      success: 'fa-circle-check',
      error: 'fa-circle-exclamation',
      warning: 'fa-triangle-exclamation',
      info: 'fa-circle-info'
    };
    toast.innerHTML = `
      <i class="fas ${icons[type] || icons.info} toast-icon"></i>
      <span class="toast-msg">${escHtml(message)}</span>
      <button class="toast-close-btn" type="button" aria-label="Dismiss">&times;</button>
    `;

    const closeBtn = toast.querySelector('.toast-close-btn');
    const dismiss = () => {
      toast.classList.remove('show');
      toast.classList.add('toast-closing');
      setTimeout(() => {
        if (toast.parentNode) toast.remove();
      }, 280);
    };
    if (closeBtn) {
      closeBtn.addEventListener('click', e => {
        e.stopPropagation();
        dismiss();
      });
    }

    container.appendChild(toast);
    void toast.offsetWidth;
    toast.classList.add('show');

    // Ensure notification remains visible long enough to read (4s for info/success, 5s for warnings/errors)
    const duration = (type === 'error' || type === 'warning') ? 5000 : 4000;
    setTimeout(() => {
      if (toast.parentNode) dismiss();
    }, duration);
  }

  // Theme Management (Light mode default)
  let isDark = false;
  function setTheme() {
    isDark = false;
    document.documentElement.setAttribute('data-theme', 'light');
    try {
      localStorage.removeItem('df-theme');
    } catch (e) { }
  }

  function initTheme() {
    isDark = false;
    document.documentElement.setAttribute('data-theme', 'light');
    try {
      localStorage.removeItem('df-theme');
    } catch (e) { }
  }

  // Modal Management with Focus Trap & Escape return
  let lastActiveElement = null;

  function openModal(modalId) {
    const modal = $(modalId);
    if (modal) {
      if (window.DocFlow?.Editor?.saveSelection && window.DocFlow?.currentMode === 'edit') {
        window.DocFlow.Editor.saveSelection();
      }
      lastActiveElement = document.activeElement;
      modal.classList.add('show');
      const firstInput = modal.querySelector('input:not([type="hidden"]), button.primary, .modal-btn');
      if (firstInput && firstInput.id !== 'newDocTitleInput') {
        setTimeout(() => firstInput.focus(), 80);
      }
    }
  }

  function closeModal(modalId) {
    const modal = typeof modalId === 'string' ? $(modalId) : modalId;
    if (modal) {
      modal.classList.remove('show');
      if (window.DocFlow && window.DocFlow.Editor && window.DocFlow.currentMode === 'edit') {
        window.DocFlow.Editor.focusEditor();
      } else if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
        try { lastActiveElement.focus(); } catch (e) { }
      }
    }
  }

  // Inside Container Prompt Modal (Zero Browser Popups - Bug 4)
  function showPromptModal({ title = 'Prompt', message = 'Please enter value:', defaultValue = '', placeholder = '', confirmText = 'Confirm', onConfirm = null }) {
    const modal = $('#inAppPromptModal');
    if (!modal) return;
    const titleEl = $('#inAppPromptTitle');
    const msgEl = $('#inAppPromptMessage');
    const inputEl = $('#inAppPromptInput');
    const confirmBtn = $('#inAppPromptConfirmBtn');

    if (titleEl) titleEl.innerHTML = `<i class="fas fa-edit" style="color:var(--accent,#0284c7);margin-right:6px;"></i> ${escHtml(title)}`;
    if (msgEl) msgEl.textContent = message;
    if (confirmBtn) confirmBtn.innerHTML = `<i class="fas fa-check"></i> ${escHtml(confirmText)}`;
    if (inputEl) {
      inputEl.value = defaultValue || '';
      inputEl.placeholder = placeholder || message;
    }

    const cleanup = () => {
      closeModal('#inAppPromptModal');
      if (confirmBtn) confirmBtn.onclick = null;
      if (inputEl) inputEl.onkeydown = null;
    };

    const submit = () => {
      const val = inputEl ? inputEl.value : '';
      cleanup();
      if (typeof onConfirm === 'function') onConfirm(val);
    };

    if (confirmBtn) confirmBtn.onclick = submit;
    if (inputEl) {
      inputEl.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cleanup();
        }
      };
    }

    const cancelBtn = $('#inAppPromptCancelBtn');
    const closeBtn = $('#inAppPromptCloseBtn');
    if (cancelBtn) cancelBtn.onclick = cleanup;
    if (closeBtn) closeBtn.onclick = cleanup;

    openModal('#inAppPromptModal');
    setTimeout(() => {
      if (inputEl) {
        inputEl.focus();
        inputEl.select();
      }
    }, 80);
  }

  function initModals() {
    $$('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) closeModal(overlay);
      });
    });

    // Close buttons inside modals
    $('#newDocCancel')?.addEventListener('click', () => closeModal('#newDocModal'));
    $('#linkCancel')?.addEventListener('click', () => closeModal('#linkModal'));
    $('#tableCancel')?.addEventListener('click', () => closeModal('#tableModal'));
    $('#statsCloseBtn')?.addEventListener('click', () => closeModal('#statsModal'));

    // Modal Focus Trap for Accessibility (WCAG compliant)
    document.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      const modal = document.querySelector('.modal-overlay.show');
      if (!modal) return;

      const focusables = Array.from(modal.querySelectorAll(
        'button:not([disabled]), input:not([disabled]):not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'
      ));
      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  // Fullscreen Handler
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        showToast('Fullscreen not available in this browser context', 'warning');
      });
    } else {
      document.exitFullscreen();
    }
  }

  function initFullscreen() {
    const btn = $('#fullscreenBtn');
    if (btn) {
      btn.addEventListener('click', toggleFullscreen);
      document.addEventListener('fullscreenchange', () => {
        const icon = btn.querySelector('i');
        const isFull = !!document.fullscreenElement;
        if (icon) {
          icon.className = isFull ? 'fas fa-compress' : 'fas fa-expand';
        }
        showToast(isFull ? 'Entered Fullscreen mode (F11 / Esc)' : 'Exited Fullscreen mode', 'info');
      });
    }
  }

  // Tab Manager
  const Tabs = {
    list: [],
    activeId: null,

    create(name, content, fileType, type = 'edit') {
      // Prevent opening duplicate file with the same name and extension (Issue 1)
      const existing = this.list.find(t => t.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        this.switchTo(existing.id);
        showToast(`"${name}" is already open`, 'info');
        return existing;
      }

      const tab = {
        id: 't' + Date.now() + Math.random().toString(36).slice(2, 6),
        name,
        content,
        fileType,
        type,
        modified: false,
        scroll: 0,
        pdfData: null,
        pdfDoc: null
      };
      this.list.push(tab);
      this.activeId = tab.id;
      this.save();
      this.render();
      return tab;
    },

    get(id) {
      return this.list.find(t => t.id === id);
    },

    saveCurrent() {
      const t = this.get(this.activeId);
      if (t && t.type === 'edit' && window.DocFlow && window.DocFlow.currentMode === 'edit') {
        const editor = $('#editor');
        const editorWrap = $('#editorWrap');
        if (editor) {
          if (window.DocFlow.Find && window.DocFlow.Find.getCleanHtml) {
            t.content = window.DocFlow.Find.getCleanHtml();
          } else {
            t.content = editor.innerHTML;
          }
        }
        t.modified = window.DocFlow.isModified || false;
        if (editorWrap) t.scroll = editorWrap.scrollTop;
      }
    },

    activateTab(tab) {
      if (!tab) return;
      if (tab.type === 'edit') {
        // Self-heal docx/xlsx if previously corrupted by PPT slide conversion bug
        const isDocx = tab.name && (tab.name.toLowerCase().endsWith('.docx') || tab.name.toLowerCase().endsWith('.doc'));
        if (isDocx && tab.content && tab.content.includes('pptx-slide-card')) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = tab.content;
          const slideTitle = tempDiv.querySelector('.pptx-slide-title, h2')?.textContent?.trim() || '';
          const slideBody = tempDiv.querySelector('.pptx-slide-body, p')?.textContent?.trim() || '';
          if (slideTitle.includes('Presentation') || slideTitle.includes('Slide') || (!slideTitle && !slideBody)) {
            tab.content = '<p><br></p>';
          } else {
            tab.content = `<p><strong>${escHtml(slideTitle)}</strong></p><p>${escHtml(slideBody)}</p>`;
          }
        }
        const isExcelDoc = tab.name && (tab.name.toLowerCase().endsWith('.xlsx') || tab.name.toLowerCase().endsWith('.xls'));
        if (isExcelDoc && tab.content && tab.content.includes('pptx-slide-card')) {
          tab.content = window.DocFlow?.FileIO?.createBlankExcelGrid?.(50, 50) || '<p>Spreadsheet Document</p>';
        }

        if (editor) editor.innerHTML = tab.content;
        if (editorWrap) editorWrap.scrollTop = tab.scroll || 0;
        window.DocFlow?.Editor?.resetHistoryForTab?.(tab.content);

        // Auto-adjust editor canvas for Excel / CSV mode (Bug 6)
        const isExcelOrCsv = (tab.name && (tab.name.endsWith('.xlsx') || tab.name.endsWith('.xls') || tab.name.endsWith('.csv'))) ||
          tab.fileType === 'EXCEL' || tab.fileType === 'CSV' || (tab.content && tab.content.includes('excel-spreadsheet-container'));
        if (editor) {
          if (isExcelOrCsv) {
            editor.classList.add('excel-view-mode');
            if (editorWrap) editorWrap.classList.add('is-excel-mode');
          } else {
            editor.classList.remove('excel-view-mode');
            if (editorWrap) editorWrap.classList.remove('is-excel-mode');
          }

          // Link Excel formula bar with table cells & setup interactions
          if (isExcelOrCsv) {
            if (window.DocFlow && window.DocFlow.setupExcelInteractions) {
              window.DocFlow.setupExcelInteractions();
            } else {
              setTimeout(() => {
                window.DocFlow?.setupExcelInteractions?.();
              }, 50);
            }
          }

          // Auto-adjust editor canvas for PPT deck mode (Issue 7: Only slide shows, no white paper sheet below)
          const isExplicitNonPpt = tab.name && (
            tab.name.toLowerCase().endsWith('.docx') || tab.name.toLowerCase().endsWith('.doc') ||
            tab.name.toLowerCase().endsWith('.xlsx') || tab.name.toLowerCase().endsWith('.xls') || tab.name.toLowerCase().endsWith('.csv') ||
            tab.name.toLowerCase().endsWith('.pdf') || tab.name.toLowerCase().endsWith('.txt') ||
            tab.name.toLowerCase().endsWith('.html') || tab.name.toLowerCase().endsWith('.htm') ||
            tab.name.toLowerCase().endsWith('.md') || tab.name.toLowerCase().endsWith('.markdown')
          );
          const isPptx = !isExplicitNonPpt && (
            (tab.name && (tab.name.toLowerCase().endsWith('.pptx') || tab.name.toLowerCase().endsWith('.ppt'))) ||
            tab.fileType === 'PPTX' || tab.fileType === 'PPT' ||
            (tab.content && tab.content.includes('pptx-slide-card'))
          );
          if (isPptx) {
            editor.classList.add('is-pptx-deck');
            document.body.classList.add('slide-deck-mode');
            const sb = $('#pptxSlideSidebar');
            if (sb) sb.style.display = 'flex';
            setTimeout(() => window.DocFlow?.updatePptSidebar?.(), 60);
          } else {
            editor.classList.remove('is-pptx-deck');
            document.body.classList.remove('slide-deck-mode');
            const sb = $('#pptxSlideSidebar');
            if (sb) sb.style.display = 'none';
          }
        }

        if (window.DocFlow) {
          window.DocFlow.switchMode('edit');
          window.DocFlow.updateTopbar(tab);
          window.DocFlow.setModified(tab.modified || false);
        }
        try {
          if (window.location.hash === '#home') {
            history.replaceState(null, '', window.location.pathname);
          }
        } catch (_) {}

        requestAnimationFrame(() => {
          if (window.DocFlow && window.DocFlow.Editor) {
            window.DocFlow.Editor.focusEditor();
            window.DocFlow.Editor.updateCounts();
            window.DocFlow.Editor.updateCursorPos();
            window.DocFlow.Editor.updateToolbarState();
          }
          if (window.DocFlow && window.DocFlow.Find) {
            window.DocFlow.Find.updateOutline();
          }
          if (window.DocFlow && window.DocFlow.updatePptSidebar) {
            window.DocFlow.updatePptSidebar();
          }
          if (tab.name && (tab.name.toLowerCase().endsWith('.pptx') || tab.name.toLowerCase().endsWith('.ppt'))) {
            window.DocFlow?.switchRibbonTab?.('ppt');
          } else if (tab.name && (tab.name.toLowerCase().endsWith('.xlsx') || tab.name.toLowerCase().endsWith('.xls'))) {
            window.DocFlow?.switchRibbonTab?.('excel');
          } else if (tab.name && (tab.name.toLowerCase().endsWith('.md') || tab.name.toLowerCase().endsWith('.markdown'))) {
            window.DocFlow?.switchRibbonTab?.('md');
          } else if (tab.name && (tab.name.toLowerCase().endsWith('.html') || tab.name.toLowerCase().endsWith('.htm'))) {
            window.DocFlow?.switchRibbonTab?.('html');
          } else {
            window.DocFlow?.switchRibbonTab?.('home');
          }
          window.DocFlow?.updateWordOnlyTools?.(tab);
          window.DocFlow?.applyPersistedLayoutSettings?.(tab);

          // Handle DOM Inspector on file change (Issue 5)
          const domInspectorModal = $('#htmlDomInspectorModal');
          if (domInspectorModal && domInspectorModal.classList.contains('show')) {
            const isHtml = tab.name && (tab.name.toLowerCase().endsWith('.html') || tab.name.toLowerCase().endsWith('.htm'));
            if (isHtml) {
              window.DocFlow?.inspectHtmlDom?.();
            } else {
              closeModal('#htmlDomInspectorModal');
            }
          }
        });

        if (!tab.content || tab.content === '<p><br></p>') {
          const pdfStore = window.DocFlow?.PdfStore;
          if (pdfStore) {
            Promise.resolve(pdfStore.get('content-' + tab.id)).then(storedContent => {
              if (storedContent && storedContent.length > (tab.content || '').length) {
                tab.content = storedContent;
                if (editor) editor.innerHTML = storedContent;
                window.DocFlow?.Editor?.resetHistoryForTab?.(storedContent);
              }
            }).catch(() => {});
          }
        }
      } else if (tab.type === 'pdf') {
        const domInspectorModal = $('#htmlDomInspectorModal');
        if (domInspectorModal && domInspectorModal.classList.contains('show')) {
          closeModal('#htmlDomInspectorModal');
        }
        const sidebar = $('#pptxSlideSidebar');
        if (sidebar) sidebar.style.display = 'none';
        window.DocFlow?.switchRibbonTab?.('pdf');
        if (tab.pdfData && window.DocFlow && window.DocFlow.PDF) {
          window.DocFlow.PDF.loadPdfTab(tab);
        } else {
          // Attempt recovery from PdfStore (Bug 8: PDF data persistence)
          const pdfStore = window.DocFlow?.PdfStore;
          if (pdfStore) {
            Promise.resolve(pdfStore.get('tab-' + tab.id)).then(async data => {
              if (!data) data = await pdfStore.get(tab.name);
              if (data) {
                tab.pdfData = data;
                if (window.DocFlow && window.DocFlow.PDF) {
                  window.DocFlow.PDF.loadPdfTab(tab);
                }
              } else {
                showToast(`Could not restore PDF data for "${tab.name}"`, 'warning');
                this.close(tab.id);
              }
            }).catch(() => {
              showToast(`Could not restore PDF data for "${tab.name}"`, 'warning');
              this.close(tab.id);
            });
          } else {
            showToast('PDF data was not persisted — please reopen the file', 'warning');
            this.close(tab.id);
          }
        }
      }

      // Issue 1.a & Issue 2: Ensure doc lock UI and tab list are rendered immediately on tab activation
      window.DocFlow?.updateDocLockUI?.(tab);
      this.render();
      this.save();
    },

    switchTo(id) {
      if (id === this.activeId) return;
      this.saveCurrent();
      this.activeId = id;
      const tab = this.get(id);
      if (!tab) return;
      this.activateTab(tab);
      this.render();
      this.save();
    },

    close(id, force = false) {
      const idx = this.list.findIndex(t => t.id === id);
      if (idx === -1) return;
      const tab = this.list[idx];

      if (!force && tab.modified && tab.type === 'edit') {
        const modal = $('#unsavedChangesModal');
        if (modal) {
          const docNameEl = $('#unsavedChangesDocName');
          if (docNameEl) docNameEl.textContent = `"${tab.name}" has unsaved changes.`;
          openModal('#unsavedChangesModal');

          const cleanup = () => {
            closeModal('#unsavedChangesModal');
            const saveBtn = $('#unsavedSaveBtn');
            const discardBtn = $('#unsavedDiscardBtn');
            const cancelBtn = $('#unsavedCancelBtn');
            if (saveBtn) saveBtn.onclick = null;
            if (discardBtn) discardBtn.onclick = null;
            if (cancelBtn) cancelBtn.onclick = null;
          };

          const saveBtn = $('#unsavedSaveBtn');
          const discardBtn = $('#unsavedDiscardBtn');
          const cancelBtn = $('#unsavedCancelBtn');

          if (saveBtn) {
            saveBtn.onclick = () => {
              cleanup();
              window.DocFlow?.FileIO?.saveDocument?.();
              Tabs.close(id, true);
            };
          }
          if (discardBtn) {
            discardBtn.onclick = () => {
              cleanup();
              Tabs.close(id, true);
            };
          }
          if (cancelBtn) {
            cancelBtn.onclick = () => {
              cleanup();
            };
          }
          return;
        } else {
          if (!confirm(`"${tab.name}" has unsaved changes. Close anyway?`)) return;
        }
      }

      if (tab.pdfDoc) {
        try { tab.pdfDoc.destroy(); } catch (e) { }
        tab.pdfDoc = null;
      }

      this.list.splice(idx, 1);
      try { localStorage.removeItem('df-tab-' + id); } catch (e) { }

      if (this.list.length === 0) {
        this.activeId = null;
        document.body.classList.remove('slide-deck-mode');
        const sb = $('#pptxSlideSidebar');
        if (sb) sb.style.display = 'none';
        const edWrap = document.getElementById('editorWrap');
        const ed = document.getElementById('editor');
        if (edWrap) edWrap.classList.remove('is-excel-mode');
        if (ed) {
          ed.classList.remove('excel-view-mode', 'is-pptx-deck');
          ed.innerHTML = '';
          ed.contentEditable = 'true';
        }
        if (window.DocFlow) {
          window.DocFlow.switchMode('empty');
          window.DocFlow?.switchRibbonTab?.('home');
          $('#fileNameDisplay').textContent = 'DocFlow';
          $('#fileTypeInfo').textContent = 'No file';
          window.DocFlow.setModified(false);
        }
        this.render();
        this.save();
        return;
      }

      if (this.activeId === id) {
        const nextIdx = Math.min(idx, this.list.length - 1);
        const nextTab = this.list[nextIdx];
        this.activeId = nextTab.id;
        this.activateTab(nextTab);
      }

      this.render();
      this.save();
      showToast(`Closed "${tab.name}"`, 'info');
    },

    rename(id) {
      const tab = this.get(id);
      if (!tab) return;
      const currentName = tab.name.replace(/\.[^.]+$/, '');
      const ext = tab.name.includes('.') ? '.' + tab.name.split('.').pop() : '';
      showPromptModal({
        title: 'Rename Document',
        message: 'Enter new document name:',
        defaultValue: currentName,
        confirmText: 'Rename',
        onConfirm: (newBase) => {
          if (!newBase || !newBase.trim()) return;
          const newName = newBase.trim() + ext;
          tab.name = newName;
          if (this.activeId === id) {
            const fnDisplay = $('#fileNameDisplay');
            if (fnDisplay) fnDisplay.textContent = newName;
          }
          this.render();
          this.save();
          showToast(`Renamed to "${newName}"`, 'info');
        }
      });
    },

    render() {
      const tabList = $('#tabList');
      const tabBar = $('#tabBar');
      if (!tabList || !tabBar) return;

      tabList.innerHTML = '';
      this.list.forEach(tab => {
        const el = document.createElement('div');
        el.className = 'tab' + (tab.id === this.activeId ? ' active' : '') + (tab.modified ? ' modified' : '');
        el.setAttribute('role', 'tab');
        el.setAttribute('aria-selected', tab.id === this.activeId ? 'true' : 'false');
        el.dataset.id = tab.id;
        const isTabLocked = !!(tab.isLocked || window.DocFlow?.FileLockStore?.isLockedSync?.(tab.name));
        const lockIconHtml = isTabLocked ? '<i class="fas fa-lock" style="color:#e11d48;font-size:10px;margin-right:2px;" title="Locked Document"></i> ' : '';
        el.innerHTML = `
          <span class="tab-save-dot ${tab.modified ? 'unsaved' : 'saved'}" title="${tab.modified ? 'Unsaved changes (Red)' : 'Saved (Green)'}"></span>
          ${lockIconHtml}<span class="tab-name" title="${escHtml(tab.name)}">${escHtml(tab.name)}</span>
          <button class="tab-more-btn" title="Options for ${escHtml(tab.name)}" aria-label="Tab options"><i class="fas fa-ellipsis-vertical"></i></button>
          <button class="tab-close" title="Close tab" aria-label="Close ${escHtml(tab.name)}">&times;</button>
          <div class="tab-menu-dropdown" role="menu">
            <button class="tab-menu-item" data-action="rename"><i class="fas fa-pen-to-square"></i> Rename</button>
            <button class="tab-menu-item" data-action="save"><i class="fas fa-floppy-disk"></i> Save</button>
            <button class="tab-menu-item" data-action="print"><i class="fas fa-print"></i> Print</button>
            <button class="tab-menu-item danger" data-action="close"><i class="fas fa-xmark"></i> Close</button>
          </div>
        `;

        el.addEventListener('click', e => {
          if (e.target.closest('.tab-close') || e.target.closest('.tab-more-btn') || e.target.closest('.tab-menu-dropdown')) return;
          this.switchTo(tab.id);
        });

        const moreBtn = el.querySelector('.tab-more-btn');
        const menuDropdown = el.querySelector('.tab-menu-dropdown');

        moreBtn?.addEventListener('click', e => {
          e.stopPropagation();
          const wasOpen = menuDropdown.classList.contains('show');
          closeAllPopovers();
          if (!wasOpen) {
            positionPopover(moreBtn, menuDropdown);
          }
        });

        menuDropdown?.querySelectorAll('.tab-menu-item').forEach(item => {
          item.addEventListener('click', e => {
            e.stopPropagation();
            menuDropdown.classList.remove('show');
            const action = item.dataset.action;
            if (action === 'rename') {
              this.rename(tab.id);
            } else if (action === 'save') {
              if (this.activeId !== tab.id) this.switchTo(tab.id);
              if (window.DocFlow && window.DocFlow.handleTabSave) {
                window.DocFlow.handleTabSave(tab.id);
              }
            } else if (action === 'print') {
              if (this.activeId !== tab.id) this.switchTo(tab.id);
              window.print();
            } else if (action === 'close') {
              this.close(tab.id);
            }
          });
        });

        el.querySelector('.tab-close')?.addEventListener('click', e => {
          e.stopPropagation();
          this.close(tab.id);
        });

        tabList.appendChild(el);
      });

      const isHome = document.body.dataset.mode === 'empty' || !this.activeId;
      tabBar.classList.toggle('visible', this.list.length > 0 && !isHome);
      const activeTabEl = tabList.querySelector('.tab.active');
      if (activeTabEl) {
        try { activeTabEl.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' }); } catch (_) {}
      }
    },

    save() {
      try {
        const meta = this.list.map(t => ({
          id: t.id,
          name: t.name,
          fileType: t.fileType,
          type: t.type,
          modified: false,
          scroll: t.scroll,
          layoutSettings: t.layoutSettings || null
        }));
        localStorage.setItem('df-tabs', JSON.stringify(meta));
        localStorage.setItem('df-active', this.activeId || '');

        const pdfStore = window.DocFlow?.PdfStore;

        this.list.forEach(t => {
          if (t.type === 'edit') {
            try {
              localStorage.setItem('df-tab-' + t.id, t.content);
            } catch (err) {
              console.warn('Quota warning for tab ' + t.id + ':', err);
            }
            if (pdfStore && t.content) {
              pdfStore.set('content-' + t.id, t.content);
            }
          } else if (t.type === 'pdf') {
            if (pdfStore && t.pdfData) {
              pdfStore.set(t.name, t.pdfData);
              pdfStore.set('tab-' + t.id, t.pdfData);
            }
          }
        });
        return true;
      } catch (e) {
        console.warn('Storage save failed:', e);
        return false;
      }
    },

    load() {
      try {
        const raw = localStorage.getItem('df-tabs');
        if (!raw) return false;
        const meta = JSON.parse(raw);
        if (!Array.isArray(meta) || !meta.length) return false;

        this.list = meta.map(m => {
          let content = '';
          if (m.type === 'edit') {
            content = localStorage.getItem('df-tab-' + m.id) || '<p><br></p>';
          }
          return {
            id: m.id,
            name: m.name,
            fileType: m.fileType,
            type: m.type,
            modified: false,
            scroll: m.scroll || 0,
            content,
            layoutSettings: m.layoutSettings || null,
            pdfData: null,
            pdfDoc: null
          };
        });

        const storedActive = localStorage.getItem('df-active');
        const isHomeExplicit = storedActive === '' || storedActive === 'home' || window.location.hash === '#home';
        if (isHomeExplicit) {
          this.activeId = null;
        } else {
          this.activeId = (storedActive && this.list.some(t => t.id === storedActive))
            ? storedActive
            : (this.list[0] ? this.list[0].id : null);
        }
        return true;
      } catch (e) {
        return false;
      }
    },

    findByFile(name) {
      return this.list.find(t => t.name.toLowerCase() === name.toLowerCase());
    }
  };

  // Floating Popover Positioner (Prevents clipping from scrolling containers on mobile & desktop)
  // Floating Popover Positioner (Guarantees popovers float on top of editor with z-index 99999)
  function positionPopover(trigger, popover) {
    if (!trigger || !popover) return;
    if (window.DocFlow?.Editor?.saveSelection && window.DocFlow?.currentMode === 'edit') {
      window.DocFlow.Editor.saveSelection();
    }
    // Issue 5: Ensure only one dropdown menu can be open at a time across all toolbars
    const wasOpen = popover.classList.contains('show');
    closeAllPopovers();
    if (wasOpen) return;

    const rect = trigger.getBoundingClientRect();
    popover.style.position = 'fixed';
    popover.style.zIndex = '99999';
    popover.classList.add('show');

    // Smart vertical positioning with mobile containment (Bug 6)
    const isMobile = window.innerWidth <= 768;
    const maxAllowedHeight = isMobile
      ? Math.min(250, Math.floor(window.innerHeight * 0.45))
      : Math.min(360, Math.floor(window.innerHeight * 0.7));

    popover.style.maxHeight = maxAllowedHeight + 'px';
    popover.style.overflowY = 'auto';

    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;

    const isRibbonOrHeader = trigger.closest('.ribbon-container, .ribbon-panel, .ribbon-menu-bar, #toolbar, .header, #tabBar');

    // Bug 9 & Problem 6: If trigger is in ribbon/header/toolbar, always open below the trigger to never cover toolbar buttons
    if (isRibbonOrHeader) {
      popover.style.top = (rect.bottom + 6) + 'px';
      popover.style.maxHeight = Math.min(spaceBelow - 8, maxAllowedHeight) + 'px';
    } else if (spaceBelow < 120 && spaceAbove > spaceBelow) {
      popover.style.top = Math.max(8, rect.top - Math.min(popover.offsetHeight || maxAllowedHeight, spaceAbove) - 6) + 'px';
      popover.style.maxHeight = Math.min(spaceAbove - 12, maxAllowedHeight) + 'px';
    } else {
      popover.style.top = (rect.bottom + 6) + 'px';
      popover.style.maxHeight = Math.min(spaceBelow - 8, maxAllowedHeight) + 'px';
    }

    const popoverWidth = popover.offsetWidth || (isMobile ? 240 : 260);
    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 10) {
      left = window.innerWidth - popoverWidth - 10;
    }
    if (left < 10) left = 10;
    popover.style.left = left + 'px';
  }

  function closeAllPopovers() {
    // Issue 5: Close all dropdowns & popovers across all toolbars and views
    document.querySelectorAll('.margin-popover.show, .bullet-popover.show, .spacing-popover.show, .tab-menu-dropdown.show, .dropdown.show, .dropdown-menu.show, .df-popover.show, #saveDropdown.show, .slide-plus-menu.open').forEach(p => {
      p.classList.remove('show', 'open');
    });
  }

  // Close floating popovers & tab context menus on outside click or window resize
  document.addEventListener('click', e => {
    if (!e.target.closest('.tab-more-btn') && !e.target.closest('.tab-menu-dropdown') &&
        !e.target.closest('.bullet-dropdown-wrap') && !e.target.closest('.margin-popover') &&
        !e.target.closest('.spacing-popover') && !e.target.closest('.dropdown') &&
        !e.target.closest('.dropdown-menu') && !e.target.closest('#ribbonSaveDropdownBtn') &&
        !e.target.closest('.slide-plus-menu') && !e.target.closest('.slide-plus-action-btn')) {
      closeAllPopovers();
    }
  });

  // Dynamic Responsive Toolbar / Ribbon Balancer (Single row default, scrollable mobile, 2 rows on desktop only if space insufficient)
  function balanceRibbonPanel(panel) {
    if (!panel || !panel.classList.contains('active')) return;
    const container = document.getElementById('ribbonContainer');
    if (!container || container.offsetParent === null) return;

    const availableWidth = panel.clientWidth - 24;
    if (availableWidth <= 0) return;

    // Reset any previously moved orphan buttons first
    panel.querySelectorAll('[data-moved-orphan="true"]').forEach(btn => {
      const originalRow = btn._originalRow;
      if (originalRow && originalRow.parentNode) {
        originalRow.appendChild(btn);
      }
      delete btn._originalRow;
      delete btn.dataset.movedOrphan;
    });

    // Issue 1: ALWAYS single row across all devices (mobile and desktop)
    panel.classList.remove('two-rows');
  }

  function balanceAllRibbons() {
    const activePanel = document.querySelector('.ribbon-panel.active');
    if (activePanel) {
      balanceRibbonPanel(activePanel);
    }
  }

  let ribbonResizeTimer = null;
  function handleRibbonResize() {
    if (ribbonResizeTimer) cancelAnimationFrame(ribbonResizeTimer);
    ribbonResizeTimer = requestAnimationFrame(() => {
      balanceAllRibbons();
    });
  }

  // Smooth mouse wheel horizontal scrolling for ribbon panel and ribbon menu bar
  function initRibbonScroll() {
    // Capture-phase wheel handler for all scrollable popovers and menus:
    // Guarantees vertical mouse wheel scrolling works 100% reliably on all dropdowns & popovers
    document.addEventListener('wheel', e => {
      const popover = e.target?.closest?.(
        '.spacing-popover, .bullet-popover, .margin-popover, .dropdown-menu, .df-popover, .df-line-popover, .recent-tabs-dropdown, .outline-list, [role="menu"], select'
      );
      if (popover) {
        e.stopPropagation();
        const canScroll = popover.scrollHeight > popover.clientHeight;
        if (canScroll && e.deltaY !== 0) {
          popover.scrollTop += e.deltaY;
          e.preventDefault();
        }
      }
    }, { capture: true, passive: false });

    // Keep the overall application layout strictly fixed at (0,0) without shifting
    window.addEventListener('scroll', () => {
      if (window.scrollX !== 0 || window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    });

    const scrollContainers = document.querySelectorAll('.ribbon-panel, .ribbon-menu-bar');
    scrollContainers.forEach(container => {
      container.addEventListener('wheel', e => {
        // If event originated inside any scrollable dropdown, popover, or select, NEVER intercept!
        if (e.target && e.target.closest && e.target.closest('.spacing-popover, .dropdown-menu, .bullet-popover, .margin-popover, .df-popover, .df-line-popover, .recent-tabs-dropdown, .color-grid, select, [style*="overflow"], [class*="popover"], [class*="dropdown"]')) {
          return;
        }
        if (e.deltaY !== 0 && container.scrollWidth > container.clientWidth) {
          e.preventDefault();
          container.scrollLeft += e.deltaY;
        }
      }, { passive: false });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRibbonScroll);
  } else {
    initRibbonScroll();
  }

  window.addEventListener('resize', () => {
    closeAllPopovers();
    handleRibbonResize();
  });

  // Global shortcuts
  window.showToast = showToast;
  window.closeAllPopovers = closeAllPopovers;

  // Export to namespace
  window.DocFlow = window.DocFlow || {};
  window.DocFlow.UI = {
    $,
    $$,
    escHtml,
    showToast,
    setTheme,
    initTheme,
    openModal,
    closeModal,
    showPromptModal,
    initModals,
    toggleFullscreen,
    initFullscreen,
    positionPopover,
    closeAllPopovers,
    balanceRibbonPanel,
    balanceAllRibbons,
    initRibbonScroll,
    Tabs
  };

})(window);
