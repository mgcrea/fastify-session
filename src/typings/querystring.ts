/**
 * Option to decode session from querystring.
 *
 * For example, if you want to use
 * session with websocket
 */
export interface QuerystringOptions {
  key: string;
  paths?: string | string[];
}

export interface Querystring {
  [key: string]: string;
}
