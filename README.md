# TokTickIT - Lab 01

โปรเจกต์ตั้งค่าโครงสร้างเริ่มต้นสำหรับ **TokTickIT** (Lab 01) ประกอบด้วย Frontend (React + TypeScript + Vite + Bootstrap), Backend (Node.js + Express + TypeScript), Database (PostgreSQL + Prisma), และ Test Suite (Vitest + Supertest)

---

## 📁 โครงสร้างโฟลเดอร์ (Folder Structure)

```text
TokTickIT/
├── client/              # Frontend Application (React + TypeScript + Vite + Bootstrap)
│   ├── src/             # Source code ของ React
│   ├── package.json
│   └── vite.config.ts
├── server/              # Backend API Server (Express + TypeScript)
│   ├── src/             # Source code ของ Express (app.ts, index.ts)
│   ├── prisma/          # Database Schema & Prisma Client configuration
│   │   └── schema.prisma# PostgreSQL Schema
│   ├── tests/           # Test files สำหรับการทดสอบ
│   │   └── lab-01/      # Lab 01 test cases (Vitest + Supertest)
│   │       └── server.test.ts
│   ├── package.json
│   └── tsconfig.json
├── src/                 # โฟลเดอร์หลักประจำโปรเจกต์ตามข้อกำหนด
├── docs/                # เอกสารประกอบ Lab
│   └── lab-01/          # เอกสารของ Lab 01
│       ├── ai_use.md    # บันทึกการใช้งาน AI
│       └── reviewer.md  # เอกสารสำหรับผู้ตรวจทาน
├── .env.example         # เทมเพลตตัวแปรสภาพแวดล้อม
├── .gitignore           # ซ่อน node_modules, .env, dist, build ฯลฯ
├── package.json         # Root package.json สำหรับรันสคริปต์รวม
├── vitest.config.ts     # การตั้งค่า Vitest
└── README.md            # คู่มือการติดตั้งและการรันโปรเจกต์
```

---

## 🚀 ขั้นตอนการติดตั้งและการใช้งาน (Installation & Setup)

### 1. ติดตั้ง Dependencies
รันคำสั่งติดตั้ง dependencies ทั้งหมดในโปรเจกต์:

```bash
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

### 2. ตั้งค่า Environment Variables
คัดลอกไฟล์ `.env.example` เป็น `.env` และแก้ไขค่าคอนฟิกตามต้องการ:

```bash
cp .env.example .env
```

ตัวอย่างการตั้งค่า PostgreSQL ใน `.env`:
```env
PORT=5000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/toktickit_db?schema=public"
VITE_API_URL="http://localhost:5000"
```

### 3. ตั้งค่า Prisma (Database)
รันคำสั่งเพื่อ Generate Prisma Client:

```bash
npx prisma generate
```

*(หมายเหตุ: หากต้องการย้าย Schema ลงฐานข้อมูล PostgreSQL จริง ให้ใช้คำสั่ง `npx prisma db push` หรือ `npx prisma migrate dev`)*

---

## 🧪 การรันโปรเจกต์และการทดสอบ (Running & Testing)

### 1. รัน Backend Server
```bash
npm run dev:server
```
- Server จะทำงานที่: `http://localhost:5000`

### 2. รัน Frontend Client
```bash
npm run dev:client
```
- Frontend จะทำงานที่: `http://localhost:3000`

### 3. รัน Test Suite (Vitest + Supertest)
```bash
npm test
```
คำสั่งนี้จะรันการทดสอบทั้งหมดภายใต้ `server/tests/lab-01/` ด้วย Vitest และ Supertest

---

## ⚠️ ข้อระวังและการควบคุมขอบเขต (Scope Constraints)
- โครงสร้างโปรเจกต์นี้เป็นการตั้งค่าโครงสร้างพื้นฐานสำหรับ Lab 01 เท่านั้น
- ไม่มีฟีเจอร์ทางธุรกิจ, API Endpoints เพิ่มเติม, หรือ UI นอกเหนือจากตัวอย่างการแสดงผล Bootstrap
