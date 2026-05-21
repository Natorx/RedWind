/** src/components/DrillGround.tsx
 * @Author: Fofow
 * @Date: 2026/4/2
 * @Description: 练习场组件 - 集成SQLite数据管理和打印机控制
 * @Copyright: Copyright (©) 2026 Fofow. All rights reserved.
 */

import { useState, useEffect } from "react";
import init, { add } from "../wasm/WASM";

const DrillGround: React.FC = () => {
  const [ready, setReady] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  useEffect(() => {
    async function loadWasm() {
      await init(); // 等待 wasm 初始化
      setReady(true);
      // 可以在初始化后立即调用 add 并设置结果
      setResult(add(1, 2));
    }
    loadWasm();
  }, []);

  return (
    <div>
      {ready ? <p>1 + 2 = {result}</p> : <p>Loading wasm...</p>}
    </div>
  );
};

export default DrillGround;
