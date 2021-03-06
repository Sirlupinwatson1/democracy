#!/usr/bin/env node
'use strict'
const lib = require('demo-aztec-cli')
const { Map, List } = require('immutable')
const { assert } = require('chai')
require('colors')
const { makeMapType } = require('demo-transform')

const pipelineName = process.argv[2] ||
  (console.log('No pipeline name provided') && process.exit(1))

console.log('PipelineName', pipelineName)
const pipeline = lib[pipelineName]
  
const mergeTypes = (firstTypes, secondTypes) => {
  const mergedTypes = firstTypes.mergeDeep(secondTypes)
  return mergedTypes.map((v, k) => {
    if (v['childTypes']) {
      const firstType = firstTypes.get(k)
      const secondType = secondTypes.get(k)
      const firstChildTypes = firstType   ? (Map.isMap(firstType['childTypes'])  ? firstType['childTypes']  : firstTypes.get(k))  : Map({})
      const secondChildTypes = secondType ? (Map.isMap(secondType['childTypes']) ? secondType['childTypes'] : secondTypes.get(k)) : Map({})
      return makeMapType(firstChildTypes.mergeDeep(secondChildTypes), '')
    } else {
      return v
    }
  })
}

const printType = (type, indent='', mergedTypes) => {
  type.map((v,k) => {
    const color = (mergedTypes && mergedTypes.has(k) && ((mergedTypes.get(k).typeName === v.typeName) || Map.isMap(v.childTypes)) || v.typeName.endsWith('?')) ?
      'gray' : 'red'

    if (v.childTypes) {
      process.stdout.write((indent + k)[color].yellowBG + ":")
      process.stdout.write('('.yellow)
      printType(v.childTypes, '  ', mergedTypes.get(k, {childTypes: Map({})}).childTypes)
      process.stdout.write(')'.yellow)
    } else {
      process.stdout.write((indent + k)[color] + ":")
      process.stdout.write((indent + ':' + v.typeName).blue + '\t' )
    }
  })
}

let mergedTypes = Map({})

pipeline.entrySeq().forEach((tuple,i) => {
  const v = tuple[1]
  const k = tuple[0]
  console.log(`\nPIPE ${i}: ${k}`.greenBG)
  if (!v) {
    console.log(`No transform ${v} for ${k}`)
    return
  }

  const inputTypes = (Array.isArray(v)) ?
    List(v).reduce((s,v) => s.merge(v.transform.inputTypes), Map({})) :
    v.transform.inputTypes
  const outputTypes = (Array.isArray(v)) ?
    List(v).reduce((s,v) => s.merge(v.transform.outputTypes), Map({})) :
    v.transform.outputTypes

  if (!inputTypes || inputTypes.count() == 0) {
    console.log(v)
    console.log(`No inputTypes found for ${k}`)
    return
  }
  if (!outputTypes) {
    console.log(`No outputTypes found for ${k}`)
    return
  }
  
  process.stdout.write(` in : `.blue.cyanBG)
  printType(inputTypes, '', mergedTypes)
  // First pipe's inputTypes are the 0th output types
  if (String(i) === '0') {
    mergedTypes = mergedTypes.mergeDeep(inputTypes)
  }
  process.stdout.write('\t\t')
  process.stdout.write(` out: `.cyan.blueBG)
  let sellerMap
  mergedTypes = mergeTypes( mergedTypes, outputTypes )
  printType(outputTypes, '', outputTypes)
})
