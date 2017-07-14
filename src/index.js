const debug = require('debug')('fount')
const path = require('path')
const fs = require('fs')
const getDisplay = process.env.DEBUG ? displayDependency : function () {}

const DEFAULT = 'default'
const STATIC = 'static'

var parent
const Fount = require('./fount')
const state = new Fount()
const util = require('./utility')
const _ = require('fauxdash')
const resolvers = require('./resolvers')(state)

function allKeys () {
  return Array.from(state.namespaces).reduce((acc, n) => {
    Array.from(state.keys(n)).forEach(k => {
      acc.push(n === DEFAULT ? k : [ n, k ].join('.'))
    })
    return acc
  }, [])
}

function checkDependencies (fn, dependencies) {
  const fnString = fn.toString()
  if (/[(][^)]*[)]/.test(fnString)) {
    return (_.isFunction(fn) && !dependencies.length)
      ? _.trim(/[(]([^)]*)[)]/.exec(fnString)[ 1 ].split(','))
      : dependencies
  } else {
    return undefined
  }
}

function configure (config) {
  const containerNames = Object.keys(config || {})
  containerNames.forEach((containerName) => {
    let containerConfig = config[ containerName ]
    let keys = Object.keys(containerConfig)
    keys.forEach((key) => {
      let opt = containerConfig[ key ]
      let dependency
      let lifecycle
      if (_.isObject(opt)) {
        if (opt.scoped) {
          lifecycle = 'scoped'
          dependency = opt.scoped
        } else if (opt.static) {
          lifecycle = 'static'
          dependency = opt.static
        } else if (opt.factory) {
          lifecycle = 'factory'
          dependency = opt.factory
        }
      }
      if (!dependency) {
        dependency = opt
        lifecycle = _.isFunction(opt) ? 'factory' : 'static'
      }
      register(containerName, key, dependency, lifecycle)
    })
  })
}

function displayDependency (obj) {
  if (_.isFunction(obj)) {
    return obj.name || 'anonymous function'
  } else if (_.isString(obj) || _.isNumber(obj) || Array.isArray(obj) || _.isDate(obj)) {
    return obj
  } else if (_.isPlainObject(obj)) {
    return '[Object Literal]'
  } else {
    return obj.constructor.name || '[Object]'
  }
}

function findParent (mod) {
  if (parent) {
    return parent
  }
  if (mod.parent) {
    return findParent(mod.parent)
  } else {
    parent = mod
    return mod
  }
}

function get (containerName, key, scopeName = DEFAULT) {
  const missingKeys = state.getMissingDependencies(containerName, key, scopeName)
  if (missingKeys.length > 0) {
    throw new Error(`Fount could not resolve the following dependencies: ${missingKeys.join(', ')}`)
  }
  if (Array.isArray(key)) {
    return key.reduce((acc, k) => {
      acc[ k ] = state.resolve(containerName, k, scopeName)
      return acc
    }, {})
  } else {
    return state.resolve(containerName, key, scopeName)
  }
}

function getArguments (containerName, dependencies, fn, scopeName) {
  dependencies = checkDependencies(fn, dependencies)
  const missingKeys = state.getMissingDependencies(containerName, dependencies, scopeName)
  if (missingKeys.length > 0) {
    throw new Error(`Fount could not resolve the following dependencies: ${missingKeys.join(', ')}`)
  }

  return dependencies.map(function (key) {
    const parts = key.split(/[._]/)
    let ctrName = containerName
    if (parts.length > 1) {
      ctrName = util.getContainerName(containerName, parts)
      key = util.getKey(parts)
    }
    return get(ctrName, key, scopeName)
  })
}

function getLoadedModule (name) {
  const parentModule = findParent(module)
  const regex = new RegExp(name)
  const candidate = _.find(parentModule.children, function (child) {
    return regex.test(child.id) && _.contains(child.id.split('/'), name)
  })
  if (candidate) {
    candidate.exports.__npm = candidate.exports.__npm || true
    return candidate.exports
  } else {
    return undefined
  }
}

function getModuleFromInstalls (name) {
  const parentModule = findParent(module)
  const installPath = _.find(parentModule.paths, function (p) {
    const modPath = path.join(p, name)
    return fs.existsSync(modPath)
  })
  var mod
  if (installPath) {
    mod = require(path.join(installPath, name))
    mod.__npm = mod.__npm || true
  }
  return mod
}

function invoke (containerName, dependencies, fn, scopeName = DEFAULT) {
  if (_.isFunction(dependencies)) {
    scopeName = fn
    fn = dependencies
    dependencies = []
  }
  const args = getArguments(containerName, dependencies, fn, scopeName)
  if (args.length === 0) {
    return fn()
  } else {
    return fn.apply(null, args)
  }
}

function inject (containerName, dependencies, fn, scopeName = DEFAULT) {
  if (_.isFunction(dependencies)) {
    scopeName = fn
    fn = dependencies
    dependencies = []
  }
  const args = getArguments(containerName, dependencies, fn, scopeName)
  return _.applyWhen(fn, args)
}

function register () {
  let containerName = arguments[ 0 ]
  let key = arguments[ 1 ]
  const parts = key.split(/[._]/)
  if (parts.length > 1) {
    containerName = util.getContainerName(containerName, parts)
    key = util.getKey(parts)
  }
  const args2 = arguments[ 2 ]
  const args3 = arguments[ 3 ]
  const args4 = arguments[ 4 ]
  /* eslint-disable brace-style */
  // function passed for value, no dependency list
  if (_.isFunction(args2)) {
    registerFunction(containerName, key, args2, [], args3)
  }
  // function passed for value with preceding dependency list
  else if (_.isFunction(args3)) {
    registerFunction(containerName, key, args3, args2, args4)
  }
  // values were passed directly
  else {
    registerValues(containerName, key, args2, args3)
  }
  /* eslint-enable brace-style */
}

function registerValues (containerName, key, values, lifecycle = STATIC) {
  debug(`Registering key "${key}" for container "${containerName}" with "${lifecycle}: ${getDisplay(values)}`)
  const value = resolvers[ lifecycle ](containerName, key, values)
  state.register(containerName, key, value)
}

function registerFunction (containerName, key, fn, dependencies, lifecycle = STATIC) {
  dependencies = checkDependencies(fn, dependencies)
  debug(`Registering key "${key}" for container "${containerName}" with "${lifecycle}: ${getDisplay(dependencies)}`)
  const value = resolvers[ lifecycle ](containerName, key, fn, dependencies)
  state.register(containerName, key, value)
}

function registerModule (containerName, name) {
  const mod = getLoadedModule(name) || getModuleFromInstalls(name)
  if (mod) {
    const lifecycle = _.isFunction(mod) ? 'factory' : 'static'
    register(containerName, name, mod, lifecycle)
  } else {
    debug(`Fount could not find NPM module ${name}`)
  }
  return mod
}

function registerAsValue (containerName, key, val) {
  return register(containerName, key, function () { return val })
}

function resolve (containerName, key, scopeName) {
  const value = get(containerName, key, scopeName)
  if (Array.isArray(key)) {
    return whenKeys(value)
  } else {
    return _.isPromisey(value) ? value : Promise.resolve(value)
  }
}

function setModule (mod) {
  parent = mod
}

function whenKeys (hash) {
  const resolved = {}
  const keys = Object.keys(hash)
  const promises = keys.reduce((acc, key) => {
    const value = hash[ key ]
    resolved[ key ] = undefined
    if (!_.isPromisey(value)) {
      resolved[ key ] = value
    } else {
      acc.push(value.then(x => { resolved[ key ] = x }))
    }
    return acc
  }, [])

  return Promise.all(promises)
    .then(() => resolved)
}

const fount = function (containerName) {
  if (_.isObject(containerName)) {
    configure(containerName)
  } else {
    return {
      canResolve: state.canResolve.bind(state, containerName),
      get: get.bind(undefined, containerName),
      invoke: invoke.bind(undefined, containerName),
      inject: inject.bind(undefined, containerName),
      keys: () => Array.from(state.keys(containerName)),
      register: register.bind(undefined, containerName),
      registerModule: registerModule.bind(undefined, containerName),
      registerAsValue: registerAsValue.bind(undefined, containerName),
      resolve: resolve.bind(undefined, containerName),
      purge: state.purge.bind(state, containerName),
      purgeScope: state.purgeScope.bind(state, containerName),
      purgeScopes: state.purgeScope.bind(state, containerName)
    }
  }
}

fount.canResolve = state.canResolve.bind(state, DEFAULT)
fount.containers = () => Array.from(state.namespaces)
fount.get = get.bind(undefined, DEFAULT)
fount.invoke = invoke.bind(undefined, DEFAULT)
fount.inject = inject.bind(undefined, DEFAULT)
fount.allKeys = allKeys
fount.keys = () => Array.from(state.keys(DEFAULT))
fount.register = register.bind(undefined, DEFAULT)
fount.registerModule = registerModule.bind(undefined, DEFAULT)
fount.registerAsValue = registerAsValue.bind(undefined, DEFAULT)
fount.resolve = resolve.bind(undefined, DEFAULT)
fount.purge = state.purge.bind(state)
fount.purgeAll = state.purgeAll.bind(state)
fount.purgeScope = state.purgeScope.bind(state, DEFAULT)
fount.purgeScopes = state.purgeScope.bind(state, DEFAULT)
fount.setModule = setModule

fount.log = function () {
  console.log(state)
}

module.exports = fount
