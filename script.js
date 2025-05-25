const BASE_URL = "https://mainly-producers-plots-photographic.trycloudflare.com";
const API_URL = `${BASE_URL}/latest`;      // โหลดข้อมูลเซ็นเซอร์
const ASK_AI_URL = `${BASE_URL}/ask-ai`;   // ถาม AI

let lastAISummary = 0; // ใช้ตรวจจับทุก 4 นาที

// โหลดข้อมูลเซ็นเซอร์ล่าสุด
async function fetchSensorData() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    const { light, temp, humidity } = data;

    document.getElementById("light").textContent = light;
    document.getElementById("temp").textContent = temp;
    document.getElementById("humidity").textContent = humidity;
    document.getElementById("light-status").textContent = getLightStatusText(light);
    document.getElementById("temp-status").textContent = getTempStatusText(temp);
    document.getElementById("humidity-status").textContent = getHumidityStatusText(humidity);

    const now = new Date();
    const thaiDate = getThaiDateParts(now);
    document.getElementById("datestamp").textContent = `${thaiDate.dayOfWeek}ที่ ${thaiDate.day} ${thaiDate.month} พ.ศ. ${thaiDate.year}`;
    document.getElementById("timestamp").textContent = `${thaiDate.time} น.`;

    // ✅ ถาม AI ทุก 4 นาที (240,000 ms)
    const nowMs = Date.now();
    if (nowMs - lastAISummary >= 240000) {
      fetchAISummary(light, temp, humidity);
      lastAISummary = nowMs;
    }

  } catch (error) {
    console.error("❌ โหลดข้อมูลเซ็นเซอร์ไม่สำเร็จ:", error);
  }
}

// ถาม AI สำหรับคำแนะนำจากค่าปัจจุบัน
async function fetchAISummary(light, temp, humidity) {
  try {
    const response = await fetch(ASK_AI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: "ขอคำแนะนำว่าตอนนี้ควรทำอะไร",
        light,
        temp,
        humidity,
      }),
    });
    const data = await response.json();
    document.getElementById("ai-summary").textContent = data.answer || "ไม่มีคำแนะนำจาก AI";
  } catch (error) {
    console.error("❌ โหลดคำแนะนำจาก AI ไม่สำเร็จ:", error);
    document.getElementById("ai-summary").textContent = "❌ ไม่สามารถโหลดคำแนะนำได้";
  }
}

// ถาม AI และแสดงในกล่องแชต
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

  const loadingMsg = document.createElement("div");
  loadingMsg.className = "message";
  loadingMsg.innerHTML = `<div class="sender">🤖AI:</div><div class="answer">⏳ กำลังถาม AI...</div>`;
  chatBox.appendChild(loadingMsg);
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const response = await fetch(ASK_AI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    const data = await response.json();
    const aiAnswer = data.answer ?? "❌ ไม่มีคำตอบจาก AI";

    chatBox.removeChild(loadingMsg);
    addMessage(aiAnswer, "AI");
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาด:", error);
    chatBox.removeChild(loadingMsg);
    addMessage("❌ ไม่สามารถติดต่อ AI ได้", "AI");
  }
}

// เพิ่มข้อความในกล่องแชต
function addMessage(text, sender) {
  const chatBox = document.getElementById("chat-messages");
  const div = document.createElement("div");
  div.className = "message";

  const name = document.createElement("div");
  name.className = "sender";
  name.textContent = sender === "คุณ" ? "คุณ: " : "🤖AI:";

  const msg = document.createElement("div");
  msg.className = sender === "คุณ" ? "question" : "answer";
  msg.textContent = text;

  div.appendChild(name);
  div.appendChild(msg);
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// แปลสถานะจากค่าเซ็นเซอร์
function getLightStatusText(light) {
  if (light > 50000) return "สว่างจัดมาก";
  if (light > 10000) return "สว่างมาก";
  if (light > 5000) return "สว่างปานกลาง";
  if (light > 1000) return "ค่อนข้างสว่าง";
  if (light > 500) return "แสงพอใช้";
  if (light > 100) return "แสงน้อย";
  if (light > 10) return "มืดสลัว";
  return "มืดมาก";
}

function getTempStatusText(temp) {
  if (temp > 35) return "อุณหภูมิร้อนมาก";
  if (temp >= 30) return "อุณหภูมิร้อน";
  if (temp >= 25) return "อุณหภูมิอุ่นๆ";
  if (temp >= 20) return "อุณหภูมิพอดี";
  return "อุณหูมิเย็น";
}

function getHumidityStatusText(humidity) {
  if (humidity > 85) return "ชื้นมาก อากาศอึดอัด";
  if (humidity > 70) return "อากาศชื้น เหนียวตัว";
  if (humidity > 60) return "เริ่มชื้น";
  if (humidity > 40) return "อากาศสบาย";
  if (humidity > 30) return "ค่อนข้างแห้ง";
  if (humidity > 20) return "แห้งมาก";
  return "อากาศแห้งมาก 🏜️";
}

// แปลงวันที่และเวลาเป็นแบบไทย
function getThaiDateParts(date) {
  const optionsDate = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
  const optionsTime = { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false };
  const thDateFormatter = new Intl.DateTimeFormat("th-TH", optionsDate);
  const thTimeFormatter = new Intl.DateTimeFormat("th-TH", optionsTime);
  const parts = thDateFormatter.formatToParts(date);
  const time = thTimeFormatter.format(date);
  return {
    dayOfWeek: parts.find((p) => p.type === "weekday")?.value ?? "",
    day: parts.find((p) => p.type === "day")?.value ?? "",
    month: parts.find((p) => p.type === "month")?.value ?? "",
    year: parts.find((p) => p.type === "year")?.value ?? "",
    time,
  };
}

// เริ่มโหลดเมื่อเปิดหน้า
window.addEventListener("load", () => {
  fetchSensorData();
  setInterval(fetchSensorData, 1000); // โหลดเซ็นเซอร์ทุก 1 วินาที
});

// ส่งคำถามเมื่อกด Enter
document.getElementById("user-question").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    askAI();
  }
});
