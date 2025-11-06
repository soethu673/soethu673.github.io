// public/script.js (Final Version: Render Sleep Solution, Daily Results Loop Fixed)

document.addEventListener('DOMContentLoaded', () => {
    // * Configuration *
    const WS_URL = "wss://china-2d-live.onrender.com"; 
    
    // * DOM Elements *
    const liveNumberElement = document.getElementById('animating-2d');
    const digit1Element = document.getElementById('digit1');
    const digit2Element = document.getElementById('digit2');
    const checkmarkElement = document.getElementById('checkmark');
    const updatedTimeElement = document.getElementById('last-updated-time');
    // result-box-${i} ကို getElementById() နဲ့ အသုံးပြုရန် String Template ကို ပြင်ဆင်သည်
    const resultBoxes = Array.from({length: 6}, (_, i) => document.getElementById(result-box-${i})); 
    let animationTimer = null; 

    // * China 2D History System *
    let china2dHistory = JSON.parse(localStorage.getItem('china2d_history')) || [];
    
    // * Cached Data System for Render Sleep *
    let lastKnownData = JSON.parse(localStorage.getItem('last_known_data')) || {};

    // * NEW: Initialize with cached data *
    function initializeDisplay() {
        // Render sleep ဖြစ်နေရင် last known data ကိုပြမယ်
        if (Object.keys(lastKnownData).length > 0) {
            updateDisplayFromCachedData(lastKnownData);
            console.log('📁 Using cached data from localStorage');
        } else {
             // Cache မရှိရင် default -- တွေပြရန် (optional)
             stopAnimation("--", "--", "--"); 
             updatedTimeElement.textContent = "Loading...";
             resultBoxes.forEach(box => box.querySelector('.box-result').textContent = "--");
        }
        
        // History data ကိုလည်းပြမယ်
        updateHistoryDisplay();
    }

    // * NEW: Save data to localStorage (Live & Daily) *
    function saveToStorage(data) {
        try {
            // Current data save
            lastKnownData = {
                live: data.live,
                set: data.set,
                value: data.value,
                status: data.status,
                timestamp: data.timestamp,
                daily: data.daily || []
            };
            
            localStorage.setItem('last_known_data', JSON.stringify(lastKnownData));
            
            // History data save (တစ်နေ့တာ ထွက်ပြီးသား ဂဏန်းများကို သိမ်းသည်)
            if (data.daily && data.status !== "closed") {
                data.daily.forEach(draw => {
                    saveToHistory(draw);
                });
            }
            
            // console.log('💾 Data saved to localStorage');
        } catch (e) {
            console.error('❌ Error saving to localStorage:', e);
        }
    }

    // * NEW: Update display from cached data *
    function updateDisplayFromCachedData(data) {
        const liveResult = data.live ? data.live.toString().padStart(2, '0') : "--"; 
        const currentSet = data.set; 
        const currentValue = data.value; 
        const liveStatus = data.status; 
        let dailyResults = data.daily || []; // Daily results ကို cache ကနေယူ
        
        // * 1. Live ဂဏန်း Update နှင့် Animation/Closed ထိန်းချုပ်ခြင်း *
        if (liveStatus === "closed") {
            // အင်္ဂါနေ့ ပိတ်ချိန်
            stopAnimation("--", "--", "--"); 
            checkmarkElement.classList.remove('hidden'); 
            checkmarkElement.textContent = "CLOSED"; 
            updatedTimeElement.textContent = "TUESDAY CLOSED"; 
        }
        else if (liveStatus === "hold" && liveResult !== "--") {
            // ဂဏန်းထွက်ပြီး 10 မိနစ် ရပ်ထားသည့် အခြေအနေ
            stopAnimation(liveResult, currentSet, currentValue); 
            checkmarkElement.classList.remove('hidden');
            checkmarkElement.textContent = "✔️"; 
            updatedTimeElement.textContent = Updated: ${data.timestamp};
        } else {
            // Animation ပြန်စရမည့် အခြေအနေ (5s interval ဖြင့် Server က Data ပို့မည်)
            startAnimation();
            updateAnimationDigits(currentSet, currentValue); 
            checkmarkElement.classList.add('hidden'); 
            checkmarkElement.textContent = "✔️"; 
            updatedTimeElement.textContent = Updated: ${data.timestamp};
        }

        // * 2. Daily History ၆ ကွက် ဖြည့်သွင်းခြင်း (FIXED & COMPLETED) *
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
    }

    // Show History Modal
    window.showHistory = function() {
        updateHistoryDisplay();
        document.getElementById('history-modal').classList.remove('hidden');
    };

    // Close History Modal
    window.closeHistory = function() {
        document.getElementById('history-modal').classList.add('hidden');
    }

    // Update History Display
    function updateHistoryDisplay() {
        const today = new Date();
        const dateString = today.toLocaleDateString('en-GB');
        
        // Update date display
        document.getElementById('history-current-date').textContent = dateString;
        
        // Get today's results
        const todayResults = china2dHistory.filter(item => item.date === dateString);
        
        // Update each time slot (This part is simplified for a complete history modal)
        // If you are using the previous 2-Day modal structure, you need to adjust this function.
        // For simplicity, this assumes a single-day history modal.
        
        // We need to re-create the history grid structure based on cachedTodayResults (or dailyResults from the server)
        
        const historyGridToday = document.getElementById('history-grid-today');
        historyGridToday.innerHTML = '';
        
        const drawTimes = ["10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM", "6:00 PM", "8:00 PM"];
        
        drawTimes.forEach((timeLabel, index) => {
            const resultItem = todayResults.find(item => item.time === timeLabel);
            const result = resultItem ? resultItem.number : '--';
            
            // Re-use the B&W result box style for history
            const boxHtml = 
                <div class="result-box history-box">
                    <p class="box-time">${timeLabel}</p>
                    <p class="box-result">${result}</p>
                </div>
            ;
            historyGridToday.innerHTML += boxHtml;
        });
    }

    // Save to History (only saves completed results)
    function saveToHistory(drawData) {
        // drawData.result is a 2D number (e.g., "56")
        // drawData.label is the time (e.g., "10:00 AM")
        if (drawData.result && drawData.result !== "--") {
            const today = new Date().toLocaleDateString('en-GB');
            const time = drawData.label;
            const number = drawData.result.toString().padStart(2, '0');
            
            // Check if already exists in history for today's date and time
            const exists = china2dHistory.find(item =>
                item.date === today && item.time === time
            );
            
            if (!exists) {
                // If it doesn't exist, check if the draw time is already passed and result is final
                // (Server logic already handles this by checking drawData.result !== "--")
                china2dHistory.push({
                    date: today,
                    time: time,
                    number: number,
                    timestamp: new Date().toISOString()
                });
                
                // Keep only last 7 days of entries (simplified)
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                
                china2dHistory = china2dHistory.filter(item => 
                    new Date(item.timestamp) > sevenDaysAgo
                );
                
                localStorage.setItem('china2d_history', JSON.stringify(china2dHistory));
            }
        }
    }

    // * Utility Functions (Animation) *
    
    function updateAnimationDigits(set, value) {
        const live2D = value.slice(-1) + set.slice(-1); 
        digit1Element.textContent = live2D[0];
        digit2Element.textContent = live2D[1];
    }

    function startAnimation() {
        if (animationTimer) return; 
        liveNumberElement.classList.add('blinking'); 
    }
    
    function stopAnimation(result, set, value) { // set, value arguments are unused but kept for consistency
        if (animationTimer) {
            clearInterval(animationTimer);
            animationTimer = null;
        }
        liveNumberElement.classList.remove('blinking'); 
        
        digit1Element.textContent = result[0];
        digit2Element.textContent = result[1];
    }
    
    // * Global Functions for HTML Navigation *
    
    window.handleExit = function() {
        history.back(); 
    };
    
    // * WebSocket Connection *
    
    const socket = new WebSocket(WS_URL);

    socket.onopen = () => {
        console.log('✅ Connected to Realtime Server via WebSocket.');
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            
            // * 1. Save data to localStorage first *
            saveToStorage(data);
            
            // * 2. Update Display from the received data *
            updateDisplayFromCachedData(data);
            
            // * 3. Update History Display (if modal is open) *
            updateHistoryDisplay();

        } catch (e) {
            console.error("Error processing WebSocket data:", e);
        }
    };

    // * UPDATED: WebSocket close and error handlers *
    socket.onclose = () => {
        console.warn('🔌 Disconnected from server. Using cached data.');
        initializeDisplay(); // Cached data ပြန်ပြမယ်
    };

    socket.onerror = (error) => {
        console.error('❌ WebSocket Error. Using cached data.', error);
        initializeDisplay(); // Cached data ပြန်ပြမယ်
    };

    // * NEW: Initialize with cached data on page load *
    initializeDisplay();

    // Close modal when clicking outside
    document.getElementById('history-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeHistory();
        }
    });
});
