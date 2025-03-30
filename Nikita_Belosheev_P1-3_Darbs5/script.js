// Встроенный JS-код
// Iebūvēts JavaScript kods
let model;
let lastInsult = '';
let total = 0;
let shown = 0;
let blocked = 0;

// Список запрещённых фраз / Aizliegtās frāzes
const triggerPhrases = [
  "your mom", "your mum", "like a switch", "turn her on", "even a child",
  "your sister", "you're adopted", "your dad left", "smells like",
  "uglier than", "you're dumber than", "nobody loves you"
];

// Проверяем на триггер / Pārbaudām vai satur trigeri
function containsTriggerPhrase(text) {
  return triggerPhrases.some(phrase => text.toLowerCase().includes(phrase));
}

// Возвращаем иконку токсичности / Atgriež toksiskuma indikatoru
function getIndicator(toxicity) {
  if (toxicity < 0.2) return `<span class="indicator toxic-green">🟢</span>`;
  if (toxicity < 0.5) return `<span class="indicator toxic-yellow">🟡</span>`;
  return '';
}

// Обновляем статистику / Atjaunojam statistiku
function updateStats() {
  document.getElementById('total').textContent = total;
  document.getElementById('shown').textContent = shown;
  document.getElementById('blocked').textContent = blocked;
}

// Загружаем модель / Ielādējam modeli
toxicity.load(0.8).then(m => {
  model = m;
  document.getElementById('insult').textContent = "✅ Modelis ielādēts. Gatavs apvainot!";
});

// Получаем случайное оскорбление / Saņem apvainojumu
async function getInsult() {
  try {
    const url = `https://cors-anywhere.herokuapp.com/https://evilinsult.com/generate_insult.php?lang=en&type=json&ts=${Date.now()}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.insult === lastInsult) return await getInsult();
    lastInsult = data.insult;
    return data.insult;
  } catch (err) {
    return "❌ Neizdevās iegūt apvainojumu.";
  }
}

// Генерация и фильтрация / Ģenerēšana un filtrēšana
async function generateFilteredInsult() {
  const insultDiv = document.getElementById('insult');
  insultDiv.textContent = "🔍 Analizējam...";
  const insult = await getInsult();
  total++;

  if (!model) {
    insultDiv.textContent = "❌ Modelis nav ielādēts!";
    return;
  }

  const predictions = await model.classify([insult]);
  const toxicityScore = predictions.find(p => p.label === 'toxicity').results[0].probabilities[1];
  const hasTrigger = containsTriggerPhrase(insult);

  if (toxicityScore > 0.5 || hasTrigger) {
    insultDiv.innerHTML = `⚠️ <strong>Šis apvainojums tika cenzēts${hasTrigger ? " (trigera frāze)" : ""}</strong>`;
    blocked++;
  } else {
    const indicator = getIndicator(toxicityScore);
    insultDiv.innerHTML = `${insult} ${indicator}`;
    shown++;
  }

  updateStats();
}
