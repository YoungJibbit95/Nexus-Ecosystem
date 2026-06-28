import { useMemo } from "react";
import {
  EMOJI_ALIAS_TEXT,
  NOTES_EMOJI_GROUPS,
  normalizeEmojiQueryText,
  type NotesEmojiGroup,
} from "./notesEmojiData";

export type NotesEmojiCategoryId = NotesEmojiGroup["id"];

export function useNotesEmojiPicker(
  emojiCategory: NotesEmojiCategoryId,
  emojiQuery: string,
) {
  const activeEmojiGroup = useMemo(
    () =>
      NOTES_EMOJI_GROUPS.find((group) => group.id === emojiCategory) ??
      NOTES_EMOJI_GROUPS[0],
    [emojiCategory],
  );

  const emojiResults = useMemo(() => {
    const queryTokens = normalizeEmojiQueryText(emojiQuery)
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);

    if (queryTokens.length === 0) {
      return Array.from(new Set(activeEmojiGroup.emojis)).slice(0, 240);
    }

    const scored = NOTES_EMOJI_GROUPS.flatMap((group) =>
      group.emojis.map((emoji) => {
        const searchable = normalizeEmojiQueryText(
          `${emoji} ${group.label} ${group.keywords} ${EMOJI_ALIAS_TEXT.get(emoji) || ""}`,
        );
        const score = queryTokens.reduce((sum, token) => {
          if (emoji === token) return sum + 12;
          if (searchable.includes(token)) {
            return sum + (group.id === emojiCategory ? 3 : 2);
          }
          return sum;
        }, 0);
        return { emoji, score };
      }),
    )
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.emoji);

    return Array.from(new Set(scored)).slice(0, 360);
  }, [activeEmojiGroup, emojiCategory, emojiQuery]);

  return {
    activeEmojiGroup,
    emojiGroups: NOTES_EMOJI_GROUPS,
    emojiResults,
  };
}
