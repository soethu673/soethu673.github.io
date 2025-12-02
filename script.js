// public/script.js (SET/VALUE Logic ထည့်သွင်းပြီး)

document.addEventListener('DOMContentLoaded', () => {
    // *** Configuration ***
    const WS_URL = "wss://china-2d-live.onrender.com";
    const API_URL = "/api/2d/history"; 
    
    // *** DOM Elements ***
    const livePage = document.getElementById('live-page-content');
    const historyPage = document.getElementById('history-page');
    const historyIcon = document.getElementById('history-icon');
    const historyBackBtn = document.getElementById('history-back-btn');

    const liveNumberElement = document.getElementById('animating-2d');
    const digit1Element = document.getElementById('digit1');
    const digit2Element = document.getElementById('digit2');
    const checkmarkElement = document.getElementById('checkmark');
    const updatedTimeElement = document.getElementById('last-updated-time');
    const resultBoxes = Array.from({length: 6}, (_, i) => document.getElementById(`result-box-${i}`));
    
    // HISTORY Page အတွက် DOM Elements
    const historyResultsContainer = document.getElementById('history-results-container'); 
    
    // SET / VALUE အတွက် DOM Elements အသစ်များ
    const setLiveDigitElement = document.getElementById('set-live-digit');
    const valueLiveDigitElement = document.getElementById('value-live-digit');
    
    let animationTimer = null; 
    
    // *** WebSocket Connection ***
    const socket = new WebSocket(WS_URL);

    socket.onopen = () => {
        console.log('✅ WebSocket Connected - Using LIVE data');
        if (updatedTimeElement) {
            updatedTimeElement.textContent = "Connected - Live data";
        }
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            
            const liveResult = data.live ? data.live.toString().padStart(2, '0') : "--"; 
            
            // *** SET/VALUE Data အသစ်ကို ယူပါ ***
            // Server က SET, VALUE string အပြည့်အစုံကို ပို့ပေးရပါမည်။ (ဥပမာ: "1234.73", "12345.38")
            const currentSet = data.set; 
            const currentValue = data.value; 
            
            const liveStatus = data.status; 
            let dailyResults = data.daily || []; 
            
            // *** Live ဂဏန်း Update ***
            if (liveStatus === "closed") {
                stopAnimation("--", "--", "--"); 
                if (checkmarkElement) {
                    checkmarkElement.classList.remove('hidden'); 
                    checkmarkElement.textContent = "CLOSED"; 
                }
                if (updatedTimeElement) {
                    updatedTimeElement.textContent = "TUESDAY CLOSED"; 
                }
            }
            else if (liveStatus === "hold" && liveResult !== "--") {
                // Hold ဖြစ်ရင် SET/VALUE ကို Final Result အရ Update လုပ်
                stopAnimation(liveResult, currentSet, currentValue);
                if (checkmarkElement) {
                    checkmarkElement.classList.remove('hidden'); 
                    checkmarkElement.textContent = "✔️";
                }
                if (updatedTimeElement) {
                    updatedTimeElement.textContent = `Updated: ${data.timestamp}`;
                }
            } else {
                // Live ဖြစ်နေရင် Live Animation စပါ
                startAnimation();
                // SET/VALUE ကို Live Data နဲ့ Update လုပ်
                updateAnimationDigits(currentSet, currentValue); 
                if (checkmarkElement) {
                    checkmarkElement.classList.add('hidden'); 
                }
                if (updatedTimeElement) {
                    updatedTimeElement.textContent = `Updated: ${data.timestamp}`;
                }
            }

            // *** Daily Results - Live Data ကိုပဲပြမယ် ***
            resultBoxes.forEach((box, index) => {
                if (box) {
                    const drawData = dailyResults[index];
                    const timeElement = box.querySelector('.box-time');
                    const resultElement = box.querySelector('.box-result');
                    
                    if (timeElement && resultElement && drawData) {
                        const result = drawData.result && drawData.result !== "--" 
                                        ? drawData.result.toString().padStart(2, 0) 
                                        : "--";
                        
                        resultElement.textContent = result;
                    }
                }
            });

        } catch (e) {
            console.error("Error processing data:", e);
        }
    };

    // *** WebSocket FAILED / CLOSED ဖြစ်ပါက Connection Error Message ပြသမည် ***
    function handleConnectionError() {
        console.log('🔌 WebSocket Error/Closed - Showing Connection Error');
        if (updatedTimeElement) {
            updatedTimeElement.textContent = "Connection Lost. Please Refresh.";
        }
        stopAnimation("--", "--", "--"); 
        if (checkmarkElement) {
            checkmarkElement.classList.remove('hidden'); 
            checkmarkElement.textContent = "❌"; 
        }
        resultBoxes.forEach(box => {
            const resultElement = box.querySelector('.box-result');
            if (resultElement) resultElement.textContent = "--";
        });
    }

    socket.onclose = handleConnectionError;
    socket.onerror = handleConnectionError;

    // *** Utility Functions ***
    
    // Live 2D နှင့် SET/VALUE ဂဏန်းများကို Update လုပ်ခြင်း (အဓိကပြင်ဆင်သည့်အပိုင်း)
    function updateAnimationDigits(setStr, valueStr) {
        if (!setLiveDigitElement || !valueLiveDigitElement) return;

        // 1. Live 2D ဂဏန်းကို SET နှင့် VALUE မှ တွက်ထုတ်ခြင်း (သင့်ရဲ့ Logic: VALUE နောက်ဆုံး + SET နောက်ဆုံး)
        // ဥပမာ- setStr = "1234.73", valueStr = "12345.38"
        // 2D = 87 လို့ ယူဆရမှာ ဖြစ်ပါတယ် (သင့်ရဲ့ လက်ရှိ Logic အရ)
        
        // 2D ဂဏန်းအတွက် SET နှင့် VALUE မှ တန်ဖိုးများကို ယူပါ
        const setLiveDigit = setStr ? setStr.slice(-2, -1) : "-"; // "7"
        const valueLiveDigit = valueStr ? valueStr.slice(-1) : "-"; // "8"
        
        // သင့်ရဲ့ မူရင်း Logic (value.slice(-1) + set.slice(-1)) အရ 2D ဂဏန်းကို တည်ဆောက်ပါ
        const live2D = valueLiveDigit + setLiveDigit; // "87" (ဥပမာ)

        // 2. SET/VALUE Display Update
        // SET: ဒဿမနောက် ပထမဂဏန်းကို Live 2D ရဲ့ ပထမဂဏန်း (7) ဖြင့် အစားထိုး
        setLiveDigitElement.textContent = setLiveDigit;
        
        // VALUE: ဒဿမနောက် ဒုတိယဂဏန်းကို Live 2D ရဲ့ နောက်ဆုံးဂဏန်း (8) ဖြင့် အစားထိုး
        valueLiveDigitElement.textContent = valueLiveDigit;

        // 3. Main 2D Display Update
        if (digit1Element && digit2Element) {
            digit1Element.textContent = live2D[0];
            digit2Element.textContent = live2D[1];
        }
    }

    function startAnimation() {
        if (animationTimer) return; 
        if (liveNumberElement) {
            liveNumberElement.classList.add('blinking');
            // SET/VALUE နေရာမှာလည်း animation စပါ
            setLiveDigitElement.classList.add('blinking');
            valueLiveDigitElement.classList.add('blinking');
        }
    }
    
    function stopAnimation(result, setStr, valueStr) {
        // Animation Timer ကို ဖြုတ်ဖို့မလိုတော့ပါ (CSS Blinking ကိုပဲ သုံးထား၍)
        
        if (liveNumberElement) {
            liveNumberElement.classList.remove('blinking'); 
            // SET/VALUE Animation ရပ်ပါ
            setLiveDigitElement.classList.remove('blinking');
            valueLiveDigitElement.classList.remove('blinking');
        }
        
        // Final Result ထွက်ပြီဆိုရင် SET/VALUE ကို နောက်ဆုံးတန်ဖိုးဖြင့် Update လုပ်ရန်
        updateAnimationDigits(setStr, valueStr);

        if (digit1Element && digit2Element) {
            digit1Element.textContent = result[0];
            digit2Element.textContent = result[1];
        }
    }
    
    // ==========================================================
    // *** HISTORY FEATURE LOGIC ***
    // ==========================================================
    // (History Logic ကို ပြင်ဆင်ရန်မလိုအပ်ပါ၊ မူလအတိုင်း ဆက်လက်ထားရှိပါသည်)

    async function fetchAndRenderHistory() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json(); 
            
            historyResultsContainer.innerHTML = '';
            
            const dailyGroup = document.createElement('div');
            dailyGroup.classList.add('daily-result-group');

            const dateElement = document.createElement('div');
            dateElement.classList.add('history-date');
            dateElement.textContent = data.date; 
            dailyGroup.appendChild(dateElement);

            if (data.isClosed) {
                const closedMsg = document.createElement('p');
                closedMsg.classList.add('closed-day-message');
                closedMsg.textContent = `${data.dayOfWeek} (အင်္ဂါနေ့) - China 2D ပိတ်ပါသည်။`;
                dailyGroup.appendChild(closedMsg);
            } else {
                const grid = document.createElement('div');
                grid.classList.add('history-results-grid');

                data.results.forEach(item => {
                    const resultBox = document.createElement('div');
                    resultBox.classList.add('result-box-item');
                    
                    const resultNumber = item.number && item.number !== "--" 
                                        ? item.number.toString().padStart(2, '0') 
                                        : "--";

                    resultBox.innerHTML = `
                        <p class="box-time">${item.time}</p>
                        <p class="box-result">${resultNumber}</p>
                    `;
                    grid.appendChild(resultBox);
                });
                
                dailyGroup.appendChild(grid);
            }

            historyResultsContainer.appendChild(dailyGroup);

        } catch (error) {
            console.error('Failed to fetch 2D History:', error);
            historyResultsContainer.innerHTML = '<p style="text-align: center; color: red; margin-top: 50px;">Result History Data ဆွဲယူရာတွင် အမှားပေါ်ခဲ့သည်။</p>';
        }
    }
    
    // 2. Page ပြောင်းလဲမှု စီမံခန့်ခွဲခြင်း
    
    if (historyIcon) {
        historyIcon.addEventListener('click', () => {
            livePage.classList.add('hidden');
            historyPage.classList.remove('hidden');
            fetchAndRenderHistory();
        });
    }

    if (historyBackBtn) {
        historyBackBtn.addEventListener('click', () => {
            historyPage.classList.add('hidden');
            livePage.classList.remove('hidden');
        });
    }

    // 3. Global Functions
    window.handleExit = function() {
        history.back(); 
    };
});
