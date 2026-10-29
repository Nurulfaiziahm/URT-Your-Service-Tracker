import net from 'node:net';

export async function smtpFixture() {
  const messages = [];
  const connections = new Set();
  let reject = false;
  const server = net.createServer((socket) => {
    connections.add(socket); socket.on('close', () => connections.delete(socket));
    socket.write('220 fixture.test ESMTP\r\n');
    let buffer = '', receiving = false, message = '';
    socket.on('data', (chunk) => {
      buffer += chunk.toString();
      while (buffer.includes('\r\n')) {
        const boundary = buffer.indexOf('\r\n');
        const line = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
        if (receiving) {
          if (line === '.') {
            receiving = false;
            if (reject) socket.write('550 Delivery rejected by fixture\r\n');
            else { messages.push(message); socket.write('250 Accepted\r\n'); }
            message = '';
          } else message += line + '\r\n';
        } else if (/^(EHLO|HELO)/i.test(line)) socket.write('250-fixture.test\r\n250 PIPELINING\r\n');
        else if (/^DATA/i.test(line)) { receiving = true; socket.write('354 End with dot\r\n'); }
        else if (/^QUIT/i.test(line)) socket.end('221 Bye\r\n');
        else socket.write('250 OK\r\n');
      }
    });
  });
  server.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  return { port: server.address().port, messages, reject(value) { reject = value; },
    async close() { for (const socket of connections) socket.destroy(); await new Promise((resolve) => server.close(resolve)); } };
}
