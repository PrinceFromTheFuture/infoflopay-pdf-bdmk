import React from 'react';
import dayjs from 'dayjs';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { SectionTable, ROW_H, type Column } from './src/components/work-order/section-table';
import { paginateWorkOrder } from './src/components/work-order/paginate';
import type { WorkOrderData, PrintingRow, LettershopRow } from './src/components/work-order/work-order.schema';
import { phpToDayjs } from './src/utils/date-format';

// ─── Single border used everywhere ────────────────────────────
const B = '0.8 solid #cccccc';

// ─── Font scale ───────────────────────────────────────────────
const FS = {
    normal: 8,
    xl: 13,
    xl4: 9, // xl - 4
};

// Fixed gap between a key and its value (used in order-info & delivery)
const ROW_GAP = 6;

// Fixed vertical gap between key/value pairs inside every box
const PAIR_GAP = 10;

// ─── 2x2 grid cell dimensions ─────────────────────────────────
// LETTER width 612 - page padding (20 * 2) = 572 content width.
// Boxes touch left↔right (no column gap) so each cell is half the width.
const GRID_GAP = 3; // vertical gap between the top and bottom row only
const CELL_W = (612 - 40) / 2; // 286
const CELL_H = CELL_W / 2.8; // height aspect 1/2 of width

// ─── Page geometry & per-page table capacities ────────────────
// Every page is laid out identically: order summary (~245pt) on top, the two
// tables in the middle, comments box (~49pt) pinned to the bottom. The numbers
// below are derived from those measured heights on a LETTER page (792pt tall)
// with a 14pt row height and a 34pt per-table overhead (title + header row):
//
//   usable height           = 792 − 20 (top) − 20 (bottom) − 49 (comments) ≈ 703
//   space for tables         = 703 − 245 (summary)                         ≈ 458
//   BOTH tables (2× 34 ovh)  → (458 − 68) / 14 ≈ 27 rows total  → 13 each
//   ONE table  (1× 34 ovh)   → (458 − 34) / 14 ≈ 30 rows        → 29 (margin)
const PAGE_MARGIN = 20;
const FOOTER_HEIGHT = 49; // measured CommentsBox height

// Rows per table when both share a page, and for a lone table that fills the
// page once the other has run out of data.
const ROWS_BOTH = 13;
const ROWS_FULL = 29;

// First-page capacities. The DESIGN table (title + one 14pt row plus its own
// title/margins ≈ 40pt, ~3 row-heights) only appears on page 1, so the flowing
// tables there start lower and hold correspondingly fewer rows. Verified by
// render: a lone table fits 26 rows here (27 overflows onto a second page).
const ROWS_BOTH_FIRST = 12;
const ROWS_FULL_FIRST = 26;

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Helvetica',
        fontSize: FS.normal,
        paddingTop: PAGE_MARGIN,
        paddingHorizontal: PAGE_MARGIN,
        // Reserve space for the absolutely-positioned comments footer so the
        // flowing tables can never run underneath it.
        paddingBottom: PAGE_MARGIN + FOOTER_HEIGHT,
        backgroundColor: '#ffffff',
        flexDirection: 'column',
    },

    // ─── Work order header (no border) ─────────────────────────
    header: { flexDirection: 'row', marginBottom: 8 },
    headerCol: { flex: 1, paddingRight: 6 },
    headerLbl: {
        fontFamily: 'Helvetica',
        fontSize: 6,
        color: '#000000',
        marginBottom: 2,
    },
    headerVal: { fontFamily: 'Helvetica-Bold', fontSize: 20 },

    // ─── 2x2 grid of order boxes ───────────────────────────────
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        columnGap: 0,
        rowGap: GRID_GAP,
        marginBottom: 3,
    },
    cell: {
        width: CELL_W,
        height: CELL_H,
        border: B,
        padding: 3,
        overflow: 'hidden',
    },

    // ─── Section wrapper (used by comments box) ────────────────
    box: { border: B, marginBottom: 3 },
});

// ─── Key / value pair ─────────────────────────────────────────
const KV = ({
    label,
    value,
    keySize = FS.normal,
    valSize = FS.normal,
    keyBold = true,
    valBold = false,
    between = false,
    gap = 4,
    keyWidth,
}: {
    label: string;
    value: React.ReactNode;
    keySize?: number;
    valSize?: number;
    keyBold?: boolean;
    valBold?: boolean;
    between?: boolean;
    gap?: number;
    keyWidth?: number;
}) => (
    <View
        style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap,
            justifyContent: between ? 'space-between' : 'flex-start',
        }}
    >
        <Text style={{ fontFamily: keyBold ? 'Helvetica-Bold' : 'Helvetica', fontSize: keySize, width: keyWidth }}>
            {label}
        </Text>
        <Text style={{ fontFamily: valBold ? 'Helvetica-Bold' : 'Helvetica', fontSize: valSize }}>
            {value === '' || value === undefined || value === null ? '' : value}
        </Text>
    </View>
);

// ─── Number formatter ──────────────────────────────────────────
// Render an empty string for zero / NaN instead of "0".
const fmtNum = (n: number) => (!n || isNaN(n) ? '' : n.toLocaleString('en-US'));

// ─── Table column definitions ─────────────────────────────────
const fmtAuto = (v: unknown): string => {
    const n = Number(v);
    return isNaN(n) ? String(v ?? '') : fmtNum(n);
};

// `desc` and `comment` both omit `width` so they share the space left over by
// the fixed columns equally (flex: 1 each).
const printingColumns: Column<PrintingRow>[] = [
    { key: 'qty', header: 'QTY', width: 34, render: (r) => fmtAuto(r.qty) },
    { key: 'desc', header: 'SIZE - TYPE - MATERIAL', align: 'left', render: (r) => `${r.size} ${r.type} ${r.material}` },
    { key: 'comment', header: 'COMMENT', align: 'left', render: (r) => r.comment },
    { key: 'via', header: 'VIA', width: 44, render: (r) => fmtAuto(r.via) },
    { key: 'rc', header: 'RC', width: 32, render: (r) => fmtAuto(r.rc) },
    { key: 'sd', header: 'S/D', width: 36, render: (r) => fmtAuto(r.sd) },
    { key: 'cb', header: 'C/B', width: 40, render: (r) => fmtAuto(r.cb) },
    { key: 'vdp', header: 'VDP', width: 24, render: (r) => fmtAuto(r.vdp) },
    { key: 'ext', header: 'EXT', width: 34, render: (r) => fmtAuto(r.ext) },
];

const lettershopColumns: Column<LettershopRow>[] = [
    { key: 'qty', header: 'QTY', width: 55, render: (r) => fmtNum(r.qty) },
    { key: 'description', header: 'DESCRIPTION', align: 'left', render: (r) => r.description },
    { key: 'comment', header: 'COMMENT', align: 'left', render: (r) => r.comment },
];

// ─── Repeated page top: work-order header + 2x2 order grid ─────
const OrderSummary = ({ data }: { data: WorkOrderData }) => {
    const dayjsFmt = phpToDayjs(data.date_format);
    const fmtDate = (dateStr: string) => {
        const d = dayjs(dateStr);
        return d.isValid() ? d.format(dayjsFmt) : dateStr;
    };


    return (
        <>
            {/* ════ WORK ORDER HEADER (no border) ═══════════════════ */}
            <View style={styles.header}>
                <View style={styles.headerCol}>
                    <Text style={styles.headerLbl}>Work Order:</Text>
                    <Text style={styles.headerVal}>{data.header.workOrder}</Text>
                </View>
                <View style={styles.headerCol}>
                    <Text style={styles.headerLbl}>Due Date:</Text>
                    <Text style={styles.headerVal}>{dayjs(data.header.dueDate).format('ddd')}</Text>
                </View>
                <View style={styles.headerCol}>
                    <Text style={{ height: "8px" }}></Text>
                    <Text style={styles.headerVal}>{fmtDate(data.header.dueDate)}</Text>
                </View>
                <View style={styles.headerCol}>
                    <Text style={styles.headerLbl}>Priority:</Text>
                    <Text style={styles.headerVal}>{data.header.priority}</Text>
                </View>
            </View>

            {/* ════ ORDER BOXES — 2x2 grid ══════════════════════════ */}
            <View style={styles.grid}>

                {/* ── Cell 1: Customer ── */}
                <View style={{ ...styles.cell, borderRight: '0 solid #cccccc', justifyContent: 'center' }}>
                    <View style={{ gap: PAIR_GAP }}>
                        <KV keyWidth={52} label="Customer:" value={data.order.customer} valSize={FS.xl - 3} valBold />
                        <KV keyWidth={52} label="Notes:" value={data.order.notes} valSize={FS.normal} valBold />
                        <KV keyWidth={52} label="Job Name:" value={data.order.jobName} valSize={FS.xl - 3} valBold />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingRight: 20, marginTop: PAIR_GAP }}>
                        <KV keyWidth={52} label="Quantity:" value={fmtNum(Number(data.order.quantity))} valSize={FS.xl} valBold />
                        <KV label="PO:" value={data.order.po} keySize={FS.xl4} valSize={FS.xl4} valBold />
                    </View>
                </View>

                {/* ── Cell 2: Order information ── */}
                <View style={styles.cell}>
                    <View style={{ flexDirection: 'row', height: '100%' }}>
                        <View style={{ flex: 1, gap: PAIR_GAP, paddingRight: 6, justifyContent: 'center' }}>
                            <KV gap={ROW_GAP} label="Order Date:" value={fmtDate(data.order.orderDate)} />
                            <KV gap={ROW_GAP} label="Data In:" value={fmtDate(data.order.dataIn)} />
                            <KV gap={ROW_GAP} label="Material In:" value={fmtDate(data.order.materialIn)} />
                            <KV gap={ROW_GAP} label="Artwork In:" value={fmtDate(data.order.artworkIn)} />
                            <KV gap={ROW_GAP} label="Due Date:" value={fmtDate(data.order.dueDate)} />
                        </View>
                        <View style={{ width: 64, gap: PAIR_GAP, justifyContent: 'center' }}>
                            <KV gap={ROW_GAP} label="DP:" value={data.design.dp} />
                            <KV gap={ROW_GAP} label="HP:" value={data.design.hp} />
                            <KV gap={ROW_GAP} label="VP:" value={data.design.vp} />
                            <KV gap={ROW_GAP} label="PP:" value={data.design.pp} />
                        </View>
                    </View>
                </View>

                {/* ── Cell 4: Sort / Postage ── */}
                <View style={{ ...styles.cell, borderRight: '0 solid #cccccc' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', height: '100%' }}>
                        <View style={{ flex: 1, gap: PAIR_GAP, paddingRight: 6 }}>
                            <KV label="Cat / Size:" value={data.sortPostage.catSize} />
                            <KV label="Class of mail:" value={data.sortPostage.classOfMail} />
                            <KV label="Postage affix:" value={data.sortPostage.postageAffix} />
                            <KV label="Data:" value={data.sortPostage.data} />
                            <KV label="Postage Status:" value={data.sortPostage.postageStatus} />
                        </View>
                        <View style={{ flex: 1, gap: PAIR_GAP }}>
                            <KV label="PI number:" value={data.sortPostage.piNumber} />
                            <KV label="Destitrack:" value={data.sortPostage.destitrack} />
                            <KV label="IT Special:" value={data.sortPostage.itSpecial} />
                            <KV label="Mailing List:" value={data.sortPostage.mailingList} />
                            <KV label="Political:" value={data.sortPostage.political} />
                        </View>
                    </View>
                </View>

                {/* ── Cell 3: Delivery ── */}
                <View style={styles.cell}>
                    <View style={{ flexDirection: 'row', height: '100%' }}>
                        <View style={{ flex: 1, gap: PAIR_GAP, paddingRight: 6, justifyContent: 'center' }}>
                            <KV gap={ROW_GAP} label="Deliver to PO:" value={data.delivery.deliverToPo} />
                            <KV gap={ROW_GAP} label="Deliver to client:" value={data.delivery.deliverToClient} />
                            <KV gap={ROW_GAP} label="Client p/u or ship:" value={data.delivery.clientPuOrShip} />
                            <KV gap={ROW_GAP} label="Leftovers:" value={data.delivery.leftovers} />
                        </View>
                    </View>
                </View>

            </View>
        </>
    );
};

// ─── DESIGN single-row table (first page only) ─────────────────
// Matches the PRINTING/LETTERSHOP section look: a bold title above a
// light-gray bordered box holding one row of eight equally-spaced columns,
// alternating key | value | key | value …, divided by light-gray column rules.
const DesignTable = ({ data }: { data: WorkOrderData }) => {
    // Flattened into individual cells so keys and values each occupy their own
    // equal-width column (8 columns total for the 4 key/value pairs).
    const cells = [
        { text: 'Designer:', bold: true },
        { text: data.design.designer, bold: false },
        { text: 'Estimated Hours:', bold: true },
        { text: data.design.estimatedHours, bold: false },
        { text: 'Actual Hours:', bold: true },
        { text: data.design.actualHours, bold: false },
        { text: 'Date Approved:', bold: true },
        { text: data.design.dateApproved, bold: false },
    ];

    return (
        <>
            <View style={{ paddingVertical: 3, paddingTop: 5 }}>
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 12 }}>DESIGN</Text>
            </View>
            <View style={{ border: B, marginBottom: 3 }}>
                <View style={{ flexDirection: 'row', height: ROW_H, alignItems: 'center' }}>
                    {cells.map((c, i) => (
                        <View
                            key={i}
                            style={{
                                flex: 1,
                                height: '100%',
                                justifyContent: 'center',
                                paddingHorizontal: 5,
                                ...(i === cells.length - 1 ? {} : { borderRight: B }),
                            }}
                        >
                            <Text
                                style={{
                                    fontFamily: 'Helvetica',
                                    fontSize: FS.normal - 1,
                                }}
                            >
                                {c.text}
                            </Text>
                        </View>
                    ))}
                </View>
            </View>
        </>
    );
};

// ─── Comments footer block (pinned to bottom of every page) ────
// Absolutely positioned at the bottom margin so it sits flush at the foot of
// every page regardless of how full the tables are. The page reserves
// FOOTER_HEIGHT of bottom padding so the tables never run underneath it.
const CommentsBox = ({ comments }: { comments: string }) => (
    <View
        fixed
        style={[
            styles.box,
            {
                marginBottom: 0,
                position: 'absolute',
                left: PAGE_MARGIN,
                right: PAGE_MARGIN,
                bottom: PAGE_MARGIN,
            },
        ]}
    >
        <Text style={{ fontFamily: 'Helvetica', fontSize: 7, padding: 3 }}>COMMENTS:</Text>
        <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1, paddingBottom: 4, paddingHorizontal: 5, minHeight: 38 }}>
                <Text style={{ fontFamily: 'Helvetica', fontSize: 9 }}>{comments}</Text>
            </View>
        </View>
    </View>
);

// Each page is identical in structure — order summary, PRINTING table,
// LETTERSHOP table, comments — and the two tables are paginated together. While
// both tables still have data they share the page (ROWS_BOTH rows each, padded
// with blank rows to a full grid). Once one table runs out, the other expands
// to ROWS_FULL and fills every following page on its own.
const mailingTemplate = ({ data }: { data: WorkOrderData }) => {
    const pages = paginateWorkOrder(data.printing, data.lettershop, {
        both: ROWS_BOTH,
        full: ROWS_FULL,
        firstBoth: ROWS_BOTH_FIRST,
        firstFull: ROWS_FULL_FIRST,
    });

    return (
        <Document>
            {pages.map((page, i) => (
                <Page key={i} size="LETTER" style={styles.page}>
                    <OrderSummary data={data} />

                    {i === 0 && <DesignTable data={data} />}

                    {page.printing && (
                        <SectionTable
                            title="PRINTING"
                            columns={printingColumns}
                            rows={page.printing.rows}
                            minRows={page.printing.padTo}
                        />
                    )}

                    {page.lettershop && (
                        <SectionTable
                            title="LETTERSHOP"
                            columns={lettershopColumns}
                            rows={page.lettershop.rows}
                            minRows={page.lettershop.padTo}
                        />
                    )}

                    <CommentsBox comments={data.comments} />
                </Page>
            ))}
        </Document>
    );
};

export default mailingTemplate;
