import { useId } from 'react'
import './GlowSearchBar.css'

export default function GlowSearchBar({ value, onChange, placeholder = 'Rechercher...' }) {
  const uid = useId()
  const gradSearch = `gls-sg-${uid}`
  const gradSearchL = `gls-sl-${uid}`

  return (
    <div className="gls-poda">
      <div className="gls-glow" />
      <div className="gls-darkBorderBg" />
      <div className="gls-darkBorderBg" />
      <div className="gls-darkBorderBg" />
      <div className="gls-white" />
      <div className="gls-border" />

      <div className="gls-main">
        <input
          placeholder={placeholder}
          type="text"
          value={value}
          onChange={onChange}
          className="gls-input"
        />
        <div className="gls-input-mask" />
        <div className="gls-pink-mask" />
        <div className="gls-filterBorder" />

        <div className="gls-filter-icon">
          <svg preserveAspectRatio="none" height="27" width="27" viewBox="4.8 4.56 14.832 15.408" fill="none">
            <path
              d="M8.16 6.65002H15.83C16.47 6.65002 16.99 7.17002 16.99 7.81002V9.09002C16.99 9.56002 16.7 10.14 16.41 10.43L13.91 12.64C13.56 12.93 13.33 13.51 13.33 13.98V16.48C13.33 16.83 13.1 17.29 12.81 17.47L12 17.98C11.24 18.45 10.2 17.92 10.2 16.99V13.91C10.2 13.5 9.97 12.98 9.73 12.69L7.52 10.36C7.23 10.08 7 9.55002 7 9.20002V7.87002C7 7.17002 7.52 6.65002 8.16 6.65002Z"
              stroke="#d6d6e6"
              strokeWidth="1"
              strokeMiterlimit="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="gls-search-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" viewBox="0 0 24 24" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" height="24" fill="none">
            <circle stroke={`url(#${gradSearch})`} r="8" cy="11" cx="11" />
            <line stroke={`url(#${gradSearchL})`} y2="16.65" y1="22" x2="16.65" x1="22" />
            <defs>
              <linearGradient gradientTransform="rotate(50)" id={gradSearch}>
                <stop stopColor="#f8e7f8" offset="0%" />
                <stop stopColor="#b6a9b7" offset="50%" />
              </linearGradient>
              <linearGradient id={gradSearchL}>
                <stop stopColor="#b6a9b7" offset="0%" />
                <stop stopColor="#837484" offset="50%" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  )
}
