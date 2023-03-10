import * as fs from 'fs'
import * as env from '../.env'
import { ethers } from 'ethers'
import UniswapV2Factory from '@uniswap/v2-core/build/UniswapV2Factory.json'
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import ApprovedTokenManager from '@uniswap/v2-core/build/ApprovedTokenManager.json'

interface ContractInstance {
  Address: string
  Source: string
  MetaData: string
  ConstructorArguements: string
}

async function verifySourceCode(
  contractAddr: string,
  contractName: string,
  constructorArguements: string,
  metadataStr: string,
  sourceCode: string
) {
  let metadata = JSON.parse(metadataStr)

  var myHeaders = new Headers()
  myHeaders.append('Content-Type', 'application/x-www-form-urlencoded')

  let params = new URLSearchParams()
  // https://docs.etherscan.io/tutorials/verifying-contracts-programmatically
  params.append('apikey', env.ETHERSCAN_APIKEY)
  params.append('module', 'contract')
  params.append('action', 'verifysourcecode')
  params.append('contractaddress', contractAddr)
  params.append('contractname', contractName)
  params.append('codeformat', 'solidity-single-file')
  params.append('sourcecode', sourceCode)
  params.append('constructorArguements', constructorArguements)
  params.append('compilerversion', 'v' + metadata.compiler.version)
  params.append('optimizationused', metadata.settings.optimizer.enabled ? '1' : '0')
  params.append('runs', metadata.settings.optimizer.runs.toString())
  params.append('licenseType', '5')
  await fetch(env.ETHERSCAN_URL, {
    method: 'POST',
    headers: myHeaders,
    body: params,
    redirect: 'follow'
  })
    .then(async response => {
      let json = await response.json()
      if (json['status'] != 1) {
        console.info(`failed to verify contract at ${contractAddr}: ${JSON.stringify(json)}`)
        return
      }

      await new Promise(resolve => setTimeout(resolve, 10000))
      let params = new URLSearchParams()
      // https://docs.etherscan.io/tutorials/verifying-contracts-programmatically
      params.append('apikey', env.ETHERSCAN_APIKEY)
      params.append('module', 'contract')
      params.append('action', 'checkverifystatus')
      params.append('guid', json['result'])
      await fetch(env.ETHERSCAN_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: params,
        redirect: 'follow'
      }).then(async response => {
        let json = await response.json()
        if (json['status'] != 1) {
          console.info(`failed to verify contract at ${contractAddr}: ${JSON.stringify(json)}`)
          return
        }
        console.info(`succeeded to verify contract at ${contractAddr}: ${json.result}`)
      })
    })
    .catch(err => {
      console.info(`failed to verify contract at ${contractAddr}: ${err}`)
      return
    })
}

async function main() {
  let rawdata = fs.readFileSync('./contract.json')
  let contractMap = JSON.parse(rawdata.toString())

  Object.keys(contractMap).forEach(async key => {
    var sourceCode = fs.readFileSync(contractMap[key].SourceFile).toString('utf-8')
    await verifySourceCode(
      contractMap[key].Address,
      key,
      contractMap[key].ConstructorArguements,
      ApprovedTokenManager.metadata,
      sourceCode
    )
    await new Promise(resolve => setTimeout(resolve, 1000))
  })
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
