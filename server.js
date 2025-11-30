// server.js (Final Version: SET/VALUE Hidden, 5s Update, Time Security)

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const moment = require('moment-timezone'); 
const path = require('path');
const axios = require('axios'); 

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// *** UptimeRobot အတွက် Health Check Route ***
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        serverTime: getMyanmarTime().format('DD/MM/YYYY HH:mm:ss'),
        liveResult: currentLiveResult,
        message: 'China 2D Server is running normally'
    });
});
// *** 1. Configuration & Data Stores ***
const MYANMAR_TIMEZONE = 'Asia/Yangon'; 
const HOLD_DURATION_MINUTES = 10; 
const API_TIME_URL = 'http://worldtimeapi.org/api/timezone/Asia/Yangon'; 

const DRAW_TIMES_CONFIG = [
    { time: "16:00", label: "4:00 PM" }, 
    { time: "16:30", label: "4:30 PM" },
    { time: "17:00", label: "5:00 PM" },
    { time: "17:30", label: "5:30 PM" },
    { time: "18:00", label: "6:00 PM" },
    { time: "18:30", label: "6:30 PM" }
];

let dailyResults = DRAW_TIMES_CONFIG.map(config => ({
    time: config.time,
    label: config.label,
    result: "--",
    drawnTime: null 
}));

let currentLiveResult = "--";
let currentSet = "------"; 
let currentValue = "--------"; 
let liveResultStatus = "animating"; 

let serverTime = moment().tz(MYANMAR_TIMEZONE);

// *** 2. Utility Functions ***

async function fetchServerTime() {
    try {
        const response = await axios.get(API_TIME_URL);
        const datetime = response.data.datetime;
        serverTime = moment(datetime).tz(MYANMAR_TIMEZONE);
        // console.log(`[Time Sync] Server Time: ${serverTime.format('YYYY-MM-DD HH:mm:ss')}`); // Log ကို ဖျက်ထားသည်
    } catch (error) {
        // Time Sync Error ပေါ်ရင် system time ကို သုံးမည်
        // console.error("[Time Sync] Error fetching API time. Using system time.", error.message); // Log ကို ဖျက်ထားသည်
        serverTime = moment().tz(MYANMAR_TIMEZONE);
    }
}
setInterval(fetchServerTime, 1000); 

function getMyanmarTime() {
    const now = serverTime;
    
    // ✅ Freeze Time Check - 10မိနစ်အတွင်း Time ရပ်ထားမယ်
    for (let i = 0; i < dailyResults.length; i++) {
        const draw = dailyResults[i];
        const timeConfig = DRAW_TIMES_CONFIG[i];
        
        if (draw.drawnTime) {
            const drawTimeMoment = moment.tz(`${now.format('YYYY-MM-DD')} ${timeConfig.time}`, 'YYYY-MM-DD HH:mm', MYANMAR_TIMEZONE);
            const holdUntil = drawTimeMoment.clone().add(HOLD_DURATION_MINUTES, 'minutes');
            
            // 10မိနစ်အတွင်း ဆို ဂဏန်းထွက်ချိန်ကိုပဲ return ပြန်မယ်
            if (now.isBefore(holdUntil)) {
                return drawTimeMoment; // Freeze at exact draw time (6:30 PM, 7:00 PM, etc.)
            }
        }
    }
    
    return now; // Normal time - 10မိနစ်ကျော်ရင် ပုံမှန်အလုပ်လုပ်
}

function resetDailyResults(myanmarTime) {
    if (myanmarTime.hour() === 0 && myanmarTime.minute() === 5) {
        dailyResults = DRAW_TIMES_CONFIG.map(config => ({
            time: config.time,
            label: config.label,
            result: "--",
            drawnTime: null 
        }));
        currentLiveResult = "--";
        currentSet = "------";
        currentValue = "--------";
        liveResultStatus = "animating";
    }
}

// ** SET/VALUE ဂဏန်းများကို Format အသစ်ဖြင့် ထုတ်လုပ်ခြင်း **
function generateSetAndValue() {
    // SET (ဒသမအပါ ၆ လုံး) - ဥပမာ: 123.456
    const setNum = Math.random() * 999.999;
    const setStr = setNum.toFixed(3); 
    
    // VALUE (ဒသမအပါ ၈ လုံး) - ဥပမာ: 1234.5678
    const valueNum = Math.random() * 9999.9999;
    const valueStr = valueNum.toFixed(4); 

    // 2D ဂဏန်းထုတ်ဖို့အတွက် VALUE ရဲ့ နောက်ဆုံးဂဏန်း နဲ့ SET ရဲ့ နောက်ဆုံးဂဏန်းကို ယူပါ
    const resultValueDigit = valueStr.slice(-1);
    const resultSetDigit = setStr.slice(-1);

    return { 
        result: resultValueDigit + resultSetDigit, 
        set: setStr, 
        value: valueStr 
    };
}


function checkDrawTimeAndPublish() {
    const now = getMyanmarTime();
    resetDailyResults(now);

    // *** အင်္ဂါနေ့ စစ်ဆေးခြင်း ***
    if (now.day() === 2) {
        currentLiveResult = "--";
        currentSet = "------"; 
        currentValue = "--------";
        liveResultStatus = "closed"; 
        dailyResults.forEach(d => {
            d.result = "--"; 
            d.drawnTime = null;
        });
        broadcastResults();
        return; 
    }

    let shouldAnimate = true; 
    let isInHoldPeriod = false; // ✅ အသစ်ထည့်ပါ

    for (let i = 0; i < dailyResults.length; i++) {
        const draw = dailyResults[i];
        const timeConfig = DRAW_TIMES_CONFIG[i];
        
        const drawTimeMoment = moment.tz(`${now.format('YYYY-MM-DD')} ${timeConfig.time}`, 'YYYY-MM-DD HH:mm', MYANMAR_TIMEZONE);

        // A. Draw Time ရောက်လျှင်
        if (now.isSame(drawTimeMoment, 'minute') && draw.result === "--") {
            const { result, set, value } = generateSetAndValue(); 
            
            draw.result = result;
            draw.drawnTime = now.clone(); 
            currentLiveResult = result; 
            currentSet = set;
            currentValue = value;
            liveResultStatus = "hold"; 
            shouldAnimate = false;
            isInHoldPeriod = true; // ✅ အသစ်ထည့်ပါ
        }

        // B. Hold Time အတွင်း ရှိနေပါက
        if (draw.drawnTime) {
            const holdUntil = drawTimeMoment.clone().add(HOLD_DURATION_MINUTES, 'minutes');
            
            if (now.isBefore(holdUntil)) { 
                currentLiveResult = draw.result; 
                
                // Hold အချိန်မှာ SET/VALUE ကို ထွက်ဂဏန်းနဲ့ ကိုက်အောင် ပြန်ညှိခြင်း (Logic သက်သက်)
                // ဥပမာ: 2D result 56 ထွက်ရင်၊ SET/VALUE ကို 5 နဲ့ 6 အဆုံးသတ်တဲ့ ဂဏန်းအဖြစ် Random ထုတ်ပါ
                const heldSetNum = Math.random() * 999.990; 
                const heldValueNum = Math.random() * 9999.9990;
                
                currentSet = heldSetNum.toFixed(3).slice(0, 5) + draw.result[1]; 
                currentValue = heldValueNum.toFixed(4).slice(0, 7) + draw.result[0]; 
                
                liveResultStatus = "hold";
                shouldAnimate = false;
                isInHoldPeriod = true; // ✅ အသစ်ထည့်ပါ
            } else {
                draw.drawnTime = null; 
            }
        }
    }

    // C. Animation ပြန်စတင်ခြင်း
    if (shouldAnimate && !isInHoldPeriod) { // ✅ condition ပြင်ပါ
        const { set, value } = generateSetAndValue(); 
        currentLiveResult = "--"; 
        currentSet = set;
        currentValue = value;
        liveResultStatus = "animating";
    }
    
    broadcastResults();
}

// *** 10 စက္ကန့်တိုင်း စစ်ဆေးပါ (Animation Interval) ***
setInterval(checkDrawTimeAndPublish, 10000); 

function broadcastResults() {
    const dataToSend = {
        live: currentLiveResult,
        set: currentSet,
        value: currentValue,
        daily: dailyResults,
        status: liveResultStatus,  
        timestamp: getMyanmarTime().format('DD/MM/YYYY hh:mm:ss A') // ✅ Freeze time သုံးမယ်
    };

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(dataToSend));
        }
    });
}

wss.on('connection', ws => {
    // console.log('Client connected'); // Log ကို ဖျက်ထားသည်
    broadcastResults(); 
});

app.use(express.static(path.join(__dirname, '.')));


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html')); // ✅ current directory
});

// *** PORT 7703 ***
const PORT = 7703 ; 

fetchServerTime().then(() => {
    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        checkDrawTimeAndPublish(); 
    });
});
