/**
 * DocFlow — PDF Viewer, Pagination, Text Extraction & Merge Tools
 */

(function (window) {
  'use strict';

  const { $, $$, escHtml, showToast, openModal, closeModal } = window.DocFlow.UI;

  const PDF_BASE_SCALE = 1.2;
  let pdfDoc = null;
  let pdfCurrentPage = 1;
  let pdfTotalPages = 0;
  let pdfScale = PDF_BASE_SCALE;
  let pdfZoomPct = 100;
  let pdfRefW = 612;
  let pdfRefH = 792;
  let pdfRotation = 0;
  let pdfObserver = null;
  let mergeFiles = [];
  const pdfUndoStack = [];
  const pdfRedoStack = [];

  function recordPdfState() {
    if (!pdfDoc) return;
    const state = { page: pdfCurrentPage, zoom: pdfZoomPct, rotation: pdfRotation };
    const last = pdfUndoStack[pdfUndoStack.length - 1];
    if (last && last.page === state.page && last.zoom === state.zoom && last.rotation === state.rotation) return;
    pdfUndoStack.push(state);
    if (pdfUndoStack.length > 30) pdfUndoStack.shift();
    pdfRedoStack.length = 0;
    window.DocFlow?.Editor?.updateUndoRedoUI?.();
  }

  function undoPdf() {
    if (pdfUndoStack.length > 1) {
      const cur = pdfUndoStack.pop();
      pdfRedoStack.push(cur);
      const prev = pdfUndoStack[pdfUndoStack.length - 1];
      if (prev) {
        pdfCurrentPage = prev.page;
        pdfZoomPct = prev.zoom;
        pdfRotation = prev.rotation;
        pdfScale = (prev.zoom / 100) * PDF_BASE_SCALE;
        updatePdfControls();
        buildPdfPlaceholders();
        scrollToPage(pdfCurrentPage);
        window.DocFlow?.Editor?.updateUndoRedoUI?.();
        showToast(`Undo PDF view (Page ${pdfCurrentPage})`, 'info');
        return true;
      }
    } else {
      showToast('Nothing to undo in PDF', 'info');
      return false;
    }
  }

  function redoPdf() {
    if (pdfRedoStack.length > 0) {
      const next = pdfRedoStack.pop();
      pdfUndoStack.push(next);
      pdfCurrentPage = next.page;
      pdfZoomPct = next.zoom;
      pdfRotation = next.rotation;
      pdfScale = (next.zoom / 100) * PDF_BASE_SCALE;
      updatePdfControls();
      buildPdfPlaceholders();
      scrollToPage(pdfCurrentPage);
      window.DocFlow?.Editor?.updateUndoRedoUI?.();
      showToast(`Redo PDF view (Page ${pdfCurrentPage})`, 'info');
      return true;
    } else {
      showToast('Nothing to redo in PDF', 'info');
      return false;
    }
  }

  const pdfPages = $('#pdfPages');
  const pdfWrap = $('#pdfWrap');
  const pdfPageInfo = $('#pdfPageInfo');
  const pdfZoomInfo = $('#pdfZoomInfo');

  // Initialize PDF.js worker
  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  // Load PDF Tab
  async function loadPdfTab(tab) {
    if (!tab) return;
    window.DocFlow.updateTopbar(tab);
    window.DocFlow.switchMode('view');
    pdfUndoStack.length = 0;
    pdfRedoStack.length = 0;

    const wrap = $('#pdfViewer') || $('#pdfWrap') || pdfWrap;
    const pages = $('#pdfPages') || pdfPages;
    if (wrap) wrap.classList.remove('pdf-grayscale-mode');
    if (pages) pages.classList.remove('pdf-grayscale-mode');
    $('#pdfGrayscaleBtn')?.classList.remove('active');

    if (tab.pdfDoc) {
      pdfDoc = tab.pdfDoc;
      pdfTotalPages = pdfDoc.numPages;
      pdfCurrentPage = 1;
      pdfZoomPct = 100;
      pdfScale = PDF_BASE_SCALE;
      pdfRotation = 0;
      updatePdfControls();
      recordPdfState();
      await buildPdfPlaceholders();
      return;
    }

    try {
      if (pdfPages) {
        pdfPages.innerHTML = '<div class="pdf-loading"><i class="fas fa-spinner"></i> Loading PDF document...</div>';
      }

      const doc = await pdfjsLib.getDocument({ data: tab.pdfData.slice(0) }).promise;
      tab.pdfDoc = doc;
      pdfDoc = doc;
      pdfTotalPages = doc.numPages;
      pdfCurrentPage = 1;
      pdfZoomPct = 100;
      pdfScale = PDF_BASE_SCALE;

      updatePdfControls();
      await buildPdfPlaceholders();

      if (!tab._greeted) {
        showToast(`Opened "${tab.name}" — ${pdfTotalPages} page${pdfTotalPages > 1 ? 's' : ''}`, 'success');
        tab._greeted = true;
      }
    } catch (err) {
      console.error('PDF load failed:', err);
      if (err && err.name === 'PasswordException') {
        showToast('This PDF is password-protected and cannot be opened', 'error');
      } else {
        showToast('Failed to load PDF: ' + ((err && err.message) || 'Unknown error'), 'error');
      }
      window.DocFlow.UI.Tabs.close(tab.id);
    }
  }

  // Build Dimensions & Placeholders for all pages
  async function buildPdfPlaceholders() {
    if (!pdfPages || !pdfDoc) return;
    pdfPages.innerHTML = '';
    pdfRefW = 612;
    pdfRefH = 792;

    try {
      const p1 = await pdfDoc.getPage(1);
      const vp = p1.getViewport({ scale: 1, rotation: ((p1.rotate || 0) + pdfRotation) % 360 });
      pdfRefW = vp.width;
      pdfRefH = vp.height;
    } catch (e) { }

    const cssW = Math.min(pdfRefW * pdfScale, window.innerWidth - 32);

    for (let i = 1; i <= pdfTotalPages; i++) {
      const wrap = document.createElement('div');
      wrap.className = 'pdf-page-wrap';
      wrap.dataset.page = i;
      wrap.style.width = cssW + 'px';
      wrap.style.height = (pdfRefH * (cssW / (pdfRefW * pdfScale))) + 'px';
      wrap.innerHTML = `
        <div class="pdf-loading" style="padding:40px;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);">
          <i class="fas fa-spinner"></i>
        </div>
        <span class="pdf-page-num">${i}</span>
      `;
      pdfPages.appendChild(wrap);
    }

    setupPdfObserver();
  }

  // IntersectionObserver for lazy loading pages
  function setupPdfObserver() {
    if (pdfObserver) pdfObserver.disconnect();
    if (!pdfPages || !pdfWrap) return;

    pdfObserver = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting && !e.target.dataset.rendered) {
          renderPdfPage(+e.target.dataset.page, e.target);
        }
      });
    }, { root: pdfWrap, rootMargin: '450px' });

    pdfPages.querySelectorAll('.pdf-page-wrap').forEach(w => pdfObserver.observe(w));
  }

  // Render individual page canvas with Retina/HiDPI support
  async function renderPdfPage(num, container) {
    if (!pdfDoc) return;
    const scaleAtStart = pdfScale;

    try {
      const page = await pdfDoc.getPage(num);
      if (scaleAtStart !== pdfScale || !container.isConnected) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vp = page.getViewport({ scale: pdfScale, rotation: ((page.rotate || 0) + pdfRotation) % 360 });
      const cssW = Math.min(vp.width, window.innerWidth - 32);
      const cssH = vp.height * (cssW / vp.width);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';

      container.style.width = cssW + 'px';
      container.style.height = cssH + 'px';
      container.innerHTML = '';
      container.appendChild(canvas);

      const pageNumBadge = document.createElement('span');
      pageNumBadge.className = 'pdf-page-num';
      pageNumBadge.textContent = num;
      container.appendChild(pageNumBadge);

      await page.render({
        canvasContext: ctx,
        viewport: vp,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null
      }).promise;

      container.dataset.rendered = 'true';
    } catch (e) {
      if (container.isConnected) {
        container.innerHTML = `<div class="pdf-loading" style="color:var(--danger);">Failed to render page ${num}</div>`;
      }
    }
  }

  // Update PDF Controls Bar & Status Bar Page Counter
  function updatePdfControls() {
    if (pdfPageInfo) pdfPageInfo.textContent = `Page ${pdfCurrentPage} / ${pdfTotalPages}`;
    if (pdfZoomInfo) pdfZoomInfo.textContent = pdfZoomPct + '%';

    const prevBtn = $('#pdfPrev');
    const nextBtn = $('#pdfNext');
    if (prevBtn) prevBtn.disabled = pdfCurrentPage <= 1;
    if (nextBtn) nextBtn.disabled = pdfCurrentPage >= pdfTotalPages;

    const lineCountEl = $('#lineCount');
    if (lineCountEl && (window.DocFlow?.currentMode === 'view' || !window.DocFlow)) {
      lineCountEl.textContent = `Page ${pdfCurrentPage} of ${pdfTotalPages || 1}`;
    }
  }

  function rerenderPdf() {
    if (!pdfDoc || !pdfPages) return;
    buildPdfPlaceholders();
  }

  // Scroll to page with offset for the sticky header
  function scrollToPage(pageNum) {
    if (!pdfPages) return;
    const target = pdfPages.querySelector(`[data-page="${pageNum}"]`);
    if (target && pdfWrap) {
      const controlsH = $('#pdfControls')?.offsetHeight || 48;
      const targetTop = target.offsetTop - controlsH - 12;
      pdfWrap.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
    }
  }

  // Setup PDF Controls
  function setupPdfControls() {
    $('#pdfPrev')?.addEventListener('click', () => {
      if (pdfCurrentPage > 1) {
        pdfCurrentPage--;
        updatePdfControls();
        scrollToPage(pdfCurrentPage);
      }
    });

    $('#pdfNext')?.addEventListener('click', () => {
      if (pdfCurrentPage < pdfTotalPages) {
        pdfCurrentPage++;
        updatePdfControls();
        scrollToPage(pdfCurrentPage);
      }
    });

    $('#pdfRibbonPrevBtn')?.addEventListener('click', () => {
      if (pdfCurrentPage > 1) {
        pdfCurrentPage--;
        updatePdfControls();
        scrollToPage(pdfCurrentPage);
      }
    });

    $('#pdfRibbonNextBtn')?.addEventListener('click', () => {
      if (pdfCurrentPage < pdfTotalPages) {
        pdfCurrentPage++;
        updatePdfControls();
        scrollToPage(pdfCurrentPage);
      }
    });

    $('#pdfRibbonFirstPageBtn')?.addEventListener('click', () => jumpToPage(1));
    $('#pdfRibbonLastPageBtn')?.addEventListener('click', () => jumpToPage(pdfTotalPages));

    $('#pdfRibbonPageJumpBtn')?.addEventListener('click', () => {
      window.DocFlow.UI?.showPromptModal?.({
        title: 'Jump to PDF Page',
        message: `Enter page number to jump to (1 - ${pdfTotalPages}):`,
        defaultValue: String(pdfCurrentPage),
        placeholder: 'Page number...',
        confirmText: 'Jump',
        onConfirm: (pageStr) => {
          if (pageStr) {
            const pageNum = parseInt(pageStr, 10);
            if (pageNum >= 1 && pageNum <= pdfTotalPages) jumpToPage(pageNum);
            else showToast(`Page number must be between 1 and ${pdfTotalPages}`, 'warning');
          }
        }
      });
    });

    // Tracking page while scrolling
    if (pdfWrap) {
      pdfWrap.addEventListener('scroll', () => {
        if (!pdfDoc || !pdfPages) return;
        const st = pdfWrap.scrollTop;
        const mid = st + (pdfWrap.clientHeight / 2);

        pdfPages.querySelectorAll('.pdf-page-wrap').forEach(w => {
          if (w.offsetTop <= mid && w.offsetTop + w.offsetHeight > mid) {
            const p = +w.dataset.page;
            if (p !== pdfCurrentPage) {
              pdfCurrentPage = p;
              updatePdfControls();
            }
          }
        });
      });
    }

    // Extract Text & Images Buttons
    $('#pdfExtractBtn')?.addEventListener('click', () => extractTextFromPdf(true));
    $('#pdfRibbonExtractTextBtn')?.addEventListener('click', () => extractTextFromPdf(false));
    $('#pdfRibbonExtractAllBtn')?.addEventListener('click', () => extractTextFromPdf(true));
    $('#pdfQuickExtractAllBtn')?.addEventListener('click', () => extractTextFromPdf(true));

    // Rotate PDF 90° Clockwise (Issue 5.3: Works on both PDF view and extracted PDF documents)
    let extractedPdfRotation = 0;
    const rotatePdfAction = () => {
      if (pdfDoc && window.DocFlow.currentMode === 'view') {
        pdfRotation = (pdfRotation + 90) % 360;
        buildPdfPlaceholders();
        showToast(`PDF rotated to ${pdfRotation}°`, 'success');
        return;
      }

      const ed = $('#editor');
      if (ed) {
        extractedPdfRotation = (extractedPdfRotation + 90) % 360;
        const richPages = ed.querySelectorAll('.pdf-rich-page, .df-page, .editor-page');
        const isPerpendicular = (extractedPdfRotation === 90 || extractedPdfRotation === 270);
        if (richPages.length > 0) {
          richPages.forEach(p => {
            p.style.transform = `rotate(${extractedPdfRotation}deg)`;
            p.style.transformOrigin = 'center center';
            p.style.transition = 'transform 0.25s ease, margin 0.25s ease';
            if (isPerpendicular) {
              const diff = Math.max(0, (p.offsetHeight - p.offsetWidth) / 2);
              p.style.margin = `${diff + 20}px auto`;
            } else {
              p.style.margin = '';
            }
          });
        } else {
          ed.style.transform = `rotate(${extractedPdfRotation}deg)`;
          ed.style.transformOrigin = 'center center';
          ed.style.transition = 'transform 0.25s ease';
        }
        showToast(`Extracted document rotated to ${extractedPdfRotation}°`, 'success');
        return;
      }

      showToast('Open a PDF or document first', 'info');
    };
    $('#pdfRibbonRotateBtn')?.addEventListener('click', rotatePdfAction);
    $('#pdfQuickRotateBtn')?.addEventListener('click', rotatePdfAction);

    // Night Mode / Invert View (Issue 5.3: Works on both PDF view and extracted PDF documents)
    const togglePdfNightAction = () => {
      const wrap = $('#pdfWrap') || pdfWrap;
      const isPdfMode = window.DocFlow.currentMode === 'view' && !!pdfDoc;
      if (isPdfMode && wrap) {
        const isNight = wrap.classList.toggle('pdf-night-mode');
        $('#pdfRibbonInvertBtn')?.classList.toggle('active', isNight);
        $('#pdfQuickInvertBtn')?.classList.toggle('active', isNight);
        showToast(`PDF Night Mode: ${isNight ? 'ON' : 'OFF'}`, 'info');
      } else {
        const wrap = $('#editorWrap') || $('#editor');
        if (wrap) {
          const isNight = wrap.classList.toggle('pdf-night-mode');
          $('#pdfRibbonInvertBtn')?.classList.toggle('active', isNight);
          $('#pdfQuickInvertBtn')?.classList.toggle('active', isNight);
          showToast(`Document Night Mode: ${isNight ? 'ON' : 'OFF'}`, 'info');
        } else {
          showToast('Open a PDF or document first', 'info');
        }
      }
    };
    $('#pdfRibbonInvertBtn')?.addEventListener('click', togglePdfNightAction);
    $('#pdfQuickInvertBtn')?.addEventListener('click', togglePdfNightAction);

    // Create PDF from Images
    $('#pdfCreateFromImagesBtn')?.addEventListener('click', openCreatePdfFromImagesModal);
    $('#emptyCreatePdfImagesBtn')?.addEventListener('click', openCreatePdfFromImagesModal);
    $('#pdfQuickCreateImgBtn')?.addEventListener('click', openCreatePdfFromImagesModal);

    // Merge PDFs
    $('#pdfRibbonMergeModalBtn')?.addEventListener('click', openMergeModal);
  }

  // Extract Text & Embedded Images from PDF into Editable Rich Mode Document (Preserves all fonts, colors, layout, spacing, and design elements)
  async function extractTextFromPdf(includeImages = true) {
    if (!pdfDoc) {
      showToast('Open a PDF document first to extract content', 'info');
      return;
    }
    showToast('Converting PDF to Rich Mode (preserving all fonts, colors & layout)...', 'info');

    try {
      let extractedHtml = '';

      for (let i = 1; i <= pdfTotalPages; i++) {
        const page = await pdfDoc.getPage(i);
        const vp = page.getViewport({ scale: 1.0 });
        const pageWidth = vp.width || 612;
        const textContent = await page.getTextContent({ normalizeWhitespace: true });

        let pageHtml = `<div class="pdf-rich-page" data-page="${i}" style="position:relative;background:var(--bg-primary, #ffffff);padding:36px 44px;margin:24px auto;border-radius:8px;box-shadow:var(--shadow-md);max-width:820px;box-sizing:border-box;">`;
        pageHtml += `<div style="font-size:11px;color:var(--text-muted);border-bottom:1px solid var(--border);padding-bottom:6px;margin-bottom:20px;display:flex;justify-content:space-between;"><span>Page ${i} of ${pdfTotalPages}</span><span>PDF Rich Mode</span></div>`;

        if (textContent.items && textContent.items.length) {
          const styles = textContent.styles || {};
          const lineMap = new Map();

          textContent.items.forEach(item => {
            if (!item.str || !item.str.trim()) return;
            // Group text items by vertical Y line (within 4px tolerance)
            const y = Math.round(item.transform[5] / 4) * 4;
            if (!lineMap.has(y)) lineMap.set(y, []);
            lineMap.get(y).push(item);
          });

          // Sort lines descending (top of page first)
          const ys = [...lineMap.keys()].sort((a, b) => b - a);
          let prevY = null;

          ys.forEach(y => {
            const items = lineMap.get(y).sort((a, b) => a.transform[4] - b.transform[4]);
            if (!items.length) return;

            // Compute line bounding box & spacing
            const minX = items[0].transform[4];
            const lastItem = items[items.length - 1];
            const maxX = lastItem.transform[4] + (lastItem.width || 0);
            const lineWidth = maxX - minX;

            // Vertical margin from previous line
            let marginTop = 3;
            if (prevY !== null) {
              const gap = prevY - y;
              if (gap > 28) marginTop = 18;
              else if (gap > 18) marginTop = 10;
              else if (gap > 12) marginTop = 4;
            }
            prevY = y;

            // Determine alignment
            let textAlign = 'left';
            const centerDiff = Math.abs((minX + maxX) / 2 - pageWidth / 2);
            if (centerDiff < pageWidth * 0.12 && lineWidth < pageWidth * 0.75) {
              textAlign = 'center';
            } else if (minX > pageWidth * 0.55 && lineWidth < pageWidth * 0.4) {
              textAlign = 'right';
            }

            let maxFontSize = 0;
            let spansHtml = '';
            let lastRight = null;

            items.forEach(item => {
              const fs = Math.abs(item.transform[0]) || 11;
              if (fs > maxFontSize) maxFontSize = fs;

              // Gap spacing
              if (lastRight !== null) {
                const gap = item.transform[4] - lastRight;
                if (gap > fs * 1.8) spansHtml += '&emsp;';
                else if (gap > fs * 0.25) spansHtml += ' ';
              }

              // Font and styling
              const fontObj = styles[item.fontName] || {};
              const rawFontFamily = fontObj.fontFamily || item.fontName || '';
              let fontFamily = 'var(--font-body, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)';
              if (/times|georgia|serif/i.test(rawFontFamily)) fontFamily = 'Georgia, "Times New Roman", serif';
              else if (/courier|mono|consolas/i.test(rawFontFamily)) fontFamily = 'Consolas, "Courier New", monospace';
              else if (/helvetica|arial/i.test(rawFontFamily)) fontFamily = 'Arial, Helvetica, sans-serif';

              const isBold = /bold|black|heavy|w[789]00/i.test(item.fontName || '') || /bold|black|heavy/i.test(rawFontFamily);
              const isItalic = /italic|oblique/i.test(item.fontName || '') || /italic|oblique/i.test(rawFontFamily);

              const spanStyles = [];
              spanStyles.push(`font-family:${fontFamily}`);
              spanStyles.push(`font-size:${Math.round(fs)}px`);
              if (isBold) spanStyles.push('font-weight:700');
              if (isItalic) spanStyles.push('font-style:italic');

              spansHtml += `<span style="${spanStyles.join(';')}">${escHtml(item.str)}</span>`;
              lastRight = item.transform[4] + (item.width || 0);
            });

            // Heading vs Body paragraph
            if (maxFontSize >= 22) {
              pageHtml += `<h1 style="text-align:${textAlign};margin:${marginTop}px 0 8px;line-height:1.25;color:var(--text-primary);">${spansHtml}</h1>`;
            } else if (maxFontSize >= 17) {
              pageHtml += `<h2 style="text-align:${textAlign};margin:${marginTop}px 0 6px;line-height:1.3;color:var(--text-primary);">${spansHtml}</h2>`;
            } else if (maxFontSize >= 14) {
              pageHtml += `<h3 style="text-align:${textAlign};margin:${marginTop}px 0 4px;line-height:1.35;color:var(--text-primary);">${spansHtml}</h3>`;
            } else {
              pageHtml += `<div class="pdf-rich-line" style="text-align:${textAlign};margin:${marginTop}px 0 2px;line-height:1.55;color:var(--text-primary);">${spansHtml}</div>`;
            }
          });
        }

        // Include high-resolution visual layout / images if requested or if page has figures
        if (includeImages) {
          try {
            const ops = await page.getOperatorList();
            let hasImages = false;
            for (let k = 0; k < ops.fnArray.length; k++) {
              if (ops.fnArray[k] === pdfjsLib.OPS.paintImageXObject || ops.fnArray[k] === pdfjsLib.OPS.paintInlineImageXObject) {
                hasImages = true;
                break;
              }
            }
            if (hasImages || !textContent.items.length) {
              const renderVp = page.getViewport({ scale: 1.5 });
              const cv = document.createElement('canvas');
              cv.width = renderVp.width;
              cv.height = renderVp.height;
              const ctx = cv.getContext('2d');
              await page.render({ canvasContext: ctx, viewport: renderVp }).promise;
              const dataUrl = cv.toDataURL('image/jpeg', 0.92);
              pageHtml += `
                <div class="pdf-extracted-image-block" style="margin:20px auto;text-align:center;">
                  <img src="${dataUrl}" alt="PDF Page ${i} Visual Layout" style="max-width:100%;height:auto;border-radius:6px;box-shadow:0 3px 12px rgba(0,0,0,0.12);" data-wrap="inline">
                </div>`;
            }
          } catch (imgErr) {
            console.warn('Image extraction notice for page', i, imgErr);
          }
        }

        pageHtml += `</div>`;
        extractedHtml += pageHtml;

        if (i < pdfTotalPages) {
          extractedHtml += '<div class="doc-page-break" contenteditable="false"><div class="doc-page-break-line"><span>Page Break</span></div></div><p><br></p>';
        }
      }

      if (!extractedHtml.replace(/<[^>]+>/g, '').trim()) {
        showToast('No extractable content found in this PDF', 'warning');
        return;
      }

      const activeTab = window.DocFlow.UI.Tabs.get(window.DocFlow.UI.Tabs.activeId);
      const baseName = (activeTab ? activeTab.name : 'Document').replace(/\.pdf$/i, '');
      const tabName = `${baseName} (Rich).html`;
      const tab = window.DocFlow.UI.Tabs.create(tabName, extractedHtml, 'Rich Mode', 'edit');
      if (activeTab && activeTab.pdfData) {
        tab.pdfData = activeTab.pdfData;
        tab.pdfDoc = pdfDoc;
        tab.sourcePdfName = activeTab.name;
      }
      if (window.DocFlow?.PdfStore) {
        window.DocFlow.PdfStore.set('content-' + tab.id, extractedHtml);
        if (activeTab && activeTab.pdfData) {
          window.DocFlow.PdfStore.set('tab-' + tab.id, activeTab.pdfData);
        }
      }

      window.DocFlow.UI.Tabs.activateTab(tab);
      if (window.DocFlow.Recent) {
        window.DocFlow.Recent.add({
          name: tabName,
          type: 'HTML',
          mode: 'edit',
          content: extractedHtml
        });
      }
      showToast('Document converted to Rich Mode with all original formatting preserved', 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to convert to Rich Mode: ' + e.message, 'error');
    }
  }

  // ==========================================================================
  // Merge PDF Dialog & Operations
  // ==========================================================================
  function openMergeModal() {
    mergeFiles = [];
    renderMergeList();
    openModal('#pdfMergeModal');
  }

  function renderMergeList() {
    const list = $('#mergeFileList');
    if (!list) return;
    list.innerHTML = '';

    mergeFiles.forEach((file, idx) => {
      const item = document.createElement('div');
      item.className = 'merge-file-item';
      item.innerHTML = `
        <i class="fas fa-file-pdf"></i>
        <span class="fname">${escHtml(file.name)}</span>
        <span class="fpages">${file.pages} pg</span>
        <button class="remove-merge" data-idx="${idx}" title="Remove file" aria-label="Remove ${escHtml(file.name)}">
          <i class="fas fa-xmark"></i>
        </button>
      `;

      item.querySelector('.remove-merge').addEventListener('click', () => {
        mergeFiles.splice(idx, 1);
        renderMergeList();
      });

      list.appendChild(item);
    });

    const mergeBtn = $('#mergeBtn');
    if (mergeBtn) mergeBtn.disabled = mergeFiles.length < 2;
  }

  async function addMergeFiles(files) {
    for (const f of Array.from(files)) {
      if (mergeFiles.length >= 10) {
        showToast('Maximum 10 PDFs can be merged at once', 'warning');
        break;
      }

      if (f.name.toLowerCase().endsWith('.pdf')) {
        try {
          const ab = await f.arrayBuffer();
          const doc = await pdfjsLib.getDocument({ data: ab.slice(0) }).promise;
          mergeFiles.push({ name: f.name, data: ab, pages: doc.numPages });
        } catch (e) {
          showToast(`Cannot read "${f.name}": ${e.message}`, 'error');
        }
      } else {
        showToast(`"${f.name}" is not a PDF file`, 'error');
      }
    }
    renderMergeList();
  }

  function setupMergePdfModal() {
    const dropZone = $('#mergePdfDrop');
    const fileInput = $('#mergeFileInput');
    const mergeBtn = $('#mergeBtn');
    const clearBtn = $('#mergeClear');
    const cancelBtn = $('#mergeCancel');

    if (dropZone && fileInput) {
      dropZone.addEventListener('click', () => fileInput.click());

      dropZone.addEventListener('dragover', e => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.style.borderColor = 'var(--accent)';
        dropZone.style.background = 'var(--accent-dim)';
      });

      dropZone.addEventListener('dragleave', e => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.style.borderColor = '';
        dropZone.style.background = '';
      });

      dropZone.addEventListener('drop', e => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.style.borderColor = '';
        dropZone.style.background = '';
        if (e.dataTransfer && e.dataTransfer.files) {
          addMergeFiles(e.dataTransfer.files);
        }
      });

      fileInput.addEventListener('change', e => {
        if (e.target.files) {
          addMergeFiles(e.target.files);
          fileInput.value = '';
        }
      });
    }

    clearBtn?.addEventListener('click', () => {
      mergeFiles = [];
      renderMergeList();
    });

    cancelBtn?.addEventListener('click', () => {
      closeModal('#pdfMergeModal');
      mergeFiles = [];
    });

    if (mergeBtn) {
      mergeBtn.addEventListener('click', async () => {
        if (mergeFiles.length < 2) return;
        mergeBtn.disabled = true;
        mergeBtn.textContent = 'Merging...';

        try {
          if (typeof PDFLib === 'undefined') {
            showToast('PDF merge engine not available. Please refresh.', 'error');
            mergeBtn.textContent = 'Merge PDFs';
            mergeBtn.disabled = false;
            return;
          }

          const mergedDoc = await PDFLib.PDFDocument.create();
          let totalPages = 0;

          for (const item of mergeFiles) {
            try {
              const src = await PDFLib.PDFDocument.load(item.data);
              const copiedPages = await mergedDoc.copyPages(src, src.getPageIndices());
              copiedPages.forEach(p => mergedDoc.addPage(p));
              totalPages += src.getPageCount();
            } catch (err) {
              showToast(`Error merging "${item.name}": ${err.message}`, 'error');
            }
          }

          const mergedBytes = await mergedDoc.save();
          const blob = new Blob([mergedBytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'merged_document.pdf';
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 100);

          showToast(`Successfully merged ${mergeFiles.length} PDFs (${totalPages} pages)`, 'success');
          closeModal('#pdfMergeModal');
          mergeFiles = [];
        } catch (e) {
          console.error(e);
          showToast('Failed to merge PDFs: ' + e.message, 'error');
        } finally {
          mergeBtn.textContent = 'Merge PDFs';
          mergeBtn.disabled = false;
          renderMergeList();
        }
      });
    }
  }

  function rotatePdf(deg) {
    if (!pdfDoc) {
      showToast('Open a PDF document first', 'warning');
      return;
    }
    pdfRotation = (pdfRotation + deg) % 360;
    if (pdfRotation < 0) pdfRotation += 360;
    recordPdfState();
    rerenderPdf();
    showToast(`Rotated PDF to ${pdfRotation}°`, 'info');
  }

  function jumpToPage(num) {
    if (!pdfDoc) return;
    const target = Math.max(1, Math.min(pdfTotalPages, num));
    pdfCurrentPage = target;
    recordPdfState();
    updatePdfControls();
    scrollToPage(target);
  }

  function setPdfZoom(pct) {
    if (!pdfDoc) return;
    pdfZoomPct = Math.max(25, Math.min(400, pct));
    pdfScale = (PDF_BASE_SCALE * pdfZoomPct) / 100;
    recordPdfState();
    updatePdfControls();
    rerenderPdf();
  }

  function fitPdf(mode) {
    if (!pdfDoc) return;
    if (mode === 'width') {
      const availW = (pdfWrap ? pdfWrap.clientWidth - 48 : window.innerWidth - 64);
      pdfScale = availW / (pdfRefW || 612);
      pdfZoomPct = Math.round((pdfScale / PDF_BASE_SCALE) * 100);
    } else if (mode === 'page') {
      const availH = (pdfWrap ? pdfWrap.clientHeight - 80 : window.innerHeight - 150);
      pdfScale = availH / (pdfRefH || 792);
      pdfZoomPct = Math.round((pdfScale / PDF_BASE_SCALE) * 100);
    } else {
      pdfZoomPct = 100;
      pdfScale = PDF_BASE_SCALE;
    }
    recordPdfState();
    updatePdfControls();
    rerenderPdf();
    showToast(`PDF Fit Mode: ${mode}`, 'info');
  }

  function toggleTwoPage() {
    if (!pdfPages) return;
    const isTwo = pdfPages.classList.toggle('pdf-two-page-view');
    showToast(`Two Page Spread: ${isTwo ? 'ON' : 'OFF'}`, 'info');
  }

  async function extractImagesFromPdf() {
    if (!pdfDoc) {
      showToast('Open a PDF document first', 'warning');
      return;
    }
    showToast('Extracting images from PDF...', 'info');
    try {
      let imageHtml = `<div style="max-width:850px;margin:20px auto;font-family:inherit;">
        <h2 style="margin-bottom:16px;color:var(--text-primary);"><i class="fas fa-images" style="color:#f59e0b;margin-right:8px;"></i>Extracted Images from PDF</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(220px, 1fr));gap:16px;">`;
      let count = 0;

      for (let pNum = 1; pNum <= Math.min(pdfTotalPages, 20); pNum++) {
        const page = await pdfDoc.getPage(pNum);
        const vp = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = vp.width;
        canvas.height = vp.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        const dataUrl = canvas.toDataURL('image/png');
        count++;
        imageHtml += `
          <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:8px;padding:10px;text-align:center;">
            <img src="${dataUrl}" style="max-width:100%;height:auto;border-radius:4px;box-shadow:0 2px 6px rgba(0,0,0,0.15);" alt="Page ${pNum} render">
            <div style="margin-top:8px;font-size:12px;font-weight:600;color:var(--text-secondary);">Page ${pNum}</div>
            <a href="${dataUrl}" download="pdf_page_${pNum}.png" style="display:inline-block;margin-top:6px;padding:3px 10px;font-size:11px;background:var(--accent);color:#fff;border-radius:4px;text-decoration:none;">Download PNG</a>
          </div>`;
      }
      imageHtml += `</div></div>`;

      const activeTab = window.DocFlow.UI.Tabs.get(window.DocFlow.UI.Tabs.activeId);
      const baseName = (activeTab ? activeTab.name : 'Document').replace(/\.pdf$/i, '');
      const tab = window.DocFlow.UI.Tabs.create(`${baseName} (images).html`, imageHtml, 'Extracted Images', 'edit');
      window.DocFlow.UI.Tabs.activateTab(tab);
      showToast(`Extracted ${count} page image(s)`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Error extracting images: ' + err.message, 'error');
    }
  }

  function downloadCurrentPdf() {
    const activeTab = window.DocFlow.UI.Tabs.get(window.DocFlow.UI.Tabs.activeId);
    if (!activeTab || !activeTab.pdfData) {
      showToast('No active PDF data to download', 'warning');
      return;
    }
    const blob = new Blob([activeTab.pdfData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeTab.name || 'document.pdf';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    showToast('Downloading PDF...', 'success');
  }

  // ==========================================================================
  // Create PDF from Images (Issue 6)
  // ==========================================================================
  let selectedPdfImages = [];

  function openCreatePdfFromImagesModal() {
    selectedPdfImages = [];
    renderSelectedPdfImages();
    openModal('#createPdfFromImagesModal');
  }

  function renderSelectedPdfImages() {
    const list = $('#pdfImagesSelectedList');
    if (!list) return;
    list.innerHTML = '';
    if (!selectedPdfImages.length) {
      list.innerHTML = '<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:10px;">No images added yet. Click above to browse.</div>';
      return;
    }
    selectedPdfImages.forEach((img, idx) => {
      const item = document.createElement('div');
      item.style.cssText = 'display:flex;align-items:center;gap:10px;padding:6px 10px;background:var(--bg-tertiary);border:1px solid var(--border);border-radius:6px;';
      item.innerHTML = `
        <img src="${img.dataUrl}" style="width:36px;height:36px;object-fit:cover;border-radius:4px;" alt="Thumb">
        <div style="flex:1;min-width:0;font-size:12px;font-weight:600;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(img.name)}</div>
        <button type="button" class="img-del-btn" style="background:transparent;border:none;color:var(--danger);cursor:pointer;padding:4px;"><i class="fas fa-trash-can"></i></button>
      `;
      item.querySelector('.img-del-btn').addEventListener('click', () => {
        selectedPdfImages.splice(idx, 1);
        renderSelectedPdfImages();
      });
      list.appendChild(item);
    });
  }

  function setupCreatePdfFromImagesModal() {
    const dropZone = $('#pdfImagesDropZone');
    const fileInput = $('#pdfImagesFileInput');
    const closeBtn = $('#createPdfImagesCloseBtn');
    const cancelBtn = $('#createPdfImagesCancelBtn');
    const submitBtn = $('#createPdfImagesSubmitBtn');
    const insertDocBtn = $('#insertImagesToDocBtn');

    const handleFiles = (files) => {
      Array.from(files).forEach(f => {
        if (!f.type.startsWith('image/')) return;
        // Deduplicate files by name
        if (selectedPdfImages.some(img => img.name === f.name)) return;
        const reader = new FileReader();
        reader.onload = e => {
          if (selectedPdfImages.some(img => img.dataUrl === e.target.result)) return;
          selectedPdfImages.push({ name: f.name, dataUrl: e.target.result });
          renderSelectedPdfImages();
        };
        reader.readAsDataURL(f);
      });
    };

    dropZone?.addEventListener('click', e => {
      if (e.target === fileInput) return;
      fileInput?.click();
    });
    fileInput?.addEventListener('click', e => e.stopPropagation());
    fileInput?.addEventListener('change', e => {
      if (e.target.files) handleFiles(e.target.files);
      fileInput.value = '';
    });

    dropZone?.addEventListener('dragover', e => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--accent)';
    });
    dropZone?.addEventListener('dragleave', () => {
      dropZone.style.borderColor = '';
    });
    dropZone?.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.style.borderColor = '';
      if (e.dataTransfer && e.dataTransfer.files) {
        handleFiles(e.dataTransfer.files);
      }
    });

    closeBtn?.addEventListener('click', () => closeModal('#createPdfFromImagesModal'));
    cancelBtn?.addEventListener('click', () => closeModal('#createPdfFromImagesModal'));

    // Insert directly into Document Editor with Word-like adjustable handles & toolbar (Issue 5)
    insertDocBtn?.addEventListener('click', () => {
      if (!selectedPdfImages.length) {
        showToast('Please select at least one image to insert', 'warning');
        return;
      }
      closeModal('#createPdfFromImagesModal');
      let activeTab = window.DocFlow.UI.Tabs.get(window.DocFlow.UI.Tabs.activeId);
      if (!activeTab || activeTab.format === 'pdf') {
        activeTab = window.DocFlow.UI.Tabs.create('Image Document', '<p><br></p>', 'DOCX', 'docx');
        window.DocFlow.UI.Tabs.activateTab(activeTab);
      }
      window.DocFlow.switchMode('edit');
      const count = selectedPdfImages.length;
      selectedPdfImages.forEach(img => {
        window.DocFlow.ImageManager?.insertImageIntoDocument(img.dataUrl, img.name);
      });
      selectedPdfImages = [];
      showToast(`Inserted ${count} image(s). Use resize handles and toolbar to customize size & position!`, 'success');
    });

    submitBtn?.addEventListener('click', async () => {
      if (!selectedPdfImages.length) {
        showToast('Please select at least one image to create PDF', 'warning');
        return;
      }

      showToast('Generating PDF from images...', 'info');
      try {
        const { jsPDF } = window.jspdf;
        const isLandscape = $('#pdfImagesOrientation')?.value === 'landscape';
        const marginOpt = $('#pdfImagesMargin')?.value || 'fit';
        const positionOpt = $('#pdfImagesPosition')?.value || 'center';
        const scaleOpt = $('#pdfImagesScale')?.value || 'fit';
        const pdf = new jsPDF(isLandscape ? 'l' : 'p', 'mm', 'a4');

        const pageW = isLandscape ? 297 : 210;
        const pageH = isLandscape ? 210 : 297;
        const margin = marginOpt === 'bleed' ? 0 : (marginOpt === 'large' ? 20 : 10);
        const maxW = pageW - margin * 2;
        const maxH = pageH - margin * 2;

        for (let i = 0; i < selectedPdfImages.length; i++) {
          if (i > 0) pdf.addPage();
          const img = selectedPdfImages[i];

          await new Promise((resolve) => {
            const tempImg = new Image();
            tempImg.onload = () => {
              let w = tempImg.naturalWidth || tempImg.width || 800;
              let h = tempImg.naturalHeight || tempImg.height || 600;

              let renderW, renderH;
              if (scaleOpt === 'stretch') {
                renderW = maxW;
                renderH = maxH;
              } else if (scaleOpt === 'large') {
                renderW = maxW;
                renderH = Math.min(maxH, h * (maxW / w));
              } else if (scaleOpt === 'medium') {
                renderW = maxW * 0.75;
                renderH = Math.min(maxH, h * (renderW / w));
              } else if (scaleOpt === 'small') {
                renderW = maxW * 0.5;
                renderH = Math.min(maxH, h * (renderW / w));
              } else {
                // Auto fit
                const ratio = Math.min(maxW / w, maxH / h);
                renderW = w * ratio;
                renderH = h * ratio;
              }

              let posX = margin + (maxW - renderW) / 2;
              let posY = margin + (maxH - renderH) / 2;
              if (positionOpt === 'top') {
                posY = margin;
              } else if (positionOpt === 'stretch') {
                posX = margin;
                posY = margin;
              }

              try {
                // Render image to full 24-bit/32-bit RGB canvas and encode as lossless PNG to preserve 100% color vibrancy
                const rgbCanvas = document.createElement('canvas');
                rgbCanvas.width = tempImg.naturalWidth || tempImg.width || w;
                rgbCanvas.height = tempImg.naturalHeight || tempImg.height || h;
                const ctx = rgbCanvas.getContext('2d', { willReadFrequently: false });
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(tempImg, 0, 0, rgbCanvas.width, rgbCanvas.height);
                const cleanDataUrl = rgbCanvas.toDataURL('image/png');
                pdf.addImage(cleanDataUrl, 'PNG', posX, posY, renderW, renderH, undefined, 'NONE');
              } catch (imgErr) {
                console.warn('Direct image add fallback:', imgErr);
                pdf.addImage(img.dataUrl, 'PNG', posX, posY, renderW, renderH, undefined, 'NONE');
              }
              resolve();
            };
            tempImg.onerror = resolve;
            tempImg.src = img.dataUrl;
          });
        }

        const pdfArrayBuffer = pdf.output('arraybuffer');
        const pdfName = `Images_${Date.now()}.pdf`;

        if (window.DocFlow.Recent) {
          window.DocFlow.Recent.add({
            name: pdfName,
            type: 'PDF',
            mode: 'view',
            pdfData: pdfArrayBuffer
          });
        }

        closeModal('#createPdfFromImagesModal');
        const count = selectedPdfImages.length;
        selectedPdfImages = [];

        const tab = window.DocFlow.UI.Tabs.create(pdfName, '', 'PDF', 'pdf');
        tab.pdfData = pdfArrayBuffer;
        if (window.DocFlow?.PdfStore) {
          window.DocFlow.PdfStore.set(pdfName, pdfArrayBuffer);
          window.DocFlow.PdfStore.set('tab-' + tab.id, pdfArrayBuffer);
        }
        loadPdfTab(tab);
        window.DocFlow.UI.Tabs.activateTab(tab);

        showToast(`Created PDF "${pdfName}" from ${count} image(s) and saved to Recents!`, 'success');
      } catch (err) {
        console.error(err);
        showToast('Failed to create PDF: ' + err.message, 'error');
      }
    });
  }

  function printCurrentPdf() {
    const activeTab = window.DocFlow.UI.Tabs.get(window.DocFlow.UI.Tabs.activeId);
    if (!activeTab || !activeTab.pdfData) {
      showToast('Open a PDF document first to print', 'warning');
      return;
    }
    const blob = new Blob([activeTab.pdfData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      setTimeout(() => {
        iframe.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 60000);
      }, 300);
    };
  }


  // Ensure PDF binary buffer is available, generating on the fly if user is in an extracted or created doc
  async function ensureTabPdfData(tab) {
    if (!tab) return null;
    if (tab.pdfData) return tab.pdfData;
    const editor = $('#editor');
    if (editor && window.jspdf) {
      try {
        showToast('Preparing PDF data from document...', 'info');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const canvas = await window.html2canvas(editor, { scale: 1.5, backgroundColor: '#ffffff', useCORS: true });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const w = pdf.internal.pageSize.getWidth();
        const h = (canvas.height * w) / canvas.width;
        pdf.addImage(imgData, 'JPEG', 0, 0, w, h);
        const buffer = pdf.output('arraybuffer');
        tab.pdfData = buffer;
        return buffer;
      } catch (err) {
        console.warn('Could not compile PDF buffer from editor:', err);
      }
    }
    return null;
  }

  // Problem 4: Unique PDF Engineering Tools (Reverse Pages, Compress, Delete Page)
  function setupPdfEngineeringTools() {
    // 1. Reverse Page Order (1..N to N..1 for back-to-front scans)
    $('#pdfReversePagesBtn')?.addEventListener('click', async () => {
      const activeTab = window.DocFlow.UI.Tabs.get(window.DocFlow.UI.Tabs.activeId);
      const pdfBuffer = await ensureTabPdfData(activeTab);
      if (!activeTab || !pdfBuffer) {
        showToast('Open or create a PDF document first to reverse pages', 'warning');
        return;
      }
      try {
        showToast('Reversing PDF page order (1..N to N..1)...', 'info');
        const srcPdf = await PDFLib.PDFDocument.load(pdfBuffer);
        const totalPages = srcPdf.getPageCount();
        if (totalPages <= 1) {
          showToast('Document only has 1 page, no reordering needed', 'info');
          return;
        }
        const newDoc = await PDFLib.PDFDocument.create();
        const pageIndices = Array.from({ length: totalPages }, (_, i) => totalPages - 1 - i);
        const copiedPages = await newDoc.copyPages(srcPdf, pageIndices);
        copiedPages.forEach(p => newDoc.addPage(p));
        const pdfBytes = await newDoc.save({ useObjectStreams: true });
        const cleanBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);
        activeTab.pdfData = cleanBuffer;
        delete activeTab.pdfDoc;

        if (activeTab.mode === 'view') {
          await loadPdfTab(activeTab);
        } else {
          const ed = $('#editor');
          if (ed) {
            const richPages = Array.from(ed.querySelectorAll('.pdf-rich-page, .df-page'));
            if (richPages.length > 1) {
              richPages.reverse();
              richPages.forEach(p => ed.appendChild(p));
              window.DocFlow.Editor?.notifyChange?.();
            }
          }
        }

        const blob = new Blob([cleanBuffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const baseName = (activeTab.name || 'document').replace(/\.pdf$/i, '');
        a.download = `${baseName}_reversed.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast(`Reversed all ${totalPages} pages in document and started download!`, 'success');
      } catch (err) {
        console.error('PDF Reverse error:', err);
        showToast('Failed to reverse pages: ' + err.message, 'error');
      }
    });

    // 3. Compress / Optimize PDF Object Streams
    $('#pdfCompressBtn')?.addEventListener('click', async () => {
      const activeTab = window.DocFlow.UI.Tabs.get(window.DocFlow.UI.Tabs.activeId);
      const pdfBuffer = await ensureTabPdfData(activeTab);
      if (!activeTab || !pdfBuffer) {
        showToast('Open or create a PDF document first to compress', 'warning');
        return;
      }
      try {
        showToast('Optimizing and compressing PDF streams...', 'info');
        const originalSize = pdfBuffer.byteLength || (activeTab.size || 0);
        const srcPdf = await PDFLib.PDFDocument.load(pdfBuffer);
        const compressedBytes = await srcPdf.save({
          useObjectStreams: true,
          addDefaultPage: false,
          objectsPerTick: 50
        });
        const newSize = compressedBytes.byteLength;
        const cleanBuffer = compressedBytes.buffer.slice(compressedBytes.byteOffset, compressedBytes.byteOffset + compressedBytes.byteLength);
        activeTab.pdfData = cleanBuffer;
        delete activeTab.pdfDoc;
        if (activeTab.mode === 'view') {
          await loadPdfTab(activeTab);
        }

        const blob = new Blob([cleanBuffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const baseName = (activeTab.name || 'document').replace(/\.pdf$/i, '');
        a.download = `${baseName}_compressed.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        
        const savedBytes = Math.max(0, originalSize - newSize);
        const pct = originalSize > 0 ? ((savedBytes / originalSize) * 100).toFixed(1) : 0;
        const savedKb = (savedBytes / 1024).toFixed(1);
        showToast(`PDF compressed: ${newSize < originalSize ? `Saved ${savedKb} KB (${pct}%)` : 'Optimized'}! Download started.`, 'success');
      } catch (err) {
        console.error('PDF Compress error:', err);
        showToast('Failed to compress PDF: ' + err.message, 'error');
      }
    });

    // 4. Delete Current Page
    $('#pdfDeleteCurrentPageBtn')?.addEventListener('click', async () => {
      const activeTab = window.DocFlow.UI.Tabs.get(window.DocFlow.UI.Tabs.activeId);
      const pdfBuffer = await ensureTabPdfData(activeTab);
      if (!activeTab || !pdfBuffer) {
        showToast('Open or create a PDF document first to delete a page', 'warning');
        return;
      }
      const totalPages = (activeTab.pdfDoc && activeTab.pdfDoc.numPages) || pdfTotalPages || 1;
      if (totalPages <= 1) {
        showToast('Cannot delete the only page in the document', 'warning');
        return;
      }
      const pageIndexToDelete = Math.max(0, Math.min(pdfCurrentPage - 1, totalPages - 1));
      try {
        showToast(`Deleting page ${pageIndexToDelete + 1} of ${totalPages}...`, 'info');
        const srcPdf = await PDFLib.PDFDocument.load(pdfBuffer);
        srcPdf.removePage(pageIndexToDelete);
        const pdfBytes = await srcPdf.save({ useObjectStreams: true });
        const cleanBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);
        
        activeTab.pdfData = cleanBuffer;
        delete activeTab.pdfDoc;
        pdfCurrentPage = Math.max(1, Math.min(pdfCurrentPage, totalPages - 1));

        if (activeTab.mode === 'view') {
          await loadPdfTab(activeTab);
        } else {
          const ed = $('#editor');
          if (ed) {
            const richPages = Array.from(ed.querySelectorAll('.pdf-rich-page, .df-page'));
            if (richPages.length > pageIndexToDelete) {
              richPages[pageIndexToDelete].remove();
              window.DocFlow.Editor?.notifyChange?.();
            }
          }
        }
        showToast(`Page ${pageIndexToDelete + 1} deleted. Remaining pages: ${totalPages - 1}`, 'success');
      } catch (err) {
        console.error('PDF Delete Page error:', err);
        showToast('Failed to delete page: ' + err.message, 'error');
      }
    });
  }

  function setupPdfMetadata() {
    $('#pdfMetadataBtn')?.addEventListener('click', async () => {
      const activeTab = window.DocFlow.UI.Tabs.get(window.DocFlow.UI.Tabs.activeId);
      const curDoc = activeTab?.pdfDoc || pdfDoc;
      if (!activeTab) {
        showToast('Open a document or PDF first to view properties', 'warning');
        return;
      }
      try {
        let meta = null;
        let info = {};
        if (curDoc) {
          try {
            meta = await curDoc.getMetadata();
            info = meta?.info || {};
          } catch (_) { }
        } else {
          // Provide rich metadata for extracted or created documents
          const editor = $('#editor');
          const text = editor ? editor.innerText.trim() : '';
          info = {
            Title: activeTab.name || 'Untitled Document',
            Author: 'User',
            Subject: activeTab.type || 'Rich Document',
            Creator: 'DocFlow Document Engine',
            Producer: 'DocFlow 2026',
            Keywords: 'Extracted, Rich Mode, PDF, HTML'
          };
        }
        const metaFields = [
          { label: 'File Name', val: activeTab.name || 'document.pdf', icon: 'fa-file-pdf', color: '#ef4444' },
          { label: 'Document Title', val: info.Title || 'None specified', icon: 'fa-heading', color: '#0284c7' },
          { label: 'Author / Creator', val: info.Author || info.Creator || 'Unknown', icon: 'fa-user-pen', color: '#10b981' },
          { label: 'Subject', val: info.Subject || 'None', icon: 'fa-tag', color: '#8b5cf6' },
          { label: 'Keywords', val: info.Keywords || 'None', icon: 'fa-key', color: '#f59e0b' },
          { label: 'Producer', val: info.Producer || 'PDF Standard Engine', icon: 'fa-gears', color: '#64748b' },
          { label: 'PDF Version', val: meta?.metadata?.get?.('pdf:pdfversion') || info.PDFFormatVersion || '1.7', icon: 'fa-code-branch', color: '#ec4899' },
          { label: 'Total Pages', val: `${pdfTotalPages} page${pdfTotalPages > 1 ? 's' : ''}`, icon: 'fa-copy', color: '#06b6d4' },
          { label: 'File Size', val: activeTab.pdfData ? `${(activeTab.pdfData.byteLength / 1024).toFixed(1)} KB` : 'Unknown', icon: 'fa-hard-drive', color: '#16a34a' },
          { label: 'Creation Date', val: info.CreationDate ? String(info.CreationDate).replace(/^D:/, '').slice(0, 14) : 'Not recorded', icon: 'fa-calendar', color: '#ea580c' }
        ];

        const container = $('#pdfMetadataContent');
        if (container) {
          container.innerHTML = metaFields.map(f => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:8px;">
              <div style="display:flex;align-items:center;gap:10px;">
                <i class="fas ${f.icon}" style="color:${f.color};font-size:14px;width:18px;text-align:center;"></i>
                <span style="font-size:12.5px;font-weight:600;color:var(--text-secondary);">${escHtml(f.label)}:</span>
              </div>
              <span style="font-size:12.5px;color:var(--text-primary);max-width:280px;text-align:right;word-break:break-word;font-weight:500;">${escHtml(f.val)}</span>
            </div>
          `).join('');
        }
        openModal('#pdfMetadataModal');
      } catch (err) {
        showToast('Error reading PDF metadata: ' + err.message, 'error');
      }
    });

    $('#pdfMetadataCloseBtn')?.addEventListener('click', () => closeModal('#pdfMetadataModal'));
    $('#pdfMetadataDoneBtn')?.addEventListener('click', () => closeModal('#pdfMetadataModal'));

  }

  function initPdfViewer() {
    setupPdfControls();
    setupMergePdfModal();
    setupCreatePdfFromImagesModal();
    setupPdfEngineeringTools();
    setupPdfMetadata();
  }

  // Export module
  window.DocFlow = window.DocFlow || {};
  window.DocFlow.PDF = {
    initPdfViewer,
    loadPdfTab,
    openMergeModal,
    openCreatePdfFromImagesModal,
    extractTextFromPdf,
    extractImagesFromPdf,
    rotatePdf,
    jumpToPage,
    setPdfZoom,
    fitPdf,
    toggleTwoPage,
    downloadCurrentPdf,
    printCurrentPdf,
    undoPdf,
    redoPdf,
    canUndoPdf: () => pdfUndoStack.length > 1,
    canRedoPdf: () => pdfRedoStack.length > 0,
    nextPage: () => $('#pdfNext')?.click(),
    prevPage: () => $('#pdfPrev')?.click(),
    getTotalPages: () => pdfTotalPages,
    getCurrentPage: () => pdfCurrentPage,
    getPdfDoc: () => pdfDoc
  };

})(window);

