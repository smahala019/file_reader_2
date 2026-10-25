/**
 * DocFlow — Image Management, Insertion, Drag-and-Drop & Inline Editing
 */

(function (window) {
  'use strict';

  const { $, $$, escHtml, showToast, openModal, closeModal } = window.DocFlow.UI;

  let pendingImages = [];
  let selectedImage = null;
  let activeImageToolbar = null;
  let imgMode = 'url';

  const SUPPORTED_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif', 'ico'];

  function isImageFile(file) {
    if (!file) return false;
    if (file.type && file.type.startsWith('image/')) return true;
    const ext = (file.name || '').split('.').pop().toLowerCase();
    return SUPPORTED_IMAGE_EXTS.includes(ext);
  }

  // Optimize & Compress Image (prevents localStorage quota blowouts)
  function optimizeImage(file, maxWidth = 1600, maxHeight = 1600, quality = 0.88) {
    return new Promise((resolve, reject) => {
      // SVG can be read directly as DataURL without lossy rasterization
      if (file.type === 'image/svg+xml' || (file.name && file.name.toLowerCase().endsWith('.svg'))) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;

          // Only scale down if larger than max boundaries
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              maxHeight = height;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Use original type if png/webp, otherwise jpeg
          const mimeType = (file.type === 'image/png' || file.type === 'image/webp') ? file.type : 'image/jpeg';
          resolve(canvas.toDataURL(mimeType, quality));
        };
        img.onerror = () => {
          // Fallback to raw dataURL if image decode fails
          resolve(e.target.result);
        };
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Reset Image Modal State
  function resetImageModal() {
    pendingImages = [];
    const list = $('#imgPreviewList');
    if (list) list.innerHTML = '';
    const insertDevBtn = $('#imgDevInsert');
    if (insertDevBtn) insertDevBtn.disabled = true;

    const urlInput = $('#imageUrl');
    if (urlInput) urlInput.value = '';
    const altInput = $('#imageAlt');
    if (altInput) altInput.value = '';

    const urlPreview = $('#imgUrlPreview');
    if (urlPreview) {
      urlPreview.style.display = 'none';
      urlPreview.innerHTML = '';
    }
  }

  // Render Preview Thumbnails in Modal
  function renderImagePreviews() {
    const list = $('#imgPreviewList');
    if (!list) return;

    list.innerHTML = '';
    pendingImages.forEach((img, idx) => {
      const item = document.createElement('div');
      item.className = 'img-preview-item';
      item.innerHTML = `
        <img src="${img.dataUrl}" alt="${escHtml(img.name)}">
        <button class="remove-img" data-idx="${idx}" title="Remove image" aria-label="Remove">&times;</button>
      `;

      item.querySelector('.remove-img').addEventListener('click', e => {
        e.stopPropagation();
        pendingImages.splice(idx, 1);
        renderImagePreviews();
      });

      list.appendChild(item);
    });

    const insertBtn = $('#imgDevInsert');
    if (insertBtn) insertBtn.disabled = pendingImages.length === 0;
  }

  // Queue and Process Selected Image Files
  async function processImageFiles(files) {
    if (!files || !files.length) return;
    let addedCount = 0;

    for (const file of Array.from(files)) {
      if (!isImageFile(file)) {
        showToast(`"${file.name}" is not a supported image file`, 'warning');
        continue;
      }

      try {
        const dataUrl = await optimizeImage(file);
        pendingImages.push({ name: file.name, dataUrl });
        addedCount++;
      } catch (err) {
        console.error('Image processing error:', err);
        showToast(`Could not load "${file.name}"`, 'error');
      }
    }

    if (addedCount > 0) {
      renderImagePreviews();
      showToast(`Added ${addedCount} image${addedCount > 1 ? 's' : ''} to queue`, 'info');
    }
  }

  // Insert Image Element with Full Attributes & Listeners
  function insertImageIntoDocument(src, alt = '', widthPercent = null) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt || 'Document image';
    img.loading = 'lazy';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.display = 'inline-block';
    img.style.margin = '8px 0';
    img.setAttribute('draggable', 'true');
    img.dataset.wrap = 'inline';
    if (widthPercent) img.style.width = widthPercent;

    img.addEventListener('error', () => {
      showToast('Image failed to load — please verify URL or file', 'error');
    }, { once: true });

    // Insert into document using safe cursor insertion
    window.DocFlow.Editor.insertNodeAtCursor(img);
    attachImageListeners(img);
    selectImage(img);
    return img;
  }

  // Setup Image Modal Tabs & Actions
  function setupImageModal() {
    const insertImageBtn = $('#insertImageBtn') || $('#ribbonInsertImageBtn');
    const tabUrl = $('#imgTabUrl');
    const tabDevice = $('#imgTabDevice');
    const urlSection = $('#imgUrlSection');
    const devSection = $('#imgDeviceSection');
    const urlInput = $('#imageUrl');
    const altInput = $('#imageAlt');
    const urlInsertBtn = $('#imgUrlInsert');
    const urlCancelBtn = $('#imgUrlCancel');
    const devInsertBtn = $('#imgDevInsert');
    const devCancelBtn = $('#imgDevCancel');
    const dropZone = $('#deviceImageDrop');
    const fileInput = $('#imageFileInput');

    // Trigger modal from toolbar
    if (insertImageBtn) {
      insertImageBtn.addEventListener('click', () => {
        if (window.DocFlow.currentMode !== 'edit') {
          showToast('Open a document in edit mode first', 'info');
          return;
        }
        window.DocFlow.Editor.saveSelection();
        resetImageModal();
        imgMode = 'url';
        if (tabUrl && tabDevice) {
          tabUrl.classList.add('active');
          tabDevice.classList.remove('active');
        }
        if (urlSection) urlSection.style.display = '';
        if (devSection) devSection.style.display = 'none';

        openModal('#imageModal');
        if (window.innerWidth > 768 && !window.matchMedia('(pointer: coarse)').matches) {
          setTimeout(() => urlInput?.focus(), 80);
        }
      });
    }

    // Modal Tabs
    if (tabUrl && tabDevice) {
      tabUrl.addEventListener('click', () => {
        imgMode = 'url';
        tabUrl.classList.add('active');
        tabDevice.classList.remove('active');
        if (urlSection) urlSection.style.display = '';
        if (devSection) devSection.style.display = 'none';
        urlInput?.focus();
      });

      tabDevice.addEventListener('click', () => {
        imgMode = 'device';
        tabDevice.classList.add('active');
        tabUrl.classList.remove('active');
        if (urlSection) urlSection.style.display = 'none';
        if (devSection) devSection.style.display = '';
      });
    }

    // URL Live Preview
    if (urlInput) {
      let previewTimer = null;
      urlInput.addEventListener('input', () => {
        clearTimeout(previewTimer);
        previewTimer = setTimeout(() => {
          let val = urlInput.value.trim();
          let preview = $('#imgUrlPreview');
          if (!preview && urlSection) {
            preview = document.createElement('div');
            preview.id = 'imgUrlPreview';
            preview.className = 'img-url-preview';
            urlSection.insertBefore(preview, urlSection.querySelector('.modal-actions'));
          }
          if (val && (val.startsWith('http') || val.startsWith('data:'))) {
            preview.style.display = 'flex';
            preview.innerHTML = `<img src="${escHtml(val)}" alt="Preview" onerror="this.parentElement.style.display='none'">`;
          } else if (preview) {
            preview.style.display = 'none';
          }
        }, 300);
      });

      urlInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          urlInsertBtn?.click();
        }
      });
    }

    // Insert from URL Action
    if (urlInsertBtn) {
      urlInsertBtn.addEventListener('click', () => {
        let url = urlInput.value.trim();
        const alt = altInput.value.trim();
        if (!url) {
          showToast('Please enter an image URL', 'warning');
          return;
        }

        if (!/^[a-z][a-z0-9+.-]*:/i.test(url) && !url.startsWith('/') && !url.startsWith('data:')) {
          url = 'https://' + url;
        }

        closeModal('#imageModal');
        insertImageIntoDocument(url, alt);
        resetImageModal();
        showToast('Image inserted successfully', 'success');
      });
    }

    // Insert from Device Action
    if (devInsertBtn) {
      devInsertBtn.addEventListener('click', () => {
        if (!pendingImages.length) return;
        const count = pendingImages.length;
        closeModal('#imageModal');

        pendingImages.forEach(img => {
          insertImageIntoDocument(img.dataUrl, img.name);
        });

        resetImageModal();
        showToast(`Inserted ${count} image${count > 1 ? 's' : ''}`, 'success');
      });
    }

    // Device File Input & Dropzone
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
          processImageFiles(e.dataTransfer.files);
        }
      });

      fileInput.addEventListener('change', e => {
        if (e.target.files) {
          processImageFiles(e.target.files);
          fileInput.value = '';
        }
      });
    }

    urlCancelBtn?.addEventListener('click', () => {
      closeModal('#imageModal');
      resetImageModal();
    });

    devCancelBtn?.addEventListener('click', () => {
      closeModal('#imageModal');
      resetImageModal();
    });
  }

  // ==========================================================================
  // Direct Drag-and-Drop Image onto Editor Page
  // ==========================================================================
  function setupEditorDropZone() {
    const editorWrap = $('#editorWrap');
    const editor = $('#editor');
    if (!editorWrap || !editor) return;

    let overlay = document.querySelector('.editor-drop-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'editor-drop-overlay';
      overlay.innerHTML = '<i class="fas fa-image" style="font-size:24px;"></i><span>Drop image here to insert into document</span>';
      editor.parentElement.appendChild(overlay);
    }

    let dragCount = 0;

    editorWrap.addEventListener('dragenter', e => {
      if (window.DocFlow.currentMode !== 'edit') return;
      const types = e.dataTransfer ? Array.from(e.dataTransfer.types || []) : [];
      if (!types.includes('Files')) return;

      dragCount++;
      overlay.classList.add('active');
    });

    editorWrap.addEventListener('dragleave', e => {
      if (window.DocFlow.currentMode !== 'edit') return;
      dragCount--;
      if (dragCount <= 0) {
        dragCount = 0;
        overlay.classList.remove('active');
      }
    });

    editorWrap.addEventListener('dragover', e => {
      if (window.DocFlow.currentMode !== 'edit') return;
      e.preventDefault();
    });

    editorWrap.addEventListener('drop', async e => {
      if (window.DocFlow.currentMode !== 'edit') return;
      dragCount = 0;
      overlay.classList.remove('active');

      if (!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) return;
      const files = Array.from(e.dataTransfer.files);

      // Check if dropped files are images
      const imageFiles = files.filter(isImageFile);

      if (imageFiles.length > 0) {
        e.preventDefault();
        e.stopPropagation();

        showToast(`Inserting ${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''}...`, 'info');

        for (const f of imageFiles) {
          try {
            const dataUrl = await optimizeImage(f);
            insertImageIntoDocument(dataUrl, f.name);
          } catch (err) {
            showToast(`Could not insert "${f.name}"`, 'error');
          }
        }
      }
    });
  }

  // ==========================================================================
  // Paste Images and Visual Elements from Clipboard (Ctrl+V)
  // ==========================================================================
  let isClipboardPasteInitialized = false;
  let isPasting = false;

  function setupClipboardPaste() {
    const editor = $('#editor');
    if (!editor || isClipboardPasteInitialized) return;
    isClipboardPasteInitialized = true;

    editor.addEventListener('paste', async e => {
      if (e.defaultPrevented || isPasting) return;

      // In Excel mode, let the spreadsheet container handle cell tabular paste
      if (document.body.dataset.mode === 'excel' && (e.target.closest('.excel-grid-table') || e.target.closest('.excel-spreadsheet-container'))) {
        return;
      }

      const clipboard = e.clipboardData;
      if (!clipboard) return;

      const items = Array.from(clipboard.items || []);
      const imageItem = items.find(it => it.type && it.type.startsWith('image/'));

      if (imageItem) {
        e.preventDefault();
        isPasting = true;
        setTimeout(() => { isPasting = false; }, 300);
        const file = imageItem.getAsFile();
        if (file) {
          try {
            showToast('Pasting image...', 'info');
            const dataUrl = await optimizeImage(file);
            insertImageIntoDocument(dataUrl, 'Pasted image');
            showToast('Image inserted from clipboard', 'success');
          } catch (err) {
            showToast('Failed to paste image', 'error');
          }
        }
        return;
      }

      // Paste visual elements or formatted content (Issue 1.a single paste)
      const html = clipboard.getData('text/html');
      if (html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        // Only strip dangerous script/executable elements and attributes, preserving styles, classes, SVG, tables, notes, shapes, and images
        temp.querySelectorAll('script, meta, link, iframe, object, embed, applet').forEach(el => el.remove());
        temp.querySelectorAll('*').forEach(el => {
          [...el.attributes].forEach(attr => {
            const name = attr.name.toLowerCase();
            if (name.startsWith('on') || (name === 'href' && attr.value.trim().toLowerCase().startsWith('javascript:'))) {
              el.removeAttribute(attr.name);
            }
          });
        });

        // Ensure newly pasted elements get fresh IDs and clean selection classes
        temp.querySelectorAll('[id]').forEach(el => {
          const prefix = el.id.split('-')[0] || 'el';
          el.id = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        });
        temp.querySelectorAll('.df-selected-line, .df-selected-image, .selected, .active').forEach(el => {
          el.classList.remove('df-selected-line', 'df-selected-image', 'selected', 'active');
        });

        if (temp.innerHTML.trim()) {
          e.preventDefault();
          isPasting = true;
          setTimeout(() => { isPasting = false; }, 300);
          window.DocFlow.Editor.insertHtmlAtCursor(temp.innerHTML);
          window.DocFlow.Editor?.notifyChange?.();
          setTimeout(() => {
            refreshElementListeners();
          }, 40);
          return;
        }
      }

      // Check if text/plain contains raw visual element markup (Issue 1.a single paste)
      const plain = clipboard.getData('text/plain') || '';
      if (plain && /<(table|img|svg|div class="doc-shape|div class="doc-chart|div class="doc-custom-note|div class="doc-interactive-note|div class="onenote-sticky-note|hr class="doc-custom-line)/i.test(plain)) {
        e.preventDefault();
        isPasting = true;
        setTimeout(() => { isPasting = false; }, 300);
        const temp = document.createElement('div');
        temp.innerHTML = plain;
        temp.querySelectorAll('script, meta, link, iframe, object, embed, applet').forEach(el => el.remove());
        temp.querySelectorAll('[id]').forEach(el => {
          const prefix = el.id.split('-')[0] || 'el';
          el.id = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        });
        temp.querySelectorAll('.df-selected-line, .df-selected-image, .selected, .active').forEach(el => {
          el.classList.remove('df-selected-line', 'df-selected-image', 'selected', 'active');
        });
        window.DocFlow.Editor.insertHtmlAtCursor(temp.innerHTML);
        window.DocFlow.Editor?.notifyChange?.();
        setTimeout(() => {
          refreshElementListeners();
        }, 40);
        return;
      }
    });
  }

  // ==========================================================================
  // Inline Image Manipulation Toolbar, 4-Corner Resizing & Drag Move Handle
  // ==========================================================================
  let activeResizeHandles = [];
  let activeMoveHandle = null;

  function setImageWrapMode(targetImg, mode) {
    if (!targetImg) return;
    targetImg.dataset.wrap = mode;
    targetImg.dataset.align = mode;
    if (mode === 'center') {
      targetImg.style.display = 'block';
      targetImg.style.marginLeft = 'auto';
      targetImg.style.marginRight = 'auto';
      targetImg.style.float = 'none';
      targetImg.style.clear = 'both';
      if (targetImg.parentElement && (targetImg.parentElement.tagName === 'P' || targetImg.parentElement.tagName === 'DIV')) {
        targetImg.parentElement.style.textAlign = 'center';
      }
    } else if (mode === 'left') {
      targetImg.style.display = 'block';
      targetImg.style.marginLeft = '0';
      targetImg.style.marginRight = '16px';
      targetImg.style.float = 'left';
      targetImg.style.clear = 'none';
      if (targetImg.parentElement && targetImg.parentElement.tagName === 'P') {
        targetImg.parentElement.style.textAlign = '';
      }
    } else if (mode === 'right') {
      targetImg.style.display = 'block';
      targetImg.style.marginLeft = '16px';
      targetImg.style.marginRight = '0';
      targetImg.style.float = 'right';
      targetImg.style.clear = 'none';
      if (targetImg.parentElement && targetImg.parentElement.tagName === 'P') {
        targetImg.parentElement.style.textAlign = '';
      }
    } else {
      targetImg.style.display = 'inline-block';
      targetImg.style.marginLeft = '';
      targetImg.style.marginRight = '';
      targetImg.style.float = 'none';
      targetImg.style.clear = 'none';
    }
    window.DocFlow.Editor?.notifyChange();
  }

  function selectImage(img) {
    deselectImage();
    selectedImage = img;
    img.classList.add('df-selected-img');
    createHandles(img);
    showImageToolbar(img);
  }

  function deselectImage() {
    if (selectedImage) {
      selectedImage.classList.remove('df-selected-img', 'selected');
      selectedImage = null;
    }
    activeResizeHandles.forEach(h => h.remove());
    activeResizeHandles = [];
    if (activeMoveHandle) {
      activeMoveHandle.remove();
      activeMoveHandle = null;
    }
    if (activeImageToolbar) {
      activeImageToolbar.remove();
      activeImageToolbar = null;
    }
  }

  function createHandles(img) {
    activeResizeHandles.forEach(h => h.remove());
    activeResizeHandles = [];
    if (activeMoveHandle) activeMoveHandle.remove();

    // 1. Four Corner Handles (NW, NE, SW, SE)
    const corners = ['nw', 'ne', 'sw', 'se'];
    corners.forEach(corner => {
      const handle = document.createElement('div');
      handle.className = `df-resize-handle ${corner}`;
      handle.title = `Resize image from ${corner.toUpperCase()} corner`;
      document.body.appendChild(handle);
      activeResizeHandles.push(handle);

      let startX = 0, startY = 0, startWidth = 0, startHeight = 0;

      const onMouseMove = e => {
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        if (!clientX) return;

        const dx = clientX - startX;
        const dy = clientY - startY;

        let newWidth = startWidth;
        let newHeight = startHeight;

        if (corner === 'se') {
          newWidth = Math.max(30, startWidth + dx);
          newHeight = Math.max(30, startHeight + dy);
        } else if (corner === 'sw') {
          newWidth = Math.max(30, startWidth - dx);
          newHeight = Math.max(30, startHeight + dy);
        } else if (corner === 'ne') {
          newWidth = Math.max(30, startWidth + dx);
          newHeight = Math.max(30, startHeight - dy);
        } else if (corner === 'nw') {
          newWidth = Math.max(30, startWidth - dx);
          newHeight = Math.max(30, startHeight - dy);
        }

        img.style.width = newWidth + 'px';
        img.style.maxWidth = '100%';
        if (img.tagName === 'IMG') {
          img.style.height = 'auto'; // Keep aspect ratio proportional
        } else {
          img.style.height = newHeight + 'px';
          const svg = img.querySelector('svg');
          if (svg) {
            if (img.classList.contains('doc-chart-container')) {
              const header = img.querySelector('.chart-header-title');
              const headH = header ? header.offsetHeight + 18 : 36;
              svg.setAttribute('width', '100%');
              svg.setAttribute('height', Math.max(60, newHeight - headH));
            } else {
              svg.setAttribute('width', newWidth);
              svg.setAttribute('height', newHeight);
            }
          }
        }

        positionAllHandles(img);
        if (activeImageToolbar) positionImageToolbar(img, activeImageToolbar);
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('touchmove', onMouseMove);
        document.removeEventListener('touchend', onMouseUp);
        window.DocFlow.Editor?.notifyChange();
      };

      handle.addEventListener('mousedown', e => {
        e.preventDefault();
        e.stopPropagation();
        startX = e.clientX;
        startY = e.clientY;
        startWidth = img.offsetWidth;
        startHeight = img.offsetHeight;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });

      handle.addEventListener('touchstart', e => {
        e.stopPropagation();
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startWidth = img.offsetWidth;
        startHeight = img.offsetHeight;
        document.addEventListener('touchmove', onMouseMove, { passive: true });
        document.addEventListener('touchend', onMouseUp);
      });
    });

    // 2. Four-Way Move Handle (Drag to Reposition anywhere in document)
    const moveHandle = document.createElement('div');
    moveHandle.className = 'df-img-move-handle';
    moveHandle.innerHTML = '<i class="fas fa-arrows-up-down-left-right"></i>';
    moveHandle.title = 'Click and drag to move image to another position';
    document.body.appendChild(moveHandle);
    activeMoveHandle = moveHandle;

    let isMoving = false;
    let ghostIndicator = null;

    const onDragMove = e => {
      if (!isMoving) return;
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);
      if (!clientX || !clientY) return;

      moveHandle.style.left = (clientX - 13) + 'px';
      moveHandle.style.top = (clientY - 13) + 'px';

      const editor = $('#editor');
      if (!editor) return;

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

      if (!ghostIndicator) {
        ghostIndicator = document.createElement('div');
        ghostIndicator.id = 'dfImgMoveGhost';
        ghostIndicator.style.cssText = 'height:3px;background:var(--accent);border-radius:2px;margin:4px 0;box-shadow:0 0 6px var(--accent);pointer-events:none;';
      }

      if (range && editor.contains(range.commonAncestorContainer)) {
        try {
          range.insertNode(ghostIndicator);
        } catch (err) { }
      } else {
        const el = document.elementFromPoint(clientX, clientY);
        const block = el ? (el.closest('#editor > *') || el.closest('#editor p, #editor div, #editor table, #editor section, #editor h1, #editor h2, #editor h3')) : null;
        if (block && editor.contains(block) && block !== ghostIndicator && block !== img) {
          const r = block.getBoundingClientRect();
          if (clientY > r.top + r.height / 2) {
            block.insertAdjacentElement('afterend', ghostIndicator);
          } else {
            block.insertAdjacentElement('beforebegin', ghostIndicator);
          }
        }
      }
    };

    const onDragEnd = e => {
      if (!isMoving) return;
      isMoving = false;
      moveHandle.style.pointerEvents = 'auto';
      document.removeEventListener('mousemove', onDragMove);
      document.removeEventListener('mouseup', onDragEnd);
      document.removeEventListener('touchmove', onDragMove);
      document.removeEventListener('touchend', onDragEnd);

      const clientX = e.clientX || (e.changedTouches && e.changedTouches[0].clientX);
      const clientY = e.clientY || (e.changedTouches && e.changedTouches[0].clientY);

      const excelContainer = document.querySelector('.excel-spreadsheet-container');
      const isOverExcel = excelContainer && (
        img.closest('.excel-spreadsheet-container') ||
        (clientX && clientY && document.elementFromPoint(clientX, clientY)?.closest('.excel-spreadsheet-container'))
      );

      if (isOverExcel && clientX && clientY) {
        const cell = document.elementFromPoint(clientX, clientY)?.closest('.excel-grid-table td');
        if (cell) {
          const cRect = cell.getBoundingClientRect();
          const pRect = excelContainer.getBoundingClientRect();
          img.style.position = 'absolute';
          img.style.left = Math.round(cRect.left - pRect.left + excelContainer.scrollLeft) + 'px';
          img.style.top = Math.round(cRect.top - pRect.top + excelContainer.scrollTop) + 'px';
          img.style.width = Math.max(20, Math.round(cRect.width)) + 'px';
          img.style.height = Math.max(20, Math.round(cRect.height)) + 'px';
          img.style.margin = '0px';
          const svg = img.querySelector('svg');
          if (svg) {
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
          }
          if (!excelContainer.contains(img)) {
            excelContainer.appendChild(img);
          }
          if (ghostIndicator) {
            ghostIndicator.remove();
            ghostIndicator = null;
          }
          positionAllHandles(img);
          if (activeImageToolbar) positionImageToolbar(img, activeImageToolbar);
          window.DocFlow.Editor?.notifyChange();
          window.DocFlow.Editor?.saveSnapshot?.(true);
          showToast(`Shape fitted to cell ${cell.dataset.coord || ''}`, 'success');
          return;
        }
      }

      const editor = $('#editor');
      if (ghostIndicator && ghostIndicator.parentNode) {
        ghostIndicator.parentNode.insertBefore(img, ghostIndicator);
        ghostIndicator.remove();
        ghostIndicator = null;
        showToast(img.tagName === 'IMG' ? 'Image repositioned' : (img.classList.contains('doc-chart-container') ? 'Chart repositioned' : 'Element repositioned'), 'success');
      } else {
        if (clientX && clientY && editor) {
          const el = document.elementFromPoint(clientX, clientY);
          const block = el ? (el.closest('#editor > *') || el.closest('#editor p, #editor div, #editor table, #editor section, #editor h1, #editor h2, #editor h3')) : null;
          if (block && editor.contains(block) && block !== img) {
            block.insertAdjacentElement('afterend', img);
            showToast(img.tagName === 'IMG' ? 'Image repositioned' : (img.classList.contains('doc-chart-container') ? 'Chart repositioned' : 'Element repositioned'), 'success');
          }
        }
      }

      positionAllHandles(img);
      if (activeImageToolbar) positionImageToolbar(img, activeImageToolbar);
      window.DocFlow.Editor?.notifyChange();
    };

    moveHandle.addEventListener('mousedown', e => {
      e.preventDefault();
      e.stopPropagation();
      isMoving = true;
      moveHandle.style.pointerEvents = 'none';
      document.addEventListener('mousemove', onDragMove);
      document.addEventListener('mouseup', onDragEnd);
    });

    moveHandle.addEventListener('touchstart', e => {
      e.stopPropagation();
      isMoving = true;
      moveHandle.style.pointerEvents = 'none';
      document.addEventListener('touchmove', onDragMove, { passive: true });
      document.addEventListener('touchend', onDragEnd);
    });

    positionAllHandles(img);
  }

  function positionAllHandles(img) {
    if (!img) return;
    const rect = img.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    if (activeResizeHandles.length === 4) {
      // nw: top-left
      activeResizeHandles[0].style.left = (rect.left - 6) + 'px';
      activeResizeHandles[0].style.top = (rect.top - 6) + 'px';
      // ne: top-right
      activeResizeHandles[1].style.left = (rect.right - 6) + 'px';
      activeResizeHandles[1].style.top = (rect.top - 6) + 'px';
      // sw: bottom-left
      activeResizeHandles[2].style.left = (rect.left - 6) + 'px';
      activeResizeHandles[2].style.top = (rect.bottom - 6) + 'px';
      // se: bottom-right
      activeResizeHandles[3].style.left = (rect.right - 6) + 'px';
      activeResizeHandles[3].style.top = (rect.bottom - 6) + 'px';
    }

    if (activeMoveHandle) {
      activeMoveHandle.style.left = (rect.left + (rect.width / 2) - 13) + 'px';
      activeMoveHandle.style.top = (rect.top - 36) + 'px';
    }
  }

  function positionResizeHandle(img, handle) {
    positionAllHandles(img);
  }

  function getContrastColorForBackground(bg) {
    if (!bg || bg === 'none' || bg === 'transparent') {
      return '#0f172a';
    }
    let r = 255, g = 255, b = 255;
    if (bg.startsWith('#')) {
      let hex = bg.slice(1);
      if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
      }
      if (hex.length >= 6) {
        r = parseInt(hex.substring(0, 2), 16) || 0;
        g = parseInt(hex.substring(2, 4), 16) || 0;
        b = parseInt(hex.substring(4, 6), 16) || 0;
      }
    } else if (bg.startsWith('rgb')) {
      const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      if (match) {
        r = parseInt(match[1], 10);
        g = parseInt(match[2], 10);
        b = parseInt(match[3], 10);
      }
    }
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 140 ? '#0f172a' : '#ffffff';
  }
  window.DocFlow.getContrastColorForBackground = getContrastColorForBackground;

  function addOrEditTextInShape(shape) {
    if (!shape) return;
    let textEditor = shape.querySelector('.doc-shape-text-editor');
    if (!textEditor) {
      textEditor = document.createElement('div');
      textEditor.className = 'doc-shape-text-editor';
      textEditor.contentEditable = 'true';
      textEditor.setAttribute('role', 'textbox');
      textEditor.setAttribute('aria-multiline', 'true');
      textEditor.setAttribute('spellcheck', 'true');
      textEditor.dataset.placeholder = 'Type text here...';
      shape.appendChild(textEditor);

      textEditor.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.stopPropagation();
          if (!e.shiftKey) {
            e.preventDefault();
            document.execCommand('insertLineBreak');
          }
        }
      });
      textEditor.addEventListener('input', () => {
        if (activeImageToolbar && selectedImage === shape) {
          positionImageToolbar(shape, activeImageToolbar);
        }
        positionAllHandles(shape);
        window.DocFlow.Editor?.notifyChange?.();
        window.DocFlow.UI?.Tabs?.saveCurrent?.();
      });
      textEditor.addEventListener('focus', () => {
        if (selectedImage !== shape) {
          selectImage(shape);
        } else if (activeImageToolbar) {
          positionImageToolbar(shape, activeImageToolbar);
        }
      });
    }

    const fill = shape.dataset.fill || shape.querySelector('path, rect, polygon, circle, ellipse')?.getAttribute('fill') || '#e85d04';
    const textColor = getContrastColorForBackground(fill);
    textEditor.style.color = textColor;

    textEditor.focus();
    const sel = window.getSelection();
    if (sel) {
      const range = document.createRange();
      range.selectNodeContents(textEditor);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  function showImageToolbar(img) {
    if (activeImageToolbar) activeImageToolbar.remove();

    const isShape = !!(img && img.classList && img.classList.contains('doc-shape-container'));
    const currentWrap = img.dataset.wrap || img.dataset.align || 'inline';
    const currentWidth = img.style.width || '';

    const toolbar = document.createElement('div');
    toolbar.className = 'df-img-toolbar';
    toolbar.innerHTML = `
      ${isShape ? '<button class="df-img-btn" data-action="shape-text" title="Add / Edit Text in Shape" style="font-weight:700;color:var(--accent,#0284c7);"><i class="fas fa-font"></i> Text</button><div class="df-img-sep"></div>' : ''}
      <select class="df-img-select" id="dfImgSizeSelect" title="Image Size">
        <option value="25%" ${currentWidth === '25%' ? 'selected' : ''}>25% Size</option>
        <option value="50%" ${currentWidth === '50%' ? 'selected' : ''}>50% Size</option>
        <option value="75%" ${currentWidth === '75%' ? 'selected' : ''}>75% Size</option>
        <option value="100%" ${currentWidth === '100%' ? 'selected' : ''}>100% Full</option>
        <option value="auto" ${(!currentWidth || currentWidth === 'auto') ? 'selected' : ''}>Original Size</option>
      </select>
      <div class="df-img-sep"></div>
      <button class="df-img-btn ${currentWrap === 'left' ? 'active' : ''}" data-action="align-left" title="Align Left"><i class="fas fa-align-left"></i></button>
      <button class="df-img-btn ${currentWrap === 'center' ? 'active' : ''}" data-action="align-center" title="Align Center"><i class="fas fa-align-center"></i></button>
      <button class="df-img-btn ${currentWrap === 'right' ? 'active' : ''}" data-action="align-right" title="Align Right"><i class="fas fa-align-right"></i></button>
      <div class="df-img-sep"></div>
      <select class="df-img-select" id="dfImgWrapSelect" title="Text Wrapping">
        <option value="inline" ${currentWrap === 'inline' ? 'selected' : ''}>In Line</option>
        <option value="left" ${currentWrap === 'left' ? 'selected' : ''}>Wrap Left</option>
        <option value="right" ${currentWrap === 'right' ? 'selected' : ''}>Wrap Right</option>
        <option value="center" ${currentWrap === 'center' ? 'selected' : ''}>Center</option>
        <option value="behind" ${currentWrap === 'behind' ? 'selected' : ''}>Behind Text</option>
        <option value="front" ${currentWrap === 'front' ? 'selected' : ''}>In Front</option>
      </select>
      <div class="df-img-sep"></div>
      <select class="df-img-select" id="dfImgShadowSelect" title="Shape/Icon Shadow">
        <option value="none" ${(!img.style.filter || img.style.filter === 'none') ? 'selected' : ''}>No Shadow</option>
        <option value="drop-shadow(2px 4px 6px rgba(0,0,0,0.35))" ${img.style.filter?.includes('2px 4px 6px') ? 'selected' : ''}>Classic Shadow</option>
        <option value="drop-shadow(0 0 10px #3b82f6)" ${img.style.filter?.includes('#3b82f6') ? 'selected' : ''}>Blue Glow</option>
        <option value="drop-shadow(0 0 10px #10b981)" ${img.style.filter?.includes('#10b981') ? 'selected' : ''}>Emerald Glow</option>
        <option value="drop-shadow(0 0 10px #f59e0b)" ${img.style.filter?.includes('#f59e0b') ? 'selected' : ''}>Amber Glow</option>
        <option value="drop-shadow(0 0 10px #ec4899)" ${img.style.filter?.includes('#ec4899') ? 'selected' : ''}>Pink Glow</option>
        <option value="drop-shadow(0 0 10px #8b5cf6)" ${img.style.filter?.includes('#8b5cf6') ? 'selected' : ''}>Violet Glow</option>
        <option value="drop-shadow(4px 6px 12px rgba(0,0,0,0.5))" ${img.style.filter?.includes('4px 6px 12px') ? 'selected' : ''}>Heavy 3D</option>
      </select>
      <div class="df-img-sep"></div>
      <button class="df-img-btn" data-action="crop" title="Crop image"><i class="fas fa-crop"></i> Crop</button>
      <button class="df-img-btn" data-action="alt" title="Edit description / caption"><i class="fas fa-closed-captioning"></i></button>
      <button class="df-img-btn danger" data-action="delete" title="Delete image"><i class="fas fa-trash-can"></i></button>
    `;

    document.body.appendChild(toolbar);
    activeImageToolbar = toolbar;
    positionImageToolbar(img, toolbar);

    if (img.tagName !== 'IMG') {
      toolbar.querySelectorAll('[data-action="crop"], [data-action="alt"]').forEach(el => el.style.display = 'none');
    }

    // Size Select
    const sizeSelect = toolbar.querySelector('#dfImgSizeSelect');
    sizeSelect?.addEventListener('change', e => {
      const val = e.target.value;
      if (val === 'auto') {
        img.style.width = 'auto';
      } else {
        img.style.width = val;
      }
      window.DocFlow.Editor.notifyChange();
      positionImageToolbar(img, toolbar);
      if (activeResizeHandle) positionResizeHandle(img, activeResizeHandle);
    });

    // Wrap Select
    const wrapSelect = toolbar.querySelector('#dfImgWrapSelect');
    wrapSelect?.addEventListener('change', e => {
      const mode = e.target.value;
      setImageWrapMode(img, mode);
      positionImageToolbar(img, toolbar);
      if (activeResizeHandle) positionResizeHandle(img, activeResizeHandle);
      showToast(`Text wrap: ${wrapSelect.options[wrapSelect.selectedIndex].text}`, 'info');
    });

    // Shadow Select (Issue 3: Shape & Icon Shadows)
    const shadowSelect = toolbar.querySelector('#dfImgShadowSelect');
    shadowSelect?.addEventListener('change', e => {
      const val = e.target.value;
      if (val === 'none') {
        img.style.filter = '';
        img.removeAttribute('data-shadow');
      } else {
        img.style.filter = val;
        img.setAttribute('data-shadow', val);
      }
      window.DocFlow.Editor?.notifyChange();
      showToast('Updated shape/icon shadow', 'info');
    });

    // Action buttons
    toolbar.addEventListener('click', e => {
      const btn = e.target.closest('.df-img-btn');
      if (!btn) return;
      e.stopPropagation();

      const action = btn.dataset.action;
      if (action === 'shape-text') {
        addOrEditTextInShape(img);
      } else if (action === 'align-left') {
        setImageWrapMode(img, 'left');
        showImageToolbar(img);
        if (activeResizeHandle) positionResizeHandle(img, activeResizeHandle);
        showToast('Image aligned left', 'info');
      } else if (action === 'align-center') {
        setImageWrapMode(img, 'center');
        showImageToolbar(img);
        if (activeResizeHandle) positionResizeHandle(img, activeResizeHandle);
        showToast('Image centered', 'info');
      } else if (action === 'align-right') {
        setImageWrapMode(img, 'right');
        showImageToolbar(img);
        if (activeResizeHandle) positionResizeHandle(img, activeResizeHandle);
        showToast('Image aligned right', 'info');
      } else if (action === 'crop') {
        openImageCropper(img);
      } else if (action === 'alt') {
        const currentAlt = img.alt || '';
        window.DocFlow.UI?.showPromptModal?.({
          title: 'Image Alt Text',
          message: 'Enter description (alt text) for this image:',
          defaultValue: currentAlt,
          placeholder: 'Image description...',
          confirmText: 'Save',
          onConfirm: (newAlt) => {
            if (newAlt !== null && newAlt !== undefined) {
              img.alt = newAlt.trim();
              window.DocFlow.Editor?.notifyChange?.();
              showToast('Image description updated', 'info');
            }
          }
        });
      } else if (action === 'delete') {
        const parentDock = img.closest('.excel-chart-dock-area');
        img.remove();
        if (parentDock && !parentDock.querySelector('.doc-chart-container')) {
          parentDock.remove();
        }
        deselectImage();
        window.DocFlow.Editor.notifyChange();
        showToast('Element removed', 'info');
      }
    });
  }

  function positionImageToolbar(img, toolbar) {
    if (!img || !toolbar) return;
    const rect = img.getBoundingClientRect();
    const toolbarRect = toolbar.getBoundingClientRect();
    const isMobile = window.innerWidth <= 768 || window.matchMedia('(pointer: coarse)').matches;

    let top = rect.top - toolbarRect.height - 8;
    if (top < 56) top = rect.bottom + 8;
    // Keep within viewport vertically
    if (top + toolbarRect.height > window.innerHeight - 8) {
      top = Math.max(56, window.innerHeight - toolbarRect.height - 8);
    }

    let left = rect.left + (rect.width / 2) - (toolbarRect.width / 2);
    const minLeft = 8;
    const maxLeft = Math.max(minLeft, window.innerWidth - toolbarRect.width - 8);
    left = Math.max(minLeft, Math.min(maxLeft, left));

    if (isMobile) {
      toolbar.style.position = 'fixed';
      toolbar.style.top = top + 'px';
      toolbar.style.left = left + 'px';
    } else {
      toolbar.style.position = 'absolute';
      toolbar.style.top = (top + window.scrollY) + 'px';
      toolbar.style.left = (left + window.scrollX) + 'px';
    }
  }

  // Interactive Image Cropper (HTML5 Canvas)
  function openImageCropper(img) {
    let cropModal = document.getElementById('dfCropModal');
    if (!cropModal) {
      cropModal = document.createElement('div');
      cropModal.id = 'dfCropModal';
      cropModal.className = 'modal-overlay';
      cropModal.innerHTML = `
        <div class="modal" style="width:540px;max-width:92vw;" role="dialog" aria-modal="true" aria-label="Crop Image">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <h3 style="margin:0;"><i class="fas fa-crop" style="color:var(--accent);margin-right:6px;"></i>Crop Image</h3>
            <div style="display:flex;gap:4px;">
              <button type="button" class="modal-btn crop-ratio-btn active" data-ratio="free">Free</button>
              <button type="button" class="modal-btn crop-ratio-btn" data-ratio="1:1">1:1</button>
              <button type="button" class="modal-btn crop-ratio-btn" data-ratio="4:3">4:3</button>
              <button type="button" class="modal-btn crop-ratio-btn" data-ratio="16:9">16:9</button>
            </div>
          </div>
          <div style="border:1px solid var(--border);border-radius:8px;background:#000000;overflow:hidden;max-height:340px;display:flex;align-items:center;justify-content:center;">
            <canvas id="dfCropCanvas" style="max-width:100%;max-height:340px;cursor:crosshair;display:block;"></canvas>
          </div>
          <p style="font-size:11px;color:var(--text-muted);margin:8px 0 0;">Drag with your mouse or touch on the preview above to select the crop box</p>
          <div class="modal-actions" style="margin-top:12px;">
            <button type="button" class="modal-btn" id="dfCropCancel">Cancel</button>
            <button type="button" class="modal-btn primary" id="dfCropApply"><i class="fas fa-check"></i> Apply Crop</button>
          </div>
        </div>
      `;
      document.body.appendChild(cropModal);
    }

    const canvas = cropModal.querySelector('#dfCropCanvas');
    const ctx = canvas.getContext('2d');
    const rawImg = new Image();
    rawImg.crossOrigin = 'anonymous';

    let cropRect = { x: 0, y: 0, w: 0, h: 0 };
    let isDragging = false, startX = 0, startY = 0;
    let selectedRatio = 'free';

    rawImg.onload = () => {
      canvas.width = rawImg.naturalWidth;
      canvas.height = rawImg.naturalHeight;
      cropRect = { x: 0, y: 0, w: canvas.width, h: canvas.height };
      drawCropView();
      cropModal.classList.add('show');
    };
    rawImg.src = img.src;

    function drawCropView() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(rawImg, 0, 0);

      // Dark overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Clear crop area
      ctx.save();
      ctx.beginPath();
      ctx.rect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
      ctx.clip();
      ctx.drawImage(rawImg, 0, 0);
      ctx.restore();

      // Border and grid
      ctx.strokeStyle = '#e85d04';
      ctx.lineWidth = 3;
      ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
    }

    const getCanvasPos = e => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: Math.max(0, Math.min(canvas.width, (clientX - rect.left) * scaleX)),
        y: Math.max(0, Math.min(canvas.height, (clientY - rect.top) * scaleY))
      };
    };

    const onStartDrag = e => {
      isDragging = true;
      const pos = getCanvasPos(e);
      startX = pos.x;
      startY = pos.y;
      cropRect = { x: startX, y: startY, w: 0, h: 0 };
    };

    const onMoveDrag = e => {
      if (!isDragging) return;
      const pos = getCanvasPos(e);
      let w = pos.x - startX;
      let h = pos.y - startY;

      if (selectedRatio === '1:1') {
        const side = Math.min(Math.abs(w), Math.abs(h));
        w = (w >= 0 ? 1 : -1) * side;
        h = (h >= 0 ? 1 : -1) * side;
      } else if (selectedRatio === '4:3') {
        h = (w * 3) / 4;
      } else if (selectedRatio === '16:9') {
        h = (w * 9) / 16;
      }

      cropRect.x = w >= 0 ? startX : startX + w;
      cropRect.y = h >= 0 ? startY : startY + h;
      cropRect.w = Math.abs(w);
      cropRect.h = Math.abs(h);
      drawCropView();
    };

    const onEndDrag = () => {
      isDragging = false;
      if (cropRect.w < 20 || cropRect.h < 20) {
        cropRect = { x: 0, y: 0, w: canvas.width, h: canvas.height };
        drawCropView();
      }
    };

    canvas.onmousedown = onStartDrag;
    canvas.ontouchstart = e => { e.preventDefault(); onStartDrag(e); };

    window.addEventListener('mousemove', onMoveDrag);
    window.addEventListener('touchmove', onMoveDrag, { passive: false });

    window.addEventListener('mouseup', onEndDrag);
    window.addEventListener('touchend', onEndDrag);

    // Ratio presets
    cropModal.querySelectorAll('.crop-ratio-btn').forEach(btn => {
      btn.onclick = () => {
        cropModal.querySelectorAll('.crop-ratio-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedRatio = btn.dataset.ratio;
        if (selectedRatio === '1:1') {
          const side = Math.min(canvas.width, canvas.height);
          cropRect = { x: (canvas.width - side) / 2, y: (canvas.height - side) / 2, w: side, h: side };
        } else if (selectedRatio === '4:3') {
          const w = canvas.width;
          const h = (w * 3) / 4;
          cropRect = { x: 0, y: Math.max(0, (canvas.height - h) / 2), w, h: Math.min(canvas.height, h) };
        } else if (selectedRatio === '16:9') {
          const w = canvas.width;
          const h = (w * 9) / 16;
          cropRect = { x: 0, y: Math.max(0, (canvas.height - h) / 2), w, h: Math.min(canvas.height, h) };
        } else {
          cropRect = { x: 0, y: 0, w: canvas.width, h: canvas.height };
        }
        drawCropView();
      };
    });

    cropModal.querySelector('#dfCropCancel').onclick = () => {
      cropModal.classList.remove('show');
    };

    cropModal.querySelector('#dfCropApply').onclick = () => {
      cropModal.classList.remove('show');
      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = Math.max(1, cropRect.w);
      croppedCanvas.height = Math.max(1, cropRect.h);
      const cctx = croppedCanvas.getContext('2d');
      cctx.drawImage(rawImg, cropRect.x, cropRect.y, cropRect.w, cropRect.h, 0, 0, cropRect.w, cropRect.h);

      img.src = croppedCanvas.toDataURL('image/png', 0.92);
      window.DocFlow.Editor.notifyChange();
      positionImageToolbar(img, activeImageToolbar);
      if (activeResizeHandle) positionResizeHandle(img, activeResizeHandle);
      showToast('Image cropped successfully', 'success');
    };
  }

  function attachImageListeners(img) {
    img.setAttribute('draggable', 'true');
    img.addEventListener('click', e => {
      e.stopPropagation();
      selectImage(img);
    });

    img.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', 'image-move');
      window._movingImg = img;
    });

    img.addEventListener('dragend', () => {
      window._movingImg = null;
    });
  }

  let isDocListenersInitialized = false;

  function refreshElementListeners() {
    const editor = $('#editor');
    if (!editor) return;
    editor.querySelectorAll('img').forEach(attachImageListeners);
    editor.querySelectorAll('.doc-shape-container, .doc-chart-container').forEach(attachShapeListeners);
    editor.querySelectorAll('hr, .doc-custom-line, .doc-custom-note, .doc-interactive-note, .onenote-sticky-note, .excel-floating-note, .doc-note-card').forEach(attachLineListeners);
  }

  function setupDocumentImageListeners() {
    const editor = $('#editor');
    if (!editor) return;
    if (isDocListenersInitialized) {
      refreshElementListeners();
      return;
    }
    isDocListenersInitialized = true;

    editor.querySelectorAll('img').forEach(attachImageListeners);

    // Reposition moving image on drop
    editor.addEventListener('dragover', e => {
      if (window._movingImg) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }
    });

    editor.addEventListener('drop', e => {
      if (window._movingImg) {
        e.preventDefault();
        e.stopPropagation();
        const img = window._movingImg;
        window._movingImg = null;

        let range = null;
        if (document.caretRangeFromPoint) {
          range = document.caretRangeFromPoint(e.clientX, e.clientY);
        } else if (e.rangeParent) {
          range = document.createRange();
          range.setStart(e.rangeParent, e.rangeOffset);
        }
        if (range && editor.contains(range.commonAncestorContainer)) {
          range.insertNode(img);
        } else {
          editor.appendChild(img);
        }
        selectImage(img);
        window.DocFlow.Editor.notifyChange();
        showToast('Image moved to new position', 'info');
      }
    });

    const observer = new MutationObserver(mutations => {
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === 'IMG') attachImageListeners(node);
            else node.querySelectorAll?.('img').forEach(attachImageListeners);

            if (node.tagName === 'HR' || node.classList?.contains('doc-custom-line') || node.classList?.contains('doc-custom-note') || node.classList?.contains('doc-interactive-note') || node.classList?.contains('onenote-sticky-note') || node.classList?.contains('excel-floating-note') || node.classList?.contains('doc-note-card')) {
              attachLineListeners(node);
            } else {
              node.querySelectorAll?.('hr, .doc-custom-line, .doc-custom-note, .doc-interactive-note, .onenote-sticky-note, .excel-floating-note, .doc-note-card').forEach(attachLineListeners);
            }

            if (node.classList?.contains('doc-shape-container') || node.classList?.contains('doc-chart-container')) {
              attachShapeListeners(node);
            } else {
              node.querySelectorAll?.('.doc-shape-container, .doc-chart-container').forEach(attachShapeListeners);
            }
          }
        });
      });
    });
    observer.observe(editor, { childList: true, subtree: true });

    // Initial attach for shapes, charts, lines, and notes
    editor.querySelectorAll('.doc-shape-container, .doc-chart-container').forEach(attachShapeListeners);
    editor.querySelectorAll('hr, .doc-custom-line, .doc-custom-note, .doc-interactive-note, .onenote-sticky-note, .excel-floating-note, .doc-note-card').forEach(attachLineListeners);

    document.addEventListener('click', e => {
      if (selectedImage && !e.target.closest('.df-img-toolbar') && !e.target.closest('.df-resize-handle') && !e.target.closest('.df-img-move-handle') && e.target !== selectedImage && !selectedImage.contains(e.target)) {
        deselectImage();
      }
      if (selectedLine && !e.target.closest('.df-line-move-handle') && !e.target.closest('.df-line-resize-handle') && !e.target.closest('.df-line-plus-btn') && !e.target.closest('.df-line-popover') && !e.target.closest('.df-note-toolbar') && e.target !== selectedLine && !selectedLine.contains(e.target)) {
        deselectLine();
      }
    });

    // Copy visual elements correctly (Issue 1.c)
    document.addEventListener('copy', e => {
      if (selectedLine) {
        e.preventDefault();
        const clone = selectedLine.cloneNode(true);
        clone.classList.remove('df-selected-line');
        const cleanHtml = clone.outerHTML;
        if (e.clipboardData) {
          e.clipboardData.setData('text/html', cleanHtml);
          e.clipboardData.setData('text/plain', cleanHtml);
        }
        showToast(isNoteElement(selectedLine) ? 'Note copied' : 'Line copied', 'info');
        return;
      }
      if (selectedImage) {
        e.preventDefault();
        const clone = selectedImage.cloneNode(true);
        clone.classList.remove('df-selected-image');
        clone.querySelectorAll?.('.df-img-toolbar, .df-resize-handle, .df-img-move-handle').forEach(h => h.remove());
        const cleanHtml = clone.outerHTML;
        if (e.clipboardData) {
          e.clipboardData.setData('text/html', cleanHtml);
          e.clipboardData.setData('text/plain', cleanHtml);
        }
        showToast('Element copied to clipboard', 'info');
        return;
      }
    });

    document.addEventListener('keydown', e => {
      if (document.activeElement?.closest?.('.doc-shape-text-editor') || e.target?.closest?.('.doc-shape-text-editor')) {
        return; // Allow typing/backspace inside shape text editor without deleting shape
      }
      if (selectedImage && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (selectedImage.contains(document.activeElement) && document.activeElement.isContentEditable) {
          return; // Allow normal typing/backspace inside shape text editor
        }
        e.preventDefault();
        const parentDock = selectedImage.closest('.excel-chart-dock-area');
        selectedImage.remove();
        if (parentDock && !parentDock.querySelector('.doc-chart-container')) {
          parentDock.remove();
        }
        deselectImage();
        window.DocFlow.Editor?.notifyChange();
        showToast('Element deleted', 'info');
      } else if (selectedLine && (e.key === 'Delete' || e.key === 'Backspace')) {
        const isNote = isNoteElement(selectedLine);
        if (isNote && selectedLine.contains(document.activeElement) && document.activeElement.isContentEditable) {
          return; // Allow normal typing/backspace inside note
        }
        e.preventDefault();
        selectedLine.remove();
        deselectLine();
        window.DocFlow.Editor?.notifyChange();
        showToast(isNote ? 'Note deleted' : 'Line deleted', 'info');
      }
    });

    window.addEventListener('resize', () => {
      if (selectedImage && activeImageToolbar) {
        positionImageToolbar(selectedImage, activeImageToolbar);
      }
      if (selectedImage) {
        positionAllHandles(selectedImage);
      }
      if (selectedLine) {
        positionLineHandles(selectedLine);
      }
    });

    $('#editorWrap')?.addEventListener('scroll', () => {
      if (selectedImage && activeImageToolbar) {
        positionImageToolbar(selectedImage, activeImageToolbar);
      }
      if (selectedImage) {
        positionAllHandles(selectedImage);
      }
      if (selectedLine) {
        positionLineHandles(selectedLine);
      }
    });

    // Capture-phase scroll listener ensures line/note '+' buttons stay pinned to their targets during scroll across all components
    document.addEventListener('scroll', () => {
      if (selectedLine) {
        positionLineHandles(selectedLine);
      }
      if (selectedImage) {
        if (activeImageToolbar) positionImageToolbar(selectedImage, activeImageToolbar);
        positionAllHandles(selectedImage);
      }
    }, true);
  }

  // ==========================================================================
  // Interactive Line & Note Management (Issue 1.a: Move handle, Corner resize, '+' customize button, Note behaves like a line)
  // ==========================================================================
  let selectedLine = null;
  let activeLineMoveHandle = null;
  let activeLineResizeHandles = [];
  let activeLinePlusBtn = null;
  let activeLinePopover = null;

  function isNoteElement(el) {
    if (!el || !el.classList) return false;
    return el.classList.contains('doc-custom-note') || 
           el.classList.contains('doc-interactive-note') || 
           el.classList.contains('onenote-sticky-note') ||
           el.classList.contains('excel-floating-note') ||
           el.classList.contains('doc-note-card');
  }

  function attachLineListeners(line) {
    line.style.cursor = 'pointer';
    line.addEventListener('click', e => {
      if (e.target.closest('.doc-note-close-btn, .excel-note-close-btn, .doc-note-color-input, .doc-note-hidden-color, .doc-note-hidden-header-color')) {
        return;
      }
      if (selectedLine !== line) {
        selectLine(line);
      } else {
        positionLineHandles(line);
      }
    });

    if (isNoteElement(line)) {
      const noteBody = line.querySelector('.doc-note-body, .excel-note-body');
      if (noteBody) {
        noteBody.addEventListener('focus', () => {
          if (selectedLine !== line) {
            selectLine(line);
          }
        });
        noteBody.addEventListener('input', () => {
          positionLineHandles(line);
        });
      }
    }
  }

  function selectLine(line) {
    deselectLine();
    deselectImage();
    selectedLine = line;
    line.classList.add('df-selected-line');
    createLineHandles(line);
  }

  function deselectLine() {
    if (selectedLine) {
      selectedLine.classList.remove('df-selected-line');
      selectedLine = null;
    }
    if (activeLineMoveHandle) {
      activeLineMoveHandle.remove();
      activeLineMoveHandle = null;
    }
    activeLineResizeHandles.forEach(h => h.remove());
    activeLineResizeHandles = [];
    if (activeLinePlusBtn) {
      activeLinePlusBtn.remove();
      activeLinePlusBtn = null;
    }
    if (activeLinePopover) {
      activeLinePopover.remove();
      activeLinePopover = null;
    }
  }

  function showLinePopover(line) {
    if (activeLinePopover) {
      positionLineHandles(line);
    } else {
      toggleLinePopover(line);
    }
  }

  function createLineHandles(line) {
    // 1. Move Handle in center of line
    const moveHandle = document.createElement('div');
    moveHandle.className = 'df-line-move-handle';
    moveHandle.innerHTML = '<i class="fas fa-arrows-up-down-left-right"></i>';
    moveHandle.title = 'Click and drag to reposition line anywhere with no spacing restrictions';
    document.body.appendChild(moveHandle);
    activeLineMoveHandle = moveHandle;

    let isMoving = false;
    let ghostIndicator = null;

    const onLineMove = e => {
      if (!isMoving) return;
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);
      if (!clientX || !clientY) return;

      moveHandle.style.left = (clientX - 14) + 'px';
      moveHandle.style.top = (clientY - 14) + 'px';

      const editor = $('#editor');
      if (!editor) return;

      let range = null;
      if (document.caretRangeFromPoint) range = document.caretRangeFromPoint(clientX, clientY);
      else if (document.caretPositionFromPoint) {
        const pos = document.caretPositionFromPoint(clientX, clientY);
        if (pos) {
          range = document.createRange();
          range.setStart(pos.offsetNode, pos.offset);
        }
      }

      if (!ghostIndicator) {
        ghostIndicator = document.createElement('div');
        ghostIndicator.id = 'dfLineGhost';
        ghostIndicator.style.cssText = 'height:2px;background:var(--accent);border-radius:1px;margin:8px 0;box-shadow:0 0 6px var(--accent);pointer-events:none;';
      }

      if (range && editor.contains(range.commonAncestorContainer)) {
        try { range.insertNode(ghostIndicator); } catch (err) { }
      } else {
        const el = document.elementFromPoint(clientX, clientY);
        const block = el ? (el.closest('#editor > *') || el.closest('#editor p, #editor div, #editor table, #editor section, #editor h1, #editor h2, #editor h3')) : null;
        if (block && editor.contains(block) && block !== ghostIndicator && block !== line) {
          const r = block.getBoundingClientRect();
          if (clientY > r.top + r.height / 2) {
            block.insertAdjacentElement('afterend', ghostIndicator);
          } else {
            block.insertAdjacentElement('beforebegin', ghostIndicator);
          }
        }
      }
    };

    const onLineMoveEnd = e => {
      if (!isMoving) return;
      isMoving = false;
      moveHandle.style.pointerEvents = 'auto';
      document.removeEventListener('mousemove', onLineMove);
      document.removeEventListener('mouseup', onLineMoveEnd);
      document.removeEventListener('touchmove', onLineMove);
      document.removeEventListener('touchend', onLineMoveEnd);

      const editor = $('#editor');
      if (ghostIndicator && ghostIndicator.parentNode) {
        ghostIndicator.parentNode.insertBefore(line, ghostIndicator);
        ghostIndicator.remove();
        ghostIndicator = null;
        showToast('Line repositioned', 'success');
      } else {
        const clientX = e.clientX || (e.changedTouches && e.changedTouches[0].clientX);
        const clientY = e.clientY || (e.changedTouches && e.changedTouches[0].clientY);
        if (clientX && clientY && editor) {
          const el = document.elementFromPoint(clientX, clientY);
          const block = el ? (el.closest('#editor > *') || el.closest('#editor p, #editor div, #editor table, #editor section, #editor h1, #editor h2, #editor h3')) : null;
          if (block && editor.contains(block) && block !== line) {
            block.insertAdjacentElement('afterend', line);
            showToast('Line repositioned', 'success');
          }
        }
      }

      positionLineHandles(line);
      window.DocFlow.Editor?.notifyChange();
    };

    moveHandle.addEventListener('mousedown', e => {
      e.preventDefault();
      e.stopPropagation();
      isMoving = true;
      moveHandle.style.pointerEvents = 'none';
      document.addEventListener('mousemove', onLineMove);
      document.addEventListener('mouseup', onLineMoveEnd);
    });

    moveHandle.addEventListener('touchstart', e => {
      e.stopPropagation();
      isMoving = true;
      moveHandle.style.pointerEvents = 'none';
      document.addEventListener('touchmove', onLineMove, { passive: true });
      document.addEventListener('touchend', onLineMoveEnd);
    });

    // 2. Corner/End Resize Handles (left and right)
    ['left', 'right'].forEach(side => {
      const handle = document.createElement('div');
      handle.className = `df-line-resize-handle ${side}`;
      handle.title = isNoteElement(line) ? 'Drag to resize note width and height' : 'Drag to adjust line width and thickness';
      document.body.appendChild(handle);
      activeLineResizeHandles.push(handle);

      let startX = 0, startY = 0, startW = 0, startH = 0;

      const onResize = e => {
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        if (!clientX) return;

        const dx = clientX - startX;
        const dy = clientY - startY;

        const isNote = isNoteElement(line);
        if (isNote) {
          let newW = side === 'right' ? Math.max(140, startW + dx) : Math.max(140, startW - dx);
          line.style.width = newW + 'px';
          let newH = Math.max(60, startH + dy);
          line.style.height = newH + 'px';
          line.style.minHeight = newH + 'px';
        } else {
          let newW = side === 'right' ? Math.max(40, startW + dx) : Math.max(40, startW - dx);
          line.style.width = newW + 'px';

          let newH = Math.max(1, Math.min(24, Math.round(startH + Math.abs(dy) / 4)));
          line.style.height = newH + 'px';
          line.style.borderTopWidth = newH + 'px';
        }

        positionLineHandles(line);
      };

      const onResizeEnd = () => {
        document.removeEventListener('mousemove', onResize);
        document.removeEventListener('mouseup', onResizeEnd);
        document.removeEventListener('touchmove', onResize);
        document.removeEventListener('touchend', onResizeEnd);
        document.removeEventListener('touchcancel', onResizeEnd);
        window.DocFlow.Editor?.notifyChange();
      };

      handle.addEventListener('mousedown', e => {
        e.preventDefault();
        e.stopPropagation();
        startX = e.clientX;
        startY = e.clientY;
        startW = line.offsetWidth;
        const isNote = isNoteElement(line);
        startH = isNote ? line.offsetHeight : parseInt(line.style.borderTopWidth || line.style.height || '2', 10);
        document.addEventListener('mousemove', onResize);
        document.addEventListener('mouseup', onResizeEnd);
      });

      handle.addEventListener('touchstart', e => {
        if (!e.touches || !e.touches[0]) return;
        e.preventDefault();
        e.stopPropagation();
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startW = line.offsetWidth;
        const isNote = isNoteElement(line);
        startH = isNote ? line.offsetHeight : parseInt(line.style.borderTopWidth || line.style.height || '2', 10);
        document.addEventListener('touchmove', onResize, { passive: false });
        document.addEventListener('touchend', onResizeEnd);
        document.addEventListener('touchcancel', onResizeEnd);
      }, { passive: false });
    });

    // 3. "+" Button for Line & Note Customization
    const plusBtn = document.createElement('button');
    plusBtn.className = 'df-line-plus-btn';
    plusBtn.innerHTML = '<i class="fas fa-plus"></i>';
    plusBtn.title = isNoteElement(line) ? 'Customize note color, size, and style' : 'Customize line color, width, thickness, and style';
    document.body.appendChild(plusBtn);
    activeLinePlusBtn = plusBtn;

    plusBtn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      toggleLinePopover(line);
    });

    positionLineHandles(line);
  }

  function positionLineHandles(line) {
    if (!line) return;
    const rect = line.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    const editorWrap = document.getElementById('editorWrap');
    const wrapRect = editorWrap ? editorWrap.getBoundingClientRect() : null;
    const isOutOfView = wrapRect && (rect.bottom < wrapRect.top || rect.top > wrapRect.bottom);

    if (activeLineMoveHandle) {
      if (isOutOfView) {
        activeLineMoveHandle.style.display = 'none';
      } else {
        activeLineMoveHandle.style.display = 'flex';
        activeLineMoveHandle.style.left = (rect.left + (rect.width / 2) - 14) + 'px';
        activeLineMoveHandle.style.top = (rect.top - 32) + 'px';
      }
    }

    if (activeLineResizeHandles.length === 2) {
      if (isOutOfView) {
        activeLineResizeHandles[0].style.display = 'none';
        activeLineResizeHandles[1].style.display = 'none';
      } else {
        activeLineResizeHandles[0].style.display = 'block';
        activeLineResizeHandles[1].style.display = 'block';
        activeLineResizeHandles[0].style.left = (rect.left - 6) + 'px';
        activeLineResizeHandles[0].style.top = (rect.top + (rect.height / 2) - 6) + 'px';
        activeLineResizeHandles[1].style.left = (rect.right - 6) + 'px';
        activeLineResizeHandles[1].style.top = (rect.top + (rect.height / 2) - 6) + 'px';
      }
    }

    const isNote = isNoteElement(line);

    if (activeLinePlusBtn) {
      if (isOutOfView) {
        activeLinePlusBtn.style.display = 'none';
      } else {
        activeLinePlusBtn.style.display = 'flex';
        if (isNote) {
          let plusLeft = rect.right + 8;
          if (plusLeft + 28 > window.innerWidth) {
            plusLeft = rect.right - 28;
          }
          activeLinePlusBtn.style.left = plusLeft + 'px';
          // Scrolls naturally along with note body without being clamped
          activeLinePlusBtn.style.top = (rect.top - 6) + 'px';
        } else {
          activeLinePlusBtn.style.left = (rect.right + 12) + 'px';
          activeLinePlusBtn.style.top = (rect.top - 12) + 'px';
        }
      }
    }

    if (activeLinePopover) {
      if (isOutOfView) {
        activeLinePopover.style.display = 'none';
      } else {
        activeLinePopover.style.display = 'block';
        if (activeLinePlusBtn) {
          const plusRect = activeLinePlusBtn.getBoundingClientRect();
          let popLeft = plusRect.left + (plusRect.width / 2) - 140;
          if (popLeft + 295 > window.innerWidth) {
            popLeft = window.innerWidth - 295;
          }
          if (popLeft < 10) popLeft = 10;

          let popTop = plusRect.bottom + 8;
          const popHeight = activeLinePopover.offsetHeight || 300;
          if (popTop + popHeight > window.innerHeight && plusRect.top > popHeight + 20) {
            popTop = plusRect.top - popHeight - 8;
          }
          activeLinePopover.style.left = popLeft + 'px';
          activeLinePopover.style.top = popTop + 'px';
        } else {
          activeLinePopover.style.left = Math.min(window.innerWidth - 300, rect.right - 40) + 'px';
          activeLinePopover.style.top = (rect.top + 20) + 'px';
        }
      }
    }
  }

  function toggleLinePopover(line) {
    if (activeLinePopover) {
      activeLinePopover.remove();
      activeLinePopover = null;
      return;
    }

    const isNote = isNoteElement(line);
    const popover = document.createElement('div');
    popover.className = 'df-line-popover';
    popover.innerHTML = `
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
        <span>${isNote ? 'Format Note' : 'Format Line'}</span>
        <button type="button" class="df-line-pop-close" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:12px;"><i class="fas fa-xmark"></i></button>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div>
          <label style="font-size:11px;font-weight:600;display:block;margin-bottom:4px;">${isNote ? 'Note Body Color:' : 'Line Color:'}</label>
          <div style="display:flex;gap:6px;align-items:center;">
            <input type="color" id="dfLinePopColor" value="${isNote ? (line.style.backgroundColor || '#fef08a') : '#2563eb'}" style="width:34px;height:26px;padding:0;border:1px solid var(--border);border-radius:4px;cursor:pointer;">
            <div style="display:flex;gap:4px;">
              <span class="df-line-color-swatch" data-target="body" data-color="#fef08a" style="width:18px;height:18px;background:#fef08a;border-radius:3px;cursor:pointer;border:1px solid rgba(0,0,0,0.15);" title="Yellow"></span>
              <span class="df-line-color-swatch" data-target="body" data-color="#dcfce7" style="width:18px;height:18px;background:#dcfce7;border-radius:3px;cursor:pointer;border:1px solid rgba(0,0,0,0.15);" title="Green"></span>
              <span class="df-line-color-swatch" data-target="body" data-color="#e0f2fe" style="width:18px;height:18px;background:#e0f2fe;border-radius:3px;cursor:pointer;border:1px solid rgba(0,0,0,0.15);" title="Blue"></span>
              <span class="df-line-color-swatch" data-target="body" data-color="#fce7f3" style="width:18px;height:18px;background:#fce7f3;border-radius:3px;cursor:pointer;border:1px solid rgba(0,0,0,0.15);" title="Pink"></span>
              <span class="df-line-color-swatch" data-target="body" data-color="#ffedd5" style="width:18px;height:18px;background:#ffedd5;border-radius:3px;cursor:pointer;border:1px solid rgba(0,0,0,0.15);" title="Orange"></span>
              <span class="df-line-color-swatch" data-target="body" data-color="#0f172a" style="width:18px;height:18px;background:#0f172a;border-radius:3px;cursor:pointer;" title="Dark"></span>
            </div>
          </div>
        </div>
        ${isNote ? `
        <div>
          <label style="font-size:11px;font-weight:600;display:block;margin-bottom:4px;">Note Header Color:</label>
          <div style="display:flex;gap:6px;align-items:center;">
            <input type="color" id="dfLinePopHeaderColor" value="${line.querySelector('.doc-note-header, .excel-note-header')?.style?.backgroundColor || '#fde047'}" style="width:34px;height:26px;padding:0;border:1px solid var(--border);border-radius:4px;cursor:pointer;">
            <div style="display:flex;gap:4px;">
              <span class="df-line-color-swatch" data-target="header" data-color="#fde047" style="width:18px;height:18px;background:#fde047;border-radius:3px;cursor:pointer;border:1px solid rgba(0,0,0,0.15);" title="Yellow"></span>
              <span class="df-line-color-swatch" data-target="header" data-color="#86efac" style="width:18px;height:18px;background:#86efac;border-radius:3px;cursor:pointer;border:1px solid rgba(0,0,0,0.15);" title="Green"></span>
              <span class="df-line-color-swatch" data-target="header" data-color="#7dd3fc" style="width:18px;height:18px;background:#7dd3fc;border-radius:3px;cursor:pointer;border:1px solid rgba(0,0,0,0.15);" title="Blue"></span>
              <span class="df-line-color-swatch" data-target="header" data-color="#f472b6" style="width:18px;height:18px;background:#f472b6;border-radius:3px;cursor:pointer;border:1px solid rgba(0,0,0,0.15);" title="Pink"></span>
              <span class="df-line-color-swatch" data-target="header" data-color="#fdba74" style="width:18px;height:18px;background:#fdba74;border-radius:3px;cursor:pointer;border:1px solid rgba(0,0,0,0.15);" title="Orange"></span>
              <span class="df-line-color-swatch" data-target="header" data-color="#1e293b" style="width:18px;height:18px;background:#1e293b;border-radius:3px;cursor:pointer;" title="Dark"></span>
            </div>
          </div>
        </div>
        ` : ''}
        <div>
          <label style="font-size:11px;font-weight:600;display:block;margin-bottom:4px;">${isNote ? 'Width & Size:' : 'Width & Thickness:'}</label>
          <div style="display:flex;gap:6px;">
            <select id="dfLinePopWidth" style="flex:1;height:28px;font-size:12px;border:1px solid var(--border);border-radius:4px;background:var(--bg-primary);color:var(--text-primary);padding:0 6px;">
              <option value="100%">100% Full</option>
              <option value="80%">80% Width</option>
              <option value="60%">60% Width</option>
              <option value="40%">40% Width</option>
              <option value="260px">260px</option>
              <option value="360px">360px</option>
              <option value="460px">460px</option>
            </select>
            ${isNote ? '' : `
            <select id="dfLinePopHeight" style="flex:1;height:28px;font-size:12px;border:1px solid var(--border);border-radius:4px;background:var(--bg-primary);color:var(--text-primary);padding:0 6px;">
              <option value="1px">1px Thin</option>
              <option value="2px">2px Standard</option>
              <option value="3px">3px Medium</option>
              <option value="4px">4px Thick</option>
              <option value="6px">6px Heavy</option>
              <option value="8px">8px Block</option>
            </select>`}
          </div>
        </div>
        ${isNote ? '' : `
        <div>
          <label style="font-size:11px;font-weight:600;display:block;margin-bottom:4px;">Style & Alignment:</label>
          <div style="display:flex;gap:6px;">
            <select id="dfLinePopStyle" style="flex:1;height:28px;font-size:12px;border:1px solid var(--border);border-radius:4px;background:var(--bg-primary);color:var(--text-primary);padding:0 6px;">
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
              <option value="double">Double</option>
              <option value="groove">Groove</option>
            </select>
            <select id="dfLinePopAlign" style="flex:1;height:28px;font-size:12px;border:1px solid var(--border);border-radius:4px;background:var(--bg-primary);color:var(--text-primary);padding:0 6px;">
              <option value="center">Center</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>
        </div>`}
        <div style="display:flex;gap:8px;margin-top:4px;">
          <button type="button" id="dfLinePopDelete" style="flex:1;height:28px;background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.25);border-radius:4px;font-size:11px;font-weight:600;cursor:pointer;">
            <i class="fas fa-trash-can"></i> ${isNote ? 'Delete Note' : 'Delete Line'}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(popover);
    activeLinePopover = popover;
    positionLineHandles(line);

    popover.querySelector('.df-line-pop-close')?.addEventListener('click', () => {
      popover.remove();
      activeLinePopover = null;
    });

    const applyStyle = () => {
      const color = popover.querySelector('#dfLinePopColor')?.value || '#2563eb';
      const width = popover.querySelector('#dfLinePopWidth')?.value || '100%';
      const isNote = isNoteElement(line);

      if (isNote) {
        line.style.width = width;
        const bodyColor = popover.querySelector('#dfLinePopColor')?.value || '#fef08a';
        const hdrColor = popover.querySelector('#dfLinePopHeaderColor')?.value;
        if (window.DocFlow?.applyNoteBackgroundColor) {
          window.DocFlow.applyNoteBackgroundColor(line, bodyColor, hdrColor);
        } else {
          line.style.setProperty('background-color', bodyColor, 'important');
          line.style.borderColor = bodyColor;
          line.style.borderLeft = `5px solid ${bodyColor}`;
          const body = line.querySelector('.doc-note-body, .excel-note-body');
          if (body) {
            body.style.setProperty('background-color', bodyColor, 'important');
            body.style.color = getContrastColorForBackground(bodyColor);
          }
          const hdr = line.querySelector('.doc-note-header, .excel-note-header');
          if (hdr) {
            const actualHdr = hdrColor || bodyColor;
            hdr.style.setProperty('background-color', actualHdr, 'important');
            hdr.style.color = getContrastColorForBackground(actualHdr);
          }
        }
      } else {
        const height = popover.querySelector('#dfLinePopHeight')?.value || '2px';
        const style = popover.querySelector('#dfLinePopStyle')?.value || 'solid';
        const align = popover.querySelector('#dfLinePopAlign')?.value || 'center';

        line.style.width = width;
        line.style.height = height;
        line.style.border = 'none';
        line.style.borderTop = `${height} ${style} ${color}`;
        line.style.backgroundColor = style === 'solid' ? color : 'transparent';
        line.style.margin = align === 'left' ? '18px auto 18px 0' : (align === 'right' ? '18px 0 18px auto' : '18px auto');
      }

      positionLineHandles(line);
      window.DocFlow.Editor?.notifyChange();
    };

    popover.querySelectorAll('select, input').forEach(input => {
      input.addEventListener('input', applyStyle);
      input.addEventListener('change', applyStyle);
    });

    popover.querySelectorAll('.df-line-color-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        const c = swatch.dataset.color;
        const target = swatch.dataset.target;
        if (target === 'header') {
          const hdrInput = popover.querySelector('#dfLinePopHeaderColor');
          if (hdrInput) hdrInput.value = c;
        } else {
          const colorInput = popover.querySelector('#dfLinePopColor');
          if (colorInput) colorInput.value = c;
        }
        applyStyle();
      });
    });

    popover.querySelector('#dfLinePopDelete')?.addEventListener('click', () => {
      line.remove();
      deselectLine();
      window.DocFlow.Editor?.notifyChange();
      showToast(isNote ? 'Note deleted' : 'Line deleted', 'info');
    });
  }

  function attachShapeListeners(shape) {
    shape.setAttribute('draggable', 'false');
    shape.addEventListener('click', e => {
      if (selectedImage !== shape) {
        selectImage(shape);
      } else {
        positionAllHandles(shape);
        if (activeImageToolbar) positionImageToolbar(shape, activeImageToolbar);
      }
    });

    shape.addEventListener('dblclick', e => {
      e.stopPropagation();
      addOrEditTextInShape(shape);
    });

    // Support dragging shape directly in Excel
    let isDragging = false, startX = 0, startY = 0, initLeft = 0, initTop = 0;
    shape.addEventListener('mousedown', e => {
      if (e.target.closest('.df-img-handle, .df-img-move-handle, .df-img-toolbar')) return;
      const excelContainer = document.querySelector('.excel-spreadsheet-container');
      if (!excelContainer || !excelContainer.contains(shape)) return;

      selectImage(shape);
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initLeft = parseFloat(shape.style.left) || 0;
      initTop = parseFloat(shape.style.top) || 0;
      e.preventDefault();
      e.stopPropagation();

      const onMouseMove = me => {
        if (!isDragging) return;
        const dx = me.clientX - startX;
        const dy = me.clientY - startY;
        shape.style.left = (initLeft + dx) + 'px';
        shape.style.top = (initTop + dy) + 'px';
        positionAllHandles(shape);
      };

      const onMouseUp = me => {
        if (!isDragging) return;
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        // Snap and adjust dimensions to fit destination cell
        const cell = document.elementFromPoint(me.clientX, me.clientY)?.closest('.excel-grid-table td');
        if (cell && excelContainer) {
          const cRect = cell.getBoundingClientRect();
          const pRect = excelContainer.getBoundingClientRect();
          shape.style.position = 'absolute';
          shape.style.left = Math.round(cRect.left - pRect.left + excelContainer.scrollLeft) + 'px';
          shape.style.top = Math.round(cRect.top - pRect.top + excelContainer.scrollTop) + 'px';
          shape.style.width = Math.max(20, Math.round(cRect.width)) + 'px';
          shape.style.height = Math.max(20, Math.round(cRect.height)) + 'px';
          shape.style.margin = '0px';
          const svg = shape.querySelector('svg');
          if (svg) {
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
          }
          positionAllHandles(shape);
          if (activeImageToolbar) positionImageToolbar(shape, activeImageToolbar);
          window.DocFlow.Editor?.notifyChange();
          window.DocFlow.Editor?.saveSnapshot?.(true);
          showToast(`Shape fitted to cell ${cell.dataset.coord || ''}`, 'success');
        }
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  // ==========================================================================
  // Vector Shape Insertion & Parametric Geometries (Issue 2)
  // ==========================================================================
  function updateShapePreview() {
    const previewContainer = $('#shapeLivePreview');
    if (!previewContainer) return;

    const activeBtn = $('#shapesGrid .shape-opt-btn.active');
    const shapeType = activeBtn ? activeBtn.dataset.shape : 'rectangle';
    const shapeTitle = activeBtn ? (activeBtn.getAttribute('title') || shapeType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())) : 'Rectangle';
    const chosenLabel = $('#shapeChosenLabel');
    if (chosenLabel) chosenLabel.textContent = shapeTitle;

    const fill = $('#shapeFillColor')?.value || '#e85d04';
    const stroke = $('#shapeStrokeColor')?.value || '#d45500';
    const strokeWidth = parseInt($('#shapeStrokeWidth')?.value || '2', 10);
    const size = parseInt($('#shapeSizeSelect')?.value || '120', 10);

    const customParams = shapeType === 'parametric' ? {
      paramType: $('#shapeParamType')?.value || 'polygon',
      sides: parseInt($('#shapeParamSides')?.value || '5', 10),
      radius: parseInt($('#shapeParamRadius')?.value || '4', 10),
      width: parseInt($('#shapeParamWidth')?.value || '120', 10),
      height: parseInt($('#shapeParamHeight')?.value || '100', 10),
      path: $('#shapeParamPath')?.value.trim() || ''
    } : null;

    const svg = getShapeSvg(shapeType, fill, stroke, strokeWidth, size, customParams);
    previewContainer.innerHTML = svg;
  }

  function setupShapesModal() {
    $('#ribbonInsertShapeBtn')?.addEventListener('click', () => {
      if (window.DocFlow.currentMode !== 'edit') {
        showToast('Open a document in edit mode first', 'info');
        return;
      }
      openModal('#shapeModal');
      setTimeout(updateShapePreview, 50);
    });

    $$('#shapesGrid .shape-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#shapesGrid .shape-opt-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const paramsBox = $('#customShapeParamsBox');
        if (paramsBox) {
          paramsBox.style.display = btn.dataset.shape === 'parametric' ? 'block' : 'none';
        }
        updateShapePreview();
      });
    });

    $('#shapeParamType')?.addEventListener('change', e => {
      const isPath = e.target.value === 'path';
      const pathWrap = $('#shapePathWrap');
      if (pathWrap) pathWrap.style.display = isPath ? 'block' : 'block';
      updateShapePreview();
    });

    $$('.shape-path-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const pInput = $('#shapeParamPath');
        if (pInput) pInput.value = btn.dataset.path || '';
        const pType = $('#shapeParamType');
        if (pType) pType.value = 'path';
        updateShapePreview();
      });
    });

    ['#shapeParamSides', '#shapeParamWidth', '#shapeParamHeight', '#shapeParamRadius', '#shapeParamPath', '#shapeSizeSelect', '#shapeStrokeWidth'].forEach(sel => {
      const el = $(sel);
      el?.addEventListener('input', updateShapePreview);
      el?.addEventListener('change', updateShapePreview);
    });

    $('#shapeFillColor')?.addEventListener('input', e => {
      const hex = $('#shapeFillHex');
      if (hex) hex.value = e.target.value;
      updateShapePreview();
    });

    $('#shapeFillHex')?.addEventListener('input', e => {
      const color = $('#shapeFillColor');
      if (color) color.value = e.target.value;
      updateShapePreview();
    });

    $('#shapeStrokeColor')?.addEventListener('input', updateShapePreview);

    $('#shapeCancelBtn')?.addEventListener('click', () => {
      closeModal('#shapeModal');
    });

    $('#shapeInsertBtn')?.addEventListener('click', () => {
      const activeBtn = $('#shapesGrid .shape-opt-btn.active');
      const shapeType = activeBtn ? activeBtn.dataset.shape : 'rectangle';
      const fill = $('#shapeFillColor')?.value || '#e85d04';
      const stroke = $('#shapeStrokeColor')?.value || '#d45500';
      const strokeWidth = parseInt($('#shapeStrokeWidth')?.value || '2', 10);
      const size = parseInt($('#shapeSizeSelect')?.value || '120', 10);
      const shadow = $('#shapeShadowSelect')?.value || 'drop-shadow(2px 4px 6px rgba(0,0,0,0.35))';

      const customParams = shapeType === 'parametric' ? {
        paramType: $('#shapeParamType')?.value || 'polygon',
        sides: parseInt($('#shapeParamSides')?.value || '5', 10),
        radius: parseInt($('#shapeParamRadius')?.value || '4', 10),
        width: parseInt($('#shapeParamWidth')?.value || '120', 10),
        height: parseInt($('#shapeParamHeight')?.value || '100', 10),
        path: $('#shapeParamPath')?.value.trim() || ''
      } : null;

      insertShapeIntoDocument(shapeType, fill, stroke, strokeWidth, size, customParams, shadow);
      closeModal('#shapeModal');
      showToast('Shape inserted into document', 'success');
    });
  }

  function getShapeSvg(shapeType, fill, stroke, strokeWidth, size, customParams = null) {
    const sw = strokeWidth;
    const pad = Math.max(4, sw);
    const w = (customParams && customParams.width) ? customParams.width : size;
    const h = (customParams && customParams.height) ? customParams.height : ((shapeType === 'rectangle' || shapeType === 'rounded-rect' || shapeType === 'callout') ? Math.round(w * 0.65) : w);

    let inner = '';
    if (shapeType === 'parametric' && customParams) {
      if (customParams.paramType === 'path' || customParams.path) {
        const pathD = customParams.path || 'M50 0 L61 35 L98 35 L68 57 L79 91 L50 70 L21 91 L32 57 L2 35 L39 35 Z';
        return `<svg class="doc-shape-svg" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="display:block;overflow:visible;"><path d="${pathD}" fill="${fill}" stroke="${stroke}" stroke-width="${Math.max(1, sw)}" vector-effect="non-scaling-stroke"/></svg>`;
      } else if (customParams.paramType === 'polygon') {
        const sides = Math.max(3, customParams.sides || 5);
        const cx = w / 2, cy = h / 2, rx = (w - pad * 2) / 2, ry = (h - pad * 2) / 2;
        let pts = [];
        for (let i = 0; i < sides; i++) {
          const angle = (i * 2 * Math.PI / sides) - (Math.PI / 2);
          pts.push(`${cx + rx * Math.cos(angle)},${cy + ry * Math.sin(angle)}`);
        }
        inner = `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
      } else if (customParams.paramType === 'star') {
        const points = Math.max(3, customParams.sides || 5);
        const cx = w / 2, cy = h / 2, rxOuter = (w - pad * 2) / 2, ryOuter = (h - pad * 2) / 2;
        const rxInner = rxOuter * 0.45, ryInner = ryOuter * 0.45;
        let pts = [];
        for (let i = 0; i < points * 2; i++) {
          const rx = i % 2 === 0 ? rxOuter : rxInner;
          const ry = i % 2 === 0 ? ryOuter : ryInner;
          const angle = (i * Math.PI / points) - (Math.PI / 2);
          pts.push(`${cx + rx * Math.cos(angle)},${cy + ry * Math.sin(angle)}`);
        }
        inner = `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
      } else if (customParams.paramType === 'pill') {
        inner = `<rect x="${pad}" y="${pad}" width="${w - pad * 2}" height="${h - pad * 2}" rx="${Math.round(Math.min(w, h) / 2)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
      } else if (customParams.paramType === 'parallelogram') {
        const pts = `${w * 0.25},${pad} ${w - pad},${pad} ${w * 0.75},${h - pad} ${pad},${h - pad}`;
        inner = `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
      } else if (customParams.paramType === 'trapezoid') {
        const pts = `${w * 0.22},${pad} ${w * 0.78},${pad} ${w - pad},${h - pad} ${pad},${h - pad}`;
        inner = `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
      } else if (customParams.paramType === 'cross') {
        const c1x = w * 0.35, c2x = w * 0.65;
        const c1y = h * 0.35, c2y = h * 0.65;
        const pts = `${c1x},${pad} ${c2x},${pad} ${c2x},${c1y} ${w-pad},${c1y} ${w-pad},${c2y} ${c2x},${c2y} ${c2x},${h-pad} ${c1x},${h-pad} ${c1x},${c2y} ${pad},${c2y} ${pad},${c1y} ${c1x},${c1y}`;
        inner = `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
      } else {
        inner = `<rect x="${pad}" y="${pad}" width="${w - pad * 2}" height="${h - pad * 2}" rx="${customParams.radius || 4}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
      }
    } else if (shapeType === 'rectangle') {
      inner = `<rect x="${pad}" y="${pad}" width="${w - pad * 2}" height="${h - pad * 2}" rx="2" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    } else if (shapeType === 'rounded-rect') {
      inner = `<rect x="${pad}" y="${pad}" width="${w - pad * 2}" height="${h - pad * 2}" rx="14" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    } else if (shapeType === 'circle') {
      const rx = (w - pad * 2) / 2, ry = (h - pad * 2) / 2;
      inner = `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    } else if (shapeType === 'triangle') {
      inner = `<polygon points="${w / 2},${pad} ${w - pad},${h - pad} ${pad},${h - pad}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    } else if (shapeType === 'star') {
      const cx = w / 2, cy = h / 2, rxOuter = (w - pad * 2) / 2, ryOuter = (h - pad * 2) / 2;
      const rxInner = rxOuter * 0.45, ryInner = ryOuter * 0.45;
      let pts = [];
      for (let i = 0; i < 10; i++) {
        const rx = i % 2 === 0 ? rxOuter : rxInner;
        const ry = i % 2 === 0 ? ryOuter : ryInner;
        const angle = (i * Math.PI / 5) - (Math.PI / 2);
        pts.push(`${cx + rx * Math.cos(angle)},${cy + ry * Math.sin(angle)}`);
      }
      inner = `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    } else if (shapeType === 'arrow-right') {
      const pts = `${pad},${h * 0.35} ${w * 0.6},${h * 0.35} ${w * 0.6},${pad} ${w - pad},${h / 2} ${w * 0.6},${h - pad} ${w * 0.6},${h * 0.65} ${pad},${h * 0.65}`;
      inner = `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    } else if (shapeType === 'callout') {
      const bw = w - pad * 2, bh = h * 0.75;
      inner = `<rect x="${pad}" y="${pad}" width="${bw}" height="${bh}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
               <polygon points="${w * 0.25},${pad + bh} ${w * 0.4},${pad + bh} ${w * 0.2},${h - pad}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    } else if (shapeType === 'diamond') {
      inner = `<polygon points="${w / 2},${pad} ${w - pad},${h / 2} ${w / 2},${h - pad} ${pad},${h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    } else if (shapeType === 'heart') {
      inner = `<path d="M${w/2} ${h*0.8} C${w*0.1} ${h*0.5} ${w*0.1} ${h*0.15} ${w/2} ${h*0.35} C${w*0.9} ${h*0.15} ${w*0.9} ${h*0.5} ${w/2} ${h*0.8} Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    } else if (shapeType === 'cross') {
      const c1x = w * 0.35, c2x = w * 0.65;
      const c1y = h * 0.35, c2y = h * 0.65;
      const pts = `${c1x},${pad} ${c2x},${pad} ${c2x},${c1y} ${w-pad},${c1y} ${w-pad},${c2y} ${c2x},${c2y} ${c2x},${h-pad} ${c1x},${h-pad} ${c1x},${c2y} ${pad},${c2y} ${pad},${c1y} ${c1x},${c1y}`;
      inner = `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    } else if (shapeType === 'arrow-left') {
      const pts = `${w - pad},${h * 0.35} ${w * 0.4},${h * 0.35} ${w * 0.4},${pad} ${pad},${h / 2} ${w * 0.4},${h - pad} ${w * 0.4},${h * 0.65} ${w - pad},${h * 0.65}`;
      inner = `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    } else if (shapeType === 'arrow-up') {
      const pts = `${w * 0.35},${h - pad} ${w * 0.35},${h * 0.4} ${pad},${h * 0.4} ${w / 2},${pad} ${w - pad},${h * 0.4} ${w * 0.65},${h * 0.4} ${w * 0.65},${h - pad}`;
      inner = `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    } else if (shapeType === 'arrow-down') {
      const pts = `${w * 0.35},${pad} ${w * 0.65},${pad} ${w * 0.65},${h * 0.6} ${w - pad},${h * 0.6} ${w / 2},${h - pad} ${pad},${h * 0.6} ${w * 0.35},${h * 0.6}`;
      inner = `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    } else if (shapeType === 'pentagon') {
      const pts = `${w / 2},${pad} ${w - pad},${h * 0.38} ${w * 0.81},${h - pad} ${w * 0.19},${h - pad} ${pad},${h * 0.38}`;
      inner = `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    } else if (shapeType === 'cloud') {
      inner = `<path d="M ${w*0.25} ${h*0.75} A ${w*0.18} ${h*0.22} 0 0 1 ${w*0.2} ${h*0.48} A ${w*0.22} ${h*0.26} 0 0 1 ${w*0.48} ${h*0.25} A ${w*0.26} ${h*0.3} 0 0 1 ${w*0.8} ${h*0.42} A ${w*0.18} ${h*0.24} 0 0 1 ${w*0.82} ${h*0.75} Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    } else if (shapeType === 'lightning') {
      const pts = `${w*0.58},${pad} ${pad},${h*0.56} ${w*0.44},${h*0.56} ${w*0.38},${h-pad} ${w-pad},${h*0.44} ${w*0.54},${h*0.44}`;
      inner = `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    } else if (shapeType === 'sun') {
      const cx = w / 2, cy = h / 2, rOut = (w - pad * 2) / 2, rIn = rOut * 0.68;
      let pts = [];
      for (let i = 0; i < 16; i++) {
        const r = i % 2 === 0 ? rOut : rIn;
        const angle = (i * Math.PI / 8) - (Math.PI / 2);
        pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
      }
      inner = `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    } else if (shapeType === 'cylinder') {
      const ew = (w - pad * 2) / 2;
      const eh = Math.max(8, h * 0.16);
      inner = `<ellipse cx="${w / 2}" cy="${pad + eh}" rx="${ew}" ry="${eh}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
               <path d="M ${pad} ${pad + eh} v ${h - eh * 2 - pad * 2} a ${ew} ${eh} 0 0 0 ${ew * 2} 0 v -${h - eh * 2 - pad * 2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
               <ellipse cx="${w / 2}" cy="${h - pad - eh}" rx="${ew}" ry="${eh}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    } else if (shapeType === 'parallelogram') {
      const pts = `${w * 0.25},${pad} ${w - pad},${pad} ${w * 0.75},${h - pad} ${pad},${h - pad}`;
      inner = `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    } else if (shapeType === 'trapezoid') {
      const pts = `${w * 0.22},${pad} ${w * 0.78},${pad} ${w - pad},${h - pad} ${pad},${h - pad}`;
      inner = `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    } else if (shapeType === 'octagon') {
      const pts = `${w * 0.29},${pad} ${w * 0.71},${pad} ${w - pad},${h * 0.29} ${w - pad},${h * 0.71} ${w * 0.71},${h - pad} ${w * 0.29},${h - pad} ${pad},${h * 0.71} ${pad},${h * 0.29}`;
      inner = `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    } else if (shapeType === 'oval') {
      const rx = (w - pad * 2) / 2, ry = (h - pad * 2) / 2.6;
      inner = `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    } else if (shapeType === 'badge') {
      const pts = `${pad},${pad} ${w - pad},${pad} ${w - pad},${h * 0.65} ${w / 2},${h - pad} ${pad},${h * 0.65}`;
      inner = `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    } else if (shapeType === 'crescent') {
      inner = `<path d="M ${w * 0.5} ${pad} A ${(w - pad*2)*0.48} ${(h - pad*2)*0.48} 0 1 0 ${w * 0.88} ${h * 0.78} A ${(w - pad*2)*0.38} ${(h - pad*2)*0.38} 0 1 1 ${w * 0.5} ${pad} Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    } else if (shapeType === 'check') {
      const pts = `${pad},${h * 0.55} ${w * 0.38},${h - pad} ${w - pad},${pad + 4} ${w * 0.82},${pad} ${w * 0.36},${h * 0.72} ${w * 0.14},${h * 0.42}`;
      inner = `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    } else if (shapeType === 'tag') {
      const pts = `${pad},${pad} ${w * 0.72},${pad} ${w - pad},${h / 2} ${w * 0.72},${h - pad} ${pad},${h - pad}`;
      inner = `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/><circle cx="${w * 0.28}" cy="${h / 2}" r="${Math.max(4, w * 0.06)}" fill="${stroke}"/>`;
    } else if (shapeType === 'cube') {
      inner = `<polygon points="${w/2},${pad} ${w-pad},${h*0.28} ${w/2},${h*0.54} ${pad},${h*0.28}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
               <polygon points="${pad},${h*0.28} ${w/2},${h*0.54} ${w/2},${h-pad} ${pad},${h*0.74}" fill="${fill}" opacity="0.85" stroke="${stroke}" stroke-width="${sw}"/>
               <polygon points="${w/2},${h*0.54} ${w-pad},${h*0.28} ${w-pad},${h*0.74} ${w/2},${h-pad}" fill="${fill}" opacity="0.7" stroke="${stroke}" stroke-width="${sw}"/>`;
    } else if (shapeType === 'double-arrow') {
      const pts = `${pad},${h/2} ${w*0.3},${pad} ${w*0.3},${h*0.35} ${w*0.7},${h*0.35} ${w*0.7},${pad} ${w-pad},${h/2} ${w*0.7},${h-pad} ${w*0.7},${h*0.65} ${w*0.3},${h*0.65} ${w*0.3},${h-pad}`;
      inner = `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    } else {
      // Default / Hexagon
      const pts = `${w*0.25},${pad} ${w*0.75},${pad} ${w-pad},${h/2} ${w*0.75},${h-pad} ${w*0.25},${h-pad} ${pad},${h/2}`;
      inner = `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    }

    return `<svg class="doc-shape-svg" width="100%" height="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="display:block;overflow:visible;">${inner}</svg>`;
  }

  function insertShapeIntoDocument(shapeType, fill, stroke, strokeWidth, size, customParams = null, shadow = 'none') {
    const w = (customParams && customParams.width) ? customParams.width : size;
    const h = (customParams && customParams.height) ? customParams.height : ((shapeType === 'rectangle' || shapeType === 'rounded-rect' || shapeType === 'callout') ? Math.round(w * 0.65) : w);
    const svgHtml = getShapeSvg(shapeType, fill, stroke, strokeWidth, size, customParams);
    const shapeId = 'shape_' + Date.now();
    const shapeName = shapeType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const filterStyle = (shadow && shadow !== 'none') ? `filter:${shadow};` : '';
    const shapeHtml = `
      <div class="doc-shape-container" id="${shapeId}" data-shape="${shapeType}" data-shape-name="${shapeName}" data-shadow="${shadow}" title="Shape: ${shapeName}" data-fill="${fill}" data-stroke="${stroke}" data-stroke-width="${strokeWidth}" contenteditable="false" style="width:${w}px;height:${h}px;${filterStyle}display:inline-block;cursor:pointer;position:relative;margin:8px 4px;vertical-align:middle;">
        ${svgHtml}
      </div>&nbsp;`;

    const activeSlide = window.DocFlow?.getCurrentSlideWrapper?.() || document.querySelector('.pptx-slide-wrapper.active-slide') || document.querySelector('.pptx-slide-card.active-slide') || document.querySelector('.pptx-slide-card');
    const isPpt = !!activeSlide && (document.body.classList.contains('slide-deck-mode') || window.DocFlow?.isPptxDocument?.());

    if (isPpt && activeSlide) {
      const slideContent = activeSlide.querySelector('.pptx-slide-content') || activeSlide.querySelector('.pptx-slide-card') || activeSlide;
      const temp = document.createElement('div');
      temp.innerHTML = shapeHtml;
      const node = temp.firstElementChild;
      if (node) {
        node.style.position = 'absolute';
        node.style.left = '60px';
        node.style.top = '60px';
        node.style.zIndex = '10';
        slideContent.appendChild(node);
        window.DocFlow.Editor?.notifyChange();
        setTimeout(() => {
          attachShapeListeners(node);
          selectImage(node);
        }, 50);
        return;
      }
    }

    const excelContainer = document.querySelector('.excel-spreadsheet-container');
    if (excelContainer) {
      const temp = document.createElement('div');
      temp.innerHTML = shapeHtml;
      const node = temp.firstElementChild;
      if (node) {
        if (getComputedStyle(excelContainer).position === 'static') {
          excelContainer.style.position = 'relative';
        }
        node.style.position = 'absolute';
        const activeCell = (window._activeExcelCell && excelContainer.contains(window._activeExcelCell))
          ? window._activeExcelCell
          : (excelContainer.querySelector('td.excel-cell-selected') || excelContainer.querySelector('tbody td'));
        if (activeCell) {
          const cRect = activeCell.getBoundingClientRect();
          const pRect = excelContainer.getBoundingClientRect();
          node.style.left = Math.max(10, Math.round(cRect.left - pRect.left + excelContainer.scrollLeft + 15)) + 'px';
          node.style.top = Math.max(10, Math.round(cRect.top - pRect.top + excelContainer.scrollTop + 15)) + 'px';
        } else {
          node.style.left = '60px';
          node.style.top = '60px';
        }
        node.style.zIndex = '25';
        excelContainer.appendChild(node);
        window.DocFlow.Editor?.notifyChange();
        setTimeout(() => {
          attachShapeListeners(node);
          selectImage(node);
        }, 50);
        return;
      }
    }

    window.DocFlow.Editor?.insertHtmlAtCursor(shapeHtml);
    window.DocFlow.Editor?.notifyChange();

    setTimeout(() => {
      const el = document.getElementById(shapeId);
      if (el) {
        attachShapeListeners(el);
        selectImage(el);
      }
    }, 50);
  }

  let isImageManagerInitialized = false;

  function initImageManager() {
    setupImageModal();
    setupEditorDropZone();
    if (!isImageManagerInitialized) {
      setupClipboardPaste();
      setupDocumentImageListeners();
      setupShapesModal();
      isImageManagerInitialized = true;
    }
    refreshElementListeners();
  }

  // Export module
  window.DocFlow = window.DocFlow || {};
  window.DocFlow.ImageManager = {
    initImageManager,
    refreshElementListeners,
    insertImageIntoDocument,
    insertShapeIntoDocument,
    getShapeSvg,
    attachShapeListeners,
    selectImage,
    deselectImage,
    selectLine,
    deselectLine,
    attachLineListeners,
    getSelectedImage: () => selectedImage,
    getSelectedLine: () => selectedLine,
    isNoteElement,
    setImageWrapMode,
    optimizeImage,
    isImageFile
  };

})(window);
