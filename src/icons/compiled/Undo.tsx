import * as React from 'react'
import { SVGProps } from 'react'
const UndoIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 30 30"
    role="img"
    {...props}
  >
    <path d="M 10 3 L 4 9 L 10 15 L 10 11 L 17 11 C 19.785124 11 22 13.214876 22 16 C 22 18.785124 19.785124 21 17 21 L 14 21 A 2.0002 2.0002 0 1 0 14 25 L 17 25 C 21.67453 25 25.431086 21.342021 25.84375 16.769531 A 2.0002 2.0002 0 0 0 26 16 C 26 11.053124 21.946876 7 17 7 L 10 7 L 10 3 z" />
  </svg>
)
export default UndoIcon
