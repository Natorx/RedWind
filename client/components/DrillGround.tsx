/**src/components/DrillGround.tsx
 * @Author: Fofow
 * @Date: 2026/4/2
 * @Description:
 * @Copyright: Copyright (©)}) 2026 Fofow. All rights reserved.
 */
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState } from 'react';

const DrillGround: React.FC = () => {
  const [data, setData] = useState<string>('');
  useEffect(() => {
    const fetchData = async () => {
      const result = await invoke<string>('get_poem');
      setData(result);
    };
    fetchData();
  }, []);
  const handleClick = async () => {
    const result = await invoke<string>('get_poem');
    setData(result);
  };
  return (
    <div>
      <div>{data}</div>
      <button onClick={handleClick}>getData</button>
    </div>
  );
};
export default DrillGround;
