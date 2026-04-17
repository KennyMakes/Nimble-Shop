function assertShopUsable(shopData, mode) {
  if (!shopData.enabled) {
    return {
      ok: false,
      code: "SHOP_DISABLED",
      message: `${shopData.shopName} is currently disabled.`
    };
  }
  if (mode === "buy" && !shopData.allowBuying) {
    return {
      ok: false,
      code: "BUYING_DISABLED",
      message: `${shopData.shopName} is not currently buying goods.`
    };
  }
  if (mode === "sell" && !shopData.allowSelling) {
    return {
      ok: false,
      code: "SELLING_DISABLED",
      message: `${shopData.shopName} is not currently accepting sellback items.`
    };
  }
  return {
    ok: true,
    code: "OK",
    message: `${shopData.shopName} is available for ${mode}.`,
    data: null
  };
}
function assertValidQuantity(quantity) {
  const normalizedQuantity = Math.floor(quantity);
  if (!Number.isFinite(quantity) || normalizedQuantity < 1) {
    return {
      ok: false,
      code: "INVALID_QUANTITY",
      message: "Quantity must be a whole number of at least 1.",
      data: { quantity }
    };
  }
  return {
    ok: true,
    code: "OK",
    message: "Quantity is valid.",
    data: null
  };
}
function assertStockAvailable(stockEntry, quantity) {
  const quantityCheck = assertValidQuantity(quantity);
  if (!quantityCheck.ok) return quantityCheck;
  if (!stockEntry.visible) {
    return {
      ok: false,
      code: "STOCK_ENTRY_HIDDEN",
      message: `${stockEntry.name} is currently hidden.`,
      data: { stockEntryId: stockEntry.id }
    };
  }
  if (!stockEntry.infiniteStock && stockEntry.currentStock < Math.floor(quantity)) {
    return {
      ok: false,
      code: "OUT_OF_STOCK",
      message: `${stockEntry.name} is out of stock.`,
      data: {
        stockEntryId: stockEntry.id,
        currentStock: stockEntry.currentStock,
        requestedQuantity: Math.floor(quantity)
      }
    };
  }
  return {
    ok: true,
    code: "OK",
    message: `${stockEntry.name} is available.`,
    data: null
  };
}

