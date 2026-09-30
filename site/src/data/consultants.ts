// 從 assets/consultants.js（原型的 TG_CONSULTANTS）轉出來的 seed 資料。
// 講師顧問。img=去背人像、avatar=頭像、card=卡片用裁切。
// 正式站接上後台之後，這裡是第一次匯入用的初始值。

export type Consultant = {
  img: string;
  zh: string;
  en: string;
  title: string;
  course: string;
  avatar: string;
  card: string;
};

export const consultants: Consultant[] = [
  {
    "img": "assets/consultants/c01p.png",
    "zh": "張惟荏",
    "en": "Nick",
    "title": "首席 AI 顧問",
    "course": "地端 LLM 導入與治理",
    "avatar": "assets/consultants/c01a.png",
    "card": "assets/consultants/c01c.png"
  },
  {
    "img": "assets/consultants/c02p.png",
    "zh": "李其縵",
    "en": "Mandy",
    "title": "資深流程自動化顧問",
    "course": "n8n 自動化實戰",
    "avatar": "assets/consultants/c02a.png",
    "card": "assets/consultants/c02c.png"
  },
  {
    "img": "assets/consultants/c03p.png",
    "zh": "林京賢",
    "en": "Aiden",
    "title": "RAG 架構顧問",
    "course": "Advanced RAG 知識庫實作",
    "avatar": "assets/consultants/c03a.png",
    "card": "assets/consultants/c03c.png"
  },
  {
    "img": "assets/consultants/c04p.png",
    "zh": "林毓晟",
    "en": "Stanley",
    "title": "地端硬體導入顧問",
    "course": "Local GPT 導入實務",
    "avatar": "assets/consultants/c04a.png",
    "card": "assets/consultants/c04c.png"
  },
  {
    "img": "assets/consultants/c05p.png",
    "zh": "紀如鴻",
    "en": "Evan",
    "title": "AI 治理顧問",
    "course": "LiteLLM 額度與治理實戰",
    "avatar": "assets/consultants/c05a.png",
    "card": "assets/consultants/c05c.png"
  },
  {
    "img": "assets/consultants/c06p.png",
    "zh": "盧業興",
    "en": "Morris",
    "title": "資料工程顧問",
    "course": "企業知識庫資料整備",
    "avatar": "assets/consultants/c06a.png",
    "card": "assets/consultants/c06c.png"
  },
  {
    "img": "assets/consultants/c07p.png",
    "zh": "賴志？",
    "en": "Jimmy",
    "title": "模型維運顧問",
    "course": "Ollama 模型管理實戰",
    "avatar": "assets/consultants/c07a.png",
    "card": "assets/consultants/c07c.png"
  },
  {
    "img": "assets/consultants/c08p.png",
    "zh": "謝侑霖",
    "en": "Leo",
    "title": "導入策略顧問",
    "course": "AI 導入路線圖工作坊",
    "avatar": "assets/consultants/c08a.png",
    "card": "assets/consultants/c08c.png"
  },
  {
    "img": "assets/consultants/c09p.png",
    "zh": "魏美棻",
    "en": "Nancy",
    "title": "企業培訓總監",
    "course": "L1–L5 企業內訓規劃",
    "avatar": "assets/consultants/c09a.png",
    "card": "assets/consultants/c09c.png"
  },
  {
    "img": "assets/consultants/c10p.png",
    "zh": "顏世？",
    "en": "",
    "title": "學術顧問・臺科大教授",
    "course": "C1–C5 方法論講座",
    "avatar": "assets/consultants/c10a.png",
    "card": "assets/consultants/c10c.png"
  }
];

export default consultants;
