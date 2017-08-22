import lib from './index'
import moment from 'moment'

const {
  simplify,
  numberCompare,
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
  getAllSitesTraffic,
  getAllSitesTrafficChange,
  futureLimits,
} = lib(moment)

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

describe('numberCompare', function() {
  test('should return -1', () => {
    expect(numberCompare(20, 0)).toBe(1)
  })
  test('should return 1', () => {
    expect(numberCompare(0, 20)).toBe(-1)
  })
  test('should return 0', () => {
    expect(numberCompare(0, 0)).toBe(0)
    expect(numberCompare(0, 1)).toBe(0)
    expect(numberCompare(4, 0)).toBe(0)
    expect(numberCompare(0, 20, 20)).toBe(0)
  })
  test('should return throw', () => {
    expect(() => numberCompare()).toThrow()
    expect(() => numberCompare('1', '2')).toThrow()
    expect(() => numberCompare(1, [])).toThrow()
  })
})

describe('futureLimits', function(){
  test('should return empty array when low traffic', () => {
    expect(futureLimits({
      limit: 100,
      seo: 10,
      smm: 10,
      mail: 10,
      market: 0,
      ref: 0,
      retention: 0,
      ts: moment().unix()
    })).toEqual([])
  })
  test('should limit', () => {
    expect(futureLimits({
      limit: 30,
      seo: 10,
      smm: 10,
      mail: 10,
      market: 0,
      ref: 0,
      retention: 0,
      ts: moment().unix()
    })).toEqual(
      [
        { isTrimmed: true, ts: 366720 },
        { isTrimmed: false, ts: 378540 },
        { isTrimmed: true, ts: 382500 },
        { isTrimmed: false, ts: 416100 },
      ]
    )
  })
  test('should limit all', () => {
    expect(futureLimits({
      limit: 3,
      seo: 10,
      smm: 10,
      mail: 10,
      market: 0,
      ref: 0,
      retention: 0,
      ts: moment().unix()
    })).toEqual(
      [ { isTrimmed: true, ts: 352800 } ]
    )
  })
  test('should return throw', () => {
    expect(() => futureLimits()).toThrow()
    expect(() => futureLimits([])).toThrow()
    expect(() => futureLimits(1)).toThrow()
  })
})

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
  test('should return throw', () => {
    expect(() => cleanTraffic()).toThrow()
    expect(() => cleanTraffic({})).toThrow()
    expect(() => cleanTraffic(1)).toThrow()
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
  test('should return 0.9896', () => {
    expect(calcGraphX(
      moment.unix(startDay).add(24, 'hours').subtract(15, 'minutes').unix()
    )).toBe(0.9896)
  })
  test('should return 1', () => {
    expect(calcGraphX(
      moment.unix(startDay).add(24, 'hours').subtract(1, 'second').unix()
    )).toBe(1)
  })
  test('should return throw', () => {
    expect(() => calcGraphX()).toThrow()
    expect(() => calcGraphX({})).toThrow()
    expect(() => calcGraphX([])).toThrow()
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
  test('should return throw', () => {
    expect(() => sumTraffic(1)).toThrow()
    expect(() => sumTraffic([])).toThrow()
    expect(() => sumTraffic({}, [])).toThrow()
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
  test('should return throw', () => {
    expect(() => sumTrafficWRetention(1)).toThrow()
    expect(() => sumTrafficWRetention([])).toThrow()
    expect(() => sumTrafficWRetention({}, [])).toThrow()
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
      now
    )).toBe(simplify(hours * 1000))
  })
  test('should return hours * 1000', () => {
    const now = moment().unix()
    const hours = (endDate - startDay) / 60 / 60
    expect(getDataSum(
      [ { 
        ...endYesterdayDot,
        limit: 123,
      }, { 
        ...dot1000,
        limit: 123,
      } ],
      startDay,
      endDate
    )).toBe(simplify(hours * 123))
  })

  // period test
  test('should return 1000 / 60 / 60 * 10', () => {
    expect(getDataSum(
      [ endYesterdayDot, dot1000 ],
      startDay,
      startDay + 10
    )).toBe(simplify(1000 / 60 / 60 * 10))
  })
  test('should return 1000 / 60 / 60 * 30', () => {
    expect(getDataSum(
      [ endYesterdayDot, dot1000 ],
      startDay - 10,
      startDay + 20
    )).toBe(simplify(1000 / 60 / 60 * 30))
  })
  test('should return 2 * 1000 + 1000 / 60', () => {
    expect(getDataSum(
      [ endYesterdayDot, dot1000 ],
      startDay,
      startDay + 60 * 60 * 2 + 60
    )).toBe(simplify(2 * 1000 + 1000 / 60))
  })

  // throw test
  test('should return throw', () => {
    expect(() => getDataSum()).toThrow()
    expect(() => getDataSum(1)).toThrow()
    expect(() => getDataSum({})).toThrow()
    expect(() => getDataSum([], null, null)).toThrow()
    expect(() => getDataSum([], 1, null)).toThrow()
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
    expect(getTrafficTodaySum([ ])).toBe(0)
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
    expect(getTrafficYesterdaySum([ ])).toBe(0)
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
        x: simplify(1 / 24, 4),
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
        x: simplify(index / 24, 4),
        y: 1000,
        ts: moment.unix(startDay).subtract(1, 'day').add(index, 'hour').unix(),
        isTrimmed: false,
      }))
    )
  })
  test('should return throw', () => {
    expect(() => getTrafficGraphData()).toThrow()
    expect(() => getTrafficGraphData(1)).toThrow()
    expect(() => getTrafficGraphData({})).toThrow()
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
  test('should return throw', () => {
    expect(() => getTrafficSpeed()).toThrow()
    expect(() => getTrafficSpeed(1)).toThrow()
    expect(() => getTrafficSpeed({})).toThrow()
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

describe('getAllSitesTraffic', function() {
  test('should return array of object', () => {
    expect(getAllSitesTraffic(
      [
        { id: 1, siteSpeed: [ endYesterdayDot, dot1000 ], traffic: [] },
        { id: 2, siteSpeed: [ endYesterdayDot, dot1000 ], traffic: [] },
      ]
    )).toEqual(
      range(0, 25).map(index => ({
        x: simplify(index / 24, 4),
        y: 2000,
        speed: {
          generic: 0,
          mail: 0,
          purchase: 2000,
          retention: 0,
          seo: 0,
          smm: 0,
          swap: 0,
          total: 2000,
        },
        ts: startDay + 60 * 60 * index,
        isFuture: index > 1,
      }))
    )
  })
  test('should return array of object', () => {
    expect(getAllSitesTraffic(
      [ ]
    )).toEqual(
      range(0, 25).map(index => ({
        x: simplify(index / 24, 4),
        y: 0,
        speed: {
          generic: 0,
          mail: 0,
          purchase: 0,
          retention: 0,
          seo: 0,
          smm: 0,
          swap: 0,
          total: 0,
        },
        ts: startDay + 60 * 60 * index,
        isFuture: index > 1,
      }))
    )
  })
  test('should return array of object', () => {
    const tsStart = moment.unix(startDay).subtract(1, 'day').unix()
    expect(getAllSitesTraffic(
      [
        { id: 1, siteSpeed: [ endYesterdayDot, dot1000 ], traffic: [] },
        { id: 2, siteSpeed: [ endYesterdayDot, dot1000 ], traffic: [] },
      ],
      'yesterday'
    )).toEqual(
      range(0, 25).map(index => ({
        x: simplify(index / 24, 4),
        y: 2000,
        speed: {
          generic: 0,
          mail: 0,
          purchase: 2000,
          retention: 0,
          seo: 0,
          smm: 0,
          swap: 0,
          total: 2000,
        },
        ts: tsStart + 60 * 60 * index,
        isFuture: false,
      }))
    )
  })
  test('should return data with subtracted purchase traffic', () => {
    expect(getAllSitesTraffic(
      [
        { id: 1, siteSpeed: [ endYesterdayDot, dot1000 ], traffic: [] },
        {
          id: 2,
          siteSpeed: [ endYesterdayDot, dot1000 ],
          traffic: [
            {
              endDate: startDay + 60 * 60 * 2,
              count: 100,
              duration: 10,
            }
          ]
        },
      ]
    )).toEqual(
      range(0, 25).map(index => ({
        x: simplify(index / 24, 4),
        y: index > 2 ? 1990 : 2000,
        speed: {
          generic: 0,
          mail: 0,
          purchase: index > 2 ? 1990 : 2000,
          retention: 0,
          seo: 0,
          smm: 0,
          swap: 0,
          total: index > 2 ? 1990 : 2000,
        },
        ts: startDay + 60 * 60 * index,
        isFuture: index > 1,
      }))
    )
  })
  test('should return throw', () => {
    expect(() => getAllSitesTraffic()).toThrow()
    expect(() => getAllSitesTraffic(1)).toThrow()
    expect(() => getAllSitesTraffic({})).toThrow()
  })
})

describe('getAllSitesTrafficChange', function() {
  test('should return object of 0', () => {
    expect(getAllSitesTrafficChange(
      [
        { id: 1, siteSpeed: [ endYesterdayDot, dot1000 ], traffic: [] },
        { id: 2, siteSpeed: [ endYesterdayDot, dot1000 ], traffic: [] },
      ]
    )).toEqual({
      generic: 0,
      mail: 0,
      purchase: 0,
      retention: 0,
      seo: 0,
      smm: 0,
      swap: 0,
      total: 0
    })
  })
  test('should return purchase and total-1', () => {
    expect(getAllSitesTrafficChange(
      [
        { id: 1, siteSpeed: [ endYesterdayDot, dot1000 ], traffic: [] },
        { id: 2, siteSpeed: [ endYesterdayDot, { ...dot1000, market: 50 } ], traffic: [] },
      ]
    )).toEqual({
      generic: 0,
      mail: 0,
      purchase: -1,
      retention: 0,
      seo: 0,
      smm: 0,
      swap: 0,
      total: -1
    })
  })
  test('should return purchase and total 1', () => {
    expect(getAllSitesTrafficChange(
      [
        { id: 1, siteSpeed: [ endYesterdayDot, dot1000 ], traffic: [] },
        { id: 2, siteSpeed: [ { ...endYesterdayDot, market: 50 }, dot1000 ], traffic: [] },
      ]
    )).toEqual({
      generic: 0,
      mail: 0,
      purchase: 1,
      retention: 0,
      seo: 0,
      smm: 0,
      swap: 0,
      total: 1
    })
  })
  test('should return throw', () => {
    expect(() => getAllSitesTrafficChange()).toThrow()
    expect(() => getAllSitesTrafficChange(1)).toThrow()
    expect(() => getAllSitesTrafficChange({})).toThrow()
  })
})
