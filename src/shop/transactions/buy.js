async function executeBuyTransaction(journalEntry, actor, stockEntryId, quantity) {
  const shopData = getShopData(journalEntry);
  if (!shopData) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      message: "This journal entry is not configured as a shop.",
      data: {
        journalEntryId: journalEntry.id,
        stockEntryId
      }
    };
  }
  const modeCheck = assertShopUsable(shopData, "buy");
  if (!modeCheck.ok) return modeCheck;
  const quantityCheck = assertValidQuantity(quantity);
  if (!quantityCheck.ok) return quantityCheck;
  const stockEntry = shopData.stock.find((entry) => entry.id === stockEntryId) ?? null;
  if (!stockEntry) {
    return {
      ok: false,
      code: "ITEM_NOT_FOUND",
      message: "The selected shop item could not be found.",
      data: {
        journalEntryId: journalEntry.id,
        stockEntryId
      }
    };
  }
  const stockCheck = assertStockAvailable(stockEntry, quantity);
  if (!stockCheck.ok) return stockCheck;
  const totals = resolveBuyTotals(stockEntry, quantity, shopData, actor);
  if (!totals.canBuy) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      message: stockEntry.name + " cannot be purchased right now.",
      data: {
        journalEntryId: journalEntry.id,
        stockEntryId,
        quantity
      }
    };
  }
  if (!canAfford(actor, totals.finalTotalSp)) {
    return {
      ok: false,
      code: "INSUFFICIENT_FUNDS",
      message: actor.name + " does not have enough funds to buy " + stockEntry.name + ".",
      data: {
        actorId: actor.id,
        actorName: actor.name,
        actorFundsSp: actorFundsToSp(actor),
        finalTotalSp: totals.finalTotalSp,
        stockEntryId,
        itemName: stockEntry.name,
        quantity: Math.floor(quantity)
      }
    };
  }
  const subtractResult = await subtractFunds(actor, totals.finalTotalSp);
  if (!subtractResult.ok) return subtractResult;
  const addItemResult = await addPurchasedItemToActor(actor, stockEntry, quantity);
  if (!addItemResult.ok) {
    return {
      ok: false,
      code: "UPDATE_FAILED",
      message: "Funds were deducted, but adding the purchased item failed. GM should review actor funds.",
      data: {
        actorId: actor.id,
        stockEntryId,
        quantity,
        repairHint: "Restore deducted funds if needed.",
        previousFailure: addItemResult
      }
    };
  }
  const decrementResult = decrementStock(shopData, stockEntryId, quantity);
  if (!decrementResult.ok) {
    return {
      ok: false,
      code: "UPDATE_FAILED",
      message: "Funds were deducted and item added, but stock update failed. GM should review shop stock.",
      data: {
        actorId: actor.id,
        stockEntryId,
        quantity,
        repairHint: "Manually reduce the affected stock entry if needed.",
        previousFailure: decrementResult
      }
    };
  }
  if (isRealisticEconomyEnabled()) {
    shopData.economy.availableFundsSp = Math.max(0, Math.floor(Number(shopData.economy.availableFundsSp ?? 0) || 0)) + Math.max(0, Math.floor(Number(totals.finalTotalSp) || 0));
  }
  appendTransactionHistoryEntry(shopData, { type: "buy", actorId: actor.id, actorNameSnapshot: actor.name, itemName: stockEntry.name, quantity: Math.floor(quantity), totalSp: totals.finalTotalSp, timestampMs: Date.now(), itemImg: stockEntry.img ?? stockEntry?.itemSnapshot?.img ?? "icons/svg/item-bag.svg" });
  const persistResult = await updateShopData(journalEntry, shopData);
  if (!persistResult.ok) {
    return {
      ok: false,
      code: "UPDATE_FAILED",
      message: "Funds were deducted and item added, but the shop could not be saved. GM should review stock state.",
      data: {
        actorId: actor.id,
        stockEntryId,
        quantity,
        repairHint: "Confirm the journal entry saved the updated stock values.",
        previousFailure: persistResult
      }
    };
  }
  const remainingFundsSp = subtractResult.data.remainingSp;
  const remainingFunds = spToGpSp(remainingFundsSp);
  const remainingStock = stockEntry.infiniteStock ? null : decrementResult.data.stockEntry.currentStock;
  await createShopReceipt("buy", { actor, actorName: actor.name, itemName: stockEntry.name, quantity: Math.floor(quantity), amountSp: totals.finalTotalSp, itemImg: stockEntry.img ?? stockEntry?.itemSnapshot?.img ?? "icons/svg/item-bag.svg", shopName: shopData.shopName, shopId: shopData.shopId, timestampMs: Date.now() });
  return {
    ok: true,
    code: "OK",
    message: actor.name + " purchased " + String(quantity) + " " + stockEntry.name + " for " + formatNormalizedCurrency(totals.finalTotalSp) + ".",
    data: {
      actorId: actor.id,
      actorName: actor.name,
      journalEntryId: journalEntry.id,
      shopId: shopData.shopId,
      stockEntryId: stockEntry.id,
      itemName: stockEntry.name,
      quantity: Math.floor(quantity),
      baseUnitSp: totals.baseUnitSp,
      modifiedUnitSp: totals.modifiedUnitSp,
      subtotalSp: totals.subtotalSp,
      discountSp: totals.discountSp,
      finalTotalSp: totals.finalTotalSp,
      remainingFundsSp,
      remainingFunds,
      remainingStock,
      stacked: addItemResult.data.stacked,
      purchasedItemId: addItemResult.data.itemId
    }
  };
}

async function executeHiddenBuyTransaction(journalEntry, actor, stockEntryId, quantity) {
  const shopData = getShopData(journalEntry);
  if (!shopData) return { ok: false, code: "VALIDATION_FAILED", message: "This journal entry is not configured as a shop.", data: { journalEntryId: journalEntry.id, stockEntryId } };
  const modeCheck = assertShopUsable(shopData, "buy");
  if (!modeCheck.ok) return modeCheck;
  if (!canActorSeeHiddenStock(shopData, actor)) {
    return { ok: false, code: "VALIDATION_FAILED", message: "This actor cannot access hidden stock.", data: { actorId: actor.id, shopId: shopData.shopId } };
  }
  const quantityCheck = assertValidQuantity(quantity);
  if (!quantityCheck.ok) return quantityCheck;
  const rows = shopData.specialInventory?.hiddenStockRows ?? [];
  const stockEntry = rows.find((entry) => entry.id === stockEntryId) ?? null;
  if (!stockEntry) return { ok: false, code: "ITEM_NOT_FOUND", message: "The selected hidden item could not be found.", data: { stockEntryId } };
  if (!stockEntry.infiniteStock && stockEntry.currentStock < Math.floor(quantity)) {
    return { ok: false, code: "OUT_OF_STOCK", message: `${stockEntry.name} is out of stock.`, data: { stockEntryId, currentStock: stockEntry.currentStock, requestedQuantity: Math.floor(quantity) } };
  }
  const totals = resolveBuyTotals(stockEntry, quantity, shopData, actor);
  const hiddenCanBuy = Math.max(0, Math.floor(quantity)) >= 1 && (stockEntry.infiniteStock || Math.floor(quantity) <= Math.floor(Number(stockEntry.currentStock ?? 0) || 0));
  if (!hiddenCanBuy) return { ok: false, code: "VALIDATION_FAILED", message: `${stockEntry.name} cannot be purchased right now.`, data: { stockEntryId, quantity } };
  if (!canAfford(actor, totals.finalTotalSp)) return { ok: false, code: "INSUFFICIENT_FUNDS", message: `${actor.name} does not have enough funds to buy ${stockEntry.name}.`, data: { actorId: actor.id, actorName: actor.name, actorFundsSp: actorFundsToSp(actor), finalTotalSp: totals.finalTotalSp, stockEntryId, itemName: stockEntry.name, quantity: Math.floor(quantity) } };
  const subtractResult = await subtractFunds(actor, totals.finalTotalSp);
  if (!subtractResult.ok) return subtractResult;
  const addItemResult = await addPurchasedItemToActor(actor, stockEntry, quantity);
  if (!addItemResult.ok) return { ok: false, code: "UPDATE_FAILED", message: "Funds were deducted, but adding the purchased item failed. GM should review actor funds.", data: { actorId: actor.id, stockEntryId, quantity, repairHint: "Restore deducted funds if needed.", previousFailure: addItemResult } };
  const normalizedQuantity = Math.max(0, Math.floor(quantity));
  if (!stockEntry.infiniteStock) stockEntry.currentStock = Math.max(0, Math.floor(Number(stockEntry.currentStock ?? 0) || 0) - normalizedQuantity);
  if (isRealisticEconomyEnabled()) shopData.economy.availableFundsSp = Math.max(0, Math.floor(Number(shopData.economy.availableFundsSp ?? 0) || 0)) + Math.max(0, Math.floor(Number(totals.finalTotalSp) || 0));
  appendTransactionHistoryEntry(shopData, { type: "hidden-buy", actorId: actor.id, actorNameSnapshot: actor.name, itemName: stockEntry.name, quantity: Math.floor(quantity), totalSp: totals.finalTotalSp, timestampMs: Date.now(), itemImg: stockEntry.img ?? stockEntry?.itemSnapshot?.img ?? "icons/svg/item-bag.svg" });
  const persistResult = await updateShopData(journalEntry, shopData);
  if (!persistResult.ok) return { ok: false, code: "UPDATE_FAILED", message: "Funds were deducted and item added, but the shop could not be saved. GM should review hidden stock state.", data: { actorId: actor.id, stockEntryId, quantity, previousFailure: persistResult } };
  await createShopReceipt("hidden-buy", { actor, actorName: actor.name, itemName: stockEntry.name, quantity: Math.floor(quantity), amountSp: totals.finalTotalSp, itemImg: stockEntry.img ?? stockEntry?.itemSnapshot?.img ?? "icons/svg/item-bag.svg", shopName: shopData.shopName, shopId: shopData.shopId, timestampMs: Date.now() });
  return { ok: true, code: "OK", message: `${actor.name} purchased ${Math.floor(quantity)} ${stockEntry.name} for ${formatNormalizedCurrency(totals.finalTotalSp)}.`, data: { actorId: actor.id, actorName: actor.name, journalEntryId: journalEntry.id, shopId: shopData.shopId, stockEntryId: stockEntry.id, itemName: stockEntry.name, quantity: Math.floor(quantity), finalTotalSp: totals.finalTotalSp } };
}
async function executeSpecialOrderTransaction(journalEntry, actor, stockEntryId, quantity) {
  const shopData = getShopData(journalEntry);
  if (!shopData) return { ok: false, code: "VALIDATION_FAILED", message: "This journal entry is not configured as a shop.", data: { journalEntryId: journalEntry.id, stockEntryId } };
  const modeCheck = assertShopUsable(shopData, "buy");
  if (!modeCheck.ok) return modeCheck;
  if (!shopData?.specialInventory?.specialOrdersEnabled) return { ok: false, code: "VALIDATION_FAILED", message: "Custom orders are not enabled in this shop.", data: { shopId: shopData.shopId } };
  const quantityCheck = assertValidQuantity(quantity);
  if (!quantityCheck.ok) return quantityCheck;
  const stockEntry = (shopData?.specialInventory?.specialOrderRows ?? []).find((entry) => entry.id === stockEntryId && entry.visible !== false) ?? null;
  if (!stockEntry) return { ok: false, code: "ITEM_NOT_FOUND", message: "The selected orderable item could not be found.", data: { stockEntryId } };
  const totals = resolveBuyTotals(stockEntry, quantity, shopData, actor);
  if (!canAfford(actor, totals.finalTotalSp)) return { ok: false, code: "INSUFFICIENT_FUNDS", message: `${actor.name} does not have enough funds to order ${stockEntry.name}.`, data: { actorId: actor.id, actorName: actor.name, actorFundsSp: actorFundsToSp(actor), finalTotalSp: totals.finalTotalSp, stockEntryId, itemName: stockEntry.name, quantity: Math.floor(quantity) } };
  const subtractResult = await subtractFunds(actor, totals.finalTotalSp);
  if (!subtractResult.ok) return subtractResult;
  if (isRealisticEconomyEnabled()) shopData.economy.availableFundsSp = Math.max(0, Math.floor(Number(shopData.economy.availableFundsSp ?? 0) || 0)) + Math.max(0, Math.floor(Number(totals.finalTotalSp) || 0));
  appendTransactionHistoryEntry(shopData, { type: "special-order", actorId: actor.id, actorNameSnapshot: actor.name, itemName: stockEntry.name, quantity: Math.floor(quantity), totalSp: totals.finalTotalSp, timestampMs: Date.now(), itemImg: stockEntry.img ?? stockEntry?.itemSnapshot?.img ?? "icons/svg/item-bag.svg", note: stockEntry.leadTimeLabel || "" });
  shopData.orderManagement.pendingOrders.push(normalizePendingOrder({
    actorId: actor.id,
    actorNameSnapshot: actor.name,
    itemName: stockEntry.name,
    quantity: Math.floor(quantity),
    totalPaidSp: totals.finalTotalSp,
    leadTimeLabel: stockEntry.leadTimeLabel || "",
    specialOrderNote: stockEntry.specialOrderNote || "",
    sourceUuid: stockEntry.sourceUuid ?? null,
    itemType: stockEntry.itemType ?? stockEntry?.itemSnapshot?.type ?? "object",
    img: stockEntry.img ?? stockEntry?.itemSnapshot?.img ?? "icons/svg/item-bag.svg",
    description: stockEntry.description ?? "",
    itemSnapshot: foundry.utils.deepClone(stockEntry.itemSnapshot ?? { name: stockEntry.name, type: stockEntry.itemType ?? "object", img: stockEntry.img ?? "icons/svg/item-bag.svg", system: { quantity: 1 } }),
    status: "pending"
  }));
  const persistResult = await updateShopData(journalEntry, shopData);
  if (!persistResult.ok) return { ok: false, code: "UPDATE_FAILED", message: "Funds were deducted, but the special order could not be saved. GM should review pending orders.", data: { actorId: actor.id, stockEntryId, quantity, previousFailure: persistResult } };
  await createShopReceipt("special-order", { actor, actorName: actor.name, itemName: stockEntry.name, quantity: Math.floor(quantity), amountSp: totals.finalTotalSp, itemImg: stockEntry.img ?? stockEntry?.itemSnapshot?.img ?? "icons/svg/item-bag.svg", shopName: shopData.shopName, shopId: shopData.shopId, timestampMs: Date.now(), leadTimeLabel: stockEntry.leadTimeLabel || "", note: stockEntry.specialOrderNote || "" });
  return { ok: true, code: "OK", message: `${actor.name} placed a special order for ${Math.floor(quantity)} ${stockEntry.name} for ${formatNormalizedCurrency(totals.finalTotalSp)}.`, data: { actorId: actor.id, actorName: actor.name, journalEntryId: journalEntry.id, shopId: shopData.shopId, stockEntryId: stockEntry.id, itemName: stockEntry.name, quantity: Math.floor(quantity), finalTotalSp: totals.finalTotalSp } };
}

