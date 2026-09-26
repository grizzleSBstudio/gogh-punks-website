# Mobile sequential activation review — 2026-09-26

This patch targets the report that activating another Punk on mobile required a hard refresh or clearing browser data after PR #84. The exact stage of the holder's reported stall has not been confirmed. Three reproducible frontend races were found on production baseline `72a331ec2998f6c76450802e80438dccd0da57d9`; the fixes cover creation, funding and mission status without changing transaction authority.

## Changes

1. A temporary missing account or chain clears verified Agent status while retaining the known owner's Punk roster. Returning to the same owner previously exited without restoring the selected Punk's status. The return now starts a passive, fresh read for that Punk. It does not repeat the ownership scan, sign in, or open a wallet prompt.
2. Creation, gas funding and mission confirmation previously could await a status read started before the transaction confirmed. A late response could therefore restore “not created,” zero gas, or inactive mission state. Confirmation callbacks now supersede that older read. Responses keep their owner, chain, token and request identity checks. An already requested sign-in is awaited without requesting another signature.
3. If a mobile provider changes while creation approval is pending, the late submitted hash is saved by the transaction client but was not always reloaded into the panel. The panel now rereads the same owner's durable journal when the old UI context finishes. It exposes recovery without publishing the old Punk's account snapshot into the new selection. A currently inspected replacement hash remains intact.

Pending and unknown attempts continue to block another creation request until reconciled. Selecting another Punk does not clear a terminal record; the existing rules for replacing that record with a separately confirmed new request remain unchanged. Each next Punk requires its own check, review, consent and wallet confirmation. There is no storage reset or automatic resend.

## Holder flow

1. Select the first Punk and open **Fund**. Use **Check Agent Wallet**, then **Review Wallet Creation** if it does not exist. Verify the Punk number, Agent address and maximum network fee. Select the confirmation checkbox and confirm creation in the wallet.
2. Return to the site. If creation is pending, choose **Check Saved Transaction**. If the wallet result has no hash, paste the original transaction hash from wallet activity. Keep this pending record until its outcome is checked; do not send another copy.
3. Once creation is confirmed, review the funding source and amount. Funding requires its own review and wallet confirmation. A submitted transfer can be checked using **Recheck Funding**; an unknown result can be recovered with its original transaction hash.
4. After gas funding is verified, review the mission rules and choose **Start mission**. This is a separate permission from creating or funding the wallet. Check Activity for the mission and worker's actual status.
5. Select the next Punk and repeat. The page should replace selection-specific information and require fresh consent while preserving the prior transaction journals. Do not clear browser data to move to the next Punk: clearing storage can erase recovery records for requests whose outcomes are still unknown.

## Validation

- Focused regression set: 71 passed, covering readiness selection, creation panel, sign-in and Reown restoration.
- Deployment validation: typecheck, wallet build, static site checks, syntax checks for 987 modules, and broker checks passed. The initial deploy run passed 790/791 tests; its one failure was an existing source assertion expecting the former combined ownership guard. That assertion now requires the fresh-read branch to return before ownership scanning. The complete deployment test selection then passed 791/791. Logs: `/private/tmp/gogh-production-mobile-activation-deploy-check-20260926.log` and `/private/tmp/gogh-production-mobile-activation-deploy-tests-rerun-20260926.log`. `git diff --check` is clean.
- `node scripts/test-mobile-activation-browser.mjs`: passed at 375 × 812 and 320 × 740. Each viewport creates, funds and authorizes a mission for Punk #93 followed by #94 in one page without reloads between Punks. It also exercises the real wallet visibility resume handler with a temporary missing chain and replaced provider, late creation hashes, stale reads after each confirmed step, explicit consent and preservation of an unrelated unknown funding record.
- The same browser harness run against an archived production baseline failed immediately after wallet return: selected Punk readiness remained missing. Baseline failure evidence: `/private/tmp/gogh-mobile-activation-browser-WkkRqx/result.json`.
- Passing browser evidence and screenshots: `/private/tmp/gogh-mobile-activation-browser-SQsBgN/`.
- The browser test uses real frontend modules and handlers with isolated wallet, chain, gas-journal and API responses. Its receipt and mission results are fixtures. It does not prove real mobile wallet signing, broadcast transactions, production worker readiness or production API behavior. External browser requests are blocked.

## Boundaries

A provider replacement that keeps the same account and chain does not by itself discard valid cached readiness or trigger an extra broker API read. The creation panel invalidates its unsigned review/snapshot because its provider identity changed. Fresh confirmed-action callbacks, the existing 30-second status poll, or an explicit recheck update readiness. The cache's existing 90-second validation limit remains unchanged. No separate provider-only readiness failure was reproduced, so that behavior is unchanged.

No wallet settings, on-chain contracts, signing methods, transaction values, fees, nonce rules, release flags, production APIs or deployments are changed. This worktree is isolated from the unfinished burn/Forge/Swarm release. Root owns the final commit, PR and production delivery.
