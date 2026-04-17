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


