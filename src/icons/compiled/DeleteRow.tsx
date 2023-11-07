import * as React from 'react'
import { SVGProps } from 'react'
const DeleteRowIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 30 30"
    role="img"
    {...props}
  >
    <path d="M 3 8 C 1.897 8 1 8.897 1 10 L 1 20 C 1 21.103 1.897 22 3 22 L 14.058594 22 C 14.135594 21.305 14.297438 20.638 14.523438 20 L 3 20 L 3 10 L 27 10 L 27.001953 14.947266 C 27.730953 15.310266 28.4 15.766687 29 16.304688 L 29 10 C 29 8.897 28.103 8 27 8 L 3 8 z M 23 16 C 19.134 16 16 19.134 16 23 C 16 26.866 19.134 30 23 30 C 26.866 30 30 26.866 30 23 C 30 19.134 26.866 16 23 16 z M 20 22 L 26 22 C 26.552 22 27 22.447 27 23 C 27 23.553 26.552 24 26 24 L 20 24 C 19.448 24 19 23.553 19 23 C 19 22.447 19.448 22 20 22 z" />
  </svg>
)
export default DeleteRowIcon
