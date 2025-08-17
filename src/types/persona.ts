export interface Persona {
  name: string;
  tagline: string;
  tags: string[];
  longDescription: string; // background, personality, story (markdown ok)
  raw?: Record<string, any>; // optional full JSON from LLM
}

export interface GenerateRequest { 
  text: string; 
  imageUrl?: string;
  url?: string;
}

export interface GenerateResponse { 
  persona: Persona;
  draftId?: string;
} 