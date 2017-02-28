const _ = require( 'lodash' );
const debug = require( 'debug' )( 'fount' );
const util = require( 'util' );
const path = require( 'path' );
const fs = require( 'fs' );
const getDisplay = process.env.DEBUG ? displayDependency : _.noop;

let containers = {};
var parent;

function applyWhen( fn, args ) {
	if( !args || args.length == 0 ) {
		return Promise.resolve( fn() );
	} else {
		let promises = args.map( ( arg ) => {
			return isPromisey( arg ) ? arg : Promise.resolve( arg );
		} );
		return Promise.all( promises )
			.then( ( resolved ) => {
				return fn.apply( null, resolved );
			} );
	}
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
	return ( containers[ name ] = containers[ name ] || { scopes: {}, keyList: [] } );
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

function getContainerName( name, parts ) {
	var lead = parts.slice( 0, -1 );
	if( name === "default" ) {
		return lead.join( '.' );
	} else {
		return ( [ name ].concat( lead ) ).join( '.' );
	}
}

function getKey( parts ) {
	return parts.slice( -1 )[ 0 ];
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
			key.forEach( function( k ) {
				pushMissingKey( containerName, k, acc );
			} );
		} else {
			pushMissingKey( containerName, key, acc );
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
		var ctrName = containerName;
		if ( parts.length > 1 ) {
			ctrName = getContainerName( containerName, parts );
			key = getKey( parts );
		}
		return resolve( ctrName, key, scopeName );
	} );
	return applyWhen( fn, args );
}

function isPromisey( x ) {
	return x.then && typeof x.then == 'function'
}

function listKeys( containerName ) {
	let ctr = container( containerName );
	return ctr.keyList;
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

function pushMissingKey( containerName, key, acc ) {
	var originalKey = key;
	var parts = key.split( /[._]/ );
	if ( parts.length > 1 ) {
		containerName = getContainerName( containerName, parts );
		key = getKey( parts );
	}
	var hasKey = container( containerName )[ key ] != null;
	if( !hasKey ) {
		acc.push( originalKey );
	}
	return acc;
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
		containerName = getContainerName( containerName, parts );
		key = getKey( parts );
	}

	if ( _.isFunction( fn ) ) {
		dependencies = checkDependencies( fn, dependencies );
	} else {
		fn = fn || dependencies;
	}
	console.log( "registering", containerName, key );
	debug( 'Registering key "%s" for container "%s" with %s lifecycle: %s',
		key, containerName, lifecycle, getDisplay( fn ) );
	var promise = wrappers[ lifecycle ]( containerName, key, fn, dependencies );
	let ctr = container( containerName );
	ctr[ key ] = promise;
	ctr.keyList.push( key );
	if( containerName !== "default" ) {
		container( "default" ).keyList.push( [ containerName, key ].join( "." ) );
	}
	container( containerName )[ key ] = promise;
}

function registerModule( containerName, name ) {
	var mod = getLoadedModule( name ) ||  getModuleFromInstalls( name );
	if ( mod ) {
		var lifecycle = _.isFunction( mod ) ? 'factory' : 'static';
		register( containerName, name, mod, lifecycle );
	} else {
		debug( 'Fount could not find NPM module %s', name );
	}
	return mod;
}

function registerAsValue( containerName, key, val ) {
	return register( containerName, key, function() { return val; } );
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
			hash[ k ] = resolveKey( containerName, k, scopeName );
		} );
		return whenKeys( hash );
	} else {
		let value = resolveKey( containerName, key, scopeName );
		return isPromisey( value ) ? value : Promise.resolve( value );
	}
}

function resolveKey( containerName, key, scopeName ) {
	var parts = key.split( /[._]/ );
	if ( parts.length > 1 ) {
		containerName = getContainerName( containerName, parts );
		key = getKey( parts );
	}
	return container( containerName )[ key ]( scopeName );
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

function whenKeys( hash ) {
	let acc = {};
	let promises = _.map( hash, ( promise, key ) => {
		if( !isPromisey( promise ) ) {
			promise = Promise.resolve( promise );
		}
		return promise.then( ( value ) => acc[ key ] = value );
	} );
	return Promise.all( promises )
		.then( () => acc );
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
					return applyWhen( value, args );
				}
			}
			return new Promise( function( resolve ) {
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
				return Promise.resolve( cache[ key ] );
			} else if ( _.isFunction( value ) ) {
				if( dependencies && canResolve( containerName, dependencies, scopeName ) ) {
					var args = dependencies.map( function( key ) {
						return resolve( containerName, key, scopeName );
					} );
					return applyWhen( value, args ).then( store );
				} else {
					var resolvedValue;
					return function() {
						if( resolvedValue ) {
							return Promise.resolve( resolvedValue );
						} else {
							return new Promise( function( res ) {
								if( dependencies && canResolve( containerName, dependencies ) ) {
									var args = dependencies.map( function( key ) {
										return resolve( containerName, key, scopeName );
									} );
									res( applyWhen( value, args ).then( store ) );
								} else {
									res( value );
								}
							} );
						}
					};
				}
			} else {
				return new Promise( function( res ) {
					if ( isPromisey( value ) ) {
						value.then( store );
					} else {
						store( value );
					}
					res( value );
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
				promise = applyWhen( value, args );
			} else {
				var resolvedValue;
				return function() {
					if( resolvedValue ) {
						return Promise.resolve( resolvedValue );
					} else {
						return new Promise( function( res ) {
							if( dependencies && canResolve( containerName, dependencies ) ) {
								var args = dependencies.map( function( key ) {
									return resolve( containerName, key );
								} );
								applyWhen( value, args )
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
			promise = ( value && value.then ) ? value : value;
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
			keys: listKeys.bind( undefined, containerName ),
			register: register.bind( undefined, containerName ),
			registerModule: registerModule.bind( undefined, containerName ),
			registerAsValue: registerAsValue.bind( undefined, containerName ),
			resolve: resolve.bind( undefined, containerName ),
			purge: purge.bind( undefined, containerName ),
			purgeScope: purgeScope.bind( undefined, containerName )
		};
	}
};

fount.canResolve = canResolve.bind( undefined, 'default' );
fount.inject = inject.bind( undefined, 'default' );
fount.keys = listKeys.bind( undefined, 'default' );
fount.register = register.bind( undefined, 'default' );
fount.registerModule = registerModule.bind( undefined, 'default' );
fount.registerAsValue = registerAsValue.bind( undefined, 'default' );
fount.resolve = resolve.bind( undefined, 'default' );
fount.purge = purge.bind( undefined );
fount.purgeAll = purgeAll;
fount.purgeScope = purgeScope.bind( undefined, 'default' );
fount.setModule = setModule;

fount.log = function() {
	console.log( containers );
};

module.exports = fount;
