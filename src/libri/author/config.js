// @flow

import * as publish from './io/publish';
import * as page from './io/page';

const defaultLibrarianIP = 'localhost';
const defaultLibrarianPort = '20100';

/**
 * Author config.
 */
export class Config {
  librarianAddrs: string[];
  publish: publish.Parameters;
  pageSize: number;

  /**
   * Create default config.
   */
  constructor() {
    this.librarianAddrs = [defaultLibrarianIP + ':' + defaultLibrarianPort];
    this.publish = publish.newDefaultParameters();
    this.pageSize = page.defaultSize;
  }
}
