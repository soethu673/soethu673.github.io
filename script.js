// public/script.js (Final Version: SET/VALUE References Removed)

document.addEventListener('DOMContentLoaded', () => {
    // *** Configuration ***
    const WS_URL = "ws://127.0.0.1:7703"; 
    
    // *** DOM Elements ***
    const liveNumberElement = document.getElementById('animating-2d');
    const digit1Element = document.getElementById('digit1');
    const digit2Element = document.getElementById('digit2');
    // SET/VALUE များကို index.html မှ ဖယ်ရှားပြီးဖြစ်၍ ၎င်းတို့နှင့် သက်ဆိုင်သော references များကို ဖယ်ရှားလိုက်သည်
    const checkmarkElement = document.getElementById('checkmark');
    const updatedTimeElement = document.getElementById('last-updated-time');
    const resultBoxes = Array.from({length: 6}, (_, i) => document.getElementById(`result-box-${i}`));
    let animationTimer = null; 

    // *** Utility Functions (Animation) ***
    
    function updateAnimationDigits(set, value) {
        // Server က ပို့ပေးတဲ့ SET/VALUE ရဲ့ နောက်ဆုံးဂဏန်းကို 2D အဖြစ်ယူပြီး ပြသရန်
        const live2D = value.slice(-1) + set.slice(-1); 
        digit1Element.textContent = live2D[0];
        digit2Element.textContent = live2D[1];
    }

    function startAnimation() {
        if (animationTimer) return; 
        liveNumberElement.classList.add('blinking'); 
    }
    
    function stopAnimation(result, set, value) {
        if (animationTimer) {
            clearInterval(animationTimer);
            animationTimer = null;
        }
        liveNumberElement.classList.remove('blinking'); 
        
        // ဂဏန်းထွက်ရင်တော့ ထွက်ဂဏန်းကို တိကျစွာ ပြသမည်
        digit1Element.textContent = result[0];
        digit2Element.textContent = result[1];
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
        // console.log('Connected to Realtime Server via WebSocket.'); // Log ကို ဖျက်ထားသည်
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
                // Animation ပြန်စရမည့် အခြေအနေ (5s interval ဖြင့် Server က Data ပို့မည်)
                startAnimation();
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
