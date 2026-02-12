import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI не задан в переменных окружения (.env)');
    }
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10, // Увеличиваем пул соединений
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`✅ MongoDB подключена: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Ошибка подключения: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;