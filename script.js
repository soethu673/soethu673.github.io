// public/script.js (Port 7703 Fixed, SET/VALUE Handling)

document.addEventListener('DOMContentLoaded', () => {
    // *** Configuration ***
    
    // Local Port 7703 ကိုသာ တိုက်ရိုက် သုံးရန်
    const WS_URL = "ws://127.0.0.1:7703"; 
    const ANIMATION_INTERVAL = 5000; 
    
    // *** DOM Elements ***
    const liveNumberElement = document.getElementById('animating-2d');
    const digit1Element = document.getElementById('digit1');
    const digit2Element = document.getElementById('digit2');
    const currentSetElement = document.getElementById('current-set'); // New
    const currentValueElement = document.getElementById('current-value'); // New
    const checkmarkElement = document.getElementById('checkmark');
    const updatedTimeElement = document.getElementById('last-updated-time');
    const resultBoxes = Array.from({length: 6}, (_, i) => document.getElementById(`result-box-${i}`));
    let animationTimer = null; 

    // *** Utility Functions (Animation) ***
    
    // Animation ပြန်စတင်တဲ့အခါ SET/VALUE ကို Server က ထုတ်ပေးတဲ့ဂဏန်းဖြင့် ပြသရန်
    function updateAnimationDigits(set, value) {
        // Live 2D က VALUE နဲ့ SET ကို ပေါင်းပြီး ပြရမှာဖြစ်တဲ့အတွက်
        const live2D = value + set; 
        digit1Element.textContent = live2D[0];
        digit2Element.textContent = live2D[1];
        currentSetElement.textContent = set;
        currentValueElement.textContent = value;
    }

    function startAnimation() {
        if (animationTimer) return; 
        liveNumberElement.classList.add('blinking'); 
        
        // Live Animation ဖြစ်နေစဉ် SET/VALUE ကို Server က ပို့ပေးတဲ့ Random ဂဏန်းဖြင့် ပြသမည်
        // Animation ပြောင်းလဲမှုက Server side data ပေါ်မူတည်သည်။
        // Client-side ကနေ Random ထပ်မထုတ်တော့ဘဲ Server data ရောက်တဲ့အခါ update လုပ်မည်။
    }
    
    function stopAnimation(result, set, value) {
        if (animationTimer) {
            clearInterval(animationTimer);
            animationTimer = null;
        }
        liveNumberElement.classList.remove('blinking'); 
        
        // ဂဏန်းထွက်ရင်တော့ ထွက်ဂဏန်း (Value + Set) ကို တိကျစွာ ပြသမည်
        digit1Element.textContent = result[0];
        digit2Element.textContent = result[1];
        currentSetElement.textContent = set;
        currentValueElement.textContent = value;
    }
    
    // *** Global Functions for HTML Navigation ***
    
    window.handleExit = function() {
        history.back(); 
    };

    window.showHistory = function() {
        alert("History Function: ထွက်ပြီးသား ဂဏန်းဟောင်း ၆ ကြိမ်စာကို DD/MM/YY နဲ့အတူ ဖော်ပြဖို့ Modal ကို ဒီနေရာမှာ ပြသရပါမယ်။");
    };
    
    // *** WebSocket Connection ***
    
    const socket = new WebSocket(WS_URL);

    socket.onopen = () => {
        console.log('Connected to Realtime Server via WebSocket.');
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            
            const liveResult = data.live ? data.live.toString().padStart(2, '0') : "--"; 
            const currentSet = data.set; 
            const currentValue = data.value; 
            const liveStatus = data.status; 
            let dailyResults = data.daily || []; 
            
            // *** 1. Live ဂဏန်း Update နှင့် Animation/Closed ထိန်းချုပ်ခြင်း ***
            if (liveStatus === "closed") {
                // အင်္ဂါနေ့ ပိတ်ချိန်
                stopAnimation("--", "--", "--"); 
                checkmarkElement.classList.remove('hidden'); 
                checkmarkElement.textContent = "CLOSED"; 
                updatedTimeElement.textContent = "TUESDAY CLOSED"; 
            }
            else if (liveStatus === "hold" && liveResult !== "--") {
                // ဂဏန်းထွက်ပြီး 10 မိနစ် ရပ်ထားသည့် အခြေအနေ
                stopAnimation(liveResult, currentSet, currentValue); // ထွက်ဂဏန်းဖြင့် ရပ်
                checkmarkElement.classList.remove('hidden'); 
                checkmarkElement.textContent = "✔️"; // အစိမ်းရောင် အမှန်ခြစ်
                updatedTimeElement.textContent = `Updated: ${data.timestamp}`;
            } else {
                // Animation ပြန်စရမည့် အခြေအနေ
                startAnimation();
                // Animation စနေစဉ် Server က ပို့ပေးတဲ့ SET/VALUE ကို ပြောင်းပေးပါ
                updateAnimationDigits(currentSet, currentValue); 
                checkmarkElement.classList.add('hidden'); 
                checkmarkElement.textContent = "✔️"; 
                updatedTimeElement.textContent = `Updated: ${data.timestamp}`;
            }

            // 2. Daily History ၆ ကွက် ဖြည့်သွင်းခြင်း
            resultBoxes.forEach((box, index) => {
                const drawData = dailyResults[index];
                if (drawData) {
                    box.querySelector('.box-time').textContent = drawData.label; 
                    const result = drawData.result && drawData.result !== "--" 
                                    ? drawData.result.toString().padStart(2, '0') 
                                    : "--";
                    
                    if(liveStatus === "closed") {
                         box.querySelector('.box-result').textContent = "--";
                    } else {
                        // ထွက်ဂဏန်း 10:00 AM မှာ 10:01 AM မှ ထွက်ဖို့အတွက် Draw Logic ကို Server မှာ လုပ်ပြီးပါပြီ။
                        box.querySelector('.box-result').textContent = result;
                    }
                }
            });

        } catch (e) {
            console.error("Error processing WebSocket data:", e);
        }
    };

    socket.onclose = () => {
        console.warn('Disconnected from server. Check Termux status.');
    };

    socket.onerror = (error) => {
        console.error('WebSocket Error:', error);
    };
});
