import { moment, calcTraffRatio } from './'
import { sum, head, last } from 'ramda'

const MIN_GRAPH_INTERVAL = 60 * 60
const MIN_INTERVAL_BETWEEN_DOTS = 10

const addMissingDots = (realDots, timeNow) => {
  const sortedDots = realDots.sort((a, b) => a.ts - b.ts)
  const realDotsWithNow = [
    ...sortedDots,
    { ...last(sortedDots), ts: timeNow },
  ]
  return realDotsWithNow
    .reduce((realAndPhantomDots, curRealDot) => {
      while (realAndPhantomDots.length && curRealDot.ts - last(realAndPhantomDots).ts > MIN_GRAPH_INTERVAL) {
        realAndPhantomDots = [
          ...realAndPhantomDots,
          { 
            ...last(realAndPhantomDots), 
            ts: last(realAndPhantomDots).ts + MIN_GRAPH_INTERVAL,
          },
        ]
      }
      return [ ...realAndPhantomDots, curRealDot ]
    }, [])
}

export const simplify = (value, commaLength = 2) => parseFloat(value.toFixed(commaLength))

export const cleanTraffic = traffic => {
  if (!traffic || !traffic.length) return []
  const sortedTraffic = traffic.sort((a, b) => a.ts - b.ts)
  return sortedTraffic.reduceRight((acc, curDot) => {
    if (!acc.length || (head(acc).ts - curDot.ts) > MIN_INTERVAL_BETWEEN_DOTS) return [ curDot, ...acc ]
    return acc
  }, [])
}

export const getTimeStamps = (timeStamp = null) => {
  const timeStartDay = moment(timeStamp ? timeStamp * 1000 : undefined)
    .utc()
    .subtract(1, 'hours')
    .startOf('day')
    .add(1, 'hours')
    .unix()
  const timeEndDay = moment(timeStartDay * 1000).add(1, 'day').unix()
  const timeNow = moment().unix()
  return { timeStartDay, timeEndDay, timeNow }
}

export const calcGraphX = timeStamp => {
  const { timeStartDay, timeEndDay } = getTimeStamps(timeStamp)
  return simplify(Math.max(Math.min((timeStamp - timeStartDay) / (timeEndDay - timeStartDay), 1), 0))
}

export const sumTraffic = (dot, ratio = 1) => dot ? (dot.seo + dot.smm + dot.mail) * ratio + dot.market + dot.ref + dot.retention : 0

export const getTrafficGraphData = (dots, period = 'today') => {
  if (!dots || !dots.length) return []
  const timeStamp = period === 'yesterday' ? moment().subtract(1, 'day').unix() : null
  const { timeStartDay, timeEndDay, timeNow } = getTimeStamps(timeStamp)

  return addMissingDots(dots, timeNow)
    .map(curDot => {
      const ts = curDot.ts
      const limit = curDot.limit || Infinity
      if (ts <= timeNow && ts >= timeStartDay && ts <= timeEndDay) {
        const x = ts !== timeEndDay ? calcGraphX(ts) : 1
        const traffic = sumTraffic(curDot, calcTraffRatio(x))
        const y = simplify(Math.min(traffic, limit), 3)
        const isTrimmed = traffic > limit
        return { x, y, ts, isTrimmed }
      }
    })
    .filter(v => v)
}

export const getDataSum = (dots, timeStart, timeEnd, trafficProcess = null) => {
  if (!dots || !dots.length) return 0
  const { timeNow } = getTimeStamps()

  const sum = addMissingDots(dots, timeNow)
    .reduce((acc, curDot) => {
      const inTimeInterval = curDot.ts >= timeStart && curDot.ts <= timeEnd

      let intervalTraffic = 0
      if (acc.prevDot && inTimeInterval) {
        const dotPeriod = (curDot.ts - Math.max(acc.prevDot.ts, timeStart)) / 60 / 60
        const trafSpeed = sumTraffic(acc.prevDot, calcTraffRatio(calcGraphX(curDot.ts)))
        const limit = curDot.limit || Infinity
        const trimmedTrafSpeed = Math.min(trafSpeed, limit)
        const processedTrafSpeed = trafficProcess 
          ? trafficProcess(curDot.ts, trimmedTrafSpeed) 
          : trimmedTrafSpeed
        intervalTraffic = processedTrafSpeed * dotPeriod
      }

      return {
        prevDot: curDot,
        total: acc.total + intervalTraffic,
      }
    }, {
      prevDot: null,
      total: 0,
    }).total

  return simplify(sum)
}

export const getTrafficTodaySum = dots => {
  const { timeStartDay, timeNow } = getTimeStamps()
  return getDataSum(dots, timeStartDay, timeNow)
}

export const getTrafficYesterdaySum = dots => {
  const timeStamp = moment().subtract(1, 'day').unix()
  const { timeStartDay, timeEndDay } = getTimeStamps(timeStamp)
  return getDataSum(dots, timeStartDay, timeEndDay)
}

export const getTrafficSpeed = (dots, period = 'today') => {
  const { timeNow } = getTimeStamps()
  const time = period === 'yesterday' ? moment(timeNow * 1000).subtract(1, 'day').unix() : timeNow
  const sortedDots = dots.sort((a, b) => a.ts - b.ts)
  const dot = sortedDots.reduce((acc, cur) => cur.ts <= time ? cur : acc, head(sortedDots))
  const ratio = calcTraffRatio(calcGraphX(timeNow))
  const trafficLimit = dot ? dot.limit : Infinity
  const process = (type, ratio = 1) => dot ? Math.round(dot[type] * ratio) : 0

  let seo  = process('seo', ratio)
  let smm  = process('smm', ratio)
  let mail = process('mail', ratio)
  let swap = process('ref')
  let purchase  = process('market')
  let retention = process('retention')
  let total = sum([ seo, smm, mail, purchase, swap, retention ])
  let isTrimmed = false

  if (total > 0 && total > trafficLimit) {
    const ratio = trafficLimit / total
    seo  = Math.round(seo * ratio)
    smm  = Math.round(smm * ratio)
    mail = Math.round(mail * ratio)
    swap = Math.round(swap * ratio)
    purchase  = Math.round(purchase * ratio)
    retention = Math.round(retention * ratio)
    total = trafficLimit
    isTrimmed = true
  }

  return {
    generic: sum([ seo, smm, mail ]),
    total,
    seo,
    smm,
    mail,
    purchase,
    swap,
    retention,
    isTrimmed,
  }
}

export const getTrafficChange = dots => {
  const nowSpeed = getTrafficSpeed(dots, 'today')
  const yesterdaySpeed = getTrafficSpeed(dots, 'yesterday')

  return Object.keys(nowSpeed).reduce((acc, trafficType) => {
    if (typeof (nowSpeed[trafficType]) !== 'number' ) return acc
    const delta = nowSpeed[trafficType] - yesterdaySpeed[trafficType]
    const equallyDelta = Math.max(10, Math.max(nowSpeed[trafficType], yesterdaySpeed[trafficType]) * 0.05)

    acc[trafficType] = -1
    if (delta > 0) acc[trafficType] = 1
    if (Math.abs(delta) <= equallyDelta) acc[trafficType] = 0

    return acc
  }, {})
}
