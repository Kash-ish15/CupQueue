const os = require('os');
const nics = os.networkInterfaces();
const ipv4s = [];
for (const name in nics) {
    for (const net of nics[name]) {
        if (net.family === 'IPv4' && !net.internal) {
            ipv4s.push(net.address);
        }
    }
}
console.log(ipv4s.join('\n'));
