/**
 * DocFlow — Document Importers (DOCX, XLSX, CSV, MD, TXT, HTML) & Exporters
 */

(function (window) {
  'use strict';

  const { $, $$, escHtml, showToast } = window.DocFlow.UI;

  const SUPPORTED_DOC_EXTS = ['docx', 'pdf', 'txt', 'html', 'htm', 'csv', 'md', 'markdown', 'xlsx', 'xls', 'pptx', 'ppt'];

  // Helper download blob
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  function getBaseName() {
    const display = $('#fileNameDisplay');
    const name = (display ? display.textContent : 'document') || 'document';
    return name.replace(/\.[^.]+$/, '') || 'document';
  }

  // ==========================================================================
  // Document Reading & Parsing
  // ==========================================================================

  async function handleFile(file) {
    if (!file) return;
    const name = file.name;
    const ext = name.split('.').pop().toLowerCase();

    // Check if it's an image dropped into document
    if (window.DocFlow.ImageManager && window.DocFlow.ImageManager.isImageFile(file)) {
      if (window.DocFlow.currentMode === 'edit') {
        try {
          const dataUrl = await window.DocFlow.ImageManager.optimizeImage(file);
          window.DocFlow.ImageManager.insertImageIntoDocument(dataUrl, name);
          showToast(`Inserted image "${name}" into document`, 'success');
          return;
        } catch (e) {
          showToast(`Could not load image "${name}"`, 'error');
        }
      }
    }

    if (!SUPPORTED_DOC_EXTS.includes(ext)) {
      showToast(`Unsupported file type: .${ext}`, 'error');
      showToast(`Supported documents: DOCX, PDF, PPTX, XLSX, TXT, HTML, CSV, MD`, 'info');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      showToast(`File "${name}" exceeds 50MB size limit`, 'error');
      return;
    }

    // If document is locked and protected, prompt for password/PIN before opening (c.txt Issue 1.a)
    const isLocked = window.DocFlow?.FileLockStore?.isLockedSync?.(name);
    if (isLocked) {
      window.DocFlow?.openUnlockDocModal?.({ name: file.name, fileObject: file, isLocked: true });
      return;
    }

    const existing = window.DocFlow.UI.Tabs.findByFile(name);
    if (existing) {
      window.DocFlow.UI.Tabs.switchTo(existing.id);
      showToast(`"${name}" is already open`, 'info');
      return;
    }

    // PDF files
    if (ext === 'pdf') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        if (!arrayBuffer || arrayBuffer.byteLength === 0) throw new Error('File is empty');
        const tab = window.DocFlow.UI.Tabs.create(name, '', 'PDF', 'pdf');
        tab.pdfData = arrayBuffer;
        if (window.DocFlow?.PdfStore) {
          await window.DocFlow.PdfStore.set(name, arrayBuffer);
          await window.DocFlow.PdfStore.set('tab-' + tab.id, arrayBuffer);
        }
        await window.DocFlow.PDF.loadPdfTab(tab);
        window.DocFlow.UI.Tabs.render();
        window.DocFlow.UI.Tabs.save();
        if (window.DocFlow?.Recent) {
          window.DocFlow.Recent.add({ name, type: 'PDF', mode: 'view', pdfData: arrayBuffer, size: file.size });
        }
      } catch (err) {
        console.error(err);
        if (err && err.name === 'PasswordException') {
          showToast('This PDF is password-protected and cannot be opened', 'error');
        } else {
          showToast(`Failed to open "${name}": ${(err && err.message) || 'Unknown error'}`, 'error');
        }
      }
      return;
    }

    // Editable text documents
    let content = '';
    let fileTypeLabel = ext.toUpperCase();

    try {
      showToast(`Opening "${name}"...`, 'info');

      if (ext === 'docx') {
        const ab = await file.arrayBuffer();
        content = await docxToHtml(ab, name);
        fileTypeLabel = 'DOCX';
      } else if (ext === 'txt') {
        const text = await file.text();
        content = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
        fileTypeLabel = 'TXT';
      } else if (ext === 'html' || ext === 'htm') {
        const rawHtml = await file.text();
        // Display as raw editable code to avoid rendering preview and crashing on large files
        content = `<pre class="html-code-view" style="font-family: 'Fira Code', 'Courier New', Consolas, monospace; font-size: 13.5px; line-height: 1.6; white-space: pre-wrap; word-break: break-all; margin: 0; background: transparent; border: none; padding: 0;">${escHtml(rawHtml)}</pre>`;
        fileTypeLabel = 'HTML';
      } else if (ext === 'csv') {
        const text = await file.text();
        content = csvToHtml(text);
        fileTypeLabel = 'CSV';
      } else if (ext === 'md' || ext === 'markdown') {
        const mdText = await file.text();
        content = `<pre class="md-code-view" style="font-family: 'Fira Code', 'Courier New', Consolas, monospace; font-size: 13.5px; line-height: 1.6; white-space: pre-wrap; word-break: break-all; margin: 0; background: transparent; border: none; padding: 0;">${escHtml(mdText)}</pre>`;
        fileTypeLabel = 'Markdown';
      } else if (ext === 'xlsx' || ext === 'xls') {
        const ab = await file.arrayBuffer();
        content = excelToHtml(ab, name);
        fileTypeLabel = 'Excel';
      } else if (ext === 'pptx' || ext === 'ppt') {
        const ab = await file.arrayBuffer();
        content = await pptxToHtml(ab, name);
        fileTypeLabel = 'PowerPoint';
      }
    } catch (err) {
      console.error(err);
      showToast(`Failed to parse "${name}": ${err.message}`, 'error');
      return;
    }

    if (!content.trim()) content = '<p><br></p>';

    const tab = window.DocFlow.UI.Tabs.create(name, content, fileTypeLabel, 'edit');
    window.DocFlow.UI.Tabs.activateTab(tab);
    if (window.DocFlow && window.DocFlow.Recent) {
      window.DocFlow.Recent.add({ name, type: fileTypeLabel, content, mode: 'edit', size: file.size });
    }
    showToast(`Successfully opened "${name}"`, 'success');
  }

  // ==========================================================================
  // CSV & Excel Converters
  // ==========================================================================

  function parseCsv(text) {
    // Strip UTF-8 BOM if present
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.slice(1);
    }

    const rows = [];
    let cur = '', inQ = false, row = [];
    const flush = () => {
      row.push(cur.trim());
      cur = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    };

    for (let i = 0; i < text.length; i++) {
      const ch = text[i], nx = text[i + 1];
      if (inQ) {
        if (ch === '"' && nx === '"') { cur += '"'; i++; }
        else if (ch === '"') inQ = false;
        else cur += ch;
      } else {
        if (ch === '"') inQ = true;
        else if (ch === ',') { row.push(cur.trim()); cur = ''; }
        else if (ch === '\n' || (ch === '\r' && nx === '\n')) { flush(); if (ch === '\r') i++; }
        else if (ch === '\r') { flush(); }
        else cur += ch;
      }
    }
    flush();
    return rows;
  }

  function looksLikeHeader(row) {
    if (!row || !row.length) return false;
    const cells = row.map(c => String(c).trim());
    const nonEmpty = cells.filter(c => c !== '');
    if (!nonEmpty.length) return false;
    const numeric = nonEmpty.filter(c => !isNaN(Number(c))).length;
    return (numeric / nonEmpty.length) < 0.5;
  }

  // High-Fidelity DOCX Parser (Bug 7: Fonts, styles, links, spacing, alignment, layout, and embedded images)
  async function docxToHtml(arrayBuffer, filename) {
    if (typeof window.JSZip === 'undefined') {
      if (window.mammoth) {
        const res = await window.mammoth.convertToHtml({ arrayBuffer });
        return res.value || '<p><br></p>';
      }
      return '<p>Document parser not loaded</p>';
    }

    try {
      const zip = await window.JSZip.loadAsync(arrayBuffer);
      const docXmlEntry = zip.file('word/document.xml');
      if (!docXmlEntry) {
        throw new Error('word/document.xml not found in package');
      }

      // Read relationships to map IDs to images and external links
      const relsMap = {};
      const relsEntry = zip.file('word/_rels/document.xml.rels');
      if (relsEntry) {
        const relsXml = await relsEntry.async('string');
        const parser = new DOMParser();
        const relsDoc = parser.parseFromString(relsXml, 'application/xml');
        relsDoc.querySelectorAll('Relationship').forEach(rel => {
          const id = rel.getAttribute('Id');
          const target = rel.getAttribute('Target');
          const type = rel.getAttribute('Type') || '';
          relsMap[id] = { target, type };
        });
      }

      // Extract all embedded images in word/media/
      const mediaMap = {};
      const mediaFiles = [];
      zip.forEach((path, entry) => {
        if (/^word\/media\//i.test(path)) {
          mediaFiles.push({ path, entry });
        }
      });

      for (const m of mediaFiles) {
        try {
          const base64 = await m.entry.async('base64');
          const ext = m.path.split('.').pop().toLowerCase();
          const mime = ext === 'png' ? 'image/png' : (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : (ext === 'svg' ? 'image/svg+xml' : 'image/png');
          const dataUrl = `data:${mime};base64,${base64}`;
          const normalizedPath = m.path.replace(/^word\//i, '');
          mediaMap[normalizedPath] = dataUrl;
          mediaMap[m.path] = dataUrl;
          const fileName = m.path.split('/').pop();
          mediaMap[fileName] = dataUrl;
        } catch (e) { }
      }

      // Read document.xml and parse
      const docXml = await docXmlEntry.async('string');
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(docXml, 'application/xml');

      // Check for altChunk HTML import
      const altChunkNode = xmlDoc.querySelector('altChunk, w\\:altChunk');
      if (altChunkNode) {
        const rId = altChunkNode.getAttribute('r:id') || altChunkNode.getAttribute('id');
        const target = relsMap[rId]?.target;
        if (target) {
          const chunkPath = target.startsWith('word/') ? target : 'word/' + target.replace(/^\//, '');
          const chunkEntry = zip.file(chunkPath);
          if (chunkEntry) {
            const rawChunkHtml = await chunkEntry.async('string');
            if (rawChunkHtml && rawChunkHtml.trim()) {
              const bodyMatch = rawChunkHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
              return bodyMatch ? bodyMatch[1] : rawChunkHtml;
            }
          }
        }
      }

      const parseRunStyles = (rPr) => {
        if (!rPr) return '';
        const styles = [];
        const rFonts = rPr.querySelector('rFonts');
        if (rFonts) {
          const font = rFonts.getAttribute('w:ascii') || rFonts.getAttribute('w:hAnsi');
          if (font) styles.push(`font-family: '${font}', sans-serif;`);
        }
        const sz = rPr.querySelector('sz');
        if (sz) {
          const val = parseInt(sz.getAttribute('w:val'), 10);
          if (!isNaN(val)) styles.push(`font-size: ${Math.round(val / 2)}pt;`);
        }
        if (rPr.querySelector('b')) styles.push('font-weight: bold;');
        if (rPr.querySelector('i')) styles.push('font-style: italic;');
        if (rPr.querySelector('u')) styles.push('text-decoration: underline;');
        if (rPr.querySelector('strike')) styles.push('text-decoration: line-through;');
        const color = rPr.querySelector('color');
        if (color) {
          const val = color.getAttribute('w:val');
          if (val && val !== 'auto') styles.push(`color: #${val};`);
        }
        const highlight = rPr.querySelector('highlight');
        if (highlight) {
          const val = highlight.getAttribute('w:val');
          if (val && val !== 'none') styles.push(`background-color: ${val};`);
        }
        const shd = rPr.querySelector('shd');
        if (shd) {
          const fill = shd.getAttribute('w:fill');
          if (fill && fill !== 'auto' && fill !== 'none') styles.push(`background-color: #${fill};`);
        }
        return styles.join(' ');
      };

      const parseParagraphStyles = (pPr) => {
        if (!pPr) return { css: '', tag: 'p' };
        const styles = [];
        let tag = 'p';

        const jc = pPr.querySelector('jc');
        if (jc) {
          const val = jc.getAttribute('w:val');
          if (val === 'center') styles.push('text-align: center;');
          else if (val === 'right') styles.push('text-align: right;');
          else if (val === 'both') styles.push('text-align: justify;');
          else if (val === 'left') styles.push('text-align: left;');
        }

        const spacing = pPr.querySelector('spacing');
        if (spacing) {
          const line = spacing.getAttribute('w:line');
          if (line) {
            const lineVal = parseInt(line, 10);
            if (!isNaN(lineVal)) styles.push(`line-height: ${(lineVal / 240).toFixed(2)};`);
          }
          const before = spacing.getAttribute('w:before');
          if (before) styles.push(`margin-top: ${Math.round(parseInt(before, 10) / 20)}pt;`);
          const after = spacing.getAttribute('w:after');
          if (after) styles.push(`margin-bottom: ${Math.round(parseInt(after, 10) / 20)}pt;`);
        }

        const pStyle = pPr.querySelector('pStyle');
        if (pStyle) {
          const sVal = (pStyle.getAttribute('w:val') || '').toLowerCase();
          if (sVal.includes('heading 1') || sVal === 'heading1' || sVal === '1') tag = 'h1';
          else if (sVal.includes('heading 2') || sVal === 'heading2' || sVal === '2') tag = 'h2';
          else if (sVal.includes('heading 3') || sVal === 'heading3' || sVal === '3') tag = 'h3';
          else if (sVal.includes('heading 4') || sVal === 'heading4' || sVal === '4') tag = 'h4';
          else if (sVal.includes('title')) tag = 'h1';
        }

        return { css: styles.join(' '), tag };
      };

      const body = xmlDoc.querySelector('body');
      if (!body) throw new Error('w:body element missing in document.xml');

      let resultHtml = '';

      body.childNodes.forEach(node => {
        const localName = node.localName || node.nodeName.split(':').pop();

        if (localName === 'p') {
          const pPr = node.querySelector(':scope > pPr');
          const { css, tag } = parseParagraphStyles(pPr);

          let inner = '';
          node.childNodes.forEach(child => {
            const cName = child.localName || child.nodeName.split(':').pop();
            if (cName === 'r') {
              const rPr = child.querySelector(':scope > rPr');
              const rCss = parseRunStyles(rPr);

              const t = child.querySelector(':scope > t');
              if (t) {
                const textContent = escHtml(t.textContent || '');
                inner += rCss ? `<span style="${rCss}">${textContent}</span>` : textContent;
              }

              if (child.querySelector(':scope > br')) {
                inner += '<br>';
              }

              const drawings = child.querySelectorAll('drawing, pict');
              drawings.forEach(d => {
                const blip = d.querySelector('blip, imagedata');
                if (blip) {
                  const embedId = blip.getAttribute('r:embed') || blip.getAttribute('r:id');
                  if (embedId && relsMap[embedId]) {
                    const target = relsMap[embedId].target;
                    const cleanTarget = target.replace(/^word\//i, '');
                    const imgUrl = mediaMap[cleanTarget] || mediaMap[target] || mediaMap[target.split('/').pop()];
                    if (imgUrl) {
                      const extent = d.querySelector('extent');
                      let imgStyle = 'max-width:100%;height:auto;display:inline-block;margin:6px 0;border-radius:4px;';
                      if (extent) {
                        const cx = parseInt(extent.getAttribute('cx'), 10);
                        if (!isNaN(cx)) {
                          const pxWidth = Math.round(cx / 9525);
                          if (pxWidth > 20 && pxWidth < 900) imgStyle += `width:${pxWidth}px;`;
                        }
                      }
                      inner += `<img src="${imgUrl}" alt="Embedded image" style="${imgStyle}" draggable="true" data-wrap="inline">`;
                    }
                  }
                }
              });
            } else if (cName === 'hyperlink') {
              const rId = child.getAttribute('r:id');
              const targetUrl = (rId && relsMap[rId]) ? relsMap[rId].target : '#';
              let linkInner = '';
              child.querySelectorAll('r').forEach(rNode => {
                const rPr = rNode.querySelector(':scope > rPr');
                const rCss = parseRunStyles(rPr);
                const t = rNode.querySelector(':scope > t');
                if (t) {
                  const txt = escHtml(t.textContent || '');
                  linkInner += rCss ? `<span style="${rCss}">${txt}</span>` : txt;
                }
              });
              inner += `<a href="${escHtml(targetUrl)}" target="_blank" rel="noopener">${linkInner || escHtml(targetUrl)}</a>`;
            }
          });

          if (!inner.trim()) inner = '<br>';
          resultHtml += `<${tag}${css ? ` style="${css}"` : ''}>${inner}</${tag}>`;
        } else if (localName === 'tbl') {
          let tblHtml = '<table style="border-collapse:collapse;width:100%;margin:14px 0;"><tbody>';
          node.querySelectorAll(':scope > tr').forEach(tr => {
            tblHtml += '<tr>';
            tr.querySelectorAll(':scope > tc').forEach(tc => {
              const tcPr = tc.querySelector(':scope > tcPr');
              let cellStyle = 'border:1px solid #cbd5e1;padding:6px 10px;vertical-align:top;';
              if (tcPr) {
                const shd = tcPr.querySelector('shd');
                if (shd) {
                  const fill = shd.getAttribute('w:fill');
                  if (fill && fill !== 'auto') cellStyle += `background-color:#${fill};`;
                }
                const tcW = tcPr.querySelector('tcW');
                if (tcW) {
                  const wVal = parseInt(tcW.getAttribute('w:w'), 10);
                  if (!isNaN(wVal) && wVal > 0) cellStyle += `width:${Math.round(wVal / 20)}pt;`;
                }
              }

              let cellContent = '';
              tc.querySelectorAll(':scope > p').forEach(cp => {
                let pText = '';
                cp.querySelectorAll('r').forEach(r => {
                  const rPr = r.querySelector('rPr');
                  const rCss = parseRunStyles(rPr);
                  const t = r.querySelector('t');
                  if (t) {
                    const txt = escHtml(t.textContent || '');
                    pText += rCss ? `<span style="${rCss}">${txt}</span>` : txt;
                  }
                  const blip = r.querySelector('blip');
                  if (blip) {
                    const embedId = blip.getAttribute('r:embed');
                    if (embedId && relsMap[embedId]) {
                      const imgUrl = mediaMap[relsMap[embedId].target.split('/').pop()];
                      if (imgUrl) pText += `<img src="${imgUrl}" style="max-width:100%;height:auto;border-radius:3px;">`;
                    }
                  }
                });
                cellContent += `<p style="margin:2px 0;">${pText || '<br>'}</p>`;
              });

              tblHtml += `<td style="${cellStyle}">${cellContent || '<br>'}</td>`;
            });
            tblHtml += '</tr>';
          });
          tblHtml += '</tbody></table>';
          resultHtml += tblHtml;
        }
      });

      if (resultHtml.trim()) return resultHtml;
      throw new Error('Parsed document yielded empty body');
    } catch (err) {
      console.warn('DocFlow custom DOCX parser fallback to Mammoth:', err);
      if (window.mammoth) {
        const options = {
          convertImage: window.mammoth.images.imgElement(image => {
            return image.read("base64").then(imageBuffer => ({
              src: "data:" + image.contentType + ";base64," + imageBuffer
            }));
          }),
          styleMap: [
            "p[style-name='Title'] => h1:fresh",
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Heading 3'] => h3:fresh"
          ]
        };
        const result = await window.mammoth.convertToHtml({ arrayBuffer }, options);
        return result.value || '<p><br></p>';
      }
      return `<p>Could not render "${escHtml(filename)}": ${escHtml(err.message)}</p>`;
    }
  }

  function csvToHtml(text) {
    const rows = parseCsv(text);
    if (!rows.length) return '<p>Empty CSV file</p>';
    const cols = rows[0].length;
    let html = `<div class="excel-spreadsheet-container">`;
    html += `
      <div class="excel-formula-bar">
        <span class="excel-fx-badge">fx</span>
        <input type="text" class="excel-formula-input" placeholder="Select cell to view/edit value">
      </div>
      <div class="excel-sheet-viewport">
        <table class="excel-grid-table">
    `;
    html += '<thead><tr><th class="excel-corner" contenteditable="false"></th>';
    for (let c = 0; c < cols; c++) {
      html += `<th class="excel-col-hdr" contenteditable="false">${getExcelColLetter(c)}</th>`;
    }
    html += '</tr></thead><tbody>';
    rows.forEach((r, rIdx) => {
      html += `<tr><th class="excel-row-hdr" contenteditable="false">${rIdx + 1}</th>`;
      for (let c = 0; c < cols; c++) {
        const val = r[c] !== undefined ? r[c] : '';
        html += `<td contenteditable="true">${escHtml(val)}</td>`;
      }
      html += '</tr>';
    });
    html += '</tbody></table></div></div>';
    return html;
  }

  // Convert zero-based column index to Excel column letter (0 -> A, 25 -> Z, 26 -> AA, up to 16383 -> XFD)
  function getExcelColLetter(index) {
    let letter = '';
    let temp = index;
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  }

  // Realistic Excel Spreadsheet Viewer with auto-adjusting formula bar and grid (Bug 6)
  function excelToHtml(arrayBuffer, filename) {
    if (typeof window.XLSX === 'undefined') {
      return '<p>Excel reader library not loaded. Please refresh the page.</p>';
    }

    try {
      const wb = window.XLSX.read(arrayBuffer, {
        type: 'array',
        cellDates: true,
        cellNF: true,
        cellText: true,
        dateNF: 'yyyy-mm-dd'
      });

      let html = `<p style="margin-bottom:12px;color:var(--text-primary);"><strong style="color:var(--text-primary);"><i class="fas fa-file-excel" style="color:#16a34a;margin-right:6px;"></i>${escHtml(filename)}</strong> — <span style="color:var(--text-muted);">${wb.SheetNames.length} sheet(s)</span></p>`;

      wb.SheetNames.forEach(sheetName => {
        const ws = wb.Sheets[sheetName];
        const data = window.XLSX.utils.sheet_to_json(ws, {
          header: 1,
          raw: false,
          defval: '',
          dateNF: 'yyyy-mm-dd'
        });

        let maxCols = 10;
        if (data && data.length) {
          data.forEach(r => { if (r && r.length > maxCols) maxCols = r.length; });
        }

        const rowCount = Math.max(30, (data ? data.length : 0));
        const maxDisplayRows = Math.min(rowCount, 500);

        html += `<h3 style="margin:16px 0 8px;font-size:15px;color:var(--text-primary);"><i class="fas fa-table-cells" style="color:#16a34a;margin-right:6px;"></i>Sheet: ${escHtml(sheetName)}</h3>`;
        html += `<div class="excel-spreadsheet-container">`;
        html += `
          <div class="excel-formula-bar">
            <span class="excel-fx-badge">fx</span>
            <input type="text" class="excel-formula-input" placeholder="Select cell to view/edit formula or value">
          </div>
          <div class="excel-sheet-viewport">
            <table class="excel-grid-table">
        `;

        html += '<thead><tr><th class="excel-corner" contenteditable="false"></th>';
        for (let c = 0; c < maxCols; c++) {
          html += `<th class="excel-col-hdr" contenteditable="false">${getExcelColLetter(c)}</th>`;
        }
        html += '</tr></thead><tbody>';

        for (let r = 0; r < maxDisplayRows; r++) {
          const rowData = (data && data[r]) ? data[r] : [];
          html += `<tr><th class="excel-row-hdr" contenteditable="false">${r + 1}</th>`;
          for (let c = 0; c < maxCols; c++) {
            const val = (rowData[c] !== undefined && rowData[c] !== null) ? String(rowData[c]) : '';
            html += `<td contenteditable="true">${escHtml(val)}</td>`;
          }
          html += '</tr>';
        }

        if (data && data.length > 500) {
          html += `<tr><th class="excel-row-hdr" contenteditable="false">...</th><td colspan="${maxCols}" style="text-align:center;color:#888;font-style:italic;">... ${data.length - 500} more rows</td></tr>`;
        }
        html += '</tbody></table></div></div>';
      });

      return html;
    } catch (e) {
      return `<p>Error reading Excel file: ${escHtml(e.message)}</p>`;
    }
  }

  // Parse Excel Coordinate String (e.g. A1, Z50, XFD1048576) into { col, row, colLetter }
  function parseExcelCoord(coordStr) {
    if (!coordStr || typeof coordStr !== 'string') return null;
    const match = coordStr.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;
    const colLetters = match[1];
    const rowNum = parseInt(match[2], 10);
    if (isNaN(rowNum) || rowNum < 1 || rowNum > 1048576) return null;
    let colIdx = 0;
    for (let i = 0; i < colLetters.length; i++) {
      colIdx = colIdx * 26 + (colLetters.charCodeAt(i) - 64);
    }
    if (colIdx < 1 || colIdx > 16384) return null;
    return { col: colIdx - 1, row: rowNum, colLetter: colLetters };
  }

  // Create Authentic Excel Spreadsheet Grid with 50 Rows × 50 Columns default (Issue 5)
  function createBlankExcelGrid(cols = 50, rows = 50) {
    let html = `<div class="excel-spreadsheet-container" contenteditable="false" data-total-rows="1048576" data-total-cols="16384">`;
    html += `
      <div class="excel-formula-bar" contenteditable="false">
        <input type="text" class="excel-coord-box" value="A1" placeholder="Cell" title="Name Box — Type coordinate (e.g. A1, XFD1048576) and press Enter">
        <span class="excel-fx-badge" contenteditable="false">fx</span>
        <input type="text" class="excel-formula-input" placeholder="Select cell or enter formula / value">
        <button type="button" class="excel-jump-btn" data-jump="home" title="Jump to Home Cell A1" style="font-size:11px;padding:2px 8px;background:var(--bg-tertiary);border:1px solid var(--border);border-radius:4px;color:var(--text-secondary);cursor:pointer;">A1</button>
      </div>
      <div class="excel-sheet-viewport">
        <table class="excel-grid-table">
    `;
    html += '<thead><tr><th class="excel-corner" contenteditable="false"></th>';
    for (let c = 0; c < cols; c++) {
      html += `<th class="excel-col-hdr" contenteditable="false">${getExcelColLetter(c)}</th>`;
    }
    html += '</tr></thead><tbody>';
    for (let r = 0; r < rows; r++) {
      html += `<tr><th class="excel-row-hdr" contenteditable="false">${r + 1}</th>`;
      for (let c = 0; c < cols; c++) {
        const coord = `${getExcelColLetter(c)}${r + 1}`;
        html += `<td contenteditable="true" data-coord="${coord}"></td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table></div></div>';
    return html;
  }

  // PowerPoint Presentation Viewer & Slide Card Extractor (Bug 12)
  async function pptxToHtml(arrayBuffer, filename) {
    if (typeof window.JSZip === 'undefined') {
      return `<p>JSZip decompression library not loaded. Please refresh the page.</p>`;
    }

    try {
      const zip = await window.JSZip.loadAsync(arrayBuffer);
      const slideFileNames = [];

      zip.forEach((relativePath) => {
        if (/^ppt\/slides\/slide\d+\.xml$/i.test(relativePath)) {
          slideFileNames.push(relativePath);
        }
      });

      if (!slideFileNames.length) {
        return `
          <div class="pptx-container">
            <div class="pptx-slide-card">
              <div class="pptx-slide-header">
                <span class="pptx-slide-badge"><i class="fas fa-file-powerpoint"></i> Presentation</span>
              </div>
              <div class="pptx-slide-title" contenteditable="true">${escHtml(filename)}</div>
              <div class="pptx-slide-body" contenteditable="true">
                <p>Presentation document loaded.</p>
              </div>
            </div>
          </div>
        `;
      }

      // Sort slides numerically: slide1, slide2, slide3...
      slideFileNames.sort((a, b) => {
        const numA = parseInt((a.match(/\d+/) || [0])[0], 10);
        const numB = parseInt((b.match(/\d+/) || [0])[0], 10);
        return numA - numB;
      });

      const parser = new DOMParser();
      let html = `<div style="margin-bottom:14px;"><strong><i class="fas fa-file-powerpoint" style="color:#ea580c;"></i> ${escHtml(filename)}</strong> — ${slideFileNames.length} slide(s)</div>`;
      html += '<div class="pptx-container">';

      for (let i = 0; i < slideFileNames.length; i++) {
        const slidePath = slideFileNames[i];
        const slideXmlStr = await zip.file(slidePath).async('string');
        const xmlDoc = parser.parseFromString(slideXmlStr, 'application/xml');

        // Extract slide transitions (e.g. fade, push, wipe, split, zoom, fly-in, etc.)
        let slideTransition = 'none';
        const transitionNode = xmlDoc.querySelector('p\\:transition, transition');
        if (transitionNode && transitionNode.firstElementChild) {
          const tName = transitionNode.firstElementChild.localName || transitionNode.firstElementChild.tagName.replace(/.*:/, '');
          const knownTransitions = ['fade', 'slide', 'push', 'zoom', 'flip', 'slide-up', 'bounce', 'rotate', 'wipe', 'blur', 'cube', 'split', 'flash', 'shutter', 'door', 'fly-in', 'fall'];
          if (knownTransitions.includes(tName.toLowerCase())) {
            slideTransition = tName.toLowerCase();
          } else if (tName === 'wheel' || tName === 'circle') {
            slideTransition = 'rotate';
          } else if (tName === 'comb' || tName === 'blinds') {
            slideTransition = 'split';
          } else {
            slideTransition = 'fade';
          }
        }

        // Extract slide background color
        let slideBgColor = '';
        const bgNode = xmlDoc.querySelector('p\\:bg, bg, p\\:bgPr, bgPr');
        if (bgNode) {
          const srgbClr = bgNode.querySelector('a\\:srgbClr, srgbClr');
          if (srgbClr && srgbClr.getAttribute('val')) {
            slideBgColor = '#' + srgbClr.getAttribute('val');
          }
        }

        // Extract animation info
        let hasAnimation = false;
        const timingNode = xmlDoc.querySelector('p\\:timing, timing');
        if (timingNode) {
          hasAnimation = true;
        }

        // Extract shape text blocks with rich formatting preservation
        const shapes = xmlDoc.querySelectorAll('p\\:sp, sp');
        let slideTitle = '';
        const bodyBlocks = [];

        shapes.forEach(shape => {
          const ph = shape.querySelector('p\\:ph, ph');
          const isTitle = ph && (ph.getAttribute('type') === 'title' || ph.getAttribute('type') === 'ctrTitle');

          const paras = shape.querySelectorAll('a\\:p, p');
          const paraHtmls = [];

          paras.forEach(p => {
            const pPr = p.querySelector('a\\:pPr, pPr');
            const algn = pPr ? (pPr.getAttribute('algn') || 'l') : 'l';
            let textAlign = 'left';
            if (algn === 'ctr') textAlign = 'center';
            else if (algn === 'r') textAlign = 'right';
            else if (algn === 'just') textAlign = 'justify';

            const runs = p.querySelectorAll('a\\:r, r, a\\:fld, fld');
            let pContent = '';

            runs.forEach(r => {
              const textNode = r.querySelector('a\\:t, t');
              if (!textNode || !textNode.textContent) return;
              const text = textNode.textContent;
              const rPr = r.querySelector('a\\:rPr, rPr');

              const styles = [];
              if (rPr) {
                if (rPr.getAttribute('b') === '1' || rPr.getAttribute('b') === 'true') styles.push('font-weight:bold');
                if (rPr.getAttribute('i') === '1' || rPr.getAttribute('i') === 'true') styles.push('font-style:italic');
                if (rPr.getAttribute('u') === 'sng' || rPr.getAttribute('u') === '1') styles.push('text-decoration:underline');
                const sz = rPr.getAttribute('sz');
                if (sz) styles.push(`font-size:${Math.round(parseInt(sz, 10) / 100)}pt`);
                const srgb = rPr.querySelector('a\\:srgbClr, srgbClr');
                if (srgb && srgb.getAttribute('val')) styles.push(`color:#${srgb.getAttribute('val')}`);
                const latin = rPr.querySelector('a\\:latin, latin');
                if (latin && latin.getAttribute('typeface')) styles.push(`font-family:'${latin.getAttribute('typeface')}', sans-serif`);
              }

              if (styles.length) {
                pContent += `<span style="${styles.join(';')}">${escHtml(text)}</span>`;
              } else {
                pContent += escHtml(text);
              }
            });

            if (pContent.trim()) {
              paraHtmls.push(`<div style="text-align:${textAlign};margin:4px 0;">${pContent}</div>`);
            }
          });

          if (paraHtmls.length) {
            const plainText = paraHtmls.map(h => h.replace(/<[^>]+>/g, '').trim()).join(' ');
            if ((isTitle || !slideTitle) && plainText.length <= 120) {
              if (!slideTitle) {
                slideTitle = plainText;
              } else {
                bodyBlocks.push(...paraHtmls);
              }
            } else {
              bodyBlocks.push(...paraHtmls);
            }
          }
        });

        if (!slideTitle) {
          slideTitle = `Slide ${i + 1}`;
        }

        let bodyHtml = '';
        if (bodyBlocks.length) {
          bodyHtml = bodyBlocks.join('');
        } else {
          bodyHtml = '<p style="color:#94a3b8;font-style:italic;">Empty slide content</p>';
        }

        const bgStyle = slideBgColor ? `background:${slideBgColor};` : 'background:var(--bg-secondary);';
        const animAttr = hasAnimation ? ' data-animation="fade-in"' : '';

        html += `
          <div class="pptx-slide-wrapper" data-transition="${slideTransition}" style="position:relative;margin:28px auto;max-width:850px;">
            <div class="slide-quick-action-bar" contenteditable="false">
              <button class="slide-plus-action-btn" title="Add elements to slide (+)" aria-label="Add elements to slide">
                <i class="fas fa-plus"></i>
              </button>
              <div class="slide-plus-menu" role="menu">
                <div class="slide-plus-menu-title">Insert Into Slide</div>
                <button class="slide-plus-menu-item" data-action="rect"><i class="fas fa-vector-square" style="color:#0284c7;"></i> Rectangle Box</button>
                <button class="slide-plus-menu-item" data-action="nested-rect"><i class="fas fa-layer-group" style="color:#8b5cf6;"></i> Nested Card</button>
                <button class="slide-plus-menu-item" data-action="bullets"><i class="fas fa-list-ul" style="color:#10b981;"></i> Bullet Points</button>
                <div class="slide-plus-menu-sep"></div>
                <div class="slide-plus-menu-title">Shapes</div>
                <div class="slide-plus-shapes-grid">
                  <button class="slide-shape-quick-btn" data-shape="circle" title="Circle"><i class="fas fa-circle"></i></button>
                  <button class="slide-shape-quick-btn" data-shape="star" title="Star"><i class="fas fa-star"></i></button>
                  <button class="slide-shape-quick-btn" data-shape="arrow-right" title="Arrow"><i class="fas fa-arrow-right"></i></button>
                  <button class="slide-shape-quick-btn" data-shape="diamond" title="Diamond"><i class="fas fa-diamond"></i></button>
                </div>
                <div class="slide-plus-menu-sep"></div>
                <div class="slide-plus-menu-title">Slide Layout Formats</div>
                <button class="slide-plus-menu-item" data-action="layout-blank"><i class="fas fa-square" style="color:#94a3b8;"></i> Blank Canvas</button>
                <button class="slide-plus-menu-item" data-action="layout-split"><i class="fas fa-columns" style="color:#f59e0b;"></i> Split 2 Columns</button>
                <button class="slide-plus-menu-item" data-action="layout-cards"><i class="fas fa-table-cells-large" style="color:#06b6d4;"></i> 3 Card Blocks</button>
                <div class="slide-plus-menu-sep"></div>
                <button class="slide-plus-menu-item slide-plus-next-btn" data-action="add-next-slide"><i class="fas fa-circle-plus" style="color:#ea580c;"></i> Add Next Slide</button>
              </div>
            </div>
            <div class="pptx-slide-card"${animAttr} data-slide="${i + 1}" contenteditable="true" style="aspect-ratio:16/9;width:100%;max-width:850px;height:520px;max-height:520px;overflow:hidden;${bgStyle}border:1px solid var(--border);border-radius:12px;padding:36px;box-shadow:var(--shadow-md);outline:none;position:relative;box-sizing:border-box;word-break:break-word;overflow-wrap:break-word;display:flex;flex-direction:column;">
              <div class="pptx-slide-header" contenteditable="false">
                <span class="pptx-slide-badge"><i class="fas fa-file-powerpoint"></i> Slide ${i + 1} of ${slideFileNames.length}</span>
              </div>
              <div class="pptx-slide-title" contenteditable="true">${escHtml(slideTitle)}</div>
              <div class="pptx-slide-body" contenteditable="true">
                ${bodyHtml}
              </div>
            </div>
          </div>
        `;
      }

      html += '</div><p><br></p>';
      return html;
    } catch (err) {
      console.error('PPTX parse error:', err);
      return `
        <div class="pptx-container">
          <div class="pptx-slide-card">
            <div class="pptx-slide-header">
              <span class="pptx-slide-badge"><i class="fas fa-file-powerpoint"></i> Presentation</span>
            </div>
            <div class="pptx-slide-title" contenteditable="true">${escHtml(filename)}</div>
            <div class="pptx-slide-body" contenteditable="true">
              <p>Presentation document loaded. ${(err && err.message) ? escHtml(err.message) : ''}</p>
            </div>
          </div>
        </div>
      `;
    }
  }

  function createBlankPresentation() {
    function slideTpl(idx) {
      return `
        <div class="pptx-slide-wrapper" style="position:relative;margin:28px auto;max-width:850px;">
          <div class="slide-quick-action-bar" contenteditable="false">
            <button class="slide-plus-action-btn" title="Add elements to slide (+)" aria-label="Add elements to slide">
              <i class="fas fa-plus"></i>
            </button>
            <div class="slide-plus-menu" role="menu">
              <div class="slide-plus-menu-title">Insert Into Slide</div>
              <button class="slide-plus-menu-item" data-action="rect"><i class="fas fa-vector-square" style="color:#0284c7;"></i> Rectangle Box</button>
              <button class="slide-plus-menu-item" data-action="nested-rect"><i class="fas fa-layer-group" style="color:#8b5cf6;"></i> Nested Card</button>
              <button class="slide-plus-menu-item" data-action="bullets"><i class="fas fa-list-ul" style="color:#10b981;"></i> Bullet Points</button>
              <div class="slide-plus-menu-sep"></div>
              <div class="slide-plus-menu-title">Shapes</div>
              <div class="slide-plus-shapes-grid">
                <button class="slide-shape-quick-btn" data-shape="circle" title="Circle"><i class="fas fa-circle"></i></button>
                <button class="slide-shape-quick-btn" data-shape="star" title="Star"><i class="fas fa-star"></i></button>
                <button class="slide-shape-quick-btn" data-shape="arrow-right" title="Arrow"><i class="fas fa-arrow-right"></i></button>
                <button class="slide-shape-quick-btn" data-shape="diamond" title="Diamond"><i class="fas fa-diamond"></i></button>
              </div>
              <div class="slide-plus-menu-sep"></div>
              <div class="slide-plus-menu-title">Slide Layout Formats</div>
              <button class="slide-plus-menu-item" data-action="layout-blank"><i class="fas fa-square" style="color:#94a3b8;"></i> Blank Canvas</button>
              <button class="slide-plus-menu-item" data-action="layout-split"><i class="fas fa-columns" style="color:#f59e0b;"></i> Split 2 Columns</button>
              <button class="slide-plus-menu-item" data-action="layout-cards"><i class="fas fa-table-cells-large" style="color:#06b6d4;"></i> 3 Card Blocks</button>
              <div class="slide-plus-menu-sep"></div>
              <button class="slide-plus-menu-item slide-plus-next-btn" data-action="add-next-slide"><i class="fas fa-circle-plus" style="color:#ea580c;"></i> Add Next Slide</button>
            </div>
          </div>
          <div class="pptx-slide-card" contenteditable="true" data-slide="${idx}" style="aspect-ratio:16/9;width:100%;max-width:850px;height:520px;max-height:520px;overflow:hidden;background:var(--bg-secondary);border:1px solid var(--border);border-radius:12px;padding:36px;box-shadow:var(--shadow-md);outline:none;position:relative;box-sizing:border-box;">
            <p class="slide-placeholder-text" style="color:var(--text-muted);font-style:italic;margin:0;">Empty slide. Click here or use the "+" button at top-right to add rectangle, shapes, or bullet points...</p>
          </div>
        </div>`;
    }
    return slideTpl(1);
  }

  function basicMarkdownToHtml(md) {
    const codeBlocks = [];
    md = md.replace(/```(\w*)\n([\s\S]*?)```/g, (m, lang, code) => {
      codeBlocks.push(code);
      return '\u0000CB' + (codeBlocks.length - 1) + '\u0000';
    });
    md = md.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    md = md.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    md = md.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    md = md.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    md = md.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    md = md.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;height:auto;margin:8px 0;">');
    md = md.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    md = md.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    md = md.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    md = md.replace(/\*(.+?)\*/g, '<em>$1</em>');
    md = md.replace(/^---$/gm, '<hr>');
    md = md.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

    const lines = md.split('\n');
    const out = [];
    let inList = false;

    lines.forEach(l => {
      const li = l.match(/^\s*(?:-|\d+\.)\s+(.+)$/);
      if (li) {
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push('<li>' + li[1] + '</li>');
      } else {
        if (inList) { out.push('</ul>'); inList = false; }
        out.push(l);
      }
    });
    if (inList) out.push('</ul>');

    md = out.join('\n');
    md = md.replace(/\n/g, '<br>');
    md = md.replace(/\u0000CB(\d+)\u0000/g, (m, i) => '<pre><code>' + escHtml(codeBlocks[+i]) + '</code></pre>');
    return md;
  }

  // ==========================================================================
  // Exporters: HTML, TXT, PDF, Markdown
  // ==========================================================================

  function saveAsHtml() {
    const editor = $('#editor');
    if (!editor) return;
    const docTitle = getBaseName();
    let fullDoc = '';

    const codePre = editor.querySelector('pre.html-code-view');
    if (codePre) {
      fullDoc = codePre.textContent;
    } else {
      const cleanHtml = window.DocFlow.Find.getCleanHtml();
      fullDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(docTitle)}</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; max-width: 816px; margin: 40px auto; padding: 0 24px; line-height: 1.75; color: #1a1a1a; font-size: 15px; }
    h1 { font-size: 28px; margin: 24px 0 12px; font-family: sans-serif; }
    h2 { font-size: 22px; margin: 20px 0 10px; font-family: sans-serif; }
    h3 { font-size: 18px; margin: 16px 0 8px; font-family: sans-serif; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    td, th { border: 1px solid #ddd; padding: 8px 12px; }
    th { background: #f5f5f5; font-weight: 600; }
    img { max-width: 100%; height: auto; border-radius: 4px; }
    blockquote { border-left: 4px solid #e85d04; padding: 8px 16px; color: #555; background: #fafafa; margin: 16px 0; }
    a { color: #e85d04; }
    pre { background: #f4f4f4; border: 1px solid #ddd; border-radius: 6px; padding: 16px; overflow-x: auto; }
    code { font-family: 'Courier New', monospace; font-size: 13px; }
  </style>
</head>
<body>
${cleanHtml}
</body>
</html>`;
    }

    downloadBlob(new Blob([fullDoc], { type: 'text/html;charset=utf-8' }), docTitle + '.html');
    window.DocFlow.setModified(false);
    window.DocFlow.UI.Tabs.save();
    if (window.DocFlow && window.DocFlow.Recent) {
      window.DocFlow.Recent.updateContent(docTitle + '.html', fullDoc, new Blob([fullDoc]).size);
    }
    showToast('Saved as HTML', 'success');
  }

  function saveAsTxt() {
    const editor = $('#editor');
    if (!editor) return;
    const docTitle = getBaseName();
    const txtContent = editor.innerText || '';
    downloadBlob(new Blob([txtContent], { type: 'text/plain;charset=utf-8' }), docTitle + '.txt');
    window.DocFlow.setModified(false);
    window.DocFlow.UI.Tabs.save();
    if (window.DocFlow && window.DocFlow.Recent) {
      window.DocFlow.Recent.updateContent(docTitle + '.txt', txtContent, new Blob([txtContent]).size);
    }
    showToast('Saved as Plain Text', 'success');
  }

  function saveAsMarkdown() {
    const editor = $('#editor');
    if (!editor) return;
    const docTitle = getBaseName();
    const mdPre = editor.querySelector('pre.md-code-view');
    if (mdPre) {
      md = mdPre.textContent;
    } else {
      // Structured HTML to Markdown conversion
      md = md
        .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
        .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
        .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
        .replace(/<h4>(.*?)<\/h4>/gi, '#### $1\n\n')
        .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b>(.*?)<\/b>/gi, '**$1**')
        .replace(/<em>(.*?)<\/em>/gi, '*$1*')
        .replace(/<i>(.*?)<\/i>/gi, '*$1*')
        .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)\n')
        .replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)\n')
        .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
        .replace(/<blockquote>(.*?)<\/blockquote>/gi, '> $1\n\n')
        .replace(/<hr[^>]*>/gi, '\n---\n\n')
        .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '');
    }

    const mdTrimmed = md.trim();
    downloadBlob(new Blob([mdTrimmed], { type: 'text/markdown;charset=utf-8' }), docTitle + '.md');
    window.DocFlow.setModified(false);
    window.DocFlow.UI.Tabs.save();
    if (window.DocFlow && window.DocFlow.Recent) {
      window.DocFlow.Recent.updateContent(docTitle + '.md', mdTrimmed, new Blob([mdTrimmed]).size);
    }
    showToast('Exported as Markdown', 'success');
  }

  async function exportAsPdf() {
    const editor = $('#editor');
    if (!editor) return;
    const docTitle = getBaseName();

    showToast('Preparing PDF export...', 'info');

    try {
      const cleanHtml = window.DocFlow.Find.getCleanHtml();

      const container = document.createElement('div');
      container.className = 'editor-page';
      container.style.cssText = 'width:816px;padding:72px;background:#ffffff;color:#1a1a1a;position:absolute;left:-9999px;top:0;min-height:auto;height:auto;box-shadow:none;';
      container.innerHTML = cleanHtml;
      document.body.appendChild(container);

      // Render with html2canvas
      const canvas = await window.html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false
      });

      document.body.removeChild(container);

      const { jsPDF } = window.jspdf;
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(docTitle + '.pdf');
      window.DocFlow.setModified(false);
      window.DocFlow.UI.Tabs.save();
      showToast('Exported document as PDF', 'success');
    } catch (err) {
      console.error(err);
      showToast('PDF export failed: ' + (err.message || 'Check for CORS-blocked external images'), 'error');
    }
  }

  // ==========================================================================
  // Exporters: Word (.docx), Excel (.xlsx), PowerPoint (.pptx)
  // Preserving Complete Document Formatting
  // ==========================================================================

  async function saveAsDocx() {
    const editor = $('#editor');
    if (!editor) return;
    const docTitle = getBaseName();

    showToast('Generating Word document (.docx)...', 'info');

    try {
      if (typeof window.JSZip === 'undefined') {
        throw new Error('JSZip library is required to create .docx files.');
      }

      const zip = new window.JSZip();
      const cleanHtml = (window.DocFlow?.Find?.getCleanHtml ? window.DocFlow.Find.getCleanHtml() : editor.innerHTML) || '<p><br></p>';

      const xmlEsc = (str) => {
        if (!str) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
      };

      const toHexColor = (col) => {
        if (!col || col === 'inherit' || col === 'transparent' || col === 'initial') return null;
        if (col.startsWith('#')) return col.replace('#', '').trim();
        const m = col.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
        if (m) {
          const r = parseInt(m[1], 10).toString(16).padStart(2, '0');
          const g = parseInt(m[2], 10).toString(16).padStart(2, '0');
          const b = parseInt(m[3], 10).toString(16).padStart(2, '0');
          return `${r}${g}${b}`.toUpperCase();
        }
        return null;
      };

      const toHalfPoints = (sizeStr) => {
        if (!sizeStr) return null;
        const val = parseFloat(sizeStr);
        if (isNaN(val)) return null;
        if (/pt/i.test(sizeStr)) return Math.round(val * 2);
        if (/px/i.test(sizeStr)) return Math.round(val * 1.5);
        return Math.round(val * 2);
      };

      const mediaList = [];
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = cleanHtml;

      const imgElements = Array.from(tempDiv.querySelectorAll('img'));
      for (const img of imgElements) {
        const src = img.getAttribute('src') || '';
        if (src.startsWith('data:image/')) {
          const match = src.match(/^data:image\/([a-zA-Z0-9\+\-]+);base64,(.+)$/);
          if (match) {
            let ext = match[1].toLowerCase().replace('svg+xml', 'svg').replace('jpeg', 'jpg');
            if (ext !== 'png' && ext !== 'jpg' && ext !== 'jpeg' && ext !== 'gif') ext = 'png';
            const base64Data = match[2];
            const rId = 'rIdImg' + (mediaList.length + 1);
            const fileName = `image${mediaList.length + 1}.${ext}`;
            mediaList.push({ rId, fileName, ext, base64Data });
            img.dataset.docxRid = rId;
          }
        }
      }

      function convertNodesToWml(container) {
        let wml = '';

        const processChildNodes = (parent) => {
          let inner = '';
          for (const node of parent.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
              const txt = node.textContent;
              if (txt) {
                inner += `<w:r><w:t xml:space="preserve">${xmlEsc(txt)}</w:t></w:r>`;
              }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              const tag = node.tagName.toLowerCase();
              if (tag === 'br') {
                inner += `<w:r><w:br/></w:r>`;
              } else if (tag === 'img') {
                const rId = node.dataset.docxRid;
                if (rId) {
                  inner += `
                    <w:r>
                      <w:drawing>
                        <wp:inline distT="0" distB="0" distL="0" distR="0">
                          <wp:extent cx="4572000" cy="3048000"/>
                          <wp:docPr id="${Math.floor(Math.random() * 100000)}" name="Picture"/>
                          <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                            <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                              <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                                <pic:nvPicPr>
                                  <pic:cNvPr id="0" name="Picture"/>
                                  <pic:cNvPicPr/>
                                </pic:nvPicPr>
                                <pic:blipFill>
                                  <a:blip r:embed="${rId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
                                  <a:stretch><a:fillRect/></a:stretch>
                                </pic:blipFill>
                                <pic:spPr>
                                  <a:xfrm><a:off x="0" y="0"/><a:ext cx="4572000" cy="3048000"/></a:xfrm>
                                  <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                                </pic:spPr>
                              </pic:pic>
                            </a:graphicData>
                          </a:graphic>
                        </wp:inline>
                      </w:drawing>
                    </w:r>`;
                }
              } else {
                const computed = node.style;
                const isBold = tag === 'strong' || tag === 'b' || computed.fontWeight === 'bold' || parseInt(computed.fontWeight, 10) >= 600;
                const isItalic = tag === 'em' || tag === 'i' || computed.fontStyle === 'italic';
                const isUnderline = tag === 'u' || (computed.textDecoration && computed.textDecoration.includes('underline'));
                const isStrike = tag === 's' || tag === 'strike' || (computed.textDecoration && computed.textDecoration.includes('line-through'));
                const hexColor = toHexColor(computed.color);
                const hexBg = toHexColor(computed.backgroundColor);
                const halfPts = toHalfPoints(computed.fontSize);
                const fontFamily = computed.fontFamily ? computed.fontFamily.replace(/['"]/g, '').split(',')[0].trim() : null;

                let rPr = '<w:rPr>';
                if (isBold) rPr += '<w:b/>';
                if (isItalic) rPr += '<w:i/>';
                if (isUnderline) rPr += '<w:u w:val="single"/>';
                if (isStrike) rPr += '<w:strike/>';
                if (fontFamily) rPr += `<w:rFonts w:ascii="${xmlEsc(fontFamily)}" w:hAnsi="${xmlEsc(fontFamily)}"/>`;
                if (halfPts) rPr += `<w:sz w:val="${halfPts}"/>`;
                if (hexColor) rPr += `<w:color w:val="${hexColor}"/>`;
                if (hexBg) rPr += `<w:shd w:val="clear" w:color="auto" w:fill="${hexBg}"/>`;
                rPr += '</w:rPr>';

                const childRuns = processChildNodes(node);
                if (childRuns) {
                  inner += childRuns.replace(/<w:r>/g, `<w:r>${rPr}`);
                }
              }
            }
          }
          return inner;
        };

        const processBlock = (el) => {
          const tag = el.tagName ? el.tagName.toLowerCase() : '';
          
          if (tag === 'table' || el.classList?.contains('excel-grid-table')) {
            let tblXml = '<w:tbl>';
            tblXml += `
              <w:tblPr>
                <w:tblW w:w="0" w:type="auto"/>
                <w:tblBorders>
                  <w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
                  <w:left w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
                  <w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
                  <w:right w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
                  <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
                  <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
                </w:tblBorders>
              </w:tblPr>`;

            const rows = Array.from(el.querySelectorAll('tr'));
            for (const row of rows) {
              tblXml += '<w:tr>';
              const cells = Array.from(row.querySelectorAll('th, td')).filter(c => !c.classList.contains('excel-corner') && !c.classList.contains('excel-row-hdr'));
              for (const cell of cells) {
                tblXml += '<w:tc>';
                const cellBg = toHexColor(cell.style.backgroundColor) || (cell.tagName.toLowerCase() === 'th' ? 'F1F5F9' : null);
                if (cellBg) {
                  tblXml += `<w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="${cellBg}"/></w:tcPr>`;
                }
                const cellInner = processChildNodes(cell) || '<w:r><w:t></w:t></w:r>';
                tblXml += `<w:p>${cellInner}</w:p></w:tc>`;
              }
              tblXml += '</w:tr>';
            }
            tblXml += '</w:tbl>';
            return tblXml;
          }

          if (tag === 'ul' || tag === 'ol') {
            let listXml = '';
            const items = Array.from(el.querySelectorAll(':scope > li'));
            items.forEach((li, idx) => {
              const prefix = tag === 'ol' ? `${idx + 1}. ` : '• ';
              const liInner = processChildNodes(li);
              listXml += `<w:p><w:pPr><w:ind w:left="720"/></w:pPr><w:r><w:t xml:space="preserve">${prefix}</w:t></w:r>${liInner}</w:p>`;
            });
            return listXml;
          }

          let pPr = '<w:pPr>';
          if (/^h[1-6]$/.test(tag)) {
            const hNum = tag.charAt(1);
            pPr += `<w:pStyle w:val="Heading${hNum}"/>`;
          }
          const align = el.style?.textAlign;
          if (align === 'center') pPr += '<w:jc w:val="center"/>';
          else if (align === 'right') pPr += '<w:jc w:val="right"/>';
          else if (align === 'justify') pPr += '<w:jc w:val="both"/>';
          else if (align === 'left') pPr += '<w:jc w:val="left"/>';

          if (el.style?.lineHeight) {
            const lhVal = parseFloat(el.style.lineHeight);
            if (!isNaN(lhVal)) {
              pPr += `<w:spacing w:line="${Math.round(lhVal * 240)}" w:lineRule="auto"/>`;
            }
          }
          pPr += '</w:pPr>';

          const innerRuns = processChildNodes(el);
          return `<w:p>${pPr}${innerRuns}</w:p>`;
        };

        for (const child of container.childNodes) {
          if (child.nodeType === Node.ELEMENT_NODE) {
            wml += processBlock(child);
          } else if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
            wml += `<w:p><w:r><w:t xml:space="preserve">${xmlEsc(child.textContent)}</w:t></w:r></w:p>`;
          }
        }

        if (!wml) {
          wml = '<w:p><w:r><w:t></w:t></w:r></w:p>';
        }
        return wml;
      }

      const bodyWml = convertNodesToWml(tempDiv);

      mediaList.forEach(m => {
        zip.file(`word/media/${m.fileName}`, m.base64Data, { base64: true });
      });

      const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="html" ContentType="text/html"/>
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="gif" ContentType="image/gif"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;
      zip.file('[Content_Types].xml', contentTypes);

      zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

      let docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="htmlChunk" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/aFChunk" Target="content.html"/>`;
      mediaList.forEach(m => {
        docRels += `\n  <Relationship Id="${m.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${m.fileName}"/>`;
      });
      docRels += '\n</Relationships>';
      zip.file('word/_rels/document.xml.rels', docRels);

      zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="24"/>
        <w:color w:val="1E293B"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:b/>
      <w:sz w:val="48"/>
      <w:color w:val="0F172A"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:b/>
      <w:sz w:val="36"/>
      <w:color w:val="1E293B"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:b/>
      <w:sz w:val="28"/>
      <w:color w:val="334155"/>
    </w:rPr>
  </w:style>
</w:styles>`);

      const fullHtmlDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${xmlEsc(docTitle)}</title>
  <style>
    body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 14pt; color: #0f172a; line-height: 1.6; }
    h1 { font-size: 26pt; margin: 20pt 0 10pt; color: #0f172a; }
    h2 { font-size: 20pt; margin: 16pt 0 8pt; color: #1e293b; }
    h3 { font-size: 16pt; margin: 14pt 0 6pt; color: #334155; }
    table { border-collapse: collapse; width: 100%; margin: 12pt 0; }
    th, td { border: 1px solid #cbd5e1; padding: 6pt 10pt; }
    th { background: #f1f5f9; font-weight: 700; }
    img { max-width: 100%; height: auto; }
    blockquote { border-left: 4px solid #d45500; margin: 12pt 0; padding-left: 12pt; color: #475569; }
  </style>
</head>
<body>
${cleanHtml}
</body>
</html>`;
      zip.file('word/content.html', fullHtmlDoc);

      const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    ${bodyWml}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
      zip.file('word/document.xml', documentXml);

      const blob = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      downloadBlob(blob, docTitle + '.docx');
      window.DocFlow.setModified(false);
      window.DocFlow.UI.Tabs.save();
      if (window.DocFlow && window.DocFlow.Recent) {
        window.DocFlow.Recent.updateContent(docTitle + '.docx', cleanHtml, blob.size);
      }
      showToast('Saved as Word (.docx)', 'success');
    } catch (err) {
      console.error('Save as DOCX error:', err);
      showToast('Failed to save as DOCX: ' + err.message, 'error');
    }
  }

  function saveAsXlsx() {
    const editor = $('#editor');
    if (!editor) return;
    const docTitle = getBaseName();

    if (typeof window.XLSX === 'undefined') {
      showToast('Excel library (SheetJS) is not loaded', 'error');
      return;
    }

    try {
      showToast('Generating Excel workbook (.xlsx)...', 'info');
      const wb = window.XLSX.utils.book_new();

      const excelContainers = Array.from(editor.querySelectorAll('.excel-spreadsheet-container'));
      if (excelContainers.length > 0) {
        excelContainers.forEach((container, sIdx) => {
          let sheetName = `Sheet${sIdx + 1}`;
          const prev = container.previousElementSibling;
          if (prev && prev.tagName && /^h[1-6]$/i.test(prev.tagName) && prev.textContent) {
            const m = prev.textContent.match(/Sheet:\s*([^\n\r]+)/i);
            if (m && m[1]) sheetName = m[1].trim().slice(0, 31);
            else sheetName = prev.textContent.trim().slice(0, 31);
          }

          const gridTable = container.querySelector('.excel-grid-table');
          if (gridTable) {
            const trs = Array.from(gridTable.querySelectorAll('tbody tr'));
            const data = [];
            trs.forEach(tr => {
              const rowCells = Array.from(tr.querySelectorAll('td'));
              const rowData = rowCells.map(td => td.innerText ? td.innerText.trim() : '');
              data.push(rowData);
            });

            let maxCols = 0;
            data.forEach(r => {
              for (let i = r.length - 1; i >= 0; i--) {
                if (r[i] !== '') {
                  if (i + 1 > maxCols) maxCols = i + 1;
                  break;
                }
              }
            });
            maxCols = Math.max(1, maxCols);

            const trimmedData = [];
            for (let r = 0; r < data.length; r++) {
              trimmedData.push(data[r].slice(0, maxCols));
            }
            while (trimmedData.length > 1 && trimmedData[trimmedData.length - 1].every(v => v === '')) {
              trimmedData.pop();
            }

            const ws = window.XLSX.utils.aoa_to_sheet(trimmedData.length ? trimmedData : [['']]);
            window.XLSX.utils.book_append_sheet(wb, ws, sheetName);
          }
        });
      } else {
        const tables = Array.from(editor.querySelectorAll('table'));
        if (tables.length > 0) {
          tables.forEach((table, tIdx) => {
            const ws = window.XLSX.utils.table_to_sheet(table);
            const sheetName = `Sheet${tIdx + 1}`;
            window.XLSX.utils.book_append_sheet(wb, ws, sheetName);
          });
        } else {
          const text = (editor.innerText || '').trim();
          const lines = text.split('\n').filter(l => l.trim().length > 0);
          const aoa = lines.map(l => [l]);
          const ws = window.XLSX.utils.aoa_to_sheet(aoa.length ? aoa : [['']]);
          window.XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        }
      }

      const wbout = window.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      downloadBlob(new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), docTitle + '.xlsx');
      window.DocFlow.setModified(false);
      window.DocFlow.UI.Tabs.save();
      showToast('Saved as Excel (.xlsx)', 'success');
    } catch (err) {
      console.error('Save as XLSX error:', err);
      showToast('Failed to save as Excel: ' + err.message, 'error');
    }
  }

  async function saveAsPptx() {
    const editor = $('#editor');
    if (!editor) return;
    const docTitle = getBaseName();

    showToast('Generating PowerPoint presentation (.pptx)...', 'info');

    try {
      if (typeof window.JSZip === 'undefined') {
        throw new Error('JSZip library is required to create .pptx files.');
      }

      const zip = new window.JSZip();

      const xmlEsc = (str) => {
        if (!str) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
      };

      const toHexColor = (col) => {
        if (!col || col === 'inherit' || col === 'transparent' || col === 'initial') return null;
        if (col.startsWith('#')) return col.replace('#', '').trim();
        const m = col.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
        if (m) {
          const r = parseInt(m[1], 10).toString(16).padStart(2, '0');
          const g = parseInt(m[2], 10).toString(16).padStart(2, '0');
          const b = parseInt(m[3], 10).toString(16).padStart(2, '0');
          return `${r}${g}${b}`.toUpperCase();
        }
        return null;
      };

      const slideElements = Array.from(editor.querySelectorAll('.pptx-slide-card, .pptx-slide-wrapper'));
      const slidesData = [];

      if (slideElements.length > 0) {
        slideElements.forEach((el, idx) => {
          const card = el.classList.contains('pptx-slide-card') ? el : (el.querySelector('.pptx-slide-card') || el);
          const titleEl = card.querySelector('.pptx-slide-title') || card.querySelector('h1, h2, h3');
          const title = titleEl ? titleEl.innerText.trim() : `Slide ${idx + 1}`;
          
          const bodyEl = card.querySelector('.pptx-slide-body') || card;
          const bodyParas = [];
          const textBlocks = Array.from(bodyEl.querySelectorAll('p, li, .slide-content-box, .slide-nested-card, h4, h5'));
          if (textBlocks.length > 0) {
            textBlocks.forEach(tb => {
              if (tb !== titleEl && !tb.contains(titleEl) && !titleEl.contains(tb)) {
                const txt = tb.innerText.trim();
                if (txt) {
                  const isBold = tb.tagName === 'STRONG' || tb.querySelector('strong') || tb.style?.fontWeight === 'bold';
                  const color = toHexColor(tb.style?.color);
                  bodyParas.push({ text: txt, isBold: !!isBold, color: color || '1E293B' });
                }
              }
            });
          } else {
            const rawText = bodyEl.innerText.replace(title, '').trim();
            if (rawText) {
              rawText.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
                bodyParas.push({ text: line, isBold: false, color: '1E293B' });
              });
            }
          }

          const bgColor = toHexColor(card.style?.backgroundColor) || 'FFFFFF';
          slidesData.push({ title, bodyParas, bgColor });
        });
      } else {
        const headings = Array.from(editor.querySelectorAll('h1, h2, h3'));
        if (headings.length > 0) {
          headings.forEach((h, hIdx) => {
            const title = h.innerText.trim() || `Slide ${hIdx + 1}`;
            const bodyParas = [];
            let next = h.nextElementSibling;
            while (next && !/^h[1-3]$/i.test(next.tagName)) {
              const txt = next.innerText.trim();
              if (txt) {
                bodyParas.push({ text: txt, isBold: false, color: '1E293B' });
              }
              next = next.nextElementSibling;
            }
            slidesData.push({ title, bodyParas, bgColor: 'FFFFFF' });
          });
        } else {
          const text = editor.innerText.trim() || docTitle;
          const chunks = text.split('\n\n').filter(Boolean);
          if (!chunks.length) chunks.push(docTitle);
          chunks.forEach((chunk, cIdx) => {
            const lines = chunk.split('\n').filter(Boolean);
            const title = lines[0] || `Slide ${cIdx + 1}`;
            const bodyParas = lines.slice(1).map(l => ({ text: l, isBold: false, color: '1E293B' }));
            slidesData.push({ title, bodyParas, bgColor: 'FFFFFF' });
          });
        }
      }

      if (!slidesData.length) {
        slidesData.push({ title: docTitle, bodyParas: [{ text: 'Document presentation export.', isBold: false, color: '1E293B' }], bgColor: 'FFFFFF' });
      }

      let ct = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>`;
      slidesData.forEach((_, idx) => {
        ct += `\n  <Override PartName="/ppt/slides/slide${idx + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`;
      });
      ct += '\n</Types>';
      zip.file('[Content_Types].xml', ct);

      zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`);

      let sldIdLst = '';
      slidesData.forEach((_, idx) => {
        sldIdLst += `<p:sldId id="${256 + idx}" r:id="rId${idx + 2}"/>`;
      });
      zip.file('ppt/presentation.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
    ${sldIdLst}
  </p:sldIdLst>
  <p:sldSz cx="12192000" cy="6858000" type="screen16x9"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`);

      let presRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>`;
      slidesData.forEach((_, idx) => {
        presRels += `\n  <Relationship Id="rId${idx + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${idx + 1}.xml"/>`;
      });
      presRels += '\n</Relationships>';
      zip.file('ppt/_rels/presentation.xml.rels', presRels);

      zip.file('ppt/slideMasters/slideMaster1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:grpSpPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
  <p:sldLayoutIdLst>
    <p:sldLayoutId id="2147483649" r:id="rId1"/>
  </p:sldLayoutIdLst>
</p:sldMaster>`);

      zip.file('ppt/slideMasters/_rels/slideMaster1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`);

      zip.file('ppt/slideLayouts/slideLayout1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:grpSpPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
</p:sldLayout>`);

      zip.file('ppt/slideLayouts/_rels/slideLayout1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`);

      slidesData.forEach((slide, idx) => {
        const slideNum = idx + 1;
        let bodyParasXml = '';
        if (slide.bodyParas.length > 0) {
          slide.bodyParas.forEach(p => {
            bodyParasXml += `
              <a:p>
                <a:pPr algn="l"><a:buChar char="•"/></a:pPr>
                <a:r>
                  <a:rPr lang="en-US" sz="1800" b="${p.isBold ? 1 : 0}">
                    <a:solidFill><a:srgbClr val="${p.color}"/></a:solidFill>
                  </a:rPr>
                  <a:t>${xmlEsc(p.text)}</a:t>
                </a:r>
              </a:p>`;
          });
        } else {
          bodyParasXml = '<a:p><a:endParaRPr lang="en-US" sz="1800"/></a:p>';
        }

        const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg>
      <p:bgPr>
        <a:solidFill><a:srgbClr val="${slide.bgColor}"/></a:solidFill>
      </p:bgPr>
    </p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:grpSpPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Title Box"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="title"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="838200" y="508000"/><a:ext cx="10515600" cy="1143000"/></a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="en-US" sz="3200" b="1">
                <a:solidFill><a:srgbClr val="0F172A"/></a:solidFill>
              </a:rPr>
              <a:t>${xmlEsc(slide.title)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="Content Box"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="body" idx="1"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="838200" y="1800000"/><a:ext cx="10515600" cy="4500000"/></a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          ${bodyParasXml}
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;
        zip.file(`ppt/slides/slide${slideNum}.xml`, slideXml);

        zip.file(`ppt/slides/_rels/slide${slideNum}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`);
      });

      const blob = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      });

      downloadBlob(blob, docTitle + '.pptx');
      window.DocFlow.setModified(false);
      window.DocFlow.UI.Tabs.save();
      showToast('Saved as PowerPoint (.pptx)', 'success');
    } catch (err) {
      console.error('Save as PPTX error:', err);
      showToast('Failed to save as PPTX: ' + err.message, 'error');
    }
  }

  // ==========================================================================
  // File IO Setup & Listeners
  // ==========================================================================

  function initFileIO() {
    const openBtn = $('#openBtn');
    const fileInput = $('#fileInput');
    const saveBtn = $('#saveBtn');
    const saveDropdown = $('#saveDropdown');

    if (openBtn && fileInput) {
      openBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', e => {
        if (e.target.files) {
          Array.from(e.target.files).forEach(handleFile);
          fileInput.value = '';
        }
      });
    }

    // Save Dropdown Toggle
    if (saveBtn && saveDropdown) {
      saveBtn.addEventListener('click', e => {
        e.stopPropagation();
        saveDropdown.classList.toggle('show');
      });

      document.addEventListener('click', e => {
        if (!saveDropdown.contains(e.target) && e.target !== saveBtn && !saveBtn.contains(e.target)) {
          saveDropdown.classList.remove('show');
        }
      });

      $$('[data-save]').forEach(btn => {
        btn.addEventListener('click', () => {
          const saveType = btn.dataset.save;
          saveDropdown.classList.remove('show');

          if (saveType === 'merge') {
            window.DocFlow.PDF.openMergeModal();
            return;
          }

          if (window.DocFlow.currentMode !== 'edit') {
            showToast('Open a document in edit mode to save', 'warning');
            return;
          }

          if (saveType === 'docx') saveAsDocx();
          else if (saveType === 'xlsx') saveAsXlsx();
          else if (saveType === 'pptx') saveAsPptx();
          else if (saveType === 'html') saveAsHtml();
          else if (saveType === 'txt') saveAsTxt();
          else if (saveType === 'pdf') exportAsPdf();
          else if (saveType === 'md') saveAsMarkdown();
        });
      });
    }

    // Print button
    $('#printBtn')?.addEventListener('click', () => {
      if (window.DocFlow.currentMode === 'empty') {
        showToast('Open a document first to print', 'info');
        return;
      }
      window.print();
    });

    // Global Document Drag & Drop
    const dropZone = $('#dropZone');
    const emptyState = $('#emptyState');

    if (dropZone && fileInput) {
      dropZone.addEventListener('click', () => fileInput.click());
    }

    let globalDragCounter = 0;

    document.addEventListener('dragenter', e => {
      const types = e.dataTransfer ? Array.from(e.dataTransfer.types || []) : [];
      if (!types.includes('Files')) return;

      // In edit mode, allow image dropping directly without showing fullscreen dropzone
      if (window.DocFlow.currentMode === 'edit') return;

      globalDragCounter++;
      dropZone?.classList.add('dragover');
      if (emptyState && window.DocFlow.currentMode !== 'empty') {
        emptyState.classList.remove('hidden');
        emptyState.style.background = 'rgba(0,0,0,0.75)';
        emptyState.style.zIndex = '50';
      }
    });

    document.addEventListener('dragleave', e => {
      if (window.DocFlow.currentMode === 'edit') return;
      globalDragCounter--;
      if (globalDragCounter <= 0) {
        globalDragCounter = 0;
        dropZone?.classList.remove('dragover');
        if (emptyState && window.DocFlow.currentMode !== 'empty') {
          emptyState.classList.add('hidden');
          emptyState.style.background = '';
          emptyState.style.zIndex = '';
        }
      }
    });

    document.addEventListener('dragover', e => {
      e.preventDefault();
    });

    document.addEventListener('drop', e => {
      if (window.DocFlow.currentMode === 'edit') return;
      e.preventDefault();
      globalDragCounter = 0;
      dropZone?.classList.remove('dragover');

      if (emptyState && window.DocFlow.currentMode !== 'empty') {
        emptyState.classList.add('hidden');
        emptyState.style.background = '';
        emptyState.style.zIndex = '';
      }

      if (e.target.closest && e.target.closest('.modal-overlay')) return;

      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        const files = Array.from(e.dataTransfer.files);
        files.slice(0, 10).forEach(handleFile);
      }
    });
  }

  // Export module
  window.DocFlow = window.DocFlow || {};
  window.DocFlow.FileIO = {
    initFileIO,
    handleFile,
    saveAsDocx,
    saveAsXlsx,
    saveAsPptx,
    saveAsHtml,
    saveAsTxt,
    saveAsMarkdown,
    exportAsPdf,
    excelToHtml,
    createBlankExcelGrid,
    parseExcelCoord,
    getExcelColLetter,
    docxToHtml,
    pptxToHtml,
    createBlankPresentation
  };

})(window);
