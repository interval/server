import http from 'http'
import path from 'path'
import fs from 'fs'
import Interval, { ctx, io, Action, Page, Layout } from '@interval/sdk/dist'
import ExperimentalInterval from '@interval/sdk/dist/experimental'
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
import * as db from '../../data/mockDb'
import { EventualMetaItem } from '@interval/sdk/dist/components/displayMetadata'
import { faker } from '@faker-js/faker'

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
  const interval = new Interval({
    apiKey: process.env.GHOST_MODE ? undefined : config.apiKey,
    logLevel: 'debug',
    endpoint: ENDPOINT_URL,
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
        await io.display.image('Image via URL', {
          url: 'https://media.giphy.com/media/26ybw6AltpBRmyS76/giphy.gif',
          alt: "Man makes like he's going to jump on a skateboard but doesn't",
          width: 'medium',
        })

        await io.display.image('Image via buffer', {
          buffer: fs.readFileSync('./test/data/fail.gif'),
          alt: 'Wile E. Coyote pulls a rope to launch a boulder from a catapult but it topples backwards and crushes him',
        })
      },
      'io.display.video': async io => {
        await io.display.video('Video via url', {
          url: 'https://upload.wikimedia.org/wikipedia/commons/a/ad/The_Kid_scenes.ogv',
          size: 'large',
          muted: true,
        })
        await io.display.video('Video via buffer', {
          loop: true,
          buffer: fs.readFileSync('./test/data/canyon.mp4'),
          size: 'large',
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
      'io.display.grid': async io => {
        await io.display.grid('Basic auto', {
          data: basicData,
          renderItem: row => ({
            label: row.string,
            description: String(row.number),
            menu: [
              {
                label: `Action item ${row.index}`,
                route: 'links',
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
          }),
        })
      },
      'io.display.metadata': async io => {
        const data: EventualMetaItem[] = [
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
          {
            label: 'Is a function',
            value: () => 'Called it',
          },
          {
            label: 'Is a promise',
            value: new Promise(resolve => {
              sleep(1000)
                .then(() => {
                  resolve('Done!')
                })
                .catch(() => {
                  // for linting
                })
            }),
          },
          {
            label: 'Is an async function',
            value: async () => {
              await sleep(1500)
              return 'Did it'
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
      'io.display.link': async io => {
        // `action` has been deprecated for `route`; make sure both work
        await io.group([
          io.display.link('Link to action', {
            action: 'helloCurrentUser',
            params: { message: 'Hello from link!' },
          }),
          io.display.link('Link to route', {
            route: 'helloCurrentUser',
            params: { message: 'Hello from link!' },
          }),
          io.display.link('Link to external', {
            url: 'https://interval.com',
          }),
        ])
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
          user: `${ctx.user.firstName} ${ctx.user.lastName} (${ctx.user.email})`,
          role: ctx.user.role,
          teams: JSON.stringify(ctx.user.teams),
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
      'io.input.boolean': async io => {
        const isOptional = await io.input.boolean('Is optional')
        const isTrue = await io.input.boolean('Is true')
        const isFalse = await io.input.boolean('Is false', {
          defaultValue: true,
        })
        return { isTrue, isFalse, isOptional }
      },
      'io.input.number': async io => {
        const num1 = await io.input.number('Enter a number')

        const num2 = await io.input.number(
          `Enter a second number that's greater than ${num1}`,
          {
            min: num1 + 1,
          }
        )

        return { num1, num2, sum: num1 + num2 }
      },
      'io.input.slider': async io => {
        const num1 = await io.input.slider('Enter a number between 1-100', {
          min: 1,
          max: 100,
        })

        const decimal = await io.input.slider(`Select a decimal value`, {
          min: num1,
          max: num1 + 1,
          step: 0.1,
        })

        return { num1, decimal, sum: num1 + decimal }
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
      html: async io => {
        const html = await io.input.text('Email body (HTML)', {
          multiline: true,
        })

        await io.display.html('You entered', {
          html,
        })
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
          initiallySelected: row =>
            selected.some(selectedRow => selectedRow.lastName === row.lastName),
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
      multi_search: async io => {
        const renderUser = (user: db.User) =>
          `${user.firstName} ${user.lastName} (${user.email})`
        const selected = await io
          .search<db.User>('Find some users', {
            renderResult: renderUser,
            async onSearch(query) {
              return db.findUser(query)
            },
          })
          .multiple()

        console.log(selected)

        return Object.fromEntries(
          selected.map((user, i) => [i, renderUser(user)])
        )
      },
      optional_multi_search: async io => {
        const renderUser = (user: db.User) =>
          `${user.firstName} ${user.lastName} (${user.email})`
        const selected = await io
          .search<db.User>('Find some users', {
            renderResult: renderUser,
            async onSearch(query) {
              return db.findUser(query)
            },
          })
          .multiple()
          .optional()

        if (!selected) {
          return 'Nothing selected!'
        }

        return Object.fromEntries(
          selected.map((user, i) => [i, renderUser(user)])
        )
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
          r1Index: options.indexOf(r1),
          r2Index: options.indexOf(r2),
          equalIndex: options.indexOf(r1) === options.indexOf(r2),
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
          await ctx.log('Log number', i)
        }

        await sleep(500)
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
        await sleep(1000)

        await ctx.loading.start('Bare title')

        await sleep(1000)

        await ctx.loading.update({
          description: 'Description text',
        })

        await sleep(1000)

        await ctx.loading.start()

        await sleep(1000)

        await ctx.loading.start({
          description: 'Description only',
        })

        await sleep(1000)

        sleep(1000)
          .then(() => {
            return ctx.loading.start('Loading something in the background')
          })
          .catch(err => {
            // This catch is only here to appease linter, cannot throw.
            console.error('Error sending loading')
          })

        await io.confirm('Are you ready to do something else?')

        await sleep(1000)

        const itemsInQueue = 5

        await ctx.loading.update({
          label: 'With progress',
          itemsInQueue,
        })

        await sleep(1000)

        for (let i = 0; i < itemsInQueue; i++) {
          await ctx.loading.completeOne()
          await sleep(1000)
        }

        await sleep(1000)
      },
      notifications: async (io, ctx) => {
        await ctx.notify({
          title: 'Explicit',
          message: 'Message',
          delivery: [{ to: 'alex@interval.com', method: 'EMAIL' }],
        })

        await io.confirm('Send another?')

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
      uploads: new Page({
        name: 'Uploads',
        routes: {
          upload: async io => {
            const file = await io.input.file('Upload a file').optional()

            if (!file) {
              return 'None selected.'
            }

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
          multiple: async io => {
            const files = await io.input.file('Upload some files').multiple()

            return Object.fromEntries(files.map(file => [file.name, file.size]))
          },
        },
      }),
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
      tables: new Page({
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
      users: new Page({
        name: 'Users',
        handler: async () => {
          const allUsers = db.getUsers()

          return new Layout({
            title: 'Users',
            menuItems: [
              {
                label: 'View funnel',
                route: 'users/view_funnel',
              },
              {
                label: 'Create user',
                route: 'users/create',
              },
            ],
            children: [
              io.display.metadata('', {
                data: [
                  { label: 'Total users', value: allUsers.length },
                  {
                    label: 'New today',
                    value: allUsers.filter(
                      u =>
                        u.createdAt.getTime() >
                        Date.now() - 1000 * (60 * 60 * 24)
                    ).length,
                  },
                  {
                    label: 'New this week',
                    value: allUsers.filter(
                      u =>
                        u.createdAt.getTime() >
                        Date.now() - 1000 * (60 * 60 * 24 * 7)
                    ).length,
                  },
                ],
              }),
              io.display.table('Users', {
                data: allUsers,
                rowMenuItems: row => [
                  {
                    label: 'Edit',
                    route: 'users/edit',
                    params: { id: row.id },
                  },
                ],
              }),
            ],
          })
        },
        routes: {
          create: {
            name: 'Create user',
            handler: async () => {
              const [firstName, lastName, email] = await io.group([
                io.input.text('First name'),
                io.input.text('Last name'),
                io.input.email('Email'),
              ])

              await sleep(1000)

              return { firstName, lastName, email }
            },
          },
          edit: {
            name: 'Edit user',
            unlisted: true,
            handler: async () => {
              const userId = ctx.params.id
              if (!userId) throw new Error('No user ID provided')

              const user = db.getUser(String(userId))
              if (!user) throw new Error('User not found')

              const [firstName, lastName, email] = await io.group([
                io.input.text('ID', { defaultValue: user.id, disabled: true }),
                io.input.text('First name', { defaultValue: user.firstName }),
                io.input.text('Last name', { defaultValue: user.lastName }),
                io.input.email('Email', { defaultValue: user.email }),
              ])

              await sleep(1000)

              return { firstName, lastName, email }
            },
          },
          view_funnel: {
            name: 'View funnel',
            handler: async () => {
              await io.display.markdown('# 🌪️')
            },
          },
        },
      }),
      redirect: new Page({
        name: 'Redirects',
        routes: {
          redirect_url: async io => {
            const url = (await io.input.url('Enter a URL')).toString()
            await ctx.redirect({ url })
            return { url }
          },
          redirect_page: new Page({
            name: 'Redirect from page',
            handler: async () => {
              await ctx.redirect({
                route: 'context',
                params: { message: 'From a page!' },
                replace: true,
              })

              return new Layout({})
            },
          }),
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
          redirect_replace: async io => {
            await ctx.redirect({
              route: 'context',
              params: { message: 'Press back, I dare you' },
              replace: true,
            })
          },
        },
      }),
      unlisted_page: new Page({
        name: 'Unlisted page',
        unlisted: true,
        handler: async () => {
          // returning undefined shows the subnav and list/grid layout on the same screen
          return undefined
        },
        routes: {
          unlisted_listed: async () => {
            return 'Hello, world!'
          },
          listed_subpage: new Page({
            name: 'Listed subpage',
            handler: async () => {
              return new Layout({
                children: [io.display.markdown('Hello, world!')],
              })
            },
          }),
          unlisted_subpage: new Page({
            name: 'Unlisted subpage',
            unlisted: true,
            handler: async () => {
              return new Layout({
                children: [io.display.markdown('Hello, world!')],
              })
            },
          }),
        },
      }),
      unlisted_action: {
        unlisted: true,
        handler: async () => {
          return 'Hello, world!'
        },
      },
      with_choices: new Page({
        name: 'With choices',
        routes: {
          on_display: new Action(async () => {
            const { choice } = await io.display
              .markdown('Press OK')
              .withChoices(['OK'])

            return {
              choice,
            }
          }),
          on_input: new Action(async () => {
            let { choice, returnValue } = await io.input
              .number('Enter a number')
              .withChoices([
                {
                  label: 'Make it negative',
                  theme: 'danger',
                  value: 'negative',
                },
                'Do nothing',
              ])
              .optional()

            if (returnValue && choice === 'negative') {
              returnValue = -returnValue
            }

            return {
              choice,
              returnValue: returnValue ?? 'Nothing',
            }
          }),
          with_multiple: new Action(async () => {
            const renderUser = (user: db.User) =>
              `${user.firstName} ${user.lastName} (${user.email})`

            const { choice, returnValue } = await io
              .search('Select some users', {
                renderResult: renderUser,
                async onSearch(query) {
                  return db.findUser(query)
                },
              })
              .multiple()
              .withChoices([
                {
                  label: 'Delete them',
                  theme: 'danger',
                  value: 'delete',
                },
                'Do nothing',
              ])

            return {
              choice,
              returnValue: returnValue.map(renderUser).join(', '),
            }
          }),
          on_group: new Action(async () => {
            const {
              choice,
              returnValue: [returnValue],
            } = await io.group([io.input.text('Important data')]).withChoices([
              {
                label: 'Delete the data',
                value: 'delete',
                theme: 'danger',
              },
              {
                label: 'Cancel',
                value: 'cancel',
                theme: 'secondary',
              },
            ])

            return {
              choice,
              returnValue,
            }
          }),
          on_group_keyed: new Action(async () => {
            const {
              choice,
              returnValue: { data: returnValue },
            } = await io
              .group({ data: io.input.text('Important data') })
              .withChoices([
                {
                  label: 'Delete the data',
                  value: 'delete',
                  theme: 'danger',
                },
                {
                  label: 'Cancel',
                  value: 'cancel',
                  theme: 'secondary',
                },
              ])

            return {
              choice,
              returnValue,
            }
          }),
          with_group_validation: new Action(async () => {
            const { choice, returnValue } = await io
              .group([io.input.text('Enter "OK"')])
              .withChoices(['Submit', 'Continue if OK'])
              .validate(({ choice, returnValue: [value] }) => {
                if (choice === 'Continue if OK' && value !== 'OK') {
                  return 'Should be OK.'
                }
              })

            return { choice, returnValue: returnValue[0] }
          }),
          with_validation: new Action(async () => {
            const { choice, returnValue } = await io.input
              .text('Enter "OK"')
              .withChoices(['Submit', 'Continue if OK'])
              .validate(({ choice, returnValue }) => {
                if (choice === 'Continue if OK' && returnValue !== 'OK') {
                  return 'Should be OK.'
                }
              })

            return { choice, returnValue }
          }),
        },
      }),
    },
  })

  interval.routes.add(
    'validation',
    new Page({
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
        multiple: async io => {
          const renderUser = (user: db.User) =>
            `${user.firstName} ${user.lastName} (${user.email})`

          const firstUser = db.getUsers()[0]

          const selected = await io
            .search<db.User>('Select a user', {
              renderResult: renderUser,
              async onSearch(query) {
                return db.findUser(query)
              },
              helpText: `Anyone but ${firstUser.firstName} ${firstUser.lastName}.`,
            })
            .multiple()
            .validate(users => {
              if (users.includes(firstUser)) {
                return `${firstUser.firstName} is not allowed.`
              }

              return undefined
            })

          console.log(selected)

          return Object.fromEntries(
            selected.map((user, i) => [i, renderUser(user)])
          )
        },
        checkboxes: async io => {
          const options = ['A', 'B', 'C', 'D']
          const selected = await io.select
            .multiple('Select anything but B', {
              options,
            })
            .validate(selected => {
              if (selected.includes('B')) {
                return 'Anything but B.'
              }
            })

          return Object.fromEntries(
            options.map(val => [val, selected.includes(val)])
          )
        },
      },
    })
  )

  const dynamicGroup = new Page({
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

  interval.routes.add('before_listen', async () => {
    return 'Hello, from the past'
  })

  interval
    .listen()
    .then(() => {
      interval.routes.add('dynamic_group', dynamicGroup)
      interval.routes.add('after_listen', async () => {
        return 'Hello, from the future'
      })
    })
    .catch(err => {
      console.error('Failed starting interval listener', err)
    })

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
        hello_http_pages: new Page({
          name: 'Hello, HTTP pages!',
          handler: async () => {
            return new Layout({
              title: 'Inside a page via HTTP',
              children: [io.display.markdown('Neat!')],
            })
          },
          routes: {
            sub_action: async () => {
              return 'Hello, from a sub action!'
            },
          },
        }),
      },
    })
    const server = http.createServer(stateless.httpRequestHandler)
    server.listen(config.statelessPort)
  }
}
