#!/usr/bin/env node

const net = require("net");

const ELECTRON_PORT = 9876;

function getMessage() {
  return new Promise((resolve) => {
    const chunks = [];
    let length = 0;

    process.stdin.once("data", (chunk) => {
      length = chunk.readUInt32LE(0);
      const message = chunk.slice(4);
      chunks.push(message);

      let receivedLength = message.length;

      const readMore = () => {
        if (receivedLength >= length) {
          const fullMessage = Buffer.concat(chunks).toString("utf8");
          resolve(JSON.parse(fullMessage));
        } else {
          process.stdin.once("data", (chunk) => {
            chunks.push(chunk);
            receivedLength += chunk.length;
            readMore();
          });
        }
      };

      readMore();
    });
  });
}

function sendMessage(msg) {
  const buffer = Buffer.from(JSON.stringify(msg));
  const header = Buffer.alloc(4);
  header.writeUInt32LE(buffer.length, 0);
  process.stdout.write(header);
  process.stdout.write(buffer);
}

async function main() {
  try {
    const message = await getMessage();

    const client = new net.Socket();

    client.connect(ELECTRON_PORT, "127.0.0.1", () => {
      client.write(JSON.stringify(message));
    });

    client.on("data", (data) => {
      const response = JSON.parse(data.toString());
      sendMessage(response);
      client.destroy();
      process.exit(0);
    });

    client.on("error", (err) => {
      sendMessage({
        success: false,
        message: "Electron bağlantı hatası: " + err.message,
      });
      process.exit(1);
    });
  } catch (error) {
    sendMessage({ success: false, message: error.message });
    process.exit(1);
  }
}

main();
