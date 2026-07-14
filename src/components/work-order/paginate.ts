/**
 * Parallel pagination for the work-order layout.
 *
 * Every page has the same shape: the order summary on top, a PRINTING table,
 * a LETTERSHOP table, then the comments box pinned to the bottom. The two
 * tables are paginated *together* — each page carries the next slice of both —
 * so a reader sees an identical grid on every page, only the data changes.
 *
 * Capacities:
 *  - `both`: rows per table when BOTH tables still have data and share the page.
 *  - `full`: rows for a single table when the other has run out and the
 *    remaining one expands to fill the whole space down to the comments box.
 *
 * When one table's data is exhausted, the still-populated table switches to the
 * `full` capacity and every following page shows only that table.
 */
export type Pane<T> = {
    /** The data rows on this page (may be fewer than `padTo`). */
    rows: T[];
    /** Total rows to draw including blank filler rows, so the grid is full. */
    padTo: number;
};

export type WorkPage<P, L> = {
    printing: Pane<P> | null;
    lettershop: Pane<L> | null;
};

export type Capacities = {
    /** Rows per table when both tables are shown side by side (stacked). */
    both: number;
    /** Rows for a single table expanded to fill the page on its own. */
    full: number;
    /**
     * Rows per table when both share the FIRST page. Optional: the first page
     * can hold fewer rows when something extra (e.g. the DESIGN table) sits
     * above the flowing tables. Defaults to `both`.
     */
    firstBoth?: number;
    /** Rows for a lone table on the FIRST page. Defaults to `full`. */
    firstFull?: number;
};

export function paginateWorkOrder<P, L>(
    printing: P[],
    lettershop: L[],
    { both, full, firstBoth, firstFull }: Capacities,
): WorkPage<P, L>[] {
    const pages: WorkPage<P, L>[] = [];
    let pi = 0;
    let li = 0;

    do {
        // The first page may have reduced capacity when extra content sits
        // above the tables; every following page uses the standard capacities.
        const isFirst = pages.length === 0;
        const curBoth = isFirst ? firstBoth ?? both : both;
        const curFull = isFirst ? firstFull ?? full : full;

        const pRemain = printing.length - pi;
        const lRemain = lettershop.length - li;

        if (pRemain > 0 && lRemain > 0) {
            pages.push({
                printing: { rows: printing.slice(pi, pi + curBoth), padTo: curBoth },
                lettershop: { rows: lettershop.slice(li, li + curBoth), padTo: curBoth },
            });
            pi += curBoth;
            li += curBoth;
        } else if (pRemain > 0) {
            pages.push({
                printing: { rows: printing.slice(pi, pi + curFull), padTo: curFull },
                lettershop: null,
            });
            pi += curFull;
        } else if (lRemain > 0) {
            pages.push({
                printing: null,
                lettershop: { rows: lettershop.slice(li, li + curFull), padTo: curFull },
            });
            li += curFull;
        } else {
            // No data in either table: still render one full, blank grid.
            pages.push({
                printing: { rows: [], padTo: curBoth },
                lettershop: { rows: [], padTo: curBoth },
            });
        }
    } while (pi < printing.length || li < lettershop.length);

    return pages;
}
