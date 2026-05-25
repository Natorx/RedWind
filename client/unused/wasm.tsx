import { useState, useEffect } from "react";
import init, { add } from "../utils/wasm/WASM";

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