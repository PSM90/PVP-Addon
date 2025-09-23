# PVP Addon

Modulo per Foundry VTT v13.
- Nasconde client-side i token con status configurato (default `invisible`) a tutti tranne GM e proprietari.
- Rende private le card degli incantesimi in chat verso GM + proprietari, sempre o solo quando il parlante è invisibile.

## Installazione
1. Copia la cartella `pvp-addon` in `Data/modules/` del tuo server Foundry.
2. Abilita il modulo nel mondo.
3. Impostazioni:
   - **Status ID da trattare come invisibile**: es. `invisible` oppure lista separata da virgole.
   - **Limita card incantesimi a GM + proprietari**: on/off.
   - **Quando applicare**: `Sempre` o `Solo se invisibile`.
   - **Includi sempre l'autore**: se on, l’autore del messaggio vede sempre la sua card.

## Note
- Non modifica `document.hidden`. È solo mascheramento client-side.
- Compatibile con Active Effect `core.statusId` e Convenient Effects (`flags["convenient-effects"].id`).
