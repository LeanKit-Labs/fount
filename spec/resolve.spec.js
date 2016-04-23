require( './setup' );
var fount = require( '../src/index.js' );

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
			describe( 'when registered normally', function() {
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

			describe( 'when registered as a value', function() {
				before( function() {
					fount.registerAsValue( 'simpleFn2', function() {
						return 'hello, world!';
					} );
				} );

				it( 'should resolve to the function', function() {
					this.timeout( 100 );
					fount.resolve( 'simpleFn2' )
						.then( function( fn ) { return fn(); } )
						.should.eventually.equal( 'hello, world!' );
				} );
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
				return fount.resolve( 'line' )
					.should.eventually.equal( 'easy as 1, 2, 3!' );
			} );
		} );

		describe( 'with initially unmet dependencies', function() {
			var calls = 0;
			function delayed( a2, b2, c2 ) {
				calls ++;
				return a2 + b2 + c2;
			}
			before( function() {
				fount.register( 'delayed', delayed );
			} );

			it( 'should resolve to the function if called before dependencies are registered', function() {
				return fount.resolve( 'delayed' )
					.should.eventually.eql( delayed );
			} );

			describe( 'after dependencies are registered', function() {
				before( function() {
					fount.register( 'a2', 1 );
					fount.register( 'b2', 10 );
					fount.register( 'c2', 100 );
				} );

				it( 'should resolve to function result', function() {
					return fount.resolve( 'delayed' )
						.should.eventually.eql( 111 );
				} );

				it( 'should not call function after initial resolution', function() {
					return fount.resolve( 'delayed' )
						.then( function () {
							return calls;
						} )
						.should.eventually.eql( 1 );
				} );
			} );
		} );

		describe( 'when modifying static dependency', function() {
			before( function() {
				a.one = 'DURP';
			} );

			it( 'should resolve to original value', function() {
				return fount.resolve( 'line' )
					.should.eventually.equal( 'easy as 1, 2, 3!' );
			} );
		} );

		describe( 'with multiple calls to a scopes', function() {
			var obj = { x: 1 };
			before( function() {
				fount.register( 'o', function() {
					return obj;
				}, 'scoped' );

				fount.register( 'getX', function( o ) {
					return o.x;
				}, 'scoped' );

				return fount.resolve( 'getX', 'testScope' );

			} );

			it( 'should resolve correctly', function() {
				return fount.resolve( 'getX', 'testScope' )
					.should.eventually.equal( 1 );
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
					return fount.resolve( [ 'o', 'getX' ] )
						.should.eventually.eql( { 'o': { x: 1 }, 'getX': 1 } );
				} );
			} );

			describe( 'in scope custom', function() {
				before( function() {
					obj.x = 10;
				} );

				it( 'should resolve indepedent results', function() {
					return fount.resolve( [ 'o', 'getX' ], 'custom' )
						.should.eventually.eql( { 'o': { x: 10 }, 'getX': 10 } );
				} );
			} );

			describe( 'back to default', function() {
				it( 'should resolve original scoped results', function() {
					return fount.resolve( [ 'o', 'getX' ] )
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
					fount.register( 'one.a', 1 );
					fount( 'two' ).register( 'b', 2 );
				} );

				it( 'should correctly resolve a check across multiple containers', function() {
					fount.canResolve( [ 'one.a', 'two.b' ] ).should.equal( true );
				} );

				it( 'should resolve existing dependency', function() {
					fount.canResolve( 'met' ).should.equal( true );
				} );

				it( 'should not resolve missing dependency', function() {
					fount.canResolve( 'unmet' ).should.equal( false );
				} );

				it( 'should not resolve missing dependency in non-default container from NPM', function() {
					fount.canResolve( "special.when" ).should.equal( false );
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

	describe( 'when resolving across multiple containers', function() {
		before( function() {
			fount.register( 'three.a', 3 );
			fount( 'three' ).register( 'b', 4 );
			fount( 'three' ).register( 'c', 4.5 );
			fount.register( 'four.c', 5 );
		} );

		it( 'should resolve correct values', function() {
			fount.resolve( [ 'three.a', 'three.b', 'four.c' ], function( results ) {
				return results;
			} ).should.eventually.eql( {
				'three.a': 3,
				'three.b': 4,
				'four.c': 5
			} );
		} );
	} );

	after( function() {
		fount.purgeAll();
	} );
} );
