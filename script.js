// public/script.js (With History Feature)

document.addEventListener('DOMContentLoaded', () => {
    // *** Configuration ***
    // WS_URL ကို မူရင်းအတိုင်းထားပြီး API_URL ကို local server မှ ခေါ်ရန် ပြင်ဆင်ပါမည်။
    const WS_URL = "wss://china-2d-live.onrender.com";
    // API URL ကို ဒေသတွင်း server မှ ခေါ်ယူရန်
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
    
    let animationTimer = null; 
    let currentResults = JSON.parse(localStorage.getItem('current_results')) || {};

    // *** Utility Functions (Animation, Save, Cache, etc.) - မူရင်းအတိုင်းထားရှိပါသည် ***
    
    function saveCurrentResults(data) {
        // ... (မူရင်း saveCurrentResults function)
        try {
            if (data.daily && data.daily.length > 0) {
                data.daily.forEach((draw) => {
                    if (draw.result && draw.result !== "--") {
                        currentResults[draw.label] = draw.result.toString().padStart(2, '0');
                    }
                });
                
                localStorage.setItem('current_results', JSON.stringify(currentResults));
                console.log('💾 Results saved for sleep protection');
            }
        } catch (e) {
            console.error('Error saving results:', e);
        }
    }

    function showCachedResults() {
        // ... (မူရင်း showCachedResults function)
        console.log('🔌 WebSocket failed - Showing cached results');
        
        if (Object.keys(currentResults).length > 0) {
            resultBoxes.forEach((box) => {
                if (box) {
                    const timeElement = box.querySelector('.box-time');
                    const resultElement = box.querySelector('.box-result');
                    
                    if (timeElement && resultElement) {
                        const timeLabel = timeElement.textContent;
                        const cachedResult = currentResults[timeLabel];
                        
                        if (cachedResult) {
                            resultElement.textContent = cachedResult;
                        }
                    }
                }
            });
            
            if (updatedTimeElement) {
                updatedTimeElement.textContent = "Using cached data - " + new Date().toLocaleString();
            }
        }
    }

    // *** WebSocket Connection ***
    const socket = new WebSocket(WS_URL);

    // ... (socket.onopen, socket.onmessage, socket.onclose, socket.onerror functions များ မူရင်းအတိုင်း)
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
                stopAnimation(liveResult, currentSet, currentValue);
                if (checkmarkElement) {
                    checkmarkElement.classList.remove('hidden'); 
                    checkmarkElement.textContent = "✔️";
                }
                if (updatedTimeElement) {
                    updatedTimeElement.textContent = `Updated: ${data.timestamp}`;
                }
            } else {
                startAnimation();
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
                                        ? drawData.result.toString().padStart(2, '0') 
                                        : "--";
                        
                        resultElement.textContent = result;
                    }
                }
            });

            // *** ဂဏန်းထွက်ရင် သိမ်းထားမယ် (Render Sleep အတွက်) ***
            saveCurrentResults(data);

        } catch (e) {
            console.error("Error processing data:", e);
        }
    };
    
    socket.onclose = () => {
        console.log('🔌 WebSocket Closed - Render Sleep Detected');
        showCachedResults();
    };

    socket.onerror = (error) => {
        console.log('❌ WebSocket Error - Render Sleep Detected');
        showCachedResults();
    };

    // *** Utility Functions ***
    function updateAnimationDigits(set, value) {
        if (digit1Element && digit2Element) {
            const live2D = value.slice(-1) + set.slice(-1); 
            digit1Element.textContent = live2D[0];
            digit2Element.textContent = live2D[1];
        }
    }

    function startAnimation() {
        if (animationTimer) return; 
        if (liveNumberElement) {
            liveNumberElement.classList.add('blinking'); 
        }
    }
    
    function stopAnimation(result, set, value) {
        if (animationTimer) {
            clearInterval(animationTimer);
            animationTimer = null;
        }
        if (liveNumberElement) {
            liveNumberElement.classList.remove('blinking'); 
        }
        
        if (digit1Element && digit2Element) {
            digit1Element.textContent = result[0];
            digit2Element.textContent = result[1];
        }
    }
    
    // ==========================================================
    // *** HISTORY FEATURE LOGIC (အဓိက အပြောင်းအလဲ) ***
    // ==========================================================

    // 1. History Page ကို API မှ Data ဖြင့် ပြသခြင်း
    async function fetchAndRenderHistory() {
        try {
            // Server.js မှ /api/2d/history ကို ခေါ်ယူခြင်း
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json(); 
            
            // Container ကို ရှင်းထုတ်ခြင်း
            historyResultsContainer.innerHTML = '';
            
            // History Group တစ်ခု ဖန်တီးခြင်း (ဒီနေ့အတွက်သာ)
            const dailyGroup = document.createElement('div');
            dailyGroup.classList.add('daily-result-group');

            // နေ့စွဲ (Date/Month/Year) ကို အလယ်တည့်တည့်မှာ ပြသခြင်း
            const dateElement = document.createElement('div');
            dateElement.classList.add('history-date');
            dateElement.textContent = data.date; 
            dailyGroup.appendChild(dateElement);

            // အင်္ဂါနေ့ ပိတ်ကြောင်း စစ်ဆေးခြင်း
            if (data.isClosed) {
                const closedMsg = document.createElement('p');
                closedMsg.classList.add('closed-day-message');
                closedMsg.textContent = `${data.dayOfWeek} (အင်္ဂါနေ့) - China 2D ပိတ်ပါသည်။`;
                dailyGroup.appendChild(closedMsg);
            } else {
                // Result ၆ ကွက် ပြသရန် Grid ဖန်တီးခြင်း
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

            // History Page ပေါ်တွင် ပြသခြင်း
            historyResultsContainer.appendChild(dailyGroup);

        } catch (error) {
            console.error('Failed to fetch 2D History:', error);
            historyResultsContainer.innerHTML = '<p style="text-align: center; color: red;">Result History Data ဆွဲယူရာတွင် အမှားပေါ်ခဲ့သည်။</p>';
        }
    }
    
    // 2. Page ပြောင်းလဲမှု စီမံခန့်ခွဲခြင်း
    
    historyIcon.addEventListener('click', () => {
        // History Page ကို ဖွင့်ပါ
        livePage.classList.add('hidden');
        historyPage.classList.remove('hidden');
        
        // Data ကို ချက်ချင်း ဆွဲယူပြီး ပြသပါ
        fetchAndRenderHistory();
    });

    historyBackBtn.addEventListener('click', () => {
        // Live Page ကို ပြန်ပြောင်းပါ
        historyPage.classList.add('hidden');
        livePage.classList.remove('hidden');
    });

    // 3. Global Functions (မူရင်း code မှ Modal Function များကို ဖယ်ရှား/ပြောင်းလဲ)
    
    // History Modal မဟုတ်ဘဲ Page ပြောင်းထားလို့ ဒီ function တွေ မလိုတော့ပါ။
    /*
    window.showHistory = function() { ... };
    window.closeHistory = function() { ... };
    */

    window.handleExit = function() {
        history.back(); 
    };
});
