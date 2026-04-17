function getItemQuantity(item) {
  const raw = foundry.utils.getProperty(item, "system.quantity");
  return Number.isFinite(raw) ? Math.max(0, Math.floor(Number(raw))) : 1;
}
function hasQuantityField(item) {
  return foundry.utils.hasProperty(item, "system.quantity");
}
function setItemQuantity(data, quantity) {
  const clone = foundry.utils.deepClone(data);
  if (!clone.system || typeof clone.system !== "object") {
    clone.system = {};
  }
  foundry.utils.setProperty(clone, "system.quantity", Math.max(1, Math.floor(quantity)));
  return clone;
}
function getComparablePriceData(data) {
  const denomination = String(foundry.utils.getProperty(data, "system.price.denomination") ?? "").toLowerCase();
  const rawValue = foundry.utils.getProperty(data, "system.price.value");
  const value = Number.isFinite(rawValue) ? Number(rawValue) : 0;
  return { denomination, value };
}
function areItemsStackCompatible(existingItem, itemData) {
  const existingType = existingItem.type;
  const newType = String(itemData.type ?? "");
  if (existingType !== newType) return false;
  const existingName = existingItem.name.trim().toLowerCase();
  const newName = String(itemData.name ?? "").trim().toLowerCase();
  if (!existingName || !newName || existingName !== newName) return false;
  if (!hasQuantityField(existingItem)) return false;
  const existingPrice = getComparablePriceData(existingItem.toObject());
  const newPrice = getComparablePriceData(itemData);
  if (existingPrice.denomination !== newPrice.denomination || existingPrice.value !== newPrice.value) {
    return false;
  }
  const existingTypeTag = String(foundry.utils.getProperty(existingItem, "system.objectType") ?? "");
  const newTypeTag = String(foundry.utils.getProperty(itemData, "system.objectType") ?? "");
  if (existingTypeTag !== newTypeTag) return false;
  return true;
}
function isSellableItem(item) {
  return item.type === "object";
}
function getActorSellableItems(actor) {
  return actor.items.filter((item) => isSellableItem(item));
}
function getActorSellableItemsFiltered(actor, categoryFilter, searchText) {
  const normalizedCategory = String(categoryFilter || "All").trim();
  const search = String(searchText || "").trim().toLowerCase();
  return getActorSellableItems(actor).filter((item) => {
    const categoryMatches = normalizedCategory === "All" || getItemCategoryLabel(item) === normalizedCategory;
    if (!categoryMatches) return false;
    if (!search) return true;
    const haystack = [
      item.name,
      getItemCategoryLabel(item),
      getItemDescriptionText(item)
    ].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(search);
  });
}
function buildPurchasedItemData(stockEntry, quantity) {
  const snapshot = foundry.utils.deepClone(stockEntry.itemSnapshot);
  return setItemQuantity(snapshot, quantity);
}
function findMatchingOwnedStack(actor, itemData) {
  for (const item of actor.items) {
    if (areItemsStackCompatible(item, itemData)) {
      return item;
    }
  }
  return null;
}
async function addPurchasedItemToActor(actor, stockEntry, quantity) {
  const normalizedQuantity = Math.max(1, Math.floor(quantity));
  const itemData = buildPurchasedItemData(stockEntry, normalizedQuantity);
  try {
    const existingStack = findMatchingOwnedStack(actor, itemData);
    if (existingStack) {
      const currentQty = getItemQuantity(existingStack);
      const newQty = currentQty + normalizedQuantity;
      await existingStack.update({ "system.quantity": newQty });
      return {
        ok: true,
        code: "OK",
        message: `Added ${normalizedQuantity} ${stockEntry.name} to existing stack.`,
        data: {
          itemId: existingStack.id,
          stacked: true,
          quantityAdded: normalizedQuantity
        }
      };
    }
    const created = await actor.createEmbeddedDocuments("Item", [itemData]);
    const createdItem = created[0];
    if (!createdItem) {
      return {
        ok: false,
        code: "UPDATE_FAILED",
        message: `Failed to create purchased item ${stockEntry.name} on ${actor.name}.`,
        data: {
          actorId: actor.id,
          stockEntryId: stockEntry.id
        }
      };
    }
    return {
      ok: true,
      code: "OK",
      message: `Added ${normalizedQuantity} ${stockEntry.name} to ${actor.name}.`,
      data: {
        itemId: createdItem.id,
        stacked: false,
        quantityAdded: normalizedQuantity
      }
    };
  } catch (error) {
    console.error(`${SHOP_MODULE_ID} | Failed to add purchased item`, error);
    return {
      ok: false,
      code: "UPDATE_FAILED",
      message: `Failed to add ${stockEntry.name} to ${actor.name}.`,
      data: {
        actorId: actor.id,
        stockEntryId: stockEntry.id,
        error
      }
    };
  }
}
async function removeSoldItemFromActor(actor, item, quantity) {
  const normalizedQuantity = Math.max(1, Math.floor(quantity));
  try {
    if (hasQuantityField(item)) {
      const currentQty = getItemQuantity(item);
      if (normalizedQuantity > currentQty) {
        return {
          ok: false,
          code: "INVALID_QUANTITY",
          message: `${actor.name} does not have enough ${item.name} to sell.`,
          data: {
            actorId: actor.id,
            actorItemId: item.id,
            currentQuantity: currentQty,
            requestedQuantity: normalizedQuantity
          }
        };
      }
      const remainingQuantity = currentQty - normalizedQuantity;
      if (remainingQuantity <= 0) {
        await item.delete();
        return {
          ok: true,
          code: "OK",
          message: `Removed ${item.name} from ${actor.name}.`,
          data: {
            removed: true,
            remainingQuantity: 0
          }
        };
      }
      await item.update({ "system.quantity": remainingQuantity });
      return {
        ok: true,
        code: "OK",
        message: `Reduced ${item.name} quantity on ${actor.name}.`,
        data: {
          removed: false,
          remainingQuantity
        }
      };
    }
    if (normalizedQuantity !== 1) {
      return {
        ok: false,
        code: "INVALID_QUANTITY",
        message: `${item.name} is not stackable and can only be sold one at a time.`,
        data: {
          actorId: actor.id,
          actorItemId: item.id,
          requestedQuantity: normalizedQuantity
        }
      };
    }
    await item.delete();
    return {
      ok: true,
      code: "OK",
      message: `Removed ${item.name} from ${actor.name}.`,
      data: {
        removed: true,
        remainingQuantity: 0
      }
    };
  } catch (error) {
    console.error(`${SHOP_MODULE_ID} | Failed to remove sold item`, error);
    return {
      ok: false,
      code: "UPDATE_FAILED",
      message: `Failed to remove ${item.name} from ${actor.name}.`,
      data: {
        actorId: actor.id,
        actorItemId: item.id,
        error
      }
    };
  }
}

