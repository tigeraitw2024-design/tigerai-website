import { useEffect, useState } from 'react';

/**
 * 視窗是不是窄於某個寬度。
 *
 * 預設 900px：頂欄的六個導覽項加上 CTA 按鈕，低於這個寬度就一定擠不下，
 * 要換成漢堡選單。
 *
 * 初始值一律回傳 false（當成桌機），因為 Astro 會在建置時先在 Node 裡
 * 渲染一次，那時候沒有 window。掛載後才用真實寬度更新。
 * 這代表手機上第一幀會先畫桌機版再換掉，但頂欄很輕，看不出來；
 * 反過來如果初始猜 true，桌機使用者反而會看到選單閃一下。
 */
export function useNarrow(max = 900) {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width:${max}px)`);
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [max]);

  return narrow;
}

export default useNarrow;
