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

    node.on("close", () => {
      io.close();
    });
  }

  function socketIoIn(n) {
    RED.nodes.createNode(this, n);
    var node = this;
    this.name = n.name;
    this.server = RED.nodes.getNode(n.server);
    this.rules = n.rules || [];

    function emitREDMessage(socket, val, msgin) {
      var msg = {};
      RED.util.setMessageProperty(msg, "payload", msgin, true);
      RED.util.setMessageProperty(msg, "socketIOServer", io, true);
      RED.util.setMessageProperty(msg, "socketIOEvent", val.v, true);
      RED.util.setMessageProperty(msg, "socketIOId", socket.id, true);
      RED.util.setMessageProperty(msg, "socketIO", socket, true);
      node.send(msg);
    }

    io.on("connection", (socket) => {
      node.rules.forEach((val, i) => {
        socket.on(val.v, (msgin) => {
          emitREDMessage(socket, val, msgin);
        });
      });
    });
  }

  function socketIoOut(n) {
    RED.nodes.createNode(this, n);
    var node = this;
    this.name = n.name;
    this.server = RED.nodes.getNode(n.server);

    node.on("input", function (msg) {
      const socketIOEvent = RED.util.getMessageProperty(msg, "socketIOEvent");
      const socketIOId = RED.util.getMessageProperty(msg, "socketIOId");
      const socketIO = RED.util.getMessageProperty(msg, "socketIO");
      const socketIOServer = RED.util.getMessageProperty(msg, "socketIOServer");

      if (!socketIOEvent) {
        node.error("socketIOEvent not set");
        return;
      }

      if (!socketIOId) {
        node.error("socketIOId not set");
        return;
      }

      switch (socketIOEvent) {
        case "broadcast.emit":
          //Return to all but the caller
          socketIOServer.emit(socketIOEvent, msg.payload);
          break;
        case "emit":
          //Return only to the caller
          socketIO.emit(socketIOEvent, msg.payload);
          break;
        case "room":
          //emit to all
          if (msg.room) {
            socketIOServer.to(msg.room).emit(socketIOEvent, msg.payload);
          }
          break;
        default:
          //emit to all
          socketIOServer.emit(socketIOEvent, msg.payload);
      }
    });
  }

  function socketIoJoinRoom(n) {
    RED.nodes.createNode(this, n);
    var node = this;
    this.name = n.name;
    this.server = RED.nodes.getNode(n.server);

    node.on("input", function (msg) {
      const socketIOId = RED.util.getMessageProperty(msg, "socketIOId");
      const socketIO = RED.util.getMessageProperty(msg, "socketIO");
      const socketIOServer = RED.util.getMessageProperty(msg, "socketIOServer");

      if (!socketIOId) {
        node.error("socketIOId not set");
        return;
      }

      if (!msg.room) {
        node.error("room not set");
        return;
      }

      socketIO.join(msg.room);
    });
  }

  RED.nodes.registerType("socketio-config", socketIoConfig);
  RED.nodes.registerType("socketio-in", socketIoIn);
  RED.nodes.registerType("socketio-out", socketIoOut);
  RED.nodes.registerType("socketio-join-room", socketIoJoinRoom);
}
