# Aqrobat workspace

This repository is the independent Aqrobat project. Read `docs/PROJECT-HANDOFF.md`
for the current review state, then verify cwd, remote, branch, and dirty state.
Do not inherit instructions from Splashery or the PDF archive.

- Continue `codex/aqrobat-foundation` and existing draft PR #1 until Ryan selects
  a different branch or phase. Keep the PR a draft; never merge automatically.
- Keep npm `private: true` and unpublished. No Chrome Web Store submission.
- Preserve image rendering, original prototypes, owner test files, other
  repositories, browser profiles, chats, and running jobs. Use fresh test-owned
  profiles; close only processes and documents this task created.
- Do not start other chats or agents, or message anyone, without Ryan's request.
- Copyable text is a primary acceptance requirement. Keep plain-text, styled-text,
  image, matrix-decoder, native-app, phone, and physical-print evidence separate.
  Passing tests does not establish portable paste fidelity or scanning acceptance.
- No hidden solid QR modules behind glyph artwork. No AI or server required for
  generation. Preserve payloads exactly; reject overflow instead of shortening.
- Keep the pinned encoder and its license intact. Run `npm test`,
  `npm run build`, `npm run test:browser`, `npm run test:text-browser`, and
  `npm run format:check` for relevant changes. Installed-extension and native
  text tests are optional platform checks; report unavailable checks explicitly.
- Emoji atlas remains a proposal, pending owner selection after text review.
