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
};

export function paginateWorkOrder<P, L>(
    printing: P[],
    lettershop: L[],
    { both, full }: Capacities,
): WorkPage<P, L>[] {
    const pages: WorkPage<P, L>[] = [];
    let pi = 0;
    let li = 0;

    do {
        const pRemain = printing.length - pi;
        const lRemain = lettershop.length - li;

        if (pRemain > 0 && lRemain > 0) {
            pages.push({
                printing: { rows: printing.slice(pi, pi + both), padTo: both },
                lettershop: { rows: lettershop.slice(li, li + both), padTo: both },
            });
            pi += both;
            li += both;
        } else if (pRemain > 0) {
            pages.push({
                printing: { rows: printing.slice(pi, pi + full), padTo: full },
                lettershop: null,
            });
            pi += full;
        } else if (lRemain > 0) {
            pages.push({
                printing: null,
                lettershop: { rows: lettershop.slice(li, li + full), padTo: full },
            });
            li += full;
        } else {
            // No data in either table: still render one full, blank grid.
            pages.push({
                printing: { rows: [], padTo: both },
                lettershop: { rows: [], padTo: both },
            });
        }
    } while (pi < printing.length || li < lettershop.length);

    return pages;
}
