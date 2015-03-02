var gulp = require( 'gulp' );
var mocha = require( 'gulp-mocha' );
var istanbul = require( 'gulp-istanbul' );
var open = require( 'open' );
var allSrcFiles = './src/**/*.js';
var allSpecFiles = './spec/*.spec.js';

gulp.task( 'test', function() {
	gulp.src( allSpecFiles )
		.pipe( mocha( { reporter: 'spec' } ) )
		.on( 'error', function( err ) {
			console.log( err.stack );
		} );
} );

gulp.task( 'coverage', function( cb ) {
	return gulp.src( [ allSrcFiles ] )
		.pipe( istanbul() )
		.pipe( istanbul.hookRequire() )
		.on( 'finish', function() {
			gulp.src( [ allSpecFiles ] )
				.pipe( mocha() )
				.pipe( istanbul.writeReports() );
		} );
} );

gulp.task( 'show-coverage', [ 'coverage' ], function( cb ) {
	open( './coverage/lcov-report/index.html' );
	cb();
} );

gulp.task( 'watch', function() {
	gulp.watch( [ allSrcFiles, './spec/**' ], [ 'test' ] );
} );

gulp.task( 'default', [ 'test', 'watch' ], function() {} );
