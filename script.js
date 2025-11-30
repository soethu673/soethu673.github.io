// public/script.js (Cache Data ဖျက်ထုတ်ပြီး၊ History Feature ထည့်သွင်းထားသော Code)

document.addEventListener('DOMContentLoaded', () => {
    // *** Configuration ***
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
    
    // Cache Data စနစ်ကို ဖျက်ထုတ်လိုက်ပါပြီ
    // let currentResults = JSON.parse(localStorage.getItem('current_results')) || {}; 
    
    // *** Utility Functions (Cache & Save Functions များကို ဖျက်ထုတ်ပါပြီ) ***
    
    /*
    // saveCurrentResults function ကို ဖျက်ပါပြီ
    function saveCurrentResults(data) {
        // ... (Logic removed)
    }

    // showCachedResults function ကို ဖျက်ပါပြီ
    function showCachedResults() {
        // ... (Logic removed)
    }
    */

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

            // *** Cache Data သိမ်းဆည်းသည့်အပိုင်းကို ဖျက်ထုတ်ပြီး ဖြစ်သည်။ ***

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
        stopAnimation("--", "--", "--"); // Animation ရပ်ပြီး 2D ကို "--" ပြ
        if (checkmarkElement) {
            checkmarkElement.classList.remove('hidden'); 
            checkmarkElement.textContent = "❌"; 
        }
        // Daily Results များကိုလည်း ရှင်းထုတ်ရန် စဉ်းစားနိုင်ပါသည်။
        resultBoxes.forEach(box => {
            const resultElement = box.querySelector('.box-result');
            if (resultElement) resultElement.textContent = "--";
        });
    }

    socket.onclose = handleConnectionError;
    socket.onerror = handleConnectionError;

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
    // *** HISTORY FEATURE LOGIC ***
    // ==========================================================

    async function fetchAndRenderHistory() {
        try {
            // Server.js မှ /api/2d/history ကို ခေါ်ယူခြင်း
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            // History API က ဒီနေ့ရဲ့ Result တစ်ခုတည်းကို Object အနေနဲ့ ပြန်ပို့ပေးပါမည်။
            const data = await response.json(); 
            
            historyResultsContainer.innerHTML = '';
            
            const dailyGroup = document.createElement('div');
            dailyGroup.classList.add('daily-result-group');

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
