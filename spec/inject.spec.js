require( './setup' );
var fount = require( '../src/index.js' );

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

		describe( 'when injecting from multiple containers', function() {
			before( function() {
				fount.register( 'three.a', 3 );
				fount( 'three' ).register( 'b', 4 );
				fount.register( 'four.c', 5 );
			} );

			it( 'should resolve to correct values', function() {
				fount.inject( [ 'three.a', 'three.b', 'four.c' ], function( x, y, z ) {
					return x + y + z;
				} ).should.eventually.eql( 12 );
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

		describe( 'when resolving across multiple containers', function() {
			before( function() {
				fount.register( 'three.a', 3 );
				fount( 'three' ).register( 'b', 4 );
				fount( 'three' ).register( 'c', 4.5 );
				fount.register( 'four.c', 5 );
			} );

			it( 'should resolve correct values', function() {
				fount.inject( function( three_a, three_b, four_c ) {
					return three_a + three_b + four_c;
				} ).should.eventually.eql( 12 );
			} );
		} );
	} );
} );
