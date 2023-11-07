import * as React from 'react'
import { SVGProps } from 'react'
const LockIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="-0.25 -0.25 14.5 14.5"
    strokeWidth={1.5}
    role="img"
    {...props}
  >
    <g>
      <rect
        x={2}
        y={5.5}
        width={10}
        height={8}
        rx={1}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.5,5.5V4a3.5,3.5,0,0,0-7,0V5.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={7}
        cy={9.5}
        r={0.5}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  </svg>
)
export default LockIcon
