function randomId2(prefix) {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rand}`;
}
function normalizeItemKey(name, itemType) {
  const normalizedName = name.trim().toLowerCase().replace(/\s+/g, " ");
  const normalizedType = itemType.trim().toLowerCase();
  return `${normalizedType}::${normalizedName}`;
}
function getItemNormalizedKey(item) {
  return normalizeItemKey(item.name, item.type);
}
function createComparableStockItemData(entry) {
  const snapshot = foundry.utils.deepClone(entry?.itemSnapshot ?? { name: entry?.name ?? "", type: entry?.itemType ?? "object", system: {} });
  foundry.utils.setProperty(snapshot, "name", String(entry?.name ?? snapshot.name ?? ""));
  foundry.utils.setProperty(snapshot, "type", String(entry?.itemType ?? snapshot.type ?? "object"));
  foundry.utils.setProperty(snapshot, "system.quantity", 1);
  return snapshot;
}
function findMatchingStockEntry(shopData, item) {
  const stockEntries = Array.isArray(shopData?.stock) ? shopData.stock : [];
  const sourceUuid = item.getFlag("core", "sourceId");
  if (typeof sourceUuid === "string" && sourceUuid.length > 0) {
    const byUuid = stockEntries.find((entry) => entry.sourceUuid === sourceUuid);
    if (byUuid) return byUuid;
  }
  const normalizedKey = getItemNormalizedKey(item);
  const byNormalizedKey = stockEntries.find((entry) => {
    const entryKey = entry.normalizedKey ?? normalizeItemKey(String(entry?.name ?? ""), String(entry?.itemType ?? entry?.itemSnapshot?.type ?? "object"));
    return entryKey === normalizedKey;
  });
  if (byNormalizedKey) return byNormalizedKey;
  const normalizedName = String(item?.name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const byName = stockEntries.find((entry) => String(entry?.name ?? entry?.itemSnapshot?.name ?? "").trim().toLowerCase().replace(/\s+/g, " ") === normalizedName);
  if (byName) return byName;
  const itemImg = String(item?.img ?? "");
  if (itemImg) {
    const byNameAndImg = stockEntries.find((entry) => {
      const entryName = String(entry?.name ?? entry?.itemSnapshot?.name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
      const entryImg = String(entry?.img ?? entry?.itemSnapshot?.img ?? "");
      return entryName === normalizedName && entryImg === itemImg;
    });
    if (byNameAndImg) return byNameAndImg;
  }
  const soldItemData = item.toObject();
  foundry.utils.setProperty(soldItemData, "system.quantity", 1);
  const bySnapshot = stockEntries.find((entry) => {
    try {
      return areItemsStackCompatible(createComparableStockItemData(entry), soldItemData);
    } catch (_err) {
      return false;
    }
  });
  return bySnapshot ?? null;
}
function createResaleEntryFromItem(item, quantity) {
  const itemObject = item.toObject();
  const normalizedQuantity = Math.max(1, Math.floor(quantity));
  foundry.utils.setProperty(itemObject, "system.quantity", 1);
  const price = foundry.utils.getProperty(itemObject, "system.price");
  const denomination = String(price?.denomination ?? "sp").toLowerCase();
  const rawValue = Number(price?.value ?? 0);
  const normalizedValue = Number.isFinite(rawValue) ? Math.max(0, Math.floor(rawValue)) : 0;
  const baseValueSp = denomination === "gp" ? normalizedValue * 10 : normalizedValue;
  return {
    id: randomId2("stock"),
    sourceUuid: item.getFlag("core", "sourceId") ?? null,
    normalizedKey: getItemNormalizedKey(item),
    itemType: item.type,
    name: item.name,
    img: item.img,
    description: String(foundry.utils.getProperty(itemObject, "system.description.public") ?? foundry.utils.getProperty(itemObject, "system.description") ?? ""),
    category: deriveShopCategoryLabel(itemObject),
    baseValueSp,
    salePriceOverrideSp: null,
    infiniteStock: false,
    currentStock: normalizedQuantity,
    defaultStock: 0,
    visible: true,
    allowSellbackRestock: true,
    isResaleEntry: false,
    itemSnapshot: itemObject
  };
}
function restockFromSellback(shopData, item, quantity) {
  const normalizedQuantity = Math.max(1, Math.floor(quantity));
  const existing = findMatchingStockEntry(shopData, item);
  if (existing) {
    if (existing.infiniteStock || !existing.allowSellbackRestock) {
      return {
        ok: true,
        code: "OK",
        message: `${existing.name} sellback did not alter shop stock.`,
        data: {
          action: "ignored",
          stockEntryId: existing.id
        }
      };
    }
    const incrementResult = incrementStock(shopData, existing.id, normalizedQuantity);
    if (!incrementResult.ok) {
      return incrementResult;
    }
    return {
      ok: true,
      code: "OK",
      message: `Restocked ${existing.name} by ${normalizedQuantity}.`,
      data: {
        action: "incremented",
        stockEntryId: existing.id
      }
    };
  }
  const canBuyUnstockedItems = Boolean(shopData?.stockSettings?.autoCreateResaleEntries);
  if (!canBuyUnstockedItems) {
    return {
      ok: false,
      code: "ITEM_NOT_PURCHASED",
      message: `${shopData.shopName || "This shop"} is not interested in buying ${item.name}.`,
      data: {
        action: "blocked",
        stockEntryId: null
      }
    };
  }
  const resaleEntry = createResaleEntryFromItem(item, normalizedQuantity);
  shopData.stock.push(resaleEntry);
  return {
    ok: true,
    code: "OK",
    message: `Added ${item.name} to shop stock.`,
    data: {
      action: "created",
      stockEntryId: resaleEntry.id
    }
  };
}

