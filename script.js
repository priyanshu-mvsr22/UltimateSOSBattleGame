const boardSize = 10;
const gameBoard = document.getElementById("game-board");
const score1El = document.getElementById("score1");
const score2El = document.getElementById("score2");
const choicePopup = document.getElementById("choice-popup");
const errorMessage = document.getElementById("error-message");
const turnIndicator = document.getElementById("turn-indicator");
const startGameButton = document.getElementById("startGameButton");
const resetGameButton = document.getElementById("resetGameButton");
const darkModeCheckbox = document.getElementById("darkModeCheckbox");

let synth, polySynth;
let board = [];
let currentPlayer = "red";
let scores = { red: 0, blue: 0 };
let selectedLetter = "";
let currentCellElement = null;
let gameStarted = false;
let darkMode = false;
let moveCount = 0;
let makingMove = false;

function initAudio() {
    if (synth) {
        console.warn("Audio not ready or context not running.");
        return;
    }
    
    try {
        Tone.start().then(() => {
            console.log("Audio Context Started");
            synth = new Tone.Synth().toDestination();
            polySynth = new Tone.PolySynth(Tone.Synth, { volume: -8 }).toDestination();
        }).catch(e => console.error("Tone.start error:", e));
    } catch (e) {
        console.error("Error initializing Tone.js:", e);
    }
}

function playSound(type) {
    if (synth && polySynth && Tone.context.state === "running") {
        try {
            switch (type) {
                case "click":
                    synth.triggerAttackRelease("C5", "16n", Tone.now());
                    break;
                case "sos":
                    polySynth.triggerAttackRelease(["C4", "E4", "G4"], "8n", Tone.now());
                    break;
                case "win":
                    polySynth.triggerAttackRelease(["C5", "E5", "G5", "C6"], "4n", Tone.now());
                    break;
                case "place":
                    synth.triggerAttackRelease("E5", "16n", Tone.now());
                    break;
                case "error":
                    synth.triggerAttackRelease("A3", "8n", Tone.now());
                    break;
            }
        } catch (t) {
            console.error(`Error playing ${type} sound:`, t);
        }
    } else {
        console.warn("Audio not ready or context not running.");
    }
}

function initializeBoardArray() {
    board = Array(10).fill(null).map(() => Array(10).fill(""));
}

function startGame() {
    initAudio();
    playSound("click");
    
    if (!gameStarted) {
        gameStarted = true;
        makingMove = false;
        initializeBoardArray();
        createBoardHTML();
        currentPlayer = "red";
        scores = { red: 0, blue: 0 };
        moveCount = 0;
        updateScores();
        updateTurnIndicator();
        document.body.className = `${currentPlayer}-turn${darkMode ? " dark-mode" : ""}`;
        startGameButton.style.display = "none";
        resetGameButton.style.display = "inline-flex";
        gameBoard.style.opacity = "0";
        gameBoard.offsetWidth; // Trigger reflow
        gameBoard.style.animation = "slideIn 1s ease 0.1s forwards";
        hideMessage();
    }
}

function createBoardHTML() {
    gameBoard.innerHTML = "";
    
    for (let row = 0; row < 10; row++) {
        let tr = document.createElement("tr");
        
        for (let col = 0; col < 10; col++) {
            let td = document.createElement("td");
            td.dataset.row = row;
            td.dataset.col = col;
            td.addEventListener("click", handleCellClick);
            tr.appendChild(td);
        }
        
        gameBoard.appendChild(tr);
    }
}

function handleCellClick(event) {
    if (!makingMove && gameStarted && event.target.textContent === "") {
        playSound("click");
        currentCellElement = event.target;
        selectedLetter = "";
        document.querySelectorAll(".letter-button").forEach(btn => btn.classList.remove("selected"));
        choicePopup.classList.add("show");
    } else if (event.target.textContent !== "") {
        showMessage("⚠️ Cell already occupied!");
        playSound("error");
    }
}

function selectLetter(button, letter) {
    playSound("click");
    selectedLetter = letter;
    document.querySelectorAll(".letter-button").forEach(btn => btn.classList.remove("selected"));
    button.classList.add("selected");
}

function confirmChoice() {
    if (!currentCellElement || !selectedLetter || makingMove) {
        if (!selectedLetter) {
            showMessage("❗ Select S or O first!");
            playSound("error");
        }
        return;
    }
    
    makingMove = true;
    playSound("place");
    
    const row = parseInt(currentCellElement.dataset.row);
    const col = parseInt(currentCellElement.dataset.col);
    
    board[row][col] = selectedLetter;
    currentCellElement.textContent = selectedLetter;
    currentCellElement.classList.add(currentPlayer);
    moveCount++;
    
    let sosCount = checkSOS(row, col);
    
    if (sosCount > 0) {
        playSound("sos");
        scores[currentPlayer] += sosCount;
        updateScores();
    } else {
        switchTurn();
    }
    
    makingMove = false;
    choicePopup.classList.remove("show");
    selectedLetter = "";
    currentCellElement = null;
    hideMessage();
    
    if (moveCount === 100) {
        gameOver();
    }
}

function switchTurn() {
    currentPlayer = currentPlayer === "red" ? "blue" : "red";
    updateTurnIndicator();
    document.body.className = `${currentPlayer}-turn${darkMode ? " dark-mode" : ""}`;
}

function updateScores() {
    score1El.textContent = scores.red;
    score2El.textContent = scores.blue;
}

function updateTurnIndicator() {
    const color = currentPlayer === "red" ? "var(--red-color)" : "var(--blue-color)";
    const text = currentPlayer === "red" ? "🔴 Red" : "🔵 Blue";
    turnIndicator.innerHTML = `<span style="color: ${color};">${text}'s Turn</span>`;
}

function showMessage(text) {
    errorMessage.textContent = text;
    errorMessage.style.display = "inline-block";
    errorMessage.classList.remove("shake");
    errorMessage.offsetWidth; // Trigger reflow
    errorMessage.classList.add("shake");
}

function hideMessage() {
    errorMessage.style.display = "none";
    errorMessage.classList.remove("shake");
}

function toggleDarkMode() {
    darkMode = darkModeCheckbox.checked;
    document.body.classList.toggle("dark-mode", darkMode);
    document.body.className = `${currentPlayer}-turn${darkMode ? " dark-mode" : ""}`;
}

function checkSOS(row, col) {
    let count = 0;
    const letter = board[row][col];
    const directions = [
        { dr: 0, dc: 1 },  // Horizontal
        { dr: 1, dc: 0 },  // Vertical
        { dr: 1, dc: 1 },  // Diagonal down-right
        { dr: 1, dc: -1 }  // Diagonal down-left
    ];
    
    const isInBounds = (r, c) => r >= 0 && r < 10 && c >= 0 && c < 10;
    
    if (letter === "O") {
        // Check for S-O-S patterns where this O is in the middle
        for (const dir of directions) {
            const r1 = row - dir.dr;
            const c1 = col - dir.dc;
            const r2 = row + dir.dr;
            const c2 = col + dir.dc;
            
            if (isInBounds(r1, c1) && isInBounds(r2, c2) && 
                board[r1][c1] === "S" && board[r2][c2] === "S") {
                count++;
            }
        }
    } else if (letter === "S") {
        // Check for S-O-S patterns where this S is at the start or end
        for (const dir of directions) {
            // Check S at start (S-O-S)
            let r1 = row - dir.dr;
            let c1 = col - dir.dc;
            let r2 = row - 2 * dir.dr;
            let c2 = col - 2 * dir.dc;
            
            if (isInBounds(r1, c1) && isInBounds(r2, c2) && 
                board[r1][c1] === "O" && board[r2][c2] === "S") {
                count++;
            }
            
            // Check S at end (S-O-S)
            r1 = row + dir.dr;
            c1 = col + dir.dc;
            r2 = row + 2 * dir.dr;
            c2 = col + 2 * dir.dc;
            
            if (isInBounds(r1, c1) && isInBounds(r2, c2) && 
                board[r1][c1] === "O" && board[r2][c2] === "S") {
                count++;
            }
        }
    }
    
    return count;
}

function resetGame() {
    playSound("click");
    gameStarted = false;
    makingMove = false;
    initializeBoardArray();
    createBoardHTML();
    scores = { red: 0, blue: 0 };
    currentPlayer = "red";
    selectedLetter = "";
    currentCellElement = null;
    moveCount = 0;
    updateScores();
    updateTurnIndicator();
    document.body.className = "red-turn" + (darkMode ? " dark-mode" : "");
    startGameButton.style.display = "inline-flex";
    resetGameButton.style.display = "none";
    choicePopup.classList.remove("show");
    hideMessage();
}

function gameOver() {
    gameStarted = false;
    makingMove = true;
    
    let winnerText = "";
    if (scores.red > scores.blue) {
        winnerText = "🔴 Red Wins!";
    } else if (scores.blue > scores.red) {
        winnerText = "🔵 Blue Wins!";
    } else {
        winnerText = "🏁 It's a Draw!";
    }
    
    playSound("win");
    
    setTimeout(() => {
        alert(`Game Over!\nFinal Score: Red ${scores.red} - Blue ${scores.blue}\n${winnerText}`);
        resetGame();
    }, 500);
}

// Initialize dark mode toggle
darkModeCheckbox.checked = false;
darkModeCheckbox.addEventListener("change", toggleDarkMode);

// Initialize the board when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    initializeBoardArray();
    createBoardHTML();
});
