"use client";

import { taka } from "@/lib/format";
import type { AdminOrderDetail } from "@/lib/order-status";

/**
 * Shipping labels, many to a page.
 *
 * Geometry is in millimetres on purpose: at two columns each label is
 * 99mm x 57mm, which is the standard 10-per-A4 label sheet, so the output
 * lines up with real sticker paper as well as it does with plain paper.
 */
export default function LabelSheet({
  orders,
  siteName,
  courierName,
  columns,
}: {
  orders: AdminOrderDetail[];
  siteName: string;
  courierName: string;
  columns: 2 | 3;
}) {
  /* 198mm of printable width inside A4's 6mm margins: two 99mm labels (the
     standard 10-per-sheet size) or three 66mm ones. */
  const height = columns === 2 ? "57mm" : "47.5mm";
  const colWidth = columns === 2 ? "99mm" : "66mm";

  return (
    <>
      <style>{`
        /* The sheet keeps true millimetre geometry on screen too, so the
           preview is faithful; a narrow phone scrolls it rather than
           squashing it out of proportion. */
        .labels-wrap { overflow-x: auto; overscroll-behavior-x: contain; }
        .labels {
          display: grid;
          grid-template-columns: repeat(${columns}, ${colWidth});
          width: 198mm;
          margin: 0 auto;
          background: #fff;
        }
        .label {
          height: ${height};
          box-sizing: border-box;
          padding: ${columns === 2 ? "4mm 4.5mm" : "3mm 3.5mm"};
          /* A full border per label on purpose: the doubled seam between two
             labels is the cutting line, and it avoids the negative-margin
             trick that makes grid items overflow their track. */
          border: 0.3mm solid #cfcfd6;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          break-inside: avoid;
          page-break-inside: avoid;
          font-family: Manrope, system-ui, sans-serif;
          color: #000;
        }
        .lb-top {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 2mm;
          border-bottom: 0.3mm solid #e3e3ea;
          padding-bottom: 1.4mm;
        }
        .lb-site { font-weight: 800; font-size: ${columns === 2 ? "10pt" : "8.5pt"}; letter-spacing: -0.01em; }
        .lb-code { font-weight: 800; font-size: ${columns === 2 ? "8.5pt" : "7.5pt"}; white-space: nowrap; }
        .lb-body { flex: 1; min-height: 0; padding-top: 1.8mm; }
        .lb-name {
          font-weight: 800;
          font-size: ${columns === 2 ? "12pt" : "10pt"};
          line-height: 1.15;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          line-clamp: 1;
          -webkit-box-orient: vertical;
        }
        .lb-phone {
          font-weight: 800;
          font-size: ${columns === 2 ? "11pt" : "9.5pt"};
          letter-spacing: 0.02em;
          margin-top: 0.6mm;
        }
        .lb-addr {
          font-size: ${columns === 2 ? "8.5pt" : "7.5pt"};
          line-height: 1.3;
          margin-top: 1.2mm;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: ${columns === 2 ? 3 : 2};
          line-clamp: ${columns === 2 ? 3 : 2};
          -webkit-box-orient: vertical;
        }
        .lb-foot {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 2mm;
          border-top: 0.3mm solid #e3e3ea;
          padding-top: 1.4mm;
        }
        .lb-courier { font-size: ${columns === 2 ? "7.5pt" : "6.5pt"}; line-height: 1.25; min-width: 0; }
        .lb-cid { font-weight: 800; font-size: ${columns === 2 ? "9pt" : "8pt"}; letter-spacing: 0.01em; }
        .lb-amount {
          font-weight: 800;
          font-size: ${columns === 2 ? "13pt" : "11pt"};
          white-space: nowrap;
          text-align: right;
        }
        .lb-cod { font-size: ${columns === 2 ? "6.5pt" : "6pt"}; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }

        @media print {
          @page { size: A4 portrait; margin: 6mm; }
          .labels-wrap { overflow: visible; }
          .labels { width: auto; margin: 0; }
          .label { border-color: #bdbdc7; }
        }
      `}</style>

      <div className="labels-wrap">
        <div className="labels">
          {orders.map((o) => (
            <div key={o.id} className="label">
              <div className="lb-top">
                <span className="lb-site">{siteName}</span>
                <span className="lb-code">#{o.code}</span>
              </div>

              <div className="lb-body">
                <p className="lb-name">{o.customerName}</p>
                <p className="lb-phone">{o.phone}</p>
                <p className="lb-addr">{o.address}</p>
              </div>

              <div className="lb-foot">
                <span className="lb-courier">
                  {o.courierConsignmentId ? (
                    <>
                      {courierName}
                      <br />
                      <span className="lb-cid">{o.courierConsignmentId}</span>
                    </>
                  ) : (
                    <span className="lb-cod">Not sent</span>
                  )}
                </span>
                <span>
                  <span className="lb-cod">COD</span>
                  <br />
                  <span className="lb-amount">{taka(o.total)}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
