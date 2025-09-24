const MODULE_ID = "pvp-addon";

/* =========================
  SETTINGS (register early on init)
  ========================= */
Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "statusIds", {
    name: "Status ID da trattare come invisibile",
    hint: "Lista separata da virgole. Es.: invisible",
    scope: "world",
    config: true,
    type: String,
    default: "invisible"
  });

  game.settings.register(MODULE_ID, "lockSpellCards", {
    name: "Limita card incantesimi a GM + proprietari",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  game.settings.register(MODULE_ID, "spellCardsMode", {
    name: "Quando applicare",
    scope: "world",
    config: true,
    type: String,
    default: "invisibleOnly",
    choices: { always: "Sempre", invisibleOnly: "Solo se invisibile" }
  });

  game.settings.register(MODULE_ID, "includeAuthor", {
    name: "Includi sempre l'autore",
    hint: "Se disattivo, chi non è proprietario non vede la sua stessa card.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

});

// After full ready, do an initial pass
Hooks.once('ready', ()=> refreshAllTokens());

/* =========================
   HELPERS
   ========================= */
function _safeSetting(k, d){
  try { return game.settings.get(MODULE_ID,k); } catch(_) { return d; }
}
function getInvisibleIds() {
  return (_safeSetting("statusIds", "") || "")
    .split(",").map(s => s.trim()).filter(Boolean);
}

function hasInvisibilityStatus(docOrObj) {
  const ids = getInvisibleIds();
  const actor = docOrObj?.actor ?? (docOrObj?.type === "Actor" ? docOrObj : null);
  if (!actor) return false;

  for (const ef of actor.effects) {
    if (ef.disabled) continue;
    const coreId = ef.getFlag?.("core", "statusId");
    const ceId = ef.flags?.["convenient-effects"]?.id;
    if ((coreId && ids.includes(coreId)) || (ceId && ids.includes(ceId))) return true;
  }
  return false;
}

function canSeeInvisible(token) {
  // Returns role: "gm" if GM, "owner" if owner, "other" otherwise
  if (game.user.isGM) return "gm";
  const doc = token.document;
  if (doc?.testUserPermission?.(game.user, "OWNER")) return "owner";
  if (token.actor?.testUserPermission?.(game.user, "OWNER")) return "owner";
  return "other";
}

function setVisibilityClientSide(token, mode) {
  // mode: "visible" => fully visible; "hidden" => not visible
  try {
    // Some hooks may pass a TokenDocument instead of a Token instance. Only modify client-side visuals
    // when we have a Token (with a PIXI object). Detect presence of the PIXI container.
    const hasPixi = !!token?._object;

    if (mode === "visible") {
      if (hasPixi) token._object.visible = true;
      if (token.nameplate) token.nameplate.visible = true;
      if (token.bars) token.bars.visible = true;
      if (token.effects) token.effects.visible = true;
    } else {
      // hidden
      if (hasPixi) token._object.visible = false;
      if (token.nameplate) token.nameplate.visible = false;
      if (token.bars) token.bars.visible = false;
      if (token.effects) token.effects.visible = false;
    }
  } catch (e) {
    console.warn(`[${MODULE_ID}] setVisibilityClientSide error`, e);
  }
}

function updateOne(tokenObj) {
  const token = tokenObj?.object ?? tokenObj;
  if (!token?.scene?.isView) return;
  const invisible = hasInvisibilityStatus(token);
  const role = canSeeInvisible(token); // "gm" | "owner" | "other"

  if (!invisible) {
    setVisibilityClientSide(token, "visible");
    return;
  }

  // invisible === true
  if (role === "gm" || role === "owner") {
    // GM and owner see token normally
    setVisibilityClientSide(token, "visible");
  } else {
    // others don't see it
    setVisibilityClientSide(token, "hidden");
  }
}

function refreshAllTokens() {
  if (!canvas?.ready) return;
  for (const t of canvas.tokens.placeables) updateOne(t);
}

function resolveFromSpeaker(speaker = {}) {
  if (speaker.scene && speaker.token) {
    const scn = game.scenes.get(speaker.scene);
    const tdoc = scn?.tokens?.get(speaker.token);
    return { token: tdoc ?? null, actor: tdoc?.actor ?? (speaker.actor ? game.actors.get(speaker.actor) : null) };
  }
  return { token: null, actor: speaker.actor ? game.actors.get(speaker.actor) : null };
}

function isSpellCardData(data = {}) {
  const f = data.flags ?? {};
  if (f.dnd5e?.itemData?.type === "spell") return true; // dnd5e v2
  if (f.dnd5e?.item?.type === "spell") return true;     // dnd5e v3/v4
  if (f.pf2e?.item?.type === "spell") return true;      // pf2e
  if (f.pf2e?.context?.type === "spell-cast") return true;
  return false;
}

function isActionMessage(data = {}) {
  // Heuristic to detect an action/attack/item usage chat message across systems.
  const f = data.flags ?? {};
  // Spell cards are actions
  if (isSpellCardData(data)) return true;

  // dnd5e: item usage or attack roll
  if (f.dnd5e) {
    if (f.dnd5e.roll?.type === "attack") return true;
    if (f.dnd5e.itemData || f.dnd5e.item) return true;
  }

  // pf2e: item or context based actions
  if (f.pf2e) {
    if (f.pf2e.item || f.pf2e.context) return true;
  }

  // Generic heuristics: a speaker with a token/actor plus a roll indicates an action
  if ((data.speaker?.token || data.speaker?.actor) && data.roll) return true;

  return false;
}

/* =========================
   HOOKS: token visibility
   ========================= */
Hooks.on("canvasReady", refreshAllTokens);
Hooks.on("sightRefresh", refreshAllTokens);
Hooks.on("updateUser", refreshAllTokens);
Hooks.on("updateToken", (_doc, _chg, _opt, token) => updateOne(token));
Hooks.on("controlToken", token => updateOne(token));
Hooks.on("createActiveEffect", refreshAllTokens);
Hooks.on("updateActiveEffect", refreshAllTokens);
Hooks.on("deleteActiveEffect", refreshAllTokens);
