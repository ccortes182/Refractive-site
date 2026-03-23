/* ==========================================================================
   Media Mix Allocator
   ========================================================================== */

(function() {
  var CHANNELS = ['Meta', 'Google', 'TikTok', 'Other'];

  document.addEventListener('DOMContentLoaded', function() {
    buildTable();
    bindEvents();
  });

  function buildTable() {
    var tbody = document.getElementById('mix-body');

    CHANNELS.forEach(function(ch) {
      var slug = ch.toLowerCase().replace(/[^a-z]/g, '');
      var tr = document.createElement('tr');
      tr.className = 'dash-table__row--input';
      tr.innerHTML = '<td>' + ch + '</td>' +
        '<td><input type="text" class="dash-input mix-spend" data-channel="' + slug + '" placeholder="$0" inputmode="numeric"></td>' +
        '<td><input type="text" class="dash-input mix-revenue" data-channel="' + slug + '" placeholder="$0" inputmode="numeric"></td>' +
        '<td class="mix-roas" data-channel="' + slug + '">\u2014</td>' +
        '<td class="mix-budget-pct" data-channel="' + slug + '">\u2014</td>' +
        '<td class="mix-rev-pct" data-channel="' + slug + '">\u2014</td>' +
        '<td class="mix-gap" data-channel="' + slug + '">\u2014</td>';
      tbody.appendChild(tr);
    });

    // Totals row
    var totalTr = document.createElement('tr');
    totalTr.className = 'cohort-table__row--calc';
    totalTr.innerHTML = '<td>Total</td>' +
      '<td id="mix-total-spend">\u2014</td>' +
      '<td id="mix-total-rev">\u2014</td>' +
      '<td id="mix-total-roas">\u2014</td>' +
      '<td>100%</td><td>100%</td><td></td>';
    tbody.appendChild(totalTr);
  }

  function bindEvents() {
    document.addEventListener('input', function(e) {
      if (e.target.classList.contains('mix-spend') || e.target.classList.contains('mix-revenue')) {
        formatInput(e.target);
        recalculate();
      }
    });

    var slider = document.getElementById('mix-scenario');
    slider.addEventListener('input', function() {
      document.getElementById('mix-scenario-val').textContent = this.value + '%';
      runScenario(parseInt(this.value));
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

  function getChannelData() {
    var channels = [];
    var totalSpend = 0;
    var totalRev = 0;

    CHANNELS.forEach(function(ch) {
      var slug = ch.toLowerCase().replace(/[^a-z]/g, '');
      var spend = parse(document.querySelector('.mix-spend[data-channel="' + slug + '"]').value);
      var rev = parse(document.querySelector('.mix-revenue[data-channel="' + slug + '"]').value);
      var roas = spend > 0 ? rev / spend : 0;
      totalSpend += spend;
      totalRev += rev;
      channels.push({ name: ch, slug: slug, spend: spend, revenue: rev, roas: roas });
    });

    return { channels: channels, totalSpend: totalSpend, totalRev: totalRev };
  }

  function recalculate() {
    var d = getChannelData();
    var blendedRoas = d.totalSpend > 0 ? d.totalRev / d.totalSpend : 0;

    var bestChannel = null, worstChannel = null;
    var bestRoas = 0, worstRoas = Infinity;

    d.channels.forEach(function(ch) {
      var budgetPct = d.totalSpend > 0 ? (ch.spend / d.totalSpend * 100) : 0;
      var revPct = d.totalRev > 0 ? (ch.revenue / d.totalRev * 100) : 0;
      var gap = revPct - budgetPct;

      setCell('.mix-roas[data-channel="' + ch.slug + '"]', ch.roas > 0 ? ch.roas.toFixed(2) + 'x' : '\u2014');
      setCell('.mix-budget-pct[data-channel="' + ch.slug + '"]', budgetPct > 0 ? budgetPct.toFixed(0) + '%' : '\u2014');
      setCell('.mix-rev-pct[data-channel="' + ch.slug + '"]', revPct > 0 ? revPct.toFixed(0) + '%' : '\u2014');

      var gapCell = document.querySelector('.mix-gap[data-channel="' + ch.slug + '"]');
      if (gapCell) {
        if (ch.spend === 0) {
          gapCell.textContent = '\u2014';
          gapCell.className = 'mix-gap';
        } else {
          gapCell.textContent = (gap >= 0 ? '+' : '') + gap.toFixed(1) + 'pp';
          gapCell.className = 'mix-gap ' + (gap >= 0 ? 'dash-val--positive' : 'dash-val--negative');
        }
      }

      if (ch.spend > 0 && ch.roas > bestRoas) { bestRoas = ch.roas; bestChannel = ch.name; }
      if (ch.spend > 0 && ch.roas < worstRoas) { worstRoas = ch.roas; worstChannel = ch.name; }
    });

    setText('mix-total-spend', d.totalSpend > 0 ? '$' + fmt(d.totalSpend) : '\u2014');
    setText('mix-total-rev', d.totalRev > 0 ? '$' + fmt(d.totalRev) : '\u2014');
    setText('mix-total-roas', blendedRoas > 0 ? blendedRoas.toFixed(2) + 'x' : '\u2014');

    setText('sum-budget', d.totalSpend > 0 ? '$' + fmt(d.totalSpend) : '$0');
    setText('sum-roas', blendedRoas > 0 ? blendedRoas.toFixed(1) + 'x' : '0x');
    setText('sum-best', bestChannel || '--');
    setText('sum-worst', worstChannel || '--');

    buildRead(d, blendedRoas, bestChannel, worstChannel);

    // Reset scenario
    document.getElementById('mix-scenario').value = 0;
    document.getElementById('mix-scenario-val').textContent = '0%';
    document.getElementById('mix-scenario-read').textContent = '';
  }

  function runScenario(pctChange) {
    var d = getChannelData();
    if (d.totalSpend === 0) return;

    // Find best channel
    var best = null;
    d.channels.forEach(function(ch) {
      if (!best || (ch.spend > 0 && ch.roas > (best.roas || 0))) best = ch;
    });

    if (!best || best.spend === 0) {
      document.getElementById('mix-scenario-read').textContent = '';
      return;
    }

    var adjustedRoas = best.roas * (1 + pctChange / 100);
    var adjustedRev = best.spend * adjustedRoas;
    var revDiff = adjustedRev - best.revenue;
    var newTotalRev = d.totalRev + revDiff;
    var newBlended = d.totalSpend > 0 ? newTotalRev / d.totalSpend : 0;

    var readEl = document.getElementById('mix-scenario-read');
    if (pctChange === 0) {
      readEl.textContent = '';
    } else {
      var direction = pctChange > 0 ? 'increases' : 'decreases';
      readEl.textContent = 'If ' + best.name + ' ROAS ' + direction + ' by ' + Math.abs(pctChange) + '% (from ' +
        best.roas.toFixed(2) + 'x to ' + adjustedRoas.toFixed(2) + 'x), total revenue shifts by ' +
        (revDiff >= 0 ? '+' : '-') + '$' + fmt(Math.abs(revDiff)) +
        ' and blended ROAS moves to ' + newBlended.toFixed(2) + 'x.';
    }
  }

  function buildRead(d, blendedRoas, bestChannel, worstChannel) {
    var readEl = document.getElementById('mix-read');
    if (d.totalSpend === 0) { readEl.textContent = ''; return; }

    var parts = [];

    // Concentration check
    d.channels.forEach(function(ch) {
      var pct = ch.spend / d.totalSpend * 100;
      if (pct > 70) {
        parts.push('You\u2019re allocating ' + pct.toFixed(0) + '% of spend to ' + ch.name + '. That\u2019s heavy concentration risk \u2014 if that channel underperforms, there\u2019s no cushion.');
      }
    });

    // Efficiency gap
    if (bestChannel && worstChannel && bestChannel !== worstChannel) {
      var best = d.channels.find(function(c) { return c.name === bestChannel; });
      var worst = d.channels.find(function(c) { return c.name === worstChannel; });
      if (best && worst && best.roas > worst.roas * 2) {
        parts.push(bestChannel + ' is running at ' + best.roas.toFixed(1) + 'x ROAS while ' + worstChannel + ' is at ' + worst.roas.toFixed(1) + 'x. That\u2019s a wide efficiency gap \u2014 consider whether the lower performer is serving a different funnel role or just underperforming.');
      }
    }

    if (blendedRoas >= 4) {
      parts.push('Blended ROAS of ' + blendedRoas.toFixed(1) + 'x is strong. You likely have room to increase spend if creative velocity can keep up.');
    } else if (blendedRoas >= 2.5) {
      parts.push('Blended ROAS of ' + blendedRoas.toFixed(1) + 'x is workable but watch your margins. Reallocating from low-ROAS channels could improve this without increasing total spend.');
    } else if (blendedRoas > 0) {
      parts.push('Blended ROAS of ' + blendedRoas.toFixed(1) + 'x is below healthy thresholds. Before adding budget, fix channel efficiency or cut underperformers.');
    }

    if (parts.length === 0) {
      parts.push('Enter your channel spend and revenue to see allocation insights.');
    }

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
