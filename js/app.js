/**
 * DocFlow — Main Application Controller & State Coordinator
 */

(function (window) {
  'use strict';

  const { $, $$, escHtml, showToast, openModal, closeModal } = window.DocFlow.UI;

  // Templates Definitions
  // Format-Specific Templates Suites (Issue 6: Dynamic auto-changing templates by format)
  const FORMAT_TEMPLATES = {
    docx: [
      {
        id: 'blank',
        name: 'Blank Document',
        icon: 'fa-file-word',
        content: '<p><br></p>'
      },
      {
        id: 'letter',
        name: 'Formal Letter',
        icon: 'fa-envelope',
        content: `<h1>[Your Name]</h1>\n<p>[Your Address]<br>[City, State, ZIP Code]<br>[Your Email] | [Your Phone]</p>\n<p>[Date]</p>\n<p>[Recipient Name]<br>[Recipient Title]<br>[Company Name]<br>[Company Address]<br>[City, State, ZIP]</p>\n<p>Dear [Recipient Name],</p>\n<p>[Opening paragraph stating the purpose of the letter]</p>\n<p>[Body paragraph providing necessary details, context, and information]</p>\n<p>[Closing paragraph with a clear call to action or next steps]</p>\n<p>Sincerely,<br><br><strong>[Your Name]</strong><br>[Your Title]</p>`
      },
      {
        id: 'resume',
        name: 'Modern Resume',
        icon: 'fa-user-tie',
        content: `<h1>[Your Full Name]</h1>\n<p>[Email Address] | [Phone Number] | [LinkedIn Profile] | [City, Country]</p>\n<hr>\n<h2>Professional Summary</h2>\n<p>[Concise overview highlighting key expertise, accomplishments, and career goals.]</p>\n<h2>Work Experience</h2>\n<h3>[Job Title] — [Company Name]</h3>\n<p><em>[Month, Year] – [Present]</em> | [Location]</p>\n<ul>\n  <li>[Spearheaded project with measurable outcomes]</li>\n  <li>[Collaborated with cross-functional teams to achieve strategic goals]</li>\n  <li>[Optimized workflows resulting in increased performance]</li>\n</ul>\n<h2>Education</h2>\n<h3>[Degree Name] — [University Name]</h3>\n<p><em>[Graduation Year]</em> | [Location]</p>\n<h2>Skills</h2>\n<p>[Skill 1] &bull; [Skill 2] &bull; [Skill 3] &bull; [Skill 4] &bull; [Skill 5]</p>`
      },
      {
        id: 'report',
        name: 'Project Report',
        icon: 'fa-chart-bar',
        content: `<h1>[Project Report Title]</h1>\n<p><em>Author: [Author Name]<br>Date: [Date]<br>Status: Draft</em></p>\n<hr>\n<h2>1. Executive Summary</h2>\n<p>[High-level overview of objectives, findings, and recommended actions.]</p>\n<h2>2. Objectives</h2>\n<p>[Primary and secondary goals of this initiative.]</p>\n<h2>3. Key Findings</h2>\n<p>[Detailed findings supported by data and observations.]</p>\n<h2>4. Action Items & Next Steps</h2>\n<ol>\n  <li>[Immediate action item with owner and target completion date]</li>\n  <li>[Secondary milestone to review during next cycle]</li>\n</ol>`
      },
      {
        id: 'meeting',
        name: 'Meeting Minutes',
        icon: 'fa-users',
        content: `<h1>Executive Meeting Minutes</h1>\n<p><strong>Date:</strong> [Date] | <strong>Time:</strong> [Time] | <strong>Location:</strong> [Room / Virtual]</p>\n<p><strong>Attendees:</strong> [Attendee 1, Attendee 2, Attendee 3]</p>\n<hr>\n<h2>Agenda Topics</h2>\n<ul>\n  <li>Review previous milestone goals</li>\n  <li>Sprint planning & feature alignment</li>\n  <li>Open Q&A discussion</li>\n</ul>\n<h2>Discussion Points</h2>\n<p>[Summary of discussions and key decisions made during the session.]</p>\n<h2>Action Items</h2>\n<table><thead><tr><th>Action Item</th><th>Owner</th><th>Due Date</th><th>Status</th></tr></thead><tbody><tr><td>Deploy updated document editor</td><td>Engineering</td><td>Friday</td><td>In Progress</td></tr><tr><td>Review documentation feedback</td><td>Design Team</td><td>Monday</td><td>Pending</td></tr></tbody></table>`
      },
      {
        id: 'essay',
        name: 'Academic Essay',
        icon: 'fa-pen-nib',
        content: `<h1>[Essay Title]</h1>\n<p><em>[Your Name]<br>[Course Title]<br>[Instructor Name]<br>[Date]</em></p>\n<hr>\n<h2>Introduction</h2>\n<p>[Compelling opening statement introducing the primary subject matter.]</p>\n<p><strong>Thesis:</strong> [Clear, concise statement formulating the central argument.]</p>\n<h2>Main Argument</h2>\n<p>[Thorough examination supported by relevant examples and textual evidence.]</p>\n<h2>Conclusion</h2>\n<p>[Synthesis of primary insights and closing perspectives.]</p>`
      }
    ],
    pdf: [
      {
        id: 'blank',
        name: 'Blank PDF Document',
        icon: 'fa-file-pdf',
        content: '<p><br></p>'
      },
      {
        id: 'invoice',
        name: 'Commercial Invoice',
        icon: 'fa-file-invoice-dollar',
        content: `<h1>COMMERCIAL INVOICE</h1>\n<p><strong>Invoice #:</strong> INV-2026-001 | <strong>Date:</strong> [Date] | <strong>Due Date:</strong> Net 30</p>\n<hr>\n<p><strong>Billed To:</strong> Acme Corporation<br>Attn: Accounts Payable<br>100 Business Parkway, Suite 400</p>\n<table style="width:100%;border-collapse:collapse;margin:18px 0;"><thead><tr style="background:#f1f5f9;"><th style="border:1px solid #cbd5e1;padding:8px 10px;text-align:left;">Service Description</th><th style="border:1px solid #cbd5e1;padding:8px 10px;text-align:right;">Hours / Qty</th><th style="border:1px solid #cbd5e1;padding:8px 10px;text-align:right;">Unit Rate</th><th style="border:1px solid #cbd5e1;padding:8px 10px;text-align:right;">Amount</th></tr></thead><tbody><tr><td style="border:1px solid #cbd5e1;padding:8px 10px;">Software Architecture & Performance Optimization</td><td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:right;">40 hrs</td><td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:right;">$150.00</td><td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:right;">$6,000.00</td></tr><tr><td style="border:1px solid #cbd5e1;padding:8px 10px;">UI/UX System Design Alignment</td><td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:right;">20 hrs</td><td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:right;">$125.00</td><td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:right;">$2,500.00</td></tr><tr><td colspan="3" style="border:1px solid #cbd5e1;padding:8px 10px;text-align:right;"><strong>Total Due:</strong></td><td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:right;"><strong>$8,500.00</strong></td></tr></tbody></table><p style="font-size:12px;color:#64748b;">Payment Methods: Bank Wire, ACH, or Corporate Card. Thank you for your partnership!</p>`
      },
      {
        id: 'certificate',
        name: 'Certificate of Excellence',
        icon: 'fa-award',
        content: `<div style="text-align:center;padding:36px;border:4px double #0284c7;border-radius:12px;background:#f8fafc;"><h1 style="color:#0f172a;letter-spacing:1px;font-size:28px;">CERTIFICATE OF ACHIEVEMENT</h1><p style="font-size:15px;color:#64748b;margin:14px 0 6px;">This certificate is proudly conferred upon</p><h2 style="color:#0284c7;font-size:26px;margin:10px 0 16px;">[Recipient Full Name]</h2><p style="max-width:540px;margin:0 auto;color:#334155;line-height:1.6;">In recognition of outstanding dedication, visionary leadership, and exemplary contributions to document engineering excellence.</p><div style="display:flex;justify-content:space-between;margin-top:40px;padding:0 40px;"><div style="border-top:1px solid #94a3b8;width:160px;padding-top:6px;font-size:12px;color:#64748b;">Authorized Signature</div><div style="border-top:1px solid #94a3b8;width:160px;padding-top:6px;font-size:12px;color:#64748b;">Date Awarded</div></div></div>`
      },
      {
        id: 'memo',
        name: 'Official Policy Memo',
        icon: 'fa-clipboard-list',
        content: `<h1>MEMORANDUM</h1>\n<p><strong>TO:</strong> All Engineering & Operations Teams<br><strong>FROM:</strong> Executive Leadership<br><strong>DATE:</strong> [Date]<br><strong>SUBJECT:</strong> Next-Generation Document Processing Guidelines</p>\n<hr>\n<h2>1. Purpose</h2>\n<p>This memorandum outlines standard procedures and security policies for multi-format document workflows.</p>\n<h2>2. Key Directives</h2>\n<ul><li>Ensure high-fidelity fidelity parsing for DOCX, XLSX, and PPTX formats.</li><li>Enforce responsive layout boundaries across desktop, tablet, and mobile devices.</li></ul>`
      }
    ],
    xlsx: [
      {
        id: 'blank',
        name: 'Blank Spreadsheet',
        icon: 'fa-table-cells',
        content: ''
      },
      {
        id: 'budget',
        name: 'Budget & Expense Tracker',
        icon: 'fa-coins',
        content: 'BUDGET_TEMPLATE'
      },
      {
        id: 'sales',
        name: 'Sales & Revenue Sheet',
        icon: 'fa-chart-line',
        content: 'SALES_TEMPLATE'
      },
      {
        id: 'tasks',
        name: 'Project Task Schedule',
        icon: 'fa-list-check',
        content: 'TASKS_TEMPLATE'
      },
      {
        id: 'inventory',
        name: 'Inventory Log',
        icon: 'fa-boxes-stacked',
        content: 'INVENTORY_TEMPLATE'
      }
    ],
    pptx: [
      {
        id: 'pitch',
        name: 'Executive Pitch Deck',
        icon: 'fa-presentation-screen',
        content: 'PPTX_PITCH'
      },
      {
        id: 'blank',
        name: 'Blank Slide Deck',
        icon: 'fa-file-powerpoint',
        content: 'PPTX_BLANK'
      },
      {
        id: 'showcase',
        name: 'Project Showcase',
        icon: 'fa-photo-film',
        content: 'PPTX_SHOWCASE'
      },
      {
        id: 'comparison',
        name: '2-Column Comparison',
        icon: 'fa-columns',
        content: 'PPTX_COMPARISON'
      }
    ],
    html: [
      {
        id: 'boilerplate',
        name: 'HTML5 Boilerplate',
        icon: 'fa-html5',
        content: 'HTML_BOILERPLATE'
      },
      {
        id: 'landing',
        name: 'Modern Landing Page',
        icon: 'fa-globe',
        content: 'HTML_LANDING'
      },
      {
        id: 'portfolio',
        name: 'Developer Portfolio',
        icon: 'fa-address-card',
        content: 'HTML_PORTFOLIO'
      },
      {
        id: 'blog',
        name: 'Clean Article Post',
        icon: 'fa-newspaper',
        content: 'HTML_BLOG'
      }
    ],
    md: [
      {
        id: 'readme',
        name: 'GitHub Project README',
        icon: 'fa-book-open',
        content: 'MD_README'
      },
      {
        id: 'blank',
        name: 'Blank Markdown',
        icon: 'fab fa-markdown',
        content: 'MD_BLANK'
      },
      {
        id: 'docs',
        name: 'API & Technical Docs',
        icon: 'fa-code-branch',
        content: 'MD_DOCS'
      },
      {
        id: 'sprint',
        name: 'Sprint Release Notes',
        icon: 'fa-rocket',
        content: 'MD_SPRINT'
      },
      {
        id: 'checklist',
        name: 'Task Checklist',
        icon: 'fa-square-check',
        content: 'MD_CHECKLIST'
      }
    ],
    txt: [
      {
        id: 'blank',
        name: 'Blank Plain Text',
        icon: 'fa-file-lines',
        content: ''
      },
      {
        id: 'notes',
        name: 'Meeting Quick Notes',
        icon: 'fa-note-sticky',
        content: `MEETING QUICK NOTES\n===================\nDate: [Date]\nParticipants: [Names]\n\nKey Takeaways:\n- Aligned sprint delivery scope\n- Reviewed multi-format reader updates\n\nNext Actions:\n1. Verify responsive design on mobile and tablet\n2. Run regression checks on Excel and PowerPoint\n`
      },
      {
        id: 'config',
        name: 'App Configuration File',
        icon: 'fa-sliders',
        content: `[app_configuration]\nenvironment = production\nversion = 2.5.0\nmax_document_size_mb = 50\nauto_save_interval_sec = 2.5\ntheme = dark\nenable_hardware_acceleration = true\n`
      }
    ]
  };

  // Backwards compatibility alias
  const TEMPLATES = FORMAT_TEMPLATES.docx;

  // Application State
  window.DocFlow = window.DocFlow || {};
  window.DocFlow.currentMode = 'empty'; // 'empty' | 'edit' | 'view'
  window.DocFlow.isModified = false;

  const emptyState = $('#emptyState');
  const pdfWrap = $('#pdfWrap');
  const editorWrap = $('#editorWrap');
  const ribbonContainer = $('#ribbonContainer');
  const fileNameDisplay = $('#fileNameDisplay');
  const modifiedDot = $('#modifiedDot');
  const fileTypeInfo = $('#fileTypeInfo');
  const modeInfo = $('#modeInfo');

  // ==========================================================================
  // IndexedDB Storage for PDF Documents (Issue 1)
  // ==========================================================================
  const PdfStore = {
    DB_NAME: 'DocFlow_PDF_Store',
    STORE_NAME: 'pdf_files',
    _dbPromise: null,

    getDb() {
      if (!this._dbPromise) {
        this._dbPromise = new Promise((resolve, reject) => {
          const req = indexedDB.open(this.DB_NAME, 1);
          req.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(this.STORE_NAME)) {
              db.createObjectStore(this.STORE_NAME, { keyPath: 'name' });
            }
          };
          req.onsuccess = e => resolve(e.target.result);
          req.onerror = e => reject(e.target.error);
        });
      }
      return this._dbPromise;
    },

    async set(name, arrayBuffer) {
      if (!name || !arrayBuffer) return;
      try {
        const db = await this.getDb();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(this.STORE_NAME, 'readwrite');
          const store = tx.objectStore(this.STORE_NAME);
          store.put({ name: name.toLowerCase(), buffer: arrayBuffer, timestamp: Date.now() });
          tx.oncomplete = () => resolve(true);
          tx.onerror = e => reject(e.target.error);
        });
      } catch (err) {
        console.warn('PdfStore save error:', err);
      }
    },

    async get(name) {
      if (!name) return null;
      try {
        const db = await this.getDb();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(this.STORE_NAME, 'readonly');
          const store = tx.objectStore(this.STORE_NAME);
          const req = store.get(name.toLowerCase());
          req.onsuccess = () => resolve(req.result ? req.result.buffer : null);
          req.onerror = e => reject(e.target.error);
        });
      } catch (err) {
        console.warn('PdfStore get error:', err);
        return null;
      }
    },

    async remove(name) {
      if (!name) return;
      try {
        const db = await this.getDb();
        const tx = db.transaction(this.STORE_NAME, 'readwrite');
        tx.objectStore(this.STORE_NAME).delete(name.toLowerCase());
      } catch (e) {}
    }
  };

  // ==========================================================================
  // IndexedDB Storage for Layout Settings (Issue 1a)
  // Margin, Size, Page Color, Spacing, Padding, Page Border, Background Image,
  // Slide Color, Slide Theme
  // ==========================================================================
  const LayoutStore = {
    DB_NAME: 'DocFlow_Layout_Store',
    STORE_NAME: 'layout_settings',
    _dbPromise: null,

    getDb() {
      if (!this._dbPromise) {
        this._dbPromise = new Promise((resolve, reject) => {
          const req = indexedDB.open(this.DB_NAME, 1);
          req.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(this.STORE_NAME)) {
              db.createObjectStore(this.STORE_NAME, { keyPath: 'docKey' });
            }
          };
          req.onsuccess = e => resolve(e.target.result);
          req.onerror = e => reject(e.target.error);
        });
      }
      return this._dbPromise;
    },

    async set(docKey, key, val) {
      if (!docKey) return;
      const normKey = docKey.toLowerCase();
      try {
        const db = await this.getDb();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(this.STORE_NAME, 'readwrite');
          const store = tx.objectStore(this.STORE_NAME);
          const getReq = store.get(normKey);
          getReq.onsuccess = () => {
            const record = getReq.result || { docKey: normKey, settings: {} };
            if (!record.settings) record.settings = {};
            record.settings[key] = val;
            record.updatedAt = Date.now();
            store.put(record);
          };
          tx.oncomplete = () => resolve(true);
          tx.onerror = e => reject(e.target.error);
        });
      } catch (err) {
        console.warn('LayoutStore set error:', err);
      }
    },

    async getAll(docKey) {
      if (!docKey) return null;
      const normKey = docKey.toLowerCase();
      try {
        const db = await this.getDb();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(this.STORE_NAME, 'readonly');
          const store = tx.objectStore(this.STORE_NAME);
          const req = store.get(normKey);
          req.onsuccess = () => resolve(req.result ? req.result.settings : null);
          req.onerror = e => reject(e.target.error);
        });
      } catch (err) {
        console.warn('LayoutStore getAll error:', err);
        return null;
      }
    },

    async remove(docKey) {
      if (!docKey) return;
      try {
        const db = await this.getDb();
        const tx = db.transaction(this.STORE_NAME, 'readwrite');
        tx.objectStore(this.STORE_NAME).delete(docKey.toLowerCase());
      } catch (e) {}
    }
  };

  // ==========================================================================
  // IndexedDB Storage for Protected & Locked Documents (Issue 3)
  // Per-file password & lock state storage that cannot overwrite other files
  // ==========================================================================
  const FileLockStore = {
    DB_NAME: 'DocFlow_Lock_Store',
    STORE_NAME: 'locked_files',
    _dbPromise: null,

    getDb() {
      if (!this._dbPromise) {
        this._dbPromise = new Promise((resolve, reject) => {
          const req = indexedDB.open(this.DB_NAME, 1);
          req.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(this.STORE_NAME)) {
              db.createObjectStore(this.STORE_NAME, { keyPath: 'name' });
            }
          };
          req.onsuccess = e => resolve(e.target.result);
          req.onerror = e => reject(e.target.error);
        });
      }
      return this._dbPromise;
    },

    async lock(name, password) {
      if (!name) return;
      const normName = name.toLowerCase().trim();
      const pin = String(password || '').trim();
      try {
        const db = await this.getDb();
        await new Promise((resolve, reject) => {
          const tx = db.transaction(this.STORE_NAME, 'readwrite');
          const store = tx.objectStore(this.STORE_NAME);
          store.put({
            name: normName,
            password: pin,
            isLocked: true,
            lockedAt: Date.now()
          });
          tx.oncomplete = () => resolve(true);
          tx.onerror = e => reject(e.target.error);
        });
      } catch (err) {
        console.warn('FileLockStore save error:', err);
      }
      try {
        const cache = JSON.parse(localStorage.getItem('docflow_locked_docs') || '{}');
        cache[normName] = { isLocked: true, password: pin };
        localStorage.setItem('docflow_locked_docs', JSON.stringify(cache));
      } catch (_) {}
    },

    async unlock(name) {
      if (!name) return;
      const normName = name.toLowerCase().trim();
      try {
        const db = await this.getDb();
        const tx = db.transaction(this.STORE_NAME, 'readwrite');
        tx.objectStore(this.STORE_NAME).delete(normName);
      } catch (e) {}
      try {
        const cache = JSON.parse(localStorage.getItem('docflow_locked_docs') || '{}');
        delete cache[normName];
        localStorage.setItem('docflow_locked_docs', JSON.stringify(cache));
      } catch (_) {}
    },

    async get(name) {
      if (!name) return null;
      const normName = name.toLowerCase().trim();
      try {
        const db = await this.getDb();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(this.STORE_NAME, 'readonly');
          const store = tx.objectStore(this.STORE_NAME);
          const req = store.get(normName);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });
      } catch (e) {
        try {
          const cache = JSON.parse(localStorage.getItem('docflow_locked_docs') || '{}');
          return cache[normName] || null;
        } catch (_) {
          return null;
        }
      }
    },

    async verifyPassword(name, enteredPassword) {
      if (!name) return false;
      const entry = await this.get(name);
      if (!entry || !entry.isLocked) return true;
      const expected = String(entry.password || '').trim();
      const entered = String(enteredPassword || '').trim();
      return expected === entered;
    },

    isLockedSync(name) {
      if (!name) return false;
      try {
        const cache = JSON.parse(localStorage.getItem('docflow_locked_docs') || '{}');
        const entry = cache[name.toLowerCase().trim()];
        return !!(entry && entry.isLocked);
      } catch (_) {
        return false;
      }
    }
  };

  // Helper to persist layout setting to active tab & IndexedDB
  async function updateLayoutSetting(key, val) {
    const activeTab = window.DocFlow.UI?.Tabs?.get?.(window.DocFlow.UI.Tabs.activeId);
    const docKey = activeTab ? (activeTab.name || activeTab.id) : '__global_layout__';
    if (activeTab) {
      if (!activeTab.layoutSettings) activeTab.layoutSettings = {};
      activeTab.layoutSettings[key] = val;
      window.DocFlow.UI?.Tabs?.save?.();
    }
    await LayoutStore.set(docKey, key, val);
    await LayoutStore.set('__global_layout__', key, val);
  }

  // Helper to apply saved layout settings to the DOM
  function applyLayoutSettings(settings) {
    if (!settings) return;
    const page = $('.editor-page');
    const wrap = $('#editorWrap');
    const editor = $('#editor');
    if (!page || !editor) return;

    // 1. Margin
    if (settings.margin) {
      if (typeof settings.margin === 'string') {
        if (typeof applyMarginPreset === 'function') applyMarginPreset(settings.margin, false);
        $$('#marginPopover .margin-opt-item').forEach(el => {
          el.classList.toggle('active', el.dataset.margin === settings.margin);
        });
      } else if (typeof settings.margin === 'object') {
        const { top = 72, bottom = 72, left = 72, right = 72 } = settings.margin;
        page.style.padding = `${top}px ${right}px ${bottom}px ${left}px`;
      }
    }

    // 2. Size
    if (settings.size) {
      if (typeof settings.size === 'string') {
        if (typeof applyPageSize === 'function') applyPageSize(settings.size, false);
        $$('#pageSizePopover .margin-opt-item[data-size]').forEach(el => {
          el.classList.toggle('active', el.dataset.size === settings.size);
        });
      } else if (typeof settings.size === 'object') {
        const { width = 816, height = 1056 } = settings.size;
        page.style.maxWidth = `${width}px`;
        page.style.width = `${width}px`;
        page.style.minHeight = `${height}px`;
      }
    }

    // 3. Page Color
    if (settings.pageColor) {
      const color = settings.pageColor;
      const bgInput = $('#layoutPageBgInput');
      if (bgInput) bgInput.value = color;
      document.documentElement.style.setProperty('--excel-sheet-bg', color);
      page.style.setProperty('background-color', color, 'important');
      page.style.setProperty('--excel-sheet-bg', color);
      page.style.backgroundColor = color;
      if (wrap && wrap.classList.contains('full-size-active')) {
        wrap.style.setProperty('background-color', color, 'important');
      }
      const excelContainer = document.querySelector('.excel-spreadsheet-container');
      if (excelContainer) {
        excelContainer.style.setProperty('background-color', color, 'important');
        excelContainer.style.setProperty('--excel-sheet-bg', color);
      }
    }

    // 4. Spacing (Paragraph Spacing)
    if (settings.spacing) {
      editor.classList.remove('para-spacing-tight', 'para-spacing-relaxed', 'para-spacing-double');
      if (settings.spacing !== 'normal') editor.classList.add(`para-spacing-${settings.spacing}`);
      $$('#paraSpacingPopover .margin-opt-item').forEach(el => {
        el.classList.toggle('active', el.dataset.spacing === settings.spacing);
      });
    }

    // 5. Padding (Page Canvas Padding)
    if (settings.padding) {
      const padMap = { compact: '36px 36px', normal: '72px 72px', spacious: '96px 96px', edge: '12px 16px' };
      page.style.padding = padMap[settings.padding] || settings.padding;
      $$('#pagePaddingPopover .margin-opt-item').forEach(el => {
        el.classList.toggle('active', el.dataset.padding === settings.padding);
      });
    }

    // 6. Page Border
    if (settings.pageBorder) {
      page.classList.remove('page-border-box', 'page-border-shadow', 'page-border-double');
      if (settings.pageBorder === 'box') page.classList.add('page-border-box');
      else if (settings.pageBorder === 'shadow') page.classList.add('page-border-shadow');
      else if (settings.pageBorder === 'double') page.classList.add('page-border-double');
      else if (typeof settings.pageBorder === 'object') {
        page.style.border = `${settings.pageBorder.width || '2px'} ${settings.pageBorder.style || 'solid'} ${settings.pageBorder.color || '#3b82f6'}`;
        if (settings.pageBorder.radius) page.style.borderRadius = settings.pageBorder.radius;
      }
      $$('#pageBorderPopover .margin-opt-item').forEach(el => {
        el.classList.toggle('active', el.dataset.border === settings.pageBorder);
      });
    }

    // 7. Background Image
    if (settings.bgImage) {
      const curSlideCard = document.querySelector('#editor .pptx-slide-wrapper .pptx-slide-card') || document.querySelector('#editor .pptx-slide-card');
      if (curSlideCard) {
        curSlideCard.style.backgroundImage = `url(${settings.bgImage})`;
        curSlideCard.style.backgroundSize = 'cover';
        curSlideCard.style.backgroundPosition = 'center';
        curSlideCard.style.backgroundRepeat = 'no-repeat';
      } else {
        page.style.backgroundImage = `url(${settings.bgImage})`;
        page.style.backgroundSize = 'cover';
        page.style.backgroundPosition = 'center';
        page.style.backgroundRepeat = 'no-repeat';
      }
    }

    // 8. Slide Color
    if (settings.slideColor) {
      const curSlideCard = document.querySelector('#editor .pptx-slide-wrapper .pptx-slide-card') || document.querySelector('#editor .pptx-slide-card');
      if (curSlideCard) {
        curSlideCard.style.backgroundColor = settings.slideColor;
      }
      const pptColorInput = $('#pptBgColorInput');
      if (pptColorInput) pptColorInput.value = settings.slideColor;
    }

    // 9. Slide Theme
    if (settings.slideTheme) {
      const PPT_THEMES_DICT = {
        ocean: { bg: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)', text: '#f8fafc', border: '1px solid #3b82f6' },
        emerald: { bg: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)', text: '#f0fdf4', border: '1px solid #10b981' },
        sunset: { bg: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 100%)', text: '#fff7ed', border: '1px solid #f97316' },
        royal: { bg: 'linear-gradient(135deg, #3b0764 0%, #7e22ce 100%)', text: '#faf5ff', border: '1px solid #a855f7' },
        obsidian: { bg: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)', text: '#f4f4f5', border: '1px solid #3f3f46' },
        monochrome: { bg: '#ffffff', text: '#0f172a', border: '2px solid #0f172a' }
      };
      const theme = typeof settings.slideTheme === 'string' ? PPT_THEMES_DICT[settings.slideTheme] : settings.slideTheme;
      if (theme) {
        const curSlideCard = document.querySelector('#editor .pptx-slide-wrapper .pptx-slide-card') || document.querySelector('#editor .pptx-slide-card');
        if (curSlideCard) {
          curSlideCard.style.background = theme.bg;
          curSlideCard.style.color = theme.text;
          curSlideCard.style.border = theme.border;
          curSlideCard.querySelectorAll('h1, h2, h3, h4, .slide-title-box, .slide-content-box').forEach(el => el.style.color = theme.text);
        }
      }
    }
  }

  // Load from tab / IndexedDB and apply
  function applyPersistedLayoutSettings(tab) {
    if (tab && tab.layoutSettings) {
      applyLayoutSettings(tab.layoutSettings);
    }
    const docKey = tab ? (tab.name || tab.id) : '__global_layout__';
    LayoutStore.getAll(docKey).then(saved => {
      if (saved && Object.keys(saved).length > 0) {
        if (tab) {
          tab.layoutSettings = Object.assign({}, tab.layoutSettings || {}, saved);
          applyLayoutSettings(tab.layoutSettings);
        } else {
          applyLayoutSettings(saved);
        }
      } else {
        LayoutStore.getAll('__global_layout__').then(glob => {
          if (glob && Object.keys(glob).length > 0) {
            if (tab) {
              tab.layoutSettings = Object.assign({}, tab.layoutSettings || {}, glob);
              applyLayoutSettings(tab.layoutSettings);
            } else {
              applyLayoutSettings(glob);
            }
          }
        }).catch(() => {});
      }
    }).catch(err => console.warn('LayoutStore load error:', err));
  }
  window.DocFlow.applyPersistedLayoutSettings = applyPersistedLayoutSettings;

  // ==========================================================================
  // Recent Files Manager (Persistent, Individual Delete, Clear All, Reopen)
  // ==========================================================================
  const Recent = {
    KEY: 'docflow_recent_docs',

    getAll() {
      try {
        const raw = localStorage.getItem(this.KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },

    saveAll(list) {
      try {
        localStorage.setItem(this.KEY, JSON.stringify(list.slice(0, 30)));
      } catch (e) {
        console.warn('Recent files storage warning:', e);
      }
    },

    add(doc) {
      if (!doc || !doc.name) return;
      let list = this.getAll();
      // Remove previous entry with same name to prevent duplicates or data conflict
      list = list.filter(item => item.name.toLowerCase() !== doc.name.toLowerCase());

      const ext = (doc.name.split('.').pop() || '').toLowerCase();
      const isPdf = ext === 'pdf' || doc.type === 'PDF';
      let calcSize = doc.size;
      if (!calcSize || calcSize <= 0) {
        if (doc.pdfData) {
          calcSize = doc.pdfData.byteLength || (doc.pdfData.buffer ? doc.pdfData.buffer.byteLength : 0);
        } else if (doc.content) {
          calcSize = new Blob([doc.content]).size;
        } else {
          calcSize = 1024;
        }
      }

      const entry = {
        id: 'rec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        name: doc.name,
        type: doc.type || (isPdf ? 'PDF' : ext.toUpperCase()) || 'DOC',
        mode: doc.mode || (isPdf ? 'view' : 'edit'),
        content: doc.content || '<p><br></p>',
        size: calcSize,
        timestamp: Date.now()
      };

      if (doc.pdfData) {
        PdfStore.set(doc.name, doc.pdfData);
      }

      list.unshift(entry);
      this.saveAll(list);
      this.render();
    },

    updateContent(name, newContent, newSize) {
      if (!name) return;
      const list = this.getAll();
      const item = list.find(d => d.name.toLowerCase() === name.toLowerCase());
      const computedSize = newSize || (newContent ? new Blob([newContent]).size : (item?.size || 1024));
      if (item) {
        item.content = newContent;
        item.size = computedSize;
        item.timestamp = Date.now();
        this.saveAll(list);
        this.render();
      } else {
        this.add({
          name: name,
          content: newContent,
          size: computedSize,
          mode: 'edit'
        });
      }
    },

    remove(id) {
      let list = this.getAll();
      const target = list.find(item => item.id === id);
      if (target && (target.type === 'PDF' || target.name.toLowerCase().endsWith('.pdf'))) {
        PdfStore.remove(target.name);
      }
      list = list.filter(item => item.id !== id);
      this.saveAll(list);
      this.render();
      showToast('Removed from recent documents', 'info');
    },

    clearAll() {
      const list = this.getAll();
      if (!list.length) {
        showToast('No recent documents to clear', 'info');
        return;
      }
      if (!confirm('Are you sure you want to clear all recent documents?')) return;
      localStorage.removeItem(this.KEY);
      this.render();
      showToast('Recent documents cleared', 'info');
    },

    openDocument(item) {
      if (!item) return;

      // Check if document is locked (Issue 3)
      const isLocked = item.isLocked || FileLockStore.isLockedSync(item.name);
      if (isLocked) {
        openUnlockDocModal(item);
        return;
      }

      this._proceedOpenDocument(item);
    },

    _proceedOpenDocument(item) {
      // Update timestamp and bring to top of recents when reopened (Issue 1)
      item.timestamp = Date.now();
      let list = this.getAll().filter(d => d.name.toLowerCase() !== item.name.toLowerCase());
      list.unshift(item);
      this.saveAll(list);
      this.render();

      // If document is already open in a tab, switch to it immediately
      const existing = window.DocFlow.UI.Tabs.findByFile ? window.DocFlow.UI.Tabs.findByFile(item.name) : window.DocFlow.UI.Tabs.list.find(t => t.name.toLowerCase() === item.name.toLowerCase());
      if (existing) {
        window.DocFlow.UI.Tabs.switchTo(existing.id);
        showToast(`Switched to "${item.name}"`, 'info');
        return;
      }

      // Reopen PDF documents with full preserved binary data from PdfStore (Issue 1)
      if (item.type === 'PDF' || item.name.toLowerCase().endsWith('.pdf')) {
        showToast(`Loading PDF "${item.name}"...`, 'info');
        PdfStore.get(item.name).then(data => {
          if (data) {
            const tab = window.DocFlow.UI.Tabs.create(item.name, '', 'PDF', 'pdf');
            tab.pdfData = data;
            window.DocFlow.PDF?.loadPdfTab?.(tab);
            window.DocFlow.UI.Tabs.activateTab(tab);
            showToast(`Reopened PDF "${item.name}"`, 'success');
          } else {
            showToast(`PDF file data not found in local cache. Please browse to reopen "${item.name}".`, 'info');
            $('#openBtn')?.click();
          }
        }).catch(() => {
          showToast(`To view PDF "${item.name}", please browse or drop the file`, 'info');
          $('#openBtn')?.click();
        });
        return;
      }

      // Reopen with exact saved data without conflict
      const tab = window.DocFlow.UI.Tabs.create(item.name, item.content, item.type || 'DOC', 'edit');
      window.DocFlow.UI.Tabs.activateTab(tab);
      showToast(`Reopened "${item.name}"`, 'success');
    },

    render() {
      const listEl = $('#recentFilesList');
      if (!listEl) return;

      const list = this.getAll();
      if (!list.length) {
        listEl.innerHTML = `
          <div class="recent-empty-hint">
            <i class="fas fa-clock-rotate-left" style="font-size:22px;margin-bottom:6px;display:block;opacity:0.35;"></i>
            No recent documents yet. Create or open a file to get started.
          </div>
        `;
        return;
      }

      listEl.innerHTML = '';
      list.forEach(item => {
        const card = document.createElement('div');
        card.className = 'recent-file-item';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');

        const ext = (item.name.split('.').pop() || '').toLowerCase();
        let iconHtml = '<i class="fas fa-file-lines" style="color:var(--text-muted);"></i>';
        if (ext === 'docx' || ext === 'doc') iconHtml = '<i class="fas fa-file-word" style="color:#2563eb;"></i>';
        else if (ext === 'pdf') iconHtml = '<i class="fas fa-file-pdf" style="color:#dc2626;"></i>';
        else if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') iconHtml = '<i class="fas fa-file-excel" style="color:#16a34a;"></i>';
        else if (ext === 'pptx' || ext === 'ppt') iconHtml = '<i class="fas fa-file-powerpoint" style="color:#ea580c;"></i>';
        else if (ext === 'html' || ext === 'htm') iconHtml = '<i class="fas fa-file-code" style="color:#e34c26;"></i>';
        else if (ext === 'md') iconHtml = '<i class="fab fa-markdown" style="color:#38bdf8;"></i>';

        const isLocked = item.isLocked || FileLockStore.isLockedSync(item.name);
        const lockBadgeHtml = isLocked
          ? `<span class="recent-lock-tag" title="Password Protected Document" style="display:inline-flex;align-items:center;gap:3px;color:#e11d48;font-size:11px;font-weight:700;margin-left:8px;background:rgba(225,29,72,0.1);padding:1px 6px;border-radius:4px;border:1px solid rgba(225,29,72,0.25);"><i class="fas fa-lock"></i> Locked</span>`
          : '';

        const sizeVal = item.size || (item.content ? new Blob([item.content]).size : 1024);
        const sizeStr = formatFileSize(sizeVal);
        const timeStr = formatRelativeTime(item.timestamp);

        // Delete button placed in front of each item (front/left)
        card.innerHTML = `
          <button class="recent-item-del-btn" title="Remove from recents" aria-label="Remove ${escHtml(item.name)} from recents">
            <i class="fas fa-trash-alt"></i>
          </button>
          <div class="recent-item-icon" style="position:relative;">
            ${iconHtml}
            ${isLocked ? '<i class="fas fa-lock" style="position:absolute;bottom:-2px;right:-4px;font-size:10px;color:#e11d48;background:var(--bg-primary,#fff);border-radius:50%;padding:1px;" title="Locked"></i>' : ''}
          </div>
          <div class="recent-item-info">
            <div class="recent-item-title" title="${escHtml(item.name)}" style="display:flex;align-items:center;">
              <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(item.name)}</span>
              ${lockBadgeHtml}
            </div>
            <div class="recent-item-meta">
              <span>${escHtml(item.type || ext.toUpperCase() || 'DOC')}</span> &bull; 
              <span class="recent-item-size" style="font-weight:600;color:var(--accent);">${sizeStr}</span> &bull; 
              <span>${timeStr}</span>
            </div>
          </div>
        `;

        const delBtn = card.querySelector('.recent-item-del-btn');
        delBtn.addEventListener('click', e => {
          e.stopPropagation();
          this.remove(item.id);
        });

        card.addEventListener('click', () => {
          this.openDocument(item);
        });

        card.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.openDocument(item);
          }
        });

        listEl.appendChild(card);
      });
    },
    // Sidebar-style Recent Tabs Dropdown (Requirement 2)
    renderDropdown(filterText = '') {
      const listEl = $('#recentTabsDropdownList');
      const badge = $('#recentTabsCountBadge');
      if (!listEl) return;
      const allDocs = this.getAll();
      if (badge) badge.textContent = allDocs.length;

      let list = allDocs;
      if (filterText && filterText.trim()) {
        const query = filterText.trim().toLowerCase();
        list = list.filter(d => (d.name && d.name.toLowerCase().includes(query)) || (d.type && d.type.toLowerCase().includes(query)));
      }

      listEl.innerHTML = '';
      if (!list.length) {
        listEl.innerHTML = `
          <div class="recent-tab-empty">
            <i class="fas fa-folder-open"></i>
            <div>${filterText ? 'No matching recent files' : 'No recent documents yet'}</div>
          </div>
        `;
        return;
      }

      const activeTabs = window.DocFlow?.UI?.Tabs?.list || [];

      list.forEach(item => {
        const card = document.createElement('div');
        card.className = 'recent-tab-item';
        card.setAttribute('role', 'listitem');
        card.setAttribute('tabindex', '0');

        const ext = (item.name.split('.').pop() || '').toLowerCase();
        let iconHtml = '<i class="fas fa-file-lines" style="color:var(--text-secondary);"></i>';
        if (item.type === 'PDF' || ext === 'pdf') {
          iconHtml = '<i class="fas fa-file-pdf" style="color:#ef4444;"></i>';
        } else if (ext === 'xlsx' || ext === 'xls' || ext === 'csv' || item.type === 'XLSX' || item.type === 'EXCEL' || item.type === 'CSV') {
          iconHtml = '<i class="fas fa-file-excel" style="color:#10b981;"></i>';
        } else if (ext === 'docx' || ext === 'doc' || item.type === 'DOCX') {
          iconHtml = '<i class="fas fa-file-word" style="color:#3b82f6;"></i>';
        } else if (ext === 'pptx' || ext === 'ppt' || item.type === 'PPTX' || item.type === 'powerpoint') {
          iconHtml = '<i class="fas fa-file-powerpoint" style="color:#f97316;"></i>';
        } else if (ext === 'md' || item.type === 'MD') {
          iconHtml = '<i class="fab fa-markdown" style="color:#8b5cf6;"></i>';
        } else if (ext === 'html' || ext === 'htm' || item.type === 'HTML') {
          iconHtml = '<i class="fas fa-file-code" style="color:#06b6d4;"></i>';
        }

        const isOpen = activeTabs.some(t => t.name.toLowerCase() === item.name.toLowerCase());
        const openBadge = isOpen ? '<span class="recent-tab-pill">Open</span>' : '';
        const sizeVal = item.size || (item.content ? new Blob([item.content]).size : 1024);
        const sizeStr = formatFileSize(sizeVal);
        const timeStr = formatRelativeTime(item.timestamp || item.createdAt);
        const isLocked = item.isLocked || FileLockStore.isLockedSync(item.name);
        const lockIcon = isLocked ? '<i class="fas fa-lock" style="color:#e11d48;font-size:11px;margin-left:6px;" title="Password Protected Document"></i>' : '';

        card.innerHTML = `
          <div class="recent-tab-item-icon">${iconHtml}</div>
          <div class="recent-tab-item-info">
            <div class="recent-tab-item-name" title="${escHtml(item.name)}">${escHtml(item.name)}${lockIcon}</div>
            <div class="recent-tab-item-meta">
              <span>${sizeStr}</span>
              <span>&bull;</span>
              <span>${timeStr}</span>
              ${openBadge}
            </div>
          </div>
          <button type="button" class="recent-tab-del-btn" title="Remove from recent files" aria-label="Remove ${escHtml(item.name)}"><i class="fas fa-xmark"></i></button>
        `;

        const delBtn = card.querySelector('.recent-tab-del-btn');
        if (delBtn) {
          delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.remove(item.id);
            this.renderDropdown(filterText);
            this.render();
          });
        }

        card.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openDocument(item);
          const dd = $('#recentTabsDropdown');
          if (dd) dd.style.display = 'none';
          $('#tabRecentBtn')?.classList.remove('active');
        });

        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.openDocument(item);
            const dd = $('#recentTabsDropdown');
            if (dd) dd.style.display = 'none';
            $('#tabRecentBtn')?.classList.remove('active');
          }
        });

        listEl.appendChild(card);
      });
    }    
  };

  function formatFileSize(bytes) {
    if (!bytes || bytes <= 0 || isNaN(bytes)) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let val = Number(bytes);
    while (val >= 1024 && i < units.length - 1) {
      val /= 1024;
      i++;
    }
    return (i === 0 ? Math.round(val) : val.toFixed(val < 10 ? 1 : 0)) + ' ' + units[i];
  }

  function formatRelativeTime(ts) {
    if (!ts) return 'Recent';
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString();
  }

  // ==========================================================================
  // Auto-Save Management & 5-Second Inactivity Timer
  // ==========================================================================
  let autoSaveEnabled = true;
  try {
    const storedAutoSave = localStorage.getItem('df-autosave');
    if (storedAutoSave !== null) autoSaveEnabled = storedAutoSave === 'true';
  } catch (e) { }

  let autoSaveTimer = null;

  function updateAutoSaveUI() {
    const icon = $('#autoSaveToggleIcon');
    const text = $('#autoSaveStatusText');
    const dot = $('#fileTabDot');

    if (icon) {
      icon.className = autoSaveEnabled ? 'fas fa-toggle-on' : 'fas fa-toggle-off';
      icon.style.color = autoSaveEnabled ? 'var(--success)' : 'var(--text-muted)';
    }
    if (text) {
      text.textContent = `Auto-Save: ${autoSaveEnabled ? 'ON' : 'OFF'}`;
    }
    if (dot) {
      if (!autoSaveEnabled) {
        dot.className = 'file-tab-dot off';
      } else {
        dot.className = `file-tab-dot ${window.DocFlow.isModified ? 'red' : 'green'}`;
      }
    }
  }

  function setFileTabDot(status) {
    const modifiedDot = $('#modifiedDot');
    const dot = $('#fileTabDot') || modifiedDot;
    if (modifiedDot) {
      if (!autoSaveEnabled && status !== 'off') {
        modifiedDot.className = 'modified-dot';
      } else if (status === 'green' || status === 'saved') {
        modifiedDot.className = 'modified-dot saved';
        modifiedDot.title = 'Saved (Auto-saved)';
      } else if (status === 'red' || status === 'unsaved') {
        modifiedDot.className = 'modified-dot unsaved';
        modifiedDot.title = 'Unsaved changes';
      } else {
        modifiedDot.className = 'modified-dot';
      }
    }
    if (dot && dot !== modifiedDot) {
      dot.className = `file-tab-dot ${status}`;
    }
  }

  function performAutoSave() {
    if (window.DocFlow.currentMode !== 'edit') return;
    const activeTab = window.DocFlow.UI.Tabs.get(window.DocFlow.UI.Tabs.activeId);
    if (!activeTab) return;

    window.DocFlow.UI.Tabs.saveCurrent();
    window.DocFlow.UI.Tabs.save();

    if (Recent) {
      const editor = $('#editor');
      if (editor) Recent.updateContent(activeTab.name, editor.innerHTML);
    }

    setModified(false);
    setFileTabDot('green');
  }

  function triggerAutoSaveTimer() {
    if (!autoSaveEnabled) return;
    if (window.DocFlow.currentMode !== 'edit') return;

    // Turn dot red immediately upon user activity or typing
    setFileTabDot('red');

    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      performAutoSave();
    }, 5000);
  }

  // ==========================================================================
  // Mode Switching & State Coordinator
  // ==========================================================================
  function isExcelOrPptDocument() {
    const activeTab = window.DocFlow?.UI?.Tabs?.get?.(window.DocFlow.UI.Tabs.activeId);
    const name = (activeTab?.name || $('#fileNameDisplay')?.textContent || '').toLowerCase();
    const type = (activeTab?.type || activeTab?.fileType || '').toLowerCase();
    const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv') || type === 'excel' || type === 'csv' || !!document.querySelector('#editor .excel-spreadsheet-container') || !!document.querySelector('#editor .excel-grid-table');
    const isPpt = name.endsWith('.pptx') || name.endsWith('.ppt') || type === 'powerpoint' || !!document.querySelector('#editor .pptx-slide-card') || !!document.querySelector('#editor .pptx-slide-wrapper');
    return !!(isExcel || isPpt);
  }

  function switchMode(mode) {
    window.DocFlow.currentMode = mode;
    document.body.dataset.mode = mode;

    if (emptyState) {
      emptyState.classList.toggle('hidden', mode !== 'empty');
      if (mode === 'empty') Recent.render();
    }
    if (pdfWrap) pdfWrap.classList.toggle('visible', mode === 'view');
    if (editorWrap) editorWrap.classList.toggle('visible', mode === 'edit');
    if (ribbonContainer) ribbonContainer.classList.toggle('visible', mode === 'edit');

    const wordCountItem = $('#wordCountItem');
    const charCountItem = $('#charCountItem');
    const lineInfoWrap = $('#lineInfoWrap');
    const modifiedDot = $('#modifiedDot');

    if (mode === 'empty') {
      $('#tabBar')?.classList.remove('visible');
      document.body.classList.remove('slide-deck-mode');
      const pptSidebar = $('#pptxSlideSidebar');
      if (pptSidebar) pptSidebar.style.display = 'none';

      $('#editorWrap')?.classList.remove('is-excel-mode');
      const ed = $('#editor');
      if (ed) {
        ed.classList.remove('excel-view-mode', 'is-pptx-deck');
        ed.innerHTML = '';
        ed.contentEditable = 'true';
      }
      if (wordCountItem) wordCountItem.style.display = 'none';
      if (charCountItem) charCountItem.style.display = 'none';
      if (lineInfoWrap) lineInfoWrap.style.display = 'none';
      if (modifiedDot) modifiedDot.style.display = 'none';
      if (fileNameDisplay) fileNameDisplay.textContent = 'DocFlow';
      if (fileTypeInfo) fileTypeInfo.textContent = 'No file';
      if (modeInfo) modeInfo.textContent = 'Ready';
    } else {
      const isExcelOrPpt = isExcelOrPptDocument();
      if (isExcelOrPpt) {
        document.body.classList.add('is-excel-or-ppt-file');
        if (wordCountItem) wordCountItem.style.display = 'none';
        if (charCountItem) charCountItem.style.display = 'none';
        if (lineInfoWrap) lineInfoWrap.style.display = 'none';
      } else {
        document.body.classList.remove('is-excel-or-ppt-file');
        if (wordCountItem) wordCountItem.style.display = 'inline-flex';
        if (charCountItem) charCountItem.style.display = 'inline-flex';
        if (lineInfoWrap) lineInfoWrap.style.display = 'inline-flex';
      }
      if (modifiedDot) modifiedDot.style.display = 'inline-block';
      if (modeInfo) modeInfo.textContent = mode === 'edit' ? 'Editing' : 'Viewing';
    }

    if (window.DocFlow.Find) {
      window.DocFlow.Find.closeOutline();
      window.DocFlow.Find.closeFindBar();
    }

    updateBtnStates();
    if (mode === 'edit') {
      window.DocFlow.Editor?.updateCounts();
      window.DocFlow.Editor?.updateCursorPos();
      const editor = $('#editor');
      if (editor) {
        editor.contentEditable = isPptxDocument() ? 'false' : 'true';
      }
      updatePptSidebar();
    } else {
      const sidebar = $('#pptxSlideSidebar');
      if (sidebar) sidebar.style.display = 'none';
    }
  }

  function updateBtnStates() {
    const isEdit = window.DocFlow.currentMode === 'edit';
    const isView = window.DocFlow.currentMode === 'view';
    const outlineBtn = $('#outlineBtn');
    const findBtn = $('#findBtn');

    if (outlineBtn) outlineBtn.style.opacity = isEdit ? '1' : '0.4';
    if (findBtn) findBtn.style.opacity = (isEdit || isView) ? '1' : '0.4';

    $$('[data-save]').forEach(b => {
      b.disabled = (b.dataset.save !== 'merge') && !isEdit;
    });
  }

  function updateTopbar(tab) {
    if (!tab) return;
    if (fileNameDisplay) fileNameDisplay.textContent = tab.name;
    if (fileTypeInfo) fileTypeInfo.textContent = tab.fileType || 'No file';
    setModified(tab.modified || false);

    const isExcelOrPpt = isExcelOrPptDocument();
    document.body.classList.toggle('is-excel-or-ppt-file', isExcelOrPpt);
    const wordCountItem = $('#wordCountItem');
    const charCountItem = $('#charCountItem');
    const lineInfoWrap = $('#lineInfoWrap');
    if (isExcelOrPpt) {
      if (wordCountItem) wordCountItem.style.display = 'none';
      if (charCountItem) charCountItem.style.display = 'none';
      if (lineInfoWrap) lineInfoWrap.style.display = 'none';
    } else if (window.DocFlow.currentMode !== 'empty') {
      if (wordCountItem) wordCountItem.style.display = 'inline-flex';
      if (charCountItem) charCountItem.style.display = 'inline-flex';
      if (lineInfoWrap) lineInfoWrap.style.display = 'inline-flex';
    }
  }

  function setModified(modified) {
    window.DocFlow.isModified = !!modified;
    const tab = window.DocFlow.UI.Tabs.get(window.DocFlow.UI.Tabs.activeId);
    if (tab) tab.modified = !!modified;

    if (modifiedDot) modifiedDot.classList.toggle('show', !!modified);

    // Synchronize tab save dot in #tabList (Bug 4: Green when saved, Red when modified)
    const activeTabEl = document.querySelector('.tab.active');
    if (activeTabEl) {
      activeTabEl.classList.toggle('modified', !!modified);
      const dot = activeTabEl.querySelector('.tab-save-dot');
      if (dot) {
        dot.className = `tab-save-dot ${modified ? 'unsaved' : 'saved'}`;
        dot.title = modified ? 'Unsaved changes (Red)' : 'Saved (Green)';
      }
    }

    if (modified && autoSaveEnabled) {
      setFileTabDot('red');
    } else if (!modified && autoSaveEnabled) {
      setFileTabDot('green');
    }
  }

  function handleTabSave(tabId) {
    const tab = window.DocFlow.UI.Tabs.get(tabId || window.DocFlow.UI.Tabs.activeId);
    if (!tab) return;
    if (window.DocFlow.UI.Tabs.activeId !== tab.id) {
      window.DocFlow.UI.Tabs.switchTo(tab.id);
    }
    const ext = (tab.name.split('.').pop() || 'html').toLowerCase();
    if (ext === 'docx') {
      window.DocFlow.FileIO?.saveAsDocx();
    } else if (ext === 'xlsx' || ext === 'xls') {
      window.DocFlow.FileIO?.saveAsXlsx();
    } else if (ext === 'pptx' || ext === 'ppt') {
      window.DocFlow.FileIO?.saveAsPptx();
    } else if (ext === 'txt') {
      window.DocFlow.FileIO?.saveAsTxt();
    } else if (ext === 'md' || ext === 'markdown') {
      window.DocFlow.FileIO?.saveAsMarkdown();
    } else if (ext === 'pdf') {
      window.DocFlow.FileIO?.exportAsPdf();
    } else {
      window.DocFlow.FileIO?.saveAsHtml();
    }
    setModified(false);
  }

  // ==========================================================================
  // New Document Modal & Format Selector (.docx, .pdf, .xlsx, .pptx, .html, .txt, .md)
  // ==========================================================================
  // ==========================================================================
  // New Document Modal & Format Selector (.docx, .pdf, .xlsx, .pptx, .html, .txt, .md)
  // Issue 6: Auto-changes templates dynamically according to file extension
  // ==========================================================================
  let selectedFormat = 'docx';
  let selectedTemplateId = 'blank';

  function initNewDocModal() {
    const titleInput = $('#newDocTitleInput');
    const formatPills = $$('#formatPillGroup .format-pill');
    const grid = $('#templateGrid');
    const createBtn = $('#newDocCreateBtn');

    function renderTemplatesForFormat(ext) {
      if (!grid) return;
      const list = FORMAT_TEMPLATES[ext] || FORMAT_TEMPLATES.docx;
      grid.innerHTML = '';

      // Reset template selection if not in new list
      if (!list.some(t => t.id === selectedTemplateId)) {
        selectedTemplateId = list[0].id;
      }

      list.forEach(tmpl => {
        const card = document.createElement('div');
        const isSelected = tmpl.id === selectedTemplateId;
        card.className = `template-card ${isSelected ? 'active selected' : ''}`;
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.dataset.id = tmpl.id;
        card.innerHTML = `<i class="fas ${tmpl.icon}"></i><span>${tmpl.name}</span>`;

        card.addEventListener('click', () => {
          grid.querySelectorAll('.template-card').forEach(c => {
            c.classList.remove('active', 'selected');
          });
          card.classList.add('active', 'selected');
          selectedTemplateId = tmpl.id;
        });

        card.addEventListener('dblclick', () => {
          selectedTemplateId = tmpl.id;
          handleCreateDocument();
        });

        card.addEventListener('keydown', e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            selectedTemplateId = tmpl.id;
            handleCreateDocument();
          }
        });

        grid.appendChild(card);
      });
    }

    // Switch format via pills
    formatPills.forEach(pill => {
      pill.addEventListener('click', () => {
        formatPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        selectedFormat = pill.dataset.ext || 'docx';
        renderTemplatesForFormat(selectedFormat);
      });
    });

    // Auto-detect extension typed in document title input (Issue 6)
    titleInput?.addEventListener('input', () => {
      const val = titleInput.value.trim().toLowerCase();
      const match = val.match(/\.(docx|pdf|xlsx|xls|pptx|ppt|html|htm|txt|md|markdown)$/i);
      if (match) {
        let ext = match[1].toLowerCase();
        if (ext === 'xls') ext = 'xlsx';
        if (ext === 'ppt') ext = 'pptx';
        if (ext === 'htm') ext = 'html';
        if (ext === 'markdown') ext = 'md';
        if (ext !== selectedFormat && FORMAT_TEMPLATES[ext]) {
          selectedFormat = ext;
          formatPills.forEach(p => {
            p.classList.toggle('active', p.dataset.ext === ext);
          });
          renderTemplatesForFormat(ext);
        }
      }
    });

    // Initial render
    renderTemplatesForFormat(selectedFormat);

    // Create button handler
    createBtn?.addEventListener('click', handleCreateDocument);

    function handleCreateDocument() {
      const rawTitle = titleInput ? titleInput.value.trim() : '';
      const docTitle = rawTitle.replace(/\.[^.]+$/, '') || 'Untitled';
      const ext = selectedFormat || 'docx';
      const list = FORMAT_TEMPLATES[ext] || FORMAT_TEMPLATES.docx;
      const tmpl = list.find(t => t.id === selectedTemplateId) || list[0];

      let content = tmpl.content;

      // Handle XLSX templates
      if (ext === 'xlsx') {
        if (tmpl.id === 'blank' || !content) {
          content = window.DocFlow.FileIO?.createBlankExcelGrid(50, 50) || '<p>Spreadsheet Document</p>';
        } else if (tmpl.id === 'budget') {
          content = `<div class="excel-spreadsheet-container"><table class="excel-grid-table"><thead><tr><th class="excel-corner"></th><th class="excel-col-hdr">A</th><th class="excel-col-hdr">B</th><th class="excel-col-hdr">C</th><th class="excel-col-hdr">D</th><th class="excel-col-hdr">E</th></tr></thead><tbody><tr><th class="excel-row-hdr">1</th><td><strong>Category</strong></td><td><strong>Budget</strong></td><td><strong>Actual</strong></td><td><strong>Difference</strong></td><td><strong>Status</strong></td></tr><tr><th class="excel-row-hdr">2</th><td>Software & Cloud</td><td>$12,000</td><td>$10,500</td><td>+$1,500</td><td>Under Budget</td></tr><tr><th class="excel-row-hdr">3</th><td>Office & Operations</td><td>$5,000</td><td>$4,800</td><td>+$200</td><td>Under Budget</td></tr><tr><th class="excel-row-hdr">4</th><td>Marketing & Growth</td><td>$8,000</td><td>$8,400</td><td>-$400</td><td>Review</td></tr><tr><th class="excel-row-hdr">5</th><td><strong>Total Spend</strong></td><td><strong>$25,000</strong></td><td><strong>$23,700</strong></td><td><strong>+$1,300</strong></td><td><strong>On Target</strong></td></tr></tbody></table></div>`;
        } else if (tmpl.id === 'sales') {
          content = `<div class="excel-spreadsheet-container"><table class="excel-grid-table"><thead><tr><th class="excel-corner"></th><th class="excel-col-hdr">A</th><th class="excel-col-hdr">B</th><th class="excel-col-hdr">C</th><th class="excel-col-hdr">D</th><th class="excel-col-hdr">E</th></tr></thead><tbody><tr><th class="excel-row-hdr">1</th><td><strong>Product Line</strong></td><td><strong>Quarter</strong></td><td><strong>Units Sold</strong></td><td><strong>Revenue</strong></td><td><strong>Margin %</strong></td></tr><tr><th class="excel-row-hdr">2</th><td>Enterprise Suite</td><td>Q1 2026</td><td>450</td><td>$45,000</td><td>78%</td></tr><tr><th class="excel-row-hdr">3</th><td>Team Pro License</td><td>Q1 2026</td><td>1,200</td><td>$36,000</td><td>65%</td></tr><tr><th class="excel-row-hdr">4</th><td>Developer Cloud</td><td>Q1 2026</td><td>820</td><td>$28,700</td><td>72%</td></tr><tr><th class="excel-row-hdr">5</th><td><strong>Grand Total</strong></td><td><strong>Q1 2026</strong></td><td><strong>2,470</strong></td><td><strong>$109,700</strong></td><td><strong>71.5%</strong></td></tr></tbody></table></div>`;
        } else if (tmpl.id === 'tasks') {
          content = `<div class="excel-spreadsheet-container"><table class="excel-grid-table"><thead><tr><th class="excel-corner"></th><th class="excel-col-hdr">A</th><th class="excel-col-hdr">B</th><th class="excel-col-hdr">C</th><th class="excel-col-hdr">D</th><th class="excel-col-hdr">E</th></tr></thead><tbody><tr><th class="excel-row-hdr">1</th><td><strong>Task ID</strong></td><td><strong>Task Title</strong></td><td><strong>Owner</strong></td><td><strong>Priority</strong></td><td><strong>Status</strong></td></tr><tr><th class="excel-row-hdr">2</th><td>TSK-101</td><td>Responsive Layout Validation</td><td>Alex</td><td>High</td><td>In Progress</td></tr><tr><th class="excel-row-hdr">3</th><td>TSK-102</td><td>PowerPoint Overflow Protection</td><td>Sarah</td><td>Critical</td><td>Completed</td></tr><tr><th class="excel-row-hdr">4</th><td>TSK-103</td><td>Markdown Preview Engine Fix</td><td>David</td><td>High</td><td>Completed</td></tr><tr><th class="excel-row-hdr">5</th><td>TSK-104</td><td>Cross-Device Browser Test</td><td>Team</td><td>Medium</td><td>Pending</td></tr></tbody></table></div>`;
        } else {
          content = `<div class="excel-spreadsheet-container"><table class="excel-grid-table"><thead><tr><th class="excel-corner"></th><th class="excel-col-hdr">A</th><th class="excel-col-hdr">B</th><th class="excel-col-hdr">C</th><th class="excel-col-hdr">D</th></tr></thead><tbody><tr><th class="excel-row-hdr">1</th><td><strong>SKU</strong></td><td><strong>Item Name</strong></td><td><strong>Stock</strong></td><td><strong>Status</strong></td></tr><tr><th class="excel-row-hdr">2</th><td>PRD-001</td><td>Wireless Mouse Pro</td><td>142</td><td>In Stock</td></tr><tr><th class="excel-row-hdr">3</th><td>PRD-002</td><td>Mechanical Keyboard</td><td>58</td><td>Low Stock</td></tr><tr><th class="excel-row-hdr">4</th><td>PRD-003</td><td>4K Ultra Display</td><td>24</td><td>In Stock</td></tr></tbody></table></div>`;
        }
      }
      // Handle PPTX templates
      else if (ext === 'pptx') {
        if (tmpl.id === 'blank' || tmpl.content === 'PPTX_BLANK') {
          content = window.DocFlow.FileIO?.createBlankPresentation() || '<p>Presentation Document</p>';
        } else if (tmpl.id === 'pitch' || tmpl.content === 'PPTX_PITCH') {
          content = `
          <div class="pptx-slide-wrapper" data-transition="fade" style="position:relative;margin:28px auto;max-width:850px;">
            <div class="pptx-slide-card" contenteditable="true" data-slide="1" style="aspect-ratio:16/9;width:100%;max-width:850px;height:520px;max-height:520px;overflow:hidden;background:linear-gradient(135deg,#0f172a,#1e293b);color:#f8fafc;border:1px solid #334155;border-radius:12px;padding:48px 40px;box-shadow:var(--shadow-md);display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;box-sizing:border-box;">
              <h1 class="pptx-slide-title" style="font-size:36px;font-weight:800;color:#38bdf8;margin:0 0 16px;">Next-Generation Document Platform</h1>
              <p class="pptx-slide-body" style="font-size:18px;color:#94a3b8;max-width:620px;margin:0 0 24px;">Transforming document productivity with high-fidelity reading, native editing, and cross-device workflows.</p>
              <div style="font-size:14px;color:#cbd5e1;font-weight:600;">Presenter: Executive Team &bull; Q4 Strategic Review</div>
            </div>
          </div>
          <div class="pptx-slide-wrapper" data-transition="slide" style="position:relative;margin:28px auto;max-width:850px;">
            <div class="pptx-slide-card" contenteditable="true" data-slide="2" style="aspect-ratio:16/9;width:100%;max-width:850px;height:520px;max-height:520px;overflow:hidden;background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border);border-radius:12px;padding:36px;box-shadow:var(--shadow-md);display:flex;flex-direction:column;box-sizing:border-box;">
              <h2 class="pptx-slide-title" style="font-size:26px;font-weight:700;color:var(--text-primary);margin:0 0 14px;">The Challenge & Core Innovation</h2>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;flex:1;">
                <div class="slide-nested-card" style="border:1px solid var(--border);border-radius:8px;padding:18px;background:var(--bg-tertiary);">
                  <h4 style="color:#ef4444;margin:0 0 8px;"><i class="fas fa-triangle-exclamation"></i> Fragmented Formats</h4>
                  <p style="font-size:14px;color:var(--text-secondary);margin:0;">Disparate apps required for Word, Excel, PowerPoint, Markdown, and PDFs lead to workflow friction.</p>
                </div>
                <div class="slide-nested-card" style="border:1px solid var(--border);border-radius:8px;padding:18px;background:var(--bg-tertiary);">
                  <h4 style="color:#16a34a;margin:0 0 8px;"><i class="fas fa-check-circle"></i> Unified Studio</h4>
                  <p style="font-size:14px;color:var(--text-secondary);margin:0;">DocFlow consolidates all modern document formats into a lightning-fast, zero-install workspace.</p>
                </div>
              </div>
            </div>
          </div>`;
        } else if (tmpl.id === 'showcase' || tmpl.content === 'PPTX_SHOWCASE') {
          content = `
          <div class="pptx-slide-wrapper" data-transition="zoom" style="position:relative;margin:28px auto;max-width:850px;">
            <div class="pptx-slide-card" contenteditable="true" data-slide="1" style="aspect-ratio:16/9;width:100%;max-width:850px;height:520px;max-height:520px;overflow:hidden;background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border);border-radius:12px;padding:36px;box-shadow:var(--shadow-md);display:flex;flex-direction:column;box-sizing:border-box;">
              <h2 class="pptx-slide-title" style="font-size:26px;font-weight:700;color:var(--text-primary);margin:0 0 12px;">Strategic Architecture Showcase</h2>
              <p style="color:var(--text-secondary);margin:0 0 20px;font-size:14px;">Core capabilities designed for enterprise-scale reliability.</p>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;flex:1;">
                <div class="slide-nested-card" style="border:1px solid var(--border);border-radius:8px;padding:14px;background:var(--bg-tertiary);"><h4 style="color:#0284c7;margin:0 0 6px;">Multi-Format</h4><p style="font-size:13px;color:var(--text-secondary);margin:0;">DOCX, XLSX, PPTX, PDF, HTML, MD support.</p></div>
                <div class="slide-nested-card" style="border:1px solid var(--border);border-radius:8px;padding:14px;background:var(--bg-tertiary);"><h4 style="color:#8b5cf6;margin:0 0 6px;">Zero Overflow</h4><p style="font-size:13px;color:var(--text-secondary);margin:0;">Strict slide boundary containment with Auto-Fit.</p></div>
                <div class="slide-nested-card" style="border:1px solid var(--border);border-radius:8px;padding:14px;background:var(--bg-tertiary);"><h4 style="color:#10b981;margin:0 0 6px;">Responsive</h4><p style="font-size:13px;color:var(--text-secondary);margin:0;">Flawless presentation on desktop, tablet, and mobile.</p></div>
              </div>
            </div>
          </div>`;
        } else {
          content = window.DocFlow.FileIO?.createBlankPresentation() || '<p>Presentation Document</p>';
        }
      }
      // Handle HTML templates
      else if (ext === 'html') {
        let code = '';
        if (tmpl.id === 'landing') {
          code = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${escHtml(docTitle)} — Launch</title>\n  <style>\n    body { font-family: system-ui, sans-serif; margin: 0; padding: 32px 24px; color: #1e293b; background: #f8fafc; }\n    .hero { max-width: 800px; margin: 0 auto; text-align: center; padding: 40px 20px; }\n    h1 { font-size: 36px; color: #0284c7; margin-bottom: 12px; }\n    p { font-size: 16px; color: #64748b; line-height: 1.6; }\n    .cta-btn { background: #0284c7; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 15px; margin-top: 16px; }\n    .cta-btn:hover { background: #0369a1; }\n    .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; max-width: 800px; margin: 40px auto; }\n    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }\n    .card h3 { margin-top: 0; color: #0f172a; }\n  </style>\n</head>\n<body>\n  <div class="hero">\n    <h1>${escHtml(docTitle)}</h1>\n    <p>Build, preview, and deploy lightning-fast web experiences in real time.</p>\n    <button class="cta-btn" onclick="alert('Welcome!')">Get Started</button>\n  </div>\n  <div class="features">\n    <div class="card"><h3>Feature One</h3><p>Optimized for ultra-responsive performance across all screen sizes.</p></div>\n    <div class="card"><h3>Feature Two</h3><p>Clean single-file architecture with zero external dependencies required.</p></div>\n    <div class="card"><h3>Feature Three</h3><p>Instant live preview with isolated execution sandbox.</p></div>\n  </div>\n</body>\n</html>`;
        } else if (tmpl.id === 'portfolio') {
          code = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${escHtml(docTitle)} — Portfolio</title>\n  <style>\n    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 0 auto; padding: 40px 20px; color: #1e293b; background: #fff; line-height: 1.6; }\n    h1 { color: #0284c7; margin-bottom: 4px; }\n    .sub { color: #64748b; font-size: 15px; margin-bottom: 24px; }\n    .project { border-left: 3px solid #0284c7; padding-left: 16px; margin: 18px 0; }\n    .tag { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-right: 6px; }\n  </style>\n</head>\n<body>\n  <h1>${escHtml(docTitle)}</h1>\n  <div class="sub">Senior Software Engineer &bull; Architecture &bull; UI/UX Systems</div>\n  <h2>Selected Projects</h2>\n  <div class="project">\n    <h3>Document Intelligence Engine</h3>\n    <p>Engineered multi-format reading platform with zero-latency preview and full formatting fidelity.</p>\n    <span class="tag">JavaScript</span><span class="tag">HTML5</span><span class="tag">CSS3</span>\n  </div>\n</body>\n</html>`;
        } else if (tmpl.id === 'blog') {
          code = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${escHtml(docTitle)}</title>\n  <style>\n    body { font-family: Georgia, serif; max-width: 680px; margin: 0 auto; padding: 40px 20px; color: #292524; line-height: 1.8; }\n    h1 { font-family: system-ui, sans-serif; font-size: 32px; color: #0f172a; margin-bottom: 8px; }\n    .meta { color: #78716c; font-size: 13px; font-style: italic; margin-bottom: 28px; }\n    blockquote { border-left: 4px solid #ea580c; padding-left: 16px; margin: 24px 0; color: #57534e; font-style: italic; }\n  </style>\n</head>\n<body>\n  <h1>${escHtml(docTitle)}</h1>\n  <div class="meta">Published on [Date] &bull; 4 min read &bull; Technology & Architecture</div>\n  <p>The evolution of modern web applications has fundamentally reshaped how documents are crafted, shared, and rendered in high-density environments.</p>\n  <blockquote>"Simplicity is prerequisite for reliability." &mdash; Edsger Dijkstra</blockquote>\n  <p>By leveraging native browser primitives and sandboxed runtime viewports, applications can deliver desktop-class experiences directly inside the web browser.</p>\n</body>\n</html>`;
        } else {
          code = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${escHtml(docTitle)}</title>\n  <style>\n    body { font-family: system-ui, sans-serif; padding: 24px; color: #1e293b; background: #ffffff; line-height: 1.6; }\n    h1 { color: #0284c7; }\n  </style>\n</head>\n<body>\n  <h1>${escHtml(docTitle)}</h1>\n  <p>Start writing your single-file HTML, CSS, and JS application here...</p>\n</body>\n</html>`;
        }
        content = `<pre class="html-code-view" style="font-family:'Fira Code',Consolas,monospace;font-size:13.5px;line-height:1.6;white-space:pre-wrap;word-break:break-all;margin:0;background:transparent;border:none;padding:0;">${escHtml(code)}</pre>`;
      }
      // Handle MD templates
      else if (ext === 'md') {
        let mdCode = '';
        if (tmpl.id === 'readme') {
          mdCode = `# ${docTitle}\n\n> Comprehensive, modern document reader and editor.\n\n## Features\n\n- **Multi-Format Reader**: DOCX, PDF, XLSX, PPTX, HTML, TXT, MD.\n- **Slide Boundary Containment**: Prevents PowerPoint overflow.\n- **Excel Grid Operations**: Full row/column selection and math formulas.\n- **Responsive Interface**: Flawless experience on all devices.\n\n## Quick Start\n\n\`\`\`bash\n# Open index.html directly in any modern browser\n\`\`\`\n\n## License\n\nMIT License &copy; 2026 DocFlow Team.`;
        } else if (tmpl.id === 'docs') {
          mdCode = `# ${docTitle} — API Documentation\n\n## Overview\n\nThis API provides complete document conversion and parsing facilities.\n\n### Endpoints\n\n| Method | Endpoint | Description |\n| :--- | :--- | :--- |\n| \`GET\` | \`/api/v1/documents\` | List all active documents |\n| \`POST\` | \`/api/v1/parse\` | Parse uploaded binary file |\n| \`POST\` | \`/api/v1/export\` | Export formatted document |\n\n### Response Format\n\n\`\`\`json\n{\n  "status": "success",\n  "statusCode": 200,\n  "data": {\n    "documentId": "doc_92817",\n    "fileType": "XLSX"\n  }\n}\n\`\`\``;
        } else if (tmpl.id === 'sprint') {
          mdCode = `# Sprint Release Notes — v2.5.0\n\n**Release Date:** October 2026  \n**Status:** Production Ready  \n\n## Key Improvements\n\n- Fixed text boundary overflow for PowerPoint presentation slides.\n- Added Deselect button and multi-selection for Excel rows and columns.\n- Made Markdown and HTML insert dropdowns scrollable with zero outside duplicates.\n- Fixed live previews for single-file HTML and Markdown.\n- Ensured 3 max toast notifications with automatic dismiss of previous top.\n- Implemented dynamic template auto-selection based on file extension.\n\n## Contributors\n\n- @Engineering Team\n- @UI Architecture`;
        } else if (tmpl.id === 'checklist') {
          mdCode = `# ${docTitle} — Task Checklist\n\n## Release Readiness Checklist\n\n- [x] PowerPoint slide card boundary containment\n- [x] Auto-fit text option and warning pill\n- [x] Excel select multiple (Row & Column together)\n- [x] Excel deselect button\n- [x] High-contrast row and header text visibility\n- [x] Markdown scrollable dropdown and unique tools\n- [x] Markdown live preview fix\n- [x] HTML scrollable dropdown and unique tools\n- [x] HTML formatter and minifier fix\n- [x] HTML live web preview fix\n- [x] Toast notification max 3 stack with auto top-close\n- [x] Auto-change template on extension selection\n- [ ] Final multi-device responsive verification`;
        } else {
          mdCode = `# ${docTitle}\n\nStart writing in markdown...`;
        }
        content = `<pre class="md-code-view" style="font-family:'Fira Code',Consolas,monospace;font-size:13.5px;line-height:1.6;white-space:pre-wrap;word-break:break-all;margin:0;background:transparent;border:none;padding:0;">${escHtml(mdCode)}</pre>`;
      }
      // Handle TXT templates
      else if (ext === 'txt') {
        const text = tmpl.content || `Notes for ${docTitle}\nCreated: ${new Date().toLocaleDateString()}\n`;
        content = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
      }

      const fullName = `${docTitle}.${ext}`;
      const duplicateOpen = window.DocFlow.UI.Tabs.list.some(t => t.name.toLowerCase() === fullName.toLowerCase());
      const duplicateRecent = Recent.getAll().some(r => r.name.toLowerCase() === fullName.toLowerCase());
      if (duplicateOpen || duplicateRecent) {
        showToast(`A file named "${fullName}" already exists. Please choose a different name.`, 'error');
        return;
      }

      closeModal('#newDocModal');

      const tab = window.DocFlow.UI.Tabs.create(fullName, content, ext.toUpperCase(), 'edit');
      window.DocFlow.UI.Tabs.activateTab(tab);
      setTimeout(() => {
        window.DocFlow.Editor?.resetHistoryForTab?.(content);
      }, 50);

      Recent.add({
        name: fullName,
        type: ext.toUpperCase(),
        mode: 'edit',
        content: content,
        size: new Blob([content || '']).size
      });

      showToast(`Created new ${ext.toUpperCase()} document "${fullName}"`, 'success');
    }
  }

  // Keyboard Shortcuts Setup
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
      // Escape closes open modals, search bar, outline, dropdowns
      if (e.key === 'Escape') {
        $$('.modal-overlay.show').forEach(m => closeModal(m));
        $('#saveDropdown')?.classList.remove('show');
        window.DocFlow.Find?.closeOutline();
        window.DocFlow.Find?.closeFindBar();
        return;
      }

      const target = e.target;
      const isInsideModal = target.closest && target.closest('.modal-overlay');
      if (isInsideModal) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === '\\') {
          e.preventDefault();
          openModal('#clearFormatModal');
          return;
        }
        const k = e.key.toLowerCase();
        switch (k) {
          case 'o':
            e.preventDefault();
            $('#openBtn')?.click();
            break;
          case 's':
            e.preventDefault();
            if (window.DocFlow.currentMode === 'view') {
              window.DocFlow.PDF?.downloadCurrentPdf?.();
            } else if (window.DocFlow.currentMode === 'edit') {
              $('#saveDropdown')?.classList.toggle('show');
            } else {
              showToast('Open a document to save', 'warning');
            }
            break;
          case 'p':
            e.preventDefault();
            if (window.DocFlow.currentMode === 'view' && window.DocFlow.PDF?.printCurrentPdf) {
              window.DocFlow.PDF.printCurrentPdf();
            } else {
              triggerPrint();
            }
            break;
          case 'f':
            e.preventDefault();
            window.DocFlow.Find?.toggleFindBar();
            break;
          case 'h':
            e.preventDefault();
            window.DocFlow.Find?.openFindBar(true);
            break;
          case 'b':
            if (window.DocFlow.currentMode === 'edit') {
              e.preventDefault();
              window.DocFlow.Editor?.execCmd?.('bold');
            }
            break;
          case 'i':
            if (window.DocFlow.currentMode === 'edit') {
              e.preventDefault();
              window.DocFlow.Editor?.execCmd?.('italic');
            }
            break;
          case 'u':
            if (window.DocFlow.currentMode === 'edit') {
              e.preventDefault();
              window.DocFlow.Editor?.execCmd?.('underline');
            }
            break;
          case 'z':
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') && e.target.closest('.modal, .find-bar, .excel-formula-input, .excel-coord-box')) {
              return; // Allow native form input undo
            }
            e.preventDefault();
            if (window.DocFlow.currentMode === 'view' && window.DocFlow.PDF?.undoPdf) {
              window.DocFlow.PDF.undoPdf();
            } else if (e.shiftKey) {
              window.DocFlow.Editor?.redo?.();
            } else {
              window.DocFlow.Editor?.undo?.();
            }
            break;
          case 'y':
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') && e.target.closest('.modal, .find-bar, .excel-formula-input, .excel-coord-box')) {
              return; // Allow native form input redo
            }
            e.preventDefault();
            if (window.DocFlow.currentMode === 'view' && window.DocFlow.PDF?.redoPdf) {
              window.DocFlow.PDF.redoPdf();
            } else {
              window.DocFlow.Editor?.redo?.();
            }
            break;
          case 'a': {
            const excelContainer = document.querySelector('.excel-spreadsheet-container');
            if (excelContainer && window.DocFlow.currentMode === 'edit') {
              e.preventDefault();
              const table = excelContainer.querySelector('.excel-grid-table');
              if (table) {
                const allTds = table.querySelectorAll('tbody td');
                allTds.forEach(td => td.classList.add('excel-cell-selected'));
                showToast(`Selected all ${allTds.length} spreadsheet cells`, 'info');
                window.DocFlow.Editor?.updateToolbarState?.();
              }
            }
            break;
          }
          case 'w':
            e.preventDefault();
            if (window.DocFlow.UI.Tabs.activeId) {
              window.DocFlow.UI.Tabs.close(window.DocFlow.UI.Tabs.activeId);
            }
            break;
          case 'tab':
            e.preventDefault();
            const tabs = window.DocFlow.UI.Tabs.list;
            const currentIdx = tabs.findIndex(t => t.id === window.DocFlow.UI.Tabs.activeId);
            if (currentIdx !== -1) {
              if (e.shiftKey) {
                if (currentIdx > 0) window.DocFlow.UI.Tabs.switchTo(tabs[currentIdx - 1].id);
              } else {
                if (currentIdx < tabs.length - 1) window.DocFlow.UI.Tabs.switchTo(tabs[currentIdx + 1].id);
              }
            }
            break;
        }
      }
    });
  }

  // Standalone Print Handler (File Menu & Ctrl+P)
  function triggerPrint() {
    if (window.DocFlow.currentMode === 'closed' || !window.DocFlow.UI.Tabs.activeId) {
      showToast('Open a document first to print', 'info');
      return;
    }
    const excelContainer = document.querySelector('.excel-spreadsheet-container');
    if (excelContainer) {
      // Excel Document Print Modal Prompt (Bugs 1 & 2)
      const selectedCells = Array.from(excelContainer.querySelectorAll('td.excel-cell-selected'));
      const hasSelection = selectedCells.length > 0;
      const selDesc = $('#excelPrintSelectionDesc');
      if (selDesc) {
        if (hasSelection) {
          selDesc.textContent = `Prints only the currently selected cell range (${selectedCells.length} cells).`;
          const selRadio = $('#excelPrintScopeSelection');
          if (selRadio) selRadio.checked = true;
        } else {
          selDesc.textContent = 'No cell range currently selected (click and drag cells to select a range).';
          const sheetRadio = $('#excelPrintScopeSheet');
          if (sheetRadio) sheetRadio.checked = true;
        }
      }
      openModal('#excelPrintModal');
      return;
    }
    window.print();
  }

  function doExcelBoundedPrint(scope = 'content') {
    const excelContainer = document.querySelector('.excel-spreadsheet-container');
    const table = excelContainer?.querySelector('.excel-grid-table');
    if (!table) {
      window.print();
      return;
    }

    let candidateCells = [];
    if (scope === 'selection') {
      candidateCells = Array.from(table.querySelectorAll('td.excel-cell-selected'));
      if (!candidateCells.length && window._activeExcelCell) {
        candidateCells = [window._activeExcelCell];
      }
    } else {
      candidateCells = Array.from(table.querySelectorAll('tbody td')).filter(td => {
        return (td.textContent || '').trim().length > 0 ||
          td.dataset.customFill === 'true' ||
          (td.style.backgroundColor && td.style.backgroundColor !== 'transparent') ||
          td.querySelector('img, svg, canvas, .excel-text-highlight');
      });
    }

    const rowIndices = candidateCells.map(c => (c.closest('tr')?.sectionRowIndex ?? -1) + 1).filter(r => r > 0);
    const colIndices = candidateCells.map(c => c.cellIndex).filter(c => c > 0);

    const minRow = (scope === 'selection' && rowIndices.length) ? Math.min(...rowIndices) : 1;
    const maxRow = rowIndices.length ? Math.max(...rowIndices) : 5;
    const minCol = (scope === 'selection' && colIndices.length) ? Math.min(...colIndices) : 1;
    const maxCol = colIndices.length ? Math.max(...colIndices) : 5;

    const allThs = Array.from(table.querySelectorAll('thead th.excel-col-hdr'));
    const allTrs = Array.from(table.querySelectorAll('tbody tr'));

    const headerThs = allThs.slice(minCol - 1, maxCol);
    const bodyTrs = allTrs.slice(minRow - 1, maxRow);

    const oldPrintArea = document.getElementById('dfExcelPrintArea');
    if (oldPrintArea) oldPrintArea.remove();

    const printArea = document.createElement('div');
    printArea.id = 'dfExcelPrintArea';
    printArea.className = 'excel-print-isolated-area';

    let tableHtml = `<table class="excel-grid-table" style="width:100% !important;border-collapse:collapse !important;table-layout:auto !important;zoom:1 !important;">`;
    tableHtml += `<thead><tr><th class="excel-corner" style="padding:6px 10px;border:1px solid #94a3b8;font-weight:700;background:#f1f5f9;color:#0f172a;text-align:center;">#</th>`;
    headerThs.forEach(th => {
      tableHtml += `<th class="excel-col-hdr" style="padding:6px 10px;border:1px solid #94a3b8;font-weight:700;background:#f1f5f9;color:#0f172a;text-align:center;">${th.textContent}</th>`;
    });
    tableHtml += `</tr></thead><tbody>`;

    bodyTrs.forEach((tr, idx) => {
      const rowNum = minRow + idx;
      const tds = Array.from(tr.querySelectorAll('td')).slice(minCol - 1, maxCol);
      tableHtml += `<tr><th class="excel-row-hdr" style="padding:6px 10px;border:1px solid #94a3b8;font-weight:700;background:#f1f5f9;color:#0f172a;text-align:center;">${rowNum}</th>`;
      tds.forEach(td => {
        const bg = td.style.backgroundColor || (td.dataset.customFill === 'true' ? '#fbbf24' : 'inherit');
        const color = td.style.color || 'inherit';
        const fw = td.style.fontWeight || 'inherit';
        const fs = td.style.fontStyle || 'inherit';
        const ta = td.style.textAlign || 'inherit';
        tableHtml += `<td style="padding:6px 10px;border:1px solid #94a3b8;background-color:${bg};color:${color};font-weight:${fw};font-style:${fs};text-align:${ta};">${td.innerHTML}</td>`;
      });
      tableHtml += `</tr>`;
    });
    tableHtml += `</tbody></table>`;
    printArea.innerHTML = tableHtml;

    // Issue 2: Include spreadsheet charts in printed output
    const charts = excelContainer.querySelectorAll('.doc-chart-container');
    if (charts.length) {
      const chartDock = document.createElement('div');
      chartDock.className = 'excel-print-chart-dock';
      chartDock.style.cssText = 'margin-top:24px;display:flex;flex-direction:column;gap:20px;page-break-inside:avoid;break-inside:avoid;';
      charts.forEach(chart => {
        const clone = chart.cloneNode(true);
        clone.style.margin = '16px auto';
        clone.style.maxWidth = '100%';
        chartDock.appendChild(clone);
      });
      printArea.appendChild(chartDock);
    }

    document.body.appendChild(printArea);

    const numCols = headerThs.length || 5;
    const scale = numCols > 8 ? Math.max(0.45, 8 / numCols).toFixed(2) : '1';

    let style = document.getElementById('dfExcelPrintPageStyle');
    if (!style) {
      style = document.createElement('style');
      style.id = 'dfExcelPrintPageStyle';
      document.head.appendChild(style);
    }
    style.textContent = `
      @media print {
        @page { size: auto; margin: 8mm; }
        body.print-excel-mode .excel-spreadsheet-container,
        body.print-excel-mode .excel-formula-bar,
        body.print-excel-mode .excel-equation-bar,
        body.print-excel-mode #ribbon,
        body.print-excel-mode #header,
        body.print-excel-mode #statusbar { display: none !important; }
        body.print-excel-mode #dfExcelPrintArea {
          display: block !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
        }
        body.print-excel-mode #dfExcelPrintArea table {
          width: 100% !important;
          max-width: 100% !important;
          border-collapse: collapse !important;
          font-size: 11pt !important;
          zoom: ${scale} !important;
        }
        body.print-excel-mode #dfExcelPrintArea th,
        body.print-excel-mode #dfExcelPrintArea td {
          border: 1px solid #94a3b8 !important;
          padding: 6px 10px !important;
          page-break-inside: avoid !important;
        }
        body.print-excel-mode #dfExcelPrintArea .excel-print-chart-dock {
          display: flex !important;
          margin-top: 24px !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        body.print-excel-mode #dfExcelPrintArea .doc-chart-container {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          box-shadow: none !important;
          border: 1px solid #cbd5e1 !important;
          margin: 12px auto !important;
        }
      }
    `;

    document.body.classList.add('print-excel-mode');
    setTimeout(() => {
      window.print();
    }, 40);
  }

  // Hook up Excel Print Modal Buttons
  $('#excelPrintCancelBtn')?.addEventListener('click', () => {
    closeModal('#excelPrintModal');
  });

  $('#excelPrintConfirmBtn')?.addEventListener('click', () => {
    const scope = document.querySelector('input[name="excelPrintScope"]:checked')?.value || 'content';
    closeModal('#excelPrintModal');
    doExcelBoundedPrint(scope);
  });

  // Multi-Page Print Watermark Replicator & Excel Full Content Scaling
  window.addEventListener('beforeprint', () => {
    window.DocFlow.ImageManager?.deselectImage?.();
    window.DocFlow.ImageManager?.deselectLine?.();
    const existing = document.getElementById('dfPrintFixedWatermark');
    if (existing) existing.remove();
    if (window.DocFlow.activeWatermark && window.DocFlow.activeWatermark.text && window.DocFlow.activeWatermark.text !== 'none') {
      const wm = document.createElement('div');
      wm.id = 'dfPrintFixedWatermark';
      wm.className = 'print-watermark-page';
      wm.innerHTML = buildWatermarkHtml(window.DocFlow.activeWatermark);
      document.body.appendChild(wm);
    }
  });

  window.addEventListener('afterprint', () => {
    const wm = document.getElementById('dfPrintFixedWatermark');
    if (wm) wm.remove();
    document.body.classList.remove('print-excel-mode', 'print-excel-landscape');
    document.getElementById('dfExcelPrintPageStyle')?.remove();
    document.getElementById('dfExcelPrintArea')?.remove();
  });

  // Ribbon Tab Switching & Control Coordination
  function switchRibbonTab(tabName) {
    $$('.ribbon-tab-btn').forEach(btn => {
      const isActive = btn.dataset.ribbon === tabName;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    const panelMap = {
      file: '#ribbonPanelFile',
      home: '#ribbonPanelHome',
      insert: '#ribbonPanelInsert',
      layout: '#ribbonPanelLayout',
      view: '#ribbonPanelView',
      ppt: '#ribbonPanelPpt',
      excel: '#ribbonPanelExcel',
      pdf: '#ribbonPanelPdf',
      md: '#ribbonPanelMd',
      html: '#ribbonPanelHtml'
    };

    $$('.ribbon-panel').forEach(p => p.classList.remove('active'));
    const target = $(panelMap[tabName]);
    if (target) {
      target.classList.add('active');
      if (window.DocFlow?.UI?.balanceRibbonPanel) {
        window.DocFlow.UI.balanceRibbonPanel(target);
      }
      window.DocFlow?.updateWordOnlyTools?.();
    }
  }

  // Zoom Management
  let currentZoom = 100;
  function setEditorZoom(val) {
    currentZoom = Math.min(200, Math.max(50, val));
    const page = $('.editor-page');
    if (page) {
      page.style.transform = `scale(${currentZoom / 100})`;
      page.style.transformOrigin = 'top center';
    }
    const label = $('#editorZoomLabel');
    if (label) label.textContent = `${currentZoom}%`;
    showToast(`Zoom: ${currentZoom}%`, 'info');
  }

  // Document Statistics
  function showDocumentStats() {
    const editor = $('#editor');
    if (!editor) return;

    const text = editor.innerText || '';
    const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
    const charsWithSpaces = text.length;
    const charsWithoutSpaces = text.replace(/\s+/g, '').length;
    const paras = editor.querySelectorAll('p, h1, h2, h3, h4, li').length || (text.trim() ? 1 : 0);
    const readMins = words ? Math.max(1, Math.ceil(words / 200)) : 0;
    const speakMins = words ? Math.max(1, Math.ceil(words / 130)) : 0;

    const statsContent = $('#statsContent');
    if (statsContent) {
      statsContent.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
          <div style="background:var(--bg-tertiary);padding:10px 14px;border-radius:8px;">
            <div style="font-size:11px;color:var(--text-muted);font-weight:600;">WORDS</div>
            <div style="font-size:20px;font-weight:700;color:var(--text-primary);margin-top:2px;">${words.toLocaleString()}</div>
          </div>
          <div style="background:var(--bg-tertiary);padding:10px 14px;border-radius:8px;">
            <div style="font-size:11px;color:var(--text-muted);font-weight:600;">PARAGRAPHS</div>
            <div style="font-size:20px;font-weight:700;color:var(--text-primary);margin-top:2px;">${paras.toLocaleString()}</div>
          </div>
          <div style="background:var(--bg-tertiary);padding:10px 14px;border-radius:8px;">
            <div style="font-size:11px;color:var(--text-muted);font-weight:600;">CHARACTERS</div>
            <div style="font-size:20px;font-weight:700;color:var(--text-primary);margin-top:2px;">${charsWithSpaces.toLocaleString()}</div>
          </div>
          <div style="background:var(--bg-tertiary);padding:10px 14px;border-radius:8px;">
            <div style="font-size:11px;color:var(--text-muted);font-weight:600;">NO SPACES</div>
            <div style="font-size:20px;font-weight:700;color:var(--text-primary);margin-top:2px;">${charsWithoutSpaces.toLocaleString()}</div>
          </div>
          <div style="background:var(--bg-tertiary);padding:10px 14px;border-radius:8px;">
            <div style="font-size:11px;color:var(--text-muted);font-weight:600;">READING TIME</div>
            <div style="font-size:20px;font-weight:700;color:var(--accent);margin-top:2px;">~${readMins} min</div>
          </div>
          <div style="background:var(--bg-tertiary);padding:10px 14px;border-radius:8px;">
            <div style="font-size:11px;color:var(--text-muted);font-weight:600;">SPEAKING TIME</div>
            <div style="font-size:20px;font-weight:700;color:var(--accent);margin-top:2px;">~${speakMins} min</div>
          </div>
        </div>
      `;
    }
    openModal('#statsModal');
  }

  // Comprehensive Categorized Symbols Map (Bug 4)
  const CATEGORIZED_SYMBOLS = {
    currency: [
      { s: '$', n: 'Dollar' }, { s: '€', n: 'Euro' }, { s: '£', n: 'Pound' }, { s: '¥', n: 'Yen' },
      { s: '₹', n: 'Rupee' }, { s: '₽', n: 'Ruble' }, { s: '₩', n: 'Won' }, { s: '₿', n: 'Bitcoin' },
      { s: '¢', n: 'Cent' }, { s: '¤', n: 'Currency' }, { s: '₸', n: 'Tenge' }, { s: '₺', n: 'Lira' },
      { s: '₫', n: 'Dong' }, { s: '₴', n: 'Hryvnia' }, { s: '฿', n: 'Baht' }, { s: '₲', n: 'Guarani' },
      { s: '₱', n: 'Peso' }, { s: '₵', n: 'Cedi' }, { s: 'Fr', n: 'Franc' }, { s: '₭', n: 'Kip' }
    ],
    math: [
      { s: '±', n: 'Plus-minus' }, { s: '×', n: 'Multiply' }, { s: '÷', n: 'Divide' }, { s: '=', n: 'Equals' },
      { s: '≠', n: 'Not equal' }, { s: '≈', n: 'Approximately' }, { s: '≤', n: 'Less or equal' }, { s: '≥', n: 'Greater or equal' },
      { s: '∑', n: 'Summation' }, { s: '∏', n: 'Product' }, { s: '√', n: 'Square root' }, { s: '∛', n: 'Cube root' },
      { s: '∞', n: 'Infinity' }, { s: '∫', n: 'Integral' }, { s: '∬', n: 'Double integral' }, { s: '∂', n: 'Partial diff' },
      { s: '∇', n: 'Nabla / Del' }, { s: '∈', n: 'Element of' }, { s: '∉', n: 'Not element of' }, { s: '⊂', n: 'Subset' },
      { s: '⊃', n: 'Superset' }, { s: '∪', n: 'Union' }, { s: '∩', n: 'Intersection' }, { s: '∧', n: 'Logical AND' },
      { s: '∨', n: 'Logical OR' }, { s: '¬', n: 'Negation' }, { s: '⊕', n: 'Circled plus' }, { s: '⊗', n: 'Circled times' },
      { s: '‰', n: 'Per mille' }, { s: '½', n: 'Half' }, { s: '¼', n: 'Quarter' }, { s: '¾', n: 'Three quarters' },
      { s: '⅓', n: 'One third' }, { s: '⅔', n: 'Two thirds' }, { s: '⅛', n: 'One eighth' }, { s: '⅜', n: 'Three eighths' }
    ],
    arrows: [
      { s: '←', n: 'Left arrow' }, { s: '↑', n: 'Up arrow' }, { s: '→', n: 'Right arrow' }, { s: '↓', n: 'Down arrow' },
      { s: '↔', n: 'Left right' }, { s: '↕', n: 'Up down' }, { s: '↖', n: 'North west' }, { s: '↗', n: 'North east' },
      { s: '↘', n: 'South east' }, { s: '↙', n: 'South west' }, { s: '⇐', n: 'Double left' }, { s: '⇒', n: 'Double right' },
      { s: '⇑', n: 'Double up' }, { s: '⇓', n: 'Double down' }, { s: '⇔', n: 'Double left right' }, { s: '➔', n: 'Heavy arrow' },
      { s: '➜', n: 'Thick arrow' }, { s: '➞', n: 'Triangle arrow' }, { s: '↺', n: 'Anticlockwise' }, { s: '↻', n: 'Clockwise' }
    ],
    typography: [
      { s: '§', n: 'Section' }, { s: '¶', n: 'Pilcrow / Paragraph' }, { s: '©', n: 'Copyright' }, { s: '®', n: 'Registered' },
      { s: '™', n: 'Trademark' }, { s: '•', n: 'Bullet' }, { s: '◦', n: 'White bullet' }, { s: '‣', n: 'Triangle bullet' },
      { s: '…', n: 'Ellipsis' }, { s: '–', n: 'En dash' }, { s: '—', n: 'Em dash' }, { s: '‘', n: 'Left single quote' },
      { s: '’', n: 'Right single quote' }, { s: '“', n: 'Left double quote' }, { s: '”', n: 'Right double quote' },
      { s: '«', n: 'Left guillemet' }, { s: '»', n: 'Right guillemet' }, { s: '‹', n: 'Single left guillemet' },
      { s: '›', n: 'Single right guillemet' }, { s: '¡', n: 'Inverted exclamation' }, { s: '¿', n: 'Inverted question' },
      { s: '№', n: 'Numero' }, { s: '°', n: 'Degree' }, { s: '℃', n: 'Celsius' }, { s: '℉', n: 'Fahrenheit' }
    ],
    greek: [
      { s: 'α', n: 'alpha' }, { s: 'β', n: 'beta' }, { s: 'γ', n: 'gamma' }, { s: 'δ', n: 'delta' },
      { s: 'ε', n: 'epsilon' }, { s: 'ζ', n: 'zeta' }, { s: 'η', n: 'eta' }, { s: 'θ', n: 'theta' },
      { s: 'ι', n: 'iota' }, { s: 'κ', n: 'kappa' }, { s: 'λ', n: 'lambda' }, { s: 'μ', n: 'mu' },
      { s: 'ν', n: 'nu' }, { s: 'ξ', n: 'xi' }, { s: 'ο', n: 'omicron' }, { s: 'π', n: 'pi' },
      { s: 'ρ', n: 'rho' }, { s: 'σ', n: 'sigma' }, { s: 'τ', n: 'tau' }, { s: 'υ', n: 'upsilon' },
      { s: 'φ', n: 'phi' }, { s: 'χ', n: 'chi' }, { s: 'ψ', n: 'psi' }, { s: 'ω', n: 'omega' },
      { s: 'Γ', n: 'Gamma' }, { s: 'Δ', n: 'Delta' }, { s: 'Θ', n: 'Theta' }, { s: 'Λ', n: 'Lambda' },
      { s: 'Ξ', n: 'Xi' }, { s: 'Π', n: 'Pi' }, { s: 'Σ', n: 'Sigma' }, { s: 'Φ', n: 'Phi' },
      { s: 'Ψ', n: 'Psi' }, { s: 'Ω', n: 'Omega' }
    ],
    shapes: [
      { s: '★', n: 'Black star' }, { s: '☆', n: 'White star' }, { s: '♠', n: 'Spade' }, { s: '♣', n: 'Club' },
      { s: '♥', n: 'Heart' }, { s: '♦', n: 'Diamond' }, { s: '✦', n: 'Four point star' }, { s: '✧', n: 'Sparkle' },
      { s: '✪', n: 'Circled star' }, { s: '✓', n: 'Check' }, { s: '✔', n: 'Heavy check' }, { s: '✕', n: 'Cross' },
      { s: '✖', n: 'Heavy cross' }, { s: '✗', n: 'Ballot cross' }, { s: '✎', n: 'Pencil' }, { s: '✉', n: 'Envelope' },
      { s: '☎', n: 'Phone' }, { s: '✂', n: 'Scissors' }, { s: '✈', n: 'Airplane' }, { s: '☕', n: 'Coffee' },
      { s: '⚡', n: 'Lightning' }, { s: '❄', n: 'Snowflake' }, { s: '☀', n: 'Sun' }, { s: '☁', n: 'Cloud' },
      { s: '◼', n: 'Black square' }, { s: '◻', n: 'White square' }, { s: '▲', n: 'Up triangle' }, { s: '▼', n: 'Down triangle' },
      { s: '◆', n: 'Black diamond' }, { s: '◈', n: 'White diamond' }, { s: '◉', n: 'Fisheye' }, { s: '◌', n: 'Dotted circle' }
    ]
  };

  function initSymbolsModal() {
    const grid = $('#symbolsGrid');
    const searchInput = $('#symbolSearchInput');
    const tabs = $$('.symbol-cat-tab');
    if (!grid) return;

    let currentCategory = 'all';

    function renderSymbols(filter = '') {
      grid.innerHTML = '';
      const query = filter.toLowerCase().trim();

      let symbolList = [];
      if (currentCategory === 'all') {
        Object.values(CATEGORIZED_SYMBOLS).forEach(arr => symbolList.push(...arr));
      } else if (CATEGORIZED_SYMBOLS[currentCategory]) {
        symbolList = CATEGORIZED_SYMBOLS[currentCategory];
      }

      if (query) {
        symbolList = symbolList.filter(item => item.s.includes(query) || item.n.toLowerCase().includes(query));
      }

      if (!symbolList.length) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">No matching symbols found</div>`;
        return;
      }

      symbolList.forEach(item => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'symbol-cell';
        btn.textContent = item.s;
        btn.title = `${item.n} (${item.s})`;
        btn.addEventListener('click', () => {
          if (window.DocFlow.Editor) {
            window.DocFlow.Editor.insertHtmlAtCursor(item.s);
            showToast(`Inserted symbol ${item.s}`, 'info');
          }
          closeModal('#symbolModal');
        });
        grid.appendChild(btn);
      });
    }

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentCategory = tab.dataset.cat || 'all';
        renderSymbols(searchInput ? searchInput.value : '');
      });
    });

    searchInput?.addEventListener('input', e => {
      renderSymbols(e.target.value);
    });

    renderSymbols();

    $('#symbolCancel')?.addEventListener('click', () => closeModal('#symbolModal'));
    $('#statsCloseBtn')?.addEventListener('click', () => closeModal('#statsModal'));
  }

  // Custom Page Border Modal (Issue 2)
  function initCustomBorderModal() {
    const modal = $('#customPageBorderModal');
    if (!modal) return;

    const closeBtn = $('#customPageBorderCloseBtn');
    const cancelBtn = $('#customBorderCancelBtn');
    const applyBtn = $('#customBorderApplyBtn');
    const removeBtn = $('#customBorderRemoveBtn');

    const lineTypeSelect = $('#customBorderLineType');
    const widthSelect = $('#customBorderWidth');
    const colorInput = $('#customBorderColorInput');
    const colorText = $('#customBorderColorText');
    const radiusSelect = $('#customBorderRadius');
    const previewBox = $('#customBorderPreviewBox');

    function updatePreview() {
      const lineType = lineTypeSelect?.value || 'solid';
      const width = widthSelect?.value || '2px';
      const color = colorInput?.value || '#0284c7';
      const radius = radiusSelect?.value || '0px';
      if (previewBox) {
        previewBox.style.border = `${width} ${lineType} ${color}`;
        previewBox.style.borderRadius = radius;
      }
    }

    closeBtn?.addEventListener('click', () => closeModal('#customPageBorderModal'));
    cancelBtn?.addEventListener('click', () => closeModal('#customPageBorderModal'));

    colorInput?.addEventListener('input', e => {
      if (colorText) colorText.value = e.target.value;
      updatePreview();
    });

    colorText?.addEventListener('input', e => {
      const val = e.target.value.trim();
      if (/^#[0-9a-fA-F]{3,8}$/.test(val) && colorInput) {
        colorInput.value = val;
      }
      updatePreview();
    });

    lineTypeSelect?.addEventListener('change', updatePreview);
    widthSelect?.addEventListener('change', updatePreview);
    radiusSelect?.addEventListener('change', updatePreview);

    applyBtn?.addEventListener('click', () => {
      const page = $('.editor-page');
      if (page) {
        window.DocFlow.Editor?.saveSnapshot?.();
        const lineType = lineTypeSelect?.value || 'solid';
        const width = widthSelect?.value || '2px';
        const color = colorInput?.value || '#0284c7';
        const radius = radiusSelect?.value || '0px';

        page.classList.remove('page-border-box', 'page-border-shadow', 'page-border-double');
        page.style.border = `${width} ${lineType} ${color}`;
        page.style.borderRadius = radius;

        window.DocFlow.Editor?.notifyChange();
        updateLayoutSetting('pageBorder', { style: lineType, width, color, radius });
        showToast(`Custom border (${width} ${lineType}) applied`, 'success');
      }
      closeModal('#customPageBorderModal');
    });

    removeBtn?.addEventListener('click', () => {
      const page = $('.editor-page');
      if (page) {
        window.DocFlow.Editor?.saveSnapshot?.();
        page.style.border = '';
        page.style.borderRadius = '';
        page.classList.remove('page-border-box', 'page-border-shadow', 'page-border-double');
        window.DocFlow.Editor?.notifyChange();
        updateLayoutSetting('pageBorder', 'none');
        showToast('Page border removed', 'info');
      }
      closeModal('#customPageBorderModal');
    });

    updatePreview();
  }

  // Whiteboard & Excalidraw Canvas Studio (Insert Tab -> Draw Tool)
  function initPaintModal() {
    const paintBtn = $('#openPaintModalBtn') || $('#ribbonInsertPaintBtn');
    const canvas = $('#paintCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const colorInput = $('#paintColor');
    const fillInput = $('#paintFillColor');
    const transFillCheckbox = $('#paintTransparentFill');
    const brushInput = $('#paintBrushSize');
    const undoBtn = $('#paintUndoBtn');
    const clearBtn = $('#paintClearBtn');
    const cancelBtn = $('#paintCancel');
    const footerCancelBtn = $('#paintFooterCancel');
    const insertBtn = $('#paintInsertBtn');

    const tabExcalidraw = $('#tabExcalidrawStudio');
    const tabCanvas = $('#tabQuickCanvas');
    const excalidrawWrapper = $('#excalidrawWrapper');
    const quickCanvasWrapper = $('#quickCanvasWrapper');

    let excalidrawMounted = false;
    let excalidrawAPI = null;

    function mountExcalidraw() {
      const container = document.getElementById('excalidrawContainer');
      if (!container) return;
      if (window.ExcalidrawLib && window.React && window.ReactDOM) {
        if (!excalidrawMounted) {
          excalidrawMounted = true;
          const loadingEl = document.getElementById('excalidrawLoading');
          if (loadingEl) loadingEl.style.display = 'none';

          try {
            const root = window.ReactDOM.createRoot(container);
            root.render(
              window.React.createElement(window.ExcalidrawLib.Excalidraw, {
                excalidrawAPI: (api) => {
                  excalidrawAPI = api;
                  window.currentExcalidrawAPI = api;
                },
                initialData: {
                  appState: { viewBackgroundColor: '#ffffff' }
                }
              })
            );
          } catch (err) {
            console.warn('Excalidraw mount fallback:', err);
            if (loadingEl) loadingEl.textContent = 'Excalidraw loaded in Quick Canvas mode';
          }
        }
      } else {
        const loadingEl = document.getElementById('excalidrawLoading');
        if (loadingEl) {
          loadingEl.innerHTML = '<span style="color:var(--text-secondary);"><i class="fas fa-info-circle"></i> Excalidraw online engine connecting. Switch to Quick Canvas to sketch immediately.</span>';
        }
      }
    }

    tabExcalidraw?.addEventListener('click', () => {
      tabExcalidraw.classList.add('active');
      tabCanvas?.classList.remove('active');
      if (excalidrawWrapper) excalidrawWrapper.style.display = 'block';
      if (quickCanvasWrapper) quickCanvasWrapper.style.display = 'none';
      mountExcalidraw();
    });

    tabCanvas?.addEventListener('click', () => {
      tabCanvas.classList.add('active');
      tabExcalidraw?.classList.remove('active');
      if (excalidrawWrapper) excalidrawWrapper.style.display = 'none';
      if (quickCanvasWrapper) quickCanvasWrapper.style.display = 'flex';
    });

    paintBtn?.addEventListener('click', () => {
      if (window.DocFlow.currentMode !== 'edit') {
        showToast('Open a document in edit mode first', 'info');
        return;
      }
      openModal('#paintModal');
      setTimeout(mountExcalidraw, 100);
    });

    cancelBtn?.addEventListener('click', () => closeModal('#paintModal'));
    footerCancelBtn?.addEventListener('click', () => closeModal('#paintModal'));

    let activeTool = 'pen';
    let isDrawing = false;
    let startX = 0, startY = 0;
    let snapshot = null;
    let undoStack = [];

    const saveUndo = () => {
      if (undoStack.length > 25) undoStack.shift();
      undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    };

    const resetCanvas = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      undoStack = [];
      saveUndo();
    };
    resetCanvas();

    // Tool switcher buttons
    $$('#paintModal .draw-tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#paintModal .draw-tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeTool = btn.dataset.tool || 'pen';
        showToast(`Tool: ${activeTool.toUpperCase()}`, 'info');
      });
    });

    undoBtn?.addEventListener('click', () => {
      if (undoStack.length > 1) {
        undoStack.pop(); // Remove current state
        const prev = undoStack[undoStack.length - 1];
        ctx.putImageData(prev, 0, 0);
        showToast('Undo performed', 'info');
      } else {
        showToast('Nothing to undo', 'info');
      }
    });

    clearBtn?.addEventListener('click', () => {
      resetCanvas();
      showToast('Canvas cleared', 'info');
    });

    cancelBtn?.addEventListener('click', () => closeModal('#paintModal'));

    paintBtn?.addEventListener('click', () => {
      if (window.DocFlow.currentMode !== 'edit') {
        showToast('Open a document in edit mode first', 'info');
        return;
      }
      openModal('#paintModal');
    });

    const getPos = e => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    const drawArrow = (fromX, fromY, toX, toY, width, color) => {
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();

      const angle = Math.atan2(toY - fromY, toX - fromX);
      const headLen = Math.max(12, width * 3);
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };

    const startDraw = e => {
      isDrawing = true;
      const pos = getPos(e);
      startX = pos.x;
      startY = pos.y;
      snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);

      if (activeTool === 'pen' || activeTool === 'eraser') {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
      }
    };

    const draw = e => {
      if (!isDrawing) return;
      const pos = getPos(e);
      const strokeColor = colorInput ? colorInput.value : '#1e293b';
      const fillColor = fillInput ? fillInput.value : '#fef08a';
      const isTransparent = transFillCheckbox ? transFillCheckbox.checked : true;
      const width = parseInt(brushInput?.value, 10) || 3;

      if (activeTool === 'pen') {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      } else if (activeTool === 'eraser') {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = width * 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      } else {
        // Shapes preview: restore canvas before drawing live preview
        ctx.putImageData(snapshot, 0, 0);
        ctx.strokeStyle = strokeColor;
        ctx.fillStyle = fillColor;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (activeTool === 'line') {
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(pos.x, pos.y);
          ctx.stroke();
        } else if (activeTool === 'arrow') {
          drawArrow(startX, startY, pos.x, pos.y, width, strokeColor);
        } else if (activeTool === 'rect') {
          const w = pos.x - startX;
          const h = pos.y - startY;
          if (!isTransparent) ctx.fillRect(startX, startY, w, h);
          ctx.strokeRect(startX, startY, w, h);
        } else if (activeTool === 'diamond') {
          const midX = (startX + pos.x) / 2;
          const midY = (startY + pos.y) / 2;
          ctx.beginPath();
          ctx.moveTo(midX, startY);
          ctx.lineTo(pos.x, midY);
          ctx.lineTo(midX, pos.y);
          ctx.lineTo(startX, midY);
          ctx.closePath();
          if (!isTransparent) ctx.fill();
          ctx.stroke();
        } else if (activeTool === 'ellipse') {
          const rx = Math.abs(pos.x - startX) / 2;
          const ry = Math.abs(pos.y - startY) / 2;
          const cx = (startX + pos.x) / 2;
          const cy = (startY + pos.y) / 2;
          ctx.beginPath();
          ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
          if (!isTransparent) ctx.fill();
          ctx.stroke();
        }
      }
    };

    const stopDraw = () => {
      if (!isDrawing) return;
      isDrawing = false;
      const strokeColor = colorInput ? colorInput.value : '#1e293b';

      if (activeTool === 'text') {
        window.DocFlow.UI?.showPromptModal?.({
          title: 'Canvas Text Label',
          message: 'Enter text for label:',
          placeholder: 'Label text...',
          confirmText: 'Insert Text',
          onConfirm: (text) => {
            if (text && text.trim()) {
              ctx.font = 'bold 16px Inter, sans-serif';
              ctx.fillStyle = strokeColor;
              ctx.fillText(text.trim(), startX, startY);
              saveUndo();
            }
          }
        });
      } else if (activeTool === 'note') {
        window.DocFlow.UI?.showPromptModal?.({
          title: 'Sticky Note',
          message: 'Enter sticky note text:',
          placeholder: 'Sticky note content...',
          confirmText: 'Insert Note',
          onConfirm: (note) => {
            if (note && note.trim()) {
              const nw = 140, nh = 90;
              ctx.fillStyle = '#fef08a';
              ctx.strokeStyle = '#eab308';
              ctx.lineWidth = 1.5;
              ctx.fillRect(startX, startY, nw, nh);
              ctx.strokeRect(startX, startY, nw, nh);
              ctx.font = '13px Inter, sans-serif';
              ctx.fillStyle = '#1c1917';
              ctx.fillText(note.trim().slice(0, 30), startX + 10, startY + 28);
              if (note.trim().length > 30) {
                ctx.fillText(note.trim().slice(30, 60), startX + 10, startY + 48);
              }
              saveUndo();
            }
          }
        });
      }
      saveUndo();
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDraw);

    canvas.addEventListener('touchstart', e => { e.preventDefault(); startDraw(e); }, { passive: false });
    canvas.addEventListener('touchmove', e => { e.preventDefault(); draw(e); }, { passive: false });
    window.addEventListener('touchend', stopDraw);

    insertBtn?.addEventListener('click', async () => {
      // If Excalidraw Studio tab is active, export from official Excalidraw API
      if (tabExcalidraw?.classList.contains('active') && excalidrawAPI && window.ExcalidrawLib) {
        try {
          const elements = excalidrawAPI.getSceneElements();
          const files = excalidrawAPI.getFiles();
          if (elements && elements.length > 0) {
            const canvasEl = await window.ExcalidrawLib.exportToCanvas({
              elements,
              files,
              appState: { exportWithDarkMode: false, exportBackground: true }
            });
            const dataUrl = canvasEl.toDataURL('image/png');
            closeModal('#paintModal');
            if (window.DocFlow.ImageManager?.insertImageIntoDocument) {
              window.DocFlow.ImageManager.insertImageIntoDocument(dataUrl, 'Excalidraw Whiteboard');
            } else {
              window.DocFlow.Editor?.insertHtmlAtCursor(`<img src="${dataUrl}" alt="Excalidraw Whiteboard" data-wrap="inline" style="max-width:100%;height:auto;"><p><br></p>`);
            }
            showToast('Excalidraw whiteboard diagram inserted into document', 'success');
            return;
          }
        } catch (err) {
          console.warn('Excalidraw export fallback to canvas:', err);
        }
      }

      // Quick Canvas export
      closeModal('#paintModal');
      const dataUrl = canvas.toDataURL('image/png');
      if (window.DocFlow.ImageManager?.insertImageIntoDocument) {
        window.DocFlow.ImageManager.insertImageIntoDocument(dataUrl, 'Excalidraw Diagram');
      } else {
        window.DocFlow.Editor?.insertHtmlAtCursor(`<img src="${dataUrl}" alt="Excalidraw Diagram" data-wrap="inline" style="max-width:100%;height:auto;"><p><br></p>`);
      }
      showToast('Whiteboard diagram inserted into document', 'success');
    });
  }

  // Animated GIF Search and Insertion Modal (Enhanced Responsive Search & Direct URL)
  function initGifModal() {
    const gifBtn = $('#ribbonInsertGifBtn');
    const gifModal = $('#gifModal');
    const searchInput = $('#gifSearchInput');
    const clearSearchBtn = $('#gifClearSearchBtn');
    const searchBtn = $('#gifSearchBtn');
    const gifGrid = $('#gifGrid');
    const closeBtn = $('#gifModalClose');
    const cancelBtn = $('#gifCancel');

    const tabBrowse = $('#gifTabBrowse');
    const tabUrl = $('#gifTabUrl');
    const searchBarSection = $('#gifSearchBarSection');
    const tagChipsSection = $('#gifTagChips');
    const urlSection = $('#gifUrlSection');
    const directUrlInput = $('#gifDirectUrlInput');
    const directUrlPreview = $('#gifUrlPreview');
    const insertDirectBtn = $('#gifInsertDirectBtn');

    if (!gifModal || !gifGrid) return;

    // Comprehensive Curated Library of animated GIFs
    const CURATED_GIFS = [
      // Trending
      { url: 'https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif', title: 'Thumbs Up', tags: ['trending', 'thumbs up', 'good', 'yes', 'ok'] },
      { url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif', title: 'Clapping Hands', tags: ['trending', 'congratulations', 'clap', 'applause', 'bravo'] },
      { url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif', title: 'Great Job', tags: ['trending', 'thumbs up', 'approve', 'congrats'] },
      { url: 'https://media.giphy.com/media/d20PG6M63A3dVd2U/giphy.gif', title: 'Excited Yay', tags: ['trending', 'celebration', 'happy', 'yay', 'excited'] },
      { url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', title: 'Confetti Party', tags: ['trending', 'celebration', 'party', 'confetti'] },
      { url: 'https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif', title: 'Thinking Pose', tags: ['trending', 'thinking', 'hmm', 'smart', 'idea'] },

      // Cats
      { url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif', title: 'Cat Typing Fast', tags: ['cat', 'cats', 'work', 'typing', 'coding', 'computer'] },
      { url: 'https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif', title: 'Cute Cat Wave', tags: ['cat', 'cats', 'welcome', 'cute', 'hello', 'wave'] },
      { url: 'https://media.giphy.com/media/BzyTuYCmvSORqs1ABM/giphy.gif', title: 'Cat High Five', tags: ['cat', 'cats', 'thumbs up', 'high five', 'cool', 'yes'] },
      { url: 'https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif', title: 'Cat Party', tags: ['cat', 'cats', 'celebration', 'dance', 'party'] },
      { url: 'https://media.giphy.com/media/vFKqnCdLPNOKc/giphy.gif', title: 'Sleepy Cat', tags: ['cat', 'cats', 'tired', 'sleep', 'rest'] },

      // Dogs
      { url: 'https://media.giphy.com/media/mCRJDo24UvJMA/giphy.gif', title: 'Happy Dog Tail', tags: ['dog', 'dogs', 'happy', 'cute', 'excited'] },
      { url: 'https://media.giphy.com/media/bbshzgyFQDqPHXBo4c/giphy.gif', title: 'Dog Typing', tags: ['dog', 'dogs', 'work', 'typing', 'computer'] },
      { url: 'https://media.giphy.com/media/4Zo41lhzKt6iZ8xff9/giphy.gif', title: 'Dog Smiling', tags: ['dog', 'dogs', 'happy', 'smile', 'thumbs up'] },

      // Celebration & Congrats
      { url: 'https://media.giphy.com/media/Is1O1TWV0LEJi/giphy.gif', title: 'Celebration Dance', tags: ['celebration', 'party', 'dance', 'fun', 'happy'] },
      { url: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif', title: 'Cheers Toast', tags: ['celebration', 'congratulations', 'cheers', 'drink'] },
      { url: 'https://media.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif', title: 'Standing Ovation', tags: ['congratulations', 'applause', 'clap', 'bravo'] },
      { url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif', title: 'Super Excited', tags: ['celebration', 'excited', 'yay', 'happy'] },

      // Thumbs Up & Yes
      { url: 'https://media.giphy.com/media/10UeedrT5MIfPG/giphy.gif', title: 'Nodding Yes', tags: ['thumbs up', 'yes', 'agree', 'nod'] },
      { url: 'https://media.giphy.com/media/NEvPzZ8bdvtxG/giphy.gif', title: 'Approval Nod', tags: ['thumbs up', 'yes', 'approve', 'agree'] },
      { url: 'https://media.giphy.com/media/diUKszNTUghVe/giphy.gif', title: 'Double Thumbs Up', tags: ['thumbs up', 'yes', 'great', 'awesome'] },

      // Work & Coffee
      { url: 'https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif', title: 'Typing Hard', tags: ['work', 'typing', 'busy', 'computer', 'coding'] },
      { url: 'https://media.giphy.com/media/o0vwzuFwCGAFO/giphy.gif', title: 'Coffee Sip', tags: ['coffee', 'work', 'morning', 'drink'] },
      { url: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif', title: 'Need Coffee', tags: ['coffee', 'morning', 'energy', 'work'] },

      // Dance & Fun
      { url: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif', title: 'Happy Dance', tags: ['dance', 'fun', 'happy', 'music'] },
      { url: 'https://media.giphy.com/media/DhstvI3zZ598A/giphy.gif', title: 'Groovy Moves', tags: ['dance', 'party', 'music', 'fun'] },
      { url: 'https://media.giphy.com/media/3ohzdIuqJoo8QdKlnW/giphy.gif', title: 'Dancing Celebration', tags: ['dance', 'party', 'fun'] },

      // Thinking & Smart
      { url: 'https://media.giphy.com/media/d3mlE7uhX8KFgEmY/giphy.gif', title: 'Smart Thinking', tags: ['thinking', 'smart', 'idea', 'brain'] },
      { url: 'https://media.giphy.com/media/a5viI92PAF89q/giphy.gif', title: 'Pondering Idea', tags: ['thinking', 'hmm', 'question', 'idea'] },

      // Welcome & Thank You
      { url: 'https://media.giphy.com/media/dzaUX7CAG0Ihi/giphy.gif', title: 'Welcome Wave', tags: ['welcome', 'hello', 'hi', 'wave'] },
      { url: 'https://media.giphy.com/media/ASd0Ukj0y3qMM/giphy.gif', title: 'Friendly Wave', tags: ['welcome', 'hello', 'wave'] },
      { url: 'https://media.giphy.com/media/osAcIGJnYE0VU76L63/giphy.gif', title: 'Thank You Bow', tags: ['thank you', 'thanks', 'gratitude'] },
      { url: 'https://media.giphy.com/media/3oz8xIsloV7zOmt81G/giphy.gif', title: 'Many Thanks', tags: ['thank you', 'thanks', 'grateful'] },

      // Loading
      { url: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif', title: 'Loading Spinner', tags: ['loading', 'wait', 'spinner', 'progress'] }
    ];

    function renderGifs(list) {
      gifGrid.innerHTML = '';
      if (!list || !list.length) {
        gifGrid.innerHTML = `
          <div style="grid-column:1/-1;text-align:center;padding:28px 16px;color:var(--text-muted);font-size:12.5px;">
            <i class="fas fa-magnifying-glass" style="font-size:24px;margin-bottom:8px;opacity:0.5;display:block;"></i>
            No animated GIFs found. Try searching keywords like <strong>cat, thumbs up, celebration, work, dance</strong>, or paste a GIF URL above.
          </div>`;
        return;
      }
      list.forEach(item => {
        const card = document.createElement('div');
        card.className = 'gif-card';
        card.style.cssText = 'cursor:pointer;border-radius:6px;overflow:hidden;background:#000;display:flex;align-items:center;justify-content:center;height:105px;border:1px solid var(--border);transition:transform 0.15s ease, box-shadow 0.15s ease;position:relative;';
        card.title = item.title || 'Click to insert';
        card.innerHTML = `<img src="${item.url}" alt="${escHtml(item.title || 'GIF')}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">`;

        card.addEventListener('mouseenter', () => {
          card.style.transform = 'scale(1.03)';
          card.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)';
        });
        card.addEventListener('mouseleave', () => {
          card.style.transform = 'scale(1)';
          card.style.boxShadow = 'none';
        });

        card.addEventListener('click', () => {
          closeModal('#gifModal');
          if (window.DocFlow.ImageManager?.insertImageIntoDocument) {
            window.DocFlow.ImageManager.insertImageIntoDocument(item.url, item.title || 'Animated GIF');
          } else {
            window.DocFlow.Editor?.insertHtmlAtCursor(`<img src="${item.url}" alt="${escHtml(item.title)}" data-wrap="inline" style="max-width:100%;"><p><br></p>`);
          }
          showToast('Animated GIF inserted into document', 'success');
        });
        gifGrid.appendChild(card);
      });
    }

    function searchCuratedGifs(query) {
      const q = query.toLowerCase().trim();
      if (!q || q === 'trending') return CURATED_GIFS;

      return CURATED_GIFS.filter(item => {
        if (item.title.toLowerCase().includes(q)) return true;
        return item.tags.some(t => t.includes(q) || q.includes(t));
      });
    }

    async function searchNetworkGifs(query) {
      const q = query.trim();
      gifGrid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:28px 16px;color:var(--text-muted);font-size:12.5px;">
          <i class="fas fa-spinner fa-spin" style="margin-right:6px;color:var(--accent);"></i> Searching GIFs for "${escHtml(q)}"...
        </div>`;

      const curatedMatches = searchCuratedGifs(q);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=dc6zaTOxFJmzC&q=${encodeURIComponent(q)}&limit=16`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (data && data.data && data.data.length) {
            const results = data.data.map(g => ({
              url: g.images.fixed_height.url || g.images.original.url,
              title: g.title || q
            }));
            renderGifs(results);
            return;
          }
        }
      } catch (e) { }

      renderGifs(curatedMatches.length ? curatedMatches : CURATED_GIFS.slice(0, 8));
    }

    tabBrowse?.addEventListener('click', () => {
      tabBrowse.classList.add('active');
      tabUrl?.classList.remove('active');
      if (searchBarSection) searchBarSection.style.display = 'flex';
      if (tagChipsSection) tagChipsSection.style.display = 'flex';
      if (urlSection) urlSection.style.display = 'none';
      if (gifGrid) gifGrid.style.display = 'grid';
    });

    tabUrl?.addEventListener('click', () => {
      tabUrl.classList.add('active');
      tabBrowse?.classList.remove('active');
      if (searchBarSection) searchBarSection.style.display = 'none';
      if (tagChipsSection) tagChipsSection.style.display = 'none';
      if (urlSection) urlSection.style.display = 'flex';
      if (gifGrid) gifGrid.style.display = 'none';
    });

    directUrlInput?.addEventListener('input', () => {
      const url = directUrlInput.value.trim();
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        if (directUrlPreview) {
          directUrlPreview.style.display = 'flex';
          directUrlPreview.innerHTML = `<img src="${url}" alt="GIF Preview" style="max-height:140px;max-width:100%;object-fit:contain;" onerror="this.parentElement.style.display='none';">`;
        }
      } else {
        if (directUrlPreview) directUrlPreview.style.display = 'none';
      }
    });

    insertDirectBtn?.addEventListener('click', () => {
      const url = directUrlInput?.value.trim();
      if (!url) {
        showToast('Please enter a GIF image URL', 'warning');
        return;
      }
      closeModal('#gifModal');
      if (window.DocFlow.ImageManager?.insertImageIntoDocument) {
        window.DocFlow.ImageManager.insertImageIntoDocument(url, 'Animated GIF');
      } else {
        window.DocFlow.Editor?.insertHtmlAtCursor(`<img src="${url}" alt="Animated GIF" data-wrap="inline" style="max-width:100%;"><p><br></p>`);
      }
      showToast('Animated GIF inserted from URL', 'success');
      if (directUrlInput) directUrlInput.value = '';
      if (directUrlPreview) directUrlPreview.style.display = 'none';
    });

    gifBtn?.addEventListener('click', () => {
      if (window.DocFlow.currentMode !== 'edit') {
        showToast('Open a document in edit mode first', 'info');
        return;
      }
      openModal('#gifModal');
      tabBrowse?.click();
      renderGifs(CURATED_GIFS);
    });

    searchBtn?.addEventListener('click', () => {
      const q = searchInput?.value.trim();
      if (q) searchNetworkGifs(q);
      else renderGifs(CURATED_GIFS);
    });

    searchInput?.addEventListener('input', () => {
      if (clearSearchBtn) {
        clearSearchBtn.style.display = searchInput.value ? 'block' : 'none';
      }
    });

    clearSearchBtn?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (clearSearchBtn) clearSearchBtn.style.display = 'none';
      renderGifs(CURATED_GIFS);
    });

    searchInput?.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        searchBtn?.click();
      }
    });

    $$('#gifModal .gif-tag-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        $$('#gifModal .gif-tag-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const tag = chip.dataset.tag || 'trending';
        if (searchInput) {
          searchInput.value = tag === 'trending' ? '' : tag;
          if (clearSearchBtn) clearSearchBtn.style.display = searchInput.value ? 'block' : 'none';
        }
        searchNetworkGifs(tag);
      });
    });

    closeBtn?.addEventListener('click', () => closeModal('#gifModal'));
    cancelBtn?.addEventListener('click', () => closeModal('#gifModal'));
  }

  // Direct Document Creator for Ribbon Office Formats (Word, Excel, PPT, PDF - Bug 2)
  function createNewDocDirect(ext, docTitle) {
    let content = '<p><br></p>';
    if (ext === 'xlsx') {
      content = window.DocFlow.FileIO?.createBlankExcelGrid(50, 50) || '<p>Spreadsheet Document</p>';
    } else if (ext === 'pptx') {
      content = window.DocFlow.FileIO?.createBlankPresentation() || '<p>Presentation Document</p>';
    } else if (ext === 'docx') {
      content = '<p><br></p>';
    } else if (ext === 'pdf') {
      openModal('#pdfMergeModal');
      return;
    }

    const fullName = `${docTitle}.${ext}`;
    const tab = window.DocFlow.UI.Tabs.create(fullName, content, ext.toUpperCase(), 'edit');
    window.DocFlow.UI.Tabs.activateTab(tab);

    if (ext === 'xlsx') {
      setTimeout(setupExcelInteractions, 50);
    }

    Recent.add({
      name: fullName,
      type: ext.toUpperCase(),
      mode: 'edit',
      content: content
    });

    showToast(`Created new document "${fullName}"`, 'success');
  }

  // Office & Embed Helpers (PPT Outside/Nested Slides, Charts, Presentation Slideshow, Excel Sheet Protection)
  function isPptxDocument() {
    const activeTab = window.DocFlow?.UI?.Tabs?.get(window.DocFlow?.UI?.Tabs?.activeId);
    if (!activeTab) return false;
    const name = (activeTab.name || '').toLowerCase();
    const type = (activeTab.fileType || '').toLowerCase();
    return name.endsWith('.pptx') || name.endsWith('.ppt') || type === 'pptx' || type === 'ppt';
  }

  // PowerPoint Slide Deck Management & Sidebar (Issue 1 & 5)
  let currentActiveSlideIndex = 0;

  function checkSlideOverflow(slideCard, showToastNotice = false) {
    if (!slideCard) return;
    const wrapper = slideCard.closest('.pptx-slide-wrapper') || slideCard;
    let warningPill = wrapper.querySelector('.slide-overflow-warning');
    const isOverflowing = slideCard.scrollHeight > (slideCard.clientHeight + 4);

    if (isOverflowing) {
      slideCard.classList.add('has-overflow');
      if (!warningPill) {
        warningPill = document.createElement('div');
        warningPill.className = 'slide-overflow-warning';
        warningPill.innerHTML = `
          <i class="fas fa-triangle-exclamation" style="color:#b45309;"></i>
          <span>Text exceeds slide boundaries!</span>
          <button type="button" class="slide-autofit-btn" title="Auto-reduce font size to fit slide">
            <i class="fas fa-compress-alt"></i> Auto-Fit Text
          </button>
        `;
        warningPill.querySelector('.slide-autofit-btn').addEventListener('click', e => {
          e.stopPropagation();
          autoFitSlideText(slideCard, true);
        });
        wrapper.appendChild(warningPill);
      }
      if (showToastNotice && !slideCard._overflowToastShown) {
        slideCard._overflowToastShown = true;
        showToast('Text exceeds slide boundaries! Click Auto-Fit or shorten text.', 'warning');
        setTimeout(() => { slideCard._overflowToastShown = false; }, 4000);
      }
    } else {
      slideCard.classList.remove('has-overflow');
      if (warningPill) warningPill.remove();
    }
  }

  function autoFitSlideText(slideCard, notifyUser = true) {
    if (!slideCard) return;
    const textEls = Array.from(slideCard.querySelectorAll(
      '.pptx-slide-body, .slide-content-box, .slide-freeform-rect, .slide-nested-card, p, li, h1, h2, h3, h4, .slide-title-box, .pptx-slide-title'
    ));
    if (!textEls.length) textEls.push(slideCard);

    let attempts = 0;
    while (slideCard.scrollHeight > (slideCard.clientHeight + 2) && attempts < 16) {
      let anyReduced = false;
      textEls.forEach(el => {
        const curSize = parseFloat(window.getComputedStyle(el).fontSize) || 14;
        if (curSize > 9) {
          el.style.fontSize = `${Math.max(9, curSize - 1)}px`;
          anyReduced = true;
        }
      });
      if (!anyReduced) break;
      attempts++;
    }

    checkSlideOverflow(slideCard, false);
    window.DocFlow.Editor?.notifyChange?.();
    if (notifyUser) {
      if (slideCard.scrollHeight <= (slideCard.clientHeight + 2)) {
        showToast('Text auto-fitted within slide boundaries', 'success');
      } else {
        showToast('Minimum font size reached. Please shorten text or add a new slide.', 'warning');
      }
    }
  }

  function updatePptSidebar() {
    const isPpt = isPptxDocument() && window.DocFlow?.currentMode !== 'empty';
    const sidebar = $('#pptxSlideSidebar');
    const editor = $('#editor');
    if (!editor) return;

    document.body.classList.toggle('slide-deck-mode', isPpt);

    if (!isPpt) {
      if (sidebar) sidebar.style.display = 'none';
      editor.classList.remove('is-pptx-deck');
      editor.querySelectorAll('.pptx-slide-wrapper').forEach(w => w.style.display = '');
      return;
    }

    if (sidebar) sidebar.style.display = 'flex';
    editor.classList.add('is-pptx-deck');

    let slideWrappers = Array.from(editor.querySelectorAll('.pptx-slide-wrapper'));

    if (slideWrappers.length === 0) {
      const bareCards = Array.from(editor.querySelectorAll('.pptx-slide-card'));
      if (bareCards.length > 0) {
        bareCards.forEach(card => {
          if (!card.closest('.pptx-slide-wrapper')) {
            const wrap = document.createElement('div');
            wrap.className = 'pptx-slide-wrapper';
            wrap.style.cssText = 'position:relative;margin:28px auto;max-width:850px;';
            card.parentNode.insertBefore(wrap, card);
            wrap.appendChild(card);
          }
        });
        slideWrappers = Array.from(editor.querySelectorAll('.pptx-slide-wrapper'));
      }
    }

    if (slideWrappers.length === 0) {
      editor.innerHTML = createEmptySlideHtml();
      slideWrappers = Array.from(editor.querySelectorAll('.pptx-slide-wrapper'));
    }

    currentActiveSlideIndex = Math.max(0, Math.min(currentActiveSlideIndex, slideWrappers.length - 1));

    const slideCountEl = $('#pptxSlideCount');
    if (slideCountEl) slideCountEl.textContent = slideWrappers.length;

    // Display ONLY the slide selected by the user, not all slides at once (Issue 5)
    slideWrappers.forEach((w, idx) => {
      if (idx === currentActiveSlideIndex) {
        w.style.display = 'block';
        w.classList.add('active-slide');
      } else {
        w.style.display = 'none';
        w.classList.remove('active-slide');
      }
    });

    // Populate Sidebar Thumbnails
    const thumbsContainer = $('#pptxSidebarThumbnails');
    if (thumbsContainer) {
      if (!thumbsContainer._delegated) {
        thumbsContainer._delegated = true;
        thumbsContainer.addEventListener('click', e => {
          const delBtn = e.target.closest('.pptx-thumbnail-delete-btn');
          if (delBtn) {
            e.stopPropagation();
            const idx = parseInt(delBtn.dataset.deleteIdx, 10);
            deletePptSlide(idx);
            return;
          }
          const thumb = e.target.closest('.pptx-thumbnail-item');
          if (thumb) {
            const idx = parseInt(thumb.dataset.slideIndex, 10);
            if (!isNaN(idx)) selectPptSlide(idx);
          }
        });
      }
      thumbsContainer.innerHTML = '';
      slideWrappers.forEach((w, idx) => {
        const card = w.querySelector('.pptx-slide-card') || w;
        const titleText = card.querySelector('.pptx-slide-title, .slide-title-box, h1, h2, h3, h4')?.textContent.trim() || `Slide ${idx + 1}`;
        const snippetText = (card.innerText || '').replace(titleText, '').trim().substring(0, 60);

        const thumb = document.createElement('div');
        thumb.className = `pptx-thumbnail-item ${idx === currentActiveSlideIndex ? 'active' : ''}`;
        thumb.dataset.slideIndex = idx;
        thumb.innerHTML = `
          <div class="pptx-thumbnail-num">${idx + 1}</div>
          <div class="pptx-thumbnail-card-wrap">
            <div class="pptx-thumbnail-preview">
              <div style="font-weight:700;color:var(--text-primary);margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(titleText)}</div>
              <div style="font-size:7.5px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${escHtml(snippetText || 'Empty slide')}</div>
            </div>
            <button class="pptx-thumbnail-delete-btn" data-delete-idx="${idx}" title="Delete slide ${idx + 1}">
              <i class="fas fa-trash-can"></i>
            </button>
          </div>
        `;
        thumbsContainer.appendChild(thumb);
      });
    }
  }

  function selectPptSlide(index) {
    currentActiveSlideIndex = index;
    updatePptSidebar();
    const editor = $('#editor');
    if (editor) {
      const slides = Array.from(editor.querySelectorAll('.pptx-slide-wrapper'));
      const activeWrapper = slides[currentActiveSlideIndex];
      if (activeWrapper) {
        activeWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        const focusable = activeWrapper.querySelector('.slide-title-box, .slide-content-box, [contenteditable="true"]') || activeWrapper.querySelector('.pptx-slide-card');
        if (focusable) {
          focusable.focus();
          clearSlidePlaceholder(activeWrapper.querySelector('.pptx-slide-card'));
        }
      }
    }
  }

  function deletePptSlide(index) {
    const editor = $('#editor');
    if (!editor) return;
    const slides = Array.from(editor.querySelectorAll('.pptx-slide-wrapper'));
    if (index >= 0 && index < slides.length) {
      if (slides.length <= 1) {
        showToast('Presentation must have at least one slide', 'warning');
        return;
      }
      // Save Undo snapshot so Ctrl+Z restores deleted slide
      window.DocFlow.Editor?.saveSnapshot?.();
      slides[index].remove();
      if (currentActiveSlideIndex >= slides.length - 1) {
        currentActiveSlideIndex = Math.max(0, slides.length - 2);
      }
      window.DocFlow.Editor?.notifyChange();
      updatePptSidebar();
      showToast('Slide deleted. Press Ctrl+Z to undo', 'info');
    }
  }

  function duplicatePptSlide() {
    const editor = $('#editor');
    if (!editor) return;
    const slides = Array.from(editor.querySelectorAll('.pptx-slide-wrapper'));
    if (currentActiveSlideIndex >= 0 && currentActiveSlideIndex < slides.length) {
      window.DocFlow.Editor?.saveSnapshot?.();
      const current = slides[currentActiveSlideIndex];
      const clone = current.cloneNode(true);
      current.insertAdjacentElement('afterend', clone);
      window.DocFlow.Editor?.notifyChange();
      selectPptSlide(currentActiveSlideIndex + 1);
      showToast('Slide duplicated', 'success');
    }
  }

  function movePptSlide(direction) {
    const editor = $('#editor');
    if (!editor) return;
    const slides = Array.from(editor.querySelectorAll('.pptx-slide-wrapper'));
    if (!slides.length) {
      showToast('No presentation slides found to move', 'info');
      return;
    }
    const idx = currentActiveSlideIndex;
    if (direction === -1 && idx > 0) {
      window.DocFlow.Editor?.saveSnapshot?.();
      slides[idx - 1].insertAdjacentElement('beforebegin', slides[idx]);
      selectPptSlide(idx - 1);
      window.DocFlow.Editor?.notifyChange();
      showToast(`Slide moved up to position ${idx}`, 'success');
    } else if (direction === 1 && idx < slides.length - 1) {
      window.DocFlow.Editor?.saveSnapshot?.();
      slides[idx + 1].insertAdjacentElement('afterend', slides[idx]);
      selectPptSlide(idx + 1);
      window.DocFlow.Editor?.notifyChange();
      showToast(`Slide moved down to position ${idx + 2}`, 'success');
    } else if (direction === -1) {
      showToast('Slide is already at the top', 'info');
    } else {
      showToast('Slide is already at the bottom', 'info');
    }
  }

  function createEmptySlideHtml(layout = 'blank', inheritSource = null) {
    if (!inheritSource) {
      const slides = Array.from(document.querySelectorAll('#editor .pptx-slide-wrapper'));
      if (slides.length > 0) {
        inheritSource = slides[currentActiveSlideIndex] || slides[slides.length - 1];
      }
    }

    let inheritedTransition = 'none';
    let inheritedBg = 'background:var(--bg-secondary);';
    let inheritedColor = '';
    let inheritedFont = '';
    let inheritedThemeAttr = '';

    if (inheritSource) {
      const wrapper = inheritSource.closest('.pptx-slide-wrapper') || inheritSource;
      inheritedTransition = wrapper.getAttribute('data-transition') || 'none';
      const card = wrapper.querySelector('.pptx-slide-card') || wrapper;
      if (card) {
        if (card.dataset.theme) inheritedThemeAttr = ` data-theme="${card.dataset.theme}"`;
        if (card.style.background) inheritedBg = `background:${card.style.background};`;
        else if (card.style.backgroundColor) inheritedBg = `background-color:${card.style.backgroundColor};`;
        if (card.style.color) inheritedColor = `color:${card.style.color};`;
        if (card.style.fontFamily) inheritedFont = `font-family:${card.style.fontFamily};`;
      }
    }

    let bodyContent = `<p class="slide-placeholder-text" style="color:var(--text-muted);font-style:italic;margin:0;">Empty slide. Click here or use the "+" button at top-right to add rectangle, shapes, or bullet points...</p>`;
    if (layout === 'title') {
      bodyContent = `<div class="slide-title-box" contenteditable="true" style="font-size:32px;font-weight:700;color:var(--text-primary);text-align:center;padding:24px 16px 8px;min-height:50px;">Presentation Title</div><div class="slide-content-box" contenteditable="true" style="font-size:18px;color:var(--text-muted);text-align:center;padding:8px 16px;min-height:36px;">Subtitle / Presenter Name</div>`;
    } else if (layout === 'title-box') {
      bodyContent = `<div class="slide-title-box" contenteditable="true" style="font-size:26px;font-weight:700;color:var(--text-primary);border:1.5px dashed var(--border);border-radius:6px;padding:12px 16px;margin-bottom:18px;min-height:50px;">Click to add Title</div><div class="slide-content-box" contenteditable="true" style="font-size:16px;line-height:1.6;color:var(--text-secondary);border:1.5px dashed var(--border);border-radius:6px;padding:16px;min-height:180px;">Click to add text, bullet points, or paste content...</div>`;
    } else if (layout === 'split') {
      bodyContent = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:12px 0;min-height:220px;"><div class="slide-freeform-rect" contenteditable="true" style="border:1.5px dashed var(--border);border-radius:8px;padding:16px;"><h4>Left Column</h4><p>Click to edit...</p></div><div class="slide-freeform-rect" contenteditable="true" style="border:1.5px dashed var(--border);border-radius:8px;padding:16px;"><h4>Right Column</h4><p>Click to edit...</p></div></div>`;
    } else if (layout === 'cards') {
      bodyContent = `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin:12px 0;min-height:180px;"><div class="slide-nested-card" contenteditable="true" style="border:1px solid var(--border);border-radius:8px;padding:14px;"><h4>Card 1</h4><p>Details...</p></div><div class="slide-nested-card" contenteditable="true" style="border:1px solid var(--border);border-radius:8px;padding:14px;"><h4>Card 2</h4><p>Details...</p></div><div class="slide-nested-card" contenteditable="true" style="border:1px solid var(--border);border-radius:8px;padding:14px;"><h4>Card 3</h4><p>Details...</p></div></div>`;
    } else if (layout === 'section-header') {
      bodyContent = `<div style="margin:auto 0;text-align:left;padding:24px 20px;"><div class="slide-title-box" contenteditable="true" style="font-size:36px;font-weight:800;color:var(--text-primary);margin-bottom:12px;border-bottom:3px solid var(--accent);padding-bottom:10px;">Section Header</div><div class="slide-content-box" contenteditable="true" style="font-size:18px;color:var(--text-muted);line-height:1.5;">Section description or chapter summary...</div></div>`;
    } else if (layout === 'comparison') {
      bodyContent = `<div class="slide-title-box" contenteditable="true" style="font-size:26px;font-weight:700;color:var(--text-primary);border-bottom:2px solid var(--border);padding-bottom:10px;margin-bottom:16px;">Comparison</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;flex:1;"><div style="display:flex;flex-direction:column;gap:8px;"><div contenteditable="true" style="font-size:18px;font-weight:700;color:var(--accent);padding:4px 8px;border-bottom:1.5px solid var(--border);">Option A</div><div contenteditable="true" style="flex:1;border:1.5px dashed var(--border);border-radius:6px;padding:12px;font-size:15px;line-height:1.5;">Points for Option A...</div></div><div style="display:flex;flex-direction:column;gap:8px;"><div contenteditable="true" style="font-size:18px;font-weight:700;color:var(--accent);padding:4px 8px;border-bottom:1.5px solid var(--border);">Option B</div><div contenteditable="true" style="flex:1;border:1.5px dashed var(--border);border-radius:6px;padding:12px;font-size:15px;line-height:1.5;">Points for Option B...</div></div></div>`;
    } else if (layout === 'title-only') {
      bodyContent = `<div class="slide-title-box" contenteditable="true" style="font-size:28px;font-weight:700;color:var(--text-primary);border-bottom:2px solid var(--border);padding-bottom:10px;margin-bottom:16px;">Click to add Title</div><div style="flex:1;min-height:220px;" contenteditable="true"><p style="color:var(--text-muted);font-style:italic;">Click to add content or objects...</p></div>`;
    } else if (layout === 'content-caption') {
      bodyContent = `<div style="display:grid;grid-template-columns:1.8fr 1fr;gap:24px;flex:1;align-items:stretch;"><div contenteditable="true" style="border:1.5px dashed var(--border);border-radius:8px;padding:20px;font-size:16px;line-height:1.6;display:flex;align-items:center;justify-content:center;background:var(--bg-tertiary);"><i class="fas fa-chart-pie" style="font-size:48px;color:var(--text-muted);opacity:0.6;"></i></div><div style="display:flex;flex-direction:column;justify-content:center;"><div contenteditable="true" style="font-size:24px;font-weight:700;color:var(--text-primary);margin-bottom:10px;">Content Title</div><div contenteditable="true" style="font-size:15px;color:var(--text-secondary);line-height:1.6;">Detailed caption or explanatory notes describing the visual...</div></div></div>`;
    } else if (layout === 'picture-caption') {
      bodyContent = `<div style="display:flex;flex-direction:column;flex:1;gap:14px;"><div contenteditable="true" style="flex:1;min-height:220px;border:2px dashed var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center;background:var(--bg-tertiary);"><i class="fas fa-image" style="font-size:48px;color:var(--text-muted);opacity:0.5;"></i><span style="margin-left:12px;font-size:14px;color:var(--text-muted);">Click to insert or drag image</span></div><div><div contenteditable="true" style="font-size:20px;font-weight:700;color:var(--text-primary);margin-bottom:4px;">Picture Title</div><div contenteditable="true" style="font-size:14px;color:var(--text-muted);">Picture caption and credits...</div></div></div>`;
    } else if (layout === 'quote-slide') {
      bodyContent = `<div style="margin:auto 0;text-align:center;padding:24px;"><i class="fas fa-quote-left" style="font-size:36px;color:var(--accent);opacity:0.4;margin-bottom:16px;display:block;"></i><blockquote contenteditable="true" style="font-size:26px;font-style:italic;line-height:1.5;color:var(--text-primary);margin:0 0 16px;font-family:Georgia,serif;">"Type your impactful quote or key message here..."</blockquote><div contenteditable="true" style="font-size:16px;font-weight:700;color:var(--text-secondary);letter-spacing:1px;text-transform:uppercase;">— Author Name, Title</div></div>`;
    }

    return `
      <div class="pptx-slide-wrapper" data-transition="${inheritedTransition}" style="position:relative;margin:28px auto;max-width:850px;">
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
            <button class="slide-plus-menu-item" data-action="layout-title-box"><i class="fas fa-table-cells-large" style="color:#ea580c;"></i> Title & Box</button>
            <button class="slide-plus-menu-item" data-action="layout-blank"><i class="fas fa-square" style="color:#94a3b8;"></i> Blank Canvas</button>
            <button class="slide-plus-menu-item" data-action="layout-split"><i class="fas fa-columns" style="color:#f59e0b;"></i> Split 2 Columns</button>
            <button class="slide-plus-menu-item" data-action="layout-cards"><i class="fas fa-table-cells-large" style="color:#06b6d4;"></i> 3 Card Blocks</button>
            <div class="slide-plus-menu-sep"></div>
            <button class="slide-plus-menu-item" data-action="bg-image"><i class="fas fa-image" style="color:#10b981;"></i> Background Image</button>
            <div class="slide-plus-menu-sep"></div>
            <button class="slide-plus-menu-item slide-plus-next-btn" data-action="add-next-slide"><i class="fas fa-circle-plus" style="color:#ea580c;"></i> Add Next Slide</button>
          </div>
        </div>
        <div class="pptx-slide-card"${inheritedThemeAttr} contenteditable="true" style="aspect-ratio:16/9;width:100%;max-width:850px;height:520px;max-height:520px;overflow:hidden;${inheritedBg}${inheritedColor}${inheritedFont}border:1px solid var(--border);border-radius:12px;padding:36px;box-shadow:var(--shadow-md);outline:none;position:relative;box-sizing:border-box;word-break:break-word;overflow-wrap:break-word;display:flex;flex-direction:column;">
          ${bodyContent}
        </div>
      </div><p><br></p>`;
  }

  function insertPptSlide(isNested = false, layout = 'blank') {
    if (window.DocFlow.currentMode !== 'edit') {
      showToast('Open a document in edit mode first', 'info');
      return;
    }
    if (!isPptxDocument()) {
      showToast('PPT slides can only be added to PowerPoint (.pptx) documents', 'warning');
      return;
    }

    const sel = window.getSelection();
    let parentWrapper = null;
    if (sel && sel.rangeCount) {
      let node = sel.getRangeAt(0).commonAncestorContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      parentWrapper = node.closest('.pptx-slide-wrapper') || node.closest('.pptx-slide-card');
    }
    const slides = Array.from(document.querySelectorAll('#editor .pptx-slide-wrapper'));
    if (!parentWrapper && slides.length > 0) {
      parentWrapper = slides[currentActiveSlideIndex] || slides[slides.length - 1];
    }

    window.DocFlow.Editor?.saveSnapshot?.();

    if (!isNested && parentWrapper) {
      const topWrapper = parentWrapper.closest('.pptx-slide-wrapper') || parentWrapper;
      const slidesList = Array.from(document.querySelectorAll('#editor .pptx-slide-wrapper'));
      const curIdx = slidesList.indexOf(topWrapper);
      topWrapper.insertAdjacentHTML('afterend', createEmptySlideHtml(layout, topWrapper));
      window.DocFlow.Editor?.notifyChange();
      updatePptSidebar();
      selectPptSlide(curIdx >= 0 ? curIdx + 1 : currentActiveSlideIndex + 1);
      showToast('New Presentation Slide added (inherited theme & layout)', 'success');
    } else if (isNested && parentWrapper) {
      const card = parentWrapper.querySelector('.pptx-slide-card') || parentWrapper;
      clearSlidePlaceholder(card);
      card.insertAdjacentHTML('beforeend', `
        <div class="slide-nested-card" contenteditable="true" style="border:1px solid var(--border);border-radius:8px;padding:18px;margin:12px 0;background:var(--bg-primary);box-shadow:var(--shadow-sm);">
          <h4 style="margin:0 0 8px;color:var(--text-primary);font-size:16px;">Nested Card Title</h4>
          <p style="margin:0;color:var(--text-secondary);font-size:14px;">Nested card content...</p>
        </div><p><br></p>`);
      window.DocFlow.Editor?.notifyChange();
      showToast('Nested Slide Card added (Inside)', 'success');
    } else {
      const editor = $('#editor');
      if (editor) {
        editor.insertAdjacentHTML('beforeend', createEmptySlideHtml(layout, parentWrapper));
        window.DocFlow.Editor?.notifyChange();
        updatePptSidebar();
        const count = editor.querySelectorAll('.pptx-slide-wrapper').length;
        selectPptSlide(Math.max(0, count - 1));
        showToast('Presentation slide inserted (inherited theme)', 'success');
      }
    }
  }

  function clearSlidePlaceholder(slideCard) {
    if (!slideCard) return;
    const hint = slideCard.querySelector('.slide-placeholder-text');
    if (hint) {
      hint.remove();
      if (!slideCard.innerHTML.trim() || slideCard.innerHTML === '<p></p>') {
        slideCard.innerHTML = '<p><br></p>';
      }
      window.DocFlow.Editor?.notifyChange();
    }
  }

  function setupSlideInteractions() {
    const editor = $('#editor');
    if (!editor) return;

    editor.addEventListener('click', e => {
      const plusBtn = e.target.closest('.slide-plus-action-btn');
      if (plusBtn) {
        e.preventDefault();
        e.stopPropagation();
        const actionBar = plusBtn.closest('.slide-quick-action-bar');
        const menu = actionBar?.querySelector('.slide-plus-menu');
        document.querySelectorAll('.slide-plus-menu.open').forEach(m => {
          if (m !== menu) m.classList.remove('open');
        });
        if (menu) menu.classList.toggle('open');
        return;
      }

      const menuItem = e.target.closest('.slide-plus-menu-item, .slide-shape-quick-btn');
      if (menuItem) {
        e.preventDefault();
        e.stopPropagation();
        const wrapper = menuItem.closest('.pptx-slide-wrapper');
        const slideCard = wrapper?.querySelector('.pptx-slide-card');
        const menu = menuItem.closest('.slide-plus-menu');
        if (menu) menu.classList.remove('open');
        if (!slideCard) return;

        handleSlideAction(menuItem, wrapper, slideCard);
        return;
      }

      if (!e.target.closest('.slide-quick-action-bar')) {
        document.querySelectorAll('.slide-plus-menu.open').forEach(m => m.classList.remove('open'));
      }
    });

    // Instant placeholder removal on any user interaction with slide cards (Issue 4)
    editor.addEventListener('pointerdown', e => {
      if (isPptxDocument()) {
        const slideCard = e.target.closest('.pptx-slide-card');
        if (slideCard) {
          clearSlidePlaceholder(slideCard);
          return;
        }
        if (e.target.closest('.slide-quick-action-bar') || e.target.closest('.slide-speaker-notes') || e.target.closest('#pptxSlideSidebar')) {
          return;
        }
        // Clicked outside slide in PPT deck: prevent caret placement outside slide cards
        e.preventDefault();
        const slides = Array.from(editor.querySelectorAll('.pptx-slide-wrapper'));
        const curSlide = slides[currentActiveSlideIndex] || slides[0];
        const focusTarget = curSlide?.querySelector('.slide-title-box, .slide-content-box, [contenteditable="true"]') || curSlide?.querySelector('.pptx-slide-card');
        if (focusTarget) {
          focusTarget.focus();
          clearSlidePlaceholder(focusTarget.closest('.pptx-slide-card'));
        }
      }
    });

    editor.addEventListener('focusin', e => {
      const slideCard = e.target.closest('.pptx-slide-card');
      if (slideCard) {
        clearSlidePlaceholder(slideCard);
      }
    });

    editor.addEventListener('beforeinput', e => {
      if (isPptxDocument()) {
        const slideCard = e.target.closest('.pptx-slide-card');
        if (!slideCard) {
          // Block typing outside slide boundaries in PPT presentation mode (Issue 1)
          if (!e.target.closest('.slide-speaker-notes') && !e.target.closest('input, textarea')) {
            e.preventDefault();
            const slides = Array.from(editor.querySelectorAll('.pptx-slide-wrapper'));
            const curSlide = slides[currentActiveSlideIndex] || slides[0];
            const targetCard = curSlide?.querySelector('.pptx-slide-card') || curSlide;
            const targetBox = targetCard?.querySelector('.slide-content-box, .pptx-slide-body, .slide-title-box, [contenteditable="true"]') || targetCard;
            if (targetBox) {
              targetBox.focus();
              clearSlidePlaceholder(targetCard);
              showToast('Please type inside the slide boundaries', 'warning');
            }
            return;
          }
        }

        if (slideCard) {
          clearSlidePlaceholder(slideCard);
          // Prevent typing if slide boundary is reached (Issue 1)
          if (e.inputType && (e.inputType.startsWith('insert') || e.inputType === 'formatIndent')) {
            if (slideCard.scrollHeight > (slideCard.clientHeight + 2)) {
              autoFitSlideText(slideCard, false);
              if (slideCard.scrollHeight > (slideCard.clientHeight + 2)) {
                e.preventDefault();
                checkSlideOverflow(slideCard, true);
                return;
              }
            }
          }
        }
      }
    });

    editor.addEventListener('beforeinput', e => {
      if (e.data && (e.inputType === 'insertText' || e.inputType === 'insertReplacementText')) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount) {
          const range = sel.getRangeAt(0);
          const node = range.startContainer;
          const mark = (node.nodeType === Node.TEXT_NODE ? node.parentElement : node)?.closest?.('.df-comment-highlight');
          if (mark) {
            const isAtEnd = (node.nodeType === Node.TEXT_NODE && range.startOffset >= node.textContent.length && !node.nextSibling) ||
                            (node === mark && range.startOffset >= mark.childNodes.length);
            if (isAtEnd) {
              e.preventDefault();
              let nextText = mark.nextSibling;
              if (!nextText || nextText.nodeType !== Node.TEXT_NODE) {
                nextText = document.createTextNode('');
                mark.parentNode.insertBefore(nextText, mark.nextSibling);
              }
              const oldVal = nextText.textContent || '';
              nextText.textContent = e.data + oldVal;
              const newRange = document.createRange();
              newRange.setStart(nextText, e.data.length);
              newRange.collapse(true);
              sel.removeAllRanges();
              sel.addRange(newRange);
              window.DocFlow.Editor?.notifyChange?.();
            }
          }
        }
      }
    });

    editor.addEventListener('keydown', e => {
      const slideCard = e.target.closest('.pptx-slide-card');
      if (isPptxDocument()) {
        if (!slideCard && !e.target.closest('.slide-speaker-notes') && !e.target.closest('input, textarea')) {
          if (e.key.length === 1 || e.key === 'Enter') {
            e.preventDefault();
            const slides = Array.from(editor.querySelectorAll('.pptx-slide-wrapper'));
            const curSlide = slides[currentActiveSlideIndex] || slides[0];
            const targetCard = curSlide?.querySelector('.pptx-slide-card') || curSlide;
            const targetBox = targetCard?.querySelector('.slide-content-box, .pptx-slide-body, .slide-title-box, [contenteditable="true"]') || targetCard;
            if (targetBox) {
              targetBox.focus();
              clearSlidePlaceholder(targetCard);
              showToast('Please type inside the slide boundaries', 'warning');
            }
            return;
          }
        }
      }

      if (slideCard) {
        clearSlidePlaceholder(slideCard);
      }

      if (e.key === 'Enter') {
        if (isPptxDocument() && slideCard) {
          if (slideCard.scrollHeight > (slideCard.clientHeight + 2)) {
            autoFitSlideText(slideCard, false);
            if (slideCard.scrollHeight > (slideCard.clientHeight + 2)) {
              e.preventDefault();
              checkSlideOverflow(slideCard, true);
              return;
            }
          }
        }

        const sel = window.getSelection();
        let targetBox = e.target.closest ? e.target.closest('.slide-title-box, .slide-freeform-rect, .slide-nested-card, .slide-content-box, .pptx-slide-title, .pptx-slide-body') : null;
        if (!targetBox && sel && sel.rangeCount) {
          const node = sel.getRangeAt(0).commonAncestorContainer;
          targetBox = (node.nodeType === Node.TEXT_NODE ? node.parentElement : node)?.closest?.(
            '.slide-title-box, .slide-freeform-rect, .slide-nested-card, .slide-content-box, .pptx-slide-title, .pptx-slide-body'
          );
        }

        if (targetBox) {
          e.preventDefault();
          e.stopPropagation();

          if (sel && sel.rangeCount) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            const br = document.createElement('br');
            range.insertNode(br);

            // In contenteditable, if br is at the end, add placeholder so caret can sit on new line
            if (!br.nextSibling) {
              const trailingBr = document.createElement('br');
              trailingBr.className = 'trailing-line-break';
              br.parentNode.appendChild(trailingBr);
            }

            const newRange = document.createRange();
            newRange.setStartAfter(br);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);

            window.DocFlow.Editor?.notifyChange?.();
            targetBox.dispatchEvent(new Event('input', { bubbles: true }));
          }
          return;
        }
      }
    });

    editor.addEventListener('paste', e => {
      if (isPptxDocument()) {
        const slideCard = e.target.closest('.pptx-slide-card');
        if (!slideCard && !e.target.closest('.slide-speaker-notes') && !e.target.closest('input, textarea')) {
          e.preventDefault();
          showToast('Please paste inside the slide boundaries', 'warning');
          return;
        }
        if (slideCard) {
          clearSlidePlaceholder(slideCard);
          setTimeout(() => {
            if (slideCard.scrollHeight > (slideCard.clientHeight + 2)) {
              autoFitSlideText(slideCard, false);
            }
            checkSlideOverflow(slideCard, true);
          }, 30);
        }
      }
    });

    editor.addEventListener('input', e => {
      if (isPptxDocument()) {
        const slideCard = e.target.closest('.pptx-slide-card');
        if (slideCard) {
          if (slideCard.scrollHeight > (slideCard.clientHeight + 2)) {
            autoFitSlideText(slideCard, false);
          }
          checkSlideOverflow(slideCard, true);
        }
      }
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('.slide-quick-action-bar')) {
        document.querySelectorAll('.slide-plus-menu.open').forEach(m => m.classList.remove('open'));
      }
    });

    // Keyboard Arrow navigation between PPT slides (Issue 5)
    document.addEventListener('keydown', e => {
      if (isPptxDocument()) {
        const activeEl = document.activeElement;
        const isEditingText = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl.isContentEditable && activeEl.closest('.slide-freeform-rect, .slide-nested-card, .slide-title-box, .slide-content-box, p, h1, h2, h3')));
        if (!isEditingText) {
          if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown') {
            e.preventDefault();
            const slides = document.querySelectorAll('#editor .pptx-slide-wrapper');
            if (currentActiveSlideIndex < slides.length - 1) {
              selectPptSlide(currentActiveSlideIndex + 1);
            }
          } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') {
            e.preventDefault();
            if (currentActiveSlideIndex > 0) {
              selectPptSlide(currentActiveSlideIndex - 1);
            }
          }
        }
      }
    });

    // Freeform drag for slide content boxes extending beyond slide boundaries (Issue 1)
    editor.addEventListener('mousedown', e => {
      const box = e.target.closest('.slide-freeform-rect, .slide-nested-card');
      if (!box || !editor.contains(box)) return;

      const rect = box.getBoundingClientRect();
      const isTopHandle = (e.clientY - rect.top) < 18;
      const isBorder = (e.clientX - rect.left) < 12 || (rect.right - e.clientX) < 12 || (rect.bottom - e.clientY) < 12;
      if (!isTopHandle && !isBorder && !e.altKey) return;

      e.preventDefault();
      e.stopPropagation();

      box.setAttribute('data-dragging', 'true');
      const startX = e.clientX;
      const startY = e.clientY;
      const startLeft = parseFloat(box.style.left) || 0;
      const startTop = parseFloat(box.style.top) || 0;

      const slideCard = box.closest('.pptx-slide-card');
      const slideRect = slideCard ? slideCard.getBoundingClientRect() : null;
      const initialBoxRect = box.getBoundingClientRect();

      const onMouseMove = ev => {
        let dx = ev.clientX - startX;
        let dy = ev.clientY - startY;

        // Strictly clamp dragging within slide boundaries (Issue 1)
        if (slideRect) {
          const minDx = (slideRect.left + 14) - initialBoxRect.left;
          const maxDx = (slideRect.right - 14) - initialBoxRect.right;
          dx = Math.max(minDx, Math.min(maxDx, dx));

          const minDy = (slideRect.top + 14) - initialBoxRect.top;
          const maxDy = (slideRect.bottom - 14) - initialBoxRect.bottom;
          dy = Math.max(minDy, Math.min(maxDy, dy));
        }

        box.style.position = 'relative';
        box.style.left = `${startLeft + dx}px`;
        box.style.top = `${startTop + dy}px`;
      };

      const onMouseUp = () => {
        box.removeAttribute('data-dragging');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        window.DocFlow.Editor?.notifyChange();
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    // Add Slide button on PPT Sidebar (Issue 1: Shows dropdown safely on top of editor)
    const pptSidebarAddBtn = $('#pptxSidebarAddBtn');
    const pptSidebarAddPopover = $('#pptxSidebarAddPopover');
    if (pptSidebarAddBtn) {
      pptSidebarAddBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        if (pptSidebarAddPopover) {
          if (pptSidebarAddPopover.classList.contains('show')) {
            pptSidebarAddPopover.classList.remove('show');
          } else {
            if (window.DocFlow?.UI?.positionPopover) {
              window.DocFlow.UI.positionPopover(pptSidebarAddBtn, pptSidebarAddPopover);
            } else {
              pptSidebarAddPopover.classList.add('show');
            }
          }
        } else {
          insertPptSlide(false);
        }
      });
    }

    $$('#pptxSidebarAddPopover .spacing-opt-item[data-ppt-layout]').forEach(item => {
      item.addEventListener('click', e => {
        e.stopPropagation();
        const layout = item.dataset.pptLayout || 'blank';
        insertPptSlide(false, layout);
        pptSidebarAddPopover?.classList.remove('show');
      });
    });

    // Directly click slide inside editor to activate it and select its thumbnail
    editor.addEventListener('click', e => {
      const wrapper = e.target.closest('.pptx-slide-wrapper');
      if (wrapper && !e.target.closest('.slide-plus-action-btn, .slide-plus-menu')) {
        const allWrappers = Array.from(editor.querySelectorAll('.pptx-slide-wrapper'));
        const idx = allWrappers.indexOf(wrapper);
        if (idx !== -1 && idx !== currentActiveSlideIndex) {
          selectPptSlide(idx);
        }
      }
    });
  }

  function handleSlideAction(item, wrapper, slideCard) {
    slideCard.querySelector('.slide-placeholder-text')?.remove();

    const action = item.dataset.action;
    const shape = item.dataset.shape;

    if (action === 'rect') {
      const rectHtml = `<div class="slide-freeform-rect" contenteditable="true" style="border:1.5px dashed var(--accent, #ea580c);border-radius:8px;padding:16px;margin:12px 0;background:var(--bg-tertiary);min-height:50px;">Rectangle Box (Click to edit text)</div><p><br></p>`;
      slideCard.insertAdjacentHTML('beforeend', rectHtml);
      window.DocFlow.Editor?.notifyChange();
      showToast('Rectangle added to slide', 'success');
    } else if (action === 'nested-rect') {
      const nestedHtml = `<div class="slide-nested-card" contenteditable="true" style="border:1px solid var(--border);border-radius:8px;padding:18px;margin:12px 0;background:var(--bg-primary);box-shadow:var(--shadow-sm);"><h4 style="margin:0 0 8px;color:var(--text-primary);font-size:16px;">Nested Card Title</h4><p style="margin:0;color:var(--text-secondary);font-size:14px;">Nested card content...</p></div><p><br></p>`;
      slideCard.insertAdjacentHTML('beforeend', nestedHtml);
      window.DocFlow.Editor?.notifyChange();
      showToast('Nested Card added to slide', 'success');
    } else if (action === 'bullets') {
      const bulletsHtml = `<ul style="margin:12px 0 12px 24px;color:var(--text-primary);font-size:15px;line-height:1.7;"><li contenteditable="true">Presentation Key Point 1</li><li contenteditable="true">Presentation Key Point 2</li><li contenteditable="true">Presentation Key Point 3</li></ul><p><br></p>`;
      slideCard.insertAdjacentHTML('beforeend', bulletsHtml);
      window.DocFlow.Editor?.notifyChange();
      showToast('Bullet points added to slide', 'success');
    } else if (shape) {
      const fill = '#ea580c';
      const stroke = '#c2410c';
      const svg = window.DocFlow.ImageManager?.getShapeSvg ? window.DocFlow.ImageManager.getShapeSvg(shape, fill, stroke, 2, 100) : '';
      const shapeHtml = `<div class="doc-shape-container" contenteditable="false" style="display:inline-block;margin:12px;cursor:pointer;">${svg}</div>`;
      slideCard.insertAdjacentHTML('beforeend', shapeHtml);
      const inserted = slideCard.querySelector('.doc-shape-container:last-of-type');
      if (inserted) {
        window.DocFlow.ImageManager?.attachShapeListeners(inserted);
        window.DocFlow.ImageManager?.selectImage(inserted);
      }
      window.DocFlow.Editor?.notifyChange();
      showToast(`Shape (${shape}) added to slide`, 'success');
    } else if (action === 'layout-title-box') {
      slideCard.innerHTML = `
        <div class="slide-title-box" contenteditable="true" style="font-size:26px;font-weight:700;color:var(--text-primary);border:1.5px dashed var(--border);border-radius:6px;padding:12px 16px;margin-bottom:18px;min-height:50px;">Click to add Title</div>
        <div class="slide-content-box" contenteditable="true" style="font-size:16px;line-height:1.6;color:var(--text-secondary);border:1.5px dashed var(--border);border-radius:6px;padding:16px;min-height:180px;">Click to add text, bullet points, or paste content...</div>
        <p><br></p>`;
      window.DocFlow.Editor?.notifyChange();
      updatePptSidebar();
      showToast('Title & Box layout applied', 'success');
    } else if (action === 'layout-blank') {
      slideCard.innerHTML = '<p><br></p>';
      window.DocFlow.Editor?.notifyChange();
      updatePptSidebar();
      showToast('Blank canvas applied', 'info');
    } else if (action === 'layout-split') {
      slideCard.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:12px 0;min-height:220px;"><div class="slide-freeform-rect" contenteditable="true" style="border:1.5px dashed var(--border);border-radius:8px;padding:16px;"><h4>Left Column</h4><p>Click to edit...</p></div><div class="slide-freeform-rect" contenteditable="true" style="border:1.5px dashed var(--border);border-radius:8px;padding:16px;"><h4>Right Column</h4><p>Click to edit...</p></div></div><p><br></p>`;
      window.DocFlow.Editor?.notifyChange();
      updatePptSidebar();
      showToast('2-Column split layout applied', 'success');
    } else if (action === 'layout-cards') {
      slideCard.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin:12px 0;min-height:180px;"><div class="slide-nested-card" contenteditable="true" style="border:1px solid var(--border);border-radius:8px;padding:14px;"><h4>Card 1</h4><p>Details...</p></div><div class="slide-nested-card" contenteditable="true" style="border:1px solid var(--border);border-radius:8px;padding:14px;"><h4>Card 2</h4><p>Details...</p></div><div class="slide-nested-card" contenteditable="true" style="border:1px solid var(--border);border-radius:8px;padding:14px;"><h4>Card 3</h4><p>Details...</p></div></div><p><br></p>`;
      window.DocFlow.Editor?.notifyChange();
      updatePptSidebar();
      showToast('3-Card grid layout applied', 'success');
    } else if (action === 'bg-image') {
      $('#pptBgFileInput')?.click();
    } else if (action === 'add-next-slide') {
      wrapper.insertAdjacentHTML('afterend', createEmptySlideHtml());
      window.DocFlow.Editor?.notifyChange();
      updatePptSidebar();
      selectPptSlide(currentActiveSlideIndex + 1);
      showToast('New Presentation Slide added below', 'success');
    }
  }

  // ==========================================================================
  // Excel Toolbar Actions (Issue 7)
  // ==========================================================================
  function insertExcelSheetTable(rows = 6, cols = 5) {
    let colHeaders = '';
    for (let c = 0; c < cols; c++) {
      colHeaders += `<th style="background:var(--bg-tertiary);border:1px solid var(--border);padding:6px 10px;font-size:12px;font-weight:700;text-align:center;">${String.fromCharCode(65 + c)}</th>`;
    }
    let bodyRows = '';
    for (let r = 1; r <= rows; r++) {
      let cells = `<td style="background:var(--bg-tertiary);border:1px solid var(--border);padding:4px 8px;font-size:11px;font-weight:700;text-align:center;user-select:none;">${r}</td>`;
      for (let c = 0; c < cols; c++) {
        cells += `<td style="border:1px solid var(--border);padding:6px 10px;min-width:60px;min-height:22px;" contenteditable="true"></td>`;
      }
      bodyRows += `<tr>${cells}</tr>`;
    }
    const tableHtml = `
      <div class="excel-table-container" style="overflow-x:auto;margin:16px 0;">
        <table class="df-excel-table" style="border-collapse:collapse;width:100%;min-width:400px;background:var(--bg-primary);border:1px solid var(--border);">
          <thead><tr><th style="background:var(--bg-tertiary);border:1px solid var(--border);width:36px;">#</th>${colHeaders}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div><p><br></p>`;
    window.DocFlow.Editor?.insertHtmlAtCursor(tableHtml);
    window.DocFlow.Editor?.notifyChange();
    showToast('Spreadsheet Table inserted', 'success');
  }

  function getActiveTableCell() {
    if (window._activeExcelCell && document.body.contains(window._activeExcelCell)) {
      return window._activeExcelCell;
    }
    const selected = document.querySelector('.excel-spreadsheet-container td.excel-cell-selected');
    if (selected) {
      window._activeExcelCell = selected;
      return selected;
    }
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      let node = sel.getRangeAt(0).commonAncestorContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      const cell = node?.closest('td, th');
      if (cell) {
        if (cell.tagName === 'TD') window._activeExcelCell = cell;
        return cell;
      }
    }
    const firstCell = document.querySelector('.excel-spreadsheet-container tbody td');
    if (firstCell) {
      window._activeExcelCell = firstCell;
      return firstCell;
    }
    return null;
  }

  function getExcelColLetter(index) {
    let letter = '';
    let temp = index;
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  }

  function renumberExcelTable(table) {
    if (!table) return;
    const theadTr = table.querySelector('thead tr');
    if (theadTr) {
      const ths = Array.from(theadTr.children);
      let colIdx = 0;
      ths.forEach((th, idx) => {
        if (th.classList.contains('excel-corner') || idx === 0) {
          th.textContent = '';
        } else {
          const letter = getExcelColLetter(colIdx);
          th.textContent = letter;
          th.dataset.col = colIdx;
          colIdx++;
        }
      });
    }

    const tbody = table.querySelector('tbody') || table;
    const rows = Array.from(tbody.querySelectorAll('tr'));
    rows.forEach((tr, rIdx) => {
      const rowHdr = tr.querySelector('.excel-row-hdr') || (tr.firstElementChild && tr.firstElementChild.tagName === 'TH' ? tr.firstElementChild : null);
      if (rowHdr) {
        rowHdr.textContent = rIdx + 1;
        rowHdr.dataset.row = rIdx + 1;
      }
      const dataCells = Array.from(tr.querySelectorAll('td'));
      dataCells.forEach((td, cIdx) => {
        const coord = `${getExcelColLetter(cIdx)}${rIdx + 1}`;
        td.dataset.coord = coord;
      });
    });
    updateExcelChartPositions(table.closest('.excel-spreadsheet-container'));
  }

  function restoreCellFocus(preferredCell) {
    setTimeout(() => {
      const table = document.querySelector('.excel-grid-table') || document.querySelector('#editor table');
      if (!table) return;
      let target = preferredCell;
      if (!target || !document.body.contains(target) || target.tagName !== 'TD') {
        target = table.querySelector('td.excel-cell-selected') || table.querySelector('tbody tr td') || window._activeExcelCell;
      }
      if (target && document.body.contains(target)) {
        target.focus();
        window._activeExcelCell = target;
        const coordBox = document.querySelector('.excel-coord-box');
        if (coordBox && target.dataset.coord) {
          coordBox.value = target.dataset.coord;
        }
      }
    }, 20);
  }

  function handleExcelTableAction(action) {
    const cell = getActiveTableCell();
    const table = cell ? cell.closest('table') : document.querySelector('#editor table');
    if (!table) {
      if (action === 'insert-grid') insertExcelSheetTable();
      else showToast('Click inside a spreadsheet table first', 'info');
      return;
    }

    const theadTr = table.querySelector('thead tr');
    const tbody = table.querySelector('tbody') || table;

    if (action === 'add-row-below' || action === 'add-row-above') {
      window.DocFlow.Editor?.saveSnapshot?.();
      const targetRow = cell ? cell.closest('tr') : tbody.querySelector('tr:last-child');
      if (targetRow) {
        const newRow = document.createElement('tr');
        const rowHdr = document.createElement('th');
        rowHdr.className = 'excel-row-hdr';
        rowHdr.contentEditable = 'false';
        newRow.appendChild(rowHdr);

        const colCount = theadTr ? theadTr.querySelectorAll('th:not(.excel-corner)').length : targetRow.querySelectorAll('td').length;
        for (let c = 0; c < Math.max(1, colCount); c++) {
          const td = document.createElement('td');
          td.contentEditable = 'true';
          newRow.appendChild(td);
        }

        if (action === 'add-row-above') {
          targetRow.insertAdjacentElement('beforebegin', newRow);
        } else {
          targetRow.insertAdjacentElement('afterend', newRow);
        }

        renumberExcelTable(table);
        setupExcelInteractions();
        window.DocFlow.Editor?.notifyChange();
        showToast('Row inserted', 'success');
        restoreCellFocus(newRow.querySelector('td'));
      }
    } else if (action === 'delete-row') {
      window.DocFlow.Editor?.saveSnapshot?.();
      const selectedRows = Array.from(table.querySelectorAll('tr.excel-row-selected'));
      let fallbackCell = null;
      if (selectedRows.length > 0) {
        const lastRow = selectedRows[selectedRows.length - 1];
        const nextRow = lastRow.nextElementSibling || selectedRows[0].previousElementSibling;
        fallbackCell = nextRow?.querySelector('td');
        selectedRows.forEach(r => r.remove());
        renumberExcelTable(table);
        window.DocFlow.Editor?.notifyChange();
        showToast(`Deleted ${selectedRows.length} row(s)`, 'success');
      } else {
        const row = cell?.closest('tr');
        if (row && tbody.querySelectorAll('tr').length > 1) {
          const adjacent = row.nextElementSibling || row.previousElementSibling;
          const cIdx = cell ? cell.cellIndex : 1;
          fallbackCell = adjacent ? (adjacent.children[cIdx] || adjacent.querySelector('td')) : null;
          row.remove();
          renumberExcelTable(table);
          window.DocFlow.Editor?.notifyChange();
          showToast('Row deleted', 'info');
        } else {
          showToast('Table must have at least one row', 'warning');
          fallbackCell = cell;
        }
      }
      setupExcelInteractions();
      restoreCellFocus(fallbackCell);
    } else if (action === 'add-col-right' || action === 'add-col-left') {
      window.DocFlow.Editor?.saveSnapshot?.();
      const colIdx = cell ? (cell.cellIndex - 1) : 0;
      const insertIdx = action === 'add-col-left' ? Math.max(0, colIdx) : (colIdx + 1);

      if (theadTr) {
        const targetTh = theadTr.children[insertIdx + 1];
        const newTh = document.createElement('th');
        newTh.className = 'excel-col-hdr';
        newTh.contentEditable = 'false';
        if (targetTh) theadTr.insertBefore(newTh, targetTh);
        else theadTr.appendChild(newTh);
      }

      Array.from(tbody.querySelectorAll('tr')).forEach(r => {
        const targetTd = r.children[insertIdx + 1];
        const newTd = document.createElement('td');
        newTd.contentEditable = 'true';
        if (targetTd) r.insertBefore(newTd, targetTd);
        else r.appendChild(newTd);
      });

      renumberExcelTable(table);
      setupExcelInteractions();
      window.DocFlow.Editor?.notifyChange();
      showToast('Column inserted', 'success');
      restoreCellFocus(tbody.querySelector('tr')?.children[insertIdx + 1]);
    } else if (action === 'delete-col') {
      window.DocFlow.Editor?.saveSnapshot?.();
      const selectedColHeaders = Array.from(table.querySelectorAll('th.excel-col-selected'));
      let fallbackCell = null;
      if (selectedColHeaders.length > 0) {
        const colIndices = selectedColHeaders.map(th => Array.from(th.parentElement.children).indexOf(th)).filter(idx => idx > 0);
        colIndices.sort((a, b) => b - a);

        const firstCol = Math.min(...colIndices);
        const adjacentColIdx = Math.max(1, firstCol - 1);
        const sampleRow = tbody.querySelector('tr');
        fallbackCell = sampleRow?.children[adjacentColIdx];

        colIndices.forEach(idx => {
          if (theadTr && theadTr.children[idx]) theadTr.children[idx].remove();
          Array.from(tbody.querySelectorAll('tr')).forEach(r => {
            if (r.children[idx]) r.children[idx].remove();
          });
        });

        renumberExcelTable(table);
        window.DocFlow.Editor?.notifyChange();
        showToast(`Deleted ${colIndices.length} column(s)`, 'success');
      } else if (cell) {
        const cellColIdx = cell.cellIndex;
        if (cellColIdx > 0 && Array.from(tbody.querySelectorAll('tr'))[0]?.children.length > 2) {
          const targetColIdx = Math.max(1, cellColIdx - 1);
          const sampleRow = cell.closest('tr') || tbody.querySelector('tr');
          fallbackCell = sampleRow?.children[targetColIdx];

          if (theadTr && theadTr.children[cellColIdx]) theadTr.children[cellColIdx].remove();
          Array.from(tbody.querySelectorAll('tr')).forEach(r => {
            if (r.children[cellColIdx]) r.children[cellColIdx].remove();
          });
          renumberExcelTable(table);
          window.DocFlow.Editor?.notifyChange();
          showToast('Column deleted', 'info');
        } else {
          showToast('Table must have at least one column', 'warning');
          fallbackCell = cell;
        }
      }
      setupExcelInteractions();
      restoreCellFocus(fallbackCell);
    } else if (action === 'merge') {
      const selectedCells = Array.from(table.querySelectorAll('td.excel-cell-selected'));
      if (selectedCells.length < 2) {
        showToast('Please select at least 2 cells, a row, or a column to merge', 'warning');
        restoreCellFocus(cell);
        return;
      }
      window.DocFlow.Editor?.saveSnapshot?.();
      const firstCell = selectedCells[0];
      const combinedText = selectedCells.map(c => c.textContent.trim()).filter(Boolean).join(' ');
      firstCell.textContent = combinedText;

      const minRow = Math.min(...selectedCells.map(c => c.closest('tr').rowIndex));
      const maxRow = Math.max(...selectedCells.map(c => c.closest('tr').rowIndex));
      const minCol = Math.min(...selectedCells.map(c => c.cellIndex));
      const maxCol = Math.max(...selectedCells.map(c => c.cellIndex));

      firstCell.colSpan = Math.max(1, maxCol - minCol + 1);
      firstCell.rowSpan = Math.max(1, maxRow - minRow + 1);
      firstCell.style.textAlign = 'center';

      selectedCells.slice(1).forEach(c => c.remove());
      table.querySelectorAll('td.excel-cell-selected').forEach(c => c.classList.remove('excel-cell-selected'));
      firstCell.classList.add('excel-cell-selected');

      renumberExcelTable(table);
      setupExcelInteractions();
      window.DocFlow.Editor?.notifyChange();
      showToast(`Merged ${selectedCells.length} cells`, 'success');
      restoreCellFocus(firstCell);
    } else if (action === 'unmerge') {
      window.DocFlow.Editor?.saveSnapshot?.();
      const targetCell = (cell && (cell.colSpan > 1 || cell.rowSpan > 1)) ? cell : table.querySelector('td[colspan], td[rowspan]');
      if (targetCell && ((targetCell.colSpan && targetCell.colSpan > 1) || (targetCell.rowSpan && targetCell.rowSpan > 1))) {
        const cSpan = targetCell.colSpan || 1;
        const rSpan = targetCell.rowSpan || 1;
        targetCell.colSpan = 1;
        targetCell.rowSpan = 1;

        for (let i = 1; i < cSpan; i++) {
          const newTd = document.createElement('td');
          newTd.contentEditable = 'true';
          targetCell.insertAdjacentElement('afterend', newTd);
        }

        if (rSpan > 1) {
          const tr = targetCell.closest('tr');
          let nextTr = tr.nextElementSibling;
          for (let r = 1; r < rSpan && nextTr; r++) {
            for (let c = 0; c < cSpan; c++) {
              const newTd = document.createElement('td');
              newTd.contentEditable = 'true';
              nextTr.appendChild(newTd);
            }
            nextTr = nextTr.nextElementSibling;
          }
        }

        renumberExcelTable(table);
        setupExcelInteractions();
        window.DocFlow.Editor?.notifyChange();
        showToast('Cell split into individual cells', 'success');
        restoreCellFocus(targetCell);
      } else {
        showToast('Active cell is not merged', 'info');
        restoreCellFocus(cell);
      }
    }
  }


  // Formula Coordinate Parsers & Evaluation Engine (Problem 1.7 & 1.8)
  function parseExcelCoord(str) {
    if (!str) return null;
    const m = str.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
    if (!m) return null;
    let colIdx = 0;
    for (let i = 0; i < m[1].length; i++) {
      colIdx = colIdx * 26 + (m[1].charCodeAt(i) - 64);
    }
    return { col: colIdx - 1, row: parseInt(m[2], 10), colStr: m[1] };
  }

  function getExcelCellRawValue(table, coordStr) {
    if (!table || !coordStr) return 0;
    const cleanCoord = coordStr.trim().toUpperCase();
    const target = table.querySelector(`td[data-coord="${cleanCoord}"]`);
    if (target) {
      const txt = target.textContent.trim();
      const num = parseFloat(txt.replace(/[^0-9.-]/g, ''));
      return isNaN(num) ? txt : num;
    }
    const parsed = parseExcelCoord(cleanCoord);
    if (parsed && table.rows[parsed.row]) {
      const td = table.rows[parsed.row].cells[parsed.col + 1];
      if (td) {
        const txt = td.textContent.trim();
        const num = parseFloat(txt.replace(/[^0-9.-]/g, ''));
        return isNaN(num) ? txt : num;
      }
    }
    return 0;
  }

  function getExcelRangeValuesList(table, startCoord, endCoord) {
    const pStart = parseExcelCoord(startCoord);
    const pEnd = parseExcelCoord(endCoord);
    if (!pStart || !pEnd || !table) return [];
    const minCol = Math.min(pStart.col, pEnd.col);
    const maxCol = Math.max(pStart.col, pEnd.col);
    const minRow = Math.min(pStart.row, pEnd.row);
    const maxRow = Math.max(pStart.row, pEnd.row);

    const values = [];
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const colLetter = getExcelColLetter(c);
        const coord = `${colLetter}${r}`;
        values.push(getExcelCellRawValue(table, coord));
      }
    }
    return values;
  }

  function evaluateFormulaExpression(expr, table) {
    if (!expr) return '';
    expr = expr.trim();
    if (expr.startsWith('=')) expr = expr.substring(1).trim();

    // Check function calls: e.g. SUM(A1:B5), AVERAGE(A1:A5), SQRT(A1), etc.
    const fnMatch = expr.match(/^([A-Z]+)\s*\((.*)\)$/i);
    if (fnMatch) {
      const fnName = fnMatch[1].toUpperCase();
      const argsStr = fnMatch[2].trim();
      let values = [];

      if (argsStr.includes(':')) {
        const parts = argsStr.split(':');
        if (parts.length === 2) {
          values = getExcelRangeValuesList(table, parts[0].trim(), parts[1].trim());
        }
      } else if (argsStr.length > 0) {
        const args = argsStr.split(',').map(s => s.trim());
        args.forEach(a => {
          if (/^[A-Z]+\d+$/i.test(a)) {
            values.push(getExcelCellRawValue(table, a));
          } else {
            const num = parseFloat(a);
            values.push(isNaN(num) ? a : num);
          }
        });
      }

      const nums = values.map(v => typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, ''))).filter(v => !isNaN(v));

      switch (fnName) {
        case 'SUM':
          return nums.reduce((a, b) => a + b, 0);
        case 'AVERAGE':
          return nums.length ? Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)) : 0;
        case 'COUNT':
          return nums.length;
        case 'MAX':
          return nums.length ? Math.max(...nums) : 0;
        case 'MIN':
          return nums.length ? Math.min(...nums) : 0;
        case 'PRODUCT':
          return nums.length ? nums.reduce((a, b) => a * b, 1) : 0;
        case 'ROUND': {
          const val = nums[0] !== undefined ? nums[0] : 0;
          const dec = nums[1] !== undefined ? nums[1] : 0;
          const factor = Math.pow(10, dec);
          return Math.round(val * factor) / factor;
        }
        case 'SQRT':
          return nums.length && nums[0] >= 0 ? Number(Math.sqrt(nums[0]).toFixed(4)) : 0;
        case 'ABS':
          return nums.length ? Math.abs(nums[0]) : 0;
        case 'POWER':
          return nums.length >= 2 ? Math.pow(nums[0], nums[1]) : (nums[0] || 0);
        case 'LOG':
          return nums.length && nums[0] > 0 ? Number(Math.log10(nums[0]).toFixed(4)) : 0;
        case 'LN':
          return nums.length && nums[0] > 0 ? Number(Math.log(nums[0]).toFixed(4)) : 0;
        case 'EXP':
          return nums.length ? Number(Math.exp(nums[0]).toFixed(4)) : 0;
        case 'SIN':
          return nums.length ? Number(Math.sin((nums[0] * Math.PI) / 180).toFixed(4)) : 0;
        case 'COS':
          return nums.length ? Number(Math.cos((nums[0] * Math.PI) / 180).toFixed(4)) : 0;
        case 'TAN':
          return nums.length ? Number(Math.tan((nums[0] * Math.PI) / 180).toFixed(4)) : 0;
        case 'PI':
          return Number(Math.PI.toFixed(5));
        case 'MEDIAN': {
          if (!nums.length) return 0;
          const sorted = [...nums].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          return sorted.length % 2 !== 0 ? sorted[mid] : Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
        }
        case 'CEILING':
          return nums.length ? Math.ceil(nums[0]) : 0;
        case 'FLOOR':
          return nums.length ? Math.floor(nums[0]) : 0;
        case 'INT':
          return nums.length ? Math.floor(nums[0]) : 0;
        case 'MOD':
          return nums.length >= 2 && nums[1] !== 0 ? nums[0] % nums[1] : 0;
        case 'CONCAT':
          return values.join(' ');
        case 'UPPER':
          return values.join(' ').toUpperCase();
        case 'LOWER':
          return values.join(' ').toLowerCase();
        default:
          return nums.length ? nums.reduce((a, b) => a + b, 0) : 0;
      }
    }

    // Direct math expressions with cell references (e.g. A1 + B1 * 2)
    let mathExpr = expr.replace(/[A-Z]+\d+/gi, match => {
      const v = getExcelCellRawValue(table, match);
      const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
      return isNaN(n) ? 0 : n;
    });

    if (/^[\d\s+\-*/().%^]+$/.test(mathExpr)) {
      try {
        mathExpr = mathExpr.replace(/\^/g, '**');
        // eslint-disable-next-line no-eval
        const res = Function(`'use strict'; return (${mathExpr})`)();
        if (typeof res === 'number') {
          return Number.isInteger(res) ? res : Number(res.toFixed(4));
        }
        return res;
      } catch (e) {
        return expr;
      }
    }

    return expr;
  }

  function applyExcelFormula(funcName) {
    let cell = getActiveTableCell();
    const table = cell ? cell.closest('table') : (document.querySelector('.excel-grid-table') || document.querySelector('#editor table'));
    if (!table) {
      showToast('Click a spreadsheet cell to calculate formula', 'info');
      return;
    }
    if (!cell) {
      cell = table.querySelector('td.excel-cell-selected') || table.querySelector('tbody td');
    }
    if (!cell) {
      showToast('Click a spreadsheet cell to calculate formula', 'info');
      return;
    }

    const selectedCells = Array.from(table.querySelectorAll('td.excel-cell-selected'));
    let nums = [];
    let targetCell = cell;

    if (selectedCells.length > 1) {
      selectedCells.forEach(c => {
        const val = parseFloat(c.textContent.replace(/[^0-9.-]/g, ''));
        if (!isNaN(val)) nums.push(val);
      });
      const lastSelected = selectedCells[selectedCells.length - 1];
      // Problem 1.7: Place formula answer in front/next cell instead of below cell!
      if (lastSelected.nextElementSibling && lastSelected.nextElementSibling.tagName === 'TD') {
        targetCell = lastSelected.nextElementSibling;
      } else {
        targetCell = lastSelected;
      }
    } else {
      if (cell.nextElementSibling && cell.nextElementSibling.tagName === 'TD') {
        targetCell = cell.nextElementSibling;
      }
      const curRowIdx = cell.closest('tr')?.rowIndex || 0;
      const colIdx = cell.cellIndex;
      const rows = Array.from(table.rows);
      for (let r = 1; r < curRowIdx; r++) {
        const c = rows[r]?.cells[colIdx];
        if (c && c !== cell) {
          const val = parseFloat(c.textContent.replace(/[^0-9.-]/g, ''));
          if (!isNaN(val)) nums.push(val);
        }
      }
      if (nums.length === 0) {
        const tr = cell.closest('tr');
        if (tr) {
          for (let c = 1; c < colIdx; c++) {
            const cellLeft = tr.cells[c];
            if (cellLeft && cellLeft !== cell) {
              const val = parseFloat(cellLeft.textContent.replace(/[^0-9.-]/g, ''));
              if (!isNaN(val)) nums.push(val);
            }
          }
        }
      }
      if (nums.length === 0) {
        rows.forEach(r => {
          const c = r.cells[colIdx];
          if (c && c !== cell) {
            const val = parseFloat(c.textContent.replace(/[^0-9.-]/g, ''));
            if (!isNaN(val)) nums.push(val);
          }
        });
      }
    }

    let result = 0;
    if (nums.length === 0) {
      targetCell.textContent = `=${funcName}()`;
      window._activeExcelCell = targetCell;
      const fi = $('#excelFormulaInput');
      if (fi) fi.value = targetCell.textContent;
      window.DocFlow.Editor?.notifyChange();
      restoreCellFocus(targetCell);
      showToast(`Inserted =${funcName}() formula into cell`, 'info');
      return;
    }

    if (funcName === 'SUM') result = nums.reduce((a, b) => a + b, 0);
    else if (funcName === 'AVERAGE') result = Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2));
    else if (funcName === 'COUNT') result = nums.length;
    else if (funcName === 'MAX') result = Math.max(...nums);
    else if (funcName === 'MIN') result = Math.min(...nums);
    else if (funcName === 'MEDIAN') {
      const sorted = [...nums].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      result = sorted.length % 2 !== 0 ? sorted[mid] : Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
    } else if (funcName === 'PRODUCT') {
      result = nums.reduce((a, b) => a * b, 1);
    } else if (funcName === 'COUNTA') {
      result = nums.length;
    } else if (funcName === 'STDEV') {
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      const variance = nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (nums.length > 1 ? nums.length - 1 : 1);
      result = Number(Math.sqrt(variance).toFixed(2));
    } else if (funcName === 'ROUND') {
      result = Math.round(nums[nums.length - 1] || nums[0] || 0);
    } else if (funcName === 'CONCAT') {
      const texts = selectedCells.length > 0 ? selectedCells.map(c => c.textContent.trim()) : [cell.textContent.trim()];
      result = texts.join(' ');
    } else if (funcName === 'UPPER') {
      result = (cell.textContent || '').toUpperCase();
    } else if (funcName === 'LOWER') {
      result = (cell.textContent || '').toLowerCase();
    } else if (funcName === 'IF') {
      const val = nums[0] || parseFloat(cell.textContent) || 0;
      result = val > 0 ? 'TRUE' : 'FALSE';
    } else if (funcName === 'NOW') {
      result = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (funcName === 'ABS') {
      result = Math.abs(nums[0] || parseFloat(cell.textContent) || 0);
    } else if (funcName === 'SQRT') {
      const v = Math.max(0, nums[0] || parseFloat(cell.textContent) || 0);
      result = Number(Math.sqrt(v).toFixed(2));
    } else if (funcName === 'POWER') {
      const base = nums[0] || parseFloat(cell.textContent) || 1;
      const exp = nums[1] || 2;
      result = Math.pow(base, exp);
    } else if (funcName === 'MOD') {
      const a = nums[0] || parseFloat(cell.textContent) || 0;
      const b = nums[1] || 1;
      result = a % b;
    } else if (funcName === 'INT') {
      result = Math.floor(nums[0] || parseFloat(cell.textContent) || 0);
    } else if (funcName === 'COUNTIF') {
      result = nums.filter(n => n > 0).length;
    } else if (funcName === 'SUMIF') {
      result = nums.filter(n => n > 0).reduce((a, b) => a + b, 0);
    } else if (funcName === 'LEN') {
      result = (cell.textContent || '').trim().length;
    } else if (funcName === 'TRIM') {
      result = (cell.textContent || '').trim().replace(/\s+/g, ' ');
    } else if (funcName === 'LEFT') {
      result = (cell.textContent || '').trim().slice(0, 3);
    } else if (funcName === 'RIGHT') {
      result = (cell.textContent || '').trim().slice(-3);
    } else if (funcName === 'AND') {
      result = nums.length > 0 && nums.every(n => n > 0) ? 'TRUE' : 'FALSE';
    } else if (funcName === 'OR') {
      result = nums.some(n => n > 0) ? 'TRUE' : 'FALSE';
    } else if (funcName === 'NOT') {
      const v = nums[0] || parseFloat(cell.textContent) || 0;
      result = v > 0 ? 'FALSE' : 'TRUE';
    } else if (funcName === 'TODAY') {
      result = new Date().toISOString().slice(0, 10);
    } else if (funcName === 'YEAR') {
      result = new Date().getFullYear();
    } else if (funcName === 'MONTH') {
      result = new Date().getMonth() + 1;
    } else if (funcName === 'DAY') {
      result = new Date().getDate();
    } else if (funcName === 'CEILING') {
      result = Math.ceil(nums[0] || parseFloat(cell.textContent) || 0);
    } else if (funcName === 'FLOOR') {
      result = Math.floor(nums[0] || parseFloat(cell.textContent) || 0);
    } else if (funcName === 'LOG') {
      const v = Math.max(0.0001, nums[0] || parseFloat(cell.textContent) || 1);
      result = Number(Math.log10(v).toFixed(4));
    } else if (funcName === 'LN') {
      const v = Math.max(0.0001, nums[0] || parseFloat(cell.textContent) || 1);
      result = Number(Math.log(v).toFixed(4));
    } else if (funcName === 'EXP') {
      result = Number(Math.exp(nums[0] || parseFloat(cell.textContent) || 0).toFixed(4));
    } else if (funcName === 'SIGN') {
      result = Math.sign(nums[0] || parseFloat(cell.textContent) || 0);
    } else if (funcName === 'QUOTIENT') {
      const a = nums[0] || parseFloat(cell.textContent) || 0;
      const b = nums[1] || 1;
      result = Math.floor(a / (b || 1));
    } else if (funcName === 'RAND') {
      result = Number(Math.random().toFixed(4));
    } else if (funcName === 'RANDBETWEEN') {
      const min = Math.min(nums[0] || 1, nums[1] || 100);
      const max = Math.max(nums[0] || 1, nums[1] || 100);
      result = Math.floor(Math.random() * (max - min + 1)) + min;
    } else if (funcName === 'AVERAGEA') {
      result = nums.length ? Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)) : 0;
    } else if (funcName === 'COUNTBLANK') {
      result = table ? Array.from(table.querySelectorAll('td')).filter(c => !c.textContent.trim()).length : 0;
    } else if (funcName === 'VAR') {
      const mean = nums.reduce((a, b) => a + b, 0) / (nums.length || 1);
      result = Number((nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (nums.length > 1 ? nums.length - 1 : 1)).toFixed(2));
    } else if (funcName === 'MODE') {
      const freq = {};
      nums.forEach(n => freq[n] = (freq[n] || 0) + 1);
      let maxCount = 0;
      let modeVal = nums[0] || 0;
      for (const [k, v] of Object.entries(freq)) {
        if (v > maxCount) { maxCount = v; modeVal = Number(k); }
      }
      result = modeVal;
    } else if (funcName === 'PROPER') {
      const txt = (cell.textContent || '').trim().toLowerCase();
      result = txt.replace(/\b\w/g, c => c.toUpperCase());
    } else if (funcName === 'REPT') {
      const txt = (cell.textContent || '★').trim();
      result = txt.repeat(Math.min(10, Math.max(1, nums[0] || 3)));
    } else if (funcName === 'SUBSTITUTE') {
      result = (cell.textContent || '').trim().replace(/,/g, ';');
    } else if (funcName === 'ISNUMBER') {
      const txt = cell.textContent.trim();
      result = (!isNaN(parseFloat(txt)) && isFinite(txt)) ? 'TRUE' : 'FALSE';
    } else if (funcName === 'ISTEXT') {
      const txt = cell.textContent.trim();
      result = (isNaN(parseFloat(txt)) && txt.length > 0) ? 'TRUE' : 'FALSE';
    } else if (funcName === 'ISBLANK') {
      result = cell.textContent.trim() === '' ? 'TRUE' : 'FALSE';
    } else if (funcName === 'WEEKDAY') {
      result = new Date().getDay() + 1;
    } else if (funcName === 'HOUR') {
      result = new Date().getHours();
    } else if (funcName === 'MINUTE') {
      result = new Date().getMinutes();
    } else if (funcName === 'SECOND') {
      result = new Date().getSeconds();
    } else if (funcName === 'DATE') {
      const now = new Date();
      result = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    } else if (funcName === 'FACT') {
      const n = Math.min(20, Math.max(0, Math.floor(nums[0] || parseFloat(cell.textContent) || 0)));
      let f = 1;
      for (let i = 2; i <= n; i++) f *= i;
      result = f;
    } else if (funcName === 'GCD') {
      const gcdTwo = (x, y) => (!y ? x : gcdTwo(y, x % y));
      const intNums = (nums.length ? nums : [parseFloat(cell.textContent) || 1]).map(n => Math.abs(Math.round(n)));
      result = intNums.reduce((acc, val) => gcdTwo(acc, val), intNums[0] || 1);
    } else if (funcName === 'LCM') {
      const gcdTwo = (x, y) => (!y ? x : gcdTwo(y, x % y));
      const lcmTwo = (x, y) => (x * y === 0 ? 0 : Math.abs(x * y) / gcdTwo(x, y));
      const intNums = (nums.length ? nums : [parseFloat(cell.textContent) || 1]).map(n => Math.abs(Math.round(n)));
      result = intNums.reduce((acc, val) => lcmTwo(acc, val), intNums[0] || 1);
    } else if (funcName === 'TRUNC') {
      result = Math.trunc(nums[0] || parseFloat(cell.textContent) || 0);
    } else if (funcName === 'PI') {
      result = Number(Math.PI.toFixed(5));
    } else if (funcName === 'LARGE') {
      const sorted = [...nums].sort((a, b) => b - a);
      result = sorted.length > 1 ? sorted[1] : (sorted[0] || 0);
    } else if (funcName === 'SMALL') {
      const sorted = [...nums].sort((a, b) => a - b);
      result = sorted.length > 1 ? sorted[1] : (sorted[0] || 0);
    } else if (funcName === 'RANK') {
      const sorted = [...nums].sort((a, b) => b - a);
      const val = parseFloat(cell.textContent) || nums[0] || 0;
      const rIdx = sorted.indexOf(val);
      result = rIdx !== -1 ? rIdx + 1 : 1;
    } else if (funcName === 'CLEAN') {
      result = (cell.textContent || '').replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
    } else if (funcName === 'EXACT') {
      if (selectedCells.length >= 2) {
        result = selectedCells[0].textContent.trim() === selectedCells[1].textContent.trim() ? 'TRUE' : 'FALSE';
      } else {
        result = cell.textContent.trim().length > 0 ? 'TRUE' : 'FALSE';
      }
    } else if (funcName === 'REPLACE') {
      const str = cell.textContent || '';
      result = str.replace(/[0-9]/g, '*');
    } else if (funcName === 'T') {
      const txt = (cell.textContent || '').trim();
      result = isNaN(parseFloat(txt)) ? txt : '';
    } else if (funcName === 'XOR') {
      result = (nums.filter(n => n > 0).length % 2 === 1) ? 'TRUE' : 'FALSE';
    } else if (funcName === 'IFERROR') {
      const txt = (cell.textContent || '').trim();
      result = (/error|#value|#div|nan|undefined/i.test(txt)) ? '0' : (txt || '0');
    } else if (funcName === 'DAYS') {
      result = 30;
      if (selectedCells.length >= 2) {
        const d1 = new Date(selectedCells[0].textContent.trim());
        const d2 = new Date(selectedCells[1].textContent.trim());
        if (!isNaN(d1) && !isNaN(d2)) {
          result = Math.round(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
        }
      }
    } else if (funcName === 'YEARFRAC') {
      result = 0.25;
      if (selectedCells.length >= 2) {
        const d1 = new Date(selectedCells[0].textContent.trim());
        const d2 = new Date(selectedCells[1].textContent.trim());
        if (!isNaN(d1) && !isNaN(d2)) {
          result = Number((Math.abs(d2 - d1) / (1000 * 60 * 60 * 24 * 365.25)).toFixed(3));
        }
      }
    }

    window.DocFlow.Editor?.saveSnapshot?.();
    targetCell.textContent = String(result);
    targetCell.style.fontWeight = 'bold';
    window._activeExcelCell = targetCell;
    const fi = $('#excelFormulaInput');
    if (fi) fi.value = String(result);
    const cb = document.querySelector('.excel-coord-box');
    if (cb && targetCell.dataset.coord) cb.value = targetCell.dataset.coord;
    window.DocFlow.Editor?.notifyChange();
    showToast(`Formula ${funcName} calculated: ${result}`, 'success');
    restoreCellFocus(targetCell);
  }

  // Issue 1: Position Excel chart 5 cells after the last data cell without changing cell numbers
  function updateExcelChartPositions(excelContainer) {
    if (!excelContainer) excelContainer = document.querySelector('.excel-spreadsheet-container');
    if (!excelContainer) return;

    const viewport = excelContainer.querySelector('.excel-sheet-viewport');
    const table = excelContainer.querySelector('.excel-grid-table');
    const chartArea = viewport?.querySelector('.excel-chart-dock-area');
    if (!viewport || !table || !chartArea) return;

    const charts = chartArea.querySelectorAll('.doc-chart-container');
    if (!charts.length) {
      chartArea.style.display = 'none';
      return;
    }
    chartArea.style.display = 'flex';

    // 1. Find last cell containing data in the table
    let maxDataRowIndex = 0;
    const trs = Array.from(table.querySelectorAll('tbody tr'));
    trs.forEach((tr, idx) => {
      const rowNum = idx + 1;
      const hasData = Array.from(tr.querySelectorAll('td')).some(td => {
        return (td.textContent || '').trim().length > 0 ||
          td.dataset.customFill === 'true' ||
          (td.style.backgroundColor && td.style.backgroundColor !== 'transparent') ||
          td.querySelector('img, svg, canvas, .excel-text-highlight');
      });
      if (hasData) {
        maxDataRowIndex = Math.max(maxDataRowIndex, rowNum);
      }
    });

    if (maxDataRowIndex === 0) maxDataRowIndex = 1;

    // Target row: 5 cells after the last cell containing data
    const targetRowIndex = maxDataRowIndex + 5;

    // Ensure rows exist in tbody up to targetRowIndex + 15 without altering existing coordinates
    const tbody = table.querySelector('tbody') || table;
    const thead = table.querySelector('thead tr');
    const totalCols = thead ? thead.querySelectorAll('.excel-col-hdr').length : 10;
    const getLetter = window.DocFlow.FileIO?.getExcelColLetter || (i => {
      let letter = '';
      let temp = i;
      while (temp >= 0) {
        letter = String.fromCharCode((temp % 26) + 65) + letter;
        temp = Math.floor(temp / 26) - 1;
      }
      return letter;
    });

    let currentRows = tbody.querySelectorAll('tr').length;
    const neededRows = Math.max(targetRowIndex + 15, currentRows);
    if (neededRows > currentRows) {
      for (let r = currentRows + 1; r <= neededRows; r++) {
        const tr = document.createElement('tr');
        const rowHdr = document.createElement('th');
        rowHdr.className = 'excel-row-hdr';
        rowHdr.contentEditable = 'false';
        rowHdr.textContent = r;
        tr.appendChild(rowHdr);
        for (let c = 0; c < totalCols; c++) {
          const td = document.createElement('td');
          td.contentEditable = 'true';
          td.dataset.coord = `${getLetter(c)}${r}`;
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      setupExcelInteractions();
    }

    const allRows = tbody.querySelectorAll('tr');
    const targetTr = allRows[targetRowIndex - 1] || allRows[allRows.length - 1];
    if (targetTr) {
      const firstTd = targetTr.querySelector('td');
      const leftOffset = firstTd ? firstTd.offsetLeft : 54;
      chartArea.style.top = (targetTr.offsetTop || 0) + 'px';
      chartArea.style.left = leftOffset + 'px';
    }
  }

  // Visual Chart Generator (Issue 5: 9 Chart Types with Corner Resize & Drag)
  function insertChartIntoDocument() {
    if (window.DocFlow.currentMode !== 'edit') {
      showToast('Open a document in edit mode first', 'info');
      return;
    }
    window.DocFlow.Editor?.saveSnapshot?.();
    const chartType = $('#chartTypeSelect')?.value || 'column';
    const chartTitle = $('#chartTitleInput')?.value.trim() || 'Data Chart';
    const valInput = $('#chartValuesInput')?.value.trim() || '45, 82, 63, 95';
    const values = valInput.split(',').map(v => parseFloat(v.trim()) || 0);
    const labels = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8'].slice(0, values.length);
    const maxVal = Math.max(...values, 10);
    const colors = ['#0284c7', '#16a34a', '#ea580c', '#8b5cf6', '#eab308', '#ec4899', '#06b6d4'];

    const w = 520;
    const h = 280;
    let svgContent = '';

    if (chartType === 'column') {
      const padLeft = 45, padBottom = 35, padTop = 30, padRight = 20;
      const plotW = w - padLeft - padRight;
      const plotH = h - padTop - padBottom;
      const barWidth = Math.min(50, Math.floor((plotW / values.length) * 0.65));
      const colStep = plotW / values.length;

      svgContent += `<line x1="${padLeft}" y1="${h - padBottom}" x2="${w - padRight}" y2="${h - padBottom}" stroke="var(--border, #cbd5e1)" stroke-width="1.5" />`;
      svgContent += `<line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${h - padBottom}" stroke="var(--border, #cbd5e1)" stroke-width="1.5" />`;

      values.forEach((val, idx) => {
        const barH = Math.round((val / maxVal) * (plotH - 20));
        const barX = Math.round(padLeft + idx * colStep + (colStep - barWidth) / 2);
        const barY = h - padBottom - barH;
        const color = colors[idx % colors.length];

        svgContent += `<rect x="${barX}" y="${barY}" width="${barWidth}" height="${barH}" rx="3" fill="${color}" />`;
        svgContent += `<text x="${barX + barWidth / 2}" y="${barY - 6}" font-size="11" font-weight="600" text-anchor="middle" fill="var(--text-primary, #334155)">${val}</text>`;
        svgContent += `<text x="${barX + barWidth / 2}" y="${h - padBottom + 16}" font-size="11" text-anchor="middle" fill="var(--text-muted, #64748b)">${labels[idx] || `Item ${idx+1}`}</text>`;
      });
    } else if (chartType === 'bar') {
      const padLeft = 60, padBottom = 25, padTop = 30, padRight = 45;
      const plotW = w - padLeft - padRight;
      const plotH = h - padTop - padBottom;
      const barHeight = Math.min(30, Math.floor((plotH / values.length) * 0.65));
      const rowStep = plotH / values.length;

      svgContent += `<line x1="${padLeft}" y1="${h - padBottom}" x2="${padLeft}" y2="${padTop}" stroke="var(--border, #cbd5e1)" stroke-width="1.5" />`;

      values.forEach((val, idx) => {
        const barW = Math.round((val / maxVal) * plotW);
        const barY = Math.round(padTop + idx * rowStep + (rowStep - barHeight) / 2);
        const color = colors[idx % colors.length];

        svgContent += `<rect x="${padLeft}" y="${barY}" width="${barW}" height="${barHeight}" rx="3" fill="${color}" />`;
        svgContent += `<text x="${padLeft - 8}" y="${barY + barHeight / 2 + 4}" font-size="11" text-anchor="end" fill="var(--text-muted, #64748b)">${labels[idx] || `Item ${idx+1}`}</text>`;
        svgContent += `<text x="${padLeft + barW + 8}" y="${barY + barHeight / 2 + 4}" font-size="11" font-weight="600" fill="var(--text-primary, #334155)">${val}</text>`;
      });
    } else if (chartType === 'line') {
      const padLeft = 45, padBottom = 35, padTop = 30, padRight = 20;
      const plotW = w - padLeft - padRight;
      const plotH = h - padTop - padBottom;
      const step = plotW / (values.length - 1 || 1);

      svgContent += `<line x1="${padLeft}" y1="${h - padBottom}" x2="${w - padRight}" y2="${h - padBottom}" stroke="var(--border, #cbd5e1)" stroke-width="1.5" />`;
      svgContent += `<line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${h - padBottom}" stroke="var(--border, #cbd5e1)" stroke-width="1.5" />`;

      let points = [];
      values.forEach((val, idx) => {
        const px = Math.round(padLeft + idx * step);
        const py = Math.round(h - padBottom - (val / maxVal) * (plotH - 20));
        points.push(`${px},${py}`);
        svgContent += `<circle cx="${px}" cy="${py}" r="5" fill="#0284c7" stroke="#ffffff" stroke-width="2" />`;
        svgContent += `<text x="${px}" y="${py - 8}" font-size="11" font-weight="600" text-anchor="middle" fill="var(--text-primary, #334155)">${val}</text>`;
        svgContent += `<text x="${px}" y="${h - padBottom + 16}" font-size="11" text-anchor="middle" fill="var(--text-muted, #64748b)">${labels[idx] || `P${idx+1}`}</text>`;
      });
      svgContent = `<polyline points="${points.join(' ')}" fill="none" stroke="#0284c7" stroke-width="3" />` + svgContent;
    } else if (chartType === 'doughnut') {
      const cx = w / 2 - 40, cy = h / 2 + 8, r = 85, rInner = 52;
      const total = values.reduce((a, b) => a + b, 0) || 1;
      let startAngle = 0;

      values.forEach((val, idx) => {
        const sliceAngle = (val / total) * 2 * Math.PI;
        const endAngle = startAngle + sliceAngle;
        const x1 = cx + r * Math.cos(startAngle);
        const y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(endAngle);
        const y2 = cy + r * Math.sin(endAngle);
        const x3 = cx + rInner * Math.cos(endAngle);
        const y3 = cy + rInner * Math.sin(endAngle);
        const x4 = cx + rInner * Math.cos(startAngle);
        const y4 = cy + rInner * Math.sin(startAngle);
        const largeArc = sliceAngle > Math.PI ? 1 : 0;
        const color = colors[idx % colors.length];

        const pathData = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4} Z`;
        svgContent += `<path d="${pathData}" fill="${color}" stroke="var(--bg-secondary, #ffffff)" stroke-width="1.5" />`;

        const legY = 32 + idx * 24;
        const pct = Math.round((val / total) * 100);
        svgContent += `<rect x="${w - 110}" y="${legY}" width="12" height="12" rx="2" fill="${color}" />`;
        svgContent += `<text x="${w - 92}" y="${legY + 10}" font-size="11" fill="var(--text-primary, #334155)">${labels[idx] || `Item ${idx+1}`} (${pct}%)</text>`;

        startAngle = endAngle;
      });

      svgContent += `<text x="${cx}" y="${cy - 4}" font-size="11" font-weight="700" text-anchor="middle" fill="var(--text-muted, #64748b)">TOTAL</text>`;
      svgContent += `<text x="${cx}" y="${cy + 16}" font-size="16" font-weight="800" text-anchor="middle" fill="var(--text-primary, #0f172a)">${total}</text>`;
    } else if (chartType === 'area') {
      const padLeft = 45, padBottom = 35, padTop = 30, padRight = 20;
      const plotW = w - padLeft - padRight;
      const plotH = h - padTop - padBottom;
      const step = plotW / (values.length - 1 || 1);
      const gradId = 'areaGrad_' + Math.floor(Math.random() * 100000);

      svgContent += `<defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0284c7" stop-opacity="0.45" />
          <stop offset="100%" stop-color="#0284c7" stop-opacity="0.05" />
        </linearGradient>
      </defs>`;
      svgContent += `<line x1="${padLeft}" y1="${h - padBottom}" x2="${w - padRight}" y2="${h - padBottom}" stroke="var(--border, #cbd5e1)" stroke-width="1.5" />`;
      svgContent += `<line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${h - padBottom}" stroke="var(--border, #cbd5e1)" stroke-width="1.5" />`;

      let points = [];
      let areaPoints = [`${padLeft},${h - padBottom}`];
      values.forEach((val, idx) => {
        const px = Math.round(padLeft + idx * step);
        const py = Math.round(h - padBottom - (val / maxVal) * (plotH - 20));
        points.push(`${px},${py}`);
        areaPoints.push(`${px},${py}`);
      });
      areaPoints.push(`${padLeft + (values.length - 1) * step},${h - padBottom}`);

      svgContent += `<polygon points="${areaPoints.join(' ')}" fill="url(#${gradId})" />`;
      svgContent += `<polyline points="${points.join(' ')}" fill="none" stroke="#0284c7" stroke-width="3" />`;

      values.forEach((val, idx) => {
        const px = Math.round(padLeft + idx * step);
        const py = Math.round(h - padBottom - (val / maxVal) * (plotH - 20));
        svgContent += `<circle cx="${px}" cy="${py}" r="5" fill="#0284c7" stroke="#ffffff" stroke-width="2" />`;
        svgContent += `<text x="${px}" y="${py - 8}" font-size="11" font-weight="600" text-anchor="middle" fill="var(--text-primary, #334155)">${val}</text>`;
        svgContent += `<text x="${px}" y="${h - padBottom + 16}" font-size="11" text-anchor="middle" fill="var(--text-muted, #64748b)">${labels[idx] || `P${idx+1}`}</text>`;
      });
    } else if (chartType === 'radar') {
      const cx = w / 2 - 40, cy = h / 2 + 8, r = 85;
      const count = values.length || 4;

      [0.33, 0.66, 1.0].forEach(factor => {
        let gridPts = [];
        for (let i = 0; i < count; i++) {
          const angle = (i * 2 * Math.PI / count) - (Math.PI / 2);
          gridPts.push(`${cx + r * factor * Math.cos(angle)},${cy + r * factor * Math.sin(angle)}`);
        }
        svgContent += `<polygon points="${gridPts.join(' ')}" fill="none" stroke="var(--border, #cbd5e1)" stroke-width="1" stroke-dasharray="2 2" />`;
      });

      let dataPts = [];
      for (let i = 0; i < count; i++) {
        const angle = (i * 2 * Math.PI / count) - (Math.PI / 2);
        const sx = cx + r * Math.cos(angle);
        const sy = cy + r * Math.sin(angle);
        svgContent += `<line x1="${cx}" y1="${cy}" x2="${sx}" y2="${sy}" stroke="var(--border, #cbd5e1)" stroke-width="1" />`;

        const lx = cx + (r + 16) * Math.cos(angle);
        const ly = cy + (r + 16) * Math.sin(angle) + 4;
        svgContent += `<text x="${lx}" y="${ly}" font-size="10" font-weight="600" text-anchor="middle" fill="var(--text-muted, #64748b)">${labels[i] || `A${i+1}`}</text>`;

        const val = values[i] || 0;
        const dist = (val / maxVal) * r;
        const dx = cx + dist * Math.cos(angle);
        const dy = cy + dist * Math.sin(angle);
        dataPts.push(`${dx},${dy}`);
      }

      svgContent += `<polygon points="${dataPts.join(' ')}" fill="rgba(139, 92, 246, 0.35)" stroke="#8b5cf6" stroke-width="2.5" />`;
      dataPts.forEach((pt) => {
        const [px, py] = pt.split(',');
        svgContent += `<circle cx="${px}" cy="${py}" r="4" fill="#8b5cf6" stroke="#ffffff" stroke-width="1.5" />`;
      });
    } else if (chartType === 'scatter') {
      const padLeft = 45, padBottom = 35, padTop = 30, padRight = 20;
      const plotW = w - padLeft - padRight;
      const plotH = h - padTop - padBottom;

      svgContent += `<line x1="${padLeft}" y1="${h - padBottom}" x2="${w - padRight}" y2="${h - padBottom}" stroke="var(--border, #cbd5e1)" stroke-width="1.5" />`;
      svgContent += `<line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${h - padBottom}" stroke="var(--border, #cbd5e1)" stroke-width="1.5" />`;

      for (let g = 1; g <= 3; g++) {
        const gy = Math.round(h - padBottom - (g / 4) * plotH);
        svgContent += `<line x1="${padLeft}" y1="${gy}" x2="${w - padRight}" y2="${gy}" stroke="var(--border, #cbd5e1)" stroke-width="1" stroke-dasharray="3 3" opacity="0.6" />`;
      }

      const step = plotW / (values.length - 1 || 1);
      values.forEach((val, idx) => {
        const px = Math.round(padLeft + idx * step);
        const py = Math.round(h - padBottom - (val / maxVal) * (plotH - 20));

        svgContent += `<circle cx="${px}" cy="${py}" r="8" fill="rgba(234, 88, 12, 0.2)" />`;
        svgContent += `<circle cx="${px}" cy="${py}" r="5" fill="#ea580c" stroke="#ffffff" stroke-width="2" />`;
        svgContent += `<text x="${px}" y="${py - 10}" font-size="11" font-weight="600" text-anchor="middle" fill="var(--text-primary, #334155)">${val}</text>`;
        svgContent += `<text x="${px}" y="${h - padBottom + 16}" font-size="11" text-anchor="middle" fill="var(--text-muted, #64748b)">${labels[idx] || `P${idx+1}`}</text>`;
      });
    } else if (chartType === 'stacked') {
      const padLeft = 45, padBottom = 35, padTop = 30, padRight = 20;
      const plotW = w - padLeft - padRight;
      const plotH = h - padTop - padBottom;
      const barWidth = Math.min(48, Math.floor((plotW / values.length) * 0.65));
      const colStep = plotW / values.length;

      svgContent += `<line x1="${padLeft}" y1="${h - padBottom}" x2="${w - padRight}" y2="${h - padBottom}" stroke="var(--border, #cbd5e1)" stroke-width="1.5" />`;
      svgContent += `<line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${h - padBottom}" stroke="var(--border, #cbd5e1)" stroke-width="1.5" />`;

      values.forEach((val, idx) => {
        const totalBarH = Math.round((val / maxVal) * (plotH - 20));
        const seg1H = Math.round(totalBarH * 0.6);
        const seg2H = totalBarH - seg1H;
        const barX = Math.round(padLeft + idx * colStep + (colStep - barWidth) / 2);
        const seg1Y = h - padBottom - seg1H;
        const seg2Y = seg1Y - seg2H;

        svgContent += `<rect x="${barX}" y="${seg1Y}" width="${barWidth}" height="${seg1H}" fill="#0284c7" />`;
        svgContent += `<rect x="${barX}" y="${seg2Y}" width="${barWidth}" height="${seg2H}" rx="3" fill="#10b981" />`;

        svgContent += `<text x="${barX + barWidth / 2}" y="${seg2Y - 6}" font-size="11" font-weight="700" text-anchor="middle" fill="var(--text-primary, #334155)">${val}</text>`;
        svgContent += `<text x="${barX + barWidth / 2}" y="${h - padBottom + 16}" font-size="11" text-anchor="middle" fill="var(--text-muted, #64748b)">${labels[idx] || `Item ${idx+1}`}</text>`;
      });

      svgContent += `<rect x="${w - 140}" y="${padTop}" width="10" height="10" fill="#0284c7" />`;
      svgContent += `<text x="${w - 124}" y="${padTop + 9}" font-size="10" fill="var(--text-primary, #334155)">Series A (60%)</text>`;
      svgContent += `<rect x="${w - 140}" y="${padTop + 16}" width="10" height="10" fill="#10b981" />`;
      svgContent += `<text x="${w - 124}" y="${padTop + 25}" font-size="10" fill="var(--text-primary, #334155)">Series B (40%)</text>`;
    } else {
      const cx = w / 2 - 40, cy = h / 2 + 8, r = 85;
      const total = values.reduce((a, b) => a + b, 0) || 1;
      let startAngle = 0;

      values.forEach((val, idx) => {
        const sliceAngle = (val / total) * 2 * Math.PI;
        const endAngle = startAngle + sliceAngle;
        const x1 = cx + r * Math.cos(startAngle);
        const y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(endAngle);
        const y2 = cy + r * Math.sin(endAngle);
        const largeArc = sliceAngle > Math.PI ? 1 : 0;
        const color = colors[idx % colors.length];

        const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
        svgContent += `<path d="${pathData}" fill="${color}" stroke="#ffffff" stroke-width="1.5" />`;

        const legY = 40 + idx * 24;
        const pct = Math.round((val / total) * 100);
        svgContent += `<rect x="${w - 110}" y="${legY}" width="12" height="12" rx="2" fill="${color}" />`;
        svgContent += `<text x="${w - 92}" y="${legY + 10}" font-size="11" fill="var(--text-primary, #334155)">${labels[idx] || `Item ${idx+1}`} (${pct}%)</text>`;

        startAngle = endAngle;
      });
    }

    const chartHtml = `
      <div class="doc-chart-container" contenteditable="false" style="margin:16px auto;width:${w}px;max-width:100%;background:var(--bg-secondary);border:1px solid var(--border);border-radius:8px;padding:14px;box-shadow:var(--shadow-sm);cursor:pointer;position:relative;">
        <div class="chart-header-title" style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:8px;text-align:center;">
          <i class="fas fa-chart-column" style="color:#0284c7;margin-right:6px;"></i>${escHtml(chartTitle)}
        </div>
        <svg class="doc-chart-svg" width="100%" height="${h}" viewBox="0 0 ${w} ${h}" style="overflow:visible;display:block;">
          ${svgContent}
        </svg>
      </div><p><br></p>`;

    const excelContainer = document.querySelector('.excel-spreadsheet-container');
    if (excelContainer) {
      let viewport = excelContainer.querySelector('.excel-sheet-viewport');
      if (!viewport) {
        viewport = document.createElement('div');
        viewport.className = 'excel-sheet-viewport';
        const gridTable = excelContainer.querySelector('.excel-grid-table');
        if (gridTable) {
          gridTable.parentNode.insertBefore(viewport, gridTable);
          viewport.appendChild(gridTable);
        } else {
          excelContainer.appendChild(viewport);
        }
      }
      let chartArea = viewport.querySelector('.excel-chart-dock-area');
      if (!chartArea) {
        chartArea = document.createElement('div');
        chartArea.className = 'excel-chart-dock-area';
        viewport.appendChild(chartArea);
      }
      chartArea.insertAdjacentHTML('beforeend', chartHtml);
      updateExcelChartPositions(excelContainer);
      window.DocFlow.Editor?.notifyChange();
      closeModal('#chartModal');
      showToast('Visual Data Chart placed inside spreadsheet 5 cells after data', 'success');
      setTimeout(() => {
        const newlyInserted = chartArea.querySelector('.doc-chart-container:last-child');
        if (newlyInserted) {
          window.DocFlow.ImageManager?.attachShapeListeners(newlyInserted);
          window.DocFlow.ImageManager?.selectImage(newlyInserted);
          newlyInserted.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 50);
      return;
    }

    if (isPptxDocument()) {
      const curSlide = (window.DocFlow?.getCurrentSlideWrapper?.() || document.querySelector('.pptx-slide-wrapper.active-slide') || document.querySelector('.pptx-slide-card'));
      const card = curSlide ? (curSlide.classList.contains('pptx-slide-card') ? curSlide : curSlide.querySelector('.pptx-slide-card')) : null;
      if (card) {
        const contentBox = card.querySelector('.slide-content-box') || card;
        contentBox.insertAdjacentHTML('beforeend', chartHtml);
        window.DocFlow.Editor?.notifyChange();
        closeModal('#chartModal');
        showToast('Visual Data Chart inserted into PowerPoint slide', 'success');
        return;
      }
    }

    window.DocFlow.Editor?.insertHtmlAtCursor(chartHtml);
    window.DocFlow.Editor?.notifyChange();
    closeModal('#chartModal');
    showToast('Visual Data Chart inserted', 'success');

    setTimeout(() => {
      const charts = $('#editor')?.querySelectorAll('.doc-chart-container');
      if (charts && charts.length) {
        const newlyInserted = charts[charts.length - 1];
        window.DocFlow.ImageManager?.attachShapeListeners(newlyInserted);
        window.DocFlow.ImageManager?.selectImage(newlyInserted);
      }
    }, 50);
  }

  // Presentation Slide Show Player (Problem 2: Timer, Autoplay & New Transitions)
  let slideShowSlides = [];
  let currentSlideShowIdx = 0;
  let currentPptTransitionDuration = '1.0';
  let currentPptAnimDuration = '1.0';
  let currentPptAutoAdvance = 0;
  let slideShowAutoPlayTimer = null;

  function startSlideShow(fromCurrent = false) {
    if (!isPptxDocument()) {
      showToast('Slide Show presentation mode is only available for PowerPoint (.pptx) documents', 'warning');
      return;
    }
    const editor = $('#editor');
    if (!editor) return;

    let wrappers = Array.from(editor.querySelectorAll('.pptx-slide-wrapper'));
    let slideCards = [];
    if (wrappers.length > 0) {
      slideCards = wrappers.map(w => w.querySelector('.pptx-slide-card') || w);
    } else {
      slideCards = Array.from(editor.querySelectorAll('.pptx-slide-card'));
    }
    if (!slideCards.length) {
      showToast('No slides found to present in this presentation', 'info');
      return;
    }

    slideShowSlides = slideCards.map(c => {
      const wrap = c.closest('.pptx-slide-wrapper') || c;
      const trans = wrap.getAttribute('data-transition') || c.getAttribute('data-transition') || 'none';
      const bg = c.style.background || c.style.backgroundColor || wrap.style.background || wrap.style.backgroundColor || '';
      const color = c.style.color || wrap.style.color || '';
      const border = c.style.border || '';

      const clone = c.cloneNode(true);
      clone.querySelectorAll('.slide-placeholder-text, .slide-quick-action-bar, .slide-speaker-notes').forEach(el => el.remove());
      clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
      clone.removeAttribute('contenteditable');

      return {
        html: clone.innerHTML || '<p>Slide content</p>',
        transition: trans,
        bg: bg,
        color: color,
        border: border
      };
    });

    // Start presentation on first slide or current slide
    let startIdx = 0;
    if (fromCurrent && typeof currentActiveSlideIndex === 'number' && currentActiveSlideIndex >= 0 && currentActiveSlideIndex < slideShowSlides.length) {
      startIdx = currentActiveSlideIndex;
    }
    currentSlideShowIdx = startIdx;
    const overlay = $('#slideshowOverlay');
    if (!overlay) return;

    overlay.classList.add('show');
    showSlideShowIndex(startIdx);

    document.removeEventListener('keydown', handleSlideShowKey);
    document.addEventListener('keydown', handleSlideShowKey);

    // Ensure slideshow control buttons are hooked up
    const prevBtn = $('#slideshowPrevBtn');
    if (prevBtn) prevBtn.onclick = () => showSlideShowIndex(currentSlideShowIdx - 1);
    const nextBtn = $('#slideshowNextBtn');
    if (nextBtn) nextBtn.onclick = () => showSlideShowIndex(currentSlideShowIdx + 1);
    const exitBtn = $('#slideshowExitBtn');
    if (exitBtn) exitBtn.onclick = exitSlideShow;

    showToast(`Slide Show started from ${fromCurrent ? 'current slide (' + (startIdx + 1) + ')' : 'beginning (Slide 1)'}. Press Esc to exit.`, 'info');
  }

  function showSlideShowIndex(idx) {
    if (idx < 0) idx = 0;
    if (idx >= slideShowSlides.length) idx = slideShowSlides.length - 1;
    currentSlideShowIdx = idx;

    const body = $('#slideshowCurrentSlideBody');
    const content = $('#slideshowContent');
    const counter = $('#slideshowCounter');
    const slide = slideShowSlides[idx];
    if (!slide) return;

    if (counter) {
      counter.textContent = `${idx + 1} / ${slideShowSlides.length}`;
    }

    if (content) {
      content.scrollTop = 0;
      // Retain custom background and text color
      if (slide.bg) {
        content.style.background = slide.bg;
      } else {
        content.style.background = '#ffffff';
      }
      if (slide.color) {
        content.style.color = slide.color;
      } else {
        content.style.color = '#1e293b';
      }
      if (slide.border) {
        content.style.border = slide.border;
      } else {
        content.style.border = 'none';
      }

      // Reset all transition animation classes cleanly
      content.className = content.className.replace(/\banim-ppt-[\w-]+\b/g, '').trim();
      content.style.animation = 'none';

      // Apply transition & animation duration timers
      content.style.setProperty('--ppt-trans-dur', (currentPptTransitionDuration || '1.0') + 's');
      content.style.setProperty('--ppt-anim-dur', (currentPptAnimDuration || '1.0') + 's');

      // Force reflow
      void content.offsetWidth;
      content.style.animation = '';

      // Apply slide transition animation (fallback to fade so every slide transition animates)
      const transitionToPlay = (slide.transition && slide.transition !== 'none') ? slide.transition : 'fade';
      content.classList.add(`anim-ppt-${transitionToPlay}`);

      // AutoPlay advance timer (Problem 2)
      clearTimeout(slideShowAutoPlayTimer);
      if (currentPptAutoAdvance > 0 && idx < slideShowSlides.length - 1) {
        slideShowAutoPlayTimer = setTimeout(() => {
          showSlideShowIndex(currentSlideShowIdx + 1);
        }, currentPptAutoAdvance * 1000);
      }
    }

    if (body) {
      body.innerHTML = slide.html;

      // Trigger / play element animations inside the slide
      const animElements = Array.from(body.querySelectorAll('[data-animation], [class*="anim-"]'));
      if (animElements.length > 0) {
        animElements.forEach((el, elIdx) => {
          let anim = el.getAttribute('data-animation');
          if (!anim) {
            const m = el.className.match(/\banim-([\w-]+)\b/);
            if (m) anim = m[1];
          }
          if (anim && anim !== 'none') {
            el.className = el.className.replace(/\banim-[\w-]+\b/g, '').trim();
            el.style.animation = 'none';
            el.style.animationDelay = `${elIdx * 0.14}s`;
            el.style.setProperty('--ppt-anim-dur', (currentPptAnimDuration || '1.0') + 's');
            void el.offsetWidth; // Force reflow
            el.style.animation = '';
            el.classList.add(`anim-${anim}`);
          }
        });
      } else {
        const slideComponents = Array.from(body.querySelectorAll('.slide-title-box, .pptx-slide-title, .slide-content-box, .pptx-slide-body, .slide-nested-card, h1, h2, h3, p'));
        slideComponents.forEach((comp, cIdx) => {
          comp.style.animation = 'none';
          void comp.offsetWidth;
          comp.style.animation = `elemFadeIn 0.5s ease-out ${cIdx * 0.1}s forwards`;
        });
      }
    }
  }

  function exitSlideShow() {
    clearTimeout(slideShowAutoPlayTimer);
    const overlay = $('#slideshowOverlay');
    if (overlay) overlay.classList.remove('show');
    const content = $('#slideshowContent');
    if (content) {
      const allPptAnimClasses = [
        'anim-ppt-fade', 'anim-ppt-slide', 'anim-ppt-push', 'anim-ppt-zoom', 'anim-ppt-flip',
        'anim-ppt-slide-up', 'anim-ppt-bounce', 'anim-ppt-rotate', 'anim-ppt-wipe', 'anim-ppt-blur', 'anim-ppt-cube',
        'anim-ppt-split', 'anim-ppt-flash', 'anim-ppt-shutter', 'anim-ppt-door', 'anim-ppt-fly-in', 'anim-ppt-fall',
        'anim-ppt-curtains', 'anim-ppt-dissolve', 'anim-ppt-origami', 'anim-ppt-vortex', 'anim-ppt-switch', 'anim-ppt-ripple'
      ];
      allPptAnimClasses.forEach(cls => content.classList.remove(cls));
      content.style.background = '';
      content.style.color = '';
      content.style.border = '';
    }
    document.removeEventListener('keydown', handleSlideShowKey);
    showToast('Exited presentation slide show', 'info');
  }

  function handleSlideShowKey(e) {
    const overlay = $('#slideshowOverlay');
    if (!overlay || !overlay.classList.contains('show')) return;

    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
      e.preventDefault();
      showSlideShowIndex(currentSlideShowIdx + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      showSlideShowIndex(currentSlideShowIdx - 1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      exitSlideShow();
    }
  }

  // Layout Tools (Issue 5: Page Orientation, Page Borders, Print Area)
  function togglePageOrientation() {
    const page = $('.editor-page');
    if (!page) return;
    const isLandscape = page.classList.toggle('landscape-page');
    $('#layoutOrientationBtn')?.classList.toggle('active', isLandscape);
    showToast(isLandscape ? 'Page Orientation: Landscape (11" × 8.5")' : 'Page Orientation: Portrait (8.5" × 11")', 'info');
  }

  function togglePageBorders() {
    const page = $('.editor-page');
    if (!page) return;
    const hasBorders = page.classList.toggle('page-borders-mode');
    $('#layoutPageBordersBtn')?.classList.toggle('active', hasBorders);
    showToast(hasBorders ? 'Page Borders: ON' : 'Page Borders: OFF', 'info');
  }

  function setPrintArea() {
    const page = $('.editor-page');
    if (!page) return;
    const isArea = page.classList.toggle('print-area-active');
    $('#layoutPrintAreaBtn')?.classList.toggle('active', isArea);
    showToast(isArea ? 'Print Area defined for document' : 'Print Area cleared', 'info');
  }

  // True Excel Capacity & Coordinates Controller (Issues 7, 8, 9)
  function jumpToExcelCoord(container, coordStr) {
    if (!container || !coordStr) return;
    const parsed = window.DocFlow.FileIO?.parseExcelCoord ?
      window.DocFlow.FileIO.parseExcelCoord(coordStr) : null;
    if (!parsed) {
      showToast(`Invalid Excel coordinate: "${coordStr}". Valid range: A1 to XFD1048576`, 'error');
      return;
    }

    const { col, row, colLetter } = parsed;
    const targetCoord = `${colLetter}${row}`;
    const table = container.querySelector('.excel-grid-table');
    if (!table) return;

    let targetCell = table.querySelector(`td[data-coord="${targetCoord}"]`);

    if (!targetCell) {
      const tbody = table.querySelector('tbody');
      const thead = table.querySelector('thead tr');
      const getLetter = window.DocFlow.FileIO?.getExcelColLetter || (i => i === 16383 ? 'XFD' : 'A');

      if (row > 100 || col > 50) {
        let colHdr = table.querySelector(`th.excel-col-hdr[data-col="${col}"]`);
        if (!colHdr) {
          const th = document.createElement('th');
          th.className = 'excel-col-hdr';
          th.dataset.col = col;
          th.contentEditable = 'false';
          th.textContent = colLetter;
          thead.appendChild(th);
        }
        let tr = tbody.querySelector(`tr[data-row="${row}"]`);
        if (!tr) {
          tr = document.createElement('tr');
          tr.dataset.row = row;
          const rowHdr = document.createElement('th');
          rowHdr.className = 'excel-row-hdr';
          rowHdr.contentEditable = 'false';
          rowHdr.textContent = row;
          tr.appendChild(rowHdr);
          tbody.appendChild(tr);
        }
        targetCell = tr.querySelector(`td[data-coord="${targetCoord}"]`);
        if (!targetCell) {
          targetCell = document.createElement('td');
          targetCell.contentEditable = 'true';
          targetCell.dataset.coord = targetCoord;
          tr.appendChild(targetCell);
        }
      } else {
        const currentCols = thead.querySelectorAll('.excel-col-hdr').length;
        for (let c = currentCols; c <= col; c++) {
          const th = document.createElement('th');
          th.className = 'excel-col-hdr';
          th.contentEditable = 'false';
          th.textContent = getLetter(c);
          thead.appendChild(th);
        }
        const currentRows = tbody.querySelectorAll('tr').length;
        for (let r = currentRows + 1; r <= row; r++) {
          const tr = document.createElement('tr');
          const rowHdr = document.createElement('th');
          rowHdr.className = 'excel-row-hdr';
          rowHdr.contentEditable = 'false';
          rowHdr.textContent = r;
          tr.appendChild(rowHdr);
          const totalCols = thead.querySelectorAll('.excel-col-hdr').length;
          for (let c = 0; c < totalCols; c++) {
            const td = document.createElement('td');
            td.contentEditable = 'true';
            td.dataset.coord = `${getLetter(c)}${r}`;
            tr.appendChild(td);
          }
          tbody.appendChild(tr);
        }
        targetCell = table.querySelector(`td[data-coord="${targetCoord}"]`);
      }
    }

    if (targetCell) {
      targetCell.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      targetCell.focus();
      window._activeExcelCell = targetCell;
      const coordBox = container.querySelector('.excel-coord-box');
      const formulaInput = container.querySelector('.excel-formula-input');
      if (coordBox) coordBox.value = targetCoord;
      if (formulaInput) formulaInput.value = targetCell.textContent || '';
      showToast(`Jumped to cell ${targetCoord}`, 'info');
    }
  }

  function setupExcelInteractions() {
    const editor = $('#editor');
    if (!editor) return;

    const container = editor.querySelector('.excel-spreadsheet-container');
    if (!container) return;

    $('#editorWrap')?.classList.add('is-excel-mode');

    // Issue 7 & 9: Lock editor canvas so whole sheet cannot be deleted by freeform selection
    editor.contentEditable = 'false';
    container.contentEditable = 'false';

    const formulaInput = container.querySelector('.excel-formula-input');
    const coordBox = container.querySelector('.excel-coord-box');

    const syncExcelNotesVisibility = (activeCell) => {
      const activeCoord = activeCell?.dataset?.coord;
      container.querySelectorAll('.excel-floating-note').forEach(note => {
        const targetCoord = note.getAttribute('data-target-coord');
        if (activeCoord && targetCoord === activeCoord) {
          note.style.display = 'block';
          if (!note._hasBeenDragged && activeCell) {
            const cRect = activeCell.getBoundingClientRect();
            const pRect = container.getBoundingClientRect();
            if (cRect.width > 0 && cRect.height > 0) {
              const leftPos = Math.max(10, Math.round(cRect.left - pRect.left + container.scrollLeft + cRect.width + 10));
              const topPos = Math.max(10, Math.round(cRect.top - pRect.top + container.scrollTop));
              note.style.left = leftPos + 'px';
              note.style.top = topPos + 'px';
            }
          }
        } else {
          note.style.display = 'none';
        }
      });
    };
    container._syncExcelNotesVisibility = syncExcelNotesVisibility;

    const attachCellSync = (td) => {
      if (td._excelSynced) return;
      td._excelSynced = true;

      td.addEventListener('focus', () => {
        window._activeExcelCell = td;
        container.querySelectorAll('td.excel-cell-focus').forEach(c => c.classList.remove('excel-cell-focus'));
        td.classList.add('excel-cell-focus');
        if (window._activeExcelFontFamily && !td.style.fontFamily) {
          td.style.fontFamily = window._activeExcelFontFamily;
        }
        if (formulaInput) formulaInput.value = td.textContent || '';
        if (coordBox) coordBox.value = td.dataset.coord || 'A1';
        syncExcelNotesVisibility(td);
      });

      td.addEventListener('blur', () => {
        td.classList.remove('excel-cell-focus');
      });

      td.addEventListener('input', () => {
        if (window._activeExcelFontFamily && !td.style.fontFamily) {
          td.style.fontFamily = window._activeExcelFontFamily;
        }
        if (formulaInput && window._activeExcelCell === td) {
          formulaInput.value = td.textContent || '';
        }
        window.DocFlow.Editor?.notifyChange();
        updateExcelChartPositions(container);
      });

      td.addEventListener('keydown', e => {
        // Tab / Shift+Tab Navigation
        if (e.key === 'Tab') {
          e.preventDefault();
          if (e.shiftKey) {
            const prev = td.previousElementSibling;
            if (prev && prev.tagName === 'TD') {
              prev.focus();
            } else {
              const prevTr = td.closest('tr')?.previousElementSibling;
              const tds = prevTr?.querySelectorAll('td');
              if (tds && tds.length) tds[tds.length - 1].focus();
            }
          } else {
            const next = td.nextElementSibling;
            if (next && next.tagName === 'TD') {
              next.focus();
            } else {
              const nextTr = td.closest('tr')?.nextElementSibling;
              const firstTd = nextTr?.querySelector('td');
              if (firstTd) firstTd.focus();
            }
          }
          return;
        }

        // Enter: evaluate formula if starts with '=', else move to next row
        if (e.key === 'Enter') {
          e.preventDefault();
          const text = (td.textContent || '').trim();
          const formVal = (formulaInput?.value || '').trim();
          const expr = text.startsWith('=') ? text : (formVal.startsWith('=') ? formVal : null);

          if (expr) {
            const table = td.closest('table') || container.querySelector('.excel-grid-table');
            const result = evaluateFormulaExpression(expr, table);
            // Problem 1.7 & 1.8: Put formula answer in front/next cell
            const frontCell = td.nextElementSibling && td.nextElementSibling.tagName === 'TD' ? td.nextElementSibling : td;
            frontCell.textContent = String(result);
            frontCell.focus();
            window._activeExcelCell = frontCell;
            if (coordBox) coordBox.value = frontCell.dataset.coord || '';
            if (formulaInput) formulaInput.value = String(result);
            window.DocFlow.Editor?.notifyChange();
            updateExcelChartPositions(container);
            showToast(`Formula evaluated: ${result}`, 'success');
          } else {
            const tr = td.closest('tr');
            const nextTr = tr?.nextElementSibling;
            if (nextTr) {
              const target = nextTr.children[td.cellIndex] || nextTr.querySelector('td');
              if (target && target.tagName === 'TD') {
                target.focus();
              }
            }
          }
          return;
        }

        // Arrow Navigation (Problem 1.6)
        if (e.key === 'ArrowDown') {
          const tr = td.closest('tr');
          const nextTr = tr?.nextElementSibling;
          if (nextTr) {
            const target = nextTr.children[td.cellIndex] || nextTr.querySelector('td');
            if (target && target.tagName === 'TD') {
              e.preventDefault();
              target.focus();
            }
          }
        } else if (e.key === 'ArrowUp') {
          const tr = td.closest('tr');
          const prevTr = tr?.previousElementSibling;
          if (prevTr) {
            const target = prevTr.children[td.cellIndex] || prevTr.querySelector('td');
            if (target && target.tagName === 'TD') {
              e.preventDefault();
              target.focus();
            }
          }
        } else if (e.key === 'ArrowRight') {
          const sel = window.getSelection();
          let isAtEnd = !td.textContent || !td.textContent.trim();
          if (!isAtEnd && sel && sel.rangeCount) {
            const r = sel.getRangeAt(0);
            if (r.collapsed) {
              const postR = r.cloneRange();
              postR.selectNodeContents(td);
              postR.setStart(r.endContainer, r.endOffset);
              isAtEnd = postR.toString().length === 0;
            }
          }
          if (isAtEnd) {
            const next = td.nextElementSibling;
            if (next && next.tagName === 'TD') {
              e.preventDefault();
              next.focus();
            }
          }
        } else if (e.key === 'ArrowLeft') {
          const sel = window.getSelection();
          let isAtStart = !td.textContent || !td.textContent.trim();
          if (!isAtStart && sel && sel.rangeCount) {
            const r = sel.getRangeAt(0);
            if (r.collapsed) {
              const preR = r.cloneRange();
              preR.selectNodeContents(td);
              preR.setEnd(r.startContainer, r.startOffset);
              isAtStart = preR.toString().length === 0;
            }
          }
          if (isAtStart) {
            const prev = td.previousElementSibling;
            if (prev && prev.tagName === 'TD') {
              e.preventDefault();
              prev.focus();
            }
          }
        }
      });
    };

    container.querySelectorAll('.excel-grid-table td').forEach(attachCellSync);

    const table = container.querySelector('.excel-grid-table');
    if (table && !table._hdrListeners) {
      table._hdrListeners = true;
      table.addEventListener('click', e => {
        const rowHdr = e.target.closest('.excel-row-hdr');
        if (rowHdr) {
          const tr = rowHdr.closest('tr');
          if (tr) {
            const isMulti = e.ctrlKey || e.metaKey;
            if (!isMulti && !e.shiftKey) {
              table.querySelectorAll('td.excel-cell-selected').forEach(c => {
                c.classList.remove('excel-cell-selected', 'excel-sel-top', 'excel-sel-bottom', 'excel-sel-left', 'excel-sel-right');
              });
              table.querySelectorAll('tr.excel-row-selected, th.excel-row-selected, th.excel-col-selected, td.excel-row-selected, td.excel-col-selected').forEach(el => {
                el.classList.remove('excel-row-selected', 'excel-col-selected');
              });
            }
            const isSelected = isMulti ? tr.classList.toggle('excel-row-selected') : true;
            tr.classList.toggle('excel-row-selected', isSelected);
            rowHdr.classList.toggle('excel-row-selected', isSelected);
            tr.querySelectorAll('td').forEach(td => {
              td.classList.toggle('excel-cell-selected', isSelected);
              td.classList.toggle('excel-row-selected', isSelected);
            });
            const firstTd = tr.querySelector('td');
            if (firstTd && isSelected) {
              firstTd.focus();
              window._activeExcelCell = firstTd;
              if (coordBox) coordBox.value = firstTd.dataset.coord || 'A1';
              if (formulaInput) formulaInput.value = firstTd.textContent || '';
              syncExcelNotesVisibility(firstTd);
            }
            window.DocFlow.Editor?.updateToolbarState?.();
          }
          return;
        }

        const colHdr = e.target.closest('.excel-col-hdr');
        if (colHdr) {
          const tr = colHdr.parentElement;
          const idx = Array.from(tr.children).indexOf(colHdr);
          const isMulti = e.ctrlKey || e.metaKey;
          if (!isMulti && !e.shiftKey) {
            table.querySelectorAll('td.excel-cell-selected').forEach(c => {
              c.classList.remove('excel-cell-selected', 'excel-sel-top', 'excel-sel-bottom', 'excel-sel-left', 'excel-sel-right');
            });
            table.querySelectorAll('tr.excel-row-selected, th.excel-row-selected, th.excel-col-selected, td.excel-row-selected, td.excel-col-selected').forEach(el => {
              el.classList.remove('excel-row-selected', 'excel-col-selected');
            });
          }
          const isSelected = isMulti ? colHdr.classList.toggle('excel-col-selected') : true;
          colHdr.classList.toggle('excel-col-selected', isSelected);
          table.querySelectorAll('tbody tr').forEach(row => {
            const cell = row.children[idx];
            if (cell && cell.tagName === 'TD') {
              cell.classList.toggle('excel-cell-selected', isSelected);
              cell.classList.toggle('excel-col-selected', isSelected);
            }
          });
          const firstTd = table.querySelector(`tbody tr td:nth-child(${idx + 1})`);
          if (firstTd && isSelected) {
            firstTd.focus();
            window._activeExcelCell = firstTd;
            if (coordBox) coordBox.value = firstTd.dataset.coord || 'A1';
            if (formulaInput) formulaInput.value = firstTd.textContent || '';
            syncExcelNotesVisibility(firstTd);
          }
          window.DocFlow.Editor?.updateToolbarState?.();
          return;
        }
      });

      let isSelecting = false;
      let startCell = null;

      // Mouse Selection (Hold Ctrl for multi-cell click selection)
      table.addEventListener('mousedown', e => {
        const td = e.target.closest('td');
        if (!td) return;

        // Clear lingering full column/row header selections if user clicks directly on cells
        if (table.querySelector('th.excel-col-selected, tr.excel-row-selected, th.excel-row-selected')) {
          table.querySelectorAll('tr.excel-row-selected, th.excel-row-selected, th.excel-col-selected, td.excel-row-selected, td.excel-col-selected').forEach(el => {
            el.classList.remove('excel-row-selected', 'excel-col-selected');
          });
          table.querySelectorAll('td.excel-cell-selected').forEach(c => {
            if (c !== td) c.classList.remove('excel-cell-selected');
          });
        }

        if (e.ctrlKey || e.metaKey) {
          td.classList.toggle('excel-cell-selected');
          window._activeExcelCell = td;
          if (coordBox) coordBox.value = td.dataset.coord || 'A1';
          if (formulaInput) formulaInput.value = td.textContent || '';
          syncExcelNotesVisibility(td);
          window.DocFlow.Editor?.updateToolbarState?.();
          return;
        }

        if (!e.shiftKey) {
          table.querySelectorAll('td.excel-cell-selected').forEach(c => {
            c.classList.remove('excel-cell-selected', 'excel-sel-top', 'excel-sel-bottom', 'excel-sel-left', 'excel-sel-right');
          });
          table.querySelectorAll('tr.excel-row-selected, th.excel-col-selected, th.excel-row-selected, td.excel-col-selected, td.excel-row-selected').forEach(el => {
            el.classList.remove('excel-row-selected', 'excel-col-selected');
          });
        }
        isSelecting = true;
        startCell = td;
        td.classList.add('excel-cell-selected');
        window._activeExcelCell = td;
        if (coordBox) coordBox.value = td.dataset.coord || 'A1';
        if (formulaInput) formulaInput.value = td.textContent || '';
        syncExcelNotesVisibility(td);
        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
          td.contentEditable = 'true';
          td.focus();
        }
        window.DocFlow.Editor?.updateToolbarState?.();
      });

      table.addEventListener('mouseover', e => {
        if (!isSelecting || !startCell) return;
        const currentTd = e.target.closest('td');
        if (!currentTd) return;

        const startTr = startCell.closest('tr');
        const currTr = currentTd.closest('tr');
        if (!startTr || !currTr) return;

        const minR = Math.min(startTr.rowIndex, currTr.rowIndex);
        const maxR = Math.max(startTr.rowIndex, currTr.rowIndex);
        const minC = Math.min(startCell.cellIndex, currentTd.cellIndex);
        const maxC = Math.max(startCell.cellIndex, currentTd.cellIndex);

        table.querySelectorAll('tbody tr').forEach(r => {
          if (r.rowIndex >= minR && r.rowIndex <= maxR) {
            Array.from(r.children).forEach(c => {
              if (c.tagName === 'TD') {
                if (c.cellIndex >= minC && c.cellIndex <= maxC) {
                  c.classList.add('excel-cell-selected');
                } else if (!e.shiftKey) {
                  c.classList.remove('excel-cell-selected');
                }
              }
            });
          } else if (!e.shiftKey) {
            r.querySelectorAll('td').forEach(c => c.classList.remove('excel-cell-selected'));
          }
        });
      });

      window.addEventListener('mouseup', () => {
        if (isSelecting) {
          isSelecting = false;
          window.DocFlow.Editor?.updateToolbarState?.();
        }
      });

      // Mobile long-press multi-cell / row / col selection (Issue 4)
      let touchTimer = null;
      let touchStartX = 0;
      let touchStartY = 0;
      let touchTarget = null;

      table.addEventListener('touchstart', e => {
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchTarget = e.target.closest('td, th.excel-row-hdr, th.excel-col-hdr');
        if (!touchTarget) return;

        clearTimeout(touchTimer);
        touchTimer = setTimeout(() => {
          if (!touchTarget) return;
          if (navigator.vibrate) {
            try { navigator.vibrate(40); } catch (_) {}
          }
          if (touchTarget.tagName === 'TD') {
            if (table.querySelector('th.excel-col-selected, tr.excel-row-selected, th.excel-row-selected')) {
              table.querySelectorAll('tr.excel-row-selected, th.excel-row-selected, th.excel-col-selected, td.excel-row-selected, td.excel-col-selected').forEach(el => {
                el.classList.remove('excel-row-selected', 'excel-col-selected');
              });
              table.querySelectorAll('td.excel-cell-selected').forEach(c => {
                if (c !== touchTarget) c.classList.remove('excel-cell-selected');
              });
            }
            const isSel = touchTarget.classList.toggle('excel-cell-selected');
            window._activeExcelCell = touchTarget;
            if (coordBox) coordBox.value = touchTarget.dataset.coord || 'A1';
            if (formulaInput) formulaInput.value = touchTarget.textContent || '';
            syncExcelNotesVisibility(touchTarget);
            showToast(`Cell ${touchTarget.dataset.coord || ''} ${isSel ? 'selected' : 'unselected'}`, 'info');
          } else if (touchTarget.classList.contains('excel-row-hdr')) {
            const tr = touchTarget.closest('tr');
            if (tr) {
              const isSel = tr.classList.toggle('excel-row-selected');
              tr.querySelectorAll('td').forEach(c => c.classList.toggle('excel-cell-selected', isSel));
              showToast(`Row ${touchTarget.textContent.trim()} ${isSel ? 'selected' : 'unselected'}`, 'info');
            }
          } else if (touchTarget.classList.contains('excel-col-hdr')) {
            const tr = touchTarget.parentElement;
            const idx = Array.from(tr.children).indexOf(touchTarget);
            const isSel = touchTarget.classList.toggle('excel-col-selected');
            table.querySelectorAll('tbody tr').forEach(row => {
              const cell = row.children[idx];
              if (cell && cell.tagName === 'TD') cell.classList.toggle('excel-cell-selected', isSel);
            });
            showToast(`Column ${touchTarget.textContent.trim()} ${isSel ? 'selected' : 'unselected'}`, 'info');
          }
        }, 420);
      }, { passive: true });

      table.addEventListener('touchmove', e => {
        if (!touchTarget || !touchTimer) return;
        const touch = e.touches[0];
        if (Math.abs(touch.clientX - touchStartX) > 12 || Math.abs(touch.clientY - touchStartY) > 12) {
          clearTimeout(touchTimer);
          touchTimer = null;
        }
      }, { passive: true });

      table.addEventListener('touchend', () => {
        clearTimeout(touchTimer);
        touchTimer = null;
      });

      table.addEventListener('touchcancel', () => {
        clearTimeout(touchTimer);
        touchTimer = null;
      });
    }

    if (formulaInput && !formulaInput._excelSynced) {
      formulaInput._excelSynced = true;
      formulaInput.addEventListener('input', () => {
        if (window._activeExcelCell) {
          window._activeExcelCell.textContent = formulaInput.value;
          window.DocFlow.Editor?.notifyChange();
        }
      });
      formulaInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const cell = window._activeExcelCell || document.querySelector('.excel-grid-table td.excel-cell-selected');
          if (!cell) return;
          const expr = (formulaInput.value || '').trim();
          if (expr.startsWith('=')) {
            const table = cell.closest('table') || document.querySelector('.excel-grid-table');
            const result = evaluateFormulaExpression(expr, table);
            const frontCell = cell.nextElementSibling && cell.nextElementSibling.tagName === 'TD' ? cell.nextElementSibling : cell;
            frontCell.textContent = String(result);
            frontCell.focus();
            window._activeExcelCell = frontCell;
            if (coordBox) coordBox.value = frontCell.dataset.coord || '';
            formulaInput.value = String(result);
            window.DocFlow.Editor?.notifyChange();
            showToast(`Formula evaluated: ${result}`, 'success');
          } else {
            cell.textContent = formulaInput.value;
            cell.focus();
            window.DocFlow.Editor?.notifyChange();
          }
        }
      });
    }

    if (coordBox && !coordBox._excelSynced) {
      coordBox._excelSynced = true;
      coordBox.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          jumpToExcelCoord(container, coordBox.value);
        }
      });
      coordBox.addEventListener('change', () => {
        jumpToExcelCoord(container, coordBox.value);
      });
    }

    container.querySelectorAll('.excel-jump-btn').forEach(btn => {
      if (btn._excelSynced) return;
      btn._excelSynced = true;
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const type = btn.dataset.jump;
        if (type === 'home') {
          jumpToExcelCoord(container, 'A1');
        } else if (type === 'end') {
          jumpToExcelCoord(container, 'XFD1048576');
        }
      });
    });

    if (!container._deletionProtected) {
      container._deletionProtected = true;

      const getSelectedExcelCells = () => {
        const table = container.querySelector('.excel-grid-table');
        if (!table) return [];
        const cells = Array.from(table.querySelectorAll('td.excel-cell-selected, tr.excel-row-selected td, td.excel-col-selected'));
        if (cells.length > 0) return Array.from(new Set(cells));
        if (window._activeExcelCell && document.body.contains(window._activeExcelCell)) return [window._activeExcelCell];
        return [];
      };

      const copySelectedToClipboard = async () => {
        const table = container.querySelector('.excel-grid-table');
        if (!table) return '';
        const cells = getSelectedExcelCells();
        if (cells.length === 0) return '';

        let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
        cells.forEach(c => {
          const r = c.closest('tr')?.rowIndex || 0;
          const col = c.cellIndex;
          if (r < minR) minR = r;
          if (r > maxR) maxR = r;
          if (col < minC) minC = col;
          if (col > maxC) maxC = col;
        });

        const rows = [];
        for (let r = minR; r <= maxR; r++) {
          const rowCells = [];
          const tr = table.rows[r];
          for (let c = minC; c <= maxC; c++) {
            const cell = tr?.cells[c];
            rowCells.push((cell && cell.tagName === 'TD') ? cell.textContent.trim() : '');
          }
          rows.push(rowCells.join('\t'));
        }
        const tsv = rows.join('\n');
        try {
          await navigator.clipboard.writeText(tsv);
        } catch (_) {
          const ta = document.createElement('textarea');
          ta.value = tsv;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
        }
        return tsv;
      };

      const pasteFromClipboard = async (textData = null) => {
        const table = container.querySelector('.excel-grid-table');
        if (!table) return;
        let tsv = textData;
        if (tsv === null) {
          try {
            tsv = await navigator.clipboard.readText();
          } catch (_) {
            return;
          }
        }
        if (!tsv || typeof tsv !== 'string') return;

        let startCell = window._activeExcelCell;
        if (!startCell || !document.body.contains(startCell)) {
          startCell = table.querySelector('td.excel-cell-selected') || table.querySelector('tbody td');
        }
        if (!startCell) return;

        window.DocFlow.Editor?.saveSnapshot?.(true);

        const startR = startCell.closest('tr')?.rowIndex || 1;
        const startC = startCell.cellIndex;
        const rawLines = tsv.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        const parsedRows = rawLines.map(l => l.split('\t'));
        if (parsedRows.length > 1 && parsedRows[parsedRows.length - 1].length === 1 && !parsedRows[parsedRows.length - 1][0]) {
          parsedRows.pop();
        }

        let maxColsInPaste = 1;
        parsedRows.forEach(cols => {
          if (cols.length > maxColsInPaste) maxColsInPaste = cols.length;
        });

        const neededRows = startR + parsedRows.length;
        const neededCols = startC + maxColsInPaste;

        // Auto-expand columns if needed (Issue 1.4: beyond 50x50 auto expand)
        const theadRow = table.querySelector('thead tr');
        let currentCols = theadRow ? theadRow.children.length : 1;
        while (currentCols < neededCols) {
          let colLetter = '';
          let temp = currentCols;
          while (temp > 0) {
            let rem = (temp - 1) % 26;
            colLetter = String.fromCharCode(65 + rem) + colLetter;
            temp = Math.floor((temp - 1) / 26);
          }
          const th = document.createElement('th');
          th.className = 'excel-col-hdr';
          th.contentEditable = 'false';
          th.textContent = colLetter;
          theadRow.appendChild(th);

          table.querySelectorAll('tbody tr').forEach(tr => {
            const td = document.createElement('td');
            td.contentEditable = 'true';
            tr.appendChild(td);
            attachCellSync(td);
          });
          currentCols++;
        }

        // Auto-expand rows if needed (Issue 1.4: beyond 50x50 auto expand)
        let currentRows = table.rows.length;
        const tbody = table.querySelector('tbody') || table;
        while (currentRows < neededRows) {
          const newTr = document.createElement('tr');
          const rowHdr = document.createElement('th');
          rowHdr.className = 'excel-row-hdr';
          rowHdr.contentEditable = 'false';
          rowHdr.textContent = currentRows;
          newTr.appendChild(rowHdr);

          for (let c = 1; c < currentCols; c++) {
            const td = document.createElement('td');
            td.contentEditable = 'true';
            newTr.appendChild(td);
            attachCellSync(td);
          }
          tbody.appendChild(newTr);
          currentRows++;
        }

        parsedRows.forEach((cols, rOffset) => {
          const targetRow = table.rows[startR + rOffset];
          if (targetRow) {
            cols.forEach((val, cOffset) => {
              const targetTd = targetRow.cells[startC + cOffset];
              if (targetTd && targetTd.tagName === 'TD') {
                targetTd.textContent = val.trim();
              }
            });
          }
        });

        if (formulaInput && window._activeExcelCell) {
          formulaInput.value = window._activeExcelCell.textContent || '';
        }
        window.DocFlow.Editor?.notifyChange();
        window.DocFlow.Editor?.saveSnapshot?.(true);
        showToast(`Pasted clipboard data (${parsedRows.length}×${maxColsInPaste} cells) into spreadsheet`, 'success');
      };

      container.addEventListener('copy', e => {
        if (document.activeElement === formulaInput || document.activeElement === coordBox) return;
        const cells = getSelectedExcelCells();
        if (cells.length > 0) {
          e.preventDefault();
          copySelectedToClipboard().then(() => showToast(`Copied ${cells.length} cells`, 'info'));
        }
      });

      container.addEventListener('cut', e => {
        if (document.activeElement === formulaInput || document.activeElement === coordBox) return;
        const cells = getSelectedExcelCells();
        if (cells.length > 0) {
          e.preventDefault();
          copySelectedToClipboard().then(() => {
            cells.forEach(c => { c.textContent = ''; });
            if (formulaInput && window._activeExcelCell) formulaInput.value = '';
            window.DocFlow.Editor?.notifyChange();
            showToast(`Cut ${cells.length} cells`, 'info');
          });
        }
      });

      container.addEventListener('paste', e => {
        if (document.activeElement === formulaInput || document.activeElement === coordBox) return;
        const clipData = e.clipboardData?.getData('text/plain');
        if (clipData && (clipData.includes('\t') || clipData.includes('\n'))) {
          e.preventDefault();
          pasteFromClipboard(clipData);
        }
      });

      container.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
          if (document.activeElement === formulaInput || document.activeElement === coordBox) {
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          const table = container.querySelector('.excel-grid-table');
          if (table) {
            const allTds = Array.from(table.querySelectorAll('tbody td'));
            const currentlySelected = table.querySelectorAll('td.excel-cell-selected');
            const contentCells = allTds.filter(c => c.textContent.trim().length > 0);

            // If some cells are selected and not all, or on 2nd Ctrl+A -> select ALL cells
            const shouldSelectAll = (currentlySelected.length > 0 && currentlySelected.length < allTds.length && currentlySelected.length >= contentCells.length);

            table.querySelectorAll('th').forEach(th => th.classList.remove('excel-row-selected', 'excel-col-selected'));
            table.querySelectorAll('tr').forEach(tr => tr.classList.remove('excel-row-selected'));
            table.querySelectorAll('td').forEach(td => {
              td.classList.remove('excel-cell-selected', 'excel-sel-top', 'excel-sel-bottom', 'excel-sel-left', 'excel-sel-right');
            });

            if (shouldSelectAll || contentCells.length === 0) {
              allTds.forEach(c => c.classList.add('excel-cell-selected'));
              window._activeExcelCell = allTds[0];
              showToast(`All ${allTds.length} spreadsheet cells selected`, 'info');
            } else {
              let minR = Math.min(...contentCells.map(c => c.closest('tr').rowIndex));
              let maxR = Math.max(...contentCells.map(c => c.closest('tr').rowIndex));
              let minC = Math.min(...contentCells.map(c => c.cellIndex));
              let maxC = Math.max(...contentCells.map(c => c.cellIndex));

              table.querySelectorAll('tbody tr').forEach(r => {
                if (r.rowIndex >= minR && r.rowIndex <= maxR) {
                  Array.from(r.children).forEach(c => {
                    if (c.tagName === 'TD' && c.cellIndex >= minC && c.cellIndex <= maxC) {
                      c.classList.add('excel-cell-selected');
                      if (r.rowIndex === minR) c.classList.add('excel-sel-top');
                      if (r.rowIndex === maxR) c.classList.add('excel-sel-bottom');
                      if (c.cellIndex === minC) c.classList.add('excel-sel-left');
                      if (c.cellIndex === maxC) c.classList.add('excel-sel-right');
                    }
                  });
                }
              });
              window._activeExcelCell = contentCells[0] || allTds[0];
              showToast('Spreadsheet content area selected (Excel perimeter border)', 'info');
            }
            window.DocFlow.Editor?.updateToolbarState?.();
          }
        } else if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
          if (document.activeElement === formulaInput || document.activeElement === coordBox) return;
          const cells = getSelectedExcelCells();
          if (cells.length > 0) {
            e.preventDefault();
            copySelectedToClipboard().then(() => showToast(`Copied ${cells.length} cells`, 'info'));
          }
        } else if ((e.ctrlKey || e.metaKey) && (e.key === 'x' || e.key === 'X')) {
          if (document.activeElement === formulaInput || document.activeElement === coordBox) return;
          const cells = getSelectedExcelCells();
          if (cells.length > 0) {
            e.preventDefault();
            copySelectedToClipboard().then(() => {
              cells.forEach(c => { c.textContent = ''; });
              if (formulaInput && window._activeExcelCell) formulaInput.value = '';
              window.DocFlow.Editor?.notifyChange();
              showToast(`Cut ${cells.length} cells`, 'info');
            });
          }
        } else if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
          if (document.activeElement === formulaInput || document.activeElement === coordBox) return;
          e.preventDefault();
          pasteFromClipboard();
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
          if (document.activeElement === formulaInput || document.activeElement === coordBox) return;
          const cells = getSelectedExcelCells();
          if (cells.length > 1 || (cells.length === 1 && document.activeElement !== cells[0])) {
            e.preventDefault();
            cells.forEach(c => { c.textContent = ''; });
            if (formulaInput && window._activeExcelCell) formulaInput.value = '';
            window.DocFlow.Editor?.notifyChange();
            showToast(`Cleared ${cells.length} cells`, 'info');
          } else if (window._activeExcelCell && document.activeElement === window._activeExcelCell) {
            setTimeout(() => {
              if (formulaInput) formulaInput.value = window._activeExcelCell.textContent || '';
              window.DocFlow.Editor?.notifyChange();
            }, 0);
          }
        }
      });
    }

    if (!editor._focusLockedToExcel) {
      editor._focusLockedToExcel = true;
      editor.addEventListener('click', e => {
        if (editor.querySelector('.excel-spreadsheet-container')) {
          const isAllowed = e.target.closest(
            '.excel-spreadsheet-container, .doc-textarea-container, .doc-shape-container, .chart-render-wrapper, .excel-floating-note, .df-img-move-handle, .df-img-handle, .df-img-toolbar, .doc-table'
          );
          if (!isAllowed) {
            e.preventDefault();
            e.stopPropagation();
            if (window._activeExcelCell) {
              window._activeExcelCell.focus();
            } else {
              container.querySelector('td')?.focus();
            }
          }
        }
      });
    }

    // Sync notes that already exist in the container
    container.querySelectorAll('.excel-floating-note').forEach(note => {
      const coord = note.getAttribute('data-target-coord');
      if (coord) {
        const td = container.querySelector(`td[data-coord="${coord}"]`);
        if (td) td.classList.add('excel-has-note');
      }
      const closeBtn = note.querySelector('.excel-note-close-btn');
      if (closeBtn && !closeBtn._bound) {
        closeBtn._bound = true;
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const c = note.getAttribute('data-target-coord');
          note.remove();
          if (c) {
            const td = container.querySelector(`td[data-coord="${c}"]`);
            if (td) td.classList.remove('excel-has-note');
          }
          window.DocFlow.Editor?.notifyChange();
          window.DocFlow.Editor?.saveSnapshot?.(true);
          showToast('Cell note removed', 'info');
        });
      }
      const hdr = note.querySelector('.excel-note-header');
      if (hdr && !hdr._bound) {
        hdr._bound = true;
        let isDragging = false, dragX = 0, dragY = 0, initLeft = 0, initTop = 0;
        hdr.addEventListener('mousedown', (e) => {
          if (e.target.closest('.excel-note-close-btn')) return;
          e.preventDefault();
          isDragging = true;
          dragX = e.clientX;
          dragY = e.clientY;
          initLeft = parseInt(note.style.left, 10) || 0;
          initTop = parseInt(note.style.top, 10) || 0;
          const onMouseMove = (me) => {
            if (!isDragging) return;
            note._hasBeenDragged = true;
            note.style.left = (initLeft + (me.clientX - dragX)) + 'px';
            note.style.top = (initTop + (me.clientY - dragY)) + 'px';
          };
          const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            window.DocFlow.Editor?.notifyChange();
          };
          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        });
      }
    });

    const currentCell = window._activeExcelCell || container.querySelector('td.excel-cell-selected');
    syncExcelNotesVisibility(currentCell);

    updateExcelChartPositions(container);
  }

  // Watermark Inner HTML Generator
  function buildWatermarkHtml(activeWm) {
    if (!activeWm || !activeWm.text || activeWm.text === 'none') return '';
    const text = activeWm.text;
    const angle = activeWm.angle !== undefined ? activeWm.angle : -35;
    const color = activeWm.color || 'rgba(148, 163, 184, 0.18)';
    const pos = activeWm.pos || 'center';
    const count = activeWm.count || '1';

    let alignStyle = 'align-items: center; justify-content: center;';
    if (pos === 'top') alignStyle = 'align-items: flex-start; justify-content: center; padding-top: 80px;';
    if (pos === 'bottom') alignStyle = 'align-items: flex-end; justify-content: center; padding-bottom: 80px;';

    const singleSpan = `<span contenteditable="false" style="font-size: 64px; font-weight: 800; color: ${color}; transform: rotate(${angle}deg); letter-spacing: 10px; text-transform: uppercase; margin: 20px; display: inline-block; pointer-events: none !important; user-select: none !important;">${escHtml(text)}</span>`;

    let inner = singleSpan;
    if (count === '2') {
      inner = `<div style="display:flex; flex-direction:column; justify-content:space-around; height:100%; width:100%; align-items:center;">${singleSpan}${singleSpan}</div>`;
    } else if (count === '4') {
      inner = `<div style="display:grid; grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr; height:100%; width:100%; place-items:center;">${singleSpan}${singleSpan}${singleSpan}${singleSpan}</div>`;
    } else if (count === 'repeat') {
      inner = `<div style="display:flex; flex-wrap:wrap; justify-content:space-around; align-content:space-around; height:100%; width:100%; opacity:0.85;">${singleSpan.repeat(8)}</div>`;
    }

    return inner;
  }

  // Ribbon Action Handlers
  function initRibbon() {
    // 1. Tab buttons
    $$('.ribbon-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        switchRibbonTab(btn.dataset.ribbon);
      });
    });

    // 2. File Panel
    $('#ribbonNewBtn')?.addEventListener('click', () => openModal('#newDocModal'));
    $('#ribbonOpenBtn')?.addEventListener('click', () => $('#openBtn')?.click());
    $('#ribbonFilePrintBtn')?.addEventListener('click', triggerPrint);

    // File Panel Office Buttons (Word, Excel, PPT, PDF - Bug 2)
    $('#ribbonNewWordBtn')?.addEventListener('click', () => createNewDocDirect('docx', 'Untitled Word Document'));
    $('#ribbonNewExcelBtn')?.addEventListener('click', () => createNewDocDirect('xlsx', 'Workbook'));
    $('#ribbonNewPptBtn')?.addEventListener('click', () => createNewDocDirect('pptx', 'Presentation'));
    $('#ribbonNewPdfBtn')?.addEventListener('click', () => createNewDocDirect('pdf', 'Document'));

    // File Panel Save Dropdown (Bug 6: HTML, Text, Markdown, PDF, Merge PDFs, Print)
    const ribbonSaveDropdownBtn = $('#ribbonSaveDropdownBtn');
    const ribbonSaveDropdown = $('#ribbonSaveDropdown');
    if (ribbonSaveDropdownBtn && ribbonSaveDropdown) {
      ribbonSaveDropdownBtn.addEventListener('click', e => {
        e.stopPropagation();
        const wasOpen = ribbonSaveDropdown.classList.contains('show');
        if (window.DocFlow?.UI?.closeAllPopovers) window.DocFlow.UI.closeAllPopovers();
        if (!wasOpen) {
          if (window.DocFlow?.UI?.positionPopover) {
            window.DocFlow.UI.positionPopover(ribbonSaveDropdownBtn, ribbonSaveDropdown);
          } else {
            ribbonSaveDropdown.classList.add('show');
          }
        }
      });
    }

    $('#ribbonSaveDocx')?.addEventListener('click', () => {
      ribbonSaveDropdown?.classList.remove('show');
      window.DocFlow.FileIO?.saveAsDocx();
    });
    $('#ribbonSaveXlsx')?.addEventListener('click', () => {
      ribbonSaveDropdown?.classList.remove('show');
      window.DocFlow.FileIO?.saveAsXlsx();
    });
    $('#ribbonSavePptx')?.addEventListener('click', () => {
      ribbonSaveDropdown?.classList.remove('show');
      window.DocFlow.FileIO?.saveAsPptx();
    });
    $('#ribbonSaveHtml')?.addEventListener('click', () => {
      ribbonSaveDropdown?.classList.remove('show');
      window.DocFlow.FileIO?.saveAsHtml();
    });
    $('#ribbonSaveTxt')?.addEventListener('click', () => {
      ribbonSaveDropdown?.classList.remove('show');
      window.DocFlow.FileIO?.saveAsTxt();
    });
    $('#ribbonSaveMd')?.addEventListener('click', () => {
      ribbonSaveDropdown?.classList.remove('show');
      window.DocFlow.FileIO?.saveAsMarkdown();
    });
    $('#ribbonSavePdf')?.addEventListener('click', () => {
      ribbonSaveDropdown?.classList.remove('show');
      window.DocFlow.FileIO?.exportAsPdf();
    });
    $('#ribbonMergeBtn')?.addEventListener('click', () => {
      ribbonSaveDropdown?.classList.remove('show');
      openModal('#pdfMergeModal');
    });
    $('#ribbonPrintBtn')?.addEventListener('click', () => {
      ribbonSaveDropdown?.classList.remove('show');
      triggerPrint();
    });

    // Auto-Save Toggle Button in File Panel
    $('#autoSaveToggleBtn')?.addEventListener('click', () => {
      autoSaveEnabled = !autoSaveEnabled;
      try {
        localStorage.setItem('df-autosave', autoSaveEnabled ? 'true' : 'false');
      } catch (e) { }
      updateAutoSaveUI();
      showToast(`Auto-Save is now ${autoSaveEnabled ? 'ON (5s timer)' : 'OFF'}`, autoSaveEnabled ? 'success' : 'info');
    });

    // Colorful Text Shadows Dropdown (first.txt Issue 2)
    const textShadowBtn = $('#textShadowBtn');
    const textShadowPopover = $('#textShadowPopover');
    if (textShadowBtn && textShadowPopover) {
      textShadowBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (textShadowPopover.classList.contains('show')) {
          textShadowPopover.classList.remove('show');
        } else {
          window.DocFlow.UI?.positionPopover?.(textShadowBtn, textShadowPopover);
          textShadowPopover.classList.add('show');
        }
      });
      $$('#textShadowPopover .spacing-opt-item[data-shadow]').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const shadowVal = item.dataset.shadow;
          textShadowPopover.classList.remove('show');
          window.DocFlow.Editor?.applyTextShadow?.(shadowVal);
        });
      });
    }

    $('#homePptShadowBtn')?.addEventListener('click', () => {
      window.DocFlow.Editor?.toggleTextShadow?.();
    });

    // 3. Insert Panel (Picture, Table, Charts, Symbols)
    $('#ribbonInsertChartBtn')?.addEventListener('click', () => {
      if (window.DocFlow.currentMode !== 'edit') {
        showToast('Open a document in edit mode first', 'info');
        return;
      }
      const excelContainer = document.querySelector('.excel-spreadsheet-container');
      const cells = excelContainer ? (window.DocFlow?.getSelectedExcelCells?.() || []) : [];
      const nums = cells.map(c => parseFloat(c.textContent.replace(/[^0-9.-]/g, ''))).filter(n => !isNaN(n));
      if (nums.length > 0) {
        if (chartSourceSelect) chartSourceSelect.value = 'selected';
        if (chartRangeWrap) chartRangeWrap.style.display = 'none';
        $('#chartValuesInput').value = nums.join(', ');
        showToast(`Loaded ${nums.length} values from selected cells`, 'info');
      }
      openModal('#chartModal');
    });
    const chartSourceSelect = $('#chartDataSourceSelect');
    const chartRangeWrap = $('#chartRangeWrap');
    const chartRangeInput = $('#chartRangeInput');
    const chartLoadRangeBtn = $('#chartLoadRangeBtn');

    chartSourceSelect?.addEventListener('change', () => {
      const mode = chartSourceSelect.value;
      if (chartRangeWrap) chartRangeWrap.style.display = (mode === 'customRange') ? 'block' : 'none';
      if (mode === 'selected') {
        const cells = window.DocFlow?.getSelectedExcelCells?.() || [];
        const nums = cells.map(c => parseFloat(c.textContent.replace(/[^0-9.-]/g, ''))).filter(n => !isNaN(n));
        if (nums.length > 0) {
          $('#chartValuesInput').value = nums.join(', ');
          showToast(`Loaded ${nums.length} values from selected cells`, 'info');
        } else {
          showToast('Select cells with numeric values in the spreadsheet first', 'info');
        }
      }
    });

    const extractValuesFromExcelRange = (query) => {
      const table = document.querySelector('.excel-grid-table');
      if (!table) return [];
      const q = query.trim().toUpperCase();
      const nums = [];

      if (q === 'SELECTED' || q === 'SELECTION') {
        const cells = window.DocFlow?.getSelectedExcelCells?.() || [];
        cells.forEach(td => {
          const val = parseFloat(td.textContent.replace(/[^0-9.-]/g, ''));
          if (!isNaN(val)) nums.push(val);
        });
        return nums;
      }

      // Cell range match e.g. A1:D5 or A2:A10
      const rangeMatch = q.match(/^([A-Z]+)(\d+)\s*(?:TO|:|-)\s*([A-Z]+)(\d+)$/i);
      if (rangeMatch) {
        const c1 = rangeMatch[1].charCodeAt(0) - 64;
        const r1 = parseInt(rangeMatch[2], 10);
        const c2 = rangeMatch[3].charCodeAt(0) - 64;
        const r2 = parseInt(rangeMatch[4], 10);
        for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
          const tr = table.rows[r];
          if (tr) {
            for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) {
              const td = tr.children[c];
              if (td && td.tagName === 'TD') {
                const val = parseFloat(td.textContent.replace(/[^0-9.-]/g, ''));
                if (!isNaN(val)) nums.push(val);
              }
            }
          }
        }
        return nums;
      }

      // Row range match e.g. "Row 2", "Row 2:4", "Rows 2-5", "2:5", "Row 2"
      const rowRangeMatch = q.match(/^(?:ROWS?\s*)?(\d+)(?:\s*(?:TO|:|-)\s*(\d+))?$/i);
      if (rowRangeMatch) {
        const r1 = parseInt(rowRangeMatch[1], 10);
        const r2 = rowRangeMatch[2] ? parseInt(rowRangeMatch[2], 10) : r1;
        for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
          const tr = table.rows[r];
          if (tr) {
            Array.from(tr.querySelectorAll('td')).forEach(td => {
              const val = parseFloat(td.textContent.replace(/[^0-9.-]/g, ''));
              if (!isNaN(val)) nums.push(val);
            });
          }
        }
        return nums;
      }

      // Column range match e.g. "Col B", "Column B", "Cols B:D", "B:D", "B"
      const colRangeMatch = q.match(/^(?:COL(?:UMN)?S?\s*)?([A-Z])(?:\s*(?:TO|:|-)\s*([A-Z]))?$/i);
      if (colRangeMatch) {
        const c1 = colRangeMatch[1].charCodeAt(0) - 64;
        const c2 = colRangeMatch[2] ? colRangeMatch[2].charCodeAt(0) - 64 : c1;
        Array.from(table.querySelectorAll('tbody tr')).forEach(tr => {
          for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) {
            const td = tr.children[c];
            if (td && td.tagName === 'TD') {
              const val = parseFloat(td.textContent.replace(/[^0-9.-]/g, ''));
              if (!isNaN(val)) nums.push(val);
            }
          }
        });
        return nums;
      }

      return [];
    };

    chartLoadRangeBtn?.addEventListener('click', () => {
      const q = chartRangeInput?.value || '';
      const nums = extractValuesFromExcelRange(q);
      if (nums.length > 0) {
        $('#chartValuesInput').value = nums.join(', ');
        showToast(`Extracted ${nums.length} values from ${q}`, 'success');
      } else {
        showToast(`Could not find numbers for range "${q}". Try e.g. Row 2 or Col B`, 'warning');
      }
    });

    $('#chartInsertBtn')?.addEventListener('click', insertChartIntoDocument);
    $('#chartCancelBtn')?.addEventListener('click', () => closeModal('#chartModal'));

    // Line Customization Modal Trigger (Issue 4)
    $('#ribbonInsertHrBtn')?.addEventListener('click', () => {
      window.DocFlow.Editor?.openLineModal();
    });

    // PPT Slide Dropdown & actions (Issue 4: Next Slide / Outside & Nested Slide / Inside)
    const pptSlideDropdownBtn = $('#ribbonInsertPptSlideBtn');
    const pptSlidePopover = $('#pptSlidePopover');
    if (pptSlideDropdownBtn && pptSlidePopover) {
      pptSlideDropdownBtn.addEventListener('click', e => {
        e.stopPropagation();
        const wasOpen = pptSlidePopover.classList.contains('show');
        if (window.DocFlow?.UI?.closeAllPopovers) window.DocFlow.UI.closeAllPopovers();
        if (!wasOpen) {
          if (window.DocFlow?.UI?.positionPopover) {
            window.DocFlow.UI.positionPopover(pptSlideDropdownBtn, pptSlidePopover);
          } else {
            pptSlidePopover.classList.add('show');
          }
        }
      });
    }

    $('#pptInsertNextSlideBtn')?.addEventListener('click', () => {
      $('#pptSlidePopover')?.classList.remove('show');
      insertPptSlide(false);
    });
    $('#pptInsertNestedSlideBtn')?.addEventListener('click', () => {
      $('#pptSlidePopover')?.classList.remove('show');
      insertPptSlide(true);
    });

    $('#ribbonInsertDateBtn')?.addEventListener('click', () => {
      if (window.DocFlow.currentMode !== 'edit') return;
      const now = new Date();
      const dateStr = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + ' ' + now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const cell = getActiveTableCell();
      if (cell && cell.tagName === 'TD') {
        cell.textContent = dateStr;
        window._activeExcelCell = cell;
        const fi = $('#excelFormulaInput');
        if (fi) fi.value = dateStr;
        window.DocFlow.Editor?.notifyChange();
        showToast('Inserted current date into cell', 'success');
        restoreCellFocus(cell);
        return;
      }
      window.DocFlow.Editor?.insertHtmlAtCursor(dateStr + ' ');
      showToast('Inserted current date', 'info');
    });

    $('#ribbonInsertSymbolBtn')?.addEventListener('click', () => {
      if (window.DocFlow.currentMode !== 'edit') {
        showToast('Open a document in edit mode first', 'info');
        return;
      }
      openModal('#symbolModal');
    });

    // OneNote Checklist with auto-strikethrough toggle (Issue 3.d)
    $('#insertChecklistBtn')?.addEventListener('click', () => {
      if (window.DocFlow.currentMode !== 'edit') return;
      const checklistHtml = `<div class="onenote-checklist-item" style="display:flex;align-items:flex-start;gap:8px;margin:6px 0;"><input type="checkbox" class="onenote-checklist-checkbox" style="margin-top:4px;cursor:pointer;"><span class="onenote-checklist-text" contenteditable="true" style="outline:none;flex:1;">To-do item...</span></div><p><br></p>`;
      window.DocFlow.Editor?.insertHtmlAtCursor(checklistHtml);
      showToast('Inserted Interactive Checklist', 'info');
    });

    // Checklist auto-strikethrough when checked, remove strikethrough when unchecked (Issue 3.d)
    const handleCheckboxToggle = (e) => {
      const cb = e.target.closest('input[type="checkbox"]');
      if (!cb || !document.getElementById('editor')?.contains(cb)) return;

      const isChecked = cb.checked;
      if (isChecked) {
        cb.setAttribute('checked', 'checked');
      } else {
        cb.removeAttribute('checked');
      }

      const item = cb.closest('.onenote-checklist-item, li, label, div, p');
      if (item) {
        item.classList.toggle('is-checked', isChecked);
        item.classList.toggle('checked', isChecked);
      }
      const textEl = cb.closest('.onenote-checklist-item')?.querySelector('.onenote-checklist-text') ||
                     item?.querySelector('.onenote-checklist-text, .task-text, span') ||
                     cb.nextElementSibling;
      if (textEl && textEl !== cb) {
        textEl.classList.toggle('checked', isChecked);
        if (isChecked) {
          textEl.style.textDecoration = 'line-through';
          textEl.style.opacity = '0.6';
        } else {
          textEl.style.textDecoration = 'none';
          textEl.style.opacity = '1';
        }
      }

      window.DocFlow.Editor?.notifyChange();
      window.DocFlow.Editor?.saveSnapshot?.(true);
      window.DocFlow.UI?.Tabs?.saveCurrent?.();
    };

    document.addEventListener('change', handleCheckboxToggle);
    document.addEventListener('click', (e) => {
      if (e.target.matches?.('input[type="checkbox"]') && document.getElementById('editor')?.contains(e.target)) {
        setTimeout(() => handleCheckboxToggle(e), 10);
      }
    });

    // Color palettes for interactive notes (Issue 3.e & 3.f: yellow, green, blue, pink, orange, purple)
    const NOTE_PALETTES = [
      { bg: '#fef9c3', border: '#facc15', header: '#854d0e' },
      { bg: '#dcfce7', border: '#86efac', header: '#166534' },
      { bg: '#e0f2fe', border: '#7dd3fc', header: '#075985' },
      { bg: '#fce7f3', border: '#f472b6', header: '#9d174d' },
      { bg: '#ffedd5', border: '#fdba74', header: '#9a3412' },
      { bg: '#f3e8ff', border: '#d8b4fe', header: '#6b21a8' }
    ];

    function createInteractiveNoteElement() {
      const noteId = 'doc_note_' + Date.now();
      const div = document.createElement('div');
      div.className = 'doc-custom-line doc-custom-note doc-interactive-note onenote-sticky-note';
      div.id = noteId;
      div.contentEditable = 'false';
      div.style.cssText = 'position:relative;width:280px;min-height:95px;background:#fef08a;border:1.5px solid #eab308;border-left:5px solid #eab308;border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,0.12);margin:14px 0;display:inline-block;box-sizing:border-box;vertical-align:top;z-index:20;cursor:pointer;';
      div.innerHTML = `
        <div class="doc-note-header" style="display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.05);padding:6px 12px;cursor:pointer;user-select:none;border-bottom:1px solid rgba(234,179,8,0.3);font-size:12px;font-weight:700;color:#713f12;">
          <span class="doc-note-drag-title"><i class="fas fa-note-sticky" style="margin-right:6px;color:#eab308;"></i>Note</span>
        </div>
        <div class="doc-note-body" contenteditable="true" style="padding:10px 12px;font-size:13px;line-height:1.6;color:#1e293b;outline:none;min-height:50px;box-sizing:border-box;" data-placeholder="Write your note here...">Write your note here...</div>
      `;
      return div;
    }

    // Save note on input / blur
    document.addEventListener('input', (e) => {
      if (e.target.closest('.doc-note-body')) {
        window.DocFlow.Editor?.notifyChange();
        window.DocFlow.UI?.Tabs?.saveCurrent?.();
      }
    });
    document.addEventListener('blur', (e) => {
      if (e.target.closest?.('.doc-note-body')) {
        window.DocFlow.Editor?.notifyChange();
        window.DocFlow.UI?.Tabs?.saveCurrent?.();
      }
    }, true);

    $('#insertStickyNoteBtn')?.addEventListener('click', () => {
      if (window.DocFlow.currentMode !== 'edit') return;
      const excelContainer = document.querySelector('.excel-spreadsheet-container');
      if (excelContainer) {
        window.DocFlow.Editor?.saveSnapshot?.(true);
        if (getComputedStyle(excelContainer).position === 'static') {
          excelContainer.style.position = 'relative';
        }
        const activeCell = (window._activeExcelCell && excelContainer.contains(window._activeExcelCell))
          ? window._activeExcelCell
          : (excelContainer.querySelector('td.excel-cell-selected') || excelContainer.querySelector('tbody td'));
        if (activeCell) {
          activeCell.classList.add('excel-has-note');
          const coord = activeCell.dataset.coord || 'Cell';
          const cRect = activeCell.getBoundingClientRect();
          const pRect = excelContainer.getBoundingClientRect();
          const leftPos = Math.max(10, Math.round(cRect.left - pRect.left + excelContainer.scrollLeft + cRect.width + 10));
          const topPos = Math.max(10, Math.round(cRect.top - pRect.top + excelContainer.scrollTop));

          const noteDiv = document.createElement('div');
          noteDiv.className = 'excel-floating-note doc-note-card';
          noteDiv.setAttribute('data-target-coord', coord);
          noteDiv.style.cssText = `position:absolute;left:${leftPos}px;top:${topPos}px;width:190px;min-height:95px;background:#fef9c3;border:1px solid #facc15;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.15);padding:8px 10px;z-index:35;font-size:12px;color:#1e293b;cursor:default;box-sizing:border-box;`;
          noteDiv.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;font-weight:700;font-size:11px;color:#854d0e;border-bottom:1px solid #fde047;padding-bottom:3px;cursor:move;user-select:none;" class="excel-note-header">
              <span><i class="fas fa-note-sticky" style="color:#eab308;margin-right:4px;"></i> Note (${coord})</span>
              <button type="button" class="excel-note-close-btn" style="border:none;background:transparent;cursor:pointer;color:#a16207;font-size:14px;padding:0 2px;line-height:1;" title="Delete Note">&times;</button>
            </div>
            <div class="excel-note-body" contenteditable="true" style="outline:none;min-height:50px;word-break:break-word;" data-placeholder="Enter note...">Write your note here...</div>
          `;

          // Header dragging
          const hdr = noteDiv.querySelector('.excel-note-header');
          let isDragging = false, dragX = 0, dragY = 0, initLeft = 0, initTop = 0;
          hdr.addEventListener('mousedown', (e) => {
            if (e.target.closest('.excel-note-close-btn')) return;
            e.preventDefault();
            isDragging = true;
            dragX = e.clientX;
            dragY = e.clientY;
            initLeft = parseInt(noteDiv.style.left, 10) || leftPos;
            initTop = parseInt(noteDiv.style.top, 10) || topPos;
            const onMouseMove = (me) => {
              if (!isDragging) return;
              noteDiv._hasBeenDragged = true;
              noteDiv.style.left = (initLeft + (me.clientX - dragX)) + 'px';
              noteDiv.style.top = (initTop + (me.clientY - dragY)) + 'px';
            };
            const onMouseUp = () => {
              isDragging = false;
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
              window.DocFlow.Editor?.notifyChange();
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
          });

          // Close button
          noteDiv.querySelector('.excel-note-close-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            noteDiv.remove();
            activeCell.classList.remove('excel-has-note');
            window.DocFlow.Editor?.notifyChange();
            window.DocFlow.Editor?.saveSnapshot?.(true);
            showToast('Cell note removed', 'info');
          });

          // Hide other cell notes so only active cell's note is shown
          excelContainer.querySelectorAll('.excel-floating-note').forEach(n => {
            if (n.getAttribute('data-target-coord') !== coord) {
              n.style.display = 'none';
            }
          });
          noteDiv.style.display = 'block';

          excelContainer.appendChild(noteDiv);
          const body = noteDiv.querySelector('.excel-note-body');
          body.addEventListener('input', () => {
            window.DocFlow.Editor?.notifyChange();
            window.DocFlow.UI?.Tabs?.saveCurrent?.();
          });
          body.addEventListener('blur', () => {
            window.DocFlow.Editor?.notifyChange();
            window.DocFlow.UI?.Tabs?.saveCurrent?.();
          });
          body.focus();
          window.DocFlow.Editor?.notifyChange();
          window.DocFlow.Editor?.saveSnapshot?.(true);
          showToast(`Note inserted for cell ${coord}`, 'success');
          return;
        }
      }

      // Non-Excel Documents (Word, PPT, TXT, HTML, MD)
      window.DocFlow.Editor?.saveSnapshot?.(true);
      const noteElem = createInteractiveNoteElement();

      // If PowerPoint presentation mode, insert onto active slide
      const activeSlide = window.DocFlow?.getCurrentSlideWrapper?.() || document.querySelector('.pptx-slide-wrapper.active-slide') || document.querySelector('.pptx-slide-card.active-slide');
      if (activeSlide && (document.body.classList.contains('slide-deck-mode') || window.DocFlow?.isPptxDocument?.())) {
        const slideContent = activeSlide.querySelector('.pptx-slide-content') || activeSlide.querySelector('.pptx-slide-card') || activeSlide;
        noteElem.style.position = 'absolute';
        noteElem.style.left = '60px';
        noteElem.style.top = '60px';
        noteElem.style.zIndex = '30';
        slideContent.appendChild(noteElem);
        window.DocFlow.ImageManager?.attachLineListeners?.(noteElem);
        window.DocFlow.ImageManager?.selectLine?.(noteElem);
        noteElem.querySelector('.doc-note-body')?.focus();
        window.DocFlow.Editor?.notifyChange();
        window.DocFlow.Editor?.saveSnapshot?.(true);
        window.DocFlow.UI?.Tabs?.saveCurrent?.();
        showToast('Inserted Note on slide', 'success');
        return;
      }

      // Word / TXT / HTML / MD flow document
      const editorEl = document.getElementById('editor');
      if (editorEl) {
        window.DocFlow.Editor?.insertHtmlAtCursor(noteElem.outerHTML + '<p><br></p>');
        window.DocFlow.Editor?.notifyChange();
        window.DocFlow.Editor?.saveSnapshot?.(true);
        window.DocFlow.UI?.Tabs?.saveCurrent?.();
        setTimeout(() => {
          const inserted = document.getElementById(noteElem.id);
          if (inserted) {
            window.DocFlow.ImageManager?.attachLineListeners?.(inserted);
            window.DocFlow.ImageManager?.selectLine?.(inserted);
          }
        }, 50);
        showToast('Inserted Note', 'success');
      }
    });

    const insertPageBreakAction = () => {
      if (window.DocFlow.currentMode !== 'edit') return;
      const excelContainer = document.querySelector('.excel-spreadsheet-container');
      if (excelContainer) {
        const table = excelContainer.querySelector('.excel-grid-table');
        if (table) {
          const targetRow = (window._activeExcelCell && window._activeExcelCell.closest('tr')) || table.querySelector('tbody tr');
          if (targetRow) {
            window.DocFlow.Editor?.saveSnapshot?.(true);
            targetRow.classList.add('excel-page-break-bottom');
            const colCount = targetRow.children.length || 10;
            const next = targetRow.nextElementSibling;
            if (!next || !next.classList.contains('excel-page-break-row')) {
              const pbRow = document.createElement('tr');
              pbRow.className = 'excel-page-break-row';
              pbRow.contentEditable = 'false';
              pbRow.innerHTML = `<td colspan="${colCount}" class="excel-page-break-cell"><div class="excel-page-break-divider"><i class="fas fa-file-invoice"></i> --- Page Break (Page splits here on print/export) ---</div></td>`;
              targetRow.parentNode.insertBefore(pbRow, targetRow.nextSibling);
            }
            window.DocFlow.Editor?.notifyChange?.();
            showToast(`Page break inserted below row ${targetRow.rowIndex || 1}`, 'success');
            return;
          }
        }
      }
      window.DocFlow.Editor?.insertHtmlAtCursor(
        '<div class="doc-page-break" contenteditable="false"><div class="doc-page-break-line"><span>Page Break</span></div></div><p><br></p>'
      );
      window.DocFlow.Editor?.notifyChange();
      showToast('Page break inserted', 'info');
    };
    $('#layoutPageBreakBtn')?.addEventListener('click', insertPageBreakAction);
    $('#ribbonInsertPageBreakBtn')?.addEventListener('click', insertPageBreakAction);

    // 4. Layout Panel (Margins, Paper Size, Multi-Columns, Watermark)
    // Margins Popover
    const marginBtn = $('#marginDropdownBtn');
    const marginPopover = $('#marginPopover');
    if (marginBtn && marginPopover) {
      marginBtn.addEventListener('click', e => {
        e.stopPropagation();
        const wasOpen = marginPopover.classList.contains('show');
        if (window.DocFlow?.UI?.closeAllPopovers) window.DocFlow.UI.closeAllPopovers();
        if (!wasOpen) {
          if (window.DocFlow?.UI?.positionPopover) {
            window.DocFlow.UI.positionPopover(marginBtn, marginPopover);
          } else {
            marginPopover.classList.add('show');
          }
        }
      });

      $$('.margin-opt-item[data-margin]').forEach(item => {
        item.addEventListener('click', () => {
          const type = item.dataset.margin;
          if (type === 'custom') {
            marginPopover.classList.remove('show');
            openModal('#customMarginModal');
            return;
          }
          applyMarginPreset(type);
          $$('.margin-opt-item[data-margin]').forEach(el => el.classList.remove('active'));
          item.classList.add('active');
          marginPopover.classList.remove('show');
        });
      });
    }

    // Custom Margins Dialog (Bug 5)
    $('#marginCustomItem')?.addEventListener('click', () => {
      marginPopover?.classList.remove('show');
      openModal('#customMarginModal');
    });

    $('#customMarginCancel')?.addEventListener('click', () => closeModal('#customMarginModal'));
    $('#customMarginApply')?.addEventListener('click', () => {
      const top = parseInt($('#customMarginTop')?.value, 10) || 72;
      const bottom = parseInt($('#customMarginBottom')?.value, 10) || 72;
      const left = parseInt($('#customMarginLeft')?.value, 10) || 72;
      const right = parseInt($('#customMarginRight')?.value, 10) || 72;
      const page = $('.editor-page');
      if (page) {
        page.style.padding = `${top}px ${right}px ${bottom}px ${left}px`;
        updateLayoutSetting('margin', { top, bottom, left, right });
        showToast(`Custom margins applied: ${top}px, ${right}px, ${bottom}px, ${left}px`, 'success');
      }
      closeModal('#customMarginModal');
    });

    function applyMarginPreset(type, save = true) {
      const page = $('.editor-page');
      if (!page) return;
      switch (type) {
        case 'normal':
          page.style.padding = '72px 72px';
          showToast('Margins: Normal (1 inch)', 'info');
          break;
        case 'narrow':
          page.style.padding = '36px 36px';
          showToast('Margins: Narrow (0.5 inch)', 'info');
          break;
        case 'moderate':
          page.style.padding = '72px 54px';
          showToast('Margins: Moderate (1" Top/Bottom, 0.75" Left/Right)', 'info');
          break;
        case 'wide':
          page.style.padding = '72px 108px';
          showToast('Margins: Wide (1.5 inch)', 'info');
          break;
        case 'mirrored':
          page.style.padding = '72px 90px 72px 72px';
          showToast('Margins: Mirrored', 'info');
          break;
        case 'office2003':
          page.style.padding = '72px 90px';
          showToast('Margins: Office 2003 Default', 'info');
          break;
        case 'zero':
          page.style.padding = '16px 20px';
          showToast('Margins: Zero / Full Width', 'info');
          break;
      }
      if (save) updateLayoutSetting('margin', type);
    }

    // Page Size Popover
    const pageSizeBtn = $('#pageSizeDropdownBtn');
    const pageSizePopover = $('#pageSizePopover');
    if (pageSizeBtn && pageSizePopover) {
      pageSizeBtn.addEventListener('click', e => {
        e.stopPropagation();
        const wasOpen = pageSizePopover.classList.contains('show');
        if (window.DocFlow?.UI?.closeAllPopovers) window.DocFlow.UI.closeAllPopovers();
        if (!wasOpen) {
          if (window.DocFlow?.UI?.positionPopover) {
            window.DocFlow.UI.positionPopover(pageSizeBtn, pageSizePopover);
          } else {
            pageSizePopover.classList.add('show');
          }
        }
      });

      $$('.margin-opt-item[data-size]').forEach(item => {
        item.addEventListener('click', () => {
          const size = item.dataset.size;
          applyPageSize(size);
          $$('.margin-opt-item[data-size]').forEach(el => el.classList.remove('active'));
          item.classList.add('active');
          pageSizePopover.classList.remove('show');
        });
      });
    }

    function applyPageSize(size, save = true) {
      const page = $('.editor-page');
      if (!page) return;
      const wrap = $('#editorWrap');
      const excelContainer = document.querySelector('.excel-spreadsheet-container');
      const isExcel = !!excelContainer || wrap?.classList.contains('is-excel-mode');

      if (size === 'full') {
        if (wrap) {
          wrap.classList.add('full-size-active');
          wrap.style.backgroundColor = '#ffffff';
        }
        page.style.maxWidth = '100%';
        page.style.width = '100%';
        page.style.minHeight = '100%';
        page.style.height = 'auto'; // Fix for Issue 1b: allows full expansion, no dull/grey lower half
        page.style.backgroundColor = '#ffffff';
        page.style.margin = '0';
        page.style.padding = isExcel ? '0' : '40px 60px';
        if (excelContainer) {
          excelContainer.style.maxWidth = '100%';
          excelContainer.style.width = '100%';
          excelContainer.style.height = '100%';
          excelContainer.style.minHeight = '100%';
          excelContainer.style.margin = '0';
          excelContainer.style.borderRadius = '0';
          excelContainer.style.boxShadow = 'none';
        }
        showToast('Paper Size: Full Page (Full width & height edge-to-edge)', 'info');
        if (save) updateLayoutSetting('size', 'full');
        return;
      }

      if (wrap) {
        wrap.classList.remove('full-size-active');
        wrap.style.backgroundColor = '';
      }
      page.style.width = '';
      page.style.height = '';
      page.style.padding = '';

      switch (size) {
        case 'letter':
          if (isExcel) {
            page.style.maxWidth = '1056px';
            page.style.minHeight = '816px';
          } else {
            page.style.maxWidth = '816px';
            page.style.minHeight = '1056px';
          }
          showToast('Paper Size: Letter (8.5" × 11")', 'info');
          break;
        case 'a4':
          if (isExcel) {
            page.style.maxWidth = '1123px';
            page.style.minHeight = '794px';
          } else {
            page.style.maxWidth = '794px';
            page.style.minHeight = '1123px';
          }
          showToast('Paper Size: A4 (210 × 297 mm)', 'info');
          break;
        case 'legal':
          if (isExcel) {
            page.style.maxWidth = '1344px';
            page.style.minHeight = '816px';
          } else {
            page.style.maxWidth = '816px';
            page.style.minHeight = '1344px';
          }
          showToast('Paper Size: Legal (8.5" × 14")', 'info');
          break;
        case 'custom':
          openModal('#customPageSizeModal');
          break;
        case 'executive':
          page.style.maxWidth = isExcel ? '1008px' : '696px';
          page.style.minHeight = isExcel ? '696px' : '1008px';
          showToast('Paper Size: Executive (7.25" × 10.5")', 'info');
          break;
        case 'a3':
          page.style.maxWidth = '1587px';
          page.style.minHeight = '1123px';
          showToast('Paper Size: A3 (297 × 420 mm)', 'info');
          break;
        case 'a5':
          page.style.maxWidth = isExcel ? '794px' : '560px';
          page.style.minHeight = isExcel ? '560px' : '794px';
          showToast('Paper Size: A5 (148 × 210 mm)', 'info');
          break;
        case 'b4':
          page.style.maxWidth = isExcel ? '1334px' : '945px';
          page.style.minHeight = isExcel ? '945px' : '1334px';
          showToast('Paper Size: B4 (250 × 353 mm)', 'info');
          break;
        case 'b5':
          page.style.maxWidth = isExcel ? '971px' : '688px';
          page.style.minHeight = isExcel ? '688px' : '971px';
          showToast('Paper Size: B5 (182 × 257 mm)', 'info');
          break;
        case 'tabloid':
          page.style.maxWidth = isExcel ? '1632px' : '1056px';
          page.style.minHeight = isExcel ? '1056px' : '1632px';
          showToast('Paper Size: Tabloid (11" × 17")', 'info');
          break;
        case 'statement':
          page.style.maxWidth = isExcel ? '816px' : '528px';
          page.style.minHeight = isExcel ? '528px' : '816px';
          showToast('Paper Size: Statement (5.5" × 8.5")', 'info');
          break;
        case 'envelope':
          page.style.maxWidth = '416px';
          page.style.minHeight = '832px';
          showToast('Paper Size: Envelope DL', 'info');
          break;
      }

      if (save && size !== 'custom') updateLayoutSetting('size', size);

      // Excel container paper sizing (Problem 1.10)
      if (excelContainer) {
        excelContainer.style.maxWidth = page.style.maxWidth;
        excelContainer.style.width = '100%';
        excelContainer.style.margin = '20px auto';
        excelContainer.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.12)';
        excelContainer.style.borderRadius = '8px';
      }
    }

    // Custom Page Size Dialog
    $('#pageSizeCustomItem')?.addEventListener('click', () => {
      pageSizePopover?.classList.remove('show');
      openModal('#customPageSizeModal');
    });

    $('#customPageSizeCancel')?.addEventListener('click', () => closeModal('#customPageSizeModal'));
    $('#customPageSizeApply')?.addEventListener('click', () => {
      const w = parseInt($('#customPageWidth')?.value, 10) || 816;
      const h = parseInt($('#customPageHeight')?.value, 10) || 1056;
      const page = $('.editor-page');
      if (page) {
        page.style.maxWidth = `${w}px`;
        page.style.width = `${w}px`;
        page.style.minHeight = `${h}px`;
        const excelContainer = document.querySelector('.excel-spreadsheet-container');
        if (excelContainer) {
          excelContainer.style.maxWidth = `${w}px`;
          excelContainer.style.width = `${w}px`;
          excelContainer.style.margin = '20px auto';
        }
        updateLayoutSetting('size', { width: w, height: h });
        showToast(`Custom Page Size applied: ${w}px × ${h}px`, 'success');
      }
      closeModal('#customPageSizeModal');
    });

    // Columns Popover
    const columnsBtn = $('#columnsDropdownBtn');
    const columnsPopover = $('#columnsPopover');
    if (columnsBtn && columnsPopover) {
      columnsBtn.addEventListener('click', e => {
        e.stopPropagation();
        const wasOpen = columnsPopover.classList.contains('show');
        if (window.DocFlow?.UI?.closeAllPopovers) window.DocFlow.UI.closeAllPopovers();
        if (!wasOpen) {
          if (window.DocFlow?.UI?.positionPopover) {
            window.DocFlow.UI.positionPopover(columnsBtn, columnsPopover);
          } else {
            columnsPopover.classList.add('show');
          }
        }
      });

      $$('.margin-opt-item[data-columns]').forEach(item => {
        item.addEventListener('click', () => {
          const val = item.dataset.columns;
          if (val === 'discrete-2') {
            const discreteHtml = `
              <div class="doc-column-grid" contenteditable="false">
                <div class="doc-col-pane" contenteditable="true"><p>Column 1 content...</p></div>
                <div class="doc-col-divider"></div>
                <div class="doc-col-pane" contenteditable="true"><p>Column 2 content...</p></div>
              </div><p><br></p>`;
            window.DocFlow.Editor?.insertHtmlAtCursor(discreteHtml);
            window.DocFlow.Editor?.notifyChange();
            showToast('Inserted 2-column panes (click each column to write independently)', 'success');
          } else {
            const cols = parseInt(val, 10) || 1;
            applyColumns(cols);
          }
          $$('.margin-opt-item[data-columns]').forEach(el => el.classList.remove('active'));
          item.classList.add('active');
          columnsPopover.classList.remove('show');
        });
      });

      // Insert Column Break nested inside Columns popover (Issue 5)
      $('#popoverColumnBreakItem')?.addEventListener('click', () => {
        columnsPopover.classList.remove('show');
        window.DocFlow.Editor?.insertColumnBreak();
      });
    }

    function applyColumns(cols) {
      const page = $('.editor-page');
      if (!page) return;
      page.dataset.columns = cols;
      page.style.columnCount = cols;
      page.style.columnGap = cols > 1 ? '36px' : 'normal';
      page.style.columnRule = cols > 1 ? '1px solid var(--border)' : 'none'; // Dividing line between columns
      page.style.columnFill = 'auto';
      showToast(`Layout: ${cols} Column${cols > 1 ? 's' : ''}`, 'info');
    }

    // Page Orientation, Borders, and Print Area (Issue 5)
    $('#layoutOrientationBtn')?.addEventListener('click', togglePageOrientation);
    $('#layoutPageBordersBtn')?.addEventListener('click', togglePageBorders);
    $('#layoutPrintAreaBtn')?.addEventListener('click', setPrintArea);

    // Watermark Popover
    const watermarkBtn = $('#watermarkDropdownBtn');
    const watermarkPopover = $('#watermarkPopover');
    if (watermarkBtn && watermarkPopover) {
      watermarkBtn.addEventListener('click', e => {
        e.stopPropagation();
        const wasOpen = watermarkPopover.classList.contains('show');
        if (window.DocFlow?.UI?.closeAllPopovers) window.DocFlow.UI.closeAllPopovers();
        if (!wasOpen) {
          if (window.DocFlow?.UI?.positionPopover) {
            window.DocFlow.UI.positionPopover(watermarkBtn, watermarkPopover);
          } else {
            watermarkPopover.classList.add('show');
          }
        }
      });

      $$('.margin-opt-item[data-watermark]').forEach(item => {
        item.addEventListener('click', () => {
          const wm = item.dataset.watermark;
          if (wm === 'custom') {
            watermarkPopover.classList.remove('show');
            openModal('#customWatermarkModal');
            return;
          }
          applyWatermark(wm);
          $$('.margin-opt-item[data-watermark]').forEach(el => el.classList.remove('active'));
          item.classList.add('active');
          watermarkPopover.classList.remove('show');
        });
      });
    }

    // Custom Watermark Options (Angle, Opacity, Position, Count)
    $('#watermarkCustomOption')?.addEventListener('click', () => {
      watermarkPopover?.classList.remove('show');
      openModal('#customWatermarkModal');
    });

    $('#customWatermarkAngle')?.addEventListener('input', e => {
      const l = $('#watermarkAngleVal');
      if (l) l.textContent = `${e.target.value}°`;
    });
    $('#customWatermarkOpacity')?.addEventListener('input', e => {
      const l = $('#watermarkOpacityVal');
      if (l) l.textContent = `${e.target.value}%`;
    });

    $('#customWatermarkColorPicker')?.addEventListener('input', e => {
      const select = $('#customWatermarkColor');
      if (select) {
        let matched = false;
        Array.from(select.options).forEach(opt => {
          if (opt.value.toLowerCase() === e.target.value.toLowerCase()) {
            select.value = opt.value;
            matched = true;
          }
        });
        if (!matched) select.value = 'custom';
      }
    });

    $('#customWatermarkColor')?.addEventListener('change', e => {
      const picker = $('#customWatermarkColorPicker');
      if (picker && e.target.value.startsWith('#')) {
        picker.value = e.target.value;
      }
    });

    $('#customWatermarkCancel')?.addEventListener('click', () => closeModal('#customWatermarkModal'));
    $('#customWatermarkApply')?.addEventListener('click', () => {
      const text = $('#customWatermarkText')?.value.trim() || 'CONFIDENTIAL';
      const angle = parseInt($('#customWatermarkAngle')?.value, 10) || -35;
      const opacityVal = (parseInt($('#customWatermarkOpacity')?.value, 10) || 18) / 100;
      const pos = $('#customWatermarkPosition')?.value || 'center';
      const count = $('#customWatermarkCount')?.value || '1';

      const pickerVal = $('#customWatermarkColorPicker')?.value || '#94a3b8';
      const selectVal = $('#customWatermarkColor')?.value || '#94a3b8';
      const finalHex = (selectVal === 'custom') ? pickerVal : (selectVal.startsWith('#') ? selectVal : pickerVal);

      let r = 148, g = 163, b = 184;
      if (finalHex.startsWith('#') && finalHex.length === 7) {
        r = parseInt(finalHex.slice(1, 3), 16) || 148;
        g = parseInt(finalHex.slice(3, 5), 16) || 163;
        b = parseInt(finalHex.slice(5, 7), 16) || 184;
      }
      const rgbaColor = `rgba(${r}, ${g}, ${b}, ${opacityVal})`;

      applyWatermark(text, angle, rgbaColor, pos, count);
      closeModal('#customWatermarkModal');
    });

    function applyWatermark(text, angle = -35, color = 'rgba(148, 163, 184, 0.18)', pos = 'center', count = '1') {
      const page = $('.editor-page');
      if (!page) return;
      let existingWm = page.querySelector('.doc-watermark-overlay');
      if (!existingWm) {
        existingWm = document.createElement('div');
        existingWm.className = 'doc-watermark-overlay';
        existingWm.contentEditable = 'false';
        existingWm.setAttribute('contenteditable', 'false');
        existingWm.setAttribute('aria-hidden', 'true');
        page.style.position = 'relative';
        page.prepend(existingWm);
      }

      if (!text || text === 'none') {
        existingWm.remove();
        window.DocFlow.activeWatermark = null;
        showToast('Watermark removed', 'info');
        return;
      }

      window.DocFlow.activeWatermark = { text, angle, color, pos, count };

      let alignStyle = 'align-items: center; justify-content: center;';
      if (pos === 'top') alignStyle = 'align-items: flex-start; justify-content: center; padding-top: 80px;';
      if (pos === 'bottom') alignStyle = 'align-items: flex-end; justify-content: center; padding-bottom: 80px;';

      existingWm.contentEditable = 'false';
      existingWm.setAttribute('contenteditable', 'false');
      existingWm.setAttribute('aria-hidden', 'true');
      existingWm.style.cssText = `position: absolute; inset: 0; display: flex; ${alignStyle} pointer-events: none !important; z-index: 0; user-select: none !important; -webkit-user-select: none !important; overflow: hidden;`;
      existingWm.innerHTML = buildWatermarkHtml(window.DocFlow.activeWatermark);
      showToast(`Watermark applied (${text})`, 'info');
    }

    // Layout Office Setup Buttons (Sheet Layout & Slide 16:9)
    $('#layoutExcelFitBtn')?.addEventListener('click', () => {
      const page = $('.editor-page');
      if (!page) return;
      const isWide = page.classList.toggle('wide-sheet-mode');
      $('#layoutExcelFitBtn')?.classList.toggle('active', isWide);
      showToast(isWide ? 'Excel Sheet Layout: 1200px Wide Mode ON' : 'Excel Sheet Layout: OFF (Normal Width)', 'info');
    });
    $('#layoutPptAspectBtn')?.addEventListener('click', () => {
      const page = $('.editor-page');
      if (!page) return;
      const isAspect = page.classList.toggle('slide-aspect-mode');
      $('#layoutPptAspectBtn')?.classList.toggle('active', isAspect);
      showToast(isAspect ? 'PowerPoint 16:9 Aspect Ratio ON' : 'PowerPoint 16:9 Aspect Ratio OFF', 'info');
    });

    // Dismiss Layout, View, PPT, Excel & Bullet Popovers on outside click
    document.addEventListener('click', e => {
      if (!e.target.closest('#marginDropdownWrap') &&
          !e.target.closest('#pageSizeDropdownWrap') &&
          !e.target.closest('#columnsDropdownWrap') &&
          !e.target.closest('#watermarkDropdownWrap') &&
          !e.target.closest('#hyphenDropdownWrap') &&
          !e.target.closest('#pageBorderDropdownWrap') &&
          !e.target.closest('#pptNewSlideDropdownWrap') &&
          !e.target.closest('#pptLayoutDropdownWrap') &&
          !e.target.closest('#pptBgImageDropdownWrap') &&
          !e.target.closest('#pptTransitionDropdownWrap') &&
          !e.target.closest('#pptAnimationDropdownWrap') &&
          !e.target.closest('#excelFormulaDropdownWrap') &&
          !e.target.closest('#excelBorderDropdownWrap') &&
          !e.target.closest('#pptSlideDropdownWrap') &&
          !e.target.closest('#paraSpacingDropdownWrap') &&
          !e.target.closest('#pagePaddingDropdownWrap') &&
          !e.target.closest('#zoomPresetsDropdownWrap') &&
          !e.target.closest('.pptx-sidebar-add-wrap') &&
          !e.target.closest('.bullet-dropdown-wrap')) {
        $('#marginPopover')?.classList.remove('show');
        $('#pageSizePopover')?.classList.remove('show');
        $('#columnsPopover')?.classList.remove('show');
        $('#watermarkPopover')?.classList.remove('show');
        $('#hyphenPopover')?.classList.remove('show');
        $('#pageBorderPopover')?.classList.remove('show');
        $('#paraSpacingPopover')?.classList.remove('show');
        $('#pagePaddingPopover')?.classList.remove('show');
        $('#zoomPresetsPopover')?.classList.remove('show');
        $('#pptNewSlidePopover')?.classList.remove('show');
        $('#pptLayoutPopover')?.classList.remove('show');
        $('#pptBgImagePopover')?.classList.remove('show');
        $('#pptTransitionPopover')?.classList.remove('show');
        $('#pptAnimationPopover')?.classList.remove('show');
        $('#excelFormulaPopover')?.classList.remove('show');
        $('#excelBorderPopover')?.classList.remove('show');
        $('#pptSlidePopover')?.classList.remove('show');
        $('#pptxSidebarAddPopover')?.classList.remove('show');
      }
    });

    // 5. Layout Ribbon Panel Controls

    $('#layoutParaSpacingBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      const pop = $('#paraSpacingPopover');
      const btn = $('#layoutParaSpacingBtn');
      if (pop?.classList.contains('show')) pop.classList.remove('show');
      else if (pop && btn) window.DocFlow.UI.positionPopover(btn, pop);
    });
    $$('#paraSpacingPopover .margin-opt-item').forEach(item => {
      item.addEventListener('click', () => {
        const spacing = item.dataset.spacing;
        const editor = $('#editor');
        if (editor) {
          editor.classList.remove('para-spacing-tight', 'para-spacing-relaxed', 'para-spacing-double');
          if (spacing !== 'normal') editor.classList.add(`para-spacing-${spacing}`);
          $$('#paraSpacingPopover .margin-opt-item').forEach(el => el.classList.remove('active'));
          item.classList.add('active');
          showToast(`Paragraph spacing: ${spacing}`, 'info');
          updateLayoutSetting('spacing', spacing);
          window.DocFlow.Editor?.notifyChange();
        }
        $('#paraSpacingPopover')?.classList.remove('show');
      });
    });

    $('#layoutPagePaddingBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      const pop = $('#pagePaddingPopover');
      const btn = $('#layoutPagePaddingBtn');
      if (pop?.classList.contains('show')) pop.classList.remove('show');
      else if (pop && btn) window.DocFlow.UI.positionPopover(btn, pop);
    });
    $$('#pagePaddingPopover .margin-opt-item').forEach(item => {
      item.addEventListener('click', () => {
        const pad = item.dataset.padding;
        const page = $('.editor-page');
        if (page) {
          const padMap = { compact: '36px 36px', normal: '72px 72px', spacious: '96px 96px', edge: '12px 16px' };
          page.style.padding = padMap[pad] || '72px 72px';
          $$('#pagePaddingPopover .margin-opt-item').forEach(el => el.classList.remove('active'));
          item.classList.add('active');
          showToast(`Page padding: ${pad}`, 'info');
          updateLayoutSetting('padding', pad);
          window.DocFlow.Editor?.notifyChange();
        }
        $('#pagePaddingPopover')?.classList.remove('show');
      });
    });

    $('#layoutHyphenBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      const pop = $('#hyphenPopover');
      const btn = $('#layoutHyphenBtn');
      if (pop?.classList.contains('show')) {
        pop.classList.remove('show');
      } else if (pop && btn) {
        window.DocFlow.UI.positionPopover(btn, pop);
      }
    });
    $$('#hyphenPopover .margin-opt-item').forEach(item => {
      item.addEventListener('click', () => {
        const hyp = item.dataset.hyphen;
        const page = $('.editor-page');
        if (page) {
          const isAuto = hyp === 'auto';
          page.classList.toggle('doc-hyphen-auto', isAuto);
          $$('#hyphenPopover .margin-opt-item').forEach(el => el.classList.remove('active'));
          item.classList.add('active');
          showToast(`Hyphenation: ${isAuto ? 'Automatic' : 'None'}`, 'info');
        }
        $('#hyphenPopover')?.classList.remove('show');
      });
    });

    // Layout Ribbon Controls (Header & Footer Modal & Handlers - Item 3)
    function openHeaderFooterModal() {
      const editor = $('#editor');
      if (!editor || window.DocFlow.currentMode !== 'edit') {
        showToast('Open a document in edit mode to configure header and footer', 'warning');
        return;
      }
      const activeTab = window.DocFlow.UI?.Tabs?.get(window.DocFlow.UI.Tabs.activeId);
      const docTitle = activeTab?.name || 'Document Header';

      const existingHeader = editor.querySelector('.doc-header-area, .df-page-header');
      const existingFooter = editor.querySelector('.doc-footer-area, .df-page-footer');

      const headerInput = $('#hfHeaderText');
      const footerInput = $('#hfFooterText');
      const headerCheck = $('#hfEnableHeaderCheck');
      const footerCheck = $('#hfEnableFooterCheck');

      if (headerInput) {
        headerInput.value = existingHeader ? (existingHeader.querySelector('.doc-header-editable')?.textContent || '').trim() : '';
      }
      if (footerInput) {
        footerInput.value = existingFooter ? (existingFooter.querySelector('.doc-footer-editable')?.textContent || '').trim() : '';
      }
      if (headerCheck) headerCheck.checked = true;
      if (footerCheck) footerCheck.checked = true;

      window.DocFlow.UI?.openModal?.('#headerFooterModal');
    }

    function createHeaderNode(titleText) {
      const header = document.createElement('header');
      header.className = 'doc-header-area df-page-header';
      header.contentEditable = 'false';
      header.setAttribute('contenteditable', 'false');
      const val = titleText !== undefined && titleText !== null ? titleText.trim() : '';
      header.innerHTML = `
        <button type="button" class="df-hf-delete-btn" title="Remove Header" contenteditable="false"><i class="fas fa-times"></i></button>
        <div class="doc-header-editable" contenteditable="true" spellcheck="false" data-placeholder="Type Header..." title="Click to write header text (Press Enter for new line)">${escHtml(val)}</div>`;

      const editable = header.querySelector('.doc-header-editable');
      editable?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          document.execCommand('insertLineBreak');
        }
      });
      return header;
    }

    function createFooterNode(footText) {
      const footer = document.createElement('footer');
      footer.className = 'doc-footer-area df-page-footer';
      footer.contentEditable = 'false';
      footer.setAttribute('contenteditable', 'false');
      const val = footText !== undefined && footText !== null ? footText.trim() : '';
      footer.innerHTML = `
        <button type="button" class="df-hf-delete-btn" title="Remove Footer" contenteditable="false"><i class="fas fa-times"></i></button>
        <div class="doc-footer-editable" contenteditable="true" spellcheck="false" data-placeholder="Type Footer..." title="Click to write footer text (Press Enter for new line)">${escHtml(val)}</div>`;

      const editable = footer.querySelector('.doc-footer-editable');
      editable?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          document.execCommand('insertLineBreak');
        }
      });
      return footer;
    }

    // Global listener to ensure Enter always adds a line break inside header/footer editable areas
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const activeEditable = e.target.closest?.('.doc-header-editable, .doc-footer-editable');
        if (activeEditable) {
          e.preventDefault();
          e.stopPropagation();
          document.execCommand('insertLineBreak');
        }
      }
    });

    // Auto-save changes in header and footer (Bug 3)
    document.addEventListener('input', (e) => {
      if (e.target.closest('.doc-header-editable, .doc-footer-editable')) {
        window.DocFlow.Editor?.notifyChange?.();
        window.DocFlow.UI?.Tabs?.saveCurrent?.();
      }
    });
    document.addEventListener('blur', (e) => {
      if (e.target.closest?.('.doc-header-editable, .doc-footer-editable')) {
        window.DocFlow.Editor?.notifyChange?.();
        window.DocFlow.UI?.Tabs?.saveCurrent?.();
      }
    }, true);

    function applyHeaderFooterAction() {
      const editor = $('#editor');
      if (!editor) return;
      const wantHeader = $('#hfEnableHeaderCheck')?.checked;
      const wantFooter = $('#hfEnableFooterCheck')?.checked;
      const headerText = ($('#hfHeaderText')?.value || '').trim();
      const footerText = ($('#hfFooterText')?.value || '').trim();
      const isAllPages = $('#hfScopeAll')?.checked;

      if (!wantHeader && !wantFooter) {
        showToast('Please check either Header or Footer to apply', 'warning');
        return;
      }

      window.DocFlow.Editor?.saveSnapshot?.(true);

      // Clean existing headers and footers
      if (wantHeader) {
        editor.querySelectorAll('.doc-header-area, .df-page-header').forEach(el => el.remove());
      }
      if (wantFooter) {
        editor.querySelectorAll('.doc-footer-area, .df-page-footer').forEach(el => el.remove());
      }

      if (isAllPages) {
        const existingPages = Array.from(editor.querySelectorAll('.df-page'));
        if (existingPages.length > 0) {
          existingPages.forEach((p, idx) => {
            p.classList.add('has-header-footer');
            let body = p.querySelector('.df-page-body, .doc-content-body');
            if (!body) {
              body = document.createElement('div');
              body.className = 'df-page-body doc-content-body';
              body.contentEditable = 'true';
              const toMove = Array.from(p.childNodes).filter(n =>
                !(n.nodeType === 1 && (n.classList.contains('doc-header-area') || n.classList.contains('doc-footer-area') || n.classList.contains('df-page-header') || n.classList.contains('df-page-footer') || n.classList.contains('doc-watermark-overlay')))
              );
              toMove.forEach(n => body.appendChild(n));
              p.appendChild(body);
            }
            if (wantHeader) p.insertBefore(createHeaderNode(headerText), p.firstChild);
            if (wantFooter) p.appendChild(createFooterNode(footerText));
          });
        } else {
          // Wrap content in page with top header, middle body, bottom footer
          const p = editor.querySelector('.editor-page') || editor;
          p.classList.add('has-header-footer');
          let body = p.querySelector('.df-page-body, .doc-content-body');
          if (!body) {
            body = document.createElement('div');
            body.className = 'df-page-body doc-content-body';
            body.contentEditable = 'true';
            const toMove = Array.from(p.childNodes).filter(n =>
              !(n.nodeType === 1 && (n.classList.contains('doc-header-area') || n.classList.contains('doc-footer-area') || n.classList.contains('df-page-header') || n.classList.contains('df-page-footer') || n.classList.contains('doc-watermark-overlay')))
            );
            if (toMove.length === 0) {
              body.innerHTML = '<p><br></p>';
            } else {
              toMove.forEach(n => body.appendChild(n));
            }
            p.appendChild(body);
          }
          if (wantHeader) p.insertBefore(createHeaderNode(headerText), p.firstChild);
          if (wantFooter) p.appendChild(createFooterNode(footerText));
        }
      } else {
        // Single Page: Apply to editor page with proper top/middle/bottom flex layout
        const p = editor.querySelector('.editor-page') || editor;
        p.classList.add('has-header-footer');
        let body = p.querySelector('.df-page-body, .doc-content-body');
        if (!body) {
          body = document.createElement('div');
          body.className = 'df-page-body doc-content-body';
          body.contentEditable = 'true';
          const toMove = Array.from(p.childNodes).filter(n =>
            !(n.nodeType === 1 && (n.classList.contains('doc-header-area') || n.classList.contains('doc-footer-area') || n.classList.contains('df-page-header') || n.classList.contains('df-page-footer') || n.classList.contains('doc-watermark-overlay')))
          );
          if (toMove.length === 0) {
            body.innerHTML = '<p><br></p>';
          } else {
            toMove.forEach(n => body.appendChild(n));
          }
          p.appendChild(body);
        }
        if (wantHeader) p.insertBefore(createHeaderNode(headerText), p.firstChild);
        if (wantFooter) p.appendChild(createFooterNode(footerText));
      }

      window.DocFlow.Editor?.saveSnapshot?.(true);
      window.DocFlow.Editor?.notifyChange?.();
      window.DocFlow.UI?.closeModal?.('#headerFooterModal');
      showToast(`Header & Footer applied (${isAllPages ? 'All Pages' : 'Single Page'})`, 'success');
    }

    $('#layoutHeaderFooterBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const pop = $('#layoutHeaderFooterPopover');
      const btn = $('#layoutHeaderFooterBtn');
      if (pop?.classList.contains('show')) {
        pop.classList.remove('show');
      } else if (pop && btn) {
        window.DocFlow.UI?.positionPopover?.(btn, pop);
      }
    });

    $('#hfMenuConfigureBtn')?.addEventListener('click', () => {
      $('#layoutHeaderFooterPopover')?.classList.remove('show');
      openHeaderFooterModal();
    });

    $('#hfMenuAddHeaderBtn')?.addEventListener('click', () => {
      $('#layoutHeaderFooterPopover')?.classList.remove('show');
      openHeaderFooterModal();
      if ($('#hfEnableHeaderCheck')) $('#hfEnableHeaderCheck').checked = true;
      if ($('#hfEnableFooterCheck')) $('#hfEnableFooterCheck').checked = false;
    });

    $('#hfMenuAddFooterBtn')?.addEventListener('click', () => {
      $('#layoutHeaderFooterPopover')?.classList.remove('show');
      openHeaderFooterModal();
      if ($('#hfEnableHeaderCheck')) $('#hfEnableHeaderCheck').checked = false;
      if ($('#hfEnableFooterCheck')) $('#hfEnableFooterCheck').checked = true;
    });

    $('#hfMenuRemoveHeaderBtn')?.addEventListener('click', () => {
      $('#layoutHeaderFooterPopover')?.classList.remove('show');
      const ed = $('#editor');
      if (!ed) return;
      window.DocFlow.Editor?.saveSnapshot?.(true);
      ed.querySelectorAll('.doc-header-area, .df-page-header').forEach(el => el.remove());
      window.DocFlow.Editor?.saveSnapshot?.(true);
      window.DocFlow.Editor?.notifyChange?.();
      showToast('Header removed', 'info');
    });

    $('#hfMenuRemoveFooterBtn')?.addEventListener('click', () => {
      $('#layoutHeaderFooterPopover')?.classList.remove('show');
      const ed = $('#editor');
      if (!ed) return;
      window.DocFlow.Editor?.saveSnapshot?.(true);
      ed.querySelectorAll('.doc-footer-area, .df-page-footer').forEach(el => el.remove());
      window.DocFlow.Editor?.saveSnapshot?.(true);
      window.DocFlow.Editor?.notifyChange?.();
      showToast('Footer removed', 'info');
    });

    $('#hfMenuRemoveBothBtn')?.addEventListener('click', () => {
      $('#layoutHeaderFooterPopover')?.classList.remove('show');
      const ed = $('#editor');
      if (!ed) return;
      window.DocFlow.Editor?.saveSnapshot?.(true);
      ed.querySelectorAll('.doc-header-area, .df-page-header, .doc-footer-area, .df-page-footer').forEach(el => el.remove());
      window.DocFlow.Editor?.saveSnapshot?.(true);
      window.DocFlow.Editor?.notifyChange?.();
      showToast('Headers and footers removed', 'info');
    });

    $('#headerFooterCloseBtn')?.addEventListener('click', () => window.DocFlow.UI?.closeModal?.('#headerFooterModal'));
    $('#headerFooterCancelBtn')?.addEventListener('click', () => window.DocFlow.UI?.closeModal?.('#headerFooterModal'));
    $('#headerFooterApplyBtn')?.addEventListener('click', applyHeaderFooterAction);

    $('#hfRemoveHeaderBtn')?.addEventListener('click', () => {
      const ed = $('#editor');
      if (!ed) return;
      window.DocFlow.Editor?.saveSnapshot?.(true);
      ed.querySelectorAll('.doc-header-area, .df-page-header').forEach(el => el.remove());
      window.DocFlow.Editor?.saveSnapshot?.(true);
      window.DocFlow.Editor?.notifyChange?.();
      window.DocFlow.UI?.closeModal?.('#headerFooterModal');
      showToast('Header removed', 'info');
    });

    $('#hfRemoveFooterBtn')?.addEventListener('click', () => {
      const ed = $('#editor');
      if (!ed) return;
      window.DocFlow.Editor?.saveSnapshot?.(true);
      ed.querySelectorAll('.doc-footer-area, .df-page-footer').forEach(el => el.remove());
      window.DocFlow.Editor?.saveSnapshot?.(true);
      window.DocFlow.Editor?.notifyChange?.();
      window.DocFlow.UI?.closeModal?.('#headerFooterModal');
      showToast('Footer removed', 'info');
    });

    $('#hfRemoveAllBtn')?.addEventListener('click', () => {
      const ed = $('#editor');
      if (!ed) return;
      window.DocFlow.Editor?.saveSnapshot?.(true);
      ed.querySelectorAll('.doc-header-area, .df-page-header, .doc-footer-area, .df-page-footer').forEach(el => el.remove());
      window.DocFlow.Editor?.saveSnapshot?.(true);
      window.DocFlow.Editor?.notifyChange?.();
      window.DocFlow.UI?.closeModal?.('#headerFooterModal');
      showToast('Headers and footers removed', 'info');
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#layoutHeaderFooterDropdownWrap')) {
        $('#layoutHeaderFooterPopover')?.classList.remove('show');
      }
      const delBtn = e.target.closest('.df-hf-delete-btn');
      if (delBtn) {
        e.stopPropagation();
        const headerOrFooter = delBtn.closest('.doc-header-area, .doc-footer-area, .df-page-header, .df-page-footer');
        if (headerOrFooter) {
          window.DocFlow.Editor?.saveSnapshot?.(true);
          const isH = headerOrFooter.classList.contains('doc-header-area') || headerOrFooter.classList.contains('df-page-header');
          headerOrFooter.remove();
          window.DocFlow.Editor?.saveSnapshot?.(true);
          window.DocFlow.Editor?.notifyChange?.();
          showToast((isH ? 'Header' : 'Footer') + ' removed', 'info');
        }
      }
    });

    $('#layoutPageBgBtn')?.addEventListener('click', () => {
      $('#layoutPageBgInput')?.click();
    });
    $('#layoutPageBgInput')?.addEventListener('input', e => {
      const color = e.target.value;
      document.documentElement.style.setProperty('--excel-sheet-bg', color);
      const page = $('.editor-page');
      if (page) {
        page.style.setProperty('background-color', color, 'important');
        page.style.setProperty('--excel-sheet-bg', color);
        page.style.backgroundColor = color;
      }
      const wrap = $('#editorWrap');
      if (wrap && wrap.classList.contains('full-size-active')) {
        wrap.style.setProperty('background-color', color, 'important');
      }
      const excelContainer = document.querySelector('.excel-spreadsheet-container');
      if (excelContainer) {
        excelContainer.style.setProperty('background-color', color, 'important');
        excelContainer.style.setProperty('--excel-sheet-bg', color);
        const viewport = excelContainer.querySelector('.excel-sheet-viewport');
        if (viewport) {
          viewport.style.setProperty('background-color', color, 'important');
          viewport.style.setProperty('--excel-sheet-bg', color);
        }
        const gridTable = excelContainer.querySelector('.excel-grid-table');
        if (gridTable) {
          gridTable.style.setProperty('background-color', color, 'important');
          gridTable.style.setProperty('--excel-sheet-bg', color);
        }
      }
      updateLayoutSetting('pageColor', color);
    });
    $('#layoutPageBgInput')?.addEventListener('change', e => {
      window.DocFlow.Editor?.saveSnapshot?.(true);
      window.DocFlow.Editor?.notifyChange?.();
      updateLayoutSetting('pageColor', e.target.value);
      showToast(`Page background color set to ${e.target.value}`, 'info');
    });

    $('#layoutPageBorderBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      const pop = $('#pageBorderPopover');
      const btn = $('#layoutPageBorderBtn');
      if (pop?.classList.contains('show')) {
        pop.classList.remove('show');
      } else if (pop && btn) {
        window.DocFlow.UI.positionPopover(btn, pop);
      }
    });

    $('#customPageBorderOpt')?.addEventListener('click', () => {
      $('#pageBorderPopover')?.classList.remove('show');
      openModal('#customPageBorderModal');
    });

    $$('#pageBorderPopover .margin-opt-item:not(#customPageBorderOpt)').forEach(item => {
      item.addEventListener('click', () => {
        const borderStyle = item.dataset.border;
        const page = $('.editor-page');
        if (page) {
          window.DocFlow.Editor?.saveSnapshot?.();
          page.style.border = '';
          page.style.borderRadius = '';
          page.classList.remove('page-border-box', 'page-border-shadow', 'page-border-double');
          if (borderStyle === 'box') page.classList.add('page-border-box');
          else if (borderStyle === 'shadow') page.classList.add('page-border-shadow');
          else if (borderStyle === 'double') page.classList.add('page-border-double');
          $$('#pageBorderPopover .margin-opt-item').forEach(el => el.classList.remove('active'));
          item.classList.add('active');
          window.DocFlow.Editor?.notifyChange();
          updateLayoutSetting('pageBorder', borderStyle);
          showToast(`Page Border: ${borderStyle}`, 'info');
        }
        $('#pageBorderPopover')?.classList.remove('show');
      });
    });

    $('#layoutTextDirBtn')?.addEventListener('click', () => {
      const page = $('.editor-page');
      if (page) {
        const isRtl = page.classList.toggle('dir-rtl');
        $('#layoutTextDirBtn')?.classList.toggle('active', isRtl);
        showToast(isRtl ? 'Text Direction: Right-to-Left (RTL)' : 'Text Direction: Left-to-Right (LTR)', 'info');
      }
    });

    // 6. View Ribbon Panel Controls (Problem 3: Comments, Proofing & Lock Protection)
    $('#viewToggleStatusbarBtn')?.addEventListener('click', () => {
      if (window.DocFlow.currentMode === 'empty') {
        showToast('Status bar is permanently displayed on Home screen', 'info');
      }
      const isHidden = document.body.classList.toggle('editor-statusbar-hidden');
      $('#viewToggleStatusbarBtn')?.classList.toggle('active', isHidden);
      showToast(isHidden ? 'Status bar hidden (in editors only)' : 'Status bar visible', 'info');
    });

    // Problem 3: Comment on any line/word with dull highlight & hover/click popover
    $('#viewAddCommentBtn')?.addEventListener('click', () => {
      if (window.DocFlow.currentMode !== 'edit') {
        showToast('Open a document in edit mode to add comments', 'info');
        return;
      }
      const sel = window.getSelection();
      let text = sel?.toString().trim();
      let range = null;
      if (sel && sel.rangeCount > 0) range = sel.getRangeAt(0);

      if (!text || !range) {
        showToast('Select text or words in the document to comment on', 'info');
        return;
      }

      window.DocFlow.UI?.showPromptModal?.({
        title: 'Add Document Comment',
        message: `Enter comment for "${text.length > 30 ? text.substring(0, 30) + '...' : text}":`,
        defaultValue: '',
        placeholder: 'Write your comment or review note...',
        confirmText: 'Add Comment',
        onConfirm: commentText => {
          if (!commentText || !commentText.trim()) return;
          const mark = document.createElement('mark');
          mark.className = 'df-comment-highlight';
          mark.dataset.comment = commentText.trim();
          mark.dataset.author = 'Reviewer';
          mark.dataset.time = new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
          mark.title = `Comment: ${commentText.trim()} (Click or hover to view)`;

          // Trim trailing whitespace or newlines from range so highlight covers strictly the word
          while (range.toString().endsWith(' ') || range.toString().endsWith('\n') || range.toString().endsWith('\r') || range.toString().endsWith('\t')) {
            try {
              range.setEnd(range.endContainer, range.endOffset - 1);
            } catch (_) {
              break;
            }
          }

          try {
            range.surroundContents(mark);
          } catch (_) {
            const span = document.createElement('span');
            span.appendChild(range.extractContents());
            mark.appendChild(span);
            range.insertNode(mark);
          }

          // Ensure an inline text node with zero-width space directly follows the mark on the exact same line
          let afterNode = mark.nextSibling;
          if (!afterNode || afterNode.nodeType !== Node.TEXT_NODE) {
            afterNode = document.createTextNode('\u200B');
            mark.parentNode.insertBefore(afterNode, mark.nextSibling);
          } else if (!afterNode.textContent || afterNode.textContent === '') {
            afterNode.textContent = '\u200B';
          }

          // Give focus back to the editor and position caret directly in front of the commented word
          const ed = $('#editor');
          if (ed) ed.focus();

          const sel = window.getSelection();
          if (sel) {
            const afterRange = document.createRange();
            afterRange.setStart(afterNode, afterNode.textContent.length);
            afterRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(afterRange);
          }

          window.DocFlow.Editor?.notifyChange?.();
          showToast('Comment added! Type in front of the word to continue.', 'success');
        }
      });
    });

    let activeCommentPopover = null;
    function showCommentPopover(el) {
      if (activeCommentPopover) activeCommentPopover.remove();
      const commentText = el.dataset.comment || '';
      const author = el.dataset.author || 'Reviewer';
      const time = el.dataset.time || '';

      const popover = document.createElement('div');
      popover.className = 'df-comment-popover';
      popover.innerHTML = `
        <div class="df-comment-pop-header">
          <span><i class="fas fa-comment-dots" style="color:#f59e0b;margin-right:4px;"></i><strong>${escHtml(author)}</strong></span>
          <span>${escHtml(time)}</span>
        </div>
        <div class="df-comment-pop-body">${escHtml(commentText)}</div>
        <div class="df-comment-pop-actions">
          <button type="button" class="df-comment-resolve-btn" title="Resolve and remove this comment"><i class="fas fa-check"></i> Resolve / Delete</button>
        </div>
      `;
      document.body.appendChild(popover);
      activeCommentPopover = popover;

      const rect = el.getBoundingClientRect();
      let top = rect.bottom + 6;
      let left = rect.left;
      if (top + popover.offsetHeight > window.innerHeight - 10) {
        top = rect.top - popover.offsetHeight - 6;
      }
      if (left + 270 > window.innerWidth - 10) {
        left = window.innerWidth - 280;
      }
      popover.style.top = Math.max(10, top) + 'px';
      popover.style.left = Math.max(10, left) + 'px';

      popover.querySelector('.df-comment-resolve-btn')?.addEventListener('click', e => {
        e.stopPropagation();
        const parent = el.parentNode;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        el.remove();
        popover.remove();
        activeCommentPopover = null;
        window.DocFlow.Editor?.notifyChange?.();
        showToast('Comment resolved and removed', 'info');
      });
    }

    document.addEventListener('mouseover', e => {
      const commentEl = e.target.closest('.df-comment-highlight');
      if (commentEl) showCommentPopover(commentEl);
    });

    document.addEventListener('click', e => {
      const commentEl = e.target.closest('.df-comment-highlight');
      if (commentEl) {
        e.stopPropagation();
        showCommentPopover(commentEl);
      } else if (!e.target.closest('.df-comment-popover')) {
        if (activeCommentPopover) {
          activeCommentPopover.remove();
          activeCommentPopover = null;
        }
      }
    });

    // Problem 3: Grammar & Spelling Inspector
    $('#viewSpellCheckBtn')?.addEventListener('click', () => {
      const editor = $('#editor');
      if (!editor || window.DocFlow.currentMode !== 'edit') {
        showToast('Open a document in edit mode to run Grammar & Spelling check', 'info');
        return;
      }
      const text = editor.innerText || '';
      if (!text.trim()) {
        showToast('Document is empty — nothing to check', 'info');
        return;
      }

      const issues = [];
      const repeatedRegex = /\b([a-zA-Z]{2,})\s+\1\b/gi;
      let match;
      while ((match = repeatedRegex.exec(text)) !== null) {
        issues.push({
          type: 'Repeated Word',
          phrase: match[0],
          suggestion: match[1],
          desc: `Word "${match[1]}" is repeated consecutively.`
        });
      }
      const typoDict = {
        'teh': 'the', 'recieve': 'receive', 'seperate': 'separate', 'untill': 'until',
        'occured': 'occurred', 'definately': 'definitely', 'goverment': 'government',
        'writting': 'writing', 'grammer': 'grammar', 'truely': 'truly', 'wierd': 'weird',
        'accomodate': 'accommodate', 'adress': 'address', 'calender': 'calendar'
      };
      Object.entries(typoDict).forEach(([bad, good]) => {
        const reg = new RegExp(`\\b${bad}\\b`, 'gi');
        if (reg.test(text)) {
          issues.push({
            type: 'Spelling Error',
            phrase: bad,
            suggestion: good,
            desc: `Probable spelling mistake: replace "${bad}" with "${good}".`
          });
        }
      });

      const capRegex = /[.!?]\s+([a-z])/g;
      while ((match = capRegex.exec(text)) !== null) {
        issues.push({
          type: 'Capitalization',
          phrase: match[0],
          suggestion: match[0].toUpperCase(),
          desc: 'Sentences should begin with a capital letter.'
        });
      }

      const listContainer = $('#spellCheckList');
      const badge = $('#spellCheckCountBadge');
      if (!listContainer) return;

      if (issues.length === 0) {
        listContainer.innerHTML = '<div style="padding:24px;text-align:center;color:#10b981;font-weight:600;"><i class="fas fa-circle-check" style="font-size:24px;display:block;margin-bottom:8px;"></i>No spelling or grammar issues found! Document looks clean.</div>';
        if (badge) badge.textContent = '0 issues detected';
      } else {
        if (badge) badge.textContent = `${issues.length} issue(s) detected`;
        listContainer.innerHTML = issues.map((iss, i) => `
          <div class="spell-issue-card" style="background:var(--bg-secondary);border:1px solid var(--border);border-left:4px solid #10b981;border-radius:6px;padding:12px;display:flex;justify-content:space-between;align-items:center;gap:12px;">
            <div>
              <div style="font-size:11px;font-weight:700;color:#10b981;text-transform:uppercase;">${escHtml(iss.type)}</div>
              <div style="font-size:13px;font-weight:600;margin:2px 0;">Found: <span style="color:#ef4444;text-decoration:underline wavy #ef4444;">${escHtml(iss.phrase)}</span> &rarr; Suggestion: <strong style="color:#10b981;">${escHtml(iss.suggestion)}</strong></div>
              <div style="font-size:12px;color:var(--text-muted);">${escHtml(iss.desc)}</div>
            </div>
            <button class="modal-btn" style="flex-shrink:0;font-size:11.5px;padding:5px 10px;" onclick="window._fixSpellWord('${escHtml(iss.phrase)}', '${escHtml(iss.suggestion)}')">Replace</button>
          </div>
        `).join('');
      }

      window.DocFlow.UI?.openModal?.('#spellCheckModal');
    });

    window._fixSpellWord = (bad, good) => {
      const editor = $('#editor');
      if (!editor) return;
      const regex = new RegExp(`\\b${bad}\\b`, 'g');
      editor.innerHTML = editor.innerHTML.replace(regex, good);
      window.DocFlow.Editor?.notifyChange?.();
      showToast(`Replaced "${bad}" with "${good}"`, 'success');
      $('#viewSpellCheckBtn')?.click();
    };

    $('#spellCheckCloseBtn')?.addEventListener('click', () => window.DocFlow.UI?.closeModal?.('#spellCheckModal'));
    $('#spellCheckDoneBtn')?.addEventListener('click', () => window.DocFlow.UI?.closeModal?.('#spellCheckModal'));

    function updateWordOnlyTools(tab) {
      const activeTab = tab || window.DocFlow.UI?.Tabs?.get?.(window.DocFlow.UI.Tabs.activeId);
      const name = (activeTab?.name || '').toLowerCase();
      const type = (activeTab?.fileType || '').toLowerCase();
      const isWord = (name.endsWith('.docx') || name.endsWith('.doc') || type === 'docx' || type === 'doc' || type === 'word') &&
                     !name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv') &&
                     !name.endsWith('.pptx') && !name.endsWith('.ppt') && !name.endsWith('.pdf') &&
                     !name.endsWith('.html') && !name.endsWith('.htm') && !name.endsWith('.md') && !name.endsWith('.txt');
      const hfBtn = $('#layoutHeaderFooterBtn');
      if (hfBtn) {
        hfBtn.style.display = 'inline-flex';
      }
    }
    window.DocFlow.updateWordOnlyTools = updateWordOnlyTools;

    // Problem 3: Lock & Protect Document
    function updateDocLockUI(tab) {
      const banner = $('#docLockedBanner');
      const editor = $('#editor');
      updateWordOnlyTools(tab);
      if (!tab) {
        if (banner) banner.classList.remove('show');
        return;
      }
      if (tab.isLocked) {
        if (banner) banner.classList.add('show');
        if (editor) editor.contentEditable = 'false';
        $('#viewProtectDocBtn')?.classList.add('active');
        const btnSpan = $('#viewProtectDocBtn span');
        if (btnSpan) btnSpan.textContent = 'Locked';
      } else {
        if (banner) banner.classList.remove('show');
        if (editor && window.DocFlow.currentMode === 'edit') editor.contentEditable = 'true';
        $('#viewProtectDocBtn')?.classList.remove('active');
        const btnSpan = $('#viewProtectDocBtn span');
        if (btnSpan) btnSpan.textContent = 'Protect Doc';
      }
    }
    window.DocFlow.updateDocLockUI = updateDocLockUI;

    let pendingLockedItemToOpen = null;

    function openUnlockDocModal(itemOrTab) {
      if (!itemOrTab) return;
      pendingLockedItemToOpen = itemOrTab;
      const docName = itemOrTab.name || 'Document';
      const pinInput = $('#docUnlockPinInput');
      if (pinInput) pinInput.value = '';
      const desc = $('#docUnlockModal p') || $('#docUnlockModalDesc');
      if (desc) desc.textContent = `Enter password or PIN to unlock and open "${docName}":`;
      window.DocFlow.UI?.openModal?.('#docUnlockModal');
      setTimeout(() => pinInput?.focus(), 50);
    }

    $('#viewProtectDocBtn')?.addEventListener('click', () => {
      const activeTab = window.DocFlow.UI?.Tabs?.get?.(window.DocFlow.UI.Tabs.activeId);
      if (!activeTab || window.DocFlow.currentMode === 'empty') {
        showToast('Please open a document first to lock or protect it', 'warning');
        return;
      }
      const pinIn = $('#docProtectPinInput');
      if (pinIn) pinIn.value = '';
      window.DocFlow.UI?.openModal?.('#docProtectModal');
      setTimeout(() => pinIn?.focus(), 50);
    });

    $('#docProtectCloseBtn')?.addEventListener('click', () => window.DocFlow.UI?.closeModal?.('#docProtectModal'));
    $('#docProtectCancelBtn')?.addEventListener('click', () => window.DocFlow.UI?.closeModal?.('#docProtectModal'));

    $('#docProtectPinInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        $('#docProtectConfirmBtn')?.click();
      }
    });

    $('#docProtectConfirmBtn')?.addEventListener('click', async () => {
      const activeTab = window.DocFlow.UI?.Tabs?.get?.(window.DocFlow.UI.Tabs.activeId);
      if (!activeTab || window.DocFlow.currentMode === 'empty') {
        showToast('Please open a document first to lock or protect it', 'warning');
        window.DocFlow.UI?.closeModal?.('#docProtectModal');
        return;
      }
      const pin = $('#docProtectPinInput')?.value.trim() || '';
      const docName = activeTab.name;

      // 1. Lock in FileLockStore (IndexedDB per-file password storage - Issue 3)
      await FileLockStore.lock(docName, pin);

      // 2. Mark in Recent Documents list
      const list = Recent.getAll();
      const rec = list.find(d => d.name.toLowerCase() === docName.toLowerCase());
      if (rec) {
        rec.isLocked = true;
        rec.hasPassword = !!pin;
        Recent.saveAll(list);
      } else {
        Recent.add({
          name: docName,
          content: activeTab.content || $('#editor')?.innerHTML || '<p><br></p>',
          type: activeTab.fileType || activeTab.type,
          isLocked: true,
          hasPassword: !!pin
        });
      }

      // 3. Save tab content
      window.DocFlow.UI?.Tabs?.saveCurrent?.();

      // 4. Close the modal
      window.DocFlow.UI?.closeModal?.('#docProtectModal');

      // 5. Close the active file immediately upon lock (Issue 3)
      window.DocFlow.UI?.Tabs?.close?.(activeTab.id, true);

      // 6. Return to home screen and render recent files showing lock icon
      window.DocFlow.switchMode?.('empty');
      window.DocFlow.switchRibbonTab?.('home');
      Recent.render();
      Recent.renderDropdown();

      // 7. Show correct notification (Issue 3)
      showToast(`Document "${docName}" locked and protected successfully. File closed.`, 'success');
    });

    $('#docUnlockBannerBtn')?.addEventListener('click', () => {
      const activeTab = window.DocFlow.UI?.Tabs?.get?.(window.DocFlow.UI.Tabs.activeId);
      openUnlockDocModal(activeTab);
    });

    $('#docUnlockCloseBtn')?.addEventListener('click', () => {
      window.DocFlow.UI?.closeModal?.('#docUnlockModal');
      pendingLockedItemToOpen = null;
    });
    $('#docUnlockCancelBtn')?.addEventListener('click', () => {
      window.DocFlow.UI?.closeModal?.('#docUnlockModal');
      pendingLockedItemToOpen = null;
    });

    $('#docUnlockPinInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        $('#docUnlockConfirmBtn')?.click();
      }
    });

    $('#docUnlockConfirmBtn')?.addEventListener('click', async () => {
      const activeTab = window.DocFlow.UI?.Tabs?.get?.(window.DocFlow.UI.Tabs.activeId);
      const targetDoc = pendingLockedItemToOpen || activeTab;
      if (!targetDoc) {
        window.DocFlow.UI?.closeModal?.('#docUnlockModal');
        return;
      }
      const docName = targetDoc.name;
      const entered = $('#docUnlockPinInput')?.value.trim() || '';

      const isCorrect = await FileLockStore.verifyPassword(docName, entered);
      if (!isCorrect) {
        showToast('Incorrect password. Document remains locked.', 'error');
        $('#docUnlockPinInput')?.focus();
        return;
      }

      // Correct password: unlock and open
      await FileLockStore.unlock(docName);
      targetDoc.isLocked = false;
      if (targetDoc.lockPin) delete targetDoc.lockPin;

      // Update in Recent list
      const recents = Recent.getAll();
      const rec = recents.find(d => d.name.toLowerCase() === docName.toLowerCase());
      if (rec) {
        rec.isLocked = false;
        Recent.saveAll(recents);
      }
      Recent.render();
      Recent.renderDropdown();

      window.DocFlow.UI?.closeModal?.('#docUnlockModal');
      showToast(`Document "${docName}" unlocked successfully!`, 'success');

      if (pendingLockedItemToOpen) {
        const toOpen = pendingLockedItemToOpen;
        pendingLockedItemToOpen = null;
        Recent._proceedOpenDocument(toOpen);
      } else if (activeTab) {
        updateDocLockUI(activeTab);
      }
    });

    const splitDividerEl = $('#splitDividerBar');
    const editorWrapPane = $('#editorWrap');
    const splitMirrorPaneEl = $('#splitMirrorPane');
    const mainContentArea = $('#mainContent');

    $('#viewSplitWindowBtn')?.addEventListener('click', () => {
      const isSplit = document.body.classList.toggle('has-split-window');
      $('#viewSplitWindowBtn')?.classList.toggle('active', isSplit);
      const editor = $('#editor');
      const mirror = $('#editorSplitMirror');
      if (isSplit && editor && mirror) {
        mirror.innerHTML = editor.innerHTML;
        mirror.contentEditable = 'true';
      } else {
        if (editorWrapPane) {
          editorWrapPane.style.flex = '';
          editorWrapPane.style.height = '';
        }
        if (splitMirrorPaneEl) {
          splitMirrorPaneEl.style.flex = '';
          splitMirrorPaneEl.style.height = '';
        }
      }
      showToast(isSplit ? 'Dual-pane Split Window: ON' : 'Split Window: OFF', 'info');
    });

    // Resizable Split Divider Drag Handler
    if (splitDividerEl && editorWrapPane && splitMirrorPaneEl && mainContentArea) {
      let isDraggingSplit = false;

      const onSplitDrag = e => {
        if (!isDraggingSplit) return;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const rect = mainContentArea.getBoundingClientRect();
        const offset = clientY - rect.top;
        const totalHeight = rect.height;
        if (totalHeight > 0) {
          const percent = Math.min(85, Math.max(15, (offset / totalHeight) * 100));
          editorWrapPane.style.flex = `0 0 ${percent}%`;
          editorWrapPane.style.height = `${percent}%`;
          splitMirrorPaneEl.style.flex = `0 0 ${100 - percent}%`;
          splitMirrorPaneEl.style.height = `${100 - percent}%`;
        }
      };

      const onSplitDragEnd = () => {
        if (isDraggingSplit) {
          isDraggingSplit = false;
          splitDividerEl.classList.remove('dragging');
          document.body.style.userSelect = '';
          document.body.style.cursor = '';
        }
      };

      splitDividerEl.addEventListener('mousedown', e => {
        e.preventDefault();
        isDraggingSplit = true;
        splitDividerEl.classList.add('dragging');
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'row-resize';
      });

      splitDividerEl.addEventListener('touchstart', () => {
        isDraggingSplit = true;
        splitDividerEl.classList.add('dragging');
      }, { passive: true });

      window.addEventListener('mousemove', onSplitDrag);
      window.addEventListener('touchmove', onSplitDrag, { passive: true });
      window.addEventListener('mouseup', onSplitDragEnd);
      window.addEventListener('touchend', onSplitDragEnd);
      window.addEventListener('touchcancel', onSplitDragEnd);
    }

    const editorMainEl = $('#editor');
    const editorSplitEl = $('#editorSplitMirror');
    if (editorMainEl && editorSplitEl) {
      editorMainEl.addEventListener('input', () => {
        if (document.body.classList.contains('has-split-window') && document.activeElement === editorMainEl) {
          editorSplitEl.innerHTML = editorMainEl.innerHTML;
        }
      });
      editorSplitEl.addEventListener('input', () => {
        if (document.body.classList.contains('has-split-window') && document.activeElement === editorSplitEl) {
          editorMainEl.innerHTML = editorSplitEl.innerHTML;
          window.DocFlow.Editor?.notifyChange();
        }
      });
    }

    $('#viewHighContrastBtn')?.addEventListener('click', () => {
      const wrap = $('#editorWrap');
      if (wrap) {
        const isContrast = wrap.classList.toggle('high-contrast-mode');
        $('#viewHighContrastBtn')?.classList.toggle('active', isContrast);
        showToast(isContrast ? 'High Contrast Mode: ON' : 'High Contrast: OFF', 'info');
      }
    });

    // 7. Dedicated PPT Ribbon Panel Controls (Issue 4)
    $('#pptNewSlideMenuBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      const pop = $('#pptNewSlidePopover');
      const btn = $('#pptNewSlideMenuBtn');
      if (pop?.classList.contains('show')) pop.classList.remove('show');
      else if (pop && btn) window.DocFlow.UI.positionPopover(btn, pop);
    });

    $$('#pptNewSlidePopover .spacing-opt-item[data-ppt-layout]').forEach(item => {
      item.addEventListener('click', () => {
        const layout = item.dataset.pptLayout || 'blank';
        insertPptSlide(false, layout);
        $('#pptNewSlidePopover')?.classList.remove('show');
      });
    });

    $('#pptDeleteSlideBtn')?.addEventListener('click', () => {
      deletePptSlide(currentActiveSlideIndex);
    });

    $('#pptDuplicateSlideBtn')?.addEventListener('click', () => {
      duplicatePptSlide();
    });

    // Presentation Themes & Palettes (Replacing duplicate layout button)
    $('#pptSlideThemeBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      const pop = $('#pptSlideThemePopover');
      const btn = $('#pptSlideThemeBtn');
      if (pop?.classList.contains('show')) pop.classList.remove('show');
      else if (pop && btn) window.DocFlow.UI.positionPopover(btn, pop);
    });

    const PPT_THEMES_DICT = {
      ocean: { bg: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)', text: '#f8fafc', border: '1px solid #3b82f6' },
      emerald: { bg: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)', text: '#f0fdf4', border: '1px solid #10b981' },
      sunset: { bg: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 100%)', text: '#fff7ed', border: '1px solid #f97316' },
      royal: { bg: 'linear-gradient(135deg, #3b0764 0%, #7e22ce 100%)', text: '#faf5ff', border: '1px solid #a855f7' },
      obsidian: { bg: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)', text: '#f4f4f5', border: '1px solid #3f3f46' },
      monochrome: { bg: '#ffffff', text: '#0f172a', border: '2px solid #0f172a' }
    };

    $$('#pptSlideThemePopover .spacing-opt-item[data-ppt-theme]').forEach(item => {
      item.addEventListener('click', () => {
        const themeKey = item.dataset.pptTheme;
        const theme = PPT_THEMES_DICT[themeKey];
        if (theme) {
          window.DocFlow.Editor?.saveSnapshot?.();
          const slides = document.querySelectorAll('#editor .pptx-slide-wrapper');
          const curSlide = slides[currentActiveSlideIndex] || document.querySelector('#editor .pptx-slide-wrapper');
          const card = curSlide ? (curSlide.querySelector('.pptx-slide-card') || curSlide) : null;
          if (card) {
            card.style.background = theme.bg;
            card.style.color = theme.text;
            card.style.border = theme.border;
            card.querySelectorAll('h1, h2, h3, h4, .slide-title-box, .slide-content-box').forEach(el => el.style.color = theme.text);
            window.DocFlow.Editor?.notifyChange();
            showToast(`Theme applied: ${item.textContent.trim()}`, 'success');
          }
          updateLayoutSetting('slideTheme', themeKey);
        }
        $('#pptSlideThemePopover')?.classList.remove('show');
      });
    });

    $('#pptBgColorBtn')?.addEventListener('click', () => {
      $('#pptBgColorInput')?.click();
    });
    $('#pptBgColorInput')?.addEventListener('input', e => {
      const slides = document.querySelectorAll('#editor .pptx-slide-wrapper');
      const curSlide = slides[currentActiveSlideIndex] || document.querySelector('#editor .pptx-slide-wrapper');
      const card = curSlide ? (curSlide.querySelector('.pptx-slide-card') || curSlide) : null;
      if (card) {
        card.style.backgroundColor = e.target.value;
        window.DocFlow.Editor?.notifyChange();
      }
      updateLayoutSetting('slideColor', e.target.value);
    });
    $('#pptBgColorInput')?.addEventListener('change', e => {
      const slides = document.querySelectorAll('#editor .pptx-slide-wrapper');
      const curSlide = slides[currentActiveSlideIndex] || document.querySelector('#editor .pptx-slide-wrapper');
      const card = curSlide ? (curSlide.querySelector('.pptx-slide-card') || curSlide) : null;
      if (card) {
        showToast('Slide background color applied', 'success');
      } else {
        showToast('Select a presentation slide first', 'info');
      }
      updateLayoutSetting('slideColor', e.target.value);
    });

    $('#pptBgImageBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      const pop = $('#pptBgImagePopover');
      const btn = $('#pptBgImageBtn');
      if (pop?.classList.contains('show')) pop.classList.remove('show');
      else if (pop && btn) window.DocFlow.UI.positionPopover(btn, pop);
    });

    $('#pptBgUploadDeviceBtn')?.addEventListener('click', () => {
      $('#pptBgFileInput')?.click();
      $('#pptBgImagePopover')?.classList.remove('show');
    });

    $('#pptBgFileInput')?.addEventListener('change', e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const slides = document.querySelectorAll('#editor .pptx-slide-wrapper');
        const curSlide = slides[currentActiveSlideIndex] || document.querySelector('#editor .pptx-slide-wrapper');
        const card = curSlide ? (curSlide.querySelector('.pptx-slide-card') || curSlide) : null;
        if (card) {
          card.style.backgroundImage = `url(${ev.target.result})`;
          card.style.backgroundSize = 'cover';
          card.style.backgroundPosition = 'center';
          card.style.backgroundRepeat = 'no-repeat';
          window.DocFlow.Editor?.notifyChange();
          showToast('Slide background image applied from device', 'success');
        }
        updateLayoutSetting('bgImage', ev.target.result);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    });

    $('#pptBgOnlineUrlBtn')?.addEventListener('click', () => {
      $('#pptBgImagePopover')?.classList.remove('show');
      window.DocFlow.UI?.openModal?.('#pptOnlineBgModal');
      setTimeout(() => $('#pptOnlineBgUrlInput')?.focus(), 50);
    });

    $('#pptOnlineBgCloseBtn')?.addEventListener('click', () => window.DocFlow.UI?.closeModal?.('#pptOnlineBgModal'));
    $('#pptOnlineBgCancelBtn')?.addEventListener('click', () => window.DocFlow.UI?.closeModal?.('#pptOnlineBgModal'));

    $('#pptOnlineBgApplyBtn')?.addEventListener('click', () => {
      const url = ($('#pptOnlineBgUrlInput')?.value || '').trim();
      if (url) {
        const slides = document.querySelectorAll('#editor .pptx-slide-wrapper');
        const curSlide = slides[currentActiveSlideIndex] || document.querySelector('#editor .pptx-slide-wrapper');
        const card = curSlide ? (curSlide.querySelector('.pptx-slide-card') || curSlide) : null;
        if (card) {
          card.style.backgroundImage = `url(${url})`;
          card.style.backgroundSize = 'cover';
          card.style.backgroundPosition = 'center';
          card.style.backgroundRepeat = 'no-repeat';
          window.DocFlow.Editor?.notifyChange();
          showToast('Online slide background image applied', 'success');
        }
        updateLayoutSetting('bgImage', url);
        window.DocFlow.UI?.closeModal?.('#pptOnlineBgModal');
      } else {
        showToast('Please enter an image URL', 'warning');
      }
    });

    $('#pptBgRemoveBtn')?.addEventListener('click', () => {
      const slides = document.querySelectorAll('#editor .pptx-slide-wrapper');
      const curSlide = slides[currentActiveSlideIndex] || document.querySelector('#editor .pptx-slide-wrapper');
      const card = curSlide ? (curSlide.querySelector('.pptx-slide-card') || curSlide) : null;
      if (card) {
        card.style.backgroundImage = 'none';
        window.DocFlow.Editor?.notifyChange();
        showToast('Slide background image removed', 'info');
      }
      updateLayoutSetting('bgImage', null);
      $('#pptBgImagePopover')?.classList.remove('show');
    });

    // Auto-Fit Text to Slide Boundaries (Issue 1)
    $('#pptAutoFitBtn')?.addEventListener('click', () => {
      const slides = document.querySelectorAll('#editor .pptx-slide-wrapper');
      const curSlide = slides[currentActiveSlideIndex] || document.querySelector('#editor .pptx-slide-wrapper');
      const card = curSlide ? (curSlide.querySelector('.pptx-slide-card') || curSlide) : null;
      if (card) {
        autoFitSlideText(card, true);
      } else {
        showToast('Select a presentation slide first', 'info');
      }
    });

    // Speaker Notes Toggle
    $('#pptNotesBtn')?.addEventListener('click', () => {
      const slides = document.querySelectorAll('#editor .pptx-slide-wrapper');
      const curSlide = slides[currentActiveSlideIndex] || document.querySelector('#editor .pptx-slide-wrapper');
      if (!curSlide) return;
      let notes = curSlide.querySelector('.slide-speaker-notes');
      if (notes) {
        notes.remove();
        $('#pptNotesBtn')?.classList.remove('active');
        showToast('Speaker notes closed', 'info');
      } else {
        curSlide.insertAdjacentHTML('beforeend', `
          <div class="slide-speaker-notes">
            <div class="slide-speaker-notes-title"><i class="fas fa-comment-dots"></i> Speaker Notes</div>
            <div class="slide-speaker-notes-content" contenteditable="true">Click here to add presentation notes...</div>
          </div>
        `);
        $('#pptNotesBtn')?.classList.add('active');
        showToast('Speaker notes opened', 'success');
      }
      window.DocFlow.Editor?.notifyChange();
    });

    // Slide Transitions (Issue 3 & issue2: Expanded transitions & animations)
    $('#pptTransitionBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      const pop = $('#pptTransitionPopover');
      const btn = $('#pptTransitionBtn');
      if (pop?.classList.contains('show')) pop.classList.remove('show');
      else if (pop && btn) window.DocFlow.UI.positionPopover(btn, pop);
    });

    $$('#pptTransitionPopover .spacing-opt-item[data-transition]').forEach(item => {
      item.addEventListener('click', () => {
        const trans = item.dataset.transition;
        const slides = document.querySelectorAll('#editor .pptx-slide-wrapper');
        const curSlide = slides[currentActiveSlideIndex] || document.querySelector('#editor .pptx-slide-wrapper');
        if (curSlide) {
          curSlide.dataset.transition = trans;
          const card = curSlide.querySelector('.pptx-slide-card') || curSlide;
          card.className = card.className.replace(/\banim-ppt-[\w-]+\b/g, '').trim();
          if (trans && trans !== 'none') {
            card.style.setProperty('--ppt-trans-dur', (currentPptTransitionDuration || '1.0') + 's');
            void card.offsetWidth;
            card.classList.add(`anim-ppt-${trans}`);
          }
        }
        $$('#pptTransitionPopover .spacing-opt-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        showToast(`Slide transition applied: ${trans}`, 'success');
        $('#pptTransitionPopover')?.classList.remove('show');
      });
    });

    // Slide Element Animations (Problem 2)
    $('#pptAnimationBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      const pop = $('#pptAnimationPopover');
      const btn = $('#pptAnimationBtn');
      if (pop?.classList.contains('show')) pop.classList.remove('show');
      else if (pop && btn) window.DocFlow.UI.positionPopover(btn, pop);
    });

    $$('#pptAnimationPopover .spacing-opt-item[data-animation]').forEach(item => {
      item.addEventListener('click', () => {
        const anim = item.dataset.animation;
        const sel = window.getSelection();
        let targetEl = null;
        if (sel && sel.rangeCount && !sel.isCollapsed) {
          let node = sel.getRangeAt(0).commonAncestorContainer;
          if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
          targetEl = node.closest('.pptx-slide-title, .pptx-slide-body, .slide-title-box, .slide-content-box, .slide-nested-card, .docflow-shape-wrapper, p, h1, h2, h3, div');
        }
        if (!targetEl) {
          const slides = document.querySelectorAll('#editor .pptx-slide-wrapper');
          const curSlide = slides[currentActiveSlideIndex] || document.querySelector('#editor .pptx-slide-wrapper');
          targetEl = curSlide?.querySelector('.pptx-slide-title') || curSlide?.querySelector('.pptx-slide-card') || curSlide;
        }

        if (targetEl) {
          targetEl.className = targetEl.className.replace(/\banim-[\w-]+\b/g, '').trim();
          if (anim && anim !== 'none') {
            targetEl.style.setProperty('--ppt-anim-dur', (currentPptAnimDuration || '1.0') + 's');
            void targetEl.offsetWidth;
            targetEl.classList.add(`anim-${anim}`);
            targetEl.dataset.animation = anim;
          } else {
            delete targetEl.dataset.animation;
          }
          window.DocFlow.Editor?.notifyChange();
          showToast(`Animation applied: ${anim}`, 'success');
        } else {
          showToast('Select an element or slide to apply animation', 'info');
        }

        $$('#pptAnimationPopover .spacing-opt-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        $('#pptAnimationPopover')?.classList.remove('show');
      });
    });

    // Move Slides & Presentation Slide Show
    $('#pptMoveUpBtn')?.addEventListener('click', () => movePptSlide(-1));
    $('#pptMoveDownBtn')?.addEventListener('click', () => movePptSlide(1));
    // Slide Show Dropdown & Controls (Item 2)
    const getPptShowPopover = () => $('#pptStartSlideShowPopover') || $('#pptStartSlideShowMenu');
    $('#pptStartSlideShowBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const pop = getPptShowPopover();
      const btn = $('#pptStartSlideShowBtn');
      if (pop) {
        if (pop.classList.contains('show')) {
          pop.classList.remove('show');
        } else if (btn && window.DocFlow.UI?.positionPopover) {
          window.DocFlow.UI.positionPopover(btn, pop);
        } else {
          pop.classList.add('show');
        }
      }
    });
    $('#pptPlayFromBeginningBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      getPptShowPopover()?.classList.remove('show');
      startSlideShow(false);
    });
    $('#pptPlayFromCurrentBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      getPptShowPopover()?.classList.remove('show');
      startSlideShow(true);
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#pptStartSlideShowDropdownWrap')) {
        getPptShowPopover()?.classList.remove('show');
      }
    });

    // PPT Slide Image Insertion (Problem 2)
    $('#pptInsertImageBtn')?.addEventListener('click', () => {
      $('#pptImageFileInput')?.click();
    });
    $('#pptImageFileInput')?.addEventListener('change', e => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const dataUrl = ev.target.result;
        const slides = Array.from(document.querySelectorAll('#editor .pptx-slide-wrapper'));
        const curSlide = slides[currentActiveSlideIndex] || document.querySelector('#editor .pptx-slide-wrapper');
        if (curSlide) {
          const card = curSlide.querySelector('.pptx-slide-card') || curSlide;
          const img = document.createElement('img');
          img.src = dataUrl;
          img.alt = file.name;
          img.className = 'ppt-slide-embedded-img';
          img.style.maxWidth = '60%';
          img.style.maxHeight = '280px';
          img.style.borderRadius = '6px';
          img.style.display = 'block';
          img.style.margin = '12px auto';
          img.style.cursor = 'pointer';
          card.appendChild(img);
          window.DocFlow.ImageManager?.attachImageListeners?.(img);
          window.DocFlow.ImageManager?.selectImage?.(img);
          window.DocFlow.Editor?.notifyChange?.();
          showToast('Image inserted onto slide! Use corner handles & toolbar to resize, move, or crop.', 'success');
        } else {
          showToast('Select a slide first to insert image', 'warning');
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    });

    // PPT Duration / Timer Dropdown (Problem 2: Separate Transition & Animation Timers)
    function updatePptDurationBtnLabel() {
      const btnSpan = $('#pptDurationBtn span');
      if (btnSpan) btnSpan.textContent = `Timers: T ${currentPptTransitionDuration}s | A ${currentPptAnimDuration}s`;
    }

    $('#pptDurationBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      const pop = $('#pptDurationPopover');
      const btn = $('#pptDurationBtn');
      if (pop?.classList.contains('show')) pop.classList.remove('show');
      else if (pop && btn) window.DocFlow.UI.positionPopover(btn, pop);
    });

    // Transition Timer (How long slide transition takes to show)
    $$('#pptDurationPopover .spacing-opt-item[data-trans-timer]').forEach(item => {
      item.addEventListener('click', () => {
        currentPptTransitionDuration = item.dataset.transTimer;
        $$('#pptDurationPopover .spacing-opt-item[data-trans-timer]').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        document.documentElement.style.setProperty('--ppt-trans-dur', currentPptTransitionDuration + 's');
        const slides = document.querySelectorAll('#editor .pptx-slide-wrapper');
        const curSlide = slides[currentActiveSlideIndex] || document.querySelector('#editor .pptx-slide-wrapper');
        if (curSlide) curSlide.style.setProperty('--ppt-trans-dur', currentPptTransitionDuration + 's');
        updatePptDurationBtnLabel();
        showToast(`Transition timer: ${currentPptTransitionDuration}s`, 'info');
        $('#pptDurationPopover')?.classList.remove('show');
      });
    });

    // Animation Timer (How long element animation takes to show)
    $$('#pptDurationPopover .spacing-opt-item[data-anim-timer]').forEach(item => {
      item.addEventListener('click', () => {
        currentPptAnimDuration = item.dataset.animTimer;
        $$('#pptDurationPopover .spacing-opt-item[data-anim-timer]').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        document.documentElement.style.setProperty('--ppt-anim-dur', currentPptAnimDuration + 's');
        const slides = document.querySelectorAll('#editor .pptx-slide-wrapper');
        const curSlide = slides[currentActiveSlideIndex] || document.querySelector('#editor .pptx-slide-wrapper');
        if (curSlide) curSlide.style.setProperty('--ppt-anim-dur', currentPptAnimDuration + 's');
        updatePptDurationBtnLabel();
        showToast(`Animation timer: ${currentPptAnimDuration}s`, 'info');
        $('#pptDurationPopover')?.classList.remove('show');
      });
    });

    // Backward compatibility for data-duration
    $$('#pptDurationPopover .spacing-opt-item[data-duration]').forEach(item => {
      item.addEventListener('click', () => {
        currentPptTransitionDuration = item.dataset.duration;
        $$('#pptDurationPopover .spacing-opt-item[data-duration]').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        document.documentElement.style.setProperty('--ppt-trans-dur', currentPptTransitionDuration + 's');
        updatePptDurationBtnLabel();
        showToast(`Slide transition speed: ${currentPptTransitionDuration}s`, 'info');
        $('#pptDurationPopover')?.classList.remove('show');
      });
    });

    // AutoAdvance timer for presentation slide show
    $$('#pptDurationPopover .spacing-opt-item[data-advance]').forEach(item => {
      item.addEventListener('click', () => {
        currentPptAutoAdvance = parseInt(item.dataset.advance, 10);
        $$('#pptDurationPopover .spacing-opt-item[data-advance]').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        showToast(currentPptAutoAdvance > 0 ? `SlideShow AutoPlay: ${currentPptAutoAdvance}s per slide` : 'SlideShow AutoPlay: Manual', 'info');
        $('#pptDurationPopover')?.classList.remove('show');
      });
    });

    // 8. Dedicated Excel Ribbon Panel Controls (Issue 5)
    $('#excelMergeCellsBtn')?.addEventListener('click', () => {
      handleExcelTableAction('merge');
    });
    $('#excelUnmergeCellsBtn')?.addEventListener('click', () => {
      handleExcelTableAction('unmerge');
    });
    $('#excelAddRowAboveBtn')?.addEventListener('click', () => {
      handleExcelTableAction('add-row-above');
    });
    $('#excelAddRowBelowBtn')?.addEventListener('click', () => {
      handleExcelTableAction('add-row-below');
    });
    $('#excelDelRowBtn')?.addEventListener('click', () => {
      handleExcelTableAction('delete-row');
    });
    $('#excelAddColLeftBtn')?.addEventListener('click', () => {
      handleExcelTableAction('add-col-left');
    });
    $('#excelAddColRightBtn')?.addEventListener('click', () => {
      handleExcelTableAction('add-col-right');
    });
    $('#excelDelColBtn')?.addEventListener('click', () => {
      handleExcelTableAction('delete-col');
    });

    $('#excelFunctionBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      const pop = $('#excelFunctionPopover') || $('#excelFormulaPopover');
      const btn = $('#excelFunctionBtn');
      if (pop?.classList.contains('show')) pop.classList.remove('show');
      else if (pop && btn) window.DocFlow.UI.positionPopover(btn, pop);
    });
    $('#excelFormulaBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      applyExcelFormula('SUM');
    });
    $$('#excelFunctionPopover .spacing-opt-item[data-formula], #excelFormulaPopover .spacing-opt-item[data-formula]').forEach(item => {
      item.addEventListener('click', () => {
        applyExcelFormula(item.dataset.formula);
        $('#excelFunctionPopover')?.classList.remove('show');
        $('#excelFormulaPopover')?.classList.remove('show');
      });
    });

    function getExcelTargetCells() {
      const table = document.querySelector('.excel-grid-table') || document.querySelector('#editor table');
      if (!table) return [];
      const selected = Array.from(table.querySelectorAll('td.excel-cell-selected'));
      if (selected.length > 0) return selected;
      const cell = getActiveTableCell();
      return cell ? [cell] : [];
    }

    $('#excelFmtCurrencyBtn')?.addEventListener('click', () => {
      const cells = getExcelTargetCells();
      if (!cells.length) {
        showToast('Click inside a spreadsheet cell first', 'info');
        return;
      }
      window.DocFlow.Editor?.saveSnapshot?.(true);
      cells.forEach(cell => {
        const num = parseFloat(cell.textContent.replace(/[^0-9.-]/g, '')) || 0;
        cell.textContent = `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      });
      const formulaInput = document.querySelector('.excel-formula-input');
      if (formulaInput && window._activeExcelCell) formulaInput.value = window._activeExcelCell.textContent || '';
      window.DocFlow.Editor?.notifyChange();
      showToast(`Formatted ${cells.length} cell(s) as Currency ($)`, 'info');
      restoreCellFocus(cells[0]);
    });

    $('#excelFmtPercentBtn')?.addEventListener('click', () => {
      const cells = getExcelTargetCells();
      if (!cells.length) {
        showToast('Click inside a spreadsheet cell first', 'info');
        return;
      }
      window.DocFlow.Editor?.saveSnapshot?.(true);
      cells.forEach(cell => {
        const num = parseFloat(cell.textContent.replace(/[^0-9.-]/g, '')) || 0;
        cell.textContent = `${(num * (num < 1 ? 100 : 1)).toFixed(1)}%`;
      });
      const formulaInput = document.querySelector('.excel-formula-input');
      if (formulaInput && window._activeExcelCell) formulaInput.value = window._activeExcelCell.textContent || '';
      window.DocFlow.Editor?.notifyChange();
      showToast(`Formatted ${cells.length} cell(s) as Percentage (%)`, 'info');
      restoreCellFocus(cells[0]);
    });

    $('#excelFmtDecimalIncBtn')?.addEventListener('click', () => {
      const cells = getExcelTargetCells();
      if (!cells.length) {
        showToast('Click inside a spreadsheet cell first', 'info');
        return;
      }
      window.DocFlow.Editor?.saveSnapshot?.(true);
      cells.forEach(cell => {
        const text = (cell.textContent || '').trim();
        const num = parseFloat(text.replace(/[^0-9.-]/g, '')) || 0;
        const decMatch = text.match(/\.(\d+)/);
        const curDec = decMatch ? decMatch[1].length : 0;
        const newDec = Math.min(6, curDec + 1);
        cell.textContent = num.toFixed(newDec);
      });
      const formulaInput = document.querySelector('.excel-formula-input');
      if (formulaInput && window._activeExcelCell) formulaInput.value = window._activeExcelCell.textContent || '';
      window.DocFlow.Editor?.notifyChange();
      showToast(`Increased decimals on ${cells.length} cell(s)`, 'info');
      restoreCellFocus(cells[0]);
    });

    $('#excelFmtDecimalDecBtn')?.addEventListener('click', () => {
      const cells = getExcelTargetCells();
      if (!cells.length) {
        showToast('Click inside a spreadsheet cell first', 'info');
        return;
      }
      window.DocFlow.Editor?.saveSnapshot?.(true);
      cells.forEach(cell => {
        const text = (cell.textContent || '').trim();
        const num = parseFloat(text.replace(/[^0-9.-]/g, '')) || 0;
        const decMatch = text.match(/\.(\d+)/);
        const curDec = decMatch ? decMatch[1].length : 0;
        const newDec = Math.max(0, curDec - 1);
        cell.textContent = newDec === 0 ? Math.round(num).toString() : num.toFixed(newDec);
      });
      const formulaInput = document.querySelector('.excel-formula-input');
      if (formulaInput && window._activeExcelCell) formulaInput.value = window._activeExcelCell.textContent || '';
      window.DocFlow.Editor?.notifyChange();
      showToast(`Decreased decimals on ${cells.length} cell(s)`, 'info');
      restoreCellFocus(cells[0]);
    });

    $('#excelBorderBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      const pop = $('#excelBorderPopover');
      const btn = $('#excelBorderBtn');
      if (pop?.classList.contains('show')) pop.classList.remove('show');
      else if (pop && btn) window.DocFlow.UI.positionPopover(btn, pop);
    });
    $$('#excelBorderPopover .spacing-opt-item[data-border]').forEach(item => {
      item.addEventListener('click', () => {
        const type = item.dataset.border;
        if (type === 'custom') {
          $('#excelBorderPopover')?.classList.remove('show');
          openModal('#excelCustomBorderModal');
          return;
        }

        const cell = getActiveTableCell();
        const table = cell ? cell.closest('table') : document.querySelector('#editor table');
        if (table) {
          window.DocFlow.Editor?.saveSnapshot?.();
          const selected = Array.from(table.querySelectorAll('td.excel-cell-selected'));
          const targets = selected.length > 0 ? selected : (cell ? [cell] : Array.from(table.querySelectorAll('td')));
          const defaultBorderColor = '#0f172a';

          if (type === 'outside') {
            const minR = Math.min(...targets.map(c => c.closest('tr').rowIndex));
            const maxR = Math.max(...targets.map(c => c.closest('tr').rowIndex));
            const minC = Math.min(...targets.map(c => c.cellIndex));
            const maxC = Math.max(...targets.map(c => c.cellIndex));
            targets.forEach(c => {
              c.classList.add('excel-border-applied');
              const rIdx = c.closest('tr').rowIndex;
              const cIdx = c.cellIndex;
              if (rIdx === minR) c.style.setProperty('border-top', `2px solid ${defaultBorderColor}`, 'important');
              if (rIdx === maxR) c.style.setProperty('border-bottom', `2px solid ${defaultBorderColor}`, 'important');
              if (cIdx === minC) c.style.setProperty('border-left', `2px solid ${defaultBorderColor}`, 'important');
              if (cIdx === maxC) c.style.setProperty('border-right', `2px solid ${defaultBorderColor}`, 'important');
            });
          } else {
            targets.forEach(c => {
              if (type === 'all') {
                c.classList.add('excel-border-applied');
                c.style.setProperty('border', `1.5px solid ${defaultBorderColor}`, 'important');
              } else if (type === 'thick-bottom') {
                c.classList.add('excel-border-applied');
                c.style.setProperty('border-bottom', `3px solid ${defaultBorderColor}`, 'important');
              } else if (type === 'top-bottom') {
                c.classList.add('excel-border-applied');
                c.style.setProperty('border-top', `1.5px solid ${defaultBorderColor}`, 'important');
                c.style.setProperty('border-bottom', `3px double ${defaultBorderColor}`, 'important');
              } else if (type === 'left') {
                c.classList.add('excel-border-applied');
                c.style.setProperty('border-left', `2px solid ${defaultBorderColor}`, 'important');
              } else if (type === 'right') {
                c.classList.add('excel-border-applied');
                c.style.setProperty('border-right', `2px solid ${defaultBorderColor}`, 'important');
              } else if (type === 'top') {
                c.classList.add('excel-border-applied');
                c.style.setProperty('border-top', `2px solid ${defaultBorderColor}`, 'important');
              } else if (type === 'bottom') {
                c.classList.add('excel-border-applied');
                c.style.setProperty('border-bottom', `2px solid ${defaultBorderColor}`, 'important');
              } else if (type === 'none') {
                c.classList.remove('excel-border-applied');
                c.style.removeProperty('border');
                c.style.removeProperty('border-top');
                c.style.removeProperty('border-bottom');
                c.style.removeProperty('border-left');
                c.style.removeProperty('border-right');
              }
            });
          }
          window.DocFlow.Editor?.notifyChange();
          showToast(`Border style applied: ${type}`, 'info');
        }
        $('#excelBorderPopover')?.classList.remove('show');
        restoreCellFocus(cell);
      });
    });

    // Excel Custom Border Dialog Wiring (Issue 4)
    $('#excelCustomBorderBtn')?.addEventListener('click', () => {
      $('#excelBorderPopover')?.classList.remove('show');
      openModal('#excelCustomBorderModal');
    });

    $('#excelBorderColorInput')?.addEventListener('input', e => {
      const hex = $('#excelBorderColorHex');
      if (hex) hex.textContent = e.target.value;
    });

    $('#excelCustomBorderCloseBtn')?.addEventListener('click', () => {
      closeModal('#excelCustomBorderModal');
    });
    $('#excelCustomBorderCancelBtn')?.addEventListener('click', () => {
      closeModal('#excelCustomBorderModal');
    });

    $('#excelCustomBorderApplyBtn')?.addEventListener('click', () => {
      const width = $('#excelBorderWidthInput')?.value || '1px';
      const style = $('#excelBorderStyleInput')?.value || 'solid';
      const color = $('#excelBorderColorInput')?.value || '#16a34a';
      const sides = $('#excelBorderSidesInput')?.value || 'all';

      const cell = getActiveTableCell();
      const table = cell ? cell.closest('table') : document.querySelector('#editor table');
      if (!table) {
        showToast('Please click inside an Excel spreadsheet first', 'warning');
        closeModal('#excelCustomBorderModal');
        return;
      }

      window.DocFlow.Editor?.saveSnapshot?.();
      const selected = Array.from(table.querySelectorAll('td.excel-cell-selected'));
      const targets = selected.length > 0 ? selected : (cell ? [cell] : Array.from(table.querySelectorAll('td')));
      const borderRule = `${width} ${style} ${color}`;

      if (sides === 'outline') {
        const minR = Math.min(...targets.map(c => c.closest('tr').rowIndex));
        const maxR = Math.max(...targets.map(c => c.closest('tr').rowIndex));
        const minC = Math.min(...targets.map(c => c.cellIndex));
        const maxC = Math.max(...targets.map(c => c.cellIndex));

        targets.forEach(c => {
          c.classList.add('excel-border-applied');
          const rIdx = c.closest('tr').rowIndex;
          const cIdx = c.cellIndex;
          if (rIdx === minR) c.style.setProperty('border-top', borderRule, 'important');
          if (rIdx === maxR) c.style.setProperty('border-bottom', borderRule, 'important');
          if (cIdx === minC) c.style.setProperty('border-left', borderRule, 'important');
          if (cIdx === maxC) c.style.setProperty('border-right', borderRule, 'important');
        });
      } else {
        targets.forEach(c => {
          c.classList.add('excel-border-applied');
          if (sides === 'all') {
            c.style.setProperty('border', borderRule, 'important');
          } else if (sides === 'top') {
            c.style.setProperty('border-top', borderRule, 'important');
          } else if (sides === 'bottom') {
            c.style.setProperty('border-bottom', borderRule, 'important');
          } else if (sides === 'left') {
            c.style.setProperty('border-left', borderRule, 'important');
          } else if (sides === 'right') {
            c.style.setProperty('border-right', borderRule, 'important');
          } else if (sides === 'top-bottom') {
            c.style.setProperty('border-top', borderRule, 'important');
            c.style.setProperty('border-bottom', borderRule, 'important');
          }
        });
      }

      window.DocFlow.Editor?.notifyChange();
      showToast(`Custom border applied: ${width} ${style} ${sides}`, 'success');
      closeModal('#excelCustomBorderModal');
      restoreCellFocus(cell);
    });

    $('#excelCellFillBtn')?.addEventListener('click', () => {
      $('#excelCellFillInput')?.click();
    });

    $('#excelCellFillInput')?.addEventListener('input', e => {
      const cell = getActiveTableCell();
      const table = cell ? cell.closest('table') : document.querySelector('#editor table');
      if (table) {
        const selected = Array.from(table.querySelectorAll('td.excel-cell-selected'));
        const targets = selected.length > 0 ? selected : (cell ? [cell] : []);
        targets.forEach(c => {
          c.dataset.customFill = 'true';
          c.style.setProperty('background-color', e.target.value, 'important');
        });
        window.DocFlow.Editor?.notifyChange();
      }
      restoreCellFocus(cell);
    });

    $('#excelCellFillInput')?.addEventListener('change', e => {
      const cell = getActiveTableCell();
      const table = cell ? cell.closest('table') : document.querySelector('#editor table');
      if (table && (cell || table.querySelector('td.excel-cell-selected'))) {
        const selected = Array.from(table.querySelectorAll('td.excel-cell-selected'));
        const targets = selected.length > 0 ? selected : (cell ? [cell] : []);
        targets.forEach(c => {
          c.dataset.customFill = 'true';
          c.style.setProperty('background-color', e.target.value, 'important');
        });
        window.DocFlow.Editor?.notifyChange();
        showToast('Cell fill color applied', 'success');
      } else {
        showToast('Click inside a spreadsheet cell first to apply fill', 'info');
      }
      restoreCellFocus(cell);
    });

    $('#excelSortAscBtn')?.addEventListener('mousedown', e => e.preventDefault());
    $('#excelSortAscBtn')?.addEventListener('click', () => {
      window.DocFlow.Editor?.sortSelectedTextOrTable('asc');
      restoreCellFocus(getActiveTableCell());
    });

    $('#excelSortDescBtn')?.addEventListener('mousedown', e => e.preventDefault());
    $('#excelSortDescBtn')?.addEventListener('click', () => {
      window.DocFlow.Editor?.sortSelectedTextOrTable('desc');
      restoreCellFocus(getActiveTableCell());
    });
    // Excel Filter Dropdown & Functionality (Issue 3: Condition-Based Filtering)
    const populateExcelFilterColumns = () => {
      const colSelect = $('#excelFilterColumnSelect');
      if (!colSelect) return;
      const table = document.querySelector('.excel-grid-table') || document.querySelector('#editor table');
      const curVal = colSelect.value;
      colSelect.innerHTML = '<option value="all">Entire Sheet (All Columns)</option>';
      if (!table) return;

      const theadThs = Array.from(table.querySelectorAll('thead th.excel-col-hdr'));
      const firstRowTds = Array.from(table.querySelectorAll('tbody tr:first-child td'));

      theadThs.forEach((th, idx) => {
        const colLetter = th.textContent.trim() || `Col ${idx + 1}`;
        const headerName = firstRowTds[idx]?.textContent.trim();
        const label = headerName ? `${colLetter} — "${headerName.substring(0, 16)}"` : `Column ${colLetter}`;
        const opt = document.createElement('option');
        opt.value = String(idx + 1);
        opt.textContent = label;
        colSelect.appendChild(opt);
      });

      const activeCell = window._activeExcelCell || table.querySelector('td.excel-cell-selected');
      if (activeCell && activeCell.cellIndex > 0) {
        colSelect.value = String(activeCell.cellIndex);
      } else if (curVal && colSelect.querySelector(`option[value="${curVal}"]`)) {
        colSelect.value = curVal;
      }
    };

    $('#excelFilterBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const pop = $('#excelFilterPopover');
      const btn = $('#excelFilterBtn');
      if (pop && btn) {
        if (pop.classList.contains('show')) {
          pop.classList.remove('show');
        } else {
          populateExcelFilterColumns();
          window.DocFlow.UI?.positionPopover?.(btn, pop);
        }
      }
    });

    $('#excelFilterConditionSelect')?.addEventListener('change', e => {
      const valGroup = $('#excelFilterValGroup');
      const cond = e.target.value;
      if (valGroup) {
        valGroup.style.display = (cond === 'is_empty' || cond === 'is_not_empty') ? 'none' : 'block';
      }
    });

    function testCellFilterCondition(cellRawText, cond, query, isCase) {
      let val = (cellRawText || '').trim();
      let target = (query || '').trim();
      if (!isCase) {
        val = val.toLowerCase();
        target = target.toLowerCase();
      }
      const numVal = parseFloat(val.replace(/[^0-9.-]/g, ''));
      const numTarget = parseFloat(target.replace(/[^0-9.-]/g, ''));
      const hasNumbers = !isNaN(numVal) && !isNaN(numTarget) && val.length > 0 && target.length > 0;

      switch (cond) {
        case 'contains':
          return val.includes(target);
        case 'not_contains':
          return !val.includes(target);
        case 'equals':
          return hasNumbers ? numVal === numTarget : val === target;
        case 'not_equals':
          return hasNumbers ? numVal !== numTarget : val !== target;
        case 'starts_with':
          return val.startsWith(target);
        case 'ends_with':
          return val.endsWith(target);
        case 'gt':
          return hasNumbers ? numVal > numTarget : val > target;
        case 'gte':
          return hasNumbers ? numVal >= numTarget : val >= target;
        case 'lt':
          return hasNumbers ? numVal < numTarget : val < target;
        case 'lte':
          return hasNumbers ? numVal <= numTarget : val <= target;
        case 'between': {
          const parts = target.split(/\.\.|\s+to\s+|,|-/).map(p => parseFloat(p.trim())).filter(n => !isNaN(n));
          if (parts.length >= 2 && !isNaN(numVal)) {
            const min = Math.min(parts[0], parts[1]);
            const max = Math.max(parts[0], parts[1]);
            return numVal >= min && numVal <= max;
          }
          return true;
        }
        case 'is_empty':
          return val.length === 0;
        case 'is_not_empty':
          return val.length > 0;
        default:
          return val.includes(target);
      }
    }

    const applyExcelFilter = () => {
      const table = document.querySelector('.excel-grid-table');
      if (!table) return;

      const colVal = $('#excelFilterColumnSelect')?.value || 'all';
      const cond = $('#excelFilterConditionSelect')?.value || 'contains';
      const q = ($('#excelFilterTextInput')?.value || '').trim();
      const isCase = $('#excelFilterCaseCheck')?.checked || false;

      const tbody = table.querySelector('tbody') || table;
      const rows = Array.from(tbody.querySelectorAll('tr'));
      let visibleCount = 0;

      rows.forEach(r => {
        const cells = Array.from(r.querySelectorAll('td'));
        let match = false;
        if (colVal === 'all') {
          if (cond === 'not_contains' || cond === 'not_equals') {
            match = cells.every(td => testCellFilterCondition(td.textContent, cond, q, isCase));
          } else if (cond === 'is_empty') {
            match = cells.every(td => (td.textContent || '').trim().length === 0);
          } else {
            match = cells.some(td => testCellFilterCondition(td.textContent, cond, q, isCase));
          }
        } else {
          const cIdx = parseInt(colVal, 10);
          const td = r.cells[cIdx];
          match = td ? testCellFilterCondition(td.textContent, cond, q, isCase) : false;
        }

        r.style.display = match ? '' : 'none';
        if (match) visibleCount++;
      });

      const badge = $('#excelFilterCountBadge');
      if (badge) {
        badge.textContent = `${visibleCount} of ${rows.length} rows visible`;
        badge.style.background = visibleCount < rows.length ? '#0284c7' : 'var(--bg-tertiary)';
        badge.style.color = visibleCount < rows.length ? '#ffffff' : 'var(--text-muted)';
      }
      updateExcelChartPositions(table.closest('.excel-spreadsheet-container'));
      showToast(`Filter applied: ${visibleCount} of ${rows.length} row(s) visible`, 'info');
    };

    $('#excelFilterApplyBtn')?.addEventListener('click', applyExcelFilter);
    $('#excelFilterTextInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') applyExcelFilter();
    });

    $('#excelFilterClearBtn')?.addEventListener('click', () => {
      const input = $('#excelFilterTextInput');
      if (input) input.value = '';
      const condSel = $('#excelFilterConditionSelect');
      if (condSel) condSel.value = 'contains';
      const caseCheck = $('#excelFilterCaseCheck');
      if (caseCheck) caseCheck.checked = false;
      const colSelect = $('#excelFilterColumnSelect');
      if (colSelect) colSelect.value = 'all';
      const valGroup = $('#excelFilterValGroup');
      if (valGroup) valGroup.style.display = 'block';

      const table = document.querySelector('.excel-grid-table');
      if (table) {
        table.querySelectorAll('tbody tr').forEach(r => r.style.display = '');
      }
      const badge = $('#excelFilterCountBadge');
      if (badge) {
        badge.textContent = 'All rows visible';
        badge.style.background = 'var(--bg-tertiary)';
        badge.style.color = 'var(--text-muted)';
      }
      $('#excelFilterPopover')?.classList.remove('show');
      updateExcelChartPositions(table?.closest('.excel-spreadsheet-container'));
      showToast('Spreadsheet filter cleared: All rows visible', 'success');
      restoreCellFocus(getActiveTableCell());
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#excelFilterDropdownWrap')) {
        $('#excelFilterPopover')?.classList.remove('show');
      }
    });

    // Equation / Calculation Bar in Top Right (Issue 1.5)
    const eqBar = $('#excelEquationBar');
    const toggleEquationBar = () => {
      if (!eqBar) return;
      const isVisible = eqBar.style.display === 'block';
      if (isVisible) {
        eqBar.style.display = 'none';
      } else {
        eqBar.style.display = 'block';
        const input = $('#excelEquationInput');
        if (input) {
          const activeCell = window._activeExcelCell;
          if (activeCell && activeCell.textContent.trim()) {
            input.value = activeCell.textContent.trim();
          }
          input.focus();
        }
      }
    };

    $('#excelEquationBtn')?.addEventListener('click', toggleEquationBar);
    $('#excelEquationCloseBtn')?.addEventListener('click', () => {
      if (eqBar) eqBar.style.display = 'none';
    });

    const solveEquation = () => {
      const input = $('#excelEquationInput');
      const resEl = $('#excelEquationResult');
      if (!input || !resEl) return null;
      let expr = (input.value || '').trim();
      if (!expr) {
        resEl.textContent = 'Result: 0';
        return 0;
      }

      if (expr.startsWith('=')) expr = expr.substring(1).trim();

      const table = document.querySelector('.excel-grid-table');

      // 1. Resolve spreadsheet cell ranges like A1:B3 into comma-separated numbers
      if (table) {
        expr = expr.replace(/\b([A-Z]+)(\d+):([A-Z]+)(\d+)\b/gi, (match, col1, row1, col2, row2) => {
          const getColIdx = (letters) => {
            let idx = 0;
            for (let i = 0; i < letters.length; i++) {
              idx = idx * 26 + (letters.charCodeAt(i) - 64);
            }
            return idx;
          };
          const c1 = getColIdx(col1.toUpperCase());
          const c2 = getColIdx(col2.toUpperCase());
          const r1 = parseInt(row1, 10);
          const r2 = parseInt(row2, 10);

          const minC = Math.min(c1, c2);
          const maxC = Math.max(c1, c2);
          const minR = Math.min(r1, r2);
          const maxR = Math.max(r1, r2);

          const vals = [];
          for (let r = minR; r <= maxR; r++) {
            const row = table.rows[r];
            if (row) {
              for (let c = minC; c <= maxC; c++) {
                if (row.cells[c]) {
                  const num = parseFloat((row.cells[c].textContent || '').replace(/[^0-9.-]/g, ''));
                  vals.push(isNaN(num) ? 0 : num);
                }
              }
            }
          }
          return vals.join(', ');
        });

        // 2. Resolve single cell references like A1, B2
        expr = expr.replace(/\b([A-Z]+)(\d+)\b/g, (match, colLetters, rowNum) => {
          let colIdx = 0;
          for (let i = 0; i < colLetters.length; i++) {
            colIdx = colIdx * 26 + (colLetters.charCodeAt(i) - 64);
          }
          const row = table.rows[parseInt(rowNum, 10)];
          if (row && row.cells[colIdx]) {
            const val = parseFloat((row.cells[colIdx].textContent || '').replace(/[^0-9.-]/g, ''));
            return isNaN(val) ? 0 : val;
          }
          return 0;
        });
      }

      // 3. Define mathematical environment & functions
      const mathScope = {
        SUM: (...args) => args.flat(Infinity).reduce((a, b) => Number(a) + Number(b), 0),
        AVG: (...args) => { const a = args.flat(Infinity); return a.length ? a.reduce((x, y) => Number(x) + Number(y), 0) / a.length : 0; },
        AVERAGE: (...args) => mathScope.AVG(...args),
        COUNT: (...args) => args.flat(Infinity).filter(x => !isNaN(parseFloat(x))).length,
        MAX: (...args) => Math.max(...args.flat(Infinity)),
        MIN: (...args) => Math.min(...args.flat(Infinity)),
        PRODUCT: (...args) => args.flat(Infinity).reduce((a, b) => Number(a) * Number(b), 1),
        ROUND: (x, d = 0) => { const m = Math.pow(10, d); return Math.round(Number(x) * m) / m; },
        SQRT: (x) => Math.sqrt(Number(x)),
        POW: (x, y) => Math.pow(Number(x), Number(y)),
        POWER: (x, y) => Math.pow(Number(x), Number(y)),
        LOG: (x) => Math.log10(Number(x)),
        LOG10: (x) => Math.log10(Number(x)),
        LN: (x) => Math.log(Number(x)),
        EXP: (x) => Math.exp(Number(x)),
        ABS: (x) => Math.abs(Number(x)),
        MOD: (x, y) => Number(x) % Number(y),
        SIN: (x) => {
          const rad = (Number(x) * Math.PI) / 180;
          return Math.abs(Math.sin(rad)) < 1e-12 ? 0 : (Math.abs(Math.sin(rad) - 1) < 1e-12 ? 1 : Number(Math.sin(rad).toFixed(6)));
        },
        COS: (x) => {
          const rad = (Number(x) * Math.PI) / 180;
          return Math.abs(Math.cos(rad)) < 1e-12 ? 0 : (Math.abs(Math.cos(rad) - 1) < 1e-12 ? 1 : Number(Math.cos(rad).toFixed(6)));
        },
        TAN: (x) => {
          const rad = (Number(x) * Math.PI) / 180;
          return Number(Math.tan(rad).toFixed(6));
        },
        PI: Math.PI,
        E: Math.E
      };

      let evalStr = expr.replace(/\^/g, '**');
      evalStr = evalStr.replace(/(\d+(?:\.\d+)?)\s*%(?!\s*\d)/g, '($1 * 0.01)');

      try {
        const scopeKeys = Object.keys(mathScope);
        const scopeVals = Object.values(mathScope);
        scopeKeys.forEach(k => {
          if (typeof mathScope[k] === 'function') {
            const lowerK = k.toLowerCase();
            if (!mathScope[lowerK]) {
              mathScope[lowerK] = mathScope[k];
              scopeKeys.push(lowerK);
              scopeVals.push(mathScope[k]);
            }
          }
        });
        mathScope['pi'] = Math.PI;
        scopeKeys.push('pi'); scopeVals.push(Math.PI);
        mathScope['e'] = Math.E;
        scopeKeys.push('e'); scopeVals.push(Math.E);

        const fn = new Function(...scopeKeys, `'use strict'; return (${evalStr});`);
        const val = fn(...scopeVals);

        let displayVal = '0';
        if (typeof val === 'number') {
          if (isNaN(val)) displayVal = 'NaN';
          else if (!isFinite(val)) displayVal = val > 0 ? 'Infinity' : '-Infinity';
          else displayVal = Number.isInteger(val) ? val.toString() : parseFloat(val.toFixed(6)).toString();
        } else if (val !== undefined && val !== null) {
          displayVal = String(val);
        }
        resEl.textContent = `Result: ${displayVal}`;
        return displayVal;
      } catch (err) {
        resEl.textContent = 'Syntax Error';
        return null;
      }
    };

    // Issue 4: Make equation pills clickable, evaluate immediately & display output
    $$('#excelEquationBar .eq-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const fnName = pill.dataset.fn || pill.textContent.trim();
        const input = $('#excelEquationInput');
        if (!input) return;

        const table = document.querySelector('.excel-grid-table');
        const selectedCells = table ? Array.from(table.querySelectorAll('td.excel-cell-selected')) : [];

        let insertedExpr = '';
        if (selectedCells.length > 1) {
          if (['SUM', 'AVERAGE', 'AVG', 'COUNT', 'MAX', 'MIN', 'PRODUCT'].includes(fnName.toUpperCase())) {
            const nums = selectedCells.map(c => parseFloat((c.textContent || '').replace(/[^0-9.-]/g, ''))).filter(n => !isNaN(n));
            insertedExpr = `${fnName}(${nums.length ? nums.join(', ') : '10, 20, 30'})`;
          } else {
            const firstVal = parseFloat((selectedCells[0].textContent || '').replace(/[^0-9.-]/g, '')) || 0;
            insertedExpr = fnName === 'PI' ? 'PI' : `${fnName}(${firstVal})`;
          }
        } else if (window._activeExcelCell && (window._activeExcelCell.textContent || '').trim().length > 0) {
          const cellVal = window._activeExcelCell.textContent.trim();
          const num = parseFloat(cellVal.replace(/[^0-9.-]/g, ''));
          const arg = !isNaN(num) ? num : cellVal;
          insertedExpr = fnName === 'PI' ? 'PI' : `${fnName}(${arg})`;
        } else if (input.value.trim().length > 0) {
          const curVal = input.value.trim().replace(/^=/, '');
          if (fnName === 'PI') {
            insertedExpr = `${curVal} * PI`;
          } else if (['POWER', 'POW', 'MOD', 'ROUND'].includes(fnName.toUpperCase()) && !curVal.includes(',')) {
            insertedExpr = `${fnName}(${curVal}, 2)`;
          } else {
            insertedExpr = `${fnName}(${curVal})`;
          }
        } else {
          if (fnName === 'PI') insertedExpr = 'PI';
          else if (['POWER', 'POW', 'MOD', 'ROUND'].includes(fnName.toUpperCase())) insertedExpr = `${fnName}(10, 2)`;
          else if (fnName === 'SQRT') insertedExpr = 'SQRT(16)';
          else if (['SIN', 'COS', 'TAN'].includes(fnName.toUpperCase())) insertedExpr = `${fnName}(90)`;
          else if (fnName === 'LOG') insertedExpr = 'LOG(100)';
          else if (fnName === 'LN') insertedExpr = 'LN(10)';
          else if (fnName === 'EXP') insertedExpr = 'EXP(1)';
          else insertedExpr = `${fnName}(10, 20, 30)`;
        }

        input.value = insertedExpr;
        input.focus();
        solveEquation();
      });
    });

    $('#excelEquationSolveBtn')?.addEventListener('click', solveEquation);
    $('#excelEquationInput')?.addEventListener('input', () => {
      solveEquation();
    });
    $('#excelEquationInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') solveEquation();
    });

    $('#excelEquationApplyBtn')?.addEventListener('click', () => {
      const val = solveEquation();
      if (val !== null && val !== 'Syntax Error') {
        const cell = window._activeExcelCell || document.querySelector('.excel-grid-table td.excel-cell-selected');
        if (cell && cell.tagName === 'TD') {
          window.DocFlow.Editor?.saveSnapshot?.(true);
          cell.textContent = val;
          const formulaInput = document.querySelector('.excel-formula-input');
          if (formulaInput) formulaInput.value = val;
          window.DocFlow.Editor?.notifyChange();
          window.DocFlow.Editor?.saveSnapshot?.(true);
          updateExcelChartPositions(cell.closest('.excel-spreadsheet-container'));
          showToast(`Inserted ${val} into active cell`, 'success');
          restoreCellFocus(cell);
        } else {
          showToast('Click a cell first to insert result', 'info');
        }
      }
    });

    $('#excelExportCsvBtn')?.addEventListener('click', () => {
      const table = document.querySelector('#editor table');
      if (!table) {
        showToast('No table found to export as CSV', 'warning');
        return;
      }
      let csv = '';
      Array.from(table.rows).forEach(r => {
        const rowData = Array.from(r.cells).map(c => `"${c.textContent.replace(/"/g, '""').trim()}"`);
        csv += rowData.join(',') + '\r\n';
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'spreadsheet_export.csv';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Spreadsheet exported as CSV', 'success');
      restoreCellFocus(getActiveTableCell());
    });

    // 9. Dedicated PDF Ribbon Panel Controls
    $('#pdfRibbonPrevBtn')?.addEventListener('click', () => {
      window.DocFlow.PDF?.prevPage?.();
    });
    $('#pdfRibbonNextBtn')?.addEventListener('click', () => {
      window.DocFlow.PDF?.nextPage?.();
    });
    $('#pdfRibbonFirstPageBtn')?.addEventListener('click', () => {
      window.DocFlow.PDF?.jumpToPage?.(1);
    });
    $('#pdfRibbonLastPageBtn')?.addEventListener('click', () => {
      const total = window.DocFlow.PDF?.getTotalPages?.() || 1;
      window.DocFlow.PDF?.jumpToPage?.(total);
    });
    // PDF page jump is handled in pdf-viewer.js via inAppPromptModal

    $('#pdfCreateFromImagesBtn')?.addEventListener('click', () => {
      window.DocFlow.PDF?.openCreatePdfFromImagesModal?.();
    });
    $('#pdfRibbonExtractAllBtn')?.addEventListener('click', () => {
      window.DocFlow.PDF?.extractTextFromPdf?.(true);
    });
    $('#pdfRibbonMergeModalBtn')?.addEventListener('click', () => {
      window.DocFlow.PDF?.openMergeModal?.();
    });

    // 9. View Panel & Outline Actions
    $('#ribbonOutlineBtn')?.addEventListener('click', () => {
      window.DocFlow.Find?.toggleOutline();
    });
    $('#ribbonFindBtn')?.addEventListener('click', () => {
      window.DocFlow.Find?.openFindBar(false);
    });
    $('#ribbonHomeFindBtn')?.addEventListener('click', () => {
      window.DocFlow.Find?.openFindBar(false);
    });
    $('#ribbonReplaceBtn')?.addEventListener('click', () => {
      window.DocFlow.Find?.openFindBar(true);
    });
    $('#ribbonHomeReplaceBtn')?.addEventListener('click', () => {
      window.DocFlow.Find?.openFindBar(true);
    });

    // Presentation Slide Show Preview
    $('#viewPresentationPreviewBtn')?.addEventListener('click', startSlideShow);
    $('#slideshowPrevBtn')?.addEventListener('click', () => showSlideShowIndex(currentSlideShowIdx - 1));
    $('#slideshowNextBtn')?.addEventListener('click', () => showSlideShowIndex(currentSlideShowIdx + 1));
    $('#slideshowExitBtn')?.addEventListener('click', exitSlideShow);

    // Reading Mode (Distraction-Free Reading - Document Editing Disabled: Item 4)
    function disableEditingInReadMode() {
      const ed = $('#editor');
      if (!ed) return;
      ed.contentEditable = 'false';
      ed.querySelectorAll('.pptx-slide-card, .slide-title-box, .slide-content-box, [data-slide], .slide-freeform-rect, .slide-nested-card').forEach(el => {
        el.contentEditable = 'false';
      });
      ed.querySelectorAll('.excel-grid-table td').forEach(td => {
        td.contentEditable = 'false';
      });
      const formulaInput = ed.querySelector('.excel-formula-input');
      if (formulaInput) formulaInput.disabled = true;
    }

    function restoreEditingAfterReadMode() {
      const ed = $('#editor');
      if (!ed) return;
      if (window.DocFlow.currentMode === 'edit') {
        ed.contentEditable = 'true';
        ed.querySelectorAll('.pptx-slide-card, .slide-title-box, .slide-content-box, [data-slide], .slide-freeform-rect, .slide-nested-card').forEach(el => {
          el.contentEditable = 'true';
        });
        ed.querySelectorAll('.excel-grid-table td').forEach(td => {
          td.contentEditable = 'true';
        });
        const formulaInput = ed.querySelector('.excel-formula-input');
        if (formulaInput) formulaInput.disabled = false;
      }
    }

    const enterReadingMode = () => {
      document.body.classList.add('reading-mode');
      $('#readingModeBtn')?.classList.add('active');
      disableEditingInReadMode();
      showToast('Reading Mode: ON (Document editing disabled. Press Esc to exit)', 'info');
    };

    const exitReadingMode = () => {
      document.body.classList.remove('reading-mode', 'ribbon-revealed');
      $('#readingModeBtn')?.classList.remove('active');
      restoreEditingAfterReadMode();
      showToast('Reading Mode: OFF', 'info');
    };

    $('#readingModeBtn')?.addEventListener('click', () => {
      if (document.body.classList.contains('reading-mode')) {
        exitReadingMode();
      } else {
        enterReadingMode();
      }
    });

    $('#exitReadingModeBtn')?.addEventListener('click', exitReadingMode);

    // Floating Action Bar buttons in Read Mode
    $('#readModeUndoBtn')?.addEventListener('click', () => {
      window.DocFlow.Editor?.execCmd?.('undo');
    });
    $('#readModeRedoBtn')?.addEventListener('click', () => {
      window.DocFlow.Editor?.execCmd?.('redo');
    });
    $('#readModeBoldBtn')?.addEventListener('click', () => {
      window.DocFlow.Editor?.execCmd?.('bold');
    });
    $('#readModeItalicBtn')?.addEventListener('click', () => {
      window.DocFlow.Editor?.execCmd?.('italic');
    });
    $('#readModeUnderlineBtn')?.addEventListener('click', () => {
      window.DocFlow.Editor?.execCmd?.('underline');
    });
    $('#readModeSaveBtn')?.addEventListener('click', () => {
      if (window.DocFlow.currentMode === 'view') {
        window.DocFlow.PDF?.downloadCurrentPdf?.();
      } else {
        $('#saveDropdown')?.classList.toggle('show');
      }
    });
    $('#readModeFindBtn')?.addEventListener('click', () => {
      window.DocFlow.Find?.toggleFindBar?.();
    });
    $('#readModeCommentBtn')?.addEventListener('click', () => {
      $('#viewAddCommentBtn')?.click();
    });
    $('#readModeToggleRibbonBtn')?.addEventListener('click', () => {
      const revealed = document.body.classList.toggle('ribbon-revealed');
      showToast(revealed ? 'Ribbon toolbar revealed in Read Mode' : 'Ribbon toolbar hidden', 'info');
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && document.body.classList.contains('reading-mode')) {
        if (document.body.classList.contains('ribbon-revealed')) {
          document.body.classList.remove('ribbon-revealed');
        } else {
          exitReadingMode();
        }
      }
    });

    $('#ribbonFullscreenBtn')?.addEventListener('click', () => window.DocFlow.UI?.toggleFullscreen());

    $('#editorZoomInBtn')?.addEventListener('click', () => setEditorZoom(currentZoom + 10));
    $('#editorZoomOutBtn')?.addEventListener('click', () => setEditorZoom(currentZoom - 10));
    $('#editorZoomResetBtn')?.addEventListener('click', () => setEditorZoom(100));

    // Clear All Recent Documents Button
    $('#clearRecentBtn')?.addEventListener('click', () => {
      Recent.clearAll();
    });

    // 10. Dedicated Excel Ribbon Selection Management (Issue 2 & Issue 5)
    function clearExcelSelections(table) {
      if (!table) table = document.querySelector('.excel-grid-table') || document.querySelector('#editor table');
      if (!table) return;
      table.querySelectorAll('td.excel-cell-selected, td.excel-row-selected, td.excel-col-selected, td.excel-cell-focus').forEach(c => {
        c.classList.remove('excel-cell-selected', 'excel-row-selected', 'excel-col-selected', 'excel-cell-focus', 'excel-sel-top', 'excel-sel-bottom', 'excel-sel-left', 'excel-sel-right');
      });
      table.querySelectorAll('tr.excel-row-selected, th.excel-row-selected, th.excel-col-selected').forEach(el => {
        el.classList.remove('excel-row-selected', 'excel-col-selected');
      });
      window._activeExcelCell = null;
      if (document.activeElement && table.contains(document.activeElement)) {
        try { document.activeElement.blur(); } catch (_) {}
      }
    }

    $('#excelSelectRowBtn')?.addEventListener('click', () => {
      const cell = getActiveTableCell();
      const table = cell ? cell.closest('table') : document.querySelector('#editor table');
      if (!table || !cell) {
        showToast('Click inside a spreadsheet cell first to select its row', 'info');
        return;
      }
      clearExcelSelections(table);
      const tr = cell.closest('tr');
      if (tr) {
        tr.classList.add('excel-row-selected');
        const rowHdr = tr.querySelector('.excel-row-hdr') || tr.querySelector('th');
        if (rowHdr) rowHdr.classList.add('excel-row-selected');
        tr.querySelectorAll('td').forEach(td => {
          td.classList.add('excel-cell-selected', 'excel-row-selected');
        });
        const rowNum = rowHdr?.textContent?.trim() || (tr.rowIndex !== undefined ? tr.rowIndex : '');
        showToast(`Row ${rowNum} selected`, 'info');
      }
      restoreCellFocus(cell);
    });

    $('#excelSelectColBtn')?.addEventListener('click', () => {
      const cell = getActiveTableCell();
      const table = cell ? cell.closest('table') : document.querySelector('#editor table');
      if (!table || !cell) {
        showToast('Click inside a spreadsheet cell first to select its column', 'info');
        return;
      }
      clearExcelSelections(table);
      const colIdx = cell.cellIndex;
      const theadTr = table.querySelector('thead tr');
      const tbody = table.querySelector('tbody') || table;

      let colName = '';
      if (theadTr && theadTr.children[colIdx]) {
        const th = theadTr.children[colIdx];
        th.classList.add('excel-col-selected');
        colName = th.textContent.trim();
      }
      tbody.querySelectorAll('tr').forEach(r => {
        const td = r.children[colIdx];
        if (td && td.tagName === 'TD') {
          td.classList.add('excel-cell-selected', 'excel-col-selected');
        }
      });
      showToast(`Column ${colName || colIdx} selected`, 'info');
      restoreCellFocus(cell);
    });

    $('#excelSelectMultipleBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      const pop = $('#excelSelectMultiplePopover');
      const btn = $('#excelSelectMultipleBtn');
      if (pop && btn) window.DocFlow.UI.positionPopover(btn, pop);
    });

    // In-Container Excel Multiple Selection Modal (Bug 4)
    function openExcelSelectMultipleModal(initialMode = 'rows') {
      const table = document.querySelector('#editor table');
      if (!table) {
        showToast('Open or create a spreadsheet table first', 'info');
        return;
      }
      $('#excelSelectMultiplePopover')?.classList.remove('show');

      const setMode = mode => {
        $('#excelSelModeRowsBtn')?.classList.toggle('active', mode === 'rows');
        $('#excelSelModeColsBtn')?.classList.toggle('active', mode === 'cols');
        $('#excelSelModeBothBtn')?.classList.toggle('active', mode === 'both');

        const rowGroup = $('#excelSelRowGroup');
        const colGroup = $('#excelSelColGroup');
        if (rowGroup) rowGroup.style.display = (mode === 'rows' || mode === 'both') ? 'block' : 'none';
        if (colGroup) colGroup.style.display = (mode === 'cols' || mode === 'both') ? 'block' : 'none';

        if (mode === 'cols') {
          setTimeout(() => $('#excelSelColInput')?.focus(), 50);
        } else {
          setTimeout(() => $('#excelSelRowInput')?.focus(), 50);
        }
      };

      const btnRows = $('#excelSelModeRowsBtn');
      if (btnRows) btnRows.onclick = () => setMode('rows');
      const btnCols = $('#excelSelModeColsBtn');
      if (btnCols) btnCols.onclick = () => setMode('cols');
      const btnBoth = $('#excelSelModeBothBtn');
      if (btnBoth) btnBoth.onclick = () => setMode('both');

      setMode(initialMode);
      window.DocFlow.UI?.openModal?.('#excelSelectMultipleModal');
    }

    $('#excelSelectMultipleRowsOpt')?.addEventListener('click', () => openExcelSelectMultipleModal('rows'));
    $('#excelSelectMultipleColsOpt')?.addEventListener('click', () => openExcelSelectMultipleModal('cols'));
    $('#excelSelectMultipleBothOpt')?.addEventListener('click', () => openExcelSelectMultipleModal('both'));

    $('#excelSelectMultipleCloseBtn')?.addEventListener('click', () => window.DocFlow.UI?.closeModal?.('#excelSelectMultipleModal'));
    $('#excelSelectMultipleCancelBtn')?.addEventListener('click', () => window.DocFlow.UI?.closeModal?.('#excelSelectMultipleModal'));

    $('#excelSelectMultipleApplyBtn')?.addEventListener('click', () => {
      const table = document.querySelector('#editor table');
      if (!table) return;

      const theadTr = table.querySelector('thead tr');
      const tbody = table.querySelector('tbody') || table;

      const isRowsActive = $('#excelSelModeRowsBtn')?.classList.contains('active') || $('#excelSelModeBothBtn')?.classList.contains('active');
      const isColsActive = $('#excelSelModeColsBtn')?.classList.contains('active') || $('#excelSelModeBothBtn')?.classList.contains('active');

      const rowInput = isRowsActive ? ($('#excelSelRowInput')?.value || '').trim() : '';
      const colInput = isColsActive ? ($('#excelSelColInput')?.value || '').trim() : '';

      if (!rowInput && !colInput) {
        showToast('Please enter row numbers or column letters to select', 'warning');
        return;
      }

      clearExcelSelections(table);
      let selectedRowsCount = 0;
      let selectedColsCount = 0;

      const parseCol = token => {
        token = token.trim().toUpperCase();
        if (/^\d+$/.test(token)) return parseInt(token, 10);
        let col = 0;
        for (let i = 0; i < token.length; i++) col = col * 26 + (token.charCodeAt(i) - 64);
        return col;
      };

      // Select Rows
      if (rowInput) {
        const targetRows = new Set();
        const rParts = rowInput.split(',').map(s => s.trim()).filter(Boolean);
        rParts.forEach(p => {
          if (p.includes('-')) {
            const [s, e] = p.split('-').map(n => parseInt(n.trim(), 10));
            if (!isNaN(s) && !isNaN(e)) {
              for (let r = Math.min(s, e); r <= Math.max(s, e); r++) targetRows.add(r);
            }
          } else {
            const num = parseInt(p, 10);
            if (!isNaN(num)) targetRows.add(num);
          }
        });

        const allRows = Array.from(tbody.querySelectorAll('tr'));
        allRows.forEach((tr, rIdx) => {
          const rowHdr = tr.querySelector('.excel-row-hdr') || tr.querySelector('th');
          const rowNum = rowHdr ? parseInt(rowHdr.textContent.trim(), 10) : (rIdx + 1);
          if (targetRows.has(rowNum)) {
            tr.classList.add('excel-row-selected');
            if (rowHdr) rowHdr.classList.add('excel-row-selected');
            tr.querySelectorAll('td').forEach(td => {
              td.classList.add('excel-cell-selected', 'excel-row-selected');
            });
            selectedRowsCount++;
          }
        });
      }

      // Select Columns
      if (colInput && theadTr) {
        const targetCols = new Set();
        const cParts = colInput.split(',').map(s => s.trim()).filter(Boolean);
        cParts.forEach(p => {
          if (p.includes('-')) {
            const [sStr, eStr] = p.split('-');
            const s = parseCol(sStr);
            const e = parseCol(eStr);
            if (s > 0 && e > 0) {
              for (let c = Math.min(s, e); c <= Math.max(s, e); c++) targetCols.add(c);
            }
          } else {
            const col = parseCol(p);
            if (col > 0) targetCols.add(col);
          }
        });

        targetCols.forEach(colIndex => {
          if (theadTr.children[colIndex]) {
            theadTr.children[colIndex].classList.add('excel-col-selected');
            tbody.querySelectorAll('tr').forEach(r => {
              const td = r.children[colIndex];
              if (td && td.tagName === 'TD') {
                td.classList.add('excel-cell-selected', 'excel-col-selected');
              }
            });
            selectedColsCount++;
          }
        });
      }

      window.DocFlow.UI?.closeModal?.('#excelSelectMultipleModal');

      if (selectedRowsCount > 0 && selectedColsCount > 0) {
        showToast(`Selected ${selectedRowsCount} row(s) and ${selectedColsCount} column(s)`, 'success');
      } else if (selectedRowsCount > 0) {
        showToast(`Selected ${selectedRowsCount} row(s)`, 'success');
      } else if (selectedColsCount > 0) {
        showToast(`Selected ${selectedColsCount} column(s)`, 'success');
      } else {
        showToast('No matching rows or columns found in table', 'warning');
      }
    });

    // Deselect Row & Column Handlers (Issue 2 & Issue 5)
    const handleExcelDeselect = () => {
      const table = document.querySelector('.excel-grid-table') || document.querySelector('#editor table');
      if (!table) {
        showToast('No spreadsheet table found', 'info');
        return;
      }
      clearExcelSelections(table);
      showToast('Spreadsheet selections cleared (All rows & columns deselected)', 'info');
    };

    $('#excelDeselectBtn')?.addEventListener('click', handleExcelDeselect);
    $('#excelDeselectOpt')?.addEventListener('click', () => {
      $('#excelSelectMultiplePopover')?.classList.remove('show');
      handleExcelDeselect();
    });

    // Helper: Code & Markdown snippet insertion
    const insertSnippetIntoEditor = (snippet, wrapPrefix = '', wrapSuffix = '') => {
      const ed = $('#editor');
      if (!ed) return;
      window.DocFlow.Editor?.saveSnapshot?.();
      ed.focus();
      const pre = ed.querySelector('pre.md-code-view, pre.html-code-view');
      const targetContainer = pre || ed;

      const sel = window.getSelection();
      if (sel && sel.rangeCount && targetContainer.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        const range = sel.getRangeAt(0);
        const selectedText = range.toString();
        const textToInsert = (wrapPrefix || wrapSuffix)
          ? (wrapPrefix + (selectedText || snippet) + wrapSuffix)
          : snippet;

        range.deleteContents();
        const node = document.createTextNode(textToInsert);
        range.insertNode(node);
        range.setStartAfter(node);
        range.setEndAfter(node);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        const node = document.createTextNode((wrapPrefix || wrapSuffix) ? (wrapPrefix + snippet + wrapSuffix) : snippet);
        targetContainer.appendChild(node);
      }
      window.DocFlow.Editor?.notifyChange?.();
      window.DocFlow.Editor?.saveSnapshot?.();
    };

    // Helper: Markdown Table Aligner & Formatter (Issue 3)
    function formatMarkdownTables(content) {
      if (!content) return '';
      const lines = content.split('\n');
      const result = [];
      let tableLines = [];

      const flushTable = () => {
        if (tableLines.length === 0) return;
        const parsedRows = tableLines.map(line => {
          const rawCells = line.split('|');
          let cells = rawCells.map(c => c.trim());
          if (cells[0] === '') cells.shift();
          if (cells[cells.length - 1] === '') cells.pop();
          return cells;
        });

        const maxCols = Math.max(...parsedRows.map(r => r.length));
        if (maxCols === 0) {
          result.push(...tableLines);
          tableLines = [];
          return;
        }

        parsedRows.forEach(r => {
          while (r.length < maxCols) r.push('');
        });

        const colWidths = Array(maxCols).fill(3);
        parsedRows.forEach((row, rIdx) => {
          row.forEach((cell, cIdx) => {
            colWidths[cIdx] = Math.max(colWidths[cIdx], cell.length);
          });
        });

        parsedRows.forEach((row, rIdx) => {
          const formattedCells = row.map((cell, cIdx) => {
            const width = colWidths[cIdx];
            if (rIdx === 1 && /^:?-+:?$/.test(cell)) {
              const leftAlign = cell.startsWith(':');
              const rightAlign = cell.endsWith(':');
              if (leftAlign && rightAlign) return ':' + '-'.repeat(Math.max(1, width - 2)) + ':';
              if (leftAlign) return ':' + '-'.repeat(Math.max(1, width - 1));
              if (rightAlign) return '-'.repeat(Math.max(1, width - 1)) + ':';
              return '-'.repeat(width);
            }
            return cell.padEnd(width, ' ');
          });
          result.push('| ' + formattedCells.join(' | ') + ' |');
        });

        tableLines = [];
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith('|') || (line.includes('|') && line.trim().endsWith('|'))) {
          tableLines.push(line);
        } else {
          flushTable();
          result.push(line);
        }
      }
      flushTable();
      return result.join('\n');
    }

    // Helper: Markdown TOC Generator (Issue 3)
    function generateMarkdownToc(content) {
      if (!content) return '';
      const lines = content.split('\n');
      const headings = [];
      for (const line of lines) {
        const match = line.match(/^(#{1,6})\s+(.+)$/);
        if (match) {
          const level = match[1].length;
          const text = match[2].trim();
          const slug = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
          headings.push({ level, text, slug });
        }
      }
      if (headings.length === 0) {
        return '## Table of Contents\n\n*(No headings found in document)*\n\n';
      }
      let toc = '## Table of Contents\n\n';
      const minLevel = Math.min(...headings.map(h => h.level));
      for (const h of headings) {
        const indent = '  '.repeat(Math.max(0, h.level - minLevel));
        toc += `${indent}- [${h.text}](#${h.slug})\n`;
      }
      return toc + '\n';
    }

    // 11. Dedicated Markdown (MD) Ribbon Panel Controls (Issue 3)
    $('#mdFormatMenuBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      const pop = $('#mdFormatPopover');
      const btn = $('#mdFormatMenuBtn');
      if (pop && btn) window.DocFlow.UI.positionPopover(btn, pop);
    });

    $$('#mdFormatPopover .spacing-opt-item[data-md-action]').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.dataset.mdAction;
        $('#mdFormatPopover')?.classList.remove('show');
        switch (action) {
          case 'h1': insertSnippetIntoEditor('# Heading 1\n'); break;
          case 'h2': insertSnippetIntoEditor('## Heading 2\n'); break;
          case 'h3': insertSnippetIntoEditor('### Heading 3\n'); break;
          case 'h4': insertSnippetIntoEditor('#### Heading 4\n'); break;
          case 'h5': insertSnippetIntoEditor('##### Heading 5\n'); break;
          case 'h6': insertSnippetIntoEditor('###### Heading 6\n'); break;
          case 'bold': insertSnippetIntoEditor('**Bold Text**'); break;
          case 'italic': insertSnippetIntoEditor('*Italic Text*'); break;
          case 'strike': insertSnippetIntoEditor('~~Strikethrough~~'); break;
          case 'mark': insertSnippetIntoEditor('==Highlight=='); break;
          case 'sub': insertSnippetIntoEditor('~Subscript~'); break;
          case 'sup': insertSnippetIntoEditor('^Superscript^'); break;
          case 'kbd': insertSnippetIntoEditor('<kbd>Ctrl</kbd>'); break;
          case 'codeblock': insertSnippetIntoEditor('\n```javascript\n// code here\n```\n'); break;
          case 'inlinecode': insertSnippetIntoEditor('`code`'); break;
          case 'quote': insertSnippetIntoEditor('> Blockquote\n'); break;
          case 'callout': insertSnippetIntoEditor('> [!NOTE]\n> Important information here\n'); break;
          case 'ul': insertSnippetIntoEditor('- List item\n'); break;
          case 'ol': insertSnippetIntoEditor('1. Numbered item\n'); break;
          case 'task': insertSnippetIntoEditor('- [ ] Task item\n'); break;
          case 'deflist': insertSnippetIntoEditor('\nTerm\n: Definition goes here\n'); break;
          case 'table': insertSnippetIntoEditor('\n| Column 1 | Column 2 | Column 3 |\n| :--- | :--- | :--- |\n| Data 1 | Data 2 | Data 3 |\n\n'); break;
          case 'align-table': {
            const ed = $('#editor');
            if (ed) {
              const pre = ed.querySelector('pre.md-code-view');
              const raw = pre ? pre.textContent : (ed.textContent || '');
              if (raw.trim()) {
                const formatted = formatMarkdownTables(raw);
                if (pre) pre.textContent = formatted;
                else ed.textContent = formatted;
                window.DocFlow.Editor?.notifyChange?.();
                showToast('Markdown tables aligned and formatted', 'success');
              }
            }
            break;
          }
          case 'link': insertSnippetIntoEditor('[Link text](https://example.com)'); break;
          case 'image': insertSnippetIntoEditor('![Alt text](https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600)'); break;
          case 'math': insertSnippetIntoEditor('\n$$\nf(x) = \\int_{-\\infty}^\\infty \\hat{f}(\\xi)\\,e^{2 \\pi i \\xi x}\\,d\\xi\n$$\n'); showToast('LaTeX math block inserted', 'info'); break;
          case 'mermaid': insertSnippetIntoEditor('\n```mermaid\ngraph TD\n    A[Start] --> B{Process}\n    B -->|Success| C[Finish]\n    B -->|Retry| A\n```\n'); showToast('Mermaid diagram inserted', 'info'); break;
          case 'footnote': insertSnippetIntoEditor('[^1]', '', '\n\n[^1]: Footnote description here.\n'); showToast('Footnote reference inserted', 'info'); break;
          case 'footnote-def': insertSnippetIntoEditor('\n[^1]: Detailed footnote explanation and reference source.\n'); showToast('Footnote definition block inserted', 'info'); break;
          case 'badge': insertSnippetIntoEditor('![Status](https://img.shields.io/badge/status-active-brightgreen)\n'); showToast('Status shield badge inserted', 'info'); break;
          case 'details': insertSnippetIntoEditor('\n<details>\n<summary>Click to view details</summary>\n\nDetailed content goes here...\n\n</details>\n'); showToast('Collapsible details inserted', 'info'); break;
          case 'callout-warn': insertSnippetIntoEditor('> [!WARNING]\n> High-priority warning or critical instruction here.\n'); showToast('Warning callout inserted', 'info'); break;
          case 'callout-tip': insertSnippetIntoEditor('> [!TIP]\n> Helpful hint or performance best practice here.\n'); showToast('Tip callout inserted', 'info'); break;
          case 'task-done': insertSnippetIntoEditor('- [x] Completed task item\n'); break;
          case 'hr': insertSnippetIntoEditor('\n---\n'); break;
        }
      });
    });

    // Helper: Clean & Beautify Markdown (Bug 1)
    function cleanMarkdown(raw) {
      if (!raw || typeof raw !== 'string') return '';
      let text = raw.replace(/\r\n/g, '\n');

      // 1. Remove trailing spaces on lines
      let lines = text.split('\n').map(l => l.trimEnd());

      // 2. Normalize headings (ensure clean blank line before and after # headings)
      const formattedLines = [];
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        const isHeading = /^#{1,6}\s+/.test(l.trim());
        if (isHeading && formattedLines.length > 0 && formattedLines[formattedLines.length - 1].trim() !== '') {
          formattedLines.push('');
        }
        formattedLines.push(l);
        if (isHeading && i < lines.length - 1 && lines[i + 1].trim() !== '') {
          formattedLines.push('');
        }
      }

      // 3. Normalize multiple blank lines (max 2 consecutive newlines)
      let cleaned = formattedLines.join('\n').replace(/\n{3,}/g, '\n\n');

      // 4. Align & format markdown tables
      cleaned = formatMarkdownTables(cleaned);

      return cleaned.trim() + '\n';
    }

    // Helper: Robust HTML to Markdown Converter (Bug 1)
    function htmlToMarkdown(input) {
      if (!input) return '';
      let str = input.trim();

      // Check if input is escaped HTML inside pre
      const parser = new DOMParser();
      let doc = parser.parseFromString(str, 'text/html');
      const singlePre = doc.body.querySelector('pre.md-code-view, pre.html-code-view, pre');
      if (singlePre && doc.body.children.length === 1) {
        const inner = singlePre.innerText || singlePre.textContent || '';
        if (/<[a-zA-Z][\s\S]*>/i.test(inner)) {
          doc = parser.parseFromString(inner, 'text/html');
        }
      }

      function walk(node) {
        if (!node) return '';
        if (node.nodeType === Node.TEXT_NODE) return node.nodeValue;
        if (node.nodeType !== Node.ELEMENT_NODE) return '';

        const tag = node.tagName.toLowerCase();
        const children = Array.from(node.childNodes).map(walk).join('');

        switch (tag) {
          case 'h1': return `\n\n# ${children.trim()}\n\n`;
          case 'h2': return `\n\n## ${children.trim()}\n\n`;
          case 'h3': return `\n\n### ${children.trim()}\n\n`;
          case 'h4': return `\n\n#### ${children.trim()}\n\n`;
          case 'h5': return `\n\n##### ${children.trim()}\n\n`;
          case 'h6': return `\n\n###### ${children.trim()}\n\n`;
          case 'p': return `\n\n${children.trim()}\n\n`;
          case 'br': return '  \n';
          case 'hr': return '\n\n---\n\n';
          case 'strong':
          case 'b': return `**${children.trim()}**`;
          case 'em':
          case 'i': return `*${children.trim()}*`;
          case 's':
          case 'del':
          case 'strike': return `~~${children.trim()}~~`;
          case 'mark': return `==${children.trim()}==`;
          case 'sub': return `~${children.trim()}~`;
          case 'sup': return `^${children.trim()}^`;
          case 'kbd': return `<kbd>${children.trim()}</kbd>`;
          case 'code':
            if (node.parentNode && node.parentNode.tagName.toLowerCase() === 'pre') return children;
            return `\`${children.trim()}\``;
          case 'pre': {
            const codeEl = node.querySelector('code');
            const langClass = (codeEl ? codeEl.className : node.className) || '';
            const m = langClass.match(/language-([a-zA-Z0-9_-]+)/);
            const lang = m ? m[1] : '';
            const codeText = codeEl ? (codeEl.innerText || codeEl.textContent) : (node.innerText || node.textContent);
            return `\n\n\`\`\`${lang}\n${codeText.replace(/^\n+|\n+$/g, '')}\n\`\`\`\n\n`;
          }
          case 'blockquote': {
            const lines = children.trim().split('\n');
            return '\n\n' + lines.map(l => `> ${l}`).join('\n') + '\n\n';
          }
          case 'a': {
            const href = node.getAttribute('href') || '#';
            const title = node.getAttribute('title');
            const titlePart = title ? ` "${title}"` : '';
            return `[${children.trim() || href}](${href}${titlePart})`;
          }
          case 'img': {
            const src = node.getAttribute('src') || '';
            const alt = node.getAttribute('alt') || 'image';
            const title = node.getAttribute('title');
            const titlePart = title ? ` "${title}"` : '';
            return `![${alt}](${src}${titlePart})`;
          }
          case 'ul': {
            const items = Array.from(node.children).filter(c => c.tagName.toLowerCase() === 'li');
            const listText = items.map(li => {
              const ch = Array.from(li.childNodes).map(walk).join('').trim();
              return `- ${ch}`;
            }).join('\n');
            return `\n\n${listText}\n\n`;
          }
          case 'ol': {
            const items = Array.from(node.children).filter(c => c.tagName.toLowerCase() === 'li');
            let idx = 1;
            const listText = items.map(li => {
              const ch = Array.from(li.childNodes).map(walk).join('').trim();
              return `${idx++}. ${ch}`;
            }).join('\n');
            return `\n\n${listText}\n\n`;
          }
          case 'table': {
            const rows = Array.from(node.querySelectorAll('tr'));
            if (!rows.length) return '';
            const matrix = rows.map(r => {
              const cells = Array.from(r.querySelectorAll('th, td'));
              return cells.map(c => Array.from(c.childNodes).map(walk).join('').trim().replace(/\|/g, '\\|').replace(/\n+/g, ' '));
            });
            const colCount = Math.max(...matrix.map(r => r.length), 1);
            const headerRow = matrix[0] || [];
            while (headerRow.length < colCount) headerRow.push('');
            let mdTable = '\n\n| ' + headerRow.join(' | ') + ' |\n';
            mdTable += '| ' + Array(colCount).fill('---').join(' | ') + ' |\n';
            for (let i = 1; i < matrix.length; i++) {
              const dataRow = matrix[i];
              while (dataRow.length < colCount) dataRow.push('');
              mdTable += '| ' + dataRow.join(' | ') + ' |\n';
            }
            return mdTable + '\n';
          }
          case 'script':
          case 'style':
          case 'head':
          case 'meta':
          case 'link':
            return '';
          default:
            return children;
        }
      }

      return walk(doc.body).replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    }

    // Unique Markdown Productivity Tools (No Duplicates Anywhere)
    $('#mdStatsBtn')?.addEventListener('click', () => {
      const content = getCodeEditorContent('md');
      const words = (content.match(/\b\w+\b/g) || []).length;
      const chars = content.length;
      const lines = content.split('\n').length;
      const headings = (content.match(/^#{1,6}\s+/gm) || []).length;
      const readMin = Math.max(1, Math.ceil(words / 200));
      showToast(`Stats: ${words} words, ${chars} chars, ${lines} lines, ${headings} headings (~${readMin} min read)`, 'info');
    });

    $('#mdBeautifyBtn')?.addEventListener('click', () => {
      const ed = $('#editor');
      if (!ed) return;
      const pre = ed.querySelector('pre.md-code-view');
      let raw = pre ? (pre.innerText || pre.textContent) : (ed.innerText || ed.textContent || '');
      if (raw.trim()) {
        window.DocFlow.Editor?.saveSnapshot?.();
        const cleaned = cleanMarkdown(raw);
        if (pre) pre.textContent = cleaned;
        else ed.textContent = cleaned;
        window.DocFlow.Editor?.notifyChange?.();
        window.DocFlow.Editor?.saveSnapshot?.();
        showToast('Markdown cleaned, formatted and normalized', 'success');
      } else {
        showToast('No Markdown content to clean', 'info');
      }
    });

    // Unique Tool: Extract all links & references from Markdown
    $('#mdExtractLinksBtn')?.addEventListener('click', async () => {
      const content = getCodeEditorContent('md');
      if (!content.trim()) {
        showToast('No Markdown content to extract links from', 'info');
        return;
      }
      const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+|[^\s\)]+)\)/g;
      const imgRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s\)]+|[^\s\)]+)\)/g;
      const links = [];
      let m;
      while ((m = linkRegex.exec(content)) !== null) {
        links.push({ type: 'Link', text: m[1], url: m[2] });
      }
      while ((m = imgRegex.exec(content)) !== null) {
        links.push({ type: 'Image', text: m[1] || '(no alt)', url: m[2] });
      }

      if (links.length === 0) {
        showToast('No Markdown links or images found in document', 'info');
        return;
      }

      const summary = links.map((l, i) => `${i + 1}. [${l.type}] ${l.text} -> ${l.url}`).join('\n');
      try {
        await navigator.clipboard.writeText(summary);
        showToast(`Extracted ${links.length} link(s) to clipboard!`, 'success');
      } catch (_) {
        showToast(`Found ${links.length} link(s) in document`, 'info');
      }
    });

    // Unique Tool: Strip Markdown syntax to Clean Plain Text
    $('#mdStripToTextBtn')?.addEventListener('click', () => {
      const content = getCodeEditorContent('md');
      if (!content.trim()) {
        showToast('No Markdown content to strip', 'info');
        return;
      }
      window.DocFlow.Editor?.saveSnapshot?.();
      let plain = content
        .replace(/```[\s\S]*?```/g, '')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/~~([^~]+)~~/g, '$1')
        .replace(/==([^=]+)==/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/^\s*[-*+]\s+/gm, '')
        .replace(/^\s*\d+\.\s+/gm, '')
        .replace(/^\s*>\s+/gm, '')
        .replace(/\|/g, ' ')
        .replace(/[-]{3,}/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      const ed = $('#editor');
      const pre = ed?.querySelector('pre.md-code-view');
      if (pre) pre.textContent = plain;
      else if (ed) ed.textContent = plain;

      window.DocFlow.Editor?.notifyChange?.();
      window.DocFlow.Editor?.saveSnapshot?.();
      showToast('Markdown stripped to clean plain text', 'success');
    });

    // Unique Tool: Markdown Cheat Sheet Reference Modal
    $('#mdCheatSheetBtn')?.addEventListener('click', () => {
      const tbody = $('#mdCheatSheetTableBody');
      if (tbody && !tbody.children.length) {
        const cheats = [
          { el: 'Heading 1', syn: '# Heading 1', snip: '# Heading 1\n' },
          { el: 'Heading 2', syn: '## Heading 2', snip: '## Heading 2\n' },
          { el: 'Bold Text', syn: '**bold**', snip: '**Bold**' },
          { el: 'Italic Text', syn: '*italic*', snip: '*Italic*' },
          { el: 'Strikethrough', syn: '~~strikethrough~~', snip: '~~Strikethrough~~' },
          { el: 'Inline Code', syn: '`code`', snip: '`code`' },
          { el: 'Code Block', syn: '```javascript ... ```', snip: '```javascript\nconsole.log("Hello");\n```\n' },
          { el: 'Mermaid Graph', syn: '```mermaid graph TD ... ```', snip: '```mermaid\ngraph TD\nA[Start] --> B{Decision}\nB -->|Yes| C[Finish]\nB -->|No| D[Alternate]\n```\n' },
          { el: 'Blockquote', syn: '> Quote text', snip: '> Quote text\n' },
          { el: 'Task Todo', syn: '- [ ] Task item', snip: '- [ ] Task item\n' },
          { el: 'Task Done', syn: '- [x] Completed task', snip: '- [x] Completed task\n' },
          { el: 'Table', syn: '| Col 1 | Col 2 |\n| --- | --- |', snip: '| Col 1 | Col 2 |\n| :--- | :--- |\n| Val 1 | Val 2 |\n' },
          { el: 'Link', syn: '[Text](https://url.com)', snip: '[Text](https://url.com)' },
          { el: 'Image', syn: '![Alt](https://image.url)', snip: '![Alt](https://image.url)' },
          { el: 'Math LaTeX', syn: '$$ f(x) = \\int ... $$', snip: '$$\nf(x) = \\int_{-\\infty}^\\infty \\hat{f}(\\xi)\\,e^{2 \\pi i \\xi x}\\,d\\xi\n$$\n' }
        ];
        tbody.innerHTML = cheats.map(c => `
          <tr style="border-bottom:1px solid var(--border);">
            <td style="padding:7px 8px;font-weight:600;color:var(--text-primary);">${c.el}</td>
            <td style="padding:7px 8px;font-family:var(--font-mono, monospace);font-size:11.5px;color:var(--accent);">${escHtml(c.syn)}</td>
            <td style="padding:7px 8px;">
              <button type="button" class="fmt-btn" style="padding:3px 8px;font-size:11px;" onclick="window.DocFlow?.insertSnippetIntoEditor?.(${JSON.stringify(c.snip)}); window.DocFlow?.UI?.closeModal?.('#mdCheatSheetModal'); window.DocFlow?.UI?.showToast?.('Inserted ${c.el} snippet', 'info');">Insert</button>
            </td>
          </tr>
        `).join('');
      }
      window.DocFlow.UI?.openModal?.('#mdCheatSheetModal');
    });

    $('#mdCheatSheetCloseBtn')?.addEventListener('click', () => window.DocFlow.UI?.closeModal?.('#mdCheatSheetModal'));
    $('#mdCheatSheetDoneBtn')?.addEventListener('click', () => window.DocFlow.UI?.closeModal?.('#mdCheatSheetModal'));

    function lintMarkdown(content) {
      const issues = [];
      const lines = content.split('\n');
      let inFence = false;
      let fenceLine = 0;
      lines.forEach((l, idx) => {
        if (/^```/.test(l.trim())) {
          if (!inFence) { inFence = true; fenceLine = idx + 1; }
          else { inFence = false; }
        }
        if (/\[([^\]]+)\]\(\s*\)/.test(l)) {
          issues.push(`Empty link target at line ${idx + 1}`);
        }
        if (/!\[([^\]]*)\]\(\s*\)/.test(l)) {
          issues.push(`Empty image source at line ${idx + 1}`);
        }
      });
      if (inFence) issues.push('Unclosed code fence (```) starting at line ' + fenceLine);
      let prevLevel = 0;
      lines.forEach((l, idx) => {
        const m = l.match(/^(#{1,6})\s+/);
        if (m) {
          const level = m[1].length;
          if (prevLevel > 0 && level > prevLevel + 1) {
            issues.push(`Heading jump (H${prevLevel} to H${level}) at line ${idx + 1}`);
          }
          prevLevel = level;
        }
      });
      return issues;
    }

    $('#mdLintBtn')?.addEventListener('click', () => {
      const content = getCodeEditorContent('md');
      if (!content.trim()) {
        showToast('No Markdown content to lint', 'warning');
        return;
      }
      const issues = lintMarkdown(content);
      if (issues.length === 0) {
        showToast('MD Lint passed! Clean structure, balanced headings, valid links.', 'success');
      } else {
        showToast(`MD Lint found ${issues.length} issue(s): ${issues.slice(0, 2).join('; ')}`, 'warning');
      }
    });

    $('#mdTocGenBtn')?.addEventListener('click', () => {
      const content = getCodeEditorContent('md');
      if (!content.trim()) {
        showToast('No Markdown content to generate TOC from', 'info');
        return;
      }
      const toc = generateMarkdownToc(content);
      if (!toc || toc.includes('_No headings found')) {
        showToast('No headings (# H1, ## H2) found for Table of Contents', 'warning');
        return;
      }
      insertSnippetIntoEditor(toc);
      showToast('Hierarchical Table of Contents inserted at cursor', 'success');
    });

    $('#mdCopyHtmlBtn')?.addEventListener('click', async () => {
      const content = getCodeEditorContent('md');
      if (!content.trim()) {
        showToast('No Markdown content to compile', 'warning');
        return;
      }
      let html = '';
      if (window.marked && typeof window.marked.parse === 'function') {
        html = window.marked.parse(content, { gfm: true, breaks: true });
      } else {
        html = renderBasicMarkdown(content);
      }
      try {
        await navigator.clipboard.writeText(html);
        showToast('Compiled HTML copied to clipboard!', 'success');
      } catch (_) {
        const ta = document.createElement('textarea');
        ta.value = html;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        showToast('Compiled HTML copied to clipboard!', 'success');
      }
    });

    $('#mdHtmlToMdBtn')?.addEventListener('click', () => {
      const ed = $('#editor');
      if (!ed) return;
      const pre = ed.querySelector('pre.md-code-view');
      let raw = pre ? (pre.innerText || pre.textContent) : (ed.innerText || ed.textContent || ed.innerHTML || '');
      if (!raw || !raw.trim()) {
        showToast('No HTML markup in editor to convert', 'info');
        return;
      }
      window.DocFlow.Editor?.saveSnapshot?.();
      const convertedMd = htmlToMarkdown(raw);
      if (pre) pre.textContent = convertedMd;
      else ed.textContent = convertedMd;
      window.DocFlow.Editor?.notifyChange?.();
      window.DocFlow.Editor?.saveSnapshot?.();
      showToast('HTML converted to clean Markdown syntax', 'success');
    });

    $('#mdPreviewBtn')?.addEventListener('click', () => openCodePreviewModal('md'));

    // 12. Helper: HTML Beautifier & Formatter (Issue 4: Preserves script/style blocks)
    function beautifyHtml(html) {
      if (!html || typeof html !== 'string') return '';
      // 1. Preserve <script>, <style>, and <pre> blocks so internal operators (<, >, <=, etc.) are never corrupted
      const preserved = [];
      const placeholderPrefix = '___DF_PRESERVED_';
      let processed = html.replace(/<(script|style|pre)\b[^>]*>([\s\S]*?)<\/\1>/gi, match => {
        const key = `${placeholderPrefix}${preserved.length}___`;
        preserved.push(match);
        return key;
      });

      const voidTags = new Set([
        'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
        'link', 'meta', 'param', 'source', 'track', 'wbr', '!doctype'
      ]);

      let formatted = '';
      let indent = 0;
      const tab = '  ';
      const tokens = processed.replace(/>\s*</g, '><').match(/(<[^>]+>|[^<]+)/g) || [];

      for (let i = 0; i < tokens.length; i++) {
        let token = tokens[i].trim();
        if (!token) continue;

        if (token.startsWith('<!--')) {
          formatted += tab.repeat(indent) + token + '\n';
          continue;
        }

        if (token.startsWith('</')) {
          indent = Math.max(0, indent - 1);
          formatted += tab.repeat(indent) + token + '\n';
          continue;
        }

        if (token.startsWith('<')) {
          const tagMatch = token.match(/^<([a-zA-Z0-9\-!]+)/);
          const tagName = tagMatch ? tagMatch[1].toLowerCase() : '';
          const isSelfClosing = token.endsWith('/>') || voidTags.has(tagName) || token.startsWith('<!');

          const nextToken = (i + 1 < tokens.length) ? tokens[i + 1].trim() : '';
          const afterNextToken = (i + 2 < tokens.length) ? tokens[i + 2].trim() : '';

          if (!isSelfClosing && !nextToken.startsWith('<') && afterNextToken.toLowerCase() === `</${tagName}>`) {
            formatted += tab.repeat(indent) + token + nextToken + afterNextToken + '\n';
            i += 2;
            continue;
          }

          formatted += tab.repeat(indent) + token + '\n';
          if (!isSelfClosing) indent++;
        } else {
          formatted += tab.repeat(indent) + token + '\n';
        }
      }

      let result = formatted.trim();
      // Restore preserved blocks
      preserved.forEach((block, idx) => {
        result = result.replace(`${placeholderPrefix}${idx}___`, block);
      });
      return result;
    }

    // Helper: HTML Minifier (Issue 4: Preserves script/style blocks)
    function minifyHtml(html) {
      if (!html) return '';
      const preserved = [];
      const placeholderPrefix = '___DF_PRESERVED_';
      let processed = html.replace(/<(script|style|pre)\b[^>]*>([\s\S]*?)<\/\1>/gi, match => {
        const key = `${placeholderPrefix}${preserved.length}___`;
        preserved.push(match);
        return key;
      });

      let minified = processed
        .replace(/<!--(?!\[if)[\s\S]*?-->/g, '')
        .replace(/\s+/g, ' ')
        .replace(/>\s+</g, '><')
        .trim();

      preserved.forEach((block, idx) => {
        minified = minified.replace(`${placeholderPrefix}${idx}___`, block);
      });
      return minified;
    }

    // 13. Dedicated HTML Ribbon Panel Controls (Issue 4)
    $('#htmlFormatMenuBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      const pop = $('#htmlFormatPopover');
      const btn = $('#htmlFormatMenuBtn');
      if (pop && btn) window.DocFlow.UI.positionPopover(btn, pop);
    });

    $$('#htmlFormatPopover .spacing-opt-item[data-html-action]').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.dataset.htmlAction;
        $('#htmlFormatPopover')?.classList.remove('show');
        switch (action) {
          case 'boilerplate':
            insertSnippetIntoEditor(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; line-height: 1.6; color: #1e293b; background: #ffffff; }
    h1 { color: #0284c7; margin-bottom: 12px; }
    button { background: #0284c7; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; }
    button:hover { background: #0369a1; }
  </style>
</head>
<body>
  <h1>Hello, World!</h1>
  <p>Single-file HTML, CSS, and JS ready for live preview.</p>
  <button onclick="alert('JavaScript is running!')">Click Me</button>
  <script>
    console.log('Document loaded successfully');
  </script>
</body>
</html>\n`);
            showToast('HTML5 Boilerplate template inserted', 'success');
            break;
          case 'meta-tags':
            insertSnippetIntoEditor(`  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <meta name="description" content="Web page description">\n  <meta name="keywords" content="html, css, javascript">\n  <meta property="og:title" content="Page Title">\n`);
            showToast('SEO & Social meta tags inserted', 'info');
            break;
          case 'css-layout':
            insertSnippetIntoEditor(`  <style>
    .layout-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; margin: 20px 0; }
    .layout-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
  </style>
  <div class="layout-grid">
    <div class="layout-card"><h3>Card 1</h3><p>Content goes here...</p></div>
    <div class="layout-card"><h3>Card 2</h3><p>Content goes here...</p></div>
  </div>\n`);
            showToast('Flex/Grid responsive layout inserted', 'info');
            break;
          case 'media-embed':
            insertSnippetIntoEditor(`  <div class="responsive-media" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px;margin:16px 0;">\n    <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe>\n  </div>\n`);
            showToast('Responsive media embed container inserted', 'info');
            break;
          case 'h1': insertSnippetIntoEditor('<h1>Main Heading</h1>\n'); break;
          case 'h2': insertSnippetIntoEditor('<h2>Sub Heading</h2>\n'); break;
          case 'h3': insertSnippetIntoEditor('<h3>Section Heading</h3>\n'); break;
          case 'h4': insertSnippetIntoEditor('<h4>Sub-section Heading</h4>\n'); break;
          case 'p': insertSnippetIntoEditor('<p>Paragraph text goes here...</p>\n'); break;
          case 'span': insertSnippetIntoEditor('<span>Inline text</span>'); break;
          case 'strong': insertSnippetIntoEditor('<strong>Bold text</strong>'); break;
          case 'em': insertSnippetIntoEditor('<em>Emphasis text</em>'); break;
          case 'mark': insertSnippetIntoEditor('<mark>Highlighted text</mark>'); break;
          case 'blockquote': insertSnippetIntoEditor('<blockquote>\n  <p>Quote text goes here...</p>\n</blockquote>\n'); break;
          case 'div': insertSnippetIntoEditor('<div class="container">\n  \n</div>\n'); break;
          case 'section': insertSnippetIntoEditor('<section>\n  <h2>Section Title</h2>\n  <p>Content goes here...</p>\n</section>\n'); break;
          case 'article': insertSnippetIntoEditor('<article>\n  <h2>Article Title</h2>\n  <p>Article content goes here...</p>\n</article>\n'); break;
          case 'header': insertSnippetIntoEditor('<header>\n  <h1>Website Header</h1>\n</header>\n'); break;
          case 'footer': insertSnippetIntoEditor('<footer>\n  <p>&copy; 2026 All Rights Reserved</p>\n</footer>\n'); break;
          case 'nav': insertSnippetIntoEditor('<nav>\n  <ul>\n    <li><a href="#home">Home</a></li>\n    <li><a href="#about">About</a></li>\n  </ul>\n</nav>\n'); break;
          case 'main': insertSnippetIntoEditor('<main>\n  <h1>Main Content Area</h1>\n  <p>Primary page content...</p>\n</main>\n'); break;
          case 'code': insertSnippetIntoEditor('<pre><code>// Code snippet goes here</code></pre>\n'); break;
          case 'input': insertSnippetIntoEditor('<input type="text" placeholder="Enter text..." />\n'); break;
          case 'button': insertSnippetIntoEditor('<button type="button">Click Me</button>\n'); break;
          case 'form': insertSnippetIntoEditor('<form action="#" method="post">\n  <label>Name: <input type="text" name="name" /></label>\n  <button type="submit">Submit</button>\n</form>\n'); break;
          case 'textarea': insertSnippetIntoEditor('<textarea rows="4" cols="50" placeholder="Enter multi-line text..."></textarea>\n'); break;
          case 'select': insertSnippetIntoEditor('<select name="choice">\n  <option value="1">Option 1</option>\n  <option value="2">Option 2</option>\n</select>\n'); break;
          case 'label': insertSnippetIntoEditor('<label for="field">Label: </label>\n'); break;
          case 'table': insertSnippetIntoEditor('<table>\n  <thead>\n    <tr><th>Header 1</th><th>Header 2</th></tr>\n  </thead>\n  <tbody>\n    <tr><td>Cell 1</td><td>Cell 2</td></tr>\n  </tbody>\n</table>\n'); break;
          case 'link': insertSnippetIntoEditor('<a href="https://example.com" target="_blank">Link Text</a>'); break;
          case 'image': insertSnippetIntoEditor('<img src="https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=500" alt="Sample Image" />\n'); break;
          case 'video': insertSnippetIntoEditor('<video controls width="100%">\n  <source src="movie.mp4" type="video/mp4">\n  Your browser does not support the video tag.\n</video>\n'); break;
          case 'audio': insertSnippetIntoEditor('<audio controls>\n  <source src="audio.mp3" type="audio/mpeg">\n  Your browser does not support the audio element.\n</audio>\n'); break;
          case 'ul': insertSnippetIntoEditor('<ul>\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ul>\n'); break;
          case 'ol': insertSnippetIntoEditor('<ol>\n  <li>First step</li>\n  <li>Second step</li>\n</ol>\n'); break;
          case 'h5': insertSnippetIntoEditor('<h5>Minor Heading</h5>\n'); break;
          case 'h6': insertSnippetIntoEditor('<h6>Sub-minor Heading</h6>\n'); break;
          case 'kbd': insertSnippetIntoEditor('<kbd>Ctrl</kbd>'); break;
          case 'time': insertSnippetIntoEditor('<time datetime="2026-10-14">October 14, 2026</time>'); break;
          case 'details': insertSnippetIntoEditor('<details>\n  <summary>Click to view details</summary>\n  <p>Expanded details content goes here...</p>\n</details>\n'); break;
          case 'dialog': insertSnippetIntoEditor('<dialog id="sampleDialog">\n  <h2>Dialog Title</h2>\n  <p>Native modal dialog content.</p>\n  <button onclick="this.closest(\'dialog\').close()">Close</button>\n</dialog>\n'); break;
          case 'figure': insertSnippetIntoEditor('<figure>\n  <img src="https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=500" alt="Illustration" />\n  <figcaption>Caption describing the figure.</figcaption>\n</figure>\n'); break;
          case 'hr': insertSnippetIntoEditor('<hr />\n'); break;
          case 'progress': insertSnippetIntoEditor('<progress value="70" max="100">70%</progress>\n'); break;
          case 'datalist': insertSnippetIntoEditor('<input list="fruitOptions" placeholder="Choose a fruit..." />\n<datalist id="fruitOptions">\n  <option value="Apple">\n  <option value="Banana">\n  <option value="Cherry">\n</datalist>\n'); break;
        }
      });
    });

    // Unique HTML Productivity Tools (No Duplicates Anywhere)
    $('#htmlFormatBtn')?.addEventListener('click', () => {
      const ed = $('#editor');
      if (!ed) return;
      const pre = ed.querySelector('pre.html-code-view');
      const raw = pre ? pre.textContent : (ed.innerText || ed.textContent || '');
      if (raw.trim()) {
        window.DocFlow.Editor?.saveSnapshot?.();
        const formatted = beautifyHtml(raw);
        if (pre) pre.textContent = formatted;
        else ed.textContent = formatted;
        window.DocFlow.Editor?.notifyChange?.();
        window.DocFlow.Editor?.saveSnapshot?.();
        showToast('HTML formatted with clean tag indentation', 'success');
      }
    });

    $('#htmlMinifyBtn')?.addEventListener('click', () => {
      const ed = $('#editor');
      if (!ed) return;
      const pre = ed.querySelector('pre.html-code-view');
      const raw = pre ? pre.textContent : (ed.innerText || ed.textContent || '');
      if (raw.trim()) {
        window.DocFlow.Editor?.saveSnapshot?.();
        const minified = minifyHtml(raw);
        if (pre) pre.textContent = minified;
        else ed.textContent = minified;
        window.DocFlow.Editor?.notifyChange?.();
        window.DocFlow.Editor?.saveSnapshot?.();
        showToast('HTML code minified safely', 'success');
      }
    });

    $('#htmlInspectorBtn')?.addEventListener('click', () => {
      const content = getCodeEditorContent('html');
      if (!content.trim()) {
        showToast('No HTML code to inspect', 'warning');
        return;
      }
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');
      const allElements = doc.querySelectorAll('*');
      const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
      const links = doc.querySelectorAll('a').length;
      const images = doc.querySelectorAll('img').length;
      const forms = doc.querySelectorAll('form').length;
      const scripts = doc.querySelectorAll('script').length;
      const styles = doc.querySelectorAll('style, link[rel="stylesheet"]').length;

      let maxDepth = 0;
      function calcDepth(el, depth) {
        if (depth > maxDepth) maxDepth = depth;
        if (el.children) {
          Array.from(el.children).forEach(c => calcDepth(c, depth + 1));
        }
      }
      calcDepth(doc.body || doc.documentElement, 1);

      showToast(`DOM: ${allElements.length} tags (depth ${maxDepth}), ${headings} headings, ${links} links, ${images} images, ${forms} forms, ${scripts} scripts, ${styles} styles`, 'info');
    });

    $('#htmlValidateBtn')?.addEventListener('click', () => {
      const content = getCodeEditorContent('html');
      if (!content.trim()) {
        showToast('No HTML code to validate', 'warning');
        return;
      }
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');
      const parserErrors = doc.querySelectorAll('parsererror');
      if (parserErrors.length > 0) {
        showToast(`HTML syntax error: ${parserErrors[0].textContent.trim().substring(0, 80)}`, 'error');
      } else {
        const tagCount = (content.match(/<[a-zA-Z0-9\-]+/g) || []).length;
        showToast(`HTML syntax valid! Clean structure with ${tagCount} tags detected.`, 'success');
      }
    });

    // In-Container HTML Entities & Special Characters Modal (Bug 4)
    const HTML_ENTITIES_DATA = [
      { name: 'Copyright', code: '&copy;', char: '©', cat: 'symbols' },
      { name: 'Registered', code: '&reg;', char: '®', cat: 'symbols' },
      { name: 'Trademark', code: '&trade;', char: '™', cat: 'symbols' },
      { name: 'Section', code: '&sect;', char: '§', cat: 'symbols' },
      { name: 'Paragraph', code: '&para;', char: '¶', cat: 'symbols' },
      { name: 'Dagger', code: '&dagger;', char: '†', cat: 'symbols' },
      { name: 'Double Dagger', code: '&Dagger;', char: '‡', cat: 'symbols' },
      { name: 'Per Mille', code: '&permil;', char: '‰', cat: 'symbols' },
      { name: 'Spade Suit', code: '&spades;', char: '♠', cat: 'symbols' },
      { name: 'Club Suit', code: '&clubs;', char: '♣', cat: 'symbols' },
      { name: 'Heart Suit', code: '&hearts;', char: '♥', cat: 'symbols' },
      { name: 'Diamond Suit', code: '&diams;', char: '♦', cat: 'symbols' },
      { name: 'Checkmark', code: '&#10003;', char: '✓', cat: 'symbols' },
      { name: 'Cross Mark', code: '&#10007;', char: '✗', cat: 'symbols' },

      { name: 'Euro Sign', code: '&euro;', char: '€', cat: 'currency' },
      { name: 'Pound Sterling', code: '&pound;', char: '£', cat: 'currency' },
      { name: 'Yen Sign', code: '&yen;', char: '¥', cat: 'currency' },
      { name: 'Cent Sign', code: '&cent;', char: '¢', cat: 'currency' },
      { name: 'Indian Rupee', code: '&#8377;', char: '₹', cat: 'currency' },
      { name: 'Currency Sign', code: '&curren;', char: '¤', cat: 'currency' },
      { name: 'Florin', code: '&fnof;', char: 'ƒ', cat: 'currency' },

      { name: 'Left Arrow', code: '&larr;', char: '←', cat: 'arrows' },
      { name: 'Right Arrow', code: '&rarr;', char: '→', cat: 'arrows' },
      { name: 'Up Arrow', code: '&uarr;', char: '↑', cat: 'arrows' },
      { name: 'Down Arrow', code: '&darr;', char: '↓', cat: 'arrows' },
      { name: 'Left-Right Arrow', code: '&harr;', char: '↔', cat: 'arrows' },
      { name: 'Return Arrow', code: '&crarr;', char: '↵', cat: 'arrows' },
      { name: 'Double Left Arrow', code: '&lArr;', char: '⇐', cat: 'arrows' },
      { name: 'Double Right Arrow', code: '&rArr;', char: '⇒', cat: 'arrows' },
      { name: 'Double Up Arrow', code: '&uArr;', char: '⇑', cat: 'arrows' },
      { name: 'Double Down Arrow', code: '&dArr;', char: '⇓', cat: 'arrows' },
      { name: 'Double Left-Right', code: '&hArr;', char: '⇔', cat: 'arrows' },

      { name: 'Plus-Minus', code: '&plusmn;', char: '±', cat: 'math' },
      { name: 'Multiplication', code: '&times;', char: '×', cat: 'math' },
      { name: 'Division', code: '&divide;', char: '÷', cat: 'math' },
      { name: 'Less-than or Equal', code: '&le;', char: '≤', cat: 'math' },
      { name: 'Greater-than or Equal', code: '&ge;', char: '≥', cat: 'math' },
      { name: 'Not Equal', code: '&ne;', char: '≠', cat: 'math' },
      { name: 'Identical To', code: '&equiv;', char: '≡', cat: 'math' },
      { name: 'Almost Equal To', code: '&asymp;', char: '≈', cat: 'math' },
      { name: 'Square Root', code: '&radic;', char: '√', cat: 'math' },
      { name: 'Infinity', code: '&infin;', char: '∞', cat: 'math' },
      { name: 'Summation', code: '&sum;', char: '∑', cat: 'math' },
      { name: 'Product', code: '&prod;', char: '∏', cat: 'math' },
      { name: 'Integral', code: '&int;', char: '∫', cat: 'math' },
      { name: 'Degree', code: '&deg;', char: '°', cat: 'math' },

      { name: 'Em Dash', code: '&mdash;', char: '—', cat: 'punctuation' },
      { name: 'En Dash', code: '&ndash;', char: '–', cat: 'punctuation' },
      { name: 'Bullet Point', code: '&bull;', char: '•', cat: 'punctuation' },
      { name: 'Horizontal Ellipsis', code: '&hellip;', char: '…', cat: 'punctuation' },
      { name: 'Left Single Quote', code: '&lsquo;', char: '‘', cat: 'punctuation' },
      { name: 'Right Single Quote', code: '&rsquo;', char: '’', cat: 'punctuation' },
      { name: 'Left Double Quote', code: '&ldquo;', char: '“', cat: 'punctuation' },
      { name: 'Right Double Quote', code: '&rdquo;', char: '”', cat: 'punctuation' },
      { name: 'Left Guils', code: '&laquo;', char: '«', cat: 'punctuation' },
      { name: 'Right Guils', code: '&raquo;', char: '»', cat: 'punctuation' },

      { name: 'Alpha', code: '&alpha;', char: 'α', cat: 'greek' },
      { name: 'Beta', code: '&beta;', char: 'β', cat: 'greek' },
      { name: 'Gamma', code: '&gamma;', char: 'γ', cat: 'greek' },
      { name: 'Delta', code: '&delta;', char: 'δ', cat: 'greek' },
      { name: 'Theta', code: '&theta;', char: 'θ', cat: 'greek' },
      { name: 'Lambda', code: '&lambda;', char: 'λ', cat: 'greek' },
      { name: 'Pi', code: '&pi;', char: 'π', cat: 'greek' },
      { name: 'Omega', code: '&omega;', char: 'ω', cat: 'greek' },
      { name: 'Delta Capital', code: '&Delta;', char: 'Δ', cat: 'greek' },
      { name: 'Omega Capital', code: '&Omega;', char: 'Ω', cat: 'greek' }
    ];

    let activeEntityCategory = 'all';

    function renderHtmlEntitiesGrid(filterText = '', category = 'all') {
      const container = $('#htmlEntitiesGridContainer');
      if (!container) return;

      const q = filterText.toLowerCase().trim();
      const filtered = HTML_ENTITIES_DATA.filter(e => {
        const matchesCat = category === 'all' || e.cat === category;
        const matchesQuery = !q || e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q) || e.char.includes(q);
        return matchesCat && matchesQuery;
      });

      if (filtered.length === 0) {
        container.innerHTML = '<div style="grid-column:1/-1;padding:32px;text-align:center;color:var(--text-muted);font-size:12.5px;">No entities matching search filter</div>';
        return;
      }

      container.innerHTML = filtered.map(e => `
        <div class="html-entity-card" data-code="${escHtml(e.code)}" data-char="${escHtml(e.char)}" title="${escHtml(e.name)} (${escHtml(e.code)})">
          <div class="html-entity-char">${escHtml(e.char)}</div>
          <div class="html-entity-code">${escHtml(e.code)}</div>
          <div class="html-entity-name">${escHtml(e.name)}</div>
        </div>
      `).join('');

      container.querySelectorAll('.html-entity-card').forEach(card => {
        card.onclick = () => {
          const code = card.dataset.code;
          const char = card.dataset.char;
          insertSnippetIntoEditor(code);
          window.DocFlow.UI?.closeModal?.('#htmlEntitiesModal');
          showToast(`Inserted entity ${code} (${char})`, 'info');
        };
      });
    }

    $('#htmlEntitiesBtn')?.addEventListener('click', () => {
      const searchInput = $('#htmlEntitySearchInput');
      if (searchInput) searchInput.value = '';
      activeEntityCategory = 'all';
      $$('#htmlEntityCategoryPills button').forEach(b => b.classList.toggle('active', b.dataset.cat === 'all'));
      renderHtmlEntitiesGrid('', 'all');
      window.DocFlow.UI?.openModal?.('#htmlEntitiesModal');
      setTimeout(() => $('#htmlEntitySearchInput')?.focus(), 50);
    });

    $('#htmlEntitySearchInput')?.addEventListener('input', e => {
      renderHtmlEntitiesGrid(e.target.value, activeEntityCategory);
    });

    $$('#htmlEntityCategoryPills button').forEach(pill => {
      pill.addEventListener('click', () => {
        $$('#htmlEntityCategoryPills button').forEach(b => b.classList.remove('active'));
        pill.classList.add('active');
        activeEntityCategory = pill.dataset.cat;
        renderHtmlEntitiesGrid($('#htmlEntitySearchInput')?.value || '', activeEntityCategory);
      });
    });

    $('#htmlEntitiesCloseBtn')?.addEventListener('click', () => window.DocFlow.UI?.closeModal?.('#htmlEntitiesModal'));
    $('#htmlEntitiesCancelBtn')?.addEventListener('click', () => window.DocFlow.UI?.closeModal?.('#htmlEntitiesModal'));

    // Problem 3: Robust HTML, CSS, and JS Comment / Uncomment Toggle
    $('#htmlCommentBtn')?.addEventListener('mousedown', e => {
      e.preventDefault(); // Retain editor focus & cursor/selection position
    });

    $('#htmlCommentBtn')?.addEventListener('click', () => {
      const ed = $('#editor');
      if (!ed) return;

      const activeTab = window.DocFlow?.getActiveTab?.() || window.DocFlow?.Tabs?.getActive?.();
      const isHtmlDoc = (activeTab?.fileType || '').toUpperCase() === 'HTML' ||
                        (activeTab?.name || '').toLowerCase().endsWith('.html') ||
                        (activeTab?.name || '').toLowerCase().endsWith('.htm') ||
                        !!ed.querySelector('pre.html-code-view') ||
                        document.querySelector('.ribbon-tab-btn[data-tab="html"]')?.classList.contains('active');

      if (!isHtmlDoc) {
        showToast('Comment is only available in HTML documents', 'warning');
        return;
      }

      window.DocFlow.Editor?.saveSnapshot?.();

      const pre = ed.querySelector('pre.html-code-view');

      // Mode A: WYSIWYG Formatted HTML Mode (NO pre.html-code-view)
      // Preserves 100% of document formatting without breaking DOM structures, tables, headings, or paragraph tags
      if (!pre) {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount || !ed.contains(sel.anchorNode)) {
          showToast('Click or select text in the HTML document to comment', 'info');
          return;
        }

        let node = sel.anchorNode;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;

        // Check if cursor/selection is inside an existing HTML comment wrapper or block
        const existingInlineComment = node.closest('.df-html-comment');
        const existingBlockComment = node.closest('.df-html-comment-block');

        if (existingInlineComment) {
          // Uncomment inline comment cleanly without disturbing inner nodes or formatting
          const parent = existingInlineComment.parentNode;
          while (existingInlineComment.firstChild) {
            parent.insertBefore(existingInlineComment.firstChild, existingInlineComment);
          }
          existingInlineComment.remove();
          window.DocFlow.Editor?.notifyChange?.();
          showToast('HTML Comment removed', 'info');
          return;
        }

        if (existingBlockComment) {
          // Uncomment block comment cleanly by removing comment class & attribute
          existingBlockComment.classList.remove('df-html-comment-block');
          existingBlockComment.removeAttribute('data-df-comment');
          window.DocFlow.Editor?.notifyChange?.();
          showToast('HTML Comment removed from line', 'info');
          return;
        }

        const range = sel.getRangeAt(0);
        if (range.collapsed) {
          // Caret is on a line without selection: comment current block element cleanly without changing layout
          const block = node.closest('p, h1, h2, h3, h4, h5, h6, li, tr, th, td, blockquote, pre, div') || node;
          if (block && block !== ed) {
            block.classList.add('df-html-comment-block');
            block.setAttribute('data-df-comment', 'true');
            window.DocFlow.Editor?.notifyChange?.();
            showToast('HTML Comment applied to line without altering formatting', 'success');
            return;
          }
        }

        // Selected range: wrap cleanly inside a comment span if valid, otherwise toggle on enclosing block
        try {
          const span = document.createElement('span');
          span.className = 'df-html-comment';
          span.setAttribute('data-df-comment', 'true');
          range.surroundContents(span);
          window.DocFlow.Editor?.notifyChange?.();
          showToast('HTML Comment applied without altering formatting', 'success');
        } catch (err) {
          const block = node.closest('p, h1, h2, h3, h4, h5, h6, li, tr, th, td, blockquote, pre, div') || node;
          if (block && block !== ed) {
            block.classList.add('df-html-comment-block');
            block.setAttribute('data-df-comment', 'true');
            window.DocFlow.Editor?.notifyChange?.();
            showToast('HTML Comment applied to block without altering formatting', 'success');
          } else {
            showToast('Select text within a block to comment', 'warning');
          }
        }
        return;
      }

      // Mode B: Code View Mode (inside pre.html-code-view)
      const target = pre;
      const fullText = target.textContent || '';

      // Helper to compute character offset inside target
      function getOffset(node, offset) {
        if (!node) return 0;
        const treeWalker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
        let charCount = 0;
        while (treeWalker.nextNode()) {
          const curr = treeWalker.currentNode;
          if (curr === node) {
            return charCount + Math.min(offset, curr.nodeValue.length);
          }
          charCount += curr.nodeValue.length;
        }
        return charCount;
      }

      const sel = window.getSelection();
      let hasSel = sel && sel.rangeCount > 0 && target.contains(sel.anchorNode);
      let selStart = 0;
      let selEnd = 0;
      let isCollapsed = true;

      if (hasSel) {
        const off1 = getOffset(sel.anchorNode, sel.anchorOffset);
        const off2 = getOffset(sel.focusNode, sel.focusOffset);
        selStart = Math.min(off1, off2);
        selEnd = Math.max(off1, off2);
        isCollapsed = sel.isCollapsed || (selStart === selEnd);
      } else {
        selStart = fullText.length;
        selEnd = fullText.length;
        isCollapsed = true;
      }

      let replaceStart = 0;
      let replaceEnd = 0;
      let textToToggle = '';

      if (isCollapsed) {
        // Expand to current line bounds
        replaceStart = fullText.lastIndexOf('\n', selStart - 1) + 1;
        let nextNl = fullText.indexOf('\n', selStart);
        replaceEnd = nextNl === -1 ? fullText.length : nextNl;
        textToToggle = fullText.substring(replaceStart, replaceEnd);
      } else {
        replaceStart = selStart;
        replaceEnd = selEnd;
        textToToggle = fullText.substring(replaceStart, replaceEnd);
      }

      // Check language context at toggle location (<style> = CSS, <script> = JS, otherwise HTML)
      const textBefore = fullText.substring(0, replaceStart);
      const lastStyleOpen = textBefore.lastIndexOf('<style');
      const lastStyleClose = textBefore.lastIndexOf('</style>');
      const isCss = lastStyleOpen !== -1 && lastStyleOpen > lastStyleClose;

      const lastScriptOpen = textBefore.lastIndexOf('<script');
      const lastScriptClose = textBefore.lastIndexOf('</script>');
      const isJs = lastScriptOpen !== -1 && lastScriptOpen > lastScriptClose;

      let toggled = '';
      const trimmed = textToToggle.trim();

      if (isCss) {
        // CSS Comment Toggle (/* ... */)
        if (/^\/\*[\s\S]*\*\/$/.test(trimmed)) {
          toggled = textToToggle.replace(/^(\s*)\/\*\s?([\s\S]*?)\s?\*\/(\s*)$/, '$1$2$3');
        } else {
          toggled = textToToggle.replace(/^(\s*)([\s\S]*?)(\s*)$/, '$1/* $2 */$3');
        }
      } else if (isJs) {
        // JS Comment Toggle (// or /* ... */)
        if (textToToggle.includes('\n')) {
          const lines = textToToggle.split('\n');
          const allCommented = lines.every(l => !l.trim() || l.trim().startsWith('//'));
          if (allCommented) {
            toggled = lines.map(l => l.replace(/^(\s*)\/\/\s?/, '$1')).join('\n');
          } else if (/^\/\*[\s\S]*\*\/$/.test(trimmed)) {
            toggled = textToToggle.replace(/^(\s*)\/\*\s?([\s\S]*?)\s?\*\/(\s*)$/, '$1$2$3');
          } else {
            toggled = lines.map(l => l.trim() ? l.replace(/^(\s*)(.*)$/, '$1// $2') : l).join('\n');
          }
        } else {
          if (trimmed.startsWith('//')) {
            toggled = textToToggle.replace(/^(\s*)\/\/\s?/, '$1');
          } else if (/^\/\*[\s\S]*\*\/$/.test(trimmed)) {
            toggled = textToToggle.replace(/^(\s*)\/\*\s?([\s\S]*?)\s?\*\/(\s*)$/, '$1$2$3');
          } else {
            toggled = textToToggle.replace(/^(\s*)(.*)$/, '$1// $2');
          }
        }
      } else {
        // HTML Comment Toggle (<!-- ... -->)
        if (textToToggle.includes('\n')) {
          const lines = textToToggle.split('\n');
          const allCommented = lines.every(l => !l.trim() || (/^<!--[\s\S]*-->$/.test(l.trim())));
          if (allCommented) {
            toggled = lines.map(l => l.replace(/^(\s*)<!--\s?([\s\S]*?)\s?-->(\s*)$/, '$1$2$3')).join('\n');
          } else {
            toggled = lines.map(l => {
              if (!l.trim()) return l;
              return l.replace(/^(\s*)([\s\S]*?)(\s*)$/, '$1<!-- $2 -->$3');
            }).join('\n');
          }
        } else {
          if (/^<!--[\s\S]*-->$/.test(trimmed)) {
            toggled = textToToggle.replace(/^(\s*)<!--\s?([\s\S]*?)\s?-->(\s*)$/, '$1$2$3');
          } else {
            if (!trimmed) {
              toggled = '<!--  -->';
            } else {
              toggled = textToToggle.replace(/^(\s*)([\s\S]*?)(\s*)$/, '$1<!-- $2 -->$3');
            }
          }
        }
      }

      // Apply replacement
      target.textContent = fullText.substring(0, replaceStart) + toggled + fullText.substring(replaceEnd);
      window.DocFlow.Editor?.notifyChange?.();
      window.DocFlow.Editor?.saveSnapshot?.();

      // Restore caret inside target
      try {
        const newCaretPos = replaceStart + toggled.length;
        const treeWalker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
        let charCount = 0;
        let targetNode = target;
        let targetOffset = 0;
        while (treeWalker.nextNode()) {
          const curr = treeWalker.currentNode;
          if (charCount + curr.nodeValue.length >= newCaretPos) {
            targetNode = curr;
            targetOffset = newCaretPos - charCount;
            break;
          }
          charCount += curr.nodeValue.length;
        }
        const newRange = document.createRange();
        newRange.setStart(targetNode, Math.min(targetOffset, targetNode.nodeValue ? targetNode.nodeValue.length : 0));
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      } catch (e) { }

      const langLabel = isCss ? 'CSS' : isJs ? 'JavaScript' : 'HTML tag';
      showToast(`Comment toggled for ${langLabel}`, 'success');
    });

    // Helper: Convert any CSS color (hex, rgb, rgba, hsl, name) to #rrggbb hex string
    function cssColorToHex(colorStr) {
      if (!colorStr) return '#000000';
      const clean = colorStr.trim();
      if (/^#[0-9a-fA-F]{6}$/i.test(clean)) return clean.toLowerCase();
      if (/^#[0-9a-fA-F]{3}$/i.test(clean)) {
        return `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`.toLowerCase();
      }
      try {
        const dummy = document.createElement('div');
        dummy.style.color = clean;
        document.body.appendChild(dummy);
        const comp = window.getComputedStyle(dummy).color;
        document.body.removeChild(dummy);
        const m = comp.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (m) {
          const r = parseInt(m[1], 10).toString(16).padStart(2, '0');
          const g = parseInt(m[2], 10).toString(16).padStart(2, '0');
          const b = parseInt(m[3], 10).toString(16).padStart(2, '0');
          return `#${r}${g}${b}`.toLowerCase();
        }
      } catch (e) {}
      return '#3b82f6';
    }

    // Unique HTML Tool: Extract Colors into visual palette modal with changable color picker for every color occurrence (Bug 4)
    $('#htmlExtractColorsBtn')?.addEventListener('click', () => {
      const content = getCodeEditorContent('html');
      if (!content.trim()) {
        showToast('No HTML content to extract colors from', 'info');
        return;
      }
      const hexMatches = content.match(/#(?:[0-9a-fA-F]{3,4}){1,2}\b/g) || [];
      const rgbMatches = content.match(/rgba?\([^)]+\)/g) || [];
      const hslMatches = content.match(/hsla?\([^)]+\)/g) || [];

      const colorMap = new Map();
      [...hexMatches, ...rgbMatches, ...hslMatches].forEach(c => {
        const norm = c.trim();
        colorMap.set(norm, (colorMap.get(norm) || 0) + 1);
      });

      const container = $('#htmlColorsGridContainer');
      const badge = $('#htmlColorsCountBadge');
      if (colorMap.size === 0) {
        if (container) container.innerHTML = '<div style="grid-column:1/-1;padding:24px;text-align:center;color:var(--text-muted);font-size:12.5px;">No color codes (#hex, rgb, hsl) found in HTML document.</div>';
        if (badge) badge.textContent = '0 colors found';
      } else {
        if (badge) badge.textContent = `${colorMap.size} unique color(s) found`;
        if (container) {
          container.innerHTML = Array.from(colorMap.entries()).map(([color, count]) => {
            const hexVal = cssColorToHex(color);
            return `
            <div class="html-color-card" data-orig-color="${escHtml(color)}">
              <div class="html-color-left" onclick="navigator.clipboard.writeText('${escHtml(color)}'); window.DocFlow?.UI?.showToast?.('Copied ${escHtml(color)} to clipboard', 'success');" title="Click to copy ${escHtml(color)}">
                <div class="html-color-chip" style="background:${color};"></div>
                <div class="html-color-info">
                  <span class="html-color-hex">${escHtml(color)}</span>
                  <span class="html-color-count">${count} occurrence(s)</span>
                </div>
              </div>
              <div class="html-color-actions">
                <label class="html-color-picker-wrap" title="Pick new color to replace all occurrences in document">
                  <i class="fas fa-eye-dropper" style="font-size:10px;color:var(--text-muted);pointer-events:none;"></i>
                  <input type="color" class="html-color-item-picker" value="${hexVal}" data-old-color="${escHtml(color)}">
                </label>
              </div>
            </div>
          `;
          }).join('');

          // Bind color picker change events to replace occurrences in the document
          container.querySelectorAll('.html-color-item-picker').forEach(picker => {
            picker.addEventListener('change', (e) => {
              const oldColor = e.target.getAttribute('data-old-color');
              const newColor = e.target.value;
              if (!oldColor || !newColor || oldColor.toLowerCase() === newColor.toLowerCase()) return;

              const ed = $('#editor');
              if (!ed) return;
              window.DocFlow.Editor?.saveSnapshot?.();
              const pre = ed.querySelector('pre.html-code-view');
              let currentCode = pre ? pre.textContent : (ed.innerText || ed.textContent || '');

              const escapedOld = oldColor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(escapedOld, 'gi');
              const occurrences = (currentCode.match(regex) || []).length;

              if (occurrences > 0) {
                currentCode = currentCode.replace(regex, newColor);
                if (pre) pre.textContent = currentCode;
                else ed.textContent = currentCode;
                window.DocFlow.Editor?.notifyChange?.();
                window.DocFlow.Editor?.saveSnapshot?.();

                // Update card visual elements
                const card = e.target.closest('.html-color-card');
                if (card) {
                  const chip = card.querySelector('.html-color-chip');
                  if (chip) chip.style.background = newColor;
                  const hexSpan = card.querySelector('.html-color-hex');
                  if (hexSpan) hexSpan.textContent = newColor;
                  card.setAttribute('data-orig-color', newColor);
                  e.target.setAttribute('data-old-color', newColor);
                }
                showToast(`Replaced ${occurrences} occurrence(s) of ${oldColor} with ${newColor}`, 'success');
              } else {
                showToast(`No remaining occurrences of ${oldColor} found`, 'info');
              }
            });
          });
        }
      }
      window.DocFlow.UI?.openModal?.('#htmlColorsModal');
    });

    $('#htmlColorsCloseBtn')?.addEventListener('click', () => window.DocFlow.UI?.closeModal?.('#htmlColorsModal'));
    $('#htmlColorsDoneBtn')?.addEventListener('click', () => window.DocFlow.UI?.closeModal?.('#htmlColorsModal'));

    $('#htmlExtractAssetsBtn')?.addEventListener('click', async () => {
      const content = getCodeEditorContent('html');
      if (!content.trim()) {
        showToast('No HTML code to extract assets from', 'warning');
        return;
      }
      const styles = Array.from(content.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)).map(m => m[1].trim()).filter(Boolean);
      const scripts = Array.from(content.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)).map(m => m[1].trim()).filter(Boolean);

      const totalCss = styles.join('\n\n/* --- Next Style Block --- */\n\n');
      const totalJs = scripts.join('\n\n// --- Next Script Block ---\n\n');

      if (!totalCss && !totalJs) {
        showToast('No embedded <style> or <script> blocks found in document', 'info');
        return;
      }

      const combined = `/* =================== EXTRACTED CSS (${styles.length} blocks) =================== */\n${totalCss || '/* No embedded styles */'}\n\n// =================== EXTRACTED JS (${scripts.length} blocks) ===================\n${totalJs || '// No embedded scripts'}`;
      try {
        await navigator.clipboard.writeText(combined);
        showToast(`Extracted ${styles.length} CSS and ${scripts.length} JS block(s) to clipboard!`, 'success');
      } catch (_) {
        showToast(`Found ${styles.length} CSS and ${scripts.length} JS block(s) in HTML`, 'info');
      }
    });

    $('#htmlPreviewBtn')?.addEventListener('click', () => openCodePreviewModal('html'));

    // Helper: Basic Markdown Parser fallback if marked is offline
    function renderBasicMarkdown(md) {
      if (!md) return '';
      let html = escHtml(md);
      html = html.replace(/```([a-zA-Z0-9]*)\n([\s\S]*?)```/g, '<pre><code class="lang-$1">$2</code></pre>');
      html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
      html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
      html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
      html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
      html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
      html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
      html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
      html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');
      html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');
      html = html.replace(/^[*-]\s+(.+)$/gm, '<li>$1</li>');
      html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
      html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;">');
      html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
      html = html.replace(/\n\n/g, '<br><br>');
      return html;
    }

    // Helper: Get raw source for HTML & MD editors
    function getCodeEditorContent(mode) {
      const ed = $('#editor');
      if (!ed) return '';
      const pre = ed.querySelector(`pre.${mode}-code-view`);
      if (pre) return (pre.innerText || pre.textContent || '').trim();
      if (mode === 'html') {
        const text = (ed.innerText || ed.textContent || '').trim();
        if (text.startsWith('<') || text.includes('<!DOCTYPE') || text.includes('<html') || text.includes('</div>') || text.includes('</body>')) {
          return text;
        }
        return `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Preview</title>\n  <style>\n    body { font-family: system-ui, sans-serif; padding: 24px; line-height: 1.6; color: #1e293b; background: #ffffff; }\n  </style>\n</head>\n<body>\n${ed.innerHTML}\n</body>\n</html>`;
      } else if (mode === 'md') {
        const text = (ed.innerText || ed.textContent || '').trim();
        if (text) return text;
        const clone = ed.cloneNode(true);
        clone.querySelectorAll('br').forEach(b => b.replaceWith('\n'));
        clone.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li, tr').forEach(el => {
          el.prepend(document.createTextNode('\n'));
          el.append(document.createTextNode('\n'));
        });
        return (clone.textContent || '').replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
      }
      return (ed.innerText || ed.textContent || '').trim();
    }

    // ==========================================================================
    // Mermaid & Flowchart Diagram Renderer (Bug 1: Mermaid live preview)
    // ==========================================================================

    function buildFallbackFlowchartSvg(text) {
      if (!text) return '';
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

      const nodes = new Map();
      const edges = [];

      function getOrCreateNode(id, rawDef = '') {
        const cleanId = id.trim();
        if (!nodes.has(cleanId)) {
          let label = cleanId;
          let shape = 'rect';

          if (rawDef) {
            if (rawDef.includes('{') && rawDef.includes('}')) {
              shape = 'diamond';
              label = rawDef.substring(rawDef.indexOf('{') + 1, rawDef.lastIndexOf('}'));
            } else if (rawDef.includes('([') && rawDef.includes('])')) {
              shape = 'stadium';
              label = rawDef.substring(rawDef.indexOf('([') + 2, rawDef.lastIndexOf('])'));
            } else if (rawDef.includes('((') && rawDef.includes('))')) {
              shape = 'circle';
              label = rawDef.substring(rawDef.indexOf('((') + 2, rawDef.lastIndexOf('))'));
            } else if (rawDef.includes('[') && rawDef.includes(']')) {
              shape = 'rect';
              label = rawDef.substring(rawDef.indexOf('[') + 1, rawDef.lastIndexOf(']'));
            }
          }
          nodes.set(cleanId, { id: cleanId, label: label.trim(), shape });
        } else if (rawDef) {
          const existing = nodes.get(cleanId);
          if (rawDef.includes('{') && rawDef.includes('}')) {
            existing.shape = 'diamond';
            existing.label = rawDef.substring(rawDef.indexOf('{') + 1, rawDef.lastIndexOf('}')).trim();
          } else if (rawDef.includes('[') && rawDef.includes(']')) {
            existing.label = rawDef.substring(rawDef.indexOf('[') + 1, rawDef.lastIndexOf(']')).trim();
          }
        }
        return nodes.get(cleanId);
      }

      for (const line of lines) {
        if (/^(graph|flowchart)\s+/i.test(line) || line.startsWith('%%')) continue;

        const edgeMatch = line.match(/^([A-Za-z0-9_-]+(?:\[[^\]]+\]|\{[^}]+\}|\([^)]+\))?)\s*(-->|---|==>|-\.->)\s*(?:\|([^|]+)\|\s*)?([A-Za-z0-9_-]+(?:\[[^\]]+\]|\{[^}]+\}|\([^)]+\))?)$/);

        if (edgeMatch) {
          const rawA = edgeMatch[1];
          const arrow = edgeMatch[2];
          const edgeLabel = edgeMatch[3] ? edgeMatch[3].trim() : '';
          const rawB = edgeMatch[4];

          const idA = rawA.match(/^([A-Za-z0-9_-]+)/)[1];
          const idB = rawB.match(/^([A-Za-z0-9_-]+)/)[1];

          getOrCreateNode(idA, rawA);
          getOrCreateNode(idB, rawB);

          edges.push({ from: idA, to: idB, label: edgeLabel, arrow });
        } else {
          const singleMatch = line.match(/^([A-Za-z0-9_-]+)(\[[^\]]+\]|\{[^}]+\}|\([^)]+\))$/);
          if (singleMatch) {
            getOrCreateNode(singleMatch[1], singleMatch[0]);
          }
        }
      }

      if (nodes.size === 0) return '';

      const inDegree = new Map();
      nodes.forEach((_, id) => inDegree.set(id, 0));
      edges.forEach(e => {
        if (inDegree.has(e.to)) inDegree.set(e.to, inDegree.get(e.to) + 1);
      });

      const levels = new Map();
      const queue = [];
      nodes.forEach((_, id) => {
        if (inDegree.get(id) === 0) {
          levels.set(id, 0);
          queue.push(id);
        }
      });

      if (queue.length === 0) {
        const firstId = nodes.keys().next().value;
        levels.set(firstId, 0);
        queue.push(firstId);
      }

      while (queue.length > 0) {
        const curr = queue.shift();
        const currLvl = levels.get(curr) || 0;
        const outEdges = edges.filter(e => e.from === curr);
        for (const e of outEdges) {
          if (!levels.has(e.to) || levels.get(e.to) < currLvl + 1) {
            levels.set(e.to, currLvl + 1);
            queue.push(e.to);
          }
        }
      }

      nodes.forEach((_, id) => {
        if (!levels.has(id)) levels.set(id, 0);
      });

      const levelGroups = [];
      levels.forEach((lvl, id) => {
        while (levelGroups.length <= lvl) levelGroups.push([]);
        levelGroups[lvl].push(id);
      });

      const svgWidth = 480;
      const levelHeight = 85;
      const marginTop = 35;
      const svgHeight = Math.max(200, levelGroups.length * levelHeight + marginTop + 25);

      const nodeCoords = new Map();

      levelGroups.forEach((grp, lvlIdx) => {
        const y = marginTop + lvlIdx * levelHeight;
        const count = grp.length;
        const step = svgWidth / (count + 1);

        grp.forEach((nodeId, idx) => {
          const node = nodes.get(nodeId);
          const x = step * (idx + 1);
          const isDiamond = node.shape === 'diamond';
          const w = isDiamond ? 105 : 95;
          const h = isDiamond ? 48 : 36;
          nodeCoords.set(nodeId, { x, y, w, h, node });
        });
      });

      let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="100%" style="max-width:440px;height:auto;display:block;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;">\n`;
      svg += `  <defs>\n`;
      svg += `    <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">\n`;
      svg += `      <polygon points="0 0, 8 3, 0 6" fill="#64748b" />\n`;
      svg += `    </marker>\n`;
      svg += `    <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">\n`;
      svg += `      <stop offset="0%" stop-color="#38bdf8"/>\n`;
      svg += `      <stop offset="100%" stop-color="#0284c7"/>\n`;
      svg += `    </linearGradient>\n`;
      svg += `    <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">\n`;
      svg += `      <stop offset="0%" stop-color="#fbbf24"/>\n`;
      svg += `      <stop offset="100%" stop-color="#d97706"/>\n`;
      svg += `    </linearGradient>\n`;
      svg += `    <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">\n`;
      svg += `      <stop offset="0%" stop-color="#34d399"/>\n`;
      svg += `      <stop offset="100%" stop-color="#059669"/>\n`;
      svg += `    </linearGradient>\n`;
      svg += `    <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">\n`;
      svg += `      <stop offset="0%" stop-color="#a855f7"/>\n`;
      svg += `      <stop offset="100%" stop-color="#7e22ce"/>\n`;
      svg += `    </linearGradient>\n`;
      svg += `    <filter id="diagShadow" x="-10%" y="-10%" width="120%" height="120%">\n`;
      svg += `      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.12"/>\n`;
      svg += `    </filter>\n`;
      svg += `  </defs>\n`;

      edges.forEach(e => {
        const src = nodeCoords.get(e.from);
        const dst = nodeCoords.get(e.to);
        if (!src || !dst) return;

        const startX = src.x;
        const startY = src.y + (src.h / 2);
        const endX = dst.x;
        const endY = dst.y - (dst.h / 2);

        let pathD = '';
        if (Math.abs(startX - endX) < 5) {
          pathD = `M ${startX} ${startY} L ${endX} ${endY}`;
        } else {
          const midY = (startY + endY) / 2;
          pathD = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
        }

        svg += `  <path d="${pathD}" fill="none" stroke="#64748b" stroke-width="2" marker-end="url(#arrowhead)"/>\n`;

        if (e.label) {
          const labelX = (startX + endX) / 2 + (startX < endX ? 14 : -14);
          const labelY = (startY + endY) / 2;
          const pillWidth = Math.max(34, e.label.length * 8 + 12);
          svg += `  <g transform="translate(${labelX}, ${labelY})">\n`;
          svg += `    <rect x="${-pillWidth / 2}" y="-10" width="${pillWidth}" height="20" rx="10" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.2"/>\n`;
          svg += `    <text x="0" y="0" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="700" fill="#334155">${escHtml(e.label)}</text>\n`;
          svg += `  </g>\n`;
        }
      });

      nodeCoords.forEach((item, id) => {
        const { x, y, w, h, node } = item;
        const label = node.label || id;
        const lowerLabel = label.toLowerCase();

        let fillGrad = 'url(#blueGrad)';
        let strokeCol = '#0284c7';
        let textColor = '#ffffff';

        if (node.shape === 'diamond') {
          fillGrad = 'url(#amberGrad)';
          strokeCol = '#b45309';
          textColor = '#ffffff';
        } else if (lowerLabel.includes('finish') || lowerLabel.includes('end') || lowerLabel.includes('success')) {
          fillGrad = 'url(#greenGrad)';
          strokeCol = '#047857';
          textColor = '#ffffff';
        } else if (lowerLabel.includes('alternate') || lowerLabel.includes('error') || lowerLabel.includes('retry')) {
          fillGrad = 'url(#purpleGrad)';
          strokeCol = '#6b21a8';
          textColor = '#ffffff';
        }

        svg += `  <g transform="translate(${x}, ${y})" filter="url(#diagShadow)">\n`;

        if (node.shape === 'diamond') {
          const hw = w / 2;
          const hh = h / 2;
          svg += `    <polygon points="0,${-hh} ${hw},0 0,${hh} ${-hw},0" fill="${fillGrad}" stroke="${strokeCol}" stroke-width="2"/>\n`;
          svg += `    <text x="0" y="0" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="700" fill="${textColor}">${escHtml(label)}</text>\n`;
        } else if (node.shape === 'stadium' || lowerLabel.includes('start')) {
          svg += `    <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="22" fill="${fillGrad}" stroke="${strokeCol}" stroke-width="2"/>\n`;
          svg += `    <text x="0" y="0" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="700" fill="${textColor}">${escHtml(label)}</text>\n`;
        } else {
          svg += `    <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="8" fill="${fillGrad}" stroke="${strokeCol}" stroke-width="2"/>\n`;
          svg += `    <text x="0" y="0" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="700" fill="${textColor}">${escHtml(label)}</text>\n`;
        }

        svg += `  </g>\n`;
      });

      svg += `</svg>`;
      return svg;
    }

    async function renderMermaidDiagramsInArea(container) {
      if (!container) return;

      if (window.mermaid) {
        try {
          window.mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose',
            flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' }
          });
        } catch (e) {
          console.warn('Mermaid init warning', e);
        }
      }

      const preElements = Array.from(container.querySelectorAll('pre'));
      let diagramCount = 0;

      for (const pre of preElements) {
        const codeEl = pre.querySelector('code');
        const className = ((codeEl ? codeEl.className : '') + ' ' + (pre.className || '')).toLowerCase();
        const rawCode = (codeEl ? codeEl.textContent : pre.textContent) || '';
        const trimmed = rawCode.trim();

        const isMermaidClass = /language-mermaid|lang-mermaid|\bmermaid\b/.test(className);
        const isDiagramText = /^(graph\s+(td|tb|bt|rl|lr)|flowchart\s+(td|tb|bt|rl|lr)|sequencediagram|classdiagram|statediagram|erdiagram|journey|gantt|pie|gitgraph)/i.test(trimmed);

        if (isMermaidClass || isDiagramText) {
          diagramCount++;
          const diagId = 'mermaid_diag_' + Date.now() + '_' + diagramCount;

          const wrap = document.createElement('div');
          wrap.className = 'mermaid-diagram-wrap';
          wrap.innerHTML = `
            <div class="mermaid-diagram-title">
              <i class="fas fa-diagram-project" style="color:var(--accent,#0284c7);"></i> Mermaid Diagram
            </div>
            <div class="mermaid-diagram-target" id="${diagId}" style="width:100%;display:flex;justify-content:center;">
              <div style="padding:14px;color:var(--text-muted);font-size:12px;">
                <i class="fas fa-spinner fa-spin"></i> Rendering diagram...
              </div>
            </div>
          `;

          pre.parentNode.replaceChild(wrap, pre);
          const target = wrap.querySelector('.mermaid-diagram-target');

          let renderedSuccess = false;
          if (window.mermaid && typeof window.mermaid.render === 'function') {
            try {
              const result = window.mermaid.render(diagId + '_svg', trimmed);
              if (result && typeof result.then === 'function') {
                const res = await result;
                if (res && res.svg) {
                  target.innerHTML = res.svg;
                  if (res.bindFunctions) {
                    try { res.bindFunctions(target); } catch (_) {}
                  }
                  renderedSuccess = true;
                }
              } else if (typeof result === 'string') {
                target.innerHTML = result;
                renderedSuccess = true;
              }
            } catch (mErr) {
              console.warn('Native Mermaid render error, applying fallback builder:', mErr);
            }
          }

          if (!renderedSuccess) {
            try {
              const fallbackSvg = buildFallbackFlowchartSvg(trimmed);
              if (fallbackSvg) {
                target.innerHTML = fallbackSvg;
                renderedSuccess = true;
              }
            } catch (fErr) {
              console.warn('Fallback flowchart generator error:', fErr);
            }
          }

          if (!renderedSuccess) {
            target.innerHTML = `<pre style="margin:0;padding:12px;background:var(--bg-primary);border:1px solid var(--border);border-radius:6px;font-size:12px;overflow-x:auto;">${escHtml(trimmed)}</pre>`;
          }
        }
      }
    }

    // 14. Code Preview Modal (Markdown & HTML Live Previews - Issues 3 & 4)
    function openCodePreviewModal(mode) {
      const modal = $('#codePreviewModal');
      if (!modal) return;
      const title = $('#previewModalTitle');
      const icon = $('#previewModalIcon');
      const banner = $('#htmlPreviewNoticeBanner');
      const iframe = $('#codePreviewIframe');
      const mdArea = $('#mdPreviewRenderedArea');

      const content = getCodeEditorContent(mode);

      if (mode === 'html') {
        if (title) title.textContent = 'HTML Live Web Preview';
        if (icon) {
          icon.className = 'fas fa-play';
          icon.style.color = '#16a34a';
        }
        if (banner) banner.style.display = 'flex';
        if (mdArea) mdArea.style.display = 'none';
        if (iframe) {
          iframe.style.display = 'block';
          const clean = content.trim();
          const htmlToRender = clean || '<!DOCTYPE html><html><body style="font-family:sans-serif;padding:32px;text-align:center;color:#64748b;"><h3>No HTML code in editor</h3><p>Please insert HTML, CSS, and JS to preview.</p></body></html>';

          iframe.removeAttribute('src');
          iframe.srcdoc = htmlToRender;
        }
        showToast('Previewing single-file HTML, CSS, and JS', 'info');
      } else {
        if (title) title.textContent = 'Markdown Rendered Preview';
        if (icon) {
          icon.className = 'fab fa-markdown';
          icon.style.color = '#0284c7';
        }
        if (banner) banner.style.display = 'none';
        if (iframe) iframe.style.display = 'none';
        if (mdArea) {
          mdArea.style.display = 'block';
          const rawMd = content || '# No Content\nType markdown in editor to preview.';
          if (window.marked && typeof window.marked.parse === 'function') {
            mdArea.innerHTML = window.marked.parse(rawMd, { gfm: true, breaks: true });
          } else if (typeof window.marked === 'function') {
            mdArea.innerHTML = window.marked(rawMd);
          } else {
            mdArea.innerHTML = renderBasicMarkdown(rawMd);
          }

          // Render Mermaid Diagrams in MD Preview (Bug 1)
          renderMermaidDiagramsInArea(mdArea);
        }
        showToast('Rendered Markdown preview loaded', 'info');
      }

      openModal('#codePreviewModal');
    }

    const previewContainer = $('#previewFrameContainer');
    const updatePreviewDevice = (btn, width) => {
      $$('.preview-device-pills .fmt-btn').forEach(b => b.classList.remove('active'));
      btn?.classList.add('active');
      if (previewContainer) previewContainer.style.maxWidth = width;
    };

    $('#previewDesktopBtn')?.addEventListener('click', () => updatePreviewDevice($('#previewDesktopBtn'), '100%'));
    $('#previewTabletBtn')?.addEventListener('click', () => updatePreviewDevice($('#previewTabletBtn'), '768px'));
    $('#previewMobileBtn')?.addEventListener('click', () => updatePreviewDevice($('#previewMobileBtn'), '375px'));

    $('#codePreviewCloseBtn')?.addEventListener('click', () => {
      closeModal('#codePreviewModal');
    });

    $('#previewOpenNewTabBtn')?.addEventListener('click', () => {
      const isHtml = $('#previewModalTitle')?.textContent?.includes('HTML');
      const content = getCodeEditorContent(isHtml ? 'html' : 'md');
      const finalHtml = isHtml
        ? content
        : (window.marked?.parse ? window.marked.parse(content) : (typeof window.marked === 'function' ? window.marked(content) : renderBasicMarkdown(content)));
      const w = window.open();
      if (w) {
        w.document.open();
        w.document.write(finalHtml);
        w.document.close();
      }
    });
  }

  // ==========================================================================
  // Master Initialization
  // ==========================================================================

  function initApp() {
    // 1. Initialize UI foundation
    window.DocFlow.UI.initTheme();
    window.DocFlow.UI.initModals();
    window.DocFlow.UI.initFullscreen();

    // 2. Initialize New Document Modal & Formats
    initNewDocModal();

    // 3. Initialize Modules
    window.DocFlow.Editor.initEditor();
    window.DocFlow.ImageManager.initImageManager();
    window.DocFlow.PDF.initPdfViewer();
    window.DocFlow.Find.initFindOutline();
    window.DocFlow.FileIO.initFileIO();

    // 4. Initialize Ribbon, Auto-Save UI & Symbols
    initRibbon();
    initSymbolsModal();
    initCustomBorderModal();
    initPaintModal();
    initGifModal();
    setupSlideInteractions();
    updateAutoSaveUI();

    // 5. Wire Global Action Buttons
    $('#newBtn')?.addEventListener('click', () => openModal('#newDocModal'));
    $('#tabAdd')?.addEventListener('click', () => openModal('#newDocModal'));
    $('#emptyNewBtn')?.addEventListener('click', () => openModal('#newDocModal'));

    // Wire Recent Tabs Button & Sidebar Dropdown (Requirement 2)
    const tabRecentBtn = $('#tabRecentBtn');
    const recentTabsDropdown = $('#recentTabsDropdown');
    const recentTabsCloseBtn = $('#recentTabsCloseBtn');
    const recentTabsSearchInput = $('#recentTabsSearchInput');
    const recentTabsClearBtn = $('#recentTabsClearBtn');

    function toggleRecentDropdown(forceState) {
      if (!recentTabsDropdown) return;
      const isOpen = recentTabsDropdown.style.display !== 'none';
      const shouldOpen = forceState !== undefined ? forceState : !isOpen;

      if (shouldOpen) {
        // Ensure dropdown stays below tabRecentBtn and never extends past status bar (Issue 2)
        const btnRect = tabRecentBtn ? tabRecentBtn.getBoundingClientRect() : null;
        const statusBar = $('.statusbar');
        const statusHeight = statusBar ? statusBar.offsetHeight : 26;
        const spaceBelow = btnRect ? Math.max(120, window.innerHeight - btnRect.bottom - statusHeight - 12) : 360;
        const safeMaxHeight = Math.min(spaceBelow, 400);
        recentTabsDropdown.style.maxHeight = `${safeMaxHeight}px`;

        recentTabsDropdown.style.display = 'flex';
        tabRecentBtn?.classList.add('active');
        Recent.renderDropdown(recentTabsSearchInput?.value || '');
        setTimeout(() => recentTabsSearchInput?.focus(), 50);
      } else {
        recentTabsDropdown.style.display = 'none';
        tabRecentBtn?.classList.remove('active');
      }
    }

    tabRecentBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleRecentDropdown();
    });

    recentTabsCloseBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleRecentDropdown(false);
    });

    recentTabsSearchInput?.addEventListener('input', (e) => {
      Recent.renderDropdown(e.target.value);
    });

    recentTabsClearBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Clear all recent documents history?')) {
        Recent.clear();
        Recent.renderDropdown();
        Recent.render();
        showToast('Recent documents cleared', 'info');
      }
    });

    document.addEventListener('click', (e) => {
      if (recentTabsDropdown && recentTabsDropdown.style.display !== 'none') {
        if (!recentTabsDropdown.contains(e.target) && !tabRecentBtn?.contains(e.target)) {
          toggleRecentDropdown(false);
        }
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && recentTabsDropdown && recentTabsDropdown.style.display !== 'none') {
        toggleRecentDropdown(false);
      }
    });

    // Issue 1: Brand Home anchor link reliably returns to the main home dashboard
    $('#brandHomeLink')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.DocFlow?.UI?.Tabs) {
        window.DocFlow.UI.Tabs.saveCurrent();
        window.DocFlow.UI.Tabs.activeId = null;
        window.DocFlow.UI.Tabs.save();
        window.DocFlow.UI.Tabs.render();
      }
      switchMode('empty');
      Recent.render();
      updateTopbar('DocFlow', false);
      switchRibbonTab('home');
      try {
        history.replaceState(null, '', '#home');
      } catch (_) {}
    });

    initKeyboardShortcuts();

    // 6. Initial State & Render Recent Documents on Empty Screen
    switchMode('empty');
    Recent.render();
    updateBtnStates();

    // 7. Restore persisted tabs from localStorage (Issue 1: respect #home link)
    const isHomeHash = window.location.hash === '#home';
    if (window.DocFlow.UI.Tabs.load() && window.DocFlow.UI.Tabs.list.length > 0) {
      if (!isHomeHash && window.DocFlow.UI.Tabs.activeId) {
        const activeTab = window.DocFlow.UI.Tabs.get(window.DocFlow.UI.Tabs.activeId);
        if (activeTab) {
          window.DocFlow.UI.Tabs.activateTab(activeTab);
          applyPersistedLayoutSettings(activeTab);
        }
      } else {
        window.DocFlow.UI.Tabs.activeId = null;
        switchMode('empty');
        Recent.render();
        updateTopbar('DocFlow', false);
      }
      window.DocFlow.UI.Tabs.render();
      setupExcelInteractions();
    } else {
      applyPersistedLayoutSettings(null);
    }

    // 8. Save before window unloads
    window.addEventListener('beforeunload', () => {
      window.DocFlow.UI.Tabs.saveCurrent();
      window.DocFlow.UI.Tabs.save();
    });
  }

  // Expose methods on DocFlow namespace
  window.DocFlow.PdfStore = PdfStore;
  window.DocFlow.Recent = Recent;
  window.DocFlow.triggerAutoSaveTimer = triggerAutoSaveTimer;
  window.DocFlow.setFileTabDot = setFileTabDot;
  window.DocFlow.updateAutoSaveUI = updateAutoSaveUI;
  window.DocFlow.switchMode = switchMode;
  window.DocFlow.updateTopbar = updateTopbar;
  window.DocFlow.setModified = setModified;
  window.DocFlow.handleTabSave = handleTabSave;
  window.DocFlow.setupExcelInteractions = setupExcelInteractions;
  window.DocFlow.jumpToExcelCoord = jumpToExcelCoord;
  window.DocFlow.startSlideShow = startSlideShow;
  window.DocFlow.insertPptSlide = insertPptSlide;
  window.DocFlow.insertChartIntoDocument = insertChartIntoDocument;
  window.DocFlow.updateExcelChartPositions = updateExcelChartPositions;
  window.DocFlow.togglePageOrientation = togglePageOrientation;
  window.DocFlow.togglePageBorders = togglePageBorders;
  window.DocFlow.setPrintArea = setPrintArea;
  window.DocFlow.getCurrentActiveSlideIndex = () => currentActiveSlideIndex;
  window.DocFlow.updatePptSidebar = updatePptSidebar;
  window.DocFlow.selectPptSlide = selectPptSlide;
  window.DocFlow.deletePptSlide = deletePptSlide;
  window.DocFlow.duplicatePptSlide = duplicatePptSlide;
  window.DocFlow.insertExcelSheetTable = insertExcelSheetTable;
  window.DocFlow.handleExcelTableAction = handleExcelTableAction;
  window.DocFlow.applyExcelFormula = applyExcelFormula;
  window.DocFlow.switchRibbonTab = switchRibbonTab;
  window.DocFlow.initApp = initApp;

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})(window);
