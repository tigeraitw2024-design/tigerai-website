import { useEffect, useState } from 'react';

/**
 * 有沒有滑鼠。
 *
 * 手機平板是 coarse（手指），滑鼠是 fine。這件事跟螢幕寬度是兩回事：
 * 窄視窗的桌機有滑鼠、大尺寸平板沒有，所以不能拿 useNarrow 代替。
 *
 * 用途是那些「只有 hover 才會發生」的互動：沒有滑鼠的人永遠觸發不到，
 * 要換成點一下。預設 false，因為伺服器端沒有 matchMedia，
 * 而且猜錯的方向要選「當作有滑鼠」——那只是少一次攔截，不會壞掉。
 */
export function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const sync = () => setCoarse(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return coarse;
}
