# Preserved renderer/preflight failure

The browser ignored -webkit-text-stroke on ::first-letter: computed stroke was0, while the requested white fill remained. The three O initials are invisible in the saved native PNG. This source is rejected under the explicit visible-letter rule and must never count as a native prose or finder pass.

The harness logged stroke0 but failed to assert it. The three ordinary reader slots ran before local visual review discovered the missing initials; they remain completed negative observations, not unattempted slots. This is a preflight omission, not evidence that invisible text is acceptable. Original source, plan, capture, exact repeat receipt, reader results and screenshot remain unchanged. No payload was present.

A fresh context04 source uses an ordinary inline span within each paragraph, preserving complete text selection, and asserts actual4px stroke before reader eligibility. It is a new counted proposal, not a replacement or rerun in this directory.
