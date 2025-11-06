// public/script.js (Fixed Version)

document.addEventListener('DOMContentLoaded', () => {
    // *** Configuration ***
    const WS_URL = "wss://china-2d-live.onrender.com";
    
    // *** DOM Elements ***
    const liveNumberElement = document.getElementById('animating-2d');
    const digit1Element = document.getElementById('digit1');
    const digit2Element = document.getElementById('digit2');
    const checkmarkElement = document.getElementById('checkmark');
    const updatedTimeElement = document.getElementById('last-updated-time');
    const resultBoxes = Array.from({length: 6}, (_, i) => document.getElementById(`result-box-${i}`));
    let animationTimer = null; 

    // *** China 2D History System ***
    let china2dHistory = JSON.parse(localStorage.getItem('china2d_history')) || [];
    
    // *** Cached Data System for Render Sleep ***
    let lastKnownData = JSON.parse(localStorage.getItem('last_known_data')) || {};

    // *** Initialize with cached data ***
    function initializeDisplay() {
        console.log('🔄 Initializing display...');
        
        // Render sleep ဖြစ်နေရင် last known data ကိုပြမယ်
        if (Object.keys(lastKnownData).length > 0) {
            updateDisplayFromCachedData(lastKnownData);
            console.log('📁 Using cached data from localStorage');
        } else {
            console.log('📭 No cached data found');
        }
        
        // History data ကိုလည်းပြမယ်
        updateHistoryDisplay();
    }

    // *** Save data to localStorage ***
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
            
            // History data save
            if (data.daily && data.status !== "closed") {
                data.daily.forEach(draw => {
                    saveToHistory(draw);
                });
            }
            
            console.log('💾 Data saved to localStorage');
        } catch (e) {
            console.error('❌ Error saving to localStorage:', e);
        }
    }

    // *** Update display from cached data ***
    function updateDisplayFromCachedData(data) {
        console.log('📊 Updating from cached data:', data);
        
        const liveResult = data.live ? data.live.toString().padStart(2, '0') : "--"; 
        const currentSet = data.set; 
        const currentValue = data.value; 
        const liveStatus = data.status; 
        let dailyResults = data.daily || []; 
        
        // *** 1. Live ဂဏန်း Update နှင့် Animation/Closed ထိန်းချုပ်ခြင်း ***
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

        // 2. Daily History ၆ ကွက် ဖြည့်သွင်းခြင်း
        resultBoxes.forEach((box, index) => {
            if (box) {
                const drawData = dailyResults[index];
                const timeElement = box.querySelector('.box-time');
                const resultElement = box.querySelector('.box-result');
                
                if (timeElement && resultElement) {
                    if (drawData) {
                        timeElement.textContent = drawData.label; 
                        const result = drawData.result && drawData.result !== "--" 
                                        ? drawData.result.toString().padStart(2, '0') 
                                        : "--";
                        
                        if (liveStatus === "closed") {
                            resultElement.textContent = "--";
                        } else {
                            resultElement.textContent = result;
                        }
                    }
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
        
        // Update each time slot
        const timeSlots = document.querySelectorAll('.time-slot');
        timeSlots.forEach(slot => {
            const time = slot.getAttribute('data-time');
            const resultElement = slot.querySelector('.result-number');
            
            // Find result for this time
            const result = todayResults.find(item => item.time === time);
            
            if (result && result.number) {
                resultElement.textContent = result.number;
                resultElement.style.background = '#333';
                resultElement.style.color = 'white';
            } else {
                resultElement.textContent = '--';
                resultElement.style.background = '#f8f8f8';
                resultElement.style.color = '#333';
            }
        });
    }

    // Save to History
    function saveToHistory(drawData) {
        if (drawData.result && drawData.result !== "--") {
            const today = new Date().toLocaleDateString('en-GB');
            const time = drawData.label;
            const number = drawData.result.toString().padStart(2, '0');
            
            // Check if already exists
            const exists = china2dHistory.find(item => 
                item.date === today && item.time === time
            );
            
            if (!exists) {
                china2dHistory.push({
                    date: today,
                    time: time,
                    number: number,
                    timestamp: new Date().toISOString()
                });
                
                // Keep only last 7 days
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                
                china2dHistory = china2dHistory.filter(item => 
                    new Date(item.timestamp) > sevenDaysAgo
                );
                
                localStorage.setItem('china2d_history', JSON.stringify(china2dHistory));
            }
        }
    }

    // *** Utility Functions (Animation) ***
    
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
    
    // *** Global Functions for HTML Navigation ***
    
    window.handleExit = function() {
        history.back(); 
    };
    
    // *** WebSocket Connection ***
    
    const socket = new WebSocket(WS_URL);

    socket.onopen = () => {
        console.log('✅ Connected to WebSocket server');
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('📨 Received WebSocket data:', data);
            
            // Save data to localStorage first
            saveToStorage(data);
            
            const liveResult = data.live ? data.live.toString().padStart(2, '0') : "--"; 
            const currentSet = data.set; 
            const currentValue = data.value; 
            const liveStatus = data.status; 
            let dailyResults = data.daily || []; 
            
            // Save completed results to history
            if (data.daily && data.status !== "closed") {
                data.daily.forEach(draw => {
                    saveToHistory(draw);
                });
            }
            
            // *** 1. Live ဂဏန်း Update နှင့် Animation/Closed ထိန်းချုပ်ခြင်း ***
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

            // 2. Daily History ၆ ကွက် ဖြည့်သွင်းခြင်း
            resultBoxes.forEach((box, index) => {
                if (box) {
                    const drawData = dailyResults[index];
                    const timeElement = box.querySelector('.box-time');
                    const resultElement = box.querySelector('.box-result');
                    
                    if (timeElement && resultElement && drawData) {
                        timeElement.textContent = drawData.label; 
                        const result = drawData.result && drawData.result !== "--" 
                                        ? drawData.result.toString().padStart(2, '0') 
                                        : "--";
                        
                        if (liveStatus === "closed") {
                            resultElement.textContent = "--";
                        } else {
                            resultElement.textContent = result;
                        }
                    }
                }
            });

        } catch (e) {
            console.error("Error processing WebSocket data:", e);
        }
    };

    // *** WebSocket close and error handlers ***
    socket.onclose = () => {
        console.warn('🔌 Disconnected from server. Using cached data.');
        initializeDisplay();
    };

    socket.onerror = (error) => {
        console.error('❌ WebSocket Error. Using cached data.', error);
        initializeDisplay();
    };

    // *** Initialize with cached data on page load ***
    initializeDisplay();

    // Close modal when clicking outside
    document.getElementById('history-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeHistory();
        }
    });
});
