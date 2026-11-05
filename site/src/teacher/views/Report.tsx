import { useEffect, useState } from 'react';
import { api, type ReportRow } from '../api';

/**
 * 對帳報表（owner 專用）。依「講師 × 月份」把張數、已印、已寄、金額加總，
 * 用來跟每位講師結算。每張預設 200 元含運。
 */
export default function Report() {
  const [rows, setRows] = useState<ReportRow[] | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get<{ rows: ReportRow[] }>('/api/teacher/report')
      .then((r) => setRows(r.rows)).catch((e) => setErr(e.message));
  }, []);

  const total = (rows || []).reduce((a, r) => ({
    count: a.count + r.count, printed: a.printed + r.printed,
    shipped: a.shipped + r.shipped, amount: a.amount + r.amount,
  }), { count: 0, printed: 0, shipped: 0, amount: 0 });

  return (
    <div>
      <h1 className="t-h1">對帳</h1>
      <p className="t-intro">依講師與月份統計。每張證照 200 元含運；跟講師結算時對這張表。</p>
      {err && <div className="t-msg t-msg--err">{err}</div>}
      {rows === null ? <div className="t-empty">載入中…</div>
        : rows.length === 0 ? <div className="t-empty">還沒有資料。</div>
        : (
          <div style={{ overflowX: 'auto' }}>
            <table className="t-report">
              <thead>
                <tr>
                  <th>講師</th><th>月份</th>
                  <th className="num">張數</th><th className="num">已印</th><th className="num">已寄</th><th className="num">金額</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td><b>{r.instructor}</b></td>
                    <td className="t-mono">{r.month}</td>
                    <td className="num">{r.count}</td>
                    <td className="num">{r.printed}</td>
                    <td className="num">{r.shipped}</td>
                    <td className="num">{r.amount.toLocaleString('zh-TW')} 元</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>合計</td>
                  <td className="num">{total.count}</td>
                  <td className="num">{total.printed}</td>
                  <td className="num">{total.shipped}</td>
                  <td className="num">{total.amount.toLocaleString('zh-TW')} 元</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
    </div>
  );
}
