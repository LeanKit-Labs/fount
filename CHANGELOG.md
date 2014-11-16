### 0.0.6
 * Fix bug where things like sinon.stub cause dependency check to throw an exception
 * When a function's dependencies cannot be resolved, return the function rather than throw an exception