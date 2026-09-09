/**
 * HTML Content Extraction & Cleaning Utility for Development Crawler
 * 
 * Extracts clean, readable text from raw HTML by removing scripts, styles,
 * navigation, headers, footers, ads, and markup noise.
 */

export interface ExtractedPageContent {
  title: string;
  headings: string[];
  paragraphs: string[];
  cleanText: string;
}

/**
 * Strips HTML tags, styles, scripts, and non-article elements from HTML string.
 */
export function extractCleanContent(rawHtml: string): ExtractedPageContent {
  if (!rawHtml || typeof rawHtml !== 'string') {
    return { title: '', headings: [], paragraphs: [], cleanText: '' };
  }

  // 1. Extract title if present
  const titleMatch = rawHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // 2. Remove script and style tags completely
  let cleaned = rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ');

  // 3. Remove header, nav, footer, and sidebar elements
  cleaned = cleaned
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, ' ');

  // 4. Extract headings (h1, h2, h3)
  const headings: string[] = [];
  const headingRegex = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  let hMatch: RegExpExecArray | null;
  while ((hMatch = headingRegex.exec(cleaned)) !== null) {
    const text = stripTags(hMatch[1]).trim();
    if (text && text.length > 2 && !headings.includes(text)) {
      headings.push(text);
    }
  }

  // 5. Extract paragraphs and list items
  const paragraphs: string[] = [];
  const blockRegex = /<(?:p|li|blockquote)[^>]*>([\s\S]*?)<\/(?:p|li|blockquote)>/gi;
  let bMatch: RegExpExecArray | null;
  while ((bMatch = blockRegex.exec(cleaned)) !== null) {
    const text = stripTags(bMatch[1]).trim();
    if (text && text.length > 15 && !paragraphs.includes(text)) {
      paragraphs.push(text);
    }
  }

  // 6. Produce full clean text
  const cleanText = stripTags(cleaned)
    .replace(/\s+/g, ' ')
    .trim();

  return {
    title,
    headings,
    paragraphs,
    cleanText,
  };
}

/**
 * Helper to strip remaining HTML tags and decode basic entities.
 */
function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
