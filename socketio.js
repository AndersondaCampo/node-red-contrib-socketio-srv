module.exports = function(RED) {
  const { Server } = require("socket.io");
  var io;
  var customProperties = {};

  function socketIoConfig(n) {
    RED.nodes.createNode(this, n);
    var node = this;
    this.port = n.port || 80;
    this.sendClient = n.sendClient;
    this.path = n.path || "/socket.io";
    this.bindToNode = n.bindToNode || false;

    if (this.bindToNode) {
      io = new Server(RED.server);
    } else {
      io = new Server();
      io.serveClient(node.sendClient);
      io.path(node.path);
      io.listen(node.port);
    }
    var bindOn = this.bindToNode
      ? "bind to Node-red port"
      : "on port " + this.port;
    node.log("Created server " + bindOn);

    node.on("close", function() {
      io.close();
    });
  }


  RED.nodes.registerType("socketio-config", socketIoConfig);
}