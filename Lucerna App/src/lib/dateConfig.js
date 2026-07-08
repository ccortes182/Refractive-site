// Shared date-range configuration used by Header and DateRangePicker.
// `label` is the compact form (header pills); `longLabel` is the full form
// (calendar dropdown).

export const PRESETS = [
  { days: 7, label: "7D", longLabel: "Last 7 days", key: "7d" },
  { days: 30, label: "30D", longLabel: "Last 30 days", key: "30d" },
  { days: 90, label: "90D", longLabel: "Last 90 days", key: "90d" },
];

export const COMPARE_MODES = [
  { key: "previous", label: "Prior", longLabel: "Previous Period" },
  { key: "yoy", label: "YOY", longLabel: "Year over Year" },
  { key: "custom", label: "Custom", longLabel: "Custom Range" },
];
