 🧠 Prepville Learning Hub

**Prepville Learning Hub** is an AI-powered e-learning platform that helps students learn smarter through interactive quizzes, topic-based lessons, and real-time performance tracking.
It provides a gamified experience using XP points, streaks, and analytics to boost engagement and continuous learning.

---

🚀 Features

* 🎯 **Interactive Learning Modules** – Topic-based quiz and test sessions
* ⚡ **Real-Time Progress Tracking** – XP, streak, and performance auto-sync with backend
* 📊 **Performance Analytics** – Visual insights into accuracy, progress, and improvement areas
* 🔁 **Background Sync** – Auto updates whenever a student completes a task (no manual reset)
* 💾 **Persistent Storage** – Keeps user data secure and synced across sessions
* 🎨 **Modern UI** – Clean, minimal React interface optimized for responsiveness

---

## 🏗️ Tech Stack

| Layer           | Technology                                                                   |
| --------------- | ---------------------------------------------------------------------------- |
| Frontend        | **React.js**, **Tailwind CSS**                                               |
| Backend         | **Node.js**, **Express.js**                                                  |
| Database        | **MongoDB** *(or specify Firebase if applicable)*                            |
| Real-Time Sync  | **WebSocket / n8n Automation / Firebase Realtime DB** *(depending on setup)* |
| Version Control | **GitHub**                                                                   |

---

## ⚙️ Installation & Setup

Clone the repository:

```bash
git clone https://github.com/MugeshRam11/prepville-learning-hub.git
cd prepville-learning-hub
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm start
```

Backend setup (if separate):

```bash
cd server
npm install
npm run dev
```

Access the app at **[http://localhost:3000](http://localhost:3000)**

---

## 🧩 Folder Structure

```
prepville-learning-hub/
│
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page views
│   │   ├── hooks/          # Custom hooks (progress, sync)
│   │   ├── context/        # User & progress context
│   │   └── utils/          # Helper functions
│
├── server/                 # Node.js backend
│   ├── models/             # MongoDB schemas
│   ├── routes/             # API routes
│   ├── controllers/        # Business logic
│   └── sockets/            # Real-time sync handlers
│
└── README.md
```

---

## 🧮 Progress Tracking Logic

* Initialize all metrics at **0** on first login:

  ```js
  {
    streak: 0,
    performanceCriteria: 0,
    topicProgress: 0,
    xp: 0,
    accuracy: 0
  }
  ```
* Auto-update values in real-time as students complete activities.
* Use backend events or WebSocket messages to update UI instantly.

---

## 🤝 Contributing

Contributions are welcome!
To contribute:

1. Fork this repository
2. Create a new branch (`feature/your-feature-name`)
3. Commit your changes
4. Submit a pull request 🚀

---

## 📜 License

This project is licensed under the **MIT License**.
Feel free to use and modify it for learning or development purposes.

---

## 💡 Developed By

**Arun Pandian** & **Mugesh Ram**

> *Empowering learning through AI and automation*
> 🌐 [Prepville Learning Hub](#)

---

Would you like me to add **badges** (like React, Node.js, License, Version) and a **screenshot/demo section** next for your GitHub page?
