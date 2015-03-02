var _ = require( 'lodash' );
var when = require( 'when' );
var whenFn = require( 'when/function' );
var whenKeys = require( 'when/keys' );
var debug = require( 'debug' )( 'fount' );

var containers = {};

function checkDependencies( fn, dependencies ) {
	var fnString = fn.toString();
	if( /[(][^)]*[)]/.test( fnString ) ) {
		return ( _.isFunction( fn ) && !dependencies.length ) ?
			trim( /[(]([^)]*)[)]/.exec( fnString )[ 1 ].split( ',' ) ) :
			dependencies;
	} else {
		return undefined;
	}
}

function container( name ) {
	return ( containers[ name ] = containers[ name ] || { scopes: {} } );
}

function getArgs( obj ) {
	return Array.prototype.slice.call( obj );
}

function inject( containerName, dependencies, fn, scopeName ) {
	scopeName = scopeName || 'default';
	if( _.isFunction( dependencies ) ) {
		scopeName = fn;
		fn = dependencies;
		dependencies = [];
	}
	dependencies = checkDependencies( fn, dependencies );
	var args = dependencies.map( function( key ) {
		var parts = key.split( '.' );
		if( parts.length > 1 ) {
			containerName = parts[ 0 ];
			key = parts[ 1 ];
		}
		return resolve( containerName, key, scopeName );
	} );
	return whenFn.apply( fn, args );
}

function purge( containerName ) {
	debug( 'purging container %s', containerName );
	containers[ containerName ] = { scopes: {} };
}

function purgeAll() {
	debug( 'purging all containers' );
	containers = { scopes: {} };
}

function purgeScope( containerName, scopeName ) {
	debug( 'purging container %s, scope %s', containerName, scopeName );
	delete container( containerName ).scopes[ scopeName ];
}

function register() {
	var args = getArgs( arguments );
	var containerName = args[ 0 ];
	var key = args[ 1 ];
	var parts = key.split( '.' );
	var dependencies = _.isArray( args[ 2 ] ) ? args[ 2 ] : [];
	var fn = dependencies.length ? args[ 3 ] : args[ 2 ];
	var lifecycle = ( dependencies.length ? args[ 4 ] : args[ 3 ] ) || 'static';

	if( parts.length > 1 ) {
		containerName = parts[ 0 ];
		key = parts[ 1 ];
	}

	if( _.isFunction( fn ) ) {
		dependencies = checkDependencies( fn, dependencies );
	} else {
		fn = fn || dependencies;
	}
	debug( 'Registering key "%s" for container "%s" with %s lifecycle: %s', key, containerName, lifecycle, dependencies, fn );
	var promise = wrappers[ lifecycle ]( containerName, key, fn, dependencies );
	container( containerName )[ key ] = promise;
}

function canResolve( containerName, dependencies, scopeName ) {
	scopeName = scopeName || 'default';
	return _.all( dependencies, function( key ) {
		if( _.isArray( key ) ) {
			var ctr = container( containerName );
			var vals = [];
			key.forEach( function( k ) {
				var originalKey = k;
				var parts = k.split( '.' );
				if( parts.length > 1 ) {
					ctr = container( parts[ 0 ] );
					k = parts[ 1 ];
				}
				vals.push( ctr[ k ] );
			} );
			return _.all( vals );
		} else {
			var parts = key.split( '.' );
			if( parts.length > 1 ) {
				containerName = parts[ 0 ];
				key = parts[ 1 ];
			}
			return container( containerName )[ key ];
		}
	} );
}

function resolve( containerName, key, scopeName ) {
	scopeName = scopeName || 'default';
	if( _.isArray( key ) ) {
		var ctr = container( containerName );
		var hash = {};
		key.forEach( function( k ) {
			var originalKey = k;
			var parts = k.split( '.' );
			if( parts.length > 1 ) {
				ctr = container( parts[ 0 ] );
				k = parts[ 1 ];
			}
			hash[ originalKey ] = ctr[ k ]( scopeName );
		} );
		return whenKeys.all( hash );
	} else {
		var parts = key.split( '.' );
		if( parts.length > 1 ) {
			containerName = parts[ 0 ];
			key = parts[ 1 ];
		}
		return container( containerName )[ key ]( scopeName );
	}
}

function trimString( str ) {
	return str.trim();
}
function trim( list ) {
	return ( list && list.length ) ? _.filter( list.map( trimString ) ) : [];
}

function scope( containerName, name ) {
	var ctr = container( containerName );
	return ( ctr.scopes[ name ] = ctr.scopes[ name ] || {} );
}

var wrappers = {
	factory: function( containerName, key, value, dependencies ) {
		return function( scopeName ) {
			if( _.isFunction( value ) && dependencies && canResolve( containerName, dependencies, scopeName ) ) {
				var args = dependencies.map( function( key ) {
					return resolve( containerName, key, scopeName );
				} );
				return whenFn.apply( value, args );
			} else {
				return when.promise( function( resolve ) {
					resolve( value );
				} );
			}
		};
	},
	scoped: function( containerName, key, value, dependencies ) {
		return function( scopeName ) {
			var cache = scope( containerName, scopeName );
			var store = function( resolvedTo ) {
				cache[ key ] = _.cloneDeep( resolvedTo );
				return resolvedTo;
			};
			if( cache[ key ] ) {
				return when( cache[ key ] );
			} else if( _.isFunction( value ) && dependencies && canResolve( containerName, dependencies, scopeName ) ) {
				var args = dependencies.map( function( key ) {
					return resolve( containerName, key, scopeName );
				} );
				return whenFn.apply( value, args ).then( store );
			} else {
				return when.promise( function( resolve ) {
					if( when.isPromiseLike( value ) ) {
						value.then( store );
					} else {
						store( value );
					}
					resolve( value );
				} );
			}
		};
	},
	static: function( containerName, key, value, dependencies ) {
		var promise;
		if( _.isFunction( value ) && dependencies && canResolve( containerName, dependencies ) ) {
			var args = dependencies.map( function( key ) {
				return resolve( containerName, key );
			} );
			promise = whenFn.apply( value, args );
		} else {
			promise = ( value && value.then ) ? value : when( value );
		}
		return function() {
			return promise;
		};
	}
};

var fount = function( containerName ) {
	return {
		inject: inject.bind( undefined, containerName ),
		register: register.bind( undefined, containerName ),
		resolve: resolve.bind( undefined, containerName ),
		purge: purgeScope.bind( undefined, containerName ),
		purgeScope: purgeScope.bind( undefined, containerName )
	};
};

fount.inject = inject.bind( undefined, 'default' );
fount.register = register.bind( undefined, 'default' );
fount.resolve = resolve.bind( undefined, 'default' );
fount.purge = purge.bind( undefined );
fount.purgeAll = purgeAll;
fount.purgeScope = purgeScope.bind( undefined, 'default' );
fount.log = function() {
	console.log( containers );
};

module.exports = fount;
