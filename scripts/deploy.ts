import * as fs from 'fs'
import * as path from 'path'
import { Wallet, Contract, ContractFactory } from 'ethers'
import { TransactionResponse, JsonRpcProvider } from 'ethers/providers'
import { bigNumberify, BigNumber, defaultAbiCoder } from 'ethers/utils'
import UniswapV2Factory from '@uniswap/v2-core/build/UniswapV2Factory.json'
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import ApprovedTokenManager from '@uniswap/v2-core/build/ApprovedTokenManager.json'
import * as env from '../.env'

import UniswapV2Router02 from '../build/UniswapV2Router02.json'

interface ContractInstance {
  Address: string
  Source: string
  MetaData: string
  ConstructorArguements: string
}
async function main() {
  let contractMap = new Map<string, ContractInstance>()

  // provider
  const provider = new JsonRpcProvider(env.WEB3_URL)

  // wallet
  const wallet = Wallet.fromMnemonic(env.MNEMONIC).connect(provider)
  console.info('address: ', wallet.address)
  await provider.getBalance(wallet.address).then((value: BigNumber) => {
    console.info('ETH: ', value.div(bigNumberify(10).pow(15)).toNumber() / 1000)
  })

  console.info('deploy ApprovedTokenManager')
  const approvedTokenManager = await new ContractFactory(ApprovedTokenManager.interface, ApprovedTokenManager.bytecode)
    .connect(wallet)
    .deploy()
    .then(async (c: Contract) => {
      return await c.deployed()
    })
  contractMap.set('ApprovedTokenManager', {
    Address: approvedTokenManager.address,
    Source: fs.readFileSync('node_modules/@uniswap/v2-core/flatten/ApprovedTokenManager.sol').toString('utf8'),
    MetaData: ApprovedTokenManager.metadata,
    ConstructorArguements: defaultAbiCoder.encode([], []).substring(2)
  })

  console.info('approve token')
  {
    let list = [
      env.WETH_TOKEN,
      env.HOPE_TOKEN,
      env.USDT_TOKEN,
      env.USDC_TOKEN,
      env.DAI_TOKEN,
      env.LT_TOKEN,
      env.VELT_TOKEN
    ]

    for (let i = 0; i < list.length; i++) {
      await approvedTokenManager
        .approveToken(list[i], true)
        .then(async (tx: TransactionResponse) => {
          await tx.wait()
        })
        .catch((err: Error) => {
          console.info('failed to approve token ${list[i]}: ', err)
        })
      await approvedTokenManager
        .isApprovedToken(list[i])
        .then((success: boolean) => {
          if (success) {
            console.info(`approved token ${list[i]} `)
          } else {
            console.info(`failed to approve token ${list[i]} `)
          }
        })
        .catch((err: Error) => {
          console.info(`failed to fetch token approved status for ${list[i]}: `, err)
        })
    }
  }

  console.info('deploy UniswapV2Factory')
  const factory = await new ContractFactory(UniswapV2Factory.interface, UniswapV2Factory.bytecode)
    .connect(wallet)
    .deploy(wallet.address)
    .then(async (c: Contract) => {
      return await c.deployed()
    })
  contractMap.set('UniswapV2Factory', {
    Address: factory.address,
    Source: fs.readFileSync('node_modules/@uniswap/v2-core/flatten/UniswapV2Factory.sol').toString('utf8'),
    MetaData: UniswapV2Factory.metadata,
    ConstructorArguements: defaultAbiCoder.encode(['address'], [wallet.address]).substring(2)
  })

  console.info(`setFeeTo: ${wallet.address}`)
  await factory.setFeeTo(wallet.address).then(async (tx: TransactionResponse) => {
    await tx.wait()
  })

  console.info(`setApprovedTokenManager: ${approvedTokenManager.address}`)
  await factory
    .setApprovedTokenManager(approvedTokenManager.address)
    .then(async (tx: TransactionResponse) => {
      await tx.wait()
    })
    .catch((err: Error) => {
      console.info('failed to setApprovedTokenManager: ', err)
    })

  console.info('deploy UniswapV2Router02')
  const router = await new ContractFactory(UniswapV2Router02.interface, UniswapV2Router02.bytecode)
    .connect(wallet)
    .deploy(factory.address, env.WETH_TOKEN)
    .then(async (c: Contract) => {
      return await c.deployed()
    })
  contractMap.set('UniswapV2Router02', {
    Address: router.address,
    Source: fs.readFileSync('flatten/UniswapV2Router02.sol').toString('utf8'),
    MetaData: UniswapV2Router02.metadata,
    ConstructorArguements: defaultAbiCoder
      .encode(['address', 'address'], [factory.address, env.WETH_TOKEN])
      .substring(2)
  })

  contractMap.forEach((value, key) => {
    console.info(key, ':', value.Address)
  })
  fs.writeFileSync('contract.json', JSON.stringify(Object.fromEntries(contractMap), null, 2))
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
