# Fount
Fount provides synchronous and asynchronous dependency resolution.

[![Build Status][travis-image]][travis-url]
[![Coverage Status][coveralls-image]][coveralls-url]

## Getting started

`npm i fount`

```javascript
const fount = require('fount')
```

## A note about style and safety
Fount supports two styles of identifying dependency: string array (like AMD) and by argument names (like Angular).

Example:
```javascript
// argument name
fount.inject(( one, two, three ) => {
	// your code here
})

// string array
fount.inject([ 'one', 'two', 'three' ], (one, two, three) => {
	// your code here
})
```

The second approach is easiest to work with, but keep in mind that if using this in the browser, a minifier will change the argument names and break resolution.

The key with any approach is always test your code.

## Multiple Containers
Fount supports multiple containers. If you don't specify one when making calls, it will use the `default` container. Most examples in this doc use the default container implicitly.

You can use a named container in two ways:

 * pass the container name in parenthesis before making the call (all commands)
 * use period delimited namespaces in your key names (all commands except purge)

```javascript
fount('myContainer').resolve('myKey').then(( value ) => {
	// do something cool
})

// same as above, but terser
fount.resolve('myContainer.myKey').then(( value ) => {
	// do something cool
})
```

## Scope & Lifecycles
Chances are you won't need this - you'll register dependencies and resolve them and never think about lifecycle or scope. When you do need more control, fount allows you to supply lifecycle arguments during registration and an optional scope name during resolution that give you more granular control over resolution.

### Scope
A scope behaves like a second level of caching that gets written to/read from at resolution time (rather than at registration time). It can only affect the resolution of dependencies that are not determined at registration time (functions with a `scoped` or `factory` lifecycle) and `factory` lifecycles prevent fount from checking scope at during resolution. 

When resolving a dependency a scope of `default` is used if none is specified. You can purge a scope anytime with `purgeScope`:

```javascript
// purges scope `myScope` out of `default` container 
fount.purgeScope('myScope')

// purges all scopes in `default` container
fount.purgeScopes()

// purge scope from a specific container
fount('myContainer').purgeScope('scopeA')

// purge all scopes from a specific container
fount('myContainer').purgeScopes()
```

### Lifecycle ( static, scoped or factory )
A lifecycle tells fount how long the result of a function dependency is good for. Static is the the default and, when possible, fount will resolve and store the value for static depenencies at **registration** time.

 * static - once a value is returned, it will **always** be returned for future resolution
 * scoped - like static but resolved once per scope (specified by name)
 * factory - if the dependency is a function it will re-evaluated every time

It's worth reinforcing that `scoped` and `factory` dependencies, because they can change at resolution time, are not evaluated eagerly at registration.

## Registering
Registering is simple - provide a string name and then supply either a value, function or promise. See each section for more detail.

```javascript
// lifeCycle is optional and 'static' by default
fount.register( 'name', value | function | promise, [lifeCycle] );
```

### value
Once a value is registered, fount will always supply that value to any resolve call. It doesn't actually make sense to provide a lifecycle option with a value or promise since it has no effect, but fount doesn't freak out if you forget and do this by accident.

```javascript
fount.register('port', 8080)
```

### function
Registering a function with fount will cause it to invoke the function during resolution and return the result with two exceptions:

 1. The function is a stub or some other abstraction that cannot have dependencies resolved for it
 2. The function has dependencies which do not exist for fount

In these exceptional scenarios, fount will resolve the dependency with the function itself rather than calling it for you.

```javascript
fount.register('factory', () => { return 'a thing!' })
```

#### Registering functions with dependencies
If you want fount to inject dependencies into the function when calling it, you'll need to provide a string array of the dependencies in the order they should be supplied to the function:

```javascript
// AMD users should feel right at home with this style
fount.register('factory', [ 'a', 'b', 'c' ], (a, b, c) => {})

// Angular fans may enjoy this style
// dependencies are 'read' out of the argument list
fount.register('factory', (a, b, c) => {})
```

#### Registering functions as values
You may want to register a function as a value (confused yet?) so that fount returns the function as a dependency rather than executing it for you. If that's what you're looking for, try this:

```javascript
fount.register('calculator', () => {
	return function (x, y) { return x + y }
})
```

__OR__

```javascript
// this really is just wrapping the value in a function like above, but it's easier to read
// and hopefully less frustrating
fount.registerAsValue('calculator', (x, y) => x + y)
```

### promise
Registering a promise looks almost identical to registering a function. From a consuming perspective, they're functionally equivalent since fount will wrap raw function execution in a promise anyway.

```javascript
fount.register('todo', new Promise((reject, resolve) => resolve('done')))
```

### NPM modules
Fount will allow you to plug in an NPM module. If the module was previously loaded, it will grab it from the require cache, otherwise, it will attempt to load it from the modules folder:

> Note: this method will register modules that return a function as a factory which will be invoked anytime the module is resolved as a dependency

```javascript
fount.registerModule('when')
```

In the example above, where `when` is regsitered, fount will see that it is a function and register it as a factory. During resolve time, because fount cannot resolve the argument list for `when`'s function, it will simply provide the `when` function as the value.

```javascript
fount.inject((when) => when("this works as you'd expect"))
```

## Synchronous vs. Asynchronous
Fount provides two sets of of functions for working with dependencies; one for when the dependencies are known to contain one or more promises and one for when the dependency chain is promise-free.

Each set consists of two functions; one for retrieving one or more dependencies directly and one for injecting dependencies into a function and calling it.

> **WARNING**: Fount cannot guarantee a synchronous return or dependency chain. Using the synchronous methods for a dependency that contains a promise will result in unexpected results.

## Asynchronous Methods
These methods return a promise that resolves once the dependency can be satisfied.

### Resolving
Resolving is pretty simple - fount will always return a promise to any request for a dependency.

```javascript
fount.resolve('gimme').then((value) => { })

// get the value for scope 'custom'
fount.resolve('gimme', 'custom').then((value) => {  })

// resolve multiple dependencies at once!
fount.resolve([ 'one', 'two' ]).then((results) => {
	// results is a hash, not an array
})

// resolve multiple dependencies ACROSS containers
fount.resolve([ 'a.one', 'b.two' ]).then((results) => {
	// results is a hash, not an array
})
```

### Injecting
Injecting is how you get fount to apply resolved dependencies to a function. It can be used the same way as AMD's define, with the arguments specified as strings, or, with the argument names parsed from the call itself.

```javascript
// where 'a' and 'b' have been registered
fount.inject([ 'a', 'b' ], (a, b) => { } );

fount.inject((a, b) => { });

// within custom scope -- requires a and/or b to have been registered with 'scoped' lifecycle
fount.inject([ 'a', 'b' ], (a, b) => {}, 'myScope' );

fount.inject((a, b) => {}, 'myScope' );

// using keys across multiple containers
fount.inject([ 'one.a', 'two.b' ], (a, b) => {} );

// alternate support for multiple containers
fount.inject((one_a, two_b) => {} );
```

## Synchronous Methods
These methods return a value immediately and assume that the dependencies involved do not contain promises. Remember: if a promise is encountered, it will result in errors/nonsense.

### Getting
As the name implies, `get` simply returns the value of the key from the container. It does still work like resolve in terms of plugging in dependency chains, but it does not resolve promises between dependency levels.

```javascript
// returns the value of gimme immediately
let gimme = fount.get('gimme')

// the value for scope 'custom'
let scoped = fount.get('gimme', 'custom')

// resolve multiple dependencies at once!
let { one, two } = fount.get([ 'one', 'two' ])

// resolve multiple dependencies ACROSS containers
let hash = fount.get([ "a.one", "b.two" ])
```

### Invoking
Invoking is how you get fount to apply dependencies to a function without promise resolution. It can be used the same way as AMD's define, with the arguments specified as strings, or, with the argument names parsed from the call itself.

Again: any promises encountered will result in odd behavior - write tests :)
```javascript
// where 'a' and 'b' have been registered
fount.invoke([ 'a', 'b' ], (a, b) => {})

fount.invoke((a, b) => {})

// within custom scope -- requires a and/or b to have been registered with 'scoped' lifecycle
fount.invoke([ 'a', 'b' ], (a, b) => {}, 'myScope')

fount.invoke(( a, b ) => {}, 'myScope')

// using keys across multiple containers
fount.invoke([ 'one.a', 'two.b' ], (a, b) => {})

// alternate support for multiple containers
fount.invoke(( one_a, two_b ) => {} )
```

## Can Resolve
To check whether fount is able to resolve a dependency ahead of time, use `canResolve`:

```javascript
fount.canResolve( 'key1' )

fount.canResolve([ 'key1', 'key2' ])
```

## Configuration
Configuration of multiple containers, keys and values can be accomplished via a configuration hash passed to fount. The format of the hash is as follows:

```javascript
{
	[containerName]: {
		[keyName]: [value],
		[keyName]: {
			[scope]: [value]
		}
	}
}
```

__example__
```javascript
fount({
	default: {
		a: 1,
		b: function() {
			return 2
		}
	},
	other: {
		c: { scoped: 3 },
		d: { scoped: function() {
				return 4
			}
		},
		e: { static: 5 },
		f: { factory: function() {
				return 6
			} }
	}
})
```

## Key List
Fount will return an array of all keys registered:

```javascript
// top level includes all namespaces
fount.keys()

// limited by container
fount('myContainer').keys()
```

## Purge
Fount provides three different ways to clean up:
 * ejecting all keys and resolved scope values from all containers
 * ejecting all keys and resolved scope values from one container
 * removing all resolved scoped values from one container

> Note: purge doesn't support the `_` or `.` delimited syntax for containers. When purging non-default containers, select the container first like in the examples below:

```javascript
// this is like starting from scratch:
fount.purgeAll()

// remove all values for the default container's custom scope
// this does not remove the keys, just their resolved values
fount.purgeScope('custom')

// eject all keys from the default container
fount.purge()

// remove all values for the myContainer's custom scope
fount('myContainer').purgeScope('custom')

// eject all keys from myContainer
fount('myContainer').purge()
```

## Diagnostic
Right now this is pretty weak, but if you call `log`, Fount will dump the containers and scopes out so you can see what keys are present. Got ideas for more useful ways to troubleshoot? I'd love a PR :smile:!

## Tests & CI Mode

* `npm test` runs the tests once
* `npm run coverage` gets a coverage report
* `npm run continuous` runs mocha in watch mode
* `npm run release` will cut a new standard version, update the changelog and tag the last commit.

[travis-url]: https://travis-ci.org/arobson/fount
[travis-image]: https://travis-ci.org/arobson/fount.svg?branch=master
[coveralls-url]: https://coveralls.io/github/arobson/fount?branch=master
[coveralls-image]: https://coveralls.io/repos/github/arobson/fount/badge.svg?branch=master
