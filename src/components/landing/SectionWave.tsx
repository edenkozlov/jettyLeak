type SectionWaveProps = {
  variant: 'to-dark' | 'to-light'
}

export function SectionWave({ variant }: SectionWaveProps) {
  const wrapperClass = variant === 'to-dark' ? 'bg-white' : 'bg-gray-950'
  const fill = variant === 'to-dark' ? '#030712' : 'white'
  const pathD =
    variant === 'to-dark'
      ? 'M0 40C240 0 480 80 720 40C960 0 1200 80 1440 40V80H0V40Z'
      : 'M0 40C240 80 480 0 720 40C960 80 1200 0 1440 40V80H0V40Z'

  return (
    <div className={`relative -mt-px ${wrapperClass}`}>
      <svg
        viewBox="0 0 1440 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="block w-full"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path d={pathD} fill={fill} />
      </svg>
    </div>
  )
}
