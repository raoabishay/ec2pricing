function name (it1, it2) {
  let [family1, size1] = it1.name.split('.')
  let [family2, size2] = it2.name.split('.')
  let familyResult = family1.localeCompare(family2)
  if (familyResult === 0) {
    let difference = sizeToNumber(size1) - sizeToNumber(size2)
    return difference === 0 ? 0 : difference / Math.abs(difference)
  } else {
    return familyResult
  }
}

function sizeToNumber (size) {
  let sizes = ['nano', 'micro', 'small', 'medium', 'large', 'xlarge']
  let n = sizes.indexOf(size)
  if (n > -1) {
    return n
  } else {
    let matches = size.match(/^(\d+)xlarge/)
    if (matches) {
      return sizes.length + parseInt(matches[1])
    } else {
      return Math.pow(2, 31)
    }
  }
}

function cmp (n1, n2) {
  if (n1 < n2) {
    return -1
  } else if (n1 > n2) {
    return 1
  } else {
    return 0
  }
}

function vcpus (it1, it2) {
  return it1.vcpus - it2.vcpus
}

function memory (it1, it2) {
  return cmp(it1.memory, it2.memory)
}

const DISK_SIZE_PATTERN = /^(?:(\d+) x )?([\d,.]+)/

function totalDiskSize (storageString) {
  if (storageString.indexOf('EBS') > -1) {
    return 0
  } else {
    let [_, diskCount, diskSize] = storageString.match(DISK_SIZE_PATTERN)
    diskCount = parseInt(diskCount || '1')
    diskSize = parseInt(diskSize.replace(',', ''))
    return diskCount * diskSize
  }
}

function storage (it1, it2) {
  return cmp(totalDiskSize(it1.storage), totalDiskSize(it2.storage))
}

function networkPerformance (it1, it2) {
  return it1.networkPerformance.localeCompare(it2.networkPerformance)
}

function onDemandHourlyRate (it1, it2) {
  let rate1 = it1.onDemandHourlyRate
  let rate2 = it2.onDemandHourlyRate
  if (rate1 == null && rate2 == null) {
    return 0
  } else if (rate1 == null) {
    return 1
  } else if (rate2 == null) {
    return -1
  } else {
    return rate1.localeCompare(rate2)
  }
}

function reservedHourlyRate (it1, it2) {
  let rate1 = it1.reservedHourlyRate
  let rate2 = it2.reservedHourlyRate
  if (rate1 == null && rate2 == null) {
    return 0
  } else if (rate1 == null) {
    return 1
  } else if (rate2 == null) {
    return -1
  } else {
    return rate1.localeCompare(rate2)
  }
}

function upfrontCost (it1, it2) {
  let cost1 = it1.upfrontCost
  let cost2 = it2.upfrontCost
  if (cost1 == null && cost2 == null) {
    return 0
  } else if (cost1 == null) {
    return 1
  } else if (cost2 == null) {
    return -1
  } else {
    return cost1.localeCompare(cost2)
  }
}

export default {
  name,
  vcpus,
  memory,
  storage,
  networkPerformance,
  onDemandHourlyRate,
  reservedHourlyRate,
  upfrontCost
}
