document.addEventListener("DOMContentLoaded", () => {
    const textInput = document.getElementById("text-input");
    const analyzeBtn = document.getElementById("analyze-btn");
    const clearBtn = document.getElementById("clear-btn");
    const clearHistoryBtn = document.getElementById("clear-history-btn");
    const btnText = analyzeBtn.querySelector(".btn-text");
    const spinner = analyzeBtn.querySelector(".spinner");
    const errorBox = document.getElementById("error-box");
    const resultContainer = document.getElementById("result-container");
    
    const sentimentBadge = document.getElementById("sentiment-badge");
    const sentimentLabel = document.getElementById("sentiment-label");
    const posVal = document.getElementById("pos-val");
    const neuVal = document.getElementById("neu-val");
    const negVal = document.getElementById("neg-val");
    const posBar = document.getElementById("pos-bar");
    const neuBar = document.getElementById("neu-bar");
    const negBar = document.getElementById("neg-bar");
    const historyList = document.getElementById("history-list");

    const API_ENDPOINT = "http://127.0.0.1:5000/predict";

    // Load initial history
    loadHistory();

    // Event Listeners
    analyzeBtn.addEventListener("click", handlePrediction);
    clearBtn.addEventListener("click", () => {
        textInput.value = "";
        hideError();
        resultContainer.classList.add("hidden");
    });
    clearHistoryBtn.addEventListener("click", () => {
        localStorage.removeItem("senti_history");
        loadHistory();
    });

    // Handle example chips
    document.querySelectorAll(".chip").forEach(chip => {
        chip.addEventListener("click", () => {
            textInput.value = chip.getAttribute("data-text");
            handlePrediction();
        });
    });

    // Keyboard shortcut (Ctrl + Enter or Cmd + Enter)
    textInput.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            handlePrediction();
        }
    });

    async function handlePrediction() {
        const text = textInput.value.trim();
        hideError();

        if (!text) {
            showError("Please enter some text before analyzing.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(API_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ text: text })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "An error occurred during prediction.");
            }

            displayResult(data);
            saveToHistory(data);
        } catch (err) {
            showError(err.message || "Failed to reach the prediction backend.");
        } finally {
            setLoading(false);
        }
    }

    function displayResult(data) {
        const { sentiment, confidence } = data;

        sentimentLabel.textContent = sentiment;
        sentimentBadge.className = "sentiment-indicator";
        sentimentBadge.classList.add(`sentiment-${sentiment.toLowerCase()}`);

        const pPositive = (confidence.positive || 0).toFixed(2);
        const pNeutral = (confidence.neutral || 0).toFixed(2);
        const pNegative = (confidence.negative || 0).toFixed(2);

        posVal.textContent = `${pPositive}%`;
        neuVal.textContent = `${pNeutral}%`;
        negVal.textContent = `${pNegative}%`;

        posBar.style.width = `${pPositive}%`;
        neuBar.style.width = `${pNeutral}%`;
        negBar.style.width = `${pNegative}%`;

        resultContainer.classList.remove("hidden");
    }

    function setLoading(isLoading) {
        if (isLoading) {
            analyzeBtn.disabled = true;
            btnText.textContent = "Analyzing...";
            spinner.classList.remove("hidden");
        } else {
            analyzeBtn.disabled = false;
            btnText.textContent = "Analyze Sentiment";
            spinner.classList.add("hidden");
        }
    }

    function showError(msg) {
        errorBox.textContent = msg;
        errorBox.classList.remove("hidden");
    }

    function hideError() {
        errorBox.textContent = "";
        errorBox.classList.add("hidden");
    }

    function saveToHistory(record) {
        let history = JSON.parse(localStorage.getItem("senti_history") || "[]");
        history.unshift({
            text: record.text,
            sentiment: record.sentiment,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        // Keep max 10 records
        history = history.slice(0, 10);
        localStorage.setItem("senti_history", JSON.stringify(history));
        loadHistory();
    }

    function loadHistory() {
        const history = JSON.parse(localStorage.getItem("senti_history") || "[]");
        if (history.length === 0) {
            historyList.innerHTML = `<div class="empty-state">No predictions recorded yet.</div>`;
            return;
        }

        historyList.innerHTML = history.map(item => `
            <div class="history-item">
                <span class="history-text" title="${escapeHtml(item.text)}">${escapeHtml(item.text)}</span>
                <span class="history-badge sentiment-${item.sentiment.toLowerCase()}">${item.sentiment}</span>
            </div>
        `).join("");
    }

    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
});