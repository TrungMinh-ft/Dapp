import { BrowserProvider } from "ethers";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

type WalletContextValue = {
  walletAddress: string | null;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  signMessage: (message: string) => Promise<string>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const provider = window.ethereum;
    if (!provider) {
      return;
    }

    const handleAccountsChanged = (accounts: unknown) => {
      const nextAddress = Array.isArray(accounts) ? String(accounts[0] ?? "") : "";
      if (nextAddress) {
        window.localStorage.removeItem("walletDisconnected");
      }
      setWalletAddress(nextAddress || null);
    };

    if (window.localStorage.getItem("walletDisconnected") !== "true") {
      void provider
        .request({ method: "eth_accounts" })
        .then((accounts) => handleAccountsChanged(accounts))
        .catch(() => undefined);
    }

    provider.on?.("accountsChanged", handleAccountsChanged);
    return () => {
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
    };
  }, []);

  async function connectWallet() {
    const provider = window.ethereum;
    if (!provider) {
      throw new Error("MetaMask or a compatible EVM wallet was not found.");
    }

    setIsConnecting(true);
    try {
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      const nextAddress = Array.isArray(accounts) ? String(accounts[0] ?? "") : "";
      window.localStorage.removeItem("walletDisconnected");
      setWalletAddress(nextAddress || null);
    } finally {
      setIsConnecting(false);
    }
  }

  function disconnectWallet() {
    window.localStorage.setItem("walletDisconnected", "true");
    setWalletAddress(null);
  }

  async function signMessage(message: string) {
    const provider = window.ethereum;
    if (!provider) {
      throw new Error("MetaMask or a compatible EVM wallet was not found.");
    }

    const browserProvider = new BrowserProvider(provider);
    const signer = await browserProvider.getSigner();
    return signer.signMessage(message);
  }

  const value = useMemo(
    () => ({
      walletAddress,
      isConnecting,
      connectWallet,
      disconnectWallet,
      signMessage,
    }),
    [walletAddress, isConnecting],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used inside WalletProvider");
  }

  return context;
}
