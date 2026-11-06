/**
 * 學員名稱：中文在上、英文在下。
 * zh＝收件中文名（recipientName）、en＝證照英文名（studentName）。
 * 只有一個就顯示那一個；都沒有顯示「—」。全站清單共用，格式統一。
 */
export default function Name({ zh, en }: { zh?: string; en?: string }) {
  const top = (zh || '').trim();
  const bot = (en || '').trim();
  if (!top && !bot) return <>—</>;
  if (!top) return <span className="t-nm__en t-nm__solo">{bot}</span>;
  if (!bot) return <span className="t-nm__zh t-nm__solo">{top}</span>;
  return (
    <span className="t-nm">
      <span className="t-nm__zh">{top}</span>
      <span className="t-nm__en">{bot}</span>
    </span>
  );
}
