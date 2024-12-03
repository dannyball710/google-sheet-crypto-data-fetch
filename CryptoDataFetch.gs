/**
 * 建立一個分頁，並命名為Parameter，設定以下資訊
 * | Key | Value |
 * | --- | ----- |
 * | binance_api_key | {Api Key} |
 * | binance_secret_key | {Secret Key} |
 * | coinmarketcap_api_key | {Api Key} | (可選)(申請: https://coinmarketcap.com/api/)
 */

const CACHE_TIMEOUT = 20; // 資料快取時間
const cache = CacheService.getDocumentCache();
var dexscreenerProvider, binanceProvider, pendleProvider, coinmarketcapProvider;

function test() {
  let a = coinmarketcap_price("ADA");
  console.log(a);
}

/**
 * 取得Coinmarketcap的最新價格
 * @param name 代幣名稱
 * @returns {number} 價格
 * @customfunction
 * @example =coinmarketcap_price("ETH")
 */
function coinmarketcap_price(name) {
  Utilities.sleep(Math.random() * 1000);
  return parseFloat(getCoinmarketcapProvider().getData(name).price);
}

/**
 * 取得Coinmarketcap的24h價格變化
 * @param name 代幣名稱
 * @returns {number} 價格變化(1 ~ -1)
 * @customfunction
 * @example =coinmarketcap_price_change24h("ETH")
 */
function coinmarketcap_price_change24h(name) {
  Utilities.sleep(Math.random() * 1000);
  return parseFloat(getCoinmarketcapProvider().getData(name).priceChange24h / 100);
}

/**
 * 取得binance的最新價格
 * @param {string} market 交易對
 * @returns {number} 價格
 * @customfunction
 * @example =binance_price("ADAUSDT")
 * 
 */
function binance_price(market) {
  Utilities.sleep(Math.random() * 1000);
  const data = getBinanceProvider().getPrice(market);
  return parseFloat(data?.lastPrice);
}


/**
 * 取得binance的24h價格變化
 * @param {string} market 交易對
 * @returns {number} 價格變化(1 ~ -1)
 * @customfunction
 * @example =binance_price_change24h("ADAUSDT")
 */
function binance_price_change24h(market) {
  Utilities.sleep(Math.random() * 1000);
  const data = getBinanceProvider().getPrice(market);
  return parseFloat(data?.priceChangePercent) / 100;
}

/**
 * 取得binance的抵押借貸資料
 * @param {string} collateralAsset 抵押資產
 * @param {string} loanAsset 負債資產(可用逗號分隔)
 * @param {"tvl"|"collateralAmount"|"loanAmount"} type 資料類型
 * @returns {number} 數量
 * @customfunction
 * @example =binance_loan("BTC", "USDT", "collateralAmount")
 */
function binance_loan(collateralAsset, loanAsset, type = "collateralAmount") {
  Utilities.sleep(Math.random() * 1000);
  const list = getBinanceProvider().getLoanList();
  const loanAssList = loanAsset.split(",").map((asset) => asset.trim());
  let result = 0;
  for (let loan of list) {
    if (
      loanAssList.includes(loan.loanAsset) &&
      (collateralAsset === "any" || loan.collateralAsset === collateralAsset)
    ) {
      console.log(loan);
      result += parseFloat(loan[type]);
    }
  }
  return parseFloat(result);
}

/**
 * 幣安錢包資產
 * @param name 資產Symbol(BTC、ETH、USDT...)
 * @returns {number} 數量
 * @customfunction
 * @example =binance_wallet_asset_amount("BTC")
 */
function binance_wallet_asset_amount(name) {
  Utilities.sleep(Math.random() * 1000);
  const assetList = getBinanceProvider().getAssetList();
  const asset = assetList.find((_asset) => {
    return _asset.asset.toLowerCase() === name.trim().toLowerCase();
  });
  return parseFloat(
    parseFloat(asset?.free ?? 0) + parseFloat(asset?.locked ?? 0)
  );
}

/**
 * 幣安活期賺幣資產
 * @param name 資產Symbol(BTC、ETH、USDT...)
 * @returns 數量
 * @customfunction
 * @example =binance_earn_asset_amount("BTC")
 */
function binance_earn_asset_amount(name) {
  Utilities.sleep(Math.random() * 10000);
  const assetList = getBinanceProvider().getEarnList();
  const asset = assetList.find((_asset) => {
    return _asset.asset.toLowerCase() === name.trim().toLowerCase();
  });
  return parseFloat(asset?.amount ?? 0);
}

/**
 * 取得dexscreener價格
 * @param address 代幣地址，https://dexscreener.com/
 * @returns 價格
 * @customfunction
 * @example =dexscreener_price("0x6b175474e89094c44da98b954eedeac495271d0f")
 */
function dexscreener_price(address) {
  Utilities.sleep(Math.random() * 1000);
  return parseFloat(getDexscreenerProvider().getDexscreenerData(address).price);
}

/**
 * 取得dexscreener價格24h變化
 * @param address 代幣地址，https://dexscreener.com/
 * @returns 價格變化(1 ~ -1)
 * @customfunction
 * @example =dexscreener_price_change24h("0x6b175474e89094c44da98b954eedeac495271d0f")
 */
function dexscreener_price_change24h(address) {
  Utilities.sleep(Math.random() * 1000);
  return (
    parseFloat(
      getDexscreenerProvider().getDexscreenerData(address).priceChange24h
    ) / 100
  );
}

/**
 * 取得pendle代幣價格
 * @param address 代幣地址
 * @returns {number} 價格
 * @customfunction
 */
function pendle_price(chainId, address) {
  Utilities.sleep(Math.random() * 1000);
  return parseFloat(getPendleProvider().getAssetsPrice(chainId, address));
}

function getPendleProvider() {
  if (!pendleProvider) {
    pendleProvider = new PendleProvider();
  }
  return pendleProvider;
}

class PendleProvider {
  constructor() {
    this.cache = CacheService.getDocumentCache();
  }

  getCache(key) {
    const cacheKey = `pendle_${key}`;
    const cache = this.cache.get(cacheKey);
    if (cache) {
      return JSON.parse(cache);
    }
    return null;
  }

  putCache(key, data) {
    const cacheKey = `pendle_${key}`;
    this.cache.put(cacheKey, JSON.stringify(data), CACHE_TIMEOUT);
  }

  getAssetsPrice(chainId, address) {
    const cache = this.getCache(`${chainId}_${address}`);
    if (cache) {
      return cache;
    }

    try {
      const res = UrlFetchApp.fetch(
        `https://api-v2.pendle.finance/core/v1/${chainId}/assets/${address}`
      );
      const result = JSON.parse(res)?.price?.usd || 0;

      if (result) {
        this.putCache(`${chainId}_${address}`, result);
      }
      return result;
    } catch (e) {
      console.error(e);
    }

    return 0;
  }
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

  getOrderList() {
    const res = this.fetch("GET", "/api/v3/allOrders", {
      symbol: "ETHUSDT",
      limit: 1000,
    });
    return res;
  }

  getPrice(market) {
    const cache = this.getCache(market);
    if (cache) {
      return cache;
    }
    let result = {};

    try {
      result = this.fetch(
        "GET",
        "/api/v3/ticker/24hr",
        { symbol: market },
        false
      );
      this.putCache(market, result);
    } catch (e) {
      console.error(e);
    }

    return result;
  }

  getLoanList() {
    const cache = this.getCache("loan/flexible/ongoing/orders");
    if (cache) {
      return cache;
    }
    const result = [];

    try {
      const res = this.fetch("GET", "/sapi/v2/loan/flexible/ongoing/orders", {
        limit: 100,
      });
      const rows = res?.rows ?? [];
      for (let row of rows) {
        result.push({
          loanAsset: row.loanCoin,
          loanAmount: row.totalDebt,
          collateralAsset: row.collateralCoin,
          collateralAmount: row.collateralAmount,
          tvl: row.currentLTV,
        });
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
      const res = this.fetch("GET", "/sapi/v1/simple-earn/flexible/position", {
        size: 100,
      });
      const rows = res?.rows ?? [];
      for (let row of rows) {
        result.push({
          asset: row.asset,
          amount: row.totalAmount,
        });
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
    let queryString = keys.map((key) => `${key}=${query[key]}`).join("&");

    const headers = {};
    if (sign) {
      let signature = Utilities.computeHmacSha256Signature(
        queryString,
        this.secretKey
      );
      signature = signature
        .map(function (e) {
          var v = (e < 0 ? e + 256 : e).toString(16);
          return v.length == 1 ? "0" + v : v;
        })
        .join("");
      queryString += `&signature=${signature}`;
      headers["X-MBX-APIKEY"] = this.apiKey;
    }
    const options = {
      method: method,
      headers: headers,
      muteHttpExceptions: true,
    };
    if (method === "GET") {
      url += `?${queryString}`;
    } else {
      options.payload = queryString;
    }
    const res = UrlFetchApp.fetch(url, options);
    return JSON.parse(res);
  }
}

// Coinmarketcap Api

function getCoinmarketcapProvider() {
  if (!coinmarketcapProvider) {
    coinmarketcapProvider = new CoinmarketcapProvider();
  }
  return coinmarketcapProvider;
}

class CoinmarketcapProvider {
  constructor() {
    this.cache = CacheService.getDocumentCache();
    this.getApiKey();
  }

  getApiKey() {
    this.apiKey = getParameter("coinmarketcap_api_key");
  }

  getCache(address) {
    const cacheKey = `coinmarketcap_${address}`;
    const cache = this.cache.get(cacheKey);
    if (cache) {
      return JSON.parse(cache);
    }
    return null;
  }

  putCache(name, data) {
    const cacheKey = `coinmarketcap_${name}`;
    this.cache.put(cacheKey, JSON.stringify(data), CACHE_TIMEOUT);
  }

  getData(name) {
    const cache = this.getCache(name);
    if (cache) {
      return cache;
    }
    const result = {
      price: 0,
      priceChange24h: 0,
    };
    const res = UrlFetchApp.fetch(
      `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=${name}`,
      {
        muteHttpExceptions: true,
        headers: {
          "X-CMC_PRO_API_KEY": this.apiKey,
        },
      }
    );
    try {
      const data = JSON.parse(res);
      if (!data.data) {
        return result;
      }
      const coin = data.data[name.toUpperCase()]?.[0];
      if(!coin) {
        return result;
      }
      result.price = coin.quote.USD.price;
      result.priceChange24h = coin.quote.USD.percent_change_24h;
      this.putCache(name, result);
    } catch (e) {
      console.log(e);
    }

    return result;
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
    this.cache = CacheService.getDocumentCache();
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
      priceChange24h: 0,
    };
    const res = UrlFetchApp.fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${address}`,
      { muteHttpExceptions: true }
    );
    try {
      const data = JSON.parse(res);
      if (Array.isArray(data.pairs) && data.pairs.length > 0) {
        const pair = data.pairs[0];
        result.price = pair.priceUsd;
        result.priceChange24h = pair.priceChange.h24 ?? 0;
      }
      this.putCache(address, result);
    } catch (e) {
      console.log(e);
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
