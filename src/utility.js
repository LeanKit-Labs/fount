/**
 * Object Comparison Approach Copied & Adapted from Lodash
 * Lodash <https://lodash.com/>
 * Copyright JS Foundation and other contributors <https://js.foundation/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */
/** `Object#toString` result references. */
const ASYNC_TAG = '[object AsyncFunction]'
const BOOL_TAG = '[object Boolean]'
const DATE_TAG = '[object Date]'
const FUNC_TAG = '[object Function]'
const GEN_TAG = '[object GeneratorFunction]'
const NUMBER_TAG = '[object Number]'
const PROMISE_TAG = '[object Promise]'
const PROXY_TAG = '[object Proxy]'
const REGEX_TAG = '[object RegExp]'
const STRING_TAG = '[object String]'
const NOT_AN_OBJECT = ''

async function applyWhen (fn, args) {
  if (!args || args.length === 0) {
    return fn()
  } else {
    const values = await Promise.all(
      args.map(arg => isPromisey(arg) ? arg : arg)
    )
    return fn.apply(null, values)
  }
}

function clone (source, target) {
  var tag = getObjectTag(source)
  if (source == null || typeof source !== 'object') {
    return source
  } else if (!isObject(source) && !Array.isArray(source)) {
    return source
  } else if (tag === BOOL_TAG || tag === STRING_TAG || tag === NUMBER_TAG ||
            tag === FUNC_TAG || tag === DATE_TAG || tag === REGEX_TAG ||
            tag === GEN_TAG || tag === ASYNC_TAG || tag === PROXY_TAG ||
            tag === PROMISE_TAG) {
    return new source.constructor(source)
  }

  target = target || new source.constructor()
  for (var key in source) {
    target[ key ] = typeof target[ key ] === 'undefined' ? clone(source[ key ], null) : target[ key ]
  }
  return target
}

function contains (list, value) {
  return list.indexOf(value) >= 0
}

function filter (list) {
  return list.reduce((acc, value) => {
    if (value) { acc.push(value) }
    return acc
  }, [])
}

function find (list, predicate) {
  if (list.length === 0) {
    return undefined
  }
  var found = false
  var index = -1
  var item
  do {
    item = list[ ++index ]
    found = predicate(item)
  } while (!found && index < list.length - 1)
  return found ? item : undefined
}

function getContainerName (name, parts) {
  const lead = parts.slice(0, -1)
  if (name === 'default') {
    return lead.join('.')
  } else {
    return ([ name ].concat(lead)).join('.')
  }
}

function getKey (parts) {
  return parts.slice(-1)[ 0 ]
}

function getObjectTag (value) {
  if (!isObject(value)) {
    return NOT_AN_OBJECT
  }
  return Object.prototype.toString.call(value)
}

function isDate (value) {
  return getObjectTag(value) === DATE_TAG
}

function isFunction (value) {
  const tag = getObjectTag(value)
  return tag === FUNC_TAG || tag === GEN_TAG || tag === ASYNC_TAG || tag === PROXY_TAG
}

function isNumber (value) {
  return typeof value === 'number' ||
    (getObjectTag(value) === NUMBER_TAG)
}

function isObject (value) {
  const type = typeof value
  return value != null && (type === 'object' || type === 'function')
}

function isPlainObject (value) {
  return (isObject(value) && value.prototype == null)
}

function isPromisey (x) {
  return x && x.then && typeof x.then === 'function'
}

function isStub (value) {
  return (value && value.toString() === 'stub' && value.name === 'proxy')
}

function isString (value) {
  return typeof value === 'string' ||
    (!Array.isArray(value) && getObjectTag(value) === STRING_TAG)
}

function trimString (str) {
  return str.trim()
}

function trim (list) {
  return (list && list.length) ? filter(list.map(trimString)) : []
}

function type (obj) {
  return Object.prototype.toString.call(obj)
}

module.exports = {
  applyWhen: applyWhen,
  contains: contains,
  clone: clone,
  find: find,
  filter: filter,
  getContainerName: getContainerName,
  getKey: getKey,
  getObjectTag: getObjectTag,
  isDate: isDate,
  isFunction: isFunction,
  isNumber: isNumber,
  isObject: isObject,
  isPlainObject: isPlainObject,
  isPromisey: isPromisey,
  isStub: isStub,
  isString: isString,
  trim: trim,
  trimString: trimString,
  type: type
}
