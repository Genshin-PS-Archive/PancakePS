let port = 80;
let host = 'localhost'; // dont change

const { O_NONBLOCK } = require("constants");
const fs = require("fs")
var net = require('net');
const dataUtil = require('./util/dataUtil');
const server = net.createServer();

// Creates the TCP Server
// Im lazy enough to make a src file for it.
server.listen(42472, host, () => {
    console.log('TCP Server is running on port ' + 42472 + '.');
});

server.on('connection', function (sock) {
    console.log('CONNECTED: ' + sock.remoteAddress + ':' + sock.remotePort);

    sock.on('data', function (data) {
        console.log('DATA ' + sock.remoteAddress + ': \n' + data);
        // Write the data back to all the connected, the client will receive it as data from the server
        sock.write("0x0");
    });
});



//let udpsv = new udpProxy('0.0.0.0', '47.90.134.149', 22101);
//udpsv.init();



// Executes the HTTP Server.
require("./src/httpserver").execute(port, host);


async function executePRoxies( ){
    // Executes the UDP Server.
    //require("./src/udpserver").execute(22102, host);
   // udpProxy.execute(22102, host); //nod
   // udpProxy.execute(42472, host);

    require("./src/server").execute(22102);
    //require("./src/server").execute(22101);
    
    /*
    const name = 'GetShopRsp'; // GetWidgetSlotRsp
    let num = "4"
    
    const a = await dataUtil.dataToProtobuffer(fs.readFileSync("./bin/" + name + num + ".bin"), dataUtil.getPacketIDByProtoName(name))
    console.log(require('util').inspect(a, false, null, true))
    */

}

executePRoxies();


