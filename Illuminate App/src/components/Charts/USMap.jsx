import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";

const FIPS = {
  "01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT",
  "10":"DE","11":"DC","12":"FL","13":"GA","15":"HI","16":"ID","17":"IL",
  "18":"IN","19":"IA","20":"KS","21":"KY","22":"LA","23":"ME","24":"MD",
  "25":"MA","26":"MI","27":"MN","28":"MS","29":"MO","30":"MT","31":"NE",
  "32":"NV","33":"NH","34":"NJ","35":"NM","36":"NY","37":"NC","38":"ND",
  "39":"OH","40":"OK","41":"OR","42":"PA","44":"RI","45":"SC","46":"SD",
  "47":"TN","48":"TX","49":"UT","50":"VT","51":"VA","53":"WA","54":"WV",
  "55":"WI","56":"WY",
};

const STATE_NAMES = {
  AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",
  CO:"Colorado",CT:"Connecticut",DE:"Delaware",DC:"District of Columbia",
  FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",
  IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",
  ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",
  MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",
  NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",
  NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",
  OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",
  SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",
  VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",
};

const fmtD = (n) => {
  if (n == null) return "—";
  if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
  return "$" + Math.round(n).toLocaleString();
};

function interpolateColor(t) {
  const c = Math.max(0, Math.min(1, t));
  const r = Math.round(15 + (67 - 15) * (1 - c));
  const g = Math.round(25 + (169 - 25) * (1 - c));
  const b = Math.round(40 + (243 - 40) * (1 - c));
  const a = 0.15 + c * 0.85;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export default function USMap({ data = [], valueKey = "revenue" }) {
  const svgRef = useRef(null);
  const [topoData, setTopoData] = useState(null);
  const [hovered, setHovered] = useState(null);

  const dataMap = useMemo(() => {
    const m = {};
    data.forEach((d) => { m[d.state] = d; });
    return m;
  }, [data]);

  const { minVal, maxVal } = useMemo(() => {
    const vals = data.map((d) => d[valueKey] ?? 0);
    const lo = Math.min(...vals, 0);
    const hi = Math.max(...vals, 1);
    return { minVal: lo, maxVal: hi === lo ? lo + 1 : hi };
  }, [data, valueKey]);

  const getNorm = (v) => (v - minVal) / (maxVal - minVal);

  // Load TopoJSON once
  useEffect(() => {
    d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json").then((us) => {
      setTopoData(us);
    });
  }, []);

  // Features + path generator
  const { features, pathGen } = useMemo(() => {
    if (!topoData) return { features: [], pathGen: null };
    const projection = d3.geoAlbersUsa().scale(1100).translate([480, 300]);
    const pg = d3.geoPath().projection(projection);
    const feats = topojson.feature(topoData, topoData.objects.states).features;
    return { features: feats, pathGen: pg };
  }, [topoData]);

  const hoveredState = hovered ? dataMap[hovered] : null;

  if (!topoData) {
    return (
      <div className="flex items-center justify-center h-[400px] text-[var(--text-muted)] text-sm">
        Loading map...
      </div>
    );
  }

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox="0 0 960 600"
        className="w-full h-auto"
        style={{ maxHeight: 480 }}
      >
        {/* State borders mesh */}
        <path
          d={d3.geoPath().projection(d3.geoAlbersUsa().scale(1100).translate([480, 300]))(
            topojson.mesh(topoData, topoData.objects.states, (a, b) => a !== b)
          )}
          fill="none"
          stroke="var(--border-color)"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />

        {/* State fills */}
        {features.map((feat) => {
          const fips = feat.id.toString().padStart(2, "0");
          const abbr = FIPS[fips];
          if (!abbr) return null;
          const d = dataMap[abbr];
          const val = d?.[valueKey] ?? 0;
          const t = getNorm(val);
          const fill = d ? interpolateColor(t) : "rgba(255,255,255,0.03)";
          const isHovered = hovered === abbr;

          return (
            <path
              key={fips}
              d={pathGen(feat)}
              fill={fill}
              stroke={isHovered ? "#43a9df" : "var(--border-color)"}
              strokeWidth={isHovered ? 2 : 0.5}
              strokeLinejoin="round"
              style={{
                cursor: "pointer",
                transition: "fill 200ms, stroke-width 150ms",
                filter: isHovered ? "brightness(1.3)" : "none",
              }}
              onMouseEnter={() => setHovered(abbr)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}

        {/* State labels for larger states */}
        {features.map((feat) => {
          const fips = feat.id.toString().padStart(2, "0");
          const abbr = FIPS[fips];
          if (!abbr) return null;
          const centroid = pathGen.centroid(feat);
          if (!centroid || isNaN(centroid[0])) return null;
          // Only label states with enough area
          const area = pathGen.area(feat);
          if (area < 800) return null;
          return (
            <text
              key={`label-${fips}`}
              x={centroid[0]}
              y={centroid[1]}
              textAnchor="middle"
              dominantBaseline="central"
              fill="var(--text-primary)"
              fontSize="9"
              fontWeight="600"
              fontFamily="Inter, sans-serif"
              style={{ pointerEvents: "none", opacity: 0.7 }}
            >
              {abbr}
            </text>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredState && (
        <div className="absolute top-3 right-3 bg-[var(--tooltip-bg)] border border-[var(--tooltip-border)] backdrop-blur-xl rounded-lg px-4 py-3 shadow-lg text-xs min-w-[170px] pointer-events-none z-20">
          <p className="font-semibold text-[var(--text-primary)] text-sm mb-2">
            {STATE_NAMES[hovered] || hovered}
          </p>
          <div className="space-y-1">
            {[
              { k: "revenue", l: "Revenue" },
              { k: "orders", l: "Orders" },
              { k: "aov", l: "AOV" },
              { k: "cac", l: "CAC" },
              { k: "roas", l: "ROAS" },
              { k: "netMargin", l: "Net Margin" },
            ].map(({ k, l }) => {
              const v = hoveredState[k];
              const isActive = k === valueKey;
              const formatted = k === "roas" ? (v?.toFixed(1) + "x") : k === "orders" ? v?.toLocaleString() : fmtD(v);
              return (
                <div key={k} className="flex justify-between gap-3">
                  <span className={isActive ? "text-[var(--accent-blue)] font-medium" : "text-[var(--text-muted)]"}>{l}</span>
                  <span className={`font-medium ${
                    k === "netMargin" ? (v >= 0 ? "text-[var(--badge-positive-text)]" : "text-[var(--badge-negative-text)]") :
                    isActive ? "text-[var(--accent-blue)]" : "text-[var(--text-primary)]"
                  }`}>
                    {formatted}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 px-1">
        <span className="text-[10px] text-[var(--text-muted)]">Low</span>
        <div className="flex-1 h-2 rounded-full" style={{ background: "linear-gradient(to right, rgba(15,25,40,0.15), rgba(67,169,243,1))" }} />
        <span className="text-[10px] text-[var(--text-muted)]">High</span>
      </div>
    </div>
  );
}
