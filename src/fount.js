const ValueSet = require('./valueset')
const util = require('./utility')

class Fount {
  constructor () {
    this.containers = new Map()
  }

  get namespaces () {
    return this.containers.keys()
  }

  cacheScope (namespace, key, value, scopeName) {
    this.register(namespace, key, value)
    const container = this.containers.get(namespace)
    container.cache(key, value, scopeName)
  }

  canResolve (namespace, dependencies, scopeName) {
    return this.getMissingDependencies(namespace, dependencies, scopeName).length === 0
  }

  drop (namespace, key) {
    const container = this.containers.get(namespace)
    if (container) {
      container.purgeDefinition(key)
    }
  }

  getMissingDependencies (namespace, dependencies, scopeName) {
    const dependencyList = [].concat(dependencies)
    return dependencyList.reduce((acc, key) => {
      const keyList = [].concat(key)
      keyList.forEach((k) => {
        this.pushMissingKey(namespace, k, acc)
      })
      return acc
    }, [])
  }

  keys (namespace) {
    const container = this.containers.get(namespace)
    if (container) {
      return container.keys
    } else {
      return []
    }
  }

  scopes (namespace) {
    const container = this.containers.get(namespace)
    if (container) {
      return container.scopes
    } else {
      return []
    }
  }

  purge (namespace) {
    const container = this.containers.get(namespace)
    if (container) {
      container.purgeAll()
      this.containers.delete(namespace)
    }
  }

  purgeAll () {
    this.containers.clear()
  }

  purgeScope (namespace, scopeName) {
    const container = this.containers.get(namespace)
    if (container) {
      container.purgeScope(scopeName)
    }
  }

  purgeScopes (namespace) {
    const container = this.containers.get(namespace)
    if (container) {
      container.purgeScope()
    }
  }

  pushMissingKey (namespace, key, acc) {
    const originalKey = key
    const parts = key.split(/[._]/)
    let containerName = namespace
    let keyName = key
    if (parts.length > 1) {
      containerName = util.getContainerName(namespace, parts)
      keyName = util.getKey(parts)
    }
    const container = this.containers.get(containerName)
    if (!container || !container.hasKey(keyName)) {
      acc.push(originalKey)
    }
    return acc
  }

  register (namespace, key, value) {
    const container = this.containers.get(namespace) || new ValueSet()
    if (!this.containers.has(namespace)) {
      this.containers.set(namespace, container)
    }
    container.define(key, value)
  }

  resolve (namespace, key, scopeName = 'default') {
    const parts = key.split(/[._]/)
    let containerName = namespace
    let keyName = key
    if (parts.length > 1) {
      containerName = util.getContainerName(namespace, parts)
      keyName = util.getKey(parts)
    }
    const container = this.containers.get(containerName)
    if (container) {
      return container.resolve(keyName, scopeName)
    } else {
      return undefined
    }
  }
}

module.exports = Fount
