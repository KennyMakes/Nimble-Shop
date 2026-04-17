# Nimble Shop

A journal-backed storefront module for the **Nimble** system in **Foundry Virtual Tabletop v13**.
<img width="979" height="763" alt="Standard Shop View" src="https://github.com/user-attachments/assets/5adee26d-25a2-4c4f-8260-8ac21594896b" />
Nimble Shop turns a journal entry into a working in-game shop with GM-managed stock, player buying and selling, hidden inventory, custom orders, presets, and optional till-based economy controls.

---

## What it does

Nimble Shop gives GMs a reusable storefront workflow inside Foundry:

- build a shop from a journal entry
- manage visible and hidden inventory
- let players buy items into actor inventory
- let players sell items back to the store
- offer special-order items with pending / fulfilled tracking
- save and reuse shop presets
- close a shop without removing it
- optionally run the shop with till-aware economy rules

---

## Features

- **Journal-backed shop sheet** for Nimble
- **Player buy flow** for visible shop stock
- **Player sell flow** using actor inventory
- **Hidden stock** visible only to approved actors
- **Custom orders** with pending and fulfilled tracking
- **GM editor** for stock, merchant details, permissions, and economy controls
- **Preset library** for reusable shop setups
- **Optional realistic economy** with till-aware sellback and stock behavior
- **Closed shop state** with player storefront lockout
- **GM socket relay** for player transactions when journal writes require GM execution
- **Whispered chat receipts** for transaction records

---

## Requirements

- **Foundry Virtual Tabletop v13**
- **Nimble system 0.7.0 or newer**
- **At least one active GM connected** for player-side transactions

---

## Installation

### Manifest URL
Use this URL in Foundry's **Install Module** dialog:

```text
https://github.com/KennyMakes/nimble-shop/releases/latest/download/module.json
```

### Manual installation
1. Download `nimble-shop.zip` from the latest GitHub release.
2. Extract it into your Foundry `Data/modules/` directory.
3. Enable **Nimble Shop** in your world.

---

## Quick start

1. Create or choose a journal entry that will act as the shop.
2. Change that journal entry to use the **Nimble Shop** sheet.
3. Open the shop as the GM.
4. Click **GM Editor**.
5. Fill in merchant and shop settings.
6. Add stock manually or import items into the shop.
7. Save the shop.
8. Open the same journal entry as a player to use the storefront.

---

## GM setup guide

### 1. Create the shop entry
Create a journal entry that will represent the storefront.

### 2. Assign the shop sheet
Change the journal entry to use the **Nimble Shop** sheet.

### 3. Open the GM editor
Inside the shop page, click **GM Editor**.
<img width="1055" height="879" alt="Shop Editor - Basics" src="https://github.com/user-attachments/assets/b9d9d732-f885-4e22-9870-0bdd653060d5" />
<img width="1053" height="325" alt="Shop Editor - Actor Pricing" src="https://github.com/user-attachments/assets/a4173bfd-58cd-4332-ae59-4d652f9cd325" />

### 4. Configure the shop
Use the editor to set up:
- shop name
- merchant information
- open / closed state
- buy / sell availability
- economy behavior
- stock tables
- hidden stock access
- custom order settings
- Custom actor settings
<img width="1053" height="325" alt="Shop Editor - Actor Pricing" src="https://github.com/user-attachments/assets/47d03ca7-7eae-4bb5-b8e8-9a7aad995092" />

### 5. Add stock
Populate the shop with items and pricing.
<img width="888" height="877" alt="Shop Editor - Stock Table" src="https://github.com/user-attachments/assets/8f669617-22d1-478a-9aa4-ee3064bbe4ca" />


### 6. Test as a player
Open the storefront from a player account and verify:
- visible stock appears
- eligible actors can use hidden stock
- buying works
- selling works
- order placement works if enabled

---

## Storefront workflows

### Standard shop
Players can browse visible inventory and buy items into actor inventory.
<img width="979" height="763" alt="Standard Shop View" src="https://github.com/user-attachments/assets/0e1e9ea7-c5b7-4706-bb8e-5370252117c8" />

### Sell tab
Players can search and filter their actor inventory, then sell eligible items back to the store.
<img width="979" height="761" alt="Standard Shop View - Sell" src="https://github.com/user-attachments/assets/1debc145-e773-48c8-b232-48df2a858f4c" />

### Hidden shop
GMs can define hidden stock and allow only specific actors to view and buy from it.
<img width="985" height="764" alt="Hidden Shop View" src="https://github.com/user-attachments/assets/f9ec188e-e200-4f1f-acc6-ee793b7bf991" />

### Custom orders
Players can place orders for special-order items. GMs can later review, fulfill, and track those orders.
<img width="981" height="761" alt="Custom Orders View" src="https://github.com/user-attachments/assets/ee15d542-6fb5-4517-89f4-8483474efd50" />

### Closed shop
When a shop is closed:
- the storefront appears inactive to players
- interaction is blocked
- a closed message is shown
- GMs can still access the editor and reopen the shop
<img width="985" height="762" alt="Closed Shop View" src="https://github.com/user-attachments/assets/ea5231a8-a60f-446f-9530-80036058e902" />

---

## Realistic economy mode

When enabled, the shop can use till-aware economy rules for things like:
- whether the store can afford player sellbacks
- how stock reset or restocking interacts with available funds

This is optional and can be left off for a simpler storefront experience.

---

## Notes

- Shop data is stored on the journal entry.
- Player transactions may be routed through a GM relay when direct writes are not available to the player.
- This release is focused on Nimble storefront workflows inside Foundry v13.

---

## Known limitations

- An active GM is recommended for live player transactions.
- This module is designed specifically for **Nimble** and is not system-agnostic.
- This first public release focuses on core shop workflows rather than broader economy automation outside the storefront.
---

## Development workflow

The repository now keeps source code and release output as separate layers:

- `src/` contains the editable source fragments, grouped by shop feature area.
- `scripts/init.js` is the generated distributable loaded by Foundry.

### Build

```bash
npm run build
```

This command rebuilds `scripts/init.js` from `build-manifest.json` and the files in `src/`.

### Validate generated output

```bash
npm run build:check
```

This rebuilds and fails if `scripts/init.js` is out of date.

