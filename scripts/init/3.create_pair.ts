import {ethers} from 'ethers'
import UniswapV2Router02 from '../../build/UniswapV2Router02.json'
import UniswapV2ERC20 from '@uniswap/v2-core/build/UniswapV2ERC20.json'
import * as env from "../../.env";
import {MaxUint256} from "@ethersproject/constants";


async function main() {

    // todo update xx
    const routerAddress = "xxx";
    const token0Address = "xxx";
    const token1Address = "xxx";
    const amount0 = ethers.utils.parseEther("xxx");
    const amount1 = ethers.utils.parseEther("xxx");

    const provider = new ethers.providers.JsonRpcProvider(env.WEB3_URL)
    const wallet = new ethers.Wallet(env.WALLET_KEY, provider)

    const router = await new ethers.ContractFactory(UniswapV2Router02.abi, UniswapV2Router02.bytecode)
        .connect(wallet)
        .attach(routerAddress)


    const token0 = await new ethers.ContractFactory(UniswapV2ERC20.abi, UniswapV2ERC20.bytecode)
        .connect(wallet)
        .attach(token0Address);
    const token1 = await new ethers.ContractFactory(UniswapV2ERC20.abi, UniswapV2ERC20.bytecode)
        .connect(wallet)
        .attach(token1Address);

    await token0.approve(router.address, amount0);
    await token1.approve(router.address, amount1);

    await router.addLiquidity(token0Address, token1Address, amount0, amount1, 0, 0, wallet.address, MaxUint256, {
        gasLimit: 9999999
    });
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});