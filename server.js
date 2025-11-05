// server.js (Port 7703, Time Security, SET/VALUE, Tuesday Close)

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const moment = require('moment-timezone'); 
const path = require('path');
const axios = require('axios'); // Time Security အတွက်

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// *** 1. Configuration & Data Stores ***
const MYANMAR_TIMEZONE = 'Asia/Yangon'; 
const HOLD_DURATION_MINUTES = 10; 
const API_TIME_URL = 'http://worldtimeapi.org/api/timezone/Asia/Yangon'; // Time Security

const DRAW_TIMES_CONFIG = [
    { time: "10:00", label: "10:00 AM" }, // 10:00 ထွက်ပြီး 10:01 မှ Live စ
    { time: "12:00", label: "12:00 PM" },
    { time: "14:00", label: "2:00 PM" },
    { time: "16:00", label: "4:00 PM" },
    { time: "18:00", label: "6:00 PM" },
    { time: "20:00", label: "8:00 PM" }
];

let dailyResults = DRAW_TIMES_CONFIG.map(config => ({
    time: config.time,
    label: config.label,
    result: "--",
    drawnTime: null 
}));

let currentLiveResult = "--";
let currentSet = "--"; // New: SET ဂဏန်း
let currentValue = "--"; // New: VALUE ဂဏန်း
let liveResultStatus = "animating"; // "animating", "hold", or "closed"

// Server ရဲ့ Real-time ကို ထိန်းထားဖို့
let serverTime = moment().tz(MYANMAR_TIMEZONE);

// *** 2. Utility Functions ***

// API Time Service မှ အချိန်ကို ရယူခြင်း (Time Security)
async function fetchServerTime() {
    try {
        const response = await axios.get(API_TIME_URL);
        const datetime = response.data.datetime;
        serverTime = moment(datetime).tz(MYANMAR_TIMEZONE);
        console.log(`[Time Sync] Server Time: ${serverTime.format('YYYY-MM-DD HH:mm:ss')}`);
    } catch (error) {
        console.error("[Time Sync] Error fetching API time. Using system time.", error.message);
        serverTime = moment().tz(MYANMAR_TIMEZONE);
    }
}
// 1 မိနစ်တိုင်း အချိန်ကို စစ်ဆေးပါ
setInterval(fetchServerTime, 60000); 

function getMyanmarTime() {
    return serverTime; // API မှ ရယူထားသော Server Time ကိုသာ အသုံးပြုမည်
}

function generateSetAndValue() {
    // 000.00 မှ 999.99 အတွင်း Random ဂဏန်းတစ်ခု ဖန်တီးပါ
    const floatNumber = Math.random() * 999.99;
    const numberStr = floatNumber.toFixed(2); // ဥပမာ: "123.45"
    
    // VALUE: ဒသမရဲ့ အရှေ့ဆုံး ဂဏန်း (ဥပမာ: 123.45 မှ 3)
    const valueDigit = numberStr.split('.')[0].slice(-1);
    
    // SET: ဒသမရဲ့ နောက်ဆုံး ဂဏန်း (ဥပမာ: 123.45 မှ 5)
    const setDigit = numberStr.split('.')[1].slice(-1);

    return { set: setDigit, value: valueDigit };
}

function generate2D() {
    const { set, value } = generateSetAndValue();
    return {
        result: value + set, // ဥပမာ: Value=3, Set=5 ဆိုရင် 35
        set: set,
        value: value
    };
}
// ... (resetDailyResults function သည် ယခင်အတိုင်း ထားရှိပါမည်) ...
function resetDailyResults(myanmarTime) {
    if (myanmarTime.hour() === 0 && myanmarTime.minute() === 5) {
        dailyResults = DRAW_TIMES_CONFIG.map(config => ({
            time: config.time,
            label: config.label,
            result: "--",
            drawnTime: null 
        }));
        currentLiveResult = "--";
        currentSet = "--";
        currentValue = "--";
        liveResultStatus = "animating";
    }
}


// *** 3. Core Logic (Tuesday Close & Draw) ***

function checkDrawTimeAndPublish() {
    const now = getMyanmarTime();
    resetDailyResults(now);

    // *** အင်္ဂါနေ့ စစ်ဆေးခြင်း (2 = Tuesday) ***
    if (now.day() === 2) {
        currentLiveResult = "--";
        currentSet = "--"; 
        currentValue = "--";
        liveResultStatus = "closed"; 
        dailyResults.forEach(d => {
            d.result = "--"; 
            d.drawnTime = null;
        });
        broadcastResults();
        return; 
    }

    let shouldAnimate = true; 

    for (let i = 0; i < dailyResults.length; i++) {
        const draw = dailyResults[i];
        const timeConfig = DRAW_TIMES_CONFIG[i];
        
        // ဂဏန်းထွက်ရမည့် အချိန် (10:00 AM)
        const drawTimeMoment = moment.tz(`${now.format('YYYY-MM-DD')} ${timeConfig.time}`, 'YYYY-MM-DD HH:mm', MYANMAR_TIMEZONE);
        
        // ဂဏန်းစပြီး Live စရမည့် အချိန် (10:00 AM ထွက်ပြီး 10:10 AM မှာ Animation ပြန်စ)
        const startAnimationTime = drawTimeMoment.clone().add(HOLD_DURATION_MINUTES, 'minutes');

        // A. Draw Time ရောက်လျှင် (10:00:00 မှ 10:00:59 အတွင်း)
        if (now.isSame(drawTimeMoment, 'minute') && draw.result === "--") {
            const { result, set, value } = generate2D();
            
            draw.result = result;
            draw.drawnTime = now.clone(); 
            currentLiveResult = result; 
            currentSet = set;
            currentValue = value;
            liveResultStatus = "hold"; 
            shouldAnimate = false;
        }

        // B. Hold Time အတွင်း ရှိနေပါက (10:00:00 မှ 10:09:59 အတွင်း)
        if (draw.drawnTime) {
            const holdUntil = drawTimeMoment.clone().add(HOLD_DURATION_MINUTES, 'minutes');
            
            if (now.isBefore(holdUntil)) { // 10:10 AM မတိုင်ခင်ဆိုရင် ရပ်ထား
                currentLiveResult = draw.result; 
                currentSet = draw.result[1]; // ထွက်ပြီးသားဂဏန်းရဲ့ နောက်ဆုံးဂဏန်း
                currentValue = draw.result[0]; // ထွက်ပြီးသားဂဏန်းရဲ့ ရှေ့ဆုံးဂဏန်း
                liveResultStatus = "hold";
                shouldAnimate = false;
            } else {
                draw.drawnTime = null; // Hold ပြီးလို့ Animation ပြန်စတော့မယ်
            }
        }
    }

    // C. Animation ပြန်စတင်ခြင်း
    if (shouldAnimate) {
        // Animation ပြန်စတင်တဲ့အခါ SET/VALUE ကို Random ပြန်ထုတ်ပေးရပါမယ်
        const { set, value } = generateSetAndValue();
        currentLiveResult = "--"; 
        currentSet = set;
        currentValue = value;
        liveResultStatus = "animating";
    }
    
    broadcastResults();
}

// 2 စက္ကန့်တိုင်း စစ်ဆေးပါ
setInterval(checkDrawTimeAndPublish, 2000); 

function broadcastResults() {
    const dataToSend = {
        live: currentLiveResult,
        set: currentSet,
        value: currentValue,
        daily: dailyResults,
        status: liveResultStatus, 
        timestamp: getMyanmarTime().format('DD/MM/YYYY hh:mm:ss A') 
    };

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(dataToSend));
        }
    });
}

wss.on('connection', ws => {
    console.log('Client connected');
    broadcastResults(); 
});

app.use(express.static(path.join(__dirname, '.')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// *** PORT 7703 ကို တိုက်ရိုက် သတ်မှတ်ခြင်း ***
const PORT = 7703; 

// အရင်ဆုံး Time ကို စစ်ဆေးပြီးမှ Server စတင်ပါ
fetchServerTime().then(() => {
    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        checkDrawTimeAndPublish(); 
    });
});
