var _ = require( 'lodash' );
var when = require( 'when' );
var whenFn = require( 'when/function' );
var whenKeys = require( 'when/keys' );
var debug = require( 'debug' )( 'fount' );
var util = require( 'util' );
var path = require( 'path' );
var fs = require( 'fs' );
var containers = {};
var parent;
var getDisplay = process.env.DEBUG ? displayDependency : _.noop;

function backfillMissingDependency( name, containerName ) {
	var mod = getLoadedModule( name ) || ( containerName === "default" ? getModuleFromInstalls( name ) : null );
	if ( mod ) {
		var lifecycle = _.isFunction( mod ) ? 'factory' : 'static';
		register( containerName, name, mod, lifecycle );
	} else {
		debug( 'Could not backfill dependency %s in in container %s', name, containerName );
	}
	return mod;
}

function canResolve( containerName, dependencies, scopeName ) {
	return getMissingDependencies( containerName, dependencies, scopeName ).length === 0;
}

function checkDependencies( fn, dependencies ) {
	var fnString = fn.toString();
	if ( /[(][^)]*[)]/.test( fnString ) ) {
		return ( _.isFunction( fn ) && !dependencies.length ) ?
			trim( /[(]([^)]*)[)]/.exec( fnString )[ 1 ].split( ',' ) ) :
			dependencies;
	} else {
		return undefined;
	}
}

function configure( config ) {
	_.each( config, function( val, containerName ) {
		_.each( val, function( opt, key ) {
			var dependency = opt;
			var lifecycle;
			if ( _.isObject( opt ) ) {
				if ( opt.scoped ) {
					lifecycle = 'scoped';
					dependency = opt.scoped;
				} else if ( opt.static ) {
					lifecycle = 'static';
					dependency = opt.static;
				} else if ( opt.factory ) {
					lifecycle = 'factory';
					dependency = opt.factory;
				} else {
					dependency = undefined;
				}
			}
			if ( !dependency ) {
				dependency = opt;
				lifecycle = _.isFunction( opt ) ? 'factory' : 'static';
			}
			register( containerName, key, dependency, lifecycle );
		} );
	} );
}

function container( name ) {
	return ( containers[ name ] = containers[ name ] || { scopes: {} } );
}

function displayDependency( obj ) {
	if ( _.isFunction( obj ) ) {
		return obj.name || 'anonymous function';
	} else if ( _.isString( obj ) || _.isNumber( obj ) || _.isArray( obj ) || _.isDate( obj ) ) {
		return obj;
	} else if ( _.isPlainObject( obj ) ) {
		return '[Object Literal]';
	} else {
		return obj.constructor.name || '[Object]';
	}
}

function findParent( mod ) {
	if ( parent ) {
		return parent;
	}
	if ( mod.parent ) {
		return findParent( mod.parent );
	} else {
		parent = mod;
		return mod;
	}
}

function getLoadedModule( name ) {
	var parent = findParent( module );
	var regex = new RegExp( name );
	var candidate = _.find( parent.children, function( child ) {
		return regex.test( child.id ) && _.contains( child.id.split( '/' ), name );
	} );
	if ( candidate ) {
		candidate.exports.__npm = candidate.exports.__npm || true;
		return candidate.exports;
	} else {
		return undefined;
	}
}

function getModuleFromInstalls( name ) {
	var parent = findParent( module );
	var installPath = _.find( parent.paths, function( p ) {
		var modPath = path.join( p, name );
		return fs.existsSync( modPath );
	} );
	var mod;
	if ( installPath ) {
		mod = require( path.join( installPath, name ) );
		mod.__npm = mod.__npm || true;
	}
	return mod;
}

function getArgs( obj ) {
	return Array.prototype.slice.call( obj );
}

function getMissingDependencies( containerName, dependencies, scopeName ) {
	scopeName = scopeName || 'default';
	containerName = containerName || 'default';
	dependencies = _.isArray( dependencies ) ? dependencies : [ dependencies ];
	return _.reduce( dependencies, function( acc, key ) {
		if ( _.isArray( key ) ) {
			var ctr = container( containerName );
			key.forEach( function( k ) {
				var originalKey = k;
				var ctrName = containerName;
				var parts = k.split( /[._]/ );
				if ( parts.length > 1 ) {
					ctr = container( parts[ 0 ] );
					ctrName = parts[ 0 ];
					k = parts[ 1 ];
				}
				if ( !ctr[ k ] && !backfillMissingDependency( key, ctrName ) ) {
					acc.push( originalKey );
				}
			} );
		} else {
			var originalKey = key;
			var parts = key.split( /[._]/ );
			if ( parts.length > 1 ) {
				containerName = parts[ 0 ];
				key = parts[ 1 ];
			}
			if ( !container( containerName )[ key ] && !backfillMissingDependency( key, containerName ) ) {
				acc.push( originalKey );
			}
		}
		return acc;
	}, [] );
}

function inject( containerName, dependencies, fn, scopeName ) {
	scopeName = scopeName || 'default';
	if ( _.isFunction( dependencies ) ) {
		scopeName = fn;
		fn = dependencies;
		dependencies = [];
	}
	dependencies = checkDependencies( fn, dependencies );

	var missingKeys = getMissingDependencies( containerName, dependencies, scopeName );
	if ( missingKeys.length > 0 ) {
		throw new Error( util.format( 'Fount could not resolve the following dependencies: %s', missingKeys.join( ', ' ) ) );
	}

	var args = dependencies.map( function( key ) {
		var parts = key.split( /[._]/ );
		if ( parts.length > 1 ) {
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
	var parts = key.split( /[._]/ );
	var dependencies = _.isArray( args[ 2 ] ) ? args[ 2 ] : [];
	var fn = dependencies.length ? args[ 3 ] : args[ 2 ];
	var lifecycle = ( dependencies.length ? args[ 4 ] : args[ 3 ] ) || 'static';

	if ( parts.length > 1 ) {
		containerName = parts[ 0 ];
		key = parts[ 1 ];
	}

	if ( _.isFunction( fn ) ) {
		dependencies = checkDependencies( fn, dependencies );
	} else {
		fn = fn || dependencies;
	}
	debug( 'Registering key "%s" for container "%s" with %s lifecycle: %s',
		key, containerName, lifecycle, getDisplay( fn ) );
	var promise = wrappers[ lifecycle ]( containerName, key, fn, dependencies );
	container( containerName )[ key ] = promise;
}

function resolve( containerName, key, scopeName ) {
	scopeName = scopeName || 'default';
	var missingKeys = getMissingDependencies( containerName, key, scopeName );
	if ( missingKeys.length > 0 ) {
		throw new Error( util.format( 'Fount could not resolve the following dependencies: %s', missingKeys.join( ', ' ) ) );
	}
	if ( _.isArray( key ) ) {
		var hash = {};
		var ctr = container( containerName );
		key.forEach( function( k ) {
			var originalKey = k;
			var effectiveContainer = ctr;
			var parts = k.split( /[._]/ );
			if ( parts.length > 1 ) {
				effectiveContainer = container( parts[ 0 ] );
				k = parts[ 1 ];
			}
			hash[ originalKey ] = effectiveContainer[ k ]( scopeName );
		} );
		return whenKeys.all( hash );
	} else {
		var parts = key.split( /[._]/ );
		if ( parts.length > 1 ) {
			containerName = parts[ 0 ];
			key = parts[ 1 ];
		}
		return container( containerName )[ key ]( scopeName );
	}
}

function scope( containerName, name ) {
	var ctr = container( containerName );
	return ( ctr.scopes[ name ] = ctr.scopes[ name ] || {} );
}

function setModule( mod ) {
	parent = mod;
}

function trimString( str ) {
	return str.trim();
}
function trim( list ) {
	return ( list && list.length ) ? _.filter( list.map( trimString ) ) : [];
}

function type( obj ) {
	return Object.prototype.toString.call( obj );
}

var wrappers = {
	factory: function( containerName, key, value, dependencies ) {
		return function( scopeName ) {
			if ( _.isFunction( value ) ) {
				var dependencyContainer = containerName;
				if ( value.__npm ) {
					dependencyContainer = key;
				}
				if ( dependencies && canResolve( dependencyContainer, dependencies, scopeName ) ) {
					var args = dependencies.map( function( key ) {
						return resolve( dependencyContainer, key, scopeName );
					} );
					return whenFn.apply( value, args );
				}
			}
			return when.promise( function( resolve ) {
				resolve( value );
			} );
		};
	},
	scoped: function( containerName, key, value, dependencies ) {
		return function( scopeName ) {
			var cache = scope( containerName, scopeName );
			var store = function( resolvedTo ) {
				cache[ key ] = _.cloneDeep( resolvedTo );
				return resolvedTo;
			};
			if ( cache[ key ] ) {
				return when.resolve( cache[ key ] );
			} else if ( _.isFunction( value ) ) {
				if( dependencies && canResolve( containerName, dependencies, scopeName ) ) {
					var args = dependencies.map( function( key ) {
						return resolve( containerName, key, scopeName );
					} );
					return whenFn.apply( value, args ).then( store );
				} else {
					var resolvedValue;
					return function() {
						if( resolvedValue ) {
							return when( resolvedValue );
						} else {
							return when.promise( function( res ) {
								if( dependencies && canResolve( containerName, dependencies ) ) {
									var args = dependencies.map( function( key ) {
										return resolve( containerName, key, scopeName );
									} );
									res( whenFn.apply( value, args ).then( store ) );
								} else {
									res( value );
								}
							} );
						}
					};
				}
			} else {
				return when.promise( function( resolve ) {
					if ( when.isPromiseLike( value ) ) {
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
		if ( _.isFunction( value ) ) {
			if( dependencies && canResolve( containerName, dependencies ) ) {
				var args = dependencies.map( function( key ) {
					return resolve( containerName, key );
				} );
				promise = whenFn.apply( value, args );
			} else {
				var resolvedValue;
				return function() {
					if( resolvedValue ) {
						return when( resolvedValue );
					} else {
						return when.promise( function( res ) {
							if( dependencies && canResolve( containerName, dependencies ) ) {
								var args = dependencies.map( function( key ) {
									return resolve( containerName, key );
								} );
								whenFn.apply( value, args )
									.then( function( x ) {
										resolvedValue = x;
										res( x );
									} );
							} else {
								res( value );
							}
						} );
					}
				};
			}
		} else {
			promise = ( value && value.then ) ? value : when( value );
		}
		return function() {
			return promise;
		};
	}
};

var fount = function( containerName ) {
	if ( _.isObject( containerName ) ) {
		configure( containerName );
	} else {
		return {
			canResolve: canResolve.bind( undefined, containerName ),
			inject: inject.bind( undefined, containerName ),
			register: register.bind( undefined, containerName ),
			resolve: resolve.bind( undefined, containerName ),
			purge: purgeScope.bind( undefined, containerName ),
			purgeScope: purgeScope.bind( undefined, containerName )
		};
	}
};

fount.canResolve = canResolve.bind( undefined, 'default' );
fount.inject = inject.bind( undefined, 'default' );
fount.register = register.bind( undefined, 'default' );
fount.resolve = resolve.bind( undefined, 'default' );
fount.purge = purge.bind( undefined );
fount.purgeAll = purgeAll;
fount.purgeScope = purgeScope.bind( undefined, 'default' );
fount.setModule = setModule;

fount.log = function() {
	console.log( containers );
};

module.exports = fount;
