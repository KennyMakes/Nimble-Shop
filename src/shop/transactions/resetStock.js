async function executeResetAllStockTransaction(journalEntry) {
  const shopData = getShopData(journalEntry);
  if (!shopData) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      message: "This journal entry is not configured as a shop.",
      data: {
        journalEntryId: journalEntry.id
      }
    };
  }
  if (!shopData.enabled) {
    return {
      ok: false,
      code: "SHOP_DISABLED",
      message: `${shopData.shopName} is currently disabled.`,
      data: {
        journalEntryId: journalEntry.id,
        shopId: shopData.shopId
      }
    };
  }
  if (!shopData.stockSettings.resupplyEnabled) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      message: `${shopData.shopName} does not allow stock resupply resets.`,
      data: {
        journalEntryId: journalEntry.id,
        shopId: shopData.shopId
      }
    };
  }
  const resetResult = resetAllStock(shopData);
  if (!resetResult.ok) {
    return resetResult;
  }
  const persistResult = await updateShopData(journalEntry, shopData);
  if (!persistResult.ok) {
    return {
      ok: false,
      code: "UPDATE_FAILED",
      message: "Stock values were reset in memory, but the journal entry could not be updated.",
      data: {
        journalEntryId: journalEntry.id,
        shopId: shopData.shopId,
        repairHint: "Reopen the shop editor and verify the stock values were saved.",
        previousFailure: persistResult
      }
    };
  }
  return {
    ok: true,
    code: "OK",
    message: `Reset stock for ${shopData.shopName}.`,
    data: resetResult.data
  };
}

