export default function ErrorMessage({
  id,
  message,
}: {
  id?: string
  message: React.ReactNode
}) {
  return (
    <p
      className="text-sm text-red-600 flex justify-start items-center mt-2"
      id={id ? `${id}-error` : undefined}
      data-pw="field-error"
    >
      {message}
    </p>
  )
}
