import * as React from 'react'
import { SVGProps } from 'react'
const ScheduleIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 30 30"
    role="img"
    {...props}
  >
    <path d="M 15 3 C 8.385 3 3 8.385 3 15 C 3 21.615 8.385 27 15 27 C 18.054 27 20.839938 25.844938 22.960938 23.960938 L 25 26 L 25 20 L 19 20 L 21.544922 22.544922 C 19.789922 24.068922 17.512 25 15 25 C 9.465 25 5 20.535 5 15 C 5 9.465 9.465 5 15 5 C 20.535 5 25 9.465 25 15 C 24.992 15.552 25.434328 16.005672 25.986328 16.013672 C 26.538328 16.021672 26.992 15.579344 27 15.027344 L 27 15 C 27 8.385 21.615 3 15 3 z M 14 7 C 13.447 7 13 7.447 13 8 L 13 15 C 13 15.553 13.447 16 14 16 L 21 16 C 21.553 16 22 15.553 22 15 C 22 14.447 21.553 14 21 14 L 15 14 L 15 8 C 15 7.447 14.553 7 14 7 z" />
  </svg>
)
export default ScheduleIcon
