const path = require('path')
const chai = require('chai')
chai.use(require('chai-as-promised'))
global.should = chai.should()
global.expect = chai.expect
global._ = require('lodash')
global.sinon = require('sinon')

function findParent (mod) {
  if (mod.parent) {
    return findParent(mod.parent)
  } else {
    return mod
  }
}

var parent = findParent(module)
parent.paths.push(path.join(process.cwd(), 'node_modules'))
