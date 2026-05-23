import amqp from "amqplib";

let channel: amqp.Channel;

export const connectRabbitMQ = async()=>{
    try {
        const connection = await amqp.connect({
            protocol: process.env.RABBITMQ_PROTOCOL || "amqp",
            hostname: process.env.RABBITMQ_HOST,
            port: Number(process.env.RABBITMQ_PORT) || 5672,
            username: process.env.RABBITMQ_USER || "admin",
            password: process.env.RABBITMQ_PASS || "admin123",
        });

        channel = await connection.createChannel();
        console.log("👌 Connected to Rabitmq successfully")
    } catch (error) {
        console.error("😒Failed to connect to rabbitmq", error);
        
    }
};

export const publishToQueue = async(queueName:string, message:any)=>{
    if(!channel){
        console.log("Rabbitmq channel is not initalized");
        return;
    }
    await channel.assertQueue(queueName,{durable:true});
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)),{
        persistent: true,
    });
}


export const invalidateChacheJob = async(cacheKeys:string[])=>{
    try {
        const message = {
            action:"invalidateChache",
            keys:cacheKeys,
        }
        await publishToQueue("Cache-invalidation", message)
        console.log("👌 Cahche Invalidation Job Published to Rabbitmq");
        
    } catch (error) {
        console.error("Failed to publish cahce on Rabbitmq", error);
        
    }
}