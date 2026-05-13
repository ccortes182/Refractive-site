export default function BrandName({ trademark = false, className = '' }) {
  return (
    <span className={`brand-name ${className}`.trim()}>
      Lucerna{trademark && <sup>&trade;</sup>}
    </span>
  );
}
