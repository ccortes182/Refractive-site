/* ==========================================================================
   Health Check — Calculator + Operator Read
   ========================================================================== */

(function() {
  document.addEventListener('DOMContentLoaded', function() {
    var inputs = {
      revenue:   document.getElementById('hc-revenue'),
      adspend:   document.getElementById('hc-adspend'),
      customers: document.getElementById('hc-customers'),
      aov:       document.getElementById('hc-aov'),
      margin:    document.getElementById('hc-margin')
    };

    var resultsEl = document.getElementById('hc-results');
    var emptyEl   = document.getElementById('hc-empty');
    var readEl    = document.getElementById('hc-read');

    if (!inputs.revenue || !resultsEl) return;

    // Bind real-time calculation
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
      var revenue   = parseCurrency(inputs.revenue.value);
      var adspend   = parseCurrency(inputs.adspend.value);
      var customers = parseCurrency(inputs.customers.value);
      var aov       = parseCurrency(inputs.aov.value);
      var marginPct = parseCurrency(inputs.margin.value);

      // Check if we have enough data
      var hasBasic = !isNaN(revenue) && !isNaN(adspend) && revenue > 0 && adspend > 0;

      if (!hasBasic) {
        resultsEl.style.display = 'none';
        emptyEl.style.display = '';
        readEl.textContent = '';
        return;
      }

      resultsEl.style.display = '';
      emptyEl.style.display = 'none';

      var statuses = {};

      // 1. MER
      var mer = revenue / adspend;
      document.getElementById('val-mer').textContent = fmt(mer, 1) + 'x';
      if (mer >= 4) {
        setStatus('mer', 'healthy', 'Healthy');
        statuses.mer = 'healthy';
      } else if (mer >= 2.5) {
        setStatus('mer', 'watch', 'Watch');
        statuses.mer = 'watch';
      } else {
        setStatus('mer', 'critical', 'Critical');
        statuses.mer = 'critical';
      }

      // 2. Blended CAC
      var cac = NaN;
      if (!isNaN(customers) && customers > 0) {
        cac = adspend / customers;
        document.getElementById('val-cac').textContent = '$' + fmt(cac, 0);
        if (!isNaN(aov) && aov > 0) {
          if (cac < aov * 0.5) {
            setStatus('cac', 'healthy', 'Healthy');
            statuses.cac = 'healthy';
          } else if (cac < aov) {
            setStatus('cac', 'watch', 'Watch');
            statuses.cac = 'watch';
          } else {
            setStatus('cac', 'critical', 'Critical');
            statuses.cac = 'critical';
          }
        } else {
          clearStatus('cac');
        }
      } else {
        document.getElementById('val-cac').textContent = '--';
        clearStatus('cac');
      }

      // 3. CAC:AOV Ratio
      if (!isNaN(cac) && !isNaN(aov) && aov > 0) {
        var cacAov = cac / aov;
        document.getElementById('val-cac-aov').textContent = fmt(cacAov, 2) + 'x';
        if (cacAov < 0.5) {
          setStatus('cac-aov', 'healthy', 'Healthy');
          statuses.cacAov = 'healthy';
        } else if (cacAov <= 0.8) {
          setStatus('cac-aov', 'watch', 'Watch');
          statuses.cacAov = 'watch';
        } else {
          setStatus('cac-aov', 'critical', 'Critical');
          statuses.cacAov = 'critical';
        }
      } else {
        document.getElementById('val-cac-aov').textContent = '--';
        clearStatus('cac-aov');
      }

      // 4. Gross Margin
      if (!isNaN(marginPct)) {
        document.getElementById('val-gm').textContent = fmt(marginPct, 1) + '%';
        if (marginPct >= 55) {
          setStatus('gm', 'healthy', 'Healthy');
          statuses.gm = 'healthy';
        } else if (marginPct >= 40) {
          setStatus('gm', 'watch', 'Watch');
          statuses.gm = 'watch';
        } else {
          setStatus('gm', 'critical', 'Critical');
          statuses.gm = 'critical';
        }
      } else {
        document.getElementById('val-gm').textContent = '--';
        clearStatus('gm');
      }

      // 5. Contribution Margin
      if (!isNaN(marginPct) && !isNaN(revenue)) {
        var cmDollar = (marginPct / 100 * revenue) - adspend;
        var cmPct = cmDollar / revenue * 100;
        document.getElementById('val-cm').textContent = '$' + fmt(cmDollar, 0) + ' (' + fmt(cmPct, 1) + '%)';
        if (cmPct >= 20) {
          setStatus('cm', 'healthy', 'Healthy');
          statuses.cm = 'healthy';
        } else if (cmPct >= 10) {
          setStatus('cm', 'watch', 'Watch');
          statuses.cm = 'watch';
        } else {
          setStatus('cm', 'critical', 'Critical');
          statuses.cm = 'critical';
        }
      } else {
        document.getElementById('val-cm').textContent = '--';
        clearStatus('cm');
      }

      // 6. Break-Even MER
      if (!isNaN(marginPct) && marginPct > 0) {
        var beMer = 1 / (marginPct / 100);
        document.getElementById('val-be').textContent = fmt(beMer, 2) + 'x';
        var aboveBelow = mer >= beMer ? 'above' : 'below';
        document.getElementById('bench-be').textContent =
          'This is the minimum MER at which you\'re gross-margin positive on paid spend. Your current MER of ' +
          fmt(mer, 1) + 'x is ' + aboveBelow + ' your break-even threshold.';
      } else {
        document.getElementById('val-be').textContent = '--';
      }

      // Operator read
      buildOperatorRead(statuses, mer, cac, aov, marginPct);
    }

    function setStatus(metric, status, label) {
      var badge = document.getElementById('badge-' + metric);
      badge.className = 'hc-metric__badge hc-metric__badge--' + status;
      badge.textContent = label;
    }

    function clearStatus(metric) {
      var badge = document.getElementById('badge-' + metric);
      badge.className = 'hc-metric__badge';
      badge.textContent = '';
    }

    function buildOperatorRead(s, mer, cac, aov, margin) {
      var parts = [];

      // MER read
      if (s.mer === 'healthy') {
        parts.push('Your MER is healthy at ' + fmt(mer, 1) + 'x — you have room to scale spend if unit economics hold.');
      } else if (s.mer === 'watch') {
        parts.push('Your MER of ' + fmt(mer, 1) + 'x is in watch territory. Not critical, but you\'re closer to break-even than you want to be before scaling.');
      } else if (s.mer === 'critical') {
        parts.push('Your MER of ' + fmt(mer, 1) + 'x is in the danger zone. At this ratio, you\'re likely spending more on acquisition than you\'re keeping in margin.');
      }

      // CAC read
      if (s.cacAov === 'critical') {
        parts.push('Your CAC:AOV ratio is above 0.8x — you\'re dependent on repeat purchases to break even on every new customer.');
      } else if (s.cacAov === 'watch' && !isNaN(cac)) {
        parts.push('CAC:AOV ratio suggests acquisition efficiency is tightening. Keep an eye on this as you scale.');
      }

      // Margin read
      if (s.gm === 'critical') {
        parts.push('Gross margin at ' + fmt(margin, 0) + '% is thin. At this level, even efficient acquisition can\'t save profitability — fix COGS or pricing before anything else.');
      } else if (s.gm === 'watch') {
        parts.push('Gross margin at ' + fmt(margin, 0) + '% is workable but leaves limited room for paid scale — consider AOV improvement or margin expansion before increasing spend.');
      }

      // CM read
      if (s.cm === 'critical') {
        parts.push('Contribution margin is below 10%. You\'re not covering acquisition costs with what\'s left after COGS. This needs immediate attention.');
      } else if (s.cm === 'watch') {
        parts.push('Contribution margin is in the 10–20% range — profitable but tight. Focus on either margin expansion or CAC reduction to build more headroom.');
      }

      if (parts.length === 0) {
        parts.push('Your numbers look solid across the board. This is a healthy foundation for scaling paid acquisition.');
      }

      readEl.textContent = parts.join(' ');
    }
  });
})();
