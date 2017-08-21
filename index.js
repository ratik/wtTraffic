'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _wtCurvepoint = require('wt-curvepoint');

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var MIN_GRAPH_INTERVAL = 60 * 60;
var MIN_INTERVAL_BETWEEN_DOTS = 10;
var MAX_RATIO = 2;
var last = function last(arr) {
  return arr[arr.length - 1];
};
var isObject = function isObject(a) {
  return !!a && a.constructor === Object;
};

exports.default = function (moment) {
  var getTrafficChange = function getTrafficChange(dots) {
    var nowSpeed = getTrafficSpeed(dots, 'today');
    var yesterdaySpeed = getTrafficSpeed(dots, 'yesterday');

    return Object.keys(nowSpeed).reduce(function (acc, trafficType) {
      if (typeof nowSpeed[trafficType] !== 'number') return acc;
      return _extends({}, acc, _defineProperty({}, trafficType, numberCompare(nowSpeed[trafficType], yesterdaySpeed[trafficType])));
    }, {});
  };

  var numberCompare = function numberCompare(main, secondary) {
    var equallyDiff = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 5;
    var equallyRatio = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0.05;

    if (typeof main !== 'number') throw 'first argument is not a number';
    if (typeof secondary !== 'number') throw 'second argument is not a number';
    var delta = main - secondary;
    var equallyDelta = Math.max(equallyDiff, Math.max(main, secondary) * equallyRatio);

    if (Math.abs(delta) <= equallyDelta) return 0;
    if (delta > 0) return 1;
    return -1;
  };

  var addMissingDots = function addMissingDots(realDots) {
    var addTs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

    if (!Array.isArray(realDots)) throw 'realDots is not array';
    if (!Array.isArray(addTs)) throw 'addTs is not array';
    var sortedDots = realDots.sort(function (a, b) {
      return a.ts - b.ts;
    });
    var sortedAddTs = addTs.sort(function (a, b) {
      return a - b;
    });

    var withFakeDot = [].concat(_toConsumableArray(sortedDots), [_extends({}, last(sortedDots), { ts: Infinity })]);

    var withNewDots = withFakeDot.reduce(function (acc, curDot, index, array) {
      var newDots = [];
      sortedAddTs = sortedAddTs.filter(function (timeStamp) {
        if (curDot.ts > timeStamp && array[index - 1]) {
          newDots.push(_extends({}, array[index - 1], {
            ts: timeStamp
          }));
          return false;
        }
        return true;
      });
      acc = [].concat(_toConsumableArray(acc), newDots);
      if (curDot.ts !== Infinity) acc.push(curDot);
      return acc;
    }, []);

    return withNewDots.reduce(function (realAndPhantomDots, curRealDot) {
      while (realAndPhantomDots.length && curRealDot.ts - last(realAndPhantomDots).ts > MIN_GRAPH_INTERVAL) {
        realAndPhantomDots = [].concat(_toConsumableArray(realAndPhantomDots), [_extends({}, last(realAndPhantomDots), {
          ts: last(realAndPhantomDots).ts + MIN_GRAPH_INTERVAL
        })]);
      }
      return [].concat(_toConsumableArray(realAndPhantomDots), [curRealDot]);
    }, []);
  };

  var simplify = function simplify(value) {
    var commaLength = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 2;

    if (typeof value !== 'number') throw 'value is not a number';
    return parseFloat(value.toFixed(commaLength));
  };

  var cleanTraffic = function cleanTraffic(traffic) {
    if (!Array.isArray(traffic)) throw 'traffic is not array';
    if (!traffic.length) return [];
    var sortedTraffic = traffic.sort(function (a, b) {
      return a.ts - b.ts;
    });
    return sortedTraffic.reduceRight(function (acc, curDot) {
      if (!acc.length || acc[0].ts - curDot.ts > MIN_INTERVAL_BETWEEN_DOTS) return [curDot].concat(_toConsumableArray(acc));
      return acc;
    }, []);
  };

  var getTimeStamps = function getTimeStamps() {
    var timeStamp = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

    if (timeStamp && typeof timeStamp !== 'number') throw 'timeStamp is not a number';
    var timeStartDay = moment(timeStamp ? timeStamp * 1000 : undefined).utc().subtract(1, 'hours').startOf('day').add(1, 'hours').unix();
    var timeEndDay = moment(timeStartDay * 1000).add(1, 'day').unix();
    var timeNow = moment().unix();
    return { timeStartDay: timeStartDay, timeEndDay: timeEndDay, timeNow: timeNow };
  };

  var calcGraphX = function calcGraphX(timeStamp) {
    if (typeof timeStamp !== 'number') throw 'timeStamp is not a number';

    var _getTimeStamps = getTimeStamps(timeStamp),
        timeStartDay = _getTimeStamps.timeStartDay,
        timeEndDay = _getTimeStamps.timeEndDay;

    return simplify(Math.max(Math.min((timeStamp - timeStartDay) / (timeEndDay - timeStartDay), 1), 0), 4);
  };

  var sumTraffic = function sumTraffic(dot) {
    var ratio = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

    if (dot && !isObject(dot)) throw 'dot is not a object';
    if (ratio && typeof ratio !== 'number') throw 'ratio is not a number';
    return dot ? (dot.seo + dot.smm + dot.mail) * ratio + dot.market + dot.ref + dot.retention : 0;
  };
  var sumTrafficWRetention = function sumTrafficWRetention(dot) {
    var ratio = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

    if (dot && !isObject(dot)) throw 'dot is not a object';
    if (ratio && typeof ratio !== 'number') throw 'ratio is not a number';
    return dot ? sumTraffic(dot, ratio) - dot.retention : 0;
  };

  var getTrafficGraphData = function getTrafficGraphData(dots) {
    var period = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'today';

    if (!Array.isArray(dots)) throw 'dots is not array';
    if (!dots.length) return [];
    var timeStamp = period === 'yesterday' ? moment().subtract(1, 'day').unix() : null;

    var _getTimeStamps2 = getTimeStamps(timeStamp),
        timeStartDay = _getTimeStamps2.timeStartDay,
        timeEndDay = _getTimeStamps2.timeEndDay,
        timeNow = _getTimeStamps2.timeNow;

    return addMissingDots(dots, [timeNow]).map(function (curDot) {
      var ts = curDot.ts;
      var limit = curDot.limit || Infinity;
      if (ts <= timeNow && ts >= timeStartDay && ts <= timeEndDay) {
        var x = ts !== timeEndDay ? calcGraphX(ts) : 1;
        var traffic = sumTraffic(curDot, (0, _wtCurvepoint.calcTraffRatio)(x));
        var y = simplify(Math.min(traffic, limit), 3);
        var isTrimmed = traffic > limit;
        return { x: x, y: y, ts: ts, isTrimmed: isTrimmed };
      }
    }).filter(function (v) {
      return v;
    });
  };

  var getDataSum = function getDataSum(dots, timeStart, timeEnd) {
    var trafficProcess = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

    if (!Array.isArray(dots)) throw 'dots is not array';
    if (typeof timeStart !== 'number') throw 'timeStart is not a number';
    if (typeof timeEnd !== 'number') throw 'timeEnd is not a number';
    if (trafficProcess && typeof trafficProcess !== 'function') throw 'trafficProcess is not a function';
    if (!dots.length) return 0;

    var _getTimeStamps3 = getTimeStamps(),
        timeNow = _getTimeStamps3.timeNow;

    var sum = addMissingDots(dots, [timeEnd, timeNow]).reduce(function (acc, curDot) {
      var inTimeInterval = curDot.ts >= timeStart && curDot.ts <= timeEnd;

      var intervalTraffic = 0;
      if (acc.prevDot && inTimeInterval) {
        var dotPeriod = (curDot.ts - Math.max(acc.prevDot.ts, timeStart)) / 60 / 60;
        var dailyRatio = (0, _wtCurvepoint.calcTraffRatio)(calcGraphX(curDot.ts));
        var trafSpeed = sumTraffic(acc.prevDot, dailyRatio);
        var limit = curDot.limit || Infinity;
        var trimmedTrafSpeed = Math.min(trafSpeed, limit);
        var processedTrafSpeed = trafficProcess ? trafficProcess({
          timeStamp: curDot.ts,
          trafSpeed: trimmedTrafSpeed,
          dailyRatio: dailyRatio,
          dot: acc.prevDot,
          limit: limit,
          dotPeriod: dotPeriod
        }) : trimmedTrafSpeed;
        intervalTraffic = processedTrafSpeed * dotPeriod;
      }

      return {
        prevDot: curDot,
        total: acc.total + intervalTraffic
      };
    }, {
      prevDot: null,
      total: 0
    }).total;

    return simplify(sum);
  };

  var futureLimits = function futureLimits(lastDot) {
    if (!isObject(lastDot)) throw 'lastDot is not a object';
    if (sumTraffic(lastDot, MAX_RATIO) < lastDot.limit) return [];

    var _getTimeStamps4 = getTimeStamps(lastDot.ts),
        timeEndDay = _getTimeStamps4.timeEndDay;

    var time = lastDot.ts;
    var isTrimmed = false;
    var outDots = [];
    do {
      var trafWithRatio = sumTraffic(lastDot, (0, _wtCurvepoint.calcTraffRatio)(calcGraphX(time)));
      if (trafWithRatio > lastDot.limit !== isTrimmed) {
        isTrimmed = !isTrimmed;
        outDots.push({ isTrimmed: isTrimmed, ts: time });
      }
      time += 60;
    } while (time < timeEndDay);
    return outDots;
  };

  var getTrafficTodaySum = function getTrafficTodaySum(dots) {
    var _getTimeStamps5 = getTimeStamps(),
        timeStartDay = _getTimeStamps5.timeStartDay,
        timeNow = _getTimeStamps5.timeNow;

    return getDataSum(dots, timeStartDay, timeNow);
  };

  var getTrafficYesterdaySum = function getTrafficYesterdaySum(dots) {
    var timeStamp = moment().subtract(1, 'day').unix();

    var _getTimeStamps6 = getTimeStamps(timeStamp),
        timeStartDay = _getTimeStamps6.timeStartDay,
        timeEndDay = _getTimeStamps6.timeEndDay;

    return getDataSum(dots, timeStartDay, timeEndDay);
  };

  var getTrafficSpeed = function getTrafficSpeed(dots) {
    var period = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'today';
    var timeStamp = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

    if (!Array.isArray(dots)) throw 'dots is not array';

    var _getTimeStamps7 = getTimeStamps(),
        timeNow = _getTimeStamps7.timeNow;

    var time = timeNow;
    if (period === 'yesterday') time = moment(timeNow * 1000).subtract(1, 'day').unix();
    if (timeStamp) time = timeStamp;
    var sortedDots = dots.sort(function (a, b) {
      return a.ts - b.ts;
    });
    var dot = sortedDots.reduce(function (acc, cur) {
      return cur.ts <= time ? cur : acc;
    }, sortedDots[0]);
    var ratio = (0, _wtCurvepoint.calcTraffRatio)(calcGraphX(time));
    var trafficLimit = dot ? dot.limit : Infinity;
    var process = function process(type) {
      var ratio = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
      return dot ? Math.round(dot[type] * ratio) : 0;
    };

    var seo = process('seo', ratio);
    var smm = process('smm', ratio);
    var mail = process('mail', ratio);
    var swap = process('ref');
    var purchase = process('market');
    var retention = process('retention');
    var total = seo + smm + mail + purchase + swap + retention;
    var isTrimmed = false;

    if (total > 0 && total > trafficLimit) {
      var _ratio = trafficLimit / total;
      seo = Math.round(seo * _ratio);
      smm = Math.round(smm * _ratio);
      mail = Math.round(mail * _ratio);
      swap = Math.round(swap * _ratio);
      purchase = Math.round(purchase * _ratio);
      retention = Math.round(retention * _ratio);
      total = trafficLimit;
      isTrimmed = true;
    }

    return {
      generic: seo + smm + mail,
      total: total,
      seo: seo,
      smm: smm,
      mail: mail,
      purchase: purchase,
      swap: swap,
      retention: retention,
      isTrimmed: isTrimmed
    };
  };

  var getAllSitesTraffic = function getAllSitesTraffic(sites) {
    var period = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'today';

    if (!Array.isArray(sites)) throw 'sites is not array';
    var timeStamp = period === 'yesterday' ? moment().subtract(1, 'day').unix() : moment().unix();

    var _getTimeStamps8 = getTimeStamps(timeStamp),
        timeStartDay = _getTimeStamps8.timeStartDay,
        timeEndDay = _getTimeStamps8.timeEndDay,
        timeNow = _getTimeStamps8.timeNow;

    var dots = [];
    var subtractTraffic = getSubtractTraffic(sites);

    for (var dotTs = timeStartDay; dotTs <= timeEndDay; dotTs += MIN_GRAPH_INTERVAL) {
      dots.push(getAllSitesTrafficDotInfo(sites, subtractTraffic, dotTs, timeEndDay, timeNow));
      if (timeStamp > dotTs && timeStamp < dotTs + MIN_GRAPH_INTERVAL) {
        dots.push(getAllSitesTrafficDotInfo(sites, subtractTraffic, timeStamp, timeEndDay, timeNow));
      }
    }
    return dots;
  };

  var getAllSitesTrafficDotInfo = function getAllSitesTrafficDotInfo(sites, subtractTraffic, dotTs) {
    var timeEndDay = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
    var timeNow = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;

    if (!Array.isArray(sites)) throw 'sites is not array';
    var isFuture = dotTs > timeNow;
    var x = dotTs === timeEndDay ? 1 : calcGraphX(dotTs);
    var speed = sites.reduce(function (totalSpeed, curSite) {
      var speed = getTrafficSpeed(curSite.siteSpeed, null, dotTs);

      return Object.keys(totalSpeed).reduce(function (object, key) {
        var sumSpeed = speed[key];

        // subtract speed of ended packages
        if (isFuture && subtractTraffic[curSite.id] && subtractTraffic[curSite.id][key]) {
          var subtractSpeed = subtractTraffic[curSite.id][key].reduce(function (totalSubtract, current) {
            return totalSubtract += current.endTs < dotTs ? current.speed : 0;
          }, 0);
          sumSpeed = Math.max(0, sumSpeed - subtractSpeed);
        }

        return _extends({}, object, _defineProperty({}, key, totalSpeed[key] + sumSpeed));
      }, {});
    }, {
      generic: 0,
      total: 0,
      seo: 0,
      smm: 0,
      mail: 0,
      purchase: 0,
      swap: 0,
      retention: 0
    });

    return {
      speed: speed,
      isFuture: isFuture,
      ts: dotTs,
      y: speed.total,
      x: x
    };
  };

  var getSubtractTraffic = function getSubtractTraffic(sites) {
    if (!Array.isArray(sites)) throw 'sites is not array';
    return sites.reduce(function (sitesSubtract, curSite) {
      var purchase = curSite.traffic ? curSite.traffic.reduce(function (trafArray, trafPacket) {
        return [].concat(_toConsumableArray(trafArray), [{
          endTs: trafPacket.endDate,
          speed: Math.round(trafPacket.count / trafPacket.duration)
        }]);
      }, []) : [];
      var swap = []; // TODO
      var total = [].concat(_toConsumableArray(purchase), swap);

      return _extends({}, sitesSubtract, _defineProperty({}, curSite.id, { purchase: purchase, swap: swap, total: total }));
    }, {});
  };

  var getAllSitesTrafficChange = function getAllSitesTrafficChange(sites) {
    if (!Array.isArray(sites)) throw 'sites is not array';
    var timeStamp = moment().subtract(1, 'day').unix();

    var _getTimeStamps9 = getTimeStamps(),
        timeStartDay = _getTimeStamps9.timeStartDay,
        timeEndDay = _getTimeStamps9.timeEndDay,
        timeNow = _getTimeStamps9.timeNow;

    var nowSpeed = getAllSitesTrafficDotInfo(sites, [], timeNow).speed;
    var yesterdaySpeed = getAllSitesTrafficDotInfo(sites, [], timeStamp).speed;

    return Object.keys(nowSpeed).reduce(function (acc, trafficType) {
      return _extends({}, acc, _defineProperty({}, trafficType, numberCompare(nowSpeed[trafficType], yesterdaySpeed[trafficType])));
    }, {});
  };

  return {
    getTrafficSpeed: getTrafficSpeed,
    getTrafficYesterdaySum: getTrafficYesterdaySum,
    getTrafficTodaySum: getTrafficTodaySum,
    getDataSum: getDataSum,
    getTrafficGraphData: getTrafficGraphData,
    getTrafficChange: getTrafficChange,
    getAllSitesTraffic: getAllSitesTraffic,
    getAllSitesTrafficChange: getAllSitesTrafficChange,
    simplify: simplify,
    cleanTraffic: cleanTraffic,
    getTimeStamps: getTimeStamps,
    calcGraphX: calcGraphX,
    numberCompare: numberCompare,
    sumTraffic: sumTraffic,
    sumTrafficWRetention: sumTrafficWRetention,
    futureLimits: futureLimits
  };
};
