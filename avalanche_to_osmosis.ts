import { Squid } from "@0xsquid/sdk";
import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

const fromChainId = 43113; //avalanche fuji testnet
const fromToken = "avax";
const fromAmount = ethers.utils.parseUnits(".05", "18").toString();
const toChainId = "osmo-test-5";
const toToken = "osmo";
const addressOsmois = "osmo.. put your osmosis address here";
const evmFallBackAddress = "0x put your fallbck evm address here.."; //your adderss on avalanche for failures on source chain
const baseUrl = "https://squid-api-git-feat-cosmos-maintestnet-0xsquid.vercel.app";

//const baseUrl =
//  "https://squid-api-git-feat-cosmos-maintestnet-0xsquid.vercel.app";
const privateKey = process.env.PK!;
if (!privateKey)
  throw new Error("No private key provided, pls include in .env file");

(async () => {
  // instantiate the SDK

  const squid = new Squid({
    baseUrl: baseUrl,
  });
  // init the SDK
  await squid.init();
  console.log("Squid inited");

  const provider = ethers.getDefaultProvider(
    squid.chains.find((c) => c.chainId === fromChainId)!.rpc
  );
  const signer = new ethers.Wallet(privateKey, provider);

  const params = {
    fromChain: fromChainId,
    fromToken: squid.tokens.find(
      (t) =>
        t.symbol.toLocaleLowerCase() === fromToken && t.chainId === fromChainId
    )!.address,
    fromAmount: fromAmount,
    toChain: toChainId,
    toToken: squid.tokens.find(
      (t) => t.symbol.toLocaleLowerCase() === toToken && t.chainId === toChainId
    )!.address,
    toAddress: addressOsmois,
    slippage: 3.0,
    enableForecall: false,
    quoteOnly: false,
    evmFallbackAddress: evmFallBackAddress,
  };

  console.log("route params", params);
  const { route } = await squid.getRoute(params);
  console.log(route.estimate.route);
  const tx = (await squid.executeRoute({
    signer,
    route,
  })) as ethers.providers.TransactionResponse;
  const txReceipt = await tx.wait();
  const txHash = txReceipt.transactionHash;
  //const txHash =
  //  "0xa3f446fe845f528fecc62ec6e860d02a9b9a515087d19b84632bcccc6e978bdd";

  await sleep(5); //wait for axelar to index
  let statusResult = false;
  while (!statusResult) {
    console.log(`getting tx status for: ${txHash}`);
    try {
      const status = (await squid.getStatus({
        transactionId: txHash,
        fromChainId: fromChainId,
        toChainId: toChainId,
      })) as any;
      console.log(status);
      if (!!status.routeStatus) {
        if (
          !!status.routeStatus.find(
            (s) => s.chainId === toChainId && s.status === "success"
          )
        ) {
          statusResult = true;
          console.log("########### tx success ############");
          break;
        }
      }
      await sleep(3);
    } catch (error) {
      console.log("not found yet..");
      await sleep(3);
      //console.log(error);
    }
  }
  //console.log(`https://testnet.axelarscan.io/gmp/${txReceipt.transactionHash}`);
})();

const sleep = async (time: number) => {
  new Promise((r) => setTimeout(r, time * 1000));
};
