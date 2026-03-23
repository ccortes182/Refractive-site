/* ==========================================================================
   Growth Dashboard — P&L, Growth Metrics, Channel Breakdown
   ========================================================================== */

(function() {
  var STORAGE_PREFIX = 'refractive_dashboard_';
  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var QUARTERS = ['Q1','Q2','Q3','Q4'];

  // P&L row definitions
  var PNL_ROWS = [
    { key: 'gross_sales',       label: 'Gross Sales',           type: 'input' },
    { key: 'discounts',         label: 'Discounts',             type: 'input' },
    { key: 'returns',           label: 'Returns',               type: 'input' },
    { key: 'net_sales',         label: 'Net Sales',             type: 'calc' },
    { key: 'net_sales_mom',     label: 'MoM % Change',          type: 'pct_change' },
    { key: 'cogs',              label: 'COGS',                  type: 'input' },
    { key: 'gross_profit',      label: 'Gross Profit',          type: 'calc' },
    { key: 'gross_margin_pct',  label: 'Gross Margin %',        type: 'calc_pct', tip: 'Healthy: ≥55%. Watch: 40–54%. Critical: <40%.' },
    { key: 'ad_spend',          label: 'Total Ad Spend',        type: 'input' },
    { key: 'agency_fees',       label: 'Agency Fees',           type: 'input' },
    { key: 'other_marketing',   label: 'Other Marketing',       type: 'input' },
    { key: 'total_mktg',        label: 'Total Marketing Cost',  type: 'calc' },
    { key: 'mer',               label: 'MER',                   type: 'calc_ratio', tip: 'Healthy: ≥4.0x. Watch: 2.5–3.9x. Critical: <2.5x.' },
    { key: 'net_amer',          label: 'Net aMER',              type: 'calc_ratio', tip: 'Net Sales ÷ Total Marketing Cost.' },
    { key: 'shipping',          label: 'Shipping',              type: 'input' },
    { key: 'other_opex',        label: 'Other OPEX',            type: 'input' },
    { key: 'contribution_margin',    label: 'Contribution Margin',     type: 'calc' },
    { key: 'contribution_margin_pct',label: 'Contribution Margin %',   type: 'calc_pct', tip: 'Healthy: ≥20%. Watch: 10–19%. Critical: <10%.' },
    { key: 'cm_mom',            label: 'MoM % Change (CM%)',    type: 'pct_change' }
  ];

  // Growth Metrics row definitions
  var GROWTH_ROWS = [
    { key: 'total_orders',       label: 'Total Orders',            type: 'input' },
    { key: 'new_cust_orders',    label: 'New Customer Orders',     type: 'input' },
    { key: 'repeat_orders',      label: 'Repeat Customer Orders',  type: 'calc' },
    { key: 'new_cust_pct',       label: 'New Customer %',          type: 'calc_pct' },
    { key: 'aov_all',            label: 'AOV (All)',               type: 'calc' },
    { key: 'aov_new',            label: 'AOV (New Customers)',     type: 'input' },
    { key: 'new_cust_revenue',   label: 'New Customer Revenue',    type: 'calc' },
    { key: 'blended_cac',        label: 'Blended CAC',             type: 'calc' },
    { key: 'net_ncac',           label: 'Net nCAC',                type: 'calc' },
    { key: 'yr_aov',             label: '1YR AOV',                 type: 'input' },
    { key: 'yr_freq',            label: '1YR Purchase Frequency',  type: 'input_num' },
    { key: 'yr_ltv',             label: '1YR LTV',                 type: 'calc' },
    { key: 'ltv_cac',            label: 'LTV:CAC',                 type: 'calc_ratio' },
    { key: 'ltv_ncac',           label: 'LTV:nCAC',                type: 'calc_ratio' }
  ];

  // Channel definitions
  var CHANNELS = ['Meta', 'Google', 'TikTok', 'Email / SMS', 'Other'];

  var data = {};
  var currentYear;

  document.addEventListener('DOMContentLoaded', function() {
    initYearSelector();
    buildHeaders();
    buildPnlTable();
    buildGrowthTable();
    buildChannelTable();
    loadData();
    renderAll();
    bindEvents();
    bindChannelToggle();
  });

  // ── Year Selector ──

  function initYearSelector() {
    var sel = document.getElementById('year-select');
    var thisYear = new Date().getFullYear();
    for (var y = thisYear - 1; y <= thisYear + 1; y++) {
      var opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      if (y === thisYear) opt.selected = true;
      sel.appendChild(opt);
    }
    currentYear = thisYear;

    sel.addEventListener('change', function() {
      currentYear = parseInt(this.value);
      loadData();
      renderAll();
    });
  }

  // ── Build Table Headers ──

  function buildHeaders() {
    var heads = ['pnl-head', 'growth-head', 'channel-head'];
    heads.forEach(function(id) {
      var thead = document.getElementById(id);
      var tr = document.createElement('tr');
      tr.innerHTML = '<th>Metric</th>';
      MONTHS.forEach(function(m) {
        tr.innerHTML += '<th>' + m + '</th>';
      });
      QUARTERS.forEach(function(q) {
        tr.innerHTML += '<th class="dash-col--q">' + q + '</th>';
      });
      tr.innerHTML += '<th class="dash-col--fy">Full Year</th>';
      thead.appendChild(tr);
    });
  }

  // ── Build P&L Table ──

  function buildPnlTable() {
    var tbody = document.getElementById('pnl-body');
    PNL_ROWS.forEach(function(row) {
      tbody.appendChild(buildRow(row, 'pnl'));
    });
  }

  // ── Build Growth Table ──

  function buildGrowthTable() {
    var tbody = document.getElementById('growth-body');
    GROWTH_ROWS.forEach(function(row) {
      tbody.appendChild(buildRow(row, 'growth'));
    });
  }

  // ── Build Channel Table ──

  function buildChannelTable() {
    var tbody = document.getElementById('channel-body');
    CHANNELS.forEach(function(ch) {
      var slug = ch.toLowerCase().replace(/[^a-z]/g, '');
      var isEmailSms = ch === 'Email / SMS';

      // Spend row (not for Email/SMS)
      if (!isEmailSms) {
        tbody.appendChild(buildRow({
          key: 'ch_' + slug + '_spend', label: ch + ' — Spend', type: 'input'
        }, 'channel'));
      }

      // Revenue row
      tbody.appendChild(buildRow({
        key: 'ch_' + slug + '_revenue', label: ch + ' — Revenue', type: 'input'
      }, 'channel'));

      // ROAS row (not for Email/SMS)
      if (!isEmailSms) {
        tbody.appendChild(buildRow({
          key: 'ch_' + slug + '_roas', label: ch + ' — ROAS', type: 'calc_ratio'
        }, 'channel'));
      }
    });

    // Totals
    tbody.appendChild(buildRow({ key: 'ch_total_spend', label: 'Total Spend', type: 'calc' }, 'channel'));
    tbody.appendChild(buildRow({ key: 'ch_total_revenue', label: 'Total Revenue', type: 'calc' }, 'channel'));
    tbody.appendChild(buildRow({ key: 'ch_total_roas', label: 'Total ROAS', type: 'calc_ratio' }, 'channel'));
  }

  // ── Generic Row Builder ──

  function buildRow(rowDef, section) {
    var tr = document.createElement('tr');
    var isInput = rowDef.type === 'input' || rowDef.type === 'input_num';
    tr.className = 'dash-table__row' + (isInput ? ' dash-table__row--input' : ' dash-table__row--calc');

    // Label cell
    var labelHtml = rowDef.label;
    if (rowDef.tip) {
      labelHtml += ' <span class="dash-tooltip" data-tip="' + rowDef.tip + '">?</span>';
    }
    tr.innerHTML = '<td>' + labelHtml + '</td>';

    // Monthly cells
    for (var m = 1; m <= 12; m++) {
      var td = document.createElement('td');
      if (isInput) {
        var input = document.createElement('input');
        input.type = 'text';
        input.className = 'dash-input';
        input.dataset.key = rowDef.key;
        input.dataset.month = m;
        input.dataset.section = section;
        input.inputMode = 'numeric';
        input.placeholder = '—';
        td.appendChild(input);
      } else {
        td.dataset.calcKey = rowDef.key;
        td.dataset.month = m;
        td.textContent = '—';
      }
      tr.appendChild(td);
    }

    // Quarterly cells
    for (var q = 1; q <= 4; q++) {
      var qtd = document.createElement('td');
      qtd.className = 'dash-col--q';
      qtd.dataset.calcKey = rowDef.key;
      qtd.dataset.quarter = q;
      qtd.textContent = '—';
      tr.appendChild(qtd);
    }

    // Full year cell
    var fytd = document.createElement('td');
    fytd.className = 'dash-col--fy';
    fytd.dataset.calcKey = rowDef.key;
    fytd.dataset.fy = '1';
    fytd.textContent = '—';
    tr.appendChild(fytd);

    return tr;
  }

  // ── Data Management ──

  function loadData() {
    var stored = localStorage.getItem(STORAGE_PREFIX + currentYear);
    data = stored ? JSON.parse(stored) : {};
  }

  function saveData() {
    localStorage.setItem(STORAGE_PREFIX + currentYear, JSON.stringify(data));
  }

  function getVal(key, month) {
    if (!data[key]) return 0;
    return data[key][month] || 0;
  }

  function setVal(key, month, val) {
    if (!data[key]) data[key] = {};
    data[key][month] = val;
  }

  // ── Render Inputs from Data ──

  function renderAll() {
    // Fill inputs
    document.querySelectorAll('.dash-input').forEach(function(input) {
      var key = input.dataset.key;
      var month = parseInt(input.dataset.month);
      var val = getVal(key, month);
      input.value = val ? formatNum(val) : '';
    });
    recalculate();
  }

  // ── Bind Events ──

  function bindEvents() {
    // Input changes
    document.addEventListener('input', function(e) {
      if (!e.target.classList.contains('dash-input')) return;
      var key = e.target.dataset.key;
      var month = parseInt(e.target.dataset.month);
      var val = parseCurrency(e.target.value);
      setVal(key, month, val);
      recalculate();
      saveData();
    });

    // Export
    document.getElementById('csv-export').addEventListener('click', exportCSV);

    // Clear
    document.getElementById('clear-data').addEventListener('click', function() {
      if (confirm('Clear all data for ' + currentYear + '? This cannot be undone.')) {
        localStorage.removeItem(STORAGE_PREFIX + currentYear);
        data = {};
        renderAll();
      }
    });
  }

  function bindChannelToggle() {
    var toggle = document.getElementById('channel-toggle');
    var section = document.getElementById('channel-section');
    var collapsed = false;

    toggle.addEventListener('click', function() {
      collapsed = !collapsed;
      if (collapsed) {
        section.classList.add('is-collapsed');
        section.style.maxHeight = '0';
      } else {
        section.classList.remove('is-collapsed');
        section.style.maxHeight = section.scrollHeight + 'px';
      }
    });

    // Set initial max-height
    section.style.maxHeight = section.scrollHeight + 'px';
  }

  // ── Calculations ──

  function recalculate() {
    calcPnl();
    calcGrowth();
    calcChannels();
    updateSummary();
  }

  function calcPnl() {
    for (var m = 1; m <= 12; m++) {
      var gs = getVal('gross_sales', m);
      var disc = getVal('discounts', m);
      var ret = getVal('returns', m);
      var ns = gs - disc - ret;
      var cogs = getVal('cogs', m);
      var gp = ns - cogs;
      var gmPct = ns > 0 ? (gp / ns * 100) : 0;
      var adSpend = getVal('ad_spend', m);
      var agency = getVal('agency_fees', m);
      var otherMktg = getVal('other_marketing', m);
      var totalMktg = adSpend + agency + otherMktg;
      var mer = adSpend > 0 ? ns / adSpend : 0;
      var netAmer = totalMktg > 0 ? ns / totalMktg : 0;
      var shipping = getVal('shipping', m);
      var otherOpex = getVal('other_opex', m);
      var cm = gp - totalMktg - shipping - otherOpex;
      var cmPct = ns > 0 ? (cm / ns * 100) : 0;

      setCellVal('net_sales', m, ns);
      setCellVal('gross_profit', m, gp);
      setCellPct('gross_margin_pct', m, gmPct);
      setCellVal('total_mktg', m, totalMktg);
      setCellRatio('mer', m, mer);
      setCellRatio('net_amer', m, netAmer);
      setCellVal('contribution_margin', m, cm);
      setCellPct('contribution_margin_pct', m, cmPct);

      // Store calculated values for aggregation
      setCalc('net_sales', m, ns);
      setCalc('gross_profit', m, gp);
      setCalc('gross_margin_pct', m, gmPct);
      setCalc('total_mktg', m, totalMktg);
      setCalc('mer', m, mer);
      setCalc('net_amer', m, netAmer);
      setCalc('contribution_margin', m, cm);
      setCalc('contribution_margin_pct', m, cmPct);
    }

    // MoM changes
    calcMoM('net_sales', 'net_sales_mom');
    calcMoM('contribution_margin_pct', 'cm_mom');

    // Aggregates for P&L
    aggregateRows(PNL_ROWS);
  }

  function calcGrowth() {
    for (var m = 1; m <= 12; m++) {
      var totalOrders = getVal('total_orders', m);
      var newCust = getVal('new_cust_orders', m);
      var repeat = totalOrders - newCust;
      var newPct = totalOrders > 0 ? (newCust / totalOrders * 100) : 0;
      var ns = getCalc('net_sales', m);
      var aovAll = totalOrders > 0 ? ns / totalOrders : 0;
      var aovNew = getVal('aov_new', m);
      var newCustRev = newCust * aovNew;
      var adSpend = getVal('ad_spend', m);
      var blendedCac = newCust > 0 ? adSpend / newCust : 0;
      var totalMktg = getCalc('total_mktg', m);
      var netNcac = newCust > 0 ? totalMktg / newCust : 0;
      var yrAov = getVal('yr_aov', m);
      var yrFreq = getVal('yr_freq', m);
      var yrLtv = yrAov * yrFreq;
      var ltvCac = blendedCac > 0 ? yrLtv / blendedCac : 0;
      var ltvNcac = netNcac > 0 ? yrLtv / netNcac : 0;

      setCellVal('repeat_orders', m, repeat);
      setCellPct('new_cust_pct', m, newPct);
      setCellVal('aov_all', m, aovAll);
      setCellVal('new_cust_revenue', m, newCustRev);
      setCellVal('blended_cac', m, blendedCac);
      setCellVal('net_ncac', m, netNcac);
      setCellVal('yr_ltv', m, yrLtv);
      setCellRatio('ltv_cac', m, ltvCac);
      setCellRatio('ltv_ncac', m, ltvNcac);

      setCalc('repeat_orders', m, repeat);
      setCalc('new_cust_pct', m, newPct);
      setCalc('aov_all', m, aovAll);
      setCalc('new_cust_revenue', m, newCustRev);
      setCalc('blended_cac', m, blendedCac);
      setCalc('net_ncac', m, netNcac);
      setCalc('yr_ltv', m, yrLtv);
      setCalc('ltv_cac', m, ltvCac);
      setCalc('ltv_ncac', m, ltvNcac);
    }

    aggregateRows(GROWTH_ROWS);
  }

  function calcChannels() {
    var totalSpendByMonth = {};
    var totalRevByMonth = {};

    CHANNELS.forEach(function(ch) {
      var slug = ch.toLowerCase().replace(/[^a-z]/g, '');
      var isEmailSms = ch === 'Email / SMS';

      for (var m = 1; m <= 12; m++) {
        if (!isEmailSms) {
          var spend = getVal('ch_' + slug + '_spend', m);
          var rev = getVal('ch_' + slug + '_revenue', m);
          var roas = spend > 0 ? rev / spend : 0;
          setCellRatio('ch_' + slug + '_roas', m, roas);
          setCalc('ch_' + slug + '_roas', m, roas);

          totalSpendByMonth[m] = (totalSpendByMonth[m] || 0) + spend;
          totalRevByMonth[m] = (totalRevByMonth[m] || 0) + rev;
        } else {
          var emailRev = getVal('ch_' + slug + '_revenue', m);
          totalRevByMonth[m] = (totalRevByMonth[m] || 0) + emailRev;
        }
      }
    });

    // Totals
    for (var m = 1; m <= 12; m++) {
      var ts = totalSpendByMonth[m] || 0;
      var tr = totalRevByMonth[m] || 0;
      var totalRoas = ts > 0 ? tr / ts : 0;
      setCellVal('ch_total_spend', m, ts);
      setCellVal('ch_total_revenue', m, tr);
      setCellRatio('ch_total_roas', m, totalRoas);
      setCalc('ch_total_spend', m, ts);
      setCalc('ch_total_revenue', m, tr);
      setCalc('ch_total_roas', m, totalRoas);
    }

    // Aggregate channel rows
    var channelRows = [];
    CHANNELS.forEach(function(ch) {
      var slug = ch.toLowerCase().replace(/[^a-z]/g, '');
      var isEmailSms = ch === 'Email / SMS';
      if (!isEmailSms) {
        channelRows.push({ key: 'ch_' + slug + '_spend', type: 'input' });
        channelRows.push({ key: 'ch_' + slug + '_roas', type: 'calc_ratio' });
      }
      channelRows.push({ key: 'ch_' + slug + '_revenue', type: 'input' });
    });
    channelRows.push({ key: 'ch_total_spend', type: 'calc' });
    channelRows.push({ key: 'ch_total_revenue', type: 'calc' });
    channelRows.push({ key: 'ch_total_roas', type: 'calc_ratio' });
    aggregateRows(channelRows);
  }

  // ── Stored calc values (for cross-table references) ──

  var calcStore = {};

  function setCalc(key, month, val) {
    if (!calcStore[key]) calcStore[key] = {};
    calcStore[key][month] = val;
  }

  function getCalc(key, month) {
    if (!calcStore[key]) return 0;
    return calcStore[key][month] || 0;
  }

  // ── MoM % Change ──

  function calcMoM(sourceKey, targetKey) {
    for (var m = 1; m <= 12; m++) {
      var curr = getCalc(sourceKey, m);
      var prev = m > 1 ? getCalc(sourceKey, m - 1) : 0;
      var pctChange = (prev !== 0 && m > 1) ? ((curr - prev) / Math.abs(prev) * 100) : 0;

      var cells = document.querySelectorAll('[data-calc-key="' + targetKey + '"][data-month="' + m + '"]');
      cells.forEach(function(cell) {
        if (m === 1 || prev === 0) {
          cell.textContent = '—';
          cell.className = '';
        } else {
          cell.textContent = (pctChange >= 0 ? '+' : '') + pctChange.toFixed(1) + '%';
          cell.className = pctChange >= 0 ? 'dash-val--positive' : 'dash-val--negative';
        }
      });

      setCalc(targetKey, m, pctChange);
    }

    // Clear Q and FY for MoM rows
    document.querySelectorAll('[data-calc-key="' + targetKey + '"][data-quarter]').forEach(function(c) { c.textContent = '—'; });
    document.querySelectorAll('[data-calc-key="' + targetKey + '"][data-fy]').forEach(function(c) { c.textContent = '—'; });
  }

  // ── Aggregation (Quarterly + Full Year) ──

  function aggregateRows(rows) {
    rows.forEach(function(row) {
      if (row.type === 'pct_change') return; // skip MoM rows

      var isRatio = row.type === 'calc_ratio';
      var isPct = row.type === 'calc_pct';
      var isAvg = isRatio || isPct;
      var key = row.key;

      // Get monthly values (from calc store for calc rows, from data for input rows)
      var monthlyVals = [];
      for (var m = 1; m <= 12; m++) {
        var v;
        if (row.type === 'input' || row.type === 'input_num') {
          v = getVal(key, m);
        } else {
          v = getCalc(key, m);
        }
        monthlyVals.push(v);
      }

      // Quarters
      for (var q = 1; q <= 4; q++) {
        var startM = (q - 1) * 3;
        var qVals = monthlyVals.slice(startM, startM + 3);
        var qVal;
        if (isAvg) {
          var nonZero = qVals.filter(function(v) { return v !== 0; });
          qVal = nonZero.length > 0 ? nonZero.reduce(function(a, b) { return a + b; }, 0) / nonZero.length : 0;
        } else {
          qVal = qVals.reduce(function(a, b) { return a + b; }, 0);
        }
        setCellAgg(key, 'quarter', q, qVal, row.type);
      }

      // Full year
      var fyVal;
      if (isAvg) {
        var nonZero = monthlyVals.filter(function(v) { return v !== 0; });
        fyVal = nonZero.length > 0 ? nonZero.reduce(function(a, b) { return a + b; }, 0) / nonZero.length : 0;
      } else {
        fyVal = monthlyVals.reduce(function(a, b) { return a + b; }, 0);
      }
      setCellAgg(key, 'fy', '1', fyVal, row.type);

      // Store full year for summary
      setCalc(key + '_fy', 0, fyVal);
    });
  }

  // ── Cell Setters ──

  function setCellVal(key, month, val) {
    var cells = document.querySelectorAll('[data-calc-key="' + key + '"][data-month="' + month + '"]');
    cells.forEach(function(cell) {
      if (val === 0) {
        cell.textContent = '—';
        cell.className = '';
      } else {
        cell.textContent = '$' + formatNum(val);
        cell.className = val < 0 ? 'dash-val--negative' : '';
        if (val < 0) cell.textContent = '($' + formatNum(Math.abs(val)) + ')';
      }
    });
  }

  function setCellPct(key, month, val) {
    var cells = document.querySelectorAll('[data-calc-key="' + key + '"][data-month="' + month + '"]');
    cells.forEach(function(cell) {
      cell.textContent = val !== 0 ? val.toFixed(1) + '%' : '—';
    });
  }

  function setCellRatio(key, month, val) {
    var cells = document.querySelectorAll('[data-calc-key="' + key + '"][data-month="' + month + '"]');
    cells.forEach(function(cell) {
      cell.textContent = val !== 0 ? val.toFixed(2) + 'x' : '—';
    });
  }

  function setCellAgg(key, attrName, attrVal, val, type) {
    var selector = '[data-calc-key="' + key + '"][data-' + attrName + '="' + attrVal + '"]';
    var cells = document.querySelectorAll(selector);
    cells.forEach(function(cell) {
      if (type === 'calc_ratio') {
        cell.textContent = val !== 0 ? val.toFixed(2) + 'x' : '—';
      } else if (type === 'calc_pct') {
        cell.textContent = val !== 0 ? val.toFixed(1) + '%' : '—';
      } else {
        if (val === 0) {
          cell.textContent = '—';
          cell.className = cell.className.replace(/dash-val--negative/g, '');
        } else if (val < 0) {
          cell.textContent = '($' + formatNum(Math.abs(val)) + ')';
          if (cell.className.indexOf('dash-val--negative') === -1) {
            cell.className += ' dash-val--negative';
          }
        } else {
          cell.textContent = '$' + formatNum(val);
          cell.className = cell.className.replace(/dash-val--negative/g, '');
        }
      }
    });
  }

  // ── Summary Cards ──

  function updateSummary() {
    var fyNetSales = getCalc('net_sales_fy', 0) || 0;
    var fyCm = getCalc('contribution_margin_fy', 0) || 0;
    var fyCmPct = getCalc('contribution_margin_pct_fy', 0) || 0;
    var fyMer = getCalc('mer_fy', 0) || 0;
    var fyCac = getCalc('blended_cac_fy', 0) || 0;
    var fyLtvCac = getCalc('ltv_cac_fy', 0) || 0;

    setText('sum-net-sales', fyNetSales ? '$' + formatNum(fyNetSales) : '$0');
    setText('sum-cm', fyCm ? (fyCm < 0 ? '($' + formatNum(Math.abs(fyCm)) + ')' : '$' + formatNum(fyCm)) : '$0');
    setText('sum-cm-pct', fyCmPct ? fyCmPct.toFixed(1) + '%' : '0%');
    setText('sum-mer', fyMer ? fyMer.toFixed(1) + 'x' : '0x');
    setText('sum-cac', fyCac ? '$' + formatNum(fyCac) : '$0');
    setText('sum-ltv-cac', fyLtvCac ? fyLtvCac.toFixed(1) + 'x' : '0x');
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // ── CSV Export ──

  function exportCSV() {
    var lines = [];
    var headers = ['Metric'];
    MONTHS.forEach(function(m) { headers.push(m); });
    QUARTERS.forEach(function(q) { headers.push(q); });
    headers.push('Full Year');
    lines.push(headers.join(','));

    // P&L
    lines.push('');
    lines.push('P&L');
    PNL_ROWS.forEach(function(row) {
      lines.push(exportRow(row));
    });

    // Growth
    lines.push('');
    lines.push('Growth Metrics');
    GROWTH_ROWS.forEach(function(row) {
      lines.push(exportRow(row));
    });

    var csv = lines.join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'refractive-growth-dashboard-' + currentYear + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportRow(row) {
    var vals = ['"' + row.label + '"'];
    for (var m = 1; m <= 12; m++) {
      var v = (row.type === 'input' || row.type === 'input_num') ? getVal(row.key, m) : getCalc(row.key, m);
      vals.push(v || 0);
    }
    // Quarters
    for (var q = 1; q <= 4; q++) {
      var cells = document.querySelectorAll('[data-calc-key="' + row.key + '"][data-quarter="' + q + '"]');
      vals.push(cells.length ? cells[0].textContent.replace(/[$,x%()]/g, '') : '0');
    }
    // FY
    var fyCells = document.querySelectorAll('[data-calc-key="' + row.key + '"][data-fy="1"]');
    vals.push(fyCells.length ? fyCells[0].textContent.replace(/[$,x%()]/g, '') : '0');
    return vals.join(',');
  }

  // ── Utility ──

  function parseCurrency(str) {
    if (!str) return 0;
    var val = parseFloat(str.replace(/[^0-9.\-]/g, ''));
    return isNaN(val) ? 0 : val;
  }

  function formatNum(n) {
    if (isNaN(n) || !isFinite(n)) return '0';
    return Math.round(n).toLocaleString('en-US');
  }

})();
