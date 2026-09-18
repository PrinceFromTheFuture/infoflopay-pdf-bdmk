import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import { theme } from '../../lib/pdfx-theme';
import { countWrappedLines } from './text-metrics';
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableCell,
} from '../pdfx/table/pdfx-table';

// ─── Single border used everywhere ────────────────────────────
const B = '0.8 solid #cccccc';

// Height of a single-line data row, and the minimum height of every row. Blank
// filler rows use it too so the ruled grid stays even.
export const ROW_H = 14;

/**
 * Declarative description of a single table column.
 * `render` maps a data row to the cell's text content.
 */
export type Column<T> = {
    key: string;
    header: string;
    /** Fixed column width in pt. Omit for a flexible (flex:1) column. */
    width?: number;
    align?: 'left' | 'center';
    /**
     * Let long content wrap onto extra lines and grow the row's height. Columns
     * without it are clipped to a single line with an ellipsis, so only the
     * columns that opt in can make a row taller.
     */
    wrap?: boolean;
    render: (row: T) => string | number;
};

// ─── Cell geometry ─────────────────────────────────────────────
// Row heights must be known before render so pagination can decide how many
// rows fit on a page. These restate what createTableStyles() applies to each
// cell — the work order renders without a <PdfxThemeProvider>, so the default
// theme below is what the cells actually get.
const FONT_SIZE = theme.typography.body.fontSize;
const LINE_H = FONT_SIZE * theme.typography.body.lineHeight;
const CELL_PAD_V = theme.primitives.spacing[2]! - 2;
const CELL_PAD_H = 2; // TableCell applies this last, overriding the theme's
const COL_RULE = 0.8; // vertical divider between cells
const ROW_RULE = 1; // horizontal divider under each body row

const styles = {
    title: { paddingVertical: 3, paddingTop: 5 } as Style,
    titleTxt: { fontFamily: 'Helvetica-Bold', fontSize: 12 } as Style,
    // The box draws the full rectangle (including the bottom edge) since blank
    // filler rows no longer carry their own divider to close it off.
    box: { border: B, marginBottom: 3 } as Style,
    thTxt: { fontFamily: 'Helvetica', fontSize: 6, textAlign: 'center' } as Style,
    cellTxt: {
        fontFamily: theme.typography.body.fontFamily,
        fontSize: FONT_SIZE,
        lineHeight: theme.typography.body.lineHeight,
        color: theme.colors.foreground,
    } as Style,
    // `maxLines`/`textOverflow` are honoured by the layout engine but missing
    // from its published Style type.
    clamp: { maxLines: 1, textOverflow: 'ellipsis' } as unknown as Style,
};

/**
 * Text width available inside each column, mirroring how the row's flexbox
 * splits `tableWidth`: fixed columns take their declared width and the flexible
 * ones share what's left equally, each minus its padding and dividing rule.
 */
function columnTextWidths<T>(columns: Column<T>[], tableWidth: number): number[] {
    const fixed = columns.reduce((sum, c) => sum + (c.width ?? 0), 0);
    const flexCount = columns.filter((c) => c.width === undefined).length;
    const flexWidth = flexCount > 0 ? Math.max(tableWidth - fixed, 0) / flexCount : 0;
    const lastCol = columns.length - 1;

    return columns.map((c, i) => {
        const outer = c.width ?? flexWidth;
        return outer - CELL_PAD_H * 2 - (i === lastCol ? 0 : COL_RULE);
    });
}

/**
 * Height the row will occupy once rendered into a table `tableWidth` points
 * wide — ROW_H unless a wrapping column spills onto extra lines. Pagination
 * uses this to fill each page by height instead of by row count.
 */
export function measureRowHeight<T>(columns: Column<T>[], row: T, tableWidth: number): number {
    const widths = columnTextWidths(columns, tableWidth);

    const lines = columns.reduce((max, c, i) => {
        if (!c.wrap) return max;
        const text = String(c.render(row));
        return Math.max(max, countWrappedLines(text, widths[i]!, FONT_SIZE));
    }, 1);

    return Math.max(ROW_H, lines * LINE_H + CELL_PAD_V * 2 + ROW_RULE);
}

type SectionTableProps<T> = {
    title: string;
    columns: Column<T>[];
    rows: T[];
    /**
     * Blank, unruled rows drawn after the data. Lets a sparsely-populated table
     * still reach a minimum height instead of collapsing to the height of its
     * data; the caller decides how many are needed to fill the page.
     */
    fillers?: number;
};

/**
 * A self-contained titled table section.
 *
 * Renders a section heading followed by a bordered table built from a
 * declarative `columns` config. Data rows are followed by `fillers` blank rows,
 * padding the table out to a consistent height. Filler rows are left unruled
 * (no column or row dividers) so only actual data rows carry the grid.
 *
 * Rows are at least ROW_H tall and grow taller when a column marked `wrap`
 * needs more than one line. The table flows in normal document order and wraps
 * naturally across pages: when the rows don't fit on the current page react-pdf
 * continues them on the next one. Rows never split mid-row (each <TableRow>
 * sets `wrap={false}`), so a row is always drawn whole on a single page.
 */
export function SectionTable<T>({ title, columns, rows, fillers = 0 }: SectionTableProps<T>) {
    const lastCol = columns.length - 1;

    // Blank filler rows render with no column or row dividers at all, so an
    // under-filled table trails off into empty space instead of a ruled grid.
    const renderCells = (row: T | null) =>
        columns.map((c, i) => (
            <TableCell
                key={c.key}
                width={c.width}
                style={row && i !== lastCol ? { borderRight: B } : {}}
            >
                <Text
                    style={[
                        styles.cellTxt,
                        { textAlign: row ? c.align ?? 'center' : 'center' },
                        c.wrap ? {} : styles.clamp,
                    ]}
                >
                    {row ? String(c.render(row)) : ' '}
                </Text>
            </TableCell>
        ));

    return (
        <>
            {/* Keep the heading from being orphaned at the very bottom of a page:
                if there isn't room for the header + a couple of rows below it,
                react-pdf pushes the whole section to the next page. */}
            <View style={styles.title} minPresenceAhead={ROW_H * 3}>
                <Text style={styles.titleTxt}>{title}</Text>
            </View>

            <View style={styles.box}>
                <Table variant="line" style={{ marginBottom: 0, borderBottomWidth: 0 }}>
                    <TableHeader>
                        <TableRow header style={{ borderBottom: B }}>
                            {columns.map((c, i) => (
                                <TableCell
                                    key={c.key}
                                    width={c.width}
                                    align="center"
                                    style={i === lastCol ? {} : { borderRight: B }}
                                >
                                    <Text style={styles.thTxt}>{c.header}</Text>
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {rows.map((row, r) => (
                            <TableRow key={`d${r}`} style={{ minHeight: ROW_H }}>
                                {renderCells(row)}
                            </TableRow>
                        ))}

                        {Array.from({ length: fillers }).map((_, f) => (
                            <TableRow key={`f${f}`} style={{ height: ROW_H, borderBottomWidth: 0 }}>
                                {renderCells(null)}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </View>
        </>
    );
}
