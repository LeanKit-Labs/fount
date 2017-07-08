/* eslint camelcase: 0 */
require('./setup')
var fount = require('../src/index.js')

describe('Invoke', function () {
  var aObj = { value: 1 }
  var b = function () {
    return 2
  }
  var c = function (a, b) {
    return a.value + b
  }
  var dObj = { value: 5 }
  /* eslint-disable no-unused-vars */
  var d = function () {
    return dObj
  }
  /* eslint-enable no-unused-vars */
  var e = function (c, d) {
    return c * d.value
  }

  before(function () {
    aObj = { value: 1 }
    b = function () {
      return 2
    }
    c = function (a, b) {
      return a.value + b
    }
    dObj = { value: 5 }
    /* eslint-disable no-unused-vars */
    d = function () {
      return dObj
    }
    /* eslint-enable no-unused-vars */
    e = function (c, d) {
      return c * d.value
    }

    fount.purgeAll()

    fount.register('aStatic', aObj)
    fount.register('bStatic', b)
    fount.register('cStatic', [ 'aStatic', 'bStatic' ], c)
    fount.register('dStatic', dObj)
    fount.register('eStatic', [ 'cStatic', 'dStatic' ], e)

    fount.register('aScoped', aObj, 'scoped')
    fount.register('bScoped', b, 'scoped')
    fount.register('cScoped', [ 'aScoped', 'bScoped' ], c, 'scoped')
    fount.register('dScoped', dObj, 'scoped')
    fount.register('eScoped', [ 'cScoped', 'dScoped' ], e, 'scoped')

    fount.register('aFactory', aObj, 'factory')
    fount.register('bFactory', b, 'factory')
    fount.register('cFactory', [ 'aFactory', 'bFactory' ], c, 'factory')
    fount.register('dFactory', dObj, 'factory')
    fount.register('eFactory', [ 'cFactory', 'dFactory' ], e, 'factory')
  })

  describe('with static dependencies', function () {
    describe('when resolving', function () {
      var result
      before(function () {
        fount.invoke([ 'eStatic' ], function (e) {
          result = e
        })
      })

      it('should resolve to 15', function () {
        result.should.equal(15)
      })
    })

    describe('after changing a dependency', function () {
      var result
      before(function () {
        aObj.value = 2
        dObj.value = 10
        fount.invoke([ 'eStatic' ], function (e) {
          result = e
        })
      })

      it('should not change', function () {
        result.should.equal(15)
      })
    })
  })

  describe('with scoped dependencies', function () {
    describe('when calling invokely from default scope', function () {
      var result
      before(function () {
        aObj.value = 1
        dObj.value = 5
        fount.invoke([ 'eScoped' ], function (e) {
          result = e
        })
      })

      it('should resolve correctly', function () {
        result.should.equal(15)
      })
    })

    describe('when calling invokely from custom scope', function () {
      var result
      before(function () {
        aObj.value = 2
        dObj.value = 10
        fount.invoke([ 'eScoped' ], function (e) {
          result = e
        }, 'custom')
      })

      it('should produce an independent result', function () {
        result.should.equal(40)
      })
    })

    describe('when calling invokely from default scope after change', function () {
      var result
      before(function () {
        fount.invoke([ 'eScoped' ], function (e) {
          result = e
        })
      })

      it('should produce original scoped result', function () {
        result.should.equal(15)
      })
    })

    describe('when calling invokely from more than one container', function () {
      var result
      before(function () {
        fount.register('doggie.question', 'Who\'s a good boy?')
        fount.register('owner.praise', 'YOU are!')
        fount.invoke([ 'doggie.question', 'owner.praise' ], function (dq, op) {
          result = dq + ' ' + op
        })
      })

      it('should correctly invoke dependencies', function () {
        result.should.equal('Who\'s a good boy? YOU are!')
      })
    })

    describe('when calling invokely from complex namespaces', function () {
      var result
      before(function () {
        fount.register('one.two.three', 123)
        fount.register('one.two.five', 125)
        fount.invoke([ 'one.two.three', 'one.two.five' ], function (x, y) {
          result = x + y
        })
      })

      it('should correctly invoke dependencies', function () {
        result.should.equal(248)
      })
    })
  })

  describe('with factory dependencies', function () {
    describe('when calling invokely factory', function () {
      var result
      before(function () {
        aObj.value = 1
        dObj.value = 5
        fount.invoke([ 'eFactory' ], function (e) {
          result = e
        })
      })

      it('should resolve correclty', function () {
        result.should.equal(15)
      })
    })

    describe('when calling invokely factory', function () {
      var result
      before(function () {
        aObj.value = 2
        dObj.value = 5
        fount.invoke([ 'eFactory' ], function (e) {
          result = e
        })
      })

      it('should resolve to reflect changes in dependencies', function () {
        result.should.equal(20)
      })
    })

    describe('when calling invokely from multiple containers', function () {
      before(function () {
        fount.register('three.a', 3)
        fount('three').register('b', 4)
        fount.register('four.c', 5)
      })

      it('should resolve to correct values', function () {
        fount.invoke([ 'three.a', 'three.b', 'four.c' ], function (x, y, z) {
          return x + y + z
        }).should.eql(12)
      })
    })
  })

  describe('when calling invokely without dependency array', function () {
    before(function () {
      fount.purgeAll()
      fount.register('one', 1)
      fount.register('two', function () {
        return 2
      })
      fount.register('three', function (two) {
        return two + 1
      })
    })

    describe('with a dependency of each type', function () {
      var results
      before(function () {
        fount.invoke(function (one, two, three) {
          results = [ one, two, three ]
        })
      })

      it('should return array of correct values', function () {
        results.should.eql([ 1, 2, 3 ])
      })
    })

    describe('when resolving across multiple containers', function () {
      before(function () {
        fount.register('three.a', 3)
        fount('three').register('b', 4)
        fount('three').register('c', 4.5)
        fount.register('four.c', 5)
      })

      it('should resolve correct values', function () {
        fount.invoke(function (three_a, three_b, four_c) {
          return three_a + three_b + four_c
        }).should.eql(12)
      })
    })
  })
})
