/**
 * Parses content that might be in JSON format (array of objects with text field)
 * and returns a plain text preview.
 */
export const getPreviewFromContent = (content: string, maxLength: number = 50): string => {
  if (!content) return '';

  let plainText = content;

  // Check if content looks like a JSON array
  if (content.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        // Assume structure { text: string, ... } and join them
        // This handles cases where reading/listening text is split into chunks
        plainText = parsed
          .map((item: any) => item.text || '')
          .filter(Boolean)
          .join(' ');
      }
    } catch (e) {
      // Failed to parse, treat as raw text (no-op)
    }
  }

  // Sanitize formatting chars if needed, though usually simple slice is enough for preview
  if (plainText.length <= maxLength) return plainText;
  return plainText.substring(0, maxLength) + '...';
};
