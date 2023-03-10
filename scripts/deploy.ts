import * as fs from 'fs'
import * as path from 'path'
import {Wallet, Contract, ContractFactory, ethers} from 'ethers'
import { TransactionResponse, JsonRpcProvider, TransactionReceipt } from '@ethersproject/providers'
import { BigNumber } from '@ethersproject/bignumber'
import { defaultAbiCoder } from '@ethersproject/abi'
import UniswapV2Factory from '@uniswap/v2-core/build/UniswapV2Factory.json'
import UniswapV2Pair from '@uniswap/v2-core/build/UniswapV2Pair.json'
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import ApprovedTokenManager from '@uniswap/v2-core/build/ApprovedTokenManager.json'
import * as env from '../.env'

import UniswapV2Router02 from '../build/UniswapV2Router02.json'

interface ContractInstance {
  Address: string
  SourceFile: string
  MetaData: string
  ConstructorArguements: string
}
async function main() {
  let contractMap = new Map<string, ContractInstance>()

  // wallet
  const provider = new ethers.providers.JsonRpcProvider(env.WEB3_URL)
  const wallet = new ethers.Wallet(env.WALLET_KEY, provider)

  console.info('address: ', wallet.address)
  await provider.getBalance(wallet.address).then((value: BigNumber) => {
    console.info('ETH: ', value.div(BigNumber.from(10).pow(15)).toNumber() / 1000)
  })

  console.info('deploy ApprovedTokenManager')
  const approvedTokenManager = await new ContractFactory(ApprovedTokenManager.abi, ApprovedTokenManager.bytecode)
    .connect(wallet)
    .deploy()
    .then(async (c: Contract) => {
      return await c.deployed()
    })
  console.info('\taddress: ', approvedTokenManager.address)
  contractMap.set('ApprovedTokenManager', {
    Address: approvedTokenManager.address,
    SourceFile: 'node_modules/@uniswap/v2-core/flatten/ApprovedTokenManager.sol',
    MetaData: ApprovedTokenManager.metadata,
    ConstructorArguements: ''
  })

  console.info('deploy UniswapV2Factory')
  const factory = await new ContractFactory(UniswapV2Factory.abi, UniswapV2Factory.bytecode)
    .connect(wallet)
    .deploy(wallet.address)
    .then(async (c: Contract) => {
      return await c.deployed()
    })
  console.info('\taddress: ', factory.address)
  contractMap.set('UniswapV2Factory', {
    Address: factory.address,
    SourceFile: 'node_modules/@uniswap/v2-core/flatten/UniswapV2Factory.sol',
    MetaData: UniswapV2Factory.metadata,
    ConstructorArguements: defaultAbiCoder.encode(['address'], [wallet.address]).substring(2)
  })

  console.info('create WETH/USDT pair')
  await factory
    .createPair(env.WETH_TOKEN, env.USDT_TOKEN)
    .then(async (tx: TransactionResponse) => {
      return await tx.wait()
    })
    .then((receipt: any) => {
      console.info('\tpair(WETH/USDT): ', receipt.events[0].args.pair)
      contractMap.set('UniswapV2Pair', {
        Address: receipt.events[0].args.pair,
        SourceFile: 'node_modules/@uniswap/v2-core/flatten/UniswapV2Pair.sol',
        MetaData: UniswapV2Pair.metadata,
        ConstructorArguements: ''
      })
    })
    .catch((err: Error) => {
      console.info('\tfailed to approve token ${list[i]}: ', err)
    })

  console.info(`setFeeTo: ${wallet.address}`)
  await factory
    .setFeeTo(env.FEETO_VAULT)
    .then(async (tx: TransactionResponse) => {
      await tx.wait()
    })
    .catch((err: Error) => {
      console.info('\tfailed to setFeeTo: ', err)
    })

  console.info(`setApprovedTokenManager: ${approvedTokenManager.address}`)
  await factory
    .setApprovedTokenManager(approvedTokenManager.address)
    .then(async (tx: TransactionResponse) => {
      await tx.wait()
    })
    .catch((err: Error) => {
      console.info('\tfailed to setApprovedTokenManager: ', err)
    })

  console.info('deploy UniswapV2Router02')
  const router = await new ContractFactory(UniswapV2Router02.abi, UniswapV2Router02.bytecode)
    .connect(wallet)
    .deploy(factory.address, env.WETH_TOKEN)
    .then(async (c: Contract) => {
      return await c.deployed()
    })
  console.info('\taddress: ', router.address)
  contractMap.set('UniswapV2Router02', {
    Address: router.address,
    SourceFile: 'flatten/UniswapV2Router02.sol',
    MetaData: UniswapV2Router02.metadata,
    ConstructorArguements: defaultAbiCoder
      .encode(['address', 'address'], [factory.address, env.WETH_TOKEN])
      .substring(2)
  })

  console.info('==============================summary==============================')
  contractMap.forEach((value, key) => {
    console.info(key, ':', value.Address)
  })
  fs.writeFileSync('contract.json', JSON.stringify(Object.fromEntries(contractMap), null, 2))
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
