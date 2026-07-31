declare module '*';
declare namespace JSX {
  interface IntrinsicElements { [elementName: string]: any }
}

declare const process: { cwd(): string; exitCode?: number; exit(code?: number): never };
