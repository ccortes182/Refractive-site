import React from 'react';
import { useTheme } from '../../context/ThemeContext';

function getGradientColors(score) {
  if (score >= 80) return ['#43a9df', '#34d399'];
  if (score >= 50) return ['#43a9df', '#fbbf24'];
  return ['#f87171', '#fbbf24'];
}

export default function GaugeChart({ score = 0, label = '', size = 180 }) {
  const { theme } = useTheme();

  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  // Arc spans 270 degrees: from 135deg to 405deg (i.e. 135 to 135+270)
  const totalAngle = 270;
  const startAngle = 135;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (totalAngle / 360) * circumference;
  const filledLength = (Math.min(Math.max(score, 0), 100) / 100) * arcLength;
  const offset = arcLength - filledLength;

  const [color1, color2] = getGradientColors(score);
  const gradientId = `gauge-grad-${label.replace(/\s+/g, '-')}`;

  // Rotate so the arc starts at 135deg (bottom-left)
  // SVG circle starts at 3 o'clock (0deg), we need 135deg, so rotate 135deg
  const rotation = startAngle;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color1} />
          <stop offset="100%" stopColor={color2} />
        </linearGradient>
      </defs>

      {/* Background arc */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="var(--border-color)"
        strokeWidth={strokeWidth}
        strokeDasharray={`${arcLength} ${circumference}`}
        strokeLinecap="round"
        transform={`rotate(${rotation} ${center} ${center})`}
      />

      {/* Foreground arc */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        strokeDasharray={`${arcLength} ${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(${rotation} ${center} ${center})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />

      {/* Score number */}
      <text
        x={center}
        y={center - size * 0.02}
        textAnchor="middle"
        dominantBaseline="central"
        fill={theme === 'dark' ? '#ffffff' : '#1e293b'}
        fontSize={size * 0.26}
        fontWeight="700"
        fontFamily="inherit"
      >
        {Math.round(score)}
      </text>

      {/* Label */}
      <text
        x={center}
        y={center + size * 0.16}
        textAnchor="middle"
        dominantBaseline="central"
        fill={theme === 'dark' ? 'rgba(255,255,255,0.4)' : '#94a3b8'}
        fontSize={size * 0.09}
        fontFamily="inherit"
      >
        {label}
      </text>
    </svg>
  );
}
