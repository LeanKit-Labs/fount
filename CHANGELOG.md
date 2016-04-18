## 0.2.x

### 0.2.0

 * bug fix - inject and resolve across multiple containers now works correctly
 * functions that can't be resolved in static or scoped lifecycles immediately will be once all dependencies become available
 * don't backfill dependencies from NPM for non-default containers

## 0.1.X

### 0.1.1

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
