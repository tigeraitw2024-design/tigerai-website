import { useEffect, useState } from 'react';
import { api, type ReportRow } from '../api';
import Icon from '../Icon';
import { downloadBlob } from '../certExport';

/**
 * 對帳報表（owner 專用）。依「講師 × 月份」加總張數、已印、已寄、金額，並顯示結算狀況。
 * 收款後到「證照」頁勾選那批、按「標已結算」，這裡就會把那些算進「已結」。
 * 「只看未結」把已全部結清的月份收起來（＝封存，不佔畫面但隨時切回來查）。
 */
export default function Report() {
  const [rows, setRows] = useState<ReportRow[] | null>(null);
  const [err, setErr] = useState('');
  const [onlyOpen, setOnlyOpen] = useState(false);

  useEffect(() => {
    api.get<{ rows: ReportRow[] }>('/api/teacher/report')
      .then((r) => setRows(r.rows)).catch((e) => setErr(e.message));
  }, []);

  const shown = (rows || []).filter((r) => !onlyOpen || r.settled < r.count); // 未結＝還沒全部結算
  const total = shown.reduce((a, r) => ({
    count: a.count + r.count, printed: a.printed + r.printed, shipped: a.shipped + r.shipped,
    amount: a.amount + r.amount, settledAmount: a.settledAmount + r.settledAmount,
  }), { count: 0, printed: 0, shipped: 0, amount: 0, settledAmount: 0 });

  function exportCsv() {
    const head = ['講師', '月份', '張數', '已印', '已寄', '已結算', '金額', '已結金額', '未結金額'];
    const lines = [head.join(',')];
    for (const r of shown) {
      lines.push([r.instructor, r.month, r.count, r.printed, r.shipped, r.settled, r.amount, r.settledAmount, r.amount - r.settledAmount]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    }
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, `對帳_${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div>
      <div className="t-row" style={{ alignItems: 'center', marginBottom: 4 }}>
        <h1 className="t-h1" style={{ margin: 0 }}>對帳</h1>
        <span className="t-spacer" />
        {rows && rows.length > 0 && (
          <button className="t-btn t-btn--ghost t-btn--sm" onClick={exportCsv}><Icon name="download" size={14} /> 匯出 CSV</button>
        )}
      </div>
      <p className="t-intro">依講師與月份加總。收款後到「證照」頁勾選那批按「標已結算」，這裡就會進「已結」。</p>

      {err && <div className="t-msg t-msg--err">{err}</div>}
      {rows && rows.length > 0 && (
        <label className="t-check" style={{ marginBottom: 12 }}>
          <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} /> 只看未結清（把已全部結算的月份收起來）
        </label>
      )}

      {rows === null ? <div className="t-empty">載入中…</div>
        : shown.length === 0 ? <div className="t-empty">{onlyOpen ? '沒有未結清的，全部都對完帳了 🎉' : '還沒有資料。'}</div>
        : (
          <div style={{ overflowX: 'auto' }}>
            <table className="t-report">
              <thead>
                <tr>
                  <th>講師</th><th>月份</th>
                  <th className="num">張數</th><th className="num">已印</th><th className="num">已寄</th>
                  <th className="num">已結算</th><th className="num">金額</th><th className="num">未結金額</th>
                </tr>
              </thead>
              <tbody>
                {rows && shown.map((r, i) => {
                  const open = r.amount - r.settledAmount;
                  return (
                    <tr key={i}>
                      <td><b>{r.instructor}</b></td>
                      <td className="t-mono">{r.month}</td>
                      <td className="num">{r.count}</td>
                      <td className="num">{r.printed}</td>
                      <td className="num">{r.shipped}</td>
                      <td className="num">{r.settled}/{r.count}{r.settled >= r.count && <span style={{ color: '#2e7d57' }}> ✓</span>}</td>
                      <td className="num">{r.amount.toLocaleString('zh-TW')}</td>
                      <td className="num" style={{ color: open > 0 ? 'var(--t-danger)' : 'var(--t-fg-3)' }}>{open.toLocaleString('zh-TW')}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>合計</td>
                  <td className="num">{total.count}</td>
                  <td className="num">{total.printed}</td>
                  <td className="num">{total.shipped}</td>
                  <td className="num">—</td>
                  <td className="num">{total.amount.toLocaleString('zh-TW')}</td>
                  <td className="num">{(total.amount - total.settledAmount).toLocaleString('zh-TW')}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
    </div>
  );
}
