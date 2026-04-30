const moves = document.getElementById("moves-count");
const errors = document.getElementById("errors-count");
const errorPopup = document.getElementById("errorPopup");
const popupBtn = document.getElementById("popupBtn");
const timeValue = document.getElementById("time");
const startButton = document.getElementById("start");
const stopButton = document.getElementById("stop");
const gameContainer = document.querySelector(".game-container");
const result = document.getElementById("result");
const controls = document.querySelector(".controls-container");
              popupBtn.addEventListener("click", () => {
              errorPopup.classList.remove("show");

              // ▶️ SAMBUNG TIMER SEMULA
              //interval = setInterval(timeGenerator, 1000);
              });
let cards;
let interval;
let firstCard = false;
let secondCard = false;
let timerStarted = false;


//Items array
const items = [
  { name: "rama-rama", image: "asset/emoji-01.png" },
  { name: "ais", image: "asset/emoji-02.png" },
  { name: "api", image: "asset/emoji-03.png" },
  { name: "hantu", image: "asset/emoji-04.png" },
  { name: "monyet", image: "asset/emoji-05.png" },
  { name: "mual", image: "asset/emoji-06.png" },
  { name: "pelangi", image: "asset/emoji-07.png" },
  { name: "hati", image: "asset/emoji-08.png" },
  { name: "love-eye", image: "asset/emoji-09.png" },
  { name: "ball", image: "asset/emoji-10.png" },
  { name: "zip-mouth", image: "asset/emoji-11.png" },
  { name: "star", image: "asset/emoji-12.png" },
];

//Initial Time
let seconds = 0,
  minutes = 0;
//Initial moves and win count
let movesCount = 0,
  winCount = 0;
  //Initial Error count
let errorCount = 0;
let totalScore = 0;
//For timer
const timeGenerator = () => {
  seconds += 1;
  //minutes logic
  if (seconds >= 60) {
    minutes += 1;
    seconds = 0;
  }
  //format time before displaying
  let secondsValue = seconds < 10 ? `0${seconds}` : seconds;
  let minutesValue = minutes < 10 ? `0${minutes}` : minutes;
  timeValue.innerHTML = `<span>⏱️:</span>${minutesValue}:${secondsValue}`;
};

//For calculating moves
const movesCounter = () => {
  movesCount += 1;
  moves.innerHTML = `<span>👣:</span>${movesCount}`;
};

//For calculating errors
const errorsCounter = () => {
  errorCount += 1;
  errors.innerHTML = `<span>❌:</span>${errorCount}`;

  if (errorCount === 10) {
  errorPopup.classList.add("show");
  console.log(errorPopup.className); // 👈 mesti ada "popup show"
}
};

//Pick random objects from the items array
const generateRandom = (totalCards = 12) => {
  let tempArray = [...items];
  let cardValues = [];
  let pairs = totalCards / 2;

  for (let i = 0; i < pairs; i++) {
    const randomIndex = Math.floor(Math.random() * tempArray.length);
    cardValues.push(tempArray[randomIndex]);
    tempArray.splice(randomIndex, 1);
  }
  return cardValues;
};


const matrixGenerator = (cardValues, cols = 4, rows = 3) => {
  gameContainer.innerHTML = "";
  cardValues = [...cardValues, ...cardValues];
  //simple shuffle
  cardValues.sort(() => Math.random() - 0.5);
  for (let i = 0; i < cols * rows; i++) {
    /*
        Create Cards
        before => front side (contains question mark)
        after => back side (contains actual image);
        data-card-values is a custom attribute which stores the names of the cards to match later
      */
    gameContainer.innerHTML += `
     <div class="card-container" data-card-value="${cardValues[i].name}">
        <div class="card-before">${i + 1}</div>
        <div class="card-after">
        <img src="${cardValues[i].image}" class="image"/></div>
     </div>
     `;
  }
  //Grid
  gameContainer.style.gridTemplateColumns = `repeat(${cols}, auto)`;


  //Cards
  cards = document.querySelectorAll(".card-container");
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      if (!timerStarted) {
    interval = setInterval(timeGenerator, 1000);
    timerStarted = true;
  }
      //If selected card is not matched yet then only run (i.e already matched card when clicked would be ignored)
      if (!card.classList.contains("matched")&&
    card !== firstCard
  ) {
        //flip the cliked card
        card.classList.add("flipped");
        //if it is the firstcard (!firstCard since firstCard is initially false)
        if (!firstCard) {
          //so current card will become firstCard
          firstCard = card;
          //current cards value becomes firstCardValue
          firstCardValue = card.getAttribute("data-card-value");
        } else {
          //increment moves since user selected second card
          movesCounter();
          //secondCard and value
          secondCard = card;
          let secondCardValue = card.getAttribute("data-card-value");
          if (firstCardValue == secondCardValue) {
            //if both cards match add matched class so these cards would beignored next time
            firstCard.classList.add("matched");
            secondCard.classList.add("matched");

            // ✅ STEP 2 — KEMAS KINI TOTAL SCORE DI SINI
              totalScore += 100; // boleh ubah formula nanti
              document.getElementById("total-score").textContent =
              `JUMLAH SKOR ⭐: ${totalScore}`;

            //set firstCard to false since next card would be first now
            firstCard = false;
            //winCount increment as user found a correct match
            winCount += 1;
            //check if winCount ==half of cardValues
            if (winCount == Math.floor(cardValues.length / 2)) {
              const totalScoreEl = document.getElementById("total-score");
              const totalScoreValue = totalScoreEl.textContent.replace(/\D/g, "");
              
              // 1️⃣ bila game tamat
              clearInterval(interval);

              // 🔒 lock input supaya user tak klik lagi
              // document.querySelectorAll(".card-container")
              // .forEach(card => card.style.pointerEvents = "none");

              // ⏳ delay supaya pair terakhir boleh dilihat
              // setTimeout(() => {

              // 2️⃣ FORMAT MASA (INI TEMPAT CODE 1 👇)
              const totalTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

              // 3️⃣ render result page
              result.innerHTML = `

                <div class="win-box">
                <h2 class>🎉 Tahniah! 🎉</h2>

                 <div class="win-score-main">
                    SKOR ANDA
                    <span>⭐600⭐</span>
                  </div>

                  <div class="win-meta">
                    <div class="meta-item">
                      <p>👣: <span>${movesCount}</span></p>
                      <p>⏱️: <span>${totalTime}</span></p>
                      <p>❌: <span>${errorCount}</span></p>
                    </div>
                  </div>
            `;
                startButton.textContent = "Main Semula";
                  stopGame();
                 }

          } else {
            //if the cards dont match
            //flip the cards back to normal
            errorCount += 1;
            errors.innerHTML = `<span>❌:</span> ${errorCount}`;

              if (errorCount === 10) {
                errorPopup.classList.add("show");
                clearInterval(interval); // ⏸️ PAUSE TIMER
              }

            let [tempFirst, tempSecond] = [firstCard, secondCard];
            firstCard = false;
            secondCard = false;

            let delay = setTimeout(() => {
              tempFirst.classList.remove("flipped");
              tempSecond.classList.remove("flipped");
              

            }, 900);
          }
        }
      }
    });
  });
};

//Start game
startButton.addEventListener("click", () => {
  clearInterval(interval);     // ⛔ pastikan mati
  interval = null;

  // ✅ RESET TOTAL SCORE
 // totalScore = 0;
 // document.getElementById("total-score").textContent = "TOTAL SCORE: 0";

  movesCount = 0;
  seconds = 0;
  minutes = 0;
  errorCount = 0;

   timerStarted = false; // 🔁 RESET FLAG
   timeValue.innerHTML = `<span>⏱️:</span> 00:00`;
  moves.innerHTML = `<span>👣:</span> 0`;
  errors.innerHTML = `<span>❌:</span> 0`;

  //controls amd buttons visibility
  controls.classList.add("hide");
  stopButton.classList.remove("hide");
  startButton.classList.add("hide");
  //Start timer
  // interval = setInterval(timeGenerator, 1000);
  //initial moves
  moves.innerHTML = `<span>👣:</span> ${movesCount}`;
  errors.innerHTML = `<span>❌:</span> ${errorCount}`;
  initializer();
});

//Stop game
stopButton.addEventListener(
  "click",
  (stopGame = () => {
    controls.classList.remove("hide");
    stopButton.classList.add("hide");
    startButton.classList.remove("hide");
    clearInterval(interval);
  })
);

//Initialize values and func calls
const initializer = () => {

  // ✅ RESET TOTAL SCORE SETIAP GAME BARU
  totalScore = 0;
  document.getElementById("total-score").textContent = "JUMLAH SKOR ⭐: 0";

  result.innerText = "";
  winCount = 0;
  let cardValues = generateRandom(12);
  console.log(cardValues);
  matrixGenerator(cardValues, 4, 3);
};

