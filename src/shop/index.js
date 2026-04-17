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

