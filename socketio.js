module.exports = function (RED) {
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

    node.on("close", function () {
      io.close();
    });
  }

  function socketIoIn(n) {
    RED.nodes.createNode(this, n);
    var node = this;
    this.name = n.name;
    this.server = RED.nodes.getNode(n.server);
    this.rules = n.rules || [];

    this.specialIOEvent = [
      // Events emitted by the Manager:
      { v: "open" },
      { v: "error" },
      { v: "close" },
      { v: "ping" },
      { v: "packet" },
      { v: "reconnect_attempt" },
      { v: "reconnect" },
      { v: "reconnect_error" },
      { v: "reconnect_failed" },

      // Events emitted by the Socket:
      { v: "connect" },
      { v: "connect_error" },
      { v: "disconnect" }
    ];

    function addListener(socket, val, i) {
      socket.on(val.v, function (msgin) {
        var msg = {};
        RED.util.setMessageProperty(msg, "payload", msgin, true);
        RED.util.setMessageProperty(msg, "socketIOEvent", val.v, true);
        RED.util.setMessageProperty(msg, "socketIOId", socket.id, true);
        if (
          customProperties[RED.util.getMessageProperty(msg, "socketIOId")] !=
          null
        ) {
          RED.util.setMessageProperty(
            msg,
            "socketIOStaticProperties",
            customProperties[RED.util.getMessageProperty(msg, "socketIOId")],
            true
          );
        }
        node.send(msg);
      });
    }

    io.on("connection", function (socket) {
      node.rules.forEach(function (val, i) {
        addListener(socket, val, i);
      });
      //Adding support for all other special messages
      node.specialIOEvent.forEach(function (val, i) {
        addListener(socket, val, i);
      });
    });
  }



  RED.nodes.registerType("socketio-config", socketIoConfig);
  RED.nodes.registerType("socketio-in", socketIoIn);
}