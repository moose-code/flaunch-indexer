/**
 * Pool Manager Handlers
 * Handles Uniswap V4 PoolManager events
 */

import { PoolManager, BigDecimal } from "generated";
import { ZERO_BI, ZERO_BD, BUNDLE_ID, CONFIG_ID } from "../utils/constants";
import { normalizeAddress, absBigInt } from "../utils/helpers";
import { ETH_USDC_POOL_ID } from "../addresses/base";
import {
  sqrtPriceX96ToTokenPrices,
  convertETHtoUSDCWithBundle
} from "../utils/pricing";
import {
  updateTokenDayData,
  updateTokenHourData,
  updateTokenMinuteData,
  updateToken15MinuteData,
  updateToken4HourData,
} from "../utils/timeseries";

// =============================================================================
// POOL MANAGER HANDLERS
// =============================================================================

PoolManager.Swap.handler(async ({ event, context }) => {
  const poolId = event.params.poolId;
  const sqrtPriceX96 = event.params.sqrtPriceX96;
  const tick = event.params.tick;
  const liquidity = event.params.liquidity;
  const amount0 = event.params.amount0;
  const amount1 = event.params.amount1;
  const timestamp = BigInt(event.block.timestamp);

  // Get bundle for ETH price FIRST (before any early returns)
  let bundle = await context.Bundle.get(BUNDLE_ID);
  if (!bundle) {
    bundle = {
      id: BUNDLE_ID,
      ethPriceUSDC: BigDecimal("2500"),
    };
    context.Bundle.set(bundle);
  }

  // Check if this is ETH/USDC pool - update ETH price oracle BEFORE pool check
  // The ETH/USDC pool is a Uniswap system pool, NOT a flaunch Pool entity
  if (poolId.toLowerCase() === ETH_USDC_POOL_ID.toLowerCase()) {
    // Calculate price from sqrtPriceX96
    // On Base: WETH (0x4200...) < USDC (0x8335...) so ETH is token0, USDC is token1
    const [price0, price1] = sqrtPriceX96ToTokenPrices(
      BigInt(sqrtPriceX96.toString()),
      18, // ETH decimals (token0)
      6   // USDC decimals (token1)
    );

    // price0 = USDC per ETH (how much USDC for 1 ETH) - this is what we want
    // price1 = ETH per USDC (how much ETH for 1 USDC)
    // The price is in 18-decimal precision from sqrtPriceX96ToTokenPrices
    const ethPriceInUSDC = price0;

    // Convert to BigDecimal - divide by 10^18 to get human-readable price
    // Round to 6 decimal places to match USDC precision (subgraph behavior)
    const ethPriceUSDC = BigDecimal(ethPriceInUSDC.toString())
      .div(BigDecimal("1000000000000000000"))
      .decimalPlaces(6, BigDecimal.ROUND_DOWN);

    // Only update if we got a valid price
    if (ethPriceInUSDC > 0n) {
      context.Bundle.set({
        ...bundle,
        ethPriceUSDC,
      });
      bundle = { ...bundle, ethPriceUSDC };
    }
  }

  // NOW load and check for flaunch pool
  const pool = await context.Pool.get(poolId);
  if (!pool) return;

  // Get collection token
  const collectionToken = await context.CollectionToken.get(pool.collectionToken_id);
  if (!collectionToken) return;

  // Save openPrice before updating
  const openPrice = collectionToken.derivedETH;

  // Calculate token prices from sqrtPriceX96
  const decimals = collectionToken.decimals || 18;
  let prices: [bigint, bigint];
  if (!pool.flipped) {
    // token0 = ETH (18), token1 = collectionToken (custom decimals)
    prices = sqrtPriceX96ToTokenPrices(BigInt(sqrtPriceX96.toString()), 18, decimals);
  } else {
    // token0 = collectionToken (custom decimals), token1 = ETH (18)
    prices = sqrtPriceX96ToTokenPrices(BigInt(sqrtPriceX96.toString()), decimals, 18);
  }

  // Determine amounts and buy/sell
  let amountETH = ZERO_BI;
  let isBuy = false;

  if (!pool.flipped) {
    // ETH is token0
    amountETH = absBigInt(BigInt(amount0.toString()));
    if (amount0 < 0n) {
      isBuy = true;
    }
  } else {
    // ETH is token1
    amountETH = absBigInt(BigInt(amount1.toString()));
    if (amount1 < 0n) {
      isBuy = true;
    }
  }

  // Update collectionToken with new prices
  // My sqrtPriceX96ToTokenPrices returns: price0 = token1/token0, price1 = token0/token1
  // derivedETH should be ETH per token (token0/token1 when ETH is token0)
  // tokenPrice should be token per ETH (token1/token0 when ETH is token0)
  const derivedETH = !pool.flipped ? prices[1] : prices[0];
  const tokenPrice = !pool.flipped ? prices[0] : prices[1];

  // Calculate market cap
  // totalSupplyScaled = human-readable token count (e.g., 100 billion)
  // derivedETH = ETH per token in 18 decimal precision
  // marketCapETH should be in wei (18 decimals), so don't divide by 10^18
  const totalSupplyScaled = collectionToken.totalSupply / (10n ** BigInt(decimals));
  const marketCapETH = totalSupplyScaled * derivedETH;
  const marketCapUSDC = convertETHtoUSDCWithBundle(marketCapETH, bundle);

  // Update CollectionToken
  const newVolumeETH = collectionToken.volumeETH + amountETH;
  context.CollectionToken.set({
    ...collectionToken,
    derivedETH,
    tokenPrice,
    marketCapETH,
    marketCapUSDC,
    volumeETH: newVolumeETH,
    volumeUSDC: convertETHtoUSDCWithBundle(newVolumeETH, bundle),
  });

  // Update Config volume
  const config = await context.Config.get(CONFIG_ID);
  if (config) {
    context.Config.set({
      ...config,
      volumeETH: config.volumeETH + amountETH,
      volumeUSDC: config.volumeUSDC.plus(convertETHtoUSDCWithBundle(amountETH, bundle)),
    });
  }

  // Update Pool
  context.Pool.set({
    ...pool,
    volumeETH: pool.volumeETH + amountETH,
    volumeUSDC: pool.volumeUSDC.plus(convertETHtoUSDCWithBundle(amountETH, bundle)),
  });

  // Update time series data
  const updatedToken = {
    ...collectionToken,
    derivedETH,
    tokenPrice,
    marketCapETH,
    marketCapUSDC,
    volumeETH: newVolumeETH,
    volumeUSDC: convertETHtoUSDCWithBundle(newVolumeETH, bundle),
  };

  // Update all time series (Day, Hour, Minute, 15Min, 4Hour)
  const [dayData, hourData, minuteData, fifteenMinData, fourHourData] = await Promise.all([
    updateTokenDayData(context, updatedToken, timestamp, openPrice),
    updateTokenHourData(context, updatedToken, timestamp, openPrice),
    updateTokenMinuteData(context, updatedToken, timestamp, openPrice),
    updateToken15MinuteData(context, updatedToken, timestamp, openPrice),
    updateToken4HourData(context, updatedToken, timestamp, openPrice),
  ]);

  // Update volume on time series data
  if (dayData) {
    context.TokenDayData.set({
      ...dayData,
      volumeETH: dayData.volumeETH + amountETH,
      volumeUSDC: dayData.volumeUSDC.plus(convertETHtoUSDCWithBundle(amountETH, bundle)),
    });
  }
  if (hourData) {
    context.TokenHourData.set({
      ...hourData,
      volumeETH: hourData.volumeETH + amountETH,
      volumeUSDC: hourData.volumeUSDC.plus(convertETHtoUSDCWithBundle(amountETH, bundle)),
    });
  }
  if (minuteData) {
    context.TokenMinuteData.set({
      ...minuteData,
      volumeETH: minuteData.volumeETH + amountETH,
      volumeUSDC: minuteData.volumeUSDC.plus(convertETHtoUSDCWithBundle(amountETH, bundle)),
    });
  }
  if (fifteenMinData) {
    context.Token15MinuteData.set({
      ...fifteenMinData,
      volumeETH: fifteenMinData.volumeETH + amountETH,
      volumeUSDC: fifteenMinData.volumeUSDC.plus(convertETHtoUSDCWithBundle(amountETH, bundle)),
    });
  }
  if (fourHourData) {
    context.Token4HourData.set({
      ...fourHourData,
      volumeETH: fourHourData.volumeETH + amountETH,
      volumeUSDC: fourHourData.volumeUSDC.plus(convertETHtoUSDCWithBundle(amountETH, bundle)),
    });
  }
});






