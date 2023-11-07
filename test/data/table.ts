import { faker } from '@faker-js/faker'

// Want consistent data for tests
faker.seed(0)

export function generateData(count: number) {
  return Array.from({ length: count }, (_, key) => {
    return {
      key: key.toString(),
      data: {
        string: faker.animal.bird(),
        number: faker.datatype.number(),
        float: faker.datatype.float(),
        boolean: faker.datatype.boolean(),
        date: faker.datatype.datetime(),
        null: null,
      },
    }
  })
}

export function generateDenseData(count: number) {
  return Array.from({ length: count }, (_, key) => {
    const data = {
      id: faker.datatype.uuid(),
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      phone: faker.phone.number(),
      email: faker.internet.email(),
      address: faker.datatype.boolean() ? faker.address.streetAddress() : null,
      submittedAt: faker.datatype.datetime(),
      city: faker.address.city(),
      state: faker.address.state(),
      zip: faker.address.zipCode(),
      company: faker.datatype.boolean() ? faker.company.name() : null,
      jobTitle: faker.datatype.boolean() ? faker.name.jobTitle() : undefined,
      url: faker.internet.url(),
      image: faker.image.image(undefined, undefined, true),
    }

    if (faker.datatype.boolean()) {
      const d = faker.date.past()
      d.setHours(0, 0, 0, 0)
      // @ts-ignore
      data['birthDate'] = d
    }

    return {
      key: key.toString(),
      data,
    }
  })
}

export const basicData = generateData(20).map((r, index) => ({
  index,
  ...r.data,
}))

export const mockColumns = Object.keys(basicData[0]).map(label => ({
  label,
  renderCell: (row: any) => row[label],
}))
export const denseData = generateDenseData(40).map((r, index) => ({
  index,
  ...r.data,
}))
export const bigData = generateDenseData(10_000).map((r, index) => ({
  index,
  ...r.data,
}))

type DenseRecord = typeof denseData[0]

export const denseColumns = [
  {
    label: 'index',
    renderCell: (row: DenseRecord) => row.index,
  },
  {
    label: 'Name',
    renderCell: (row: DenseRecord) => `${row.firstName} ${row.lastName}`,
  },
  {
    label: 'Image',
    renderCell: (row: DenseRecord) => ({
      // This is necessary for tests for older SDKs
      label: 'Image',
      image: {
        url: row.image,
        size: 'small' as const,
      },
    }),
  },
  {
    label: 'Email',
    renderCell: (row: DenseRecord) => ({
      label: row.email,
      // Here for older SDK tests
      href: `mailto:${row.email}`,
      url: `mailto:${row.email}`,
    }),
  },
  {
    label: 'Submitted at',
    renderCell: (row: DenseRecord) => ({
      label: row.submittedAt.toLocaleString(),
      value: row.submittedAt,
    }),
  },
]
