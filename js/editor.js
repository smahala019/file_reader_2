/**
 * DocFlow — Rich Text Editor & Document Formatting
 */

(function (window) {
  'use strict';

  function getSelectedExcelCells() {
    const container = document.querySelector('.excel-spreadsheet-container');
    if (!container) return [];
    const table = container.querySelector('.excel-grid-table');
    if (!table) return [];
    const cells = Array.from(table.querySelectorAll('td.excel-cell-selected, tr.excel-row-selected td, td.excel-col-selected'));
    if (cells.length > 0) return Array.from(new Set(cells));
    if (window._activeExcelCell && table.contains(window._activeExcelCell)) return [window._activeExcelCell];
    if (document.activeElement && document.activeElement.tagName === 'TD' && table.contains(document.activeElement)) {
      return [document.activeElement];
    }
    return [];
  }
  window.DocFlow = window.DocFlow || {};
  window.DocFlow.getSelectedExcelCells = getSelectedExcelCells;

  const { $, $$, escHtml, showToast, openModal, closeModal } = window.DocFlow.UI;

  let savedSelection = null;
  let autosaveTimer = null;
  let selChangeTimer = null;

  const editor = $('#editor');
  const editorWrap = $('#editorWrap');

  // URL Safety validator
  function isUrlSafe(url) {
    return !/^\s*(javascript|vbscript|data)\s*:/i.test(url);
  }

  // Selection Save & Restore
  function saveSelection() {
    try {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (editor && (editor.contains(range.commonAncestorContainer) || editor === range.commonAncestorContainer)) {
          savedSelection = range.cloneRange();
          return savedSelection;
        }
      }
    } catch (e) { }
    return null;
  }

  function restoreSelection() {
    if (!editor) return false;
    const sel = window.getSelection();
    if (!sel) return false;

    if (savedSelection) {
      try {
        if (editor.contains(savedSelection.commonAncestorContainer) || editor === savedSelection.commonAncestorContainer) {
          sel.removeAllRanges();
          sel.addRange(savedSelection);
          return true;
        }
      } catch (e) { }
    }

    // Fallback: place caret at the end of editor
    try {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
      savedSelection = range.cloneRange();
      return true;
    } catch (e) {
      return false;
    }
  }

  function focusEditor() {
    if (editor) {
      const excelContainer = document.querySelector('.excel-spreadsheet-container');
      if (excelContainer) {
        if (window._activeExcelCell && excelContainer.contains(window._activeExcelCell)) {
          window._activeExcelCell.focus();
          return;
        }
        const selCell = excelContainer.querySelector('td.excel-cell-selected');
        if (selCell) {
          window._activeExcelCell = selCell;
          selCell.focus();
          return;
        }
      }
      editor.focus();
      restoreSelection();
    }
  }

  // Safe Insertion at Caret Position (Guaranteed safe execution across browsers)
  function insertNodeAtCursor(node) {
    if (!editor) return;
    editor.focus();
    restoreSelection();

    const sel = window.getSelection();
    let range;

    if (sel && sel.rangeCount > 0) {
      range = sel.getRangeAt(0);
      if (!editor.contains(range.commonAncestorContainer) && editor !== range.commonAncestorContainer) {
        range = null;
      }
    }

    if (!range) {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }

    range.deleteContents();
    range.insertNode(node);

    // Position cursor immediately after inserted element
    try {
      range = document.createRange();
      range.setStartAfter(node);
      range.setEndAfter(node);
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
      savedSelection = range.cloneRange();
    } catch (e) { }

    notifyChange();
  }

  function insertHtmlAtCursor(html) {
    if (!editor) return;
    const isSpecialBlock = /<table|<svg|doc-chart-container|doc-page-break/i.test(html);
    const activeCell = (window._activeExcelCell && document.body.contains(window._activeExcelCell))
      ? window._activeExcelCell
      : null;
    if (activeCell && !isSpecialBlock) {
      saveSnapshot();
      activeCell.focus();
      const temp = document.createElement('div');
      temp.innerHTML = html;
      const textToInsert = (temp.textContent || temp.innerText || html).trim();
      const sel = window.getSelection();
      if (sel && sel.rangeCount && activeCell.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        try {
          document.execCommand('insertText', false, textToInsert);
        } catch (_) {
          activeCell.textContent = (activeCell.textContent ? activeCell.textContent + ' ' : '') + textToInsert;
        }
      } else {
        activeCell.textContent = textToInsert;
      }
      const formulaInput = document.getElementById('excelFormulaInput');
      if (formulaInput) formulaInput.value = activeCell.textContent;
      notifyChange();
      return activeCell;
    }

    const excelContainer = document.querySelector('.excel-spreadsheet-container');
    if (excelContainer && isSpecialBlock) {
      saveSnapshot();
      const fragment = document.createRange().createContextualFragment(html);
      excelContainer.parentNode.insertBefore(fragment, excelContainer.nextSibling);
      notifyChange();
      return null;
    }

    saveSnapshot();
    focusEditor();
    let inserted = false;
    try {
      inserted = document.execCommand('insertHTML', false, html);
    } catch (e) {
      inserted = false;
    }
    if (!inserted) {
      const fragment = document.createRange().createContextualFragment(html);
      const lastNode = fragment.lastChild;
      insertNodeAtCursor(fragment);
      notifyChange();
      return lastNode;
    }
    // Collapse selection to end of inserted content (Issue 2)
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const r = sel.getRangeAt(0);
      r.collapse(false);
      savedSelection = r.cloneRange();
    }
    notifyChange();
    return null;
  }

  // Clear All Formatting (Issue 1.10: Button & Command, across all documents and Excel)
  function isStructuralElement(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    const tag = el.tagName.toUpperCase();
    if (['IMG', 'SVG', 'CANVAS', 'VIDEO', 'AUDIO', 'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TH', 'TD', 'HR', 'IFRAME', 'SELECT', 'INPUT', 'BUTTON'].includes(tag)) {
      return true;
    }
    if (el.closest?.('.doc-chart-container, .doc-shape-container, .doc-custom-note, .doc-interactive-note, .onenote-sticky-note, .excel-floating-note, .page-sheet, .editor-page, .pptx-slide-card, .pptx-slide-wrapper, .excel-spreadsheet-container, .df-img-toolbar, .df-resize-handle, .df-img-move-handle, .df-line-move-handle, .df-line-resize-handle, .df-line-plus-btn, .df-line-popover, .df-table-move-handle, .df-table-corner-handle, .excel-note-header, .doc-note-header')) {
      return true;
    }
    if (el.classList && (
      el.classList.contains('doc-chart-container') ||
      el.classList.contains('doc-shape-container') ||
      el.classList.contains('doc-custom-note') ||
      el.classList.contains('doc-custom-line') ||
      el.classList.contains('doc-interactive-note') ||
      el.classList.contains('onenote-sticky-note') ||
      el.classList.contains('page-sheet') ||
      el.classList.contains('editor-page') ||
      el.classList.contains('pptx-slide-card') ||
      el.classList.contains('pptx-slide-wrapper') ||
      el.classList.contains('excel-spreadsheet-container')
    )) {
      return true;
    }
    return false;
  }

  function clearFormatting() {
    if (window.DocFlow.currentMode !== 'edit' || !editor) return;

    // Check if in Excel mode with selected or active cells
    const excelContainer = document.querySelector('.excel-spreadsheet-container');
    const excelCells = getSelectedExcelCells();
    if (excelContainer && (excelCells.length > 0 || window._activeExcelCell)) {
      saveSnapshot(true);
      const targetCells = excelCells.length > 0 ? excelCells : [window._activeExcelCell];
      targetCells.forEach(td => {
        if (!td || td.tagName !== 'TD') return;
        // Clear text formatting without stripping cell structure or classes (excel-cell, excel-has-note)
        td.style.fontWeight = 'normal';
        td.style.fontStyle = 'normal';
        td.style.textDecoration = 'none';
        td.style.color = 'var(--text-primary)';
        td.style.backgroundColor = '';
        td.style.fontSize = '';
        td.removeAttribute('data-custom-fill');
        td.querySelectorAll('b, strong, i, em, u, s, strike, font, span[style]').forEach(tag => {
          tag.replaceWith(...tag.childNodes);
        });
      });
      notifyChange();
      saveSnapshot(true);
      updateToolbarState();
      showToast(`Cleared formatting for ${targetCells.length} spreadsheet cell(s)`, 'success');
      return;
    }

    focusEditor();
    saveSnapshot(true);

    try {
      document.execCommand('removeFormat', false, null);
    } catch (e) { }
    try {
      document.execCommand('unlink', false, null);
    } catch (e) { }

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      let container = range.commonAncestorContainer;
      if (container.nodeType === Node.TEXT_NODE) container = container.parentElement;

      // Find formatting wrapper tags within selection and safely unwrap them
      const rootToSearch = (!range.collapsed && container) ? container : editor;
      rootToSearch.querySelectorAll('b, strong, i, em, u, s, strike, del, mark, font, sub, sup').forEach(el => {
        if (!isStructuralElement(el) && (range.collapsed || sel.containsNode(el, true))) {
          el.replaceWith(...el.childNodes);
        }
      });

      // Strip character styles from spans or text blocks without touching structural elements
      rootToSearch.querySelectorAll('span, p, h1, h2, h3, h4, h5, h6, li').forEach(el => {
        if (!isStructuralElement(el) && (range.collapsed || sel.containsNode(el, true))) {
          el.style.fontWeight = '';
          el.style.fontStyle = '';
          el.style.textDecoration = '';
          el.style.color = '';
          el.style.backgroundColor = '';
          el.style.fontSize = '';
          el.style.fontFamily = '';
          el.style.letterSpacing = '';
          el.style.textShadow = '';
          el.removeAttribute('face');
          el.removeAttribute('size');
          el.removeAttribute('color');
          if (el.tagName === 'SPAN' && (!el.getAttribute('style') || el.style.length === 0) && (!el.className || el.className.trim() === '')) {
            el.replaceWith(...el.childNodes);
          }
        }
      });
    }

    const fontSizeInput = $('#fontSizeInput');
    if (fontSizeInput) fontSizeInput.value = '15';
    const fontFamily = $('#fontFamily');
    if (fontFamily) fontFamily.value = "Calibri, sans-serif";
    const fontLabel = $('#fontFamilyLabel');
    if (fontLabel) fontLabel.textContent = "Calibri";
    const fontFamilyInput = $('#fontFamilyInput');
    if (fontFamilyInput) {
      fontFamilyInput.value = 'Calibri';
      fontFamilyInput.style.fontFamily = 'Calibri, sans-serif';
    }

    // Ensure all visual elements, charts, images, shapes, and notes remain interactive with handles intact
    window.DocFlow.ImageManager?.initImageManager?.();

    notifyChange();
    saveSnapshot(true);
    updateToolbarState();
    showToast('Formatting cleared', 'info');
  }

  // Universal Undo / Redo History Stack (Bug 4)
  const undoStack = [];
  const redoStack = [];
  let isUndoRedoing = false;
  let snapshotTimer = null;

  function getCaretOffsetWithin(element) {
    let caretOffset = 0;
    try {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (element.contains(range.endContainer)) {
          const preCaretRange = range.cloneRange();
          preCaretRange.selectNodeContents(element);
          preCaretRange.setEnd(range.endContainer, range.endOffset);
          caretOffset = preCaretRange.toString().length;
        }
      }
    } catch (e) { }
    return caretOffset;
  }

  function setCaretOffsetWithin(element, offset) {
    try {
      const range = document.createRange();
      const sel = window.getSelection();
      let currentOffset = 0;
      let nodeFound = false;

      function traverse(node) {
        if (nodeFound) return;
        if (node.nodeType === Node.TEXT_NODE) {
          const nextOffset = currentOffset + node.length;
          if (offset >= currentOffset && offset <= nextOffset) {
            range.setStart(node, Math.min(offset - currentOffset, node.length));
            range.collapse(true);
            nodeFound = true;
            return;
          }
          currentOffset = nextOffset;
        } else {
          for (let i = 0; i < node.childNodes.length; i++) {
            traverse(node.childNodes[i]);
            if (nodeFound) return;
          }
        }
      }

      traverse(element);
      if (!nodeFound) {
        range.selectNodeContents(element);
        range.collapse(false);
      }
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (e) { }
  }

  function getCurrentDocState() {
    if (!editor) return null;
    const isExcel = !!editor.querySelector('.excel-grid-table');
    const isPpt = !!(window.DocFlow?.isPptxDocument?.());
    let activeCellCoord = null;
    let caretOffset = 0;
    let slideIdx = 0;

    if (isExcel) {
      const activeCell = window._activeExcelCell || editor.querySelector('.excel-grid-table td.excel-cell-focus, .excel-grid-table td.excel-cell-selected');
      activeCellCoord = activeCell?.dataset?.coord || null;
    } else if (isPpt) {
      slideIdx = window.DocFlow?.getCurrentActiveSlideIndex ? window.DocFlow.getCurrentActiveSlideIndex() : 0;
    } else {
      caretOffset = getCaretOffsetWithin(editor);
    }

    return {
      html: editor.innerHTML,
      isExcel,
      isPpt,
      activeCellCoord,
      slideIdx,
      caretOffset
    };
  }

  function saveSnapshot(force = false) {
    if (!editor || isUndoRedoing) return;
    const currentState = getCurrentDocState();
    if (!currentState) return;

    const lastState = undoStack[undoStack.length - 1];
    // Don't push duplicate state unless forced
    if (!force && lastState && lastState.html === currentState.html && lastState.slideIdx === currentState.slideIdx && lastState.activeCellCoord === currentState.activeCellCoord) {
      return;
    }

    undoStack.push(currentState);
    if (undoStack.length > 60) undoStack.shift();
    redoStack.length = 0; // Clear redo on new action
    updateUndoRedoUI();
  }

  function debouncedSnapshot(delay = 450) {
    if (isUndoRedoing) return;
    clearTimeout(snapshotTimer);
    snapshotTimer = setTimeout(() => {
      saveSnapshot();
    }, delay);
  }

  function undo() {
    // If in PDF view mode, handle PDF undo
    if (window.DocFlow?.currentMode === 'view' && window.DocFlow?.PDF?.undoPdf) {
      return window.DocFlow.PDF.undoPdf();
    }
    if (window.DocFlow.currentMode !== 'edit' && window.DocFlow.currentMode !== 'empty') return false;

    // First ensure latest current edits are captured on top of undoStack before undoing
    const currentState = getCurrentDocState();
    if (currentState && undoStack.length > 0) {
      const top = undoStack[undoStack.length - 1];
      if (top.html !== currentState.html || top.slideIdx !== currentState.slideIdx) {
        undoStack.push(currentState);
      }
    }

    if (undoStack.length > 1) {
      isUndoRedoing = true;
      // Pop current state and push to redo stack
      const current = undoStack.pop();
      redoStack.push(current);

      const targetState = undoStack[undoStack.length - 1];
      if (targetState && editor) {
        editor.innerHTML = targetState.html;
        notifyChange();
        if (targetState.isExcel || editor.querySelector('.excel-grid-table')) {
          if (window.DocFlow?.setupExcelInteractions) {
            window.DocFlow.setupExcelInteractions();
          }
          const table = editor.querySelector('.excel-grid-table');
          const targetCoord = targetState.activeCellCoord;
          const targetCell = targetCoord ? table?.querySelector(`td[data-coord="${targetCoord}"]`) : (table?.querySelector('tbody td') || null);
          if (targetCell) {
            window._activeExcelCell = targetCell;
            targetCell.focus();
            table.querySelectorAll('td.excel-cell-focus').forEach(c => c.classList.remove('excel-cell-focus'));
            targetCell.classList.add('excel-cell-focus');
            const formulaInput = editor.querySelector('.excel-formula-input');
            const coordBox = editor.querySelector('.excel-coord-box');
            if (formulaInput) formulaInput.value = targetCell.textContent || '';
            if (coordBox) coordBox.value = targetCell.dataset.coord || targetCoord || 'A1';
          }
        } else if (targetState.isPpt || (window.DocFlow?.isPptxDocument?.())) {
          if (window.DocFlow.selectPptSlide) window.DocFlow.selectPptSlide(targetState.slideIdx);
          else if (window.DocFlow.updatePptSidebar) window.DocFlow.updatePptSidebar();
          const activeSlide = editor.querySelector(`.ppt-slide[data-slide-index="${targetState.slideIdx}"]`) || editor.querySelector('.ppt-slide');
          if (activeSlide) {
            const firstEditable = activeSlide.querySelector('[contenteditable="true"]') || activeSlide;
            firstEditable.focus();
          }
        } else {
          editor.focus();
          if (typeof targetState.caretOffset === 'number') {
            setCaretOffsetWithin(editor, targetState.caretOffset);
          }
        }
      }
      isUndoRedoing = false;
      updateToolbarState();
      updateUndoRedoUI();
      showToast('Undo performed', 'info');
      return true;
    } else {
      showToast('Nothing to undo', 'info');
      return false;
    }
  }

  function redo() {
    // If in PDF view mode, handle PDF redo
    if (window.DocFlow?.currentMode === 'view' && window.DocFlow?.PDF?.redoPdf) {
      return window.DocFlow.PDF.redoPdf();
    }
    if (window.DocFlow.currentMode !== 'edit' && window.DocFlow.currentMode !== 'empty') return false;

    if (redoStack.length > 0) {
      isUndoRedoing = true;
      const state = redoStack.pop();
      undoStack.push(state);

      if (state && editor) {
        editor.innerHTML = state.html;
        notifyChange();
        if (state.isExcel || editor.querySelector('.excel-grid-table')) {
          if (window.DocFlow?.setupExcelInteractions) {
            window.DocFlow.setupExcelInteractions();
          }
          const table = editor.querySelector('.excel-grid-table');
          const targetCoord = state.activeCellCoord;
          const targetCell = targetCoord ? table?.querySelector(`td[data-coord="${targetCoord}"]`) : (table?.querySelector('tbody td') || null);
          if (targetCell) {
            window._activeExcelCell = targetCell;
            targetCell.focus();
            table.querySelectorAll('td.excel-cell-focus').forEach(c => c.classList.remove('excel-cell-focus'));
            targetCell.classList.add('excel-cell-focus');
            const formulaInput = editor.querySelector('.excel-formula-input');
            const coordBox = editor.querySelector('.excel-coord-box');
            if (formulaInput) formulaInput.value = targetCell.textContent || '';
            if (coordBox) coordBox.value = targetCell.dataset.coord || targetCoord || 'A1';
          }
        } else if (state.isPpt || (window.DocFlow?.isPptxDocument?.())) {
          if (window.DocFlow.selectPptSlide) window.DocFlow.selectPptSlide(state.slideIdx);
          else if (window.DocFlow.updatePptSidebar) window.DocFlow.updatePptSidebar();
          const activeSlide = editor.querySelector(`.ppt-slide[data-slide-index="${state.slideIdx}"]`) || editor.querySelector('.ppt-slide');
          if (activeSlide) {
            const firstEditable = activeSlide.querySelector('[contenteditable="true"]') || activeSlide;
            firstEditable.focus();
          }
        } else {
          editor.focus();
          if (typeof state.caretOffset === 'number') {
            setCaretOffsetWithin(editor, state.caretOffset);
          }
        }
      }
      isUndoRedoing = false;
      updateToolbarState();
      updateUndoRedoUI();
      showToast('Redo performed', 'info');
      return true;
    } else {
      showToast('Nothing to redo', 'info');
      return false;
    }
  }

  function updateUndoRedoUI() {
    const btnUndo = $('#btnUndo');
    const btnRedo = $('#btnRedo');
    if (btnUndo) {
      const canUndo = (window.DocFlow?.currentMode === 'view')
        ? (window.DocFlow?.PDF?.canUndoPdf?.() || false)
        : (undoStack.length > 1);
      btnUndo.classList.toggle('disabled', !canUndo);
      btnUndo.style.opacity = canUndo ? '1' : '0.45';
    }
    if (btnRedo) {
      const canRedo = (window.DocFlow?.currentMode === 'view')
        ? (window.DocFlow?.PDF?.canRedoPdf?.() || false)
        : (redoStack.length > 0);
      btnRedo.classList.toggle('disabled', !canRedo);
      btnRedo.style.opacity = canRedo ? '1' : '0.45';
    }
  }

  function resetHistoryForTab(content = '', slideIdx = 0) {
    undoStack.length = 0;
    redoStack.length = 0;
    undoStack.push({
      html: content || (editor ? editor.innerHTML : ''),
      slideIdx: slideIdx || 0
    });
    updateUndoRedoUI();
  }

  // Issue 2(a): Official MS Word / PPT / Excel style indent & outdent
  // Adjusts paragraph/line/list-item margin cleanly without wrapping in <blockquote> or containers,
  // and without affecting the whole page or editor container.
  function applyIndentOutdent(direction) {
    const isIndent = direction === 'indent';
    const STEP = 28; // 28px standard indent step (clean quarter-inch equivalent)

    // 1. Check if inside Excel table with selected cells
    const excelCells = getSelectedExcelCells();
    if (excelCells.length > 0) {
      excelCells.forEach(cell => {
        const cur = parseInt(cell.style.paddingLeft, 10) || 6;
        const next = isIndent ? cur + 16 : Math.max(6, cur - 16);
        cell.style.paddingLeft = next + 'px';
      });
      return true;
    }

    // 2. Standard Editor
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return false;
    const editorEl = editor || document.getElementById('editor');
    if (!editorEl) return false;

    const range = sel.getRangeAt(0);

    // Helper: find closest block-level element belonging to editor content
    const findBlock = (node) => {
      let cur = (node && node.nodeType === 3) ? node.parentElement : node;
      while (cur && cur !== editorEl) {
        if (cur.classList && (cur.classList.contains('page-sheet') || cur.classList.contains('editor-page') || cur.id === 'editor')) {
          break;
        }
        const tag = cur.tagName ? cur.tagName.toLowerCase() : '';
        if (['p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'blockquote', 'td', 'th'].includes(tag)) {
          return cur;
        }
        if (tag === 'div' && (cur.parentElement === editorEl || cur.closest('.pptx-slide-card') || cur.closest('.page-sheet') || cur.closest('.editor-page'))) {
          if (!cur.classList.contains('pptx-slide-card') && !cur.classList.contains('page-sheet') && !cur.classList.contains('editor-page')) {
            return cur;
          }
        }
        cur = cur.parentElement;
      }
      return null;
    };

    const targetBlocks = new Set();

    if (range.collapsed) {
      let b = findBlock(range.startContainer);
      if (!b && editorEl.contains(range.startContainer)) {
        const node = range.startContainer;
        if (node.nodeType === 3 && node.parentNode) {
          const p = document.createElement('p');
          node.parentNode.insertBefore(p, node);
          p.appendChild(node);
          b = p;
        }
      }
      if (b) targetBlocks.add(b);
    } else {
      const walker = document.createTreeWalker(
        range.commonAncestorContainer,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
        null
      );
      let curr = walker.currentNode;
      while (curr) {
        if (range.intersectsNode(curr)) {
          const b = findBlock(curr);
          if (b && editorEl.contains(b)) {
            targetBlocks.add(b);
          }
        }
        curr = walker.nextNode();
      }
      if (targetBlocks.size === 0) {
        const b = findBlock(range.startContainer);
        if (b) targetBlocks.add(b);
      }
    }

    if (targetBlocks.size === 0) return false;

    targetBlocks.forEach(blk => {
      const tag = blk.tagName.toLowerCase();
      if (tag === 'td' || tag === 'th') {
        const curPad = parseInt(blk.style.paddingLeft, 10) || 8;
        const nextPad = isIndent ? curPad + 16 : Math.max(8, curPad - 16);
        blk.style.paddingLeft = nextPad + 'px';
        return;
      }

      const curMargin = parseInt(blk.style.marginLeft, 10) || 0;
      const nextMargin = isIndent ? curMargin + STEP : Math.max(0, curMargin - STEP);
      if (nextMargin > 0) {
        blk.style.marginLeft = nextMargin + 'px';
      } else {
        blk.style.marginLeft = '';
      }
    });

    return true;
  }

  // Command Execution
  function execCmd(cmd, value = null) {
    if (cmd === 'undo') {
      undo();
      updateToolbarState();
      return true;
    } else if (cmd === 'redo') {
      redo();
      updateToolbarState();
      return true;
    }

    if (document.body.classList.contains('reading-mode')) {
      showToast('Document editing is disabled in Read Mode', 'warning');
      return false;
    }
    if (window.DocFlow.currentMode !== 'edit') {
      showToast('Open or switch to an editable document first', 'info');
      return false;
    }
    focusEditor();

    const excelCells = getSelectedExcelCells();
    if (excelCells.length > 0) {
      saveSnapshot();
      const targetCell = window._activeExcelCell || excelCells[0];
      const targetComp = window.getComputedStyle(targetCell);

      const targetIsBold = targetCell.style.fontWeight === 'bold' || parseInt(targetComp.fontWeight, 10) >= 600 || !!targetCell.querySelector('strong, b');
      const newBold = !targetIsBold;

      const targetIsItalic = targetCell.style.fontStyle === 'italic' || targetComp.fontStyle === 'italic' || !!targetCell.querySelector('em, i');
      const newItalic = !targetIsItalic;

      const targetHasU = (targetCell.style.textDecoration && targetCell.style.textDecoration.includes('underline')) || targetComp.textDecorationLine.includes('underline') || !!targetCell.querySelector('u');
      const newU = !targetHasU;

      const targetHasS = (targetCell.style.textDecoration && targetCell.style.textDecoration.includes('line-through')) || targetComp.textDecorationLine.includes('line-through') || !!targetCell.querySelector('s, strike, del');
      const newS = !targetHasS;

      excelCells.forEach(cell => {
        const comp = window.getComputedStyle(cell);
        switch (cmd) {
          case 'bold': {
            cell.style.fontWeight = newBold ? 'bold' : 'normal';
            cell.querySelectorAll('strong, b').forEach(el => {
              el.style.fontWeight = newBold ? 'bold' : 'normal';
            });
            break;
          }
          case 'italic': {
            cell.style.fontStyle = newItalic ? 'italic' : 'normal';
            cell.querySelectorAll('em, i').forEach(el => {
              el.style.fontStyle = newItalic ? 'italic' : 'normal';
            });
            break;
          }
          case 'underline': {
            const curS = (cell.style.textDecoration && cell.style.textDecoration.includes('line-through')) || comp.textDecorationLine.includes('line-through') || !!cell.querySelector('s, strike, del');
            const decs = [];
            if (newU) decs.push('underline');
            if (curS) decs.push('line-through');
            cell.style.textDecoration = decs.length ? decs.join(' ') : 'none';
            cell.querySelectorAll('u').forEach(el => {
              el.style.textDecoration = newU ? 'underline' : 'none';
            });
            break;
          }
          case 'strikeThrough': {
            const curU = (cell.style.textDecoration && cell.style.textDecoration.includes('underline')) || comp.textDecorationLine.includes('underline') || !!cell.querySelector('u');
            const decs = [];
            if (curU) decs.push('underline');
            if (newS) decs.push('line-through');
            cell.style.textDecoration = decs.length ? decs.join(' ') : 'none';
            cell.querySelectorAll('s, strike, del').forEach(el => {
              el.style.textDecoration = newS ? 'line-through' : 'none';
            });
            break;
          }
          case 'subscript': {
            const isSub = cell.style.verticalAlign === 'sub';
            cell.style.verticalAlign = isSub ? 'baseline' : 'sub';
            cell.style.fontSize = isSub ? '' : '0.8em';
            break;
          }
          case 'superscript': {
            const isSup = cell.style.verticalAlign === 'super';
            cell.style.verticalAlign = isSup ? 'baseline' : 'super';
            cell.style.fontSize = isSup ? '' : '0.8em';
            break;
          }
          case 'justifyLeft':
            cell.style.textAlign = 'left';
            break;
          case 'justifyCenter':
            cell.style.textAlign = 'center';
            break;
          case 'justifyRight':
            cell.style.textAlign = 'right';
            break;
          case 'justifyFull':
            cell.style.textAlign = 'justify';
            break;
          case 'fontName':
            if (value) {
              cell.style.fontFamily = value;
              cell.querySelectorAll('*').forEach(child => child.style.fontFamily = 'inherit');
            }
            break;
          case 'fontSize':
            if (value) {
              const sz = value + (typeof value === 'number' || (!String(value).endsWith('pt') && !String(value).endsWith('px')) ? 'px' : '');
              cell.style.fontSize = sz;
              cell.querySelectorAll('*').forEach(child => child.style.fontSize = 'inherit');
            }
            break;
          case 'foreColor':
            if (value) {
              cell.style.setProperty('color', value, 'important');
              cell.querySelectorAll('*').forEach(child => child.style.setProperty('color', value, 'important'));
            }
            break;
          case 'hiliteColor':
            if (value) {
              const sel = window.getSelection();
              if (sel && !sel.isCollapsed && cell.contains(sel.anchorNode)) {
                try {
                  document.execCommand('styleWithCSS', false, true);
                  document.execCommand('hiliteColor', false, value);
                } catch (e) {
                  document.execCommand('backColor', false, value);
                }
              } else {
                const text = cell.innerHTML;
                if (text && text.trim()) {
                  cell.innerHTML = `<span class="excel-text-highlight" style="background-color: ${value}; padding: 1px 3px; border-radius: 2px;">${text}</span>`;
                }
              }
            }
            break;
          case 'removeFormat':
            cell.style.fontWeight = '';
            cell.style.fontStyle = '';
            cell.style.textDecoration = '';
            cell.style.fontFamily = '';
            cell.style.fontSize = '';
            cell.style.color = '';
            cell.style.backgroundColor = '';
            cell.style.textAlign = '';
            cell.style.verticalAlign = '';
            cell.querySelectorAll('*').forEach(child => {
              child.style.fontWeight = '';
              child.style.fontStyle = '';
              child.style.textDecoration = '';
              child.style.fontFamily = '';
              child.style.fontSize = '';
              child.style.color = '';
              child.style.backgroundColor = '';
            });
            break;
        }
      });
      updateToolbarState();
      notifyChange();
      saveSnapshot();
      return true;
    }

    // Save snapshot before executing formatting command
    saveSnapshot();
    if (cmd === 'indent' || cmd === 'outdent') {
      applyIndentOutdent(cmd);
    } else {
      try {
        document.execCommand(cmd, false, value);
      } catch (e) {
        console.warn('execCommand failed for ' + cmd, e);
      }
    }
    updateToolbarState();
    notifyChange();
    saveSnapshot();

    const cmdNames = {
      bold: 'Bold',
      italic: 'Italic',
      underline: 'Underline',
      strikeThrough: 'Strikethrough',
      subscript: 'Subscript',
      superscript: 'Superscript',
      justifyLeft: 'Align Left',
      justifyCenter: 'Align Center',
      justifyRight: 'Align Right',
      justifyFull: 'Justify Full',
      insertUnorderedList: 'Bulleted List',
      insertOrderedList: 'Numbered List',
      indent: 'Increase Indent',
      outdent: 'Decrease Indent'
    };
    if (cmdNames[cmd]) {
      showToast(`${cmdNames[cmd]} applied`, 'info');
    }
    return true;
  }

  // Notify document change (dirty flag & autosave)
  function notifyChange() {
    if (window.DocFlow) {
      window.DocFlow.setModified(true);
      if (typeof window.DocFlow.triggerAutoSaveTimer === 'function') {
        window.DocFlow.triggerAutoSaveTimer();
      }
    }
    updateCounts();
    updateCursorPos();
    if (window.DocFlow.Find) {
      window.DocFlow.Find.scheduleOutlineUpdate();
    }
  }

  function scheduleAutosave() {
    if (window.DocFlow && typeof window.DocFlow.triggerAutoSaveTimer === 'function') {
      window.DocFlow.triggerAutoSaveTimer();
    }
  }

  // Toolbar Button Active States
  function updateToolbarState() {
    const excelCells = getSelectedExcelCells();
    if (excelCells.length > 0) {
      const targetCell = window._activeExcelCell || excelCells[0];
      const comp = window.getComputedStyle(targetCell);
      const hasBoldChild = !!targetCell.querySelector('b, strong');
      const hasItalicChild = !!targetCell.querySelector('i, em');
      const hasUnderlineChild = !!targetCell.querySelector('u');
      const hasStrikeChild = !!targetCell.querySelector('s, strike, del');
      const textDec = (targetCell.style.textDecoration || comp.textDecoration || comp.textDecorationLine || '').toLowerCase();

      const isBold = targetCell.style.fontWeight === 'bold' || parseInt(comp.fontWeight, 10) >= 600 || hasBoldChild;
      const isItalic = targetCell.style.fontStyle === 'italic' || comp.fontStyle === 'italic' || hasItalicChild;
      const isUnderline = textDec.includes('underline') || hasUnderlineChild;
      const isStrike = textDec.includes('line-through') || hasStrikeChild;
      const isSub = targetCell.style.verticalAlign === 'sub' || comp.verticalAlign === 'sub' || !!targetCell.querySelector('sub');
      const isSup = targetCell.style.verticalAlign === 'super' || comp.verticalAlign === 'super' || !!targetCell.querySelector('sup');

      $('.fmt-btn[data-cmd="bold"]')?.classList.toggle('active', isBold);
      $('.fmt-btn[data-cmd="italic"]')?.classList.toggle('active', isItalic);
      $('.fmt-btn[data-cmd="underline"]')?.classList.toggle('active', isUnderline);
      $('.fmt-btn[data-cmd="strikeThrough"]')?.classList.toggle('active', isStrike);
      $('.fmt-btn[data-cmd="subscript"]')?.classList.toggle('active', isSub);
      $('.fmt-btn[data-cmd="superscript"]')?.classList.toggle('active', isSup);

      const align = targetCell.style.textAlign || comp.textAlign || 'left';
      $('.fmt-btn[data-cmd="justifyLeft"]')?.classList.toggle('active', align === 'left' || align === 'start');
      $('.fmt-btn[data-cmd="justifyCenter"]')?.classList.toggle('active', align === 'center');
      $('.fmt-btn[data-cmd="justifyRight"]')?.classList.toggle('active', align === 'right' || align === 'end');
      $('.fmt-btn[data-cmd="justifyFull"]')?.classList.toggle('active', align === 'justify');

      const fSize = parseInt(targetCell.style.fontSize || comp.fontSize, 10);
      const fontSizeInput = $('#fontSizeInput');
      if (fontSizeInput && fSize) fontSizeInput.value = fSize;

      const curFont = (targetCell.style.fontFamily || comp.fontFamily || '').replace(/['"]/g, '').split(',')[0].trim();
      if (curFont) {
        const fontLabel = $('#fontFamilyLabel');
        if (fontLabel) fontLabel.textContent = curFont;
        $$('#fontFamilyPopover .spacing-opt-item').forEach(el => {
          el.classList.toggle('active', el.dataset.name?.toLowerCase() === curFont.toLowerCase());
        });
      }
      return;
    }

    const commands = [
      'bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript',
      'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull',
      'insertUnorderedList', 'insertOrderedList'
    ];

    commands.forEach(cmd => {
      const btn = $(`.fmt-btn[data-cmd="${cmd}"]`);
      if (btn) {
        try {
          btn.classList.toggle('active', document.queryCommandState(cmd));
        } catch (e) { }
      }
    });

    // Heading select sync
    try {
      const block = (document.queryCommandValue('formatBlock') || '').toString().replace(/[<>]/g, '').toLowerCase();
      const headingSelect = $('#headingSelect');
      if (headingSelect) {
        headingSelect.value = ['h1', 'h2', 'h3', 'h4'].includes(block) ? block.toUpperCase() : 'p';
      }
    } catch (e) { }

    // Font Family sync (Accurately detect font family from clicked paragraph or DOM node)
    try {
      const sel = window.getSelection();
      if (sel && sel.rangeCount && editor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        let node = sel.getRangeAt(0).startContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
        if (node) {
          const fontElem = node.closest('[style*="font-family"], font[face]') || node;
          const compFont = (fontElem.tagName === 'FONT' ? fontElem.getAttribute('face') : null) || fontElem.style?.fontFamily || window.getComputedStyle(node).fontFamily;
          const cleanFont = compFont.replace(/['"]/g, '').split(',')[0].trim();
          const fontInput = $('#fontFamilyInput');
          if (fontInput && document.activeElement !== fontInput && cleanFont) {
            fontInput.value = cleanFont;
            fontInput.style.fontFamily = compFont;
          }
          const fontLabel = $('#fontFamilyLabel');
          if (fontLabel && cleanFont) {
            fontLabel.textContent = cleanFont;
            fontLabel.style.fontFamily = compFont;
          }
          $$('#fontFamilyPopover .spacing-opt-item').forEach(el => {
            el.classList.toggle('active', el.dataset.name?.toLowerCase() === cleanFont.toLowerCase());
          });
        }
      }
    } catch (e) { }

    // Font Size Number Input sync with computed style at cursor
    try {
      const fontSizeInput = $('#fontSizeInput');
      const sel = window.getSelection();
      if (fontSizeInput && sel && sel.rangeCount && editor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        if (document.activeElement !== fontSizeInput) {
          let node = sel.getRangeAt(0).startContainer;
          if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
          if (node) {
            const compSize = window.getComputedStyle(node).fontSize;
            const pxVal = parseInt(compSize, 10);
            if (pxVal && !isNaN(pxVal)) {
              fontSizeInput.value = pxVal;
            }
          }
        }
      }
    } catch (e) { }
  }

  // Word and Character Counts (Accurate 0 chars when blank, strip phantom trailing newlines)
  function updateCounts() {
    if (!editor) return;
    let rawText = editor.innerText || '';
    rawText = rawText.replace(/\r/g, '');
    if (rawText.endsWith('\n')) {
      rawText = rawText.slice(0, -1);
    }
    const cleanText = rawText.trim();
    const words = cleanText ? cleanText.split(/\s+/).filter(Boolean).length : 0;
    const chars = cleanText.length === 0 ? 0 : rawText.length;

    const wordCountEl = $('#wordCount');
    const charCountEl = $('#charCount');

    if (wordCountEl) wordCountEl.textContent = `${words} word${words !== 1 ? 's' : ''}`;
    if (charCountEl) charCountEl.textContent = `${chars} char${chars !== 1 ? 's' : ''}`;
  }

  // Accurate Line and Column Tracker across all document formats & tags
  function updateCursorPos() {
    const lineCountEl = $('#lineCount');
    if (!lineCountEl) return;

    if (window.DocFlow.currentMode === 'view') {
      // In PDF viewer mode, show page indicator in status bar
      const pInfo = $('#pdfPageInfo')?.textContent || 'Page 1';
      lineCountEl.textContent = pInfo;
      return;
    }

    if (window.DocFlow.currentMode !== 'edit' || !editor) {
      lineCountEl.textContent = 'Ln 1, Col 1';
      return;
    }

    try {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) {
        lineCountEl.textContent = 'Ln 1, Col 1';
        return;
      }
      const range = sel.getRangeAt(0);
      if (!editor.contains(range.commonAncestorContainer) && editor !== range.commonAncestorContainer) {
        lineCountEl.textContent = 'Ln 1, Col 1';
        return;
      }

      // Clone range up to cursor position
      const pre = range.cloneRange();
      pre.selectNodeContents(editor);
      pre.setEnd(range.startContainer, range.startOffset);

      // Clone contents into a temporary fragment to parse block boundaries
      const fragment = pre.cloneContents();
      const div = document.createElement('div');
      div.appendChild(fragment);

      // Convert <br> to newline
      div.querySelectorAll('br').forEach(br => {
        br.replaceWith('\n');
      });

      // Insert linebreaks before block elements that start a new line
      const blockSelectors = 'p, div, h1, h2, h3, h4, h5, h6, li, tr, blockquote, pre, section, article';
      const blocks = div.querySelectorAll(blockSelectors);
      blocks.forEach(el => {
        if (el.previousElementSibling) {
          el.insertAdjacentText('beforebegin', '\n');
        } else if (el.previousSibling && el.previousSibling.textContent && el.previousSibling.textContent.trim()) {
          el.insertAdjacentText('beforebegin', '\n');
        }
      });

      const text = div.textContent || '';
      const lines = text.split('\n');
      const ln = Math.max(1, lines.length);
      const lastLine = lines[lines.length - 1];
      const col = Math.max(1, (lastLine ? lastLine.length : 0) + 1);

      lineCountEl.textContent = `Ln ${ln}, Col ${col}`;
    } catch (e) {
      lineCountEl.textContent = 'Ln 1, Col 1';
    }
  }

  // Color Pickers Wiring
  function setupColorPickers() {
    const textBtn = $('#textColorBtn');
    const textInput = $('#textColorInput');
    const textBar = $('#textColorBar');

    const bgBtn = $('#bgColorBtn');
    const bgInput = $('#bgColorInput');
    const bgBar = $('#bgColorBar');

    if (textBtn && textInput) {
      textBtn.addEventListener('click', () => {
        saveSelection();
        if (typeof textInput.showPicker === 'function') {
          textInput.showPicker();
        } else {
          textInput.click();
        }
      });

      textInput.addEventListener('input', function () {
        if (textBar) textBar.style.background = this.value;
      });

      textInput.addEventListener('change', function () {
        if (window.DocFlow.currentMode !== 'edit') {
          showToast('Open a document in edit mode to change text color', 'info');
          return;
        }
        const excelCells = getSelectedExcelCells();
        if (excelCells.length > 0) {
          saveSnapshot();
          excelCells.forEach(c => {
            c.style.setProperty('color', this.value, 'important');
            c.querySelectorAll('*').forEach(child => child.style.setProperty('color', this.value, 'important'));
          });
          notifyChange();
          saveSnapshot();
          showToast('Cell text color applied', 'success');
          return;
        }
        restoreSelection();
        document.execCommand('foreColor', false, this.value);
        notifyChange();
        updateToolbarState();
        showToast('Text color applied', 'success');
      });
    }

    if (bgBtn && bgInput) {
      bgBtn.addEventListener('click', () => {
        saveSelection();
        if (typeof bgInput.showPicker === 'function') {
          bgInput.showPicker();
        } else {
          bgInput.click();
        }
      });

      bgInput.addEventListener('input', function () {
        if (bgBar) bgBar.style.background = this.value;
      });

      bgInput.addEventListener('change', function () {
        if (window.DocFlow.currentMode !== 'edit') {
          showToast('Open a document in edit mode to highlight text', 'info');
          return;
        }
        const excelCells = getSelectedExcelCells();
        if (excelCells.length > 0) {
          saveSnapshot();
          const sel = window.getSelection();
          const hasTextSel = sel && !sel.isCollapsed;
          if (hasTextSel && excelCells.some(c => c.contains(sel.anchorNode))) {
            restoreSelection();
            try {
              document.execCommand('styleWithCSS', false, true);
              document.execCommand('hiliteColor', false, this.value);
            } catch (e) {
              document.execCommand('backColor', false, this.value);
            }
          } else {
            excelCells.forEach(c => {
              const text = c.innerHTML;
              if (text && text.trim()) {
                c.innerHTML = `<span class="excel-text-highlight" style="background-color: ${this.value}; padding: 1px 3px; border-radius: 2px;">${text}</span>`;
              }
            });
          }
          notifyChange();
          saveSnapshot();
          showToast('Text highlight applied', 'success');
          return;
        }
        restoreSelection();
        try {
          document.execCommand('styleWithCSS', false, true);
          document.execCommand('hiliteColor', false, this.value);
        } catch (e) {
          document.execCommand('backColor', false, this.value);
        }
        notifyChange();
        updateToolbarState();
        showToast('Text highlight color applied', 'success');
      });
    }
  }

  // Insert Table
  function setupTableInsert() {
    const btn = $('#insertTableBtn') || $('#ribbonInsertTableBtn');
    const insertBtn = $('#tableInsert');

    if (btn) {
      btn.addEventListener('click', () => {
        if (window.DocFlow.currentMode !== 'edit') {
          showToast('Open a document in edit mode first', 'info');
          return;
        }
        saveSelection();
        $('#tableRows').value = '3';
        $('#tableCols').value = '3';
        openModal('#tableModal');
      });
    }

    const linesBtn = $('#ribbonTableLinesBtn');
    if (linesBtn) {
      linesBtn.addEventListener('click', () => {
        if (window.DocFlow.currentMode !== 'edit') {
          showToast('Open a document in edit mode first', 'info');
          return;
        }
        saveSelection();
        openModal('#tableModal');
      });
    }

    const bColorInput = $('#tableBorderColor');
    const bColorLabel = $('#tableBorderColorLabel');
    if (bColorInput && bColorLabel) {
      bColorInput.addEventListener('input', e => {
        bColorLabel.textContent = e.target.value;
      });
    }

    if (insertBtn) {
      insertBtn.addEventListener('click', () => {
        const rows = Math.min(25, Math.max(1, parseInt($('#tableRows').value) || 3));
        const cols = Math.min(12, Math.max(1, parseInt($('#tableCols').value) || 3));
        const includeRowHeader = $('#tableRowHeaderCheck')?.checked === true;
        const includeColHeader = $('#tableColHeaderCheck')?.checked === true;
        const borderRule = '1px solid var(--border, #cbd5e1)';
        const tableWidth = '100%';
        const marginStyle = 'margin: 14px 0;';
        const collapseStyle = 'border-collapse: collapse;';
        const cellPadding = '8px 12px';

        closeModal('#tableModal');

        saveSnapshot();

        let tableHtml = `<table class="doc-table" style="width:${tableWidth}; ${marginStyle} ${collapseStyle} border:${borderRule};">`;
        if (includeRowHeader) {
          tableHtml += '<thead><tr>';
          if (includeColHeader) {
            tableHtml += `<th style="min-width:60px;padding:${cellPadding};background:var(--bg-tertiary);border:${borderRule};font-weight:700;"><br></th>`;
          }
          for (let c = 1; c <= cols; c++) {
            tableHtml += `<th style="min-width:60px;padding:${cellPadding};background:var(--bg-tertiary);border:${borderRule};font-weight:700;"><br></th>`;
          }
          tableHtml += '</tr></thead>';
        }
        tableHtml += '<tbody>';
        for (let r = 1; r <= rows; r++) {
          tableHtml += '<tr>';
          if (includeColHeader) {
            tableHtml += `<th style="min-width:60px;padding:${cellPadding};background:var(--bg-tertiary);border:${borderRule};font-weight:700;"><br></th>`;
          }
          for (let c = 1; c <= cols; c++) {
            tableHtml += `<td style="min-width:60px;padding:${cellPadding};border:${borderRule};"><br></td>`;
          }
          tableHtml += '</tr>';
        }
        tableHtml += '</tbody></table><p><br></p>';

        const excelContainer = document.querySelector('.excel-spreadsheet-container');
        if (excelContainer) {
          const table = excelContainer.querySelector('.excel-grid-table');
          if (table) {
            saveSnapshot();
            const activeCell = window._activeExcelCell || table.querySelector('td.excel-cell-selected') || table.querySelector('tbody tr td');
            let startRow = activeCell ? activeCell.closest('tr').rowIndex : 1;
            let startCol = activeCell ? activeCell.cellIndex : 1;

            const totalRows = rows + (includeRowHeader ? 1 : 0);
            const totalCols = cols + (includeColHeader ? 1 : 0);

            const tbody = table.querySelector('tbody');
            const thead = table.querySelector('thead tr');

            // Ensure grid has enough columns
            const currentCols = thead ? thead.children.length - 1 : 1;
            const neededCols = startCol + totalCols - 1;
            if (neededCols > currentCols) {
              for (let c = currentCols + 1; c <= neededCols; c++) {
                const colLetter = String.fromCharCode(64 + c);
                const th = document.createElement('th');
                th.className = 'excel-col-hdr';
                th.textContent = colLetter;
                thead?.appendChild(th);
                table.querySelectorAll('tbody tr').forEach(tr => {
                  const td = document.createElement('td');
                  td.contentEditable = 'true';
                  td.dataset.coord = `${colLetter}${tr.rowIndex}`;
                  tr.appendChild(td);
                });
              }
            }

            // Ensure grid has enough rows
            const currentRows = tbody ? tbody.rows.length : 0;
            const neededRows = startRow + totalRows - 1;
            if (tbody && neededRows > currentRows) {
              const totalColsNow = thead ? thead.children.length - 1 : totalCols;
              for (let r = currentRows + 1; r <= neededRows; r++) {
                const tr = document.createElement('tr');
                const rowTh = document.createElement('th');
                rowTh.className = 'excel-row-hdr';
                rowTh.textContent = r;
                tr.appendChild(rowTh);
                for (let c = 1; c <= totalColsNow; c++) {
                  const td = document.createElement('td');
                  td.contentEditable = 'true';
                  td.dataset.coord = `${String.fromCharCode(64 + c)}${r}`;
                  tr.appendChild(td);
                }
                tbody.appendChild(tr);
              }
            }

            // Clear previous cell selection
            table.querySelectorAll('td.excel-cell-selected').forEach(c => c.classList.remove('excel-cell-selected'));

            // Populate table cells with styles without pre-filled names
            for (let r = 0; r < totalRows; r++) {
              const rowElem = table.rows[startRow + r];
              if (!rowElem) continue;
              for (let c = 0; c < totalCols; c++) {
                const cellElem = rowElem.children[startCol + c];
                if (!cellElem || cellElem.tagName !== 'TD') continue;
                cellElem.classList.add('excel-cell-selected');

                const isHeaderCell = (includeRowHeader && r === 0) || (includeColHeader && c === 0);
                if (isHeaderCell) {
                  cellElem.style.fontWeight = 'bold';
                  cellElem.style.backgroundColor = 'rgba(22, 163, 74, 0.22)';
                  cellElem.style.color = 'var(--text-primary)';
                  cellElem.style.textAlign = 'center';
                  cellElem.style.border = '1.5px solid #16a34a';
                } else {
                  cellElem.style.border = '1px solid #16a34a';
                  cellElem.style.fontWeight = 'normal';
                }
              }
            }

            const firstFormattedCell = table.rows[startRow]?.children[startCol];
            if (firstFormattedCell && firstFormattedCell.tagName === 'TD') {
              window._activeExcelCell = firstFormattedCell;
              firstFormattedCell.focus();
            }

            window.DocFlow.setupExcelInteractions?.();
            window.DocFlow.Editor?.notifyChange();
            window.DocFlow.Editor?.saveSnapshot?.(true);
            window.DocFlow.Editor?.updateToolbarState?.();
            const hdrText = (includeRowHeader && includeColHeader) ? 'with row & column headers' : (includeRowHeader ? 'with row header' : (includeColHeader ? 'with column header' : 'table'));
            showToast(`Inserted ${rows}×${cols} ${hdrText} into spreadsheet grid`, 'success');
            return;
          }
        }

        if (window.DocFlow?.isPptxDocument?.()) {
          const curSlide = (window.DocFlow?.getCurrentSlideWrapper?.() || document.querySelector('.pptx-slide-wrapper.active-slide') || document.querySelector('.pptx-slide-card'));
          const card = curSlide ? (curSlide.classList.contains('pptx-slide-card') ? curSlide : curSlide.querySelector('.pptx-slide-card')) : null;
          if (card) {
            saveSnapshot(true);
            const contentBox = card.querySelector('.slide-content-box') || card;
            contentBox.insertAdjacentHTML('beforeend', tableHtml);
            window.DocFlow.Editor?.notifyChange();
            window.DocFlow.Editor?.saveSnapshot?.(true);
            const hdrText = (includeRowHeader && includeColHeader) ? 'with row & column headers' : (includeRowHeader ? 'with row header' : (includeColHeader ? 'with column header' : 'table'));
            showToast(`Inserted ${rows}×${cols} ${hdrText} into slide`, 'success');
            return;
          }
        }

        insertHtmlAtCursor(tableHtml);
        const hdrText = (includeRowHeader && includeColHeader) ? 'with row & column headers' : (includeRowHeader ? 'with row header' : (includeColHeader ? 'with column header' : 'table'));
        showToast(`Inserted ${rows}×${cols} ${hdrText}`, 'success');
      });
    }
  }

  // Table Row & Column Resizing (Requirement 3)
  function setupTableResizing() {
    let resizingCol = null;
    let resizingRow = null;
    let isCornerResizing = false;
    let isTableMoving = false;
    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;
    let startTableWidth = 0;
    let startTableHeight = 0;
    let targetRow = null;
    let colIndex = -1;
    let activeTable = null;
    let tableGhostIndicator = null;

    // Floating move handle for table
    const tableMoveHandle = document.createElement('div');
    tableMoveHandle.className = 'df-table-move-handle';
    tableMoveHandle.title = 'Click and drag to move table';
    tableMoveHandle.innerHTML = '<i class="fas fa-arrows-up-down-left-right" style="font-size:12px;"></i>';
    tableMoveHandle.style.cssText = 'position:fixed;width:24px;height:24px;background:var(--accent,#0284c7);color:#ffffff;border-radius:4px;display:none;align-items:center;justify-content:center;cursor:move;z-index:999;box-shadow:0 2px 8px rgba(0,0,0,0.25);user-select:none;pointer-events:auto;';
    document.body.appendChild(tableMoveHandle);

    // Floating corner resize handle for entire table
    const tableCornerHandle = document.createElement('div');
    tableCornerHandle.className = 'df-table-corner-handle';
    tableCornerHandle.title = 'Click and drag to resize entire table';
    tableCornerHandle.style.cssText = 'position:fixed;width:12px;height:12px;background:#ffffff;border:2px solid var(--accent,#0284c7);border-radius:2px;display:none;cursor:nwse-resize;z-index:999;box-shadow:0 1px 4px rgba(0,0,0,0.25);box-sizing:border-box;user-select:none;';
    document.body.appendChild(tableCornerHandle);

    // Floating visual resizer line guide for columns and rows (Issue 3.b)
    const tableResizeGuide = document.createElement('div');
    tableResizeGuide.id = 'dfTableResizeGuide';
    tableResizeGuide.style.cssText = 'position:fixed;display:none;z-index:1000;pointer-events:none;background:#0284c7;box-shadow:0 0 10px rgba(2,132,199,0.9), 0 0 4px #0284c7;transition:none;border-radius:2px;';
    document.body.appendChild(tableResizeGuide);

    const positionTableHandles = (tbl) => {
      if (!tbl || !document.body.contains(tbl)) {
        tableMoveHandle.style.display = 'none';
        tableCornerHandle.style.display = 'none';
        return;
      }
      const r = tbl.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) {
        tableMoveHandle.style.display = 'none';
        tableCornerHandle.style.display = 'none';
        return;
      }
      tableMoveHandle.style.display = 'flex';
      tableMoveHandle.style.left = Math.max(4, Math.round(r.left - 28)) + 'px';
      tableMoveHandle.style.top = Math.max(4, Math.round(r.top - 4)) + 'px';

      tableCornerHandle.style.display = 'block';
      tableCornerHandle.style.left = Math.round(r.right - 6) + 'px';
      tableCornerHandle.style.top = Math.round(r.bottom - 6) + 'px';
    };

    // Corner handle mousedown
    tableCornerHandle.addEventListener('mousedown', e => {
      if (!activeTable) return;
      e.preventDefault();
      e.stopPropagation();
      isCornerResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startTableWidth = activeTable.offsetWidth;
      startTableHeight = activeTable.offsetHeight;
      saveSnapshot(true);
      document.body.style.cursor = 'nwse-resize';
      document.body.style.userSelect = 'none';
    });

    // Move handle mousedown
    tableMoveHandle.addEventListener('mousedown', e => {
      if (!activeTable) return;
      e.preventDefault();
      e.stopPropagation();
      isTableMoving = true;
      tableMoveHandle.style.pointerEvents = 'none';
      saveSnapshot(true);
      document.body.style.cursor = 'move';
      document.body.style.userSelect = 'none';
    });

    // Update positions on editor scroll without unwanted popups or flashes (Issue 3.c)
    $('#editorWrap')?.addEventListener('scroll', () => {
      if (activeTable && !isCornerResizing && !isTableMoving) {
        if (tableMoveHandle.style.display === 'flex') {
          const wrap = $('#editorWrap');
          const wrapRect = wrap ? wrap.getBoundingClientRect() : null;
          const r = activeTable.getBoundingClientRect();
          if (wrapRect && (r.bottom < wrapRect.top || r.top > wrapRect.bottom)) {
            tableMoveHandle.style.display = 'none';
            tableCornerHandle.style.display = 'none';
            if (tableResizeGuide) tableResizeGuide.style.display = 'none';
          } else {
            positionTableHandles(activeTable);
          }
        }
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (isCornerResizing && activeTable) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const newWidth = Math.max(120, startTableWidth + dx);
        const newHeight = Math.max(50, startTableHeight + dy);
        activeTable.style.width = newWidth + 'px';
        activeTable.style.maxWidth = '100%';
        if (startTableHeight > 0) {
          const ratio = newHeight / startTableHeight;
          Array.from(activeTable.rows).forEach(r => {
            r.style.height = Math.max(22, Math.round(r.offsetHeight * ratio)) + 'px';
          });
        }
        positionTableHandles(activeTable);
        return;
      }

      if (isTableMoving && activeTable) {
        const clientX = e.clientX;
        const clientY = e.clientY;
        tableMoveHandle.style.left = (clientX - 12) + 'px';
        tableMoveHandle.style.top = (clientY - 12) + 'px';

        const editor = $('#editor');
        if (!tableGhostIndicator) {
          tableGhostIndicator = document.createElement('div');
          tableGhostIndicator.id = 'dfTableMoveGhost';
          tableGhostIndicator.style.cssText = 'height:3px;background:var(--accent,#0284c7);border-radius:2px;margin:8px 0;box-shadow:0 0 6px var(--accent,#0284c7);pointer-events:none;';
        }

        let range = null;
        if (document.caretRangeFromPoint) {
          range = document.caretRangeFromPoint(clientX, clientY);
        } else if (document.caretPositionFromPoint) {
          const pos = document.caretPositionFromPoint(clientX, clientY);
          if (pos) {
            range = document.createRange();
            range.setStart(pos.offsetNode, pos.offset);
          }
        }

        if (range && editor?.contains(range.commonAncestorContainer) && !activeTable.contains(range.commonAncestorContainer)) {
          try {
            range.insertNode(tableGhostIndicator);
          } catch (_) {}
        } else {
          const el = document.elementFromPoint(clientX, clientY);
          const block = el ? (el.closest('#editor > *') || el.closest('#editor p, #editor div, #editor table, #editor section, #editor h1, #editor h2, #editor h3')) : null;
          if (block && editor?.contains(block) && block !== tableGhostIndicator && block !== activeTable && !activeTable.contains(block)) {
            const r = block.getBoundingClientRect();
            if (clientY > r.top + r.height / 2) {
              block.insertAdjacentElement('afterend', tableGhostIndicator);
            } else {
              block.insertAdjacentElement('beforebegin', tableGhostIndicator);
            }
          }
        }
        return;
      }

      if (resizingCol) {
        const dx = e.clientX - startX;
        const newWidth = Math.max(30, startWidth + dx);
        if (activeTable && colIndex >= 0) {
          Array.from(activeTable.rows).forEach(r => {
            const c = r.cells[colIndex];
            if (c) {
              c.style.width = newWidth + 'px';
              c.style.minWidth = newWidth + 'px';
            }
          });
          const tRect = activeTable.getBoundingClientRect();
          tableResizeGuide.style.display = 'block';
          tableResizeGuide.style.width = '3px';
          tableResizeGuide.style.height = tRect.height + 'px';
          tableResizeGuide.style.top = tRect.top + 'px';
          tableResizeGuide.style.left = Math.round(e.clientX - 1) + 'px';
        }
        if (activeTable && !activeTable.classList.contains('excel-grid-table')) positionTableHandles(activeTable);
        return;
      }
      if (resizingRow) {
        const dy = e.clientY - startY;
        const newHeight = Math.max(22, startHeight + dy);
        if (targetRow) {
          targetRow.style.height = newHeight + 'px';
          Array.from(targetRow.cells).forEach(c => {
            c.style.height = newHeight + 'px';
          });
          if (activeTable) {
            const tRect = activeTable.getBoundingClientRect();
            tableResizeGuide.style.display = 'block';
            tableResizeGuide.style.height = '3px';
            tableResizeGuide.style.width = tRect.width + 'px';
            tableResizeGuide.style.left = tRect.left + 'px';
            tableResizeGuide.style.top = Math.round(e.clientY - 1) + 'px';
          }
        }
        if (activeTable && !activeTable.classList.contains('excel-grid-table')) positionTableHandles(activeTable);
        return;
      }

      // Check hover over table or near cell borders (Issue 3.c: buffer zone prevents handle from vanishing)
      const tbl = e.target.closest?.('table.doc-table, #editor table:not(.excel-grid-table)');
      const isOverHandle = e.target.closest?.('.df-table-move-handle, .df-table-corner-handle');

      if (tbl && !tbl.closest('.excel-spreadsheet-container')) {
        activeTable = tbl;
        positionTableHandles(tbl);
      } else if (isOverHandle) {
        if (activeTable) positionTableHandles(activeTable);
      } else if (activeTable) {
        const r = activeTable.getBoundingClientRect();
        // Buffer zone of 42px around the table so user can easily reach the move handle at r.left - 28px
        const inBufferZone = (
          e.clientX >= r.left - 42 &&
          e.clientX <= r.right + 25 &&
          e.clientY >= r.top - 25 &&
          e.clientY <= r.bottom + 25
        );
        if (!inBufferZone && !activeTable.contains(document.activeElement)) {
          tableMoveHandle.style.display = 'none';
          tableCornerHandle.style.display = 'none';
        }
      } else {
        tableMoveHandle.style.display = 'none';
        tableCornerHandle.style.display = 'none';
      }

      const cell = e.target.closest?.('td, th');
      if (!cell) {
        document.body.classList.remove('is-table-resizing-col', 'is-table-resizing-row');
        if (!resizingCol && !resizingRow) tableResizeGuide.style.display = 'none';
        return;
      }
      const cellTable = cell.closest('table.doc-table, #editor table, .excel-grid-table');
      if (!cellTable) {
        document.body.classList.remove('is-table-resizing-col', 'is-table-resizing-row');
        if (!resizingCol && !resizingRow) tableResizeGuide.style.display = 'none';
        return;
      }

      const rect = cell.getBoundingClientRect();
      const nearRight = Math.abs(rect.right - e.clientX) <= 6;
      const nearBottom = Math.abs(rect.bottom - e.clientY) <= 6;

      if (nearRight) {
        cell.style.cursor = 'col-resize';
        const tRect = cellTable.getBoundingClientRect();
        tableResizeGuide.style.display = 'block';
        tableResizeGuide.style.width = '3px';
        tableResizeGuide.style.height = tRect.height + 'px';
        tableResizeGuide.style.top = tRect.top + 'px';
        tableResizeGuide.style.left = Math.round(rect.right - 1) + 'px';
      } else if (nearBottom) {
        cell.style.cursor = 'row-resize';
        const tRect = cellTable.getBoundingClientRect();
        tableResizeGuide.style.display = 'block';
        tableResizeGuide.style.height = '3px';
        tableResizeGuide.style.width = tRect.width + 'px';
        tableResizeGuide.style.left = tRect.left + 'px';
        tableResizeGuide.style.top = Math.round(rect.bottom - 1) + 'px';
      } else {
        cell.style.cursor = '';
        if (!resizingCol && !resizingRow) {
          tableResizeGuide.style.display = 'none';
        }
      }
    });

    document.addEventListener('mousedown', (e) => {
      if (e.target.closest('.df-table-move-handle, .df-table-corner-handle')) return;

      const cell = e.target.closest?.('td, th');
      if (!cell) return;
      const tbl = cell.closest('table.doc-table, #editor table, .excel-grid-table');
      if (!tbl) return;

      activeTable = tbl;
      if (!tbl.classList.contains('excel-grid-table')) {
        positionTableHandles(tbl);
      }

      const rect = cell.getBoundingClientRect();
      const nearRight = Math.abs(rect.right - e.clientX) <= 6;
      const nearBottom = Math.abs(rect.bottom - e.clientY) <= 6;

      if (nearRight) {
        e.preventDefault();
        e.stopPropagation();
        colIndex = cell.cellIndex;
        startX = e.clientX;
        startWidth = cell.offsetWidth;
        resizingCol = true;
        document.body.classList.add('is-table-resizing-col');
        saveSnapshot(true);
      } else if (nearBottom) {
        e.preventDefault();
        e.stopPropagation();
        targetRow = cell.closest('tr');
        startY = e.clientY;
        startHeight = targetRow ? targetRow.offsetHeight : cell.offsetHeight;
        resizingRow = true;
        document.body.classList.add('is-table-resizing-row');
        saveSnapshot(true);
      }
    });

    document.addEventListener('mouseup', (e) => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (tableResizeGuide) tableResizeGuide.style.display = 'none';

      if (isCornerResizing) {
        isCornerResizing = false;
        notifyChange();
        saveSnapshot(true);
        if (activeTable) positionTableHandles(activeTable);
      }

      if (isTableMoving) {
        isTableMoving = false;
        tableMoveHandle.style.pointerEvents = 'auto';

        const editor = $('#editor');
        if (tableGhostIndicator && tableGhostIndicator.parentNode && activeTable) {
          tableGhostIndicator.parentNode.insertBefore(activeTable, tableGhostIndicator);
          tableGhostIndicator.remove();
          tableGhostIndicator = null;
          showToast('Table repositioned', 'success');
        } else if (activeTable && editor) {
          const clientX = e.clientX;
          const clientY = e.clientY;
          const el = document.elementFromPoint(clientX, clientY);
          const block = el ? (el.closest('#editor > *') || el.closest('#editor p, #editor div, #editor table, #editor section, #editor h1, #editor h2, #editor h3')) : null;
          if (block && editor.contains(block) && block !== activeTable && !activeTable.contains(block)) {
            block.insertAdjacentElement('afterend', activeTable);
            showToast('Table repositioned', 'success');
          }
        }
        notifyChange();
        saveSnapshot(true);
        if (activeTable) positionTableHandles(activeTable);
      }

      if (resizingCol || resizingRow) {
        resizingCol = null;
        resizingRow = null;
        targetRow = null;
        document.body.classList.remove('is-table-resizing-col', 'is-table-resizing-row');
        notifyChange();
        saveSnapshot(true);
        if (activeTable && !activeTable.classList.contains('excel-grid-table')) positionTableHandles(activeTable);
      }
    });
  }

  // Insert Link
  function setupLinkInsert() {
    const btn = $('#insertLinkBtn') || $('#ribbonInsertLinkBtn');
    const insertBtn = $('#linkInsert');
    const linkUrlInput = $('#linkUrl');
    const linkTextInput = $('#linkText');

    if (btn) {
      btn.addEventListener('click', () => {
        if (window.DocFlow.currentMode !== 'edit') {
          showToast('Open a document in edit mode first', 'info');
          return;
        }
        saveSelection();
        const sel = window.getSelection();
        linkTextInput.value = sel ? sel.toString() : '';
        linkUrlInput.value = '';
        openModal('#linkModal');
      });
    }

    if (insertBtn) {
      insertBtn.addEventListener('click', () => {
        let url = linkUrlInput.value.trim();
        const text = linkTextInput.value.trim() || url;
        if (!url) {
          showToast('Please enter a URL', 'warning');
          return;
        }
        if (!isUrlSafe(url)) {
          showToast('This URL scheme is not allowed', 'error');
          return;
        }
        if (!/^[a-z][a-z0-9+.-]*:/i.test(url) && !url.startsWith('/') && !url.startsWith('#')) {
          url = 'https://' + url;
        }

        closeModal('#linkModal');
        const linkHtml = `<a href="${escHtml(url)}" target="_blank" rel="noopener">${escHtml(text)}</a>`;
        insertHtmlAtCursor(linkHtml);
        showToast('Link inserted', 'success');
      });

      linkUrlInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          insertBtn.click();
        }
      });
    }
  }

  // Insert Horizontal Rule with Full Customization (Issue 4) & Blockquote
  function setupHrAndQuote() {
    ($('#insertHrBtn') || $('#ribbonInsertHrBtn'))?.addEventListener('click', () => {
      if (window.DocFlow.currentMode !== 'edit') return;
      openLineModal();
    });

    // Line Modal Controls
    $('#lineWidthSelect')?.addEventListener('change', updateLinePreview);
    $('#lineHeightSelect')?.addEventListener('change', updateLinePreview);
    $('#lineStyleSelect')?.addEventListener('change', updateLinePreview);
    $('#lineAlignSelect')?.addEventListener('change', updateLinePreview);
    $('#lineColorInput')?.addEventListener('input', updateLinePreview);

    $('#lineCancelBtn')?.addEventListener('click', () => {
      window.DocFlow.UI?.closeModal('#lineModal');
    });

    $('#lineInsertBtn')?.addEventListener('click', () => {
      insertCustomLine();
    });
  }

  function openLineModal() {
    window.DocFlow.UI?.openModal('#lineModal');
    updateLinePreview();
  }

  function updateLinePreview() {
    const width = $('#lineWidthSelect')?.value || '100%';
    const height = $('#lineHeightSelect')?.value || '2px';
    const style = $('#lineStyleSelect')?.value || 'solid';
    const align = $('#lineAlignSelect')?.value || 'center';
    const color = $('#lineColorInput')?.value || '#e2e8f0';

    const hexLabel = $('#lineColorHex');
    if (hexLabel) hexLabel.textContent = color;

    const preview = $('#linePreviewBox');
    if (preview) {
      preview.style.width = width;
      preview.style.height = height;
      preview.style.border = 'none';
      preview.style.borderTop = `${height} ${style} ${color}`;
      preview.style.margin = align === 'left' ? '0 auto 0 0' : (align === 'right' ? '0 0 0 auto' : '0 auto');
      preview.style.backgroundColor = style === 'solid' ? color : 'transparent';
    }
  }

  function insertCustomLine() {
    const width = $('#lineWidthSelect')?.value || '100%';
    const height = $('#lineHeightSelect')?.value || '2px';
    const style = $('#lineStyleSelect')?.value || 'solid';
    const align = $('#lineAlignSelect')?.value || 'center';
    const color = $('#lineColorInput')?.value || '#e2e8f0';

    const marginStyle = align === 'left' ? 'margin: 18px auto 18px 0;' : (align === 'right' ? 'margin: 18px 0 18px auto;' : 'margin: 18px auto;');
    const hrHtml = `<hr class="doc-custom-line" style="width:${width};height:${height};border:none;border-top:${height} ${style} ${color};background-color:${style === 'solid' ? color : 'transparent'};${marginStyle}"><p><br></p>`;

    insertHtmlAtCursor(hrHtml);
    window.DocFlow.UI?.closeModal('#lineModal');
    notifyChange();
    showToast('Customized line inserted', 'success');
  }

  // Set Font Size (Arbitrary number in points/px with no limit)
  function setFontSize(val) {
    if (window.DocFlow.currentMode !== 'edit' || !editor) return;
    const size = Math.max(1, parseInt(val, 10) || 15);
    focusEditor();

    const excelCells = getSelectedExcelCells();
    if (excelCells.length > 0) {
      saveSnapshot();
      excelCells.forEach(c => { c.style.fontSize = size + 'px'; });
      const fontSizeInput = $('#fontSizeInput');
      if (fontSizeInput) fontSizeInput.value = size;
      notifyChange();
      saveSnapshot();
      return;
    }

    const fontSizeInput = $('#fontSizeInput');
    if (fontSizeInput) fontSizeInput.value = size;

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    const range = sel.getRangeAt(0);

    if (range.collapsed) {
      // Caret is collapsed: insert a styled span containing zero-width space
      // so typing continues seamlessly at the chosen font size
      const span = document.createElement('span');
      span.style.fontSize = size + 'px';
      span.innerHTML = '&#8203;';
      insertNodeAtCursor(span);

      const newRange = document.createRange();
      newRange.setStart(span.firstChild, 1);
      newRange.setEnd(span.firstChild, 1);
      sel.removeAllRanges();
      sel.addRange(newRange);
      savedSelection = newRange.cloneRange();
      return;
    }

    // Text is selected:
    // Execute fontSize command then replace resultant font/span elements with custom size
    try {
      document.execCommand('styleWithCSS', false, true);
    } catch (e) { }

    try {
      document.execCommand('fontSize', false, '7');
    } catch (e) { }

    // Locate all newly created font/span elements with size 7 / xxx-large
    const fontNodes = editor.querySelectorAll('font[size="7"], [style*="-webkit-xxx-large"], [style*="xxx-large"]');
    fontNodes.forEach(node => {
      node.removeAttribute('size');
      node.style.fontSize = size + 'px';
    });

    notifyChange();
    updateToolbarState();
    showToast(`Font size set to ${size}px`, 'info');
  }

  // Bullet and Numbering List Style Applicator
  function applyListStyle(type) {
    if (window.DocFlow.currentMode !== 'edit' || !editor) return;
    focusEditor();

    const isOrdered = ['decimal', 'lower-alpha', 'upper-alpha', 'lower-roman', 'upper-roman'].includes(type);
    const cmd = isOrdered ? 'insertOrderedList' : 'insertUnorderedList';

    // Check if current selection is already in a matching list
    const sel = window.getSelection();
    let currentList = null;
    if (sel && sel.rangeCount) {
      let node = sel.getRangeAt(0).commonAncestorContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      currentList = node.closest(isOrdered ? 'ol' : 'ul');
    }

    if (!currentList) {
      document.execCommand(cmd, false, null);
      const selAfter = window.getSelection();
      if (selAfter && selAfter.rangeCount) {
        let n = selAfter.getRangeAt(0).commonAncestorContainer;
        if (n.nodeType === Node.TEXT_NODE) n = n.parentElement;
        currentList = n.closest(isOrdered ? 'ol' : 'ul');
      }
    }

    if (currentList) {
      currentList.classList.remove('list-circle', 'list-square', 'list-disc', 'list-arrow', 'list-check',
        'list-diamond', 'list-star', 'list-dash',
        'list-lower-alpha', 'list-upper-alpha', 'list-lower-roman', 'list-upper-roman', 'list-decimal');

      currentList.classList.add('list-' + type);
      currentList.setAttribute('data-list', type);

      if (type === 'arrow') {
        currentList.style.listStyleType = "'➔ '";
      } else if (type === 'check') {
        currentList.style.listStyleType = "'✓ '";
      } else if (type === 'diamond') {
        currentList.style.listStyleType = "'◆ '";
      } else if (type === 'star') {
        currentList.style.listStyleType = "'★ '";
      } else if (type === 'dash') {
        currentList.style.listStyleType = "'– '";
      } else {
        currentList.style.listStyleType = type;
      }

      if (isOrdered) {
        const typeAttr = type === 'decimal' ? '1'
          : type === 'lower-alpha' ? 'a'
          : type === 'upper-alpha' ? 'A'
          : type === 'lower-roman' ? 'i'
          : 'I';
        currentList.setAttribute('type', typeAttr);
      }
    }

    notifyChange();
    updateToolbarState();
    showToast(`List style applied: ${type}`, 'info');
  }

  // Line Spacing Applicator
  function applyLineSpacing(spacing) {
    if (window.DocFlow.currentMode !== 'edit' || !editor) return;
    focusEditor();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    let node = sel.getRangeAt(0).commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;

    const block = node.closest('p, div, h1, h2, h3, h4, li, blockquote') || editor;
    if (block) {
      block.style.lineHeight = spacing;
      notifyChange();
      // showToast(`Line spacing set to ${spacing}`, 'info');
    }
  }

  function executeClearFormatting() {
    closeModal('#clearFormatModal');
    clearFormatting();
  }

  // Change Case (Sentence, lower, UPPER, Title)
  function changeTextCase(mode) {
    if (window.DocFlow.currentMode !== 'edit' || !editor) return;
    restoreSelection();
    let sel = window.getSelection();
    if (!sel || !sel.rangeCount || sel.isCollapsed) {
      showToast('Select text first to change case', 'info');
      return;
    }

    const text = sel.toString();
    if (!text || !text.trim()) {
      showToast('Select text first to change case', 'info');
      return;
    }

    let transformed = text;
    if (mode === 'upper') {
      transformed = text.toUpperCase();
    } else if (mode === 'lower') {
      transformed = text.toLowerCase();
    } else if (mode === 'title') {
      transformed = text.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase());
    } else if (mode === 'sentence') {
      transformed = text.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, c => c.toUpperCase());
    }

    insertHtmlAtCursor(escHtml(transformed).replace(/\n/g, '<br>'));
    notifyChange();
    $('#casePopover')?.classList.remove('show');
    showToast(`Converted to ${mode} case`, 'info');
  }

  // Format Painter (Copy and paste styles, applicable to selections and new text, double-click resets to default)
  let copiedFormatStyle = null;
  let isFormatPainterActive = false;

  function toggleFormatPainter() {
    if (window.DocFlow.currentMode !== 'edit' || !editor) return;
    if (isFormatPainterActive) {
      resetFormatPainter();
      showToast('Format Painter: OFF', 'info');
      return;
    }
    const sel = window.getSelection();
    let el = null;
    if (sel && sel.rangeCount > 0) {
      const node = sel.anchorNode;
      el = node ? (node.nodeType === 1 ? node : node.parentElement) : null;
    }
    if (!el || el === editor) {
      el = editor.querySelector('p, h1, h2, h3, span, strong, em') || editor;
    }

    const comp = window.getComputedStyle(el);
    copiedFormatStyle = {
      fontFamily: comp.fontFamily,
      fontSize: comp.fontSize,
      fontWeight: comp.fontWeight,
      fontStyle: comp.fontStyle,
      color: comp.color,
      backgroundColor: comp.backgroundColor,
      textDecoration: comp.textDecoration
    };

    isFormatPainterActive = true;
    const painterBtn = $('#formatPainterBtn');
    painterBtn?.classList.add('active');
    editor.style.cursor = 'copy';
    document.body.style.cursor = 'copy';
    showToast('Format Painter: ON (Select text to paint; click again or dblclick to turn OFF)', 'info');
  }

  function resetFormatPainter() {
    copiedFormatStyle = null;
    isFormatPainterActive = false;
    const painterBtn = $('#formatPainterBtn');
    painterBtn?.classList.remove('active');
    if (editor) editor.style.cursor = '';
    document.body.style.cursor = '';
    showToast('Format painter reset to normal/default', 'info');
  }

  function applyFormatPainterToSelection() {
    if (!isFormatPainterActive || !copiedFormatStyle || !editor) return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    if (!sel.isCollapsed) {
      // Highlighted selection: Apply formatting to selected text
      const span = document.createElement('span');
      span.style.fontFamily = copiedFormatStyle.fontFamily;
      span.style.fontSize = copiedFormatStyle.fontSize;
      span.style.fontWeight = copiedFormatStyle.fontWeight;
      span.style.fontStyle = copiedFormatStyle.fontStyle;
      span.style.color = copiedFormatStyle.color;
      if (copiedFormatStyle.backgroundColor && copiedFormatStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        span.style.backgroundColor = copiedFormatStyle.backgroundColor;
      }
      span.style.textDecoration = copiedFormatStyle.textDecoration;

      const range = sel.getRangeAt(0);
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
      notifyChange();
      showToast('Formatting applied to selection', 'success');
    } else {
      // Collapsed cursor: Apply formatting for next typing
      const span = document.createElement('span');
      span.style.fontFamily = copiedFormatStyle.fontFamily;
      span.style.fontSize = copiedFormatStyle.fontSize;
      span.style.fontWeight = copiedFormatStyle.fontWeight;
      span.style.fontStyle = copiedFormatStyle.fontStyle;
      span.style.color = copiedFormatStyle.color;
      if (copiedFormatStyle.backgroundColor && copiedFormatStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        span.style.backgroundColor = copiedFormatStyle.backgroundColor;
      }
      span.style.textDecoration = copiedFormatStyle.textDecoration;
      span.innerHTML = '&#8203;'; // Zero-width space

      const range = sel.getRangeAt(0);
      range.insertNode(span);

      const newRange = document.createRange();
      newRange.setStart(span.firstChild, 1);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      notifyChange();
      showToast('Format ready for next typing', 'info');
    }
  }

  // Sort Selected Lines or Table Rows Alphabetically (Issue 1.3 & 1.5: Ascending or Descending)
  function sortSelectedTextOrTable(direction = 'asc') {
    if (window.DocFlow.currentMode !== 'edit' || !editor) return;
    const isDesc = direction === 'desc';
    const sel = window.getSelection();

    let node = sel && sel.rangeCount ? sel.anchorNode : null;
    if (node && node.nodeType === 3) node = node.parentElement;
    const activeExcelCell = window._activeExcelCell || document.querySelector('.excel-grid-table td.excel-cell-selected');
    const table = (node ? node.closest('table') : null) ||
                  (activeExcelCell ? activeExcelCell.closest('table') : null) ||
                  document.querySelector('.excel-spreadsheet-container .excel-grid-table') ||
                  document.querySelector('#editor table');

    if (table) {
      saveSnapshot(true);
      const isExcel = table.classList.contains('excel-grid-table');
      const tbody = table.querySelector('tbody') || table;
      const allRows = Array.from(tbody.querySelectorAll('tr'));
      if (allRows.length <= 1) {
        showToast('Table needs 2 or more rows to sort', 'info');
        return;
      }

      let cell = (node ? node.closest('td, th') : null) || activeExcelCell;
      if (!cell && table) {
        cell = table.querySelector('td.excel-cell-selected') || table.querySelector('tbody td');
      }
      let colIndex = cell ? cell.cellIndex : 1;
      if (isExcel && colIndex === 0) colIndex = 1; // Col 0 is row header in Excel

      const selectedCells = isExcel ? (window.DocFlow.getSelectedExcelCells ? window.DocFlow.getSelectedExcelCells() : []) : [];
      const selectedRowSet = new Set(selectedCells.map(c => c.closest('tr')).filter(Boolean));
      const hasSpecificSelection = selectedRowSet.size > 1;

      let headerRow = null;
      let rowsToSort = [];

      if (hasSpecificSelection) {
        rowsToSort = allRows.filter(r => selectedRowSet.has(r));
      } else if (isExcel) {
        headerRow = allRows[0];
        rowsToSort = allRows.slice(1);
      } else {
        const firstRowHasTh = allRows[0].querySelector('th');
        headerRow = firstRowHasTh ? allRows[0] : null;
        rowsToSort = headerRow ? allRows.slice(1) : allRows;
      }

      // Sort data rows in place.
      // Empty cells/rows MUST ALWAYS stay at the bottom, in both asc and desc!
      rowsToSort.sort((a, b) => {
        const textA = (a.cells[colIndex]?.textContent || '').trim();
        const textB = (b.cells[colIndex]?.textContent || '').trim();

        if (!textA && !textB) return 0;
        if (!textA) return 1;
        if (!textB) return -1;

        return isDesc
          ? textB.localeCompare(textA, undefined, { numeric: true, sensitivity: 'base' })
          : textA.localeCompare(textB, undefined, { numeric: true, sensitivity: 'base' });
      });

      if (hasSpecificSelection) {
        const sortedIndices = allRows.map((r, i) => selectedRowSet.has(r) ? i : -1).filter(i => i !== -1);
        sortedIndices.forEach((pos, idx) => {
          allRows[pos] = rowsToSort[idx];
        });
        allRows.forEach(r => tbody.appendChild(r));
      } else {
        if (headerRow) tbody.appendChild(headerRow);
        rowsToSort.forEach(r => tbody.appendChild(r));
      }

      // Re-index row headers consecutively (1, 2, 3...) AND update cell coordinates
      if (isExcel) {
        const theadThs = Array.from(table.querySelectorAll('thead th.excel-col-hdr'));
        const getColLetter = (cIdx) => {
          if (theadThs[cIdx - 1]) return theadThs[cIdx - 1].textContent.trim();
          let letter = '';
          let temp = cIdx - 1;
          while (temp >= 0) {
            letter = String.fromCharCode((temp % 26) + 65) + letter;
            temp = Math.floor(temp / 26) - 1;
          }
          return letter || 'A';
        };

        Array.from(tbody.querySelectorAll('tr')).forEach((r, idx) => {
          const rowNum = idx + 1;
          r.dataset.row = rowNum;
          const rh = r.querySelector('.excel-row-hdr');
          if (rh) {
            rh.textContent = rowNum;
            rh.dataset.row = rowNum;
          }
          // Update all data cells in this row to strictly reflect their true geometric coordinate
          const tds = Array.from(r.querySelectorAll('td'));
          tds.forEach((td, cIdx) => {
            const colLetter = getColLetter(cIdx + 1);
            td.dataset.coord = `${colLetter}${rowNum}`;
          });
        });

        // Update coordinate box to active cell's coordinate
        if (window._activeExcelCell && table.contains(window._activeExcelCell)) {
          const coordBox = table.closest('.excel-spreadsheet-container')?.querySelector('.excel-coord-box');
          if (coordBox) coordBox.value = window._activeExcelCell.dataset.coord || '';
        }
      }

      notifyChange();
      saveSnapshot(true);
      showToast(`Sorted spreadsheet data ${isDesc ? 'Descending (Z to A)' : 'Ascending (A to Z)'} on Column ${colIndex}`, 'success');
      return;
    }

    if (sel && !sel.isCollapsed && sel.toString().trim()) {
      const range = sel.getRangeAt(0);

      // 1. Check if selection is inside or spans a bullet/numbered list (ul or ol) (Issue 2.b)
      let list = node ? node.closest('ul, ol') : null;
      if (!list && range) {
        const common = range.commonAncestorContainer;
        list = common.closest ? common.closest('ul, ol') : common.parentElement?.closest('ul, ol');
      }

      if (list) {
        saveSnapshot(true);
        const allLis = Array.from(list.querySelectorAll(':scope > li'));
        let lisToSort = allLis.filter(li => range.intersectsNode(li));
        if (lisToSort.length <= 1) {
          lisToSort = allLis;
        }
        if (lisToSort.length > 1) {
          lisToSort.sort((a, b) => {
            const textA = (a.textContent || '').trim();
            const textB = (b.textContent || '').trim();
            return isDesc
              ? textB.localeCompare(textA, undefined, { numeric: true, sensitivity: 'base' })
              : textA.localeCompare(textB, undefined, { numeric: true, sensitivity: 'base' });
          });

          // Re-insert sorted lis at their original positions without destroying bullets/numbers
          const indices = allLis.map((li, idx) => lisToSort.includes(li) ? idx : -1).filter(i => i !== -1);
          indices.forEach((pos, idx) => {
            allLis[pos] = lisToSort[idx];
          });
          allLis.forEach(li => list.appendChild(li));

          notifyChange();
          saveSnapshot(true);
          showToast(`Sorted ${lisToSort.length} list items ${isDesc ? 'Descending (Z to A)' : 'Ascending (A to Z)'}`, 'success');
          return;
        }
      }

      // 2. Check if multiple distinct paragraphs or blocks are selected
      if (range) {
        const editorEl = editor || document.getElementById('editor');
        const blocks = [];
        const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_ELEMENT, null);
        let el = walker.currentNode;
        while (el) {
          if (range.intersectsNode(el) && ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(el.tagName.toLowerCase())) {
            if (el.parentElement === range.commonAncestorContainer || (editorEl && el.parentElement === editorEl) || el.parentElement?.classList?.contains('page-sheet') || el.parentElement?.classList?.contains('editor-page')) {
              if (!blocks.includes(el)) blocks.push(el);
            }
          }
          el = walker.nextNode();
        }

        if (blocks.length > 1) {
          saveSnapshot(true);
          const parent = blocks[0].parentElement;
          const refNode = blocks[blocks.length - 1].nextSibling;
          blocks.sort((a, b) => {
            const textA = (a.textContent || '').trim();
            const textB = (b.textContent || '').trim();
            return isDesc
              ? textB.localeCompare(textA, undefined, { numeric: true, sensitivity: 'base' })
              : textA.localeCompare(textB, undefined, { numeric: true, sensitivity: 'base' });
          });
          blocks.forEach(b => parent.insertBefore(b, refNode));
          notifyChange();
          saveSnapshot(true);
          showToast(`Sorted ${blocks.length} paragraphs ${isDesc ? 'Descending (Z to A)' : 'Ascending (A to Z)'}`, 'success');
          return;
        }
      }

      // 3. Fallback for text lines within a single block
      saveSnapshot(true);
      const text = sel.toString();
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length <= 1) {
        showToast('Select multiple lines or list items to sort', 'info');
        return;
      }
      lines.sort((a, b) => {
        return isDesc
          ? b.trim().localeCompare(a.trim(), undefined, { numeric: true })
          : a.trim().localeCompare(b.trim(), undefined, { numeric: true });
      });
      insertHtmlAtCursor(lines.map(l => escHtml(l)).join('<br>'));
      notifyChange();
      saveSnapshot(true);
      showToast(`Sorted ${lines.length} lines ${isDesc ? 'Descending (Z to A)' : 'Ascending (A to Z)'}`, 'success');
      return;
    }

    showToast('Select lines of text or click inside a table to sort', 'info');
  }

  // Apply Colorful Text Shadows (Issue 2)
  function applyTextShadow(shadowValue) {
    if (window.DocFlow.currentMode !== 'edit' || !editor) return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      showToast('Select text first to apply text shadow', 'info');
      return;
    }

    if (!shadowValue || shadowValue === 'none') {
      const parentSpan = sel.anchorNode?.parentElement;
      if (parentSpan && parentSpan.tagName === 'SPAN' && parentSpan.style.textShadow) {
        parentSpan.style.textShadow = '';
        notifyChange();
        showToast('Text shadow removed', 'info');
        return;
      }
      const range = sel.getRangeAt(0);
      const ancestor = range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
      const shadowSpan = ancestor?.closest?.('span[style*="text-shadow"]');
      if (shadowSpan) {
        shadowSpan.style.textShadow = '';
        notifyChange();
        showToast('Text shadow removed', 'info');
        return;
      }
      showToast('No shadow found on selection', 'info');
      return;
    }

    if (sel.isCollapsed) {
      showToast('Highlight text first to apply colorful shadow', 'info');
      return;
    }

    saveSnapshot();
    const range = sel.getRangeAt(0);
    const parentSpan = sel.anchorNode?.parentElement;
    if (parentSpan && parentSpan.tagName === 'SPAN' && parentSpan.textContent === sel.toString()) {
      parentSpan.style.textShadow = shadowValue;
      notifyChange();
      showToast('Applied colorful text shadow', 'success');
      return;
    }

    const span = document.createElement('span');
    span.style.textShadow = shadowValue;
    const contents = range.extractContents();
    span.appendChild(contents);
    range.insertNode(span);
    notifyChange();
    showToast('Applied colorful text shadow', 'success');
  }

  // Toggle PowerPoint-Style Text Drop Shadow (Issue 3 replacement / backward compatibility)
  function toggleTextShadow() {
    applyTextShadow('2px 2px 4px rgba(0, 0, 0, 0.45)');
  }

  // Word Wrap Toggle (Notepad style — expands editor page width when unwrapped)
  function toggleWordWrap() {
    if (!editor) return;
    const btn = $('#wordWrapBtn');
    const isNowrap = editor.classList.contains('no-wrap-mode') || editor.style.whiteSpace === 'nowrap';
    if (isNowrap) {
      editor.classList.remove('no-wrap-mode');
      editor.style.whiteSpace = 'normal';
      editor.style.wordBreak = 'break-word';
      btn?.classList.remove('active');
      showToast('Word Wrap: ON', 'info');
    } else {
      editor.classList.add('no-wrap-mode');
      editor.style.whiteSpace = 'pre';
      editor.style.wordBreak = 'normal';
      btn?.classList.add('active');
      showToast('Word Wrap: OFF (Page auto-expands & scrolls horizontally)', 'info');
    }
    notifyChange();
  }

  // Column Break insertion (Custom visual separator line in editor, break in print)
  function insertColumnBreak() {
    if (window.DocFlow.currentMode !== 'edit' || !editor) {
      showToast('Open a document in edit mode first', 'info');
      return;
    }
    const html = '<div class="doc-column-break" contenteditable="false"><i class="fas fa-arrows-split-up-and-left" style="margin-right:6px;"></i>Column Break</div><p><br></p>';
    insertHtmlAtCursor(html);
    notifyChange();
    showToast('Column break inserted (content flows to next column)', 'info');
  }

  // Floating Link Bubble
  let activeLinkBubble = null;
  function removeLinkBubble() {
    if (activeLinkBubble) {
      activeLinkBubble.remove();
      activeLinkBubble = null;
    }
  }

  function showLinkBubble(anchor, href) {
    removeLinkBubble();

    const bubble = document.createElement('div');
    bubble.className = 'df-link-bubble';
    bubble.innerHTML = `
      <a href="${escHtml(href)}" target="_blank" rel="noopener" title="${escHtml(href)}">${escHtml(href)}</a>
      <button type="button" class="df-link-open-btn" title="Open Link in new tab"><i class="fas fa-arrow-up-right-from-square"></i> Open</button>
      <button type="button" class="df-link-unlink-btn" title="Remove hyperlink"><i class="fas fa-link-slash"></i> Unlink</button>
    `;

    document.body.appendChild(bubble);
    activeLinkBubble = bubble;

    const rect = anchor.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();

    let top = rect.bottom + 6;
    let left = rect.left;
    if (left + bubbleRect.width > window.innerWidth - 12) {
      left = window.innerWidth - bubbleRect.width - 12;
    }
    if (left < 10) left = 10;
    if (top + bubbleRect.height > window.innerHeight - 10) {
      top = rect.top - bubbleRect.height - 6;
    }

    bubble.style.top = top + 'px';
    bubble.style.left = left + 'px';

    bubble.querySelector('.df-link-open-btn').addEventListener('click', e => {
      e.stopPropagation();
      window.open(href, '_blank', 'noopener,noreferrer');
      removeLinkBubble();
    });

    bubble.querySelector('.df-link-unlink-btn').addEventListener('click', e => {
      e.stopPropagation();
      const text = anchor.textContent;
      anchor.replaceWith(document.createTextNode(text));
      removeLinkBubble();
      notifyChange();
      showToast('Hyperlink removed', 'info');
    });
  }

  // Setup Toolbar Controls
  function initEditor() {
    if (!editor) return;

    // Formatting Buttons (data-cmd)
    $$('.fmt-btn[data-cmd]').forEach(btn => {
      btn.addEventListener('mousedown', e => e.preventDefault());
      btn.addEventListener('click', () => {
        execCmd(btn.dataset.cmd);
      });
    });

    // Clear All Formatting (Problem 1.6 & 5: With warning confirmation dialog)
    $('#removeFormatBtn')?.addEventListener('click', () => {
      openModal('#clearFormatModal');
    });
    $('#clearFormatCancel')?.addEventListener('click', () => {
      closeModal('#clearFormatModal');
    });
    $('#clearFormatConfirm')?.addEventListener('click', () => {
      executeClearFormatting();
    });

    // Change Case Popover (Positioned above editor, persists text selection)
    const changeCaseBtn = $('#changeCaseBtn');
    const casePopover = $('#casePopover');
    if (changeCaseBtn && casePopover) {
      changeCaseBtn.addEventListener('mousedown', () => saveSelection());
      changeCaseBtn.addEventListener('click', e => {
        e.stopPropagation();
        saveSelection();
        const wasOpen = casePopover.classList.contains('show');
        if (window.DocFlow?.UI?.closeAllPopovers) window.DocFlow.UI.closeAllPopovers();
        if (!wasOpen) {
          if (window.DocFlow?.UI?.positionPopover) {
            window.DocFlow.UI.positionPopover(changeCaseBtn, casePopover);
          } else {
            casePopover.classList.add('show');
          }
        } else {
          casePopover.classList.remove('show');
        }
      });
      $$('#casePopover .spacing-opt-item').forEach(item => {
        item.addEventListener('mousedown', e => e.preventDefault());
        item.addEventListener('click', e => {
          e.stopPropagation();
          changeTextCase(item.dataset.case);
          casePopover.classList.remove('show');
        });
      });
    }

    // Format Painter & Word Wrap & Column Break
    $('#formatPainterBtn')?.addEventListener('click', toggleFormatPainter);
    $('#formatPainterBtn')?.addEventListener('dblclick', resetFormatPainter);
    $('#wordWrapBtn')?.addEventListener('click', toggleWordWrap);
    $('#layoutColumnBreakBtn')?.addEventListener('click', insertColumnBreak);
    $('#popoverColumnBreakItem')?.addEventListener('click', () => {
      insertColumnBreak();
      $('#columnsPopover')?.classList.remove('show');
    });

    // Home Menu Sort Dropdown (Ascending / Descending) (Issue 4)
    const sortBtn = $('#homeExcelSortBtn');
    const sortPopover = $('#sortPopover');
    if (sortBtn && sortPopover) {
      sortBtn.addEventListener('mousedown', () => saveSelection());
      sortBtn.addEventListener('click', e => {
        e.stopPropagation();
        const wasOpen = sortPopover.classList.contains('show');
        if (window.DocFlow?.UI?.closeAllPopovers) window.DocFlow.UI.closeAllPopovers();
        if (!wasOpen) {
          if (window.DocFlow?.UI?.positionPopover) {
            window.DocFlow.UI.positionPopover(sortBtn, sortPopover);
          } else {
            sortPopover.classList.add('show');
          }
        }
      });

      $('#sortAscBtn')?.addEventListener('click', e => {
        e.stopPropagation();
        sortPopover.classList.remove('show');
        restoreSelection();
        sortSelectedTextOrTable('asc');
      });

      $('#sortDescBtn')?.addEventListener('click', e => {
        e.stopPropagation();
        sortPopover.classList.remove('show');
        restoreSelection();
        sortSelectedTextOrTable('desc');
      });
    }
    $('#homePptShadowBtn')?.addEventListener('click', toggleTextShadow);

    // Font Family Popover & Input Box Controls
    const fontFamilyBtn = $('#fontFamilyBtn');
    const fontFamilyInput = $('#fontFamilyInput');
    const fontFamilyPopover = $('#fontFamilyPopover');

    function applySelectedFont(fontVal, fontName) {
      if (!fontVal) return;
      saveSnapshot();
      window._activeExcelFontFamily = fontVal;
      if (fontFamilyInput) {
        fontFamilyInput.value = fontName || fontVal.replace(/['"]/g, '').split(',')[0].trim();
        fontFamilyInput.style.fontFamily = fontVal;
      }
      const fontLabel = $('#fontFamilyLabel');
      if (fontLabel) {
        fontLabel.textContent = fontName || fontVal;
        fontLabel.style.fontFamily = fontVal;
      }
      const excelContainer = document.querySelector('.excel-spreadsheet-container');
      if (excelContainer) {
        excelContainer.style.setProperty('--excel-default-font', fontVal);
        const gridTable = excelContainer.querySelector('.excel-grid-table');
        if (gridTable) gridTable.style.fontFamily = fontVal;
      }
      if (window._activeExcelCell && window._activeExcelCell.tagName === 'TD') {
        window._activeExcelCell.style.fontFamily = fontVal;
      }
      const excelCells = getSelectedExcelCells();
      if (excelCells.length > 0) {
        excelCells.forEach(c => { c.style.fontFamily = fontVal; });
        notifyChange();
        saveSnapshot();
        updateToolbarState();
      } else if (window.DocFlow.currentMode === 'edit') {
        restoreSelection();
        const sel = window.getSelection();
        if (sel && sel.isCollapsed && sel.rangeCount > 0) {
          let node = sel.getRangeAt(0).startContainer;
          if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
          const block = node?.closest('p, div, h1, h2, h3, h4, h5, h6, li, td, th');
          if (block && editor.contains(block)) {
            block.style.fontFamily = fontVal;
          } else {
            document.execCommand('fontName', false, fontVal);
          }
        } else {
          document.execCommand('fontName', false, fontVal);
        }
        notifyChange();
        saveSnapshot();
        updateToolbarState();
      }
      $$('#fontFamilyPopover .spacing-opt-item').forEach(el => {
        el.classList.toggle('active', el.dataset.font === fontVal || el.dataset.name?.toLowerCase() === (fontName || '').toLowerCase());
      });
      fontFamilyPopover?.classList.remove('show');
      showToast(`Font family set: ${fontName || fontVal}`, 'info');
      focusEditor();
    }

    if (fontFamilyBtn) {
      fontFamilyBtn.addEventListener('mousedown', e => {
        e.preventDefault();
        saveSelection();
      });
      fontFamilyBtn.addEventListener('click', e => {
        e.stopPropagation();
        saveSelection();
        if (fontFamilyPopover?.classList.contains('show')) {
          fontFamilyPopover.classList.remove('show');
        } else if (fontFamilyPopover) {
          window.DocFlow?.UI?.positionPopover?.(fontFamilyBtn, fontFamilyPopover);
        }
      });
    }

    if (fontFamilyInput) {
      fontFamilyInput.addEventListener('mousedown', () => saveSelection());
      fontFamilyInput.addEventListener('focus', () => {
        saveSelection();
        if (fontFamilyPopover && !fontFamilyPopover.classList.contains('show')) {
          window.DocFlow?.UI?.positionPopover?.(fontFamilyInput, fontFamilyPopover);
        }
      });
      fontFamilyInput.addEventListener('input', () => {
        const query = fontFamilyInput.value.trim().toLowerCase();
        if (fontFamilyPopover && !fontFamilyPopover.classList.contains('show')) {
          window.DocFlow?.UI?.positionPopover?.(fontFamilyInput, fontFamilyPopover);
        }
        const items = Array.from(fontFamilyPopover.querySelectorAll('.font-opt-item'));
        items.sort((a, b) => {
          const nameA = (a.dataset.name || '').toLowerCase();
          const nameB = (b.dataset.name || '').toLowerCase();
          const matchA = nameA.startsWith(query) ? 2 : (nameA.includes(query) ? 1 : 0);
          const matchB = nameB.startsWith(query) ? 2 : (nameB.includes(query) ? 1 : 0);
          if (matchA !== matchB) return matchB - matchA;
          return nameA.localeCompare(nameB);
        });
        items.forEach(item => {
          const name = (item.dataset.name || '').toLowerCase();
          const matches = !query || name.includes(query);
          item.style.display = matches ? 'flex' : 'none';
          fontFamilyPopover.appendChild(item);
        });
      });
      fontFamilyInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const query = fontFamilyInput.value.trim();
          const matched = Array.from(fontFamilyPopover.querySelectorAll('.font-opt-item')).find(item => {
            const name = (item.dataset.name || '').toLowerCase();
            return name === query.toLowerCase() || name.startsWith(query.toLowerCase());
          });
          if (matched) {
            applySelectedFont(matched.dataset.font, matched.dataset.name);
          } else if (query) {
            applySelectedFont(`"${query}", sans-serif`, query);
          }
        }
      });
    }

    $$('#fontFamilyPopover .spacing-opt-item[data-font]').forEach(item => {
      item.addEventListener('click', () => {
        applySelectedFont(item.dataset.font, item.dataset.name || item.textContent.trim());
      });
    });

    // Number Type Font Size Input & Stepper Buttons (No Limit)
    const fontSizeInput = $('#fontSizeInput');
    const fontSizeDec = $('#fontSizeDec');
    const fontSizeInc = $('#fontSizeInc');

    if (fontSizeInput) {
      fontSizeInput.addEventListener('mousedown', () => saveSelection());
      fontSizeInput.addEventListener('change', function () {
        setFontSize(this.value);
      });
      fontSizeInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          setFontSize(this.value);
        }
      });
    }

    if (fontSizeDec) {
      fontSizeDec.addEventListener('mousedown', e => e.preventDefault());
      fontSizeDec.addEventListener('click', () => {
        const cur = parseInt(fontSizeInput?.value, 10) || 15;
        setFontSize(Math.max(1, cur - 1));
      });
    }

    if (fontSizeInc) {
      fontSizeInc.addEventListener('mousedown', e => e.preventDefault());
      fontSizeInc.addEventListener('click', () => {
        const cur = parseInt(fontSizeInput?.value, 10) || 15;
        setFontSize(cur + 1);
      });
    }

    // Backward compatibility for old fontSize dropdown if present
    const oldFontSize = $('#fontSize');
    if (oldFontSize) {
      oldFontSize.addEventListener('focus', () => saveSelection());
      oldFontSize.addEventListener('mousedown', () => saveSelection());
      oldFontSize.addEventListener('change', function () {
        if (window.DocFlow.currentMode !== 'edit') return;
        restoreSelection();
        document.execCommand('fontSize', false, this.value);
        notifyChange();
        updateToolbarState();
      });
    }

    // Heading Select — saves selection on focus and mousedown, restores on change
    const headingSelect = $('#headingSelect');
    if (headingSelect) {
      headingSelect.addEventListener('focus', () => saveSelection());
      headingSelect.addEventListener('mousedown', () => saveSelection());
      headingSelect.addEventListener('change', function () {
        if (window.DocFlow.currentMode !== 'edit') return;
        restoreSelection();
        const val = this.value;
        document.execCommand('formatBlock', false, val === 'p' ? '<p>' : `<${val}>`);
        notifyChange();
        updateToolbarState();
        showToast(`Heading set to ${val === 'p' ? 'Normal Paragraph' : val.toUpperCase()}`, 'info');
        if (window.DocFlow.Find) window.DocFlow.Find.scheduleOutlineUpdate();
      });
    }

    // Bullets & Numbering Dropdown Popover
    const bulletDropdownBtn = $('#bulletDropdownBtn');
    const bulletPopover = $('#bulletPopover');
    if (bulletDropdownBtn && bulletPopover) {
      bulletDropdownBtn.addEventListener('click', e => {
        e.stopPropagation();
        saveSelection();
        const wasOpen = bulletPopover.classList.contains('show');
        if (window.DocFlow?.UI?.closeAllPopovers) window.DocFlow.UI.closeAllPopovers();
        if (!wasOpen) {
          if (window.DocFlow?.UI?.positionPopover) {
            window.DocFlow.UI.positionPopover(bulletDropdownBtn, bulletPopover);
          } else {
            bulletPopover.classList.add('show');
          }
        }
      });

      $$('.bullet-opt-card').forEach(card => {
        card.addEventListener('click', () => {
          const listType = card.dataset.listType;
          restoreSelection();
          applyListStyle(listType);
          bulletPopover.classList.remove('show');
        });
      });
    }

    // Line Spacing Popover
    const lineSpacingBtn = $('#lineSpacingBtn');
    const spacingPopover = $('#spacingPopover');
    if (lineSpacingBtn && spacingPopover) {
      lineSpacingBtn.addEventListener('click', e => {
        e.stopPropagation();
        saveSelection();
        const wasOpen = spacingPopover.classList.contains('show');
        if (window.DocFlow?.UI?.closeAllPopovers) window.DocFlow.UI.closeAllPopovers();
        if (!wasOpen) {
          if (window.DocFlow?.UI?.positionPopover) {
            window.DocFlow.UI.positionPopover(lineSpacingBtn, spacingPopover);
          } else {
            spacingPopover.classList.add('show');
          }
        }
      });

      $$('.spacing-opt-item').forEach(item => {
        item.addEventListener('click', () => {
          const val = item.dataset.spacing;
          restoreSelection();
          applyLineSpacing(val);
          spacingPopover.classList.remove('show');
        });
      });
    }

    // Close Popovers on Outside Click
    document.addEventListener('click', e => {
      if (!e.target.closest('.bullet-dropdown-wrap')) {
        bulletPopover?.classList.remove('show');
        spacingPopover?.classList.remove('show');
      }
    });

    // Clipboard Buttons (Cut, Copy, Paste)
    $('#btnCut')?.addEventListener('click', () => {
      focusEditor();
      try {
        document.execCommand('cut');
        showToast('Cut to clipboard', 'info');
      } catch (e) {
        showToast('Use Ctrl+X to cut', 'info');
      }
    });

    $('#btnCopy')?.addEventListener('click', () => {
      const selLine = window.DocFlow?.ImageManager?.getSelectedLine?.();
      const selImg = window.DocFlow?.ImageManager?.getSelectedImage?.();

      if (selLine) {
        const clone = selLine.cloneNode(true);
        clone.classList.remove('df-selected-line');
        const cleanHtml = clone.outerHTML;
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(cleanHtml);
        }
        showToast(window.DocFlow.ImageManager?.isNoteElement?.(selLine) ? 'Note copied' : 'Line copied', 'info');
        return;
      }
      if (selImg) {
        const clone = selImg.cloneNode(true);
        clone.classList.remove('df-selected-image');
        clone.querySelectorAll?.('.df-img-toolbar, .df-resize-handle, .df-img-move-handle').forEach(h => h.remove());
        const cleanHtml = clone.outerHTML;
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(cleanHtml);
        }
        showToast('Element copied to clipboard', 'info');
        return;
      }

      focusEditor();
      try {
        document.execCommand('copy');
        showToast('Copied to clipboard', 'info');
      } catch (e) {
        showToast('Use Ctrl+C to copy', 'info');
      }
    });

    $('#btnPaste')?.addEventListener('click', async () => {
      focusEditor();
      try {
        if (navigator.clipboard) {
          if (navigator.clipboard.read) {
            try {
              const items = await navigator.clipboard.read();
              for (const item of items) {
                if (item.types.includes('text/html')) {
                  const blob = await item.getType('text/html');
                  const html = await blob.text();
                  if (html) {
                    const temp = document.createElement('div');
                    temp.innerHTML = html;
                    temp.querySelectorAll('script, meta, link, iframe, object, embed, applet').forEach(el => el.remove());
                    temp.querySelectorAll('*').forEach(el => {
                      [...el.attributes].forEach(attr => {
                        const name = attr.name.toLowerCase();
                        if (name.startsWith('on') || (name === 'href' && attr.value.trim().toLowerCase().startsWith('javascript:'))) {
                          el.removeAttribute(attr.name);
                        }
                      });
                    });
                    insertHtmlAtCursor(temp.innerHTML);
                    notifyChange();
                    setTimeout(() => window.DocFlow.ImageManager?.initImageManager?.(), 50);
                    showToast('Pasted visual element', 'success');
                    return;
                  }
                }
              }
            } catch (err) { }
          }

          if (navigator.clipboard.readText) {
            const text = await navigator.clipboard.readText();
            if (text) {
              if (/<(table|img|svg|div class="doc-shape|div class="doc-chart|div class="doc-custom-note|div class="doc-interactive-note|div class="onenote-sticky-note|hr class="doc-custom-line|p|div)[^>]*>/i.test(text)) {
                const temp = document.createElement('div');
                temp.innerHTML = text;
                temp.querySelectorAll('script, meta, link, iframe, object, embed, applet').forEach(el => el.remove());
                insertHtmlAtCursor(temp.innerHTML);
                notifyChange();
                setTimeout(() => window.DocFlow.ImageManager?.initImageManager?.(), 50);
                showToast('Pasted visual element', 'success');
                return;
              } else {
                insertHtmlAtCursor(escHtml(text).replace(/\n/g, '<br>'));
                showToast('Pasted from clipboard', 'info');
                return;
              }
            }
          }
        }
        document.execCommand('paste');
      } catch (e) {
        showToast('Use Ctrl+V to paste', 'info');
      }
    });

    // Additional Dialog Setups
    setupColorPickers();
    setupTableInsert();
    setupTableResizing();
    setupLinkInsert();
    setupHrAndQuote();
    setupClickAndType();

    // Click-and-Type Anywhere (Issue 3: DOCX, PPTX, MD, HTML, TXT)
    function setupClickAndType() {
      if (!editor) return;

      editor.addEventListener('dblclick', (e) => {
        if (window.DocFlow.currentMode !== 'edit') return;
        if (document.body.classList.contains('reading-mode')) return;

        // Do not trigger in Excel spreadsheet mode or on UI controls / handles
        if (document.querySelector('.excel-spreadsheet-container') || e.target.closest('.excel-spreadsheet-container, .excel-grid-table')) return;
        if (e.target.closest('.df-resize-handle, .df-img-toolbar, .df-img-move-handle, .df-line-move-handle, .df-line-resize-handle, .df-line-plus-btn, .df-line-popover, .df-table-move-handle, .df-table-corner-handle, .quick-tools, .context-menu')) return;

        // 1. PowerPoint Presentation Slides (PPTX / PPT)
        const slideCard = e.target.closest('.pptx-slide-card');
        if (slideCard) {
          const existingText = e.target.closest('.pptx-slide-title, .pptx-slide-body, .slide-content-box, p, h1, h2, h3, li');
          if (existingText && existingText !== slideCard && existingText.textContent.trim().length > 0) {
            return;
          }

          const sRect = slideCard.getBoundingClientRect();
          const clickX = Math.max(24, Math.min(sRect.width - 180, Math.round(e.clientX - sRect.left)));
          const clickY = Math.max(24, Math.min(sRect.height - 40, Math.round(e.clientY - sRect.top)));

          saveSnapshot(true);
          const newBox = document.createElement('div');
          newBox.className = 'slide-content-box pptx-slide-body';
          newBox.contentEditable = 'true';
          newBox.style.cssText = `position:absolute;left:${clickX}px;top:${clickY}px;min-width:140px;min-height:28px;outline:none;font-size:16px;color:var(--text-primary);z-index:15;padding:2px 6px;box-sizing:border-box;`;
          newBox.innerHTML = '<p><br></p>';
          slideCard.appendChild(newBox);

          const p = newBox.querySelector('p') || newBox;
          const range = document.createRange();
          range.setStart(p, 0);
          range.collapse(true);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          newBox.focus();
          notifyChange();
          saveSnapshot(true);
          return;
        }

        // 2. Flow Documents: DOCX, MD, HTML, TXT (Pages or continuous flow)
        const page = e.target.closest('.page-sheet, .editor-page') || editor;
        const blocks = Array.from(page.querySelectorAll(':scope > p, :scope > div:not(.doc-page-break):not(.page-header):not(.page-footer), :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6, :scope > ul, :scope > ol, :scope > table, :scope > blockquote, :scope > section'));

        const pRect = page.getBoundingClientRect();
        const padLeft = parseFloat(getComputedStyle(page).paddingLeft) || 36;
        const rawIndent = e.clientX - pRect.left - padLeft;
        const indent = Math.max(0, Math.min(Math.round(pRect.width - padLeft - 100), Math.round(rawIndent)));

        if (blocks.length > 0) {
          const lastBlock = blocks[blocks.length - 1];
          const lastRect = lastBlock.getBoundingClientRect();

          // If double-clicked in empty space below the last block on this page/editor
          if (e.clientY > lastRect.bottom + 8) {
            saveSnapshot(true);
            const gap = e.clientY - lastRect.bottom;
            const linesCount = Math.max(1, Math.min(30, Math.floor(gap / 26)));

            for (let i = 0; i < linesCount - 1; i++) {
              const emptyP = document.createElement('p');
              emptyP.innerHTML = '<br>';
              page.appendChild(emptyP);
            }

            const targetP = document.createElement('p');
            targetP.innerHTML = '<br>';
            if (indent > 30) {
              targetP.style.marginLeft = indent + 'px';
            }
            page.appendChild(targetP);

            const r = document.createRange();
            r.setStart(targetP, 0);
            r.collapse(true);
            const s = window.getSelection();
            s.removeAllRanges();
            s.addRange(r);
            targetP.focus();
            notifyChange();
            saveSnapshot(true);
            return;
          }

          // If double-clicked in empty space to the right of an existing block
          const targetBlock = blocks.find(b => {
            const br = b.getBoundingClientRect();
            return e.clientY >= br.top && e.clientY <= br.bottom;
          });

          if (targetBlock) {
            const tRect = targetBlock.getBoundingClientRect();
            if (e.clientX > tRect.left + (targetBlock.scrollWidth || 0) + 16) {
              saveSnapshot(true);
              const targetP = document.createElement('p');
              targetP.innerHTML = '<br>';
              if (indent > 30) {
                targetP.style.marginLeft = indent + 'px';
              }
              targetBlock.insertAdjacentElement('afterend', targetP);

              const r = document.createRange();
              r.setStart(targetP, 0);
              r.collapse(true);
              const s = window.getSelection();
              s.removeAllRanges();
              s.addRange(r);
              targetP.focus();
              notifyChange();
              saveSnapshot(true);
              return;
            }
          }
        } else {
          // Page/editor is completely blank
          saveSnapshot(true);
          const targetP = document.createElement('p');
          targetP.innerHTML = '<br>';
          if (indent > 30) {
            targetP.style.marginLeft = indent + 'px';
          }
          page.appendChild(targetP);

          const r = document.createRange();
          r.setStart(targetP, 0);
          r.collapse(true);
          const s = window.getSelection();
          s.removeAllRanges();
          s.addRange(r);
          targetP.focus();
          notifyChange();
          saveSnapshot(true);
          return;
        }

        // Fallback: place caret using browser caretFromPoint
        let range = null;
        if (document.caretRangeFromPoint) {
          range = document.caretRangeFromPoint(e.clientX, e.clientY);
        } else if (document.caretPositionFromPoint) {
          const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
          if (pos) {
            range = document.createRange();
            range.setStart(pos.offsetNode, pos.offset);
            range.collapse(true);
          }
        }
        if (range && editor.contains(range.commonAncestorContainer)) {
          const s = window.getSelection();
          s.removeAllRanges();
          s.addRange(range);
          focusEditor();
        }
      });
    }

    // Universal focus protection: prevent clicking ribbon/toolbar buttons/popovers/steppers from stealing editor focus
    document.addEventListener('mousedown', e => {
      const isControl = e.target.closest('.ribbon-container, .topbar, .quick-tools, .spacing-popover, .status-bar, .context-menu');
      const isEditableInput = e.target.closest('input:not([readonly]), textarea, select, [contenteditable="true"]');
      if (isControl && !isEditableInput) {
        if (window.DocFlow.currentMode === 'edit') {
          saveSelection();
        }
        e.preventDefault();
      }
    }, true);

    // Continuous Caret & Selection Tracking (Issue 2)
    document.addEventListener('selectionchange', () => {
      if (window.DocFlow.currentMode === 'edit' && editor && editor.contains(window.getSelection()?.anchorNode)) {
        saveSelection();
      }
    });

    // Read Mode Editing Prevention
    editor.addEventListener('beforeinput', e => {
      if (document.body.classList.contains('reading-mode')) {
        e.preventDefault();
        showToast('Document editing is disabled in Read Mode', 'warning');
      }
    }, true);

    let typingBatchChars = 0;
    let typingLastTime = 0;

    // Editor Events & Granular History Tracking
    editor.addEventListener('input', (e) => {
      saveSelection();
      notifyChange();

      const isBreakChar = e.data === ' ' || e.data === '\n' || e.inputType === 'insertParagraph' ||
                          e.data === '.' || e.data === ',' || e.data === '!' || e.data === '?' ||
                          e.data === ';' || e.data === ':';

      if (isBreakChar) {
        saveSnapshot();
        typingBatchChars = 0;
      } else {
        typingBatchChars++;
        const now = Date.now();
        if (typingBatchChars >= 8 || (now - typingLastTime > 1200 && typingBatchChars > 0)) {
          saveSnapshot();
          typingBatchChars = 0;
          typingLastTime = now;
        } else {
          debouncedSnapshot(400);
        }
      }
    });

    // Granular undo/redo on word boundaries, spaces, punctuation and enter
    editor.addEventListener('keydown', e => {
      if (document.body.classList.contains('reading-mode')) {
        const modKeys = ['Backspace', 'Delete', 'Enter', 'Tab'];
        if (modKeys.includes(e.key) || (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1)) {
          e.preventDefault();
          showToast('Document editing is disabled in Read Mode', 'warning');
          return;
        }
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (!editor._inDeleteSeq) {
          saveSnapshot();
          editor._inDeleteSeq = true;
          clearTimeout(editor._deleteSeqTimer);
          editor._deleteSeqTimer = setTimeout(() => { editor._inDeleteSeq = false; saveSnapshot(); }, 500);
        }
      }
    });

    editor.addEventListener('mouseup', () => {
      saveSelection();
      applyFormatPainterToSelection();
      updateToolbarState();
      updateCursorPos();
    });

    editor.addEventListener('keyup', () => {
      saveSelection();
      updateToolbarState();
      updateCursorPos();
    });

    editor.addEventListener('click', e => {
      updateCursorPos();
      const link = e.target.closest('a');
      if (link && editor.contains(link)) {
        const href = link.getAttribute('href');
        if (href) {
          showLinkBubble(link, href);
          // If clicked in read-only mode or with Ctrl/Cmd key: redirect immediately
          if (e.ctrlKey || e.metaKey || window.DocFlow.currentMode !== 'edit') {
            e.preventDefault();
            window.open(href, '_blank', 'noopener,noreferrer');
          }
        }
      } else if (!e.target.closest('.df-link-bubble')) {
        removeLinkBubble();
      }
    });

    // Tab key inserts 4 non-breaking spaces & Contextual Ctrl+A (Issue 5)
    editor.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        insertHtmlAtCursor('&nbsp;&nbsp;&nbsp;&nbsp;');
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        const excelContainer = editor.querySelector('.excel-spreadsheet-container') || e.target.closest('.excel-spreadsheet-container');
        if (excelContainer) {
          e.preventDefault();
          e.stopPropagation();
          const table = excelContainer.querySelector('.excel-grid-table');
          if (table) {
            const allTds = table.querySelectorAll('tbody td');
            allTds.forEach(td => td.classList.add('excel-cell-selected'));
            showToast(`All ${allTds.length} spreadsheet cells selected`, 'info');
            updateToolbarState();
          }
          return;
        }
        const sel = window.getSelection();
        if (sel && sel.rangeCount) {
          let node = sel.getRangeAt(0).commonAncestorContainer;
          if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;

          // 1. If inside an inner sub-container (rectangle, card, title box, content box, table cell, quote)
          const subContainer = node.closest(
            '.slide-freeform-rect, .slide-nested-card, .slide-title-box, .slide-content-box, td, th, blockquote, .doc-shape-container'
          );
          if (subContainer) {
            e.preventDefault();
            e.stopPropagation();
            const range = document.createRange();
            range.selectNodeContents(subContainer);
            sel.removeAllRanges();
            sel.addRange(range);
            return;
          }

          // 2. If inside a PPT slide card / wrapper
          const slideCard = node.closest('.pptx-slide-card') || node.closest('.pptx-slide-wrapper');
          if (slideCard) {
            e.preventDefault();
            e.stopPropagation();
            const targetCard = slideCard.classList.contains('pptx-slide-card') ? slideCard : (slideCard.querySelector('.pptx-slide-card') || slideCard);
            const range = document.createRange();
            range.selectNodeContents(targetCard);
            sel.removeAllRanges();
            sel.addRange(range);
            return;
          }
        }
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        const sel = window.getSelection();
        if (sel && sel.rangeCount) {
          const range = sel.getRangeAt(0);
          let node = range.commonAncestorContainer;
          if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
          const slideCard = node.closest('.pptx-slide-card');
          if (slideCard) {
            const cardText = slideCard.textContent.trim();
            const selText = sel.toString().trim();
            const isFullSelected = (selText && selText === cardText) ||
              (range.startContainer === slideCard && range.endContainer === slideCard) ||
              (range.commonAncestorContainer === slideCard && range.startOffset === 0 && range.endOffset >= slideCard.childNodes.length);

            if (isFullSelected || cardText.length <= 1) {
              e.preventDefault();
              e.stopPropagation();
              slideCard.innerHTML = '<p class="slide-placeholder-text" style="color:var(--text-muted);font-style:italic;margin:0;">Click to add content...</p>';
              const newRange = document.createRange();
              const p = slideCard.querySelector('.slide-placeholder-text');
              if (p) {
                newRange.selectNodeContents(p);
                newRange.collapse(true);
              }
              sel.removeAllRanges();
              sel.addRange(newRange);
              notifyChange();
              return;
            }
          }
        }
      }
    });

    // Global Keydown Handler for Ctrl+\ (Problem 5: Clear format warning)
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '\\' || e.code === 'Backslash')) {
        e.preventDefault();
        e.stopPropagation();
        openModal('#clearFormatModal');
        return;
      }
    });

    // Selection Change Listener (Keeps formatting buttons in sync with cursor & prevents lost focus - Issue 2)
    document.addEventListener('selectionchange', () => {
      if (window.DocFlow.currentMode !== 'edit') return;
      try {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && editor && (editor.contains(sel.getRangeAt(0).commonAncestorContainer) || editor === sel.getRangeAt(0).commonAncestorContainer)) {
          savedSelection = sel.getRangeAt(0).cloneRange();
        }
      } catch (e) { }
      clearTimeout(selChangeTimer);
      selChangeTimer = setTimeout(() => {
        try {
          const sel = window.getSelection();
          if (sel && sel.rangeCount && editor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
            updateToolbarState();
            updateCursorPos();
          }
        } catch (e) { }
      }, 100);
    });
  }

  // Export module
  window.DocFlow = window.DocFlow || {};
  window.DocFlow.Editor = {
    initEditor,
    saveSelection,
    restoreSelection,
    focusEditor,
    insertNodeAtCursor,
    insertHtmlAtCursor,
    execCmd,
    saveSnapshot,
    debouncedSnapshot,
    resetHistoryForTab,
    updateUndoRedoUI,
    undo,
    redo,
    updateCounts,
    updateCursorPos,
    updateToolbarState,
    notifyChange,
    setFontSize,
    applyListStyle,
    applyLineSpacing,
    clearFormatting,
    changeTextCase,
    toggleFormatPainter,
    resetFormatPainter,
    sortSelectedTextOrTable,
    applyTextShadow,
    toggleTextShadow,
    openLineModal,
    insertCustomLine,
    toggleWordWrap,
    insertColumnBreak
  };

})(window);
