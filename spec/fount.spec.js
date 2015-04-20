require( './setup' );
var fount = require( '../src/index.js' );
var postal = require( 'postal' );

describe( 'Resolving', function() {
	before( function() {
		fount.setModule( module );
	} );

	describe( 'with dependencies', function() {
		before( function() {
			fount.register( 'an value!', 'ohhai' );
		} );

		it( 'should resolve correctly', function() {
			return fount.resolve( 'an value!' )
				.should.eventually.equal( 'ohhai' );
		} );
	} );

	describe( 'when resolving sinon.stub', function() {
		var stub = sinon.stub();
		var result;

		before( function() {
			fount.register( 'aStub', stub );
			return fount.inject( function( aStub ) {
				result = aStub;
			} );
		} );

		it( 'should resolve the stub as a function', function() {
			result.should.eql( stub );
		} );
	} );

	describe( 'when resolving a function with unresolvable dependencies', function() {
		var fn = function( x, y, z ) {
			return x + y + z;
		};
		var result;
		before( function() {
			fount.register( 'unresolvable', fn );
			return fount.inject( function( unresolvable ) {
				result = unresolvable( 1, 2, 3 );
			} );
		} );

		it( 'should resolve the stub as a function', function() {
			result.should.eql( 6 );
		} );
	} );

	describe( 'when resolving functions', function() {

		describe( 'without dependencies', function() {
			before( function() {
				fount.register( 'simpleFn', function() {
					return 'hello, world!';
				} );
			} );

			it( 'should resolve the function\'s result', function() {
				this.timeout( 100 );
				fount.resolve( 'simpleFn' )
					.should.eventually.equal( 'hello, world!' );
			} );
		} );

		describe( 'with dependency on a list', function() {
			before( function() {
				fount.register( 'simpleList', [ 1, 2, 3 ] );
			} );

			it( 'should resolve to the list', function() {
				return fount.resolve( 'simpleList' )
					.should.eventually.eql( [ 1, 2, 3 ] );
			} );
		} );

		var a = { one: 1 };

		describe( 'with static lifecycle', function() {
			before( function() {
				fount.register( 'a', function() {
					return a;
				} );
				fount.register( 'b', 2 );
				fount.register( 'c', when.promise( function( resolve ) {
					resolve( 3 );
				} ) );
				fount.register( 'line', [ 'a', 'b', 'c' ], function( a, b, c ) {
					return 'easy as ' + a.one + ', ' + b + ', ' + c + '!';
				} );

			} );

			it( 'should resolve function\'s dependencies', function() {
				fount.resolve( 'line' )
					.should.eventually.equal( 'easy as 1, 2, 3!' );
			} );
		} );

		describe( 'when modifying static dependency', function() {
			before( function() {
				a.one = 'DURP';
			} );

			it( 'should resolve to original value', function() {
				fount.resolve( 'line' )
					.should.eventually.equal( 'easy as 1, 2, 3!' );
			} );
		} );

		describe( 'with multiple scopes', function() {
			var obj = { x: 1 };
			describe( 'in scope default', function() {
				before( function() {
					fount.register( 'o', function() {
						return obj;
					}, 'scoped' );

					fount.register( 'getX', [ 'o' ], function( o ) {
						return o.x;
					}, 'scoped' );
				} );

				it( 'should resolve correctly', function() {
					fount.resolve( [ 'o', 'getX' ] )
						.should.eventually.eql( { 'o': { x: 1 }, 'getX': 1 } );
				} );
			} );

			describe( 'in scope custom', function() {
				before( function() {
					obj.x = 10;
				} );

				it( 'should resolve indepedent results', function() {
					fount.resolve( [ 'o', 'getX' ], 'custom' )
						.should.eventually.eql( { 'o': { x: 10 }, 'getX': 10 } );
				} );
			} );

			describe( 'back to default', function() {
				it( 'should resolve original scoped results', function() {
					fount.resolve( [ 'o', 'getX' ] )
						.should.eventually.eql( { 'o': { x: 1 }, 'getX': 1 } );
				} );
			} );
		} );

		describe( 'with factory lifecycle', function() {
			var obj = { x: 1 };
			describe( 'in scope default', function() {
				before( function() {
					fount.register( 'o2', function() {
						return obj;
					}, 'factory' );
					fount.register( 'getX2', [ 'o2' ], function( o ) {
						return o.x;
					}, 'factory' );
				} );

				it( 'should resolve correctly', function() {
					return fount.resolve( [ 'o2', 'getX2' ] )
						.should.eventually.eql( { 'o2': { x: 1 }, 'getX2': 1 } );
				} );
			} );

			describe( 'after changing property', function() {
				it( 'should resolve to new result showing change', function() {
					obj.x = 10;
					return fount.resolve( [ 'o2', 'getX2' ] )
						.should.eventually.eql( {
						'o2': { x: 10 }, 'getX2': 10
					} );
				} );
			} );
		} );

		describe( 'when checking to see if key can be resolved', function() {
			describe( 'with existing and missing dependencies', function() {
				var result;
				before( function() {
					fount.register( 'met', 'true' );
				} );

				it( 'should resolve existing dependency', function() {
					fount.canResolve( 'met' ).should.equal( true );
				} );

				it( 'should not resolve missing dependency', function() {
					fount.canResolve( 'unmet' ).should.equal( false );
				} );
			} );
		} );

		describe( 'when resolving missing keys', function() {
			it( 'should throw meaningful error message', function() {
				should.throw( function() {
					fount.resolve( [ 'lol', 'rofl' ] );
				}, 'Fount could not resolve the following dependencies: lol, rofl' );
			} );
		} );
	} );
} );

describe( 'Injecting', function() {

	var aObj = { value: 1 };
	var b = when.promise( function( r ) {
		r( 2 );
	} );
	var c = function( a, b ) {
		return a.value + b;
	};
	var dObj = { value: 5 };
	var d = function() {
		return dVal;
	};
	var e = function( c, d ) {
		return c * d.value;
	};

	before( function() {
		aObj = { value: 1 };
		b = when.promise( function( r ) {
			r( 2 );
		} );
		c = function( a, b ) {
			return a.value + b;
		};
		dObj = { value: 5 };
		d = function() {
			return dVal;
		};
		e = function( c, d ) {
			return c * d.value;
		};

		fount.purgeAll();

		fount.register( 'aStatic', aObj );
		fount.register( 'bStatic', b );
		fount.register( 'cStatic', [ 'aStatic', 'bStatic' ], c );
		fount.register( 'dStatic', dObj );
		fount.register( 'eStatic', [ 'cStatic', 'dStatic' ], e );

		fount.register( 'aScoped', aObj, 'scoped' );
		fount.register( 'bScoped', b, 'scoped' );
		fount.register( 'cScoped', [ 'aScoped', 'bScoped' ], c, 'scoped' );
		fount.register( 'dScoped', dObj, 'scoped' );
		fount.register( 'eScoped', [ 'cScoped', 'dScoped' ], e, 'scoped' );

		fount.register( 'aFactory', aObj, 'factory' );
		fount.register( 'bFactory', b, 'factory' );
		fount.register( 'cFactory', [ 'aFactory', 'bFactory' ], c, 'factory' );
		fount.register( 'dFactory', dObj, 'factory' );
		fount.register( 'eFactory', [ 'cFactory', 'dFactory' ], e, 'factory' );
	} );

	describe( 'with static dependencies', function() {

		describe( 'when resolving', function() {
			var result;
			before( function() {
				return fount.inject( [ 'eStatic' ], function( e ) {
					result = e;
				} );
			} );

			it( 'should resolve to 15', function() {
				result.should.equal( 15 );
			} );
		} );

		describe( 'after changing a dependency', function() {
			var result;
			before( function() {
				aObj.value = 2;
				dObj.value = 10;
				return fount.inject( [ 'eStatic' ], function( e ) {
					result = e;
				} );
			} );

			it( 'should not change', function() {
				result.should.equal( 15 );
			} );
		} );
	} );

	describe( 'with scoped dependencies', function() {

		describe( 'when injecting from default scope', function() {
			var result;
			before( function() {
				aObj.value = 1;
				dObj.value = 5;
				return fount.inject( [ 'eScoped' ], function( e ) {
					result = e;
				} );
			} );

			it( 'should resolve correctly', function() {
				result.should.equal( 15 );
			} );
		} );

		describe( 'when injecting from custom scope', function() {
			var result;
			before( function() {
				aObj.value = 2;
				dObj.value = 10;
				return fount.inject( [ 'eScoped' ], function( e ) {
					result = e;
				}, 'custom' );
			} );

			it( 'should produce an independent result', function() {
				result.should.equal( 40 );
			} );
		} );

		describe( 'when injecting from default scope after change', function() {
			var result;
			before( function() {
				return fount.inject( [ 'eScoped' ], function( e ) {
					result = e;
				} );
			} );

			it( 'should produce original scoped result', function() {
				result.should.equal( 15 );
			} );
		} );

		describe( 'when injecting from more than one container', function() {
			var result;
			before( function() {
				fount.register( 'doggie.question', 'Who\'s a good boy?' );
				fount.register( 'owner.praise', 'YOU are!' );
				return fount.inject( [ 'doggie.question', 'owner.praise' ], function( dq, op ) {
					result = dq + " " + op;
				} );
			} );

			it( 'should correctly inject dependencies', function() {
				result.should.equal( 'Who\'s a good boy? YOU are!' );
			} );
		} );
	} );

	describe( 'with factory dependencies', function() {

		describe( 'when injecting factory', function() {
			var result;
			before( function() {
				aObj.value = 1;
				dObj.value = 5;
				return fount.inject( [ 'eFactory' ], function( e ) {
					result = e;
				} );
			} );

			it( 'should resolve correclty', function() {
				result.should.equal( 15 );
			} );
		} );

		describe( 'when injecting factory', function() {
			var result;
			before( function() {
				aObj.value = 2;
				dObj.value = 5;
				return fount.inject( [ 'eFactory' ], function( e ) {
					result = e;
				} );
			} );

			it( 'should resolve to reflect changes in dependencies', function() {
				result.should.equal( 20 );
			} );
		} );
	} );

	describe( 'when injecting without dependency array', function() {
		before( function() {
			fount.purgeAll();
			fount.register( 'one', 1 );
			fount.register( 'two', function() {
				return 2;
			} );
			fount.register( 'three', when( 3 ) );
		} );

		describe( 'with a dependency of each type', function() {
			var results;
			before( function() {
				return fount.inject( function( one, two, three ) {
					results = [ one, two, three ];
				} );
			} );

			it( 'should return array of correct values', function() {
				results.should.eql( [ 1, 2, 3 ] );
			} );
		} );
	} );
} );

describe( 'Custom Containers', function() {
	describe( 'when resolving values', function() {
		var results;
		before( function() {
			fount.register( 'x', 50 );
			fount( 'one' ).register( 'x', 100 );
			fount( 'two' ).register( 'x', 200 );

			return when.all( [
				fount.resolve( 'x' ),
				fount( 'one' ).resolve( 'x' ),
				fount( 'two' ).resolve( 'x' )
			] ).then( function( value ) {
				results = value;
			} );
		} );

		it( 'should resolve all correctly', function() {
			results.should.eql( [ 50, 100, 200 ] );
		} );
	} );

	describe( 'when resolving a list across containers', function() {
		var results;
		before( function() {
			fount.purgeAll();
			fount.register( 'x', 50 );
			fount( 'one' ).register( 'one.x', 100 );
			fount( 'two' ).register( 'x', 200 );
			return fount.resolve( [ 'x', 'one.x', 'two.x' ] )
				.then( function( value ) {
					results = value;
				} );
		} );

		it( 'should resolve using namespaces correctly', function() {
			results.should.eql( { 'x': 50, 'one.x': 100, 'two.x': 200 } );
		} );
	} );
} );

describe( 'NPM Dependencies', function() {

	describe( 'when require cache has dependency', function() {
		describe( 'with static dependency', function() {
			it( 'should successfully register as static', function() {
				return fount.resolve( 'postal' ).should.eventually.equal( postal );
			} );
		} );
		describe( 'with missing library', function() {
			it( 'should provide a meaningful error', function() {
				should.throw( function() {
					fount.resolve( 'wascally' );
				}, 'Fount could not resolve the following dependencies: wascally' );
			} );
		} );
	} );

	describe( 'when require cache does not have dependency', function() {
		describe( 'with factory dependency', function() {
			it( 'should successfully register as factory', function() {
				return fount.resolve( 'whistlepunk' )
					.should.eventually.equal( require( 'whistlepunk' ) );
			} );
		} );
		describe( 'with missing library', function() {
			it( 'should provide a meaningful error', function() {
				should.throw( function() {
					fount.resolve( 'wascally' );
				}, 'Fount could not resolve the following dependencies: wascally' );
			} );
		} );
	} );
} );

describe( 'Hash Configuration', function() {
	before( function() {
		fount.purgeAll();

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
	} );

	it( 'should resolve all defined keys', function() {
		return fount.resolve( [ 'a', 'b', 'other.c', 'other.d', 'other.e', 'other.f' ] )
			.should.eventually.eql( {
			a: 1,
			b: 2,
			'other.c': 3,
			'other.d': 4,
			'other.e': 5,
			'other.f': 6
		} );
	} );

	it( 'should inject all defined keys', function() {
		return fount.inject( function( a, b, other_c, other_d, other_e, other_f ) {
			return {
				a: a,
				b: b,
				'other.c': other_c,
				'other.d': other_d,
				'other.e': other_e,
				'other.f': other_f
			};
		} )
			.should.eventually.eql( {
			a: 1,
			b: 2,
			'other.c': 3,
			'other.d': 4,
			'other.e': 5,
			'other.f': 6
		} );
	} );
} );
