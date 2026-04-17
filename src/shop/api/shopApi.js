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

