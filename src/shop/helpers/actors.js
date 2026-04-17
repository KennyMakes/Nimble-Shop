function isPlayerOwnedCharacter(actor) {
  if (actor.type !== "character") return false;
  return game.users.some((user) => {
    if (!user.isGM) {
      return actor.testUserPermission(user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
    }
    return false;
  });
}
function getPlayerOwnedActors() {
  return game.actors.filter((actor) => isPlayerOwnedCharacter(actor));
}
function getControlledActorForUser(user) {
  const controlled = canvas?.tokens?.controlled ?? [];
  for (const token of controlled) {
    const actor = token.actor;
    if (!actor) continue;
    if (actor.testUserPermission(user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)) {
      return actor;
    }
  }
  return null;
}
function resolveEligibleActorForUser(user) {
  const controlled = getControlledActorForUser(user);
  if (controlled) return controlled;
  if (user.isGM) {
    const playerOwnedActors = getPlayerOwnedActors();
    return playerOwnedActors[0] ?? null;
  }
  const ownedCharacters = game.actors.filter((actor) => {
    return actor.type === "character" && actor.testUserPermission(user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
  });
  if (ownedCharacters.length === 1) {
    return ownedCharacters[0];
  }
  if (ownedCharacters.length > 1) {
    const primary = ownedCharacters.find(
      (actor) => actor.getFlag(SHOP_MODULE_ID, "preferredShopActor") === true
    );
    return primary ?? ownedCharacters[0];
  }
  return null;
}

