// ====== Config ======
const BASE_URL = "https://ce395backend-1.onrender.com";
const API_URL = `${BASE_URL}/latest`;
const ASK_AI_URL = `${BASE_URL}/ask-ai`;

// เก็บค่าล่าสุดจากเซนเซอร์ไว้ในหน่วยความจำ (ไม่อ่านจาก DOM)
let currentSensor = null;
// กันยิง AI ถี่เกิน (ms)
let lastAISummary = 0;

// ====== Utils (Thai date/time & status texts) ======
function getThaiDateParts(date) {
  const optionsDate = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
  const optionsTime = { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false };
  const thDate = new Intl.DateTimeFormat("th-TH", optionsDate).formatToParts(date);
  const thTime = new Intl.DateTimeFormat("th-TH", optionsTime).format(date);
  return {
    dayOfWeek: thDate.find(p => p.type === "weekday")?.value ?? "",
    day:thDate.find(p => p.type === "day")?.value ?? "",
    month:thDate.find(p => p.type === "month")?.value ?? "",
    year:thDate.find(p => p.type === "year")?.value ?? "",
    time: thTime,
  };
}

function getLightStatusText(light) {
  if (light > 50000) return "สว่างจัดมาก";
  if (light > 10000) return "สว่างมาก";
  if (light > 5000)  return "สว่างปานกลาง";
  if (light > 1000)  return "ค่อนข้างสว่าง";
  if (light > 500)   return "แสงพอใช้";
  if (light > 100)   return "แสงน้อย";
  if (light > 10)    return "มืดสลัว";
  return "มืดมาก";
}
function getTempStatusText(temp) {
  if (temp > 35) return "อุณหภูมิร้อนมาก";
  if (temp >= 30) return "อุณหภูมิร้อน";
  if (temp >= 25) return "อุณหภูมิอุ่นๆ";
  if (temp >= 20) return "อุณหภูมิพอดี";
  return "อุณหูมิเย็น";
}
function getHumidityStatusText(h) {
  if (h > 85) return "ชื้นมาก อากาศอึดอัด";
  if (h > 70) return "อากาศชื้น เหนียวตัว";
  if (h > 60) return "เริ่มชื้น";
  if (h > 40) return "อากาศสบาย";
  if (h > 30) return "ค่อนข้างแห้ง";
  if (h > 20) return "แห้งมาก";
  return "อากาศแห้งมาก 🏜️";
}

// ====== Sensor fetch ======
async function fetchSensorData() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { light, temp, humidity } = await res.json();

    // update cache
    currentSensor = { light, temp, humidity };

    // update UI
    document.getElementById("light").textContent = light;
    document.getElementById("temp").textContent = temp;
    document.getElementById("humidity").textContent = humidity;

    document.getElementById("light-status").textContent = getLightStatusText(light);
    document.getElementById("temp-status").textContent = getTempStatusText(temp);
    document.getElementById("humidity-status").textContent = getHumidityStatusText(humidity);

    const now = new Date();
    const th = getThaiDateParts(now);
    document.getElementById("datestamp").textContent = `${th.dayOfWeek}ที่ ${th.day} ${th.month} พ.ศ. ${th.year}`;
    document.getElementById("timestamp").textContent = `${th.time} น.`;

    return currentSensor;
  } catch (err) {
    console.error("❌ โหลดข้อมูลเซ็นเซอร์ไม่สำเร็จ:", err);
    return null;
  }
}

// ====== AI summary (auto) ======
async function fetchAISummary(light, temp, humidity) {
  try {
    const now = Date.now();
    if (now - lastAISummary < 30_000) return; // กันยิงถี่เกิน 30 วิ

    document.getElementById("ai-summary").textContent = "⏳ กำลังสรุปด้วย AI...";

    const res = await fetch(ASK_AI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // backend ปัจจุบันใช้ lastSensorData ฝั่งเซิร์ฟเวอร์เป็นหลัก ส่งพารามฯ ไปก็ไม่เสียหาย
      body: JSON.stringify({ question: "วิเคราะห์สภาพอากาศขณะนี้", light, temp, humidity }),
    });

    const data = await res.json();

    if (!res.ok) {
      document.getElementById("ai-summary").textContent = data?.error || "❌ ไม่สามารถโหลดคำแนะนำได้";
      return;
    }

    document.getElementById("ai-summary").textContent = data?.answer || "ไม่มีคำแนะนำจาก AI";
    lastAISummary = now;
  } catch (e) {
    console.error("❌ โหลดคำแนะนำจาก AI ไม่สำเร็จ:", e);
    document.getElementById("ai-summary").textContent = "❌ ไม่สามารถโหลดคำแนะนำได้";
  }
}
function fetchAISummaryOnInterval() {
  if (!currentSensor) return;
  const { light, temp, humidity } = currentSensor;
  fetchAISummary(light, temp, humidity);
}

// ====== Chat ask ======
function addMessage(text, sender) {
  const chat = document.getElementById("chat-messages");
  const wrap = document.createElement("div");
  wrap.className = `message ${sender === "คุณ" ? "user" : "ai"}`;

  const name = document.createElement("div");
  name.className = "sender";
  name.textContent = sender === "คุณ" ? "คุณ:" : "🤖AI:";

  const msg = document.createElement("div");
  msg.className = sender === "คุณ" ? "question" : "answer";
  msg.textContent = text;

  wrap.appendChild(name);
  wrap.appendChild(msg);
  chat.appendChild(wrap);
  chat.scrollTop = chat.scrollHeight;
}

async function askAI() {
  const input = document.getElementById("user-question");
  const question = input.value.trim();
  const chatBox = document.getElementById("chat-messages");
  if (!question) {
    addMessage("⚠️ กรุณาพิมพ์คำถามก่อนนะครับ", "AI");
    return;
  }

  addMessage(question, "คุณ");
  input.value = "";

  // loading bubble
  const loading = document.createElement("div");
  loading.className = "message ai";
  loading.innerHTML = `<div class="sender">🤖AI:</div><div class="answer">⏳ กำลังถาม AI...</div>`;
  chatBox.appendChild(loading);
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const res = await fetch(ASK_AI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const data = await res.json();
    chatBox.removeChild(loading);
    addMessage(data?.answer ?? "❌ ไม่มีคำตอบจาก AI", "AI");
  } catch (e) {
    console.error("❌ เกิดข้อผิดพลาด:", e);
    chatBox.removeChild(loading);
    addMessage("❌ ไม่สามารถติดต่อ AI ได้", "AI");
  }
}

// ====== Init ======
async function init() {
  // 1) โหลดเซ็นเซอร์รอบแรกแบบ await ให้เสร็จจริง
  const first = await fetchSensorData();

  // 2) ถ้าได้ค่าแล้ว ค่อยสรุป AI ทันที (ไม่ NaN แน่นอน)
  if (first) {
    fetchAISummary(first.light, first.temp, first.humidity);
  } else {
    document.getElementById("ai-summary").textContent = "⌛ รอข้อมูลเซนเซอร์...";
  }

  // 3) ตั้ง interval
  setInterval(fetchSensorData, 1000);            // ดึงค่าจากเซ็นเซอร์ทุก 1 วิ
  setInterval(fetchAISummaryOnInterval, 300000); // สรุป AI ทุก 5 นาที

  // 4) bind enter สำหรับถาม AI
  const input = document.getElementById("user-question");
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") askAI();
  });
}

window.addEventListener("load", init);
