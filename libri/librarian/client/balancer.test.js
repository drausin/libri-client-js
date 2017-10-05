
import * as balancer from './balancer';

test('enough next() calls should create all clients', () => {
  const addrs = ['1.2.3.4:8080', '1.2.3.4:8081', '1.2.3.4:8082'];
  const b = new balancer.UniformBalancer(addrs);

  for (let c = 0; c < 16; c++) { // should be enough to hit each addr
    const lc = b.next();
    expect(lc).toBeTruthy();
  }

  for (let i = 0; i < b.clients.length; i++) {
    expect(b.clients[i]).toBeTruthy();
  }

  b.closeAll(); // test just that this doesn't throw error
});
