# RetroRocket

RetroRocket is a modern, collaborative web application designed to help Scrum teams manage their retrospectives in a fun and engaging way. The application allows users to create and participate in retrospective panels, facilitating discussions around what helped, what hindered progress, and how to improve in the future.

## Features

- **Collaborative Panels**: Users can join a retrospective panel without registration, simply by entering their name.
- **Real-time Participation**: Multiple participants can engage simultaneously, with their names displayed on the panel.
- **Persistent Data**: All card data is stored in Firebase Firestore, ensuring that information is retained across sessions.
- **User-friendly Interface**: The application features a clean and modern design, inspired by tools like Notion and Linear, with smooth interactions and animations.

## Technologies Used

- **Frontend**: React with TypeScript
- **Backend**: Node.js with Express.js
- **Database**: Firebase Firestore (free tier)
- **Deployment**: Vercel
- **Styling**: Tailwind CSS or CSS Modules

## Project Structure

```
retro-rocket
├── src
│   ├── components
│   │   ├── ui
│   │   ├── retrospective
│   │   ├── layout
│   │   └── forms
│   ├── hooks
│   ├── services
│   ├── types
│   ├── utils
│   ├── pages
│   ├── styles
│   ├── App.tsx
│   └── main.tsx
├── public
│   └── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

## Getting Started

To get started with RetroRocket, follow these steps:

1. **Clone the Repository**:
   ```
   git clone https://github.com/yourusername/retro-rocket.git
   cd retro-rocket
   ```

2. **Install Dependencies**:
   ```
   npm install
   ```

3. **Set Up Firebase**:
   - Create a Firebase project and configure Firestore.
   - Update the Firebase configuration in `src/services/firebase.ts`.

4. **Run the Application**:
   ```
   npm run dev
   ```

5. **Open in Browser**:
   Navigate to `http://localhost:3000` to view the application.

## Contributing

Contributions are welcome! If you have suggestions for improvements or new features, feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.