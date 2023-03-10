import {ethers} from 'ethers'
import UniswapV2Factory from '@uniswap/v2-core/build/UniswapV2Factory.json'
import ApprovedTokenManager from '@uniswap/v2-core/build/ApprovedTokenManager.json'
import * as env from "../../.env";

async function main() {

    // todo
    let newOwnerAddress = "0x01";
    let approvedTokenManager = "0x02";
    let uniswapV2Factory = "0x03";

    const provider = new ethers.providers.JsonRpcProvider(env.WEB3_URL)
    const wallet = new ethers.Wallet(env.WALLET_KEY, provider)

    const factory = await new ethers.ContractFactory(UniswapV2Factory.interface, UniswapV2Factory.bytecode)
        .connect(wallet)
        .attach(uniswapV2Factory);
    // transfer owner to new address
    await factory.setFeeToSetter(newOwnerAddress);

    const approveTokenManager = await new ethers.ContractFactory(ApprovedTokenManager.interface, ApprovedTokenManager.bytecode)
        .connect(wallet)
        .attach(approvedTokenManager);
    // transfer owner to new address
    await approveTokenManager.transferOwnership(newOwnerAddress);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});