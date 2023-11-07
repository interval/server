import * as React from 'react'
import { SVGProps } from 'react'
const FolderIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 30 30"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    role="img"
    {...props}
  >
    <path d="m4 3c-1.105 0-2 .895-2 2v3h11 15v-1c0-1.105-.895-2-2-2h-14.800781l-.617188-1.0292969c-.361-.602-1.0118435-.9707031-1.7148435-.9707031zm-1 7c-.552 0-1 .448-1 1v12c0 1.105.895 2 2 2h22c1.105 0 2-.895 2-2v-12c0-.552-.448-1-1-1z" />
  </svg>
)
export default FolderIcon
