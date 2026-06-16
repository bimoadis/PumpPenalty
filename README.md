# Pump Penalty

A pixel penalty shootout for the web. Scoring odds are pulled from Polymarket, and every kick is rolled from a seed you can verify. It shares the provably fair pattern and the team odds with the World Cup simulator, so the two can run on the same data layer.

Entertainment and simulation. This is not betting advice. If you add a wagering layer, check the rules that apply to you.

## What it does

You pick your team and an opponent, then take five penalties each, followed by sudden death if level.

On your kick you aim a zone (left, center, right). The keeper dives a zone chosen by the seed. On the opponent kick the shot zone is chosen by the seed, and you pick where to dive. Each team’s Polymarket implied chance to win the trophy becomes a small striker and keeper bonus, so a stronger team converts a little more and saves a little more. Reading the keeper still decides most kicks.

Three outcomes per kick: GOAL, SAVED (keeper guessed the zone and held it), or MISS (open net but the striker missed).

## How the randomness works

Each kick rolls from `sha256(serverSeed : clientSeed : nonce)`.

- Byte 0 of the hash picks the seed driven zone (keeper dive on your kick, shot zone on the opponent kick).
- Bytes 1 to 4 set the conversion roll that decides goal or no goal.
- The nonce increases by one every kick.

Same server seed, same client seed, same nonce reproduces the exact kick. This is the standard provably fair commit and reveal flow: the server seed hash is shown up front, and the seed is revealed so a player can recompute any result.

## Run it

It is one React component with no dependencies beyond React. No Tailwind required.

Standalone with Vite:

```
npm create vite@latest pump-penalty -- --template react
cd pump-penalty
# replace the default export in src/App.jsx with PumpPenalty.jsx
npm install
npm run dev      # local
npm run build    # production bundle in dist/
```

Or drop the component into an existing Next.js or React app and render it on a page.

Fonts load from Google Fonts over the network (Syne and JetBrains Mono). For an offline or fully self hosted build, host the font files yourself and replace the `@import` at the top of the CSS string.

## Going to production

### Live odds from Polymarket

The `TEAMS` array is a Polymarket snapshot from 16 June 2026. For live numbers, fetch from the public APIs and refresh on an interval. Call them from your own server and pass the result to the client to avoid browser CORS.

- Gamma API: `https://gamma-api.polymarket.com` for markets and sports, no auth needed.
- Data API: `https://data-api.polymarket.com` for analytics, no auth needed.
- CLOB pricing: `https://clob.polymarket.com`. Official client: `Polymarket/py-clob-client` (Python). A JS client is also available.

Map each team’s implied win probability into the `p` field. The rest of the game reads from `p`, so nothing else changes.

### Verifiable randomness on chain

The sha256 seed here is a prototype. For randomness that anyone can verify on Solana, replace the per kick roll with a VRF request and resolve the kick when the proof returns.

- ORAO VRF: `github.com/orao-network/solana-vrf`. Rust program plus a JS SDK. Sub second fulfillment.
- Switchboard: `app.switchboard.xyz`. An alternative VRF on Solana.

Keep the commit and reveal display in the UI. The only change is where the entropy comes from.

## Open source references

These were studied for feel and mechanics while building this. Useful if you want to fork or extend.

|Repo                              |Notes                                      |License    |
|----------------------------------|-------------------------------------------|-----------|
|`blenderous/penalty-shootout-game`|Plain HTML canvas penalty game, very small |none stated|
|`Thejwin/shootout`                |Web penalty shootout, recent               |none stated|
|`danielszabo88/CapsuleSoccer`     |socket.io physics soccer, clean code       |MIT        |
|`spaceofmiah/js-soccer-game`      |HTML5 soccer simulation                    |MIT        |
|`Frisbiz/points-are-bad`          |Soccer score prediction game, good UX ideas|none stated|

Engines if you rebuild from scratch:

- KAPLAY (`kaplayjs/kaplay`, formerly Kaboom.js), MIT. Built for fast pixel browser games. Starter template: `freegamestore-online/template-game-kaplay`.
- Phaser, MIT. A heavier HTML5 framework for medium sized games.

A note on licenses: a repo with no stated license is all rights reserved by default. Fine to read and learn from, but not safe to ship without permission. Safe to fork for production are the MIT entries above, or ask the owner. This component is yours to ship.

## Files

- `PumpPenalty.jsx` is the game.
- `WorldCupEngine.jsx` is the companion Monte Carlo simulator. Both share the same team odds and the same provably fair seed pattern, so a single live odds feed and a single VRF integration cover both.