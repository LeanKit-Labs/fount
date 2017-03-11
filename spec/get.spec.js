require( './setup' );
var fount = require( '../src/index.js' );

describe( 'Get', function() {
  before( function() {
    fount.setModule( module );
  } );

  describe( 'with dependencies', function() {
    before( function() {
      fount.register( 'an value!', 'ohhai' );
    } );

    it( 'should get correctly', function() {
      fount.get( 'an value!' )
        .should.equal( 'ohhai' );
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

    it( 'should get the stub as a function', function() {
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

    it( 'should get the stub as a function', function() {
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

        it( 'should get the function\'s result', function() {
          this.timeout( 100 );
          fount.get( 'simpleFn' )
            .should.equal( 'hello, world!' );
        } );
      } );

      describe( 'when registered as a value', function() {
        before( function() {
          fount.registerAsValue( 'simpleFn2', function() {
            return 'hello, world!';
          } );
        } );

        it( 'should get to the function', function() {
          this.timeout( 100 );
          var fn = fount.get( 'simpleFn2' );
          fn().should.equal( 'hello, world!' );
        } );
      } );
    } );



    describe( 'with dependency on a list', function() {
      before( function() {
        fount.register( 'simpleList', [ 1, 2, 3 ] );
      } );

      it( 'should get to the list', function() {
        return fount.get( 'simpleList' )
          .should.eql( [ 1, 2, 3 ] );
      } );
    } );

    var a = { one: 1 };

    describe( 'with static lifecycle', function() {
      before( function() {
        fount.register( 'a', function() {
          return a;
        } );
        fount.register( 'b', 2 );
        fount.register( 'c', function( b ) { return b + 1; } );
        fount.register( 'line', [ 'a', 'b', 'c' ], function( a, b, c ) {
          return 'easy as ' + a.one + ', ' + b + ', ' + c + '!';
        } );

      } );

      it( 'should get function\'s dependencies', function() {
        return fount.get( 'line' )
          .should.equal( 'easy as 1, 2, 3!' );
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

      it( 'should get to the function if called before dependencies are registered', function() {
        return fount.get( 'delayed' )
          .should.eventually.eql( delayed );
      } );

      describe( 'after dependencies are registered', function() {
        before( function() {
          fount.register( 'a2', 1 );
          fount.register( 'b2', 10 );
          fount.register( 'c2', 100 );
        } );

        it( 'should get to function result', function() {
          return fount.get( 'delayed' )
            .should.eventually.eql( 111 );
        } );

        it( 'should not call function after initial resolution', function() {
          fount.get( 'delayed' ).should.eql( 111 );
          calls.should.eql( 1 );
        } );
      } );
    } );

    describe( 'when modifying static dependency', function() {
      before( function() {
        a.one = 'DURP';
      } );

      it( 'should get to original value', function() {
        return fount.get( 'line' )
          .should.equal( 'easy as 1, 2, 3!' );
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

        return fount.get( 'getX', 'testScope' );

      } );

      it( 'should get correctly', function() {
        return fount.get( 'getX', 'testScope' )
          .should.equal( 1 );
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

        it( 'should get correctly', function() {
          return fount.get( [ 'o', 'getX' ] )
            .should.eql( { 'o': { x: 1 }, 'getX': 1 } );
        } );
      } );

      describe( 'in scope custom', function() {
        before( function() {
          obj.x = 10;
        } );

        it( 'should get indepedent results', function() {
          return fount.get( [ 'o', 'getX' ], 'custom' )
            .should.eql( { 'o': { x: 10 }, 'getX': 10 } );
        } );
      } );

      describe( 'back to default', function() {
        it( 'should get original scoped results', function() {
          return fount.get( [ 'o', 'getX' ] )
            .should.eql( { 'o': { x: 1 }, 'getX': 1 } );
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

        it( 'should get correctly', function() {
          return fount.get( [ 'o2', 'getX2' ] )
            .should.eql( { 'o2': { x: 1 }, 'getX2': 1 } );
        } );
      } );

      describe( 'after changing property', function() {
        it( 'should get to new result showing change', function() {
          obj.x = 10;
          return fount.get( [ 'o2', 'getX2' ] )
            .should.eql( {
            'o2': { x: 10 }, 'getX2': 10
          } );
        } );
      } );
    } );

    describe( 'when checking to see if key can be getd', function() {
      describe( 'with existing and missing dependencies', function() {
        var result;
        before( function() {
          fount.register( 'met', 'true' );
          fount.register( 'one.a', 1 );
          fount( 'two' ).register( 'b', 2 );
        } );

        it( 'should correctly get a check across multiple containers', function() {
          fount.canResolve( [ 'one.a', 'two.b' ] ).should.equal( true );
        } );

        it( 'should get existing dependency', function() {
          fount.canResolve( 'met' ).should.equal( true );
        } );

        it( 'should not get missing dependency', function() {
          fount.canResolve( 'unmet' ).should.equal( false );
        } );

        it( 'should not get missing dependency in non-default container from NPM', function() {
          fount.canResolve( "special.when" ).should.equal( false );
        } );
      } );
    } );

    describe( 'when resolving missing keys', function() {
      it( 'should throw meaningful error message', function() {
        return should.throw( function() {
          fount.get( [ 'lol', 'rofl' ] );
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

    it( 'should get correct values', function() {
      fount.get( [ 'three.a', 'three.b', 'four.c' ], function( results ) {
        return results;
      } ).should.eql( {
        'three.a': 3,
        'three.b': 4,
        'four.c': 5
      } );
    } );
  } );

  describe( 'when registering and resolving 10k of keys', () => {
    it( 'should register 10k keys in the same container in 50 ms', () => {
      let container = fount( 'new.sync' );
      let time = Date.now();
      for (let i = 1; i < 10000; i++) {
        container.register( `${i}`, i );
      }
      let elapsed = Date.now() - time;
      elapsed.should.be.lessThan( 50 );
    } );

    it( 'should resolve 10k keys from the same container in 100 ms', () => {
      let container = fount( 'new.sync' );
      let time = Date.now();
      for (var i = 1; i < 10000; i++) {
        container.get( `${i}` ).should.equal( i );
      }
      let elapsed = Date.now() - time;
      elapsed.should.be.lessThan( 100 );
    } );
  } );

  after( function() {
    fount.purgeAll();
  } );
} );
