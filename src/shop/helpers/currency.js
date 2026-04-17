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

