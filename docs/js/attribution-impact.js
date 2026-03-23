/* ==========================================================================
   Attribution Impact Calculator
   ========================================================================== */

(function() {
  var CHANNELS = [
    { name: 'Meta Prospecting',  slug: 'meta-prosp',  defaultLift: 30 },
    { name: 'Meta Retargeting',  slug: 'meta-retarg', defaultLift: -40 },
    { name: 'Google Brand',      slug: 'google-brand', defaultLift: -50 },
    { name: 'Google Non-Brand',  slug: 'google-nb',   defaultLift: 10 },
    { name: 'Google Shopping',   slug: 'google-shop', defaultLift: -15 },
    { name: 'TikTok',           slug: 'tiktok',       defaultLift: 25 },
    { name: 'Other',            slug: 'other',        defaultLift: 0 }
  ];

  document.addEventListener('DOMContentLoaded', function() {
    buildTable();
    bindEvents();
  });

  function buildTable() {
    var tbody = document.getElementById('attr-body');

    CHANNELS.forEach(function(ch) {
      var tr = document.createElement('tr');
      tr.className = 'dash-table__row--input';
      tr.innerHTML =
        '<td>' + ch.name + '</td>' +
        '<td><input type="text" class="dash-input attr-spend" data-slug="' + ch.slug + '" placeholder="$0" inputmode="numeric"></td>' +
        '<td><input type="text" class="dash-input attr-lc-rev" data-slug="' + ch.slug + '" placeholder="$0" inputmode="numeric"></td>' +
        '<td><input type="text" class="dash-input attr-lift" data-slug="' + ch.slug + '" value="' + ch.defaultLift + '" inputmode="numeric" style="max-width:70px;text-align:center;"></td>' +
        '<td class="attr-adj-rev" data-slug="' + ch.slug + '">\u2014</td>' +
        '<td class="attr-lc-roas" data-slug="' + ch.slug + '">\u2014</td>' +
        '<td class="attr-adj-roas" data-slug="' + ch.slug + '">\u2014</td>' +
        '<td class="attr-shift" data-slug="' + ch.slug + '">\u2014</td>';
      tbody.appendChild(tr);
    });

    // Totals
    var totalTr = document.createElement('tr');
    totalTr.className = 'cohort-table__row--calc';
    totalTr.innerHTML =
      '<td>Total</td>' +
      '<td id="attr-total-spend">\u2014</td>' +
      '<td id="attr-total-lc">\u2014</td>' +
      '<td></td>' +
      '<td id="attr-total-adj">\u2014</td>' +
      '<td id="attr-total-lc-roas">\u2014</td>' +
      '<td id="attr-total-adj-roas">\u2014</td>' +
      '<td id="attr-total-shift">\u2014</td>';
    tbody.appendChild(totalTr);
  }

  function bindEvents() {
    document.addEventListener('input', function(e) {
      if (e.target.classList.contains('attr-spend') ||
          e.target.classList.contains('attr-lc-rev') ||
          e.target.classList.contains('attr-lift')) {
        if (!e.target.classList.contains('attr-lift')) formatInput(e.target);
        recalculate();
      }
    });
  }

  function parse(str) {
    if (!str) return 0;
    return parseFloat(str.replace(/[^0-9.\-]/g, '')) || 0;
  }

  function fmt(n) {
    return Math.round(n).toLocaleString('en-US');
  }

  function formatInput(el) {
    var raw = el.value.replace(/[^0-9.]/g, '');
    if (!raw) return;
    var parts = raw.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    el.value = parts.join('.');
  }

  function recalculate() {
    var totalSpend = 0, totalLcRev = 0, totalAdjRev = 0;
    var mostUnder = null, mostOver = null;
    var maxUnder = 0, maxOver = 0;

    CHANNELS.forEach(function(ch) {
      var spend = parse(document.querySelector('.attr-spend[data-slug="' + ch.slug + '"]').value);
      var lcRev = parse(document.querySelector('.attr-lc-rev[data-slug="' + ch.slug + '"]').value);
      var lift = parse(document.querySelector('.attr-lift[data-slug="' + ch.slug + '"]').value);

      var adjRev = lcRev * (1 + lift / 100);
      var lcRoas = spend > 0 ? lcRev / spend : 0;
      var adjRoas = spend > 0 ? adjRev / spend : 0;
      var shift = adjRev - lcRev;

      totalSpend += spend;
      totalLcRev += lcRev;
      totalAdjRev += adjRev;

      setCell('.attr-adj-rev[data-slug="' + ch.slug + '"]', adjRev > 0 ? '$' + fmt(adjRev) : '\u2014');
      setCell('.attr-lc-roas[data-slug="' + ch.slug + '"]', lcRoas > 0 ? lcRoas.toFixed(2) + 'x' : '\u2014');
      setCell('.attr-adj-roas[data-slug="' + ch.slug + '"]', adjRoas > 0 ? adjRoas.toFixed(2) + 'x' : '\u2014');

      var shiftCell = document.querySelector('.attr-shift[data-slug="' + ch.slug + '"]');
      if (shiftCell) {
        if (lcRev === 0) {
          shiftCell.textContent = '\u2014';
          shiftCell.className = 'attr-shift';
        } else {
          shiftCell.textContent = (shift >= 0 ? '+' : '-') + '$' + fmt(Math.abs(shift));
          shiftCell.className = 'attr-shift ' + (shift >= 0 ? 'dash-val--positive' : 'dash-val--negative');
        }
      }

      if (shift > maxUnder && lcRev > 0) { maxUnder = shift; mostUnder = ch.name; }
      if (shift < maxOver && lcRev > 0) { maxOver = shift; mostOver = ch.name; }
    });

    var totalShift = totalAdjRev - totalLcRev;

    setText('attr-total-spend', totalSpend > 0 ? '$' + fmt(totalSpend) : '\u2014');
    setText('attr-total-lc', totalLcRev > 0 ? '$' + fmt(totalLcRev) : '\u2014');
    setText('attr-total-adj', totalAdjRev > 0 ? '$' + fmt(totalAdjRev) : '\u2014');
    setText('attr-total-lc-roas', totalSpend > 0 && totalLcRev > 0 ? (totalLcRev / totalSpend).toFixed(2) + 'x' : '\u2014');
    setText('attr-total-adj-roas', totalSpend > 0 && totalAdjRev > 0 ? (totalAdjRev / totalSpend).toFixed(2) + 'x' : '\u2014');

    var shiftEl = document.getElementById('attr-total-shift');
    if (shiftEl) {
      if (totalLcRev === 0) {
        shiftEl.textContent = '\u2014';
      } else {
        shiftEl.textContent = (totalShift >= 0 ? '+' : '-') + '$' + fmt(Math.abs(totalShift));
        shiftEl.className = totalShift >= 0 ? 'dash-val--positive' : 'dash-val--negative';
      }
    }

    setText('sum-spend', totalSpend > 0 ? '$' + fmt(totalSpend) : '$0');
    setText('sum-shift', totalLcRev > 0 ? (totalShift >= 0 ? '+' : '-') + '$' + fmt(Math.abs(totalShift)) : '$0');
    setText('sum-under', mostUnder || '--');
    setText('sum-over', mostOver || '--');

    buildRead(totalSpend, totalLcRev, totalAdjRev, totalShift, mostUnder, mostOver);
  }

  function buildRead(totalSpend, totalLcRev, totalAdjRev, totalShift, mostUnder, mostOver) {
    var readEl = document.getElementById('attr-read');
    if (totalLcRev === 0) { readEl.textContent = ''; return; }

    var parts = [];

    if (mostUnder && mostOver) {
      parts.push('Under an incrementality-adjusted model, ' + mostUnder + ' gets more credit than last-click gives it, while ' + mostOver + ' gets less.');
      parts.push('This suggests you may be over-investing in ' + mostOver + ' and under-investing in ' + mostUnder + ' based on last-click data alone.');
    }

    if (totalShift > 0) {
      parts.push('Net adjusted revenue is $' + fmt(totalShift) + ' higher than last-click reports \u2014 meaning last-click is understating your true demand generation.');
    } else if (totalShift < 0) {
      parts.push('Net adjusted revenue is $' + fmt(Math.abs(totalShift)) + ' lower than last-click reports \u2014 meaning some channels are getting credit for conversions they didn\u2019t incrementally drive.');
    }

    parts.push('These are estimates. For true incrementality measurement, run geo-holdout or conversion lift tests through Illuminate.');

    readEl.textContent = parts.join(' ');
  }

  function setCell(selector, text) {
    var el = document.querySelector(selector);
    if (el) el.textContent = text;
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }
})();
