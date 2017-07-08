const util = require('./utility')

function resolveFunction (state, containerName, key, value, dependencies, store, scopeName) {
  let hasPromises = false
  const args = dependencies.map(function (dependencyKey) {
    const dependencyValue = state.resolve(containerName, dependencyKey, scopeName)
    if (util.isPromisey(dependencyValue)) {
      hasPromises = true
    }
    return dependencyValue
  })
  if (hasPromises) {
    return util.applyWhen(value, args).then(store)
  } else {
    return store(value.apply(null, args))
  }
}

function factoryResolver (state, containerName, key, value, dependencies) {
  return function (store, scopeName) {
    if (util.isFunction(value)) {
      let dependencyContainer = containerName
      if (value.__npm) {
        dependencyContainer = key
      }
      if (dependencies && state.canResolve(dependencyContainer, dependencies, scopeName)) {
        let promises = false
        const args = dependencies.map(function (key) {
          const val = state.resolve(dependencyContainer, key, scopeName)
          if (util.isPromisey(val)) {
            promises = true
          }
          return val
        })
        if (promises) {
          return util.applyWhen(value, args)
        } else {
          return value.apply(null, args)
        }
      }
    }
    return value
  }
}

function scopedResolver (state, containerName, key, value, dependencies) {
  return function (store, scopeName) {
    if (util.isFunction(value)) {
      if (dependencies && state.canResolve(containerName, dependencies, scopeName)) {
        return resolveFunction(state, containerName, key, value, dependencies, store, scopeName)
      } else {
        return function () {
          if (dependencies && state.canResolve(containerName, dependencies, scopeName)) {
            return resolveFunction(state, containerName, key, value, dependencies, store, scopeName)
          }
        }
      }
    } else {
      return store(value)
    }
  }
}

function staticResolver (state, containerName, key, value, dependencies) {
  const store = x => x
  if (util.isFunction(value) && !util.isStub(value)) {
    if (!dependencies || dependencies.length === 0) {
      return function () {
        return value()
      }
    } else if (dependencies && state.canResolve(containerName, dependencies)) {
      const val = resolveFunction(state, containerName, key, value, dependencies, store)
      return function () {
        return val
      }
    } else {
      var resolvedValue
      return function (store) {
        if (resolvedValue) {
          return resolvedValue
        } else {
          return new Promise(function (resolve) {
            if (dependencies && state.canResolve(containerName, dependencies)) {
              const resolved = resolveFunction(state, containerName, key, value, dependencies, store)
              if (util.isPromisey(resolved)) {
                resolved.then((r) => {
                  resolvedValue = r
                  resolve(r)
                })
              } else {
                resolvedValue = resolved
                resolve(resolved)
              }
            } else {
              resolve(value)
            }
          })
        }
      }
    }
  } else {
    return function () { return value }
  }
}

module.exports = function (state) {
  return {
    factory: factoryResolver.bind(null, state),
    scoped: scopedResolver.bind(null, state),
    static: staticResolver.bind(null, state)
  }
}
