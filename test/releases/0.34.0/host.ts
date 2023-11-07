import http from 'http'
import path from 'path'
import fs from 'fs'
import Interval, { ctx } from '@interval/sdk'
import ExperimentalInterval, { Router } from '@interval/sdk/dist/experimental'
import IntervalClient from '@interval/sdk/dist/classes/IntervalClient'
import { config, ENDPOINT_URL, sleep } from '../../_setup'
import { generateS3Urls } from '../../utils/uploads'
import {
  bigData,
  denseData,
  basicData,
  mockColumns,
  denseColumns,
} from '../../data/table'
import { T_IO_PROPS } from '@interval/sdk/dist/ioSchema'
import z from 'zod'
import util from 'util'

const writeFile = util.promisify(fs.writeFile)
const removeFile = util.promisify(fs.unlink)
const readFile = util.promisify(fs.readFile)

/*
  Assuming the SDK is installed at: <PROJECT_DIRECTORY>/node_modules
  The config file will be at: <PROJECT_DIRECTORY>/node_modules/@interval/sdk/dist/.interval.config.json
*/
const intervalConfigPath = path.join(__dirname, '.interval.config.json')

const SCHEMA = z.object({
  ghostOrgId: z.string(),
})

export const localConfig = {
  async get() {
    try {
      const contents = await readFile(intervalConfigPath, 'utf-8')
      const configFile = SCHEMA.parse(JSON.parse(contents))
      return configFile
    } catch (e) {
      return null
    }
  },
  async write(config: z.infer<typeof SCHEMA>) {
    return writeFile(intervalConfigPath, JSON.stringify(config), 'utf-8')
  },
  async clear() {
    try {
      await removeFile(intervalConfigPath)
    } catch (e) {
      return null
    }
  },
}

export { Interval }

export default async function setupHost() {
  const commonConfig = {
    apiKey: process.env.GHOST_MODE ? undefined : config.apiKey,
    logLevel: 'debug',
    endpoint: ENDPOINT_URL,
  } as const

  const interval = new Interval({
    ...commonConfig,
    routes: {
      'io.display.heading': async io => {
        await io.display.heading('io.display.heading result')

        await io.display.heading('Section heading', {
          level: 3,
          description: 'Sub-heading',
          menuItems: [
            {
              label: 'External link item',
              url: 'https://interval.com',
            },
            {
              label: 'Action link item',
              action: 'context',
              params: {
                param: true,
              },
            },
          ],
        })
      },
      'io.group': async io => {
        await io.group([
          io.display.markdown('1. First item'),
          io.display.markdown('2. Second item'),
        ])

        await io.group([io.display.markdown('1. First item')], {
          continueButton: {
            label: 'Custom label',
            theme: 'danger',
          },
        })

        const { text, num } = await io.group({
          text: io.input.text('Text'),
          num: io.input.number('Number').optional(),
        })

        return {
          text,
          num,
        }
      },
      'io.display.image': async io => {
        await io.display.image('Image via url', {
          url: 'https://media.giphy.com/media/26ybw6AltpBRmyS76/giphy.gif',
          alt: "Man makes like he's going to jump on a skateboard but doesn't",
          width: 'medium',
        })

        await io.display.image('Image via buffer', {
          buffer: fs.readFileSync('./test/data/fail.gif'),
          alt: 'Wile E. Coyote pulls a rope to launch a boulder from a catapult but it topples backwards and crushes him',
        })
      },
      'io.display.object': async io => {
        await io.group([
          io.display.object("Here's an object", {
            data: {
              isTrue: true,
              isFalse: false,
              number: 15,
              nullValue: null,
              nested: {
                name: 'Interval',
              },
              longList: Array(100)
                .fill(0)
                .map((_, i) => `Item ${i}`),
            },
          }),
          io.input.boolean('Does nothing'),
        ])
      },
      'io.display.table': async io => {
        await io.display.table('Basic auto', {
          data: basicData,
          rowMenuItems: row => [
            {
              label: `Action item ${row.index}`,
              route: 'links',
              params: {
                linkTo: 'table-action-link-test',
              },
            },
            {
              label: `Disabled item ${row.index}`,
              disabled: true,
            },
            {
              label: `External item ${row.index}`,
              url: 'https://interval.com',
            },
          ],
        })

        await io.display.table('Dense auto', {
          data: denseData,
        })
      },
      'io.display.metadata': async io => {
        const data: T_IO_PROPS<'DISPLAY_METADATA'>['data'] = [
          {
            label: 'Is true',
            value: true,
          },
          {
            label: 'Is false',
            value: false,
          },
          {
            label: 'Is null',
            value: null,
          },
          {
            label: 'Is empty string',
            value: '',
          },
          {
            label: 'Is long string',
            value:
              'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed sit amet quam in lorem',
          },
          {
            label: 'Is number 15',
            value: 15,
          },
          {
            label: 'Is string',
            value: 'Hello',
          },
          {
            label: 'Action link',
            value: 'Click me',
            action: 'helloCurrentUser',
            params: { message: 'Hello from metadata!' },
          },
          {
            label: 'Image',
            value: 'Optional caption',
            image: {
              url: 'https://picsum.photos/200/300',
              width: 'small',
              height: 'small',
            },
          },
        ]

        await io.display.metadata('Metadata list', {
          data,
        })

        await io.display.metadata('Metadata grid', {
          layout: 'grid',
          data,
        })

        await io.display.metadata('Metadata cards', {
          layout: 'card',
          data,
        })
      },
      tableColumns: async io => {
        await io.display.table('Basic columns', {
          data: basicData,
          columns: mockColumns,
        })

        await io.display.table('Dense columns', {
          data: denseData,
          columns: denseColumns,
        })

        await io.display.table('Dense shorthand columns', {
          data: denseData,
          columns: ['index', 'firstName', 'lastName', 'email', 'address'],
        })
      },
      verticalTable: async io => {
        await io.display.table('Vertical auto', {
          data: basicData,
          orientation: 'vertical',
        })

        await io.display.table('Vertical columns', {
          data: basicData,
          columns: mockColumns,
          orientation: 'vertical',
        })
      },
      bigTable: async io => {
        await io.display.table('Large table', {
          data: bigData,
        })
      },
      context: async (_, ctx) => {
        return {
          user: `${ctx.user.firstName} ${ctx.user.lastName}`,
          message: ctx.params.message,
          environment: ctx.environment,
        }
      },
      'io.input.text': async io => {
        const name = await io.input.text('First name', {
          minLength: 5,
          maxLength: 20,
        })
        return { name }
      },
      'io.input.email': async io => {
        const email = await io.input.email('Email address')
        return { email }
      },
      'io.input.number': async io => {
        const num = await io.input.number('Enter a number')

        await io.input.number(
          `Enter a second number that's greater than ${num}`,
          {
            min: num + 1,
          }
        )
      },
      'io.input.url': async io => {
        const url = await io.input.url('Enter a URL')
        const secureUrl = await io.input.url('Enter a secure URL', {
          allowedProtocols: ['https'],
        })
        return { secureUrl: secureUrl.href, url: url.href }
      },
      currency: async io => {
        const [usd, eur, jpy] = await io.group([
          io.input.number('United States Dollar', {
            min: 10,
            currency: 'USD',
          }),
          io.input.number('Euro', {
            currency: 'EUR',
          }),
          io.input.number('Japanese yen', {
            currency: 'JPY',
            decimals: 3,
          }),
        ])

        return { usd, eur, jpy }
      },
      confirm: async io => {
        const first = await io.confirm('Are you sure?', {
          helpText: 'Really sure?',
        })
        const second = await io.confirm('Still?')

        return {
          first,
          second,
        }
      },
      confirmIdentity: async io => {
        const first = await io.confirmIdentity('First', {
          gracePeriodMs: 0,
        })
        const second = await io.confirmIdentity('Second')
        const third = await io.confirmIdentity('Third', {
          gracePeriodMs: 0,
        })

        return {
          first,
          second,
          third,
        }
      },
      'io.input.richText': async io => {
        const body = await io.input.richText('Email body')

        await io.display.markdown(`
            ## You entered:

            ~~~
            ${body}
            ~~~
        `)
      },
      'io.select.multiple': async io => {
        const options = [
          {
            value: new Date(2022, 6, 20),
            label: new Date(2022, 6, 20),
            extraData: true,
          },
          {
            value: true,
            label: true,
          },
          {
            value: 3,
            label: 3,
          },
        ]

        const basicSelected = await io.select.multiple('Select zero or more', {
          options: options.map(o => o.value),
        })

        const selected = await io.select.multiple(
          'Optionally modify the selection, selecting between 1 and 2',
          {
            options,
            defaultValue: options.filter(o => basicSelected.includes(o.value)),
            minSelections: 1,
            maxSelections: 2,
          }
        )

        const ret = {}

        for (const option of options) {
          ret[option.label.toString()] = selected.some(
            o => o.value === option.value
          )
        }

        return {
          ...ret,
          extraData: selected[0].extraData,
        }
      },
      'io.select.table': async io => {
        const data = [
          { firstName: 'Alex', lastName: 'Arena' },
          { firstName: 'Dan', lastName: 'Philibin' },
          { firstName: 'Ryan', lastName: 'Coppolo' },
          {
            firstName: 'Jacob',
            lastName: 'Mischka',
            favoriteColor: 'Orange',
          },
        ]

        let selected = await io.select.table('Select some rows', {
          data,
          minSelections: 1,
          maxSelections: 2,
        })

        await io.display.markdown(`
            ## You selected:

            ~~~
            ${JSON.stringify(selected)}
            ~~~
        `)

        selected = await io.select.table('Select some more', {
          data,
          columns: [
            { label: 'First name', renderCell: row => row.firstName },
            { label: 'Last name', renderCell: row => row.lastName },
          ],
          minSelections: 1,
          maxSelections: 1,
        })

        return selected[0]
      },
      'io.select.single': async io => {
        const basic = await io.select.single('Choose basic', {
          options: [1, true, new Date(2022, 6, 20)],
        })

        const selected = await io.select.single('Choose custom', {
          options: [
            { label: 'Admin', value: 'a' },
            { label: 'Editor', value: 2, extraData: true },
            { label: 'Viewer', value: 'c' },
          ],
        })

        return {
          basic,
          ...selected,
        }
      },
      select_invalid_defaults: async io => {
        await io.group([
          io.select.single('Choose one', {
            options: [],
            defaultValue: { label: 'Invalid', value: 'invalid' },
          }),
          io.select.multiple('Choose some', {
            options: [],
            defaultValue: [
              { label: 'Invalid', value: 'invalid' },
              { label: 'Also invalid', value: 'also_invalid' },
            ],
          }),
        ])
      },
      search: async io => {
        const options = [
          { label: true, value: true, extraData: 1 },
          {
            label: new Date(2022, 6, 20),
            value: new Date(2022, 6, 20),
            extraData: 2,
          },
          { label: 'Viewer', value: 'c', extraData: 3 },
        ]

        const selected = await io.search('Find something', {
          initialResults: options,
          renderResult: option => option,
          async onSearch(query) {
            const re = new RegExp(query, 'i')
            return options.filter(o => re.test(String(o.label)))
          },
        })

        return selected
      },
      two_searches: async io => {
        const options = [
          { label: true, value: true, extraData: 1 },
          {
            label: new Date(2022, 6, 20),
            value: new Date(2022, 6, 20),
            extraData: 2,
          },
          { label: 'Viewer', value: 'c', extraData: 3 },
          { label: true, value: true, extraData: 1 },
          {
            label: new Date(2022, 6, 20),
            value: new Date(2022, 6, 20),
            extraData: 2,
          },
          { label: 'Viewer', value: 'c', extraData: 3 },
          { label: true, value: true, extraData: 1 },
          {
            label: new Date(2022, 6, 20),
            value: new Date(2022, 6, 20),
            extraData: 2,
          },
          { label: 'Viewer', value: 'c', extraData: 3 },
        ]

        const [r1, r2] = await io.group([
          io.search('First', {
            renderResult: option => option,
            async onSearch(query) {
              return options.filter(o =>
                o.label.toString().toLowerCase().includes(query)
              )
            },
          }),
          io.search('Second', {
            renderResult: option => option,
            async onSearch(query) {
              return options.filter(o =>
                o.label.toString().toLowerCase().includes(query)
              )
            },
          }),
        ])

        return {
          r1: r1.label,
          r2: r2.label,
          equal: r1 === r2,
        }
      },
      date: async io => {
        const date = await io.input.date('Enter date', {
          min: new Date(2000, 0, 1),
          max: {
            year: 2022,
            month: 12,
            day: 30,
          },
        })
        return date
      },
      time: async io => {
        const time = await io.input.time('Enter time', {
          min: {
            hour: 8,
            minute: 30,
          },
          max: {
            hour: 20,
            minute: 0,
          },
        })
        return time
      },
      datetime: async io => {
        const datetime = await io.input.datetime('Enter datetime', {
          min: new Date(2000, 0, 1, 7, 30),
          max: {
            year: 2022,
            month: 12,
            day: 30,
            hour: 13,
            minute: 0,
          },
        })
        return datetime
      },
      datetime_default: async io => {
        const datetime = await io.input.datetime('Enter datetime', {
          defaultValue: new Date(2020, 5, 23, 13, 25),
        })
        return datetime
      },
      spreadsheet: async io => {
        const sheet = await io.experimental.spreadsheet('Enter records', {
          columns: {
            string: 'string',
            optionalString: 'string?',
            number: 'number',
            boolean: 'boolean',
          },
        })

        return sheet[0]
      },
      logs: async (_, ctx) => {
        for (let i = 0; i < 10; i++) {
          ctx.log('Log number', i)
        }
      },
      error: async io => {
        await io.input.text('First name')
        throw new Error('Unauthorized')
      },
      'auto-reconnect': async io => {
        await io.input.text('First name')
        await io.input.text('Last name')
      },
      optional: async io => {
        await io.input.text('Text').optional()
        await io.input.email('Email').optional()
        await io.input.number('Number').optional()
        await io.input.richText('Rich text').optional()
        await io.input.date('Date').optional()
        await io.input.time('Time').optional()
        await io.input.datetime('Datetime').optional()

        await io.select
          .single('Select single', {
            options: [],
          })
          .optional()
        await io.select
          .single('Select multiple', {
            options: [],
          })
          .optional()
        await io
          .search('Search', {
            async onSearch() {
              return []
            },
            renderResult: () => '',
          })
          .optional()

        const date = await io.input.date('Date').optional()
        const datetime = await io.input.datetime('Datetime').optional()
        const table = await io.select
          .table('Table', {
            data: [
              { a: 1, b: 2, c: 3 },
              { a: 4, b: 5, c: 6 },
              { a: 7, b: 8, c: 9 },
            ],
            minSelections: 1,
            maxSelections: 1,
          })
          .optional()

        await io.display.object('Date', {
          data: date,
        })

        await io.display.object('Datetime', {
          data: datetime,
        })

        return table?.[0]
      },
      loading: async () => {
        await ctx.loading.start('Bare title')

        await sleep(500)

        await ctx.loading.update({
          description: 'Description text',
        })

        await sleep(500)

        await ctx.loading.start()

        await sleep(500)

        await ctx.loading.start({
          description: 'Description only',
        })

        await sleep(500)

        const itemsInQueue = 5

        await ctx.loading.update({
          title: 'With progress',
          itemsInQueue,
        })

        await sleep(500)

        for (let i = 0; i < itemsInQueue; i++) {
          await ctx.loading.completeOne()
          await sleep(500)
        }

        await sleep(500)
      },
      notifications: async (io, ctx) => {
        await ctx.notify({
          title: 'Explicit',
          message: 'Message',
          delivery: [{ to: 'alex@interval.com', method: 'EMAIL' }],
        })

        await io.display.markdown('Press continue to send another')

        await ctx.notify({
          message: 'Implicit',
          delivery: [{ to: 'test-runner@interval.com' }],
        })
      },
      links: async io => {
        let { linkTo } = ctx.params as { linkTo?: string }

        if (linkTo) {
          console.log(linkTo)
          await io.display.table('Links', {
            data: [
              { label: 'Link to', url: linkTo },
              { label: 'This action (absolute)', url: ctx.action.url },
              {
                label: 'This action (relative)',
                action: 'links',
                params: { linkTo },
              },
            ],
            columns: [
              {
                label: 'Link',
                renderCell: row => row,
              },
            ],
          })
        } else {
          linkTo = await io.input.text('Enter a URL')

          await io.display.link('Start this action over', {
            route: 'links',
            params: {
              linkTo,
            },
          })
        }
      },
      upload: async io => {
        const file = await io.input.file('Upload a file')
        const { text, json, buffer, url, ...rest } = file

        return {
          ...rest,
          url: await url(),
          text: rest.type.includes('text/')
            ? await text().catch(err => `Invalid text: ${err}`)
            : undefined,
          json: rest.type.includes('text/')
            ? await json()
                .then(obj => JSON.stringify(obj))
                .catch(err => `Invalid JSON: ${err}`)
            : undefined,
        }
      },
      upload_custom_endpoint: async io => {
        const file = await io.input.file('Upload a file', {
          generatePresignedUrls: async ({ name }) => {
            const urlSafeName = name.replace(/ /g, '-')
            const path = `test-runner/${new Date().getTime()}-${urlSafeName}`

            return generateS3Urls(path)
          },
        })
        const { text, json, buffer, url, ...rest } = file

        return {
          ...rest,
          url: await url(),
          text: rest.type.includes('text/')
            ? await text().catch(err => `Invalid text: ${err}`)
            : undefined,
          json: rest.type.includes('text/')
            ? await json()
                .then(obj => JSON.stringify(obj))
                .catch(err => `Invalid JSON: ${err}`)
            : undefined,
        }
      },
      advanced_data: async io => {
        const data = {
          bigInt: BigInt(5),
          map: new Map([
            ['key 1', 1],
            ['key 2', 2],
          ]),
          set: new Set(['a', 'b', 'c']),
        }

        await io.display.object('Object', {
          data,
        })

        return data.bigInt
      },
      malformed: async io => {
        // @ts-expect-error: Ensuring we can handle invalid calls
        await io.input.text(new Error(), {
          this: BigInt(12),
          // @ts-expect-error: Ensuring we can handle invalid calls
          something: this.something,
        })
      },
      badMessage: async () => {
        const client = new IntervalClient(interval, interval.config)

        // @ts-expect-error: Intentionally using private method
        await client.initializeConnection()

        // @ts-expect-error: Intentionally using protected method
        await client.__dangerousInternalSend('NONEXISTANT', {
          gibberish: '1234',
          error: new Error(),
        })
      },
      tables: new Router({
        name: 'Tables',
        routes: {
          empty: async io => {
            await io.display.table('Table', {
              data: [],
              columns: ['name', 'email'],
            })
            await io.select.table('Table', {
              data: [],
              columns: ['name', 'email'],
            })
          },
          less_than_page_size: async io => {
            await io.display.table('Table', {
              data: basicData.slice(0, 5),
              defaultPageSize: 50,
            })
            await io.select.table('Table', {
              data: basicData.slice(0, 5),
              defaultPageSize: 50,
            })
          },
          equal_to_page_size: async io => {
            await io.display.table('Table', {
              data: basicData.slice(0, 5),
              defaultPageSize: 5,
            })
            await io.select.table('Table', {
              data: basicData.slice(0, 5),
              defaultPageSize: 5,
            })
          },
          greater_than_page_size: async io => {
            await io.display.table('Table', {
              data: basicData.slice(0, 10),
              defaultPageSize: 5,
            })
            await io.select.table('Table', {
              data: basicData.slice(0, 10),
              defaultPageSize: 5,
            })
          },
          auto_columns: async io => {
            await io.display.table('Table', {
              data: basicData,
              defaultPageSize: 5,
            })
            await io.select.table('Table', {
              data: basicData,
              defaultPageSize: 5,
            })
          },
          specific_columns: async io => {
            await io.display.table('Table', {
              data: basicData.slice(0, 10),
              columns: ['number', 'string'],
              defaultPageSize: 5,
            })
            await io.select.table('Table', {
              data: basicData.slice(0, 10),
              columns: ['number', 'string'],
              defaultPageSize: 5,
            })
          },
          async_get_data: async io => {
            await io.display.table<(typeof bigData)[0]>('Table', {
              getData: async ({
                queryTerm,
                sortColumn,
                sortDirection,
                offset,
                pageSize,
              }) => {
                let filteredData = bigData.slice()

                if (queryTerm) {
                  const re = new RegExp(queryTerm, 'gi')
                  filteredData = filteredData.filter(row =>
                    re.test(JSON.stringify(row))
                  )
                }

                if (sortColumn && sortDirection) {
                  filteredData.sort((a, b) => {
                    if (sortDirection === 'desc') {
                      const temp = b
                      b = a
                      a = temp
                    }

                    if (!(sortColumn in a) || !(sortColumn in b)) return 0

                    let aVal = a[sortColumn as keyof typeof a] ?? 0
                    let bVal = b[sortColumn as keyof typeof b] ?? 0

                    if (aVal instanceof Date) aVal = aVal.valueOf()
                    if (bVal instanceof Date) bVal = bVal.valueOf()

                    if (!aVal && !!bVal) return -1
                    if (!!aVal && !bVal) return 1
                    if (!aVal && !bVal) return 0

                    if (aVal < bVal) return -1
                    if (aVal > bVal) return 1
                    return 0
                  })
                }

                return {
                  data: filteredData.slice(offset, offset + pageSize),

                  totalRecords: bigData.length,
                }
              },
              defaultPageSize: 20,
            })
          },
        },
      }),
    },
  })

  const experimental = new ExperimentalInterval({
    ...commonConfig,
    routes: {
      redirect: new Router({
        name: 'Redirects',
        routes: {
          redirect_url: async io => {
            const url = (await io.input.url('Enter a URL')).toString()
            await ctx.redirect({ url })
            return { url }
          },
          redirect_action: async io => {
            const [route, paramsStr] = await io.group([
              io.input.text('Action slug'),
              io.input
                .text('Params', {
                  multiline: true,
                })
                .optional(),
            ])

            const params = paramsStr ? JSON.parse(paramsStr) : undefined

            await ctx.redirect({
              route,
              params,
            })
          },
        },
      }),
      unlisted_router: new Router({
        name: 'Unlisted router',
        unlisted: true,
        actions: {
          unlisted_listed: async () => {
            return 'Hello, world!'
          },
        },
      }),
      unlisted_action: {
        unlisted: true,
        handler: async () => {
          return 'Hello, world!'
        },
      },
    },
  })

  experimental.routes.add(
    'nested',
    new Router({
      name: 'Nested',
      routes: {
        hello: async () => {
          return 'Hello, folders!'
        },
      },
    })
  )

  experimental.routes.add(
    'validation',
    new Router({
      name: 'Validation',
      routes: {
        works: async io => {
          const [name, email, age, includeDrinkTickets] = await io
            .group([
              io.input.text('Name'),
              io.input.email('Email').validate(email => {
                if (!email.endsWith('@interval.com'))
                  return 'Only Interval employees are invited to the holiday party.'
              }),
              io.input.number('Age').optional(),
              io.input.boolean('Include drink tickets?'),
            ])
            .validate(async ([, , age, includeDrinkTickets]) => {
              await sleep(100)

              if ((!age || age < 21) && includeDrinkTickets) {
                return 'Attendees must be 21 years or older to receive drink tickets.'
              }
            })

          return {
            name,
            email,
            age,
            includeDrinkTickets,
          }
        },
        object_works: async io => {
          const { name, email, age, includeDrinkTickets } = await io
            .group({
              name: io.input.text('Name'),
              email: io.input.email('Email').validate(email => {
                if (!email.endsWith('@interval.com'))
                  return 'Only Interval employees are invited to the holiday party.'
              }),
              age: io.input.number('Age').optional(),
              includeDrinkTickets: io.input.boolean('Include drink tickets?'),
            })
            .validate(async ({ age, includeDrinkTickets }) => {
              await sleep(100)

              if ((!age || age < 21) && includeDrinkTickets) {
                return 'Object-based attendees must be 21 years or older to receive drink tickets.'
              }
            })

          return {
            name,
            email,
            age,
            includeDrinkTickets,
          }
        },
        optional: async io => {
          const name = await io.input.text('Name').optional()

          const age = await io.input
            .number('Age')
            .optional()
            .validate(age => {
              if (name && !age) {
                return 'Must specify an age if name is specified.'
              }
            })

          return {
            name,
            age,
          }
        },
      },
    })
  )

  const dynamicGroup = new Router({
    name: 'Dynamic',
    routes: {
      placeholder: async () => {
        // Just here to prevent this group from disappearing when self_destructing
        // removes itself
      },
      self_destructing: async () => {
        dynamicGroup.remove('self_destructing')
        return 'Goodbye!'
      },
    },
  })

  experimental.routes.add('before_listen', async () => {
    return 'Hello, from the past'
  })

  experimental.listen().then(() => {
    experimental.routes.add('dynamic_group', dynamicGroup)
    experimental.routes.add('after_listen', async () => {
      return 'Hello, from the future'
    })
  })

  interval.listen()

  if (!process.env.GHOST_MODE) {
    // Stateless/"serverless" HTTP listener
    const stateless = new ExperimentalInterval({
      apiKey: config.liveApiKey,
      logLevel: 'debug',
      endpoint: ENDPOINT_URL,
      routes: {
        hello_http: async () => {
          return 'Hello, from HTTP!'
        },
      },
    })
    const server = http.createServer(stateless.httpRequestHandler)
    server.listen(config.statelessPort)
  }
}
