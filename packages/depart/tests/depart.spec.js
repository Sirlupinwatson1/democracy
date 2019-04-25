'use strict'
const fs    = require('fs')
const path  = require('path')
const utils = require('demo-utils')

const { DB_DIR, COMPILES_DIR, LINKS_DIR, DEPLOYS_DIR } = utils
const { isCompile, isLink, isDeploy } = require('demo-contract')
const { Map } = require('immutable')
const assert = require('chai').assert

const { depart } = require('..')

describe( 'Departures', () => {
  
  let eth = utils.getNetwork()
  let chainId
  let accounts
  let cleaner
  let result

  before(async () => {
   accounts = await eth.accounts()
   chainId = await eth.net_version()
  })

  it( 'executing a simple departure', async () => {
    result = await depart({
      name: "simple-departure",
      address: accounts[1],
      sourcePath: "../../node_modules/demo-test-contracts/contracts",
      callback: async (compile, link, deploy) => {
        const cout = await compile( 'DifferentSender', 'DifferentSender.sol' )
        isCompile(cout)
        const lout = await link( 'DifferentSender', 'link' )
        isLink(lout)
        const dout = await deploy( 'DifferentSender', 'link', 'deploy', new Map({}), true )
        isDeploy(dout)
        return true
      }
    })
    assert(Map.isMap(result.compiles))
    assert(Map.isMap(result.links))
    assert(Map.isMap(result.deploys))
    assert.typeOf(result.result, 'boolean')
    assert(result.result)
    assert.typeOf(result.cleaner, 'function')
    assert(fs.existsSync(path.join(DB_DIR, COMPILES_DIR, 'DifferentSender.json')))
    assert(fs.existsSync(path.join(DB_DIR, LINKS_DIR, 'DifferentSender-link.json')))
    assert(fs.existsSync(path.join(DB_DIR, DEPLOYS_DIR, chainId, 'DifferentSender-deploy.json')))
  })

  it( 'cleans', async () => {
    await result.cleaner()
  })

  it( 'cleaning happens', async () => {
    assert.notOk(fs.existsSync(path.join(DB_DIR, COMPILES_DIR, 'DifferentSender.json')))
    assert.notOk(fs.existsSync(path.join(DB_DIR, LINKS_DIR, 'DifferentSender-link.json')))
    assert.notOk(fs.existsSync(path.join(DB_DIR, DEPLOYS_DIR, 'DifferentSender-deploy.json')))
  })

})
