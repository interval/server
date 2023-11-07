import { faker } from '@faker-js/faker'

faker.seed(0)

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  createdAt: Date
}

const allUsers = Array.from({ length: 313 }, () => {
  return {
    id: faker.datatype.uuid(),
    firstName: faker.name.firstName(),
    lastName: faker.name.lastName(),
    email: faker.internet.email(),
    createdAt: faker.date.recent(30),
  }
}).sort((a, b) => {
  return b.createdAt.getTime() - a.createdAt.getTime()
})

export function getUsers() {
  return allUsers
}

export function getUser(id: string): User | null {
  return allUsers.find(user => user.id === id) ?? null
}

export function findUser(query: string): User[] {
  const re = RegExp(query, 'i')
  return allUsers.filter(
    user =>
      re.test(user.firstName) || re.test(user.lastName) || re.test(user.email)
  )
}
