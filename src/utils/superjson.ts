import superjson from 'superjson'

// Custom transformer for python time strings (HH:MM:SS)
superjson.registerCustom(
  {
    isApplicable: (v: string): v is string =>
      typeof v === 'string' && /^\d{2}:\d{2}:\d{2}$/.test(v),
    serialize: v => String(v),
    deserialize: v => String(v),
  },
  'time'
)

export default superjson
