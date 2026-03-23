/* ==========================================================================
   CAC Payback Calculator
   ========================================================================== */

(function() {
  document.addEventListener('DOMContentLoaded', function() {
    var inputs = {
      cac:       document.getElementById('cp-cac'),
      aov:       document.getElementById('cp-aov'),
      margin:    document.getElementById('cp-margin'),
      repeatRate:document.getElementById('cp-repeat-rate'),
      repeatAov: document.getElementById('cp-repeat-aov')
    };

    var emptyEl   = document.getElementById('cp-empty');
    var summaryEl = document.getElementById('cp-summary');
    var chartWrap = document.getElementById('cp-chart-wrap');
    var resultsEl = document.getElementById('cp-results');
    var readEl    = document.getElementById('cp-read');

    if (!inputs.cac) return;

    Object.keys(inputs).forEach(function(key) {
      inputs[key].addEventListener('input', function() {
        formatCurrency(this);
        calculate();
      });
    });

    function parseCurrency(str) {
      if (!str) return NaN;
      return parseFloat(str.replace(/[^0-9.\-]/g, ''));
    }

    function formatCurrency(el) {
      var raw = el.value.replace(/[^0-9.]/g, '');
      if (!raw) return;
      var parts = raw.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      el.value = parts.join('.');
    }

    function fmt(n, decimals) {
      if (isNaN(n) || !isFinite(n)) return '--';
      return n.toLocaleString('en-US', {
        minimumFractionDigits: decimals || 0,
        maximumFractionDigits: decimals || 0
      });
    }

    function calculate() {
      var cac        = parseCurrency(inputs.cac.value);
      var aov        = parseCurrency(inputs.aov.value);
      var marginPct  = parseCurrency(inputs.margin.value);
      var repeatRate = parseCurrency(inputs.repeatRate.value);
      var repeatAov  = parseCurrency(inputs.repeatAov.value);

      if (isNaN(cac) || isNaN(aov) || isNaN(marginPct) || cac <= 0 || aov <= 0 || marginPct <= 0) {
        emptyEl.style.display = '';
        summaryEl.style.display = 'none';
        chartWrap.style.display = 'none';
        resultsEl.style.display = 'none';
        readEl.textContent = '';
        return;
      }

      emptyEl.style.display = 'none';
      summaryEl.style.display = '';
      chartWrap.style.display = '';
      resultsEl.style.display = '';

      var margin = marginPct / 100;
      var firstMargin = aov * margin;
      var recovery = (firstMargin / cac) * 100;
      var deficit = cac - firstMargin;

      // Monthly payback curve
      var cumMargin = firstMargin;
      var monthlyMargins = [cumMargin];
      var paybackMonth = cumMargin >= cac ? 1 : null;
      var rRate = isNaN(repeatRate) ? 0 : repeatRate / 100;
      var rAov = isNaN(repeatAov) ? aov : repeatAov;
      var repeatMarginPerMonth = rRate * rAov * margin;

      for (var m = 2; m <= 12; m++) {
        cumMargin += repeatMarginPerMonth;
        monthlyMargins.push(cumMargin);
        if (paybackMonth === null && cumMargin >= cac) {
          paybackMonth = m;
        }
      }

      var roi12 = ((cumMargin - cac) / cac) * 100;

      // Orders to payback
      var ordersToPayback;
      if (firstMargin >= cac) {
        ordersToPayback = 1;
      } else if (repeatMarginPerMonth > 0) {
        var remainingAfterFirst = cac - firstMargin;
        var marginPerRepeat = rAov * margin;
        ordersToPayback = 1 + Math.ceil(remainingAfterFirst / marginPerRepeat);
      } else {
        ordersToPayback = null;
      }

      // Retention dependency
      var retentionDep = firstMargin >= cac ? 0 : ((cac - firstMargin) / cac) * 100;

      // Summary cards
      setText('val-first-margin', '$' + fmt(firstMargin, 0));
      setText('val-recovery', fmt(recovery, 0) + '%');
      setText('val-payback', paybackMonth ? 'Month ' + paybackMonth : '> 12');
      setText('val-roi', (roi12 >= 0 ? '+' : '') + fmt(roi12, 0) + '%');

      // Metric cards
      document.getElementById('val-deficit').textContent = deficit > 0 ? '$' + fmt(deficit, 0) : '$0 (profitable)';
      if (deficit <= 0) {
        setStatus('deficit', 'healthy', 'First-Order Profitable');
      } else if (deficit < cac * 0.5) {
        setStatus('deficit', 'watch', 'Partial Recovery');
      } else {
        setStatus('deficit', 'critical', 'Heavy Deficit');
      }

      document.getElementById('val-orders').textContent = ordersToPayback ? ordersToPayback + ' orders' : 'Never (no repeat)';
      if (ordersToPayback && ordersToPayback <= 2) {
        setStatus('orders', 'healthy', 'Healthy');
      } else if (ordersToPayback && ordersToPayback <= 4) {
        setStatus('orders', 'watch', 'Watch');
      } else {
        setStatus('orders', 'critical', 'Critical');
      }

      document.getElementById('val-dependency').textContent = fmt(retentionDep, 0) + '%';
      if (retentionDep <= 20) {
        setStatus('dependency', 'healthy', 'Low');
      } else if (retentionDep <= 50) {
        setStatus('dependency', 'watch', 'Moderate');
      } else {
        setStatus('dependency', 'critical', 'High');
      }

      // Chart
      renderChart(monthlyMargins, cac);

      // Operator read
      buildRead(cac, firstMargin, deficit, paybackMonth, recovery, retentionDep, roi12, ordersToPayback, rRate);
    }

    function renderChart(monthlyMargins, cac) {
      var chart = document.getElementById('cp-chart');
      var maxVal = Math.max.apply(null, monthlyMargins.concat([cac])) * 1.1 || 1;
      var html = '';

      if (cac > 0) {
        var cacPct = (cac / maxVal) * 100;
        html += '<div class="cohort-chart__cac-line" style="bottom:' + cacPct + '%">';
        html += '<span class="cohort-chart__cac-label">CAC $' + fmt(cac, 0) + '</span>';
        html += '</div>';
      }

      for (var m = 0; m < 12; m++) {
        var val = monthlyMargins[m] || 0;
        var pct = (val / maxVal) * 100;
        var above = val >= cac;
        html += '<div class="cohort-chart__bar">';
        html += '<span class="cohort-chart__val">$' + fmt(val, 0) + '</span>';
        html += '<div class="cohort-chart__fill cohort-chart__fill--' + (above ? 'above' : 'below') + '" style="height:' + pct + '%"></div>';
        html += '<span class="cohort-chart__label">M' + (m + 1) + '</span>';
        html += '</div>';
      }

      chart.innerHTML = html;
    }

    function setStatus(metric, status, label) {
      var badge = document.getElementById('badge-' + metric);
      badge.className = 'hc-metric__badge hc-metric__badge--' + status;
      badge.textContent = label;
    }

    function setText(id, text) {
      var el = document.getElementById(id);
      if (el) el.textContent = text;
    }

    function buildRead(cac, firstMargin, deficit, paybackMonth, recovery, retentionDep, roi12, ordersToPayback, rRate) {
      var parts = [];

      if (deficit <= 0) {
        parts.push('You recover your full $' + fmt(cac, 0) + ' CAC on the first order \u2014 every repeat purchase is pure margin.');
      } else {
        parts.push('Your first order recovers ' + fmt(recovery, 0) + '% of CAC, leaving a $' + fmt(deficit, 0) + ' deficit that needs to be closed by repeat purchases.');
      }

      if (paybackMonth) {
        if (paybackMonth <= 3) {
          parts.push('At current repeat rates, you hit full payback by Month ' + paybackMonth + ' \u2014 that gives you room to scale acquisition.');
        } else if (paybackMonth <= 6) {
          parts.push('Payback arrives at Month ' + paybackMonth + '. Not bad, but you\u2019re carrying that deficit for a while. Improving AOV or margin would shorten this.');
        } else {
          parts.push('Payback doesn\u2019t come until Month ' + paybackMonth + '. That\u2019s a long cash flow drag \u2014 consider whether CAC is too high or retention too low.');
        }
      } else if (rRate === 0) {
        parts.push('Without repeat purchases, payback depends entirely on first-order margin. You need retention to make this work.');
      } else {
        parts.push('At this repeat rate, you don\u2019t reach payback within 12 months. Something needs to change \u2014 CAC, margin, or retention.');
      }

      if (retentionDep > 50) {
        parts.push('Retention dependency is high at ' + fmt(retentionDep, 0) + '% \u2014 your post-purchase flow is load-bearing. If retention dips, profitability collapses.');
      }

      readEl.textContent = parts.join(' ');
    }
  });
})();
