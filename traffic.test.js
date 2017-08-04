import lib from './index';
import moment from 'moment';
const {
  simplify,
  cleanTraffic,
  calcGraphX,
  sumTraffic,
  sumTrafficWRetention,
  getDataSum,
  getTrafficTodaySum,
  getTrafficYesterdaySum,
  getTrafficGraphData,
  getTrafficSpeed,
  getTrafficChange,
} = lib(moment);

import { range } from 'ramda'

const startDay = moment.unix(0)
  .utc()
  .subtract(1, 'hours')
  .startOf('day')
  .add(1, 'hours')
  .add(5, 'days')
  .unix()

const endDate = moment.unix(startDay).add(1, 'day').unix()
moment.now = jest.fn(() => (startDay + 1 * 60 * 60) * 1000)

const dot1000 = {
  mail: 0,
  market: 1000,
  ref: 0,
  retention: 0,
  seo: 0,
  smm: 0,
  ts: startDay,
  limit: 100000,
}

const dotGeneric = {
  mail: 1000,
  market: 1,
  ref: 2,
  retention: 3,
  seo: 1000,
  smm: 1000,
  ts: startDay,
  limit: 100000,
}

const endYesterdayDot = {
  ...dot1000,
  ts: moment.unix(startDay).subtract(1, 'day').unix(),
  limit: 100000,
}

describe('cleanTraffic', function() {
  test('should return array of 2 dots', () => {
    expect(cleanTraffic(
      [
        { ts: 1, i: 1 },
        { ts: 2, i: 2 },
        { ts: 2, i: 3 },
        { ts: 200, i: 4 },
      ]
    )).toEqual(
      [
        { ts: 2, i: 3 },
        { ts: 200, i: 4 },
      ]
    )
  })
  test('should return array of 3 dots', () => {
    expect(cleanTraffic(
      [
        { ts: 100, i: 1 },
        { ts: 200, i: 2 },
        { ts: 300, i: 3 },
      ]
    )).toEqual(
      [
        { ts: 100, i: 1 },
        { ts: 200, i: 2 },
        { ts: 300, i: 3 },
      ]
    )
  })
  test('should return empty array', () => {
    expect(cleanTraffic(
      [ ]
    )).toEqual([ ])
  })
})

describe('calcGraphX', function() {
  test('should return 0', () => {
    expect(calcGraphX(
      startDay
    )).toBe(0)
  })
  test('should return 0.5', () => {
    expect(calcGraphX(
      moment.unix(startDay).add(12, 'hours').unix()
    )).toBe(0.5)
  })
  test('should return 0.99', () => {
    expect(calcGraphX(
      moment.unix(startDay).add(24, 'hours').subtract(15, 'minutes').unix()
    )).toBe(0.99)
  })
  test('should return 1', () => {
    expect(calcGraphX(
      moment.unix(startDay).add(24, 'hours').subtract(1, 'second').unix()
    )).toBe(1)
  })
})

describe('sumTraffic', function() {
  test('should return 0', () => {
    expect(sumTraffic(
      null
    )).toBe(0)
  })
  test('should return 1000', () => {
    expect(sumTraffic(
      dot1000
    )).toBe(1000)
  })
  test('should return 3708', () => {
    expect(sumTraffic(
      dotGeneric,
      1.234
    )).toBe(1234 * 3 + 1 + 2 + 3)
  })
})

describe('sumTrafficWRetention', function() {
  test('should return 0', () => {
    expect(sumTrafficWRetention(
      null
    )).toBe(0)
  })
  test('should return 1000', () => {
    expect(sumTrafficWRetention(
      dot1000
    )).toBe(1000)
  })
  test('should return 3705', () => {
    expect(sumTrafficWRetention(
      dotGeneric,
      1.234
    )).toBe(1234 * 3 + 1 + 2)
  })
})

describe('getDataSum', function() {
  // yesterday tests
  test('should return 24000', () => {
    expect(getDataSum(
      [ endYesterdayDot, dot1000 ],
      moment.unix(startDay).subtract(1, 'day').unix(),
      moment.unix(endDate).subtract(1, 'day').unix()
    )).toBe(24000)
  })
  test('should return 2952', () => {
    expect(getDataSum(
      [ { 
        ...endYesterdayDot,
        limit: 123,
      }, { 
        ...dot1000,
        limit: 123,
      } ],
      moment.unix(startDay).subtract(1, 'day').unix(),
      moment.unix(endDate).subtract(1, 'day').unix()
    )).toBe(24 * 123)
  })

  // today tests
  test('should return hours * 1000', () => {
    const now = moment().unix()
    const hours = (now - startDay) / 60 / 60
    expect(getDataSum(
      [ endYesterdayDot, dot1000 ],
      startDay,
      endDate
    )).toBe(simplify(hours * 1000))
  })
  test('should return hours * 1000', () => {
    const now = moment().unix()
    const hours = (now - startDay) / 60 / 60
    expect(getDataSum(
      [ { 
        ...endYesterdayDot,
        limit: 123,
      }, { 
        ...dot1000,
        limit: 123,
      } ],
      startDay,
      moment.unix(startDay).add(1, 'day')
    )).toBe(simplify(hours * 123))
  })
})

describe('getTrafficTodaySum', function() {
  test('should return 100', () => {
    expect(getTrafficTodaySum(
      [ endYesterdayDot, dot1000 ]
    )).toBe(1000)
  })
  test('should return 100', () => {
    expect(getTrafficTodaySum(
      [ { 
        ...endYesterdayDot,
        limit: 100,
      }, { 
        ...dot1000,
        limit: 100,
      } ]
    )).toBe(100)
  })
  test('should return 0', () => {
    expect(getTrafficTodaySum(
      [ ]
    )).toBe(0)
  })
  test('should return 0', () => {
    expect(getTrafficTodaySum()).toBe(0)
  })
})

describe('getTrafficYesterdaySum', function() {
  test('should return 24000', () => {
    expect(getTrafficYesterdaySum(
      [ endYesterdayDot, dot1000 ]
    )).toBe(24000)
  })
  test('should return 24', () => {
    expect(getTrafficYesterdaySum(
      [ { 
        ...endYesterdayDot,
        limit: 1,
      }, { 
        ...dot1000,
        limit: 1,
      } ],
    )).toBe(24)
  })
  test('should return 0', () => {
    expect(getTrafficYesterdaySum(
      [ ]
    )).toBe(0)
  })
  test('should return 0', () => {
    expect(getTrafficYesterdaySum()).toBe(0)
  })
})

describe('getTrafficGraphData', function() {
  test('should return array of 2 dots', () => {
    expect(getTrafficGraphData(
      [ dotGeneric ]
    )).toEqual([
      {
        x: 0,
        y: 3000 * 0.1 + 1 + 2 + 3,
        ts: startDay,
        isTrimmed: false,
      },
      {
        x: 0.04,
        y: 3000 * 0.12 + 1 + 2 + 3,
        ts: startDay + 60 * 60,
        isTrimmed: false,
      },
    ])
  })
  test('should return array of 25 dots', () => {
    expect(getTrafficGraphData(
      [ endYesterdayDot, dot1000 ],
      'yesterday'
    )).toEqual(
      range(0, 25).map(index => ({
        x: simplify(index / 24),
        y: 1000,
        ts: moment.unix(startDay).subtract(1, 'day').add(index, 'hour').unix(),
        isTrimmed: false,
      }))
    )
  })
})

describe('getTrafficSpeed', function() {
  test('should return object', () => {
    expect(getTrafficSpeed(
      [ dot1000 ]
    )).toEqual({
      generic: 0,
      total: 1000,
      seo: 0,
      smm: 0,
      mail: 0,
      purchase: 1000,
      swap: 0,
      retention: 0,
      isTrimmed: false,
    })
  })
  test('should return object', () => {
    expect(getTrafficSpeed(
      [ dotGeneric ]
    )).toEqual({
      generic: 1000 * 0.12 * 3,
      total: 1000 * 0.12 * 3 + 1 + 2 + 3,
      seo: 1000 * 0.12,
      smm: 1000 * 0.12,
      mail: 1000 * 0.12,
      purchase: 1,
      swap: 2,
      retention: 3,
      isTrimmed: false,
    })
  })
  test('should return object', () => {
    expect(getTrafficSpeed(
      [ {
        ...dotGeneric,
        limit: 100,
      } ],
      'today'
    )).toEqual({
      generic: 99,
      total: 100,
      seo: 33,
      smm: 33,
      mail: 33,
      purchase: 0,
      swap: 1,
      retention: 1,
      isTrimmed: true,
    })
  })
  test('should return 1 in purchase', () => {
    expect(getTrafficSpeed(
      [ { 
        ...endYesterdayDot,
        limit: 1,
      } ],
      'yesterday'
    )).toEqual({
      generic: 0,
      total: 1,
      seo: 0,
      smm: 0,
      mail: 0,
      purchase: 1,
      swap: 0,
      retention: 0,
      isTrimmed: true,
    })
  })
  test('should return 0 in all types', () => {
    expect(getTrafficSpeed(
      [ ],
    )).toEqual({
      generic: 0,
      total: 0,
      seo: 0,
      smm: 0,
      mail: 0,
      purchase: 0,
      swap: 0,
      retention: 0,
      isTrimmed: false,
    })
  })
})

describe('getTrafficChange', function() {
  test('should return object', () => {
    expect(getTrafficChange(
      [ endYesterdayDot, dotGeneric ]
    )).toEqual({
      generic: 1,
      total: -1,
      seo: 1,
      smm: 1,
      mail: 1,
      purchase: -1,
      swap: 0,
      retention: 0,
    })
  })
  test('should return object of 0', () => {
    expect(getTrafficChange(
      [ ]
    )).toEqual({
      generic: 0,
      total: 0,
      seo: 0,
      smm: 0,
      mail: 0,
      purchase: 0,
      swap: 0,
      retention: 0,
    })
  })
})
