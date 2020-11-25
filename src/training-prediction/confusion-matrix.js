export function getConfusionMatrix(targetCurve, predictCurve, opts = { maxLabel: 10 }) {
  let filter = filterCurve(targetCurve, predictCurve);
  targetCurve = filter.targetCurve;
  predictCurve = filter.predictCurve;
  let maxLabel = _.uniq([...targetCurve.map(point => point.x), ...predictCurve.map(point => point.x)]).length - 1
  maxLabel = maxLabel < opts.maxLabel ? maxLabel : opts.maxLabel;
  let _2Curve = _.concat(targetCurve, predictCurve)
  let min2Curve = Math.min.apply(null, _2Curve.map(point => point.x))
  let max2Curve = Math.max.apply(null, _2Curve.map(point => point.x))
  console.log(min2Curve, max2Curve, maxLabel)
  let segment = (max2Curve - min2Curve) / maxLabel
  let magrin = segment / 2;
  let arrLabel = []
  for (let i = min2Curve - magrin; i <= max2Curve + magrin; i += segment) {
    arrLabel.push({ min: i, max: i + segment })
  }
  let matrix = new Array(maxLabel + 1).fill(0).map(() => new Array(maxLabel + 1).fill(0))
  for (const i in targetCurve) {
    let trueLabel = getLabel(arrLabel, targetCurve[i])
    let predictLabel = getLabel(arrLabel, predictCurve[i])
    matrix[trueLabel][predictLabel]++
  }
  return matrix
}

function getLabel(arrLabel, point) {
  let value = typeof point === 'object' ? point.x : point;
  let label = null;
  arrLabel.forEach((_segment, _index) => {
    if (_segment.min < value && value <= _segment.max) {
      label = _index;
    }
  })
  return label
}

function filterCurve(targetCurve, predictCurve) {
  let filter = {
    targetCurve: [],
    predictCurve: []
  }
  for (const index in targetCurve) {
    if (targetCurve[index].x != null && predictCurve[index].x != null) {
      filter.targetCurve.push(targetCurve[index])
      filter.predictCurve.push(predictCurve[index])
    }
  }
  return filter
}
