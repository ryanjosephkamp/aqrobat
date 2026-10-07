> **Current review:** Aqrobat 0.4.0 adds saved-recipe browser insertion.
> Ryan has explicitly deferred moving to a new Codex project. Continue in this
> chat/repository; refresh the full handoff only when he requests the move.
> Read [browser insertion](browser-insertion.md) before the older review prompt below.

# Continue Aqrobat in its own Codex project

Add the existing folder **`/Users/noir/Documents/aqrobat`** as a Codex project,
then open a new chat there if desired. This is already an independent Git
repository; nothing needs to be moved out of Splashery. No new chat has been
created by this handoff.

- Remote: <https://github.com/ryanjosephkamp/aqrobat>
- Branch: `codex/aqrobat-foundation`
- Existing PR: <https://github.com/ryanjosephkamp/aqrobat/pull/1> — keep draft
- Preview: <https://ryanjosephkamp.github.io/aqrobat/>
- Package/build: 0.4.0, npm `private: true`, unpublished
- Pages currently follows the draft branch. A push there updates the preview.
- Read `AGENTS.md`, `docs/text-portability.md`, `docs/validation.md`, and
  `docs/distribution.md` before changing anything.

## Next chat prompt

> Work only in /Users/noir/Documents/aqrobat. Read AGENTS.md and
> docs/PROJECT-HANDOFF.md, verify the current branch, remote, HEAD, and dirty
> state, then review Aqrobat 0.3.0 with my pasted-text, TextEdit, website/blog,
> email, and extension results. Continue existing draft PR #1 on
> codex/aqrobat-foundation. Keep it a draft and npm unpublished/private:true.
> Copyable text is the primary acceptance gate; do not mark it complete until
> I accept its destination formatting. Preserve image exports, both comparison
> grids, original prototypes, Splashery, the private PDF archive, browser
> profiles, and other sessions. Distinguish matrix decoding, raw text/image
> decoding, native formatting, phone scans, and physical print. Resolve concrete
> Aqrobat defects. Do not merge, create another PR, publish npm, submit to the
> Chrome Web Store, message anyone, or launch other chats/agents. Emoji atlas
> remains deferred until we choose it explicitly.

## Work that remains

1. Owner review of plain TXT and styled text pasted into actual destination
   editors and the saved/sent result. Check the exact decoded payload, not just
   whether a scanner recognizes a code.
2. Update/reload the existing unpacked extension folder to 0.3.0 and confirm
   toolbar color and appearance persistence on Ryan's installed ID.
3. Physical-print observations when printer access is available.
4. Then select the next phase: targeted text compatibility or the bounded
   pinned-Unicode emoji atlas proposal in `docs/emoji-atlas-plan.md`.
5. Merge/Pages main selection and any npm release remain owner decisions after
   acceptance. Name lookup alone does not reserve an npm package.

## Reproduce checks

```sh
npm ci --ignore-scripts
npm test
npm run build
npm run test:browser
npm run test:text-browser
npm run format:check
```

Set `CHROME_PATH` to an installed compatible browser if needed. For an actual
unpacked MV3 test, use Chrome for Testing with
`EXTENSION_CHROME_PATH=/path/to/chrome npm run test:extension`. It creates and
removes only its own temporary profile. On macOS with Swift/AppKit installed,
`npm run test:native-text` checks the RTF fixtures created by the text-browser
suite. These platform checks are not device/print acceptance.

Original owner bug-example folders under Downloads were inspected read-only.
New review files are in `/Users/noir/Documents/aqrobat-text-layout-2026-10-07/`.
Private PDF experiments stay in `/Users/noir/Documents/pdf-motion`; no PDF motion
work belongs in this repository.
