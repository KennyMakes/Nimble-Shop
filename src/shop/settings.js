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

