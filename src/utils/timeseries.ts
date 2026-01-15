// Time series data update functions

import { BigDecimal, handlerContext, Bundle } from "generated";
import type { CollectionToken_t } from "generated/src/db/Entities.gen";
import { ZERO_BI, ZERO_BD, BUNDLE_ID } from "./constants";
import { convertETHtoUSDCWithBundle } from "./pricing";
import {
  getDayId, getHourId, getMinuteId, get15MinuteId, get4HourId,
  getDayStartTimestamp, getHourStartTimestamp, getMinuteStartTimestamp,
  get15MinuteStartTimestamp, get4HourStartTimestamp
} from "./helpers";

/**
 * Update TokenDayData for a token
 */
export async function updateTokenDayData(
  context: handlerContext,
  token: CollectionToken_t,
  timestamp: bigint,
  openPrice: bigint
) {
  const dayId = getDayId(timestamp);
  const dayStartTimestamp = getDayStartTimestamp(timestamp);
  const tokenDayId = `${token.id}-${dayId}`;
  const tokenPrice = token.derivedETH;
  
  // Get bundle for USD conversion
  const bundle = await context.Bundle.get(BUNDLE_ID);
  
  let dayData = await context.TokenDayData.get(tokenDayId);
  
  if (!dayData) {
    dayData = {
      id: tokenDayId,
      date: dayStartTimestamp, // Use Unix timestamp to match subgraph
      periodStartUnix: dayStartTimestamp,
      token_id: token.id,
      pool_id: token.pool_id,
      volumeETH: ZERO_BI,
      volumeUSDC: ZERO_BD,
      totalVolumeETH: token.volumeETH,
      totalVolumeUSDC: convertETHtoUSDCWithBundle(token.volumeETH, bundle),
      marketCapETH: token.marketCapETH,
      marketCapUSDC: convertETHtoUSDCWithBundle(token.marketCapETH, bundle),
      priceETH: tokenPrice,
      priceUSDC: convertETHtoUSDCWithBundle(tokenPrice, bundle),
      feesETH: ZERO_BI,
      feesUSDC: ZERO_BD,
      totalFeesETH: token.totalFeesETH,
      totalFeesUSDC: convertETHtoUSDCWithBundle(token.totalFeesETH, bundle),
      priceOpen: openPrice,
      priceOpenUSDC: convertETHtoUSDCWithBundle(openPrice, bundle),
      priceHigh: tokenPrice,
      priceHighUSDC: convertETHtoUSDCWithBundle(tokenPrice, bundle),
      priceLow: tokenPrice,
      priceLowUSDC: convertETHtoUSDCWithBundle(tokenPrice, bundle),
      priceClose: tokenPrice,
      priceCloseUSDC: convertETHtoUSDCWithBundle(tokenPrice, bundle),
    };
  } else {
    // Update OHLC
    let priceHigh = dayData.priceHigh;
    let priceHighUSDC = dayData.priceHighUSDC;
    let priceLow = dayData.priceLow;
    let priceLowUSDC = dayData.priceLowUSDC;

    if (tokenPrice > dayData.priceHigh) {
      priceHigh = tokenPrice;
      priceHighUSDC = convertETHtoUSDCWithBundle(tokenPrice, bundle);
    }
    if (tokenPrice < dayData.priceLow) {
      priceLow = tokenPrice;
      priceLowUSDC = convertETHtoUSDCWithBundle(tokenPrice, bundle);
    }

    dayData = {
      ...dayData,
      priceHigh,
      priceHighUSDC,
      priceLow,
      priceLowUSDC,
      priceClose: tokenPrice,
      priceCloseUSDC: convertETHtoUSDCWithBundle(tokenPrice, bundle),
      priceETH: tokenPrice,
      priceUSDC: convertETHtoUSDCWithBundle(tokenPrice, bundle),
      marketCapETH: token.marketCapETH,
      marketCapUSDC: convertETHtoUSDCWithBundle(token.marketCapETH, bundle),
      totalFeesETH: token.totalFeesETH,
      totalFeesUSDC: convertETHtoUSDCWithBundle(token.totalFeesETH, bundle),
      totalVolumeETH: token.volumeETH,
      totalVolumeUSDC: convertETHtoUSDCWithBundle(token.volumeETH, bundle),
    };
  }

  context.TokenDayData.set(dayData);
  return dayData;
}

/**
 * Update TokenHourData for a token
 */
export async function updateTokenHourData(
  context: handlerContext,
  token: CollectionToken_t,
  timestamp: bigint,
  openPrice: bigint
) {
  const hourId = getHourId(timestamp);
  const hourStartTimestamp = getHourStartTimestamp(timestamp);
  const tokenHourId = `${token.id}-${hourId}`;
  const tokenPrice = token.derivedETH;
  
  const bundle = await context.Bundle.get(BUNDLE_ID);
  
  let hourData = await context.TokenHourData.get(tokenHourId);
  
  if (!hourData) {
    hourData = {
      id: tokenHourId,
      periodStartUnix: hourStartTimestamp,
      token_id: token.id,
      pool_id: token.pool_id,
      volumeETH: ZERO_BI,
      volumeUSDC: ZERO_BD,
      totalVolumeETH: token.volumeETH,
      totalVolumeUSDC: convertETHtoUSDCWithBundle(token.volumeETH, bundle),
      marketCapETH: token.marketCapETH,
      marketCapUSDC: convertETHtoUSDCWithBundle(token.marketCapETH, bundle),
      priceETH: tokenPrice,
      priceUSDC: convertETHtoUSDCWithBundle(tokenPrice, bundle),
      feesETH: ZERO_BI,
      feesUSDC: ZERO_BD,
      totalFeesETH: token.totalFeesETH,
      totalFeesUSDC: convertETHtoUSDCWithBundle(token.totalFeesETH, bundle),
      priceOpen: openPrice,
      priceOpenUSDC: convertETHtoUSDCWithBundle(openPrice, bundle),
      priceHigh: tokenPrice,
      priceHighUSDC: convertETHtoUSDCWithBundle(tokenPrice, bundle),
      priceLow: tokenPrice,
      priceLowUSDC: convertETHtoUSDCWithBundle(tokenPrice, bundle),
      priceClose: tokenPrice,
      priceCloseUSDC: convertETHtoUSDCWithBundle(tokenPrice, bundle),
    };
  } else {
    let priceHigh = hourData.priceHigh;
    let priceHighUSDC = hourData.priceHighUSDC;
    let priceLow = hourData.priceLow;
    let priceLowUSDC = hourData.priceLowUSDC;

    if (tokenPrice > hourData.priceHigh) {
      priceHigh = tokenPrice;
      priceHighUSDC = convertETHtoUSDCWithBundle(tokenPrice, bundle);
    }
    if (tokenPrice < hourData.priceLow) {
      priceLow = tokenPrice;
      priceLowUSDC = convertETHtoUSDCWithBundle(tokenPrice, bundle);
    }

    hourData = {
      ...hourData,
      priceHigh,
      priceHighUSDC,
      priceLow,
      priceLowUSDC,
      priceClose: tokenPrice,
      priceCloseUSDC: convertETHtoUSDCWithBundle(tokenPrice, bundle),
      priceETH: tokenPrice,
      priceUSDC: convertETHtoUSDCWithBundle(tokenPrice, bundle),
      marketCapETH: token.marketCapETH,
      marketCapUSDC: convertETHtoUSDCWithBundle(token.marketCapETH, bundle),
      totalFeesETH: token.totalFeesETH,
      totalFeesUSDC: convertETHtoUSDCWithBundle(token.totalFeesETH, bundle),
      totalVolumeETH: token.volumeETH,
      totalVolumeUSDC: convertETHtoUSDCWithBundle(token.volumeETH, bundle),
    };
  }

  context.TokenHourData.set(hourData);
  return hourData;
}

/**
 * Update TokenMinuteData for a token
 */
export async function updateTokenMinuteData(
  context: handlerContext,
  token: CollectionToken_t,
  timestamp: bigint,
  openPrice: bigint
) {
  const minuteId = getMinuteId(timestamp);
  const minuteStartTimestamp = getMinuteStartTimestamp(timestamp);
  const tokenMinuteId = `${token.id}-${minuteId}`;
  const tokenPrice = token.derivedETH;
  
  const bundle = await context.Bundle.get(BUNDLE_ID);
  
  let minuteData = await context.TokenMinuteData.get(tokenMinuteId);
  
  if (!minuteData) {
    minuteData = {
      id: tokenMinuteId,
      periodStartUnix: minuteStartTimestamp,
      token_id: token.id,
      volumeETH: ZERO_BI,
      volumeUSDC: ZERO_BD,
      totalVolumeETH: token.volumeETH,
      totalVolumeUSDC: convertETHtoUSDCWithBundle(token.volumeETH, bundle),
      marketCapETH: token.marketCapETH,
      marketCapUSDC: convertETHtoUSDCWithBundle(token.marketCapETH, bundle),
      priceETH: tokenPrice,
      priceUSDC: convertETHtoUSDCWithBundle(tokenPrice, bundle),
      feesETH: ZERO_BI,
      feesUSDC: ZERO_BD,
      totalFeesETH: token.totalFeesETH,
      totalFeesUSDC: convertETHtoUSDCWithBundle(token.totalFeesETH, bundle),
      priceOpen: openPrice,
      priceOpenUSDC: convertETHtoUSDCWithBundle(openPrice, bundle),
      priceHigh: tokenPrice,
      priceHighUSDC: convertETHtoUSDCWithBundle(tokenPrice, bundle),
      priceLow: tokenPrice,
      priceLowUSDC: convertETHtoUSDCWithBundle(tokenPrice, bundle),
      priceClose: tokenPrice,
      priceCloseUSDC: convertETHtoUSDCWithBundle(tokenPrice, bundle),
    };
  } else {
    let priceHigh = minuteData.priceHigh;
    let priceHighUSDC = minuteData.priceHighUSDC;
    let priceLow = minuteData.priceLow;
    let priceLowUSDC = minuteData.priceLowUSDC;

    if (tokenPrice > minuteData.priceHigh) {
      priceHigh = tokenPrice;
      priceHighUSDC = convertETHtoUSDCWithBundle(tokenPrice, bundle);
    }
    if (tokenPrice < minuteData.priceLow) {
      priceLow = tokenPrice;
      priceLowUSDC = convertETHtoUSDCWithBundle(tokenPrice, bundle);
    }

    minuteData = {
      ...minuteData,
      priceHigh,
      priceHighUSDC,
      priceLow,
      priceLowUSDC,
      priceClose: tokenPrice,
      priceCloseUSDC: convertETHtoUSDCWithBundle(tokenPrice, bundle),
      priceETH: tokenPrice,
      priceUSDC: convertETHtoUSDCWithBundle(tokenPrice, bundle),
      marketCapETH: token.marketCapETH,
      marketCapUSDC: convertETHtoUSDCWithBundle(token.marketCapETH, bundle),
      totalFeesETH: token.totalFeesETH,
      totalFeesUSDC: convertETHtoUSDCWithBundle(token.totalFeesETH, bundle),
      totalVolumeETH: token.volumeETH,
      totalVolumeUSDC: convertETHtoUSDCWithBundle(token.volumeETH, bundle),
    };
  }

  context.TokenMinuteData.set(minuteData);
  return minuteData;
}

/**
 * Update Token15MinuteData for a token
 */
export async function updateToken15MinuteData(
  context: handlerContext,
  token: CollectionToken_t,
  timestamp: bigint,
  openPrice: bigint
) {
  const fifteenMinuteId = get15MinuteId(timestamp);
  const fifteenMinuteStartTimestamp = get15MinuteStartTimestamp(timestamp);
  const token15MinuteId = `${token.id}-${fifteenMinuteId}`;
  const tokenPrice = token.derivedETH;
  
  const bundle = await context.Bundle.get(BUNDLE_ID);
  
  let data = await context.Token15MinuteData.get(token15MinuteId);
  
  if (!data) {
    data = {
      id: token15MinuteId,
      periodStartUnix: fifteenMinuteStartTimestamp,
      token_id: token.id,
      volumeETH: ZERO_BI,
      volumeUSDC: ZERO_BD,
      totalVolumeETH: token.volumeETH,
      totalVolumeUSDC: convertETHtoUSDCWithBundle(token.volumeETH, bundle),
      marketCapETH: token.marketCapETH,
      marketCapUSDC: convertETHtoUSDCWithBundle(token.marketCapETH, bundle),
      priceETH: tokenPrice,
      priceUSDC: convertETHtoUSDCWithBundle(tokenPrice, bundle),
      feesETH: ZERO_BI,
      feesUSDC: ZERO_BD,
      totalFeesETH: token.totalFeesETH,
      totalFeesUSDC: convertETHtoUSDCWithBundle(token.totalFeesETH, bundle),
      priceOpen: openPrice,
      priceOpenUSDC: convertETHtoUSDCWithBundle(openPrice, bundle),
      priceHigh: tokenPrice,
      priceHighUSDC: convertETHtoUSDCWithBundle(tokenPrice, bundle),
      priceLow: tokenPrice,
      priceLowUSDC: convertETHtoUSDCWithBundle(tokenPrice, bundle),
      priceClose: tokenPrice,
      priceCloseUSDC: convertETHtoUSDCWithBundle(tokenPrice, bundle),
    };
  } else {
    let priceHigh = data.priceHigh;
    let priceHighUSDC = data.priceHighUSDC;
    let priceLow = data.priceLow;
    let priceLowUSDC = data.priceLowUSDC;

    if (tokenPrice > data.priceHigh) {
      priceHigh = tokenPrice;
      priceHighUSDC = convertETHtoUSDCWithBundle(tokenPrice, bundle);
    }
    if (tokenPrice < data.priceLow) {
      priceLow = tokenPrice;
      priceLowUSDC = convertETHtoUSDCWithBundle(tokenPrice, bundle);
    }

    data = {
      ...data,
      priceHigh,
      priceHighUSDC,
      priceLow,
      priceLowUSDC,
      priceClose: tokenPrice,
      priceCloseUSDC: convertETHtoUSDCWithBundle(tokenPrice, bundle),
      priceETH: tokenPrice,
      priceUSDC: convertETHtoUSDCWithBundle(tokenPrice, bundle),
      marketCapETH: token.marketCapETH,
      marketCapUSDC: convertETHtoUSDCWithBundle(token.marketCapETH, bundle),
      totalFeesETH: token.totalFeesETH,
      totalFeesUSDC: convertETHtoUSDCWithBundle(token.totalFeesETH, bundle),
      totalVolumeETH: token.volumeETH,
      totalVolumeUSDC: convertETHtoUSDCWithBundle(token.volumeETH, bundle),
    };
  }

  context.Token15MinuteData.set(data);
  return data;
}

/**
 * Update Token4HourData for a token
 */
export async function updateToken4HourData(
  context: handlerContext,
  token: CollectionToken_t,
  timestamp: bigint,
  openPrice: bigint
) {
  const fourHourId = get4HourId(timestamp);
  const fourHourStartTimestamp = get4HourStartTimestamp(timestamp);
  const token4HourId = `${token.id}-${fourHourId}`;
  const tokenPrice = token.derivedETH;
  
  const bundle = await context.Bundle.get(BUNDLE_ID);
  
  let data = await context.Token4HourData.get(token4HourId);
  
  if (!data) {
    data = {
      id: token4HourId,
      periodStartUnix: fourHourStartTimestamp,
      token_id: token.id,
      volumeETH: ZERO_BI,
      volumeUSDC: ZERO_BD,
      totalVolumeETH: token.volumeETH,
      totalVolumeUSDC: convertETHtoUSDCWithBundle(token.volumeETH, bundle),
      marketCapETH: token.marketCapETH,
      marketCapUSDC: convertETHtoUSDCWithBundle(token.marketCapETH, bundle),
      priceETH: tokenPrice,
      priceUSDC: convertETHtoUSDCWithBundle(tokenPrice, bundle),
      feesETH: ZERO_BI,
      feesUSDC: ZERO_BD,
      totalFeesETH: token.totalFeesETH,
      totalFeesUSDC: convertETHtoUSDCWithBundle(token.totalFeesETH, bundle),
      priceOpen: openPrice,
      priceOpenUSDC: convertETHtoUSDCWithBundle(openPrice, bundle),
      priceHigh: tokenPrice,
      priceHighUSDC: convertETHtoUSDCWithBundle(tokenPrice, bundle),
      priceLow: tokenPrice,
      priceLowUSDC: convertETHtoUSDCWithBundle(tokenPrice, bundle),
      priceClose: tokenPrice,
      priceCloseUSDC: convertETHtoUSDCWithBundle(tokenPrice, bundle),
    };
  } else {
    let priceHigh = data.priceHigh;
    let priceHighUSDC = data.priceHighUSDC;
    let priceLow = data.priceLow;
    let priceLowUSDC = data.priceLowUSDC;

    if (tokenPrice > data.priceHigh) {
      priceHigh = tokenPrice;
      priceHighUSDC = convertETHtoUSDCWithBundle(tokenPrice, bundle);
    }
    if (tokenPrice < data.priceLow) {
      priceLow = tokenPrice;
      priceLowUSDC = convertETHtoUSDCWithBundle(tokenPrice, bundle);
    }

    data = {
      ...data,
      priceHigh,
      priceHighUSDC,
      priceLow,
      priceLowUSDC,
      priceClose: tokenPrice,
      priceCloseUSDC: convertETHtoUSDCWithBundle(tokenPrice, bundle),
      priceETH: tokenPrice,
      priceUSDC: convertETHtoUSDCWithBundle(tokenPrice, bundle),
      marketCapETH: token.marketCapETH,
      marketCapUSDC: convertETHtoUSDCWithBundle(token.marketCapETH, bundle),
      totalFeesETH: token.totalFeesETH,
      totalFeesUSDC: convertETHtoUSDCWithBundle(token.totalFeesETH, bundle),
      totalVolumeETH: token.volumeETH,
      totalVolumeUSDC: convertETHtoUSDCWithBundle(token.volumeETH, bundle),
    };
  }

  context.Token4HourData.set(data);
  return data;
}

/**
 * Update all time series data for a token
 */
export async function updateAllTimeSeries(
  context: handlerContext,
  token: CollectionToken_t,
  timestamp: bigint,
  openPrice: bigint
) {
  await Promise.all([
    updateTokenDayData(context, token, timestamp, openPrice),
    updateTokenHourData(context, token, timestamp, openPrice),
    updateTokenMinuteData(context, token, timestamp, openPrice),
    updateToken15MinuteData(context, token, timestamp, openPrice),
    updateToken4HourData(context, token, timestamp, openPrice),
  ]);
}
