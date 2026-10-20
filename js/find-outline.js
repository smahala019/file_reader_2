/**
 * DocFlow — Document Find & Replace, Outline Navigator, and Statistics
 */

(function (window) {
  'use strict';

  const { $, $$, escHtml, showToast, openModal, closeModal } = window.DocFlow.UI;

  const editor = $('#editor');
  const outlinePanel = $('#outlinePanel');
  const outlineList = $('#outlineList');
  const findBar = $('#findBar');
  const findInput = $('#findInput');
  const findCountEl = $('#findCount');

  let findHighlightSpans = [];
  let findCurrentIdx = -1;
  let outlineTimer = null;
  let findDebounceTimer = null;

  let pdfSearchResults = []; // [{ pageNum, count }]
  let pdfCurrentMatchIdx = -1;
  let pdfSearchGen = 0;

  // ==========================================================================
  // Document Search & Highlighting (Robust DOM Walker & PDF Content Search)
  // ==========================================================================

  function openFindBar(showReplace = false) {
    const hasDoc = !!window.DocFlow.UI?.Tabs?.activeId || window.DocFlow.currentMode !== 'empty' || !!document.querySelector('#editorWrap.visible, #pdfWrap.visible');
    if (!hasDoc) {
      showToast('Open or create a document first', 'info');
      return;
    }
    const isPdf = window.DocFlow.currentMode === 'view' || !!document.querySelector('#pdfWrap.visible');
    if (isPdf && showReplace) {
      showToast('PDF documents are view-only. Opened in Find mode.', 'info');
      showReplace = false;
    }
    if (!findBar) return;
    findBar.classList.add('open');
    const replaceRow = $('#replaceBarRow');
    if (replaceRow) {
      replaceRow.style.display = showReplace ? 'flex' : 'none';
    }

    if (findInput) {
      const sel = window.getSelection();
      if (sel && sel.toString().trim()) {
        findInput.value = sel.toString().trim();
        performFind();
      }
      if (showReplace && findInput.value.trim()) {
        const replaceInput = $('#replaceInput');
        if (replaceInput) {
          replaceInput.focus();
          replaceInput.select();
        }
      } else {
        findInput.focus();
        findInput.select();
      }
    }
    showToast(showReplace ? 'Find & Replace bar opened' : 'Find in document opened', 'info');
  }

  function toggleFindBar() {
    const hasDoc = !!window.DocFlow.UI?.Tabs?.activeId || window.DocFlow.currentMode !== 'empty' || !!document.querySelector('#editorWrap.visible, #pdfWrap.visible');
    if (!hasDoc) {
      showToast('Open or create a document first', 'info');
      return;
    }

    if (!findBar) return;
    const isOpen = findBar.classList.contains('open');

    if (isOpen) {
      closeFindBar();
    } else {
      openFindBar(false);
    }
  }

  function closeFindBar() {
    if (!findBar) return;
    const wasOpen = findBar.classList.contains('open');
    findBar.classList.remove('open');
    clearFindHighlights();
    clearPdfFindHighlights();
    if (wasOpen) showToast('Find bar closed', 'info');
    if (findInput) findInput.value = '';
    const replaceInput = $('#replaceInput');
    if (replaceInput) replaceInput.value = '';
    const replaceRow = $('#replaceBarRow');
    if (replaceRow) replaceRow.style.display = 'none';
    if (findCountEl) findCountEl.textContent = '0 results';
    findHighlightSpans = [];
    findCurrentIdx = -1;
    pdfSearchResults = [];
    pdfCurrentMatchIdx = -1;
  }

  function clearPdfFindHighlights() {
    document.querySelectorAll('.pdf-page-wrap.pdf-match-active').forEach(w => {
      w.classList.remove('pdf-match-active');
      w.style.boxShadow = '';
    });
  }

  function clearFindHighlights() {
    if (!editor) return;
    const spans = editor.querySelectorAll('span[data-df-find]');
    spans.forEach(s => {
      const parent = s.parentNode;
      if (parent) {
        while (s.firstChild) parent.insertBefore(s.firstChild, s);
        parent.removeChild(s);
        parent.normalize();
      }
    });
    findHighlightSpans = [];
  }

  function getCleanHtml() {
    if (!editor) return '';
    const clone = editor.cloneNode(true);
    clone.querySelectorAll('span[data-df-find]').forEach(s => {
      const parent = s.parentNode;
      if (parent) {
        while (s.firstChild) parent.insertBefore(s.firstChild, s);
        parent.removeChild(s);
        parent.normalize();
      }
    });
    // Remove image selection classes if present
    clone.querySelectorAll('.df-selected-img').forEach(img => {
      img.classList.remove('df-selected-img');
    });
    return clone.innerHTML;
  }

  async function performPdfFind(term) {
    const thisSearchGen = ++pdfSearchGen;
    clearPdfFindHighlights();
    pdfSearchResults = [];
    pdfCurrentMatchIdx = -1;

    const pdfDoc = window.DocFlow?.PDF?.getPdfDoc?.();
    if (!pdfDoc) {
      if (findCountEl) findCountEl.textContent = '0 results';
      return;
    }

    if (findCountEl) findCountEl.textContent = 'Searching PDF...';

    const lowerTerm = term.toLowerCase();
    const termLen = term.length;
    const numPages = pdfDoc.numPages || window.DocFlow?.PDF?.getTotalPages?.() || 1;
    const matches = [];
    let totalCount = 0;

    for (let p = 1; p <= numPages; p++) {
      if (thisSearchGen !== pdfSearchGen) return;
      try {
        const page = await pdfDoc.getPage(p);
        const textContent = await page.getTextContent({ normalizeWhitespace: true });
        let pageStr = '';
        if (textContent && textContent.items) {
          pageStr = textContent.items.map(item => item.str || '').join(' ');
        }
        const lowerPageStr = pageStr.toLowerCase();
        let matchCount = 0;
        let idx = lowerPageStr.indexOf(lowerTerm);
        while (idx !== -1) {
          matchCount++;
          idx = lowerPageStr.indexOf(lowerTerm, idx + termLen);
        }
        if (matchCount > 0) {
          totalCount += matchCount;
          matches.push({ pageNum: p, count: matchCount });
        }
      } catch (err) {
        // Continue searching other pages
      }
    }

    if (thisSearchGen !== pdfSearchGen) return;

    pdfSearchResults = matches;
    if (matches.length > 0) {
      pdfCurrentMatchIdx = 0;
      highlightPdfCurrentMatch(totalCount);
    } else {
      if (findCountEl) findCountEl.textContent = '0 results';
    }
  }

  function highlightPdfCurrentMatch(totalMatches) {
    if (pdfCurrentMatchIdx < 0 || pdfCurrentMatchIdx >= pdfSearchResults.length) return;
    clearPdfFindHighlights();

    const currentMatch = pdfSearchResults[pdfCurrentMatchIdx];
    const pageNum = currentMatch.pageNum;

    if (window.DocFlow?.PDF?.jumpToPage) {
      window.DocFlow.PDF.jumpToPage(pageNum);
    }

    const pageWrap = document.querySelector(`.pdf-page-wrap[data-page="${pageNum}"]`);
    if (pageWrap) {
      pageWrap.classList.add('pdf-match-active');
      pageWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
      pageWrap.style.boxShadow = '0 0 0 3px var(--accent, #e85d04)';
    }

    const total = totalMatches || pdfSearchResults.reduce((acc, m) => acc + m.count, 0);
    if (findCountEl) {
      findCountEl.textContent = `Page ${pageNum} (${pdfCurrentMatchIdx + 1} of ${pdfSearchResults.length} pages, ${total} matches)`;
    }
  }

  function performFind() {
    clearFindHighlights();
    clearPdfFindHighlights();
    findHighlightSpans = [];
    findCurrentIdx = -1;
    pdfSearchResults = [];
    pdfCurrentMatchIdx = -1;

    if (!findInput) return;
    const term = findInput.value.trim();
    if (!term) {
      if (findCountEl) findCountEl.textContent = '0 results';
      return;
    }

    // PDF View Mode
    if (window.DocFlow.currentMode === 'view') {
      performPdfFind(term);
      return;
    }

    if (!editor) return;

    // Collect all text nodes
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];
    while (walker.nextNode()) {
      if (walker.currentNode.textContent.trim()) {
        textNodes.push(walker.currentNode);
      }
    }

    const lowerTerm = term.toLowerCase();
    const termLen = term.length;

    textNodes.forEach(node => {
      let text = node.textContent;
      let lowerText = text.toLowerCase();
      let matchIdx = lowerText.indexOf(lowerTerm);
      if (matchIdx === -1) return;

      // Split node and wrap matches safely
      const parent = node.parentNode;
      if (!parent) return;

      const docFrag = document.createDocumentFragment();
      let lastIdx = 0;

      while (matchIdx !== -1) {
        // Text before match
        if (matchIdx > lastIdx) {
          docFrag.appendChild(document.createTextNode(text.substring(lastIdx, matchIdx)));
        }

        // Highlight span
        const span = document.createElement('span');
        span.className = 'df-find-match';
        span.dataset.dfFind = 'true';
        span.style.backgroundColor = 'rgba(232, 93, 4, 0.35)';
        span.style.borderRadius = '2px';
        span.style.padding = '1px 0';
        span.textContent = text.substr(matchIdx, termLen);
        docFrag.appendChild(span);
        findHighlightSpans.push(span);

        lastIdx = matchIdx + termLen;
        matchIdx = lowerText.indexOf(lowerTerm, lastIdx);
      }

      // Remaining text
      if (lastIdx < text.length) {
        docFrag.appendChild(document.createTextNode(text.substring(lastIdx)));
      }

      parent.replaceChild(docFrag, node);
    });

    const count = findHighlightSpans.length;
    if (findCountEl) {
      findCountEl.textContent = `${count} result${count !== 1 ? 's' : ''}`;
    }

    if (count > 0) {
      findCurrentIdx = 0;
      highlightCurrentMatch();
    }
  }

  function findNavigate(direction) {
    if (window.DocFlow.currentMode === 'view') {
      if (!pdfSearchResults.length) return;
      pdfCurrentMatchIdx += direction;
      if (pdfCurrentMatchIdx >= pdfSearchResults.length) pdfCurrentMatchIdx = 0;
      if (pdfCurrentMatchIdx < 0) pdfCurrentMatchIdx = pdfSearchResults.length - 1;
      highlightPdfCurrentMatch();
      return;
    }

    if (!findHighlightSpans.length) return;

    if (findCurrentIdx >= 0 && findCurrentIdx < findHighlightSpans.length) {
      findHighlightSpans[findCurrentIdx].style.backgroundColor = 'rgba(232, 93, 4, 0.35)';
    }

    findCurrentIdx += direction;
    if (findCurrentIdx >= findHighlightSpans.length) findCurrentIdx = 0;
    if (findCurrentIdx < 0) findCurrentIdx = findHighlightSpans.length - 1;

    highlightCurrentMatch();
  }

  function highlightCurrentMatch() {
    if (findCurrentIdx < 0 || findCurrentIdx >= findHighlightSpans.length) return;
    const cur = findHighlightSpans[findCurrentIdx];
    cur.style.backgroundColor = 'rgba(232, 93, 4, 0.85)';

    // If match is inside a PowerPoint slide wrapper, switch to that slide!
    const slideWrapper = cur.closest('.pptx-slide-wrapper');
    if (slideWrapper && editor) {
      const slides = Array.from(editor.querySelectorAll('.pptx-slide-wrapper'));
      const slideIdx = slides.indexOf(slideWrapper);
      if (slideIdx !== -1 && window.DocFlow?.selectPptSlide) {
        window.DocFlow.selectPptSlide(slideIdx);
      }
    }

    // If match is inside an Excel cell or table
    const cell = cur.closest('td, th');
    if (cell) {
      cell.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      document.querySelectorAll('.excel-cell-active').forEach(c => c.classList.remove('excel-cell-active'));
      cell.classList.add('excel-cell-active');
    }

    cur.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if (findCountEl) {
      findCountEl.textContent = `${findCurrentIdx + 1} of ${findHighlightSpans.length}`;
    }
  }

  function performReplace() {
    if (window.DocFlow.currentMode === 'view') {
      showToast('Replace is not available in read-only PDF mode', 'info');
      return;
    }
    if (window.DocFlow.currentMode !== 'edit' || !editor) return;
    const replaceInput = $('#replaceInput');
    const replaceVal = replaceInput ? replaceInput.value : '';

    if (findCurrentIdx >= 0 && findCurrentIdx < findHighlightSpans.length) {
      const curSpan = findHighlightSpans[findCurrentIdx];
      const textNode = document.createTextNode(replaceVal);
      curSpan.parentNode.replaceChild(textNode, curSpan);

      if (window.DocFlow.Editor) {
        window.DocFlow.Editor.notifyChange();
      }
      showToast('Replaced match', 'info');
      performFind();
    } else {
      findNavigate(1);
    }
  }

  function replaceTextInNode(root, findStr, replaceStr) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];
    while (walker.nextNode()) {
      if (walker.currentNode.textContent.toLowerCase().includes(findStr.toLowerCase())) {
        textNodes.push(walker.currentNode);
      }
    }

    let count = 0;
    const regex = new RegExp(findStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    textNodes.forEach(node => {
      const orig = node.textContent;
      const matches = orig.match(regex);
      if (matches) {
        count += matches.length;
        node.textContent = orig.replace(regex, replaceStr);
      }
    });

    return count;
  }

  function performReplaceAll() {
    if (window.DocFlow.currentMode === 'view') {
      showToast('Replace is not available in read-only PDF mode', 'info');
      return;
    }
    if (window.DocFlow.currentMode !== 'edit' || !editor || !findInput) return;
    const term = findInput.value.trim();
    if (!term) {
      showToast('Enter text to find first', 'warning');
      return;
    }

    const replaceInput = $('#replaceInput');
    const replaceVal = replaceInput ? replaceInput.value : '';

    clearFindHighlights();
    const count = replaceTextInNode(editor, term, replaceVal);

    if (window.DocFlow.Editor) {
      window.DocFlow.Editor.notifyChange();
    }

    if (findCountEl) findCountEl.textContent = '0 results';
    findHighlightSpans = [];
    findCurrentIdx = -1;

    showToast(`Replaced ${count} occurrence${count !== 1 ? 's' : ''}`, count > 0 ? 'success' : 'info');
  }

  function setupFindBar() {
    $('#findBtn')?.addEventListener('click', () => openFindBar(false));
    $('#pdfFindBtn')?.addEventListener('click', () => openFindBar(false));
    $('#ribbonFindBtn')?.addEventListener('click', () => openFindBar(false));
    $('#ribbonHomeFindBtn')?.addEventListener('click', () => openFindBar(false));

    $('#ribbonReplaceBtn')?.addEventListener('click', () => openFindBar(true));
    $('#ribbonHomeReplaceBtn')?.addEventListener('click', () => openFindBar(true));

    $('#findToggleReplace')?.addEventListener('click', () => {
      const row = $('#replaceBarRow');
      if (row) {
        const isShown = row.style.display !== 'none';
        row.style.display = isShown ? 'none' : 'flex';
        if (!isShown) $('#replaceInput')?.focus();
      }
    });

    $('#replaceBtn')?.addEventListener('click', performReplace);
    $('#replaceAllBtn')?.addEventListener('click', performReplaceAll);

    $('#replaceInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        performReplace();
      }
    });

    $('#findClose')?.addEventListener('click', closeFindBar);
    $('#findNext')?.addEventListener('click', () => findNavigate(1));
    $('#findPrev')?.addEventListener('click', () => findNavigate(-1));

    if (findInput) {
      findInput.addEventListener('input', () => {
        clearTimeout(findDebounceTimer);
        findDebounceTimer = setTimeout(performFind, 150);
      });

      findInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          findNavigate(e.shiftKey ? -1 : 1);
        }
      });
    }

    // Global keyboard shortcut: Escape closes find bar
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && findBar?.classList.contains('open')) {
        e.preventDefault();
        closeFindBar();
      }
    });
  }

  // ==========================================================================
  // Document Outline Panel
  // ==========================================================================

  function toggleOutline() {
    if (window.DocFlow.currentMode !== 'edit') {
      showToast('Open a document in edit mode first', 'info');
      return;
    }
    if (!outlinePanel) return;
    const isOpen = outlinePanel.classList.toggle('open');
    if (isOpen) {
      updateOutline();
    }
    showToast(isOpen ? 'Document Outline opened' : 'Document Outline closed', 'info');
  }

  function closeOutline() {
    outlinePanel?.classList.remove('open');
  }

  function updateOutline() {
    if (window.DocFlow.currentMode !== 'edit' || !editor || !outlineList) return;

    const headings = editor.querySelectorAll('h1, h2, h3, h4');
    outlineList.innerHTML = '';

    if (!headings.length) {
      outlineList.innerHTML = '<div class="outline-empty">No headings found in document</div>';
      return;
    }

    headings.forEach(heading => {
      const tag = heading.tagName.toLowerCase();
      const text = heading.textContent.trim() || '(Empty Heading)';

      const item = document.createElement('div');
      item.className = `outline-item ${tag}`;
      item.innerHTML = `
        <span class="outline-label">${tag.toUpperCase()}</span>
        <span>${escHtml(text)}</span>
      `;

      item.addEventListener('click', () => {
        heading.scrollIntoView({ behavior: 'smooth', block: 'center' });
        heading.style.outline = '2px solid var(--accent)';
        heading.style.outlineOffset = '4px';
        setTimeout(() => {
          heading.style.outline = '';
          heading.style.outlineOffset = '';
        }, 1500);
      });

      outlineList.appendChild(item);
    });
  }

  function scheduleOutlineUpdate() {
    clearTimeout(outlineTimer);
    outlineTimer = setTimeout(updateOutline, 400);
  }

  function setupOutline() {
    $('#outlineBtn')?.addEventListener('click', toggleOutline);
    $('#outlineClose')?.addEventListener('click', closeOutline);
  }

  // ==========================================================================
  // Document Statistics
  // ==========================================================================

  function showStatsModal() {
    if (window.DocFlow.currentMode === 'view') {
      const pdfDoc = window.DocFlow?.PDF?.getPdfDoc?.();
      const numPages = pdfDoc ? (pdfDoc.numPages || window.DocFlow.PDF.getTotalPages?.() || 1) : 1;
      showToast(`PDF Document: ${numPages} page${numPages > 1 ? 's' : ''}`, 'info');
      return;
    }
    if (window.DocFlow.currentMode !== 'edit' || !editor) {
      showToast('Open a document in edit mode first', 'info');
      return;
    }

    const text = editor.innerText || '';
    const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
    const chars = text.length;
    const charsNoSpaces = text.replace(/\s/g, '').length;
    const lines = text ? text.split(/\n/).length : 0;
    const paragraphs = text.split(/\n+/).map(s => s.trim()).filter(Boolean).length;
    const sentences = (text.match(/[.!?]+(\s|$)/g) || []).length;
    const headings = editor.querySelectorAll('h1, h2, h3, h4').length;
    const images = editor.querySelectorAll('img').length;
    const links = editor.querySelectorAll('a[href]').length;
    const tables = editor.querySelectorAll('table').length;
    const listItems = editor.querySelectorAll('li').length;
    const readMins = words ? Math.max(1, Math.ceil(words / 200)) : 0;
    const speakMins = words ? Math.max(1, Math.ceil(words / 130)) : 0;
    const avgLen = words ? (charsNoSpaces / words).toFixed(1) : '0';

    const stats = [
      ['Words', words],
      ['Characters', chars],
      ['Chars (no space)', charsNoSpaces],
      ['Sentences', sentences],
      ['Paragraphs', paragraphs],
      ['Lines', lines],
      ['Headings', headings],
      ['Images', images],
      ['Links', links],
      ['Tables', tables],
      ['List Items', listItems],
      ['Avg. Word Length', avgLen],
      ['Reading Time', readMins + ' min'],
      ['Speaking Time', speakMins + ' min']
    ];

    const content = $('#statsContent');
    if (content) {
      content.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;">
          ${stats.map(([k, v]) => `
            <div style="background:var(--bg-tertiary);border:1px solid var(--border);border-radius:8px;padding:10px 6px;text-align:center;">
              <div style="font-size:16px;font-weight:700;color:var(--accent);">${escHtml(String(v))}</div>
              <div style="font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-top:3px;">${escHtml(k)}</div>
            </div>
          `).join('')}
        </div>
      `;
    }

    openModal('#statsModal');
  }

  function setupStatistics() {
    const statusbar = $('#statusbar');
    if (statusbar) {
      statusbar.addEventListener('dblclick', () => {
        if (window.DocFlow.currentMode === 'edit') showStatsModal();
      });
    }
  }

  function initFindOutline() {
    setupFindBar();
    setupOutline();
    setupStatistics();
  }

  // Export module
  window.DocFlow = window.DocFlow || {};
  window.DocFlow.Find = {
    initFindOutline,
    toggleFindBar,
    openFindBar,
    closeFindBar,
    clearFindHighlights,
    performReplace,
    performReplaceAll,
    getCleanHtml,
    toggleOutline,
    closeOutline,
    updateOutline,
    scheduleOutlineUpdate,
    showStatsModal
  };

})(window);
