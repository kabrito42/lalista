export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <h2 className="font-serif text-xl text-text">{title}</h2>
      <p className="mt-2 text-sm text-text-mid">Coming soon</p>
    </div>
  )
}
