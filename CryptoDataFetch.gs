const CACHE_TIMEOUT = 300; // 資料快取時間
const cache = CacheService.getDocumentCache();
var dexscreenerProvider, binanceProvider;

/**
 * 建立一個分頁，並命名為Parameter，設定以下資訊
 * | Key | Value |
 * | --- | ----- |
 * | binance_api_key | {Api Key} |
 * | binance_secret_key | {Secret Key} |
 */


/**
 * Google Sheet函式 - 取得binance的抵押借貸資料
 * @param {string} collateralAsset 抵押資產
 * @param {string} loanAsset 負債資產(可用逗號分隔)
 * @param {"tvl"|"collateralAmount"|"loanAmount"} type 資料類型
 */
function binance_loan(collateralAsset, loanAsset, type = "collateralAmount") {
  const list = getBinanceProvider().getLoanList();
  const loanAssList = loanAsset.split(",").map((asset) => asset.trim());
  let result = 0;
  for (let loan of list) {
    if (loanAssList.includes(loan.loanAsset) && loan.collateralAsset === collateralAsset) {
      result += loan[type];
    }
  }
  return parseFloat(result);
}

/**
 * Google Sheet函式 - 幣安錢包資產
 * @param name 資產Symbol(BTC、ETH、USDT...)
 * @returns {number} 數量
 */
function binance_wallet_asset_amount(name) {
  const assetList = getBinanceProvider().getAssetList();
  const asset = assetList.find((_asset) => {
    return _asset.asset.toLowerCase() === name.trim().toLowerCase();
  });
  return parseFloat(asset?.free ?? 0);
}

/**
 * Google Sheet函式 - 幣安活期賺幣資產
 * @param name 資產Symbol(BTC、ETH、USDT...)
 * @returns 數量
 */
function binance_earn_asset_amount(name) {
  const assetList = getBinanceProvider().getEarnList();
  const asset = assetList.find((_asset) => {
    return _asset.asset.toLowerCase() === name.trim().toLowerCase();
  });
  return parseFloat(asset?.amount ?? 0);
}

/**
 * Google Sheet函式 - 取得dexscreener價格
 * @param address 代幣地址，https://dexscreener.com/
 * @returns 價格
 */
function dexscreener_price(address) {
  return parseFloat(getDexscreenerProvider().getDexscreenerData(address).price);
}

/**
 * Google Sheet函式 - 取得dexscreener價格24h變化
 * @param address 代幣地址，https://dexscreener.com/
 * @returns 價格變化(1 ~ -1)
 */
function dexscreener_price_change24h(address) {
  return parseFloat(getDexscreenerProvider().getDexscreenerData(address).priceChange24h) / 100;
}

function getBinanceProvider() {
  if (!binanceProvider) {
    binanceProvider = new BinanceProvider();
  }
  return binanceProvider;
}

class BinanceProvider {
  constructor() {
    this.cache = CacheService.getDocumentCache();
    this.getApiKey();
  }

  getCache(key) {
    const cacheKey = `binance_${key}`;
    const cache = this.cache.get(cacheKey);
    if (cache) {
      return JSON.parse(cache);
    }
    return null;
  }

  putCache(key, data) {
    const cacheKey = `binance_${key}`;
    this.cache.put(cacheKey, JSON.stringify(data), CACHE_TIMEOUT);
  }

  getApiKey() {
    this.apiKey = getParameter("binance_api_key");
    this.secretKey = getParameter("binance_secret_key");
  }

  getLoanList() {
    const cache = this.getCache("loan/flexible/ongoing/orders");
    if (cache) {
      return cache;
    }
    const result = [];

    try {
      const res = this.fetch("GET", "/sapi/v1/loan/flexible/ongoing/orders", { limit: 100 });
      const rows = res?.rows ?? [];
      for (let row of rows) {
        result.push({
          loanAsset: row.loanCoin,
          loanAmount: row.totalDebt,
          collateralAsset: row.collateralCoin,
          collateralAmount: row.collateralAmount,
          tvl: row.currentLTV
        })
      }
      this.putCache("loan/flexible/ongoing/orders", result);
    } catch (e) {
      console.error(e);
    }

    return result;
  }

  getEarnList() {
    const cache = this.getCache("simple-earn/flexible");
    if (cache) {
      return cache;
    }

    const result = [];

    try {
      const res = this.fetch("GET", "/sapi/v1/simple-earn/flexible/position", { size: 100 });
      const rows = res?.rows ?? [];
      for (let row of rows) {
        result.push({
          asset: row.asset,
          amount: row.totalAmount
        })
      }
      this.putCache("simple-earn/flexible", result);
    } catch (e) {
      console.error(e);
    }

    return result;
  }

  getAssetList() {
    const cache = this.getCache("getUserAsset");
    if (cache) {
      return cache;
    }

    const result = [];

    try {
      const _result = this.fetch("POST", "/sapi/v3/asset/getUserAsset");
      result.push(..._result);
      this.putCache("getUserAsset", result);
    } catch (e) {
      console.error(e);
    }

    return result;
  }

  fetch(method = "GET", url, query = {}, sign = true) {
    url = `https://binance-api.dannyball710.net${url}`;

    const timestamp = Number(new Date().getTime()).toFixed(0);
    if (sign) {
      query.timestamp = timestamp;
    }

    const keys = Object.keys(query);
    let queryString = keys.map(key => `${key}=${query[key]}`).join("&");

    const headers = {
    }
    if (sign) {
      let signature = Utilities.computeHmacSha256Signature(queryString, this.secretKey);
      signature = signature.map(function (e) {
        var v = (e < 0 ? e + 256 : e).toString(16);
        return v.length == 1 ? "0" + v : v;
      }).join("");
      queryString += `&signature=${signature}`;
      headers["X-MBX-APIKEY"] = this.apiKey;
    }
    const options = {
      method: method,
      headers: headers,
      muteHttpExceptions: true
    }
    if (method === "GET") {
      url += `?${queryString}`;
    } else {
      options.payload = queryString;
    }
    const res = UrlFetchApp.fetch(url, options);
    return JSON.parse(res);
  }
}


// Dexscreener Api

function getDexscreenerProvider() {
  if (!dexscreenerProvider) {
    dexscreenerProvider = new DexscreenerProvider();
  }
  return dexscreenerProvider;
}

class DexscreenerProvider {
  constructor() {
    this.cache = CacheService.getDocumentCache()
  }

  getCache(address) {
    const cacheKey = `dexscreener_${address}`;
    const cache = this.cache.get(cacheKey);
    if (cache) {
      return JSON.parse(cache);
    }
    return null;
  }

  putCache(address, data) {
    const cacheKey = `dexscreener_${address}`;
    this.cache.put(cacheKey, JSON.stringify(data), CACHE_TIMEOUT);
  }

  getDexscreenerData(address) {
    const cache = this.getCache(address);
    if (cache) {
      return cache;
    }
    const result = {
      price: 0,
      priceChange24h: 0
    }
    const res = UrlFetchApp.fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`, { 'muteHttpExceptions': true });
    try {
      const data = JSON.parse(res);
      if (Array.isArray(data.pairs) && data.pairs.length > 0) {
        const pair = data.pairs[0];
        result.price = pair.priceUsd;
        result.priceChange24h = pair.priceChange.h24 ?? 0;
      }
      this.putCache(address, result);
    } catch (e) {
      console.log(e)
    }

    return result;
  }
}

function getParameter(name) {
  const sheet = SpreadsheetApp.getActive().getSheetByName("Parameter");
  if (!sheet) {
    console.error("Sheet 'Parameter' not found");
    return null;
  }
  const data = sheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0].trim() === name.trim()) {
      return data[i][1];
    }
  }
  console.error(`Parameter ${name} not found`);
  return null;
}
