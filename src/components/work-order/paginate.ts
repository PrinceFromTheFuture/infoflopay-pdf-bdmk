/**
 * Splits a list of rows across pages.
 *
 * The first page usually holds fewer rows because it shares space with the
 * other sections (e.g. the PRINTING table), while every following page only
 * carries the overflowing table and therefore fits more rows.
 *
 * Returns an array with one entry per page. There is always at least one page
 * (possibly empty) so the first page of the document always renders.
 */
export function paginateRows<T>(rows: T[], firstPage: number, perPage: number): T[][] {
    if (rows.length <= firstPage) {
        return [rows];
    }

    const pages: T[][] = [rows.slice(0, firstPage)];
    for (let i = firstPage; i < rows.length; i += perPage) {
        pages.push(rows.slice(i, i + perPage));
    }
    return pages;
}
