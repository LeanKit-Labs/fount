const _ = require( 'lodash' );
const debug = require( 'debug' )( 'fount' );
const util = require( 'util' );
const path = require( 'path' );
const fs = require( 'fs' );
const getDisplay = process.env.DEBUG ? displayDependency : _.noop;
const DEFAULT = 'default';

let containers = {};
let containerList = [];
let parent;

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
	let fnString = fn.toString();
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
			let dependency = opt;
			let lifecycle;
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
	let ctr = containers[ name ];
	if( !ctr ) {
		ctr = { scopes: {}, keyList: [] };
		containerList.push( name );
		containers[ name ] = ctr;
	}
	return ctr;
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

function get( containerName, key, scopeName ) {
	scopeName = scopeName || DEFAULT;
	let missingKeys = getMissingDependencies( containerName, key, scopeName );
	if ( missingKeys.length > 0 ) {
		throw new Error( util.format( 'Fount could not resolve the following dependencies: %s', missingKeys.join( ', ' ) ) );
	}
	if ( _.isArray( key ) ) {
		return key.reduce( ( acc, k ) => {
			acc[ k ] = getValue( containerName, k, scopeName );
			return acc;
		}, {} );
	} else {
		return getValue( containerName, key, scopeName );
	}
}

function getArguments( containerName, dependencies, fn, scopeName ) {
	dependencies = checkDependencies( fn, dependencies );
	let missingKeys = getMissingDependencies( containerName, dependencies, scopeName );
	if ( missingKeys.length > 0 ) {
		throw new Error( util.format( 'Fount could not resolve the following dependencies: %s', missingKeys.join( ', ' ) ) );
	}

	return dependencies.map( function( key ) {
		let parts = key.split( /[._]/ );
		let ctrName = containerName;
		if ( parts.length > 1 ) {
			ctrName = getContainerName( containerName, parts );
			key = getKey( parts );
		}
		return get( ctrName, key, scopeName );
	} );
}

function getContainerName( name, parts ) {
	let lead = parts.slice( 0, -1 );
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
	let parent = findParent( module );
	let regex = new RegExp( name );
	let candidate = _.find( parent.children, function( child ) {
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
	let parent = findParent( module );
	let installPath = _.find( parent.paths, function( p ) {
		let modPath = path.join( p, name );
		return fs.existsSync( modPath );
	} );
	let mod;
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
	scopeName = scopeName || DEFAULT;
	containerName = containerName || DEFAULT;
	dependencies = _.isArray( dependencies ) ? dependencies : [ dependencies ];
	return dependencies.reduce( function( acc, key ) {
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

function getValue( containerName, key, scopeName ) {
	let parts = key.split( /[._]/ );
	if ( parts.length > 1 ) {
		containerName = getContainerName( containerName, parts );
		key = getKey( parts );
	}
	return containers[ containerName ][ key ]( scopeName );
}

function invoke( containerName, dependencies, fn, scopeName ) {
	scopeName = scopeName || DEFAULT;
	if ( _.isFunction( dependencies ) ) {
		scopeName = fn;
		fn = dependencies;
		dependencies = [];
	}
	let args = getArguments( containerName, dependencies, fn, scopeName );
	if( args.length == 0 ) {
		return fn();
	} else {
		return fn.apply( null, args );
	}
}

function inject( containerName, dependencies, fn, scopeName ) {
	scopeName = scopeName || DEFAULT;
	if ( _.isFunction( dependencies ) ) {
		scopeName = fn;
		fn = dependencies;
		dependencies = [];
	}
	let args = getArguments( containerName, dependencies, fn, scopeName );
	return applyWhen( fn, args );
}

function isPromisey( x ) {
	return x && x.then && typeof x.then == 'function'
}

function listContainers( containerName ) {
	return containerList;
}

function listKeys( containerName ) {
	let ctr = containers[ containerName ];
	return ctr ? ctr.keyList : [];
}

function purge( containerName ) {
	let index = containerList.indexOf( containerName );
	if( index >= 0 ) {
		debug( 'purging container %s', containerName );
		containerList.splice( index, 1 );
		delete containers[ containerName ];
	}
}

function purgeAll() {
	debug( 'purging all containers' );
	containerList = [];
	containers = { scopes: {} };
}

function purgeScope( containerName, scopeName ) {
	debug( 'purging container %s, scope %s', containerName, scopeName );
	if( containerList.indexOf( containerName ) >= 0 ) {
		delete containers[ containerName ].scopes[ scopeName ];	
	}
}

function pushMissingKey( containerName, key, acc ) {
	let originalKey = key;
	let parts = key.split( /[._]/ );
	if ( parts.length > 1 ) {
		containerName = getContainerName( containerName, parts );
		key = getKey( parts );
	}
	let ctr = containers[ containerName ];
	let hasKey = ctr && ctr[ key ] != null;
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
	debug( 'Registering key "%s" for container "%s" with %s lifecycle: %s',
		key, containerName, lifecycle, getDisplay( fn ) );
	let value = wrappers[ lifecycle ]( containerName, key, fn, dependencies );
	let ctr = container( containerName );
	ctr[ key ] = value;
	ctr.keyList.push( key );
	if( containerName !== DEFAULT ) {
		container( DEFAULT ).keyList.push( [ containerName, key ].join( "." ) );
	}
}

function registerModule( containerName, name ) {
	let mod = getLoadedModule( name ) ||  getModuleFromInstalls( name );
	if ( mod ) {
		let lifecycle = _.isFunction( mod ) ? 'factory' : 'static';
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
	let value = get( containerName, key, scopeName );
	if( _.isArray( key ) ) {
		return whenKeys( value );
	} else {
		return isPromisey( value ) ? value : Promise.resolve( value );
	}
}

function resolveFunction( containerName, key, value, dependencies, store, scopeName ) {
	let hasPromises = false;
	let args = dependencies.map( function( dependencyKey ) {
		let dependencyValue = getValue( containerName, dependencyKey, scopeName );
		if( isPromisey( dependencyValue ) ) {
			hasPromises = true;
		}
		return dependencyValue;
	} );
	if( hasPromises ) {
		return applyWhen( value, args ).then( store );
	} else {
		return store( value.apply( null, args ) );
	}
}

function scope( containerName, name ) {
	let ctr = container( containerName );
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

function factoryResolver( containerName, key, value, dependencies ) {
	return function( scopeName ) {
		if ( _.isFunction( value ) ) {
			let dependencyContainer = containerName;
			if ( value.__npm ) {
				dependencyContainer = key;
			}
			if ( dependencies && canResolve( dependencyContainer, dependencies, scopeName ) ) {
				let promises = false;
				let args = dependencies.map( function( key ) {
					let val = getValue( dependencyContainer, key, scopeName );
					if( isPromisey( val ) ) {
						promises = true;
					}
					return val;
				} );
				if( promises ) {
					return applyWhen( value, args );	
				} else {
					return value.apply( null, args );
				}
			}
		}
		return value;
	};
}

function scopedResolver( containerName, key, value, dependencies ) {
	return function( scopeName ) {
		let cache = scope( containerName, scopeName );
		let store = function( resolvedTo ) {
			cache[ key ] = _.cloneDeep( resolvedTo );
			return resolvedTo;
		};
		if ( cache[ key ] ) {
			return cache[ key ];
		} else if ( _.isFunction( value ) ) {
			if( dependencies && canResolve( containerName, dependencies, scopeName ) ) {
				return resolveFunction( containerName, key, value, dependencies, store, scopeName )
			} else {
				return function() {
					if( dependencies && canResolve( containerName, dependencies, scopeName ) ) {
						return resolveFunction( containerName, key, value, dependencies, store, scopeName )
					}
				}
			}
		} else {
			if ( isPromisey( value ) ) {
				value.then( store );
			} else {
				store( value );
			}
			return value;
		}
	};
}

function staticResolver( containerName, key, value, dependencies ) {
	let store = function( resolvedTo ) {
		return resolvedTo;
	};
	if ( _.isFunction( value ) && !( value.toString() == "stub" && value.name == "proxy" ) ) {
		if( !dependencies || dependencies.length == 0 ) {
			return function() {
				return value();
			}
		} else if( dependencies && canResolve( containerName, dependencies ) ) {
			let val = resolveFunction( containerName, key, value, dependencies, store );
			return function() {
				return val;
			}
		} else {
			let resolvedValue;
			return function() {
				if( resolvedValue ) {
					return resolvedValue;
				} else {
					return new Promise( function( res ) {
						if( dependencies && canResolve( containerName, dependencies ) ) {
							let resolved = resolveFunction( containerName, key, value, dependencies, store );
							if( isPromisey( resolved ) ) {
								resolved.then( ( r ) => {
									resolvedValue = r;
									res( r );
								} );
							} else {
								resolvedValue = resolved;
								res( resolved );
							}
						} else {
							res( value );
						}
					} );
				}
			};
		}
	} else {
		return function() { return value; };
	}
}

const wrappers = {
	factory: factoryResolver,
	scoped: scopedResolver,
	static: staticResolver
}

const fount = function( containerName ) {
	if ( _.isObject( containerName ) ) {
		configure( containerName );
	} else {
		return {
			canResolve: canResolve.bind( undefined, containerName ),
			get: get.bind( undefined, containerName ),
			invoke: invoke.bind( undefined, containerName ),
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

fount.canResolve = canResolve.bind( undefined, DEFAULT );
fount.containers = listContainers.bind( undefined, DEFAULT );
fount.get = get.bind( undefined, DEFAULT );
fount.invoke = invoke.bind( undefined, DEFAULT );
fount.inject = inject.bind( undefined, DEFAULT );
fount.keys = listKeys.bind( undefined, DEFAULT );
fount.register = register.bind( undefined, DEFAULT );
fount.registerModule = registerModule.bind( undefined, DEFAULT );
fount.registerAsValue = registerAsValue.bind( undefined, DEFAULT );
fount.resolve = resolve.bind( undefined, DEFAULT );
fount.purge = purge.bind( undefined );
fount.purgeAll = purgeAll;
fount.purgeScope = purgeScope.bind( undefined, DEFAULT );
fount.setModule = setModule;

fount.log = function() {
	console.log( containers );
};

module.exports = fount;
