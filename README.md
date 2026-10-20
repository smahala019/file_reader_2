# DocFlow — Next-Gen Modern Web Document Processor & Reader

**DocFlow** is a modern, high-performance, responsive web-based document processor, reader, and whiteboard studio. Built entirely with Vanilla JavaScript, HTML5, and CSS3, DocFlow delivers a desktop-class editing experience inspired by modern document suites while operating completely client-side in the browser.

---

## 🚀 Key Highlights & Architecture

- **Zero-Dependency Core Runtime**: Ultra-fast load times with vanilla JavaScript modules and clean separation of concerns.
- **Full Responsive Design**: Optimized across mobile phones, tablets, laptops, and ultra-wide desktop monitors.
- **Dynamic 2-Row Ribbon Balancer**: Strict maximum of 2 rows only (never 3+ rows). Smooth single-row collapse when space permits, dynamic rearrange on resize, horizontal mouse wheel / touch scroll, and orphan button recovery.
- **Client-Side Privacy**: All document reading, parsing, rendering, editing, and conversions run entirely inside your browser. No files are uploaded to any external server.
- **Visual Font Family Selector**: Interactive font family dropdown showing each font name and sample preview rendered directly in its native typeface with Calibri as the default font.
- **Non-Destructive HTML Comment Engine**: Comment lines, selections, or code blocks without altering document layout, headings, tables, or formatting.
- **Extensive Excel Formulas**: 50+ spreadsheet formulas spanning math, statistics, text, logic, and dates with seamless mouse-wheel scrollable popovers.
- **Rich PowerPoint Transitions & Animations**: 35+ slide transitions and 30+ element animations with customizable duration timers.
- **Modern Warning Containers & Modals**: Themed warning boxes, icon badges, and glowing confirmation modals for destructive action safety.
- **Auto-Save Engine & Recent Documents**: Persistent auto-save with a 5-second inactivity timer, real-time green/red state indicators, and recent documents management.
- **Multi-Page Fixed Watermark Printing**: Reliable repeating watermark across every printed page in multi-page documents via CSS Paged Media standards.
- **Official Excalidraw Whiteboard Studio**: Full drawing suite powered by React 18 and `@excalidraw/excalidraw` with instant canvas export.

---

## 📁 Modular Code Structure

```
d:/antigravity/file reader/
├── index.html            # Main semantic HTML structure & application layout
├── README.md             # Complete documentation and user manual
├── css/
│   ├── base.css          # Design tokens, themes (light/dark), CSS resets
│   ├── layout.css        # Topbar, responsive ribbon balancer, status bar, font dropdown
│   ├── editor.css        # Rich text canvas, slide transitions, animations, HTML comments, print
│   ├── pdf.css           # PDF.js canvas, toolbar, page thumbnails, zoom controls
│   └── modals.css        # Warning containers, modal dialogs, Excalidraw studio, GIF search
└── js/
    ├── ui.js             # Theme switcher, ribbon balancer, wheel scroll capture, popovers, tabs
    ├── editor.js         # Typography engine, visual font selection, Change Case, formatting
    ├── image-manager.js  # Image insertion, resizing handles, wrap modes, cropper
    ├── pdf-viewer.js     # PDF.js integration, page rendering, text extraction
    ├── find-outline.js   # Document outline headings, real-time find & replace
    ├── file-io.js        # File parsers (DOCX, PDF, XLSX, PPTX, MD, HTML, TXT)
    └── app.js            # Coordinator, Excel formulas, PPT animations, HTML commenting, chart generator
```

---

## 🎛️ Detailed Menu & Ribbon Feature Tour

### 1. Home Menu (`#ribbonPanelHome`)
- **Visual Font Family Selector with Native Typeface Previews (Issue 4)**:
  - **Live Style Previews**: Every font in the dropdown renders both its font name and preview text (`Aa Bb 123`) directly in its native typeface so users can instantly preview how each font looks before applying it.
  - **Refined Button & Dropdown Box CSS**: Outer button (`#fontFamilyBtn`) features a sleek 28px height, 140px width, rounded border, neutral background, focus-ring animations, and a smooth chevron indicator.
  - **Scrollable Popover**: High-performance popover (`#fontFamilyPopover`) with an expanded 300px max-height and custom scrollbar for comfortable browsing.
  - **Calibri as Default Font**: Calibri is established as the default font across the toolbar label, dropdown selection, active checkmark, and editor document canvas.
  - **Expanded Font Library**: Added `Work Sans`, `Karla`, `Comfortaa`, `Crimson Text`, `Libre Baskerville`, `Bitter`, `Permanent Marker`, `Lobster`, and `Satisfy` without removing any existing global typographies (Inter, Roboto, Arial, Times New Roman, Georgia, Courier New, Consolas, Fira Code, JetBrains Mono, Outfit, Plus Jakarta Sans, Syne, Caveat, Pacifico, Dancing Script, Great Vibes, Cinzel, Amiri, etc.).
- **Clear Formatting Warning Container**:
  - The Clear Formatting confirmation dialog (`#clearFormatModal`) is built with `.warning-container`, featuring an amber icon badge, warning tag, description, and smooth glowing backdrop animation in both dark and light modes.
- **Change Case Dropdown**:
  - Elevated floating popover (`#casePopover`) with `z-index: 1200 !important` and viewport-aware positioning.
  - Supports Sentence case, lowercase, UPPERCASE, and Capitalize Each Word.
- **Formatting Tools**: Bold (`Ctrl+B`), Italic (`Ctrl+I`), Underline (`Ctrl+U`), Strikethrough, Subscript, Superscript, Font Size stepper, Color Picker, Background Highlighter, and Format Painter.
- **Lists & Alignment**: Bullets (Disc, Circle, Square, Diamond, Arrow, Check, Star, Dash), Numbering, Indent/Outdent, and Line Spacing (1.0 to 3.0).

---

### 2. Excel Menu & Spreadsheet Document Tools (`#ribbonPanelExcel`)
- **Expanded Formula Library (Issue 1)**:
  - Added 16+ new formula functions without removing previous ones:
    - **Math & Statistical**: `FACT` (Factorial), `GCD` (Greatest Common Divisor), `LCM` (Least Common Multiple), `TRUNC` (Truncate Integer), `PI` (Pi Constant 3.14159...), `LARGE` (k-th Largest Value), `SMALL` (k-th Smallest Value), `RANK` (Rank in Sorted List).
    - **Text & Logic**: `CLEAN` (Remove Non-printable Characters), `EXACT` (Case-Sensitive String Comparison), `REPLACE` (Replace Text by Position), `T` (Extract Text Values), `XOR` (Exclusive Logical OR), `IFERROR` (Evaluate or Return Safe Fallback).
    - **Date & Time**: `DAYS` (Number of Days Between Dates), `YEARFRAC` (Fraction of Year Between Dates).
  - Preserved all existing core formulas: `SUM`, `AVERAGE`, `COUNT`, `MAX`, `MIN`, `MEDIAN`, `PRODUCT`, `COUNTA`, `COUNTBLANK`, `AVERAGEA`, `STDEV`, `VAR`, `MODE`, `ROUND`, `CEILING`, `FLOOR`, `ABS`, `SQRT`, `POWER`, `EXP`, `LOG`, `LN`, `SIGN`, `MOD`, `QUOTIENT`, `INT`, `RAND`, `RANDBETWEEN`, `COUNTIF`, `SUMIF`, `CONCAT`, `UPPER`, `LOWER`, `PROPER`, `LEN`, `TRIM`, `REPT`, `SUBSTITUTE`, `LEFT`, `RIGHT`, `IF`, `AND`, `OR`, `NOT`, `ISNUMBER`, `ISTEXT`, `ISBLANK`, `NOW`, `TODAY`, `YEAR`, `MONTH`, `DAY`, `WEEKDAY`, `HOUR`, `MINUTE`, `SECOND`, `DATE`.
- **Mouse Wheel Scrollable Dropdown (Issue 1)**:
  - Resolved mouse wheel scrolling issues across dropdowns and popovers by implementing a capture-phase wheel listener (`initRibbonScroll` with `{ capture: true, passive: false }`).
  - When the user hovers over `#excelFunctionPopover` or any ribbon popover, scrolling with the mouse wheel smoothly and directly scrolls the popover contents without propagating out or freezing.

---

### 3. PowerPoint Menu & Presentation Tools (`#ribbonPanelPpt`)
- **Slide Transitions Expansion (Issue 2)**:
  - Added 6 new hardware-accelerated 3D slide transitions:
    - `3D Swing Door` (`swing-door`): 3D perspective door opening swing.
    - `Float & Blur Up` (`float-up`): Vertical upward glide with smooth focus blur transition.
    - `Rotate & Zoom Out` (`rotate-zoom-out`): Rotational spin with smooth zoom scaling.
    - `Blinds Horizontal` (`blinds-horizontal`): Clean horizontal slat reveal.
    - `Radial Expand` (`expand-circle`): Center-origin radial circle clipping reveal.
    - `Skew Slide In` (`skew-slide`): Dynamic angled kinetic slide in.
  - All existing transitions remain intact: `Fade`, `Slide Right`, `Push Up`, `Zoom`, `3D Flip`, `Slide Up`, `Bounce In`, `Spin & Scale`, `Wipe Left`, `Blur In`, `3D Cube`, `Split Doors`, `Camera Flash`, `Shutter`, `Door Swing`, `Fly In`, `Fall Over`, `Curtains Open`, `Pixel Dissolve`, `Origami Fold`, `Vortex Swirl`, `3D Switch`, `Water Ripple`, `Glitch Shift`, `Honeycomb Hex`, `Page Curl`, `Zoom & Spin`, `Shimmer Wave`, `3D Card Flip`, `Kaleidoscope`, `Vertical Blinds`, `3D Orbit`, `Shape Morph`, `3D Box Turn`, `Gallery Push`, `Conveyor Belt`, `Swirl In`, `Curtain Rise`, `3D Prism Twist`, `Reveal Right`, `Elastic Bounce`, `Slide Rotate`, `Pan Down`, `3D Unfold`.
- **Element Animations Expansion (Issue 2)**:
  - Added 6 new element animations:
    - `3D Swing In Top` (`swing-in-top`): Perspective top hinge entrance.
    - `Bounce In Right` (`bounce-in-right`): Multi-stage spring bounce from the right.
    - `Back In Down` (`back-in-down`): Downward scale-in drop.
    - `Lightspeed In` (`lightspeed-in`): High-speed tilted streak entrance.
    - `Heart Pop Burst` (`heart-pop`): Dynamic scale burst with glow pulse.
    - `Slit In Vertical` (`slit-in-vertical`): 3D vertical slit rotation into view.
  - Preserved all existing element animations (`Fade In`, `Fly In`, `Zoom In`, `Bounce In`, `Pulse`, `Shimmer`, `Spin`, `RubberBand`, `Wobble`, `Pendulum Swing`, `Flip In X/Y`, `Zoom In Down`, `Roll In`, `Heartbeat`, `Neon Glow`, `Jello`, `Tada`, `Float`, `Typewriter`, `Blur Fade`, `Flash Burst`, `Head Shake`, `Swing Drop`, `Bounce Drop`, `Blur Zoom`, `Slide & Rotate`, `Pop & Snap`, `Tracking Letters`, `Fade Out`, `Zoom Out`).
- **Duration Timers**:
  - Independent timer selection for transition and animation durations (0.3s, 0.5s, 1.0s, 1.5s, 2.0s, 3.0s).

---

### 4. HTML Menu & Code Tools (`#ribbonPanelHtml`)
- **Non-Destructive Commenting (Issue 3)**:
  - Completely resolved the issue where clicking the comment button altered or broke document formatting.
  - **WYSIWYG Mode**:
    - When clicking **Comment Line** on a line or block element (`<p>`, `<h1>`-`<h6>`, `<li>`, `<tr>`, etc.), DocFlow applies `.df-html-comment-block` with subtle comment opacity and monospace pseudo-elements `<!-- ` and ` -->`.
    - No DOM nodes are deleted, no tags are split, and zero headings, margins, font styles, or table layouts are disturbed.
    - When selecting text, it cleanly wraps the selection in `.df-html-comment` without corrupting child spans.
    - Clicking the button again seamlessly uncomments the block or selection, restoring the original state.
  - **Code View Mode (`pre.html-code-view`)**:
    - Cleanly toggles `<!-- ... -->` on single lines or multi-line selections with exact indentation and line-break preservation.
    - Supports contextual CSS `/* ... */` inside `<style>` blocks and JavaScript `//` inside `<script>` blocks.
- **Productivity Tools**:
  - Format Code (HTML beautifier with indentation), Minify HTML, DOM Inspector, Validate HTML, HTML Entities Modal, Extract CSS/JS Assets, Extract Colors Palette, and Live HTML Preview.

---

### 5. Warning Container System (`css/modals.css`)
- **Component Classes**:
  - `.warning-container`, `.warning-box`: Soft amber background, rounded corners, subtle border, and responsive flex layout.
  - `.warning-icon-badge`: Circular warning icon badge with amber lighting.
  - `.warning-content`, `.warning-header`, `.warning-title`, `.warning-tag`, `.warning-desc`: Clear hierarchy separating the title, tag chip, and explanatory description.
  - `.warning-modal-container`: Glowing modal border and animated shadow emphasizing destructive confirmation dialogs.
- **Dual-Theme Support**:
  - Automatically styled for both Dark Mode and Light Mode (`[data-theme="light"]`) with high-contrast readable text and warm warning palettes.

---

### 6. File & Layout Tools
- **File Menu (`#ribbonPanelFile`)**: New Document, Office file creation (.docx, .xlsx, .pptx, .pdf), Direct Print button (`Ctrl+P`), Auto-Save (5s timer), and Export (HTML, MD, TXT, PDF).
- **Layout Menu (`#ribbonPanelLayout`)**: Page Breaks (`Ctrl+Enter`), Column Breaks, Multi-Page Repeating Watermark in Print, Sheet Layout (1200px), and Slide Aspect (16:9).
- **View Menu (`#ribbonPanelView`)**: Slide Deck View, Excel Gridlines View, Distraction-Free Reading Mode, Headings Document Outline, Zoom (50%-200%), and Dark/Light Theme Switcher.

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + N` | Create New Document |
| `Ctrl + O` | Open Document from Device |
| `Ctrl + S` | Save Current Document Tab |
| `Ctrl + P` | Print / Export Clean PDF |
| `Ctrl + B` | Toggle Bold |
| `Ctrl + I` | Toggle Italic |
| `Ctrl + U` | Toggle Underline |
| `Ctrl + Z` | Undo Typing |
| `Ctrl + Y` | Redo Typing |
| `Ctrl + F` | Open Find in Document |
| `Ctrl + H` | Open Find & Replace in Document |
| `Ctrl + \` | Clear Formatting (Opens Warning Modal) |
| `Esc` | Exit Reading Mode / Close Modals & Popovers |

---

## 🌐 Browser Support & Performance

- **Google Chrome**: Full support (desktop & mobile)
- **Mozilla Firefox**: Full support
- **Apple Safari**: Full support (iOS & macOS)
- **Microsoft Edge**: Full support
- **Opera / Brave / Chromium**: Full support

---

*Made with ❤ by Sachin*
