// scripts/shop/constants.ts
var SHOP_MODULE_ID = "nimble-shop";
var SHOP_FLAG_KEY = "shop";
var SHOP_FLAG_PATH = `flags.${SHOP_MODULE_ID}.${SHOP_FLAG_KEY}`;
var SHOP_SCHEMA_VERSION = 1;
var DEFAULT_SHOP_CATEGORIES = [
  "Adventuring Gear",
  "Tools",
  "Weapons",
  "Armor",
  "Consumables",
  "Magic",
  "Resale",
  "Misc"
];
var DEFAULT_SHOP_DATA = {
  version: SHOP_SCHEMA_VERSION,
  enabled: true,
  shopId: "",
  shopName: "New Shop",
  shopkeeperName: "",
  description: "",
  merchantProfile: {
    merchantName: "",
    merchantRoleTitle: "",
    shopDescription: "",
    settlementTag: "",
    regionTag: "",
    factionTag: "",
    merchantNotes: "",
    pricingReputationNotes: ""
  },
  specialInventory: {
    hiddenStockEnabled: false,
    specialOrdersEnabled: false,
    hiddenStockRows: [],
    specialOrderRows: [],
    hiddenAudienceEntries: []
  },
  orderManagement: {
    pendingOrders: [],
    fulfilledOrders: []
  },
  transactionHistory: {
    recentTransactions: []
  },
  presetMeta: {
    lastAppliedPresetId: "",
    lastAppliedPresetName: "",
    lastAppliedAtMs: 0
  },
  visibleToPlayers: true,
  allowBuying: true,
  allowSelling: true,
  actorSelectionMode: "auto",
  economy: {
    priceModifierPercent: 0,
    buybackRatePercent: 50,
    availableFundsSp: 0,
    defaultFundsSp: 0,
    actorPricingEntries: []
  },
  stockSettings: {
    resupplyEnabled: true,
    autoCreateResaleEntries: true
  },
  ui: {
    showImages: true,
    showCategories: true,
    defaultTab: "buy"
  },
  stock: []
};
var GP_TO_SP = 10;

// scripts/shop/helpers/actors.ts
function isPlayerOwnedCharacter(actor) {
  if (actor.type !== "character") return false;
  return game.users.some((user) => {
    if (!user.isGM) {
      return actor.testUserPermission(user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
    }
    return false;
  });
}
function getPlayerOwnedActors() {
  return game.actors.filter((actor) => isPlayerOwnedCharacter(actor));
}
function getControlledActorForUser(user) {
  const controlled = canvas?.tokens?.controlled ?? [];
  for (const token of controlled) {
    const actor = token.actor;
    if (!actor) continue;
    if (actor.testUserPermission(user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)) {
      return actor;
    }
  }
  return null;
}
function resolveEligibleActorForUser(user) {
  const controlled = getControlledActorForUser(user);
  if (controlled) return controlled;
  if (user.isGM) {
    const playerOwnedActors = getPlayerOwnedActors();
    return playerOwnedActors[0] ?? null;
  }
  const ownedCharacters = game.actors.filter((actor) => {
    return actor.type === "character" && actor.testUserPermission(user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
  });
  if (ownedCharacters.length === 1) {
    return ownedCharacters[0];
  }
  if (ownedCharacters.length > 1) {
    const primary = ownedCharacters.find(
      (actor) => actor.getFlag(SHOP_MODULE_ID, "preferredShopActor") === true
    );
    return primary ?? ownedCharacters[0];
  }
  return null;
}

// scripts/shop/helpers/currency.ts
var CURRENCY_PATHS = {
  gp: "system.currency.gp.value",
  sp: "system.currency.sp.value"
};
function readNumeric(obj, path) {
  const value = foundry.utils.getProperty(obj, path);
  return Number.isFinite(value) ? Number(value) : 0;
}
function buildCurrencyUpdate(totalSp) {
  const { gp, sp } = spToGpSp(totalSp);
  return {
    [CURRENCY_PATHS.gp]: gp,
    [CURRENCY_PATHS.sp]: sp
  };
}
function actorFundsToSp(actor) {
  const gp = readNumeric(actor, CURRENCY_PATHS.gp);
  const sp = readNumeric(actor, CURRENCY_PATHS.sp);
  return gp * GP_TO_SP + sp;
}
function actorFundsToGpSp(actor) {
  return {
    gp: readNumeric(actor, CURRENCY_PATHS.gp),
    sp: readNumeric(actor, CURRENCY_PATHS.sp)
  };
}
function spToGpSp(totalSp) {
  const sanitized = Math.max(0, Math.floor(totalSp));
  return {
    gp: Math.floor(sanitized / GP_TO_SP),
    sp: sanitized % GP_TO_SP
  };
}
function formatNormalizedCurrency(totalSp) {
  const sanitized = Math.max(0, Math.floor(Number(totalSp) || 0));
  const { gp, sp } = spToGpSp(sanitized);
  if (gp > 0 && sp > 0) return `${gp} GP ${sp} SP`;
  if (gp > 0) return `${gp} GP`;
  if (sp > 0) return `${sp} SP`;
  return "0 GP";
}
function getNormalizedCurrencyParts(totalSp) {
  const sanitized = Math.max(0, Math.floor(Number(totalSp) || 0));
  const { gp, sp } = spToGpSp(sanitized);
  const parts = [];
  if (gp > 0 || sanitized === 0) parts.push({ kind: "gp", label: `${gp}`, ariaLabel: `${gp} GP` });
  if (sp > 0) parts.push({ kind: "sp", label: `${sp}`, ariaLabel: `${sp} SP` });
  return parts;
}
function formatCurrencyPills(totalSp, extraClass = "") {
  const parts = getNormalizedCurrencyParts(totalSp);
  const classes = ["shop-currency-stack", "shop-currency-stack--force-inline"];
  if (extraClass) classes.push(extraClass);
  return `<span class="${classes.join(" ")}">${parts.map((part) => `<span class="shop-currency-pill shop-currency-pill--${part.kind}" aria-label="${part.ariaLabel}" title="${part.ariaLabel}"><i class="fas fa-coins"></i><span>${part.label}</span></span>`).join("")}</span>`;
}
function parseNormalizedCurrencyInput(value, fallback = 0) {
  const fallbackSp = Math.max(0, Math.floor(Number(fallback) || 0));
  if (value == null) return fallbackSp;
  const raw = String(value).trim();
  if (!raw) return fallbackSp;
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) return Math.max(0, Math.round(numeric * GP_TO_SP));
  let totalSp = 0;
  let matched = false;
  const pattern = /(\d+(?:\.\d+)?)\s*(gp|sp)/gi;
  for (const match of raw.matchAll(pattern)) {
    matched = true;
    const amount = Number(match[1]);
    if (!Number.isFinite(amount)) continue;
    totalSp += match[2].toLowerCase() === "gp" ? Math.round(amount * GP_TO_SP) : Math.round(amount);
  }
  return matched ? Math.max(0, totalSp) : fallbackSp;
}
function canAfford(actor, costSp) {
  if (!Number.isFinite(costSp) || costSp < 0) return false;
  return actorFundsToSp(actor) >= Math.floor(costSp);
}
async function subtractFunds(actor, costSp) {
  const normalizedCost = Math.max(0, Math.floor(costSp));
  const currentTotalSp = actorFundsToSp(actor);
  if (currentTotalSp < normalizedCost) {
    return {
      ok: false,
      code: "INSUFFICIENT_FUNDS",
      message: `${actor.name} does not have enough funds.`,
      data: {
        actorId: actor.id,
        currentTotalSp,
        requestedCostSp: normalizedCost
      }
    };
  }
  const remainingSp = currentTotalSp - normalizedCost;
  const { gp, sp } = spToGpSp(remainingSp);
  try {
    await actor.update(buildCurrencyUpdate(remainingSp));
    return {
      ok: true,
      code: "OK",
      message: `Subtracted ${normalizedCost} SP from ${actor.name}.`,
      data: {
        gp,
        sp,
        remainingSp
      }
    };
  } catch (error) {
    console.error(`${SHOP_MODULE_ID} | Failed to subtract funds`, error);
    return {
      ok: false,
      code: "UPDATE_FAILED",
      message: `Failed to subtract funds from ${actor.name}.`,
      data: {
        actorId: actor.id,
        requestedCostSp: normalizedCost,
        error
      }
    };
  }
}
async function addFunds(actor, amountSp) {
  const normalizedAmount = Math.max(0, Math.floor(amountSp));
  const currentTotalSp = actorFundsToSp(actor);
  const newTotalSp = currentTotalSp + normalizedAmount;
  const { gp, sp } = spToGpSp(newTotalSp);
  try {
    await actor.update(buildCurrencyUpdate(newTotalSp));
    return {
      ok: true,
      code: "OK",
      message: `Added ${normalizedAmount} SP to ${actor.name}.`,
      data: {
        gp,
        sp,
        totalSp: newTotalSp
      }
    };
  } catch (error) {
    console.error(`${SHOP_MODULE_ID} | Failed to add funds`, error);
    return {
      ok: false,
      code: "UPDATE_FAILED",
      message: `Failed to add funds to ${actor.name}.`,
      data: {
        actorId: actor.id,
        amountSp: normalizedAmount,
        error
      }
    };
  }
}

// scripts/shop/helpers/inventory.ts
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

// scripts/shop/helpers/journal.ts
function normalizeActorPricingEntry(entry) {
  const modeRaw = String(entry?.mode ?? "discount").toLowerCase();
  const mode = modeRaw === "markup" || modeRaw === "surcharge" ? "markup" : "discount";
  const id = typeof entry?.id === "string" && entry.id.trim().length > 0 ? entry.id.trim() : (typeof randomId2 === "function" ? randomId2("actorprice") : foundry.utils.randomID());
  const actorId = typeof entry?.actorId === "string" ? entry.actorId : "";
  const actorNameSnapshot = typeof entry?.actorNameSnapshot === "string" ? entry.actorNameSnapshot : typeof entry?.actorName === "string" ? entry.actorName : "";
  const percentValue = Number(entry?.percent ?? (mode === "markup" ? entry?.markupPercent : entry?.discountPercent) ?? 0);
  const percent = Math.max(0, Number.isFinite(percentValue) ? percentValue : 0);
  const note = typeof entry?.note === "string" ? entry.note : typeof entry?.label === "string" ? entry.label : "";
  return { id, actorId, actorNameSnapshot, mode, percent, note };
}
function normalizeHiddenAudienceEntry(entry) {
  const id = typeof entry?.id === "string" && entry.id.trim().length > 0 ? entry.id.trim() : (typeof randomId2 === "function" ? randomId2("hiddenaud") : foundry.utils.randomID());
  const actorId = typeof entry?.actorId === "string" ? entry.actorId : "";
  const actorNameSnapshot = typeof entry?.actorNameSnapshot === "string" ? entry.actorNameSnapshot : typeof entry?.actorName === "string" ? entry.actorName : "";
  const note = typeof entry?.note === "string" ? entry.note : typeof entry?.label === "string" ? entry.label : "";
  return { id, actorId, actorNameSnapshot, note };
}
function normalizeTransactionEntry(entry) {
  const id = typeof entry?.id === "string" && entry.id.trim().length > 0 ? entry.id.trim() : (typeof randomId2 === "function" ? randomId2("txn") : foundry.utils.randomID());
  const typeRaw = String(entry?.type ?? "buy").trim().toLowerCase();
  const type = ["buy","sell","hidden-buy","special-order","fulfill-order"].includes(typeRaw) ? typeRaw : "buy";
  const actorId = typeof entry?.actorId === "string" ? entry.actorId : "";
  const actorNameSnapshot = typeof entry?.actorNameSnapshot === "string" ? entry.actorNameSnapshot : typeof entry?.actorName === "string" ? entry.actorName : "";
  const itemName = typeof entry?.itemName === "string" ? entry.itemName : "";
  const quantity = Math.max(1, Math.floor(Number(entry?.quantity ?? 1) || 1));
  const totalSp = Math.max(0, Math.floor(Number(entry?.totalSp ?? entry?.finalTotalSp ?? entry?.finalPayoutSp ?? entry?.amountSp ?? 0) || 0));
  const timestampMs = Math.max(0, Math.floor(Number(entry?.timestampMs ?? Date.now()) || Date.now()));
  const itemImg = typeof entry?.itemImg === "string" && entry.itemImg.trim() ? entry.itemImg : typeof entry?.img === "string" ? entry.img : "icons/svg/item-bag.svg";
  const note = typeof entry?.note === "string" ? entry.note : "";
  return { id, type, actorId, actorNameSnapshot, itemName, quantity, totalSp, timestampMs, itemImg, note };
}
function ensureTransactionHistoryDefaults(raw) {
  return {
    recentTransactions: Array.isArray(raw?.recentTransactions) ? raw.recentTransactions.map((entry) => normalizeTransactionEntry(entry)) : []
  };
}
function appendTransactionHistoryEntry(shopData, entry) {
  if (!isShopTransactionHistoryEnabled()) return;
  if (!shopData || typeof shopData !== "object") return;
  const normalized = normalizeTransactionEntry(entry);
  const history = ensureTransactionHistoryDefaults(shopData.transactionHistory);
  history.recentTransactions.unshift(normalized);
  history.recentTransactions = history.recentTransactions.slice(0, 100);
  shopData.transactionHistory = history;
}
function formatTransactionTypeLabel(type) {
  switch (String(type)) {
    case "sell": return "Sell";
    case "hidden-buy": return "Hidden Buy";
    case "special-order": return "Special Order";
    case "fulfill-order": return "Fulfilled";
    default: return "Buy";
  }
}
function formatTransactionWhen(timestampMs) {
  const ts = Math.max(0, Math.floor(Number(timestampMs) || 0));
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString([], { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch (_err) {
    return "—";
  }
}
function ensureMerchantProfileDefaults(raw) {
  return {
    merchantName: raw?.merchantName ?? "",
    merchantRoleTitle: raw?.merchantRoleTitle ?? "",
    shopDescription: raw?.shopDescription ?? "",
    settlementTag: raw?.settlementTag ?? "",
    regionTag: raw?.regionTag ?? "",
    factionTag: raw?.factionTag ?? "",
    merchantNotes: raw?.merchantNotes ?? "",
    pricingReputationNotes: raw?.pricingReputationNotes ?? ""
  };
}
function ensureSpecialInventoryDefaults(raw) {
  return {
    hiddenStockEnabled: raw?.hiddenStockEnabled ?? false,
    specialOrdersEnabled: raw?.specialOrdersEnabled ?? false,
    hiddenStockRows: Array.isArray(raw?.hiddenStockRows) ? raw.hiddenStockRows.map((entry) => ({ ...entry })) : [],
    specialOrderRows: Array.isArray(raw?.specialOrderRows) ? raw.specialOrderRows.map((entry) => ({ ...entry })) : [],
    hiddenAudienceEntries: Array.isArray(raw?.hiddenAudienceEntries) ? raw.hiddenAudienceEntries.map((entry) => normalizeHiddenAudienceEntry(entry)) : []
  };
}
function ensureOrderManagementDefaults(raw) {
  return {
    pendingOrders: Array.isArray(raw?.pendingOrders) ? raw.pendingOrders.map((entry) => ({ ...entry })) : [],
    fulfilledOrders: Array.isArray(raw?.fulfilledOrders) ? raw.fulfilledOrders.map((entry) => ({ ...entry })) : []
  };
}
function ensureShopDefaults(raw) {
  const shopId = typeof raw.shopId === "string" ? raw.shopId : "";
  const shopName = typeof raw.shopName === "string" ? raw.shopName : DEFAULT_SHOP_DATA.shopName;
  return {
    version: SHOP_SCHEMA_VERSION,
    enabled: raw.enabled ?? DEFAULT_SHOP_DATA.enabled,
    shopId,
    shopName,
    shopkeeperName: raw.shopkeeperName ?? DEFAULT_SHOP_DATA.shopkeeperName,
    description: raw.description ?? DEFAULT_SHOP_DATA.description,
    merchantProfile: ensureMerchantProfileDefaults(raw.merchantProfile),
    specialInventory: ensureSpecialInventoryDefaults(raw.specialInventory),
    orderManagement: ensureOrderManagementDefaults(raw.orderManagement),
    transactionHistory: ensureTransactionHistoryDefaults(raw.transactionHistory),
    presetMeta: {
      lastAppliedPresetId: typeof raw?.presetMeta?.lastAppliedPresetId === "string" ? raw.presetMeta.lastAppliedPresetId : "",
      lastAppliedPresetName: typeof raw?.presetMeta?.lastAppliedPresetName === "string" ? raw.presetMeta.lastAppliedPresetName : "",
      lastAppliedAtMs: Math.max(0, Math.floor(Number(raw?.presetMeta?.lastAppliedAtMs ?? 0) || 0))
    },
    visibleToPlayers: raw.visibleToPlayers ?? DEFAULT_SHOP_DATA.visibleToPlayers,
    allowBuying: raw.allowBuying ?? DEFAULT_SHOP_DATA.allowBuying,
    allowSelling: raw.allowSelling ?? DEFAULT_SHOP_DATA.allowSelling,
    actorSelectionMode: raw.actorSelectionMode ?? DEFAULT_SHOP_DATA.actorSelectionMode,
    economy: {
      priceModifierPercent: raw.economy?.priceModifierPercent ?? DEFAULT_SHOP_DATA.economy.priceModifierPercent,
      buybackRatePercent: raw.economy?.buybackRatePercent ?? DEFAULT_SHOP_DATA.economy.buybackRatePercent,
      availableFundsSp: raw.economy?.availableFundsSp ?? DEFAULT_SHOP_DATA.economy.availableFundsSp,
      defaultFundsSp: raw.economy?.defaultFundsSp ?? DEFAULT_SHOP_DATA.economy.defaultFundsSp,
      actorPricingEntries: Array.isArray(raw.economy?.actorPricingEntries) ? raw.economy.actorPricingEntries.map((entry) => normalizeActorPricingEntry(entry)) : []
    },
    stockSettings: {
      resupplyEnabled: raw.stockSettings?.resupplyEnabled ?? DEFAULT_SHOP_DATA.stockSettings.resupplyEnabled,
      autoCreateResaleEntries: raw.stockSettings?.autoCreateResaleEntries ?? DEFAULT_SHOP_DATA.stockSettings.autoCreateResaleEntries
    },
    ui: {
      showImages: raw.ui?.showImages ?? DEFAULT_SHOP_DATA.ui.showImages,
      showCategories: raw.ui?.showCategories ?? DEFAULT_SHOP_DATA.ui.showCategories,
      defaultTab: raw.ui?.defaultTab ?? DEFAULT_SHOP_DATA.ui.defaultTab
    },
    stock: Array.isArray(raw.stock) ? raw.stock.map((entry) => ({ ...entry, categoryOverride: entry?.categoryOverride === true })) : []
  };
}
function createDefaultShopData(overrides = {}) {
  return ensureShopDefaults({ ...DEFAULT_SHOP_DATA, ...overrides });
}
var SHOP_PRESETS_SETTING_KEY = "shopPresets";
function getPresetLibrary() {
  try {
    const value = game.settings?.get(SHOP_MODULE_ID, SHOP_PRESETS_SETTING_KEY);
    if (!Array.isArray(value)) return [];
    return value.map((entry) => normalizePresetRecord(entry)).sort((a, b) => Number(b.updatedAtMs || 0) - Number(a.updatedAtMs || 0));
  } catch (_error) {
    return [];
  }
}
async function savePresetLibrary(presets) {
  const normalized = Array.isArray(presets) ? presets.map((entry) => normalizePresetRecord(entry)).sort((a, b) => Number(b.updatedAtMs || 0) - Number(a.updatedAtMs || 0)) : [];
  await game.settings.set(SHOP_MODULE_ID, SHOP_PRESETS_SETTING_KEY, normalized);
  return normalized;
}
function normalizePresetRecord(entry) {
  const now = Date.now();
  return {
    id: typeof entry?.id === "string" && entry.id ? entry.id : randomId2("preset"),
    name: typeof entry?.name === "string" && entry.name.trim() ? entry.name.trim() : "Shop Preset",
    description: typeof entry?.description === "string" ? entry.description.trim() : "",
    tags: Array.isArray(entry?.tags) ? entry.tags.map((value) => String(value ?? "").trim()).filter(Boolean) : [],
    createdAtMs: Math.max(0, Math.floor(Number(entry?.createdAtMs ?? now) || now)),
    updatedAtMs: Math.max(0, Math.floor(Number(entry?.updatedAtMs ?? now) || now)),
    payload: normalizePresetPayload(entry?.payload ?? {})
  };
}
function normalizePresetPayload(payload) {
  const normalized = {};
  if (payload?.shopConfig && typeof payload.shopConfig === "object") {
    normalized.shopConfig = {
      enabled: payload.shopConfig.enabled !== false,
      visibleToPlayers: payload.shopConfig.visibleToPlayers !== false,
      allowBuying: payload.shopConfig.allowBuying !== false,
      allowSelling: payload.shopConfig.allowSelling !== false,
      actorSelectionMode: typeof payload.shopConfig.actorSelectionMode === "string" ? payload.shopConfig.actorSelectionMode : DEFAULT_SHOP_DATA.actorSelectionMode,
      stockSettings: foundry.utils.deepClone(payload.shopConfig.stockSettings ?? DEFAULT_SHOP_DATA.stockSettings),
      ui: foundry.utils.deepClone(payload.shopConfig.ui ?? DEFAULT_SHOP_DATA.ui)
    };
  }
  if (payload?.merchantProfile && typeof payload.merchantProfile === "object") normalized.merchantProfile = ensureMerchantProfileDefaults(payload.merchantProfile);
  if (Array.isArray(payload?.stock)) normalized.stock = payload.stock.map((entry) => normalizeStockEntry(entry));
  if (payload?.specialInventory && typeof payload.specialInventory === "object") {
    const current = ensureSpecialInventoryDefaults(payload.specialInventory);
    normalized.specialInventory = {
      hiddenStockEnabled: current.hiddenStockEnabled,
      specialOrdersEnabled: current.specialOrdersEnabled,
      hiddenStockRows: current.hiddenStockRows.map((entry) => normalizeStockEntry(entry)),
      specialOrderRows: current.specialOrderRows.map((entry) => normalizeSpecialOrderRow(entry)),
      hiddenAudienceEntries: current.hiddenAudienceEntries.map((entry) => normalizeHiddenAudienceEntry(entry))
    };
  }
  if (Array.isArray(payload?.actorPricingEntries)) normalized.actorPricingEntries = payload.actorPricingEntries.map((entry) => normalizeActorPricingEntry(entry));
  if (payload?.economyConfig && typeof payload.economyConfig === "object") {
    normalized.economyConfig = {
      priceModifierPercent: Number(payload.economyConfig.priceModifierPercent ?? 0) || 0,
      buybackRatePercent: Number(payload.economyConfig.buybackRatePercent ?? 50) || 50
    };
  }
  return normalized;
}
function getDefaultPresetIncludeOptions() {
  return {
    includeMerchantProfile: true,
    includeShelfStock: true,
    includeHiddenStock: true,
    includeSpecialOrders: true,
    includePricingEconomy: true,
    includeActorPricing: true,
    includeVisibilityAudience: true
  };
}
function sanitizeShopForPreset(shopData, options = {}) {
  const include = { ...getDefaultPresetIncludeOptions(), ...(options || {}) };
  const shop = ensureShopDefaults(shopData ?? {});
  const payload = {
    shopConfig: {
      enabled: shop.enabled,
      visibleToPlayers: shop.visibleToPlayers,
      allowBuying: shop.allowBuying,
      allowSelling: shop.allowSelling,
      actorSelectionMode: shop.actorSelectionMode,
      stockSettings: foundry.utils.deepClone(shop.stockSettings ?? DEFAULT_SHOP_DATA.stockSettings),
      ui: foundry.utils.deepClone(shop.ui ?? DEFAULT_SHOP_DATA.ui)
    }
  };
  if (include.includeMerchantProfile) payload.merchantProfile = foundry.utils.deepClone(ensureMerchantProfileDefaults(shop.merchantProfile));
  if (include.includeShelfStock) payload.stock = shop.stock.map((entry) => normalizeStockEntry(entry));
  if (include.includeHiddenStock || include.includeSpecialOrders || include.includeVisibilityAudience) {
    const current = ensureSpecialInventoryDefaults(shop.specialInventory ?? {});
    payload.specialInventory = {
      hiddenStockEnabled: include.includeHiddenStock ? current.hiddenStockEnabled : false,
      specialOrdersEnabled: include.includeSpecialOrders ? current.specialOrdersEnabled : false,
      hiddenStockRows: include.includeHiddenStock ? current.hiddenStockRows.map((entry) => normalizeStockEntry(entry)) : [],
      specialOrderRows: include.includeSpecialOrders ? current.specialOrderRows.map((entry) => normalizeSpecialOrderRow(entry)) : [],
      hiddenAudienceEntries: include.includeVisibilityAudience ? current.hiddenAudienceEntries.map((entry) => normalizeHiddenAudienceEntry(entry)) : []
    };
  }
  if (include.includeActorPricing) payload.actorPricingEntries = (shop.economy?.actorPricingEntries ?? []).map((entry) => normalizeActorPricingEntry(entry));
  if (include.includePricingEconomy) payload.economyConfig = {
    priceModifierPercent: Number(shop.economy?.priceModifierPercent ?? 0) || 0,
    buybackRatePercent: Number(shop.economy?.buybackRatePercent ?? 50) || 50
  };
  return normalizePresetPayload(payload);
}
function buildShopFromPreset(currentShopData, preset) {
  const current = ensureShopDefaults(currentShopData ?? {});
  const normalizedPreset = normalizePresetRecord(preset ?? {});
  const payload = normalizePresetPayload(normalizedPreset.payload ?? {});
  const next = cloneShopData(current);
  if (payload.shopConfig) {
    next.enabled = payload.shopConfig.enabled !== false;
    next.visibleToPlayers = payload.shopConfig.visibleToPlayers !== false;
    next.allowBuying = payload.shopConfig.allowBuying !== false;
    next.allowSelling = payload.shopConfig.allowSelling !== false;
    next.actorSelectionMode = typeof payload.shopConfig.actorSelectionMode === "string" ? payload.shopConfig.actorSelectionMode : next.actorSelectionMode;
    next.stockSettings = foundry.utils.deepClone(payload.shopConfig.stockSettings ?? next.stockSettings);
    next.ui = foundry.utils.deepClone(payload.shopConfig.ui ?? next.ui);
  }
  if (payload.merchantProfile) next.merchantProfile = foundry.utils.deepClone(ensureMerchantProfileDefaults(payload.merchantProfile));
  if (Array.isArray(payload.stock)) next.stock = payload.stock.map((entry) => normalizeStockEntry(entry));
  if (payload.specialInventory) next.specialInventory = ensureSpecialInventoryDefaults(payload.specialInventory);
  if (Array.isArray(payload.actorPricingEntries)) next.economy.actorPricingEntries = payload.actorPricingEntries.map((entry) => normalizeActorPricingEntry(entry));
  if (payload.economyConfig) {
    next.economy.priceModifierPercent = Number(payload.economyConfig.priceModifierPercent ?? next.economy.priceModifierPercent) || 0;
    next.economy.buybackRatePercent = Number(payload.economyConfig.buybackRatePercent ?? next.economy.buybackRatePercent) || 50;
  }
  next.presetMeta = {
    lastAppliedPresetId: normalizedPreset.id,
    lastAppliedPresetName: normalizedPreset.name,
    lastAppliedAtMs: Date.now()
  };
  return ensureShopDefaults(next);
}
function parseDialogFormData(form) {
  const raw = {};
  const data = new FormData(form);
  for (const [key, value] of data.entries()) {
    if (Object.prototype.hasOwnProperty.call(raw, key)) {
      const existing = raw[key];
      raw[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else raw[key] = value;
  }
  return foundry.utils.expandObject(raw);
}
function getDialogRoot(dialog) {
  if (dialog?.element instanceof HTMLElement) return dialog.element;
  if (dialog?.element?.[0] instanceof HTMLElement) return dialog.element[0];
  return document.body;
}
function parsePresetTags(value) {
  if (Array.isArray(value)) return value.map((entry) => String(entry ?? "").trim()).filter(Boolean);
  return String(value ?? "").split(",").map((entry) => entry.trim()).filter(Boolean);
}
function getPresetSummaryCounts(preset) {
  const payload = normalizePresetPayload(preset?.payload ?? {});
  const hiddenCount = payload.specialInventory?.hiddenStockRows?.length ?? 0;
  const specialOrderCount = payload.specialInventory?.specialOrderRows?.length ?? 0;
  return { stockCount: payload.stock?.length ?? 0, hiddenCount, specialOrderCount, hasMerchantProfile: !!payload.merchantProfile, actorPricingCount: payload.actorPricingEntries?.length ?? 0 };
}
function formatPresetSummary(preset) {
  const counts = getPresetSummaryCounts(preset);
  const parts = [];
  if (counts.hasMerchantProfile) parts.push("merchant profile");
  parts.push(`${counts.stockCount} shelf row${counts.stockCount === 1 ? "" : "s"}`);
  if (counts.hiddenCount) parts.push(`${counts.hiddenCount} hidden item${counts.hiddenCount === 1 ? "" : "s"}`);
  if (counts.specialOrderCount) parts.push(`${counts.specialOrderCount} special-order item${counts.specialOrderCount === 1 ? "" : "s"}`);
  if (counts.actorPricingCount) parts.push(`${counts.actorPricingCount} actor pricing entr${counts.actorPricingCount === 1 ? "y" : "ies"}`);
  return parts.join(" • ");
}
function buildPresetOptionsMarkup(presets, selectedId = "") {
  return presets.map((preset) => `<option value="${foundry.utils.escapeHTML(String(preset.id))}" ${String(selectedId) === String(preset.id) ? "selected" : ""}>${foundry.utils.escapeHTML(preset.name)}</option>`).join("");
}
function getPresetById(presets, presetId) {
  return Array.isArray(presets) ? presets.find((entry) => String(entry.id) === String(presetId)) ?? null : null;
}
async function waitForDialogFormResult({ title, content, buttons, width = 560 }) {
  const DialogV2 = foundry?.applications?.api?.DialogV2;
  if (DialogV2?.wait) {
    return await DialogV2.wait({
      window: { title, resizable: false },
      position: { width, height: "auto" },
      content,
      modal: true,
      rejectClose: false,
      buttons: buttons.map((button) => ({
        action: button.action,
        label: button.label,
        icon: button.icon,
        default: button.default === true,
        callback: (_event, _button, dialog) => {
          const root = getDialogRoot(dialog);
          const form = root.querySelector("form");
          const values = form ? parseDialogFormData(form) : {};
          return { action: button.action, values };
        }
      }))
    });
  }
  return null;
}
function getPresetButtonMarkup() {
  return `<div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
    <button type="button" data-action="save-preset"><i class="fas fa-bookmark"></i> Save as Preset</button>
    <button type="button" data-action="apply-preset"><i class="fas fa-file-import"></i> Apply Preset</button>
    <button type="button" data-action="manage-presets"><i class="fas fa-boxes-stacked"></i> Manage Presets</button>
  </div>`;
}
function getShopData(journalEntry) {
  const raw = journalEntry.getFlag(SHOP_MODULE_ID, SHOP_FLAG_KEY);
  if (!raw || typeof raw !== "object") return null;
  return ensureShopDefaults(raw);
}
async function updateShopData(journalEntry, shopData) {
  const normalized = ensureShopDefaults(shopData);
  try {
    await journalEntry.setFlag(SHOP_MODULE_ID, SHOP_FLAG_KEY, normalized);
    return {
      ok: true,
      code: "OK",
      message: `Updated shop data for ${normalized.shopName}.`,
      data: { shopData: normalized }
    };
  } catch (error) {
    console.error(`${SHOP_MODULE_ID} | Failed to update shop data`, error);
    return {
      ok: false,
      code: "UPDATE_FAILED",
      message: "Failed to update shop data on the journal entry.",
      data: {
        error,
        journalEntryId: journalEntry.id
      }
    };
  }
}

// scripts/shop/helpers/stock.ts
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

// scripts/shop/apps/shopGmEditor.ts
function randomId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
function slugify(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function normalizeStockEntry(entry) {
  return {
    id: typeof entry.id === "string" && entry.id.length > 0 ? entry.id : randomId("stock"),
    sourceUuid: entry.sourceUuid ?? null,
    normalizedKey: entry.normalizedKey ?? null,
    itemType: entry.itemType ?? "object",
    name: entry.name ?? "New Item",
    img: entry.img ?? "icons/svg/item-bag.svg",
    description: entry.description ?? "",
    category: entry.category ?? "Misc",
    baseValueSp: Math.max(0, Math.floor(entry.baseValueSp ?? 0)),
    salePriceOverrideSp: typeof entry.salePriceOverrideSp === "number" ? Math.max(0, Math.floor(entry.salePriceOverrideSp)) : null,
    infiniteStock: entry.infiniteStock ?? false,
    currentStock: Math.max(0, Math.floor(entry.currentStock ?? 0)),
    defaultStock: Math.max(0, Math.floor(entry.defaultStock ?? 0)),
    visible: entry.visible ?? true,
    allowSellbackRestock: entry.allowSellbackRestock ?? true,
    isResaleEntry: entry.isResaleEntry ?? false,
    itemSnapshot: entry.itemSnapshot ?? {
      name: entry.name ?? "New Item",
      type: entry.itemType ?? "object",
      img: entry.img ?? "icons/svg/item-bag.svg",
      system: { quantity: 1 }
    }
  };
}
function normalizeSpecialOrderRow(entry) {
  return {
    id: typeof entry?.id === "string" && entry.id.length > 0 ? entry.id : randomId("specialorder"),
    sourceUuid: entry?.sourceUuid ?? null,
    normalizedKey: entry?.normalizedKey ?? null,
    itemType: entry?.itemType ?? "object",
    name: entry?.name ?? "New Item",
    img: entry?.img ?? "icons/svg/item-bag.svg",
    description: entry?.description ?? "",
    category: entry?.category ?? "Misc",
    baseValueSp: Math.max(0, Math.floor(entry?.baseValueSp ?? 0)),
    salePriceOverrideSp: typeof entry?.salePriceOverrideSp === "number" ? Math.max(0, Math.floor(entry.salePriceOverrideSp)) : null,
    visible: entry?.visible ?? true,
    leadTimeLabel: typeof entry?.leadTimeLabel === "string" ? entry.leadTimeLabel : "",
    specialOrderNote: typeof entry?.specialOrderNote === "string" ? entry.specialOrderNote : "",
    itemSnapshot: entry?.itemSnapshot ?? {
      name: entry?.name ?? "New Item",
      type: entry?.itemType ?? "object",
      img: entry?.img ?? "icons/svg/item-bag.svg",
      system: { quantity: 1 }
    }
  };
}
function normalizePendingOrder(entry) {
  return {
    id: typeof entry?.id === "string" && entry.id.length > 0 ? entry.id : randomId("order"),
    actorId: typeof entry?.actorId === "string" ? entry.actorId : "",
    actorNameSnapshot: typeof entry?.actorNameSnapshot === "string" ? entry.actorNameSnapshot : "",
    itemName: typeof entry?.itemName === "string" ? entry.itemName : "Ordered Item",
    quantity: Math.max(1, Math.floor(Number(entry?.quantity ?? 1) || 1)),
    totalPaidSp: Math.max(0, Math.floor(Number(entry?.totalPaidSp ?? 0) || 0)),
    leadTimeLabel: typeof entry?.leadTimeLabel === "string" ? entry.leadTimeLabel : "",
    specialOrderNote: typeof entry?.specialOrderNote === "string" ? entry.specialOrderNote : "",
    sourceUuid: typeof entry?.sourceUuid === "string" ? entry.sourceUuid : null,
    itemType: typeof entry?.itemType === "string" ? entry.itemType : (entry?.itemSnapshot?.type ?? "object"),
    img: typeof entry?.img === "string" && entry.img.length > 0 ? entry.img : (entry?.itemSnapshot?.img ?? "icons/svg/item-bag.svg"),
    description: typeof entry?.description === "string" ? entry.description : "",
    itemSnapshot: entry?.itemSnapshot ?? {
      name: entry?.itemName ?? "Ordered Item",
      type: entry?.itemType ?? "object",
      img: entry?.img ?? "icons/svg/item-bag.svg",
      system: { quantity: 1 }
    },
    status: entry?.status === "fulfilled" ? "fulfilled" : "pending",
    createdAtMs: Math.max(0, Math.floor(Number(entry?.createdAtMs ?? Date.now()) || Date.now())),
    fulfilledAtMs: entry?.fulfilledAtMs == null ? null : Math.max(0, Math.floor(Number(entry.fulfilledAtMs) || 0))
  };
}
function cloneShopData(shopData) {
  return foundry.utils.deepClone(shopData);
}
function getBooleanFromFormData(value) {
  if (value === null) return false;
  if (typeof value === "string") return value === "true" || value === "on" || value === "1";
  return Boolean(value);
}
function getNumberFromFormData(value, fallback = 0) {
  if (value === null) return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}
function sanitizeTextField(value) {
  return String(value ?? "").trim();
}
function humanizeCategoryLabel(value) {
  return String(value ?? "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (m) => m.toUpperCase()) || "Misc";
}
function deriveShopCategoryLabel(source) {
  const rawCategory = typeof source === "string" ? source : foundry.utils.getProperty(source, "system.objectType") ?? foundry.utils.getProperty(source, "itemSnapshot.system.objectType") ?? foundry.utils.getProperty(source, "system.category") ?? null;
  const rawString = String(rawCategory ?? "").trim();
  if (!rawString) return "Misc";
  const normalized = rawString.toLowerCase();
  const map = { gear: "Adventuring Gear", tools: "Tools", tool: "Tools", weapon: "Weapons", weapons: "Weapons", armor: "Armor", armour: "Armor", consumable: "Consumables", consumables: "Consumables", magic: "Magic", resale: "Resale", misc: "Misc", miscellaneous: "Misc" };
  return map[normalized] ?? humanizeCategoryLabel(rawString);
}
function editorFormatSpFriendly(totalSp) {
  return formatNormalizedCurrency(totalSp);
}
function notifyEditor(level, message) {
  ui.notifications?.[level]?.(message);
}
function notifyEditorInfo(message) {
  notifyEditor("info", message);
}
function notifyEditorWarn(message) {
  notifyEditor("warn", message);
}
function notifyEditorError(message) {
  notifyEditor("error", message);
}
function priceDataToSp(price) {
  const denomination = String(price?.denomination ?? foundry.utils.getProperty(price, "denomination") ?? "sp").toLowerCase();
  const rawValue = Number(price?.value ?? foundry.utils.getProperty(price, "value") ?? 0);
  const normalizedValue = Number.isFinite(rawValue) ? Math.max(0, Math.floor(rawValue)) : 0;
  return denomination === "gp" ? normalizedValue * 10 : normalizedValue;
}
async function resolveShopSourceItem(sourceUuid) {
  if (!sourceUuid) return null;
  try {
    const doc = await fromUuid(sourceUuid);
    return doc && doc.documentName === "Item" ? doc : null;
  } catch (_err) {
    return null;
  }
}
function stockEntryFromItemDocument(item) {
  const itemObject = item.toObject ? item.toObject() : foundry.utils.deepClone(item);
  foundry.utils.setProperty(itemObject, "system.quantity", 1);
  const description = String(foundry.utils.getProperty(itemObject, "system.description.public") ?? foundry.utils.getProperty(itemObject, "system.description") ?? "");
  const price = foundry.utils.getProperty(itemObject, "system.price");
  return normalizeStockEntry({
    id: randomId("stock"),
    sourceUuid: item.uuid ?? null,
    normalizedKey: `${String(item.name ?? itemObject.name ?? "Item").trim().toLowerCase()}::${String(item.type ?? itemObject.type ?? "object").trim().toLowerCase()}`,
    itemType: item.type ?? itemObject.type ?? "object",
    name: item.name ?? itemObject.name ?? "New Item",
    img: item.img ?? itemObject.img ?? "icons/svg/item-bag.svg",
    description,
    category: deriveShopCategoryLabel(itemObject),
    baseValueSp: priceDataToSp(price),
    salePriceOverrideSp: null,
    infiniteStock: false,
    currentStock: 0,
    defaultStock: 0,
    visible: true,
    allowSellbackRestock: true,
    isResaleEntry: false,
    itemSnapshot: itemObject
  });
}
function hiddenStockEntryFromItemDocument(item) {
  return normalizeStockEntry({ ...stockEntryFromItemDocument(item), id: randomId("hiddenstock"), visible: false });
}
function specialOrderRowFromItemDocument(item) {
  const itemObject = item.toObject ? item.toObject() : foundry.utils.deepClone(item);
  foundry.utils.setProperty(itemObject, "system.quantity", 1);
  const description = String(foundry.utils.getProperty(itemObject, "system.description.public") ?? foundry.utils.getProperty(itemObject, "system.description") ?? "");
  const price = foundry.utils.getProperty(itemObject, "system.price");
  return normalizeSpecialOrderRow({
    id: randomId("specialorder"),
    sourceUuid: item.uuid ?? null,
    normalizedKey: `${String(item.name ?? itemObject.name ?? "Item").trim().toLowerCase()}::${String(item.type ?? itemObject.type ?? "object").trim().toLowerCase()}`,
    itemType: item.type ?? itemObject.type ?? "object",
    name: item.name ?? itemObject.name ?? "New Item",
    img: item.img ?? itemObject.img ?? "icons/svg/item-bag.svg",
    description,
    category: deriveShopCategoryLabel(itemObject),
    baseValueSp: priceDataToSp(price),
    salePriceOverrideSp: null,
    visible: true,
    leadTimeLabel: "",
    specialOrderNote: "",
    itemSnapshot: itemObject
  });
}
function mergeRefreshedStockRow(previous, refreshed) {
  return normalizeStockEntry({
    ...refreshed,
    id: previous?.id ?? refreshed.id,
    salePriceOverrideSp: previous?.salePriceOverrideSp ?? refreshed.salePriceOverrideSp,
    currentStock: previous?.currentStock ?? refreshed.currentStock,
    defaultStock: previous?.defaultStock ?? refreshed.defaultStock,
    infiniteStock: previous?.infiniteStock ?? refreshed.infiniteStock,
    visible: previous?.visible ?? refreshed.visible,
    allowSellbackRestock: previous?.allowSellbackRestock ?? refreshed.allowSellbackRestock,
    isResaleEntry: previous?.isResaleEntry ?? refreshed.isResaleEntry
  });
}
function mergeRefreshedSpecialOrderRow(previous, refreshed) {
  return normalizeSpecialOrderRow({
    ...refreshed,
    id: previous?.id ?? refreshed.id,
    salePriceOverrideSp: previous?.salePriceOverrideSp ?? refreshed.salePriceOverrideSp,
    visible: previous?.visible ?? refreshed.visible,
    leadTimeLabel: previous?.leadTimeLabel ?? refreshed.leadTimeLabel,
    specialOrderNote: previous?.specialOrderNote ?? refreshed.specialOrderNote
  });
}
function getImportableItemPacks() {
  return (game.packs?.filter((pack) => pack.documentName === "Item") ?? []).map((pack) => ({
    collection: pack.collection,
    label: pack.metadata?.label ?? pack.title ?? pack.collection
  }));
}
async function getImportableCompendiumItems(collection) {
  const pack = game.packs?.get(collection);
  if (!pack) return [];
  const index = await pack.getIndex({ fields: ["type", "img", "name", "system.objectType"] });
  return index.filter((entry) => entry.type === "object").map((entry) => ({
    id: entry._id,
    uuid: `Compendium.${collection}.Item.${entry._id}`,
    name: entry.name,
    img: entry.img ?? "icons/svg/item-bag.svg",
    type: entry.type,
    category: String(entry.system?.objectType ?? "Misc")
  })).sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), void 0, { sensitivity: "base" }));
}
function getImportableLocalItems() {
  return (game.items?.filter((item) => item.type === "object") ?? []).map((item) => ({
    id: item.id,
    uuid: item.uuid,
    name: item.name,
    img: item.img ?? "icons/svg/item-bag.svg",
    type: item.type,
    category: String(foundry.utils.getProperty(item, "system.objectType") ?? "Misc")
  })).sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), void 0, { sensitivity: "base" }));
}
function formatDateLabel(ms) {
  if (!ms) return "";
  try {
    return new Date(ms).toLocaleDateString();
  } catch (_e) {
    return "";
  }
}
function formatSpAsGpInput(totalSp) {
  return formatNormalizedCurrency(totalSp);
}
function formatSpAsGpNumberInput(totalSp) {
  const sp = Math.max(0, Math.floor(Number(totalSp ?? 0) || 0));
  const gp = sp / GP_TO_SP;
  if (!Number.isFinite(gp)) return "0";
  return String(gp.toFixed(2).replace(/\.00$/, "").replace(/(\.[0-9]*[1-9])0+$/, "$1"));
}
function gpInputToSp(value, fallback = 0) {
  return parseNormalizedCurrencyInput(value, fallback);
}
function normalizeShopSortMode(value) {
  const mode = String(value || "alpha");
  return ["alpha", "price-asc", "price-desc"].includes(mode) ? mode : "alpha";
}
function compareShopNames(a, b) {
  return String(a || "").localeCompare(String(b || ""), void 0, { sensitivity: "base" });
}
function getEditorRowPriceSp(entry) {
  return Math.max(0, Math.floor(Number(entry?.salePriceOverrideSp ?? entry?.baseValueSp ?? entry?.totalPaidSp ?? 0) || 0));
}
function sortEditorRowsByMode(rows, sortMode) {
  const mode = normalizeShopSortMode(sortMode);
  const clone = Array.from(rows || []);
  clone.sort((a, b) => {
    if (mode === "price-asc") {
      const diff = getEditorRowPriceSp(a) - getEditorRowPriceSp(b);
      return diff || compareShopNames(a?.name ?? a?.itemName, b?.name ?? b?.itemName);
    }
    if (mode === "price-desc") {
      const diff = getEditorRowPriceSp(b) - getEditorRowPriceSp(a);
      return diff || compareShopNames(a?.name ?? a?.itemName, b?.name ?? b?.itemName);
    }
    return compareShopNames(a?.name ?? a?.itemName, b?.name ?? b?.itemName);
  });
  return clone;
}
function renderSortSelectHtml(selectedMode, dataAttributes = "") {
  const mode = normalizeShopSortMode(selectedMode);
  return `<label style="display:grid;gap:0.25rem;min-width:180px;">Sort<select ${dataAttributes} style="${editorFieldStyle()}"><option value="alpha" ${mode === "alpha" ? "selected" : ""}>Alphabetical</option><option value="price-asc" ${mode === "price-asc" ? "selected" : ""}>Price Low → High</option><option value="price-desc" ${mode === "price-desc" ? "selected" : ""}>Price High → Low</option></select></label>`;
}
function collectNamedFields(form) {
  const obj = {};
  const elements = form.querySelectorAll("input[name], select[name], textarea[name]");
  for (const el of elements) {
    const name = el.name;
    if (!name) continue;
    if (el instanceof HTMLInputElement && el.type === "checkbox") {
      foundry.utils.setProperty(obj, name, el.checked ? "on" : null);
      continue;
    }
    if (el instanceof HTMLSelectElement && el.multiple) {
      foundry.utils.setProperty(obj, name, Array.from(el.selectedOptions).map((opt) => opt.value));
      continue;
    }
    foundry.utils.setProperty(obj, name, el.value ?? "");
  }
  return obj;
}
function editorFieldStyle() {
  return "width:100%; background:rgba(39,31,44,0.92); border:1px solid rgba(255,255,255,0.08); border-radius:6px; color:inherit; padding:0.45rem 0.55rem; box-sizing:border-box;";
}
function editorCellInputStyle() {
  return "width:100%; background:rgba(39,31,44,0.92); border:1px solid rgba(255,255,255,0.08); border-radius:6px; color:inherit; padding:0.35rem 0.45rem; box-sizing:border-box; min-width:0;";
}
var ShopCompendiumImportDialog = class _ShopCompendiumImportDialog extends foundry.applications.api.ApplicationV2 {
  constructor(options = {}) {
    super(options);
    const packs = getImportableItemPacks();
    this.mode = "compendium";
    this.packs = packs;
    this.selectedPack = packs[0]?.collection ?? "";
    this.searchText = "";
    this.selected = new Set();
    this.items = [];
    this.resolveImport = options.resolveImport;
    this.onImport = options.onImport ?? null;
  }
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(foundry.utils.deepClone(super.DEFAULT_OPTIONS), {
    id: `${SHOP_MODULE_ID}-import-dialog`,
    position: { width: 980, height: 760 },
    window: { title: "Import Shop Items", resizable: true }
  });
  async _prepareContext() {
    this.items = this.mode === "compendium" ? await getImportableCompendiumItems(this.selectedPack) : getImportableLocalItems();
    const search = this.searchText.trim().toLowerCase();
    const visibleItems = !search ? this.items : this.items.filter((item) => item.name.toLowerCase().includes(search) || String(item.category ?? "").toLowerCase().includes(search));
    return { packs: this.packs, mode: this.mode, selectedPack: this.selectedPack, searchText: this.searchText, visibleItems, selectedCount: this.selected.size };
  }
  async _renderHTML(context) {
    const sourceOptions = `<option value="compendium" ${context.mode === "compendium" ? "selected" : ""}>Compendium</option><option value="local" ${context.mode === "local" ? "selected" : ""}>World Items</option>`;
    const packOptions = context.packs.map((pack) => `<option value="${foundry.utils.escapeHTML(pack.collection)}" ${pack.collection === context.selectedPack ? "selected" : ""}>${foundry.utils.escapeHTML(pack.label)}</option>`).join("");
    const rows = context.visibleItems.map((item) => `<label data-item-row="${foundry.utils.escapeHTML(item.uuid)}" style="display:grid; grid-template-columns: 28px 40px minmax(0,1fr) 140px; align-items:center; gap:0.65rem; padding:0.45rem 0.5rem; border-top:1px solid rgba(255,255,255,0.08); cursor:pointer;"><input type="checkbox" data-item-checkbox="${foundry.utils.escapeHTML(item.uuid)}" ${this.selected.has(item.uuid) ? "checked" : ""}><img src="${foundry.utils.escapeHTML(item.img)}" style="width:32px;height:32px;border-radius:4px;object-fit:cover;"><span style="min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${foundry.utils.escapeHTML(item.name)}</span><span style="opacity:0.8; justify-self:end;">${foundry.utils.escapeHTML(item.category || "Misc")}</span></label>`).join("") || '<div style="padding:0.75rem; opacity:0.8;">No matching items.</div>';
    return `<section class="nimble-shop-import" style="height:100%; display:flex; flex-direction:column; min-height:0; padding:0.75rem 1rem 1rem; box-sizing:border-box;"><div style="display:grid; grid-template-columns: 180px 1fr 1fr auto auto auto; gap:0.6rem; align-items:end; flex:0 0 auto; position:sticky; top:0; z-index:1; background:var(--color-cool-5-90, rgba(0,0,0,0.85)); padding-bottom:0.5rem;"><label style="display:grid; gap:0.25rem;">Source<select data-action="source-mode" style="${editorFieldStyle()}">${sourceOptions}</select></label><label style="display:grid; gap:0.25rem; ${context.mode === "local" ? "visibility:hidden;" : ""}">Compendium<select data-action="pack-select" style="${editorFieldStyle()}">${packOptions}</select></label><label style="display:grid; gap:0.25rem;">Search<input type="text" data-action="search" value="${foundry.utils.escapeHTML(context.searchText)}" style="${editorFieldStyle()}"></label><button type="button" data-action="select-visible">Select Visible</button><button type="button" data-action="clear-selection">Clear</button><button type="button" data-action="import-selected"><i class="fas fa-download"></i> Import Selected</button></div><div style="margin:0.25rem 0 0.5rem 0; flex:0 0 auto; opacity:0.85;">${context.selectedCount} selected</div><div data-import-scroll style="flex:1 1 auto; min-height:0; overflow:auto; border:1px solid rgba(255,255,255,0.1); border-radius:8px;">${rows}</div></section>`;
  }
  _replaceHTML(result, content) {
    const root = content instanceof HTMLElement ? content : content?.[0] instanceof HTMLElement ? content[0] : null;
    if (!root) return;
    root.innerHTML = String(result ?? "");
    this._bindUi(root);
    const scrollHost = root.querySelector("[data-import-scroll]");
    if (scrollHost) scrollHost.scrollTop = this._scrollTop ?? 0;
  }
  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);
    this._bindUi(htmlElement);
  }
  _bindUi(htmlElement) {
    const host = htmlElement.querySelector('.nimble-shop-import') ?? htmlElement;
    if (!host || host.dataset.bound === 'true') return;
    host.dataset.bound = 'true';
    host.addEventListener('click', async (event) => {
      const actionTarget = event.target instanceof HTMLElement ? event.target.closest('[data-action], [data-item-row], [data-item-checkbox]') : null;
      if (!actionTarget) return;
      if (actionTarget.hasAttribute('data-item-row') || actionTarget.hasAttribute('data-item-checkbox')) {
        event.preventDefault();
        const uuid = actionTarget.getAttribute('data-item-row') || actionTarget.getAttribute('data-item-checkbox');
        if (uuid) {
          this.selected.has(uuid) ? this.selected.delete(uuid) : this.selected.add(uuid);
          this._scrollTop = host.querySelector('[data-import-scroll]')?.scrollTop ?? 0;
          await this.render(true);
        }
        return;
      }
      const action = actionTarget.dataset.action;
      if (action === 'select-visible') {
        const context = await this._prepareContext();
        for (const item of context.visibleItems) this.selected.add(item.uuid);
        this._scrollTop = host.querySelector('[data-import-scroll]')?.scrollTop ?? 0;
        await this.render(true);
      } else if (action === 'clear-selection') {
        this.selected.clear();
        this._scrollTop = host.querySelector('[data-import-scroll]')?.scrollTop ?? 0;
        await this.render(true);
      } else if (action === 'import-selected') {
        const uuids = Array.from(this.selected);
        const docs = [];
        for (const uuid of uuids) {
          const doc = await resolveShopSourceItem(uuid);
          if (doc) docs.push(doc);
        }
        if (typeof this.onImport === 'function') await this.onImport(docs); else this.resolveImport?.(docs);
        this.resolveImport = null;
        await this.close();
      }
    });
    host.addEventListener('change', async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const action = target.dataset.action;
      if (action === 'source-mode') {
        this.mode = target.value;
        this.selected.clear();
        this._scrollTop = host.querySelector('[data-import-scroll]')?.scrollTop ?? 0;
        await this.render(true);
      } else if (action === 'pack-select') {
        this.selectedPack = target.value;
        this.selected.clear();
        this._scrollTop = host.querySelector('[data-import-scroll]')?.scrollTop ?? 0;
        await this.render(true);
      }
    });
    host.addEventListener('input', async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const action = target.dataset.action;
      if (action === 'search') {
        this.searchText = target.value ?? '';
        this._scrollTop = host.querySelector('[data-import-scroll]')?.scrollTop ?? 0;
        await this.render(true);
      }
    });
  }
  async close(options) {
    if (this.resolveImport) {
      const resolve = this.resolveImport;
      this.resolveImport = null;
      resolve([]);
    }
    return super.close(options);
  }
  static async prompt() {
    return await new Promise(async (resolve) => {
      const app = new _ShopCompendiumImportDialog({ resolveImport: (docs) => resolve(docs) });
      await app.render(true);
    });
  }
};
var ShopGmEditor = class _ShopGmEditor extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(foundry.utils.deepClone(super.DEFAULT_OPTIONS), {
    id: "nimble-shop-gm-editor",
    tag: "form",
    classes: ["nimble-shop-gm-editor-app"],
    form: {
      handler: _ShopGmEditor.#onSubmit,
      closeOnSubmit: false
    },
    position: { width: 1040, height: 820 },
    window: {
      title: "Shop Editor",
      icon: "fas fa-store",
      resizable: true,
      contentClasses: ["standard-form", "nimble-shop-gm-editor-window"]
    }
  });
  static PARTS = { main: { root: true, template: "modules/nimble-shop/templates/shop-gm-editor.hbs" } };
  journalEntry;
  shopData;
  editorTab = "details";
  tableSorts = { stock: "alpha", hidden: "alpha", special: "alpha" };
  _scrollTop = 0;
  isDirty = false;
  constructor(journalEntry, options = {}) {
    super(options);
    this.journalEntry = journalEntry;
    const existing = getShopData(journalEntry);
    this.shopData = existing ? cloneShopData(existing) : createDefaultShopData({
      shopId: slugify(journalEntry.name || "shop"),
      shopName: journalEntry.name || "New Shop"
    });
    this.shopData.specialInventory = ensureSpecialInventoryDefaults(this.shopData.specialInventory);
    this.shopData.orderManagement = ensureOrderManagementDefaults(this.shopData.orderManagement);
  }
  static async #onSubmit(_event, form, formData) {
    const captured = typeof this.captureRenderedState === "function" ? this.captureRenderedState() : null;
    const obj = captured ?? foundry.utils.expandObject(formData.object);
    await this.applyFormState(obj);
    await this.save();
  }
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    if (partId !== "main") return context;
    return { ...context, editorHtml: this.renderEditorHtml() };
  }
  currentCategories() {
    return Array.from(new Set([
      ...DEFAULT_SHOP_CATEGORIES,
      ...this.shopData.stock.map((e) => String(e?.category || deriveShopCategoryLabel(e) || "Misc")),
      ...this.shopData.specialInventory.hiddenStockRows.map((e) => String(e?.category || deriveShopCategoryLabel(e) || "Misc")),
      ...this.shopData.specialInventory.specialOrderRows.map((e) => String(e?.category || deriveShopCategoryLabel(e) || "Misc"))
    ]));
  }
  renderTabButtons() {
    const tabs = [["details", "Shop Details"], ["stock", "Stock"], ["hidden", "Hidden"], ["orders", "Custom Orders"]];
    return tabs.map(([id, label]) => `<button type="button" data-action="editor-tab" data-editor-tab="${id}" class="${this.editorTab === id ? "active" : ""}" style="padding:0.45rem 0.8rem; border-radius:8px; border:1px solid rgba(255,255,255,0.12); background:${this.editorTab === id ? "rgba(120,80,40,0.35)" : "rgba(39,31,44,0.92)"}; color:inherit;">${label}</button>`).join("");
  }
  renderTableSort(kind) {
    return renderSortSelectHtml(this.tableSorts?.[kind] ?? "alpha", `data-action="set-table-sort" data-table-kind="${kind}"`);
  }
  renderRowTable(type, rows, categories) {
    rows = sortEditorRowsByMode(rows, this.tableSorts?.[type] ?? "alpha");
    const compactTable = 'width:100%; border-collapse:collapse; table-layout:fixed;';
    const cell = 'padding:0.35rem 0.45rem; vertical-align:middle; border-bottom:1px solid rgba(255,255,255,0.08);';
    const header = 'padding:0.42rem 0.45rem; text-align:left; font-size:0.82rem; text-transform:none; color:rgba(255,255,255,0.82); border-bottom:1px solid rgba(255,255,255,0.12);';
    const nameCellStyle = 'display:flex; align-items:center; gap:0.55rem; min-width:0;';
    const rowInput = `${editorCellInputStyle()} padding:0.32rem 0.45rem; min-height:34px;`;
    const miniButton = 'width:34px; height:34px; display:inline-flex; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,0.14); border-radius:8px; background:rgba(26,20,30,0.9); color:inherit;';
    if (type === "stock" || type === "hidden") {
      const prefix = type === "stock" ? "stock" : "specialInventory.hiddenStockRows";
      const removeAction = type === "stock" ? "remove-stock" : "remove-hidden-stock";
      const refreshAction = type === "stock" ? "refresh-stock-source" : "refresh-hidden-stock-source";
      const rowHtml = rows.map((entry, index) => {
        const categoryOptions = categories.map((category) => `<option value="${foundry.utils.escapeHTML(category)}" ${entry.category === category ? "selected" : ""}>${foundry.utils.escapeHTML(category)}</option>`).join("");
        return `<tr>
          <td style="${cell}">
            <input type="hidden" name="${prefix}.${index}.id" value="${foundry.utils.escapeHTML(entry.id)}">
            <div style="${nameCellStyle}">
              <img src="${foundry.utils.escapeHTML(getItemImage(entry.img))}" style="width:36px;height:36px;border-radius:8px;object-fit:cover;flex:0 0 auto;">
              <input type="text" name="${prefix}.${index}.name" value="${foundry.utils.escapeHTML(entry.name)}" style="${rowInput} min-width:0; background:rgba(255,255,255,0.04);" readonly>
            </div>
          </td>
          <td style="${cell}; width:48px; text-align:center;"><button type="button" title="Refresh from source" data-action="${refreshAction}" data-row-id="${entry.id}" style="${miniButton}"><i class="fas fa-rotate"></i></button></td>
          <td style="${cell}"><select name="${prefix}.${index}.category" style="${rowInput}">${categoryOptions}</select></td>
          <td style="${cell}"><input type="text" inputmode="decimal" name="${prefix}.${index}.baseValueSp" value="${formatSpAsGpNumberInput(entry.baseValueSp)}" style="${rowInput} background:rgba(255,255,255,0.04);" readonly></td>
          <td style="${cell}"><input type="text" inputmode="decimal" name="${prefix}.${index}.salePriceOverrideSp" value="${entry.salePriceOverrideSp == null ? "" : formatSpAsGpNumberInput(entry.salePriceOverrideSp)}" style="${rowInput}"></td>
          <td style="${cell}"><input type="number" min="0" step="1" name="${prefix}.${index}.currentStock" value="${entry.currentStock}" ${entry.infiniteStock ? "disabled" : ""} style="${rowInput}"></td>
          <td style="${cell}"><input type="number" min="0" step="1" name="${prefix}.${index}.defaultStock" value="${entry.defaultStock}" ${entry.infiniteStock ? "disabled" : ""} style="${rowInput}"></td>
          <td style="${cell}; text-align:center;"><input type="checkbox" name="${prefix}.${index}.infiniteStock" ${entry.infiniteStock ? "checked" : ""}></td>
          <td style="${cell}; text-align:center;"><input type="checkbox" name="${prefix}.${index}.visible" ${entry.visible ? "checked" : ""}></td>
          <td style="${cell}; width:128px; white-space:nowrap; text-align:right;">${type === "hidden" ? `<button type="button" title="Move to visible stock" data-action="move-hidden-stock" data-row-id="${entry.id}" style="${miniButton}; margin-right:0.25rem;"><i class="fas fa-arrow-right"></i></button>` : ""}<button type="button" title="Remove" data-action="${removeAction}" data-row-id="${entry.id}" style="${miniButton}"><i class="fas fa-trash"></i></button></td>
        </tr>`;
      }).join("") || `<tr><td colspan="10" style="padding:0.85rem; opacity:0.8;"><em>No ${type === "stock" ? "stock" : "hidden stock"} entries yet.</em></td></tr>`;
      return `<table class="shop-editor-table shop-editor-table--stock" style="${compactTable}"><colgroup><col style="width:23%"><col style="width:5%"><col style="width:13%"><col style="width:9%"><col style="width:9%"><col style="width:8%"><col style="width:8%"><col style="width:4%"><col style="width:4%"><col style="width:17%"></colgroup><thead><tr><th style="${header}">Name</th><th style="${header}; text-align:center;"><i class="fas fa-link"></i></th><th style="${header}">Category</th><th style="${header}">Base GP</th><th style="${header}">Override GP</th><th style="${header}">On Hand</th><th style="${header}">Restock</th><th style="${header}; text-align:center;">∞</th><th style="${header}; text-align:center;"><i class="fas fa-eye"></i></th><th style="${header}; text-align:right;"></th></tr></thead><tbody>${rowHtml}</tbody></table>`;
    }
    if (type === "special") {
      const rowHtml = rows.map((entry, index) => {
        const categoryOptions = categories.map((category) => `<option value="${foundry.utils.escapeHTML(category)}" ${entry.category === category ? "selected" : ""}>${foundry.utils.escapeHTML(category)}</option>`).join("");
        return `<tr>
          <td style="${cell}">
            <input type="hidden" name="specialInventory.specialOrderRows.${index}.id" value="${foundry.utils.escapeHTML(entry.id)}">
            <div style="${nameCellStyle}">
              <img src="${foundry.utils.escapeHTML(getItemImage(entry.img))}" style="width:36px;height:36px;border-radius:8px;object-fit:cover;flex:0 0 auto;">
              <input type="text" name="specialInventory.specialOrderRows.${index}.name" value="${foundry.utils.escapeHTML(entry.name)}" style="${rowInput} min-width:0; background:rgba(255,255,255,0.04);" readonly>
            </div>
          </td>
          <td style="${cell}; width:48px; text-align:center;"><button type="button" title="Refresh from source" data-action="refresh-special-order-source" data-row-id="${entry.id}" style="${miniButton}"><i class="fas fa-rotate"></i></button></td>
          <td style="${cell}"><select name="specialInventory.specialOrderRows.${index}.category" style="${rowInput}">${categoryOptions}</select></td>
          <td style="${cell}"><input type="text" inputmode="decimal" name="specialInventory.specialOrderRows.${index}.baseValueSp" value="${formatSpAsGpNumberInput(entry.baseValueSp)}" style="${rowInput} background:rgba(255,255,255,0.04);" readonly></td>
          <td style="${cell}"><input type="text" inputmode="decimal" name="specialInventory.specialOrderRows.${index}.salePriceOverrideSp" value="${entry.salePriceOverrideSp == null ? "" : formatSpAsGpNumberInput(entry.salePriceOverrideSp)}" style="${rowInput}"></td>
          <td style="${cell}; text-align:center;"><input type="checkbox" name="specialInventory.specialOrderRows.${index}.visible" ${entry.visible ? "checked" : ""}></td>
          <td style="${cell}"><input type="text" name="specialInventory.specialOrderRows.${index}.leadTimeLabel" value="${foundry.utils.escapeHTML(entry.leadTimeLabel ?? "")}" style="${rowInput}"></td>
          <td style="${cell}"><input type="text" name="specialInventory.specialOrderRows.${index}.specialOrderNote" value="${foundry.utils.escapeHTML(entry.specialOrderNote ?? "")}" style="${rowInput}"></td>
          <td style="${cell}; width:40px; text-align:right;"><button type="button" title="Remove" data-action="remove-special-order" data-row-id="${entry.id}" style="${miniButton}"><i class="fas fa-trash"></i></button></td>
        </tr>`;
      }).join("") || `<tr><td colspan="9" style="padding:0.85rem; opacity:0.8;"><em>No custom-order catalog entries yet.</em></td></tr>`;
      return `<table class="shop-editor-table shop-editor-table--special" style="${compactTable}"><colgroup><col style="width:26%"><col style="width:5%"><col style="width:12%"><col style="width:9%"><col style="width:10%"><col style="width:6%"><col style="width:10%"><col style="width:17%"><col style="width:5%"></colgroup><thead><tr><th style="${header}">Name</th><th style="${header}; text-align:center;"><i class="fas fa-link"></i></th><th style="${header}">Category</th><th style="${header}">Base GP</th><th style="${header}">Override GP</th><th style="${header}; text-align:center;"><i class="fas fa-eye"></i></th><th style="${header}">Lead Time</th><th style="${header}">Note</th><th style="${header}; text-align:right;"></th></tr></thead><tbody>${rowHtml}</tbody></table>`;
    }
    return "";
  }
  renderOrderTable(kind, rows) {
    rows = sortEditorRowsByMode(rows, this.tableSorts?.["special"] ?? "alpha");
    const prefix = `orderManagement.${kind}`;
    const isPending = kind === "pendingOrders";
    const cols = isPending ? 8 : 8;
    const hiddenFields = (entry, index) => `
      <input type="hidden" name="${prefix}.${index}.id" value="${escapeHtml(String(entry.id ?? ""))}">
      <input type="hidden" name="${prefix}.${index}.actorId" value="${escapeHtml(String(entry.actorId ?? ""))}">
      <input type="hidden" name="${prefix}.${index}.actorNameSnapshot" value="${escapeHtml(String(entry.actorNameSnapshot ?? ""))}">
      <input type="hidden" name="${prefix}.${index}.itemName" value="${escapeHtml(String(entry.itemName ?? ""))}">
      <input type="hidden" name="${prefix}.${index}.quantity" value="${Math.max(1, Math.floor(Number(entry.quantity ?? 1) || 1))}">
      <input type="hidden" name="${prefix}.${index}.totalPaidSp" value="${Math.max(0, Math.floor(Number(entry.totalPaidSp ?? 0) || 0))}">
      <input type="hidden" name="${prefix}.${index}.leadTimeLabel" value="${escapeHtml(String(entry.leadTimeLabel ?? ""))}">
      <input type="hidden" name="${prefix}.${index}.specialOrderNote" value="${escapeHtml(String(entry.specialOrderNote ?? ""))}">
      <input type="hidden" name="${prefix}.${index}.sourceUuid" value="${escapeHtml(String(entry.sourceUuid ?? ""))}">
      <input type="hidden" name="${prefix}.${index}.itemType" value="${escapeHtml(String(entry.itemType ?? "object"))}">
      <input type="hidden" name="${prefix}.${index}.img" value="${escapeHtml(String(entry.img ?? ""))}">
      <input type="hidden" name="${prefix}.${index}.description" value="${escapeHtml(String(entry.description ?? ""))}">
      <input type="hidden" name="${prefix}.${index}.createdAtMs" value="${Math.max(0, Math.floor(Number(entry.createdAtMs ?? Date.now()) || Date.now()))}">
      <input type="hidden" name="${prefix}.${index}.fulfilledAtMs" value="${entry.fulfilledAtMs == null ? "" : Math.max(0, Math.floor(Number(entry.fulfilledAtMs) || 0))}">
    `;
    const rowHtml = rows.map((entry, index) => {
      const whenLabel = isPending ? formatDateLabel(entry.createdAtMs) || "—" : formatDateLabel(entry.fulfilledAtMs || entry.createdAtMs) || "—";
      const note = String(entry.specialOrderNote ?? "").trim();
      const lead = String(entry.leadTimeLabel ?? "").trim();
      const itemImg = escapeHtml(getItemImage(entry.img));
      return `<tr class="shop-order-row">${hiddenFields(entry, index)}
        <td class="shop-order-row__actor"><div class="shop-order-actor">${escapeHtml(String(entry.actorNameSnapshot || "Unknown Actor"))}</div></td>
        <td class="shop-order-row__item"><div class="shop-order-item"><img class="shop-order-item__img" src="${itemImg}" alt=""><div class="shop-order-item__body"><strong>${escapeHtml(String(entry.itemName || "Ordered Item"))}</strong>${note ? `<div class="shop-order-item__note">${escapeHtml(note)}</div>` : ""}</div></div></td>
        <td class="shop-order-row__qty"><span class="shop-order-pill">${Math.max(1, Math.floor(Number(entry.quantity ?? 1) || 1))}</span></td>
        <td class="shop-order-row__paid">${formatCurrencyPills(entry.totalPaidSp ?? 0, "shop-currency-stack--force-inline")}</td>
        <td class="shop-order-row__lead">${lead ? `<span class="shop-order-pill">${escapeHtml(lead)}</span>` : `<span class="shop-order-empty">—</span>`}</td>
        <td class="shop-order-row__when">${escapeHtml(whenLabel)}</td>
        <td class="shop-order-row__status">${isPending ? `<span class="shop-order-status shop-order-status--pending">Pending</span>` : `<span class="shop-order-status shop-order-status--fulfilled">Fulfilled</span>`}</td>
        <td class="shop-order-row__actions" style="white-space:nowrap;">${isPending ? `<button type="button" data-action="fulfill-pending-order" data-row-id="${entry.id}" title="Fulfill order"><i class="fas fa-check"></i></button> ` : ""}<button type="button" data-action="remove-${isPending ? "pending-order" : "fulfilled-order"}" data-row-id="${entry.id}" title="Remove order"><i class="fas fa-trash"></i></button></td>
      </tr>`;
    }).join("") || `<tr><td colspan="${cols}" style="padding:0.85rem; opacity:0.8;"><em>No ${isPending ? "pending" : "fulfilled"} orders.</em></td></tr>`;
    return `<table class="shop-order-table" style="width:100%; border-collapse:separate; border-spacing:0 0.35rem;"><thead><tr><th>Actor</th><th>Item</th><th>Qty</th><th>Paid</th><th>Lead Time</th><th>${isPending ? "Placed" : "Fulfilled"}</th><th>Status</th><th></th></tr></thead><tbody>${rowHtml}</tbody></table>`;
  }
  renderActorPricingTable() {
    const playerActors = getPlayerOwnedActors();
    const rows = Array.isArray(this.shopData.economy.actorPricingEntries) ? this.shopData.economy.actorPricingEntries : [];
    const rowHtml = rows.map((entry, index) => {
      const actorId = String(entry?.actorId ?? "");
      const actorNameSnapshot = String(entry?.actorNameSnapshot ?? "");
      const mode = String(entry?.mode ?? (Number(entry?.markupPercent ?? 0) > 0 ? "markup" : "discount"));
      const percent = Math.max(0, Number(entry?.percent ?? (mode === "markup" ? entry?.markupPercent : entry?.discountPercent) ?? 0) || 0);
      const note = String(entry?.note ?? "");
      const actorOptions = ['<option value="">Select actor...</option>', ...playerActors.map((actor) => `<option value="${foundry.utils.escapeHTML(String(actor.id))}" ${String(actor.id) === actorId ? "selected" : ""}>${foundry.utils.escapeHTML(String(actor.name || "Unnamed Actor"))}</option>`)].join("");
      return `<tr><td><input type="hidden" name="economy.actorPricingEntries.${index}.id" value="${foundry.utils.escapeHTML(String(entry?.id ?? ""))}"><select name="economy.actorPricingEntries.${index}.actorId" style="${editorCellInputStyle()}">${actorOptions}</select><input type="hidden" name="economy.actorPricingEntries.${index}.actorNameSnapshot" value="${foundry.utils.escapeHTML(actorNameSnapshot)}"></td><td><select name="economy.actorPricingEntries.${index}.mode" style="${editorCellInputStyle()}"><option value="discount" ${mode === "discount" ? "selected" : ""}>Discount</option><option value="markup" ${mode === "markup" ? "selected" : ""}>Surcharge</option></select></td><td><input type="number" min="0" step="1" name="economy.actorPricingEntries.${index}.percent" value="${percent}" style="${editorCellInputStyle()}"></td><td><input type="text" name="economy.actorPricingEntries.${index}.note" value="${foundry.utils.escapeHTML(note)}" style="${editorCellInputStyle()}"></td><td style="white-space:nowrap;"><button type="button" data-action="remove-actor-pricing-entry" data-row-id="${foundry.utils.escapeHTML(String(entry?.id ?? index))}"><i class="fas fa-trash"></i></button></td></tr>`;
    }).join("") || `<tr><td colspan="5" style="padding:0.85rem; opacity:0.8;"><em>No shop-specific actor pricing entries yet.</em></td></tr>`;
    return `<div class="shop-editor-subtable"><div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;margin-bottom:0.5rem;"><div><strong>Shop Actor Pricing</strong><div style="opacity:0.8;font-size:0.9em;">Add discounts or surcharges for specific actors, with a short label shown in the shop.</div></div><button type="button" data-action="add-actor-pricing-entry"><i class="fas fa-plus"></i> Add Entry</button></div><table class="shop-editor-table"><thead><tr><th>Actor</th><th>Mode</th><th>Percent</th><th>Label</th><th></th></tr></thead><tbody>${rowHtml}</tbody></table></div>`;
  }
  renderHiddenAudienceTable() {
    const playerActors = getPlayerOwnedActors();
    const rows = Array.isArray(this.shopData.specialInventory.hiddenAudienceEntries) ? this.shopData.specialInventory.hiddenAudienceEntries : [];
    const rowHtml = rows.map((entry, index) => {
      const actorId = String(entry?.actorId ?? "");
      const actorNameSnapshot = String(entry?.actorNameSnapshot ?? "");
      const note = String(entry?.note ?? "");
      const actorOptions = ['<option value="">Select actor...</option>', ...playerActors.map((actor) => `<option value="${foundry.utils.escapeHTML(String(actor.id))}" ${String(actor.id) === actorId ? "selected" : ""}>${foundry.utils.escapeHTML(String(actor.name || "Unnamed Actor"))}</option>`)].join("");
      return `<tr><td><input type="hidden" name="specialInventory.hiddenAudienceEntries.${index}.id" value="${foundry.utils.escapeHTML(String(entry?.id ?? ""))}"><select name="specialInventory.hiddenAudienceEntries.${index}.actorId" style="${editorCellInputStyle()}">${actorOptions}</select><input type="hidden" name="specialInventory.hiddenAudienceEntries.${index}.actorNameSnapshot" value="${foundry.utils.escapeHTML(actorNameSnapshot)}"></td><td><input type="text" name="specialInventory.hiddenAudienceEntries.${index}.note" value="${foundry.utils.escapeHTML(note)}" style="${editorCellInputStyle()}" placeholder="Reason / note"></td><td style="white-space:nowrap;"><button type="button" data-action="remove-hidden-audience-entry" data-row-id="${foundry.utils.escapeHTML(String(entry?.id ?? index))}"><i class="fas fa-trash"></i></button></td></tr>`;
    }).join("") || `<tr><td colspan="3" style="padding:0.85rem; opacity:0.8;"><em>No actor-specific hidden stock audience entries yet.</em></td></tr>`;
    return `<div class="shop-editor-subtable"><div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;margin-bottom:0.5rem;"><div><strong>Hidden Stock Audience</strong><div style="opacity:0.8;font-size:0.9em;">These actors are allowed to see hidden stock when that feature is active.</div></div><button type="button" data-action="add-hidden-audience-entry"><i class="fas fa-plus"></i> Add Entry</button></div><table class="shop-editor-table"><thead><tr><th>Actor</th><th>Label</th><th></th></tr></thead><tbody>${rowHtml}</tbody></table></div>`;
  }
  renderTransactionHistoryTable() {
    const entries = Array.isArray(this.shopData?.transactionHistory?.recentTransactions) ? this.shopData.transactionHistory.recentTransactions : [];
    const rowHtml = entries.map((entry) => {
      return `<tr>
        <td>${escapeHtml(formatTransactionWhen(entry.timestampMs))}</td>
        <td><span class="shop-order-status">${escapeHtml(formatTransactionTypeLabel(entry.type))}</span></td>
        <td>${escapeHtml(entry.actorNameSnapshot || "—")}</td>
        <td><div style="display:flex;align-items:center;gap:0.55rem;min-width:0;">${entry.itemImg ? `<img src="${escapeHtml(entry.itemImg)}" alt="" style="width:32px;height:32px;object-fit:cover;border-radius:8px;flex:0 0 auto;">` : ""}<span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(entry.itemName || "—")}</span></div></td>
        <td><span class="shop-order-qty-pill">${Math.max(1, Math.floor(Number(entry.quantity) || 1))}</span></td>
        <td>${formatCurrencyPills(entry.totalSp)}</td>
      </tr>`;
    }).join("") || `<tr><td colspan="6" style="padding:0.85rem; opacity:0.8;"><em>No transactions yet.</em></td></tr>`;
    return `<div class="shop-editor-subtable"><div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;margin-bottom:0.5rem;"><div><strong>Recent Transactions</strong><div style="opacity:0.8;font-size:0.9em;">Latest buy, sell, hidden, special-order, and fulfillment activity for this shop.</div></div></div><table class="shop-editor-table"><thead><tr><th>When</th><th>Type</th><th>Actor</th><th>Item</th><th>Qty</th><th>Amount</th></tr></thead><tbody>${rowHtml}</tbody></table></div>`;
  }
  renderEditorHtml() {
    const shop = this.shopData;
    const categories = this.currentCategories();
    const detailsDisplay = this.editorTab === "details" ? "block" : "none";
    const stockDisplay = this.editorTab === "stock" ? "block" : "none";
    const hiddenDisplay = this.editorTab === "hidden" ? "block" : "none";
    const ordersDisplay = this.editorTab === "orders" ? "block" : "none";
    return `<div class="nimble-shop-gm-editor" style="height:100%;min-height:0;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;"><div class="nimble-shop-editor-scroll" data-editor-scroll style="flex:1 1 auto;min-height:0;overflow:auto;padding:0 1rem 1rem;box-sizing:border-box;"><div style="display:flex;flex-direction:column;gap:1rem;"><style>
      .shop-editor-table{width:100%;border-collapse:separate;border-spacing:0 0.45rem;}
      .shop-editor-table thead th{padding:0.45rem 0.5rem;text-align:left;color:rgba(241,232,213,.85);font-weight:700;font-size:0.92rem;}
      .shop-editor-table tbody tr{background:rgba(255,255,255,.03);}
      .shop-editor-table tbody td{padding:0.45rem 0.5rem;vertical-align:middle;border-top:1px solid rgba(255,255,255,.08);border-bottom:1px solid rgba(255,255,255,.08);}
      .shop-editor-table tbody td:first-child{border-left:1px solid rgba(255,255,255,.08);border-top-left-radius:10px;border-bottom-left-radius:10px;}
      .shop-editor-table tbody td:last-child{border-right:1px solid rgba(255,255,255,.08);border-top-right-radius:10px;border-bottom-right-radius:10px;}
      .shop-editor-subtable strong{font-size:1rem;}
    </style>
      <header style="display:flex;flex-direction:column;gap:0.5rem;position:sticky;top:0;z-index:3;background:var(--color-cool-5-90, rgba(0,0,0,0.85));padding:0.75rem 0 0.5rem;backdrop-filter: blur(4px);">
        <h2 style="margin:0;">${foundry.utils.escapeHTML(shop.shopName || "Shop Editor")}</h2>
        <div style="display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center;justify-content:space-between;">
          <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">${this.renderTabButtons()}</div>
          <div style="display:flex;flex-wrap:wrap;gap:0.5rem;"><button type="button" data-action="reset-stock"><i class="fas fa-rotate-left"></i> Reset Stock</button><button type="submit"><i class="fas fa-save"></i> Save Shop</button></div>
        </div>
      </header>
      <section data-editor-panel="details" style="display:${detailsDisplay};">
        <div style="display:grid;gap:1rem;grid-template-columns:minmax(360px,0.95fr) minmax(420px,1fr);align-items:start;">
          <fieldset style="display:grid;gap:0.75rem;align-self:start;"><legend>Basics</legend>
            <label style="display:grid;gap:0.25rem;">Shop Name<input type="text" name="shopName" value="${foundry.utils.escapeHTML(shop.shopName)}" style="${editorFieldStyle()}"></label>
            <label style="display:grid;gap:0.25rem;">Shop ID<input type="text" name="shopId" value="${foundry.utils.escapeHTML(shop.shopId)}" style="${editorFieldStyle()}"></label>
            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0.6rem 1rem;align-items:center;">
              <label><input type="checkbox" name="enabled" ${shop.enabled ? "checked" : ""}> Enabled</label>
              <label><input type="checkbox" name="visibleToPlayers" ${shop.visibleToPlayers ? "checked" : ""}> Visible to Players</label>
              <label><input type="checkbox" name="allowBuying" ${shop.allowBuying ? "checked" : ""}> Allow Buying</label>
              <label><input type="checkbox" name="allowSelling" ${shop.allowSelling ? "checked" : ""}> Allow Selling</label>
            </div>
          </fieldset>
          <fieldset style="display:grid;gap:0.6rem;grid-column:2;grid-row:1 / span 3;align-self:start;"><legend>Merchant Profile</legend>
            <label style="display:grid;gap:0.25rem;">Merchant Name<input type="text" name="merchantProfile.merchantName" value="${foundry.utils.escapeHTML(shop.merchantProfile?.merchantName ?? "")}" style="${editorFieldStyle()}"></label>
            <label style="display:grid;gap:0.25rem;">Role / Title<input type="text" name="merchantProfile.merchantRoleTitle" value="${foundry.utils.escapeHTML(shop.merchantProfile?.merchantRoleTitle ?? "")}" style="${editorFieldStyle()}"></label>
            <label style="display:grid;gap:0.25rem;">Shop Description<textarea name="merchantProfile.shopDescription" style="${editorFieldStyle()} min-height:82px;">${foundry.utils.escapeHTML(shop.merchantProfile?.shopDescription ?? "")}</textarea></label>
            <label style="display:grid;gap:0.25rem;">Settlement<input type="text" name="merchantProfile.settlementTag" value="${foundry.utils.escapeHTML(shop.merchantProfile?.settlementTag ?? "")}" style="${editorFieldStyle()}"></label>
            <label style="display:grid;gap:0.25rem;">Region<input type="text" name="merchantProfile.regionTag" value="${foundry.utils.escapeHTML(shop.merchantProfile?.regionTag ?? "")}" style="${editorFieldStyle()}"></label>
            <label style="display:grid;gap:0.25rem;">Faction<input type="text" name="merchantProfile.factionTag" value="${foundry.utils.escapeHTML(shop.merchantProfile?.factionTag ?? "")}" style="${editorFieldStyle()}"></label>
            <label style="display:grid;gap:0.25rem;">Merchant Notes<textarea name="merchantProfile.merchantNotes" style="${editorFieldStyle()} min-height:72px;">${foundry.utils.escapeHTML(shop.merchantProfile?.merchantNotes ?? "")}</textarea></label>
            <label style="display:grid;gap:0.25rem;">Pricing / Reputation Notes<textarea name="merchantProfile.pricingReputationNotes" style="${editorFieldStyle()} min-height:72px;">${foundry.utils.escapeHTML(shop.merchantProfile?.pricingReputationNotes ?? "")}</textarea></label>
          </fieldset>
          <fieldset style="display:grid;gap:0.75rem;align-self:start;"><legend>Economy</legend>
            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0.6rem 1rem;align-items:center;">
              <label><input type="checkbox" name="stockSettings.resupplyEnabled" ${shop.stockSettings.resupplyEnabled ? "checked" : ""}> Resupply Enabled</label>
              <label style="display:grid;gap:0.25rem;">Price Modifier %<input type="number" step="1" name="economy.priceModifierPercent" value="${shop.economy.priceModifierPercent}" style="${editorFieldStyle()}"></label>
              <label><input type="checkbox" name="stockSettings.autoCreateResaleEntries" ${shop.stockSettings.autoCreateResaleEntries ? "checked" : ""}> Buy Unstocked Items</label>
              <label style="display:grid;gap:0.25rem;">Buyback Rate %<input type="number" min="0" step="1" name="economy.buybackRatePercent" value="${shop.economy.buybackRatePercent}" style="${editorFieldStyle()}"></label>
              <label style="display:grid;gap:0.25rem;max-width:220px;">Till Funds (GP)<input type="number" min="0" step="0.01" name="economy.availableFundsSp" value="${formatSpAsGpNumberInput(shop.economy.availableFundsSp)}" style="${editorFieldStyle()}"></label>
            </div>
          </fieldset>
          <fieldset style="display:grid;gap:0.6rem;align-self:start;"><legend>Presets</legend>
            <p style="margin:0; opacity:0.78; font-size:0.9rem;">Save reusable shop setups as presets. Presets copy setup only and never carry live till balances or order history.</p>
            ${getPresetButtonMarkup()}
            ${String(shop.presetMeta?.lastAppliedPresetName ?? "").trim() ? `<p style="margin:0; opacity:0.78; font-size:0.85rem;"><strong>Last Applied:</strong> ${foundry.utils.escapeHTML(String(shop.presetMeta.lastAppliedPresetName))}</p>` : ""}
          </fieldset>
          <fieldset style="display:grid;gap:0.6rem;grid-column:1 / span 2;"><legend>Shop Actor Pricing</legend>${this.renderActorPricingTable()}</fieldset>
          ${isShopTransactionHistoryEnabled() ? `<fieldset style="display:grid;gap:0.6rem;grid-column:1 / span 2;"><legend>Transaction History</legend>${this.renderTransactionHistoryTable()}</fieldset>` : ""}
        </div>
      </section>
      <section data-editor-panel="stock" style="display:${stockDisplay};"><div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;align-items:end;"><button type="button" data-action="import-stock"><i class="fas fa-download"></i> Import Items</button>${this.renderTableSort("stock")}</div>${this.renderRowTable("stock", shop.stock, categories)}</section>
      <section data-editor-panel="hidden" style="display:${hiddenDisplay};"><div style="display:grid;gap:0.9rem;"><div style="display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center;"><label><input type="checkbox" name="specialInventory.hiddenStockEnabled" ${shop.specialInventory.hiddenStockEnabled ? "checked" : ""}> Enable Hidden Stock</label></div><div style="display:grid;gap:0.5rem;">${this.renderHiddenAudienceTable()}</div><div style="display:flex;flex-wrap:wrap;gap:0.5rem;align-items:end;"><button type="button" data-action="import-hidden-stock"><i class="fas fa-download"></i> Import Hidden Items</button>${this.renderTableSort("hidden")}</div>${this.renderRowTable("hidden", shop.specialInventory.hiddenStockRows, categories)}</div></section>
      <section data-editor-panel="orders" style="display:${ordersDisplay};"><div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;align-items:end;"><label><input type="checkbox" name="specialInventory.specialOrdersEnabled" ${shop.specialInventory.specialOrdersEnabled ? "checked" : ""}> Enable Custom Orders</label><button type="button" data-action="import-special-order"><i class="fas fa-download"></i> Import Orderable Items</button>${this.renderTableSort("special")}</div><div style="display:grid;gap:1rem;"><fieldset><legend>Custom Order Catalog</legend>${this.renderRowTable("special", shop.specialInventory.specialOrderRows, categories)}</fieldset><fieldset><legend>Pending Orders</legend>${this.renderOrderTable("pendingOrders", shop.orderManagement.pendingOrders)}</fieldset><fieldset><legend>Fulfilled Orders</legend>${this.renderOrderTable("fulfilledOrders", shop.orderManagement.fulfilledOrders)}</fieldset></div></section>
    </div></div></div>`;
  }
  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);
    this.bindUi(htmlElement);
  }
  _replaceHTML(result, content) {
    const root = content instanceof HTMLElement ? content : content?.[0] instanceof HTMLElement ? content[0] : null;
    if (!root) return;
    const rendered = result?.main ?? result;
    if (rendered instanceof Node) root.replaceChildren(rendered); else root.innerHTML = String(rendered ?? "");
    this.bindUi(root);
    const scrollHost = root.querySelector('[data-editor-scroll]');
    if (scrollHost) scrollHost.scrollTop = this._scrollTop ?? 0;
  }
  captureRenderedState() {
    const form = this.element?.querySelector("form") ?? this.element;
    if (form instanceof HTMLFormElement) return collectNamedFields(form);
    return null;
  }
  async persistDraftFromForm() {
    const obj = this.captureRenderedState();
    if (obj) await this.applyFormState(obj);
  }
  markDirty() {
    this.isDirty = true;
  }
  bindUi(root) {
    if (!root || root.dataset.boundShopEditor === "true") return;
    root.dataset.boundShopEditor = "true";
    root.addEventListener("click", async (event) => {
      const target = event.target instanceof HTMLElement ? event.target.closest("[data-action]") : null;
      if (!target) return;
      event.preventDefault();
      const action = target.dataset.action;
      if (action === "editor-tab") {
        this.editorTab = target.dataset.editorTab || "details";
        for (const button of root.querySelectorAll('[data-action="editor-tab"]')) button.classList.toggle("active", button.dataset.editorTab === this.editorTab);
        for (const panel of root.querySelectorAll("[data-editor-panel]")) panel.style.display = panel.dataset.editorPanel === this.editorTab ? "block" : "none";
        return;
      }
      await this.persistDraftFromForm();
      if (action === "add-stock") this.addEmptyStockEntry();
      else if (action === "remove-stock") this.removeStockEntry(target.dataset.rowId);
      else if (action === "refresh-stock-source") await this.refreshStockEntrySource(target.dataset.rowId);
      else if (action === "add-actor-pricing-entry") this.addActorPricingEntry();
      else if (action === "remove-actor-pricing-entry") this.removeActorPricingEntry(target.dataset.rowId);
      else if (action === "add-hidden-audience-entry") this.addHiddenAudienceEntry();
      else if (action === "remove-hidden-audience-entry") this.removeHiddenAudienceEntry(target.dataset.rowId);
      else if (action === "reset-stock") await this.handleResetStock();
      else if (action === "add-hidden-stock") this.addEmptyHiddenStockEntry();
      else if (action === "remove-hidden-stock") this.removeHiddenStockEntry(target.dataset.rowId);
      else if (action === "refresh-hidden-stock-source") await this.refreshHiddenStockEntrySource(target.dataset.rowId);
      else if (action === "move-hidden-stock") this.moveHiddenStockToShelf(target.dataset.rowId);
      else if (action === "add-special-order") this.addEmptySpecialOrderRow();
      else if (action === "remove-special-order") this.removeSpecialOrderRow(target.dataset.rowId);
      else if (action === "refresh-special-order-source") await this.refreshSpecialOrderRowSource(target.dataset.rowId);
      else if (action === "add-pending-order") this.addEmptyPendingOrder();
      else if (action === "fulfill-pending-order") await this.fulfillPendingOrder(target.dataset.rowId);
      else if (action === "remove-pending-order") this.removePendingOrder(target.dataset.rowId);
      else if (action === "remove-fulfilled-order") this.removeFulfilledOrder(target.dataset.rowId);
      else if (action === "import-stock") await this.importItemsTo("stock");
      else if (action === "import-hidden-stock") await this.importItemsTo("hidden");
      else if (action === "import-special-order") await this.importItemsTo("special");
      else if (action === "save-preset") await this.handleSavePreset();
      else if (action === "apply-preset") await this.handleApplyPreset();
      else if (action === "manage-presets") await this.handleManagePresets();
      else return;
      if (!["manage-presets"].includes(action)) this.markDirty();
      this._scrollTop = root.querySelector('[data-editor-scroll]')?.scrollTop ?? 0;
      await this.render(true);
    });
    root.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest("form")) this.markDirty();
    });
    root.addEventListener("change", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.dataset.action === "set-table-sort") {
        this.tableSorts[target.dataset.tableKind || "stock"] = normalizeShopSortMode(target.value);
        this._scrollTop = root.querySelector('[data-editor-scroll]')?.scrollTop ?? 0;
        await this.render(true);
        return;
      }
      if (target.closest("form")) this.markDirty();
    });
  }
  addEmptyStockEntry() {
    this.shopData.stock.push(normalizeStockEntry({ category: "Misc", name: "New Item" }));
  }
  removeStockEntry(stockId) {
    this.shopData.stock = this.shopData.stock.filter((entry) => entry.id !== stockId);
  }
  addEmptyHiddenStockEntry() {
    this.shopData.specialInventory.hiddenStockRows.push(normalizeStockEntry({ id: randomId("hiddenstock"), category: "Misc", name: "New Item", visible: false }));
  }
  removeHiddenStockEntry(id) {
    this.shopData.specialInventory.hiddenStockRows = this.shopData.specialInventory.hiddenStockRows.filter((entry) => entry.id !== id);
  }
  moveHiddenStockToShelf(id) {
    const idx = this.shopData.specialInventory.hiddenStockRows.findIndex((entry) => entry.id === id);
    if (idx < 0) return;
    const [entry] = this.shopData.specialInventory.hiddenStockRows.splice(idx, 1);
    this.shopData.stock.push(normalizeStockEntry({ ...entry, id: randomId("stock"), visible: true }));
  }
  addEmptySpecialOrderRow() {
    this.shopData.specialInventory.specialOrderRows.push(normalizeSpecialOrderRow({ category: "Misc", name: "New Item" }));
  }
  removeSpecialOrderRow(id) {
    this.shopData.specialInventory.specialOrderRows = this.shopData.specialInventory.specialOrderRows.filter((entry) => entry.id !== id);
  }
  async refreshStockEntrySource(id) {
    const idx = this.shopData.stock.findIndex((entry) => entry.id === id);
    if (idx < 0) return;
    const previous = this.shopData.stock[idx];
    if (!previous?.sourceUuid) {
      notifyEditorWarn("This row is not linked to a source item.");
      return;
    }
    const source = await resolveShopSourceItem(previous.sourceUuid);
    if (!source) {
      notifyEditorWarn("The linked source item could not be found.");
      return;
    }
    this.shopData.stock[idx] = mergeRefreshedStockRow(previous, stockEntryFromItemDocument(source));
    notifyEditorInfo(`Refreshed ${this.shopData.stock[idx].name} from source.`);
  }
  async refreshHiddenStockEntrySource(id) {
    const idx = this.shopData.specialInventory.hiddenStockRows.findIndex((entry) => entry.id === id);
    if (idx < 0) return;
    const previous = this.shopData.specialInventory.hiddenStockRows[idx];
    if (!previous?.sourceUuid) {
      notifyEditorWarn("This hidden row is not linked to a source item.");
      return;
    }
    const source = await resolveShopSourceItem(previous.sourceUuid);
    if (!source) {
      notifyEditorWarn("The linked source item could not be found.");
      return;
    }
    this.shopData.specialInventory.hiddenStockRows[idx] = mergeRefreshedStockRow(previous, hiddenStockEntryFromItemDocument(source));
    notifyEditorInfo(`Refreshed ${this.shopData.specialInventory.hiddenStockRows[idx].name} from source.`);
  }
  async refreshSpecialOrderRowSource(id) {
    const idx = this.shopData.specialInventory.specialOrderRows.findIndex((entry) => entry.id === id);
    if (idx < 0) return;
    const previous = this.shopData.specialInventory.specialOrderRows[idx];
    if (!previous?.sourceUuid) {
      notifyEditorWarn("This custom-order row is not linked to a source item.");
      return;
    }
    const source = await resolveShopSourceItem(previous.sourceUuid);
    if (!source) {
      notifyEditorWarn("The linked source item could not be found.");
      return;
    }
    this.shopData.specialInventory.specialOrderRows[idx] = mergeRefreshedSpecialOrderRow(previous, specialOrderRowFromItemDocument(source));
    notifyEditorInfo(`Refreshed ${this.shopData.specialInventory.specialOrderRows[idx].name} from source.`);
  }
  addEmptyPendingOrder() {
    this.shopData.orderManagement.pendingOrders.push(normalizePendingOrder({ actorNameSnapshot: "", itemName: "Ordered Item", quantity: 1, totalPaidSp: 0, leadTimeLabel: "", status: "pending" }));
  }
  async fulfillPendingOrder(id) {
    const idx = this.shopData.orderManagement.pendingOrders.findIndex((entry) => entry.id === id);
    if (idx < 0) return;
    const entry = this.shopData.orderManagement.pendingOrders[idx];
    const actor = (entry?.actorId ? game.actors?.get(entry.actorId) : null) ?? getPlayerOwnedActors().find((a) => a.name === entry?.actorNameSnapshot) ?? null;
    if (!actor) {
      notifyEditorWarn(`Could not find actor for pending order: ${entry?.actorNameSnapshot || "Unknown actor"}.`);
      return;
    }
    const pseudoStockEntry = {
      id: entry.id,
      name: entry.itemName,
      itemSnapshot: foundry.utils.deepClone(entry.itemSnapshot ?? { name: entry.itemName, type: entry.itemType ?? "object", img: entry.img ?? "icons/svg/item-bag.svg", system: { quantity: 1 } })
    };
    const awardResult = await addPurchasedItemToActor(actor, pseudoStockEntry, entry.quantity);
    if (!awardResult.ok) {
      notifyEditorError(awardResult.message || `Could not award ${entry.itemName} to ${actor.name}.`);
      return;
    }
    const fulfilledAtMs = Date.now();
    this.shopData.orderManagement.pendingOrders.splice(idx, 1);
    this.shopData.orderManagement.fulfilledOrders.unshift(normalizePendingOrder({ ...entry, status: "fulfilled", fulfilledAtMs }));
    appendTransactionHistoryEntry(this.shopData, { type: "fulfill-order", actorId: actor.id, actorNameSnapshot: actor.name, itemName: entry.itemName, quantity: entry.quantity, totalSp: entry.totalPaidSp, timestampMs: fulfilledAtMs, itemImg: entry.img ?? entry?.itemSnapshot?.img ?? "icons/svg/item-bag.svg", note: entry.leadTimeLabel || "" });
    await createShopReceipt("fulfill-order", { actor, actorName: actor.name, itemName: entry.itemName, quantity: entry.quantity, amountSp: entry.totalPaidSp, itemImg: entry.img ?? entry?.itemSnapshot?.img ?? "icons/svg/item-bag.svg", shopName: this.shopData.shopName, shopId: this.shopData.shopId, timestampMs: fulfilledAtMs, leadTimeLabel: entry.leadTimeLabel || "" });
    notifyEditorInfo(`Awarded ${entry.quantity} ${entry.itemName} to ${actor.name}.`);
  }
  removePendingOrder(id) {
    this.shopData.orderManagement.pendingOrders = this.shopData.orderManagement.pendingOrders.filter((entry) => entry.id !== id);
  }
  removeFulfilledOrder(id) {
    this.shopData.orderManagement.fulfilledOrders = this.shopData.orderManagement.fulfilledOrders.filter((entry) => entry.id !== id);
  }
  addActorPricingEntry() {
    this.shopData.economy.actorPricingEntries = Array.isArray(this.shopData.economy.actorPricingEntries) ? this.shopData.economy.actorPricingEntries : [];
    this.shopData.economy.actorPricingEntries.push(normalizeActorPricingEntry({ actorId: "", actorNameSnapshot: "", mode: "discount", percent: 0, note: "" }));
  }
  removeActorPricingEntry(indexOrId) {
    const targetId = String(indexOrId ?? "");
    this.shopData.economy.actorPricingEntries = (Array.isArray(this.shopData.economy.actorPricingEntries) ? this.shopData.economy.actorPricingEntries : []).filter((entry, index) => String(entry?.id ?? index) !== targetId && String(index) !== targetId);
  }
  addHiddenAudienceEntry() {
    this.shopData.specialInventory.hiddenAudienceEntries = Array.isArray(this.shopData.specialInventory.hiddenAudienceEntries) ? this.shopData.specialInventory.hiddenAudienceEntries : [];
    this.shopData.specialInventory.hiddenAudienceEntries.push(normalizeHiddenAudienceEntry({ actorId: "", actorNameSnapshot: "", note: "" }));
  }
  removeHiddenAudienceEntry(indexOrId) {
    const targetId = String(indexOrId ?? "");
    this.shopData.specialInventory.hiddenAudienceEntries = (Array.isArray(this.shopData.specialInventory.hiddenAudienceEntries) ? this.shopData.specialInventory.hiddenAudienceEntries : []).filter((entry, index) => String(entry?.id ?? index) !== targetId && String(index) !== targetId);
  }
  async importItemsTo(kind) {
    const docs = await ShopCompendiumImportDialog.prompt();
    if (!Array.isArray(docs) || docs.length === 0) return;
    if (kind === "stock") for (const item of docs) this.shopData.stock.push(stockEntryFromItemDocument(item));
    if (kind === "hidden") for (const item of docs) this.shopData.specialInventory.hiddenStockRows.push(hiddenStockEntryFromItemDocument(item));
    if (kind === "special") for (const item of docs) this.shopData.specialInventory.specialOrderRows.push(specialOrderRowFromItemDocument(item));
    notifyEditorInfo(`Imported ${docs.length} item${docs.length === 1 ? "" : "s"}.`);
  }
  async handleResetStock() {
    const DialogV2 = foundry?.applications?.api?.DialogV2;
    const confirmContent = `<section style="display:grid; gap:0.75rem;"><p style="margin:0;">Reset all current stock values back to their default stock amounts in the editor?</p><p style="margin:0;"><em>This does not save until you press Save Shop.</em></p></section>`;
    const confirmed = DialogV2 ? await DialogV2.confirm({ window: { title: "Reset Stock?" }, content: confirmContent, modal: true, rejectClose: false, ok: { label: "Yes", icon: "fa-solid fa-check" }, cancel: { label: "No", icon: "fa-solid fa-xmark" } }) : await Dialog.confirm({ title: "Reset Stock?", content: confirmContent });
    if (!confirmed) return;
    if (isRealisticEconomyEnabled()) {
      const percent = getRestockCostPercent();
      const availableFundsSp = Math.max(0, Math.floor(Number(this.shopData?.economy?.availableFundsSp ?? 0) || 0));
      const rows = this.shopData.stock.filter((entry) => !entry.infiniteStock);
      const requiredSp = rows.reduce((sum, entry) => {
        const needed = Math.max(0, Math.floor(Number(entry.defaultStock) || 0) - Math.floor(Number(entry.currentStock) || 0));
        const unitSp = Math.max(0, Math.floor(Number(entry.salePriceOverrideSp ?? entry.baseValueSp) || 0));
        return sum + Math.floor(unitSp * needed * percent / 100);
      }, 0);
      if (requiredSp > availableFundsSp) {
        if (shouldAllowPartialRestockWhenTillShort()) {
          const partial = applyPartialResetStock(this.shopData, availableFundsSp, percent);
          this.shopData.economy.availableFundsSp = Math.max(0, partial.remainingFundsSp);
          notifyEditorInfo(`Partial stock reset — ${partial.restockedUnits} units across ${partial.affectedCount} items for ${editorFormatSpFriendly(partial.costSp)}. Full restock required ${editorFormatSpFriendly(requiredSp)}, available ${editorFormatSpFriendly(availableFundsSp)}.`);
          return;
        }
        if (shouldWarnInsufficientTill()) {
          notifyEditorWarn(`${this.shopData.shopName || "This shop"} does not have enough till funds to restock. Required ${editorFormatSpFriendly(requiredSp)}, available ${editorFormatSpFriendly(availableFundsSp)}.`);
        }
        return;
      }
      const result2 = resetAllStock(this.shopData);
      if (!result2.ok) {
        notifyEditorError(result2.message || "Failed to reset stock.");
        return;
      }
      this.shopData.economy.availableFundsSp = Math.max(0, availableFundsSp - requiredSp);
      notifyEditorInfo(`Shop stock reset to default amounts in the editor for ${editorFormatSpFriendly(requiredSp)}.`);
      return;
    }
    const result = resetAllStock(this.shopData);
    if (!result.ok) {
      notifyEditorError(result.message || "Failed to reset stock.");
      return;
    }
    notifyEditorInfo("Shop stock reset to default amounts in the editor.");
  }
  async handleSavePreset() {
    const defaults = getDefaultPresetIncludeOptions();
    const currentName = String(this.shopData?.shopName ?? this.journalEntry?.name ?? "Shop Preset").trim() || "Shop Preset";
    const content = `
      <form class="nimble-shop-preset-form" style="display:grid; gap:0.75rem;">
        <label style="display:grid; gap:0.25rem;">Preset Name<input type="text" name="name" value="${foundry.utils.escapeHTML(currentName)}"></label>
        <label style="display:grid; gap:0.25rem;">Description<textarea name="description"></textarea></label>
        <label style="display:grid; gap:0.25rem;">Tags <input type="text" name="tags" placeholder="village, black-market, apothecary"></label>
        <fieldset style="display:grid; gap:0.45rem;">
          <legend>Include</legend>
          <label><input type="checkbox" name="includeMerchantProfile" checked> Merchant Profile</label>
          <label><input type="checkbox" name="includeShelfStock" checked> Shelf Stock</label>
          <label><input type="checkbox" name="includeHiddenStock" checked> Hidden Stock</label>
          <label><input type="checkbox" name="includeSpecialOrders" checked> Special Orders</label>
          <label><input type="checkbox" name="includePricingEconomy" checked> Pricing / Economy Settings</label>
          <label><input type="checkbox" name="includeActorPricing" checked> Actor Pricing</label>
          <label><input type="checkbox" name="includeVisibilityAudience" checked> Visibility / Audience Settings</label>
        </fieldset>
      </form>`;
    const result = await waitForDialogFormResult({
      title: "Save Shop as Preset",
      content,
      width: 560,
      buttons: [
        { action: "save", label: "Save Preset", icon: "fa-solid fa-bookmark", default: true },
        { action: "cancel", label: "Cancel", icon: "fa-solid fa-xmark" }
      ]
    });
    if (!result || result.action !== "save") return;
    const values = result.values ?? {};
    const name = String(values.name ?? "").trim();
    if (!name) {
      notifyEditorWarn("Preset name is required.");
      return;
    }
    const include = {
      ...defaults,
      includeMerchantProfile: getBooleanFromFormData(values.includeMerchantProfile ?? null),
      includeShelfStock: getBooleanFromFormData(values.includeShelfStock ?? null),
      includeHiddenStock: getBooleanFromFormData(values.includeHiddenStock ?? null),
      includeSpecialOrders: getBooleanFromFormData(values.includeSpecialOrders ?? null),
      includePricingEconomy: getBooleanFromFormData(values.includePricingEconomy ?? null),
      includeActorPricing: getBooleanFromFormData(values.includeActorPricing ?? null),
      includeVisibilityAudience: getBooleanFromFormData(values.includeVisibilityAudience ?? null)
    };
    const now = Date.now();
    const preset = normalizePresetRecord({
      id: randomId2("preset"),
      name,
      description: sanitizeTextField(values.description ?? ""),
      tags: parsePresetTags(values.tags ?? ""),
      createdAtMs: now,
      updatedAtMs: now,
      payload: sanitizeShopForPreset(this.shopData, include)
    });
    const presets = getPresetLibrary();
    presets.push(preset);
    await savePresetLibrary(presets);
    notifyEditorInfo(`Saved preset — ${preset.name}.`);
    await this.render(true);
  }
  async handleApplyPreset() {
    const presets = getPresetLibrary();
    if (!presets.length) {
      notifyEditorWarn("No shop presets available yet.");
      return;
    }
    const optionsMarkup = buildPresetOptionsMarkup(presets, presets[0]?.id ?? "");
    const descriptions = presets.map((preset) => `<li><strong>${foundry.utils.escapeHTML(preset.name)}</strong> — ${foundry.utils.escapeHTML(formatPresetSummary(preset))}</li>`).join("");
    const content = `
      <form class="nimble-shop-preset-apply-form" style="display:grid; gap:0.75rem;">
        <label style="display:grid; gap:0.25rem;">Preset<select name="presetId">${optionsMarkup}</select></label>
        <div style="font-size:0.86rem; opacity:0.8;">Applying a preset replaces the current reusable setup on this shop, but preserves till balances and order history.</div>
        <ul style="margin:0; padding-left:1.15rem; max-height:180px; overflow:auto;">${descriptions}</ul>
      </form>`;
    const result = await waitForDialogFormResult({
      title: "Apply Shop Preset",
      content,
      width: 620,
      buttons: [
        { action: "apply", label: "Apply Preset", icon: "fa-solid fa-file-import", default: true },
        { action: "cancel", label: "Cancel", icon: "fa-solid fa-xmark" }
      ]
    });
    if (!result || result.action !== "apply") return;
    const presetId = String(result.values?.presetId ?? "").trim();
    const preset = getPresetById(presets, presetId);
    if (!preset) {
      notifyEditorWarn("Preset not found.");
      return;
    }
    const DialogV2 = foundry?.applications?.api?.DialogV2;
    const confirmContent = `<section style="display:grid; gap:0.6rem;"><p style="margin:0;">Apply <strong>${foundry.utils.escapeHTML(preset.name)}</strong> to this shop?</p><p style="margin:0; opacity:0.8;"><em>This replaces the reusable shop setup on this page, but does not carry over till balances or order history.</em></p></section>`;
    const confirmed = DialogV2 ? await DialogV2.confirm({ window: { title: "Apply Preset?", resizable: false }, position: { width: 480 }, content: confirmContent, modal: true, rejectClose: false, ok: { label: "Apply", icon: "fa-solid fa-check" }, cancel: { label: "Cancel", icon: "fa-solid fa-xmark" } }) : await Dialog.confirm({ title: "Apply Preset?", content: confirmContent });
    if (!confirmed) return;
    const current = ensureShopDefaults(this.shopData);
    const nextShopData = buildShopFromPreset(current, preset);
    nextShopData.economy.availableFundsSp = current.economy.availableFundsSp;
    nextShopData.economy.defaultFundsSp = current.economy.defaultFundsSp;
    nextShopData.orderManagement = ensureOrderManagementDefaults(current.orderManagement);
    nextShopData.transactionHistory = ensureTransactionHistoryDefaults(current.transactionHistory);
    const persistResult = await updateShopData(this.journalEntry, nextShopData);
    if (!persistResult?.ok) {
      notifyEditorError("Preset could not be applied right now.");
      return;
    }
    this.shopData = cloneShopData(persistResult.data.shopData);
    notifyEditorInfo(`Applied preset — ${preset.name}.`);
    await this.render(true);
  }
  async handleManagePresets() {
    const presets = getPresetLibrary();
    if (!presets.length) {
      notifyEditorWarn("No shop presets available yet.");
      return;
    }
    const optionsMarkup = buildPresetOptionsMarkup(presets, presets[0]?.id ?? "");
    const listMarkup = presets.map((preset) => `<li><strong>${foundry.utils.escapeHTML(preset.name)}</strong>${preset.description ? ` — ${foundry.utils.escapeHTML(preset.description)}` : ""}<div style="opacity:0.8; font-size:0.82rem;">${foundry.utils.escapeHTML(formatPresetSummary(preset))}</div></li>`).join("");
    const content = `
      <form class="nimble-shop-preset-manage-form" style="display:grid; gap:0.75rem;">
        <label style="display:grid; gap:0.25rem;">Preset<select name="presetId">${optionsMarkup}</select></label>
        <ul style="margin:0; padding-left:1.15rem; max-height:200px; overflow:auto;">${listMarkup}</ul>
      </form>`;
    const result = await waitForDialogFormResult({
      title: "Manage Shop Presets",
      content,
      width: 760,
      buttons: [
        { action: "apply", label: "Apply", icon: "fa-solid fa-file-import", default: true },
        { action: "rename", label: "Rename", icon: "fa-solid fa-pen" },
        { action: "update", label: "Update from Current Shop", icon: "fa-solid fa-floppy-disk" },
        { action: "delete", label: "Delete", icon: "fa-solid fa-trash" },
        { action: "close", label: "Close", icon: "fa-solid fa-xmark" }
      ]
    });
    if (!result || result.action === "close") return;
    const presetId = String(result.values?.presetId ?? "").trim();
    const preset = getPresetById(presets, presetId);
    if (!preset) {
      notifyEditorWarn("Preset not found.");
      return;
    }
    if (result.action === "apply") {
      const current = ensureShopDefaults(this.shopData);
      const nextShopData = buildShopFromPreset(current, preset);
      nextShopData.economy.availableFundsSp = current.economy.availableFundsSp;
      nextShopData.economy.defaultFundsSp = current.economy.defaultFundsSp;
      nextShopData.orderManagement = ensureOrderManagementDefaults(current.orderManagement);
      nextShopData.transactionHistory = ensureTransactionHistoryDefaults(current.transactionHistory);
      const persistResult = await updateShopData(this.journalEntry, nextShopData);
      if (!persistResult?.ok) {
        notifyEditorError("Preset could not be applied right now.");
        return;
      }
      this.shopData = cloneShopData(persistResult.data.shopData);
      notifyEditorInfo(`Applied preset — ${preset.name}.`);
      await this.render(true);
      return;
    }
    if (result.action === "rename") {
      const newName = window.prompt("Rename preset", preset.name);
      if (!newName || !newName.trim()) return;
      preset.name = newName.trim();
      preset.updatedAtMs = Date.now();
      await savePresetLibrary(presets);
      notifyEditorInfo(`Renamed preset — ${preset.name}.`);
      return;
    }
    if (result.action === "update") {
      preset.payload = sanitizeShopForPreset(this.shopData, getDefaultPresetIncludeOptions());
      preset.updatedAtMs = Date.now();
      await savePresetLibrary(presets);
      notifyEditorInfo(`Updated preset — ${preset.name}.`);
      return;
    }
    if (result.action === "delete") {
      const confirmed = window.confirm(`Delete preset "${preset.name}"? This will not affect shops that already used it.`);
      if (!confirmed) return;
      const nextPresets = presets.filter((entry) => String(entry.id) !== String(preset.id));
      await savePresetLibrary(nextPresets);
      notifyEditorInfo(`Deleted preset — ${preset.name}.`);
      return;
    }
  }
  async applyFormState(obj) {
    this.shopData.shopName = sanitizeTextField(obj.shopName ?? this.shopData.shopName ?? "");
    this.shopData.shopId = slugify(String(obj.shopId ?? this.shopData.shopId ?? this.shopData.shopName));
    this.shopData.enabled = getBooleanFromFormData(obj.enabled ?? null);
    this.shopData.visibleToPlayers = getBooleanFromFormData(obj.visibleToPlayers ?? null);
    this.shopData.allowBuying = getBooleanFromFormData(obj.allowBuying ?? null);
    this.shopData.allowSelling = getBooleanFromFormData(obj.allowSelling ?? null);
    this.shopData.merchantProfile = {
      merchantName: sanitizeTextField(foundry.utils.getProperty(obj, "merchantProfile.merchantName")),
      merchantRoleTitle: sanitizeTextField(foundry.utils.getProperty(obj, "merchantProfile.merchantRoleTitle")),
      shopDescription: sanitizeTextField(foundry.utils.getProperty(obj, "merchantProfile.shopDescription")),
      settlementTag: sanitizeTextField(foundry.utils.getProperty(obj, "merchantProfile.settlementTag")),
      regionTag: sanitizeTextField(foundry.utils.getProperty(obj, "merchantProfile.regionTag")),
      factionTag: sanitizeTextField(foundry.utils.getProperty(obj, "merchantProfile.factionTag")),
      merchantNotes: sanitizeTextField(foundry.utils.getProperty(obj, "merchantProfile.merchantNotes")),
      pricingReputationNotes: sanitizeTextField(foundry.utils.getProperty(obj, "merchantProfile.pricingReputationNotes"))
    };
    this.shopData.economy.priceModifierPercent = getNumberFromFormData(foundry.utils.getProperty(obj, "economy.priceModifierPercent") ?? null, 0);
    this.shopData.economy.buybackRatePercent = getNumberFromFormData(foundry.utils.getProperty(obj, "economy.buybackRatePercent") ?? null, 50);
    this.shopData.economy.availableFundsSp = gpInputToSp(foundry.utils.getProperty(obj, "economy.availableFundsSp") ?? null, this.shopData.economy.availableFundsSp ?? 0);
    const actorPricingContainer = foundry.utils.getProperty(obj, "economy.actorPricingEntries") ?? {};
    const previousActorPricingById = new Map((this.shopData.economy.actorPricingEntries ?? []).map((entry) => [String(entry?.id ?? ""), entry]));
    this.shopData.economy.actorPricingEntries = Object.values(actorPricingContainer).map((entry) => {
      const rowId = sanitizeTextField(entry?.id ?? "");
      const previous = rowId ? previousActorPricingById.get(rowId) : null;
      const actorId = sanitizeTextField(entry?.actorId ?? previous?.actorId ?? "");
      const actorNameSnapshot = actorId ? String(game.actors?.get(actorId)?.name ?? entry?.actorNameSnapshot ?? previous?.actorNameSnapshot ?? "") : sanitizeTextField(entry?.actorNameSnapshot ?? previous?.actorNameSnapshot ?? "");
      const mode = String(entry?.mode ?? previous?.mode ?? "discount") === "markup" ? "markup" : "discount";
      const percent = Math.max(0, getNumberFromFormData(entry?.percent ?? null, previous?.percent ?? 0));
      return normalizeActorPricingEntry({ id: rowId || previous?.id, actorId, actorNameSnapshot, mode, percent, note: sanitizeTextField(entry?.note ?? previous?.note ?? "") });
    }).filter((entry) => entry.actorId);
    this.shopData.stockSettings.resupplyEnabled = getBooleanFromFormData(foundry.utils.getProperty(obj, "stockSettings.resupplyEnabled") ?? null);
    this.shopData.stockSettings.autoCreateResaleEntries = getBooleanFromFormData(foundry.utils.getProperty(obj, "stockSettings.autoCreateResaleEntries") ?? null);
    this.shopData.specialInventory.hiddenStockEnabled = getBooleanFromFormData(foundry.utils.getProperty(obj, "specialInventory.hiddenStockEnabled") ?? null);
    this.shopData.specialInventory.specialOrdersEnabled = getBooleanFromFormData(foundry.utils.getProperty(obj, "specialInventory.specialOrdersEnabled") ?? null);
    const hiddenAudienceContainer = foundry.utils.getProperty(obj, "specialInventory.hiddenAudienceEntries") ?? {};
    const previousHiddenAudienceById = new Map((this.shopData.specialInventory.hiddenAudienceEntries ?? []).map((entry) => [String(entry?.id ?? ""), entry]));
    this.shopData.specialInventory.hiddenAudienceEntries = Object.values(hiddenAudienceContainer).map((entry) => {
      const rowId = sanitizeTextField(entry?.id ?? "");
      const previous = rowId ? previousHiddenAudienceById.get(rowId) : null;
      const actorId = sanitizeTextField(entry?.actorId ?? previous?.actorId ?? "");
      const actorNameSnapshot = actorId ? String(game.actors?.get(actorId)?.name ?? entry?.actorNameSnapshot ?? previous?.actorNameSnapshot ?? "") : sanitizeTextField(entry?.actorNameSnapshot ?? previous?.actorNameSnapshot ?? "");
      return normalizeHiddenAudienceEntry({ id: rowId || previous?.id, actorId, actorNameSnapshot, note: sanitizeTextField(entry?.note ?? previous?.note ?? "") });
    }).filter((entry) => entry.actorId);
    const rebuildStockRows = (container, previousRows, normalizer) => {
      const rebuilt = [];
      const previousById = new Map((previousRows ?? []).filter(Boolean).map((row) => [String(row.id), row]));
      for (const rawEntry of Object.values(container ?? {})) {
        if (!rawEntry || typeof rawEntry !== "object") continue;
        const entry = rawEntry;
        const rowId = sanitizeTextField(entry.id ?? "");
        const previous = rowId ? previousById.get(rowId) : null;
        rebuilt.push(normalizer({
          ...previous,
          ...entry,
          id: rowId || previous?.id || undefined,
          sourceUuid: previous?.sourceUuid ?? null,
          normalizedKey: previous?.normalizedKey ?? null,
          itemType: previous?.itemType ?? previous?.itemSnapshot?.type ?? "object",
          img: previous?.img ?? previous?.itemSnapshot?.img ?? "icons/svg/item-bag.svg",
          description: previous?.description ?? "",
          itemSnapshot: previous?.itemSnapshot ?? { name: String(entry.name ?? previous?.name ?? "New Item"), type: previous?.itemType ?? "object", img: previous?.img ?? "icons/svg/item-bag.svg", system: { quantity: 1 } },
          baseValueSp: gpInputToSp(entry.baseValueSp ?? null, previous?.baseValueSp ?? 0),
          salePriceOverrideSp: entry.salePriceOverrideSp === "" || entry.salePriceOverrideSp === null ? null : gpInputToSp(entry.salePriceOverrideSp, previous?.salePriceOverrideSp ?? 0)
        }));
      }
      return rebuilt;
    };
    this.shopData.stock = rebuildStockRows(obj.stock, this.shopData.stock, (entry) => normalizeStockEntry({
      ...entry,
      currentStock: getNumberFromFormData(entry.currentStock ?? null, entry.currentStock ?? 0),
      defaultStock: getNumberFromFormData(entry.defaultStock ?? null, entry.defaultStock ?? 0),
      infiniteStock: getBooleanFromFormData(entry.infiniteStock ?? null),
      visible: getBooleanFromFormData(entry.visible ?? null)
    }));
    this.shopData.specialInventory.hiddenStockRows = rebuildStockRows(foundry.utils.getProperty(obj, "specialInventory.hiddenStockRows") ?? {}, this.shopData.specialInventory.hiddenStockRows, (entry) => normalizeStockEntry({
      ...entry,
      currentStock: getNumberFromFormData(entry.currentStock ?? null, entry.currentStock ?? 0),
      defaultStock: getNumberFromFormData(entry.defaultStock ?? null, entry.defaultStock ?? 0),
      infiniteStock: getBooleanFromFormData(entry.infiniteStock ?? null),
      visible: getBooleanFromFormData(entry.visible ?? null)
    }));
    this.shopData.specialInventory.specialOrderRows = rebuildStockRows(foundry.utils.getProperty(obj, "specialInventory.specialOrderRows") ?? {}, this.shopData.specialInventory.specialOrderRows, (entry) => normalizeSpecialOrderRow({
      ...entry,
      visible: getBooleanFromFormData(entry.visible ?? null),
      leadTimeLabel: sanitizeTextField(entry.leadTimeLabel),
      specialOrderNote: sanitizeTextField(entry.specialOrderNote)
    }));
    const rebuildOrders = (container, previousRows, status) => {
      const rebuilt = [];
      const previousById = new Map((previousRows ?? []).filter(Boolean).map((row) => [String(row.id), row]));
      for (const [indexKey, rawEntry] of Object.entries(container ?? {})) {
        if (!rawEntry || typeof rawEntry !== "object") continue;
        const rowIndex = Number(indexKey);
        const entry = rawEntry;
        const rowId = sanitizeTextField(entry.id ?? "");
        const previous = (rowId ? previousById.get(rowId) : null) ?? previousRows[rowIndex];
        rebuilt.push(normalizePendingOrder({
          ...previous,
          ...entry,
          id: rowId || previous?.id,
          status,
          actorId: sanitizeTextField(entry.actorId ?? previous?.actorId ?? ""),
          actorNameSnapshot: sanitizeTextField(entry.actorNameSnapshot ?? previous?.actorNameSnapshot ?? ""),
          itemName: sanitizeTextField(entry.itemName ?? previous?.itemName ?? ""),
          quantity: getNumberFromFormData(entry.quantity ?? null, previous?.quantity ?? 1),
          totalPaidSp: getNumberFromFormData(entry.totalPaidSp ?? null, previous?.totalPaidSp ?? 0),
          leadTimeLabel: sanitizeTextField(entry.leadTimeLabel ?? previous?.leadTimeLabel ?? ""),
          specialOrderNote: sanitizeTextField(entry.specialOrderNote ?? previous?.specialOrderNote ?? ""),
          sourceUuid: (sanitizeTextField(entry.sourceUuid ?? previous?.sourceUuid ?? "") || previous?.sourceUuid || null),
          itemType: (sanitizeTextField(entry.itemType ?? previous?.itemType ?? "object") || previous?.itemType || "object"),
          img: (sanitizeTextField(entry.img ?? previous?.img ?? "") || previous?.img || "icons/svg/item-bag.svg"),
          description: sanitizeTextField(entry.description ?? previous?.description ?? ""),
          itemSnapshot: previous?.itemSnapshot ?? entry.itemSnapshot ?? { name: sanitizeTextField(entry.itemName ?? previous?.itemName ?? "Ordered Item") || "Ordered Item", type: sanitizeTextField(entry.itemType ?? previous?.itemType ?? "object") || "object", img: sanitizeTextField(entry.img ?? previous?.img ?? "") || "icons/svg/item-bag.svg", system: { quantity: 1 } },
          createdAtMs: Math.max(0, Math.floor(Number(entry.createdAtMs ?? previous?.createdAtMs ?? Date.now()) || Date.now())),
          fulfilledAtMs: status === "fulfilled" ? Math.max(0, Math.floor(Number(entry.fulfilledAtMs ?? previous?.fulfilledAtMs ?? Date.now()) || Date.now())) : null
        }));
      }
      return rebuilt;
    };
    this.shopData.orderManagement.pendingOrders = rebuildOrders(foundry.utils.getProperty(obj, "orderManagement.pendingOrders") ?? {}, this.shopData.orderManagement.pendingOrders, "pending");
    this.shopData.orderManagement.fulfilledOrders = rebuildOrders(foundry.utils.getProperty(obj, "orderManagement.fulfilledOrders") ?? {}, this.shopData.orderManagement.fulfilledOrders, "fulfilled");
  }
  async save() {
    const result = await updateShopData(this.journalEntry, this.shopData);
    if (!result.ok) {
      notifyEditorError(result.message || "The shop update could not be completed.");
      return;
    }
    this.shopData = cloneShopData(result.data.shopData);
    this.shopData.specialInventory = ensureSpecialInventoryDefaults(this.shopData.specialInventory);
    this.shopData.orderManagement = ensureOrderManagementDefaults(this.shopData.orderManagement);
    this.isDirty = false;
    notifyEditorInfo("Shop changes saved.");
    await this.render(true);
  }
  async close(options) {
    if (!this.isDirty) return super.close(options);
    const DialogV2 = foundry?.applications?.api?.DialogV2;
    const content = `
      <section class="nimble-shop-confirm" style="display:grid; gap:0.75rem;">
        <p style="margin:0;">You have unsaved shop changes.</p>
        <p style="margin:0;"><em>Save before closing, or close without saving.</em></p>
      </section>`;
    const saveCurrent = async () => {
      const captured = typeof this.captureRenderedState === "function" ? this.captureRenderedState() : null;
      if (captured) await this.applyFormState(captured);
      await this.save();
      return !this.isDirty;
    };
    if (DialogV2?.wait) {
      const choice = await DialogV2.wait({
        window: { title: "Unsaved Changes", resizable: false },
        position: { width: 560, height: "auto" },
        content,
        modal: true,
        rejectClose: false,
        buttons: [
          { action: "save", label: "Save and Close", icon: "fa-solid fa-save", default: true, callback: async () => await saveCurrent() ? "save" : "cancel" },
          { action: "discard", label: "Close without Save", icon: "fa-solid fa-xmark", callback: () => "discard" },
          { action: "cancel", label: "Cancel", icon: "fa-solid fa-arrow-left", callback: () => "cancel" }
        ]
      });
      if (choice === "save") return super.close(options);
      if (choice === "discard") { this.isDirty = false; return super.close(options); }
      return this;
    }
    const fallback = await Dialog.confirm({ title: "Unsaved Changes", content });
    if (!fallback) return this;
    this.isDirty = false;
    return super.close(options);
  }
  static async openForEntry(journalEntry) {
    const app = new _ShopGmEditor(journalEntry);
    await app.render(true);
    return app;
  }
};

// scripts/shop/helpers/feedback.ts
function formatSpFriendly(totalSp) {
  return formatNormalizedCurrency(totalSp);
}
function notify(level, message) {
  ui.notifications?.[level]?.(message);
}
function notifyShopSuccess2(message) {
  notify("info", message);
}
function notifyShopWarn2(message) {
  notify("warn", message);
}
function notifyShopError2(message) {
  notify("error", message);
}
function readResultData(result) {
  return result.data && typeof result.data === "object" ? result.data : {};
}
function readString(data, key) {
  const value = data[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}
function getSelectionWarningMessage(kind, detail) {
  if (kind === "buy") {
    if (detail === "actor") return "Select a hero before buying.";
    if (detail === "item") return "Select a shop item before buying.";
    return "Select a hero and a shop item first.";
  }
  if (detail === "actor") return "Select a hero before selling.";
  if (detail === "item") return "Select an inventory item before selling.";
  return "Select a hero and an inventory item first.";
}
function getBuySuccessMessage(result) {
  if (!result.ok) return "Purchase complete.";
  return `${result.data.actorName} bought ${result.data.quantity}\xD7 ${result.data.itemName} for ${formatSpFriendly(result.data.finalTotalSp)}.`;
}
function getBuyFailureMessage(result, fallback) {
  const data = readResultData(result);
  const itemName = readString(data, "itemName") || "that item";
  const actorName = readString(data, "actorName") || "This hero";
  switch (result.code) {
    case "SHOP_DISABLED":
      return "This shop is currently disabled.";
    case "BUYING_DISABLED":
      return "Buying is currently disabled in this shop.";
    case "INVALID_QUANTITY":
      return "Enter a valid quantity before buying.";
    case "INSUFFICIENT_FUNDS":
      return `${actorName} does not have enough money for ${itemName}.`;
    case "OUT_OF_STOCK":
      return `${itemName} is out of stock.`;
    case "STOCK_ENTRY_HIDDEN":
    case "ITEM_NOT_FOUND":
      return "That shop item is no longer available.";
    case "UPDATE_FAILED":
      return "The purchase went through, but shop saving failed. GM should review the shop state.";
    case "VALIDATION_FAILED":
      if ((result.message || "").toLowerCase().includes("till")) return result.message;
      return fallback || result.message || "The purchase could not be completed.";
    default:
      return fallback || result.message || "The purchase could not be completed.";
  }
}
function getSellSuccessMessage(result) {
  if (!result.ok) return "Sale complete.";
  return `${result.data.actorName} sold ${result.data.quantity}\xD7 ${result.data.itemName} for ${formatSpFriendly(result.data.finalPayoutSp)}.`;
}
function getSellFailureMessage(result, fallback) {
  const data = readResultData(result);
  const itemName = readString(data, "itemName") || "that item";
  switch (result.code) {
    case "SHOP_DISABLED":
      return "This shop is currently disabled.";
    case "SELLING_DISABLED":
      return "Selling is currently disabled in this shop.";
    case "INVALID_QUANTITY":
      return "Enter a valid quantity before selling.";
    case "ITEM_NOT_SELLABLE":
      return `${itemName} cannot be sold here.`;
    case "ITEM_NOT_FOUND":
      return "That inventory item is no longer available.";
    case "UPDATE_FAILED":
      return "The sale went through, but shop saving failed. GM should review the shop state.";
    case "VALIDATION_FAILED":
      if ((result.message || "").toLowerCase().includes("till")) return result.message;
      return fallback || result.message || "The sale could not be completed.";
    default:
      return fallback || result.message || "The sale could not be completed.";
  }
}
function getSpecialOrderSuccessMessage(result) {
  if (!result.ok) return "Special order placed.";
  return `${result.data.actorName} placed a special order for ${result.data.quantity}× ${result.data.itemName} for ${formatSpFriendly(result.data.finalTotalSp)}.`;
}
function getSpecialOrderFailureMessage(result, fallback) {
  const data = readResultData(result);
  const itemName = readString(data, "itemName") || "that item";
  switch (result.code) {
    case "SHOP_DISABLED":
      return "This shop is currently disabled.";
    case "BUYING_DISABLED":
      return "Ordering is currently disabled in this shop.";
    case "INVALID_QUANTITY":
      return "Enter a valid quantity before ordering.";
    case "ITEM_NOT_FOUND":
      return `${itemName} is no longer available to order.`;
    case "INSUFFICIENT_FUNDS":
      return `${readString(data, "actorName") || "This hero"} does not have enough money for ${itemName}.`;
    default:
      return fallback || result.message || "The special order could not be completed.";
  }
}

// scripts/shop/helpers/pricing.ts
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

// scripts/shop/helpers/validation.ts
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

// scripts/shop/transactions/buy.ts
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
  if (!shopData.orderManagement || typeof shopData.orderManagement !== "object") shopData.orderManagement = { pendingOrders: [], fulfilledOrders: [] };
  if (!Array.isArray(shopData.orderManagement.pendingOrders)) shopData.orderManagement.pendingOrders = [];
  const pendingOrderPayload = {
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
  };
  const pendingOrder = typeof normalizePendingOrder === "function" ? normalizePendingOrder(pendingOrderPayload) : pendingOrderPayload;
  shopData.orderManagement.pendingOrders.push(pendingOrder);
  const persistResult = await updateShopData(journalEntry, shopData);
  if (!persistResult.ok) return { ok: false, code: "UPDATE_FAILED", message: "Funds were deducted, but the special order could not be saved. GM should review pending orders.", data: { actorId: actor.id, stockEntryId, quantity, previousFailure: persistResult } };
  await createShopReceipt("special-order", { actor, actorName: actor.name, itemName: stockEntry.name, quantity: Math.floor(quantity), amountSp: totals.finalTotalSp, itemImg: stockEntry.img ?? stockEntry?.itemSnapshot?.img ?? "icons/svg/item-bag.svg", shopName: shopData.shopName, shopId: shopData.shopId, timestampMs: Date.now(), leadTimeLabel: stockEntry.leadTimeLabel || "", note: stockEntry.specialOrderNote || "" });
  return { ok: true, code: "OK", message: `${actor.name} placed a special order for ${Math.floor(quantity)} ${stockEntry.name} for ${formatNormalizedCurrency(totals.finalTotalSp)}.`, data: { actorId: actor.id, actorName: actor.name, journalEntryId: journalEntry.id, shopId: shopData.shopId, stockEntryId: stockEntry.id, itemName: stockEntry.name, quantity: Math.floor(quantity), finalTotalSp: totals.finalTotalSp } };
}

// scripts/shop/helpers/matching.ts
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

// scripts/shop/transactions/sell.ts
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

// scripts/shop/apps/shopApp.ts
function escapeHtml(value) {
  return foundry.utils.escapeHTML(value ?? "");
}
function getActorById(actorId) {
  if (!actorId) return null;
  return game.actors?.get(actorId) ?? null;
}
function getStockEntryById(shopData, stockEntryId) {
  if (!stockEntryId) return null;
  return shopData.stock.find((entry) => entry.id === stockEntryId) ?? null;
}
function getSellItemById(actor, actorItemId) {
  if (!actor || !actorItemId) return null;
  return actor.items.get(actorItemId) ?? null;
}
function getQuantityValue(item) {
  const raw = foundry.utils.getProperty(item, "system.quantity");
  return Number.isFinite(raw) ? Math.max(0, Math.floor(Number(raw))) : 1;
}
function getVisibleStockFiltered(shopData, categoryFilter, searchText) {
  const search = searchText.trim().toLowerCase();
  return shopData.stock.filter((entry) => {
    if (!entry.visible) return false;
    if (categoryFilter !== "All" && entry.category !== categoryFilter) return false;
    if (!search) return true;
    return entry.name.toLowerCase().includes(search) || entry.description.toLowerCase().includes(search) || String(entry.category).toLowerCase().includes(search);
  });
}
function getHiddenAudienceActorIds(shopData) {
  return Array.from(new Set((shopData?.specialInventory?.hiddenAudienceEntries ?? []).map((entry) => String(entry?.actorId ?? "").trim()).filter(Boolean)));
}
function canActorSeeHiddenStock(shopData, actor) {
  if (!shopData?.specialInventory?.hiddenStockEnabled) return false;
  if (!actor) return false;
  return getHiddenAudienceActorIds(shopData).includes(String(actor.id));
}
function getHiddenStockFiltered(shopData, actor, categoryFilter, searchText) {
  if (!canActorSeeHiddenStock(shopData, actor)) return [];
  const search = searchText.trim().toLowerCase();
  return (shopData?.specialInventory?.hiddenStockRows ?? []).filter((entry) => {
    if (categoryFilter !== "All" && entry.category !== categoryFilter) return false;
    if (!search) return true;
    return entry.name.toLowerCase().includes(search) || entry.description.toLowerCase().includes(search) || String(entry.category).toLowerCase().includes(search);
  });
}
function getSpecialOrderFiltered(shopData, categoryFilter, searchText) {
  if (!shopData?.specialInventory?.specialOrdersEnabled) return [];
  const search = searchText.trim().toLowerCase();
  return (shopData?.specialInventory?.specialOrderRows ?? []).filter((entry) => {
    if (entry.visible === false) return false;
    if (categoryFilter !== "All" && entry.category !== categoryFilter) return false;
    if (!search) return true;
    return entry.name.toLowerCase().includes(search) || entry.description.toLowerCase().includes(search) || String(entry.category).toLowerCase().includes(search) || String(entry.specialOrderNote ?? "").toLowerCase().includes(search) || String(entry.leadTimeLabel ?? "").toLowerCase().includes(search);
  });
}
function getStorefrontEntries(shopData, section, actor, categoryFilter, searchText) {
  if (section === "hidden") return getHiddenStockFiltered(shopData, actor, categoryFilter, searchText);
  if (section === "orders") return getSpecialOrderFiltered(shopData, categoryFilter, searchText);
  return getVisibleStockFiltered(shopData, categoryFilter, searchText);
}
function sortStockEntries(entries, sortMode, shopData) {
  const mode = normalizeShopSortMode(sortMode);
  const clone = Array.from(entries || []);
  clone.sort((a, b) => {
    if (mode === "price-asc") {
      const diff = resolveBuyTotals(a, 1, shopData).finalTotalSp - resolveBuyTotals(b, 1, shopData).finalTotalSp;
      return diff || compareShopNames(a?.name, b?.name);
    }
    if (mode === "price-desc") {
      const diff = resolveBuyTotals(b, 1, shopData).finalTotalSp - resolveBuyTotals(a, 1, shopData).finalTotalSp;
      return diff || compareShopNames(a?.name, b?.name);
    }
    return compareShopNames(a?.name, b?.name);
  });
  return clone;
}
function sortSellableItems(items, sortMode, shopData) {
  const mode = normalizeShopSortMode(sortMode);
  const clone = Array.from(items || []);
  clone.sort((a, b) => {
    if (mode === "price-asc") {
      const diff = resolveSellTotals(a, 1, shopData).finalPayoutSp - resolveSellTotals(b, 1, shopData).finalPayoutSp;
      return diff || compareShopNames(a?.name, b?.name);
    }
    if (mode === "price-desc") {
      const diff = resolveSellTotals(b, 1, shopData).finalPayoutSp - resolveSellTotals(a, 1, shopData).finalPayoutSp;
      return diff || compareShopNames(a?.name, b?.name);
    }
    return compareShopNames(a?.name, b?.name);
  });
  return clone;
}
function formatSpFriendly2(totalSp) {
  return formatNormalizedCurrency(totalSp);
}
function getSnapshotPrice(entry) {
  const price = foundry.utils.getProperty(entry.itemSnapshot, "system.price");
  const denomination = String(price?.denomination ?? "").toLowerCase();
  const value = Number(price?.value ?? NaN);
  if (!denomination || !Number.isFinite(value)) return null;
  return { denomination, value: Math.max(0, Math.floor(value)) };
}
function resolveUnitPriceSp(entry, shopData) {
  const snapshotPrice = getSnapshotPrice(entry);
  const noModifier = (shopData.economy.priceModifierPercent ?? 0) === 0 && entry.salePriceOverrideSp == null;
  if (snapshotPrice && noModifier && ["gp", "sp"].includes(snapshotPrice.denomination)) {
    return snapshotPrice.denomination === "gp" ? snapshotPrice.value * GP_TO_SP : snapshotPrice.value;
  }
  const preview = resolveBuyTotals(entry, 1, shopData);
  return preview.modifiedUnitSp;
}
function formatUnitPrice(entry, shopData) {
  return formatNormalizedCurrency(resolveUnitPriceSp(entry, shopData));
}
function renderUnitPricePills(entry, shopData) {
  return formatCurrencyPills(resolveUnitPriceSp(entry, shopData));
}
function formatMerchantMetaLine(shopData) {
  const merchantProfile = shopData.merchantProfile ?? {};
  const parts = [
    merchantProfile.settlementTag,
    merchantProfile.regionTag,
    merchantProfile.factionTag
  ].map((value) => String(value ?? "").trim()).filter(Boolean);
  return parts.join(" \u2022 ");
}
function getMerchantHeaderMarkup(shopData) {
  const merchantProfile = shopData.merchantProfile ?? {};
  const merchantName = String(merchantProfile.merchantName ?? shopData.shopkeeperName ?? "").trim();
  const merchantRoleTitle = String(merchantProfile.merchantRoleTitle ?? "").trim();
  const shopDescription = String(merchantProfile.shopDescription ?? shopData.description ?? "").trim();
  const metaLine = formatMerchantMetaLine(shopData);
  const nameLine = merchantName ? `<div class="shopkeeper">${escapeHtml(merchantName)}${merchantRoleTitle ? ` <span class="merchant-role-inline">• ${escapeHtml(merchantRoleTitle)}</span>` : ""}</div>` : merchantRoleTitle ? `<div class="shopkeeper"><span class="merchant-role-inline">${escapeHtml(merchantRoleTitle)}</span></div>` : "";
  const lines = [
    nameLine,
    shopDescription ? `<div class="description">${escapeHtml(shopDescription)}</div>` : "",
    metaLine ? `<div class="merchant-meta">${escapeHtml(metaLine)}</div>` : ""
  ].filter(Boolean);
  return lines.join("");
}
function resolveItemUnitPriceSp(item) {
  const price = foundry.utils.getProperty(item, "system.price");
  const denomination = String(price?.denomination ?? "").toLowerCase();
  const value = Number(price?.value ?? NaN);
  if (denomination && Number.isFinite(value) && ["gp", "sp"].includes(denomination)) {
    return denomination === "gp" ? Math.max(0, Math.floor(value)) * GP_TO_SP : Math.max(0, Math.floor(value));
  }
  return 0;
}
function formatItemUnitPrice(item) {
  return formatNormalizedCurrency(resolveItemUnitPriceSp(item));
}
function renderItemUnitPricePills(item) {
  return formatCurrencyPills(resolveItemUnitPriceSp(item));
}
function getItemImage(img) {
  return String(img || "icons/svg/item-bag.svg");
}
function getItemCategoryLabel(item) {
  const candidates = [
    foundry.utils.getProperty(item, "system.category"),
    foundry.utils.getProperty(item, "system.itemType"),
    foundry.utils.getProperty(item, "system.type"),
    foundry.utils.getProperty(item, "system.details.type"),
    foundry.utils.getProperty(item, "system.metadata.category"),
    item?.type
  ];
  const value = candidates.find((v) => typeof v === "string" && v.trim());
  return String(value || "object");
}
function getItemDescription(item) {
  const candidates = [
    foundry.utils.getProperty(item, "system.description.public"),
    foundry.utils.getProperty(item, "system.description"),
    foundry.utils.getProperty(item, "system.details.description"),
    foundry.utils.getProperty(item, "system.shortDescription"),
    foundry.utils.getProperty(item, "description")
  ];
  const value = candidates.find((v) => typeof v === "string" && v.trim());
  if (!value) return "";
  return String(value).trim();
}
function getItemDescriptionText(item) {
  return getItemDescription(item);
}
function getStockBadgeMarkup(entry) {
  const badges = [];
  if (entry.infiniteStock) {
    badges.push(`<span class="shop-badge shop-badge--infinite">Infinite</span>`);
  } else {
    badges.push(`<span class="shop-badge">Stock ${entry.currentStock}</span>`);
  }
  return badges.join("");
}
const { HandlebarsApplicationMixin } = foundry.applications.api;
var ShopApp = class _ShopApp extends HandlebarsApplicationMixin(foundry.applications.sheets.journal.JournalEntrySheet) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(foundry.utils.deepClone(super.DEFAULT_OPTIONS), {
    id: "nimble-shop-entry-sheet",
    tag: "section",
    classes: ["nimble-shop-entry-sheet-app"],
    position: { width: 980, height: 760 },
    window: { title: "Shop", icon: "fas fa-store", resizable: true, contentClasses: ["standard-form", "nimble-shop-entry-sheet-window"] }
  });
  static PARTS = {
    main: {
      root: true,
      template: "modules/nimble-shop/templates/shop-entry-sheet.hbs"
    }
  };
  journalEntry;
  needsInitialSave;
  shopData;
  state;
  _listScrollTop = 0;
  _detailScrollTop = 0;
  constructor(journalEntryOrOptions, options = {}, actorId) {
    const entry = journalEntryOrOptions instanceof JournalEntry ? journalEntryOrOptions : journalEntryOrOptions?.document instanceof JournalEntry ? journalEntryOrOptions.document : null;
    const appOptions = journalEntryOrOptions instanceof JournalEntry ? options : journalEntryOrOptions ?? {};
    const sheetOptions = foundry.utils.mergeObject(foundry.utils.deepClone(appOptions), { document: entry ?? void 0 });
    super(sheetOptions);
    if (!entry) throw new Error(`${SHOP_MODULE_ID} | ShopApp requires a JournalEntry.`);
    this.journalEntry = entry;
    const shopData = getShopData(entry);
    this.needsInitialSave = !shopData;
    this.shopData = foundry.utils.deepClone(shopData ?? createDefaultShopData({
      shopId: entry.name?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || entry.id,
      shopName: entry.name || "New Shop"
    }));
    const resolvedActor = actorId ? getActorById(actorId) : resolveEligibleActorForUser(game.user);
    this.state = {
      mode: this.shopData.ui.defaultTab,
      selectedActorId: resolvedActor?.id ?? null,
      selectedStockEntryId: this.shopData.stock.find((entry2) => entry2.visible)?.id ?? null,
      selectedActorItemId: null,
      buyQuantity: 1,
      sellQuantity: 1,
      categoryFilter: "All",
      searchText: "",
      sortMode: "alpha",
      storefrontSection: "standard"
    };
  }
  async refreshShopData() {
    const latest = getShopData(this.journalEntry);
    if (latest) this.shopData = foundry.utils.deepClone(latest);
  }
  get selectedActor() {
    return getActorById(this.state.selectedActorId);
  }
  get selectedStockEntry() {
    if (!this.state.selectedStockEntryId) return null;
    const actor = this.selectedActor;
    const section = this.state.storefrontSection ?? "standard";
    const entries = getStorefrontEntries(this.shopData, section, actor, this.state.categoryFilter, this.state.searchText);
    return entries.find((entry) => entry.id === this.state.selectedStockEntryId) ?? null;
  }
  get selectedSellItem() {
    return getSellItemById(this.selectedActor, this.state.selectedActorItemId);
  }
  get buyPreview() {
    return this.selectedStockEntry ? resolveBuyTotals(this.selectedStockEntry, this.state.buyQuantity, this.shopData, this.selectedActor) : null;
  }
  get sellPreview() {
    return this.selectedSellItem ? resolveSellTotals(this.selectedSellItem, this.state.sellQuantity, this.shopData) : null;
  }
  normalizeState() {
    const actor = this.selectedActor;
    const hiddenAllowed = canActorSeeHiddenStock(this.shopData, actor);
    const ordersAllowed = !!this.shopData?.specialInventory?.specialOrdersEnabled;
    if (this.state.storefrontSection === "hidden" && !hiddenAllowed) this.state.storefrontSection = "standard";
    if (this.state.storefrontSection === "orders" && !ordersAllowed) this.state.storefrontSection = "standard";
    const storefrontEntries = sortStockEntries(getStorefrontEntries(this.shopData, this.state.storefrontSection ?? "standard", actor, this.state.categoryFilter, this.state.searchText), this.state.sortMode, this.shopData);
    const sellableItems = actor ? sortSellableItems(getActorSellableItemsFiltered(actor, this.state.categoryFilter, this.state.searchText), this.state.sortMode, this.shopData) : [];
    if (this.state.mode === "buy") {
      if (!storefrontEntries.some((entry) => entry.id === this.state.selectedStockEntryId)) {
        this.state.selectedStockEntryId = storefrontEntries[0]?.id ?? null;
      }
    } else {
      if (!sellableItems.some((item) => item.id === this.state.selectedActorItemId)) {
        this.state.selectedActorItemId = sellableItems[0]?.id ?? null;
      }
    }
  }
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    if (partId !== "main") return context;
    if (this.needsInitialSave && game.user?.isGM) {
      const saved = await updateShopData(this.journalEntry, this.shopData);
      if (saved.ok) {
        this.shopData = foundry.utils.deepClone(saved.data.shopData);
        this.needsInitialSave = false;
      }
    }
    await this.refreshShopData();
    this.normalizeState();
    const actor = this.selectedActor;
    const funds = actor ? actorFundsToGpSp(actor) : { gp: 0, sp: 0 };
    const storefrontEntries = sortStockEntries(getStorefrontEntries(this.shopData, this.state.storefrontSection ?? "standard", actor, this.state.categoryFilter, this.state.searchText), this.state.sortMode, this.shopData);
    const sellableItems = actor ? sortSellableItems(getActorSellableItemsFiltered(actor, this.state.categoryFilter, this.state.searchText), this.state.sortMode, this.shopData) : [];
    const allStorefrontEntries = getStorefrontEntries(this.shopData, this.state.storefrontSection ?? "standard", actor, "All", "");
    const allSellableItems = actor ? getActorSellableItems(actor) : [];
    const categorySource = this.state.mode === "buy" ? allStorefrontEntries : allSellableItems;
    const categories = ["All", ...new Set(categorySource.map((entry) => this.state.mode === "buy" ? entry.category : getItemCategoryLabel(entry)).filter(Boolean))];
    const actors = game.user?.isGM ? getPlayerOwnedActors() : getPlayerOwnedActors().filter((a) => a.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER));
    return {
      ...context,
      sheetHtml: this.renderMainContent({
        shop: this.shopData,
        actor,
        funds,
        actors,
        state: this.state,
        categories,
        storefrontEntries,
        sellableItems,
        selectedStockEntry: this.selectedStockEntry,
        selectedSellItem: this.selectedSellItem,
        buyPreview: this.buyPreview,
        sellPreview: this.sellPreview,
        hiddenAllowed: canActorSeeHiddenStock(this.shopData, actor),
        ordersAllowed: !!this.shopData?.specialInventory?.specialOrdersEnabled,
        shopClosedForViewer: !this.shopData.enabled && !game.user?.isGM
      })
    };
  }
  renderMainContent(context) {
    const shop = context.shop;
    const funds = context.funds;
    const actors = context.actors;
    const state = context.state;
    const categories = context.categories;
    const storefrontEntries = context.storefrontEntries;
    const sellableItems = context.sellableItems;
    const selectedStockEntry = context.selectedStockEntry;
    const selectedSellItem = context.selectedSellItem;
    const buyPreview = context.buyPreview;
    const sellPreview = context.sellPreview;
    const hiddenAllowed = context.hiddenAllowed;
    const ordersAllowed = context.ordersAllowed;
    const shopClosedForViewer = Boolean(context.shopClosedForViewer);
    const actorOptions = actors.map((candidate) => {
      const selected = state.selectedActorId === candidate.id ? "selected" : "";
      return `<option value="${candidate.id}" ${selected}>${escapeHtml(candidate.name)}</option>`;
    }).join("");
    const categoryOptions = categories.map((category) => {
      const selected = state.categoryFilter === category ? "selected" : "";
      return `<option value="${escapeHtml(String(category))}" ${selected}>${escapeHtml(String(category))}</option>`;
    }).join("");
    const storefrontButtons = `<div class="shop-top-actions"><div class="shop-storefront-switcher"><button type="button" class="shop-storefront-button ${state.storefrontSection === "standard" ? "active" : ""}" data-action="select-storefront-section" data-section="standard" ${shopClosedForViewer ? "disabled" : ""}>Standard Shop</button>${ordersAllowed ? `<button type="button" class="shop-storefront-button ${state.storefrontSection === "orders" ? "active" : ""}" data-action="select-storefront-section" data-section="orders" ${shopClosedForViewer ? "disabled" : ""}>Custom Orders</button>` : ""}${hiddenAllowed ? `<button type="button" class="shop-storefront-button ${state.storefrontSection === "hidden" ? "active" : ""}" data-action="select-storefront-section" data-section="hidden" ${shopClosedForViewer ? "disabled" : ""}>Hidden Shop</button>` : ""}</div>${game.user?.isGM ? `<div class="shop-gm-controls"><button type="button" class="shop-primary-button shop-primary-button--inline" data-action="toggle-shop">${shop.enabled ? "Close Shop" : "Open Shop"}</button><button type="button" class="shop-primary-button shop-primary-button--inline" data-action="open-editor">GM Editor</button></div>` : ""}</div>`;
    const closedOverlay = shopClosedForViewer ? `<div class="shop-closed-overlay"><div class="shop-closed-overlay__card"><strong>This shop is currently closed.</strong><p>Please check back later.</p></div></div>` : "";
    const storefrontEmptyLabel = state.storefrontSection === "hidden" ? "No hidden items available" : state.storefrontSection === "orders" ? "No custom orders available" : "No items available";
    const storefrontEmptyMessage = state.storefrontSection === "hidden" ? hiddenAllowed ? "No hidden stock matches the current filters." : "This actor cannot access hidden stock." : state.storefrontSection === "orders" ? "No custom-order items match the current filters." : "Nothing in this shop matches the current filters.";
    const stockList = storefrontEntries.map((entry) => {
      const active = state.selectedStockEntryId === entry.id ? "active" : "";
      const categoryLine = `<div class="shop-list-entry__meta">${escapeHtml(String(entry.category))}</div>`;
      return `
        <button type="button" class="shop-list-entry ${active}" data-action="select-stock" data-stock-id="${entry.id}">
          <img class="shop-list-entry__img" src="${escapeHtml(getItemImage(entry.img))}" alt="">
          <div class="shop-list-entry__body">
            <div class="shop-list-entry__top">
              <strong>${escapeHtml(entry.name)}</strong>
            </div>
            ${categoryLine}
          </div>
        </button>`;
    }).join("");
    const sellList = sellableItems.map((item) => {
      const active = state.selectedActorItemId === item.id ? "active" : "";
      return `
        <button type="button" class="shop-list-entry ${active}" data-action="select-sell-item" data-actor-item-id="${item.id}">
          <img class="shop-list-entry__img" src="${escapeHtml(getItemImage(item.img))}" alt="">
          <div class="shop-list-entry__body">
            <div class="shop-list-entry__top">
              <strong>${escapeHtml(item.name)}</strong>
            </div>
            <div class="shop-list-entry__meta">${escapeHtml(getItemCategoryLabel(item))}</div>
          </div>
        </button>`;
    }).join("");
    const actorAdjustmentPercent = (buyPreview?.pricingSteps?.actorModifierPercent ?? 0) > 0 ? buyPreview.pricingSteps.actorModifierPercent ?? 0 : buyPreview?.pricingSteps?.playerDiscountPercent ?? 0;
    const actorAdjustmentKind = (buyPreview?.pricingSteps?.actorModifierPercent ?? 0) > 0 ? "Surcharge" : "Discount";
    const actorAdjustmentLabel = String(buyPreview?.pricingSteps?.actorModifierLabel || "").trim();
    const actorAdjustmentText = actorAdjustmentPercent > 0 ? `${actorAdjustmentLabel && actorAdjustmentLabel.toLowerCase() !== actorAdjustmentKind.toLowerCase() ? `${escapeHtml(actorAdjustmentLabel)}: ` : ""}${actorAdjustmentPercent}% ${actorAdjustmentKind}` : "";
    const actorAdjustmentRow = actorAdjustmentText ? `<div class="shop-action-box shop-action-box--adjustment"><strong>${actorAdjustmentText}</strong></div>` : "";
    const buyDetail = selectedStockEntry ? `
      <div class="shop-detail-card">
        <div class="shop-detail-card__hero">
          <img class="shop-detail-card__img" src="${escapeHtml(getItemImage(selectedStockEntry.img))}" alt="">
          <div>
            <h3>${escapeHtml(selectedStockEntry.name)}</h3>
            <div class="shop-list-entry__badges">${state.storefrontSection === "orders" ? `${selectedStockEntry.leadTimeLabel ? `<span class="shop-badge">${escapeHtml(selectedStockEntry.leadTimeLabel)}</span>` : ""}<span class="shop-badge">Special Order</span>` : getStockBadgeMarkup(selectedStockEntry)}${renderUnitPricePills(selectedStockEntry, shop)}</div>
          </div>
        </div>
        <div class="shop-detail-card__description">${selectedStockEntry.description || "<em>No description.</em>"}${state.storefrontSection === "orders" && selectedStockEntry.specialOrderNote ? `<div style="margin-top:0.6rem; opacity:0.85;">${escapeHtml(selectedStockEntry.specialOrderNote)}</div>` : ""}${state.storefrontSection === "orders" ? `<div style="margin-top:0.6rem; opacity:0.85;">Payment is taken now. The item will be delivered later when the GM fulfills the order.</div>` : ""}</div>
        <div class="shop-action-grid shop-action-grid--buy">
          <label class="shop-quantity-field shop-action-box">Quantity <input type="number" min="1" step="1" value="${state.buyQuantity}" data-action="buy-quantity"></label>
          ${actorAdjustmentRow || `<div class="shop-action-box shop-action-box--ghost"></div>`}
          <button type="button" class="shop-primary-button shop-primary-button--full" data-action="buy">${state.storefrontSection === "orders" ? "Place Special Order" : "Buy Item"}</button>
          <div class="shop-action-box shop-action-box--total"><span>Total</span>${formatCurrencyPills(buyPreview?.finalTotalSp ?? 0, "shop-currency-stack--force-inline")}</div>
        </div>
      </div>` : `<div class="shop-detail-card shop-empty-state"><strong>No item selected</strong><p>Pick an item from the list to see price and purchase details.</p></div>`;
    const sellDetail = selectedSellItem ? `
      <div class="shop-detail-card">
        <div class="shop-detail-card__hero">
          <img class="shop-detail-card__img" src="${escapeHtml(getItemImage(selectedSellItem.img))}" alt="">
          <div>
            <h3>${escapeHtml(selectedSellItem.name)}</h3>
            <div class="shop-list-entry__badges"><span class="shop-badge">Owned ${getQuantityValue(selectedSellItem)}</span>${renderItemUnitPricePills(selectedSellItem)}</div>
          </div>
        </div>
        <div class="shop-detail-card__description">${getItemDescriptionText(selectedSellItem) || "<em>No description.</em>"}</div>
        <div class="shop-action-grid shop-action-grid--sell">
          <label class="shop-quantity-field shop-action-box">Quantity <input type="number" min="1" step="1" value="${state.sellQuantity}" data-action="sell-quantity"></label>
          <div class="shop-action-box"><span>Buyback Rate</span><strong>${shop.economy.buybackRatePercent}%</strong></div>
          <button type="button" class="shop-primary-button shop-primary-button--full" data-action="sell">Sell Item</button>
          <div class="shop-action-box shop-action-box--total"><span>Payout</span>${formatCurrencyPills(sellPreview?.finalPayoutSp ?? 0, "shop-currency-stack--force-inline")}</div>
        </div>
      </div>` : `<div class="shop-detail-card shop-empty-state"><strong>No item selected</strong><p>Pick an inventory item to preview its payout before selling it.</p></div>`;
    const emptyListMarkup = state.mode === "buy" ? `<div class="shop-empty-state"><strong>${storefrontEmptyLabel}</strong><p>${storefrontEmptyMessage}</p></div>` : `<div class="shop-empty-state"><strong>No sellable items</strong><p>The selected actor does not currently have items that can be sold here.</p></div>`;
    return `
      <style>
        .nimble-shop-app{display:flex;flex-direction:column;gap:0.85rem;height:100%;overflow:hidden;color:var(--color-text-light-highlight, #f1e8d5);padding:0.75rem 1rem 1rem;box-sizing:border-box}
        .nimble-shop-app h2,.nimble-shop-app h3{margin:0}
        .nimble-shop-app header{display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,300px);gap:1rem;padding:0.1rem 0 0.35rem;border-bottom:1px solid rgba(255,255,255,.08)}
        .nimble-shop-app header .shopkeeper{font-weight:600;color:#e3cba1}
        .merchant-role-inline{color:rgba(241,232,213,.82);font-weight:600}
        .nimble-shop-app header .description{color:rgba(241,232,213,.78)}
        .nimble-shop-app header .merchant-meta{color:rgba(241,232,213,.64);font-size:.84rem}
        .shop-header-main{display:flex;flex-direction:column;gap:0.2rem}.shop-header-side{display:flex;flex-direction:column;gap:0.65rem;align-self:start}.shop-header-side label{display:flex;flex-direction:column;gap:0.25rem;font-weight:600}
        .shop-top-actions{display:flex;align-items:center;justify-content:space-between;gap:0.85rem;flex-wrap:wrap}.shop-storefront-switcher{display:flex;flex-wrap:wrap;gap:0.75rem;align-items:center}.shop-storefront-button{padding:0.55rem 0.85rem;border-radius:10px;border:1px solid rgba(227,203,161,.45);background:rgba(227,203,161,.08);font-weight:700}.shop-storefront-button.active{background:rgba(227,203,161,.2);border-color:#e3cba1;box-shadow:0 0 0 1px rgba(227,203,161,.12) inset}.shop-storefront-button:disabled{opacity:.45;cursor:not-allowed}.shop-primary-button--inline{align-self:center}.shop-gm-controls{display:flex;align-items:center;gap:0.65rem;flex-wrap:wrap;margin-left:auto}.shop-storefront-shell{position:relative;display:flex;flex-direction:column;gap:0.85rem;min-height:0;flex:1}.shop-storefront-shell.is-closed .nimble-shop-toolbar,.shop-storefront-shell.is-closed .nimble-shop-columns{opacity:.22;filter:saturate(.75);pointer-events:none;user-select:none}.shop-closed-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:6;border-radius:16px;background:rgba(17,12,8,.24);backdrop-filter:blur(1.5px)}.shop-closed-overlay__card{display:grid;gap:0.25rem;padding:1rem 1.2rem;border:1px solid rgba(227,203,161,.35);border-radius:14px;background:rgba(27,19,13,.9);box-shadow:0 10px 30px rgba(0,0,0,.28);text-align:center}.shop-closed-overlay__card strong{font-size:1rem;line-height:1.2}.shop-closed-overlay__card p{margin:0;color:rgba(241,232,213,.82)}
        .nimble-shop-toolbar{display:grid;grid-template-columns:150px 170px minmax(180px,240px) minmax(240px,1fr);gap:0.65rem;align-items:end;justify-content:start}
        .nimble-shop-toolbar label{display:flex;flex-direction:column;gap:0.25rem;font-weight:600}
        .nimble-shop-toolbar input,.nimble-shop-toolbar select{width:100%}
        .nimble-shop-entry,.nimble-shop-entry-sheet-window,.nimble-shop-entry-sheet-app,.window-app.nimble-shop-entry-sheet-app{--shop-pill-gp-bg:rgba(253,201,117,0.92);--shop-pill-gp-border:rgba(253,201,117,0.95);--shop-pill-sp-bg:rgba(188,198,204,0.92);--shop-pill-sp-border:rgba(188,198,204,0.95);--shop-pill-text:#111111}.shop-funds-row{display:flex;gap:0.5rem;flex-wrap:wrap}.shop-currency-stack{display:inline-flex;align-items:center;gap:0.45rem;flex-wrap:wrap}.shop-currency-stack--stacked{display:inline-flex;flex-direction:column;align-items:flex-start;gap:0.35rem}.shop-currency-stack--force-inline{display:inline-flex;flex-direction:row!important;align-items:center!important;gap:0.5rem}.shop-currency-pill{display:inline-flex;align-items:center;gap:0.45rem;min-height:32px;padding:0.32rem 0.7rem;border-radius:999px;border:1px solid transparent;font-size:.82rem;font-weight:700;white-space:nowrap;opacity:1;filter:none;box-shadow:none;color:#111111!important;-webkit-text-fill-color:#111111!important}.shop-currency-pill i,.shop-currency-pill span{color:inherit!important;-webkit-text-fill-color:inherit!important;opacity:1}.shop-currency-pill--gp{border-color:rgba(253,201,117,0.95)!important;background:rgba(253,201,117,0.92)!important;background-color:rgba(253,201,117,0.92)!important;color:#111111!important;box-shadow:0 0 0 1px rgba(253,201,117,.18) inset}.shop-currency-pill--sp{border-color:rgba(188,198,204,0.95)!important;background:rgba(188,198,204,0.92)!important;background-color:rgba(188,198,204,0.92)!important;color:#111111!important;box-shadow:0 0 0 1px rgba(188,198,204,.18) inset}.shop-funds-stack .shop-currency-pill{min-height:38px;padding:0.4rem 0.8rem}.shop-detail-grid .shop-currency-pill,.shop-total-stack .shop-currency-pill,.shop-adjustment-value .shop-currency-pill{opacity:1;filter:none;color:#111111!important;-webkit-text-fill-color:#111111!important}.shop-detail-grid .shop-currency-pill i,.shop-detail-grid .shop-currency-pill span,.shop-total-stack .shop-currency-pill i,.shop-total-stack .shop-currency-pill span,.shop-adjustment-value .shop-currency-pill i,.shop-adjustment-value .shop-currency-pill span{color:#111111!important;-webkit-text-fill-color:#111111!important}
        .nimble-shop-columns{display:grid;grid-template-columns:minmax(260px,35fr) minmax(420px,65fr);gap:1rem;min-height:0;flex:1;overflow:hidden}
        .shop-list-panel,.shop-detail-panel{min-height:0;overflow:auto;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:0.75rem;background:rgba(0,0,0,.18)}.shop-list-panel{scrollbar-gutter:stable}.shop-detail-panel{scrollbar-gutter:stable}
        .shop-list-stack{display:flex;flex-direction:column;gap:0.55rem;padding-right:0.1rem}
        .shop-list-entry{display:grid;grid-template-columns:40px 1fr;gap:0.55rem;align-items:center;text-align:left;padding:0.5rem 0.6rem;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.03);min-height:50px;transition:border-color .15s ease, transform .15s ease, background .15s ease}
        .shop-list-entry:hover{border-color:rgba(227,203,161,.45);background:rgba(255,255,255,.05);transform:translateY(-1px)}
        .shop-list-entry.active{border-color:#e3cba1;background:rgba(227,203,161,.08);box-shadow:0 0 0 1px rgba(227,203,161,.15) inset}
        .shop-list-entry__img,.shop-detail-card__img{width:40px;height:40px;object-fit:cover;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.28)}
        .shop-list-entry__body{display:flex;flex-direction:column;gap:0.18rem;min-width:0}
        .shop-list-entry__top{display:flex;justify-content:space-between;align-items:flex-start;gap:0.6rem}
        .shop-list-entry__top strong{font-size:0.9rem;line-height:1.15;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .shop-list-entry__meta{color:rgba(241,232,213,.72);font-size:.78rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .shop-list-entry__badges{display:flex;flex-wrap:wrap;gap:0.35rem;margin-top:0.1rem}
        .shop-badge{display:inline-flex;align-items:center;justify-content:center;padding:0.18rem 0.6rem;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);font-size:.78rem;font-weight:700}.shop-price-pill{display:inline-flex}
        .shop-badge--infinite{border-color:rgba(111,208,178,.4);background:rgba(111,208,178,.12);color:#b8f0df}
        .shop-badge--used{border-color:rgba(245,180,98,.4);background:rgba(245,180,98,.12);color:#ffd9a3}
        .shop-detail-card{display:flex;flex-direction:column;gap:0.85rem;padding:0.15rem}
        .shop-detail-card__hero{display:grid;grid-template-columns:64px 1fr;gap:0.75rem;align-items:center}
        .shop-detail-card__img{width:64px;height:64px;border-radius:14px}
        .shop-detail-card__description{padding:0.75rem;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.03);color:rgba(241,232,213,.82)}
        .shop-detail-grid{display:grid;grid-template-columns:35fr 65fr;gap:0.65rem}.shop-detail-grid--buy{grid-template-columns:35fr 65fr}.shop-detail-grid--sell{grid-template-columns:35fr 65fr}
        .shop-detail-grid > div,.shop-total-stack > div{display:flex;justify-content:space-between;gap:0.75rem;padding:0.55rem 0.7rem;border:1px solid rgba(255,255,255,.08);border-radius:10px;background:rgba(255,255,255,.03);align-items:flex-start}
        .shop-detail-grid span,.shop-total-stack span{color:rgba(241,232,213,.72)}
        .shop-detail-grid strong,.shop-total-stack strong{font-size:.98rem}.shop-detail-grid > div > .shop-currency-stack,.shop-total-stack > div > .shop-currency-stack,.shop-adjustment-value{margin-left:auto;display:inline-flex}.shop-total-stack > div > .shop-currency-stack,.shop-detail-grid > div > .shop-currency-stack{align-items:flex-end}.shop-adjustment-value{align-items:center;gap:0.35rem}.shop-adjustment-sign{font-weight:700;color:rgba(241,232,213,.9)}
        .shop-quantity-field{display:flex;flex-direction:column;gap:0.3rem;font-weight:700;min-width:0}
        .shop-quantity-field input{max-width:none;width:100%}
        .shop-action-grid{display:grid;grid-template-columns:35fr 65fr;gap:0.65rem;align-items:stretch}.shop-action-box{display:flex;justify-content:space-between;gap:0.75rem;padding:0.65rem 0.8rem;border:1px solid rgba(255,255,255,.08);border-radius:10px;background:rgba(255,255,255,.03);align-items:center;min-height:58px}.shop-action-box span{color:rgba(241,232,213,.72)}.shop-action-box strong{font-size:.95rem;text-align:right}.shop-action-box--total{border-color:rgba(227,203,161,.35)!important;background:rgba(227,203,161,.1)!important}.shop-action-box--ghost{opacity:0;pointer-events:none}.shop-action-box--adjustment{justify-content:flex-end;align-items:center}.shop-action-box--adjustment strong{text-align:right;width:100%}.shop-primary-button{align-self:start;min-width:160px}.shop-primary-button--full{width:100%;min-height:58px;display:flex;align-items:center;justify-content:center}
        .shop-empty-state{display:flex;flex-direction:column;gap:0.35rem;align-items:flex-start;justify-content:center;min-height:180px;padding:1rem;border:1px dashed rgba(227,203,161,.3);border-radius:14px;background:rgba(255,255,255,.02);color:rgba(241,232,213,.8)}
        .shop-empty-state strong{font-size:1rem}
        .shop-detail-card__hero .shop-list-entry__badges{display:flex;flex-wrap:wrap;gap:0.35rem;align-items:center}
        .shop-order-table thead th{padding:0.4rem 0.5rem;text-align:left;font-size:.8rem;color:rgba(241,232,213,.74)}
        .shop-order-table tbody tr{background:rgba(255,255,255,.03)}
        .shop-order-table tbody td{padding:0.45rem 0.5rem;vertical-align:middle;border-top:1px solid rgba(255,255,255,.08);border-bottom:1px solid rgba(255,255,255,.08)}
        .shop-order-table tbody td:first-child{border-left:1px solid rgba(255,255,255,.08);border-top-left-radius:10px;border-bottom-left-radius:10px}
        .shop-order-table tbody td:last-child{border-right:1px solid rgba(255,255,255,.08);border-top-right-radius:10px;border-bottom-right-radius:10px}
        .shop-order-item{display:grid;grid-template-columns:40px 1fr;gap:0.55rem;align-items:center;min-width:180px}
        .shop-order-item__img{width:40px;height:40px;object-fit:cover;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.28)}
        .shop-order-item__body{display:flex;flex-direction:column;gap:0.15rem}
        .shop-order-item__body strong{line-height:1.15}
        .shop-order-item__note{font-size:.78rem;color:rgba(241,232,213,.72)}
        .shop-order-actor{font-weight:600;min-width:110px}
        .shop-order-pill{display:inline-flex;align-items:center;justify-content:center;padding:0.2rem 0.55rem;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);font-size:.76rem;font-weight:700}
        .shop-order-empty{opacity:.65}
        .shop-order-status{display:inline-flex;align-items:center;justify-content:center;padding:0.2rem 0.55rem;border-radius:999px;font-size:.76rem;font-weight:700;border:1px solid rgba(255,255,255,.12)}
        .shop-order-status--pending{border-color:rgba(245,180,98,.4);background:rgba(245,180,98,.12);color:#ffd9a3}
        .shop-order-status--fulfilled{border-color:rgba(111,208,178,.4);background:rgba(111,208,178,.12);color:#b8f0df}
        .shop-order-row__paid .shop-currency-stack{min-width:72px}
        @media (max-width: 900px){.nimble-shop-app header{grid-template-columns:1fr}.nimble-shop-toolbar{grid-template-columns:1fr}.nimble-shop-columns{grid-template-columns:1fr}.shop-list-panel{max-height:320px}.shop-inline-row{flex-direction:column;align-items:stretch}.shop-total-stack--single,.shop-quantity-field{min-width:0}.shop-action-grid,.shop-detail-grid{grid-template-columns:1fr}}
      </style>
      <div class="nimble-shop-app">
        <header>
          <div class="shop-header-main">
            <h2>${escapeHtml(shop.shopName)}</h2>
            ${getMerchantHeaderMarkup(shop)}
          </div>
          <div class="shop-header-side">
            <label>Actor<select data-action="select-actor" ${shopClosedForViewer ? "disabled" : ""}>${actorOptions}</select></label>
            <div class="shop-funds-row">${formatCurrencyPills((Number(funds.gp) || 0) * GP_TO_SP + (Number(funds.sp) || 0), "shop-funds-stack shop-currency-stack--force-inline")}</div>
            
          </div>
        </header>
        ${storefrontButtons}
        <div class="shop-storefront-shell ${shopClosedForViewer ? "is-closed" : ""}">
          <section class="nimble-shop-toolbar">
            <label>Tab<select data-action="select-mode"><option value="buy" ${state.mode === "buy" ? "selected" : ""}>Buy</option><option value="sell" ${state.mode === "sell" ? "selected" : ""}>Sell</option></select></label>
            <label>Sort<select data-action="sort-mode"><option value="alpha" ${state.sortMode === "alpha" ? "selected" : ""}>Alphabetical</option><option value="price-asc" ${state.sortMode === "price-asc" ? "selected" : ""}>Price Low → High</option><option value="price-desc" ${state.sortMode === "price-desc" ? "selected" : ""}>Price High → Low</option></select></label>
            <label>Category<select data-action="category-filter">${categoryOptions}</select></label>
            <label>Search<input type="text" value="${escapeHtml(state.searchText)}" data-action="search"></label>
          </section>
          <section class="nimble-shop-columns">
            <div class="shop-list-panel" data-region="list">
              <div class="shop-list-stack">
                ${state.mode === "buy" ? stockList || emptyListMarkup : sellList || emptyListMarkup}
              </div>
            </div>
            <div class="shop-detail-panel" data-region="detail">
              ${state.mode === "buy" ? buyDetail : sellDetail}
            </div>
          </section>
          ${closedOverlay}
        </div>
      </div>`;
  }
  _replaceHTML(result, content) {
    const root = content instanceof HTMLElement ? content : content?.[0];
    if (!root) return;
    const mainResult = typeof result === "string" ? result : typeof result?.main === "string" ? result.main : result?.main instanceof HTMLElement ? result.main.outerHTML : "";
    root.innerHTML = mainResult;
    this.bindUi(root);
    const listRegion = root.querySelector('[data-region="list"]');
    if (listRegion) listRegion.scrollTop = this._listScrollTop ?? 0;
    const detailRegion = root.querySelector('[data-region="detail"]');
    if (detailRegion) detailRegion.scrollTop = this._detailScrollTop ?? 0;
    if (this._searchFocus) {
      const searchInput = root.querySelector('[data-action="search"]');
      if (searchInput) {
        const start = Number.isInteger(this._searchSelectionStart) ? this._searchSelectionStart : String(this.state.searchText ?? "").length;
        const end = Number.isInteger(this._searchSelectionEnd) ? this._searchSelectionEnd : start;
        requestAnimationFrame(() => {
          searchInput.focus();
          try {
            searchInput.setSelectionRange(start, end);
          } catch (_error) {
          }
        });
      }
      this._searchFocus = false;
    }
  }
  bindUi(root) {
    root.onclick = async (event) => {
      const target = event.target;
      const actionEl = target?.closest("[data-action]");
      if (!actionEl) return;
      const action = actionEl.dataset.action;
      if (!action) return;
      event.preventDefault();
      if (action === "select-stock") {
        this.state.selectedStockEntryId = actionEl.dataset.stockId ?? null;
        this.state.buyQuantity = 1;
        this._listScrollTop = root.querySelector('[data-region="list"]')?.scrollTop ?? 0;
        this._detailScrollTop = root.querySelector('[data-region="detail"]')?.scrollTop ?? 0;
        await this.render(true);
      } else if (action === "select-sell-item") {
        this.state.selectedActorItemId = actionEl.dataset.actorItemId ?? null;
        this.state.sellQuantity = 1;
        this._listScrollTop = root.querySelector('[data-region="list"]')?.scrollTop ?? 0;
        this._detailScrollTop = root.querySelector('[data-region="detail"]')?.scrollTop ?? 0;
        await this.render(true);
      } else if (action === "buy") {
        await this.handleBuy();
      } else if (action === "sell") {
        await this.handleSell();
      } else if (action === "open-editor") {
        if (game.user?.isGM) await ShopGmEditor.openForEntry(this.journalEntry);
      } else if (action === "toggle-shop") {
        if (game.user?.isGM) await this.handleToggleShop();
      } else if (action === "select-storefront-section") {
        this.state.storefrontSection = ["standard", "hidden", "orders"].includes(actionEl.dataset.section || "") ? actionEl.dataset.section : "standard";
        this.state.mode = "buy";
        this.state.selectedStockEntryId = null;
        this.state.buyQuantity = 1;
        this._listScrollTop = root.querySelector('[data-region="list"]')?.scrollTop ?? 0;
        this._detailScrollTop = root.querySelector('[data-region="detail"]')?.scrollTop ?? 0;
        await this.render(true);
      }
    };
    root.onchange = async (event) => {
      const target = event.target;
      const action = target?.dataset.action;
      if (!target || !action) return;
      if (action === "select-actor") {
        this.state.selectedActorId = target.value || null;
        this.state.selectedActorItemId = null;
        this.state.selectedStockEntryId = null;
        this._listScrollTop = root.querySelector('[data-region="list"]')?.scrollTop ?? 0;
        this._detailScrollTop = root.querySelector('[data-region="detail"]')?.scrollTop ?? 0;
        await this.render(true);
      } else if (action === "select-mode") {
        this.state.mode = target.value === "sell" ? "sell" : "buy";
        this._listScrollTop = root.querySelector('[data-region="list"]')?.scrollTop ?? 0;
        this._detailScrollTop = root.querySelector('[data-region="detail"]')?.scrollTop ?? 0;
        await this.render(true);
      } else if (action === "category-filter") {
        this.state.categoryFilter = target.value || "All";
        if (this.state.mode === "buy") this.state.selectedStockEntryId = null;
        this._listScrollTop = root.querySelector('[data-region="list"]')?.scrollTop ?? 0;
        this._detailScrollTop = root.querySelector('[data-region="detail"]')?.scrollTop ?? 0;
        await this.render(true);
      } else if (action === "sort-mode") {
        this.state.sortMode = normalizeShopSortMode(target.value);
        this._listScrollTop = root.querySelector('[data-region="list"]')?.scrollTop ?? 0;
        this._detailScrollTop = root.querySelector('[data-region="detail"]')?.scrollTop ?? 0;
        await this.render(true);
      } else if (action === "buy-quantity") {
        const value = Number(target.value);
        this.state.buyQuantity = Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
        this._listScrollTop = root.querySelector('[data-region="list"]')?.scrollTop ?? 0;
        this._detailScrollTop = root.querySelector('[data-region="detail"]')?.scrollTop ?? 0;
        await this.render(true);
      } else if (action === "sell-quantity") {
        const value = Number(target.value);
        this.state.sellQuantity = Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
        this._listScrollTop = root.querySelector('[data-region="list"]')?.scrollTop ?? 0;
        this._detailScrollTop = root.querySelector('[data-region="detail"]')?.scrollTop ?? 0;
        await this.render(true);
      }
    };
    root.oninput = async (event) => {
      const target = event.target;
      if (!target || target.dataset.action !== "search") return;
      this.state.searchText = target.value;
      if (this.state.mode === "buy") this.state.selectedStockEntryId = null;
      this._searchFocus = true;
      this._searchSelectionStart = target.selectionStart ?? String(target.value ?? "").length;
      this._searchSelectionEnd = target.selectionEnd ?? this._searchSelectionStart;
      this._listScrollTop = root.querySelector('[data-region="list"]')?.scrollTop ?? 0;
      this._detailScrollTop = root.querySelector('[data-region="detail"]')?.scrollTop ?? 0;
      await this.render(true);
    };
  }
  async handleBuy() {
    const actor = this.selectedActor;
    const stockEntry = this.selectedStockEntry;
    if (!actor || !stockEntry) {
      notifyShopWarn2(
        getSelectionWarningMessage(
          "buy",
          !actor && !stockEntry ? "both" : !actor ? "actor" : "item"
        )
      );
      return;
    }
    const section = this.state.storefrontSection ?? "standard";
    let result;
    if (!game.user?.isGM) {
      const payload = { entryId: this.journalEntry.id, actorId: actor.id, stockEntryId: stockEntry.id, quantity: this.state.buyQuantity };
      result = await requestShopRelay(section === "hidden" ? "hidden-buy" : section === "orders" ? "special-order" : "buy", payload);
    } else if (section === "hidden") {
      result = await executeHiddenBuyTransaction(this.journalEntry, actor, stockEntry.id, this.state.buyQuantity);
    } else if (section === "orders") {
      result = await executeSpecialOrderTransaction(this.journalEntry, actor, stockEntry.id, this.state.buyQuantity);
    } else {
      result = await executeBuyTransaction(this.journalEntry, actor, stockEntry.id, this.state.buyQuantity);
    }
    if (!result.ok) {
      notifyShopError2(section === "orders" ? getSpecialOrderFailureMessage(result) : getBuyFailureMessage(result));
      return;
    }
    if (result?.data?.relayShopData) {
      this.shopData = foundry.utils.deepClone(result.data.relayShopData);
    } else {
      await this.refreshShopData();
    }
    notifyShopSuccess2(section === "orders" ? getSpecialOrderSuccessMessage(result) : getBuySuccessMessage(result));
    this.normalizeState();
    await this.render(true);
  }
  async handleSell() {
    const actor = this.selectedActor;
    const item = this.selectedSellItem;
    if (!actor || !item) {
      notifyShopWarn2(
        getSelectionWarningMessage(
          "sell",
          !actor && !item ? "both" : !actor ? "actor" : "item"
        )
      );
      return;
    }
    const result = !game.user?.isGM ? await requestShopRelay("sell", { entryId: this.journalEntry.id, actorId: actor.id, actorItemId: item.id, quantity: this.state.sellQuantity }) : await executeSellTransaction(this.journalEntry, actor, item.id, this.state.sellQuantity);
    if (!result.ok) {
      notifyShopError2(getSellFailureMessage(result));
      return;
    }
    if (result?.data?.relayShopData) {
      this.shopData = foundry.utils.deepClone(result.data.relayShopData);
    } else {
      await this.refreshShopData();
    }
    notifyShopSuccess2(getSellSuccessMessage(result));
    this.state.selectedActorItemId = null;
    this.normalizeState();
    await this.render(true);
  }
  async handleToggleShop() {
    if (!game.user?.isGM) return;
    const nextShopData = foundry.utils.deepClone(this.shopData);
    nextShopData.enabled = !nextShopData.enabled;
    const result = await updateShopData(this.journalEntry, nextShopData);
    if (!result.ok) {
      notifyShopError2(result.message || "Failed to update shop state.");
      return;
    }
    this.shopData = foundry.utils.deepClone(result.data.shopData);
    notifyShopSuccess2(`${this.shopData.shopName} is now ${this.shopData.enabled ? "open" : "closed"}.`);
    await this.render(true);
  }
  static async openForEntry(journalEntry, actorId) {
    const app = new _ShopApp(journalEntry, {}, actorId);
    await app.render(true);
    return app;
  }
};

// scripts/shop/transactions/resetStock.ts
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

// scripts/shop/api/shopApi.ts
function resolveJournalEntry(entryOrPageId) {
  for (const entry of game.journal ?? []) {
    if (entry.id === entryOrPageId) return entry;
    const page = entry.pages?.get(entryOrPageId) ?? entry.pages?.contents?.find((p) => p.id === entryOrPageId) ?? null;
    if (page) return entry;
  }
  return null;
}
function getActorById2(actorId) {
  return game.actors?.get(actorId) ?? null;
}
async function openShop(entryOrPageId, actorId) {
  const journalEntry = resolveJournalEntry(entryOrPageId);
  if (!journalEntry) {
    ui.notifications?.error("Journal entry not found for shop.");
    return;
  }
  await ShopApp.openForEntry(journalEntry, actorId);
}
async function openShopEditor(entryOrPageId) {
  const journalEntry = resolveJournalEntry(entryOrPageId);
  if (!journalEntry) {
    ui.notifications?.error("Journal entry not found for shop editor.");
    return;
  }
  if (!game.user?.isGM) {
    ui.notifications?.warn("Only the GM can open the shop editor.");
    return;
  }
  await ShopGmEditor.openForEntry(journalEntry);
}
async function executeBuyFromEntry(entryOrPageId, actorId, stockEntryId, quantity) {
  const journalEntry = resolveJournalEntry(entryOrPageId);
  if (!journalEntry) {
    return { ok: false, code: "ITEM_NOT_FOUND", message: "Journal entry not found for shop purchase.", data: { entryOrPageId } };
  }
  const actor = getActorById2(actorId);
  if (!actor) {
    return { ok: false, code: "ACTOR_NOT_FOUND", message: "Actor not found for shop purchase.", data: { actorId, entryOrPageId } };
  }
  return executeBuyTransaction(journalEntry, actor, stockEntryId, quantity);
}
async function executeSellFromEntry(entryOrPageId, actorId, actorItemId, quantity) {
  const journalEntry = resolveJournalEntry(entryOrPageId);
  if (!journalEntry) {
    return { ok: false, code: "ITEM_NOT_FOUND", message: "Journal entry not found for shop sellback.", data: { entryOrPageId } };
  }
  const actor = getActorById2(actorId);
  if (!actor) {
    return { ok: false, code: "ACTOR_NOT_FOUND", message: "Actor not found for shop sellback.", data: { actorId, entryOrPageId } };
  }
  return executeSellTransaction(journalEntry, actor, actorItemId, quantity);
}
async function resetShopStock(entryOrPageId) {
  const journalEntry = resolveJournalEntry(entryOrPageId);
  if (!journalEntry) {
    return { ok: false, code: "ITEM_NOT_FOUND", message: "Journal entry not found for shop stock reset.", data: { entryOrPageId } };
  }
  return executeResetAllStockTransaction(journalEntry);
}
function createShopApi() {
  return { openShop, openShopEditor, executeBuyFromEntry, executeSellFromEntry, resetShopStock };
}
var SHOP_SOCKET_CHANNEL = `module.${SHOP_MODULE_ID}`;
var SHOP_SOCKET_PENDING = /* @__PURE__ */ new Map();
function getPrimaryActiveGM() {
  const activeGMs = Array.from(game.users ?? []).filter((user) => user?.isGM && user.active);
  activeGMs.sort((a, b) => String(a.id ?? "").localeCompare(String(b.id ?? "")));
  return activeGMs[0] ?? null;
}
function buildSocketFailure(message, data = {}) {
  return { ok: false, code: "SOCKET_UNAVAILABLE", message, data };
}
async function executeShopRelayAction(action, payload = {}, senderUserId = null) {
  const journalEntry = resolveJournalEntry(String(payload.entryOrPageId ?? payload.journalEntryId ?? payload.entryId ?? ""));
  if (!journalEntry) {
    return { ok: false, code: "ITEM_NOT_FOUND", message: "Journal entry not found for shop transaction.", data: { entryOrPageId: payload.entryOrPageId ?? payload.entryId ?? payload.journalEntryId ?? null } };
  }
  const actor = payload.actorId ? getActorById2(String(payload.actorId)) : null;
  const senderUser = senderUserId ? game.users?.get(senderUserId) ?? null : null;
  if (actor && senderUser && !senderUser.isGM) {
    try {
      if (!actor.testUserPermission(senderUser, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)) {
        return { ok: false, code: "PERMISSION_DENIED", message: "You do not have permission to use that actor for shop transactions.", data: { actorId: actor.id, senderUserId } };
      }
    } catch (_err) {
    }
  }
  let result;
  switch (action) {
    case "buy":
      if (!actor) return { ok: false, code: "ACTOR_NOT_FOUND", message: "Actor not found for shop purchase.", data: { actorId: payload.actorId ?? null } };
      result = await executeBuyTransaction(journalEntry, actor, String(payload.stockEntryId ?? ""), Number(payload.quantity ?? 1));
      break;
    case "hidden-buy":
      if (!actor) return { ok: false, code: "ACTOR_NOT_FOUND", message: "Actor not found for hidden shop purchase.", data: { actorId: payload.actorId ?? null } };
      result = await executeHiddenBuyTransaction(journalEntry, actor, String(payload.stockEntryId ?? ""), Number(payload.quantity ?? 1));
      break;
    case "special-order":
      if (!actor) return { ok: false, code: "ACTOR_NOT_FOUND", message: "Actor not found for special order.", data: { actorId: payload.actorId ?? null } };
      result = await executeSpecialOrderTransaction(journalEntry, actor, String(payload.stockEntryId ?? ""), Number(payload.quantity ?? 1));
      break;
    case "sell":
      if (!actor) return { ok: false, code: "ACTOR_NOT_FOUND", message: "Actor not found for shop sellback.", data: { actorId: payload.actorId ?? null } };
      result = await executeSellTransaction(journalEntry, actor, String(payload.actorItemId ?? ""), Number(payload.quantity ?? 1));
      break;
    default:
      result = { ok: false, code: "INVALID_ACTION", message: `Unsupported shop relay action: ${String(action)}`, data: { action } };
      break;
  }
  const latestShopData = getShopData(journalEntry);
  if (latestShopData) {
    result = {
      ...result,
      data: {
        ...(result?.data ?? {}),
        relayShopData: latestShopData
      }
    };
  }
  return result;
}
function registerShopSocketRelay() {
  if (!game.socket || globalThis.__nimbleShopRelayRegistered) return;
  globalThis.__nimbleShopRelayRegistered = true;
  game.socket.on(SHOP_SOCKET_CHANNEL, async (packet) => {
    if (!packet || packet.moduleId !== SHOP_MODULE_ID) return;
    if (packet.kind === "request") {
      if (!game.user?.isGM) return;
      const primaryGM = getPrimaryActiveGM();
      if (!primaryGM || primaryGM.id !== game.user.id) return;
      if (packet.targetUserId && packet.targetUserId !== game.user.id) return;
      let result;
      try {
        result = await executeShopRelayAction(packet.action, packet.payload ?? {}, packet.senderUserId ?? null);
      } catch (error) {
        console.error(`${SHOP_MODULE_ID} | Shop relay execution failed`, error);
        result = { ok: false, code: "UPDATE_FAILED", message: error?.message || "The shop transaction failed on the GM relay.", data: { action: packet.action ?? null } };
      }
      game.socket.emit(SHOP_SOCKET_CHANNEL, {
        moduleId: SHOP_MODULE_ID,
        kind: "response",
        requestId: packet.requestId,
        targetUserId: packet.senderUserId,
        result
      });
      return;
    }
    if (packet.kind === "response") {
      if (packet.targetUserId !== game.user?.id) return;
      const pending = SHOP_SOCKET_PENDING.get(packet.requestId);
      if (!pending) return;
      clearTimeout(pending.timeoutId);
      SHOP_SOCKET_PENDING.delete(packet.requestId);
      pending.resolve(packet.result ?? buildSocketFailure("Shop relay returned no result."));
    }
  });
}
function requestShopRelay(action, payload) {
  const primaryGM = getPrimaryActiveGM();
  if (!primaryGM) {
    return Promise.resolve(buildSocketFailure("No active GM is available to process that shop transaction."));
  }
  if (game.user?.isGM && primaryGM.id === game.user.id) {
    return executeShopRelayAction(action, payload, game.user.id);
  }
  if (!game.socket) {
    return Promise.resolve(buildSocketFailure("Shop socket relay is unavailable."));
  }
  const requestId = foundry.utils.randomID();
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      SHOP_SOCKET_PENDING.delete(requestId);
      resolve(buildSocketFailure("The shop transaction timed out waiting for a GM.", { action }));
    }, 15e3);
    SHOP_SOCKET_PENDING.set(requestId, { resolve, timeoutId });
    game.socket.emit(SHOP_SOCKET_CHANNEL, {
      moduleId: SHOP_MODULE_ID,
      kind: "request",
      requestId,
      targetUserId: primaryGM.id,
      senderUserId: game.user?.id ?? null,
      action,
      payload
    });
  });
}

// scripts/shop/helpers/receipts.ts
var SHOP_CHAT_RECEIPTS_SETTING_KEY = "chatReceiptsEnabled";
var SHOP_TRANSACTION_HISTORY_ENABLED_SETTING_KEY = "transactionHistoryEnabled";

function areShopChatReceiptsEnabled() {
  try {
    return Boolean(game.settings.get(SHOP_MODULE_ID, SHOP_CHAT_RECEIPTS_SETTING_KEY));
  } catch (_err) {
    return true;
  }
}
function isShopTransactionHistoryEnabled() {
  try {
    return Boolean(game.settings.get(SHOP_MODULE_ID, SHOP_TRANSACTION_HISTORY_ENABLED_SETTING_KEY));
  } catch (_err) {
    return true;
  }
}
function getShopReceiptWhisperIds(actor) {
  const ids = new Set();
  for (const user of game.users ?? []) {
    if (user.isGM) ids.add(user.id);
  }
  if (actor) {
    for (const user of game.users ?? []) {
      try {
        if (actor.testUserPermission(user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)) ids.add(user.id);
      } catch (_err) {}
    }
  }
  if (!ids.size && game.user?.id) ids.add(game.user.id);
  return Array.from(ids);
}
function buildReceiptLine(label, value) {
  return `<div style="display:flex;justify-content:space-between;gap:0.6rem;align-items:flex-start;"><span style="opacity:0.72;white-space:nowrap;">${escapeHtml(label)}</span><span style="text-align:right;min-width:0;">${value}</span></div>`;
}
function getShopReceiptKindLabel(kind) {
  switch (kind) {
    case "sell": return "Sell Receipt";
    case "hidden-buy": return "Hidden Purchase Receipt";
    case "special-order": return "Special Order Receipt";
    case "fulfill-order": return "Order Fulfilled";
    default: return "Purchase Receipt";
  }
}
function buildShopReceiptContent(kind, payload) {
  const lines = [];
  const qty = Math.max(1, Math.floor(Number(payload.quantity) || 1));
  lines.push(buildReceiptLine("Hero", escapeHtml(payload.actorName || "—")));
  lines.push(buildReceiptLine("Item", `<span style="font-weight:700;">${escapeHtml(payload.itemName || "Item")}</span><span style="opacity:0.72;display:block;font-size:0.86rem;">Qty ${qty}</span>`));
  if (kind === "sell") {
    lines.push(buildReceiptLine("Payout", escapeHtml(formatNormalizedCurrency(payload.amountSp))));
  } else {
    lines.push(buildReceiptLine(kind === "fulfill-order" ? "Paid" : "Total", escapeHtml(formatNormalizedCurrency(payload.amountSp))));
  }
  if (payload.leadTimeLabel) lines.push(buildReceiptLine("Lead Time", escapeHtml(payload.leadTimeLabel)));
  if (payload.note) lines.push(buildReceiptLine("Note", escapeHtml(payload.note)));
  return `<div class="nimble-shop-chat-receipt" style="display:grid;gap:0.45rem;padding:0.55rem 0.7rem;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.035);"><div style="display:grid;gap:0.1rem;"><div style="font-weight:800;font-size:1rem;line-height:1.2;">${escapeHtml(getShopReceiptKindLabel(kind))}</div><div style="opacity:0.72;font-size:0.82rem;line-height:1.2;">${escapeHtml(formatTransactionWhen(payload.timestampMs || Date.now()))}</div></div><div style="display:grid;gap:0.3rem;">${lines.join("")}</div></div>`;
}
async function createShopReceipt(kind, payload) {
  if (!areShopChatReceiptsEnabled()) return;
  const whisper = getShopReceiptWhisperIds(payload.actor ?? null);
  if (!whisper.length) return;
  try {
    await ChatMessage.create({
      content: buildShopReceiptContent(kind, payload),
      whisper,
      speaker: { alias: String(payload.shopName || payload.shopId || "Shop") }
    });
  } catch (error) {
    console.error(`${SHOP_MODULE_ID} | Failed to create shop receipt`, error);
  }
}

// scripts/shop/settings.ts
var SHOP_REALISTIC_ECONOMY_ENABLED_SETTING_KEY = "realisticEconomyEnabled";
var SHOP_RESTOCK_COST_PERCENT_SETTING_KEY = "restockCostPercent";
var SHOP_BLOCK_SALES_IF_TILL_SHORT_SETTING_KEY = "blockSalesIfTillShort";
var SHOP_ALLOW_PARTIAL_RESTOCK_WHEN_TILL_SHORT_SETTING_KEY = "allowPartialRestockWhenTillShort";
var SHOP_WARN_INSUFFICIENT_TILL_SETTING_KEY = "warnInsufficientTill";
var SHOP_PRESETS_SETTING_KEY = "shopPresets";
function registerShopSettings() {
  game.settings.register(SHOP_MODULE_ID, SHOP_CHAT_RECEIPTS_SETTING_KEY, {
    name: "Enable Shop Chat Receipts",
    hint: "Send whispered buy/sell receipts to the acting player and the GM.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
  game.settings.register(SHOP_MODULE_ID, SHOP_TRANSACTION_HISTORY_ENABLED_SETTING_KEY, {
    name: "Enable Shop Transaction History",
    hint: "Record recent buy, sell, hidden, and order activity in each shop for GM review.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
  game.settings.register(SHOP_MODULE_ID, SHOP_REALISTIC_ECONOMY_ENABLED_SETTING_KEY, {
    name: "Enable Realistic Shop Economy",
    hint: "When enabled, purchases add to till, sales pay from till, and stock reset restocks consume till.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });
  game.settings.register(SHOP_MODULE_ID, SHOP_RESTOCK_COST_PERCENT_SETTING_KEY, {
    name: "Restock Cost %",
    hint: "Percent of base or override value charged when resetting stock back up to default amounts.",
    scope: "world",
    config: true,
    type: Number,
    default: 60
  });
  game.settings.register(SHOP_MODULE_ID, SHOP_BLOCK_SALES_IF_TILL_SHORT_SETTING_KEY, {
    name: "Block Player Sales When Till Is Short",
    hint: "When realistic economy is enabled, prevent sell-to-shop transactions the till cannot cover.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
  game.settings.register(SHOP_MODULE_ID, SHOP_ALLOW_PARTIAL_RESTOCK_WHEN_TILL_SHORT_SETTING_KEY, {
    name: "Allow Partial Restock When Till Is Short",
    hint: "When realistic economy is enabled, stock reset will refill as much as the till can afford instead of blocking entirely.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
  game.settings.register(SHOP_MODULE_ID, SHOP_WARN_INSUFFICIENT_TILL_SETTING_KEY, {
    name: "Warn When Till Is Insufficient",
    hint: "Show warnings when the till cannot cover a sale or restock while realistic economy is enabled.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(SHOP_MODULE_ID, SHOP_PRESETS_SETTING_KEY, {
    name: "Shop Preset Library",
    hint: "Stores reusable Nimble Shop presets for this world.",
    scope: "world",
    config: false,
    type: Object,
    default: []
  });
}

// scripts/shop/index.ts
function ensureModuleNamespace() {
  if (!game.nimbleShop) game.nimbleShop = {};
  return game.nimbleShop;
}
function registerShopApi() {
  const namespace = ensureModuleNamespace();
  namespace.shop = createShopApi();
}
function registerShopSheet() {
  const cfg = foundry.applications?.apps?.DocumentSheetConfig;
  if (!cfg) {
    console.warn(`${SHOP_MODULE_ID} | DocumentSheetConfig unavailable; shop sheet not registered.`);
    return;
  }
  cfg.registerSheet(JournalEntry, SHOP_MODULE_ID, ShopApp, {
    label: "Nimble Shop",
    makeDefault: false
  });
}
function registerShopFeature() {
  Hooks.once("init", () => {
    registerShopSettings();
    registerShopApi();
    registerShopSheet();
    console.log(`${SHOP_MODULE_ID} | Shop feature initialized.`);
  });
  Hooks.once("ready", () => {
    registerShopSocketRelay();
  });
}

// scripts/init.ts
registerShopFeature();
