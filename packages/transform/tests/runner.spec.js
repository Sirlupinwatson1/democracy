'use strict'

const assert = require('chai').assert
const { run, argListMixin, deployerMixin } = require('../src/runner')

const { immEqual, fromJS, getNetwork, Logger } = require('demo-utils')
const { wallet } = require('demo-keys')
const { Map } = require('immutable')
const LOGGER = new Logger('tests/runner')

describe( 'Runners', () => {

  it( 'creates an arglist mixin', async () => {
  
    // Test reading default values for argList, with no argv's passed in
    const alm0 = await argListMixin(Map({'anotherThing': 2, 'babaloo': 'eighteen'}))
    const out0 = await alm0(Promise.resolve(Map({})))
    assert.equal( out0.get('anotherThing'), 2 )
    assert.equal( out0.get('babaloo'), 'eighteen' )

    // Test reading the argv's
    process.argv.push('--anotherThing', 'a', '--babaloo', '0x1010')
    const alm = await argListMixin(Map({'anotherThing': 2, 'babaloo': 'eighteen'}))
    const out = await alm(Promise.resolve(Map({})))
    assert.equal( out.get('anotherThing'), 'a' )
    assert.equal( out.get('babaloo'), '0x1010' )
  
    // Runs a function with mixins, depends on process.argv above
    const alm2 = await argListMixin(Map({
      'anteater': 'c', 'bugbear': undefined,
      'unlockSeconds': 1, 'testAccountIndex': 0, 'testValueETH': '0.1'
    }))
    const dm = await deployerMixin()
    const mainFunc = async (finalStateProm) => {
      const finalState = await finalStateProm
      assert.equal( finalState.get('chainId'), '2222' )
      assert.equal( finalState.get('anteater'), 'c' )
    }
    await run( [ alm2, dm, mainFunc] ) 
  })  

  it( 'creates a deployer mixin', async () => {
    const alm3 = await argListMixin(Map({
      'unlockSeconds': 1, 'testAccountIndex': 0, 'testValueETH': '0.1'
    }))
    const dm = await deployerMixin()
    const out = await dm(await alm3())
    assert.equal( out.get('deployerAddress').length, 42 )
    assert.equal( out.get('deployerPassword').length, 64 )
    const actualId = await out.get('deployerEth').net_version()
    const expectedId = await getNetwork().net_version() 
    assert.equal( expectedId, actualId )
  })

  it( 'preserves deployer address and password in deployer mixin', async () => {
    const { address, password } = await wallet.createEncryptedAccount()
    const alm = await argListMixin(Map({
      'unlockSeconds': 1, 'testAccountIndex': 0, 'testValueETH': '0.1',
      'deployerAddress': address, 'deployerPassword': password,
    }))
    const dm = await deployerMixin()
    const out1 = await alm()
    assert.equal( out1.get('deployerAddress'), address )
    assert.equal( out1.get('deployerPassword'), password )
    const out = await dm(out1)
    assert.equal( out.get('deployerAddress'), address )
    assert.equal( out.get('deployerPassword'), password )
  })

  it( 'merges a parallel list of mixins', async () => {
    const siblingMixin = (keyPrefix, timeout) => {
      return async (state) => {
        const { lastKey } = state.toJS()
        const returnMap = {}
        returnMap[keyPrefix + 'Address'] = '0x123'
        returnMap[keyPrefix + 'Password'] = '0x456'
        returnMap[keyPrefix + 'StartTime'] = Date.now()
        returnMap['lastKey'] = keyPrefix
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            returnMap[keyPrefix + 'EndTime'] = Date.now()
            resolve(Map(returnMap))
          }, timeout)
        })
      }
    }

    const m2 = async (state) => {
      const { senderEndTime, receiverEndTime } = state.toJS()
      return Map({
        timeDiff: receiverEndTime - senderEndTime
      })
    }

    const m0 = siblingMixin('sender', 1000)
    const m1 = siblingMixin('receiver', 1500)
    const finalState = await run( [ [ m0, m1 ], m2 ] )

    assert.equal(finalState.get('senderAddress'), '0x123')
    assert.equal(finalState.get('receiverAddress'), '0x123')
    assert(finalState.has('lastKey'))
    assert(finalState.get('receiverEndTime')  - finalState.get('senderEndTime') < 700)
    assert.equal(finalState.get('timeDiff'), finalState.get('receiverEndTime')  - finalState.get('senderEndTime'))
    assert.equal(finalState.count(), 10)
  })

  it( 'merges substates deeply', async () => {
    const subMixin = (keyPrefix, timeout, subStateLabel) => {
      return async (state) => {
        const { lastKey } = state.toJS()
        const returnMap = {}
        returnMap[keyPrefix + 'Address'] = '0x123'
        returnMap[keyPrefix + 'Password'] = '0x456'
        returnMap[keyPrefix + 'StartTime'] = Date.now()
        returnMap['lastKey'] = keyPrefix
        let out
        if (subStateLabel) { 
          out = {}
          out[subStateLabel] = returnMap
        } else {
          out = returnMap
        }
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            returnMap[keyPrefix + 'EndTime'] = Date.now()
            resolve(fromJS(out))
          }, timeout)
        })
      }
    }

    const m2 = async (state) => {
      const { sub: { senderEndTime } , bass: { receiverEndTime } } = state.toJS()
      return Map({
        lastKey : 'no im the only one',
        timeDiff: receiverEndTime - senderEndTime
      })
    }

    const m0 = subMixin('sender'   , 1000, 'sub')
    const m1 = subMixin('receiver' , 1500, 'bass')
    const m3 = subMixin('niece'    , 500 , 'sub')
    const m4 = subMixin('nephew'   , 700 , 'bass')

    const m5 = subMixin('ommer', 300, 'bass')
    
    const initialState = Map({ survivor: "I am" })

    const finalState = await run( [ async() => initialState, [ m0, m1 ], [ m3, m4 ], m2, m5 ] )

    const sub = finalState.get('sub')
    const bass = finalState.get('bass')

    assert.equal(sub.get('senderAddress')   , '0x123')
    assert.equal(sub.get('nieceAddress')    , '0x123')
    assert.equal(bass.get('receiverAddress'), '0x123')
    assert.equal(bass.get('nephewAddress')  , '0x123')
    assert.equal(bass.get('ommerAddress')   , '0x123')
    assert(finalState.has('lastKey'))
    assert(bass.get('receiverEndTime')  - sub.get('senderEndTime') < 700)
    assert.equal(finalState.get('timeDiff'), bass.get('receiverEndTime')  - sub.get('senderEndTime'))
    assert.equal( finalState.count(), 5 )
    assert.equal( finalState.get('survivor'), 'I am', `Main state initial key does not survive parallel substates` )
  }) 

})

