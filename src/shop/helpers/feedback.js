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

