import { User } from '@prisma/client'

export default function renderUserResult(user: User) {
  return {
    label: [user.firstName, user.lastName].join(' '),
    description: user.email,
  }
}
