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

// Fixed height of a single data row. Used so page capacity is predictable
// when we paginate, and so the "fill" filler row math stays stable.
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
    box: { border: B, marginBottom: 3 } as Style,
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
    /**
     * When true, the table grows to consume all remaining vertical space on the
     * page. The blank filler rows stretch uniformly (each at least one row tall)
     * so the ruled grid reaches the bottom of the page instead of leaving a
     * single oversized empty cell. Requires the parent <Page> to lay children
     * out in a column, which is the react-pdf default.
     */
    fill?: boolean;
};

/**
 * A self-contained titled table section.
 *
 * Renders a section heading followed by a bordered table built from a
 * declarative `columns` config. Data rows are followed by blank filler rows so
 * the table reaches `minRows` (and, when `fill` is set, the bottom of the page),
 * keeping the column rules and row dividers running all the way down.
 */
export function SectionTable<T>({ title, columns, rows, minRows = 0, fill = false }: SectionTableProps<T>) {
    const lastCol = columns.length - 1;
    const fillStyle: Style | undefined = fill
        ? { flexGrow: 1, flexDirection: 'column' }
        : undefined;

    // Blank rows appended after the data. Always keep at least one filler when
    // filling so the body has something to stretch to the page bottom.
    const fillerCount = Math.max(minRows - rows.length, fill ? 1 : 0);
    const totalRows = rows.length + fillerCount;

    const renderCells = (row: T | null) =>
        columns.map((c, i) => (
            <TableCell
                key={c.key}
                width={c.width}
                align={row ? c.align ?? 'center' : 'center'}
                style={i === lastCol ? {} : { borderRight: B }}
            >
                {row ? String(c.render(row)) : ' '}
            </TableCell>
        ));

    return (
        <>
            <View style={styles.title}>
                <Text style={styles.titleTxt}>{title}</Text>
            </View>

            <View style={fill ? [styles.box, fillStyle as Style] : styles.box}>
                <Table
                    variant="line"
                    style={{ marginBottom: 0, borderBottomWidth: 0, ...(fill ? fillStyle : {}) }}
                >
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

                    <TableBody style={fillStyle}>
                        {rows.map((row, r) => (
                            <TableRow
                                key={`d${r}`}
                                style={{
                                    height: ROW_H,
                                    ...(r === totalRows - 1 ? { borderBottomWidth: 0 } : {}),
                                }}
                            >
                                {renderCells(row)}
                            </TableRow>
                        ))}

                        {Array.from({ length: fillerCount }).map((_, f) => {
                            const r = rows.length + f;
                            const isLast = r === totalRows - 1;
                            return (
                                <TableRow
                                    key={`f${f}`}
                                    style={{
                                        ...(fill ? { flexGrow: 1, minHeight: ROW_H } : { height: ROW_H }),
                                        ...(isLast ? { borderBottomWidth: 0 } : {}),
                                    }}
                                >
                                    {renderCells(null)}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </View>
        </>
    );
}
