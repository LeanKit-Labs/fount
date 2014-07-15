var gulp = require( 'gulp' ),
	mocha = require( 'gulp-mocha' );

gulp.task( 'test', function() {
	gulp.src( './spec/*.spec.js' )
		.pipe( mocha( { reporter: 'spec' } ) )
		.on( 'error', function( err ) { console.log( err.stack ); } );
} );

gulp.task( 'watch', function() {
	gulp.watch( [ './src/**', './spec/**' ], [ 'test' ] );
} );

gulp.task( 'default', [ 'test', 'watch' ], function() {
} );