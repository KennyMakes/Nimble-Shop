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
