## 1.x.x

### 1.0.0

Proposed official release:

 * enables multi-level namespaces
 * adds feature to get list of keys
 * removes when as a dependency
 * attempts to clean up some of the functions and eliminate repeated logic

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
