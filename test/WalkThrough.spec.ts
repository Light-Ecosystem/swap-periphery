import chai, { expect } from 'chai'
import { Contract } from 'ethers'
import { Zero, MaxUint256 } from 'ethers/constants'
import { bigNumberify } from 'ethers/utils'
import { FixedNumber, BigNumber } from '@ethersproject/bignumber'
import { solidity, MockProvider, createFixtureLoader } from 'ethereum-waffle'

import { expandTo18Decimals, MINIMUM_LIQUIDITY } from './shared/utilities'
import { v2Fixture } from './shared/fixtures'

chai.use(solidity)

const overrides = {
  gasLimit: 9999999
}

enum RouterVersion {
  // UniswapV2Router01 = 'UniswapV2Router01',
  UniswapV2Router02 = 'UniswapV2Router02'
}

function toFixed(value: BigNumber): String {
  return FixedNumber.fromValue(value, 18)
    .toUnsafeFloat()
    .toFixed(4)
}

class Position {
  name: string

  public tokenA: number = 0
  public tokenB: number = 0
  public tokenP: number = 0

  constructor(name: string) {
    this.name = name
  }
}

async function getPosition(name: string, addr: string, tokens: Contract[]): Promise<Position> {
  var p = new Position(name)
  p.tokenA = Math.round(FixedNumber.fromValue(await tokens[0].balanceOf(addr), 18).toUnsafeFloat() * 1000) / 1000
  p.tokenB = Math.round(FixedNumber.fromValue(await tokens[1].balanceOf(addr), 18).toUnsafeFloat() * 1000) / 1000
  p.tokenP = Math.round(FixedNumber.fromValue(await tokens[2].balanceOf(addr), 18).toUnsafeFloat() * 1000) / 1000
  return p
}

async function logPosition(names: string[], addrs: string[], tokens: Contract[]) {
  var list = []
  var total = new Position('total')
  for (var i = 0; i < names.length; i++) {
    const p = await getPosition(names[i], addrs[i], tokens)
    list.push(p)
    total.tokenA = total.tokenA + p.tokenA
    total.tokenB = total.tokenB + p.tokenB
    total.tokenP = total.tokenP + p.tokenP
  }
  list.push(total)
  console.table(list, ['name', 'tokenA', 'tokenB', 'tokenP'])
}

function addPairListener(pair: Contract) {
  pair.on('Sync', (reserver0, reserver1) => {
    console.info(
      `received msg: Sync(${(Math.round(FixedNumber.fromValue(reserver0, 18).toUnsafeFloat()) * 1000) /
        1000}, ${(Math.round(FixedNumber.fromValue(reserver1, 18).toUnsafeFloat()) * 1000) / 1000})`
    )
  })

  pair.on('Mint', (sender, amount0, amount1) => {
    console.info(
      `received msg: Mint(${sender}, ${(Math.round(FixedNumber.fromValue(amount0, 18).toUnsafeFloat()) * 1000) /
        1000}, ${(Math.round(FixedNumber.fromValue(amount1, 18).toUnsafeFloat()) * 1000) / 1000})`
    )
  })

  pair.on('Burn', (sender, amount0, amount1, to) => {
    console.info(
      `received msg: Burn(${sender}, ${(Math.round(FixedNumber.fromValue(amount0, 18).toUnsafeFloat()) * 1000) /
        1000}, ${(Math.round(FixedNumber.fromValue(amount1, 18).toUnsafeFloat()) * 1000) / 1000}, ${to})`
    )
  })
  pair.on('Swap', (sender, amount0In, amount1In, amount0Out, amount1Out, to) => {
    console.info(
      `received msg: Swap(${sender},${(Math.round(FixedNumber.fromValue(amount0In, 18).toUnsafeFloat()) * 1000) /
        1000}, ${(Math.round(FixedNumber.fromValue(amount1In, 18).toUnsafeFloat()) * 1000) / 1000}, ${(Math.round(
        FixedNumber.fromValue(amount0Out, 18).toUnsafeFloat()
      ) *
        1000) /
        1000}, ${(Math.round(FixedNumber.fromValue(amount1Out, 18).toUnsafeFloat()) * 1000) / 1000}, ${to})`
    )
  })
}

function removePairListener(pair: Contract) {
  pair.removeAllListeners('Sync')
  pair.removeAllListeners('Mint')
  pair.removeAllListeners('Burn')
  pair.removeAllListeners('Swap')
}

describe('WalkThrough', () => {
  for (const routerVersion of Object.keys(RouterVersion)) {
    const provider = new MockProvider({
      hardfork: 'istanbul',
      mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
      gasLimit: 9999999
    })
    const [wallet, feeTo, lisa, lily, tim] = provider.getWallets()
    const loadFixture = createFixtureLoader(provider, [wallet])

    let tokenA: Contract
    let tokenB: Contract
    let router: Contract
    let pair: Contract
    beforeEach(async function() {
      const fixture = await loadFixture(v2Fixture)
      tokenA = fixture.token0
      tokenB = fixture.token1
      router = {
        // [RouterVersion.UniswapV2Router01]: fixture.router01,
        [RouterVersion.UniswapV2Router02]: fixture.router02
      }[routerVersion as RouterVersion]
      pair = fixture.pair

      await fixture.factoryV2.setFeeTo(feeTo.address)
      console.info('set feeTo =', await fixture.factoryV2.feeTo())
    })

    afterEach(async function() {
      expect(await provider.getBalance(router.address)).to.eq(Zero)
    })

    describe(routerVersion, () => {
      it('should add liquidity, mint and remove liquidity', async () => {
        addPairListener(pair)

        const times = 10
        // setup account
        {
          // lisa's account with 5 tokenA and 20 tokenB
          await tokenA.transfer(lisa.address, expandTo18Decimals(5 * times))
          await tokenB.transfer(lisa.address, expandTo18Decimals(20 * times))

          // lily's account with 50 tokenA and 200 tokenB
          await tokenA.transfer(lily.address, expandTo18Decimals(50 * times))
          await tokenB.transfer(lily.address, expandTo18Decimals(200 * times))

          // tim's account with 10 tokenA
          await tokenA.transfer(tim.address, expandTo18Decimals(10 * times))
        }

        // lisa add liquidity (5, 20), and get 10 tokenP
        {
          var tokenABalance = await tokenA.balanceOf(lisa.address)
          await tokenA.connect(lisa).approve(router.address, tokenABalance)
          var tokenBBalance = await tokenB.balanceOf(lisa.address)
          await tokenB.connect(lisa).approve(router.address, tokenBBalance)

          console.info(
            `lisa add ${(FixedNumber.fromValue(tokenABalance, 18).toUnsafeFloat() * 1000) /
              1000} tokenA and ${(FixedNumber.fromValue(tokenBBalance, 18).toUnsafeFloat() * 1000) /
              1000} tokenB to the pool`
          )
          await router
            .connect(lisa)
            .addLiquidity(
              tokenA.address,
              tokenB.address,
              expandTo18Decimals(5 * times),
              expandTo18Decimals(20 * times),
              0,
              0,
              lisa.address,
              MaxUint256,
              overrides
            )
          await logPosition(
            ['lisa', 'lily', 'tim', 'feeTo', 'pair'],
            [lisa.address, lily.address, tim.address, feeTo.address, pair.address],
            [tokenA, tokenB, pair]
          )
        }
        // lily add liquidity (50, 200), and get 100 tokenP
        {
          var tokenABalance = await tokenA.balanceOf(lily.address)
          var tokenBBalance = await tokenB.balanceOf(lily.address)
          await tokenA.connect(lily).approve(router.address, tokenABalance)
          await tokenB.connect(lily).approve(router.address, tokenBBalance)

          console.info(
            `lily add all her ${FixedNumber.fromValue(tokenABalance, 18)} tokenA and ${FixedNumber.fromValue(
              tokenBBalance,
              18
            )} tokenB to the pool`
          )
          await router
            .connect(lily)
            .addLiquidity(
              tokenA.address,
              tokenB.address,
              tokenABalance,
              tokenBBalance,
              0,
              0,
              lily.address,
              MaxUint256,
              overrides
            )
          await logPosition(
            ['lisa', 'lily', 'tim', 'feeTo', 'pair'],
            [lisa.address, lily.address, tim.address, feeTo.address, pair.address],
            [tokenA, tokenB, pair]
          )
        }

        for (var i = 0; i < 1; i++) {
          console.info(`process ${i} round swap in and out`)
          // tim swap all token A to get token B
          {
            const tokenABalance = await tokenA.balanceOf(tim.address)
            const [reserve0, reserve1] = await pair.getReserves()
            const amountOutMin = await router.getAmountOut(tokenABalance, reserve0, reserve1)
            console.info(
              `tim swap ${Math.round(FixedNumber.fromValue(tokenABalance, 18).toUnsafeFloat() * 1000) / 1000} tokenA`
            )

            await tokenA.connect(tim).approve(router.address, tokenABalance)
            await router.connect(tim).swapExactTokensForTokens(
              tokenABalance,
              amountOutMin,
              [tokenA.address, tokenB.address],
              tim.address,
              MaxUint256, // deadline
              overrides
            )
            await logPosition(
              ['lisa', 'lily', 'tim', 'feeTo', 'pair'],
              [lisa.address, lily.address, tim.address, feeTo.address, pair.address],
              [tokenA, tokenB, pair]
            )
          }

          // tim swap all token B to get token A
          {
            const tokenBBalance = await tokenB.balanceOf(tim.address)
            const [reserve0, reserve1] = await pair.getReserves()
            const amountOutMin = await router.getAmountOut(tokenBBalance, reserve1, reserve0)
            console.info(
              `tim swap ${Math.round(FixedNumber.fromValue(tokenBBalance, 18).toUnsafeFloat() * 1000) / 1000} tokenB`
            )

            await tokenB.connect(tim).approve(router.address, tokenBBalance)
            await router.connect(tim).swapExactTokensForTokens(
              tokenBBalance,
              amountOutMin,
              [tokenB.address, tokenA.address],
              tim.address,
              MaxUint256, // deadline
              overrides
            )
            await logPosition(
              ['lisa', 'lily', 'tim', 'feeTo', 'pair'],
              [lisa.address, lily.address, tim.address, feeTo.address, pair.address],
              [tokenA, tokenB, pair]
            )
          }
        }

        // mintFee
        {
          console.info('mintFee')
          await pair.mintFee()
          await logPosition(
            ['lisa', 'lily', 'tim', 'feeTo', 'pair'],
            [lisa.address, lily.address, tim.address, feeTo.address, pair.address],
            [tokenA, tokenB, pair]
          )
        }

        // feeTo remove liquidity to get token A and B
        {
          var balance = await pair.balanceOf(feeTo.address)
          console.info('feeTo remove liquidity with all her liquidity tokens')
          await pair.connect(feeTo).approve(router.address, balance)
          await router
            .connect(feeTo)
            .removeLiquidity(tokenA.address, tokenB.address, balance, 0, 0, feeTo.address, MaxUint256, overrides)
          await logPosition(
            ['lisa', 'lily', 'tim', 'feeTo', 'pair'],
            [lisa.address, lily.address, tim.address, feeTo.address, pair.address],
            [tokenA, tokenB, pair]
          )
        }
        {
          var balance = await pair.balanceOf(lisa.address)
          await pair.connect(lisa).approve(router.address, balance)

          console.info('lisa remove liquidity with all her liquidity tokens')
          await router
            .connect(lisa)
            .removeLiquidity(tokenA.address, tokenB.address, balance, 0, 0, lisa.address, MaxUint256, overrides)
          await logPosition(
            ['lisa', 'lily', 'tim', 'feeTo', 'pair'],
            [lisa.address, lily.address, tim.address, feeTo.address, pair.address],
            [tokenA, tokenB, pair]
          )
        }
        {
          var balance = await pair.balanceOf(lily.address)
          await pair.connect(lily).approve(router.address, balance)

          console.info('lily remove liquidity with all her liquidity tokens')
          await router
            .connect(lily)
            .removeLiquidity(tokenA.address, tokenB.address, balance, 0, 0, lily.address, MaxUint256, overrides)
          await logPosition(
            ['lisa', 'lily', 'tim', 'feeTo', 'pair'],
            [lisa.address, lily.address, tim.address, feeTo.address, pair.address],
            [tokenA, tokenB, pair]
          )
        }

        await new Promise(resolve => setTimeout(resolve, 1000))
        removePairListener(pair)
      })
    })
  }
})
