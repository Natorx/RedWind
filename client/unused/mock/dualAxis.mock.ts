export const dualAxisData = [
  {
    label: '销售额',
    color: '#3B82F6',
    data: [
      { x: 'Q1', y: 1200 },
      { x: 'Q2', y: 1800 },
      { x: 'Q3', y: 1500 },
      { x: 'Q4', y: 2200 },
    ],
    axis: 'left' as const,
    unit: '万元'
  },
  {
    label: '订单量',
    color: '#10B981',
    data: [
      { x: 'Q1', y: 450 },
      { x: 'Q2', y: 680 },
      { x: 'Q3', y: 520 },
      { x: 'Q4', y: 780 },
    ],
    axis: 'left' as const,
    unit: '单'
  },
  {
    label: '利润率',
    color: '#F59E0B',
    data: [
      { x: 'Q1', y: 18.5 },
      { x: 'Q2', y: 22.3 },
      { x: 'Q3', y: 20.1 },
      { x: 'Q4', y: 25.6 },
    ],
    axis: 'right' as const,
    unit: '%'
  },
  {
    label: '客户满意度',
    color: '#8B5CF6',
    data: [
      { x: 'Q1', y: 4.2 },
      { x: 'Q2', y: 4.5 },
      { x: 'Q3', y: 4.3 },
      { x: 'Q4', y: 4.7 },
    ],
    axis: 'right' as const,
    unit: '分'
  }
];
