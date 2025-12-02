// public/script.js (SET/VALUE Logic & 2D Digit Order ပြင်ဆင်ပြီး)

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
    
    // History Page အတွက် DOM Elements
    const historyResultsContainer = document.getElementById('history-results-container'); 
    
    // SET / VALUE အတွက် DOM Elements အသစ်များ (index.html မှာ ID ပြောင်းထားသည်)
    const setFullDisplayElement = document.getElementById('set-full-display');
    const valueFullDisplayElement = document.getElementById('value-full-display');
    
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
            
            // Server က SET, VALUE string အပြည့်အစုံကို ပို့ပေးရပါမည်။ (ဥပမာ: "1234.73", "12345.38")
            const currentSet = data.set; 
            const currentValue = data.value; 
            
            const liveStatus = data.status; 
            let dailyResults = data.daily || []; 
            
            // 2D Live Data ဖြင့် SET/VALUE Display များကို Update လုပ်သည်
            updateAnimationDigits(currentSet, currentValue); 

            // *** Live ဂဏန်း Update ***
            if (liveStatus === "closed") {
                // CLOSED status
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
                // HOLD status
                stopAnimation(liveResult, currentSet, currentValue);
                if (checkmarkElement) {
                    checkmarkElement.classList.remove('hidden'); 
                    checkmarkElement.textContent = "✔️";
                }
                if (updatedTimeElement) {
                    updatedTimeElement.textContent = `Updated: ${data.timestamp}`;
                }
            } else {
                // LIVE status
                startAnimation();
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
        if (!setFullDisplayElement || !valueFullDisplayElement || !setStr || !valueStr) {
             // Data မရလျှင် Default ပြသရန်
            if (setFullDisplayElement) setFullDisplayElement.textContent = "--.---";
            if (valueFullDisplayElement) valueFullDisplayElement.textContent = "--.---";
            if (digit1Element) digit1Element.textContent = "-";
            if (digit2Element) digit2Element.textContent = "-";
            return;
        }

        // 1. SET/VALUE String မှ 2D ဂဏန်းများ ခွဲထုတ်ခြင်း
        // SET ဂဏန်း (2D ရဲ့ ရှေ့ဂဏန်း) - ဒဿမနောက် ပထမဂဏန်းကို ယူပါ (ဥပမာ "1234.73" မှ "7")
        // setStr.slice(-2, -1) သည် string ရဲ့ နောက်ဆုံးဂဏန်းမတိုင်ခင် တစ်လုံးကို ယူသည်
        const set2DDigit = setStr.length >= 2 ? setStr.slice(-2, -1) : "-";
        
        // VALUE ဂဏန်း (2D ရဲ့ နောက်ဆုံးဂဏန်း) - နောက်ဆုံးဂဏန်းကို ယူပါ (ဥပမာ "12345.38" မှ "8")
        const value2DDigit = valueStr.length >= 1 ? valueStr.slice(-1) : "-";
        
        // 2. 2D Live Number ကို မှန်ကန်စွာ တည်ဆောက်ခြင်း (SET digit + VALUE digit)
        const live2D = set2DDigit + value2DDigit; // ဥပမာ: "78" (FIXED)

        // 3. SET Display ကို Dynamic HTML ဖြင့် ပြသခြင်း
        // ဥပမာ: "1234." (Prefix) + "7" (2D Digit) + "3" (Suffix)
        const setPrefix = setStr.substring(0, setStr.length - 2); // "1234."
        const setSuffix = setStr.substring(setStr.length - 1);    // "3"
        
        setFullDisplayElement.innerHTML = `
            <span>${setPrefix}</span>
            <span id="set-2d-digit-live" class="highlight-digit">${set2DDigit}</span>
            <span>${setSuffix}</span>
        `;

        // 4. VALUE Display ကို Dynamic HTML ဖြင့် ပြသခြင်း
        // ဥပမာ: "12345.3" (Prefix) + "8" (2D Digit)
        const valuePrefix = valueStr.substring(0, valueStr.length - 1); // "12345.3"
        
        valueFullDisplayElement.innerHTML = `
            <span>${valuePrefix}</span>
            <span id="value-2d-digit-live" class="highlight-digit">${value2DDigit}</span>
        `;

        // 5. Main 2D Display Update
        if (digit1Element && digit2Element) {
            digit1Element.textContent = live2D[0];
            digit2Element.textContent = live2D[1];
        }
    }

    // Animation စတင်ခြင်း (Main 2D နှင့် SET/VALUE ဂဏန်းများကိုပါ Blinking လုပ်သည်)
    function startAnimation() {
        if (liveNumberElement) {
            liveNumberElement.classList.add('blinking');
            // Dynamic elements ကို ရှာပြီး Animation စပါ
            const setLive = document.getElementById('set-2d-digit-live');
            const valueLive = document.getElementById('value-2d-digit-live');
            if (setLive) setLive.classList.add('blinking');
            if (valueLive) valueLive.classList.add('blinking');
        }
    }
    
    // Animation ရပ်တန့်ခြင်း (Final Result အတွက်)
    function stopAnimation(result, setStr, valueStr) {
        if (liveNumberElement) {
            liveNumberElement.classList.remove('blinking'); 
            // Dynamic elements ကို ရှာပြီး Animation ရပ်ပါ
            const setLive = document.getElementById('set-2d-digit-live');
            const valueLive = document.getElementById('value-2d-digit-live');
            if (setLive) setLive.classList.remove('blinking');
            if (valueLive) valueLive.classList.remove('blinking');
        }
        
        // Final Result ထွက်ပြီဆိုရင် SET/VALUE ကို နောက်ဆုံးတန်ဖိုးဖြင့် Update လုပ်ရန်
        // (ဒီတစ်ကြိမ် ခေါ်တာဟာ Blinking မပါတဲ့ Final State အတွက် ဖြစ်သည်)
        updateAnimationDigits(setStr, valueStr);

        if (digit1Element && digit2Element) {
            digit1Element.textContent = result[0];
            digit2Element.textContent = result[1];
        }
    }
    
    // ==========================================================
    // *** HISTORY FEATURE LOGIC ***
    // ==========================================================
    // (History Logic ကို မူလအတိုင်း ဆက်လက်ထားရှိပါသည်)

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
