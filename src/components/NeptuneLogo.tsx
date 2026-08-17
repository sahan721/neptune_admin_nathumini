import { useId } from 'react';
import { classNames } from '../utils/format';

interface NeptuneLogoProps {
  /** Pixel size of the octagonal mark. */
  size?: number;
  /** Show the NEPTUNE wordmark next to the mark. */
  wordmark?: boolean;
  /** Text tone: dark on light surfaces, light on dark surfaces. */
  tone?: 'dark' | 'light';
  /** Optional small subtitle under the wordmark (e.g. WASTE COLLECTION). */
  subtitle?: string;
}

/** NEPTUNE brand mark — an octagonal badge holding a stylised trident. */
export function NeptuneMark({ size = 40 }: { size?: number }) {
  const gradId = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      style={{ flex: 'none' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2c8a52" />
          <stop offset="1" stopColor="#0f2c1b" />
        </linearGradient>
      </defs>
      <polygon
        points="46,24 39.6,39.6 24,46 8.4,39.6 2,24 8.4,8.4 24,2 39.6,8.4"
        fill={`url(#${gradId})`}
      />
      <g fill="#ffffff">
        <rect x="14" y="18" width="3" height="14" />
        <rect x="22.5" y="12" width="3" height="20" />
        <rect x="31" y="18" width="3" height="14" />
        <rect x="14" y="27.6" width="20" height="3.4" />
        <rect x="22.5" y="31" width="3" height="6" />
      </g>
    </svg>
  );
}

export function NeptuneLogo({
  size = 40,
  wordmark = false,
  tone = 'dark',
  subtitle,
}: NeptuneLogoProps) {
  return (
    <span className="np-logo">
      <NeptuneMark size={size} />
      {wordmark && (
        <span className="np-logo-text">
          <span className={classNames('np-logo-name', `tone-${tone}`)}>NEPTUNE</span>
          {subtitle && (
            <span className={classNames('np-logo-sub', `tone-${tone}`)}>{subtitle}</span>
          )}
        </span>
      )}
    </span>
  );
}