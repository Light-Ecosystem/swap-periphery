import {ethers} from 'ethers'
import UniswapV2Factory from '@uniswap/v2-core/build/UniswapV2Factory.json'
import * as env from "../../.env";

async function main() {

    // todo
    let uniswapV2Factory = "0x00";
    let _stHope = "0x01";
    let _minter = "0x02";
    let _ltToken = "0x03";

    const provider = new ethers.providers.JsonRpcProvider(env.WEB3_URL)
    const wallet = new ethers.Wallet(env.WALLET_KEY, provider)

    const factory = await new ethers.ContractFactory(UniswapV2Factory.interface, UniswapV2Factory.bytecode)
        .connect(wallet)
        .attach(uniswapV2Factory);

    // set light reward params
    await factory.setLightRewardParams(_stHope, _minter, _ltToken);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});