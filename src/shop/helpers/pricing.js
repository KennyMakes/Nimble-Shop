function getBaseBuyUnitPriceSp(stockEntry) {
  const raw = stockEntry.salePriceOverrideSp ?? stockEntry.baseValueSp;
  return Math.max(0, Math.floor(raw));
}
function resolveLegacyShopPriceModifierPercent(shopData) {
  return Number(shopData?.economy?.priceModifierPercent ?? 0) || 0;
}
function resolveBuyPricingBreakdown(stockEntry, quantity, shopData, actor = null) {
  const normalizedQuantity = Math.max(0, Math.floor(quantity));
  const baseUnitSp = getBaseBuyUnitPriceSp(stockEntry);
  const shopModifierPercent = resolveLegacyShopPriceModifierPercent(shopData);
  const modifiedUnitSp = Math.max(0, Math.round(baseUnitSp * (1 + shopModifierPercent / 100)));
  const subtotalSp = modifiedUnitSp * normalizedQuantity;
  const actorPricingEntry = getEconomyActorPricingEntry(shopData, actor);
  const actorPricingMode = String(actorPricingEntry?.mode ?? "").toLowerCase();
  const actorPricingPercent = Math.max(0, Number(actorPricingEntry?.percent ?? 0) || 0);
  const playerDiscountPercent = actorPricingMode === "discount" ? actorPricingPercent : 0;
  const playerDiscountSp = playerDiscountPercent > 0 ? Math.max(0, Math.round(subtotalSp * (playerDiscountPercent / 100))) : 0;
  const afterPlayerDiscountTotalSp = Math.max(0, subtotalSp - playerDiscountSp);
  const actorModifierPercent = actorPricingMode === "markup" ? actorPricingPercent : 0;
  const actorModifierLabel = actorPricingEntry?.note ? actorPricingEntry.note : actorModifierPercent > 0 ? "Surcharge" : playerDiscountPercent > 0 ? "Discount" : null;
  const actorModifierSp = actorModifierPercent > 0 ? Math.max(0, Math.round(afterPlayerDiscountTotalSp * (actorModifierPercent / 100))) : 0;
  const finalTotalSp = Math.max(0, afterPlayerDiscountTotalSp + actorModifierSp);
  const stockRemainingAfterPurchase = stockEntry.infiniteStock ? null : Math.max(0, stockEntry.currentStock - normalizedQuantity);
  return {
    canBuy: normalizedQuantity >= 1 && stockEntry.visible && (stockEntry.infiniteStock || normalizedQuantity <= stockEntry.currentStock),
    quantity: normalizedQuantity,
    baseUnitSp,
    shopModifierPercent,
    modifiedUnitSp,
    subtotalSp,
    bulkDiscountPercent: 0,
    bulkDiscountSp: 0,
    playerDiscountPercent,
    playerDiscountSp,
    salesTaxPercent: 0,
    salesTaxSp: 0,
    actorModifierPercent,
    actorModifierLabel,
    actorModifierSp,
    finalTotalSp,
    stockRemainingAfterPurchase,
    pricingSteps: {
      baseUnitSp,
      shopModifierPercent,
      unitAfterShopModifierSp: modifiedUnitSp,
      subtotalSp,
      bulkDiscountPercent: 0,
      bulkDiscountSp: 0,
      afterBulkTotalSp: subtotalSp,
      playerDiscountPercent,
      playerDiscountSp,
      afterPlayerDiscountTotalSp,
      salesTaxPercent: 0,
      salesTaxSp: 0,
      actorModifierPercent,
      actorModifierLabel,
      actorModifierSp,
      finalTotalSp
    }
  };
}
function resolveBuyTotals(stockEntry, quantity, shopData, actor = null) {
  const breakdown = resolveBuyPricingBreakdown(stockEntry, quantity, shopData, actor);
  return {
    canBuy: breakdown.canBuy,
    quantity: breakdown.quantity,
    baseUnitSp: breakdown.baseUnitSp,
    modifiedUnitSp: breakdown.modifiedUnitSp,
    subtotalSp: breakdown.subtotalSp,
    discountSp: breakdown.playerDiscountSp || 0,
    taxSp: 0,
    finalTotalSp: breakdown.finalTotalSp,
    stockRemainingAfterPurchase: breakdown.stockRemainingAfterPurchase,
    pricingSteps: breakdown.pricingSteps
  };
}
function resolveActorItemBaseValueSp(item) {
  const price = foundry.utils.getProperty(item, "system.price");
  const rawValue = Number(price?.value ?? 0);
  const denomination = String(price?.denomination ?? "sp").toLowerCase();
  if (!Number.isFinite(rawValue) || rawValue < 0) return 0;
  const normalizedValue = Math.floor(rawValue);
  switch (denomination) {
    case "gp":
      return normalizedValue * 10;
    case "sp":
      return normalizedValue;
    case "cp":
      return 0;
    default:
      return normalizedValue;
  }
}
function resolveSellTotals(item, quantity, shopData) {
  const normalizedQuantity = Math.max(0, Math.floor(quantity));
  const baseUnitSp = resolveActorItemBaseValueSp(item);
  const grossTotalSp = baseUnitSp * normalizedQuantity;
  const buybackRate = Math.max(0, shopData.economy.buybackRatePercent ?? 0);
  const finalPayoutSp = Math.max(0, Math.round(grossTotalSp * (buybackRate / 100)));
  return {
    canSell: normalizedQuantity >= 1 && baseUnitSp >= 0,
    quantity: normalizedQuantity,
    baseUnitSp,
    grossTotalSp,
    finalPayoutSp
  };
}

