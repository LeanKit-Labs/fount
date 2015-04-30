require( './setup' );
var fount = require( '../src/index.js' );

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
