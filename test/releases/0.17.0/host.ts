import Interval, { ctx } from '@interval/sdk'
import localConfig from '@interval/sdk/dist/localConfig'
import { config, ENDPOINT_URL, sleep } from '../../_setup'

import {
  bigData,
  denseData,
  basicData,
  mockColumns,
  denseColumns,
} from '../../data/table'

export { localConfig }

export default async function setupHost() {
  const interval = new Interval({
    apiKey: process.env.GHOST_MODE ? undefined : config.apiKey,
    logLevel: 'debug',
    endpoint: ENDPOINT_URL,
    actions: {
      'io.display.heading': async io => {
        await io.display.heading('io.display.heading result')
      },
      'io.group': async io => {
        await io.group([
          io.display.markdown('1. First item'),
          io.display.markdown('2. Second item'),
        ])
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
        })

        await io.display.table('Dense auto', {
          data: denseData,
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
        const name = await io.input.text('First name')
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
            value: 'A',
            label: 'A',
          },
          {
            value: 'B',
            label: 'B',
          },
          {
            value: 'C',
            label: 'C',
          },
        ]

        let selected = await io.select.multiple('Select zero or more', {
          options,
        })

        selected = await io.select.multiple(
          'Optionally modify the selection, selecting between 1 and 2',
          {
            options,
            defaultValue: selected,
            minSelections: 1,
            maxSelections: 2,
          }
        )

        const ret = {}

        for (const option of options) {
          ret[option.label] = selected.some(o => o.value === option.value)
        }

        return ret
      },
      'io.select.table': async io => {
        const selected = await io.select.table('Select some rows', {
          data: [
            { firstName: 'Alex', lastName: 'Arena' },
            { firstName: 'Dan', lastName: 'Philibin' },
            { firstName: 'Ryan', lastName: 'Coppolo' },
            {
              firstName: 'Jacob',
              lastName: 'Mischka',
              favoriteColor: 'Orange',
            },
          ],
          minSelections: 1,
          maxSelections: 2,
        })

        await io.display.markdown(`
            ## You selected:

            ~~~
            ${JSON.stringify(selected)}
            ~~~
        `)
      },
      'io.select.single': async io => {
        const selected = await io.select.single('Choose role', {
          options: [
            { label: 'Admin', value: 'a' },
            { label: 'Editor', value: 'b' },
            { label: 'Viewer', value: 'c' },
          ],
        })

        await io.display.markdown(`You selected: ${selected.label}`)
      },
      search: async io => {
        const options = [
          { label: 'Admin', value: 'a', extraData: 1 },
          { label: 'Editor', value: 'b', extraData: 2 },
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
      date: async io => {
        const date = await io.experimental.date('Enter date')
        return date
      },
      time: async io => {
        const time = await io.experimental.time('Enter time')
        return time
      },
      datetime: async io => {
        const datetime = await io.experimental.datetime('Enter datetime')
        return datetime
      },
      datetime_default: async io => {
        const datetime = await io.experimental.datetime('Enter datetime', {
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
        await io.experimental.date('Date').optional()
        await io.experimental.time('Time').optional()
        await io.experimental.datetime('Datetime').optional()
      },
      loading: async () => {
        await ctx.loading.start({ label: 'Bare title' })

        await sleep(500)

        await ctx.loading.update({
          description: 'Description text',
        })

        await sleep(500)

        await ctx.loading.start({})

        await sleep(500)

        await ctx.loading.start({
          description: 'Description only',
        })

        await sleep(500)

        const itemsInQueue = 5

        await ctx.loading.update({
          label: 'With progress',
          itemsInQueue,
        })

        await sleep(500)

        for (let i = 0; i < itemsInQueue; i++) {
          await ctx.loading.completeOne()
          await sleep(500)
        }
      },
    },
  })

  return interval.listen()
}
