import * as libgrpc from '../../librarian/api/librarian_grpc_pb';
import * as grpc from 'grpc';
const seedrandom = require('seedrandom');

/**
 * Selects a client uniformly at random.
 */
export class UniformBalancer {
  rng: seedrandom;
  addresses: string[];
  clients: libgrpc.LibrarianClient[];

  /**
   * @param {string[]} addresses - array of librarian servers to balance
   * connections between
   */
  constructor(addresses: string[]) {
    this.addresses = addresses;
    this.rng = seedrandom(addresses.length);
    this.clients = [];
  }

  /**
   * Select the next librarian client.
   *
   * @return {libgrpc.LibrarianClient}
   */
  next(): libgrpc.LibrarianClient {
    const i = Math.floor(this.rng() * this.addresses.length);
    if (this.clients[i] === undefined) {
      this.clients[i] = new libgrpc.LibrarianClient(this.addresses[i],
          grpc.credentials.createInsecure());
      let deadline = new Date();
      deadline.setSeconds(deadline.getSeconds() + 5);
      this.clients[i].waitForReady(deadline, (arg) => {
        console.log(arg);
      });
    }
    return this.clients[i];
  }

  /**
   * Close all client connections to librarian.
   */
  closeAll() {
    for (let i = 0; i < this.clients.length; i++) {
      this.clients[i].close();
    }
  }
}


