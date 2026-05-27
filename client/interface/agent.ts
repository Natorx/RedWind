export interface ChatRequest {
  message: string;
  session_id?: string;
  auto_execute?: boolean;
}

export interface FileOperation {
  action: string;
  path: string | null;
  content: string | null;
  success: boolean;
  result: string | null;
  error: string | null;
}

export interface ChatResponse {
  message: string;
  session_id: string;
  file_operations: FileOperation[];
  need_rerun: boolean;
}

export interface Skill {
  name: string;
}