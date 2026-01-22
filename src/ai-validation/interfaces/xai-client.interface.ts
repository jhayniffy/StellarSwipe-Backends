export interface XaiUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface XaiChoice {
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
  index: number;
}

export interface XaiResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: XaiChoice[];
  usage: XaiUsage;
}

export interface ValidationResult {
  score: number;
  feedback: string;
  isSpam: boolean;
}
