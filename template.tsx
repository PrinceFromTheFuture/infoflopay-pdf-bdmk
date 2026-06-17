import React from 'react';
import dayjs from 'dayjs';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { SectionTable, type Column } from './src/components/work-order/section-table';
import { paginateRows } from './src/components/work-order/paginate';
import type { WorkOrderData, PrintingRow, LettershopRow } from './src/components/work-order/work-order.schema';

// ─── Single border used everywhere ────────────────────────────
const B = '0.8 solid #000000';

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

// ─── Default (minimum) table sizes ────────────────────────────
// Even with little or no data, each table is padded with blank ruled rows so it
// reads as a full grid. PRINTING is a fixed block on page 1; LETTERSHOP also
// stretches to fill whatever vertical space is left on its page.
const PRINTING_MIN_ROWS = 14;

// ─── Pagination capacity ──────────────────────────────────────
// How many LETTERSHOP rows fit (and how many blank rows we pad to) per page.
// Page 1 shares space with the full PRINTING table + comments, so it holds
// fewer rows; continuation pages carry only the LETTERSHOP table and fit more.
// These double as the per-page fill targets so the LETTERSHOP grid is always
// drawn all the way to the bottom of the page.
const ROWS_PAGE_1 = 12;
const ROWS_PAGE_CONT = 28;

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Helvetica',
        fontSize: FS.normal,
        padding: 20,
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
        padding: 8,
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
            {value === '' || value === undefined || value === null ? '—' : value}
        </Text>
    </View>
);

// ─── Number formatter ──────────────────────────────────────────
const fmtNum = (n: number) => n.toLocaleString('en-US');

// ─── Table column definitions ─────────────────────────────────
const printingColumns: Column<PrintingRow>[] = [
    { key: 'qty', header: 'QTY', width: 30, render: (r) => fmtNum(r.qty) },
    { key: 'desc', header: 'SIZE - TYPE - MATERIAL', align: 'left', render: (r) => `${r.size} ${r.type} ${r.material}` },
    { key: 'via', header: 'VIA', width: 32, render: (r) => r.via },
    { key: 'psiz', header: 'PSIZ', width: 36, render: (r) => r.psiz },
    { key: 'sht', header: 'SHT', width: 24, render: (r) => fmtNum(r.sht) },
    { key: 'up', header: '#UP', width: 26, render: (r) => fmtNum(r.up) },
    { key: 'crn', header: 'CRN', width: 32, render: (r) => r.crn },
    { key: 'bth', header: 'BTH', width: 24, render: (r) => fmtNum(r.bth) },
    { key: 'bld', header: 'BLD', width: 24, render: (r) => r.bld },
    { key: 'sd', header: 'S/D', width: 42, render: (r) => r.sd },
    { key: 'cb', header: 'C/B', width: 32, render: (r) => r.cb },
    { key: 'uv', header: 'UV', width: 52, render: (r) => r.uv },
    { key: 'vdp', header: 'VDP', width: 24, render: (r) => r.vdp },
];

const lettershopColumns: Column<LettershopRow>[] = [
    { key: 'qty', header: 'QTY', width: 55, render: (r) => fmtNum(r.qty) },
    { key: 'description', header: 'DESCRIPTION', align: 'left', render: (r) => r.description },
    { key: 'comment', header: 'COMMENT', align: 'left', render: (r) => r.comment },
];

// ─── Repeated page top: work-order header + 2x2 order grid ─────
const OrderSummary = ({ data }: { data: WorkOrderData }) => (
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
                <Text style={styles.headerVal}>{dayjs(data.header.dueDate).format('MM/DD/YYYY')}</Text>
            </View>
            <View style={styles.headerCol}>
                <Text style={styles.headerLbl}>Priority:</Text>
                <Text style={styles.headerVal}>{data.header.priority}</Text>
            </View>
        </View>

        {/* ════ ORDER BOXES — 2x2 grid ══════════════════════════ */}
        <View style={styles.grid}>

            {/* ── Cell 1: Customer ── */}
            <View style={{ ...styles.cell, borderRight: '0 solid #000000', justifyContent: 'center' }}>
                <View style={{ gap: PAIR_GAP }}>
                    <KV keyWidth={52} label="Customer:" value={data.order.customer} valSize={FS.xl} valBold />
                    <KV keyWidth={52} label="Notes:" value={data.order.notes} valSize={FS.normal} valBold />
                    <KV keyWidth={52} label="Job Name:" value={data.order.jobName} valSize={FS.xl} valBold />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingRight: 20, marginTop: PAIR_GAP }}>
                    <KV keyWidth={52} label="Quantity:" value={data.order.quantity} valSize={FS.xl} valBold />
                    <KV label="PO:" value={data.order.po} keySize={FS.xl4} valSize={FS.xl4} valBold />
                </View>
            </View>

            {/* ── Cell 2: Order information ── */}
            <View style={styles.cell}>
                <View style={{ flexDirection: 'row', height: '100%' }}>
                    <View style={{ flex: 1, gap: PAIR_GAP, paddingRight: 6, justifyContent: 'center' }}>
                        <KV gap={ROW_GAP} label="Order Date:" value={data.order.orderDate} keySize={FS.xl} valSize={FS.xl} />
                        <KV gap={ROW_GAP} label="Data In:" value={data.order.dataIn} keySize={FS.xl} valSize={FS.xl} />
                        <KV gap={ROW_GAP} label="Material In:" value={data.order.materialIn} keySize={FS.xl} valSize={FS.xl} />
                        <KV gap={ROW_GAP} label="Due Date:" value={data.order.dueDate} keySize={FS.xl} valSize={FS.xl} />
                    </View>
                    <View style={{ width: 64, gap: PAIR_GAP, justifyContent: 'center' }}>
                        <KV gap={ROW_GAP} label="DP:" value={data.design.dp} keySize={FS.xl} valSize={FS.xl} />
                        <KV gap={ROW_GAP} label="HP:" value={data.design.hp} keySize={FS.xl} valSize={FS.xl} />
                        <KV gap={ROW_GAP} label="VP:" value={data.design.vp} keySize={FS.xl} valSize={FS.xl} />
                        <KV gap={ROW_GAP} label="PP:" value={data.design.pp} keySize={FS.xl} valSize={FS.xl} />
                    </View>
                </View>
            </View>

            {/* ── Cell 4: Sort / Postage ── */}
            <View style={{ ...styles.cell, borderRight: '0 solid #000000' }}>
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
                    </View>
                </View>
            </View>

            {/* ── Cell 3: Delivery ── */}
            <View style={styles.cell}>
                <View style={{ gap: PAIR_GAP }}>
                    <KV gap={ROW_GAP} label="Deliver to PO:" value={data.delivery.deliverToPo} />
                    <KV gap={ROW_GAP} label="Deliver to client:" value={data.delivery.deliverToClient} />
                    <KV gap={ROW_GAP} label="Client p/u or ship:" value={data.delivery.clientPuOrShip} />
                    <KV gap={ROW_GAP} label="Leftovers:" value={data.delivery.leftovers} />
                </View>
            </View>

        </View>
    </>
);

// ─── Comments footer block (pinned to bottom of every page) ────
const CommentsBox = ({ comments }: { comments: string }) => (
    <View style={[styles.box, { marginBottom: 0 }]}>
        <Text style={{ fontFamily: 'Helvetica', fontSize: 7, padding: 3 }}>COMMENTS:</Text>
        <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1, paddingBottom: 4, paddingHorizontal: 5, minHeight: 32 }}>
                <Text style={{ fontFamily: 'Helvetica', fontSize: 6 }}>{comments}</Text>
            </View>
        </View>
    </View>
);

// Split the lettershop rows across as many pages as needed. Each page repeats
// the same header/grid; only the lettershop table changes (and PRINTING is
// shown on the first page only).
const __OVERFLOW_TEST = process.env.OVERFLOW_TEST === '1';

const MyDocument = ({ data }: { data: WorkOrderData }) => {
    const lettershopRows = __OVERFLOW_TEST
        ? Array.from({ length: 70 }, (_, i) => ({
            qty: 1000 + i,
            description: `Inkjet Addressing line ${i + 1}`,
            comment: String(i + 1),
        }))
        : data.lettershop;
    const lettershopPages = paginateRows(lettershopRows, ROWS_PAGE_1, ROWS_PAGE_CONT);

    return (
        <Document>
            {lettershopPages.map((rows, pageIndex) => (
                <Page key={pageIndex} size="LETTER" style={styles.page}>
                    <OrderSummary data={data} />

                    {pageIndex === 0 && (
                        <SectionTable
                            title="PRINTING"
                            columns={printingColumns}
                            rows={data.printing}
                            minRows={PRINTING_MIN_ROWS}
                        />
                    )}

                    <SectionTable
                        title="LETTERSHOP"
                        columns={lettershopColumns}
                        rows={rows as LettershopRow[]}
                        minRows={pageIndex === 0 ? ROWS_PAGE_1 : ROWS_PAGE_CONT}
                        fill
                    />

                    <CommentsBox comments={data.comments} />
                </Page>
            ))}
        </Document>
    );
};

export default MyDocument;
