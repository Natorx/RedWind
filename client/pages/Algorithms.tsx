import React, { useState, useCallback, useRef } from 'react';

// 排序算法类型
type AlgorithmType = 'bubble' | 'selection' | 'insertion';

// 数据项类型
interface DataItem {
  value: number;
  isComparing: boolean;
  isSwapping: boolean;
  isSorted: boolean;
}

// 生成随机数据
const generateRandomData = (count: number = 20): DataItem[] => {
  return Array.from({ length: count }, () => ({
    value: Math.floor(Math.random() * 80) + 10, // 10-90 之间的数
    isComparing: false,
    isSwapping: false,
    isSorted: false,
  }));
};

// 延迟函数
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const Algorithms: React.FC = () => {
  const [data, setData] = useState<DataItem[]>(() => generateRandomData(20));
  const [isSorting, setIsSorting] = useState(false);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<AlgorithmType>('bubble');
  const [speed, setSpeed] = useState(50); // 
  const abortControllerRef = useRef<AbortController | null>(null);

  // 重置数据
  const resetData = useCallback(() => {
    if (isSorting) return;
    setData(generateRandomData(20));
  }, [isSorting]);

  // 清除高亮
  const clearHighlights = useCallback((newData: DataItem[]) => {
    return newData.map(item => ({
      ...item,
      isComparing: false,
      isSwapping: false,
    }));
  }, []);

  // 冒泡排序可视化
  const bubbleSort = async (initialData: DataItem[], delayMs: number, signal: AbortSignal) => {
    const arr = [...initialData];
    const n = arr.length;
    
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - i - 1; j++) {
        if (signal.aborted) return false;
        
        // 高亮比较的两个元素
        setData(prev => {
          const newData = clearHighlights(prev);
          newData[j].isComparing = true;
          newData[j + 1].isComparing = true;
          return newData;
        });
        
        await sleep(delayMs);
        
        if (arr[j].value > arr[j + 1].value) {
          // 高亮正在交换的元素
          setData(prev => {
            const newData = [...prev];
            newData[j].isSwapping = true;
            newData[j + 1].isSwapping = true;
            return newData;
          });
          
          await sleep(delayMs / 2);
          
          // 执行交换
          [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
          setData([...arr]);
          await sleep(delayMs / 2);
        }
        
        // 清除比较高亮
        setData(prev => clearHighlights(prev));
      }
      // 标记当前位置已排序
      setData(prev => {
        const newData = [...prev];
        newData[n - i - 1].isSorted = true;
        return newData;
      });
    }
    // 标记第一个元素已排序
    setData(prev => {
      const newData = [...prev];
      newData[0].isSorted = true;
      return newData;
    });
    
    return true;
  };

  // 选择排序可视化
  const selectionSort = async (initialData: DataItem[], delayMs: number, signal: AbortSignal) => {
    const arr = [...initialData];
    const n = arr.length;
    
    for (let i = 0; i < n - 1; i++) {
      let minIdx = i;
      
      // 高亮当前要比较的位置
      setData(prev => {
        const newData = clearHighlights(prev);
        newData[i].isComparing = true;
        return newData;
      });
      await sleep(delayMs);
      
      for (let j = i + 1; j < n; j++) {
        if (signal.aborted) return false;
        
        // 高亮正在比较的元素
        setData(prev => {
          const newData = [...prev];
          newData[j].isComparing = true;
          return newData;
        });
        await sleep(delayMs);
        
        if (arr[j].value < arr[minIdx].value) {
          minIdx = j;
          // 高亮新的最小值
          setData(prev => {
            const newData = [...prev];
            newData[minIdx].isSwapping = true;
            if (minIdx !== i) newData[i].isComparing = true;
            return newData;
          });
          await sleep(delayMs / 2);
        }
        
        // 清除比较高亮
        setData(prev => {
          const newData = clearHighlights(prev);
          newData[i].isComparing = true;
          return newData;
        });
      }
      
      if (minIdx !== i) {
        // 执行交换
        [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
        setData([...arr]);
        await sleep(delayMs);
      }
      
      // 清除高亮并标记已排序
      setData(prev => {
        const newData = clearHighlights(prev);
        newData[i].isSorted = true;
        return newData;
      });
    }
    
    setData(prev => {
      const newData = clearHighlights(prev);
      newData[n - 1].isSorted = true;
      return newData;
    });
    
    return true;
  };

  // 插入排序可视化
  const insertionSort = async (initialData: DataItem[], delayMs: number, signal: AbortSignal) => {
    const arr = [...initialData];
    const n = arr.length;
    
    for (let i = 1; i < n; i++) {
      if (signal.aborted) return false;
      
      let current = arr[i];
      let j = i - 1;
      
      // 高亮当前要插入的元素
      setData(prev => {
        const newData = clearHighlights(prev);
        newData[i].isComparing = true;
        return newData;
      });
      await sleep(delayMs);
      
      while (j >= 0 && arr[j].value > current.value) {
        if (signal.aborted) return false;
        
        // 高亮正在比较和移动的元素
        setData(prev => {
          const newData = clearHighlights(prev);
          newData[j].isComparing = true;
          newData[j + 1].isSwapping = true;
          return newData;
        });
        await sleep(delayMs);
        
        // 移动元素
        arr[j + 1] = arr[j];
        setData([...arr]);
        await sleep(delayMs / 2);
        
        j--;
      }
      
      arr[j + 1] = current;
      setData([...arr]);
      
      // 标记已排序部分
      setData(prev => {
        const newData = clearHighlights(prev);
        for (let k = 0; k <= i; k++) {
          newData[k].isSorted = true;
        }
        return newData;
      });
      await sleep(delayMs);
    }
    
    return true;
  };

  // 运行排序
  const runSort = useCallback(async () => {
    if (isSorting) return;
    
    abortControllerRef.current = new AbortController();
    setIsSorting(true);
    
    // 重置所有排序状态
    setData(prev => prev.map(item => ({
      ...item,
      isComparing: false,
      isSwapping: false,
      isSorted: false,
    })));
    
    let success = false;
    const currentData = [...data];
    
    switch (selectedAlgorithm) {
      case 'bubble':
        success = await bubbleSort(currentData, speed, abortControllerRef.current.signal);
        break;
      case 'selection':
        success = await selectionSort(currentData, speed, abortControllerRef.current.signal);
        break;
      case 'insertion':
        success = await insertionSort(currentData, speed, abortControllerRef.current.signal);
        break;
    }
    
    if (!success) {
      // 被中断时恢复原始数据
      setData(generateRandomData(20));
    }
    
    setIsSorting(false);
    abortControllerRef.current = null;
  }, [isSorting, selectedAlgorithm, speed, data]);

  // 停止排序
  const stopSort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsSorting(false);
    }
  }, []);

  // 获取算法名称
  const getAlgorithmName = (type: AlgorithmType): string => {
    switch (type) {
      case 'bubble': return '冒泡排序';
      case 'selection': return '选择排序';
      case 'insertion': return '插入排序';
      default: return '';
    }
  };

  // 获取算法时间复杂度
  const getTimeComplexity = (type: AlgorithmType): string => {
    switch (type) {
      case 'bubble': return 'O(n²)';
      case 'selection': return 'O(n²)';
      case 'insertion': return 'O(n²)';
      default: return '';
    }
  };

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '1200px',
      margin: '0 auto',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      {/* 标题 */}
      <div style={{
        textAlign: 'center',
        marginBottom: '24px'
      }}>
        <h1 style={{ margin: '0 0 8px 0', color: '#333' }}>
          排序算法可视化
        </h1>
        <p style={{ color: '#666', margin: 0 }}>
          观察不同排序算法的执行过程
        </p>
      </div>

      {/* 控制面板 */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* 算法选择 */}
          <div>
            <label style={{ marginRight: '8px', color: '#555' }}>算法：</label>
            <select
              value={selectedAlgorithm}
              onChange={(e) => setSelectedAlgorithm(e.target.value as AlgorithmType)}
              disabled={isSorting}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                fontSize: '14px',
                cursor: isSorting ? 'not-allowed' : 'pointer'
              }}
            >
              <option value="bubble">冒泡排序</option>
              <option value="selection">选择排序</option>
              <option value="insertion">插入排序</option>
            </select>
          </div>

          {/* 速度调节 */}
          <div>
            <label style={{ marginRight: '8px', color: '#555' }}>
              速度：{speed === 20 ? '快' : speed === 100 ? '中' : speed === 200 ? '慢' : '很慢'}
            </label>
            <input
              type="range"
              min="20"
              max="400"
              step="50"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              disabled={isSorting}
              style={{ width: '150px' }}
            />
          </div>

          {/* 操作按钮 */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={runSort}
              disabled={isSorting}
              style={{
                padding: '8px 24px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isSorting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                opacity: isSorting ? 0.6 : 1
              }}
            >
              开始排序
            </button>
            <button
              onClick={stopSort}
              disabled={!isSorting}
              style={{
                padding: '8px 24px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: !isSorting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                opacity: !isSorting ? 0.6 : 1
              }}
            >
              停止
            </button>
            <button
              onClick={resetData}
              disabled={isSorting}
              style={{
                padding: '8px 24px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isSorting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                opacity: isSorting ? 0.6 : 1
              }}
            >
              随机数据
            </button>
          </div>
        </div>

        {/* 算法信息 */}
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#f0f0f0',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <span style={{ fontWeight: 'bold' }}>{getAlgorithmName(selectedAlgorithm)}</span>
          <span style={{ marginLeft: '16px', color: '#666' }}>
            时间复杂度：{getTimeComplexity(selectedAlgorithm)}
          </span>
          <span style={{ marginLeft: '16px', color: '#666' }}>
            当前延迟：{speed}ms
          </span>
        </div>
      </div>

      {/* 柱状图 */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        minHeight: '400px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: '8px',
          height: '350px',
          padding: '10px'
        }}>
          {data.map((item, index) => (
            <div
              key={index}
              style={{
                flex: '1',
                height: `${item.value * 3}px`,
                minHeight: '4px',
                backgroundColor: item.isComparing ? '#FFC107' : (item.isSwapping ? '#FF5722' : (item.isSorted ? '#4CAF50' : '#2196F3')),
                borderRadius: '4px 4px 0 0',
                transition: 'height 0.1s ease, background-color 0.1s ease',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                fontSize: '11px',
                color: '#333',
                position: 'relative'
              }}
            >
              <span style={{
                position: 'absolute',
                bottom: '-20px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '10px',
                color: '#666'
              }}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 图例 */}
      <div style={{
        marginTop: '24px',
        display: 'flex',
        justifyContent: 'center',
        gap: '24px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '20px', height: '20px', backgroundColor: '#2196F3', borderRadius: '4px' }}></div>
          <span>未排序</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '20px', height: '20px', backgroundColor: '#FFC107', borderRadius: '4px' }}></div>
          <span>比较中</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '20px', height: '20px', backgroundColor: '#FF5722', borderRadius: '4px' }}></div>
          <span>交换中</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '20px', height: '20px', backgroundColor: '#4CAF50', borderRadius: '4px' }}></div>
          <span>已排序</span>
        </div>
      </div>
    </div>
  );
};

export default Algorithms;