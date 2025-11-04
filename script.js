// public/script.js (Port 7702 အတွက် ပြင်ဆင်ထားသည်)

document.addEventListener('DOMContentLoaded', () => {
    // *** Configuration ***
    // Termux Server (Localhost) ကို Port 7702 ဖြင့် တိုက်ရိုက် ချိတ်ဆက်ရန်
    const WS_URL = "ws://127.0.0.1:7702"; // ပြောင်းလဲလိုက်ပြီ
    const ANIMATION_INTERVAL = 5000; 
    
    // *** DOM Elements ***
    const liveNumberElement = document.getElementById('animating-2d');
    const digit1Element = document.getElementById('digit1');
    const digit2Element = document.getElementById('digit2');
    const checkmarkElement = document.getElementById('checkmark');
    const updatedTimeElement = document.getElementById('last-updated-time');
    
    const resultBoxes = Array.from({length: 6}, (_, i) => document.getElementById(`result-box-${i}`));

    let animationTimer = null; 

    // *** Utility Functions (generateRandom2D, startAnimation, stopAnimation) များသည် ယခင်အတိုင်း ထားရှိပါမည်။ ***

    function generateRandom2D() {
        const number = Math.floor(Math.random() * 100); 
        return number.toString().padStart(2, '0'); 
    }

    function startAnimation() {
        if (animationTimer) return; 
        liveNumberElement.classList.add('blinking'); 
        animationTimer = setInterval(() => {
            const new2D = generateRandom2D();
            digit1Element.textContent = new2D[0];
            digit2Element.textContent = new2D[1];
        }, ANIMATION_INTERVAL); 
    }
    
    function stopAnimation(finalNumber) {
        if (animationTimer) {
            clearInterval(animationTimer);
            animationTimer = null;
        }
        liveNumberElement.classList.remove('blinking'); 
        digit1Element.textContent = finalNumber[0];
        digit2Element.textContent = finalNumber[1];
    }
    
    startAnimation();

    // *** WebSocket Connection ***
    
    const socket = new WebSocket(WS_URL);

    socket.onopen = () => {
        console.log('Connected to Realtime Server via WebSocket.');
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            
            const liveResult = data.live ? data.live.toString().padStart(2, '0') : "--"; 
            const liveStatus = data.status; 
            let dailyResults = data.daily || []; 
            
            // 1. Live ဂဏန်း Update နှင့် Animation ထိန်းချုပ်ခြင်း
            if (liveStatus === "hold" && liveResult !== "--") {
                stopAnimation(liveResult);
                checkmarkElement.classList.remove('hidden'); // အမှန်ခြစ်ပေါ်စေ
            } else {
                startAnimation();
                checkmarkElement.classList.add('hidden'); // အမှန်ခြစ်ဖျောက်
            }

            // 2. Daily History ၆ ကွက် ဖြည့်သွင်းခြင်း
            resultBoxes.forEach((box, index) => {
                const drawData = dailyResults[index];
                if (drawData) {
                    box.querySelector('.box-time').textContent = drawData.label; 
                    const result = drawData.result && drawData.result !== "--" 
                                    ? drawData.result.toString().padStart(2, '0') 
                                    : "--";
                    box.querySelector('.box-result').textContent = result;
                }
            });
            
            // 3. Update အချိန် ပြသခြင်း
            updatedTimeElement.textContent = `Updated: ${data.timestamp}`;

        } catch (e) {
            console.error("Error processing WebSocket data:", e);
        }
    };

    socket.onclose = () => {
        console.warn('Disconnected from server. Attempting to reconnect...');
    };

    socket.onerror = (error) => {
        console.error('WebSocket Error:', error);
    };
});
