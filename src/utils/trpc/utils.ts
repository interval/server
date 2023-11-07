import superjson from '~/utils/superjson'
import devalue from 'devalue'

// Use superjson for client -> server because it's safe
// Use devalue for server -> client because it's fast
// https://trpc.io/docs/data-transformers#different-transformers-for-upload-and-download
export const transformer = {
  input: superjson,
  output: {
    serialize: d => devalue(d),
    deserialize: d => eval(`(${d})`),
  },
}
