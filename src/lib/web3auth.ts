import { Web3Auth, Web3AuthOptions } from "@web3auth/modal";
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from "@web3auth/base";

const clientId = "BKwdhq5MpGJxiqkbDworiKYrsQ5XK5k_b9BtFqsbnrJ_SZXBj8BYwZpYYxmtylQJMPoQ0vOBSR3go3Pcgd44nj8";

let web3auth: Web3Auth | null = null;
let initPromise: Promise<Web3Auth> | null = null;

export const initWeb3Auth = async (): Promise<Web3Auth> => {
  // If already initialized, return it
  if (web3auth && (web3auth as any).status === "ready") {
    return web3auth;
  }

  // If initialization is in progress, wait for it
  if (initPromise) {
    return initPromise;
  }

  // Start initialization
  initPromise = (async () => {
    try {
      const chainConfig = {
        chainNamespace: CHAIN_NAMESPACES.OTHER,
        chainId: "flow-testnet",
        rpcTarget: "https://rest-testnet.onflow.org",
        displayName: "Flow Testnet",
        blockExplorerUrl: "https://testnet.flowscan.org",
        ticker: "FLOW",
        tickerName: "Flow",
      };

      web3auth = new Web3Auth({
        clientId,
        web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
        chainConfig,
      } as Web3AuthOptions);

      await web3auth.init();
      
      return web3auth;
    } catch (error) {
      console.error("Web3Auth initialization failed:", error);
      initPromise = null; // Reset so it can be retried
      throw error;
    }
  })();

  return initPromise;
};

export const getWeb3Auth = (): Web3Auth => {
  if (!web3auth) {
    throw new Error("Web3Auth not initialized. Call initWeb3Auth() first.");
  }
  return web3auth;
};

export const getWeb3AuthSafe = (): Web3Auth | null => {
  return web3auth;
};