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

  // Load pool
  const pool = await context.Pool.get(poolId);
  if (!pool) return;

  // Get bundle for ETH price
  let bundle = await context.Bundle.get(BUNDLE_ID);
  if (!bundle) {
    bundle = {
      id: BUNDLE_ID,
      ethPriceUSDC: BigDecimal("2500"),
    };
    context.Bundle.set(bundle);
  }

  // Check if this is ETH/USDC pool - update ETH price oracle
  if (poolId.toLowerCase() === ETH_USDC_POOL_ID.toLowerCase()) {
    // Calculate price from sqrtPriceX96
    // ETH/USDC pool: USDC has 6 decimals, ETH has 18 decimals
    const [price0, price1] = sqrtPriceX96ToTokenPrices(
      BigInt(sqrtPriceX96.toString()),
      6,  // USDC decimals
      18  // ETH decimals
    );

    // Determine ETH price in USDC based on pool flipped status
    let ethPriceInUSDC: bigint;
    if (pool.flipped) {
      // ETH is token1, price0 is USDC per ETH
      ethPriceInUSDC = price0;
    } else {
      // ETH is token0, price1 is USDC per ETH
      ethPriceInUSDC = price1;
    }

    // Convert to BigDecimal (price is in 18 decimal precision)
    // Divide by 10^12 to adjust from 18 decimals to 6 decimals (USDC)
    const ethPriceUSDC = BigDecimal(ethPriceInUSDC.toString()).div(
      BigDecimal("1000000000000")
    );

    // Update bundle
    context.Bundle.set({
      ...bundle,
      ethPriceUSDC,
    });
    bundle = { ...bundle, ethPriceUSDC };
  }

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
  const derivedETH = !pool.flipped ? prices[0] : prices[1];
  const tokenPrice = !pool.flipped ? prices[1] : prices[0];

  // Calculate market cap
  const totalSupplyScaled = collectionToken.totalSupply / (10n ** BigInt(decimals));
  const marketCapETH = totalSupplyScaled * derivedETH / (10n ** 18n);
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


