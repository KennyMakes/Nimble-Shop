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

