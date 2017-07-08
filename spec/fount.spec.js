require('./setup')
const Fount = require('../src/fount.js')

describe('Fount', function () {
  describe('Container', function () {
    const fount = new Fount()
    it('should be empty', function () {
      Array.from(fount.namespaces).should.eql([])
      Array.from(fount.keys('default')).should.eql([])
      Array.from(fount.scopes('default')).should.eql([])
    })

    it('should add and resolve container', function () {
      fount.register('a', 'b', 'c')

      Array.from(fount.namespaces).should.eql([ 'a' ])
      Array.from(fount.keys('a')).should.eql([ 'b' ])
      Array.from(fount.scopes('default')).should.eql([])
      fount.resolve('a', 'b').should.eql('c')
      Array.from(fount.scopes('default')).should.eql([])
    })

    it('should add and resolve scope', function () {
      fount.register('a', 'd', 'e')

      Array.from(fount.namespaces).should.eql([ 'a' ])
      Array.from(fount.keys('a')).should.eql([ 'b', 'd' ])
      fount.resolve('a', 'b').should.eql('c')
      fount.resolve('a', 'd', 'f').should.eql('e')
      fount.cacheScope('a', 'd', 'e2', 'f2')
      Array.from(fount.scopes('a')).should.eql([ 'default', 'f', 'f2' ])
    })

    it('should support multiple containers', function () {
      fount.register('g', 'h', 'i')
      fount.register('j', 'k', 'l')

      Array.from(fount.namespaces).should.eql([ 'a', 'g', 'j' ])
      fount.resolve('a', 'b').should.eql('c')
      fount.resolve('g', 'h').should.eql('i')
      fount.resolve('j', 'k').should.eql('l')
      fount.resolve('a', 'd', 'f').should.eql('e')
      fount.resolve('a', 'd', 'f2').should.eql('e2')
      Array.from(fount.keys('a')).should.eql([ 'b', 'd' ])
      Array.from(fount.keys('g')).should.eql([ 'h' ])
      Array.from(fount.keys('j')).should.eql([ 'k' ])
    })

    it('should drop targeted keys', function () {
      fount.drop('a', 'd')

      Array.from(fount.namespaces).should.eql([ 'a', 'g', 'j' ])
      fount.resolve('a', 'b').should.eql('c')
      fount.resolve('g', 'h').should.eql('i')
      fount.resolve('j', 'k').should.eql('l')
      expect(fount.resolve('a', 'd', 'f')).to.eql(undefined)
      expect(fount.resolve('a', 'd', 'f2')).to.eql(undefined)
      Array.from(fount.keys('a')).should.eql([ 'b' ])
      Array.from(fount.keys('g')).should.eql([ 'h' ])
      Array.from(fount.keys('j')).should.eql([ 'k' ])
      Array.from(fount.scopes('a')).should.eql([ 'default', 'f', 'f2' ])
    })

    it('should drop targeted scopes', function () {
      fount.purgeScope('a', 'f')

      Array.from(fount.namespaces).should.eql([ 'a', 'g', 'j' ])
      fount.resolve('a', 'b').should.eql('c')
      fount.resolve('g', 'h').should.eql('i')
      fount.resolve('j', 'k').should.eql('l')
      expect(fount.resolve('a', 'd', 'f2')).to.eql(undefined)
      Array.from(fount.keys('a')).should.eql([ 'b' ])
      Array.from(fount.keys('g')).should.eql([ 'h' ])
      Array.from(fount.keys('j')).should.eql([ 'k' ])
      Array.from(fount.scopes('a')).should.eql([ 'default', 'f2' ])
    })

    it('should purge namespace', function () {
      fount.purge('g')

      Array.from(fount.namespaces).should.eql([ 'a', 'j' ])
      fount.resolve('a', 'b').should.eql('c')
      expect(fount.resolve('g', 'h')).to.eql(undefined)
      fount.resolve('j', 'k').should.eql('l')
      expect(fount.resolve('a', 'd', 'f2')).to.eql(undefined)
      Array.from(fount.keys('a')).should.eql([ 'b' ])
      Array.from(fount.keys('g')).should.eql([])
      Array.from(fount.keys('j')).should.eql([ 'k' ])
      Array.from(fount.scopes('a')).should.eql([ 'default', 'f2' ])
    })

    it('should purge all', function () {
      fount.purgeAll()

      Array.from(fount.namespaces).should.eql([])
      expect(fount.resolve('a', 'b')).to.eql(undefined)
      Array.from(fount.keys('a')).should.eql([])
      Array.from(fount.scopes('a')).should.eql([])
    })
  })
})
