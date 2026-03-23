/* ==========================================================================
   Retention Cohort Simulator
   ========================================================================== */

(function() {
  var STORAGE_KEY = 'refractive_cohort_simulator';
  var COHORT_SIZE = 1000;

  // Default DTC repeat rates (% of original cohort)
  var DEFAULTS = {
    repeat: [100, 15, 8, 6, 5, 4.5, 4, 3.5, 3, 3, 2.5, 2.5],
    aov:    [0, 85, 80, 78, 75, 75, 72, 72, 70, 70, 68, 68]
  };

  var data = {};

  document.addEventListener('DOMContentLoaded', function() {
    buildTable();
    loadData();
    fillInputs();
    recalculate();
    bindEvents();
  });

  function buildTable() {
    var tbody = document.getElementById('cohort-body');
    var rows = [
      { key: 'repeat', label: 'Repeat Purchase Rate (%)', type: 'input' },
      { key: 'aov',    label: 'Avg Order Value ($)',       type: 'input' },
      { key: 'revenue',label: 'Cohort Revenue',            type: 'calc' },
      { key: 'gp',     label: 'Gross Profit',              type: 'calc' },
      { key: 'cum_ltv',label: 'Cumulative LTV',            type: 'calc' },
      { key: 'vs_cac', label: 'vs CAC',                    type: 'calc' }
    ];

    rows.forEach(function(row) {
      var tr = document.createElement('tr');
      if (row.type === 'calc') tr.className = 'cohort-table__row--calc';
      tr.innerHTML = '<td>' + row.label + '</td>';

      for (var m = 0; m < 12; m++) {
        var td = document.createElement('td');
        if (row.type === 'input') {
          var input = document.createElement('input');
          input.type = 'text';
          input.className = 'dash-input';
          input.dataset.key = row.key;
          input.dataset.month = m;
          input.inputMode = 'numeric';
          input.placeholder = '—';
          if (m === 0 && row.key === 'repeat') {
            input.value = '100';
            input.disabled = true;
            input.style.opacity = '0.5';
          }
          td.appendChild(input);
        } else {
          td.dataset.calcKey = row.key;
          td.dataset.month = m;
          td.textContent = '—';
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    });
  }

  function loadData() {
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      data = JSON.parse(stored);
    } else {
      // Pre-fill with defaults
      data = {
        cac: '',
        aov_first: '',
        margin: '',
        repeat: {},
        aov: {}
      };
      for (var m = 0; m < 12; m++) {
        data.repeat[m] = DEFAULTS.repeat[m];
        data.aov[m] = DEFAULTS.aov[m];
      }
    }
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function fillInputs() {
    // Top inputs
    if (data.cac) document.getElementById('coh-cac').value = data.cac;
    if (data.aov_first) document.getElementById('coh-aov').value = data.aov_first;
    if (data.margin) document.getElementById('coh-margin').value = data.margin;

    // Table inputs
    document.querySelectorAll('.dash-input[data-key]').forEach(function(input) {
      var key = input.dataset.key;
      var m = parseInt(input.dataset.month);
      if (data[key] && data[key][m] !== undefined) {
        input.value = data[key][m];
      }
    });
  }

  function bindEvents() {
    // Top inputs
    ['coh-cac', 'coh-aov', 'coh-margin'].forEach(function(id) {
      document.getElementById(id).addEventListener('input', function() {
        var key = id === 'coh-cac' ? 'cac' : id === 'coh-aov' ? 'aov_first' : 'margin';
        data[key] = this.value;
        recalculate();
        saveData();
      });
    });

    // Table inputs
    document.addEventListener('input', function(e) {
      if (!e.target.classList.contains('dash-input') || !e.target.dataset.key) return;
      var key = e.target.dataset.key;
      var m = parseInt(e.target.dataset.month);
      if (!data[key]) data[key] = {};
      data[key][m] = parseFloat(e.target.value) || 0;
      recalculate();
      saveData();
    });

    // Clear
    document.getElementById('clear-data').addEventListener('click', function() {
      if (confirm('Clear all data? This cannot be undone.')) {
        localStorage.removeItem(STORAGE_KEY);
        data = {};
        for (var m = 0; m < 12; m++) {
          data.repeat = data.repeat || {};
          data.aov = data.aov || {};
          data.repeat[m] = DEFAULTS.repeat[m];
          data.aov[m] = DEFAULTS.aov[m];
        }
        document.getElementById('coh-cac').value = '';
        document.getElementById('coh-aov').value = '';
        document.getElementById('coh-margin').value = '';
        fillInputs();
        recalculate();
      }
    });
  }

  function parse(v) {
    var n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  function fmt(n) {
    return Math.round(n).toLocaleString('en-US');
  }

  function recalculate() {
    var cac = parse(data.cac);
    var aovFirst = parse(data.aov_first);
    var marginPct = parse(data.margin) / 100;

    var cumLtv = 0;
    var ltvByMonth = [];
    var paybackMonth = null;
    var totalRepeatRate = 0;

    for (var m = 0; m < 12; m++) {
      var repeatRate = (data.repeat && data.repeat[m] !== undefined) ? parse(data.repeat[m]) : DEFAULTS.repeat[m];
      var aov = m === 0 ? aovFirst : ((data.aov && data.aov[m] !== undefined) ? parse(data.aov[m]) : DEFAULTS.aov[m]);

      var customers = COHORT_SIZE * (repeatRate / 100);
      var revenue = customers * aov;
      var gp = revenue * marginPct;
      var ltvIncrement = gp / COHORT_SIZE;
      cumLtv += ltvIncrement;

      ltvByMonth.push(cumLtv);

      if (m > 0) totalRepeatRate += repeatRate;

      // Set calc cells
      setCellVal('revenue', m, revenue);
      setCellVal('gp', m, gp);
      setCellVal('cum_ltv', m, cumLtv);

      var vsCac = cumLtv - cac;
      var vsCell = document.querySelector('[data-calc-key="vs_cac"][data-month="' + m + '"]');
      if (vsCell) {
        if (cac === 0) {
          vsCell.textContent = '—';
          vsCell.className = '';
        } else {
          vsCell.textContent = (vsCac >= 0 ? '+' : '') + '$' + fmt(Math.abs(vsCac));
          vsCell.className = vsCac >= 0 ? 'dash-val--positive' : 'dash-val--negative';
          if (vsCac < 0) vsCell.textContent = '-$' + fmt(Math.abs(vsCac));
        }
      }

      if (paybackMonth === null && cumLtv >= cac && cac > 0) {
        paybackMonth = m + 1;
      }
    }

    // Summary cards
    setText('sum-ltv', cumLtv > 0 ? '$' + fmt(cumLtv) : '$0');
    var ltvCac = cac > 0 ? cumLtv / cac : 0;
    setText('sum-ltv-cac', ltvCac > 0 ? ltvCac.toFixed(1) + 'x' : '0x');
    setText('sum-payback', paybackMonth ? 'Month ' + paybackMonth : (cac > 0 ? '> 12' : '--'));
    setText('sum-repeat', totalRepeatRate > 0 ? totalRepeatRate.toFixed(0) + '%' : '0%');

    // Chart
    renderChart(ltvByMonth, cac);

    // Operator read
    buildOperatorRead(cumLtv, cac, ltvCac, paybackMonth, marginPct, totalRepeatRate);
  }

  function setCellVal(key, month, val) {
    var cell = document.querySelector('[data-calc-key="' + key + '"][data-month="' + month + '"]');
    if (!cell) return;
    if (val === 0) {
      cell.textContent = '—';
    } else {
      cell.textContent = '$' + fmt(val);
    }
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function renderChart(ltvByMonth, cac) {
    var chart = document.getElementById('ltv-chart');
    var maxVal = Math.max.apply(null, ltvByMonth.concat([cac])) || 1;

    var html = '';

    // CAC line
    if (cac > 0) {
      var cacPct = (cac / maxVal) * 100;
      html += '<div class="cohort-chart__cac-line" style="bottom:' + cacPct + '%">';
      html += '<span class="cohort-chart__cac-label">CAC $' + fmt(cac) + '</span>';
      html += '</div>';
    }

    // Bars
    for (var m = 0; m < 12; m++) {
      var val = ltvByMonth[m] || 0;
      var pct = (val / maxVal) * 100;
      var aboveCac = cac > 0 && val >= cac;
      html += '<div class="cohort-chart__bar">';
      html += '<span class="cohort-chart__val">$' + fmt(val) + '</span>';
      html += '<div class="cohort-chart__fill cohort-chart__fill--' + (aboveCac ? 'above' : 'below') + '" style="height:' + pct + '%"></div>';
      html += '<span class="cohort-chart__label">M' + (m + 1) + '</span>';
      html += '</div>';
    }

    chart.innerHTML = html;
  }

  function buildOperatorRead(ltv, cac, ltvCac, paybackMonth, marginPct, repeatRate) {
    var readEl = document.getElementById('cohort-read');
    if (cac === 0 || ltv === 0) {
      readEl.textContent = '';
      return;
    }

    var parts = [];

    // Payback
    if (paybackMonth) {
      if (paybackMonth <= 3) {
        parts.push('At a $' + fmt(cac) + ' CAC and ' + (marginPct * 100).toFixed(0) + '% margin, you hit payback by Month ' + paybackMonth + ' \u2014 that\u2019s healthy.');
      } else if (paybackMonth <= 6) {
        parts.push('Payback comes at Month ' + paybackMonth + '. Workable, but you\u2019re carrying acquisition cost for ' + paybackMonth + ' months before seeing return.');
      } else {
        parts.push('Payback doesn\u2019t arrive until Month ' + paybackMonth + '. That\u2019s a long time to carry acquisition cost \u2014 cash flow will feel tight at scale.');
      }
    } else {
      parts.push('At current repeat rates, you don\u2019t hit CAC payback within 12 months. Either CAC is too high, margin is too thin, or retention needs work.');
    }

    // LTV:CAC
    if (ltvCac >= 3) {
      parts.push('LTV:CAC of ' + ltvCac.toFixed(1) + 'x gives you room to scale acquisition aggressively.');
    } else if (ltvCac >= 2) {
      parts.push('LTV:CAC of ' + ltvCac.toFixed(1) + 'x is in watch territory \u2014 not bad, but not enough headroom to scale spend confidently.');
    } else if (ltvCac > 0) {
      parts.push('LTV:CAC of ' + ltvCac.toFixed(1) + 'x is below the threshold. Fix retention or reduce CAC before scaling.');
    }

    // Concentration risk
    if (ltv > 0) {
      var m2m3Value = 0;
      // Check how much LTV comes from early months
      // This is approximate since we have cumulative values
      // Use the first 3 months' share of total
      // We don't have monthly increments stored, so use a simple heuristic
      if (repeatRate < 20) {
        parts.push('Your 12-month repeat rate is low at ' + repeatRate.toFixed(0) + '%. Most of your lifetime value is front-loaded \u2014 post-purchase flows are critical.');
      }
    }

    readEl.textContent = parts.join(' ');
  }

})();
