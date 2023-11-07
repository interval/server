import * as React from 'react'
import { SVGProps } from 'react'
const InfoIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 30 30"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    {...props}
  >
    <path d="M3.75 0C1.67893 0 0 1.67893 0 3.75V26.25C0 28.3211 1.67893 30 3.75 30H26.25C28.3211 30 30 28.3211 30 26.25V3.75C30 1.67893 28.3211 0 26.25 0H3.75ZM17.2764 24.8232H12.7243L13.1018 12.677H16.8989L17.2764 24.8232ZM15.0077 8.96416C13.452 8.96416 12.5227 8.13423 12.5227 6.71743C12.5227 5.3269 13.4539 4.50002 15.0077 4.50002C16.5502 4.50002 17.4743 5.3269 17.4743 6.71743C17.4743 8.13423 16.5502 8.96416 15.0077 8.96416Z" />
  </svg>
)
export default InfoIcon
