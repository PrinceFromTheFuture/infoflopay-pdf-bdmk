import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableCell,
} from '../pdfx/table/pdfx-table';

// ─── Single border used everywhere ────────────────────────────
const B = '0.8 solid #000000';

// Fixed height of a single data row. Used so the blank filler rows match the
// data rows and the ruled grid stays even.
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
    render: (row: T) => string | number;
};

const styles = {
    title: { paddingVertical: 3, paddingTop: 5 } as Style,
    titleTxt: { fontFamily: 'Helvetica-Bold', fontSize: 12 } as Style,
    // Bottom border is intentionally omitted: the last table row keeps its own
    // 1pt divider as the table's bottom edge, so every row (data or blank) has
    // an identical height instead of the final row being padded by the box border.
    box: { border: B, borderBottomWidth: 0, marginBottom: 3 } as Style,
    thTxt: { fontFamily: 'Helvetica', fontSize: 6, textAlign: 'center' } as Style,
};

type SectionTableProps<T> = {
    title: string;
    columns: Column<T>[];
    rows: T[];
    /**
     * Pad the body with blank rows so the table always shows at least this many
     * rows. Lets a sparsely-populated table still look like a full, ruled grid
     * instead of collapsing to the height of its data.
     */
    minRows?: number;
};

/**
 * A self-contained titled table section.
 *
 * Renders a section heading followed by a bordered table built from a
 * declarative `columns` config. Data rows are followed by blank filler rows so
 * the table reaches `minRows`, keeping the column rules and row dividers running
 * down to a consistent minimum height.
 *
 * The table flows in normal document order and wraps naturally across pages:
 * when the rows don't fit on the current page react-pdf continues them on the
 * next one. Rows never split mid-row (each <TableRow> sets `wrap={false}`), so a
 * row is always drawn whole on a single page.
 */
export function SectionTable<T>({ title, columns, rows, minRows = 0 }: SectionTableProps<T>) {
    const lastCol = columns.length - 1;

    // Blank rows appended after the data so a sparse table still reads as a full
    // ruled grid up to `minRows`.
    const fillerCount = Math.max(minRows - rows.length, 0);

    const renderCells = (row: T | null) =>
        columns.map((c, i) => {
            const style = i === lastCol ? {} : { borderRight: B };
            return (
                <TableCell
                    key={c.key}
                    width={c.width}
                    align={row ? c.align ?? 'center' : 'center'}
                    style={{ ...style }}
                >
                    {row ? String(c.render(row)) : ' '}
                </TableCell>
            );
        });

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
                            <TableRow key={`d${r}`} style={{ height: ROW_H }}>
                                {renderCells(row)}
                            </TableRow>
                        ))}

                        {Array.from({ length: fillerCount }).map((_, f) => (
                            <TableRow key={`f${f}`} style={{ height: ROW_H }}>
                                {renderCells(null)}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </View>
        </>
    );
}
