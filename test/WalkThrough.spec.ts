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

        const times = 10
        // setup lisa's account with 5 tokenA and 20 tokenB
        await tokenA.transfer(lisa.address, expandTo18Decimals(5 * times))
        await tokenB.transfer(lisa.address, expandTo18Decimals(20 * times))

        // let's setup her account first
        // lily will have 50 tokenA and 200 tokenB
        await tokenA.transfer(lily.address, expandTo18Decimals(50 * times))
        await tokenB.transfer(lily.address, expandTo18Decimals(200 * times))

        // setup tim's account with 10 tokenA
        await tokenA.transfer(tim.address, expandTo18Decimals(10 * times))

        {
          // lisa needs to approve uniswap to transfer her tokenA and tokenB on her behalf before calling
          // addLiquidity, otherwise addLiquidity will fail
          // only approve the necessary amount - the amount to add to the pool
          var tokenABalance = await tokenA.balanceOf(lisa.address)
          var tokenBBalance = await tokenB.balanceOf(lisa.address)

          await tokenA.connect(lisa).approve(router.address, tokenABalance)
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
          // check lisa has received about 10 liquidity token
          // the MINIMUM_LIQUIDITY is a tiny amount locked from the first liquidity provider
          console.info(
            `lisa received ${Math.round(
              FixedNumber.fromValue(await pair.balanceOf(lisa.address), 18).toUnsafeFloat() * 1000
            ) / 1000} liquidity token`
          )
        }

        {
          var tokenABalance = await tokenA.balanceOf(lily.address)
          var tokenBBalance = await tokenB.balanceOf(lily.address)

          // now lily also wants to become a liquidity provider
          // lily also needs to approve uniswap to transfer her tokenA and tokenB on her behalf
          // only approve the necessary amount - the amount to add to the pool
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

          // confirm lily now owns 100 liquidity tokens
          // expect(await pair.balanceOf(lily.address)).to.eq(expandTo18Decimals(100))

          // after lisa and lily adding liquidity to the pool,
          // confirm that now the pool has 55 tokenA and 220 tokenB in total
          // expect(await tokenA.balanceOf(pair.address)).to.eq(expandTo18Decimals(55))
          // expect(await tokenB.balanceOf(pair.address)).to.eq(expandTo18Decimals(220))

          // after lisa and lily adding liquidity,
          // now lisa owns 10 liquidity tokens, lily owns the rest 100 liquidity token.
          // the total supply is 110 tokens, lisa owns 1/11 = 9.0909%, and lily owns 10/11 = 90.9090%
          console.info(
            `lily received ${Math.round(
              FixedNumber.fromValue(await pair.balanceOf(lily.address), 18).toUnsafeFloat() * 1000
            ) / 1000} liquidity token`
          )
        }

        for (var i = 0; i < 1; i++) {
          console.info(`process ${i} round swap in and out`)
          {
            // now Trader tim wants to swap tokens,
            // he first quotes the price to see how many tokenB he can get out if he swap 10 tokenA
            // he should get about 220 - 55 * 220 / (55 + 10 * 0.997) = 33.760197014
            // expect(
            //   await router.getAmountOut(expandTo18Decimals(10), expandTo18Decimals(55), expandTo18Decimals(220))
            // ).to.eq(bigNumberify('33760197014006464522'))
            const tokenABalance = await tokenA.balanceOf(tim.address)
            const [reserve0, reserve1] = await pair.getReserves()
            const amountOutMin = await router.getAmountOut(tokenABalance, reserve0, reserve1)

            // before tim can swap tokens, he needs to approve uniswap to transfer tokens on
            // his behalf, otherwise "swap" call will fail
            // only approve necessary amount - the amount of token 0 to swap
            await tokenA.connect(tim).approve(router.address, tokenABalance)

            // tim swap 10 tokenA with a minimum specified as 33760197014006464522,
            // which means if the price changes due to some race condition,
            // tim won't be able to get the minimum amount, then the tx will fail.
            // 33760197014006464522 is the max tokenB amount he can swap with 10 tokenA,
            // adding 1 more will fail.
            console.info(
              `tim swap ${Math.round(FixedNumber.fromValue(tokenABalance, 18).toUnsafeFloat() * 1000) / 1000} tokenA`
            )
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
            // after the swap, tim now has 0 tokenA and 33.760197014006464522 tokenB
            // expect(await tokenA.balanceOf(tim.address)).to.eq(0)
            // expect(await tokenB.balanceOf(tim.address)).to.eq(bigNumberify('33760197014006464522'))

            // after tim's swap, the pool now has 65 tokenA and 186.239802986 tokenB
            // expect(await tokenA.balanceOf(pair.address)).to.eq(expandTo18Decimals(65)) // = 5 (lisa) + 50 (lily) + 10 (tim)
            // expect(await tokenB.balanceOf(pair.address)).to.eq(bigNumberify('186239802985993535478')) // = 20 (lisa) + 200 (lily) - 33.760197014006464522(tim)

            // after the swap, both lisa and lily has earned some fee paid by tim.
          }
          {
            const tokenBBalance = await tokenB.balanceOf(tim.address)
            const [reserve0, reserve1] = await pair.getReserves()
            const amountOutMin = await router.getAmountOut(tokenBBalance, reserve1, reserve0)

            // before tim can swap tokens, he needs to approve uniswap to transfer tokens on
            // his behalf, otherwise "swap" call will fail
            // only approve necessary amount - the amount of token 0 to swap
            await tokenB.connect(tim).approve(router.address, tokenBBalance)

            // tim swap 10 tokenA with a minimum specified as 33760197014006464522,
            // which means if the price changes due to some race condition,
            // tim won't be able to get the minimum amount, then the tx will fail.
            // 33760197014006464522 is the max tokenB amount he can swap with 10 tokenA,
            // adding 1 more will fail.
            console.info(
              `tim swap ${Math.round(FixedNumber.fromValue(tokenBBalance, 18).toUnsafeFloat() * 1000) / 1000} tokenB`
            )
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

        if (false) {
          console.info('lisa burn for feeTo')
          const [reserve0, reserve1] = await pair.getReserves()
          console.info(`reserve0=${reserve0}, reserve1=${reserve1}`)
          await pair.connect(lisa).burn(lisa.address)
          await logPosition(
            ['lisa', 'lily', 'tim', 'feeTo', 'pair'],
            [lisa.address, lily.address, tim.address, feeTo.address, pair.address],
            [tokenA, tokenB, pair]
          )
        }

        {
          var balance = await pair.balanceOf(feeTo.address)
          if (balance.gt(BigNumber.from(0))) {
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
        }
        {
          // now lisa decides to withdraw her tokens.
          // lisa will call removeLiquidity with all her liquidity tokens.
          // but before removeLiquidity, lisa needs to approve uniswap to transfer her
          // liquidity on her behalf, other removeLiquidity will fail
          // approve the amount that will be transferred to the router
          var balance = await pair.balanceOf(lisa.address)
          await pair.connect(lisa).approve(router.address, balance)

          console.info('lisa remove liquidity with all her liquidity tokens')
          // expandTo18Decimals(10 * times).sub(MINIMUM_LIQUIDITY),
          await router
            .connect(lisa)
            .removeLiquidity(tokenA.address, tokenB.address, balance, 0, 0, lisa.address, MaxUint256, overrides)
          await logPosition(
            ['lisa', 'lily', 'tim', 'feeTo', 'pair'],
            [lisa.address, lily.address, tim.address, feeTo.address, pair.address],
            [tokenA, tokenB, pair]
          )

          // before lisa removing liquidity, the pool had 65 tokenA and 186.239802986 tokenB,
          // since lisa owns 9.0909% liquidity, after lisa removing liquidity, lisa received
          // 5.9090909 tokenA (65 * 9.090909%) and 16.9308911 tokenB (186.239802986 * 9.090909%)
          // expect(await tokenA.balanceOf(lisa.address)).to.eq(bigNumberify('5909090909090908500')) // 65 * 9.090909%
          // expect(await tokenB.balanceOf(lisa.address)).to.eq(bigNumberify('16930891180544865168')) // 186.239802986 * 9.090909%

          // after lisa removed liquidity, the pool now has 59.090909 tokenA and 169.30891 tokenB
          // expect(await tokenA.balanceOf(pair.address)).to.eq(bigNumberify('59090909090909091500')) // = 65 - 5.9090909
          // expect(await tokenB.balanceOf(pair.address)).to.eq(bigNumberify('169308911805448670310')) // = 186.239802986 - 16.9308911
        }
        {
          // now lily also decides to removeLiquidity, she had the remaining 100 liquidity tokens
          // expect(await pair.balanceOf(lily.address)).to.eq(expandTo18Decimals(100))

          var balance = await pair.balanceOf(lily.address)
          // lily also needs to approve uniswap to transfer her liquidity token on her behalf
          // only approve the amount of liquidity token to be transferred to the router
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
          // confirm lily received 59.090909 tokenA (65 * 90.909090%) and 169.3089118 tokenB (186.239802986 * 90.909090%)
          // expect(await tokenA.balanceOf(lily.address)).to.eq(bigNumberify('59090909090909090909')) // 65 * 90.909090%
          // expect(await tokenB.balanceOf(lily.address)).to.eq(bigNumberify('169308911805448668616')) // 186.239802986 * 90.909090%

          // after all liquidity removed their liquidity, let's give a look at the contract's state
          // expect(await pair.totalSupply()).to.eq(MINIMUM_LIQUIDITY) // a tiny amount of liquidity token
          // expect(await tokenA.balanceOf(pair.address)).to.eq(591) // a tiny amount of tokenA
          // expect(await tokenB.balanceOf(pair.address)).to.eq(1694) // a tiny amount of tokenB
        }

        await new Promise(resolve => setTimeout(resolve, 5000))
        pair.removeAllListeners('Sync')
        pair.removeAllListeners('Mint')
        pair.removeAllListeners('Burn')
        pair.removeAllListeners('Swap')
      })
    })
  }
})
