import { calcTraffRatio } from 'wt-curvepoint'

const MIN_GRAPH_INTERVAL = 60 * 60
const MIN_INTERVAL_BETWEEN_DOTS = 10
const MAX_RATIO = 2
const DEFAULT_DOT = {
  limit: 0,
  market: 0,
  mail: 0,
  ref: 0,
  retention: 0,
  seo: 0,
  smm: 0,
  data: {},
  ts: null,
}
const last = array => array[ array.length - 1 ]
const isObject = a => !!a && a.constructor === Object

export default (moment) => {
  const getTrafficChange = dots => {
    if (!Array.isArray(dots)) throw 'getTrafficChange. dots is not array'
  
    const nowSpeed = getTrafficSpeed(dots, 'today')
    const yesterdaySpeed = getTrafficSpeed(dots, 'yesterday')

    return Object.keys(nowSpeed).reduce((acc, trafficType) => {
      if (typeof nowSpeed[trafficType] !== 'number' ) return acc

      return {
        ...acc,
        [ trafficType ]: numberCompare(nowSpeed[trafficType], yesterdaySpeed[trafficType]),
      }
    }, {})
  }

  const numberCompare = (main, secondary, equallyDiff = 5, equallyRatio = 0.05) => {
    if (typeof main !== 'number') throw 'numberCompare. first argument is not a number'
    if (typeof secondary !== 'number') throw 'numberCompare. second argument is not a number'

    const delta = main - secondary
    const equallyDelta = Math.max(equallyDiff, Math.max(main, secondary) * equallyRatio)

    if (Math.abs(delta) <= equallyDelta) return 0
    if (delta > 0) return 1
    return -1
  }

  const addMissingDots = (realDots, addTs = []) => {
    if (!Array.isArray(realDots)) throw 'addMissingDots. realDots is not array'
    if (!Array.isArray(addTs)) throw 'addMissingDots. addTs is not array'

    const sortedDots = realDots.sort((a, b) => a.ts - b.ts)
    let sortedAddTs = addTs.sort((a, b) => a - b)
    const withFakeDot = [
      ...sortedDots,
      { ...last(sortedDots), ts: Infinity },
    ]
    const withNewDots = withFakeDot.reduce((acc, curDot, index, array) => {
      let newDots = []
      sortedAddTs = sortedAddTs.filter(timeStamp => {
        if (curDot.ts === timeStamp) return false
        if (curDot.ts > timeStamp) {
          if (index <= 0) {
            newDots.push({
              ...DEFAULT_DOT,
              ts: timeStamp,
            })
          } else {
            newDots.push({
              ...array[index-1],
              ts: timeStamp,
            })
          }
          return false
        }
        return true
      })
      acc = [ ...acc, ...newDots ]

      if (curDot.ts !== Infinity) acc.push(curDot)

      return acc
    }, [])

    return withNewDots.reduce((realAndPhantomDots, curRealDot) => {
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

  const simplify = (value, commaLength = 2) => {
    if (typeof value !== 'number') throw 'simplify. value is not a number'

    return parseFloat(value.toFixed(commaLength))
  }

  const cleanTraffic = traffic => {
    if (!Array.isArray(traffic)) throw 'cleanTraffic. traffic is not array'
    if (!traffic.length) return []

    const sortedTraffic = traffic.sort((a, b) => a.ts - b.ts)

    return sortedTraffic.reduceRight((acc, curDot) => {
      if (!acc.length || (acc[0].ts - curDot.ts) > MIN_INTERVAL_BETWEEN_DOTS) return [ curDot, ...acc ]

      return acc
    }, [])
  }

  const getTimeStamps = (() => {
    let cache = {}

    return (timeStamp = null) => {
      if (timeStamp && typeof timeStamp !== 'number') throw 'getTimeStamps. timeStamp is not a number'
      if (timeStamp && cache[ timeStamp ]) return cache[ timeStamp ]

      const timeStartDay = moment(timeStamp ? timeStamp * 1000 : undefined)
        .utc()
        .subtract(1, 'hours')
        .startOf('day')
        .add(1, 'hours')
        .unix()
      const timeEndDay = moment(timeStartDay * 1000).add(1, 'day').unix()
      const timeNow = moment().unix()
      const result = { timeStartDay, timeEndDay, timeNow }

      if (timeStamp) cache[ timeStamp ] = result

      return result
    }
  })()

  const calcGraphX = (() => {
    let cache = {}

    return timeStamp => {
      if (typeof timeStamp !== 'number') throw 'calcGraphX. timeStamp is not a number'
  
      const { timeStartDay, timeEndDay } = getTimeStamps(timeStamp)
      cache[ timeStamp ] = simplify(Math.max(Math.min((timeStamp - timeStartDay) / (timeEndDay - timeStartDay), 1), 0), 4)
  
      return cache[ timeStamp ]
    }
  })()

  const sumTraffic = (dot, ratio = 1) => {
    if (dot && !isObject(dot)) throw 'sumTraffic. dot is not a object'
    if (ratio && typeof ratio !== 'number') throw 'sumTraffic. ratio is not a number'

    return dot ? (dot.seo + dot.smm + dot.mail) * ratio + dot.market + dot.ref + dot.retention : 0
  }

  const sumTrafficWRetention = (dot, ratio = 1) => {
    if (dot && !isObject(dot)) throw 'sumTrafficWRetention. dot is not a object'
    if (ratio && typeof ratio !== 'number') throw 'sumTrafficWRetention. ratio is not a number'

    return dot ? sumTraffic(dot, ratio) - dot.retention : 0
  }

  const getTrafficGraphData = (dots, period = 'today', traffic = null) => {
    if (!Array.isArray(dots)) throw 'getTrafficGraphData. dots is not array'
    if (traffic && !Array.isArray(traffic)) throw 'getTrafficGraphData. traffic is not array'
    if (!dots.length) return []

    const timeStamp = period === 'yesterday' ? moment().subtract(1, 'day').unix() : null
    const { timeStartDay, timeEndDay, timeNow } = getTimeStamps(timeStamp)
    let advDots = [ timeStartDay, timeEndDay, timeNow ]
    let filteredTraffic = []

    if (period === 'today' && traffic) {
      filteredTraffic = traffic.reduce((trafArray, trafPacket) => {
        if (trafPacket.endDate > timeNow && trafPacket.endDate < timeEndDay) {
          trafArray.push({
            ts: trafPacket.endDate,
            subtract: Math.round(trafPacket.count / trafPacket.duration)
          })
          advDots.push(trafPacket.endDate)
        }
        return trafArray
      }, [])
    }

    const allDots = addMissingDots(dots, advDots)

    return allDots.map(curDot => {
      const ts = curDot.ts
      const limit = curDot.limit || Infinity
      const isFuture = ts > timeNow

      if (ts >= timeStartDay && ts <= timeEndDay) {
        let subtract = 0

        if (isFuture) {
          filteredTraffic.map(packet => {
            if (packet.ts <= ts) subtract += packet.subtract
          })
        }

        const x = ts !== timeEndDay ? calcGraphX(ts) : 1
        const traffic = Math.max(0, sumTraffic(curDot, calcTraffRatio(x)) - subtract)
        const y = simplify(Math.min(traffic, limit), 3)
        const isTrimmed = traffic > limit

        return { x, y, ts, isTrimmed, isFuture }
      }
    }).filter(v => v)
  }

  const getDataSum = (dots, timeStart, timeEnd, trafficProcess = null) => {
    if (!Array.isArray(dots)) throw 'getDataSum. dots is not array'
    if (typeof timeStart !== 'number') throw 'getDataSum. timeStart is not a number'
    if (typeof timeEnd !== 'number') throw 'getDataSum. timeEnd is not a number'
    if (trafficProcess && typeof trafficProcess !== 'function') throw 'getDataSum. trafficProcess is not a function'
    if (!dots.length) return 0

    const { timeNow } = getTimeStamps()
    const allDots = addMissingDots(dots, [ timeEnd, timeNow ])
    const sum = allDots.reduce((acc, curDot) => {
      const inTimeInterval = curDot.ts >= timeStart && curDot.ts <= timeEnd
      let intervalTraffic = 0

      if (acc.prevDot && inTimeInterval) {
        const dotPeriod = (curDot.ts - Math.max(acc.prevDot.ts, timeStart)) / 60 / 60

        if (dotPeriod > 0) {
          const dailyRatio = calcTraffRatio(calcGraphX(curDot.ts))
          const trafSpeed = sumTraffic(acc.prevDot, dailyRatio)
          const limit = curDot.limit || Infinity
          const trimmedTrafSpeed = Math.min(trafSpeed, limit)
          const processedTrafSpeed = trafficProcess 
            ? trafficProcess({ 
              timeStamp: curDot.ts, 
              trafSpeed: trimmedTrafSpeed, 
              dailyRatio, 
              dot: acc.prevDot, 
              limit,
              dotPeriod,
            }) 
            : trimmedTrafSpeed
          intervalTraffic = processedTrafSpeed * dotPeriod
        }
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

  const futureLimits = lastDot => {
    if (!isObject(lastDot)) throw 'futureLimits. lastDot is not a object'
    if (sumTraffic(lastDot, MAX_RATIO) < lastDot.limit) return []

    const { timeEndDay } = getTimeStamps(lastDot.ts)
    let time = lastDot.ts
    let isTrimmed = false
    let outDots = []
    let calcSpeed = 1 // minutes per iteration

    do {
      const trafWithRatio = sumTraffic(lastDot, calcTraffRatio(calcGraphX(time)))

      if ((trafWithRatio > lastDot.limit) !== isTrimmed) {
        isTrimmed = !isTrimmed
        outDots.push({ isTrimmed, ts: time })
      }

      // speed depends of delta
      calcSpeed = Math.floor(30 * Math.abs(trafWithRatio - lastDot.limit) / lastDot.limit) || 1
      time += 60 * calcSpeed
    } while (time < timeEndDay)

    return outDots
  }

  const getTrafficTodaySum = dots => {
    if (!Array.isArray(dots)) throw 'getTrafficTodaySum. dots is not array'

    const { timeStartDay, timeNow } = getTimeStamps()

    return getDataSum(dots, timeStartDay, timeNow)
  }

  const getTrafficYesterdaySum = dots => {
    if (!Array.isArray(dots)) throw 'getTrafficYesterdaySum. dots is not array'

    const timeStamp = moment().subtract(1, 'day').unix()
    const { timeStartDay, timeEndDay } = getTimeStamps(timeStamp)

    return getDataSum(dots, timeStartDay, timeEndDay)
  }

  const getTrafficSpeed = (dots, period = 'today', timeStamp = null) => {
    if (!Array.isArray(dots)) throw 'getTrafficSpeed. dots is not array'

    const { timeNow } = getTimeStamps()
    let time = timeNow

    if (period === 'yesterday') time = moment(timeNow * 1000).subtract(1, 'day').unix()
    if (timeStamp) time = timeStamp

    const sortedDots = dots.sort((a, b) => a.ts - b.ts)
    const dot = sortedDots.reduce((acc, cur) => cur.ts <= time ? cur : acc, sortedDots[0])
    const ratio = calcTraffRatio(calcGraphX(time))
    const trafficLimit = dot ? dot.limit : Infinity
    const process = (type, ratio = 1) => dot ? Math.round(dot[type] * ratio) : 0

    let seo  = process('seo', ratio)
    let smm  = process('smm', ratio)
    let mail = process('mail', ratio)
    let swap = process('ref')
    let purchase  = process('market')
    let retention = process('retention')
    let total = seo + smm + mail + purchase + swap + retention
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
      generic: seo + smm + mail,
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

  const getAllSitesTraffic = (sites, period = 'today') => {
    if (!Array.isArray(sites)) throw 'getAllSitesTraffic. sites is not array'

    const timeStamp = period === 'yesterday' ? moment().subtract(1, 'day').unix() : moment().unix()
    const { timeStartDay, timeEndDay, timeNow } = getTimeStamps(timeStamp)
    let dots = []
    let subtractTraffic = getSubtractTraffic(sites)

    for (let dotTs = timeStartDay; dotTs <= timeEndDay; dotTs += MIN_GRAPH_INTERVAL) {
      dots.push(getAllSitesTrafficDotInfo(sites, subtractTraffic, dotTs, timeEndDay, timeNow))

      if (timeStamp > dotTs && timeStamp < dotTs + MIN_GRAPH_INTERVAL) {
        dots.push(getAllSitesTrafficDotInfo(sites, subtractTraffic, timeStamp, timeEndDay, timeNow))
      }
    }

    return dots
  }

  const getAllSitesTrafficDotInfo = (sites, subtractTraffic, dotTs, timeEndDay = null, timeNow = null) => {
    if (!Array.isArray(sites)) throw 'getAllSitesTrafficDotInfo. sites is not array'

    const isFuture = dotTs > timeNow
    const x = dotTs === timeEndDay ? 1 : calcGraphX(dotTs)
    const speed = sites.reduce((totalSpeed, curSite) => {
      const speed = getTrafficSpeed(curSite.siteSpeed, null, dotTs)

      return Object.keys(totalSpeed).reduce((object, key) => {
        let sumSpeed = speed[key]

        // subtract speed of ended packages
        if (isFuture && subtractTraffic[ curSite.id ] && subtractTraffic[ curSite.id ][ key ]) {
          const subtractSpeed = subtractTraffic[ curSite.id ][ key ].reduce((totalSubtract, current) => {
            return totalSubtract += current.endTs < dotTs ? current.speed : 0
          }, 0)
          sumSpeed = Math.max(0, sumSpeed - subtractSpeed)
        }

        return {
          ...object,
          [ key ]: totalSpeed[ key ] + sumSpeed,
        }
      }, {})
    }, {
      generic: 0,
      total: 0,
      seo: 0,
      smm: 0,
      mail: 0,
      purchase: 0,
      swap: 0,
      retention: 0,
    })

    return {
      speed,
      isFuture,
      ts: dotTs,
      y: speed.total,
      x,
    }
  }
  
  const getSubtractTraffic = sites => {
    if (!Array.isArray(sites)) throw 'getSubtractTraffic. sites is not array'

    return sites.reduce((sitesSubtract, curSite) => {
      if (!Array.isArray(curSite.traffic)) throw 'getSubtractTraffic. traffic is not array'

      const purchase = curSite.traffic.reduce((trafArray, trafPacket) => [
        ...trafArray,
        {
          endTs: trafPacket.endDate,
          speed: Math.round(trafPacket.count / trafPacket.duration),
        },
      ], [])
      const swap = [] // TODO
      const total = [ ...purchase, ...swap ]

      return {
        ...sitesSubtract,
        [ curSite.id ]: { purchase, swap, total },
      }
    }, {})
  }

  const getAllSitesTrafficChange = sites => {
    if (!Array.isArray(sites)) throw 'getAllSitesTrafficChange. sites is not array'

    const timeStamp = moment().subtract(1, 'day').unix()
    const { timeStartDay, timeNow } = getTimeStamps()
    const nowSpeed = getAllSitesTrafficDotInfo(sites, [], timeNow).speed
    const yesterdaySpeed = getAllSitesTrafficDotInfo(sites, [], timeStamp).speed

    return Object.keys(nowSpeed).reduce((acc, trafficType) => ({
      ...acc,
      [ trafficType ]: numberCompare(nowSpeed[trafficType], yesterdaySpeed[trafficType]),
    }), {})
  }

  return {
    getTrafficSpeed,
    getTrafficYesterdaySum,
    getTrafficTodaySum,
    getDataSum,
    getTrafficGraphData,
    getTrafficChange,
    getAllSitesTraffic,
    getAllSitesTrafficChange,
    simplify,
    cleanTraffic,
    getTimeStamps,
    calcGraphX,
    numberCompare,
    sumTraffic,
    sumTrafficWRetention,
    futureLimits,
  }
}
