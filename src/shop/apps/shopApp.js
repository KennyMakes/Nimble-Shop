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

