const WebSocket = require('ws');
const axios = require('axios');
require('dotenv').config();

const GATE_WS_URL = 'wss://api.gateio.ws/ws/v4/';
const MIN_TRADE_AMOUNT = 50000; // 50,000 KOII minimum for whale alert

const ws = new WebSocket(GATE_WS_URL);

ws.on('open', () => {
  console.log('Subscribed to KOII/USDT trades');

  const subscribeMessage = {
    time: Date.now(),
    channel: "spot.trades",
    event: "subscribe",
    payload: ["KOII_USDT"]
  };

  ws.send(JSON.stringify(subscribeMessage));

  if (process.env.TEST_MODE === 'true') {
    sendTestAlert();
  }
});

ws.on('message', async function incoming(data) {
  const tradeData = JSON.parse(data);

  if (tradeData.event === 'update' && tradeData.channel === 'spot.trades') {
    const trades = tradeData.result;
    const tradeList = Array.isArray(trades) ? trades : [trades];

    tradeList.forEach(async (trade) => {
      const amount = parseFloat(trade.amount);
      const price = parseFloat(trade.price);
      const totalValue = amount * price;

      if (amount >= MIN_TRADE_AMOUNT) {
        const message = {
          content: `🚨 **KOII Whale Alert!** 🚨\n` +
                   `🐋 **Whale Trade Detected!**\n` +
                   `📈 **Amount:** ${amount.toLocaleString()} KOII\n` +
                   `💵 **Price:** $${price}\n` +
                   `🔥 **Total Value:** $${totalValue.toFixed(2)}\n` +
                   `🏦 **Exchange:** Gate.io\n` +
                   `⏰ **Time:** ${new Date().toUTCString()}`
        };

        try {
          await axios.post(process.env.DISCORD_WEBHOOK_URL, message);
          console.log('Whale alert sent to Discord.');
        } catch (error) {
          console.error('Error sending alert to Discord:', error.response ? error.response.data : error.message);
        }
      }
    });
  }
});

async function sendTestAlert() {
  const amount = 99999;
  const price = 0.05;
  const totalValue = amount * price;

  const message = {
    content: `🚨 **KOII Whale Alert (TEST)** 🚨\n` +
             `🐋 **Whale Trade Detected!**\n` +
             `📈 **Amount:** ${amount.toLocaleString()} KOII\n` +
             `💵 **Price:** $${price}\n` +
             `🔥 **Total Value:** $${totalValue.toFixed(2)}\n` +
             `🏦 **Exchange:** Gate.io (Simulated)\n` +
             `⏰ **Time:** ${new Date().toUTCString()}`
  };

  try {
    await axios.post(process.env.DISCORD_WEBHOOK_URL, message);
    console.log('✅ Test whale alert sent to Discord.');
  } catch (error) {
    console.error('Error sending test alert:', error.response ? error.response.data : error.message);
  }
}