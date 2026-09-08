interface P { size?: number; className?: string; style?: React.CSSProperties }
const base = (size: number) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.75,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
})

export const IHome = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M9.5 20v-6h5v6"/></svg>
)
export const ICards = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><rect x="2.5" y="6" width="14" height="12" rx="2"/><path d="M7 3h11a2 2 0 0 1 2 2v11"/></svg>
)
export const IChart = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><path d="M3 20h18"/><rect x="5" y="11" width="3.5" height="6" rx="1"/><rect x="10.25" y="7" width="3.5" height="10" rx="1"/><rect x="15.5" y="13" width="3.5" height="4" rx="1"/></svg>
)
export const IGear = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><circle cx="12" cy="12" r="3"/><path d="M19.4 14.5a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-.97H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.47-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.77.32H9a1.6 1.6 0 0 0 .97-1.47V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.77V9a1.6 1.6 0 0 0 1.47.97H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.47.97z"/></svg>
)
export const IPlus = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><path d="M12 5v14M5 12h14"/></svg>
)
export const IStar = ({ size = 17, className, style, filled }: P & { filled?: boolean }) => (
  <svg {...base(size)} className={className} style={style} fill={filled ? 'currentColor' : 'none'}><path d="m12 3.5 2.6 5.3 5.9.86-4.25 4.14 1 5.85L12 16.9l-5.25 2.75 1-5.85L3.5 9.66l5.9-.86z"/></svg>
)
export const ISpeaker = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><path d="M11 5 6.5 8.5H3v7h3.5L11 19z"/><path d="M15.5 8.8a4.5 4.5 0 0 1 0 6.4"/><path d="M18.4 6a8.5 8.5 0 0 1 0 12"/></svg>
)
export const IArrowL = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><path d="M19 12H5M11 6l-6 6 6 6"/></svg>
)
export const IArrowR = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><path d="M5 12h14M13 6l6 6-6 6"/></svg>
)
export const IX = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><path d="M18 6 6 18M6 6l12 12"/></svg>
)
export const ICheck = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><path d="m4 12.5 5 5L20 6.5"/></svg>
)
export const IShuffle = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><path d="M17 3h4v4"/><path d="m21 3-6.5 6.5"/><path d="M17 21h4v-4"/><path d="M21 21 3 3"/><path d="m9.5 14.5-6.5 6.5"/></svg>
)
export const ITrash = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><path d="M4 7h16M10 4h4M6 7l1 13h10l1-13"/><path d="M10 11v5M14 11v5"/></svg>
)
export const IEdit = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M14.5 6.5 17.5 9.5"/></svg>
)
export const IBolt = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><path d="M13.5 2 4 13.5h6.5L10 22l9.5-11.5H13z"/></svg>
)
export const IBrain = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><path d="M9.5 3A3 3 0 0 0 7 7.5 3 3 0 0 0 5 13a3 3 0 0 0 2.5 3.5A2.8 2.8 0 0 0 12 19V4.8A2.5 2.5 0 0 0 9.5 3"/><path d="M14.5 3A3 3 0 0 1 17 7.5 3 3 0 0 1 19 13a3 3 0 0 1-2.5 3.5A2.8 2.8 0 0 1 12 19"/></svg>
)
export const IGame = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><rect x="2" y="7" width="20" height="11" rx="4"/><path d="M7 11v3M5.5 12.5h3M15.5 12h.01M18 14h.01"/></svg>
)
export const IPen = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><path d="M3 21h18"/><path d="M6 17 17 6a2.1 2.1 0 0 0-3-3L3 14v3z"/></svg>
)
export const IList = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>
)
export const IFolder = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
)
export const ISpark = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/></svg>
)
export const IFlame = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><path d="M12 2.2c.4 2.6 1.6 3.9 3.3 5.5C17 9.4 18.5 11.4 18.5 14a6.5 6.5 0 0 1-13 0c0-1.9.7-3.4 1.9-4.7.3 1.2.9 1.9 1.8 2.2C9.4 8.2 10.6 4.8 12 2.2z"/><path d="M12 21a2.9 2.9 0 0 0 2.9-2.9c0-1.5-1.2-2.3-1.7-3.6-.9.9-1.8 1.8-2.3 3-.4-.5-.6-.9-.7-1.5-.7.8-1.1 1.6-1.1 2.6A2.9 2.9 0 0 0 12 21z"/></svg>
)
export const IClock = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><circle cx="12" cy="12" r="9"/><path d="M12 7v5.5l3.5 2"/></svg>
)
export const ICopy = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
)
export const IUp = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><path d="M12 19V5M6 11l6-6 6 6"/></svg>
)
export const IMenu = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><path d="M3 6h18M3 12h18M3 18h18"/></svg>
)
export const ISun = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>
)
export const IMoon = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5"/></svg>
)
export const IDownload = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><path d="M12 3v12M7 11l5 5 5-5M4 20h16"/></svg>
)
export const ITarget = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/></svg>
)

export const ISearch = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
)
export const IUpload = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>
)
export const ISend = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><path d="M21 3 10.5 13.5"/><path d="M21 3 14.5 21l-4-8-8-4z"/></svg>
)
export const IFile = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>
)
export const IImage = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m4 17 5-5 4 4 3-2 4 4"/></svg>
)
export const IChat = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L4 20l1.3-4.1A7.5 7.5 0 1 1 20 12z"/></svg>
)
export const ITrophy = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 5.5H4.5A2.5 2.5 0 0 0 7 10M17 5.5h2.5A2.5 2.5 0 0 1 17 10"/><path d="M12 14v3M8.5 20h7"/></svg>
)
export const ICoin = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M14.5 9.8a2.6 2.6 0 0 0-2.5-1.3c-1.4 0-2.5.8-2.5 1.9s1 1.6 2.5 1.9 2.5.8 2.5 1.9-1.1 1.9-2.5 1.9a2.6 2.6 0 0 1-2.5-1.3"/></svg>
)
export const IMic = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><rect x="9" y="2.5" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>
)
export const IChevR = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><path d="m9 5 7 7-7 7"/></svg>
)
export const ILayers = ({ size = 17, className, style }: P) => (
  <svg {...base(size)} className={className} style={style}><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/></svg>
)
