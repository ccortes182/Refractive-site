/* ==========================================================================
   Creative Scorecard — Production Health Calculator
   ========================================================================== */

(function() {
  document.addEventListener('DOMContentLoaded', function() {
    var inputs = {
      spend:     document.getElementById('cs-spend'),
      creatives: document.getElementById('cs-creatives'),
      channels:  document.getElementById('cs-channels'),
      lifespan:  document.getElementById('cs-lifespan'),
      winrate:   document.getElementById('cs-winrate')
    };

    var resultsEl = document.getElementById('cs-results');
    var emptyEl   = document.getElementById('cs-empty');
    var readEl    = document.getElementById('cs-read');

    if (!inputs.spend || !resultsEl) return;

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
      var spend     = parseCurrency(inputs.spend.value);
      var creatives = parseCurrency(inputs.creatives.value);
      var channels  = parseCurrency(inputs.channels.value);
      var lifespan  = parseCurrency(inputs.lifespan.value);
      var winrate   = parseCurrency(inputs.winrate.value);

      var hasBasic = !isNaN(creatives) && !isNaN(channels) && creatives > 0 && channels > 0;

      if (!hasBasic) {
        resultsEl.style.display = 'none';
        emptyEl.style.display = '';
        readEl.textContent = '';
        return;
      }

      resultsEl.style.display = '';
      emptyEl.style.display = 'none';

      var statuses = {};

      // 1. Creative Velocity (per channel per month)
      var velocity = creatives / channels;
      document.getElementById('val-velocity').textContent = fmt(velocity, 1) + ' / channel';
      if (velocity >= 8) {
        setStatus('velocity', 'healthy', 'Healthy');
        statuses.velocity = 'healthy';
      } else if (velocity >= 4) {
        setStatus('velocity', 'watch', 'Watch');
        statuses.velocity = 'watch';
      } else {
        setStatus('velocity', 'critical', 'Critical');
        statuses.velocity = 'critical';
      }

      // 2. Spend per Creative
      if (!isNaN(spend) && spend > 0) {
        var spc = spend / creatives;
        document.getElementById('val-spc').textContent = '$' + fmt(spc, 0);
        if (spc < 3000) {
          setStatus('spc', 'healthy', 'Healthy');
          statuses.spc = 'healthy';
        } else if (spc <= 6000) {
          setStatus('spc', 'watch', 'Watch');
          statuses.spc = 'watch';
        } else {
          setStatus('spc', 'critical', 'Critical');
          statuses.spc = 'critical';
        }
      } else {
        document.getElementById('val-spc').textContent = '--';
        clearStatus('spc');
      }

      // 3. Creative Coverage
      if (!isNaN(lifespan) && lifespan > 0) {
        var coverage = (creatives * lifespan) / 30 * 100;
        document.getElementById('val-coverage').textContent = fmt(coverage, 0) + '%';
        if (coverage >= 100) {
          setStatus('coverage', 'healthy', 'Healthy');
          statuses.coverage = 'healthy';
        } else if (coverage >= 60) {
          setStatus('coverage', 'watch', 'Watch');
          statuses.coverage = 'watch';
        } else {
          setStatus('coverage', 'critical', 'Critical');
          statuses.coverage = 'critical';
        }
      } else {
        document.getElementById('val-coverage').textContent = '--';
        clearStatus('coverage');
      }

      // 4. Win Rate
      if (!isNaN(winrate)) {
        document.getElementById('val-winrate').textContent = fmt(winrate, 0) + '%';
        if (winrate >= 30) {
          setStatus('winrate', 'healthy', 'Healthy');
          statuses.winrate = 'healthy';
        } else if (winrate >= 15) {
          setStatus('winrate', 'watch', 'Watch');
          statuses.winrate = 'watch';
        } else {
          setStatus('winrate', 'critical', 'Critical');
          statuses.winrate = 'critical';
        }
      } else {
        document.getElementById('val-winrate').textContent = '--';
        clearStatus('winrate');
      }

      // 5. Fatigue Risk
      if (!isNaN(lifespan) && lifespan > 0) {
        var coveragePct = (creatives * lifespan) / 30;
        var fatigueScore = coveragePct / channels;
        var fatigueLabel, fatigueStatus;
        if (fatigueScore >= 0.5) {
          fatigueLabel = 'Low';
          fatigueStatus = 'healthy';
        } else if (fatigueScore >= 0.25) {
          fatigueLabel = 'Medium';
          fatigueStatus = 'watch';
        } else {
          fatigueLabel = 'High';
          fatigueStatus = 'critical';
        }
        document.getElementById('val-fatigue').textContent = fatigueLabel;
        setStatus('fatigue', fatigueStatus, fatigueLabel);
        statuses.fatigue = fatigueStatus;
      } else {
        document.getElementById('val-fatigue').textContent = '--';
        clearStatus('fatigue');
      }

      buildOperatorRead(statuses, velocity, creatives, channels, lifespan, coverage);
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

    function buildOperatorRead(s, velocity, creatives, channels, lifespan, coverage) {
      var parts = [];

      // Velocity read
      parts.push('You\'re launching ' + fmt(creatives, 0) + ' creatives across ' + fmt(channels, 0) + ' channels \u2014 that\'s ' + fmt(velocity, 1) + ' per channel.');

      if (s.velocity === 'critical') {
        parts.push('That\'s below the minimum velocity threshold. Algorithms need fresh inputs to learn \u2014 at this volume, you\'re starving them.');
      } else if (s.velocity === 'watch') {
        parts.push('Velocity is workable but tight. One bad production week and you\'re running on fumes.');
      }

      // Coverage read
      if (s.coverage === 'critical' && !isNaN(lifespan)) {
        var stalePct = Math.max(0, 100 - coverage);
        parts.push('With a ' + fmt(lifespan, 0) + '-day lifespan, you\'re running on stale creative for roughly ' + fmt(stalePct, 0) + '% of each month. Increase production volume or extend creative lifespan through better iteration.');
      } else if (s.coverage === 'watch' && !isNaN(lifespan)) {
        parts.push('Creative coverage is close to full but not there yet. A ' + fmt(lifespan, 0) + '-day lifespan means you need a steady production cadence to avoid gaps.');
      }

      // Win rate read
      if (s.winrate === 'critical') {
        parts.push('Win rate below 15% usually means briefs are misaligned with audience, not that production quality is low. Revisit your creative strategy before scaling volume.');
      }

      // Spend concentration
      if (s.spc === 'critical') {
        parts.push('You\'re concentrating too much spend on too few creatives. If one fatigues, your whole account takes a hit.');
      }

      // All healthy
      if (s.velocity === 'healthy' && s.coverage === 'healthy' && s.fatigue === 'healthy') {
        parts.push('Your creative pipeline is in good shape. Focus on improving win rate and testing new formats to keep velocity high.');
      }

      readEl.textContent = parts.join(' ');
    }
  });
})();
