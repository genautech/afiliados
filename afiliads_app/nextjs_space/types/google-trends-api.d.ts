declare module 'google-trends-api' {
  export function interestOverTime(options: {
    keyword: string;
    startTime: Date;
    endTime: Date;
    geo?: string;
  }): Promise<string>;
}
