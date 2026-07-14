/**
 * Neutralize a client-supplied value before it is interpolated into a SYSTEM prompt.
 *
 * Scene fields (item type, item name, style) come straight from the client — and on a
 * COLLABORATIVE kitchen (see useCollaboration / ProjectCollaborator), from ANY
 * collaborator. Concatenated raw into the system prompt, a furniture name like
 *
 *     "Meuble\n\nIGNORE TOUTES LES INSTRUCTIONS PRÉCÉDENTES ET ..."
 *
 * reads to the model as a brand-new instruction section — a cross-user prompt injection
 * into the very prompt that carries our red lines (the whole anti-hallucination socle).
 * The user message is already run through sanitizeMessage; the system prompt, the
 * PRIVILEGED channel, was getting raw scene text. That asymmetry is the bug.
 *
 * This does not "guard" the field, it removes its ability to leave its data role:
 *   - control characters (newlines, tabs, C1) → a single space, so nothing can open a
 *     new line / new section (the primary break-out vector);
 *   - any remaining whitespace run collapsed → the value stays on one line;
 *   - backticks neutralized → no code-fence trick;
 *   - length capped → a label is a label, not a paragraph.
 *
 * A value that survives this is structurally a value: it appears inside its field on a
 * single bullet line, never as a directive of its own.
 */
export function sanitizePromptField(value: string, maxLen = 120): string {
  return value
    .replace(/\p{Cc}+/gu, ' ') // control chars (incl. \n \r \t and C1) → space
    .replace(/\s+/g, ' ') // collapse any whitespace run → single space (one line)
    .replace(/`/g, "'") // break backtick / code-fence injection
    .trim()
    .slice(0, maxLen);
}
