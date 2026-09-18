/**
 * Ahead-of-render text measurement for Helvetica.
 *
 * The work order paginates itself: it decides how many rows go on each page
 * before handing anything to react-pdf. Once a cell is allowed to wrap, that
 * decision depends on how many lines the cell's text will occupy, which is only
 * known after layout — so we reproduce the measurement here instead.
 *
 * Widths are the advance widths from Helvetica's AFM metrics (the same ones
 * react-pdf resolves for the built-in font), expressed in 1/1000 em.
 */

const FIRST_CHAR = 32; // space
const LAST_CHAR = 126; // tilde

// prettier-ignore
const HELVETICA_WIDTHS = [
    278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
    556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
    1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
    667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
    333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
    556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

// Width used for anything outside printable ASCII. 556 is the advance of most
// lowercase letters, so an accented or non-Latin character lands close enough.
const FALLBACK_WIDTH = 556;

const charWidth = (code: number) =>
    code >= FIRST_CHAR && code <= LAST_CHAR ? HELVETICA_WIDTHS[code - FIRST_CHAR]! : FALLBACK_WIDTH;

/** Rendered width of `text` in points at the given font size. */
export function measureText(text: string, fontSize: number): number {
    let width = 0;
    for (let i = 0; i < text.length; i++) width += charWidth(text.charCodeAt(i));
    return (width * fontSize) / 1000;
}

/**
 * How many lines `text` takes up when wrapped inside `width` points.
 *
 * Greedy word wrapping on whitespace, which is what react-pdf's line breaker
 * settles on for ordinary text. Without a hyphenation callback registered,
 * react-pdf never splits a word: one that's wider than the column is left to
 * run past the cell's edge on a single line, so it's counted as one line here
 * too and the estimate stays in step with what actually gets drawn.
 */
export function countWrappedLines(text: string, width: number, fontSize: number): number {
    if (width <= 0) return 1;

    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return 1;

    const spaceWidth = measureText(' ', fontSize);
    let lines = 1;
    let used = 0;

    for (const word of words) {
        const wordWidth = measureText(word, fontSize);
        const extended = used === 0 ? wordWidth : used + spaceWidth + wordWidth;

        if (extended <= width || used === 0) {
            used = extended;
            continue;
        }

        lines++;
        used = wordWidth;
    }

    return lines;
}
