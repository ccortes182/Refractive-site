/* ==========================================================================
   Deck Charts — animated SVG primitives for the investor & client decks
   --------------------------------------------------------------------------
   No chart library. Vanilla SVG, animated with the GSAP instance the decks
   already load. Charts are declared in markup and rendered on demand:

     <figure class="deck-chart" data-chart="waterfall"
             data-values="100,-12,-9,-6,73"
             data-labels="Ad spend,Funnel mismatch,Redundant attribution,..."
             data-note="Illustrative — based on typical audit findings"></figure>

   Public API (used by both the carousel and story-mode drivers in deck.js):
     DeckCharts.render(root)  build SVG once, at final state
     DeckCharts.play(root)    animate in
     DeckCharts.reset(root)   return to zero state so a revisit replays

   Every chart renders complete and readable before play() runs, so the
   no-GSAP and prefers-reduced-motion paths need no special cases.
   ========================================================================== */

window.DeckCharts = (function() {

  var NS = 'http://www.w3.org/2000/svg';

  var hasGSAP = function() { return typeof gsap !== 'undefined'; };
  var reduced = window.matchMedia &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Phones get portrait geometry: a 760-unit-wide chart squeezed into a 340px
  // column renders its labels at ~6px. Every builder that reads this lays its
  // content out vertically instead, against a narrow viewBox, so type stays
  // legible. deck.js reloads on a breakpoint cross, so this is read once.
  var NW = 380;
  function narrow() { return window.innerWidth <= 767; }

  // Animation is opt-out: without GSAP, or with reduced motion, charts simply
  // stay at the final state they were rendered in.
  function animates() { return hasGSAP() && !reduced; }

  // ── Brand palette (mirrors css/variables.css) ──
  var C = {
    blue:    '#43a9df',
    violet:  '#8e68ad',
    cyan:    '#c2dcd4',
    indigo:  '#7b76d3',
    plum:    '#a05c97',
    blueMid: '#5f8fd9',
    teal:    '#9ec8c8',
    loss:    '#b26a7a',
    warn:    '#fbbf24',
    good:    '#34d399',
    grid:    'rgba(255,255,255,0.08)',
    tick:    'rgba(255,255,255,0.55)',
    faint:   'rgba(255,255,255,0.028)'
  };

  var SERIES = [C.blue, C.violet, C.cyan, C.indigo, C.plum, C.teal];

  // ═══════════════════════════════════════════════════════════
  // DOM helpers
  // ═══════════════════════════════════════════════════════════

  function el(tag, attrs, text) {
    var node = document.createElementNS(NS, tag);
    for (var k in attrs) {
      if (attrs[k] !== null && attrs[k] !== undefined) {
        node.setAttribute(k, attrs[k]);
      }
    }
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function svgRoot(w, h, label) {
    var s = el('svg', {
      viewBox: '0 0 ' + w + ' ' + h,
      preserveAspectRatio: 'xMidYMid meet',
      role: 'img',
      'aria-label': label || ''
    });
    s.classList.add('deck-chart__svg');
    return s;
  }

  // Comma-separated by default. If the value contains a semicolon, that wins —
  // which is how a list whose own items contain commas is authored, e.g.
  //   data-sub="Strategy, positioning, GTM; Paid social, search; Shopify, CRO"
  function list(node, attr) {
    var raw = node.getAttribute(attr);
    if (!raw) return [];
    var sep = raw.indexOf(';') > -1 ? ';' : ',';
    return raw.split(sep).map(function(s) { return s.trim(); });
  }

  function nums(node, attr) {
    return list(node, attr).map(parseFloat);
  }

  // Split a label into lines of at most `max` characters, on word boundaries.
  function wrap(text, max) {
    var words = String(text).split(/\s+/);
    var lines = [];
    var line = '';
    for (var i = 0; i < words.length; i++) {
      var next = line ? line + ' ' + words[i] : words[i];
      if (next.length > max && line) {
        lines.push(line);
        line = words[i];
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  // Multi-line <text>. Returns the text node.
  function textLines(x, y, lines, attrs, lineHeight) {
    var t = el('text', attrs);
    t.setAttribute('x', x);
    t.setAttribute('y', y);
    for (var i = 0; i < lines.length; i++) {
      var span = el('tspan', { x: x, dy: i === 0 ? 0 : (lineHeight || 13) }, lines[i]);
      t.appendChild(span);
    }
    return t;
  }

  // Always group thousands — a counter ticking up to "3500" reads as a typo
  // next to the "$3,500" the rest of the deck uses.
  function fmtNum(v, decimals) {
    var n = Number(v);
    if (decimals === undefined || decimals === null) {
      return Math.abs(n) >= 1000 ? n.toLocaleString('en-US') : String(n);
    }
    return n.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  // ═══════════════════════════════════════════════════════════
  // Shared <defs>: gradients referenced by url(#id) across all charts
  // ═══════════════════════════════════════════════════════════

  var defsReady = false;

  function ensureDefs() {
    if (defsReady) return;
    defsReady = true;

    var host = el('svg', { width: 0, height: 0, 'aria-hidden': 'true', focusable: 'false' });
    host.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden;');
    var defs = el('defs');

    function linear(id, stops, x1, y1, x2, y2) {
      var g = el('linearGradient', {
        id: id, x1: x1 || '0', y1: y1 || '0', x2: x2 === undefined ? '1' : x2, y2: y2 || '0'
      });
      stops.forEach(function(s) {
        g.appendChild(el('stop', { offset: s[0], 'stop-color': s[1], 'stop-opacity': s[2] === undefined ? 1 : s[2] }));
      });
      defs.appendChild(g);
    }

    // Primary brand sweep, used for bars and beams.
    linear('dc-brand', [['0%', C.blue], ['100%', C.violet]]);
    linear('dc-brand-v', [['0%', C.violet], ['100%', C.blue]], '0', '0', '0', '1');
    linear('dc-full', [['0%', C.blue], ['55%', C.violet], ['100%', C.cyan]]);
    linear('dc-loss', [['0%', C.loss], ['100%', C.plum]]);
    linear('dc-good', [['0%', C.cyan], ['100%', C.blue]]);

    // Area fill under the growth curve.
    linear('dc-area', [
      ['0%', C.blue, 0.34],
      ['60%', C.violet, 0.12],
      ['100%', C.violet, 0]
    ], '0', '0', '0', '1');

    // White light entering the prism.
    linear('dc-white', [
      ['0%', 'rgba(255,255,255,0)'],
      ['35%', 'rgba(255,255,255,0.85)'],
      ['100%', '#ffffff']
    ]);

    // Soft glow for the prism body and highlighted quadrant dot.
    var glow = el('filter', { id: 'dc-glow', x: '-60%', y: '-60%', width: '220%', height: '220%' });
    glow.appendChild(el('feGaussianBlur', { stdDeviation: '5', result: 'b' }));
    var merge = el('feMerge');
    merge.appendChild(el('feMergeNode', { in: 'b' }));
    merge.appendChild(el('feMergeNode', { in: 'SourceGraphic' }));
    glow.appendChild(merge);
    defs.appendChild(glow);

    var softGlow = el('filter', { id: 'dc-glow-soft', x: '-40%', y: '-40%', width: '180%', height: '180%' });
    softGlow.appendChild(el('feGaussianBlur', { stdDeviation: '2.5', result: 'b' }));
    var merge2 = el('feMerge');
    merge2.appendChild(el('feMergeNode', { in: 'b' }));
    merge2.appendChild(el('feMergeNode', { in: 'SourceGraphic' }));
    softGlow.appendChild(merge2);
    defs.appendChild(softGlow);

    host.appendChild(defs);
    document.body.appendChild(host);
  }

  // ═══════════════════════════════════════════════════════════
  // Accessibility: a visually-hidden table mirroring the chart data
  // ═══════════════════════════════════════════════════════════

  function dataTable(labels, values, caption, display) {
    if (!labels.length) return null;
    var t = document.createElement('table');
    if (caption) {
      var cap = document.createElement('caption');
      cap.textContent = caption;
      t.appendChild(cap);
    }
    var tb = document.createElement('tbody');
    for (var i = 0; i < labels.length; i++) {
      var tr = document.createElement('tr');
      var th = document.createElement('th');
      th.setAttribute('scope', 'row');
      th.textContent = labels[i];
      var td = document.createElement('td');
      td.textContent = (display && display[i]) ? display[i] : (values[i] !== undefined ? values[i] : '');
      tr.appendChild(th);
      tr.appendChild(td);
      tb.appendChild(tr);
    }
    t.appendChild(tb);

    // A <table> ignores width/height:1px and lays out at its natural size, so
    // the sr-only clipping has to live on a block wrapper. Without this the
    // hidden table inflates the slide card's scroll height.
    var hidden = document.createElement('div');
    hidden.className = 'deck-chart__a11y';
    hidden.appendChild(t);
    return hidden;
  }

  // ═══════════════════════════════════════════════════════════
  // Count-up numbers — applied to any [data-count] element
  // ═══════════════════════════════════════════════════════════

  function buildCounter(node) {
    var target = parseFloat(node.getAttribute('data-count'));
    var prefix = node.getAttribute('data-prefix') || '';
    var suffix = node.getAttribute('data-suffix') || '';
    var decimals = node.hasAttribute('data-decimals')
      ? parseInt(node.getAttribute('data-decimals'), 10)
      : (String(target).indexOf('.') > -1 ? 1 : 0);

    function write(v) {
      node.textContent = prefix + fmtNum(v, decimals) + suffix;
    }

    write(target);

    return {
      el: node,
      reset: function() { if (animates()) write(0); },
      play: function() {
        if (!animates()) { write(target); return; }
        var proxy = { v: 0 };
        gsap.to(proxy, {
          v: target,
          duration: 1.1,
          ease: 'power2.out',
          onUpdate: function() { write(proxy.v); },
          onComplete: function() { write(target); }
        });
      }
    };
  }

  // ═══════════════════════════════════════════════════════════
  // bar — horizontal bars with gradient fill
  // ═══════════════════════════════════════════════════════════

  function buildBar(fig) {
    var values = nums(fig, 'data-values');
    var labels = list(fig, 'data-labels');
    var display = list(fig, 'data-display');
    var subs = list(fig, 'data-sub');
    var highlight = parseInt(fig.getAttribute('data-highlight'), 10);
    var max = parseFloat(fig.getAttribute('data-max')) || Math.max.apply(null, values) * 1.08;

    var n = values.length;
    var isNarrow = narrow();
    var W = isNarrow ? NW : 760;
    var gap = isNarrow ? 14 : 10;

    // Two row layouts. With sub-labels the name and value sit on their own
    // line above a full-width bar, so long descriptions have room to breathe;
    // without them the compact label-left form is tighter to read.
    var stacked = subs.length > 0 || isNarrow;
    var subLines = subs.length ? 2 : 0;
    var rowH = stacked ? (isNarrow ? 46 + subLines * 17 : 76) : 48;
    var H = n * rowH + (n - 1) * gap + 8;

    var labelW = 160;
    var valueW = 96;
    var trackX = stacked ? 0 : labelW + 12;
    var trackW = stacked ? W : W - trackX - valueW - 12;

    var svg = svgRoot(W, H, fig.getAttribute('data-title') || 'Bar chart');
    var fills = [];

    for (var i = 0; i < n; i++) {
      var y = i * (rowH + gap) + 4;
      var isHi = (i === highlight);
      var barH = stacked ? 16 : 18;
      var barY = y + (stacked ? 22 : (rowH - barH) / 2);

      svg.appendChild(el('text', {
        x: stacked ? 0 : labelW,
        y: stacked ? y + 12 : y + rowH / 2 + 4,
        'text-anchor': stacked ? 'start' : 'end',
        class: 'deck-chart__label' + (isHi ? ' is-hi' : '')
      }, labels[i] || ''));

      // Track
      svg.appendChild(el('rect', {
        x: trackX, y: barY, width: trackW, height: barH, rx: barH / 2,
        fill: C.faint, stroke: C.grid, 'stroke-width': 1
      }));

      // Fill
      var w = Math.max(0, Math.min(1, values[i] / max)) * trackW;
      var fill = el('rect', {
        x: trackX, y: barY, width: w, height: barH, rx: barH / 2,
        fill: 'url(#dc-brand)',
        opacity: isHi ? 1 : 0.78
      });
      if (isHi) fill.setAttribute('filter', 'url(#dc-glow-soft)');
      svg.appendChild(fill);
      fills.push({ node: fill, w: w });

      // Value
      svg.appendChild(el('text', {
        x: W, y: stacked ? y + 12 : barY + barH / 2 + 5, 'text-anchor': 'end',
        class: 'deck-chart__value' + (isHi ? ' is-hi' : '')
      }, display[i] || fmtNum(values[i])));

      if (stacked && subs[i]) {
        svg.appendChild(textLines(
          0, barY + barH + 16,
          isNarrow ? wrap(subs[i], 44) : [subs[i]],
          { class: 'deck-chart__sub' }, 17
        ));
      }
    }

    return {
      svg: svg,
      table: dataTable(labels, values, fig.getAttribute('data-title'), display),
      reset: function() {
        fills.forEach(function(f) { f.node.setAttribute('width', 0); });
      },
      play: function() {
        if (!animates()) {
          fills.forEach(function(f) { f.node.setAttribute('width', f.w); });
          return;
        }
        fills.forEach(function(f, i) {
          var p = { w: 0 };
          gsap.to(p, {
            w: f.w, duration: 0.85, delay: i * 0.1, ease: 'power3.out',
            onUpdate: function() { f.node.setAttribute('width', p.w); }
          });
        });
      }
    };
  }

  // ═══════════════════════════════════════════════════════════
  // waterfall — a full bar draining into labelled loss segments
  // ═══════════════════════════════════════════════════════════

  function buildWaterfall(fig) {
    var values = nums(fig, 'data-values');   // [start, -loss, -loss, ..., final]
    var labels = list(fig, 'data-labels');
    var display = list(fig, 'data-display');

    var isNarrow = narrow();
    var W = isNarrow ? NW : 760;
    var H = isNarrow ? 430 : 330;
    var padL = isNarrow ? 34 : 44, padR = 12, padT = 16;
    var padB = isNarrow ? 116 : 78;   // room for stacked labels in portrait
    var plotW = W - padL - padR;
    var plotH = H - padT - padB;
    var n = values.length;
    var slot = plotW / n;
    var barW = Math.min(84, slot * (isNarrow ? 0.72 : 0.62));

    var max = Math.max(values[0], values[n - 1]) * 1.05;
    var yOf = function(v) { return padT + plotH - (v / max) * plotH; };

    var svg = svgRoot(W, H, fig.getAttribute('data-title') || 'Waterfall chart');

    // Baseline + light gridlines
    [0, 0.25, 0.5, 0.75, 1].forEach(function(f) {
      var v = max * f;
      var y = yOf(v);
      svg.appendChild(el('line', {
        x1: padL, y1: y, x2: W - padR, y2: y,
        stroke: C.grid, 'stroke-width': 1
      }));
      svg.appendChild(el('text', {
        x: padL - 8, y: y + 4, 'text-anchor': 'end', class: 'deck-chart__tick'
      }, Math.round(v)));
    });

    var bars = [];
    var running = 0;

    for (var i = 0; i < n; i++) {
      var v = values[i];
      var isFirst = i === 0;
      var isLast = i === n - 1;
      var x = padL + slot * i + (slot - barW) / 2;
      var top, height, fill;

      if (isFirst) {
        running = v;
        top = yOf(v); height = plotH - (yOf(v) - padT);
        fill = 'url(#dc-brand)';
      } else if (isLast) {
        top = yOf(v); height = plotH - (yOf(v) - padT);
        fill = 'url(#dc-good)';
      } else {
        // Floating loss segment: hangs from the running total downward.
        var from = running;
        running = running + v;             // v is negative
        top = yOf(from);
        height = yOf(running) - yOf(from);
        fill = 'url(#dc-loss)';
      }

      // Connector from the previous bar's resting level.
      if (i > 0 && !isLast) {
        svg.appendChild(el('line', {
          x1: padL + slot * (i - 1) + (slot + barW) / 2, y1: top,
          x2: x, y2: top,
          stroke: 'rgba(255,255,255,0.18)', 'stroke-width': 1, 'stroke-dasharray': '3 3'
        }));
      }

      var rect = el('rect', {
        x: x, y: top, width: barW, height: Math.max(2, height), rx: 3, fill: fill
      });
      svg.appendChild(rect);
      bars.push({ node: rect, y: top, h: Math.max(2, height) });

      // Value on top of the bar
      svg.appendChild(el('text', {
        x: x + barW / 2, y: top - 7, 'text-anchor': 'middle',
        class: 'deck-chart__value' + (isFirst || isLast ? ' is-hi' : ' is-loss')
      }, display[i] || (v > 0 ? fmtNum(v) : fmtNum(v))));

      // Wrapped label below the axis
      svg.appendChild(textLines(
        x + barW / 2, padT + plotH + (isNarrow ? 22 : 20),
        wrap(labels[i] || '', isNarrow ? 8 : 14),
        { 'text-anchor': 'middle', class: 'deck-chart__label' },
        isNarrow ? 15 : 13
      ));
    }

    return {
      svg: svg,
      table: dataTable(labels, values, fig.getAttribute('data-title'), display),
      reset: function() {
        bars.forEach(function(b) {
          b.node.setAttribute('height', 0);
          b.node.setAttribute('y', b.y);
        });
      },
      play: function() {
        if (!animates()) {
          bars.forEach(function(b) { b.node.setAttribute('height', b.h); });
          return;
        }
        bars.forEach(function(b, i) {
          var p = { h: 0 };
          gsap.to(p, {
            h: b.h, duration: 0.6, delay: 0.12 + i * 0.16, ease: 'power2.out',
            onUpdate: function() { b.node.setAttribute('height', p.h); }
          });
        });
      }
    };
  }

  // ═══════════════════════════════════════════════════════════
  // donut — ring segments drawn on, with a count-up centre
  // ═══════════════════════════════════════════════════════════

  function buildDonut(fig) {
    var values = nums(fig, 'data-values');
    var labels = list(fig, 'data-labels');
    var centre = fig.getAttribute('data-center') || '';
    var centreLabel = fig.getAttribute('data-center-label') || '';

    // Portrait: donut on top, legend stacked underneath.
    var isNarrow = narrow();
    var W = isNarrow ? NW : 620;
    var H = isNarrow ? 480 : 300;
    var cx = isNarrow ? W / 2 : 150;
    var cy = isNarrow ? 150 : H / 2;
    var r = isNarrow ? 100 : 96;
    var stroke = isNarrow ? 30 : 30;
    var legendX = isNarrow ? 8 : 300;
    var legendTop = isNarrow ? 316 : cy - (values.length * 30) / 2;
    var legendStep = isNarrow ? 40 : 30;
    var total = values.reduce(function(a, b) { return a + b; }, 0) || 1;
    var circ = 2 * Math.PI * r;

    var svg = svgRoot(W, H, fig.getAttribute('data-title') || 'Donut chart');

    svg.appendChild(el('circle', {
      cx: cx, cy: cy, r: r, fill: 'none',
      stroke: C.faint, 'stroke-width': stroke
    }));

    var segs = [];
    var offset = 0;

    for (var i = 0; i < values.length; i++) {
      var frac = values[i] / total;
      var len = frac * circ;
      var seg = el('circle', {
        cx: cx, cy: cy, r: r, fill: 'none',
        stroke: SERIES[i % SERIES.length],
        'stroke-width': stroke,
        'stroke-dasharray': len + ' ' + (circ - len),
        'stroke-dashoffset': -offset,
        'stroke-linecap': 'butt',
        transform: 'rotate(-90 ' + cx + ' ' + cy + ')'
      });
      svg.appendChild(seg);
      segs.push({ node: seg, len: len, rest: circ - len, offset: offset });
      offset += len;

      // Legend
      var ly = legendTop + i * legendStep + 6;
      svg.appendChild(el('rect', {
        x: legendX, y: ly - 9, width: 11, height: 11, rx: 3,
        fill: SERIES[i % SERIES.length]
      }));
      svg.appendChild(el('text', {
        x: legendX + 20, y: ly, class: 'deck-chart__label'
      }, labels[i] || ''));
      svg.appendChild(el('text', {
        x: W - 8, y: ly, 'text-anchor': 'end', class: 'deck-chart__value'
      }, Math.round(frac * 100) + '%'));
    }

    if (centre) {
      svg.appendChild(el('text', {
        x: cx, y: cy + (centreLabel ? 0 : 10), 'text-anchor': 'middle',
        class: 'deck-chart__centre'
      }, centre));
    }
    if (centreLabel) {
      svg.appendChild(el('text', {
        x: cx, y: cy + 24, 'text-anchor': 'middle', class: 'deck-chart__sub'
      }, centreLabel));
    }

    return {
      svg: svg,
      table: dataTable(labels, values, fig.getAttribute('data-title')),
      reset: function() {
        segs.forEach(function(s) {
          s.node.setAttribute('stroke-dasharray', '0 ' + circ);
        });
      },
      play: function() {
        if (!animates()) {
          segs.forEach(function(s) {
            s.node.setAttribute('stroke-dasharray', s.len + ' ' + s.rest);
          });
          return;
        }
        segs.forEach(function(s, i) {
          var p = { l: 0 };
          gsap.to(p, {
            l: s.len, duration: 0.7, delay: 0.1 + i * 0.14, ease: 'power2.inOut',
            onUpdate: function() {
              s.node.setAttribute('stroke-dasharray', p.l + ' ' + (circ - p.l));
            }
          });
        });
      }
    };
  }

  // ═══════════════════════════════════════════════════════════
  // line — growth curve with area fill, travelling dot, milestone pins
  // ═══════════════════════════════════════════════════════════

  function buildLine(fig) {
    var values = nums(fig, 'data-values');
    var labels = list(fig, 'data-labels');
    var display = list(fig, 'data-display');
    var pins = list(fig, 'data-pins');   // index:Label pairs

    var isNarrow = narrow();
    var W = isNarrow ? NW : 760;
    var H = isNarrow ? 300 : 320;
    var padL = isNarrow ? 16 : 60;
    var padR = isNarrow ? 20 : 24;
    var padT = 30, padB = 56;
    var plotW = W - padL - padR;
    var plotH = H - padT - padB;
    var max = Math.max.apply(null, values) * 1.18;

    var xOf = function(i) { return padL + (i / (values.length - 1)) * plotW; };
    var yOf = function(v) { return padT + plotH - (v / max) * plotH; };

    var svg = svgRoot(W, H, fig.getAttribute('data-title') || 'Line chart');

    // Gridlines + y ticks
    [0, 0.5, 1].forEach(function(f) {
      var y = padT + plotH - f * plotH;
      svg.appendChild(el('line', {
        x1: padL, y1: y, x2: W - padR, y2: y, stroke: C.grid, 'stroke-width': 1
      }));
    });

    // Build the path (smoothed with a light cardinal-style curve)
    var d = '';
    for (var i = 0; i < values.length; i++) {
      var x = xOf(i), y = yOf(values[i]);
      if (i === 0) {
        d += 'M' + x + ',' + y;
      } else {
        var px = xOf(i - 1), py = yOf(values[i - 1]);
        var cx1 = px + (x - px) * 0.5, cx2 = x - (x - px) * 0.5;
        d += ' C' + cx1 + ',' + py + ' ' + cx2 + ',' + y + ' ' + x + ',' + y;
      }
    }

    // Area under the curve
    var area = el('path', {
      d: d + ' L' + xOf(values.length - 1) + ',' + (padT + plotH) + ' L' + padL + ',' + (padT + plotH) + ' Z',
      fill: 'url(#dc-area)', opacity: 1
    });
    svg.appendChild(area);

    var path = el('path', {
      d: d, fill: 'none', stroke: 'url(#dc-full)',
      'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
    });
    svg.appendChild(path);

    // X labels + point markers
    var dots = [];
    for (var j = 0; j < values.length; j++) {
      svg.appendChild(el('text', {
        x: xOf(j), y: padT + plotH + 22, 'text-anchor': 'middle', class: 'deck-chart__label'
      }, labels[j] || ''));

      var dot = el('circle', {
        cx: xOf(j), cy: yOf(values[j]), r: 5,
        fill: '#12121a', stroke: C.blue, 'stroke-width': 2.5
      });
      svg.appendChild(dot);
      dots.push(dot);

      if (display[j]) {
        svg.appendChild(el('text', {
          x: xOf(j), y: yOf(values[j]) - 14, 'text-anchor': 'middle', class: 'deck-chart__value is-hi'
        }, display[j]));
      }
    }

    // Milestone pins: "2:First case studies"
    pins.forEach(function(p) {
      var parts = p.split(':');
      var idx = parseInt(parts[0], 10);
      if (isNaN(idx)) return;
      var px = xOf(idx);
      svg.appendChild(el('line', {
        x1: px, y1: yOf(values[idx]), x2: px, y2: padT + plotH,
        stroke: 'rgba(255,255,255,0.16)', 'stroke-width': 1, 'stroke-dasharray': '3 4'
      }));
    });

    var len = path.getTotalLength ? 0 : 0;   // measured lazily on first play

    function measure() {
      try { return path.getTotalLength(); } catch (e) { return 0; }
    }

    return {
      svg: svg,
      table: dataTable(labels, values, fig.getAttribute('data-title'), display),
      reset: function() {
        if (!animates()) return;
        len = measure();
        if (!len) return;
        path.setAttribute('stroke-dasharray', len);
        path.setAttribute('stroke-dashoffset', len);
        area.setAttribute('opacity', 0);
        dots.forEach(function(dt) { dt.setAttribute('opacity', 0); });
      },
      play: function() {
        if (!animates()) return;
        len = len || measure();
        if (!len) return;
        var p = { o: len };
        gsap.to(p, {
          o: 0, duration: 1.3, delay: 0.15, ease: 'power2.inOut',
          onUpdate: function() { path.setAttribute('stroke-dashoffset', p.o); },
          onComplete: function() { path.removeAttribute('stroke-dasharray'); }
        });
        gsap.to(area, { attr: { opacity: 1 }, duration: 0.9, delay: 0.5, ease: 'power1.out' });
        dots.forEach(function(dt, i) {
          gsap.to(dt, {
            attr: { opacity: 1 },
            duration: 0.3,
            delay: 0.25 + (i / Math.max(1, dots.length - 1)) * 1.1,
            ease: 'power2.out'
          });
        });
      }
    };
  }

  // ═══════════════════════════════════════════════════════════
  // quadrant — 2×2 positioning scatter
  // ═══════════════════════════════════════════════════════════

  function buildQuadrant(fig) {
    // data-points="Label|x|y|hi; Label|x|y"  (x/y are 0..100)
    var raw = (fig.getAttribute('data-points') || '').split(';');
    var xLabel = fig.getAttribute('data-x-label') || '';
    var yLabel = fig.getAttribute('data-y-label') || '';

    // Portrait keeps the plot square but moves the names into a numbered
    // legend below — five labels inside a 340px box is unreadable overlap.
    var isNarrow = narrow();
    var raw2 = raw.map(function(e) {
      return e.split('|').map(function(s) { return s.trim(); });
    }).filter(function(p) { return p.length >= 3 && p[0]; });

    var W = isNarrow ? NW : 620;
    var legendH = isNarrow ? raw2.length * 30 + 16 : 0;
    var H = (isNarrow ? 360 : 400) + legendH;
    var padL = isNarrow ? 34 : 58;
    var padR = isNarrow ? 18 : 26;
    var padT = 22;
    var padB = 52 + legendH;
    var plotW = W - padL - padR;
    var plotH = H - padT - padB;

    var xOf = function(v) { return padL + (v / 100) * plotW; };
    var yOf = function(v) { return padT + plotH - (v / 100) * plotH; };

    var svg = svgRoot(W, H, fig.getAttribute('data-title') || 'Positioning quadrant');

    // Winning quadrant wash
    svg.appendChild(el('rect', {
      x: xOf(50), y: yOf(100), width: plotW / 2, height: plotH / 2,
      fill: 'rgba(67,169,223,0.05)'
    }));

    // Frame + midlines
    svg.appendChild(el('rect', {
      x: padL, y: padT, width: plotW, height: plotH,
      fill: 'none', stroke: C.grid, 'stroke-width': 1, rx: 6
    }));
    svg.appendChild(el('line', {
      x1: xOf(50), y1: padT, x2: xOf(50), y2: padT + plotH,
      stroke: C.grid, 'stroke-width': 1, 'stroke-dasharray': '4 5'
    }));
    svg.appendChild(el('line', {
      x1: padL, y1: yOf(50), x2: padL + plotW, y2: yOf(50),
      stroke: C.grid, 'stroke-width': 1, 'stroke-dasharray': '4 5'
    }));

    // Axis labels with arrows
    svg.appendChild(el('text', {
      x: padL + plotW / 2, y: padT + plotH + 32, 'text-anchor': 'middle', class: 'deck-chart__axis'
    }, xLabel + ' →'));
    // A rotated axis caption is hard to read on a phone; portrait puts it
    // horizontally above the plot instead.
    if (isNarrow) {
      svg.appendChild(el('text', {
        x: 0, y: padT - 6, class: 'deck-chart__axis'
      }, '↑ ' + yLabel));
    } else {
      svg.appendChild(el('text', {
        x: 0, y: 0, 'text-anchor': 'middle', class: 'deck-chart__axis',
        transform: 'translate(18,' + (padT + plotH / 2) + ') rotate(-90)'
      }, yLabel + ' →'));
    }

    var pts = [];
    var labelsA11y = [], valsA11y = [];

    raw2.forEach(function(parts, idx) {
      var name = parts[0];
      var x = xOf(parseFloat(parts[1]));
      var y = yOf(parseFloat(parts[2]));
      var hi = parts[3] === 'hi';

      labelsA11y.push(name);
      valsA11y.push(parts[1] + ', ' + parts[2]);

      var g = el('g', { class: 'deck-chart__point' + (hi ? ' is-hi' : '') });

      if (hi) {
        var halo = el('circle', { cx: x, cy: y, r: 9, fill: C.blue, opacity: 0.28 });
        halo.classList.add('deck-chart__pulse');
        g.appendChild(halo);
      }

      g.appendChild(el('circle', {
        cx: x, cy: y, r: hi ? (isNarrow ? 11 : 8) : (isNarrow ? 9 : 5.5),
        fill: hi ? 'url(#dc-brand)' : 'rgba(255,255,255,0.32)',
        stroke: hi ? '#ffffff' : 'transparent',
        'stroke-width': hi ? 1.5 : 0,
        filter: hi ? 'url(#dc-glow-soft)' : null
      }));

      if (isNarrow) {
        // Numbered dot + matching legend row underneath the plot.
        g.appendChild(el('text', {
          x: x, y: y + 5, 'text-anchor': 'middle', class: 'deck-chart__node',
          fill: hi ? '#ffffff' : 'rgba(255,255,255,0.75)'
        }, String(idx + 1)));

        var ly2 = padT + plotH + 52 + idx * 30;
        g.appendChild(el('circle', {
          cx: 10, cy: ly2 - 5, r: 9,
          fill: hi ? 'url(#dc-brand)' : 'rgba(255,255,255,0.14)'
        }));
        g.appendChild(el('text', {
          x: 10, y: ly2, 'text-anchor': 'middle', class: 'deck-chart__node'
        }, String(idx + 1)));
        g.appendChild(el('text', {
          x: 28, y: ly2, class: 'deck-chart__label' + (hi ? ' is-hi' : '')
        }, name));
      } else {
        // Keep labels inside the frame: points near the right edge get their
        // label to the left of the dot rather than overflowing.
        var anchor = x > padL + plotW - 110 ? 'end' : 'middle';
        var lx = anchor === 'end' ? x - (hi ? 18 : 13) : x;
        var ly = anchor === 'end' ? y + 4 : y - (hi ? 18 : 14);

        g.appendChild(el('text', {
          x: lx, y: ly, 'text-anchor': anchor,
          class: 'deck-chart__label' + (hi ? ' is-hi' : '')
        }, name));
      }

      svg.appendChild(g);
      pts.push(g);
    });

    return {
      svg: svg,
      table: dataTable(labelsA11y, valsA11y, fig.getAttribute('data-title')),
      reset: function() {
        if (!animates()) return;
        pts.forEach(function(g) {
          gsap.set(g, { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' });
        });
      },
      play: function() {
        if (!animates()) return;
        // Competitors settle first; Refractive lands last and holds the eye.
        var ordered = pts.slice();
        gsap.to(ordered, {
          opacity: 1, scale: 1, transformOrigin: '50% 50%',
          duration: 0.5, stagger: 0.11, delay: 0.2, ease: 'back.out(1.7)'
        });
      }
    };
  }

  // ═══════════════════════════════════════════════════════════
  // funnel — stages narrowing, with leak arrows peeling off
  // ═══════════════════════════════════════════════════════════

  function buildFunnel(fig) {
    var values = nums(fig, 'data-values');
    var labels = list(fig, 'data-labels');
    var subs = list(fig, 'data-sub');
    var leaks = list(fig, 'data-leaks');
    var showLeaks = fig.getAttribute('data-leaks') !== null;

    var n = values.length;
    var isNarrow = narrow();
    var stageH = isNarrow ? (showLeaks ? 96 : 78) : 62;
    var gap = 8;
    var H = n * stageH + (n - 1) * gap + 16;

    // With leak arrows the funnel narrows too far to hold its own labels, so
    // the text moves to a column on the left and leaks fan out to the right.
    // Without leaks the stages are wide enough to carry the text inside.
    // Portrait has room for neither, so the text sits above each stage.
    var W = isNarrow ? NW : (showLeaks ? 940 : 760);
    var textRight = showLeaks ? 300 : 0;
    var maxW = isNarrow ? W * 0.94 : (showLeaks ? 290 : 660);
    var cx = isNarrow ? W / 2 : (showLeaks ? 470 : W / 2);
    var leakX = cx + maxW / 2 + 20;
    var max = Math.max.apply(null, values);

    var svg = svgRoot(W, H, fig.getAttribute('data-title') || 'Funnel');

    var stages = [], leakEls = [];

    for (var i = 0; i < n; i++) {
      var y = 8 + i * (stageH + gap);
      var wTop = (values[i] / max) * maxW;
      var wBot = (values[i + 1] !== undefined ? values[i + 1] / max : values[i] / max) * maxW;

      var x1 = cx - wTop / 2, x2 = cx + wTop / 2;
      var x3 = cx + wBot / 2, x4 = cx - wBot / 2;

      var g = el('g');
      g.appendChild(el('path', {
        d: 'M' + x1 + ',' + y + ' L' + x2 + ',' + y + ' L' + x3 + ',' + (y + stageH) + ' L' + x4 + ',' + (y + stageH) + ' Z',
        fill: 'url(#dc-brand)',
        opacity: 0.24 + (0.6 * (1 - i / Math.max(1, n - 1)))
      }));
      g.appendChild(el('path', {
        d: 'M' + x1 + ',' + y + ' L' + x2 + ',' + y,
        stroke: C.blue, 'stroke-width': 1.5, opacity: 0.6, fill: 'none'
      }));

      if (isNarrow) {
        // Label above the stage, description and leak below it.
        g.appendChild(el('text', {
          x: cx, y: y + 22, 'text-anchor': 'middle', class: 'deck-chart__stage'
        }, labels[i] || ''));
        if (subs[i]) {
          g.appendChild(textLines(
            cx, y + 42, wrap(subs[i], 40),
            { 'text-anchor': 'middle', class: 'deck-chart__sub' }, 15
          ));
        }
      } else if (showLeaks) {
        g.appendChild(el('text', {
          x: textRight, y: y + (subs[i] ? 24 : stageH / 2 + 5), 'text-anchor': 'end',
          class: 'deck-chart__stage'
        }, labels[i] || ''));
        if (subs[i]) {
          g.appendChild(textLines(
            textRight, y + 40, wrap(subs[i], 44),
            { 'text-anchor': 'end', class: 'deck-chart__sub' }, 13
          ));
        }
      } else {
        g.appendChild(el('text', {
          x: cx, y: y + (subs[i] ? 26 : stageH / 2 + 5), 'text-anchor': 'middle',
          class: 'deck-chart__stage'
        }, labels[i] || ''));
        if (subs[i]) {
          g.appendChild(el('text', {
            x: cx, y: y + 44, 'text-anchor': 'middle', class: 'deck-chart__sub'
          }, subs[i]));
        }
      }

      svg.appendChild(g);
      stages.push(g);

      // Leak marker: an arrow out to the right in landscape, a labelled note
      // beneath the stage in portrait where there is no room to the side.
      if (showLeaks && leaks[i]) {
        var lg = el('g');
        if (isNarrow) {
          lg.appendChild(el('text', {
            x: cx, y: y + stageH - 6, 'text-anchor': 'middle', class: 'deck-chart__leak'
          }, '→ ' + leaks[i]));
        } else {
          var ly = y + stageH / 2;
          lg.appendChild(el('path', {
            d: 'M' + (x2 + 8) + ',' + ly + ' L' + (leakX + 26) + ',' + ly,
            stroke: C.loss, 'stroke-width': 1.4, 'stroke-dasharray': '4 4', fill: 'none'
          }));
          lg.appendChild(el('path', {
            d: 'M' + (leakX + 20) + ',' + (ly - 4) + ' L' + (leakX + 28) + ',' + ly +
               ' L' + (leakX + 20) + ',' + (ly + 4) + ' Z',
            fill: C.loss
          }));
          lg.appendChild(el('text', {
            x: leakX + 36, y: ly + 4, class: 'deck-chart__leak'
          }, leaks[i]));
        }
        svg.appendChild(lg);
        leakEls.push(lg);
      }
    }

    return {
      svg: svg,
      // Funnel values only drive geometry, so the linear version reads out the
      // stage descriptions rather than numbers that are never shown.
      table: dataTable(labels, subs.length ? subs : values, fig.getAttribute('data-title')),
      reset: function() {
        if (!animates()) return;
        gsap.set(stages, { opacity: 0, y: -14 });
        if (leakEls.length) gsap.set(leakEls, { opacity: 0, x: -12 });
      },
      play: function() {
        if (!animates()) return;
        gsap.to(stages, {
          opacity: 1, y: 0, duration: 0.5, stagger: 0.13, delay: 0.15, ease: 'power2.out'
        });
        if (leakEls.length) {
          gsap.to(leakEls, {
            opacity: 1, x: 0, duration: 0.45, stagger: 0.13, delay: 0.5, ease: 'power2.out'
          });
        }
      }
    };
  }

  // ═══════════════════════════════════════════════════════════
  // prism-split — the signature graphic: white light into four beams
  // ═══════════════════════════════════════════════════════════

  function buildPrismSplit(fig) {
    var labels = list(fig, 'data-labels');
    var subs = list(fig, 'data-sub');
    var outcomes = list(fig, 'data-outcomes');

    if (narrow()) return prismSplitPortrait(fig, labels, subs, outcomes);

    // Wide and short: the slide gives this chart the full card width, so a
    // ~2.8:1 box fills it instead of letterboxing.
    var W = 900, H = 320;
    var cx = 178, cy = H / 2;
    var size = 74;

    var svg = svgRoot(W, H, fig.getAttribute('data-title') || 'One system refracted into four pillars');

    // ── Incoming white beam ──
    var beamIn = el('path', {
      d: 'M6,' + cy + ' L' + (cx - size * 0.42) + ',' + cy,
      stroke: 'url(#dc-white)', 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round'
    });
    svg.appendChild(beamIn);

    svg.appendChild(el('text', {
      x: 6, y: cy - 28, class: 'deck-chart__label'
    }, 'One brand. One budget.'));

    // ── Prism body ──
    var prism = el('g', { filter: 'url(#dc-glow-soft)' });
    var tri = 'M' + cx + ',' + (cy - size) +
              ' L' + (cx + size * 0.88) + ',' + (cy + size * 0.62) +
              ' L' + (cx - size * 0.88) + ',' + (cy + size * 0.62) + ' Z';
    prism.appendChild(el('path', {
      d: tri, fill: 'rgba(255,255,255,0.045)',
      stroke: 'rgba(255,255,255,0.5)', 'stroke-width': 1.5, 'stroke-linejoin': 'round'
    }));
    prism.appendChild(el('path', {
      d: tri, fill: 'url(#dc-brand)', opacity: 0.14
    }));
    svg.appendChild(prism);

    // ── Four refracted beams ──
    var startX = cx + size * 0.5;
    var endX = 408;
    var rowH = 74;
    var top = cy - (labels.length - 1) * rowH / 2;

    var beams = [], rows = [];

    for (var i = 0; i < labels.length; i++) {
      var ty = top + i * rowH;
      var colour = SERIES[i % SERIES.length];

      // Beam curves out of the prism face toward its label row.
      var beam = el('path', {
        d: 'M' + startX + ',' + cy +
           ' C' + (startX + 60) + ',' + cy + ' ' + (endX - 80) + ',' + ty + ' ' + endX + ',' + ty,
        stroke: colour, 'stroke-width': 3, fill: 'none',
        'stroke-linecap': 'round', opacity: 0.85
      });
      svg.appendChild(beam);
      beams.push(beam);

      // Label block at the end of the beam
      var row = el('g');
      row.appendChild(el('circle', { cx: endX + 8, cy: ty, r: 4, fill: colour }));
      row.appendChild(el('text', {
        x: endX + 22, y: ty - (outcomes[i] ? 4 : -5), class: 'deck-chart__stage'
      }, labels[i] || ''));
      if (subs[i]) {
        row.appendChild(el('text', {
          x: endX + 22, y: ty + 12, class: 'deck-chart__sub'
        }, subs[i]));
      }
      if (outcomes[i]) {
        row.appendChild(el('text', {
          x: endX + 22, y: ty + (subs[i] ? 26 : 12), class: 'deck-chart__outcome'
        }, outcomes[i]));
      }
      svg.appendChild(row);
      rows.push(row);
    }

    return {
      svg: svg,
      table: dataTable(labels, subs, fig.getAttribute('data-title')),
      reset: function() {
        if (!animates()) return;
        gsap.set(beamIn, { opacity: 0, scaleX: 0, transformOrigin: '0% 50%' });
        gsap.set(prism, { opacity: 0, scale: 0.75, transformOrigin: '50% 50%' });
        beams.forEach(function(b) {
          var len = b.getTotalLength ? b.getTotalLength() : 400;
          b.setAttribute('stroke-dasharray', len);
          b.setAttribute('stroke-dashoffset', len);
        });
        gsap.set(rows, { opacity: 0, x: 18 });
      },
      play: function() {
        if (!animates()) return;
        var tl = gsap.timeline({ delay: 0.1 });
        tl.to(beamIn, { opacity: 1, scaleX: 1, duration: 0.4, ease: 'power2.out' });
        tl.to(prism, { opacity: 1, scale: 1, duration: 0.42, ease: 'back.out(1.6)' }, '-=0.18');

        beams.forEach(function(b, i) {
          var len = b.getTotalLength ? b.getTotalLength() : 400;
          var p = { o: len };
          tl.to(p, {
            o: 0, duration: 0.45, ease: 'power2.out',
            onUpdate: function() { b.setAttribute('stroke-dashoffset', p.o); }
          }, 0.48 + i * 0.08);
        });

        tl.to(rows, {
          opacity: 1, x: 0, duration: 0.38, stagger: 0.08, ease: 'power2.out'
        }, 0.62);
      }
    };
  }

  // Portrait prism: light enters from the top, disperses through the prism,
  // and the four pillars stack below as colour-keyed rows. Beams fan but do
  // not run to the rows — on a 380-unit canvas connector lines would cross
  // the text they are meant to label.
  function prismSplitPortrait(fig, labels, subs, outcomes) {
    var W = NW, H = 552;
    var cx = W / 2;
    var apexY = 74, size = 40;
    var baseY = apexY + size * 1.7;
    var halfW = size * 1.05;

    var svg = svgRoot(W, H, fig.getAttribute('data-title') || 'One system refracted into four pillars');

    var beamIn = el('path', {
      d: 'M' + cx + ',6 L' + cx + ',' + (apexY - 2),
      stroke: 'url(#dc-white)', 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round'
    });
    svg.appendChild(beamIn);

    svg.appendChild(el('text', {
      x: cx, y: 26, 'text-anchor': 'middle', class: 'deck-chart__label'
    }, 'One brand. One budget.'));

    var prism = el('g', { filter: 'url(#dc-glow-soft)' });
    var tri = 'M' + cx + ',' + apexY +
              ' L' + (cx + halfW) + ',' + baseY +
              ' L' + (cx - halfW) + ',' + baseY + ' Z';
    prism.appendChild(el('path', {
      d: tri, fill: 'rgba(255,255,255,0.045)',
      stroke: 'rgba(255,255,255,0.5)', 'stroke-width': 1.5, 'stroke-linejoin': 'round'
    }));
    prism.appendChild(el('path', { d: tri, fill: 'url(#dc-brand)', opacity: 0.14 }));
    svg.appendChild(prism);

    var fanY = baseY + 62;
    var rowTop = fanY + 34;
    var rowH = 78;

    var beams = [], rows = [];

    for (var i = 0; i < labels.length; i++) {
      var colour = SERIES[i % SERIES.length];
      var toX = (W / labels.length) * (i + 0.5);

      var beam = el('path', {
        d: 'M' + cx + ',' + (baseY - 4) +
           ' C' + cx + ',' + (baseY + 26) + ' ' + toX + ',' + (fanY - 24) + ' ' + toX + ',' + fanY,
        stroke: colour, 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round', opacity: 0.85
      });
      svg.appendChild(beam);
      beams.push(beam);

      var ry = rowTop + i * rowH;
      var row = el('g');
      row.appendChild(el('rect', { x: 6, y: ry - 14, width: 3, height: rowH - 20, rx: 1.5, fill: colour }));
      row.appendChild(el('text', { x: 22, y: ry, class: 'deck-chart__stage' }, labels[i] || ''));
      if (subs[i]) {
        row.appendChild(textLines(22, ry + 18, wrap(subs[i], 46),
          { class: 'deck-chart__sub' }, 15));
      }
      if (outcomes[i]) {
        row.appendChild(el('text', { x: 22, y: ry + (subs[i] ? 52 : 18), class: 'deck-chart__outcome' }, outcomes[i]));
      }
      svg.appendChild(row);
      rows.push(row);
    }

    return {
      svg: svg,
      table: dataTable(labels, subs, fig.getAttribute('data-title')),
      reset: function() {
        if (!animates()) return;
        gsap.set(beamIn, { opacity: 0, scaleY: 0, transformOrigin: '50% 0%' });
        gsap.set(prism, { opacity: 0, scale: 0.75, transformOrigin: '50% 50%' });
        beams.forEach(function(b) {
          var len = b.getTotalLength ? b.getTotalLength() : 120;
          b.setAttribute('stroke-dasharray', len);
          b.setAttribute('stroke-dashoffset', len);
        });
        gsap.set(rows, { opacity: 0, y: 14 });
      },
      play: function() {
        if (!animates()) return;
        var tl = gsap.timeline({ delay: 0.1 });
        tl.to(beamIn, { opacity: 1, scaleY: 1, duration: 0.4, ease: 'power2.out' });
        tl.to(prism, { opacity: 1, scale: 1, duration: 0.42, ease: 'back.out(1.6)' }, '-=0.18');
        beams.forEach(function(b, i) {
          var len = b.getTotalLength ? b.getTotalLength() : 120;
          var p = { o: len };
          tl.to(p, {
            o: 0, duration: 0.4, ease: 'power2.out',
            onUpdate: function() { b.setAttribute('stroke-dashoffset', p.o); }
          }, 0.46 + i * 0.07);
        });
        tl.to(rows, { opacity: 1, y: 0, duration: 0.36, stagger: 0.08, ease: 'power2.out' }, 0.6);
      }
    };
  }

  // ═══════════════════════════════════════════════════════════
  // node-collapse — scattered vendors merging into one team
  // ═══════════════════════════════════════════════════════════

  function buildNodeCollapse(fig) {
    var from = list(fig, 'data-from');
    var to = fig.getAttribute('data-to') || 'One Refractive pod';

    // Portrait stacks the two states vertically: tangle on top, arrow down,
    // single pod below. Landscape puts them side by side.
    var isNarrow = narrow();
    var W = isNarrow ? NW : 760;
    var H = isNarrow ? 520 : 300;
    var leftCx = isNarrow ? W / 2 : 180;
    var rightCx = isNarrow ? W / 2 : 590;
    var cy = isNarrow ? 128 : H / 2;
    var targetCy = isNarrow ? 400 : cy;

    var svg = svgRoot(W, H, fig.getAttribute('data-title') || 'Fragmented vendors versus one team');

    // ── Left (or top): tangled vendor nodes ──
    var scatter = isNarrow ? [
      [leftCx, cy - 96], [leftCx - 112, cy - 22], [leftCx + 112, cy - 22],
      [leftCx - 74, cy + 84], [leftCx + 74, cy + 84]
    ] : [
      [leftCx, cy - 96], [leftCx - 108, cy - 26], [leftCx + 104, cy - 34],
      [leftCx - 74, cy + 78], [leftCx + 84, cy + 74]
    ];

    var linkGroup = el('g', { opacity: 0.55 });
    for (var a = 0; a < scatter.length; a++) {
      for (var b = a + 1; b < scatter.length; b++) {
        linkGroup.appendChild(el('line', {
          x1: scatter[a][0], y1: scatter[a][1], x2: scatter[b][0], y2: scatter[b][1],
          stroke: C.loss, 'stroke-width': 1, opacity: 0.4, 'stroke-dasharray': '3 4'
        }));
      }
    }
    svg.appendChild(linkGroup);

    var nodes = [];
    from.forEach(function(name, i) {
      if (i >= scatter.length) return;
      var g = el('g');
      g.appendChild(el('circle', {
        cx: scatter[i][0], cy: scatter[i][1], r: 26,
        fill: 'rgba(255,255,255,0.04)', stroke: 'rgba(255,255,255,0.16)', 'stroke-width': 1
      }));
      g.appendChild(textLines(
        scatter[i][0], scatter[i][1] + (wrap(name, 11).length > 1 ? -2 : 3),
        wrap(name, 11),
        { 'text-anchor': 'middle', class: 'deck-chart__node' }, 11
      ));
      svg.appendChild(g);
      nodes.push(g);
    });

    svg.appendChild(el('text', {
      x: leftCx, y: isNarrow ? cy + 138 : H - 6, 'text-anchor': 'middle', class: 'deck-chart__axis'
    }, 'Today: ' + from.length + ' vendors, ' + (from.length * (from.length - 1) / 2) + ' handoffs'));

    // ── Arrow ──
    var arrow = el('g');
    if (isNarrow) {
      arrow.appendChild(el('line', {
        x1: W / 2, y1: cy + 160, x2: W / 2, y2: targetCy - 76,
        stroke: 'url(#dc-brand-v)', 'stroke-width': 2
      }));
      arrow.appendChild(el('path', {
        d: 'M' + (W / 2 - 6) + ',' + (targetCy - 82) + ' L' + (W / 2) + ',' + (targetCy - 70) +
           ' L' + (W / 2 + 6) + ',' + (targetCy - 82) + ' Z', fill: C.violet
      }));
    } else {
      arrow.appendChild(el('line', {
        x1: 330, y1: cy, x2: 452, y2: cy,
        stroke: 'url(#dc-brand)', 'stroke-width': 2
      }));
      arrow.appendChild(el('path', {
        d: 'M446,' + (cy - 6) + ' L458,' + cy + ' L446,' + (cy + 6) + ' Z', fill: C.violet
      }));
    }
    svg.appendChild(arrow);

    // ── Right (or bottom): single unified node ──
    var target = el('g');
    target.appendChild(el('circle', {
      cx: rightCx, cy: targetCy, r: 62, fill: 'rgba(67,169,223,0.08)',
      stroke: C.blue, 'stroke-width': 1.5, filter: 'url(#dc-glow-soft)'
    }));
    target.appendChild(textLines(
      rightCx, targetCy - 4, wrap(to, 12),
      { 'text-anchor': 'middle', class: 'deck-chart__stage' }, 15
    ));
    svg.appendChild(target);

    svg.appendChild(el('text', {
      x: rightCx, y: isNarrow ? H - 6 : H - 6, 'text-anchor': 'middle', class: 'deck-chart__axis'
    }, 'Refractive: one team, zero handoffs'));

    return {
      svg: svg,
      table: dataTable(from, from.map(function() { return 'separate vendor'; }), fig.getAttribute('data-title')),
      reset: function() {
        if (!animates()) return;
        gsap.set(nodes, { opacity: 0, scale: 0.5, transformOrigin: '50% 50%' });
        gsap.set(linkGroup, { opacity: 0 });
        gsap.set(arrow, { opacity: 0, x: -20 });
        gsap.set(target, { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' });
      },
      play: function() {
        if (!animates()) return;
        var tl = gsap.timeline({ delay: 0.1 });
        tl.to(nodes, { opacity: 1, scale: 1, duration: 0.34, stagger: 0.05, ease: 'back.out(1.6)' });
        tl.to(linkGroup, { opacity: 0.55, duration: 0.3 }, '-=0.2');
        tl.to(arrow, { opacity: 1, x: 0, duration: 0.32, ease: 'power2.out' }, '-=0.05');
        tl.to(target, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.5)' }, '-=0.16');
      }
    };
  }

  // ═══════════════════════════════════════════════════════════
  // orbit — nested cadence rings turning at different speeds
  // ═══════════════════════════════════════════════════════════

  function buildOrbit(fig) {
    var labels = list(fig, 'data-labels');
    var subs = list(fig, 'data-sub');

    // Portrait puts the rings on top and the legend beneath them.
    var isNarrow = narrow();
    var W = isNarrow ? NW : 760;
    var H = isNarrow ? 560 : 340;
    var cx = isNarrow ? W / 2 : 175;
    var cy = isNarrow ? 172 : H / 2;
    var legendX = isNarrow ? 8 : 380;
    var legendTop = isNarrow ? 370 : cy - (labels.length * 42) / 2;
    var legendStep = isNarrow ? 48 : 42;

    var svg = svgRoot(W, H, fig.getAttribute('data-title') || 'Operating cadence');

    var radii = isNarrow ? [154, 118, 82, 46] : [140, 108, 76, 44];
    var rings = [], rowEls = [];

    labels.forEach(function(label, i) {
      var r = radii[i % radii.length];
      var colour = SERIES[i % SERIES.length];
      var circ = 2 * Math.PI * r;

      // Ring and its marker share a group so the marker actually orbits.
      var ring = el('g');
      ring.appendChild(el('circle', {
        cx: cx, cy: cy, r: r, fill: 'none',
        stroke: colour, 'stroke-width': 2, opacity: 0.55,
        'stroke-dasharray': (circ * 0.62) + ' ' + (circ * 0.38)
      }));
      ring.appendChild(el('circle', { cx: cx + r, cy: cy, r: 5, fill: colour }));
      svg.appendChild(ring);
      // Tighter cadences turn faster: weekly laps quarterly.
      rings.push({ node: ring, dur: 12 + i * 8 });

      // Legend row
      var ly = legendTop + i * legendStep + 12;
      var row = el('g');
      row.appendChild(el('rect', {
        x: legendX, y: ly - 12, width: 3, height: isNarrow ? 34 : 28, rx: 1.5, fill: colour
      }));
      row.appendChild(el('text', { x: legendX + 16, y: ly, class: 'deck-chart__stage' }, label));
      if (subs[i]) {
        row.appendChild(textLines(legendX + 16, ly + 17,
          isNarrow ? wrap(subs[i], 42) : [subs[i]],
          { class: 'deck-chart__sub' }, 15));
      }
      svg.appendChild(row);
      rowEls.push(row);
    });

    return {
      svg: svg,
      table: dataTable(labels, subs, fig.getAttribute('data-title')),
      reset: function() {
        if (!animates()) return;
        rings.forEach(function(r) {
          gsap.set(r.node, { opacity: 0, scale: 0.7, transformOrigin: cx + 'px ' + cy + 'px' });
        });
        gsap.set(rowEls, { opacity: 0, x: 16 });
      },
      play: function() {
        if (!animates()) return;
        rings.forEach(function(r, i) {
          gsap.to(r.node, {
            opacity: 0.55, scale: 1, duration: 0.6, delay: 0.15 + i * 0.1, ease: 'power2.out',
            transformOrigin: cx + 'px ' + cy + 'px'
          });
          // Continuous slow rotation — the cadence never stops turning.
          gsap.to(r.node, {
            rotation: 360, duration: r.dur, repeat: -1, ease: 'none',
            transformOrigin: cx + 'px ' + cy + 'px'
          });
        });
        gsap.to(rowEls, {
          opacity: 1, x: 0, duration: 0.45, stagger: 0.1, delay: 0.35, ease: 'power2.out'
        });
      }
    };
  }

  // ═══════════════════════════════════════════════════════════
  // gantt — week bars filling in sequence
  // ═══════════════════════════════════════════════════════════

  function buildGantt(fig) {
    var labels = list(fig, 'data-labels');
    var titles = list(fig, 'data-titles');
    var subs = list(fig, 'data-sub');

    var n = labels.length;
    var isNarrow = narrow();
    var W = isNarrow ? NW : 780;
    var rowH = isNarrow ? 96 : 66;
    var gap = 10;
    var H = n * rowH + (n - 1) * gap + 26;
    // Portrait drops the week label into the row rather than a left gutter.
    var labelW = isNarrow ? 0 : 88;
    var trackX = isNarrow ? 0 : labelW + 14;
    var trackW = W - trackX - (isNarrow ? 0 : 12);

    var svg = svgRoot(W, H, fig.getAttribute('data-title') || 'First 30 days');

    // Timeline rule
    svg.appendChild(el('line', {
      x1: trackX, y1: 12, x2: W - 12, y2: 12, stroke: C.grid, 'stroke-width': 1
    }));

    var fills = [];

    for (var i = 0; i < n; i++) {
      var y = 26 + i * (rowH + gap);
      var barH = isNarrow ? 30 : 40;

      // Each week starts where the previous ended and runs a quarter of the track,
      // so the bars read as a sequence rather than four parallel tasks.
      var segW = trackW / n;
      var x = trackX + i * segW * 0.62;
      var w = segW * 1.38;
      if (x + w > W - (isNarrow ? 0 : 12)) w = (W - (isNarrow ? 0 : 12)) - x;

      if (isNarrow) {
        svg.appendChild(el('text', {
          x: 0, y: y + 2, class: 'deck-chart__label is-hi'
        }, labels[i]));
      } else {
        svg.appendChild(el('text', {
          x: labelW, y: y + 26, 'text-anchor': 'end', class: 'deck-chart__label is-hi'
        }, labels[i]));
      }

      var barY = y + (isNarrow ? 12 : 6);

      svg.appendChild(el('rect', {
        x: trackX, y: barY, width: trackW, height: barH, rx: 8,
        fill: C.faint, stroke: C.grid, 'stroke-width': 1
      }));

      var fill = el('rect', {
        x: x, y: barY, width: w, height: barH, rx: 8,
        fill: 'url(#dc-brand)', opacity: 0.9 - i * 0.06
      });
      svg.appendChild(fill);
      fills.push({ node: fill, w: w, x: x });

      if (isNarrow) {
        // Title sits on the bar, description below it at full width.
        svg.appendChild(el('text', {
          x: x + 12, y: barY + 20, class: 'deck-chart__stage'
        }, titles[i] || ''));
        if (subs[i]) {
          svg.appendChild(textLines(0, barY + barH + 18, wrap(subs[i], 42),
            { class: 'deck-chart__sub' }, 15));
        }
      } else {
        svg.appendChild(el('text', {
          x: x + 14, y: y + 24, class: 'deck-chart__stage'
        }, titles[i] || ''));
        svg.appendChild(el('text', {
          x: x + 14, y: y + 39, class: 'deck-chart__sub'
        }, subs[i] || ''));
      }
    }

    return {
      svg: svg,
      table: dataTable(labels, titles, fig.getAttribute('data-title'), subs),
      reset: function() {
        fills.forEach(function(f) { f.node.setAttribute('width', 0); });
      },
      play: function() {
        if (!animates()) {
          fills.forEach(function(f) { f.node.setAttribute('width', f.w); });
          return;
        }
        fills.forEach(function(f, i) {
          var p = { w: 0 };
          gsap.to(p, {
            w: f.w, duration: 0.55, delay: 0.15 + i * 0.18, ease: 'power3.out',
            onUpdate: function() { f.node.setAttribute('width', p.w); }
          });
        });
      }
    };
  }

  // ═══════════════════════════════════════════════════════════
  // ladder — ascending steps
  // ═══════════════════════════════════════════════════════════

  function buildLadder(fig) {
    var labels = list(fig, 'data-labels');
    var subs = list(fig, 'data-sub');
    var display = list(fig, 'data-display');
    var highlight = parseInt(fig.getAttribute('data-highlight'), 10);

    var n = labels.length;

    // Side-by-side rungs do not survive a 380-unit canvas, so portrait turns
    // the ladder on its side: one row per rung, each wider than the last.
    if (narrow()) {
      var nW = NW, rowH = 74, nGap = 10;
      var nH = n * rowH + (n - 1) * nGap + 6;
      var nsvg = svgRoot(nW, nH, fig.getAttribute('data-title') || 'Progression');
      var nrows = [];

      for (var k = 0; k < n; k++) {
        var ry = k * (rowH + nGap) + 4;
        var rw = nW * (0.44 + 0.56 * ((k + 1) / n));
        var kHi = k === highlight;
        var rg = el('g');

        rg.appendChild(el('rect', {
          x: 0, y: ry, width: rw, height: rowH - 8, rx: 10,
          fill: kHi ? 'rgba(67,169,223,0.14)' : 'rgba(255,255,255,0.035)',
          stroke: kHi ? 'rgba(67,169,223,0.45)' : 'rgba(255,255,255,0.09)',
          'stroke-width': 1
        }));
        rg.appendChild(el('rect', {
          x: 0, y: ry, width: 4, height: rowH - 8, rx: 2, fill: SERIES[k % SERIES.length]
        }));
        rg.appendChild(el('text', { x: 16, y: ry + 22, class: 'deck-chart__stage' }, labels[k] || ''));
        if (display[k]) {
          rg.appendChild(el('text', {
            x: rw - 12, y: ry + 22, 'text-anchor': 'end', class: 'deck-chart__value is-hi'
          }, display[k]));
        }
        if (subs[k]) {
          rg.appendChild(textLines(16, ry + 42, wrap(subs[k], 40),
            { class: 'deck-chart__sub' }, 15));
        }
        nsvg.appendChild(rg);
        nrows.push(rg);
      }

      return {
        svg: nsvg,
        table: dataTable(labels, subs, fig.getAttribute('data-title'), display),
        reset: function() {
          if (!animates()) return;
          gsap.set(nrows, { opacity: 0, x: -18 });
        },
        play: function() {
          if (!animates()) return;
          gsap.to(nrows, {
            opacity: 1, x: 0, duration: 0.45, stagger: 0.1, delay: 0.15, ease: 'power2.out'
          });
        }
      };
    }

    var W = 780, H = 340;
    var padB = 62, padT = 34;
    var slot = W / n;
    var barW = Math.min(150, slot * 0.78);
    var maxH = H - padB - padT;

    var svg = svgRoot(W, H, fig.getAttribute('data-title') || 'Progression');

    // Baseline
    svg.appendChild(el('line', {
      x1: 8, y1: H - padB, x2: W - 8, y2: H - padB, stroke: C.grid, 'stroke-width': 1
    }));

    var steps = [];

    for (var i = 0; i < n; i++) {
      var frac = (i + 1) / n;
      var h = maxH * (0.34 + 0.66 * frac);
      var x = i * slot + (slot - barW) / 2;
      var y = H - padB - h;
      var isHi = i === highlight;

      var g = el('g');

      g.appendChild(el('rect', {
        x: x, y: y, width: barW, height: h, rx: 10,
        fill: isHi ? 'rgba(67,169,223,0.14)' : 'rgba(255,255,255,0.035)',
        stroke: isHi ? 'rgba(67,169,223,0.45)' : 'rgba(255,255,255,0.09)',
        'stroke-width': 1
      }));

      // Coloured cap so each step reads as its own rung.
      g.appendChild(el('rect', {
        x: x, y: y, width: barW, height: 4, rx: 2,
        fill: SERIES[i % SERIES.length]
      }));

      g.appendChild(textLines(
        x + barW / 2, y + 26, wrap(labels[i], 15),
        { 'text-anchor': 'middle', class: 'deck-chart__stage' }, 15
      ));

      if (display[i]) {
        g.appendChild(el('text', {
          x: x + barW / 2, y: y + 26 + wrap(labels[i], 15).length * 15 + 6,
          'text-anchor': 'middle', class: 'deck-chart__value is-hi'
        }, display[i]));
      }

      if (subs[i]) {
        g.appendChild(textLines(
          x + barW / 2, H - padB + 20, wrap(subs[i], 20),
          { 'text-anchor': 'middle', class: 'deck-chart__sub' }, 13
        ));
      }

      svg.appendChild(g);
      steps.push({ g: g, y: y, h: h });
    }

    // Rising arrow across the tops
    var arrowD = 'M' + (slot / 2) + ',' + (H - padB - maxH * 0.34 - 14) +
                 ' Q' + (W / 2) + ',' + (H - padB - maxH * 0.8) + ' ' +
                 (W - slot / 2) + ',' + (H - padB - maxH - 16);
    var arrow = el('path', {
      d: arrowD, fill: 'none', stroke: 'url(#dc-brand)',
      'stroke-width': 2, 'stroke-dasharray': '5 5', opacity: 0.5
    });
    svg.appendChild(arrow);

    return {
      svg: svg,
      table: dataTable(labels, subs, fig.getAttribute('data-title'), display),
      reset: function() {
        if (!animates()) return;
        steps.forEach(function(s) {
          gsap.set(s.g, { opacity: 0, y: 26 });
        });
        gsap.set(arrow, { opacity: 0 });
      },
      play: function() {
        if (!animates()) return;
        steps.forEach(function(s, i) {
          gsap.to(s.g, {
            opacity: 1, y: 0, duration: 0.5, delay: 0.15 + i * 0.13, ease: 'back.out(1.4)'
          });
        });
        gsap.to(arrow, { opacity: 0.5, duration: 0.6, delay: 0.2 + n * 0.13, ease: 'power2.out' });
      }
    };
  }

  // ═══════════════════════════════════════════════════════════
  // rail — horizontal timeline with a sweeping progress line
  // ═══════════════════════════════════════════════════════════

  function buildRail(fig) {
    var labels = list(fig, 'data-labels');
    var titles = list(fig, 'data-titles');
    var subs = list(fig, 'data-sub');

    var n = labels.length;
    var isNarrow = narrow();

    // Portrait runs the timeline top-to-bottom with the copy beside each stop.
    var W = isNarrow ? NW : 800;
    var stepY = 104;
    var H = isNarrow ? n * stepY + 30 : 240;
    var railX = 22;
    var railY = 74;
    var padX = 60;
    var span = W - padX * 2;
    var railStart = 24;
    var railEnd = isNarrow ? (n - 1) * stepY + 24 : 0;

    var svg = svgRoot(W, H, fig.getAttribute('data-title') || 'Timeline');

    var trackAttrs = isNarrow
      ? { x1: railX, y1: railStart, x2: railX, y2: railEnd }
      : { x1: padX, y1: railY, x2: W - padX, y2: railY };

    svg.appendChild(el('line', Object.assign({
      stroke: C.grid, 'stroke-width': 2, 'stroke-linecap': 'round'
    }, trackAttrs)));

    var sweep = el('line', Object.assign({
      stroke: 'url(#dc-full)', 'stroke-width': 2.5, 'stroke-linecap': 'round'
    }, trackAttrs));
    svg.appendChild(sweep);

    var stops = [];

    for (var i = 0; i < n; i++) {
      var g = el('g');
      var colour = SERIES[i % SERIES.length];

      if (isNarrow) {
        var sy = railStart + i * stepY;
        g.appendChild(el('circle', { cx: railX, cy: sy, r: 9, fill: '#15151c', stroke: colour, 'stroke-width': 2.5 }));
        g.appendChild(el('circle', { cx: railX, cy: sy, r: 3.5, fill: colour }));
        g.appendChild(el('text', { x: railX + 22, y: sy - 6, class: 'deck-chart__label is-hi' }, labels[i]));
        g.appendChild(el('text', { x: railX + 22, y: sy + 14, class: 'deck-chart__stage' }, titles[i] || ''));
        if (subs[i]) {
          g.appendChild(textLines(railX + 22, sy + 34, wrap(subs[i], 38),
            { class: 'deck-chart__sub' }, 15));
        }
      } else {
        var x = n === 1 ? W / 2 : padX + (i / (n - 1)) * span;
        g.appendChild(el('circle', { cx: x, cy: railY, r: 9, fill: '#15151c', stroke: colour, 'stroke-width': 2.5 }));
        g.appendChild(el('circle', { cx: x, cy: railY, r: 3.5, fill: colour }));
        g.appendChild(el('text', {
          x: x, y: railY - 26, 'text-anchor': 'middle', class: 'deck-chart__label is-hi'
        }, labels[i]));
        g.appendChild(el('text', {
          x: x, y: railY + 32, 'text-anchor': 'middle', class: 'deck-chart__stage'
        }, titles[i] || ''));
        if (subs[i]) {
          g.appendChild(textLines(
            x, railY + 52, wrap(subs[i], 22),
            { 'text-anchor': 'middle', class: 'deck-chart__sub' }, 13
          ));
        }
      }

      svg.appendChild(g);
      stops.push(g);
    }

    var sweepAxis = isNarrow ? 'scaleY' : 'scaleX';
    var sweepOrigin = isNarrow ? '50% 0%' : '0% 50%';

    return {
      svg: svg,
      table: dataTable(labels, titles, fig.getAttribute('data-title'), subs),
      reset: function() {
        if (!animates()) return;
        var from = {}; from[sweepAxis] = 0;
        from.transformOrigin = sweepOrigin;
        gsap.set(sweep, from);
        gsap.set(stops, { opacity: 0, y: 12 });
      },
      play: function() {
        if (!animates()) return;
        var to = {}; to[sweepAxis] = 1;
        to.duration = 0.9; to.delay = 0.1; to.ease = 'power2.inOut';
        to.transformOrigin = sweepOrigin;
        gsap.to(sweep, to);
        gsap.to(stops, { opacity: 1, y: 0, duration: 0.45, stagger: 0.14, delay: 0.3, ease: 'power2.out' });
      }
    };
  }

  // ═══════════════════════════════════════════════════════════
  // ring — single progress ring (used for the 7-day Signal Scan)
  // ═══════════════════════════════════════════════════════════

  function buildRing(fig) {
    var value = parseFloat(fig.getAttribute('data-value')) || 100;
    var centre = fig.getAttribute('data-center') || '';
    var centreLabel = fig.getAttribute('data-center-label') || '';

    var W = 260, H = 260;
    var cx = W / 2, cy = H / 2, r = 96, stroke = 14;
    var circ = 2 * Math.PI * r;
    var len = (value / 100) * circ;

    var svg = svgRoot(W, H, fig.getAttribute('data-title') || 'Progress');

    svg.appendChild(el('circle', {
      cx: cx, cy: cy, r: r, fill: 'none', stroke: C.faint, 'stroke-width': stroke
    }));

    var arc = el('circle', {
      cx: cx, cy: cy, r: r, fill: 'none', stroke: 'url(#dc-full)',
      'stroke-width': stroke, 'stroke-linecap': 'round',
      'stroke-dasharray': len + ' ' + (circ - len),
      transform: 'rotate(-90 ' + cx + ' ' + cy + ')'
    });
    svg.appendChild(arc);

    if (centre) {
      svg.appendChild(el('text', {
        x: cx, y: cy + 6, 'text-anchor': 'middle', class: 'deck-chart__centre'
      }, centre));
    }
    if (centreLabel) {
      svg.appendChild(el('text', {
        x: cx, y: cy + 30, 'text-anchor': 'middle', class: 'deck-chart__sub'
      }, centreLabel));
    }

    return {
      svg: svg,
      table: null,
      reset: function() { arc.setAttribute('stroke-dasharray', '0 ' + circ); },
      play: function() {
        if (!animates()) {
          arc.setAttribute('stroke-dasharray', len + ' ' + (circ - len));
          return;
        }
        var p = { l: 0 };
        gsap.to(p, {
          l: len, duration: 1.1, delay: 0.15, ease: 'power2.inOut',
          onUpdate: function() {
            arc.setAttribute('stroke-dasharray', p.l + ' ' + (circ - p.l));
          }
        });
      }
    };
  }

  // ═══════════════════════════════════════════════════════════
  // compare — two-column "them vs us" with sequential check marks
  // ═══════════════════════════════════════════════════════════

  function buildCompare(fig) {
    // data-rows="Row label|them|us; ..."
    var rows = (fig.getAttribute('data-rows') || '').split(';');
    var themLabel = fig.getAttribute('data-them') || 'Typical agency';
    var usLabel = fig.getAttribute('data-us') || 'Refractive';

    var valid = rows.map(function(r) {
      return r.split('|').map(function(s) { return s.trim(); });
    }).filter(function(p) { return p.length >= 3 && p[0]; });

    // Portrait: three columns will not fit, so each row becomes a stacked
    // block — heading, the "them" line, then the "us" line highlighted.
    if (narrow()) return comparePortrait(fig, valid, themLabel, usLabel);

    var W = 780;
    var headH = 40, rowH = 52;
    var H = headH + valid.length * rowH + 10;
    var col1 = 395, col2 = 640;

    var svg = svgRoot(W, H, fig.getAttribute('data-title') || 'Comparison');

    svg.appendChild(el('text', { x: col1, y: 24, 'text-anchor': 'middle', class: 'deck-chart__axis' }, themLabel));
    svg.appendChild(el('text', { x: col2, y: 24, 'text-anchor': 'middle', class: 'deck-chart__axis is-hi' }, usLabel));

    // "Us" column wash
    svg.appendChild(el('rect', {
      x: col2 - 128, y: 4, width: 264, height: H - 8, rx: 10,
      fill: 'rgba(67,169,223,0.05)', stroke: 'rgba(67,169,223,0.16)', 'stroke-width': 1
    }));

    var rowEls = [];

    valid.forEach(function(parts, i) {
      var y = headH + i * rowH + 26;
      var g = el('g');

      g.appendChild(el('line', {
        x1: 8, y1: y - 22, x2: W - 8, y2: y - 22, stroke: C.grid, 'stroke-width': 1
      }));

      g.appendChild(el('text', { x: 8, y: y + 4, class: 'deck-chart__label is-hi' }, parts[0]));

      g.appendChild(textLines(col1, y - 2, wrap(parts[1], 26), {
        'text-anchor': 'middle', class: 'deck-chart__sub'
      }, 13));

      g.appendChild(textLines(col2, y - 2, wrap(parts[2], 26), {
        'text-anchor': 'middle', class: 'deck-chart__sub is-hi'
      }, 13));

      svg.appendChild(g);
      rowEls.push(g);
    });

    return {
      svg: svg,
      table: dataTable(
        valid.map(function(p) { return p[0]; }),
        valid.map(function(p) { return themLabel + ': ' + p[1] + ' / ' + usLabel + ': ' + p[2]; }),
        fig.getAttribute('data-title')
      ),
      reset: function() {
        if (!animates()) return;
        gsap.set(rowEls, { opacity: 0, x: -14 });
      },
      play: function() {
        if (!animates()) return;
        gsap.to(rowEls, {
          opacity: 1, x: 0, duration: 0.45, stagger: 0.1, delay: 0.15, ease: 'power2.out'
        });
      }
    };
  }

  function comparePortrait(fig, valid, themLabel, usLabel) {
    var W = NW;
    var rowH = 104;
    var H = valid.length * rowH + 8;

    var svg = svgRoot(W, H, fig.getAttribute('data-title') || 'Comparison');
    var rowEls = [];

    valid.forEach(function(parts, i) {
      var y = i * rowH + 20;
      var g = el('g');

      g.appendChild(el('text', { x: 0, y: y, class: 'deck-chart__stage' }, parts[0]));

      // Them
      g.appendChild(el('text', { x: 0, y: y + 24, class: 'deck-chart__axis' }, themLabel));
      g.appendChild(textLines(0, y + 42, wrap(parts[1], 42),
        { class: 'deck-chart__sub' }, 15));

      // Us — washed and rule-marked so the contrast is obvious at a glance
      g.appendChild(el('rect', {
        x: 0, y: y + 52, width: W, height: 40, rx: 8,
        fill: 'rgba(67,169,223,0.06)', stroke: 'rgba(67,169,223,0.18)', 'stroke-width': 1
      }));
      g.appendChild(el('text', { x: 10, y: y + 68, class: 'deck-chart__axis is-hi' }, usLabel));
      g.appendChild(textLines(10, y + 84, wrap(parts[2], 40),
        { class: 'deck-chart__sub is-hi' }, 15));

      svg.appendChild(g);
      rowEls.push(g);
    });

    return {
      svg: svg,
      table: dataTable(
        valid.map(function(p) { return p[0]; }),
        valid.map(function(p) { return themLabel + ': ' + p[1] + ' / ' + usLabel + ': ' + p[2]; }),
        fig.getAttribute('data-title')
      ),
      reset: function() {
        if (!animates()) return;
        gsap.set(rowEls, { opacity: 0, x: -14 });
      },
      play: function() {
        if (!animates()) return;
        gsap.to(rowEls, {
          opacity: 1, x: 0, duration: 0.45, stagger: 0.1, delay: 0.15, ease: 'power2.out'
        });
      }
    };
  }

  // ═══════════════════════════════════════════════════════════
  // Registry
  // ═══════════════════════════════════════════════════════════

  var BUILDERS = {
    'bar':           buildBar,
    'waterfall':     buildWaterfall,
    'donut':         buildDonut,
    'line':          buildLine,
    'quadrant':      buildQuadrant,
    'funnel':        buildFunnel,
    'prism-split':   buildPrismSplit,
    'node-collapse': buildNodeCollapse,
    'orbit':         buildOrbit,
    'gantt':         buildGantt,
    'ladder':        buildLadder,
    'rail':          buildRail,
    'ring':          buildRing,
    'compare':       buildCompare
  };

  // ═══════════════════════════════════════════════════════════
  // Public API
  // ═══════════════════════════════════════════════════════════

  // Instances are cached on the element so render() is idempotent and a
  // slide can be revisited without rebuilding its SVG.
  var KEY = '__deckChart';

  function buildOne(fig) {
    if (fig[KEY]) return fig[KEY];

    var type = fig.getAttribute('data-chart');
    var builder = BUILDERS[type];
    if (!builder) {
      console.warn('DeckCharts: unknown chart type "' + type + '"');
      return null;
    }

    ensureDefs();

    var built;
    try {
      built = builder(fig);
    } catch (err) {
      console.error('DeckCharts: failed to build "' + type + '"', err);
      return null;
    }

    fig.appendChild(built.svg);
    if (built.table) fig.appendChild(built.table);

    var note = fig.getAttribute('data-note');
    if (note) {
      var cap = document.createElement('figcaption');
      cap.className = 'deck-chart__note';
      cap.textContent = note;
      fig.appendChild(cap);
    }

    fig[KEY] = built;
    return built;
  }

  function collect(root) {
    var scope = root || document;
    var figures = [].slice.call(scope.querySelectorAll('[data-chart]'));
    var counters = [].slice.call(scope.querySelectorAll('[data-count]'));
    return { figures: figures, counters: counters };
  }

  function render(root) {
    var found = collect(root);
    found.figures.forEach(buildOne);
    found.counters.forEach(function(node) {
      if (!node[KEY]) node[KEY] = buildCounter(node);
    });
  }

  function each(root, method) {
    var found = collect(root);
    found.figures.concat(found.counters).forEach(function(node) {
      var inst = node[KEY];
      if (inst && typeof inst[method] === 'function') {
        try { inst[method](); } catch (e) { /* a broken chart must not break the deck */ }
      }
    });
  }

  return {
    render: render,
    play: function(root) { render(root); each(root, 'play'); },
    reset: function(root) { each(root, 'reset'); },
    animates: animates
  };

})();
