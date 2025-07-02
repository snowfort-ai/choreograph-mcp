import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ServerOpts, Session } from "./types.js";
export declare class MCPServer {
    private opts;
    protected server: Server;
    private driver;
    private sessions;
    constructor(opts: ServerOpts);
    private setupHandlers;
    protected getSession(sessionId: string): Promise<Session>;
    protected handleClick(sessionId: string, selector: string): Promise<void>;
    protected handleType(sessionId: string, selector: string, text: string): Promise<void>;
    protected handleScreenshot(sessionId: string, path?: string): Promise<string>;
    protected handleEvaluate(sessionId: string, script: string): Promise<any>;
    protected handleWaitForSelector(sessionId: string, selector: string, timeout?: number): Promise<void>;
    protected handleClose(sessionId: string): Promise<void>;
    protected addSession(session: Session): void;
    run(): Promise<void>;
}
export declare function runServer(opts: ServerOpts): Promise<void>;
//# sourceMappingURL=server.d.ts.map