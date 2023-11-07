import Logo from './Logo'

export default function AuthPageHeader({ title }: { title: string }) {
  return (
    <div>
      <div className="mb-3">
        <a href="/" className="group">
          <Logo className="w-[140px] h-[26px] block mx-auto text-gray-900" />
        </a>
      </div>
      <h1 className="text-center text-base font-medium tracking-tight text-gray-700">
        {title}
      </h1>
    </div>
  )
}
