'use client'



export function SectionHeader({
  title,
  description,
  aside,
}: {
  title: string
  description: string
  aside?: React.ReactNode
}) {
  return (
    <header className="config-section__head">
      <div className="config-section__titlerow">
        <h1 className="config-section__title">{title}</h1>
        {aside}
      </div>
      <p className="config-section__desc">{description}</p>
    </header>
  )
}
