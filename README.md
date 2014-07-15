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

The second approach is easier to read when starting out, but consider how fragile the second approach is. If someone were to come along and refactor your generic arguments to be more expressive and not change the keys the dependencies were registered against, it would straight-up ruin your day.

You get to choose which approach you'd like to take, but just keep in mind there's more risk to the second.

## Multiple Containers
Fount supports multiple containers. If you don't specify one when making calls, it will use the 'default' container. All the examples in this doc use implicit default container.

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
Chances are you won't need to worry about this - you'll register dependencies and resolve them and never think about lifecycles or scopes. In the event you do need more control, fount allows you to supply lifecycle arguments during registration and an optional scope name during resolution that change how fount normally behaves.

### Scopes
A scope is just a simple name that can affect how a function dependency is resolved if it was specified with a scope lifecycle. If no scope argument is provided, a scope value of 'default' will be used when resolving dependencies with a 'scoped' lifecycle.

Think of a scope in Fount like a second level of caching (because that's exactly what it is). You can purge a scope anytime with `purgeScope`:

```javascript
fount.purgeScope( 'myScope' );
```

### Lifecycles - static, scoped or factory
A lifecycle tells fount how long the result of a function dependency is good for. Static is the the default.

 * static - once a value is returned from a function, always use that value
 * scoped - like static but resolved once per scope (specified by a scope name)
 * factory - if the dependency is a function it will be called every time

## Registering 
Registering is simple - provide a string name and then supply either a value, function or promise. See each section for more detail.

```javascript
fount.register( 'name', value | function | promise, [lifeCycle] );
```

### value
Once a value is registered, fount will always supply that value to any resolve call. It doesn't actually make sense to provide a lifecycle option with a value or promise since it has no effect.

```javascript
fount.register( 'port', 8080 );
```

### function
Registering a function with fount will cause it to invoke the function during resolution and return the result.

```javascript
fount.register( 'factory', function() { return 'a thing!' } );
```

#### Registering functions with dependencies
If you want fount to inject dependencies into the function when calling it, you'll need to provide a string array of the dependencies in the order they should be supplied to the function:

```javascript
fount.register( 'factory', [ 'a', 'b', 'c' ], function( a, b, c ) {} );
```

#### Registering functions as values
You may want to register a function as a value (confused yet?) so that fount returns the function as a dependency rather than executing it for you. If that's what you're looking for, try this:

```javascript
fount.register( 'calculator', function() { function( x, y ) { return x + y; } } );
```

### promise
Registering a promise looks almost identical to registering a function. From a consuming perspective, they're functionally equivalent since fount will wrap raw function execution in a promise anyway.

```javascript
fount.register( 'todo', when.promise( function( reject, resolve ) {
	resolve( 'done' );
} ) );
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

## Injecting
Injecting is how you get fount to invoke a function on your behalf with resolved dependencies. If you're familiar with AMD, it's somewhat similar to how define works.

```javascript
// where 'a' and 'b' have been registered
fount.inject( [ 'a', 'b' ], function( a, b)  { ... } );

// with custom scope
fount.inject( [ 'a', 'b' ], function( a, b)  { ... }, 'myScope' );
```

## Diagnostic
Right now this is pretty weak, but if you call `log`, Fount will dump the containers and scopes out so you can see what keys are present. Got ideas for more useful ways to troubleshoot? I'd love a PR :smile:!


## Things to do soon
 * Good error handling - returning clear error messages when a resolution/injection fails