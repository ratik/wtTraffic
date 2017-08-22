import { calcTraffRatio } from 'wt-curvepoint'

const MIN_GRAPH_INTERVAL = 60 * 60
const MIN_INTERVAL_BETWEEN_DOTS = 10
const MAX_RATIO = 2
const last = (arr) => arr[arr.length-1]
const isObject = a => !!a && a.constructor === Object

export default (moment) => {
  const getTrafficChange = dots => {
    const nowSpeed = getTrafficSpeed(dots, 'today')
    const yesterdaySpeed = getTrafficSpeed(dots, 'yesterday')

    return Object.keys(nowSpeed).reduce((acc, trafficType) => {
      if (typeof (nowSpeed[trafficType]) !== 'number' ) return acc

      return {
        ...acc,
        [ trafficType ]: numberCompare(nowSpeed[trafficType], yesterdaySpeed[trafficType]),
      }
    }, {})
  }

  const numberCompare = (main, secondary, equallyDiff = 5, equallyRatio = 0.05) => {
    if (typeof (main) !== 'number') throw 'first argument is not a number'
    if (typeof (secondary) !== 'number') throw 'second argument is not a number'

    const delta = main - secondary
    const equallyDelta = Math.max(equallyDiff, Math.max(main, secondary) * equallyRatio)

    if (Math.abs(delta) <= equallyDelta) return 0
    if (delta > 0) return 1
    return -1
  }

  const addMissingDots = (realDots, addTs = []) => {
    if (!Array.isArray(realDots)) throw 'realDots is not array'
    if (!Array.isArray(addTs)) throw 'addTs is not array'

    const sortedDots = realDots.sort((a, b) => a.ts - b.ts)
    let sortedAddTs = addTs.sort((a, b) => a - b)
    const withFakeDot = [
      ...sortedDots,
      { ...last(sortedDots), ts: Infinity },
    ]
    const withNewDots = withFakeDot.reduce((acc, curDot, index, array) => {
      let newDots = []
      sortedAddTs = sortedAddTs.filter(timeStamp => {
        if (curDot.ts > timeStamp && array[index-1]) {
          newDots.push({
            ...array[index-1],
            ts: timeStamp,
          })
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
    if (typeof (value) !== 'number') throw 'value is not a number'

    return parseFloat(value.toFixed(commaLength))
  }

  const cleanTraffic = traffic => {
    if (!Array.isArray(traffic)) throw 'traffic is not array'
    if (!traffic.length) return []

    const sortedTraffic = traffic.sort((a, b) => a.ts - b.ts)

    return sortedTraffic.reduceRight((acc, curDot) => {
      if (!acc.length || (acc[0].ts - curDot.ts) > MIN_INTERVAL_BETWEEN_DOTS) return [ curDot, ...acc ]

      return acc
    }, [])
  }

  const getTimeStamps = (timeStamp = null) => {
    if (timeStamp && typeof (timeStamp) !== 'number') throw 'timeStamp is not a number'

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

  const calcGraphX = timeStamp => {
    if (typeof (timeStamp) !== 'number') throw 'timeStamp is not a number'

    const { timeStartDay, timeEndDay } = getTimeStamps(timeStamp)

    return simplify(Math.max(Math.min((timeStamp - timeStartDay) / (timeEndDay - timeStartDay), 1), 0), 4)
  }

  const sumTraffic = (dot, ratio = 1) => {
    if (dot && !isObject(dot)) throw 'dot is not a object'
    if (ratio && typeof (ratio) !== 'number') throw 'ratio is not a number'

    return dot ? (dot.seo + dot.smm + dot.mail) * ratio + dot.market + dot.ref + dot.retention : 0
  }

  const sumTrafficWRetention = (dot, ratio = 1) => {
    if (dot && !isObject(dot)) throw 'dot is not a object'
    if (ratio && typeof (ratio) !== 'number') throw 'ratio is not a number'

    return dot ? sumTraffic(dot, ratio) - dot.retention : 0
  }

  const getTrafficGraphData = (dots, period = 'today') => {
    if (!Array.isArray(dots)) throw 'dots is not array'
    if (!dots.length) return []

    const timeStamp = period === 'yesterday' ? moment().subtract(1, 'day').unix() : null
    const { timeStartDay, timeEndDay, timeNow } = getTimeStamps(timeStamp)
    const allDots = addMissingDots(dots, [ timeNow ])

    return allDots.map(curDot => {
      const ts = curDot.ts
      const limit = curDot.limit || Infinity
      if (ts <= timeNow && ts >= timeStartDay && ts <= timeEndDay) {
        const x = ts !== timeEndDay ? calcGraphX(ts) : 1
        const traffic = sumTraffic(curDot, calcTraffRatio(x))
        const y = simplify(Math.min(traffic, limit), 3)
        const isTrimmed = traffic > limit
        return { x, y, ts, isTrimmed }
      }
    }).filter(v => v)
  }

  const getDataSum = (dots, timeStart, timeEnd, trafficProcess = null) => {
    if (!Array.isArray(dots)) throw 'dots is not array'
    if (typeof (timeStart) !== 'number') throw 'timeStart is not a number'
    if (typeof (timeEnd) !== 'number') throw 'timeEnd is not a number'
    if (trafficProcess && typeof (trafficProcess) !== 'function') throw 'trafficProcess is not a function'
    if (!dots.length) return 0

    const { timeNow } = getTimeStamps()
    const allDots = addMissingDots(dots, [ timeEnd, timeNow ])
    const sum = allDots.reduce((acc, curDot) => {
      const inTimeInterval = curDot.ts >= timeStart && curDot.ts <= timeEnd
      let intervalTraffic = 0

      if (acc.prevDot && inTimeInterval) {
        const dotPeriod = (curDot.ts - Math.max(acc.prevDot.ts, timeStart)) / 60 / 60
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
    if (!isObject(lastDot)) throw 'lastDot is not a object'
    if (sumTraffic(lastDot, MAX_RATIO) < lastDot.limit) return []

    const { timeEndDay } = getTimeStamps(lastDot.ts)
    let time = lastDot.ts
    let isTrimmed = false
    let outDots = []

    do {
      const trafWithRatio = sumTraffic(lastDot, calcTraffRatio(calcGraphX(time)))

      if ((trafWithRatio > lastDot.limit) !== isTrimmed) {
        isTrimmed = !isTrimmed
        outDots.push({ isTrimmed, ts: time })
      }

      time += 60
    } while (time < timeEndDay)

    return outDots
  }

  const getTrafficTodaySum = dots => {
    const { timeStartDay, timeNow } = getTimeStamps()

    return getDataSum(dots, timeStartDay, timeNow)
  }

  const getTrafficYesterdaySum = dots => {
    const timeStamp = moment().subtract(1, 'day').unix()
    const { timeStartDay, timeEndDay } = getTimeStamps(timeStamp)

    return getDataSum(dots, timeStartDay, timeEndDay)
  }

  const getTrafficSpeed = (dots, period = 'today', timeStamp = null) => {
    if (!Array.isArray(dots)) throw 'dots is not array'

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
    if (!Array.isArray(sites)) throw 'sites is not array'

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
    if (!Array.isArray(sites)) throw 'sites is not array'

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
    if (!Array.isArray(sites)) throw 'sites is not array'

    return sites.reduce((sitesSubtract, curSite) => {
      const purchase = curSite.traffic ? curSite.traffic.reduce((trafArray, trafPacket) => [
        ...trafArray,
        {
          endTs: trafPacket.endDate,
          speed: Math.round(trafPacket.count / trafPacket.duration),
        },
      ], []) : []
      const swap = [] // TODO
      const total = [ ...purchase, ...swap ]

      return {
        ...sitesSubtract,
        [ curSite.id ]: { purchase, swap, total },
      }
    }, {})
  }

  const getAllSitesTrafficChange = sites => {
    if (!Array.isArray(sites)) throw 'sites is not array'

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
