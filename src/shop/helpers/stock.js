function getStockEntry(shopData, stockEntryId) {
  return shopData.stock.find((entry) => entry.id === stockEntryId) ?? null;
}
function decrementStock(shopData, stockEntryId, quantity) {
  const stockEntry = getStockEntry(shopData, stockEntryId);
  const normalizedQuantity = Math.max(0, Math.floor(quantity));
  if (!stockEntry) {
    return {
      ok: false,
      code: "ITEM_NOT_FOUND",
      message: "Stock entry was not found.",
      data: { stockEntryId }
    };
  }
  if (stockEntry.infiniteStock) {
    return {
      ok: true,
      code: "OK",
      message: `Infinite stock unchanged for ${stockEntry.name}.`,
      data: { stockEntry }
    };
  }
  if (normalizedQuantity < 1) {
    return {
      ok: false,
      code: "INVALID_QUANTITY",
      message: "Quantity must be at least 1.",
      data: { stockEntryId, quantity }
    };
  }
  if (stockEntry.currentStock < normalizedQuantity) {
    return {
      ok: false,
      code: "OUT_OF_STOCK",
      message: `${stockEntry.name} does not have enough stock.`,
      data: {
        stockEntryId,
        currentStock: stockEntry.currentStock,
        requestedQuantity: normalizedQuantity
      }
    };
  }
  stockEntry.currentStock -= normalizedQuantity;
  return {
    ok: true,
    code: "OK",
    message: `Reduced ${stockEntry.name} stock by ${normalizedQuantity}.`,
    data: { stockEntry }
  };
}
function incrementStock(shopData, stockEntryId, quantity) {
  const stockEntry = getStockEntry(shopData, stockEntryId);
  const normalizedQuantity = Math.max(0, Math.floor(quantity));
  if (!stockEntry) {
    return {
      ok: false,
      code: "ITEM_NOT_FOUND",
      message: "Stock entry was not found.",
      data: { stockEntryId }
    };
  }
  if (stockEntry.infiniteStock) {
    return {
      ok: true,
      code: "OK",
      message: `Infinite stock unchanged for ${stockEntry.name}.`,
      data: { stockEntry }
    };
  }
  if (normalizedQuantity < 1) {
    return {
      ok: false,
      code: "INVALID_QUANTITY",
      message: "Quantity must be at least 1.",
      data: { stockEntryId, quantity }
    };
  }
  stockEntry.currentStock += normalizedQuantity;
  return {
    ok: true,
    code: "OK",
    message: `Increased ${stockEntry.name} stock by ${normalizedQuantity}.`,
    data: { stockEntry }
  };
}
function getShopSetting(key, fallback) {
  try {
    const value = game.settings.get(SHOP_MODULE_ID, key);
    return value === undefined ? fallback : value;
  } catch (_err) {
    return fallback;
  }
}
function isRealisticEconomyEnabled() {
  return Boolean(getShopSetting(SHOP_REALISTIC_ECONOMY_ENABLED_SETTING_KEY, false));
}
function getRestockCostPercent() {
  return Math.max(0, Number(getShopSetting(SHOP_RESTOCK_COST_PERCENT_SETTING_KEY, 60)) || 0);
}
function shouldBlockSalesIfTillShort() {
  return Boolean(getShopSetting(SHOP_BLOCK_SALES_IF_TILL_SHORT_SETTING_KEY, true));
}
function shouldAllowPartialRestockWhenTillShort() {
  return Boolean(getShopSetting(SHOP_ALLOW_PARTIAL_RESTOCK_WHEN_TILL_SHORT_SETTING_KEY, true));
}
function shouldWarnInsufficientTill() {
  return Boolean(getShopSetting(SHOP_WARN_INSUFFICIENT_TILL_SETTING_KEY, true));
}
function getEconomyActorPricingEntry(shopData, actor) {
  const actorId = actor?.id ? String(actor.id) : "";
  if (!actorId) return null;
  const entries = Array.isArray(shopData?.economy?.actorPricingEntries) ? shopData.economy.actorPricingEntries : [];
  const found = entries.find((entry) => String(entry?.actorId ?? "") === actorId);
  if (!found) return null;
  const mode = String(found?.mode ?? "").toLowerCase();
  const percent = Math.max(0, Number(found?.percent ?? 0) || 0);
  const legacyDiscount = Math.max(0, Number(found?.discountPercent ?? 0) || 0);
  const legacyMarkup = Math.max(0, Number(found?.markupPercent ?? 0) || 0);
  const resolvedMode = mode === "markup" || mode === "surcharge" ? "markup" : mode === "discount" ? "discount" : legacyMarkup > 0 ? "markup" : "discount";
  const resolvedPercent = percent > 0 ? percent : resolvedMode === "markup" ? legacyMarkup : legacyDiscount;
  return {
    actorId,
    actorNameSnapshot: String(found?.actorNameSnapshot ?? actor?.name ?? ""),
    mode: resolvedMode,
    percent: resolvedPercent,
    note: String(found?.note ?? "")
  };
}

function calculateAffordableRestockUnits(unitSp, needed, percent, availableFundsSp) {
  const normalizedNeeded = Math.max(0, Math.floor(Number(needed) || 0));
  const normalizedUnitSp = Math.max(0, Math.floor(Number(unitSp) || 0));
  const normalizedAvailableSp = Math.max(0, Math.floor(Number(availableFundsSp) || 0));
  if (normalizedNeeded <= 0) return { units: 0, costSp: 0 };
  if (normalizedUnitSp <= 0 || percent <= 0) return { units: normalizedNeeded, costSp: 0 };
  let bestUnits = 0;
  let bestCostSp = 0;
  for (let qty = 1; qty <= normalizedNeeded; qty += 1) {
    const testCostSp = Math.floor(normalizedUnitSp * qty * percent / 100);
    if (testCostSp <= normalizedAvailableSp) {
      bestUnits = qty;
      bestCostSp = testCostSp;
      continue;
    }
    break;
  }
  return { units: bestUnits, costSp: bestCostSp };
}
function applyPartialResetStock(shopData, availableFundsSp, percent) {
  let remainingFundsSp = Math.max(0, Math.floor(Number(availableFundsSp) || 0));
  let costSp = 0;
  let restockedUnits = 0;
  let affectedCount = 0;
  for (const stockEntry of shopData.stock) {
    if (stockEntry.infiniteStock) continue;
    const current = Math.max(0, Math.floor(Number(stockEntry.currentStock) || 0));
    const target = Math.max(0, Math.floor(Number(stockEntry.defaultStock) || 0));
    const needed = Math.max(0, target - current);
    if (needed <= 0) continue;
    const unitSp = Math.max(0, Math.floor(Number(stockEntry.salePriceOverrideSp ?? stockEntry.baseValueSp) || 0));
    const affordable = calculateAffordableRestockUnits(unitSp, needed, percent, remainingFundsSp);
    if (affordable.units <= 0 && !(unitSp <= 0 || percent <= 0)) continue;
    stockEntry.currentStock = current + affordable.units;
    if (affordable.units > 0) {
      affectedCount += 1;
      restockedUnits += affordable.units;
      costSp += affordable.costSp;
      remainingFundsSp = Math.max(0, remainingFundsSp - affordable.costSp);
    }
  }
  return { costSp, restockedUnits, affectedCount, remainingFundsSp };
}
function resetAllStock(shopData) {
  let updatedCount = 0;
  let skippedInfiniteCount = 0;
  for (const stockEntry of shopData.stock) {
    if (stockEntry.infiniteStock) {
      skippedInfiniteCount += 1;
      continue;
    }
    stockEntry.currentStock = Math.max(0, Math.floor(stockEntry.defaultStock));
    updatedCount += 1;
  }
  return {
    ok: true,
    code: "OK",
    message: `Reset ${updatedCount} stock entries to default values.`,
    data: {
      updatedCount,
      skippedInfiniteCount,
      shopId: shopData.shopId
    }
  };
}

