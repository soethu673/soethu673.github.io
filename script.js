// public/script.js (Simple Cached Results Only)

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

    // *** Simple Cached Results System ***
    let currentResults = JSON.parse(localStorage.getItem('current_results')) || {};

    // *** Initialize - Render Sleep ဖြစ်မှသာ Cached Data ပြမယ် ***
    function initializeDisplay() {
        console.log('🔄 Checking WebSocket connection...');
        
        // WebSocket connect မရရင်ပဲ cached data ပြမယ်
        // WebSocket ရှိရင် live data ကိုပဲသုံးမယ်
    }

    // *** Save results when WebSocket is working ***
    function saveCurrentResults(data) {
        try {
            if (data.daily && data.daily.length > 0) {
                // ဂဏန်းထွက်တိုင်း သိမ်းမယ်
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

    // *** Show cached results ONLY when WebSocket fails ***
    function showCachedResults() {
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

    socket.onopen = () => {
        console.log('✅ WebSocket Connected - Using LIVE data');
        if (updatedTimeElement) {
            updatedTimeElement.textContent = "Connected - Live data";
        }
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            
            // Live data ကိုပဲပြမယ်
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

    // *** WebSocket FAILED ဖြစ်မှသာ Cached Data ပြမယ် ***
    socket.onclose = () => {
        console.log('🔌 WebSocket Closed - Render Sleep Detected');
        showCachedResults(); // ဒီမှာပဲ cached data ပြမယ်
    };

    socket.onerror = (error) => {
        console.log('❌ WebSocket Error - Render Sleep Detected');
        showCachedResults(); // ဒီမှာပဲ cached data ပြမယ်
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

    // *** Global Functions ***
    window.showHistory = function() {
        const modal = document.getElementById('history-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    };

    window.closeHistory = function() {
        const modal = document.getElementById('history-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    window.handleExit = function() {
        history.back(); 
    };

    // Close modal when clicking outside
    const historyModal = document.getElementById('history-modal');
    if (historyModal) {
        historyModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeHistory();
            }
        });
    }
});
