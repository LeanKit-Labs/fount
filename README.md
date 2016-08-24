# Fount
Fount is a promise based DI container for Node.js.

## Getting started

`npm install fount -S`

```javascript
var fount = require( 'fount' );
```

## A note about style and safety
Fount supports two styles of identifying dependency: string array (like AMD) and by argument names (like Angular).

Example:
```javascript
// string array
fount.inject( [ 'one', 'two', 'three' ], function( one, two, three ) {
	// your code here
} );

// argument name
fount.inject( function( one, two, three ) {
	// your code here
} );

```

The second approach is easier to read when starting out, but consider how fragile it is. If someone were to come along and refactor your generic arguments to be more expressive and not change the keys the dependencies were registered against, it would break a lot of code.

You get to choose the style you prefer, just keep in mind there's more risk with argument name only.

## Multiple Containers
Fount supports multiple containers. If you don't specify one when making calls, it will use the 'default' container. Most examples in this doc use the default container implicitly.

You can use a named container in two ways:
 * pass the container name in parenthesis before making the call (all commands)
 * use period delimited namespaces in your key names (all commands except purge)

```javascript
fount( 'myContainer' ).resolve( 'myKey' ).then( function( value ) {
	// do something cool
} );

// same as above, but terser
fount.resolve( 'myContainer.myKey' ).then( function( value ) {
	// do something cool
} );
```

## Scope & Lifecycles
Chances are you won't need this - you'll register dependencies and resolve them and never think about lifecycle or scope. When you do need more control, fount allows you to supply lifecycle arguments during registration and an optional scope name during resolution that give you more granular control over resolution.

### Scope
A scope is just a simple name that can affect how a function dependency is resolved if it was specified with a `scoped` lifecycle. When resolving a dependency with a `scoped` lifecycle, a `default` will be used when resolving dependencies. (see the Registering section for examples)

Think of a scope in Fount like a second level of caching (because that's exactly what it is). You can purge a scope anytime with `purgeScope`:

```javascript
fount.purgeScope( 'myScope' );
```

### Lifecycle ( static, scoped or factory )
A lifecycle tells fount how long the result of a function dependency is good for. Static is the the default.

 * static - once a value is returned, it will **always** be returned for future resolution
 * scoped - like static but resolved once per scope (specified by name)
 * factory - if the dependency is a function it will re-evaluated every time

## Registering
Registering is simple - provide a string name and then supply either a value, function or promise. See each section for more detail.

```javascript
// lifeCycle is optional and 'static' by default
fount.register( 'name', value | function | promise, [lifeCycle] );
```

### value
Once a value is registered, fount will always supply that value to any resolve call. It doesn't actually make sense to provide a lifecycle option with a value or promise since it has no effect, but fount doesn't freak out if you forget and do this by accident.

```javascript
fount.register( 'port', 8080 );
```

### function
Registering a function with fount will cause it to invoke the function during resolution and return the result with two exceptions:

 1. The function is a stub or some other abstraction that cannot have dependencies resolved for it
 2. The function has dependencies which do not exist for fount

In these exceptional scenarios, fount will resolve the dependency with the function itself rather than calling it for you.

```javascript
fount.register( 'factory', function() { return 'a thing!' } );
```

#### Registering functions with dependencies
If you want fount to inject dependencies into the function when calling it, you'll need to provide a string array of the dependencies in the order they should be supplied to the function:

```javascript
// AMD users should feel right at home with this style
fount.register( 'factory', [ 'a', 'b', 'c' ], function( a, b, c ) {} );

// Angular fans and dare-devils may enjoy this style
// dependencies are 'read' out of the argument list
fount.register( 'factory', function( a, b, c ) {} );
```

#### Registering functions as values
You may want to register a function as a value (confused yet?) so that fount returns the function as a dependency rather than executing it for you. If that's what you're looking for, try this:

```javascript
fount.register( 'calculator', function() { return function( x, y ) { return x + y; }; } );
```

__OR__

```javascript
// this really is just wrapping the value in a function like above, but it's easier to read
// and hopefully less frustrating
fount.registerAsValue( 'calculator', function( x, y ) { return x + y; } );
```

### promise
Registering a promise looks almost identical to registering a function. From a consuming perspective, they're functionally equivalent since fount will wrap raw function execution in a promise anyway.

```javascript
fount.register( 'todo', when.promise( function( reject, resolve ) {
	resolve( 'done' );
} ) );
```

### NPM modules
Fount will allow you to plug in an NPM module. If the module was previously loaded, it will grab it from the require cache, otherwise, it will attempt to load it from the modules folder:

> Note: this method will register modules that return a function as a factory which will be invoked anytime the module is resolved as a dependency

```javascript
fount.registerModule( "when" );
```

In the example above, where `when` is regsitered, fount will see that it is a function and register it as a factory. During resolve time, because fount cannot resolve the argument list for `when`'s function, it will simply provide the `when` function as the value.

```javascript
fount.inject( function( when ) {
	return when( "this works as you'd expect" );
} );
```

## Resolving
Resolving is pretty simple - fount will always return a promise to any request for a dependency.

```javascript
fount.resolve( 'gimme' ).then( function( value ) { // do something } );

fount.resolve( 'gimme', 'custom' ).then( function( value ) { // value for scope 'custom' } );

// resolve multiple dependencies at once!
fount.resolve( [ 'one', 'two' ] ).then( function( results ) {
	// results is a hash, not an array
} );

// resolve multiple dependencies ACROSS containers
fount.resolve( [ 'a.one', 'b.two' ] ).then( function( results ) {
	// results is a hash, not an array
} );
```

You can also check in advance whether or not fount is able to resolve a dependency using `canResolve`:

```javascript
fount.canResolve( 'key1' );

fount.canResolve( [ 'key1', 'key2' ] );
```

## Injecting
Injecting is how you get fount to invoke a function on your behalf with resolved dependencies. If you're familiar with AMD, it's somewhat similar to how define works.

```javascript
// where 'a' and 'b' have been registered
fount.inject( [ 'a', 'b' ], function( a, b )  { ... } );

// within custom scope -- requires a and/or b to have been registered with 'scoped' lifecycle
fount.inject( [ 'a', 'b' ], function( a, b )  { ... }, 'myScope' );

// using keys across multiple containers
fount.inject( [ 'one.a', 'two.b' ], function( a, b ) { ... } );

// alternate support for multiple containers
fount.inject( function( one_a, two_b ) { ... } );
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
fount( {
	default: {
		a: 1,
		b: function() {
			return 2;
		}
	},
	other: {
		c: { scoped: 3 },
		d: { scoped: function() {
				return 4;
			}
		},
		e: { static: 5 },
		f: { factory: function() {
				return 6;
			} }
	}
} );
```

## Purge
Fount provides three different ways to clean up:
 * ejecting all keys and resolved scope values from all containers
 * ejecting all keys and resolved scope values from one container
 * removing all resolved scoped values from one container

> Note: purge doesn't support the `_` or `.` delimited syntax for containers. When purging non-default containers, select the container first like in the examples below:

```javascript
// this is like starting from scratch:
fount.purgeAll();

// remove all values for the default container's custom scope
// this does not remove the keys, just their resolved values
fount.purgeScope( "custom" );

// eject all keys from the default container
fount.purge();

// remove all values for the myContainer's custom scope
fount( "myContainer" ).purgeScope( "custom" );

// eject all keys from myContainer
fount( "myContainer" ).purge();
```

## Diagnostic
Right now this is pretty weak, but if you call `log`, Fount will dump the containers and scopes out so you can see what keys are present. Got ideas for more useful ways to troubleshoot? I'd love a PR :smile:!

## Tests & CI Mode

* Running `gulp` starts both the `test` and `watch` tasks, so you'll see the tests re-run any time you save a file under `src/` or `spec/`.
* Running `gulp coverage` will run istanbul and create a `coverage/` folder.
* Running `gulp show-coverage` will run istanbul and open the browser-based coverage report.
