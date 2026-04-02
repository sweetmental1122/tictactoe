import mysql from "mysql2/promise";

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "password",
  database: process.env.DB_NAME || "tictactoe",
  waitForConnections: true,
});

export async function initDB() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS game_rooms (
      id INT AUTO_INCREMENT PRIMARY KEY,
      room_name VARCHAR(100) NOT NULL,
      player_x INT NOT NULL,
      player_o INT DEFAULT NULL,
      board VARCHAR(9) DEFAULT '---------',
      current_turn CHAR(1) DEFAULT 'X',
      winner CHAR(1) DEFAULT NULL,
      status ENUM('waiting', 'active', 'finished') DEFAULT 'waiting',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_x) REFERENCES users(id),
      FOREIGN KEY (player_o) REFERENCES users(id),
      CONSTRAINT chk_different_players CHECK (player_x != player_o)
    )
  `);
}
