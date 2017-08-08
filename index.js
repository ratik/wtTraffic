'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _wtCurvepoint = require('wt-curvepoint');

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var MIN_GRAPH_INTERVAL = 60 * 60;
var MIN_INTERVAL_BETWEEN_DOTS = 10;
var last = function last(arr) {
  return arr[arr.length - 1];
};

exports.default = function (moment) {
  var getTrafficChange = function getTrafficChange(dots) {
    var nowSpeed = getTrafficSpeed(dots, 'today');
    var yesterdaySpeed = getTrafficSpeed(dots, 'yesterday');

    return Object.keys(nowSpeed).reduce(function (acc, trafficType) {
      if (typeof nowSpeed[trafficType] !== 'number') return acc;
      var delta = nowSpeed[trafficType] - yesterdaySpeed[trafficType];
      var equallyDelta = Math.max(10, Math.max(nowSpeed[trafficType], yesterdaySpeed[trafficType]) * 0.05);

      acc[trafficType] = -1;
      if (delta > 0) acc[trafficType] = 1;
      if (Math.abs(delta) <= equallyDelta) acc[trafficType] = 0;

      return acc;
    }, {});
  };

  var addMissingDots = function addMissingDots(realDots) {
    var addTs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

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
    return parseFloat(value.toFixed(commaLength));
  };

  var cleanTraffic = function cleanTraffic(traffic) {
    if (!traffic || !traffic.length) return [];
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

    var timeStartDay = moment(timeStamp ? timeStamp * 1000 : undefined).utc().subtract(1, 'hours').startOf('day').add(1, 'hours').unix();
    var timeEndDay = moment(timeStartDay * 1000).add(1, 'day').unix();
    var timeNow = moment().unix();
    return { timeStartDay: timeStartDay, timeEndDay: timeEndDay, timeNow: timeNow };
  };

  var calcGraphX = function calcGraphX(timeStamp) {
    var _getTimeStamps = getTimeStamps(timeStamp),
        timeStartDay = _getTimeStamps.timeStartDay,
        timeEndDay = _getTimeStamps.timeEndDay;

    return simplify(Math.max(Math.min((timeStamp - timeStartDay) / (timeEndDay - timeStartDay), 1), 0));
  };

  var sumTraffic = function sumTraffic(dot) {
    var ratio = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    return dot ? (dot.seo + dot.smm + dot.mail) * ratio + dot.market + dot.ref + dot.retention : 0;
  };
  var sumTrafficWRetention = function sumTrafficWRetention(dot) {
    var ratio = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    return dot ? sumTraffic(dot, ratio) - dot.retention : 0;
  };

  var getTrafficGraphData = function getTrafficGraphData(dots) {
    var period = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'today';

    if (!dots || !dots.length) return [];
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

    if (!dots || !dots.length) return 0;

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
          limit: limit
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

  var getTrafficTodaySum = function getTrafficTodaySum(dots) {
    var _getTimeStamps4 = getTimeStamps(),
        timeStartDay = _getTimeStamps4.timeStartDay,
        timeNow = _getTimeStamps4.timeNow;

    return getDataSum(dots, timeStartDay, timeNow);
  };

  var getTrafficYesterdaySum = function getTrafficYesterdaySum(dots) {
    var timeStamp = moment().subtract(1, 'day').unix();

    var _getTimeStamps5 = getTimeStamps(timeStamp),
        timeStartDay = _getTimeStamps5.timeStartDay,
        timeEndDay = _getTimeStamps5.timeEndDay;

    return getDataSum(dots, timeStartDay, timeEndDay);
  };

  var getTrafficSpeed = function getTrafficSpeed(dots) {
    var period = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'today';

    var _getTimeStamps6 = getTimeStamps(),
        timeNow = _getTimeStamps6.timeNow;

    var time = period === 'yesterday' ? moment(timeNow * 1000).subtract(1, 'day').unix() : timeNow;
    var sortedDots = dots.sort(function (a, b) {
      return a.ts - b.ts;
    });
    var dot = sortedDots.reduce(function (acc, cur) {
      return cur.ts <= time ? cur : acc;
    }, sortedDots[0]);
    var ratio = (0, _wtCurvepoint.calcTraffRatio)(calcGraphX(timeNow));
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

  return {
    getTrafficSpeed: getTrafficSpeed,
    getTrafficYesterdaySum: getTrafficYesterdaySum,
    getTrafficTodaySum: getTrafficTodaySum,
    getDataSum: getDataSum,
    getTrafficGraphData: getTrafficGraphData,
    getTrafficChange: getTrafficChange,
    simplify: simplify,
    cleanTraffic: cleanTraffic,
    getTimeStamps: getTimeStamps,
    calcGraphX: calcGraphX,
    sumTraffic: sumTraffic,
    sumTrafficWRetention: sumTrafficWRetention
  };
};
