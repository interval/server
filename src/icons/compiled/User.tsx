import * as React from 'react'
import { SVGProps } from 'react'
const UserIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="-0.25 -0.25 14.5 14.5"
    strokeWidth={1.5}
    role="img"
    {...props}
  >
    <g>
      <circle
        cx={7}
        cy={3.75}
        r={3.25}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.18,13.5a6.49,6.49,0,0,0-12.36,0Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  </svg>
)
export default UserIcon
