(function () {
  "use strict"

  var filters = angular.module("ec2pricing.filters")

  filters.value("periodMultiplier", {
    "hourly": 1,
    "daily": 24,
    "weekly": 24 * 7,
    "monthly": 24 * 365.25/12,
    "yearly": 24 * 365.25
  })

  filters.factory("normalizedReservePrice", ["displaySettings", "periodMultiplier", function (displaySettings, periodMultiplier) {
    return function (input) {
      var effectiveHourly = input[displaySettings.reservationTerm + "-effectiveHourly"]
      if (effectiveHourly) {
        return effectiveHourly
      } else {
        var fixed = input[displaySettings.reservationTerm]
        var hourly = input[displaySettings.reservationTerm + "Hourly"]
        return fixed/periodMultiplier["yearly"] + hourly
      }
    }
  }])

  filters.factory("pricingCalculator", ["displaySettings", "normalizedReservePrice", "periodMultiplier", function (displaySettings, normalizedReservePrice, periodMultiplier) {
    var priceFor = function (instanceType, k1, k2) {
      var prices = instanceType.prices[displaySettings.region]
      var hourlyPrice = prices && prices[k1] && prices[k1][k2]
      if (typeof hourlyPrice == "object" && ("yrTerm1" in hourlyPrice || "yrTerm1-effectiveHourly" in hourlyPrice)) {
        hourlyPrice = normalizedReservePrice(hourlyPrice)
      }
      return hourlyPrice && (hourlyPrice * periodMultiplier[displaySettings.period])
    }
    var onDemandPrice = function (instanceType) {
      return priceFor(instanceType, 'onDemand', displaySettings.operatingSystem)
    }
    var spotPrice = function (instanceType) {
      return priceFor(instanceType, 'spot', displaySettings.operatingSystem)
    }
    var emrPrice = function (instanceType) {
      return priceFor(instanceType, 'other', 'emr')
    }
    var emrPricePercent = function (instanceType) {
      var emr = emrPrice(instanceType)
      var od = onDemandPrice(instanceType)
      return emr/od
    }
    var ebsOptimizedPrice = function (instanceType) {
      return priceFor(instanceType, 'other', 'ebsOptimized')
    }
    var reservedPrice = function (instanceType) {
      return priceFor(instanceType, displaySettings.reservationType, displaySettings.operatingSystem)
    }
    return {
      priceFor: priceFor,
      onDemandPrice: onDemandPrice,
      spotPrice: spotPrice,
      emrPrice: emrPrice,
      emrPricePercent: emrPricePercent,
      ebsOptimizedPrice: ebsOptimizedPrice,
      reservedPrice: reservedPrice
    }
  }])

  filters.filter("price", function () {
    return function (input) {
      if (isNaN(input) || input == null) {
        return "n/a"
      } else {
        return "$" + input.toFixed(3)
      }
    }
  })

  filters.filter("percent", function () {
    return function (input) {
      if (isNaN(input) || input == null) {
        return "n/a"
      } else {
        return Math.round(100 * input) + "%";
      }
    }
  })

  filters.filter("disks", [function () {
    var nbsp = "\u00A0"
    return function (input) {
      if (input == null) {
        return "n/a"
      } else {
        var str = input.disks + nbsp + "×" + nbsp + input.size + nbsp + "GB"
        if (input.ssd) {
          str += nbsp + "SSD"
        }
        return str
      }
    }
  }])

  filters.filter("totalDisk", [function () {
    return function (input) {
      if (input == null) {
        return "n/a"
      } else {
        return input.disks * input.size
      }
    }
  }])

  filters.filter("shortApiName", [function () {
    var shortSizes = {
      "micro": "µ",
      "small": "s",
      "medium": "m",
      "large": "l",
      "xlarge": "xl",
      "2xlarge": "2xl",
      "4xlarge": "4xl",
      "8xlarge": "8xl"
    }
    return function (input) {
      var components = input.split(".")
      return components[0] + "." + shortSizes[components[1]]
    }
  }])

  filters.filter("sortInstances", ["displaySettings", "normalizedReservePrice", "pricingCalculator", function (displaySettings, normalizedReservePrice, pricingCalculator) {
    var sizeOrder = ["micro", "small", "medium", "large", "xlarge", "2xlarge", "4xlarge", "8xlarge"]
    var networkPerformanceOrder = [
      "very low",
      "low",
      "low to moderate",
      "moderate",
      "high",
      "10 gigabit"
    ]
    var stringSort = function (field) {
      return function (a, b) {
        return a[field].localeCompare(b[field])
      }
    }
    var numberSort = function (field) {
      return function (a, b) {
        return a[field] - b[field]
      }
    }
    var apiNameSort = function (a, b) {
      var aComponents = a.apiName.split(".")
      var bComponents = b.apiName.split(".")
      var familyResult = aComponents[0].localeCompare(bComponents[0])
      if (familyResult == 0) {
        return sizeOrder.indexOf(aComponents[1]) - sizeOrder.indexOf(bComponents[1])
      } else {
        return familyResult
      }
    }
    var diskSort = function (a, b) {
      if (a.disk == null && b.disk == null) {
        return 0
      } else if (a.disk == null) {
        return -1
      } else if (b.disk == null) {
        return 1
      } else {
        var aTotalSize = a.disk.disks * a.disk.size
        var bTotalSize = b.disk.disks * b.disk.size
        if (aTotalSize == bTotalSize) {
          if (a.ssd && b.ssd) {
            return 0
          } else if (a.ssd) {
            return -1
          } else {
            return 1
          }
        } else {
          return aTotalSize - bTotalSize
        }
      }
    }
    var networkPerformanceSort = function (a, b) {
      return networkPerformanceOrder.indexOf(a.networkPerformance) - networkPerformanceOrder.indexOf(b.networkPerformance)
    }
    var priceSort = function (reservationType, operatingSystem) {
      return function (a, b) {
        var aPrice = pricingCalculator.priceFor(a, reservationType || displaySettings.reservationType, operatingSystem || displaySettings.operatingSystem)
        var bPrice = pricingCalculator.priceFor(b, reservationType || displaySettings.reservationType, operatingSystem || displaySettings.operatingSystem)
        if ((aPrice == null || isNaN(aPrice)) && bPrice == 0) {
          return 0
        } else if (aPrice == null || isNaN(aPrice)) {
          return -1
        } else if (bPrice == null || isNaN(bPrice)) {
          return 1
        } else {
          return aPrice - bPrice
        }
      }
    }
    var pricingCalculatorSort = function (numeratorMethod, denominatorMethod) {
      return function (a, b) {
        var aValue = pricingCalculator[numeratorMethod](a)
        var bValue = pricingCalculator[numeratorMethod](b)
        if (denominatorMethod) {
          aValue = aValue / pricingCalculator[denominatorMethod](a)
          bValue = bValue / pricingCalculator[denominatorMethod](b)
        }
        var aUndefined = aValue == null || aValue == undefined || isNaN(aValue)
        var bUndefined = bValue == null || bValue == undefined || isNaN(bValue)
        if (aUndefined && bUndefined) {
          return 0
        } else if (aUndefined && !bUndefined) {
          return -1
        } else if (!aUndefined && bUndefined) {
          return 1
        } else {
          return aValue - bValue
        }
      }
    }
    var savingsSort = function (reservationType, operatingSystem) {
      return pricingCalculatorSort("reservedPrice", "onDemandPrice")
    }
    var emrPriceSort = function () {
      if (displaySettings.emrPercent) {
        return pricingCalculatorSort("emrPrice", "onDemandPrice")
      } else {
        return pricingCalculatorSort("emrPrice")
      }
    }
    var get = function (object, path) {
      return path.reduce(function (obj, key) { return obj && obj[key] }, object)
    }
    var sortFunctions = {
      "apiName": apiNameSort,
      "cpus": numberSort("cpus"),
      "ram": numberSort("ram"),
      "disk": diskSort,
      "networkPerformance": networkPerformanceSort,
      "reservedPrice": priceSort(),
      "reservedSavings": savingsSort(),
      "onDemandPrice": priceSort("onDemand"),
      "spotPrice": priceSort("spot"),
      "emrPrice": emrPriceSort(),
      "ebsOptimizedPrice": priceSort("other", "ebsOptimized")
    }
    return function (input) {
      if (input) {
        var sortFunction = sortFunctions[displaySettings.sortField] || sortFunctions["apiName"]
        if (displaySettings.calculator) {
          var wrapped = sortFunction
          var before = displaySettings.sortAscending ? -1 : 1
          sortFunction = function (a, b) {
            if (a.quantity) {
              return b.quantity ? wrapped(a, b) : before
            } else {
              return b.quantity ? -before : wrapped(a, b)
            }
          }
        }
        var sorted = input.slice().sort(sortFunction)
        if (!displaySettings.sortAscending) {
          sorted.reverse()
        }
        return sorted
      } else {
        return input
      }
    }
  }])
}())