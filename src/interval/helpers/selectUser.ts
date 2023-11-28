import { io } from '@interval/sdk'
import findUsers from './findUsers'
import renderUserResult from './renderUserResult'

export default function selectUser() {
  return io.search('Select a user', {
    onSearch: async q => await findUsers(q),
    renderResult: renderUserResult,
  })
}
