// export function getConfusionMatrix(targetCurve, predictCurve, opts = { _levelMatrix: 10 }) {
export function getConfusionMatrix(targetCurve, predictCurve, opts = { levelDefault: 10 }) {
  // Filter value NaN
  let filter = filterCurve(targetCurve, predictCurve);
  targetCurve = filter.targetCurve;
  predictCurve = filter.predictCurve;

  // let _levelMatrix = _.uniq([...targetCurve.map(point => point.x), ...predictCurve.map(point => point.x)]).length - 1
  // _levelMatrix = _levelMatrix < opts._levelMatrix ? _levelMatrix : opts._levelMatrix; // Nam The comment
  let _levelMatrix = this.levelMatrix ? this.levelMatrix - 1 : opts.levelDefault - 1
  
  let _2Curve = _.concat(targetCurve, predictCurve)
  let min2Curve = Math.min.apply(null, _2Curve.map(point => point.x))
  let max2Curve = Math.max.apply(null, _2Curve.map(point => point.x))

  console.log(min2Curve, max2Curve, _levelMatrix)
  let segment = (max2Curve - min2Curve) / _levelMatrix
  let magrin = segment / 2;
  let arrLabel = []
  for (let i = min2Curve - magrin; i <= max2Curve + magrin; i += segment) {
    arrLabel.push({ min: i, max: i + segment })
  }
  let matrix = new Array(_levelMatrix + 1).fill(0).map(() => new Array(_levelMatrix + 1).fill(0))
  let _labelNull = 0;
  for (const i in targetCurve) {
    let trueLabel = getLabel(arrLabel, targetCurve[i])
    let predictLabel = getLabel(arrLabel, predictCurve[i])
    if(trueLabel == null || predictCurve == null) {
      _labelNull++;
      continue
    }
    matrix[trueLabel][predictLabel]++
  }
  return {matrix: matrix, min: min2Curve, max: max2Curve, labelNull: _labelNull}
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

// let sumMatrix =  _.zipWith(matrixA, maxTrixB, function(_rowA, _rowB) {
//     return _.zipWith(_rowA, _rowB, function(__cellA, __cellB) {
//         return __cellA + __cellB
//     })
// })