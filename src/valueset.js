const util = require('./utility')

class ValueSet {
  constructor () {
    this.definitions = new Map()
    this.scopeIndex = new Map()
    this.scopeCache = new Map()
  }

  get keys () {
    return this.definitions.keys()
  }

  get scopes () {
    return this.scopeCache.keys()
  }

  addKeyScope (key, scopeName) {
    const keyScopes = this.scopeIndex.get(key) || []
    keyScopes.push(scopeName)
    this.scopeIndex.set(key, keyScopes)
  }

  cache (key, value, scopeName) {
    const scope = this.scopeCache.get(scopeName) || new Map()
    if (!this.scopeCache.has(scopeName)) {
      this.scopeCache.set(scopeName, scope)
    }
    this.addKeyScope(key, scopeName)
    const clone = util.clone(value)
    scope.set(key, clone)
    return clone
  }

  define (key, value) {
    this.definitions.set(key, value)
    return value
  }

  hasKey (key) {
    return this.definitions.has(key)
  }

  removeKeyScope (key) {
    const keyScopes = this.scopeIndex.get(key)
    keyScopes.forEach((scopeName) => {
      const cache = this.scopeCache.get(scopeName)
      if (cache) {
        cache.delete(key)
      }
    })
    this.scopeIndex.delete(key)
  }

  resolve (key, scopeName) {
    const scope = this.scopeCache.get(scopeName)
    if (scope && scope.has(key)) {
      return this.scopeCache.get(scopeName).get(key)
    } else {
      const value = this.definitions.get(key)
      if (util.isFunction(value)) {
        return value(this.store.bind(this, key, scopeName), scopeName)
      } else {
        return this.store(key, scopeName, value)
      }
    }
  }

  store (key, scopeName, value) {
    if (util.isPromisey(value)) {
      return value.then(x => this.cache(key, x, scopeName))
    } else {
      return this.cache(key, value, scopeName)
    }
  }

  purgeAll () {
    this.purgeDefinitions()
    this.purgeScopes()
  }

  purgeDefinition (key) {
    this.definitions.delete(key)
    this.removeKeyScope(key)
  }

  purgeDefinitions () {
    this.definitions.clear()
  }

  purgeScope (scopeName) {
    this.scopeCache.delete(scopeName)
  }

  purgeScopes () {
    this.scopeCache.clear()
  }
}

module.exports = ValueSet
