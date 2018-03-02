# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="1.1.4"></a>
## [1.1.4](https://github.com/arobson/fount/compare/v1.1.3...v1.1.4) (2018-03-02)


### Bug Fixes

* update fauxdash to latest to support function arg parsing during code coverage testing ([bf79070](https://github.com/arobson/fount/commit/bf79070))



<a name="1.1.3"></a>
## [1.1.3](https://github.com/arobson/fount/compare/v1.1.2...v1.1.3) (2017-07-16)


### Bug Fixes

* use fauxdash argument parse to determine function argument dependencies ([225b18d](https://github.com/arobson/fount/commit/225b18d))



<a name="1.1.2"></a>
## [1.1.2](https://github.com/arobson/fount/compare/v1.1.1...v1.1.2) (2017-07-16)


### Bug Fixes

* bump version of fauxdash to fix argument parsing for default values ([2a790af](https://github.com/arobson/fount/commit/2a790af))



<a name="1.1.1"></a>
## [1.1.1](https://github.com/arobson/fount/compare/v1.1.0...v1.1.1) (2017-07-14)


### Bug Fixes

* add missing dependency to package.json ([5df5910](https://github.com/arobson/fount/commit/5df5910))



<a name="1.1.0"></a>
# [1.1.0](https://github.com/arobson/fount/compare/v1.0.1...v1.1.0) (2017-07-14)


### Features

* move common utility functions out to fauxdash ([47e036d](https://github.com/arobson/fount/commit/47e036d))



<a name="1.0.1"></a>
## 1.0.1 (2017-07-13)


### Bug Fixes

* clean up formatting and const vs let ([7f410ca](https://github.com/arobson/fount/commit/7f410ca))
* named container canResolve is now bound correctly ([cca7740](https://github.com/arobson/fount/commit/cca7740))



<a name="1.0.0"></a>
## 1.0.0 (2017-07-08)

* clean up formatting and const vs let ([7f410ca](https://github.com/LeanKit-Labs/fount/commit/7f410ca))
* adds synchronous dependency resolution
* enables multi-level namespaces
* adds feature to get list of keys
* removes dependencies on when and lodash
* eliminates a memory leak caused by adding containers when checking fornon-existing keys/namespaces
* attempts to clean up some of the functions and eliminate repeated logic
* add's travis CI and coveralls
* drops gulp

## 0.2.x

### 0.2.0
 * bug fix - inject and resolve across multiple containers now works correctly
 * improvement - functions that can't be resolved in static or scoped lifecycles immediately will be once all dependencies become available
 * feature - add a way to register function as value without a wrapper
 * NPM modules
 	* don't auto-backfill dependencies from NPM anymore, it's kinda gross
 	* provide ability to grab an "ambient" module from the require cache

## 0.1.X

 * #10 - Calls to previously resolved scope/key pairs return promises for consistency

### 0.1.0

 * #7 - Add better error reporting - include all unresolvable keys
 * #6 - Export canResolve to allow consumers to check in advance
 * Backfill dependencies from NPM modules when available
 * Add support for bulk registration

## 0.0.X

### 0.0.6
 * Fix bug where things like sinon.stub cause dependency check to throw an exception
 * When a function's dependencies cannot be resolved, return the function rather than throw an exception
