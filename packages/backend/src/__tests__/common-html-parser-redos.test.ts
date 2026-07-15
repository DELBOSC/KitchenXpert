/**
 * Regression proof: the dep-free HTML parsers bound their regex input (js/polynomial-redos).
 *
 * extractJsonLdProducts / parseSpecTable scan untrusted retailer HTML (arbitrarily large
 * network response) with `<tag[^>]*…>` patterns CodeQL flags as polynomial-backtracking.
 * Measured against V8, these particular regexes are near-linear (the `<tag` literal anchors
 * them), so this is NOT a fix for a reproducible hang — it is defense-in-depth: capHtml()
 * truncates the input to MAX_PARSE_HTML_LEN before any regex runs, so the parse cost has a
 * fixed ceiling that does not depend on the response size an upstream site can dictate.
 *
 * The load-bearing, honest assertions here are: the cap truncates past the bound, content
 * beyond the cap never reaches the parser, and legit pages parse identically (no change).
 */
import {
  capHtml,
  MAX_PARSE_HTML_LEN,
  extractJsonLdProducts,
} from '@kitchenxpert/common';

describe('common HTML parsers — regex input is length-bounded (js/polynomial-redos)', () => {
  it('capHtml truncates only past MAX_PARSE_HTML_LEN', () => {
    const small = 'x'.repeat(1000);
    expect(capHtml(small)).toBe(small); // untouched
    expect(capHtml(small).length).toBe(1000);

    const huge = 'y'.repeat(MAX_PARSE_HTML_LEN + 500);
    expect(capHtml(huge).length).toBe(MAX_PARSE_HTML_LEN); // capped
  });

  it('a legit small page still parses identically (no behaviour change)', () => {
    const html = `<html><head>
      <script type="application/ld+json">
      {"@type":"Product","name":"Meuble METOD","offers":{"price":"34.00","priceCurrency":"EUR"}}
      </script></head><body></body></html>`;
    const nodes = extractJsonLdProducts(html);
    expect(nodes).toHaveLength(1);
    expect(nodes[0]!.name).toBe('Meuble METOD');
  });

  it('content past the cap never reaches the parser (the cap is load-bearing)', () => {
    // A valid JSON-LD Product block placed BEYOND the cap must be invisible to the parser:
    // proves the truncation happens before the regex, not merely alongside it.
    const filler = 'z'.repeat(MAX_PARSE_HTML_LEN);
    const beyond =
      filler +
      '<script type="application/ld+json">{"@type":"Product","name":"PAST_CAP"}</script>';
    const nodes = extractJsonLdProducts(beyond);
    expect(nodes).toEqual([]); // the block after the cap was sliced off, so no node
  });
});
