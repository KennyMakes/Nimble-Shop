async function executeSellTransaction(journalEntry, actor, actorItemId, quantity) {
  const shopData = getShopData(journalEntry);
  if (!shopData) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      message: "This journal entry is not configured as a shop.",
      data: {
        journalEntryId: journalEntry.id,
        actorItemId
      }
    };
  }
  const modeCheck = assertShopUsable(shopData, "sell");
  if (!modeCheck.ok) return modeCheck;
  const quantityCheck = assertValidQuantity(quantity);
  if (!quantityCheck.ok) return quantityCheck;
  const item = actor.items.get(actorItemId) ?? null;
  if (!item) {
    return {
      ok: false,
      code: "ITEM_NOT_FOUND",
      message: "The selected actor item could not be found.",
      data: {
        actorId: actor.id,
        actorItemId
      }
    };
  }
  if (!isSellableItem(item)) {
    return {
      ok: false,
      code: "ITEM_NOT_SELLABLE",
      message: item.name + " cannot be sold to this shop.",
      data: {
        actorId: actor.id,
        actorName: actor.name,
        actorItemId,
        itemName: item.name,
        itemType: item.type,
        quantity: Math.floor(quantity)
      }
    };
  }
  const itemSnapshot = item.toObject();
  const itemName = item.name;
  const itemId = item.id;
  const itemType = item.type;
  const matchingStockEntry = findMatchingStockEntry(shopData, item);
  const canBuyUnstockedItems = Boolean(shopData?.stockSettings?.autoCreateResaleEntries);
  if (!matchingStockEntry && !canBuyUnstockedItems) {
    return {
      ok: false,
      code: "ITEM_NOT_PURCHASED",
      message: `${shopData.shopName || "This shop"} is not interested in buying ${itemName}.`,
      data: {
        actorId: actor.id,
        actorName: actor.name,
        actorItemId,
        itemName,
        itemType,
        quantity: Math.floor(quantity),
        matchedExistingStock: false,
        canBuyUnstockedItems
      }
    };
  }
  const totals = resolveSellTotals(item, quantity, shopData);
  if (!totals.canSell) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      message: itemName + " cannot be sold right now.",
      data: {
        actorId: actor.id,
        actorItemId,
        quantity
      }
    };
  }
  if (isRealisticEconomyEnabled()) {
    const currentTillSp = Math.max(0, Math.floor(Number(shopData.economy.availableFundsSp ?? 0) || 0));
    if (shouldBlockSalesIfTillShort() && currentTillSp < totals.finalPayoutSp) {
      return {
        ok: false,
        code: "VALIDATION_FAILED",
        message: `${shopData.shopName || "This shop"} does not have enough till funds for that sale.`,
        data: { shopId: shopData.shopId, availableFundsSp: currentTillSp, finalPayoutSp: totals.finalPayoutSp }
      };
    }
  }
  const removeResult = await removeSoldItemFromActor(actor, item, quantity);
  if (!removeResult.ok) return removeResult;
  const addFundsResult = await addFunds(actor, totals.finalPayoutSp);
  if (!addFundsResult.ok) {
    return {
      ok: false,
      code: "UPDATE_FAILED",
      message: "Item removal succeeded, but adding sellback funds failed. GM should review actor inventory and currency.",
      data: {
        actorId: actor.id,
        actorItemId,
        quantity,
        repairHint: "Restore the sold item or manually grant funds if needed.",
        previousFailure: addFundsResult
      }
    };
  }
  const snapshotLikeItem = {
    id: itemId,
    name: itemName,
    type: itemType,
    img: String(itemSnapshot.img ?? ""),
    toObject: () => foundry.utils.deepClone(itemSnapshot),
    getFlag: (scope, key) => {
      return foundry.utils.getProperty(itemSnapshot, `flags.${scope}.${key}`);
    }
  };
  if (isRealisticEconomyEnabled()) {
    const currentTillSp = Math.max(0, Math.floor(Number(shopData.economy.availableFundsSp ?? 0) || 0));
    shopData.economy.availableFundsSp = Math.max(0, currentTillSp - Math.max(0, Math.floor(Number(totals.finalPayoutSp) || 0)));
  }
  const restockResult = restockFromSellback(shopData, snapshotLikeItem, quantity);
  if (!restockResult.ok) {
    return {
      ok: false,
      code: "UPDATE_FAILED",
      message: "Item removal and funds update succeeded, but shop restock failed. GM should review shop stock.",
      data: {
        actorId: actor.id,
        actorItemId,
        quantity,
        repairHint: "Manually adjust shop stock if needed.",
        previousFailure: restockResult
      }
    };
  }
  appendTransactionHistoryEntry(shopData, { type: "sell", actorId: actor.id, actorNameSnapshot: actor.name, itemName, quantity: Math.floor(quantity), totalSp: totals.finalPayoutSp, timestampMs: Date.now(), itemImg: String(itemSnapshot.img ?? item.img ?? "icons/svg/item-bag.svg") });
  const persistResult = await updateShopData(journalEntry, shopData);
  if (!persistResult.ok) {
    return {
      ok: false,
      code: "UPDATE_FAILED",
      message: "Item removal and funds update succeeded, but the shop could not be saved. GM should review the journal entry flags.",
      data: {
        actorId: actor.id,
        actorItemId,
        quantity,
        repairHint: "Confirm the journal entry saved the updated stock values.",
        previousFailure: persistResult
      }
    };
  }
  const newFundsSp = actorFundsToSp(actor);
  const newFunds = spToGpSp(newFundsSp);
  await createShopReceipt("sell", { actor, actorName: actor.name, itemName, quantity: Math.floor(quantity), amountSp: totals.finalPayoutSp, itemImg: String(itemSnapshot.img ?? item.img ?? "icons/svg/item-bag.svg"), shopName: shopData.shopName, shopId: shopData.shopId, timestampMs: Date.now() });
  return {
    ok: true,
    code: "OK",
    message: actor.name + " sold " + String(quantity) + " " + itemName + " for " + formatNormalizedCurrency(totals.finalPayoutSp) + ".",
    data: {
      actorId: actor.id,
      actorName: actor.name,
      journalEntryId: journalEntry.id,
      shopId: shopData.shopId,
      actorItemId: itemId,
      itemName,
      quantity: Math.floor(quantity),
      baseUnitSp: totals.baseUnitSp,
      grossTotalSp: totals.grossTotalSp,
      finalPayoutSp: totals.finalPayoutSp,
      newFundsSp,
      newFunds,
      stockAction: restockResult.data.action,
      stockEntryId: restockResult.data.stockEntryId
    }
  };
}

