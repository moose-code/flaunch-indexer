/**
 * Effect API for fetching token metadata via RPC calls
 * Uses Envio's Effect API for caching and deduplication
 */

import { S, createEffect } from "envio";
import { createPublicClient, http, erc20Abi } from "viem";
import { base } from "viem/chains";

// Create a viem client for Base
const client = createPublicClient({
  chain: base,
  transport: http(process.env.RPC_URL_8453 || "https://mainnet.base.org"),
});

/**
 * Token metadata result type
 */
export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
}

/**
 * Effect to fetch ERC20 token name
 */
export const fetchTokenName = createEffect(
  {
    name: "fetchTokenName",
    input: {
      address: S.string,
    },
    output: S.string,
    rateLimit: { calls: 10, per: "second" },
    cache: true,
  },
  async ({ input }) => {
    try {
      const name = await client.readContract({
        address: input.address as `0x${string}`,
        abi: erc20Abi,
        functionName: "name",
      });
      return name;
    } catch (e) {
      console.warn(`Failed to fetch name for ${input.address}:`, e);
      return "unknown";
    }
  }
);

/**
 * Effect to fetch ERC20 token symbol
 */
export const fetchTokenSymbol = createEffect(
  {
    name: "fetchTokenSymbol",
    input: {
      address: S.string,
    },
    output: S.string,
    rateLimit: { calls: 10, per: "second" },
    cache: true,
  },
  async ({ input }) => {
    try {
      const symbol = await client.readContract({
        address: input.address as `0x${string}`,
        abi: erc20Abi,
        functionName: "symbol",
      });
      return symbol;
    } catch (e) {
      console.warn(`Failed to fetch symbol for ${input.address}:`, e);
      return "UNKNOWN";
    }
  }
);

/**
 * Effect to fetch ERC20 token decimals
 */
export const fetchTokenDecimals = createEffect(
  {
    name: "fetchTokenDecimals",
    input: {
      address: S.string,
    },
    output: S.number,
    rateLimit: { calls: 10, per: "second" },
    cache: true,
  },
  async ({ input }) => {
    try {
      const decimals = await client.readContract({
        address: input.address as `0x${string}`,
        abi: erc20Abi,
        functionName: "decimals",
      });
      return decimals;
    } catch (e) {
      console.warn(`Failed to fetch decimals for ${input.address}:`, e);
      return 18; // Default to 18
    }
  }
);

/**
 * Effect to fetch ERC20 token totalSupply
 */
export const fetchTokenTotalSupply = createEffect(
  {
    name: "fetchTokenTotalSupply",
    input: {
      address: S.string,
    },
    output: S.bigint,
    rateLimit: { calls: 10, per: "second" },
    cache: true,
  },
  async ({ input }) => {
    try {
      const totalSupply = await client.readContract({
        address: input.address as `0x${string}`,
        abi: erc20Abi,
        functionName: "totalSupply",
      });
      return totalSupply;
    } catch (e) {
      console.warn(`Failed to fetch totalSupply for ${input.address}:`, e);
      return 0n;
    }
  }
);

/**
 * Memecoin-specific ABI for tokenURI (no parameter version)
 */
const memecoinAbi = [
  {
    inputs: [],
    name: "tokenURI",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Effect to fetch Memecoin tokenURI (IPFS metadata)
 */
export const fetchTokenURI = createEffect(
  {
    name: "fetchTokenURI",
    input: {
      address: S.string,
    },
    output: S.string,
    rateLimit: { calls: 10, per: "second" },
    cache: true,
  },
  async ({ input }) => {
    try {
      const tokenURI = await client.readContract({
        address: input.address as `0x${string}`,
        abi: memecoinAbi,
        functionName: "tokenURI",
      });
      return tokenURI;
    } catch (e) {
      console.warn(`Failed to fetch tokenURI for ${input.address}:`, e);
      return "";
    }
  }
);

/**
 * Effect to fetch all token metadata at once
 */
export const fetchAllTokenMetadata = createEffect(
  {
    name: "fetchAllTokenMetadata",
    input: {
      address: S.string,
    },
    output: {
      name: S.string,
      symbol: S.string,
      decimals: S.number,
      totalSupply: S.bigint,
    },
    rateLimit: { calls: 5, per: "second" },
    cache: true,
  },
  async ({ input }) => {
    const address = input.address as `0x${string}`;

    // Fetch all in parallel
    const [nameResult, symbolResult, decimalsResult, totalSupplyResult] =
      await Promise.allSettled([
        client.readContract({
          address,
          abi: erc20Abi,
          functionName: "name",
        }),
        client.readContract({
          address,
          abi: erc20Abi,
          functionName: "symbol",
        }),
        client.readContract({
          address,
          abi: erc20Abi,
          functionName: "decimals",
        }),
        client.readContract({
          address,
          abi: erc20Abi,
          functionName: "totalSupply",
        }),
      ]);

    return {
      name: nameResult.status === "fulfilled" ? nameResult.value : "unknown",
      symbol:
        symbolResult.status === "fulfilled" ? symbolResult.value : "UNKNOWN",
      decimals:
        decimalsResult.status === "fulfilled" ? decimalsResult.value : 18,
      totalSupply:
        totalSupplyResult.status === "fulfilled" ? totalSupplyResult.value : 0n,
    };
  }
);

/**
 * IPFS Metadata structure
 */
export interface IPFSMetadata {
  name: string;
  description: string;
  logoHash: string;
  symbol: string;
  website?: string;
  discord?: string;
  twitter?: string;
  telegram?: string;
}

/**
 * Extract IPFS hash from URI
 * Supports various IPFS URI formats:
 * - ipfs://Qm...
 * - https://ipfs.io/ipfs/Qm...
 * - https://gateway.pinata.cloud/ipfs/Qm...
 */
export function extractIPFSHash(uri: string): string | null {
  if (!uri) return null;

  // Direct IPFS URI
  if (uri.startsWith("ipfs://")) {
    return uri.replace("ipfs://", "");
  }

  // HTTP gateway URLs
  const ipfsMatch = uri.match(/\/ipfs\/([a-zA-Z0-9]+)/);
  if (ipfsMatch) {
    return ipfsMatch[1];
  }

  // Already a hash
  if (uri.startsWith("Qm") || uri.startsWith("bafy")) {
    return uri;
  }

  return null;
}

/**
 * Effect to fetch and parse IPFS metadata
 */
export const fetchIPFSMetadata = createEffect(
  {
    name: "fetchIPFSMetadata",
    input: {
      ipfsHash: S.string,
    },
    output: {
      name: S.string,
      description: S.string,
      logoHash: S.string,
      symbol: S.string,
      website: S.string,
      discord: S.string,
      twitter: S.string,
      telegram: S.string,
      found: S.boolean,
    },
    rateLimit: { calls: 5, per: "second" },
    cache: true,
  },
  async ({ input }) => {
    const gateways = [
      `https://ipfs.io/ipfs/${input.ipfsHash}`,
      `https://cloudflare-ipfs.com/ipfs/${input.ipfsHash}`,
      `https://gateway.pinata.cloud/ipfs/${input.ipfsHash}`,
    ];

    for (const gateway of gateways) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(gateway, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = (await response.json()) as Record<string, unknown>;
          return {
            name: (data.name as string) || "",
            description: (data.description as string) || "",
            logoHash:
              (data.logoHash as string) ||
              (data.logo as string) ||
              (data.image as string) ||
              "",
            symbol: (data.symbol as string) || "",
            website:
              (data.website as string) || (data.external_url as string) || "",
            discord: (data.discord as string) || "",
            twitter: (data.twitter as string) || "",
            telegram: (data.telegram as string) || "",
            found: true,
          };
        }
      } catch (e) {
        console.warn(`Failed to fetch from ${gateway}:`, e);
        continue;
      }
    }

    console.warn(`Failed to fetch IPFS metadata for hash: ${input.ipfsHash}`);
    return {
      name: "",
      description: "",
      logoHash: "",
      symbol: "",
      website: "",
      discord: "",
      twitter: "",
      telegram: "",
      found: false,
    };
  }
);
