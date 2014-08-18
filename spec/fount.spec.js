var should = require( 'should' );
var when = require( 'when' );
var fount = require( '../src/index.js' );

describe( 'when resolving values', function() {
	var result;
	fount.register( 'an value!', 'ohhai' );
	
	before( function( done ) {
		this.timeout( 100 );
		fount.resolve( 'an value!' ).then( function( value ) {
			result = value;
			done();
		} );
	} );

	it( 'should resolve correctly', function() {
		result.should.equal( 'ohhai' );
	} );
} );

describe( 'when resolving functions', function() {
	
	describe( 'without dependencies', function() {

		var result;
		fount.register( 'simpleFn', function() { return 'hello, world!'; } );

		before( function( done ) {
			this.timeout( 100 );
			fount.resolve( 'simpleFn' ).then( function( value ) {
				result = value;
				done();
			} );
		} );

		it( 'should resolve the function\'s result', function() {
			result.should.equal( 'hello, world!' );
		} );
	} );

	describe( 'with dependency on a list', function() {
		var result;
		fount.register( 'simpleList', [ 1, 2, 3 ] );

		before( function( done ) {
			fount.resolve( 'simpleList' )
				.then( function( list ) {
					result = list;
					done();
				} );
		} );

		it( 'should resolve to the list', function() {
			result.should.eql( [ 1, 2, 3 ] );
		} );
	} );

	var a = { one: 1 };

	describe( 'with static lifecycle', function() {
		var result;
		fount.register( 'a', function() { return a; } );
		fount.register( 'b', 2 );
		fount.register( 'c', when.promise( function( resolve ) { resolve( 3 ); } ) );
		fount.register( 'line', [ 'a', 'b', 'c' ], function( a, b, c ) {
			return 'easy as ' + a.one + ', ' + b + ', ' + c + '!';
		} );

		before( function( done ) {
			fount.resolve( 'line' ).then( function( value ) {
				result = value;
				done();
			} );
		} );

		it( 'should resolve function\'s dependencies', function() {
			result.should.equal( 'easy as 1, 2, 3!' );
		} );
	} );

	describe( 'when modifying static dependency', function() {
		before( function( done ) {
			a.one = 'DURP';
			fount.resolve( 'line' ).then( function( value ) {
				result = value;
				done();
			} );
		} );

		it( 'should resolve to original value', function() {
			result.should.equal( 'easy as 1, 2, 3!' );
		} );
	} );

	describe( 'with multiple scopes', function() {
		var obj = { x: 1 };
		describe( 'in scope default', function() {
			var results;
			fount.register( 'o', function() { return obj; }, 'scoped' );
			
			fount.register( 'getX', [ 'o' ], function( o ) {
				return o.x;
			}, 'scoped' );

			before( function( done ) {
				fount.resolve( [ 'o', 'getX' ] ).then( function( value ) {
					results = value;
					done();
				} );
			} );

			it( 'should resolve correctly', function() {
				results.should.eql( { 'o': { x: 1 }, 'getX': 1 } );
			} );
		} );

		describe( 'in scope custom', function() {
			var results;
			before( function( done ) {
				obj.x = 10;
				fount.resolve( [ 'o', 'getX' ], 'custom' ).then( function( value ) {
					results = value;
					done();
				} );
			} );

			it( 'should resolve indepedent results', function() {
				results.should.eql( { 'o': { x: 10 }, 'getX': 10 } );
			} );
		} );

		describe( 'back to default', function() {
			var results;
			before( function( done ) {
				fount.resolve( [ 'o', 'getX' ] ).then( function( value ) {
					results = value;
					done();
				} );
			} );

			it( 'should resolve original scoped results', function() {
				results.should.eql( { 'o': { x: 1 }, 'getX': 1 } );
			} );
		} );
	} );

	describe( 'with factory lifecycle', function() {
		var obj = { x: 1 };
		describe( 'in scope default', function() {
			var results;
			fount.register( 'o2', function() { return obj; }, 'factory' );
			fount.register( 'getX2', [ 'o2' ], function( o ) {
				return o.x;
			}, 'factory' );

			before( function( done ) {
				fount.resolve( [ 'o2', 'getX2' ] ).then( function( value ) {
					results = value;
					done();
				} );
			} );

			it( 'should resolve correctly', function() {
				results.should.eql( { 'o2': { x: 1 }, 'getX2': 1 } );
			} );
		} );

		describe( 'after changing property', function() {
			var results;
			before( function( done ) {
				obj.x = 10;
				fount.resolve( [ 'o2', 'getX2' ] ).then( function( value ) {
					results = value;
					done();
				} );
			} );

			it( 'should resolve to new result showing change', function() {
				results.should.eql( { 'o2': { x: 10 }, 'getX2': 10 } );
			} );
		} );
	} );	

} );

describe( 'when injecting', function() {

	var aObj = { value: 1 };
	var b = when.promise( function( r ) { r( 2 ); } );
	var c = function( a, b ) { return a.value + b; };
	var dObj = { value: 5 };
	var d = function() { return dVal; };
	var e = function( c, d ) { return c * d.value; };

	before( function() {
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

	describe( 'with static dependencies', function () {

		describe( 'when resolving', function() {
			var result;
			before( function( done ) {
				fount.inject( [ 'eStatic' ], function( e ) {
					result = e;
				} ).then( function () {
					done();
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
				fount.inject( [ 'eStatic' ], function( e ) {
					result = e;
				} );
			} );

			it( 'should not change', function() {
				result.should.equal( 15 );
			} );
		} );
	} );

	describe( 'with scoped dependencies', function () {

		describe( 'when injecting from default scope', function() {
			var result;
			before( function() {
				aObj.value = 1;
				dObj.value = 5;
				fount.inject( [ 'eScoped' ], function( e ) {
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
				fount.inject( [ 'eScoped' ], function( e ) {
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
				fount.inject( [ 'eScoped' ], function( e ) {
					result = e;
				} );
			} );

			it( 'should produce original scoped result', function() {
				result.should.equal( 15 );
			} );
		} );
	} );

	describe( 'with factory dependencies', function () {

		describe( 'when injecting factory', function() {
			var result;
			before( function() {
				aObj.value = 1;
				dObj.value = 5;
				fount.inject( [ 'eFactory' ], function( e ) {
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
				fount.inject( [ 'eFactory' ], function( e ) {
					result = e;
				} );
			} );

			it( 'should resolve to reflect changes in dependencies', function() {
				result.should.equal( 20 );
			} );
		} );
	} );
} );

describe( 'when injecting without dependency array', function() {
	before( function() {
		fount.purgeAll();
		fount.register( 'one', 1 );
		fount.register( 'two', function() { return 2; } );
		fount.register( 'three', when( 3 ) );
	} );

	describe( 'with a dependency of each type', function() {
		var results;

		before( function( done ) {
			fount.inject( function( one, two, three ) {
				results = [ one, two, three ];
				done();
			} );
		} );

		it( 'should return array of correct values', function() {
			results.should.eql( [ 1, 2, 3 ] );
		} );
	} );
} );

describe( 'when using custom containers', function() {
	describe( 'when resolving values', function() {
		var results;
		
		before( function( done ) {
			fount.register( 'x', 50 );
			fount( 'one' ).register( 'x', 100 );
			fount( 'two' ).register( 'x', 200 );

			when.all( [
				fount.resolve( 'x' ),
				fount( 'one' ).resolve( 'x' ),
				fount( 'two' ).resolve( 'x' )
			] ).then( function ( value ) {
				results = value;
				done();
			} );
		} );

		
		it( 'should resolve all correctly', function() {
			results.should.eql( [ 50, 100, 200 ] );
		} );
	} );

	describe( 'when resolving a list across containers', function() {
		var results;
		
		before( function( done ) {
			fount.purgeAll();
			fount.register( 'x', 50 );
			fount( 'one' ).register( 'one.x', 100 );
			fount( 'two' ).register( 'x', 200 );
			fount.resolve( [ 'x', 'one.x', 'two.x' ] )
				.then( function( value ) {
					results = value;
					done();
				} );
		} );

		
		it( 'should resolve using namespaces correctly', function() {
			results.should.eql( { 'x': 50, 'one.x': 100, 'two.x': 200 } );
		} );
	} );

} );