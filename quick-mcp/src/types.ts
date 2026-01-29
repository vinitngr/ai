type Transport =
  | {
      type: "stdio";
      banner?: boolean;
    }
  | {
      type: "http";
      port: number;
      host?: string;
      banner?: boolean;
      cors?: boolean;
      maxBodySize?: number;
    };

type RunConfig = {
  name: string;
  version?: string;
  tools: Record<
    string,
    {
      schema: any;
      run: (args: any) => any | Promise<any>;
      description?: string;
    }
  >;
  transport: Transport;

  logLevel?: "silent" | "info" | "debug";
  jsonIndent?: number;
};
