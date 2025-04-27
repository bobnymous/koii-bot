require('dotenv').config();
const WebSocket = require('ws');
const axios = require('axios');

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const MIN_TRADE_AMOUNT = 10000; // 50k KOII
const TEST_MODE = process.env.TEST_MODE === 'true';

const ws = new WebSocket('wss://api.gateio.ws/ws/v4/');

ws.on('open', function open() {
  console.log('Subscribed to KOII/USDT trades');
  ws.send(JSON.stringify({
    time: Date.now(),
    channel: 'spot.trades',
    event: 'subscribe',
    payload: ['KOII_USDT']
  }));

  if (TEST_MODE) {
    sendDiscordMessage({
      side: 'buy',
      amount: 123456,
      price: 0.042,
    });
  }
});

ws.on('message', async function incoming(data) {
  try {
    const tradeData = JSON.parse(data);
    console.log('Received Trade Data:', JSON.stringify(tradeData, null, 2)); // LOGGING

    if (tradeData.event !== 'update' || !tradeData.result) return;

    const trades = tradeData.result;
    const tradeList = Array.isArray(trades) ? trades : [trades];

    tradeList.forEach(async (trade) => {
      const amount = parseFloat(trade.amount);
      if (amount >= MIN_TRADE_AMOUNT) {
        await sendDiscordMessage(trade);
      }
    });
  } catch (error) {
    console.error('Error handling message:', error);
  }
});

async function sendDiscordMessage(trade) {
  const sideEmoji = trade.side === 'buy' ? '🟢' : '🔴';
  const content = `${sideEmoji} **${trade.side.toUpperCase()}** ${trade.amount} KOII at $${trade.price}`;

  try {
    await axios.post(DISCORD_WEBHOOK_URL, {
      content: content,
    });
    console.log('Sent Discord Alert:', content);
  } catch (error) {
    console.error('Error sending Discord message:', error);
  }
}
