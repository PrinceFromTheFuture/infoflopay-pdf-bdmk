/**
 * Parallel pagination for the work-order layout.
 *
 * Every page has the same shape: the order summary on top, a PRINTING table,
 * a LETTERSHOP table, then the comments box pinned to the bottom. The two
 * tables are paginated *together* — each page carries the next slice of both —
 * so a reader sees an identical grid on every page, only the data changes.
 *
 * Capacities are expressed in standard row heights, which is what they'd be if
 * every row were a single line. Rows are actually measured, though, so a row
 * whose description wraps onto a second line eats two rows' worth of the page's
 * budget and one fewer row makes the cut. Whatever budget is left over is
 * returned as blank filler rows, keeping each table the same overall height so
 * the section below it always starts at the same place.
 *
 * When one table's data is exhausted, the still-populated table switches to the
 * `full` capacity and every following page shows only that table.
 */
export type Pane<T> = {
    /** The data rows on this page. */
    rows: T[];
    /** Blank rows to draw underneath them so the table fills its budget. */
    fillers: number;
};

export type WorkPage<P, L> = {
    printing: Pane<P> | null;
    lettershop: Pane<L> | null;
};

export type Capacities = {
    /** Row heights per table when both tables are shown side by side (stacked). */
    both: number;
    /** Row heights for a single table expanded to fill the page on its own. */
    full: number;
    /**
     * Row heights per table when both share the FIRST page. Optional: the first
     * page can hold fewer rows when something extra (e.g. the DESIGN table) sits
     * above the flowing tables. Defaults to `both`.
     */
    firstBoth?: number;
    /** Row heights for a lone table on the FIRST page. Defaults to `full`. */
    firstFull?: number;
};

export type Measure<P, L> = {
    /** Height of one standard, single-line row; the unit the capacities count. */
    rowHeight: number;
    /** Rendered height of a printing row, which may exceed `rowHeight`. */
    printing: (row: P) => number;
    /** Rendered height of a lettershop row, which may exceed `rowHeight`. */
    lettershop: (row: L) => number;
};

/**
 * Take as many rows from `start` as fit in `capacity` standard row heights, and
 * report how many blank rows are needed to use up the rest of that budget.
 *
 * A row taller than the whole budget is still placed (on a page of its own)
 * rather than stalling pagination forever.
 */
function fillPane<T>(
    rows: T[],
    start: number,
    capacity: number,
    rowHeight: number,
    heightOf: (row: T) => number,
): Pane<T> {
    const budget = capacity * rowHeight;
    let used = 0;
    let end = start;

    while (end < rows.length) {
        const h = heightOf(rows[end]!);
        if (used + h > budget && end > start) break;
        used += h;
        end++;
    }

    return {
        rows: rows.slice(start, end),
        fillers: Math.max(Math.floor((budget - used) / rowHeight), 0),
    };
}

export function paginateWorkOrder<P, L>(
    printing: P[],
    lettershop: L[],
    { both, full, firstBoth, firstFull }: Capacities,
    measure: Measure<P, L>,
): WorkPage<P, L>[] {
    const pages: WorkPage<P, L>[] = [];
    const { rowHeight } = measure;
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
            const pPane = fillPane(printing, pi, curBoth, rowHeight, measure.printing);
            const lPane = fillPane(lettershop, li, curBoth, rowHeight, measure.lettershop);
            pages.push({ printing: pPane, lettershop: lPane });
            pi += pPane.rows.length;
            li += lPane.rows.length;
        } else if (pRemain > 0) {
            const pPane = fillPane(printing, pi, curFull, rowHeight, measure.printing);
            pages.push({ printing: pPane, lettershop: null });
            pi += pPane.rows.length;
        } else if (lRemain > 0) {
            const lPane = fillPane(lettershop, li, curFull, rowHeight, measure.lettershop);
            pages.push({ printing: null, lettershop: lPane });
            li += lPane.rows.length;
        } else {
            // No data in either table: still render one full, blank grid.
            pages.push({
                printing: { rows: [], fillers: curBoth },
                lettershop: { rows: [], fillers: curBoth },
            });
        }
    } while (pi < printing.length || li < lettershop.length);

    return pages;
}
