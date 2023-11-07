import {
  displayStringToTime,
  numberWithOrdinal,
  timeToDisplayString,
} from '../date'

describe('date', () => {
  test('displayStringToTime', () => {
    expect(displayStringToTime('12:00 AM')).toEqual({ hours: 0, minutes: 0 })
    expect(displayStringToTime('12:30 AM')).toEqual({ hours: 0, minutes: 30 })
    expect(displayStringToTime('12:00 PM')).toEqual({ hours: 12, minutes: 0 })
    expect(displayStringToTime('12:30 PM')).toEqual({ hours: 12, minutes: 30 })
    expect(displayStringToTime('1:00 PM')).toEqual({ hours: 13, minutes: 0 })
    expect(displayStringToTime('8:00 AM')).toEqual({ hours: 8, minutes: 0 })
  })

  test('timeToDisplayString', () => {
    expect(timeToDisplayString(0, 0)).toEqual('12:00 AM')
    expect(timeToDisplayString(0, 30)).toEqual('12:30 AM')
    expect(timeToDisplayString(12, 0)).toEqual('12:00 PM')
    expect(timeToDisplayString(12, 30)).toEqual('12:30 PM')
    expect(timeToDisplayString(13, 0)).toEqual('1:00 PM')
    expect(timeToDisplayString(8, 0)).toEqual('8:00 AM')

    const withZone = timeToDisplayString(8, 0, 'America/Los_Angeles')
    expect(withZone.includes(' PDT') || withZone.includes(' PST')).toBeTruthy()
  })

  test('numberWithOrdinal', () => {
    expect(numberWithOrdinal(1)).toEqual('1st')
    expect(numberWithOrdinal(2)).toEqual('2nd')
    expect(numberWithOrdinal(3)).toEqual('3rd')
    expect(numberWithOrdinal(4)).toEqual('4th')
    expect(numberWithOrdinal(11)).toEqual('11th')
    expect(numberWithOrdinal(12)).toEqual('12th')
    expect(numberWithOrdinal(13)).toEqual('13th')
    expect(numberWithOrdinal(20)).toEqual('20th')
    expect(numberWithOrdinal(21)).toEqual('21st')
    expect(numberWithOrdinal(22)).toEqual('22nd')
    expect(numberWithOrdinal(23)).toEqual('23rd')
    expect(numberWithOrdinal(24)).toEqual('24th')
  })
})
