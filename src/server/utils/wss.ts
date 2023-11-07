import fetch from 'cross-fetch'

import env from 'env'
import { encryptPassword } from '../auth'
import { port } from '~/wss/consts'

export async function makeApiCall(
  path: string,
  body: string
): Promise<Response> {
  // TODO: Use correct URL if not on same server
  const url = new URL('http://localhost')
  url.port = port.toString()
  url.pathname = path

  return fetch(`${url.toString()}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${encryptPassword(env.WSS_API_SECRET)}`,
    },
    body,
  }).then(response => {
    if (!response.ok) {
      // TODO: Make this better
      throw new Error(response.status.toString())
    }

    return response
  })
}
