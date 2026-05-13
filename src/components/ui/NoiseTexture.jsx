import { useId } from 'react'

export default function NoiseTexture({
  className = '',
  frequency = 0.4,
  octaves = 6,
  slope = 0.15,
  noiseOpacity = 0.6,
  ...props
}) {
  const filterId = useId()

  return (
    <svg
      className={`pointer-events-none select-none absolute inset-0 w-full h-full ${className}`}
      style={{ zIndex: -1 }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <filter id={filterId}>
        <feTurbulence
          type="fractalNoise"
          baseFrequency={frequency}
          numOctaves={octaves}
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncR type="linear" slope={slope} />
          <feFuncG type="linear" slope={slope} />
          <feFuncB type="linear" slope={slope} />
        </feComponentTransfer>
      </filter>
      <rect
        width="100%"
        height="100%"
        filter={`url(#${filterId})`}
        opacity={noiseOpacity}
      />
    </svg>
  )
}
