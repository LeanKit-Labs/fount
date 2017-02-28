require( './setup' );
var fount = require( '../src/index.js' );

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
			console.log( "uh", arguments );
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
