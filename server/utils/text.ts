export function cleanStatsText(text: string): string {
  if (!text) return '';
  
  // 移除空格、换行等
  let cleaned = text.replace(/\s+/g, '').trim();
  
  // 移除可能存在的特殊符号
  cleaned = cleaned.replace(/[·•]/g, '');
  
  // 如果包含"万"，保留但可以后续处理
  // 例如："123.4万" 保持不变
  
  return cleaned;
}