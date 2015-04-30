require( './setup' );
var fount = require( '../src/index.js' );
var postal = require( 'postal' );

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
