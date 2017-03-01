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
			fount( 'one' ).register( 'x', 100 );
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

	describe( 'when requesting key list', function() {
		it( 'should return the list of keys', function() {
			fount( { 'three' : { 'sub.x': 1 } } );
			fount( 'one' ).keys().should.eql( [ 'x' ] );
			fount( 'two' ).keys().should.eql( [ 'x' ] );
			fount.keys().should.eql( [ 'x', 'one.x', 'two.x', 'three.sub.x' ] );
		} );
	} );

	describe( 'when requesting a container list', function() {
		it( 'should return a list of containers', function() {
			fount.containers().should.eql( [ 'default', 'one', 'two', 'three.sub' ] );
		} );
	} );

	describe( 'when checking for missing keys', function() {
		before( function() {
			try { fount.get( "a.missing.key" ); } catch( e ) {}
			fount.canResolve( "another.bogus.key" );
		} );

		it( 'should not create empty containers', function() {
			fount.containers().should.eql( [ 'default', 'one', 'two', 'three.sub' ] );
		} );
	} );

	describe( 'when purging a container', function() {
		before( function() {
			fount.purge( 'one' );
		} );

		it( 'should remove container', function() {
			fount.containers().should.eql( [ 'default', 'two', 'three.sub' ] );
		} );

		it( "no longer report container keys resolvable", () => {
		  fount.canResolve( 'one.x' ).should.equal.false;
		} );
	} );
} );
