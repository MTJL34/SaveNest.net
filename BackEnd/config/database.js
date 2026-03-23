import mysql from 'mysql2';
import dotenv from 'dotenv';
dotenv.config();


let connection;

try {
  connection = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || process.env.DB_PASS || "",
    database: process.env.DB_NAME
  }).promise();
  console.log('Database connection established successfully');
} catch (error) {
  console.error('Error establishing database connection:', error);
  // Optionally, you can rethrow the error or handle it as needed
  throw error;
}

export default connection;
