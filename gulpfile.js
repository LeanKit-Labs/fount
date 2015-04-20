var gulp = require( 'gulp' );
var bg = require( 'biggulp' )( gulp );

gulp.task( 'coverage', bg.withCoverage() );

gulp.task( 'coverage-watch', function() {
	bg.watch( [ 'coverage' ] );
} );

gulp.task( 'show-coverage', bg.showCoverage() );

gulp.task( 'continuous-specs', function() {
	return bg.test();
} );

gulp.task( 'specs-watch', function() {
	bg.watch( [ 'continuous-specs' ] );
} );

gulp.task( 'test-and-exit', function() {
	return bg.testOnce();
} );

gulp.task( 'default', [ 'coverage', 'coverage-watch' ], function() {} );
gulp.task( 'specs', [ 'continuous-specs', 'specs-watch' ], function() {} );
gulp.task( 'test', [ 'test-and-exit' ] );
