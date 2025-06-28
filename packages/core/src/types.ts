export interface LaunchOpts {
  headless?: boolean;
  timeout?: number;
  [key: string]: any;
}

export interface Session {
  id: string;
  [key: string]: any;
}

export interface Driver {
  launch(opts: LaunchOpts): Promise<Session>;
  navigate?(session: Session, url: string): Promise<void>;
  click(session: Session, selector: string): Promise<void>;
  type?(session: Session, selector: string, text: string): Promise<void>;
  screenshot?(session: Session, path?: string): Promise<string>;
  evaluate?(session: Session, script: string): Promise<any>;
  waitForSelector?(session: Session, selector: string, timeout?: number): Promise<void>;
  close?(session: Session): Promise<void>;
}

export interface ServerOpts {
  driver: Driver;
  name: string;
  version?: string;
}

export interface ToolResult {
  content: Array<{
    type: "text" | "image";
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}