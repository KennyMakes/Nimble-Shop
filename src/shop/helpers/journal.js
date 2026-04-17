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

