import * as env from '../.env'
import { ethers } from 'ethers'
import { bigNumberify } from 'ethers/utils'

import UniswapV2Factory from '@uniswap/v2-core/build/UniswapV2Factory.json'
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import ApprovedTokenManager from '@uniswap/v2-core/build/ApprovedTokenManager.json'

import UniswapV2Router02 from '../build/UniswapV2Router02.json'

async function main() {
  // provider
  const provider = new ethers.providers.JsonRpcProvider(env.WEB3_URL)

  // wallet
  const wallet = ethers.Wallet.fromMnemonic(env.MNEMONIC).connect(provider)
  console.info('address: ', wallet.address)
  console.info('ETH: ', (await provider.getBalance(wallet.address)).div(bigNumberify(10).pow(15)).toNumber() / 1000)

  // deploy ApprovedTokenManager
  const approvedTokenManager = await new ethers.ContractFactory(
    ApprovedTokenManager.interface,
    ApprovedTokenManager.bytecode
  )
    .connect(wallet)
    .deploy()
  console.info('approvedTokenManager: ', approvedTokenManager.address)

  approvedTokenManager.on('ApproveToken', (token, approved, event) => {
    console.info(`received event: ApproveToken(${token}, ${approved})`)
  })

  let tx
  {
    // WETH
    tx = await approvedTokenManager.approveToken(env.WETH_TOKEN, true)
    await tx.wait()
    console.info('approvedTokenManager approved WETH: ', await approvedTokenManager.isApprovedToken(env.WETH_TOKEN))

    // HOPE
    tx = await approvedTokenManager.approveToken(env.HOPE_TOKEN, true)
    await tx.wait()
    console.info('approvedTokenManager approved HOPE: ', await approvedTokenManager.isApprovedToken(env.HOPE_TOKEN))

    // USDT
    tx = await approvedTokenManager.approveToken(env.USDT_TOKEN, true)
    await tx.wait()
    console.info('approvedTokenManager approved USDT: ', await approvedTokenManager.isApprovedToken(env.USDT_TOKEN))

    // USDC
    tx = await approvedTokenManager.approveToken(env.USDC_TOKEN, true)
    await tx.wait()
    console.info('approvedTokenManager approved USDC: ', await approvedTokenManager.isApprovedToken(env.USDC_TOKEN))

    // DAI
    tx = await approvedTokenManager.approveToken(env.DAI_TOKEN, true)
    await tx.wait()
    console.info('approvedTokenManager approved DAI: ', await approvedTokenManager.isApprovedToken(env.DAI_TOKEN))

    // LT
    tx = await approvedTokenManager.approveToken(env.LT_TOKEN, true)
    await tx.wait()
    console.info('approvedTokenManager approved LT: ', await approvedTokenManager.isApprovedToken(env.LT_TOKEN))

    // VELT
    tx = await approvedTokenManager.approveToken(env.VELT_TOKEN, true)
    await tx.wait()
    console.info('approvedTokenManager approved VELT: ', await approvedTokenManager.isApprovedToken(env.VELT_TOKEN))
  }

  // deploy UniswapV2Factory
  const factory = await new ethers.ContractFactory(UniswapV2Factory.interface, UniswapV2Factory.bytecode)
    .connect(wallet)
    .deploy(wallet.address)
  console.info('uniswapV2Factory: ', factory.address)
  // setFeeTo
  tx = await factory.setFeeTo(wallet.address)
  await tx.wait()
  console.info('setFeeTo: ', await factory.feeTo())
  // setApprovedTokenManager
  tx = await factory.setApprovedTokenManager(approvedTokenManager.address)
  await tx.wait()
  console.info('setApprovedTokenManager: ', await factory.approvedTokenManager())

  // UniswapV2Router02
  const router = await new ethers.ContractFactory(UniswapV2Router02.interface, UniswapV2Router02.bytecode)
    .connect(wallet)
    .deploy(factory.address, env.WETH_TOKEN)
  console.info('uniswapV2Router: ', router.address)
  approvedTokenManager.removeAllListeners('ApproveToken')
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
