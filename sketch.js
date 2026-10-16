//學習5程式碼所在
// Google Sheet ID    1bSegU-mxs77MGcA0LPQs060YDRlwuaZ1su3GmJg-Hms
/*
////////////questions.csv//////////////////
////////////
question,option1,option2,option3,option4,correctAns
1+1,1,2,3,4,2
2+3,5,14,7,8,5
5+3,6,7,8,9,8
7+2,8,9,10,11,9
6+4,8,9,10,12,10
9+8,15,16,17,18,17
3+4,5,6,7,8,7
8+8,14,15,16,17,16
*/
////////////////////////////////////////////////////////
const sheetID = '1bSegU-mxs77MGcA0LPQs060YDRlwuaZ1su3GmJg-Hms';
const sheetCsvUrl = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:csv`;

let backupTable;        // 存放本地 questions.csv 備用題庫
let fullQuestionBank = []; // 整合後的完整題庫
let questions = [];     // 每次抽出的 5 題
let currentQ = 0;
let score = 0;
let totalQuestions = 5;
let gameState = "LOADING"; // "LOADING", "QUIZ", "FINISHED"

let selectedOption = -1;
let answered = false;
let isCorrect = false;
let feedbackTimer = 0;

let optionButtons = [];
let customFontName = 'Noto Sans TC';

function preload() {
  // 1. 動態嵌入 Google Fonts 繁體中文字型 (Noto Sans TC)
  let fontLink1 = document.createElement('link');
  fontLink1.rel = 'preconnect';
  fontLink1.href = 'https://fonts.googleapis.com';
  document.head.appendChild(fontLink1);

  let fontLink2 = document.createElement('link');
  fontLink2.rel = 'preconnect';
  fontLink2.href = 'https://fonts.gstatic.com';
  fontLink2.crossOrigin = 'anonymous';
  document.head.appendChild(fontLink2);

  let fontLink3 = document.createElement('link');
  fontLink3.rel = 'stylesheet';
  fontLink3.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700&display=swap';
  document.head.appendChild(fontLink3);

  // 2. 預載地端備用題庫 questions.csv (作為備援)
  backupTable = loadTable('questions.csv', 'csv', 'header');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont(customFontName);

  // 從 Google Sheet 載入題目
  loadGoogleSheetData();
  updateLayout();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  updateLayout();
}

// 讀取 Google Sheet CSV 資料
function loadGoogleSheetData() {
  loadTable(sheetCsvUrl, 'csv', 'noHeader', 
    (sheetTable) => {
      parseAndCombineQuestions(sheetTable);
    },
    (err) => {
      console.warn("Google Sheet 載入失敗，改用 questions.csv 備用題庫", err);
      parseAndCombineQuestions(null);
    }
  );
}

// 解析 Google Sheet 與備用 questions.csv 資料並進行合併
function parseAndCombineQuestions(sheetTable) {
  fullQuestionBank = [];

  // 1. 解析 Google Sheet 題目 (A:題目, B~E:選項, F:答案)
  if (sheetTable && sheetTable.getRowCount() > 0) {
    for (let i = 0; i < sheetTable.getRowCount(); i++) {
      let row = sheetTable.getRow(i);
      let qText = row.getString(0);
      let opt1 = row.getString(1);
      let opt2 = row.getString(2);
      let opt3 = row.getString(3);
      let opt4 = row.getString(4);
      let ans = row.getString(5);

      if (qText && opt1 && ans) {
        fullQuestionBank.push({
          questionText: qText.trim(),
          options: [opt1.trim(), opt2.trim(), opt3.trim(), opt4.trim()],
          correctAns: ans.trim()
        });
      }
    }
  }

  // 2. 若 Google Sheet 題目不足 5 題，提取 questions.csv 備用題目補足
  if (fullQuestionBank.length < totalQuestions && backupTable) {
    for (let i = 0; i < backupTable.getRowCount(); i++) {
      let row = backupTable.getRow(i);
      let qText = row.get('question');
      let opt1 = row.get('option1');
      let opt2 = row.get('option2');
      let opt3 = row.get('option3');
      let opt4 = row.get('option4');
      let ans = row.get('correctAns');

      if (qText && opt1 && ans) {
        fullQuestionBank.push({
          questionText: qText.trim(),
          options: [opt1.trim(), opt2.trim(), opt3.trim(), opt4.trim()],
          correctAns: ans.trim()
        });
      }
    }
  }

  // 3. 隨機抽出 5 題並開始測驗
  pickRandomQuestions();
  gameState = "QUIZ";
}

// 從整合題庫中隨機抽出 5 題
function pickRandomQuestions() {
  let shuffledBank = shuffle([...fullQuestionBank]);
  questions = shuffledBank.slice(0, min(totalQuestions, shuffledBank.length));
  totalQuestions = questions.length;
}

// 依據視窗大小動態計算選項按鈕位置
function updateLayout() {
  optionButtons = [];

  let cardW = min(width * 0.9, 600);
  let startX = (width - cardW) / 2;

  let gap = min(width * 0.03, 15);
  let btnWidth = (cardW - gap) / 2;
  let btnHeight = min(height * 0.08, 60);

  let startY = height * 0.45;

  for (let i = 0; i < 4; i++) {
    let col = i % 2;
    let row = floor(i / 2);

    let x = startX + col * (btnWidth + gap);
    let y = startY + row * (btnHeight + gap);

    optionButtons.push({ x: x, y: y, w: btnWidth, h: btnHeight });
  }
}

function draw() {
  background(245, 247, 250);

  if (gameState === "LOADING") {
    textAlign(CENTER, CENTER);
    textSize(24);
    fill(100);
    text("載入題庫中...", width / 2, height / 2);
  } else if (gameState === "QUIZ") {
    drawQuizScreen();
  } else if (gameState === "FINISHED") {
    drawEndScreen();
  }
}

// 繪製測驗畫面
function drawQuizScreen() {
  if (questions.length === 0) return;

  let q = questions[currentQ];
  let cardW = min(width * 0.9, 600);
  let centerX = width / 2;

  // 1. 頂部資訊欄
  textAlign(LEFT, CENTER);
  textSize(constrain(width * 0.025, 14, 18));
  fill(100);
  text(`第 ${currentQ + 1} / ${totalQuestions} 題`, centerX - cardW / 2, height * 0.08);

  textAlign(RIGHT, CENTER);
  text(`目前答對：${score} 題`, centerX + cardW / 2, height * 0.08);

  // 2. 題目框 (直接呈現 Google Sheet/CSV 的題目內容)
  let qBoxY = height * 0.14;
  let qBoxH = min(height * 0.25, 120);

  stroke(220);
  fill(255);
  rect(centerX - cardW / 2, qBoxY, cardW, qBoxH, 12);
  noStroke();

  textAlign(CENTER, CENTER);
  textSize(constrain(width * 0.05, 20, 34));
  fill(40);
  text(q.questionText, centerX, qBoxY + qBoxH / 2);

  // 3. 繪製 4 個選項按鈕
  for (let i = 0; i < 4; i++) {
    let btn = optionButtons[i];
    let isHover = mouseX > btn.x && mouseX < btn.x + btn.w &&
                  mouseY > btn.y && mouseY < btn.y + btn.h;

    if (answered && i === selectedOption) {
      fill(isCorrect ? "#4CAF50" : "#F44336");
    } else if (!answered && isHover) {
      fill("#E3F2FD");
    } else {
      fill(255);
    }

    stroke(200);
    rect(btn.x, btn.y, btn.w, btn.h, 8);
    noStroke();

    if (answered && i === selectedOption) {
      fill(255);
    } else {
      fill(50);
    }
    textSize(constrain(btn.h * 0.4, 15, 22));
    text(q.options[i], btn.x + btn.w / 2, btn.y + btn.h / 2);
  }

  // 4. 對錯反饋提示
  if (answered) {
    textAlign(CENTER, CENTER);
    textSize(constrain(width * 0.035, 18, 24));
    let feedbackY = height * 0.82;

    if (isCorrect) {
      fill("#2E7D32");
      text("答對了！🎉", centerX, feedbackY);
    } else {
      fill("#C62828");
      text(`答錯了！正確答案是：${q.correctAns}`, centerX, feedbackY);
    }

    if (frameCount - feedbackTimer > 60) {
      nextQuestion();
    }
  }
}

// 繪製結算畫面
function drawEndScreen() {
  let cardW = min(width * 0.85, 450);
  let cardH = min(height * 0.6, 320);
  let centerX = width / 2;
  let centerY = height / 2;

  stroke(220);
  fill(255);
  rect(centerX - cardW / 2, centerY - cardH / 2, cardW, cardH, 16);
  noStroke();

  textAlign(CENTER, CENTER);

  textSize(constrain(cardW * 0.08, 22, 32));
  fill(40);
  text("測驗結束！", centerX, centerY - cardH * 0.25);

  textSize(constrain(cardW * 0.06, 16, 22));
  fill(80);
  text(`您的總得分： ${score} / ${totalQuestions} 題`, centerX, centerY - cardH * 0.02);

  // 重新開始按鈕
  let btnW = cardW * 0.5;
  let btnH = min(cardH * 0.18, 50);
  let btnX = centerX - btnW / 2;
  let btnY = centerY + cardH * 0.2;

  let isHover = mouseX > btnX && mouseX < btnX + btnW &&
                mouseY > btnY && mouseY < btnY + btnH;

  fill(isHover ? "#1976D2" : "#2196F3");
  rect(btnX, btnY, btnW, btnH, 8);

  fill(255);
  textSize(constrain(btnH * 0.4, 14, 20));
  text("再試一次", centerX, btnY + btnH / 2);
}

function mousePressed() {
  if (gameState === "QUIZ" && !answered) {
    for (let i = 0; i < 4; i++) {
      let btn = optionButtons[i];
      if (mouseX > btn.x && mouseX < btn.x + btn.w &&
          mouseY > btn.y && mouseY < btn.y + btn.h) {

        selectedOption = i;
        answered = true;
        feedbackTimer = frameCount;

        let selectedVal = questions[currentQ].options[i];
        if (selectedVal === questions[currentQ].correctAns) {
          isCorrect = true;
          score++;
        } else {
          isCorrect = false;
        }
        break;
      }
    }
  } else if (gameState === "FINISHED") {
    let cardW = min(width * 0.85, 450);
    let cardH = min(height * 0.6, 320);
    let centerX = width / 2;
    let centerY = height / 2;

    let btnW = cardW * 0.5;
    let btnH = min(cardH * 0.18, 50);
    let btnX = centerX - btnW / 2;
    let btnY = centerY + cardH * 0.2;

    if (mouseX > btnX && mouseX < btnX + btnW &&
        mouseY > btnY && mouseY < btnY + btnH) {
      restartQuiz();
    }
  }
}

function nextQuestion() {
  answered = false;
  selectedOption = -1;
  currentQ++;

  if (currentQ >= totalQuestions) {
    gameState = "FINISHED";
  }
}

function restartQuiz() {
  score = 0;
  currentQ = 0;
  answered = false;
  selectedOption = -1;
  gameState = "QUIZ";
  pickRandomQuestions();
  updateLayout();
}