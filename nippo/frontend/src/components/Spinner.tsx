interface SpinnerProps {
  center?: boolean
  dark?: boolean
}

export default function Spinner({ center, dark }: SpinnerProps) {
  const cls = `spinner${dark ? ' spinner-dark' : ''}`
  if (center) return <div className="spinner-center"><div className={cls} /></div>
  return <div className={cls} />
}
