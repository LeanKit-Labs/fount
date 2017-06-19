const debug = require( "debug" )( "fount" );
const util = require( "util" );
const path = require( "path" );
const fs = require( "fs" );
const getDisplay = process.env.DEBUG ? displayDependency : function(){};

const DEFAULT = "default";
const STATIC = "static";

/**
 * Object Comparison Approach Copied & Adapted from Lodash
 * Lodash <https://lodash.com/>
 * Copyright JS Foundation and other contributors <https://js.foundation/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */
/** `Object#toString` result references. */
const ARGUMENTS_TAG = "[object Arguments]";
const ARRAY_TAG = "[object Array]";
const ASYNC_TAG = "[object AsyncFunction]";
const BOOL_TAG = "[object Boolean]";
const DATE_TAG = "[object Date]";
const ERROR_TAG = "[object Error]";
const FUNC_TAG = "[object Function]";
const GEN_TAG = "[object GeneratorFunction]";
const MAP_TAG = "[object Map]";
const NUMBER_TAG = "[object Number]";
const NULL_TAG = "[object Null]";
const OBJECT_TAG = "[object Object]";
const PROMISE_TAG = "[object Promise]";
const PROXY_TAG = "[object Proxy]";
const REGEX_TAG = "[object RegExp]";
const SET_TAG = "[object Set]";
const STRING_TAG = "[object String]";
const SYMBOL_TAG = "[object Symbol]";
const UNDEFINED_TAG = "[object Undefined]";
const WEAKMAP_TAG = "[object WeakMap]";
const WEAKSET_TAG = "[object WeakSet]";
const ARRAYBUFFER_TAG = "[object ArrayBuffer]";
const DATAVIEW_TAG = "[object DataView]";
const FLOAT32_TAG = "[object Float32Array]";
const FLOAT64_TAG = "[object Float64Array]";
const INT8_TAG = "[object Int8Array]";
const INT16_TAG = "[object Int16Array]";
const INT32_TAG = "[object Int32Array]";
const UINT8_TAG = "[object Uint8Array]";
const UINT8CLAMP_TAG = "[object Uint8ClampedArray]";
const UINT16_TAG = "[object Uint16Array]";
const UINT32_TAG = "[object Uint32Array]";
const NOT_AN_OBJECT = "";

function isObject( value ) {
  const type = typeof value;
  return value != null && ( type === "object" || type === "function" );
}

function getObjectTag( value ) {
	if( !isObject( value ) ) { 
		return NOT_AN_OBJECT; 
	}
	return Object.prototype.toString.call( value );
}

function isDate( value ) {
	return getObjectTag( value ) === DATE_TAG;
}

function isFunction( value ) {
	const tag = getObjectTag( value );
  return tag === FUNC_TAG || tag === GEN_TAG || tag === ASYNC_TAG || tag === PROXY_TAG;
}

function isNumber(value) {
  return typeof value === "number" ||
    ( getObjectTag( value ) === NUMBER_TAG );
}

function isPlainObject( value ) {
	return ( isObject( value ) && value.prototype == undefined );
}

function isPromisey( x ) {
	return x && x.then && typeof x.then === "function"
}

function isStub( value ) {
	return ( value && value.toString() == "stub" && value.name == "proxy" );
}

function isString( value ) {
	return typeof value === "string" ||
		( !Array.isArray( value ) && getObjectTag( value ) === STRING_TAG );
}

var containers = {};
var containerList = [];
var parent;

async function applyWhen( fn, args ) {
	if( !args || args.length === 0 ) {
		return fn();
	} else {
		const values = await Promise.all( 
			args.map( arg => isPromisey( arg ) ? arg : arg ) 
		);
		return fn.apply( null, values );
	}
}

function canResolve( containerName, dependencies, scopeName ) {
	return getMissingDependencies( containerName, dependencies, scopeName ).length === 0;
}

function checkDependencies( fn, dependencies ) {
	const fnString = fn.toString();
	if ( /[(][^)]*[)]/.test( fnString ) ) {
		return ( isFunction( fn ) && !dependencies.length ) ?
			trim( /[(]([^)]*)[)]/.exec( fnString )[ 1 ].split( "," ) ) :
			dependencies;
	} else {
		return undefined;
	}
}

function clone(source, target) {
	var tag = getObjectTag( source );
	if ( source == null || typeof source != "object" ) {
		return source;
	}
  else if ( !isObject( source ) && !Array.isArray( source ) ) {
  	return source;
  }
  else if ( tag == BOOL_TAG || tag == STRING_TAG || tag == NUMBER_TAG ||
  					tag == FUNC_TAG || tag == DATE_TAG || tag == REGEX_TAG ||
  					tag == GEN_TAG || tag == ASYNC_TAG || tag == PROXY_TAG ||
  					tag == PROMISE_TAG ) {
     	return new source.constructor( source );
  }

  target = target || new source.constructor();
  for (var key in source)
  {
      target[ key ] = typeof target[ key ] == "undefined" ? clone( source[ key ], null) : target[ key ];
  }
  return target;
}

function configure( config ) {
	const containerNames = Object.keys( config || {} );
	containerNames.forEach( ( containerName ) => {
		let containerConfig = config[ containerName ];
		let keys = Object.keys( containerConfig );
		keys.forEach( ( key ) => {
			let opt = containerConfig[ key ];
			let dependency = undefined;
			let lifecycle;
			if ( isObject( opt ) ) {
				if ( opt.scoped ) {
					lifecycle = "scoped";
					dependency = opt.scoped;
				} else if ( opt.static ) {
					lifecycle = "static";
					dependency = opt.static;
				} else if ( opt.factory ) {
					lifecycle = "factory";
					dependency = opt.factory;
				}
			}
			if ( !dependency ) {
				dependency = opt;
				lifecycle = isFunction( opt ) ? "factory" : "static";
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

function contains( list, value ) {
	return list.indexOf( value ) >= 0;
}

function displayDependency( obj ) {
	if ( isFunction( obj ) ) {
		return obj.name || "anonymous function";
	} else if ( isString( obj ) || isNumber( obj ) || Array.isArray( obj ) || isDate( obj ) ) {
		return obj;
	} else if ( isPlainObject( obj ) ) {
		return "[Object Literal]";
	} else {
		return obj.constructor.name || "[Object]";
	}
}

function filter( list ) {
	return list.reduce( ( acc, value ) => {
		if( value ) { acc.push( value ); }
		return acc;
	}, [] );
}

function find( list, predicate ) {
	if( list.length == 0 ) {
		return undefined;
	}
	var found = false;
	var index = -1;
	var item = undefined;
	do {
		item = list[ ++index ];
		found = predicate( item );
	} while( !found && index < list.length - 1 )
	return found ? item : undefined;
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

function get( containerName, key, scopeName = DEFAULT ) {
	const missingKeys = getMissingDependencies( containerName, key, scopeName );
	if ( missingKeys.length > 0 ) {
		throw new Error( `Fount could not resolve the following dependencies: ${missingKeys.join( ', ' )}` );
	}
	if ( Array.isArray( key ) ) {
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
	const missingKeys = getMissingDependencies( containerName, dependencies, scopeName );
	if ( missingKeys.length > 0 ) {
		throw new Error( `Fount could not resolve the following dependencies: ${missingKeys.join( ', ' )}` );		
	}

	return dependencies.map( function( key ) {
		const parts = key.split( /[._]/ );
		let ctrName = containerName;
		if ( parts.length > 1 ) {
			ctrName = getContainerName( containerName, parts );
			key = getKey( parts );
		}
		return get( ctrName, key, scopeName );
	} );
}

function getContainerName( name, parts ) {
	const lead = parts.slice( 0, -1 );
	if( name === "default" ) {
		return lead.join( "." );
	} else {
		return ( [ name ].concat( lead ) ).join( "." );
	}
}

function getKey( parts ) {
	return parts.slice( -1 )[ 0 ];
}

function getLoadedModule( name ) {
	const parentModule = findParent( module );
	const regex = new RegExp( name );
	const candidate = find( parentModule.children, function( child ) {
		return regex.test( child.id ) && contains( child.id.split( "/" ), name );
	} );
	if ( candidate ) {
		candidate.exports.__npm = candidate.exports.__npm || true;
		return candidate.exports;
	} else {
		return undefined;
	}
}

function getModuleFromInstalls( name ) {
	const parentModule = findParent( module );
	const installPath = find( parentModule.paths, function( p ) {
		const modPath = path.join( p, name );
		return fs.existsSync( modPath );
	} );
	var mod;
	if ( installPath ) {
		mod = require( path.join( installPath, name ) );
		mod.__npm = mod.__npm || true;
	}
	return mod;
}

function getMissingDependencies( containerName = DEFAULT, dependencies, scopeName = DEFAULT ) {
	dependencies = Array.isArray( dependencies ) ? dependencies : [ dependencies ];
	return dependencies.reduce( function( acc, key ) {
		if ( Array.isArray( key ) ) {
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
	const parts = key.split( /[._]/ );
	let ctrName = containerName;
	let keyName = key;
	if ( parts.length > 1 ) {
		ctrName = getContainerName( containerName, parts );
		keyName = getKey( parts );
	}
	return containers[ ctrName ][ keyName ]( scopeName );
}

function invoke( containerName, dependencies, fn, scopeName = DEFAULT ) {
	if ( isFunction( dependencies ) ) {
		scopeName = fn;
		fn = dependencies;
		dependencies = [];
	}
	const args = getArguments( containerName, dependencies, fn, scopeName );
	if( args.length == 0 ) {
		return fn();
	} else {
		return fn.apply( null, args );
	}
}

function inject( containerName, dependencies, fn, scopeName = DEFAULT ) {
	if ( isFunction( dependencies ) ) {
		scopeName = fn;
		fn = dependencies;
		dependencies = [];
	}
	const args = getArguments( containerName, dependencies, fn, scopeName );
	return applyWhen( fn, args );
}

function listContainers( containerName ) {
	return containerList;
}

function listKeys( containerName ) {
	const ctr = containers[ containerName ];
	return ctr ? ctr.keyList : [];
}

function purge( containerName ) {
	const index = containerList.indexOf( containerName );
	if( index >= 0 ) {
		debug( "purging container %s", containerName );
		containerList.splice( index, 1 );
		delete containers[ containerName ];
	}
}

function purgeAll() {
	debug( "purging all containers" );
	containerList = [];
	containers = { scopes: {} };
}

function purgeScope( containerName, scopeName ) {
	debug( "purging container %s, scope %s", containerName, scopeName );
	if( containerList.indexOf( containerName ) >= 0 ) {
		delete containers[ containerName ].scopes[ scopeName ];	
	}
}

function pushMissingKey( containerName, key, acc ) {
	const originalKey = key;
	const parts = key.split( /[._]/ );
	let hasKey = false;
	if ( parts.length > 1 ) {
		const ctr = containers[ getContainerName( containerName, parts ) ];
		hasKey =
			ctr != null &&
			ctr[ getKey( parts ) ] != null;
	} else {
		let ctr = containers[ containerName ];
		hasKey = ctr && ctr[ key ] != null;	
	}
	if( !hasKey ) {
		acc.push( originalKey );
	}
	return acc;
}

function register() {
	let containerName = arguments[ 0 ];
	let key = arguments[ 1 ];
	const parts = key.split( /[._]/ );
	if ( parts.length > 1 ) {
		containerName = getContainerName( containerName, parts );
		key = getKey( parts );
	}
	const args2 = arguments[ 2 ];
	const args3 = arguments[ 3 ];
	const args4 = arguments[ 4 ];
	// function passed for value, no dependency list
	if( isFunction( args2 ) ) {
		registerFunction( containerName, key, args2, [], args3 );
	}
	// function passed for value with preceding dependency list
	else if( isFunction( args3 ) ) {
		registerFunction( containerName, key, args3, args2, args4 );
	} 
	// values were passed directly
	else {
		registerValues( containerName, key, args2, args3 );
	}
}

function registerValues( containerName, key, values, lifecycle = STATIC ) {
	debug( `Registering key "${key}" for container "${container}" with "${lifecycle}: ${getDisplay( values )}`)
	const value = wrappers[ lifecycle ]( containerName, key, values );
	const ctr = container( containerName );
	ctr[ key ] = value;
	ctr.keyList.push( key );
	if( containerName !== DEFAULT ) {
		container( DEFAULT ).keyList.push( [ containerName, key ].join( "." ) );
	}
}

function registerFunction( containerName, key, fn, dependencies, lifecycle = STATIC ) {
	dependencies = checkDependencies( fn, dependencies );
	debug( `Registering key "${key}" for container "${container}" with "${lifecycle}: ${getDisplay( dependencies )}`)
	const value = wrappers[ lifecycle ]( containerName, key, fn, dependencies );
	const ctr = container( containerName );
	ctr[ key ] = value;
	ctr.keyList.push( key );
	if( containerName !== DEFAULT ) {
		container( DEFAULT ).keyList.push( [ containerName, key ].join( "." ) );
	}
}

function registerModule( containerName, name ) {
	const mod = getLoadedModule( name ) || getModuleFromInstalls( name );
	if ( mod ) {
		const lifecycle = isFunction( mod ) ? "factory" : "static";
		register( containerName, name, mod, lifecycle );
	} else {
		debug( `Fount could not find NPM module ${name}` );
	}
	return mod;
}

function registerAsValue( containerName, key, val ) {
	return register( containerName, key, function() { return val; } );
}

function resolve( containerName, key, scopeName ) {
	const value = get( containerName, key, scopeName );
	if( Array.isArray( key ) ) {
		return whenKeys( value );
	} else {
		return isPromisey( value ) ? value : Promise.resolve( value );
	}
}

function resolveFunction( containerName, key, value, dependencies, store, scopeName ) {
	let hasPromises = false;
	const args = dependencies.map( function( dependencyKey ) {
		const dependencyValue = getValue( containerName, dependencyKey, scopeName );
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
	const ctr = container( containerName );
	return ( ctr.scopes[ name ] = ctr.scopes[ name ] || {} );
}

function setModule( mod ) {
	parent = mod;
}

function trimString( str ) {
	return str.trim();
}

function trim( list ) {
	return ( list && list.length ) ? filter( list.map( trimString ) ) : [];
}

function type( obj ) {
	return Object.prototype.toString.call( obj );
}

function whenKeys( hash ) {
	const resolved = {};
	const keys = Object.keys( hash );
	const promises = keys.reduce( ( acc, key ) => {
		const value = hash[ key ];
		resolved[ key ] = undefined;
		if( !isPromisey( value ) ) {
			resolved[ key ] = value;
		} else {
			acc.push( value.then( ( x ) => resolved[ key ] = x ) );
		}
		return acc;
	}, [] );

	return Promise.all( promises )
		.then( () => resolved );
}

function factoryResolver( containerName, key, value, dependencies ) {
	return function( scopeName ) {
		if ( isFunction( value ) ) {
			let dependencyContainer = containerName;
			if ( value.__npm ) {
				dependencyContainer = key;
			}
			if ( dependencies && canResolve( dependencyContainer, dependencies, scopeName ) ) {
				let promises = false;
				const args = dependencies.map( function( key ) {
					const val = getValue( dependencyContainer, key, scopeName );
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
		const cache = scope( containerName, scopeName );
		const store = function( resolvedTo ) {
			cache[ key ] = clone( resolvedTo );
			return resolvedTo;
		};
		if ( cache[ key ] ) {
			return cache[ key ];
		} else if ( isFunction( value ) ) {
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
	const store = function( resolvedTo ) {
		return resolvedTo;
	};
	if ( isFunction( value ) && !isStub( value ) ) {
		if( !dependencies || dependencies.length == 0 ) {
			return function() {
				return value();
			}
		} else if( dependencies && canResolve( containerName, dependencies ) ) {
			const val = resolveFunction( containerName, key, value, dependencies, store );
			return function() {
				return val;
			}
		} else {
			var resolvedValue;
			return function() {
				if( resolvedValue ) {
					return resolvedValue;
				} else {
					return new Promise( function( res ) {
						if( dependencies && canResolve( containerName, dependencies ) ) {
							const resolved = resolveFunction( containerName, key, value, dependencies, store );
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
	if ( isObject( containerName ) ) {
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
